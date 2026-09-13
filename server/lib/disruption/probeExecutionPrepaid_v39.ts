import { v39Pool as pool } from "./db_v39";
import {
  checkAirportFeeds,
  getBalance,
  listSubscriptionsStrict,
} from "./aerodataboxLimiter_v3";
import {
  assertProbeTimeClass,
  ensureProbeBudgetDay,
  requireFrozenCandidate,
  PROBE_BUDGET_DAY_HARD_CAP,
  PROBE_STAGE1_TARGET_MINUTES,
  PROBE_STAGE2_TARGET_MINUTES,
  type ExecuteProbeInput,
  type ExecuteProbeResult,
} from "./probeExecution_v39";
import { runPrepaidLiveWindowV39 } from "./prepaidProbeWindow_v39";

function completeBucketStability(
  start: Date,
  end: Date,
  observationsMs: readonly number[],
  minimumBuckets: number,
): { stability: number | null; completeBuckets: number } {
  const width = 15 * 60_000;
  const startMs = start.getTime();
  const endMs = end.getTime();
  const first = Math.ceil(startMs / width) * width;
  const lastExclusive = Math.floor(endMs / width) * width;
  const counts: number[] = [];
  for (let bucket = first; bucket + width <= lastExclusive; bucket += width) {
    counts.push(observationsMs.filter((t) => t >= bucket && t < bucket + width).length);
  }
  if (counts.length < minimumBuckets) return { stability: null, completeBuckets: counts.length };
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  if (mean === 0) return { stability: 0, completeBuckets: counts.length };
  const variance = counts.reduce((sum, value) => sum + (value - mean) ** 2, 0) / counts.length;
  const cv = Math.sqrt(variance) / mean;
  return { stability: 1 / (1 + cv), completeBuckets: counts.length };
}

async function assertIncidentClear(): Promise<void> {
  const result = await pool.query(
    `SELECT cause FROM clean.adb_incident_stop WHERE resolved=false ORDER BY occurred_at_utc DESC LIMIT 1`,
  );
  if (result.rowCount) throw new Error(`REFUSED_INCIDENT_STOP:${result.rows[0].cause}`);
}

async function openIncident(kind: string, detail: Record<string, unknown>): Promise<void> {
  await pool.query(
    `INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
     VALUES('reconciliation',now(),$1::jsonb,false)`,
    [JSON.stringify({ kind, owner: "prepaid_probe_v39", ...detail })],
  );
}

async function assertR1Clean(): Promise<void> {
  const subs = await listSubscriptionsStrict();
  const foreign = subs.filter((s) => s.isActive && s.billingType !== "LifetimeBased");
  if (foreign.length) throw new Error(`REFUSED_R1:${foreign.length}_ACTIVE_BILLABLE_SUBSCRIPTIONS`);
}

/**
 * Safe-mode rows deliberately do not retain actual provider credit deltas.
 * Their immutable reservation therefore remains the durable conservative
 * exposure for that probe budget day. Legacy rows continue to use the maximum
 * of their retained reservation/external/internal evidence.
 */
export async function prepaidSafeBudgetExposureV39(dayId: string, excludeProbeId: number | null = null): Promise<number> {
  const result = await pool.query(
    `SELECT COALESCE(sum(CASE
       WHEN provider_content_safe_mode THEN reserved_credits
       WHEN status='probing' THEN GREATEST(reserved_credits,COALESCE(credits_spent,0),COALESCE(internal_send_credits,0))
       ELSE GREATEST(COALESCE(credits_spent,0),COALESCE(internal_send_credits,0)) END),0)::int n
       FROM clean.adb_anchor_probe
      WHERE probe_budget_day_id=$1 AND ($2::bigint IS NULL OR probe_id<>$2)`,
    [dayId, excludeProbeId],
  );
  return Number(result.rows[0]?.n ?? 0);
}

async function reserveSafeProbe(input: ExecuteProbeInput, started: Date): Promise<number> {
  const runtime = input.artifacts.runtime;
  const candidate = requireFrozenCandidate(input.artifacts.preprobe, input.icao, input.allowReplacement);
  const reservation = input.stage === 1 ? runtime.stage1ReservationCredits : runtime.stage2ReservationCredits;
  const targetMinutes = input.stage === 1 ? PROBE_STAGE1_TARGET_MINUTES : PROBE_STAGE2_TARGET_MINUTES;
  const targetEnd = new Date(started.getTime() + targetMinutes * 60_000);
  if (started.toISOString().slice(0, 10) !== targetEnd.toISOString().slice(0, 10)) {
    throw new Error("REFUSED_PROBE_MIDNIGHT");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [runtime.probeBudgetDayId]);
    const active = await client.query(`SELECT 1 FROM clean.adb_anchor_probe WHERE status='probing' LIMIT 1`);
    if (active.rowCount) throw new Error("REFUSED_PROBE_OVERLAP");
    const exposure = await client.query(
      `SELECT COALESCE(sum(CASE
         WHEN provider_content_safe_mode THEN reserved_credits
         WHEN status='probing' THEN GREATEST(reserved_credits,COALESCE(credits_spent,0),COALESCE(internal_send_credits,0))
         ELSE GREATEST(COALESCE(credits_spent,0),COALESCE(internal_send_credits,0)) END),0)::int n
         FROM clean.adb_anchor_probe WHERE probe_budget_day_id=$1`,
      [runtime.probeBudgetDayId],
    );
    const conservativePrior = Number(exposure.rows[0]?.n ?? 0);
    if (conservativePrior + reservation + runtime.unsettledBurstMarginCredits > PROBE_BUDGET_DAY_HARD_CAP) {
      throw new Error("REFUSED_PROBE_CAP");
    }
    const inserted = await client.query(
      `INSERT INTO clean.adb_anchor_probe
       (stage,icao,region,window_start,window_end,window_hours,status,probe_budget_day_id,
        reserved_credits,preprobe_artifact_sha256,provider_content_safe_mode)
       VALUES($1,$2,$3,$4,$5,$6,'probing',$7,$8,$9,true)
       RETURNING probe_id`,
      [input.stage, candidate.icao, candidate.region, started, targetEnd, targetMinutes / 60,
       runtime.probeBudgetDayId, reservation, input.artifacts.preprobeSha256],
    );
    await client.query("COMMIT");
    return Number(inserted.rows[0].probe_id);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function markSafeFailure(input: {
  probeId: number;
  runtimeSessionId?: string | null;
  ended: Date;
  stopReason: string;
  reconciliationStatus?: "MATCH" | "MISMATCH" | "UNRESOLVED" | null;
  cleanupVerifiedAtUtc?: string | null;
}): Promise<void> {
  await pool.query(
    `UPDATE clean.adb_anchor_probe
        SET status='failed',window_end=$2,stop_reason=$3,runtime_session_id=COALESCE($4,runtime_session_id),
            reconciliation_status=COALESCE($5,reconciliation_status),
            runtime_cleanup_verified_at_utc=COALESCE($6::timestamptz,runtime_cleanup_verified_at_utc)
      WHERE probe_id=$1`,
    [input.probeId, input.ended, input.stopReason, input.runtimeSessionId ?? null,
     input.reconciliationStatus ?? null, input.cleanupVerifiedAtUtc ?? null],
  );
  await openIncident("prepaid_probe_failed", {
    probeId: input.probeId,
    stopReason: input.stopReason,
    cleanupVerified: Boolean(input.cleanupVerifiedAtUtc),
    reconciliationStatus: input.reconciliationStatus ?? null,
  });
}

/**
 * Authoritative Phase-2 Stage-1/2 execution path.
 *
 * Provider payloads go to App Storage and provider-identifying working state
 * goes only to UNLOGGED tables through runPrepaidLiveWindowV39. The logged
 * adb_anchor_probe row receives aggregate research evidence only after
 * reconciliation and verified transient cleanup.
 */
export async function executePrepaidProbeV39(input: ExecuteProbeInput): Promise<ExecuteProbeResult> {
  await assertIncidentClear();
  const started = new Date();
  assertProbeTimeClass(input.stage, started, input.artifacts.preprobe.probeTimeClass);
  const candidate = requireFrozenCandidate(input.artifacts.preprobe, input.icao, input.allowReplacement);
  await ensureProbeBudgetDay(input.artifacts.runtime);
  await assertR1Clean();
  const feeds = await checkAirportFeeds(candidate.icao);
  if (!feeds) throw new Error(`REFUSED_COVERAGE_UNKNOWN:${candidate.icao}`);

  const reservation = input.stage === 1
    ? input.artifacts.runtime.stage1ReservationCredits
    : input.artifacts.runtime.stage2ReservationCredits;
  if (!(input.authMaxAlertCredits > 0) || reservation > input.authMaxAlertCredits) {
    throw new Error("REFUSED_AUTH_CEILING");
  }
  const before = await getBalance();
  if (!before) throw new Error("REFUSED_BALANCE_UNKNOWN");
  if (before.creditsRemaining < 1000 + reservation + input.artifacts.runtime.unsettledBurstMarginCredits) {
    throw new Error("REFUSED_BALANCE_HEADROOM");
  }

  const probeId = await reserveSafeProbe(input, started);
  const priorExposure = await prepaidSafeBudgetExposureV39(input.artifacts.runtime.probeBudgetDayId, probeId);
  const settlement = {
    initialWaitSeconds: input.artifacts.runtime.settlementInitialWaitSeconds,
    pollIntervalSeconds: input.artifacts.runtime.settlementPollIntervalSeconds,
    stableReadCount: input.artifacts.runtime.settlementStableReadCount,
    timeoutSeconds: input.artifacts.runtime.settlementTimeoutSeconds,
  };
  const result = await runPrepaidLiveWindowV39({
    ownerKind: "anchor_probe",
    ownerProbeId: probeId,
    stage: input.stage,
    icao: candidate.icao,
    targetHours: input.stage === 1 ? PROBE_STAGE1_TARGET_MINUTES / 60 : PROBE_STAGE2_TARGET_MINUTES / 60,
    settledOtherCredits: priorExposure,
    hardCapCredits: PROBE_BUDGET_DAY_HARD_CAP,
    balanceBefore: before.creditsRemaining,
    settlement,
    deletionRunId: `phase2-probe-${probeId}`,
    watchdogPollMs: input.artifacts.runtime.watchdogPollMs,
  });

  if (result.status !== "completed" || !result.metrics || result.reconciliationStatus !== "MATCH" || !result.cleanupVerifiedAtUtc) {
    await markSafeFailure({
      probeId,
      runtimeSessionId: result.runtimeSessionId,
      ended: result.windowEnd,
      stopReason: result.stopReason ?? "prepaid_probe_failed",
      reconciliationStatus: result.reconciliationStatus,
      cleanupVerifiedAtUtc: result.cleanupVerifiedAtUtc,
    });
    return {
      probeId,
      status: "failed",
      creditsSpent: null,
      durationCensored: true,
      stopReason: result.stopReason ?? "prepaid_probe_failed",
    };
  }

  const denominator = result.metrics.internalSendCredits;
  if (!(denominator > 0)) {
    await markSafeFailure({
      probeId,
      runtimeSessionId: result.runtimeSessionId,
      ended: result.windowEnd,
      stopReason: "zero_reconciled_credits",
      reconciliationStatus: "MATCH",
      cleanupVerifiedAtUtc: result.cleanupVerifiedAtUtc,
    });
    return { probeId, status: "failed", creditsSpent: null, durationCensored: true, stopReason: "zero_reconciled_credits" };
  }

  const stability = completeBucketStability(
    result.windowStart,
    result.windowEnd,
    result.metrics.firstObservationMs,
    input.artifacts.runtime.minStabilityBuckets,
  );
  const hours = Math.max((result.windowEnd.getTime() - result.windowStart.getTime()) / 3_600_000, 1 / 3600);
  const lowerRate = result.metrics.confirmedUniqueLower / denominator;
  const upperRate = result.metrics.confirmedPlusAmbiguousUpper / denominator;
  const chainRate = result.metrics.tailChainLinks / denominator;

  await pool.query(
    `UPDATE clean.adb_anchor_probe
        SET status='completed',window_start=$2,window_end=$3,window_hours=$4,
            rows_delivered=$5,unique_flights=$6,tail_chain_links=$7,rows_per_hour=$8,
            unique_flights_per_credit=$9,tail_chain_links_per_credit=$10,stability=$11,
            duration_censored=$12,stop_reason=$13,complete_buckets=$14,min_stability_buckets=$15,
            confirmed_unique_lower=$16,confirmed_plus_ambiguous_upper=$17,
            confirmed_unique_lower_per_credit=$18,confirmed_plus_ambiguous_upper_per_credit=$19,
            stability_status=$20,runtime_session_id=$21,runtime_cleanup_verified_at_utc=$22::timestamptz,
            reconciliation_status='MATCH'
      WHERE probe_id=$1 AND provider_content_safe_mode=true`,
    [probeId, result.windowStart, result.windowEnd, hours,
     result.metrics.rowsDelivered, result.metrics.confirmedUniqueLower, result.metrics.tailChainLinks,
     result.metrics.rowsDelivered / hours, lowerRate, chainRate, stability.stability,
     result.durationCensored, result.stopReason, stability.completeBuckets,
     input.artifacts.runtime.minStabilityBuckets, result.metrics.confirmedUniqueLower,
     result.metrics.confirmedPlusAmbiguousUpper, lowerRate, upperRate,
     stability.stability === null ? "INSUFFICIENT_SAMPLE" : "PASS",
     result.runtimeSessionId, result.cleanupVerifiedAtUtc],
  );

  return {
    probeId,
    status: "completed",
    creditsSpent: null,
    durationCensored: result.durationCensored,
    stopReason: result.stopReason,
  };
}
