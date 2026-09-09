/**
 * V3.9-f.8 Gate-2 paid probe execution engine.
 *
 * Pure source constants below are binding Plan constants: Stage1=2h,
 * Stage2=4h, capacity gate=60 rows/hour, probe budget-day hard cap=500.
 * Runtime safety values measured/frozen after the safety smoke are loaded from
 * a separate hash-verified runtime artifact; there are no live env defaults.
 */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { pool } from "../../db";
import {
  getBalance,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  checkAirportFeeds,
} from "./aerodataboxLimiter_v3";
import { runSettlement, type SettlementConfig } from "./settlement_v3";
import {
  loadFrozenProbeArtifact,
  type FrozenProbeArtifact,
  type FrozenProbeCandidate,
} from "./anchorPromotion_v39";

export const PROBE_BUDGET_DAY_HARD_CAP = 500;
export const PROBE_STAGE1_TARGET_MINUTES = 120;
export const PROBE_STAGE2_TARGET_MINUTES = 240;
export const PROBE_CAPACITY_GATE_ROWS_PER_HOUR = 60;
export const PROBE_TIME_CLASS_TOLERANCE_HOURS = 1;

export interface ProbeRuntimeConfig {
  version: string;
  probeBudgetDayId: string;
  watchdogPollMs: number;
  minStabilityBuckets: number;
  settlementInitialWaitSeconds: number;
  settlementPollIntervalSeconds: number;
  settlementStableReadCount: number;
  settlementTimeoutSeconds: number;
  unsettledBurstMarginCredits: number;
  stage1ReservationCredits: number;
  stage2ReservationCredits: number;
}
export interface ProbeTimeClassConfig {
  stage1UtcSlotHour: number;
  stage1WeekdayClass: "weekday" | "weekend";
  stage2UtcSlotHour: number;
  stage2WeekdayClass: "weekday" | "weekend";
}
export interface ProbeArtifactExecutionExtension {
  probeTimeClass: ProbeTimeClassConfig;
}
export interface LoadedProbeExecutionArtifacts {
  preprobe: FrozenProbeArtifact & ProbeArtifactExecutionExtension;
  preprobeSha256: string;
  runtime: ProbeRuntimeConfig;
  runtimeSha256: string;
}
export interface ProbeExecutionDependencies {
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
  getBalance: typeof getBalance;
  createSubscription: typeof createSubscription;
  deleteSubscription: typeof deleteSubscription;
  listSubscriptions: typeof listSubscriptions;
  checkAirportFeeds: typeof checkAirportFeeds;
}
const defaultDeps: ProbeExecutionDependencies = {
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  getBalance,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  checkAirportFeeds,
};

function hash(raw: string): string { return createHash("sha256").update(raw).digest("hex"); }
function assertHash(expected: string, label: string): void {
  if (!/^[a-f0-9]{64}$/i.test(expected)) throw new Error(`REFUSED: invalid ${label} SHA-256`);
}
function finitePositiveInt(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`REFUSED: ${label} must be a positive integer`);
  return n;
}
function finiteNonnegativeInt(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`REFUSED: ${label} must be a nonnegative integer`);
  return n;
}

export function loadProbeRuntimeConfig(path: string, expectedSha256: string): { config: ProbeRuntimeConfig; sha256: string } {
  assertHash(expectedSha256, "probe runtime artifact");
  const raw = readFileSync(path, "utf8");
  const actual = hash(raw);
  if (actual !== expectedSha256.toLowerCase()) throw new Error(`REFUSED: probe runtime artifact hash mismatch expected=${expectedSha256} actual=${actual}`);
  const x = JSON.parse(raw);
  const config: ProbeRuntimeConfig = {
    version: String(x.version ?? ""),
    probeBudgetDayId: String(x.probeBudgetDayId ?? ""),
    watchdogPollMs: finitePositiveInt(x.watchdogPollMs, "watchdogPollMs"),
    minStabilityBuckets: finitePositiveInt(x.minStabilityBuckets, "minStabilityBuckets"),
    settlementInitialWaitSeconds: finiteNonnegativeInt(x.settlementInitialWaitSeconds, "settlementInitialWaitSeconds"),
    settlementPollIntervalSeconds: finitePositiveInt(x.settlementPollIntervalSeconds, "settlementPollIntervalSeconds"),
    settlementStableReadCount: finitePositiveInt(x.settlementStableReadCount, "settlementStableReadCount"),
    settlementTimeoutSeconds: finitePositiveInt(x.settlementTimeoutSeconds, "settlementTimeoutSeconds"),
    unsettledBurstMarginCredits: finiteNonnegativeInt(x.unsettledBurstMarginCredits, "unsettledBurstMarginCredits"),
    stage1ReservationCredits: finitePositiveInt(x.stage1ReservationCredits, "stage1ReservationCredits"),
    stage2ReservationCredits: finitePositiveInt(x.stage2ReservationCredits, "stage2ReservationCredits"),
  };
  if (!config.version || !/^[A-Za-z0-9_.:-]+$/.test(config.probeBudgetDayId)) throw new Error("REFUSED: invalid probe runtime version/budget-day id");
  if (config.settlementStableReadCount < 3) throw new Error("REFUSED: settlementStableReadCount must be >=3");
  if (config.stage1ReservationCredits > PROBE_BUDGET_DAY_HARD_CAP || config.stage2ReservationCredits > PROBE_BUDGET_DAY_HARD_CAP) {
    throw new Error("REFUSED: per-probe reservation exceeds 500-credit probe budget-day cap");
  }
  return { config, sha256: actual };
}

export function loadProbeExecutionArtifacts(input: {
  preprobePath: string;
  preprobeSha256: string;
  runtimePath: string;
  runtimeSha256: string;
}): LoadedProbeExecutionArtifacts {
  const frozen = loadFrozenProbeArtifact(input.preprobePath, input.preprobeSha256);
  const ext = frozen.artifact as FrozenProbeArtifact & Partial<ProbeArtifactExecutionExtension>;
  const tc = ext.probeTimeClass;
  if (!tc) throw new Error("REFUSED: preprobe artifact lacks frozen probeTimeClass");
  for (const [label, hour] of [["stage1UtcSlotHour", tc.stage1UtcSlotHour], ["stage2UtcSlotHour", tc.stage2UtcSlotHour]] as const) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error(`REFUSED: invalid ${label}`);
  }
  if (!["weekday", "weekend"].includes(tc.stage1WeekdayClass) || !["weekday", "weekend"].includes(tc.stage2WeekdayClass)) {
    throw new Error("REFUSED: invalid frozen probe weekday class");
  }
  const runtime = loadProbeRuntimeConfig(input.runtimePath, input.runtimeSha256);
  return { preprobe: ext as FrozenProbeArtifact & ProbeArtifactExecutionExtension, preprobeSha256: frozen.artifactHash, runtime: runtime.config, runtimeSha256: runtime.sha256 };
}

function weekdayClass(date: Date): "weekday" | "weekend" {
  const d = date.getUTCDay();
  return d === 0 || d === 6 ? "weekend" : "weekday";
}
function circularHourDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 24 - d);
}
export function assertProbeTimeClass(stage: 1 | 2, now: Date, config: ProbeTimeClassConfig): void {
  const targetHour = stage === 1 ? config.stage1UtcSlotHour : config.stage2UtcSlotHour;
  const targetWeekday = stage === 1 ? config.stage1WeekdayClass : config.stage2WeekdayClass;
  if (weekdayClass(now) !== targetWeekday) throw new Error(`REFUSED_TIME_CLASS: stage ${stage} requires ${targetWeekday}`);
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  if (circularHourDistance(h, targetHour) > PROBE_TIME_CLASS_TOLERANCE_HOURS) {
    throw new Error(`REFUSED_TIME_CLASS: stage ${stage} must start within UTC slot ${targetHour}:00 ±1h`);
  }
}

function candidateMap(artifact: FrozenProbeArtifact): Map<string, FrozenProbeCandidate> {
  return new Map([...artifact.shortlist, ...artifact.replacements].map((c) => [c.icao.toUpperCase(), c]));
}
export function requireFrozenCandidate(artifact: FrozenProbeArtifact, icao: string, allowReplacement: boolean): FrozenProbeCandidate {
  const normalized = icao.toUpperCase();
  const primary = artifact.shortlist.find((c) => c.icao === normalized);
  const replacement = artifact.replacements.find((c) => c.icao === normalized);
  const candidate = primary ?? (allowReplacement ? replacement : undefined);
  if (!candidate) throw new Error(`REFUSED_MEMBERSHIP: ${normalized} is not an authorized ${allowReplacement ? "shortlist/replacement" : "Stage-1 shortlist"} candidate`);
  return candidate;
}

async function assertIncidentClear(): Promise<void> {
  const r = await pool.query(`SELECT cause FROM clean.adb_incident_stop WHERE resolved=false ORDER BY occurred_at_utc DESC LIMIT 1`);
  if (r.rowCount) throw new Error(`REFUSED_INCIDENT_STOP: ${r.rows[0].cause}`);
}
async function openIncident(cause: string, detail: unknown): Promise<void> {
  await pool.query(`INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved) VALUES($1,now(),$2,false)`, [cause, JSON.stringify(detail)]);
}
async function assertR1Clean(deps: ProbeExecutionDependencies): Promise<void> {
  const subs = await deps.listSubscriptions();
  const foreign = subs.filter((s) => s.isActive && s.billingType !== "LifetimeBased");
  if (foreign.length) throw new Error(`REFUSED_R1: ${foreign.length} foreign active billable subscription(s): ${foreign.map((x) => x.id).join(",")}`);
}

export async function ensureProbeBudgetDay(config: ProbeRuntimeConfig): Promise<void> {
  const mismatch = await pool.query(`SELECT probe_budget_day_id FROM clean.adb_probe_budget_day WHERE state='MISMATCH' LIMIT 1`);
  if (mismatch.rowCount) throw new Error(`REFUSED_PROBE_BUDGET_MISMATCH: ${mismatch.rows[0].probe_budget_day_id}`);
  const open = await pool.query(`SELECT probe_budget_day_id FROM clean.adb_probe_budget_day WHERE state='OPEN'`);
  if (open.rowCount && open.rows[0].probe_budget_day_id !== config.probeBudgetDayId) {
    throw new Error(`REFUSED_PROBE_BUDGET_OPEN: ${open.rows[0].probe_budget_day_id} must settle/close before ${config.probeBudgetDayId}`);
  }
  await pool.query(
    `INSERT INTO clean.adb_probe_budget_day(probe_budget_day_id,state,cap_credits)
     VALUES($1,'OPEN',500) ON CONFLICT(probe_budget_day_id) DO NOTHING`,
    [config.probeBudgetDayId],
  );
  const current = await pool.query(`SELECT state FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1`, [config.probeBudgetDayId]);
  if (current.rows[0]?.state !== "OPEN") throw new Error(`REFUSED_PROBE_BUDGET_STATE: ${config.probeBudgetDayId} is ${current.rows[0]?.state ?? "missing"}`);
}

/** Settled terminal rows count actual exposure; active probing rows count reservation. */
export async function probeBudgetExposure(dayId: string): Promise<number> {
  const r = await pool.query(
    `SELECT COALESCE(sum(CASE
       WHEN status='probing' THEN GREATEST(reserved_credits,COALESCE(credits_spent,0),COALESCE(internal_send_credits,0))
       ELSE GREATEST(COALESCE(credits_spent,0),COALESCE(internal_send_credits,0)) END),0)::int n
       FROM clean.adb_anchor_probe WHERE probe_budget_day_id=$1`, [dayId],
  );
  return Number(r.rows[0]?.n ?? 0);
}

async function reserveProbe(candidate: FrozenProbeCandidate, stage: 1 | 2, now: Date, runtime: ProbeRuntimeConfig, preprobeHash: string): Promise<number> {
  const reservation = stage === 1 ? runtime.stage1ReservationCredits : runtime.stage2ReservationCredits;
  const durationMinutes = stage === 1 ? PROBE_STAGE1_TARGET_MINUTES : PROBE_STAGE2_TARGET_MINUTES;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [runtime.probeBudgetDayId]);
    const active = await client.query(`SELECT 1 FROM clean.adb_anchor_probe WHERE status='probing' LIMIT 1`);
    if (active.rowCount) throw new Error("REFUSED_PROBE_OVERLAP: another probe is active");
    const exposure = await client.query(
      `SELECT COALESCE(sum(CASE
       WHEN status='probing' THEN GREATEST(reserved_credits,COALESCE(credits_spent,0),COALESCE(internal_send_credits,0))
       ELSE GREATEST(COALESCE(credits_spent,0),COALESCE(internal_send_credits,0)) END),0)::int n
       FROM clean.adb_anchor_probe WHERE probe_budget_day_id=$1`, [runtime.probeBudgetDayId],
    );
    if (Number(exposure.rows[0]?.n ?? 0) + reservation + runtime.unsettledBurstMarginCredits > PROBE_BUDGET_DAY_HARD_CAP) {
      throw new Error("REFUSED_PROBE_CAP: settled exposure + reservation + unsettled margin exceeds 500");
    }
    const end = new Date(now.getTime() + durationMinutes * 60_000);
    if (now.toISOString().slice(0,10) !== end.toISOString().slice(0,10)) throw new Error("REFUSED_PROBE_MIDNIGHT: probe may not cross UTC midnight without an explicit split budget identity");
    const inserted = await client.query(
      `INSERT INTO clean.adb_anchor_probe
       (stage,icao,region,window_start,window_end,window_hours,status,probe_budget_day_id,
        reserved_credits,preprobe_artifact_sha256)
       VALUES($1,$2,$3,$4,$5,$6,'probing',$7,$8,$9) RETURNING probe_id`,
      [stage,candidate.icao,candidate.region,now,end,durationMinutes/60,runtime.probeBudgetDayId,reservation,preprobeHash],
    );
    await client.query("COMMIT");
    return Number(inserted.rows[0].probe_id);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

interface ExposureSnapshot { internal: number; missingCostRecords: number; external: number | null; currentBalance: number | null }
async function exposureSnapshot(subscriptionId: string, balanceBefore: number | null, deps: ProbeExecutionDependencies): Promise<ExposureSnapshot> {
  const r = await pool.query(
    `SELECT COALESCE(sum(COALESCE(adb_cost_credits,notification_items,0)),0)::int internal,
            count(*) FILTER (WHERE adb_cost_credits IS NULL)::int missing_cost
       FROM clean.raw_delivery WHERE subscription_id=$1`, [subscriptionId],
  );
  const b = await deps.getBalance();
  return {
    internal: Number(r.rows[0]?.internal ?? 0),
    missingCostRecords: Number(r.rows[0]?.missing_cost ?? 0),
    external: balanceBefore !== null && b ? Math.max(0, balanceBefore - b.creditsRemaining) : null,
    currentBalance: b?.creditsRemaining ?? null,
  };
}

function completeBucketStability(start: Date, end: Date, firstObservationMs: number[], minBuckets: number): { stability: number | null; buckets: number } {
  const width = 15 * 60_000;
  const first = Math.ceil(start.getTime()/width)*width;
  const last = Math.floor(end.getTime()/width)*width;
  const counts: number[] = [];
  for(let t=first;t+width<=last;t+=width) counts.push(firstObservationMs.filter((x)=>x>=t&&x<t+width).length);
  if(counts.length<minBuckets) return { stability:null,buckets:counts.length };
  const mean=counts.reduce((a,b)=>a+b,0)/counts.length;
  if(mean===0)return{stability:0,buckets:counts.length};
  const variance=counts.reduce((a,b)=>a+(b-mean)**2,0)/counts.length;
  return{stability:1/(1+Math.sqrt(variance)/mean),buckets:counts.length};
}

async function computeProbeMetrics(subscriptionId: string, start: Date, end: Date, creditsSpent: number, runtime: ProbeRuntimeConfig) {
  const raw = await pool.query(
    `SELECT COALESCE(sum(notification_items),0)::int rows
       FROM clean.raw_delivery WHERE subscription_id=$1 AND received_at_utc >= $2 AND received_at_utc < $3`,
    [subscriptionId,start,end],
  );
  const ids = await pool.query(
    `SELECT wir.resolution_status,wir.flight_instance_id,wir.resolved_at_utc
       FROM clean.webhook_identity_resolution wir
       JOIN clean.raw_delivery rd ON rd.delivery_id=wir.delivery_id
      WHERE rd.subscription_id=$1 AND rd.received_at_utc >= $2 AND rd.received_at_utc < $3`,
    [subscriptionId,start,end],
  );
  const confirmedIds = new Set(ids.rows.filter((x:any)=>x.resolution_status==='resolved'&&x.flight_instance_id).map((x:any)=>String(x.flight_instance_id)));
  const ambiguousRecords = ids.rows.filter((x:any)=>x.resolution_status==='quarantined').length;
  const lower = confirmedIds.size;
  const upper = lower + ambiguousRecords;
  const chain = await pool.query(
    `SELECT COALESCE(sum(GREATEST(n-1,0)),0)::int links FROM (
       SELECT aircraft_reg,count(DISTINCT flight_instance_id)::int n
         FROM clean.flight_events
        WHERE subscription_id=$1 AND available_at >= $2 AND available_at < $3
          AND flight_instance_id IS NOT NULL AND aircraft_reg IS NOT NULL
        GROUP BY aircraft_reg
     ) q`, [subscriptionId,start,end],
  );
  const firstObs = await pool.query(
    `SELECT extract(epoch FROM min(available_at))*1000 AS event_ms
       FROM clean.flight_events
      WHERE subscription_id=$1 AND available_at >= $2 AND available_at < $3 AND flight_instance_id IS NOT NULL
      GROUP BY flight_instance_id`, [subscriptionId,start,end],
  );
  const stab=completeBucketStability(start,end,firstObs.rows.map((r:any)=>Number(r.event_ms)),runtime.minStabilityBuckets);
  const hours=Math.max((end.getTime()-start.getTime())/3_600_000,1/3600);
  const rowsDelivered=Number(raw.rows[0]?.rows??0),links=Number(chain.rows[0]?.links??0);
  return {
    rowsDelivered, confirmedUniqueLower:lower, confirmedPlusAmbiguousUpper:upper,
    tailChainLinks:links, rowsPerHour:rowsDelivered/hours,
    uniqueFlightsPerCredit:creditsSpent>0?lower/creditsSpent:null,
    tailChainLinksPerCredit:creditsSpent>0?links/creditsSpent:null,
    stability:stab.stability, completeBuckets:stab.buckets,
    stabilityStatus:stab.stability===null?"INSUFFICIENT_SAMPLE":"PASS",
  };
}

export interface ExecuteProbeInput {
  stage: 1 | 2;
  icao: string;
  allowReplacement: boolean;
  artifacts: LoadedProbeExecutionArtifacts;
  authMaxAlertCredits: number;
}
export interface ExecuteProbeResult { probeId:number; status:"completed"|"failed"; creditsSpent:number|null; durationCensored:boolean; stopReason:string|null }

export async function executeProbe(input: ExecuteProbeInput, deps: ProbeExecutionDependencies = defaultDeps): Promise<ExecuteProbeResult> {
  await assertIncidentClear();
  const now=deps.now();
  assertProbeTimeClass(input.stage,now,input.artifacts.preprobe.probeTimeClass);
  const candidate=requireFrozenCandidate(input.artifacts.preprobe,input.icao,input.allowReplacement);
  await ensureProbeBudgetDay(input.artifacts.runtime);
  await assertR1Clean(deps);
  const feeds=await deps.checkAirportFeeds(candidate.icao);
  if(!feeds)throw new Error(`REFUSED_COVERAGE_UNKNOWN: ${candidate.icao}`);
  const reservation=input.stage===1?input.artifacts.runtime.stage1ReservationCredits:input.artifacts.runtime.stage2ReservationCredits;
  if(input.authMaxAlertCredits<=0||reservation>input.authMaxAlertCredits)throw new Error("REFUSED_AUTH_CEILING: probe reservation exceeds AUTH Alert ceiling");
  const before=await deps.getBalance();
  if(!before)throw new Error("REFUSED_BALANCE_UNKNOWN");
  if(before.creditsRemaining < 1000 + reservation + input.artifacts.runtime.unsettledBurstMarginCredits)throw new Error("REFUSED_BALANCE_HEADROOM");

  const probeId=await reserveProbe(candidate,input.stage,now,input.artifacts.runtime,input.artifacts.preprobeSha256);
  const sub=await deps.createSubscription("FlightByAirportIcao",candidate.icao,{maxDeliveryRetries:0});
  if(!sub?.id){
    await pool.query(`UPDATE clean.adb_anchor_probe SET status='failed',stop_reason='subscription_create_failed' WHERE probe_id=$1`,[probeId]);
    return{probeId,status:"failed",creditsSpent:0,durationCensored:true,stopReason:"subscription_create_failed"};
  }
  await pool.query(`UPDATE clean.adb_anchor_probe SET subscription_id=$1,balance_before=$2,window_start=$3 WHERE probe_id=$4`,[sub.id,before.creditsRemaining,now,probeId]);
  const targetMinutes=input.stage===1?PROBE_STAGE1_TARGET_MINUTES:PROBE_STAGE2_TARGET_MINUTES;
  const targetEnd=new Date(now.getTime()+targetMinutes*60_000);
  let stopReason:string|null=null;
  while(deps.now()<targetEnd){
    await deps.sleep(Math.min(input.artifacts.runtime.watchdogPollMs,Math.max(1,targetEnd.getTime()-deps.now().getTime())));
    const live=await exposureSnapshot(sub.id,before.creditsRemaining,deps);
    const prior=Math.max(0,(await probeBudgetExposure(input.artifacts.runtime.probeBudgetDayId))-reservation);
    const active=Math.max(live.internal,live.external??0);
    if(prior+active+input.artifacts.runtime.unsettledBurstMarginCredits>=PROBE_BUDGET_DAY_HARD_CAP){stopReason="probe_cap_soft_stop";break;}
    if(active+input.artifacts.runtime.unsettledBurstMarginCredits>=reservation){stopReason="probe_reservation_soft_stop";break;}
  }
  const ended=deps.now();
  const deleted=await deps.deleteSubscription(sub.id);
  if(!deleted){
    await pool.query(`UPDATE clean.adb_anchor_probe SET status='failed',window_end=$2,stop_reason='provider_delete_failure' WHERE probe_id=$1`,[probeId,ended]);
    await pool.query(`UPDATE clean.adb_probe_budget_day SET state='MISMATCH',closed_at=now() WHERE probe_budget_day_id=$1`,[input.artifacts.runtime.probeBudgetDayId]);
    await openIncident("deletion",{probeId,subscriptionId:sub.id});
    return{probeId,status:"failed",creditsSpent:null,durationCensored:true,stopReason:"provider_delete_failure"};
  }

  const settlementConfig:SettlementConfig={
    initialWaitSeconds:input.artifacts.runtime.settlementInitialWaitSeconds,
    pollIntervalSeconds:input.artifacts.runtime.settlementPollIntervalSeconds,
    stableReadCount:input.artifacts.runtime.settlementStableReadCount,
    timeoutSeconds:input.artifacts.runtime.settlementTimeoutSeconds,
  };
  const settled=await runSettlement(settlementConfig,async()=> (await deps.getBalance())?.creditsRemaining??null);
  if(settled.status!=="settled"){
    await pool.query(`UPDATE clean.adb_anchor_probe SET status='failed',window_end=$2,stop_reason='SETTLEMENT_UNRESOLVED' WHERE probe_id=$1`,[probeId,ended]);
    await pool.query(`UPDATE clean.adb_probe_budget_day SET state='MISMATCH',closed_at=now() WHERE probe_budget_day_id=$1`,[input.artifacts.runtime.probeBudgetDayId]);
    await openIncident("settlement",{probeId,reason:settled.reason});
    return{probeId,status:"failed",creditsSpent:null,durationCensored:true,stopReason:"SETTLEMENT_UNRESOLVED"};
  }
  const creditsSpent=Math.max(0,before.creditsRemaining-settled.stableBalance);
  const exposure=await exposureSnapshot(sub.id,before.creditsRemaining,deps);
  if(exposure.missingCostRecords>0||exposure.internal!==creditsSpent){
    await pool.query(`UPDATE clean.adb_anchor_probe SET status='failed',window_end=$2,balance_after=$3,credits_spent=$4,internal_send_credits=$5,settlement_reads=$6,settlement_stable_balance=$3,stop_reason='RECONCILIATION_MISMATCH' WHERE probe_id=$1`,[probeId,ended,settled.stableBalance,creditsSpent,exposure.internal,settled.readsUsed]);
    await pool.query(`UPDATE clean.adb_probe_budget_day SET state='MISMATCH',closed_at=now() WHERE probe_budget_day_id=$1`,[input.artifacts.runtime.probeBudgetDayId]);
    await openIncident("reconciliation",{probeId,creditsSpent,internal:exposure.internal,missingCostRecords:exposure.missingCostRecords});
    return{probeId,status:"failed",creditsSpent,durationCensored:true,stopReason:"RECONCILIATION_MISMATCH"};
  }
  const metrics=await computeProbeMetrics(sub.id,now,ended,creditsSpent,input.artifacts.runtime);
  const durationCensored=ended.getTime()<targetEnd.getTime()-1000;
  const finalStop=durationCensored?(stopReason??"safety_stop"):null;
  await pool.query(
    `UPDATE clean.adb_anchor_probe SET status='completed',window_end=$2,window_hours=$3,balance_after=$4,credits_spent=$5,
      internal_send_credits=$6,rows_delivered=$7,unique_flights=$8,tail_chain_links=$9,rows_per_hour=$10,
      unique_flights_per_credit=$11,tail_chain_links_per_credit=$12,stability=$13,duration_censored=$14,stop_reason=$15,
      complete_buckets=$16,min_stability_buckets=$17,confirmed_unique_lower=$8,confirmed_plus_ambiguous_upper=$18,
      settlement_reads=$19,settlement_stable_balance=$4,stability_status=$20 WHERE probe_id=$1`,
    [probeId,ended,(ended.getTime()-now.getTime())/3_600_000,settled.stableBalance,creditsSpent,exposure.internal,
     metrics.rowsDelivered,metrics.confirmedUniqueLower,metrics.tailChainLinks,metrics.rowsPerHour,metrics.uniqueFlightsPerCredit,
     metrics.tailChainLinksPerCredit,metrics.stability,durationCensored,finalStop,metrics.completeBuckets,
     input.artifacts.runtime.minStabilityBuckets,metrics.confirmedPlusAmbiguousUpper,settled.readsUsed,metrics.stabilityStatus],
  );
  const dayExposure=await probeBudgetExposure(input.artifacts.runtime.probeBudgetDayId);
  if(dayExposure>PROBE_BUDGET_DAY_HARD_CAP){
    await pool.query(`UPDATE clean.adb_probe_budget_day SET state='MISMATCH',closed_at=now() WHERE probe_budget_day_id=$1`,[input.artifacts.runtime.probeBudgetDayId]);
    await openIncident("probe_cap_overshoot",{probeBudgetDayId:input.artifacts.runtime.probeBudgetDayId,dayExposure});
    throw new Error(`PROTOCOL_DEVIATION: settled probe-day exposure ${dayExposure}>500`);
  }
  return{probeId,status:"completed",creditsSpent,durationCensored,stopReason:finalStop};
}

export async function closeProbeBudgetDay(dayId:string):Promise<void>{
  await assertIncidentClear();
  const probing=await pool.query(`SELECT count(*)::int n FROM clean.adb_anchor_probe WHERE probe_budget_day_id=$1 AND status='probing'`,[dayId]);
  if(Number(probing.rows[0]?.n??0)>0)throw new Error("REFUSED: cannot close probe budget day with active probing attempt");
  const unresolved=await pool.query(`SELECT count(*)::int n FROM clean.adb_anchor_probe WHERE probe_budget_day_id=$1 AND status='failed' AND (credits_spent IS NULL OR internal_send_credits IS NULL)`,[dayId]);
  if(Number(unresolved.rows[0]?.n??0)>0)throw new Error("REFUSED: failed probe has unresolved spend");
  const exposure=await probeBudgetExposure(dayId);
  if(exposure>PROBE_BUDGET_DAY_HARD_CAP){
    await pool.query(`UPDATE clean.adb_probe_budget_day SET state='MISMATCH',closed_at=now() WHERE probe_budget_day_id=$1`,[dayId]);
    await openIncident("probe_cap_overshoot",{probeBudgetDayId:dayId,exposure});
    throw new Error("PROTOCOL_DEVIATION: probe budget day exceeded 500 credits");
  }
  await pool.query(`UPDATE clean.adb_probe_budget_day SET state='CLOSED',closed_at=now() WHERE probe_budget_day_id=$1 AND state='OPEN'`,[dayId]);
}
