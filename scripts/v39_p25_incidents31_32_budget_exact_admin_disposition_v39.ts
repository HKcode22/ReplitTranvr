import "dotenv/config";
import {createHash} from "node:crypto";
import {v39Pool as pool} from "../server/lib/disruption/db_v39";
import {listSubscriptionsStrict} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {assessP25PairedAdministrativeCloseoutV39 as assess,
 type P25AdministrativeCloseoutWitnessV39} from
 "../server/lib/disruption/phase2gP25PairedAdministrativeCloseout_v39";

/**
 * P25 YSSY exact archival disposition.
 * --dry-run (default) performs strict provider LIST + production PG READ ONLY.
 * --apply is a separate, explicitly approved production metadata mutation,
 * never an implicit next step. No provider DELETE, raw access or flight work.
 */
const SESSION="b0077437-edc1-459a-9d63-8c6e6e50c4f2";
const BUDGET="P2G-S1-20261013-03";
const YES="CLOSE_EXACT_31_32_AND_P25_BUDGET_PRESERVE_DELIVERY_GAP";
const args=process.argv.slice(2);
const apply=args.length===1&&args[0]==="--apply";
if(!(args.length===0||args.length===1&&["--dry-run","--apply"].includes(args[0]))) {
 console.error("HOLD_P25_ADMIN_CLOSEOUT_INVALID_ARGS");
 process.exit(2);
}
if(apply&&process.env.PHASE2G_P25_ADMIN_CLOSEOUT_APPROVAL!==YES){
 console.error("HOLD_P25_ADMIN_CLOSEOUT_EXPLICIT_OPERATOR_APPROVAL_MISSING");
 process.exit(2);
}
async function main():Promise<void>{
 // Fresh native strict LIST: unknown provider state MUST NOT be read as zero.
 const list=await listSubscriptionsStrict();
 const active=list.filter(s=>s.isActive);
 const activeBillable=active.filter(s=>s.billingType!=="LifetimeBased");
 const c=await pool.connect();
 let committed=false;
 try{
  await c.query(apply?"BEGIN":"BEGIN TRANSACTION READ ONLY");
  await c.query("SET LOCAL statement_timeout='15000ms'");
  const identity=(await c.query(
   "SELECT current_database() AS db, pg_is_in_recovery() AS replica, clock_timestamp() AS observed_at_utc"
  )).rows[0];
  if(identity?.db!=="neondb"||identity?.replica!==false)
   throw Error("EXACT_RUNTIME_DATABASE_IDENTITY_NOT_VERIFIED");
  if(apply)await c.query("SELECT pg_advisory_xact_lock(hashtext($1))",[BUDGET]);

  const inc=(await c.query(
   "SELECT id,cause,resolved,occurred_at_utc,detail FROM clean.adb_incident_stop WHERE resolved=false ORDER BY id ASC "+
   (apply?"FOR UPDATE":"")
  )).rows;
  const p=(await c.query(
   "SELECT probe_id,icao,status,reconciliation_status,stop_reason,duration_censored,runtime_session_id "+
   "FROM clean.adb_anchor_probe WHERE probe_id=19 AND probe_budget_day_id=$1",
   [BUDGET]
  )).rows;
  const r=(await c.query(
   "SELECT external_spend_credits,internal_received_credits,delivery_gap_credits "+
   "FROM clean.adb_probe_reconciliation_evidence WHERE probe_id=19"
  )).rows;
  const b=(await c.query(
   "SELECT probe_budget_day_id,state,cap_credits,closed_at FROM clean.adb_probe_budget_day "+
   "WHERE probe_budget_day_id=$1 "+(apply?"FOR UPDATE":""),
   [BUDGET]
  )).rows;
  const cnt=(await c.query([
    "SELECT",
    "(SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') AS open_days,",
    "(SELECT count(*)::int FROM clean.adb_anchor_probe WHERE probe_budget_day_id=$1) AS probes_in_budget,",
    "(SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')) AS active_probes,",
    "(SELECT count(*)::int FROM clean.prepaid_probe_session_runtime) AS global_sessions,",
    "(SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$2::uuid) AS deliveries,",
    "(SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$2::uuid) AS items,",
    "(SELECT count(*)::int FROM clean.phase2g_cleanup_journal_v39 WHERE session_id=$2::uuid) AS journal"
   ].join(" "),[BUDGET,SESSION]
  )).rows[0];
  const refs=(await c.query([
    "SELECT count(*)::int AS total,",
    "count(content_sha256)::int AS sha_count,",
    "COALESCE(sum(content_bytes),0)::bigint AS bytes,",
    "count(*) FILTER(WHERE deletion_verified_at_utc IS NOT NULL)::int AS deleted,",
    "count(*) FILTER(WHERE deletion_verified_at_utc IS NULL)::int AS live,",
    "count(*) FILTER(WHERE storage_kind<>'replit_app_storage'",
    "OR content_class<>'raw_provider_content'",
    "OR contract_version<>'provider-blob-contract-v39@1.0.0')::int AS bad_contract,",
    "max(expires_at_utc) AS max_expiry",
    "FROM clean.provider_content_blob_ref",
    "WHERE source_kind='webhook' AND source_record_id LIKE $1"
   ].join(" "),["prepaid:"+SESSION+":%"]
  )).rows[0];
  const i31=inc.find(v=>Number(v.id)===31),i32=inc.find(v=>Number(v.id)===32);
  const toTime=(v:unknown)=>new Date(String(v??"")).getTime();
  const w:P25AdministrativeCloseoutWitnessV39={
   observedAtMs:toTime(identity.observed_at_utc),
   latestOriginalExpiryMs:toTime(refs?.max_expiry),
   unresolvedIncidentIds:inc.map(x=>Number(x.id)),
   incident31:i31?{
    id:Number(i31.id),occurredAtMs:toTime(i31.occurred_at_utc),
    cause:String(i31.cause),resolved:i31.resolved===true,
    kind:String(i31.detail?.kind??""),reason:String(i31.detail?.reason??""),
    providerDeleteVerified:i31.detail?.providerDeleteVerified===true,
    runtimeCleanupVerified:i31.detail?.runtimeCleanupVerified===true,
    probeId:Number(i31.detail?.probeId??-1),
    budgetDayId:String(i31.detail?.budgetDayId??"")
   }:null,
   incident32:i32?{
    id:Number(i32.id),occurredAtMs:toTime(i32.occurred_at_utc),
    cause:String(i32.cause),resolved:i32.resolved===true,
    kind:String(i32.detail?.kind??""),probeId:Number(i32.detail?.probeId??-1),
    budgetDayId:i32.detail?.budgetDayId==null?null:String(i32.detail.budgetDayId)
   }:null,
   probeId:Number(p[0]?.probe_id??-1),icao:String(p[0]?.icao??""),
   probeStatus:String(p[0]?.status??""),
   probeReconciliation:String(p[0]?.reconciliation_status??""),
   probeStopReason:String(p[0]?.stop_reason??""),
   probeDurationCensored:p[0]?.duration_censored===true,
   probeSessionExact:String(p[0]?.runtime_session_id??"").toLowerCase()===SESSION,
   historicalExternalCredits:Number(r[0]?.external_spend_credits??-1),
   historicalReceivedCredits:Number(r[0]?.internal_received_credits??-1),
   historicalCreditGap:Number(r[0]?.delivery_gap_credits??-1),
   budgetId:String(b[0]?.probe_budget_day_id??""),
   budgetState:String(b[0]?.state??""),
   budgetCapCredits:Number(b[0]?.cap_credits??-1),
   budgetClosedAtIsNull:b[0]?.closed_at===null,
   globallyOpenBudgetDays:Number(cnt?.open_days??-1),
   probesInBudget:Number(cnt?.probes_in_budget??-1),
   activeOrSettlingProbes:Number(cnt?.active_probes??-1),
   currentActiveProviderSubscriptions:active.length,
   currentActiveBillableSubscriptions:activeBillable.length,
   globalRuntimeSessions:Number(cnt?.global_sessions??-1),
   historicalRuntimeDeliveries:Number(cnt?.deliveries??-1),
   historicalRuntimeItems:Number(cnt?.items??-1),
   historicalCleanupJournalRows:Number(cnt?.journal??-1),
   originalReferences:Number(refs?.total??-1),
   originalShaRefs:Number(refs?.sha_count??-1),
   originalMetadataBytes:Number(refs?.bytes??-1),
   originalTombstonedRefs:Number(refs?.deleted??-1),
   originalLiveRefs:Number(refs?.live??-1),
   originalInvalidContractRefs:Number(refs?.bad_contract??-1)
  };
  const decision=assess(w);
  const common={
    schema:"phase5.p25-exact-31-32-budget-admin-disposition.v1",
    mode:apply?"APPLY":"DRY_RUN",
    status:decision.eligible?"ELIGIBLE_EXACT_ADMIN_ONLY":"HOLD",
    blockers:decision.blockers,
    observedAtUtc:new Date(w.observedAtMs).toISOString(),
    exactBudgetId:BUDGET,
    exactUnresolvedIncidentIds:w.unresolvedIncidentIds,
    originalProbeId:19,
    originalProbeStatus:"failed",
    originalReconciliation:"DELIVERY_GAP",
    originalBilledCredits:231,originalReceivedCredits:229,originalGapCredits:2,
    currentActiveProviderSubscriptions:active.length,
    currentActiveBillableSubscriptions:activeBillable.length,
    p25BudgetState:w.budgetState,p25BudgetCap:w.budgetCapCredits,
    globallyOpenBudgetDays:w.globallyOpenBudgetDays,
    originalReferences:w.originalReferences,
    deletionTombstones:w.originalTombstonedRefs,
    originalsUntombstoned:w.originalLiveRefs,
    exactAdminOnly:true,
    paidPhase6Authorized:false,
    signedWebhookTestAuthorized:false,
    providerMutations:0,rawObjectMutations:0
  };
  if(!apply||!decision.eligible){
   await c.query("ROLLBACK");
   console.log(JSON.stringify({
    ...common,dbMutations:0,
    status:decision.eligible?
      "DRY_RUN_ELIGIBLE_OPERATOR_APPROVAL_REQUIRED":"HOLD",
    noAutomaticApply:true
   },null,2));
   if(apply)process.exitCode=2;
   return;
  }
  // The two exact administrative incident resolutions and the exact budget
  // closure are atomic. Do not alter the failed probe or credit reconciliation.
  const receiptHash=createHash("sha256").update(JSON.stringify({
   kind:"P25_BOUND_ADMIN_ONLY",
   ids:[31,32],budget:BUDGET,probe:19,
   scientificStatus:"failed",reconciliation:"DELIVERY_GAP",gap:2,
   tombstones:58,providerActive:0
  })).digest("hex");
  const resolutions=await c.query(
   "UPDATE clean.adb_incident_stop SET resolved=true,resolved_at_utc=clock_timestamp(),"+
   "detail=detail || jsonb_build_object('postrunAdministrativeResolution',"+
   "jsonb_build_object('classification','P25_EXPIRED_ORIGINALS_EXACT_PROVIDER_AND_RUNTIME_STOP_VERIFIED',"+
   "'receipt_sha256',$1::text,'historical_status_preserved','failed',"+
   "'historical_reconciliation_preserved','DELIVERY_GAP','credit_gap_preserved',2,"+
   "'provider_mutation',false)) "+
   "WHERE id=ANY($2::bigint[]) AND resolved=false AND cause='reconciliation' RETURNING id",
   [receiptHash,[31,32]]
  );
  if(resolutions.rowCount!==2)throw Error("EXACT_TWO_INCIDENT_RESOLUTION_CONFLICT");
  const closed=await c.query(
   "UPDATE clean.adb_probe_budget_day SET state='CLOSED',closed_at=clock_timestamp() "+
   "WHERE probe_budget_day_id=$1 AND state='OPEN' RETURNING probe_budget_day_id",
   [BUDGET]
  );
  if(closed.rowCount!==1)throw Error("EXACT_P25_BUDGET_CLOSE_CONFLICT");
  const after=(await c.query(
   "SELECT p.status,p.reconciliation_status,p.duration_censored,"+
   "r.external_spend_credits,r.internal_received_credits,r.delivery_gap_credits "+
   "FROM clean.adb_anchor_probe p "+
   "JOIN clean.adb_probe_reconciliation_evidence r ON r.probe_id=p.probe_id "+
   "WHERE p.probe_id=19"
  )).rows[0];
  if(after?.status!=="failed"||after?.reconciliation_status!=="DELIVERY_GAP"||
     after?.duration_censored!==false||Number(after?.external_spend_credits)!==231||
     Number(after?.internal_received_credits)!==229||
     Number(after?.delivery_gap_credits)!==2)
   throw Error("P25_SCIENTIFIC_EVIDENCE_MUST_REMAIN_UNCHANGED");
  await c.query("COMMIT");
  committed=true;
  console.log(JSON.stringify({
   ...common,status:"ADMIN_DISPOSITION_APPLIED_P25_HISTORIC_FAILURE_PRESERVED",
   closedOnlyBudget:BUDGET,administrativelyResolvedOnly:[31,32],
   receiptSha256:receiptHash,dbMutations:3,
   historicalProviderBytesReconstructed:false,
   scientificPassGranted:false
  },null,2));
 }catch{
  if(!committed)await c.query("ROLLBACK").catch(()=>{});
  console.error("HOLD_P25_EXACT_ADMIN_SQL_OR_PERMISSION_OR_HISTORY_MISMATCH");
  process.exitCode=2;
 }finally{c.release();}
}
main().catch(()=>{
 console.error("HOLD_P25_EXACT_ADMIN_PROVIDER_LIST_OR_DATABASE_UNAVAILABLE");
 process.exitCode=2;
}).finally(async()=>{await pool.end().catch(()=>{});});
