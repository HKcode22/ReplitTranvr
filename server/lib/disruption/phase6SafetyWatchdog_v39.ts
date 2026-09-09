/**
 * V3.9-f.8 long-lived Phase-6 runtime owner.
 *
 * One serialized owner handles SEND-aware safety, exact frozen child activation,
 * provider cleanup, frozen settlement and parent finalization. It never redraws
 * the sampling design, refills, performs FIDS, or changes the calendar.
 */
import { execFileSync } from "child_process";
import { pool } from "../../db";
import { deleteSubscription, getBalance } from "./aerodataboxLimiter_v3";
import { reconcileSpend, runSettlement, type SettlementConfig } from "./settlement_v3";
import {
  activateFrozenPlannedSegment,
  PHASE6_PROVIDER_MUTATION_LOCK,
} from "./phase6SegmentActivation_v39";

export const PHASE6_DAILY_HARD_CAP = 1900;
export const PHASE6_MAX_RUN_ALERT_CEILING = 57_900;

export interface Phase6SafetyDecisionInput {
  balanceKnown: boolean;
  externalSpend: number | null;
  internalSpend: number;
  effectiveDailyCap: number;
  dailySoftStopMarginCredits: number;
  unsettledBurstMarginCredits: number;
  priorRunSettledSpend: number;
  phase6AlertSpendCeiling: number;
}
export interface Phase6SafetyDecision {
  stop: boolean;
  reason: string | null;
  observedSpend: number | null;
  daySafetyExposure: number | null;
  dailySoftStop: number;
  runSafetyExposure: number | null;
}

export function evaluatePhase6Safety(input: Phase6SafetyDecisionInput): Phase6SafetyDecision {
  const dailySoftStop = input.effectiveDailyCap - input.dailySoftStopMarginCredits;
  if (
    !Number.isFinite(input.internalSpend) || input.internalSpend < 0 ||
    !Number.isFinite(input.effectiveDailyCap) || input.effectiveDailyCap <= 0 ||
    !Number.isFinite(input.dailySoftStopMarginCredits) || input.dailySoftStopMarginCredits < 0 ||
    !Number.isFinite(input.unsettledBurstMarginCredits) || input.unsettledBurstMarginCredits < 0 ||
    !Number.isFinite(input.priorRunSettledSpend) || input.priorRunSettledSpend < 0 ||
    !Number.isFinite(input.phase6AlertSpendCeiling) || input.phase6AlertSpendCeiling <= 0 ||
    dailySoftStop <= 0
  ) return { stop:true,reason:"invalid_frozen_safety_config",observedSpend:null,daySafetyExposure:null,dailySoftStop,runSafetyExposure:null };

  if (!input.balanceKnown || input.externalSpend === null || !Number.isFinite(input.externalSpend) || input.externalSpend < 0) {
    return { stop:true,reason:"authoritative_balance_unavailable_or_invalid",observedSpend:null,daySafetyExposure:null,dailySoftStop,runSafetyExposure:null };
  }
  const observedSpend = Math.max(input.externalSpend, input.internalSpend);
  const daySafetyExposure = observedSpend + input.unsettledBurstMarginCredits;
  const runSafetyExposure = input.priorRunSettledSpend + observedSpend + input.unsettledBurstMarginCredits;
  if (observedSpend > input.effectiveDailyCap) return { stop:true,reason:"daily_hard_cap_exceeded",observedSpend,daySafetyExposure,dailySoftStop,runSafetyExposure };
  if (input.priorRunSettledSpend + observedSpend > input.phase6AlertSpendCeiling) return { stop:true,reason:"run_hard_cap_exceeded",observedSpend,daySafetyExposure,dailySoftStop,runSafetyExposure };
  if (daySafetyExposure >= dailySoftStop) return { stop:true,reason:"daily_soft_stop",observedSpend,daySafetyExposure,dailySoftStop,runSafetyExposure };
  if (runSafetyExposure >= input.phase6AlertSpendCeiling) return { stop:true,reason:"run_soft_stop",observedSpend,daySafetyExposure,dailySoftStop,runSafetyExposure };
  return { stop:false,reason:null,observedSpend,daySafetyExposure,dailySoftStop,runSafetyExposure };
}

interface SafetyAuth {
  authorizationId: string;
  codeSha: string;
  configHash: string;
  phase6AlertSpendCeiling: number;
  dailySoftStopMarginCredits: number;
  productionReconcileToleranceCredits: number;
  unsettledBurstMarginCredits: number;
  protectedAlertFloor: number;
  watchdogPollMs: number;
  settlement: SettlementConfig;
}
interface ActiveBatchRow {
  batch_id: string;
  run_day_index: number;
  credit_budget: number;
  balance_before: number | null;
  status: "STARTING" | "ACTIVE" | "BLOCKED";
  phase6_authorization_id: string | null;
  config_hash: string | null;
}
interface ActiveSegmentRow {
  segment_id: string;
  batch_id: string;
  segment_index: number;
  segment_end_utc: Date | string;
  balance_before: number | null;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let loopRunning = false;

function currentGitSha(): string {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding:"utf8" }).trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("invalid git SHA");
  return sha;
}
function strictNumber(value: unknown, label: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) throw new Error(`REFUSED_PHASE6_SAFETY_CONFIG: ${label}=${String(value)}`);
  return n;
}

async function loadSafetyAuth(): Promise<SafetyAuth | null> {
  const r = await pool.query(
    `SELECT authorization_id,code_sha,config_hash,phase6_alert_spend_ceiling,
            daily_soft_stop_margin_credits,production_reconcile_tolerance_credits,
            unsettled_burst_margin_credits,protected_alert_floor,safety_watchdog_poll_ms,
            settlement_initial_wait_seconds,settlement_poll_interval_seconds,
            settlement_stable_read_count,settlement_timeout_seconds
       FROM clean.adb_phase6_authorization
      WHERE singleton_key=true AND enabled=true AND revoked_at_utc IS NULL`,
  );
  if (r.rowCount === 0) return null;
  if (r.rowCount !== 1) throw new Error("REFUSED_PHASE6_AUTH: non-unique enabled authorization");
  const x = r.rows[0];
  const auth: SafetyAuth = {
    authorizationId:String(x.authorization_id),
    codeSha:String(x.code_sha).toLowerCase(),
    configHash:String(x.config_hash).toLowerCase(),
    phase6AlertSpendCeiling:strictNumber(x.phase6_alert_spend_ceiling,"phase6_alert_spend_ceiling",1,PHASE6_MAX_RUN_ALERT_CEILING),
    dailySoftStopMarginCredits:strictNumber(x.daily_soft_stop_margin_credits,"daily_soft_stop_margin_credits",0,PHASE6_DAILY_HARD_CAP-1),
    productionReconcileToleranceCredits:strictNumber(x.production_reconcile_tolerance_credits,"production_reconcile_tolerance_credits",0),
    unsettledBurstMarginCredits:strictNumber(x.unsettled_burst_margin_credits,"unsettled_burst_margin_credits",0),
    protectedAlertFloor:strictNumber(x.protected_alert_floor,"protected_alert_floor",1000),
    watchdogPollMs:strictNumber(x.safety_watchdog_poll_ms,"safety_watchdog_poll_ms",250,60_000),
    settlement:{
      initialWaitSeconds:strictNumber(x.settlement_initial_wait_seconds,"settlement_initial_wait_seconds",0),
      pollIntervalSeconds:strictNumber(x.settlement_poll_interval_seconds,"settlement_poll_interval_seconds",1),
      stableReadCount:strictNumber(x.settlement_stable_read_count,"settlement_stable_read_count",3),
      timeoutSeconds:strictNumber(x.settlement_timeout_seconds,"settlement_timeout_seconds",1),
    },
  };
  if (!/^[a-f0-9]{40}$/.test(auth.codeSha) || !/^[a-f0-9]{64}$/.test(auth.configHash)) throw new Error("REFUSED_PHASE6_SAFETY_CONFIG: invalid code/config hash");
  if (auth.dailySoftStopMarginCredits < auth.unsettledBurstMarginCredits) throw new Error("REFUSED_PHASE6_SAFETY_CONFIG: soft-stop margin must cover unsettled-burst reserve");
  return auth;
}

async function writeHeartbeat(auth: SafetyAuth, gitSha: string): Promise<void> {
  await pool.query(
    `INSERT INTO clean.adb_phase6_safety_heartbeat
       (singleton_key,authorization_id,code_sha,config_hash,watchdog_poll_ms,process_id,updated_at_utc)
     VALUES(true,$1,$2,$3,$4,$5,now())
     ON CONFLICT(singleton_key) DO UPDATE SET authorization_id=EXCLUDED.authorization_id,
       code_sha=EXCLUDED.code_sha,config_hash=EXCLUDED.config_hash,
       watchdog_poll_ms=EXCLUDED.watchdog_poll_ms,process_id=EXCLUDED.process_id,updated_at_utc=now()`,
    [auth.authorizationId,gitSha,auth.configHash,auth.watchdogPollMs,process.pid],
  );
}
async function openIncident(cause: string, detail: unknown): Promise<void> {
  await pool.query(`INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved) VALUES($1,now(),$2::jsonb,false)`, [cause,JSON.stringify(detail)]);
}
async function readActiveBatch(): Promise<ActiveBatchRow | null> {
  const r=await pool.query(
    `SELECT batch_id,run_day_index,credit_budget,balance_before,status,phase6_authorization_id,config_hash
       FROM clean.adb_collection_batches
      WHERE run_day_index IS NOT NULL AND status IN ('STARTING','ACTIVE','BLOCKED')
      ORDER BY run_day_index DESC LIMIT 1`,
  );
  if(!r.rowCount)return null;
  const x=r.rows[0];
  return {batch_id:String(x.batch_id),run_day_index:Number(x.run_day_index),credit_budget:Number(x.credit_budget),
    balance_before:x.balance_before==null?null:Number(x.balance_before),status:String(x.status) as ActiveBatchRow["status"],
    phase6_authorization_id:x.phase6_authorization_id==null?null:String(x.phase6_authorization_id),config_hash:x.config_hash==null?null:String(x.config_hash)};
}
async function readActiveSegment(batchId:string):Promise<ActiveSegmentRow|null>{
  const r=await pool.query(`SELECT segment_id,batch_id,segment_index,segment_end_utc,balance_before FROM clean.adb_collection_segments WHERE batch_id=$1 AND segment_kind='ACTIVE' AND status='ACTIVE' ORDER BY segment_index LIMIT 1`,[batchId]);
  if(!r.rowCount)return null;const x=r.rows[0];return{segment_id:String(x.segment_id),batch_id:String(x.batch_id),segment_index:Number(x.segment_index),segment_end_utc:x.segment_end_utc,balance_before:x.balance_before==null?null:Number(x.balance_before)};
}
async function internalExposureForScope(whereSql:string,params:unknown[]):Promise<number>{
  const r=await pool.query(`SELECT COALESCE(sum(COALESCE(rd.delivery_attempt_cost_credits,rd.adb_cost_credits,rd.notification_items,0)),0)::bigint n FROM clean.raw_delivery rd JOIN clean.adb_collection_subs s ON s.subscription_id=rd.subscription_id WHERE ${whereSql}`,params);
  return Number(r.rows[0]?.n??0);
}
async function priorRunSettled(runDayIndex:number):Promise<number>{
  const r=await pool.query(`SELECT COALESCE(sum(credits_consumed_actual),0)::bigint n FROM clean.adb_collection_batches WHERE run_day_index IS NOT NULL AND run_day_index<$1 AND status='CLOSED' AND reconciliation_status='PASS' AND credits_consumed_actual IS NOT NULL`,[runDayIndex]);
  return Number(r.rows[0]?.n??0);
}
async function hasDeliveryFailure(batchId:string):Promise<boolean>{
  const r=await pool.query(`SELECT 1 FROM clean.adb_ingest_events WHERE batch_id=$1 AND delivery_failure=true LIMIT 1`,[batchId]);return(r.rowCount??0)>0;
}

async function deleteOpenSubscriptions(batchId:string,segmentId:string|null):Promise<string[]>{
  const r=await pool.query(`SELECT subscription_id FROM clean.adb_collection_subs WHERE batch_id=$1 AND ended_at IS NULL AND ($2::text IS NULL OR segment_id=$2)`,[batchId,segmentId]);
  const failed:string[]=[];for(const row of r.rows){const id=String(row.subscription_id);const ok=await deleteSubscription(id).catch(()=>false);if(ok)await pool.query(`UPDATE clean.adb_collection_subs SET ended_at=now() WHERE subscription_id=$1`,[id]);else failed.push(id);}return failed;
}
async function emergencyBlock(batch:ActiveBatchRow,reason:string,cause:string,detail:unknown):Promise<void>{
  const failedDeletes=await deleteOpenSubscriptions(batch.batch_id,null);await pool.query(`UPDATE clean.adb_collection_batches SET status='BLOCKED',stop_reason=$2 WHERE batch_id=$1`,[batch.batch_id,reason]);
  await openIncident(failedDeletes.length?"deletion":cause,{reason,batchId:batch.batch_id,runDayIndex:batch.run_day_index,failedDeletes,detail});
}

async function insertSettlementEvidence(input:{segmentId:string;batchId:string;auth:SafetyAuth;status:"SETTLED_PASS"|"SETTLED_MISMATCH"|"UNRESOLVED";balanceBefore:number|null;balanceStable:number|null;externalSpend:number|null;internalSpend:number;discrepancy:number|null;reads:number}):Promise<void>{
  await pool.query(`INSERT INTO clean.adb_phase6_settlement_evidence(segment_id,batch_id,authorization_id,config_hash,evidence_status,balance_before,balance_stable_after,external_spend,internal_spend,discrepancy,reconcile_tolerance,settlement_reads,settlement_initial_wait_seconds,settlement_poll_interval_seconds,settlement_stable_read_count,settlement_timeout_seconds) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT(segment_id) DO NOTHING`,[
    input.segmentId,input.batchId,input.auth.authorizationId,input.auth.configHash,input.status,input.balanceBefore,input.balanceStable,input.externalSpend,input.internalSpend,input.discrepancy,input.auth.productionReconcileToleranceCredits,input.reads,input.auth.settlement.initialWaitSeconds,input.auth.settlement.pollIntervalSeconds,input.auth.settlement.stableReadCount,input.auth.settlement.timeoutSeconds]);
  const v=await pool.query(`SELECT evidence_status,authorization_id,config_hash,internal_spend,reconcile_tolerance FROM clean.adb_phase6_settlement_evidence WHERE segment_id=$1`,[input.segmentId]);const e=v.rows[0];
  if(!e||String(e.evidence_status)!==input.status||String(e.authorization_id)!==input.auth.authorizationId||String(e.config_hash)!==input.auth.configHash||Number(e.internal_spend)!==input.internalSpend||Number(e.reconcile_tolerance)!==input.auth.productionReconcileToleranceCredits)throw new Error(`REFUSED_SETTLEMENT_EVIDENCE_CONFLICT: ${input.segmentId}`);
}
async function cancelFutureSegments(batchId:string,reason:string):Promise<void>{await pool.query(`UPDATE clean.adb_collection_segments SET status='CLOSED',ended_at_utc=now(),stop_reason=$2 WHERE batch_id=$1 AND status='PLANNED'`,[batchId,`cancelled-by-${reason}`]);}
async function closeElapsedGaps(batchId:string,now:Date):Promise<void>{await pool.query(`UPDATE clean.adb_collection_segments SET status='CLOSED',started_at_utc=segment_start_utc,ended_at_utc=segment_end_utc WHERE batch_id=$1 AND segment_kind='GAP' AND status='PLANNED' AND segment_end_utc<=$2`,[batchId,now]);}

async function finalizeParentIfTerminal(batch:ActiveBatchRow,reason:string):Promise<void>{
  const r=await pool.query(`SELECT status,settled_alert_spend,notification_items_internal,balance_stable_after FROM clean.adb_collection_segments WHERE batch_id=$1 ORDER BY segment_index`,[batch.batch_id]);
  if(!r.rowCount||r.rows.some((x:any)=>x.status!=="CLOSED"))return;
  const totalExternal=r.rows.reduce((n:number,x:any)=>n+Number(x.settled_alert_spend??0),0);const totalInternal=r.rows.reduce((n:number,x:any)=>n+Number(x.notification_items_internal??0),0);const stable=[...r.rows].reverse().find((x:any)=>x.balance_stable_after!=null)?.balance_stable_after??null;
  await pool.query(`UPDATE clean.adb_collection_batches SET status='CLOSED',ended_at=now(),stop_reason=$2,balance_after=$3,credits_consumed_actual=$4,credits_consumed_internal=$5,notification_items_received=$5,reconciliation_status='PASS' WHERE batch_id=$1`,[batch.batch_id,reason,stable,totalExternal,totalInternal]);
}

async function settleFrozenSegment(batch:ActiveBatchRow,segment:ActiveSegmentRow,auth:SafetyAuth,reason:string,cancelRemainder:boolean):Promise<void>{
  const failedDeletes=await deleteOpenSubscriptions(batch.batch_id,segment.segment_id);
  if(failedDeletes.length){await pool.query(`UPDATE clean.adb_collection_segments SET status='FAILED',ended_at_utc=now(),stop_reason='provider-delete-failure' WHERE segment_id=$1`,[segment.segment_id]);await pool.query(`UPDATE clean.adb_collection_batches SET status='BLOCKED',stop_reason='provider-delete-failure' WHERE batch_id=$1`,[batch.batch_id]);await openIncident("deletion",{batchId:batch.batch_id,segmentId:segment.segment_id,failedDeletes});return;}

  const s=await pool.query(`SELECT status,balance_before FROM clean.adb_collection_segments WHERE segment_id=$1`,[segment.segment_id]);if(s.rows[0]?.status!=="ACTIVE")return;
  let balanceBefore=s.rows[0]?.balance_before==null?null:Number(s.rows[0].balance_before);if(balanceBefore===null)balanceBefore=batch.balance_before;
  const internalSegment=await internalExposureForScope("s.batch_id=$1 AND s.segment_id=$2",[batch.batch_id,segment.segment_id]);
  const settlement=await runSettlement(auth.settlement,async()=> (await getBalance())?.creditsRemaining??null);
  if(settlement.status!=="settled"||balanceBefore===null){await insertSettlementEvidence({segmentId:segment.segment_id,batchId:batch.batch_id,auth,status:"UNRESOLVED",balanceBefore,balanceStable:null,externalSpend:null,internalSpend:internalSegment,discrepancy:null,reads:settlement.readsUsed});await pool.query(`UPDATE clean.adb_collection_segments SET status='FAILED',ended_at_utc=now(),reconciliation_status='MISMATCH',stop_reason='SETTLEMENT_UNRESOLVED' WHERE segment_id=$1`,[segment.segment_id]);await pool.query(`UPDATE clean.adb_collection_batches SET status='BLOCKED',stop_reason='SETTLEMENT_UNRESOLVED' WHERE batch_id=$1`,[batch.batch_id]);await openIncident("reconciliation",{batchId:batch.batch_id,segmentId:segment.segment_id,reason:"SETTLEMENT_UNRESOLVED"});return;}

  const externalSegment=balanceBefore-settlement.stableBalance;const rec=reconcileSpend({cExternal:externalSegment,cInternal:internalSegment,tolerance:auth.productionReconcileToleranceCredits});const pass=externalSegment>=0&&rec.match;
  await insertSettlementEvidence({segmentId:segment.segment_id,batchId:batch.batch_id,auth,status:pass?"SETTLED_PASS":"SETTLED_MISMATCH",balanceBefore,balanceStable:settlement.stableBalance,externalSpend:externalSegment,internalSpend:internalSegment,discrepancy:rec.discrepancy,reads:settlement.readsUsed});
  await pool.query(`UPDATE clean.adb_collection_segments SET status=$2,ended_at_utc=now(),balance_stable_after=$3,settled_alert_spend=$4,notification_items_internal=$5,reconciliation_status=$6,stop_reason=$7 WHERE segment_id=$1`,[segment.segment_id,pass?"CLOSED":"FAILED",settlement.stableBalance,externalSegment,internalSegment,pass?"PASS":"MISMATCH",reason]);
  if(!pass){await pool.query(`UPDATE clean.adb_collection_batches SET status='BLOCKED',stop_reason='reconciliation' WHERE batch_id=$1`,[batch.batch_id]);await openIncident("reconciliation",{batchId:batch.batch_id,segmentId:segment.segment_id,externalSegment,internalSegment,discrepancy:rec.discrepancy,tolerance:auth.productionReconcileToleranceCredits});return;}

  const internalDay=await internalExposureForScope("s.batch_id=$1",[batch.batch_id]);const dayExternal=batch.balance_before===null?null:batch.balance_before-settlement.stableBalance;
  if(dayExternal===null||dayExternal<0){await pool.query(`UPDATE clean.adb_collection_batches SET status='BLOCKED',stop_reason='authoritative_balance_invalid' WHERE batch_id=$1`,[batch.batch_id]);await openIncident("reconciliation",{batchId:batch.batch_id,dayExternal});return;}
  const prior=await priorRunSettled(batch.run_day_index);await pool.query(`UPDATE clean.adb_collection_batches SET balance_after=$2,credits_consumed_actual=$3,credits_consumed_internal=$4 WHERE batch_id=$1`,[batch.batch_id,settlement.stableBalance,dayExternal,internalDay]);
  if(dayExternal>batch.credit_budget||prior+dayExternal>auth.phase6AlertSpendCeiling){await pool.query(`UPDATE clean.adb_collection_batches SET status='BLOCKED',reconciliation_status='MISMATCH',stop_reason=$2 WHERE batch_id=$1`,[batch.batch_id,dayExternal>batch.credit_budget?"hard_cap_overshoot":"run_cap_overshoot"]);await openIncident("reconciliation",{batchId:batch.batch_id,runDayIndex:batch.run_day_index,dayExternal,effectiveDailyCap:batch.credit_budget,priorRunSettled:prior,phase6AlertSpendCeiling:auth.phase6AlertSpendCeiling});return;}
  if(cancelRemainder)await cancelFutureSegments(batch.batch_id,reason);await finalizeParentIfTerminal(batch,reason);
}

async function evaluateCurrentDay(batch:ActiveBatchRow,auth:SafetyAuth,balanceRemaining:number):Promise<{decision:Phase6SafetyDecision;internal:number;prior:number}>{
  const external=batch.balance_before===null?null:batch.balance_before-balanceRemaining;const internal=await internalExposureForScope("s.batch_id=$1",[batch.batch_id]);const prior=await priorRunSettled(batch.run_day_index);
  return{decision:evaluatePhase6Safety({balanceKnown:true,externalSpend:external,internalSpend:internal,effectiveDailyCap:batch.credit_budget,dailySoftStopMarginCredits:auth.dailySoftStopMarginCredits,unsettledBurstMarginCredits:auth.unsettledBurstMarginCredits,priorRunSettledSpend:prior,phase6AlertSpendCeiling:auth.phase6AlertSpendCeiling}),internal,prior};
}

async function handleNoActiveSegment(batch:ActiveBatchRow,auth:SafetyAuth,now:Date):Promise<void>{
  const openSubs=await pool.query(`SELECT 1 FROM clean.adb_collection_subs WHERE batch_id=$1 AND ended_at IS NULL LIMIT 1`,[batch.batch_id]);
  if(openSubs.rowCount){await emergencyBlock(batch,"open_subscription_without_active_segment","reconciliation",{});return;}
  if(batch.status==="STARTING"){await emergencyBlock(batch,"abandoned_start_without_active_segment","reconciliation",{});return;}
  if(batch.status==="BLOCKED")return;

  await closeElapsedGaps(batch.batch_id,now);
  const next=await pool.query(`SELECT segment_id,segment_start_utc,segment_end_utc FROM clean.adb_collection_segments WHERE batch_id=$1 AND segment_kind='ACTIVE' AND status='PLANNED' AND segment_start_utc<=$2 AND segment_end_utc>$2 ORDER BY segment_index LIMIT 1`,[batch.batch_id,now]);
  if(next.rowCount){
    const balance=await getBalance();if(!balance){await emergencyBlock(batch,"authoritative_balance_unavailable_before_continuation","reconciliation",{});return;}
    const state=await evaluateCurrentDay(batch,auth,balance.creditsRemaining);if(state.decision.stop){await cancelFutureSegments(batch.batch_id,state.decision.reason??"safety_stop_between_segments");await finalizeParentIfTerminal(batch,state.decision.reason??"safety_stop_between_segments");return;}
    const observed=state.decision.observedSpend??0;const remainingDaily=Math.max(0,batch.credit_budget-observed);const required=auth.protectedAlertFloor+remainingDaily+auth.unsettledBurstMarginCredits;
    if(balance.creditsRemaining<required){await emergencyBlock(batch,"insufficient_alert_headroom_before_continuation","reconciliation",{balance:balance.creditsRemaining,required});return;}
    await activateFrozenPlannedSegment({batchId:batch.batch_id,runDayIndex:batch.run_day_index,segmentId:String(next.rows[0].segment_id),nowUtc:now});return;
  }

  const pending=await pool.query(`SELECT count(*)::int n FROM clean.adb_collection_segments WHERE batch_id=$1 AND status='PLANNED'`,[batch.batch_id]);
  if(Number(pending.rows[0]?.n??0)===0)await finalizeParentIfTerminal(batch,"segments_complete");
}

/** One serialized runtime iteration. */
export async function phase6SafetyTick(now=new Date()):Promise<number>{
  let auth:SafetyAuth|null=null;let gitSha:string|null=null;let initialBatch:ActiveBatchRow|null=null;
  try{initialBatch=await readActiveBatch();auth=await loadSafetyAuth();if(auth)gitSha=currentGitSha();}
  catch(error:any){if(initialBatch)await emergencyBlock(initialBatch,"safety_authorization_unavailable","authentication",{error:error?.message??String(error)});return 1000;}
  if(!auth){if(initialBatch)await emergencyBlock(initialBatch,"safety_authorization_missing","authentication",{});return 1000;}
  if(!gitSha||gitSha!==auth.codeSha){if(initialBatch)await emergencyBlock(initialBatch,"safety_code_sha_mismatch","authentication",{authorized:auth.codeSha,running:gitSha});return auth.watchdogPollMs;}
  await writeHeartbeat(auth,gitSha);

  const lockClient=await pool.connect();let locked=false;
  try{
    const lr=await lockClient.query(`SELECT pg_try_advisory_lock(hashtext($1)) ok`,[PHASE6_PROVIDER_MUTATION_LOCK]);locked=lr.rows[0]?.ok===true;if(!locked)return auth.watchdogPollMs;
    const batch=await readActiveBatch();if(!batch)return auth.watchdogPollMs;
    if(batch.phase6_authorization_id!==auth.authorizationId||String(batch.config_hash??"").toLowerCase()!==auth.configHash){await emergencyBlock(batch,"safety_batch_auth_mismatch","authentication",{batchAuth:batch.phase6_authorization_id,batchConfig:batch.config_hash});return auth.watchdogPollMs;}
    if(batch.status==="BLOCKED")return auth.watchdogPollMs;

    const segment=await readActiveSegment(batch.batch_id);
    if(!segment){await handleNoActiveSegment(batch,auth,now);return auth.watchdogPollMs;}
    const balance=await getBalance();if(!balance||batch.balance_before===null){await settleFrozenSegment(batch,segment,auth,"authoritative_balance_unavailable",true);return auth.watchdogPollMs;}
    const state=await evaluateCurrentDay(batch,auth,balance.creditsRemaining);
    if(await hasDeliveryFailure(batch.batch_id)){await settleFrozenSegment(batch,segment,auth,"delivery_failure",true);return auth.watchdogPollMs;}
    if(state.decision.stop){await settleFrozenSegment(batch,segment,auth,state.decision.reason??"safety_stop",true);return auth.watchdogPollMs;}
    if(now.getTime()>=new Date(segment.segment_end_utc).getTime())await settleFrozenSegment(batch,segment,auth,"scheduled_segment_end",false);
    return auth.watchdogPollMs;
  }finally{if(locked)await lockClient.query(`SELECT pg_advisory_unlock(hashtext($1))`,[PHASE6_PROVIDER_MUTATION_LOCK]).catch(()=>undefined);lockClient.release();}
}

function scheduleNext(delayMs:number):void{timer=setTimeout(async()=>{if(loopRunning)return scheduleNext(Math.max(250,delayMs));loopRunning=true;let next=Math.max(250,delayMs);try{next=await phase6SafetyTick();}catch(error:any){console.error("[v39-phase6-runtime] tick failed:",error?.message??error);next=1000;}finally{loopRunning=false;scheduleNext(next);}},Math.max(250,delayMs));timer.unref?.();}
export function startPhase6SafetyWatchdog():void{if(timer)return;void phase6SafetyTick().then(scheduleNext).catch((error:any)=>{console.error("[v39-phase6-runtime] initial tick failed:",error?.message??error);scheduleNext(1000);});}
export function stopPhase6SafetyWatchdogForTests():void{if(timer)clearTimeout(timer);timer=null;}
