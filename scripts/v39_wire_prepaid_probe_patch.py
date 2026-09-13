#!/usr/bin/env python3
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one marker, found {count}")
    return text.replace(old, new, 1)


# Shared live window: persist the random project session binding before the
# provider subscription exists, eliminating first-delivery routing races.
p = Path("server/lib/disruption/prepaidProbeWindow_v39.ts")
t = p.read_text()
t = replace_once(
    t,
    "  watchdogPollMs: number;\n}",
    "  watchdogPollMs: number;\n  onSessionArmed?: (sessionId: string) => Promise<void>;\n}",
    "window interface",
)
t = replace_once(
    t,
    "  const webhookUrl = prepaidProbeWebhookUrlV39(defaultWebhookUrl(), session.sessionId);",
    "  if (input.onSessionArmed) await input.onSessionArmed(session.sessionId);\n  const webhookUrl = prepaidProbeWebhookUrlV39(defaultWebhookUrl(), session.sessionId);",
    "window callback",
)
p.write_text(t)

# Dedicated prepaid webhook path. This route never invokes the legacy logged
# provider-content pipeline.
p = Path("server/routes_v3.ts")
t = p.read_text()
raw_import = 'import { persistProcessingAttempt, persistRawDeliveryTransaction, updateRawDeliveryOutcome } from "./lib/disruption/rawIngress_v3";\n'
t = replace_once(
    t,
    raw_import,
    raw_import + 'import { persistPrepaidProbeWebhookV39 } from "./lib/disruption/prepaidProbeRuntime_v39";\n',
    "routes import",
)
marker = "export function registerV3Routes(app:Express):void{\n  const webhookIngress=async(req:Request,res:Response)=>{"
handler = '''export function registerV3Routes(app:Express):void{
  const prepaidWebhookIngress=async(req:Request,res:Response)=>{
    const secret=webhookSecret();
    if(secret&&(!req.params.secret||req.params.secret!==secret)){res.status(404).json({error:"Not found"});return;}
    const sessionId=String(req.params.sessionId??"").trim();
    try{
      const persisted=await persistPrepaidProbeWebhookV39({sessionId,body:req.body??{},receivedAtUtc:new Date()});
      console.log(`[adb-v3-prepaid] session=${sessionId} items=${persisted.itemCount} duplicate=${persisted.duplicate}`);
      res.status(200).json({received:true,items:persisted.itemCount,duplicate:persisted.duplicate});
    }catch(err:any){
      console.error("[adb-v3-prepaid] durable persistence failed — returning 5xx (provider details redacted)");
      await recordIncident("raw-persistence",{mode:"prepaid_probe",sessionId,error:String(err?.message??"error").slice(0,240)});
      res.status(500).json({error:"Prepaid probe persistence failed; please retry"});
    }
  };
  const webhookIngress=async(req:Request,res:Response)=>{'''
t = replace_once(t, marker, handler, "routes handler")
route = '  app.post("/api/v1/webhooks/aerodatabox",webhookIngress);\n'
t = replace_once(
    t,
    route,
    '  app.post("/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId",prepaidWebhookIngress);\n' + route,
    "routes path",
)
p.write_text(t)

# Anchor-probe live execution becomes a consumer of the shared PITR-safe owner.
p = Path("scripts/anchor_probe.ts")
t = p.read_text()
auth_import = 'import { resolveOwnerAuthorization } from "./v39_paid_guard_v39";\n'
safe_import = '''import { resolveOwnerAuthorization } from "./v39_paid_guard_v39";
import { runPrepaidLiveWindowV39 } from "../server/lib/disruption/prepaidProbeWindow_v39";
import { cleanupPrepaidProbeSessionV39 } from "../server/lib/disruption/prepaidProbeRuntime_v39";
'''
t = replace_once(t, auth_import, safe_import, "anchor imports")

reserve_start = t.index("async function reserveProbeAttempt(")
reserve_end = t.index("/** Shared settlement config for probes", reserve_start)
reserve = '''async function reserveProbeAttempt(candidate: Candidate, stage: number, start: Date, targetEnd: Date, hours: number, dayId: string, estimate: number): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [dayId]);
    const used = await client.query(
      `SELECT COALESCE(sum(GREATEST(reserved_credits,COALESCE(internal_send_credits,0))),0)::int n
         FROM clean.adb_anchor_probe WHERE probe_budget_day_id=$1`, [dayId]);
    if (Number(used.rows[0].n) + estimate > PROBE_DAILY_CAP) throw new Error(`reservation exceeds probe cap (${used.rows[0].n}+${estimate}>${PROBE_DAILY_CAP})`);
    const row = await client.query(
      `INSERT INTO clean.adb_anchor_probe
       (stage,icao,region,window_start,window_end,window_hours,status,probe_budget_day_id,reserved_credits)
       VALUES ($1,$2,$3,$4,$5,$6,'probing',$7,$8) RETURNING probe_id`,
      [stage,candidate.icao,candidate.region,start,targetEnd,hours,dayId,estimate]);
    await client.query("COMMIT");
    return Number(row.rows[0].probe_id);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

'''
t = t[:reserve_start] + reserve + t[reserve_end:]
t = t.replace(
    "WHERE probe_budget_day_id = $1 AND credits_spent IS NULL AND status IN ('completed','failed','abandoned')",
    "WHERE probe_budget_day_id = $1 AND reconciliation_status IS DISTINCT FROM 'MATCH' AND status IN ('completed','failed','abandoned')",
)

old_foreign = '''async function foreignActiveBillable(): Promise<
  { id: string; subject?: string; billingType?: string }[]
> {
  const subs = await listSubscriptions();
  return subs
    .filter((s) => s.isActive && s.billingType !== "LifetimeBased")
    .map((s) => ({
      id: s.id,
      subject: s.subject?.type ? `${s.subject.type}:${s.subject.id ?? "?"}` : "?",
      billingType: s.billingType,
    }));
}'''
new_foreign = '''async function foreignActiveBillable(): Promise<
  { id: string; subject?: string; billingType?: string; subscriber?: string }[]
> {
  const subs = await listSubscriptions();
  return subs
    .filter((s) => s.isActive && s.billingType !== "LifetimeBased")
    .map((s) => ({
      id: s.id,
      subject: s.subject?.type ? `${s.subject.type}:${s.subject.id ?? "?"}` : "?",
      billingType: s.billingType,
      subscriber: s.subscriber?.id ?? undefined,
    }));
}'''
t = replace_once(t, old_foreign, new_foreign, "foreign subscriptions")

run_start = t.index("async function runSingleProbe(")
run_end = t.index("// ---------------------------------------------------------------------------\n// Scoring", run_start)
run_fn = r'''async function runSingleProbe(candidate: Candidate, stage: number, hours: number): Promise<void> {
  const icao = candidate.icao;
  console.log(`\n=== PROBE ${icao} (stage ${stage}, ${hours}h window, ${candidate.region}) ===`);
  if (await hasStageProbe(icao, stage)) { console.log(`  already probed (stage ${stage}) — skipping.`); return; }
  const budget = await checkBudget();
  if (!budget.ok) { console.log(`  SKIPPED — ${budget.reason}`); return; }
  const exclusivity = await assertExclusivity();
  if (!exclusivity.ok) { console.log(`  SKIPPED — ${exclusivity.reason}`); return; }
  const feeds = await checkAirportFeeds(icao);
  console.log(`  feed membership check: ${feeds ? "covered" : "no feed data returned — REFUSED for paid probe"}`);
  if (!feeds) return;
  const balBefore = await getBalance();
  if (!balBefore || !Number.isInteger(balBefore.creditsRemaining)) { console.log("  SKIPPED — authoritative balance unavailable"); return; }
  const balanceBefore = balBefore.creditsRemaining;

  const probeBudgetDayId = await getOrCreateProbeBudgetDay();
  const windowStartPreview = new Date();
  const windowEndPreview = new Date(windowStartPreview.getTime() + hours * 3600_000);
  if (windowStartPreview.toISOString().slice(0,10) !== windowEndPreview.toISOString().slice(0,10)) {
    console.log("  SKIPPED — window crosses UTC midnight and no explicit split identity exists."); return;
  }
  const estimatedWorstCase = Number(process.env.ADB_PROBE_MAX_EXPOSURE_CREDITS);
  if (!Number.isInteger(estimatedWorstCase) || estimatedWorstCase <= 0) {
    console.log("  SKIPPED — ADB_PROBE_MAX_EXPOSURE_CREDITS must be an explicit positive integer from AUTH."); return;
  }
  const settledDaySpend = await probeBudgetDaySettledSpend(probeBudgetDayId);
  const probeId = await reserveProbeAttempt(candidate, stage, windowStartPreview, windowEndPreview, hours, probeBudgetDayId, estimatedWorstCase);

  const live = await runPrepaidLiveWindowV39({
    ownerKind: "anchor_probe", ownerProbeId: probeId, stage: stage as 1 | 2, icao,
    targetHours: hours, settledOtherCredits: settledDaySpend, hardCapCredits: PROBE_DAILY_CAP,
    balanceBefore, settlement: PROBE_SETTLEMENT,
    deletionRunId: `anchor-probe:${probeId}:${randomUUID()}`,
    watchdogPollMs: Number(process.env.ADB_PROBE_WATCHDOG_POLL_MS || 10_000),
    onSessionArmed: async (sessionId) => {
      await pool.query(`UPDATE clean.adb_anchor_probe SET runtime_session_id=$1 WHERE probe_id=$2`, [sessionId, probeId]);
    },
  });

  if (live.status !== "completed" || live.reconciliationStatus !== "MATCH" || !live.metrics || !live.cleanupVerifiedAtUtc) {
    await pool.query(
      `UPDATE clean.adb_anchor_probe
          SET status='failed',window_start=$2,window_end=$3,duration_censored=$4,stop_reason=$5,
              reconciliation_status=$6,internal_send_credits=$7,settlement_reads=$8,
              runtime_cleanup_verified_at_utc=$9
        WHERE probe_id=$1`,
      [probeId,live.windowStart,live.windowEnd,live.durationCensored,live.stopReason,
       live.reconciliationStatus,live.internalSendCredits,live.settlementReads,live.cleanupVerifiedAtUtc],
    );
    console.log(`  FAILED — ${live.stopReason ?? live.reconciliationStatus}; provider account values were not persisted.`);
    return;
  }

  const metrics = live.metrics;
  const MIN_STABILITY_BUCKETS = Number(process.env.ADB_PROBE_MIN_STABILITY_BUCKETS || 4);
  const stabilityResult = completeBucketStability(live.windowStart.getTime(), live.windowEnd.getTime(), metrics.firstObservationMs, MIN_STABILITY_BUCKETS);
  const windowHours = (live.windowEnd.getTime() - live.windowStart.getTime()) / 3600_000;
  const rowsPerHour = windowHours > 0 ? metrics.rowsDelivered / windowHours : 0;
  const denominator = live.internalSendCredits;
  const ufPerCredit = denominator > 0 ? metrics.confirmedUniqueLower / denominator : null;
  const chainPerCredit = denominator > 0 ? metrics.tailChainLinks / denominator : null;

  await pool.query(
    `UPDATE clean.adb_anchor_probe SET
       window_start=$2,window_end=$3,window_hours=$4,
       rows_delivered=$5,unique_flights=$6,tail_chain_links=$7,rows_per_hour=$8,
       unique_flights_per_credit=$9,tail_chain_links_per_credit=$10,stability=$11,
       status='completed',duration_censored=$12,stop_reason=$13,
       complete_buckets=$14,min_stability_buckets=$15,
       confirmed_unique_lower=$16,confirmed_plus_ambiguous_upper=$17,
       settlement_reads=$18,stability_status=$19,internal_send_credits=$20,
       reconciliation_status='MATCH',runtime_cleanup_verified_at_utc=$21,reserved_credits=$20
     WHERE probe_id=$1`,
    [probeId,live.windowStart,live.windowEnd,windowHours,metrics.rowsDelivered,metrics.uniqueFlights,
     metrics.tailChainLinks,rowsPerHour,ufPerCredit,chainPerCredit,stabilityResult.stability,
     live.durationCensored,live.stopReason,stabilityResult.bucketCounts.length,MIN_STABILITY_BUCKETS,
     metrics.confirmedUniqueLower,metrics.confirmedPlusAmbiguousUpper,live.settlementReads,
     stabilityResult.status,live.internalSendCredits,new Date(live.cleanupVerifiedAtUtc)],
  );
  console.log(`  completed: rows=${metrics.rowsDelivered} confirmed=${metrics.confirmedUniqueLower} chain=${metrics.tailChainLinks} internal_send=${live.internalSendCredits} cleanup=verified`);
  // Do not close the 500-credit budget ledger automatically per candidate.
}

'''
t = t[:run_start] + run_fn + t[run_end:]

cleanup_start = t.index("async function runCleanup(): Promise<void> {")
cleanup_end = t.index("/** --check-webhook", cleanup_start)
cleanup_fn = r'''async function runCleanup(): Promise<void> {
  console.log("R1 orphan cleanup — searching for probe-owned subscriptions...");
  const probing = await pool.query(
    `SELECT probe_id,icao,stage,subscription_id,runtime_session_id,window_start
       FROM clean.adb_anchor_probe WHERE status='probing' ORDER BY window_start`,
  );
  const active = await foreignActiveBillable();
  const tracked = new Set<string>();
  let deleted = 0;
  for (const row of probing.rows) {
    const runtimeSession = row.runtime_session_id ? String(row.runtime_session_id) : null;
    let subId = row.subscription_id as string | null;
    if (runtimeSession) {
      const runtime = await pool.query(`SELECT provider_subscription_id FROM clean.prepaid_probe_session_runtime WHERE session_id=$1`, [runtimeSession]);
      subId = runtime.rows[0]?.provider_subscription_id ? String(runtime.rows[0].provider_subscription_id) : null;
      if (!subId) subId = active.find((s) => s.subscriber?.includes(runtimeSession))?.id ?? null;
    }
    if (subId) tracked.add(subId);
    const ok = subId ? await deleteSubscription(subId) : true;
    if (subId) console.log(`  ${ok ? "deleted" : "DELETE FAILED"} tracked probe subscription (${row.icao} stage ${row.stage})`);
    if (ok && subId) deleted++;
    let cleanupVerified: string | null = null;
    if (ok && runtimeSession) {
      try {
        const cleanup = await cleanupPrepaidProbeSessionV39(runtimeSession, `operator-cleanup:${row.probe_id}:${randomUUID()}`);
        cleanupVerified = cleanup.verifiedAtUtc;
      } catch (error: any) {
        console.error(`  runtime/blob cleanup failed for probe ${row.probe_id}: ${error?.message ?? error}`);
      }
    }
    await pool.query(
      `UPDATE clean.adb_anchor_probe
          SET status=$1,stop_reason=$2,window_end=now(),runtime_cleanup_verified_at_utc=COALESCE($3,runtime_cleanup_verified_at_utc)
        WHERE probe_id=$4`,
      [ok && (!runtimeSession || cleanupVerified) ? "abandoned" : "failed",
       ok ? "operator_cleanup" : "cleanup_delete_failed", cleanupVerified, row.probe_id],
    );
  }
  console.log(`  tracked probe subscriptions deleted: ${deleted}`);
  const untracked = active.filter((s) => !tracked.has(s.id));
  if (untracked.length) {
    console.log(`  ${untracked.length} untracked ACTIVE credit subscription(s) NOT touched; paid work remains blocked until resolved by the owning cleanup path.`);
  } else {
    console.log("  no other ACTIVE credit-based subscriptions on the account.");
  }
}

'''
t = t[:cleanup_start] + cleanup_fn + t[cleanup_end:]
p.write_text(t)

print("prepaid probe wiring patch applied")
