/**
 * P25 YSSY probe19 — exact incident31/32 and OPEN budget dry-run.
 * Free strict provider LIST + PostgreSQL READ ONLY; never mutations.
 *
 * Future SQL UPDATE requires a distinct separately approved operator.
 */
import "dotenv/config";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import pg from "pg";
import {listSubscriptionsStrict} from
 "../server/lib/disruption/aerodataboxLimiter_v3.ts";
import {
 assessP25AdministrativeReviewV39,
 type P25AdminWitnessV39
} from "../server/lib/disruption/p25AdminCloseoutReview_v39.ts";

const SESSION="b0077437-edc1-459a-9d63-8c6e6e50c4f2";
const BUDGET="P2G-S1-20261013-03";
const prefix="prepaid:"+SESSION+":%";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
function canonical(x:unknown):string {
 if(x===null||typeof x!=="object")return JSON.stringify(x);
 if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";
 const p=x as Record<string,unknown>;
 return "{"+Object.keys(p).sort().map(k=>
  JSON.stringify(k)+":"+canonical(p[k])).join(",")+"}";
}
export async function main(argv=process.argv.slice(2)):Promise<number> {
 let client:pg.Client|null=null;
 try {
  if(argv.length!==1||argv[0]!=="--dry-run")
    throw Error("P25_ADMIN_REVIEW_DRY_RUN_ONLY");
  if(!process.env.DATABASE_URL)
    throw Error("P25_ADMIN_DATABASE_REQUIRED");
  // The first read is free but must be fail-closed, not listSubscriptions()
  // which treats an outage like zero active subscriptions.
  const subs=await listSubscriptionsStrict();
  const billable=subs.filter(s=>s.isActive&&s.billingType!=="LifetimeBased").length;
  client=new pg.Client({
    connectionString:process.env.DATABASE_URL,
    connectionTimeoutMillis:7000,statement_timeout:12000,
    query_timeout:15000
  });
  await client.connect();
  await client.query("BEGIN TRANSACTION READ ONLY");
  const identity=(await client.query(
   "SELECT current_database() AS db,current_user AS role,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS observed"
  )).rows[0];
  if(identity?.db!=="neondb"||identity?.role!=="neondb_owner"||
     identity?.replica!==false)
    throw Error("P25_ADMIN_WRONG_DATABASE");
  const incident=(await client.query(
   "SELECT id,cause,resolved,detail FROM clean.adb_incident_stop "+
   "WHERE resolved=false ORDER BY id ASC")).rows;
  const p=(await client.query(
   "SELECT probe_id,icao,stage,status,reconciliation_status,stop_reason,"+
   "duration_censored,runtime_session_id,runtime_cleanup_verified_at_utc "+
   "FROM clean.adb_anchor_probe WHERE probe_id=19 AND probe_budget_day_id=$1",
   [BUDGET])).rows;
  const r=(await client.query(
   "SELECT external_spend_credits,internal_received_credits,delivery_gap_credits "+
   "FROM clean.adb_probe_reconciliation_evidence "+
   "WHERE probe_id=19 AND runtime_session_id=$1::uuid",
   [SESSION])).rows;
  const b=(await client.query(
   "SELECT state,cap_credits,closed_at FROM clean.adb_probe_budget_day "+
   "WHERE probe_budget_day_id=$1",[BUDGET])).rows;
  const c=(await client.query(
   "SELECT "+
   "(SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') AS open_days,"+
   "(SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')) AS active_probes,"+
   "(SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid) AS sessions,"+
   "(SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid) AS deliveries,"+
   "(SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid) AS items,"+
   "(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) AS collection_subs",
   [SESSION])).rows[0];
  const z=(await client.query(
   "SELECT count(*)::int AS total,"+
   "count(content_sha256)::int AS sha_count,"+
   "COALESCE(sum(content_bytes),0)::bigint AS bytes,"+
   "count(*) FILTER(WHERE deletion_verified_at_utc IS NOT NULL)::int AS tombstones,"+
   "count(*) FILTER(WHERE deletion_verified_at_utc IS NULL)::int AS unmarked,"+
   "count(DISTINCT deletion_run_id)::int AS run_count,"+
   "count(deletion_run_id)::int AS run_assigned,"+
   "count(deleted_at_utc)::int AS deleted_at_count,"+
   "count(*) FILTER(WHERE storage_kind<>'replit_app_storage' "+
    "OR content_class<>'raw_provider_content' "+
    "OR contract_version<>'provider-blob-contract-v39@1.0.0')::int AS bad,"+
   "max(expires_at_utc) AS expiry,"+
   "max(deletion_run_id) AS run_id "+
   "FROM clean.provider_content_blob_ref "+
   "WHERE source_kind='webhook' AND source_record_id LIKE $1",
   [prefix])).rows[0];
  const runs=(await client.query(
   "SELECT count(*)::int AS n FROM clean.provider_content_blob_ref "+
   "WHERE deletion_run_id=$1",[z?.run_id??null])).rows[0];
  const i31=incident.find(v=>Number(v.id)===31);
  const i32=incident.find(v=>Number(v.id)===32);
  const d31=i31?.detail??{},d32=i32?.detail??{};
  const fp31=!!i31&&i31.cause==="reconciliation"&&i31.resolved===false&&
   d31.kind==="stage1_supervisor_recovery"&&
   d31.reason==="provider_subscription_isolation_lost"&&
   Number(d31.probeId)===19&&d31.budgetDayId===BUDGET&&
   d31.providerDeleteAttempted===false&&d31.providerDeleteVerified===true&&
   d31.runtimeCleanupVerified===false;
  const fp32=!!i32&&i32.cause==="reconciliation"&&i32.resolved===false&&
   d32.kind==="prepaid_probe_failed"&&Number(d32.probeId)===19&&
   d32.cleanupVerified===false&&d32.reconciliationStatus==="DELIVERY_GAP"&&
   d32.stopReason==="external_internal_delivery_gap";
  const w:P25AdminWitnessV39={
   nowMs:new Date(identity.observed).getTime(),
   latestBlobExpiryMs:new Date(z?.expiry??NaN).getTime(),
   probeId:Number(p[0]?.probe_id??-1),
   probeIcao:String(p[0]?.icao??""),
   probeStage:Number(p[0]?.stage??-1),
   probeStatus:String(p[0]?.status??""),
   probeReconciliation:String(p[0]?.reconciliation_status??""),
   probeStopReason:String(p[0]?.stop_reason??""),
   probeCensored:p[0]?.duration_censored===true,
   exactSession:String(p[0]?.runtime_session_id??"").toLowerCase()===SESSION,
   runtimeCleanupTimestampIsNull:p.length===1&&
     p[0].runtime_cleanup_verified_at_utc===null,
   externalCredits:Number(r[0]?.external_spend_credits??NaN),
   internalCredits:Number(r[0]?.internal_received_credits??NaN),
   deliveryGapCredits:Number(r[0]?.delivery_gap_credits??NaN),
   budgetState:String(b[0]?.state??""),
   budgetCap:Number(b[0]?.cap_credits??NaN),
   budgetClosedAtIsNull:b.length===1&&b[0].closed_at===null,
   openBudgetCount:Number(c?.open_days??NaN),
   activeProbeCount:Number(c?.active_probes??NaN),
   runtimeSessions:Number(c?.sessions??NaN),
   runtimeDeliveries:Number(c?.deliveries??NaN),
   runtimeItems:Number(c?.items??NaN),
   activeBillableSubscriptions:billable,
   unendedV39Subscriptions:Number(c?.collection_subs??NaN),
   incidentOpenIds:incident.map(v=>Number(v.id)),
   incident31Fingerprint:fp31,
   incident32Fingerprint:fp32,
   refCount:Number(z?.total??NaN),
   refShaCount:Number(z?.sha_count??NaN),
   refBytes:Number(z?.bytes??NaN),
   tombstones:Number(z?.tombstones??NaN),
   unmarkedRefs:Number(z?.unmarked??NaN),
   deletionRunCount:Number(z?.run_count??NaN),
   rowsInDeletionRun:Number(runs?.n??NaN),
   assignedDeletionRunCount:Number(z?.run_assigned??NaN),
   markedDeletedAtCount:Number(z?.deleted_at_count??NaN),
   invalidContractCount:Number(z?.bad??NaN)
  };
  const verdict=assessP25AdministrativeReviewV39(w);
  const planBindingSha256=verdict.eligibleForReview?sha(canonical({
    schema:"v39.p25.admin31-32-readonly-binding.v1",
    reviewedProbe:19,reviewedBudget:BUDGET,
    immutableScience:[231,229,2,"failed","DELIVERY_GAP"],
    immutableIncidents:[
      [31,sha(canonical(d31))],
      [32,sha(canonical(d32))]
    ],
    deletionRunSha256:sha(String(z.run_id)),
    sourceRows:58,sourceBytes:308832,
    sourceTombstones:58,
    providerActiveBillable:0,
    runtimeCounts:[0,0,0],
  })):null;
  await client.query("ROLLBACK");
  console.log(JSON.stringify({
    schema:"v39.p25.admin31-32.readonly.v1",
    status:verdict.eligibleForReview?
      "READY_FOR_EXACT_ADMIN_REVIEW_NOT_APPROVED":"HOLD",
    blockers:verdict.blockers,
    case:"YSSY_P25_PROBE19_INCIDENT31_32_BUDGET_ONLY",
    planBindingSha256,
    strictProviderActiveBillable:billable,
    originalDeletionTombstones:w.tombstones,
    originalDeletionRunCount:w.deletionRunCount,
    originalRunRows:w.rowsInDeletionRun,
    immutableProbeResult:"failed/DELIVERY_GAP",
    immutableCredits:{external:231,internal:229,gap:2},
    proposedBudgetTransition:"OPEN_TO_CLOSED_ADMINISTRATIVE_ONLY",
    proposedIncidentResolution:[31,32],
    historicalScientificPass:false,
    paidProviderCalls:0,databaseWrites:0,blobDeletes:0,
    approvalToApply:false
  },null,2));
  return verdict.eligibleForReview?0:2;
 }catch {
  console.error(JSON.stringify({
    schema:"v39.p25.admin31-32.readonly.v1",
    status:"HOLD_PRECHECK_FAILED",
    databaseWrites:0,providerMutations:0,
    approvalToApply:false
  }));
  return 2;
 }finally {
  if(client) {
    await client.query("ROLLBACK").catch(()=>{});
    await client.end().catch(()=>{});
  }
 }
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href){
 main().then(code=>{process.exitCode=code}).catch(()=>{
   console.error("P25_ADMIN_UNHANDLED_HOLD");
   process.exitCode=2;
 });
}
