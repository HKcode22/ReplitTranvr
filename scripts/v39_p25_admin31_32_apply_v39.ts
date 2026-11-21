/**
 * P25 YSSY probe19 — atomic administrative incident31+32 / shared-budget
 * closeout. MANUAL/NOT PREAUTHORIZED. Never deploy/publish or run in CI.
 *
 * Exact historic science stays FAILED / DELIVERY_GAP, external 231,
 * internal 229; only these two incident rows and single budget may change.
 * Requires separate explicit user approval and signed binding at runtime.
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
 let committed=false;
 try {
  if(argv.length!==3||argv[0]!=="--apply"||
     argv[1]!=="--expected-binding"||
     !/^[a-f0-9]{64}$/.test(argv[2]) ||
     process.env.P25_ADMIN31_32_APPROVED!=="YES")
    throw Error("P25_ADMIN_APPLY_NOT_AUTHORIZED_OR_BINDING");
  if(process.env.GITHUB_ACTIONS==="true")
    throw Error("P25_ADMIN_APPLY_REFUSED_IN_CI");
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
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  await client.query("SET LOCAL statement_timeout='15000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  // Advisory lock protects collaborating P25 administrative operators.
  const lock=(await client.query(
    "SELECT pg_try_advisory_xact_lock(hashtext($1)::bigint) AS acquired",
    [BUDGET])).rows[0];
  if(lock?.acquired!==true)throw Error("P25_ADMIN_BUDGET_LOCK_BUSY");
  const identity=(await client.query(
   "SELECT current_database() AS db,current_user AS role,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS observed"
  )).rows[0];
  if(identity?.db!=="neondb"||identity?.role!=="neondb_owner"||
     identity?.replica!==false)
    throw Error("P25_ADMIN_WRONG_DATABASE");
  const incident=(await client.query(
   "SELECT id,cause,resolved,detail FROM clean.adb_incident_stop "+
   "WHERE resolved=false ORDER BY id ASC FOR UPDATE")).rows;
  const p=(await client.query(
   "SELECT probe_id,icao,stage,status,reconciliation_status,stop_reason,"+
   "duration_censored,runtime_session_id,runtime_cleanup_verified_at_utc "+
   "FROM clean.adb_anchor_probe WHERE probe_id=19 AND probe_budget_day_id=$1 FOR SHARE",
   [BUDGET])).rows;
  const r=(await client.query(
   "SELECT external_spend_credits,internal_received_credits,delivery_gap_credits "+
   "FROM clean.adb_probe_reconciliation_evidence "+
   "WHERE probe_id=19 AND runtime_session_id=$1::uuid FOR SHARE",
   [SESSION])).rows;
  const b=(await client.query(
   "SELECT state,cap_credits,closed_at FROM clean.adb_probe_budget_day "+
   "WHERE probe_budget_day_id=$1 FOR UPDATE",[BUDGET])).rows;
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
  if(!verdict.eligibleForReview)
    throw Error("P25_ADMIN_LIVE_WITNESS_HOLD");
  if(planBindingSha256!==argv[2])
    throw Error("P25_ADMIN_REVIEW_BINDING_CHANGED");
  // These are ADMINISTRATIVE flags only, never proof of a successful probe.
  const administrativeReceipt={
    schema:"v39.p25.admin31-32-settlement.v1",
    reviewBindingSha256:planBindingSha256,
    originalSourceTombstones:58,
    expiredRawContentDisposition:"DELETED_AND_INDEPENDENTLY_VERIFIED",
    historicalProbeStatus:"failed",
    historicalReconciliation:"DELIVERY_GAP",
    credits:{provider:231,internal:229,gap:2},
    incidents:[31,32],
    budget:BUDGET,
    providerMutations:false,
    scientificProtocolPassed:false,
    runtimeCleanupTimestampFabricated:false,
    historicalDeliveryGapCorrected:false
  };
  const receiptSha256=sha(canonical(administrativeReceipt));
  const closed=await client.query(
    "UPDATE clean.adb_probe_budget_day SET state='CLOSED',"+
    "closed_at=clock_timestamp() "+
    "WHERE probe_budget_day_id=$1 AND state='OPEN' "+
    "AND cap_credits=500 AND closed_at IS NULL "+
    "RETURNING probe_budget_day_id,state,closed_at",
    [BUDGET]);
  if(closed.rowCount!==1)
    throw Error("P25_ADMIN_EXACT_BUDGET_UPDATE_HOLD");
  const resolved=await client.query(
    "UPDATE clean.adb_incident_stop "+
    "SET resolved=true,resolved_at_utc=clock_timestamp(),"+
    "detail=detail || jsonb_build_object("+
      "'postrunAdministrativeResolution',jsonb_build_object("+
      "'classification','YSSY_P25_FAILED_PROBE_EXPIRED_SOURCE_ADMIN_CLOSED',"+
      "'receipt_sha256',$1::text,"+
      "'historic_reconciliation_preserved','DELIVERY_GAP',"+
      "'original_external_credits',231,"+
      "'original_internal_credits',229,"+
      "'original_gap_credits',2,"+
      "'provider_mutation',false,"+
      "'scientific_success_claimed',false)) "+
    "WHERE id=ANY($2::bigint[]) AND resolved=false "+
    "AND cause='reconciliation' RETURNING id",
    [receiptSha256,[31,32]]);
  if(resolved.rowCount!==2 ||
     resolved.rows.map((x:Record<string,unknown>)=>Number(x.id))
      .sort((a:number,b:number)=>a-b).join(",")!=="31,32")
    throw Error("P25_ADMIN_EXACT_INCIDENT_UPDATE_HOLD");
  // Verify original scientific evidence inside the SAME transaction.
  const unchanged=(await client.query(
    "SELECT p.status,p.reconciliation_status,p.stop_reason,"+
    "p.duration_censored,r.external_spend_credits,"+
    "r.internal_received_credits,r.delivery_gap_credits "+
    "FROM clean.adb_anchor_probe p "+
    "JOIN clean.adb_probe_reconciliation_evidence r "+
    "ON r.probe_id=p.probe_id "+
    "WHERE p.probe_id=19 AND p.probe_budget_day_id=$1 "+
    "AND r.runtime_session_id=$2::uuid FOR SHARE",
    [BUDGET,SESSION])).rows;
  if(unchanged.length!==1||
    unchanged[0].status!=="failed"||
    unchanged[0].reconciliation_status!=="DELIVERY_GAP"||
    unchanged[0].stop_reason!=="external_internal_delivery_gap"||
    unchanged[0].duration_censored!==false||
    Number(unchanged[0].external_spend_credits)!==231||
    Number(unchanged[0].internal_received_credits)!==229||
    Number(unchanged[0].delivery_gap_credits)!==2)
    throw Error("P25_ADMIN_IMMUTABLE_SCIENCE_NOT_PRESERVED");
  await client.query("COMMIT");
  committed=true;
  console.log(JSON.stringify({
    schema:"v39.p25.admin31-32-apply.v1",
    status:"P25_ADMIN_TWO_INCIDENTS_AND_ONE_BUDGET_CLOSED",
    case:"YSSY_P25_PROBE19_INCIDENT31_32_BUDGET_ONLY",
    originalReviewBindingSha256:planBindingSha256,
    administrativeReceiptSha256:receiptSha256,
    incidentsResolved:[31,32],
    budget:BUDGET,budgetState:"CLOSED",
    historicalProbe:"failed/DELIVERY_GAP",
    originalCredits:{external:231,internal:229,gap:2},
    historicalScientificPass:false,
    originalSourceTombstonesPreserved:58,
    databaseRowsChanged:3,
    paidProviderCalls:0,providerMutations:0,blobDeletes:0,
    independentPostCommitReadbackRequired:true
  },null,2));
  return 0;
 }catch {
  console.error(JSON.stringify({
    schema:"v39.p25.admin31-32-apply.v1",
    status:committed?"HOLD_POSTCOMMIT_RECHECK_REQUIRED":
      "HOLD_TRANSACTION_ROLLBACK_OR_COMMIT_UNCERTAIN",
    shouldNotAutomaticallyRetry:true,
    historicalScientificSuccessClaimed:false
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
