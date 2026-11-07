/**
 * Phase5 Stage15 — exact native PostgreSQL durable-commit witness for a
 * previously written T24 snapshot. Does NOT certify source, physical leg,
 * provider-native T semantics, retention, paid owner, or later PRE writes.
 *
 * Only useful where PostgreSQL track_commit_timestamp=on for the transaction.
 * The setting is usually OFF and commit timestamp history may be discarded.
 * Both cases HOLD: created_at=now() is transaction START, never COMMIT proof.
 *
 * Pure READ-ONLY restricted DB transaction; no source/Alert/provider access.
 */
import type {Pool} from "pg";
const SHA=/^[a-f0-9]{64}$/;
const ROLE=/^phase5_fids_pre_auditor_[a-z0-9_]{6,40}$/;
const ID=/^[a-zA-Z0-9_.:|-]{5,200}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const HOLD=(s:string):never=>{throw Error("REFUSED_P5_STAGE15_T24_COMMIT_"+s);};
function utc(v:unknown,reason:string):Date{
 if(typeof v!=="string"||!ISO.test(v)||!Number.isFinite(Date.parse(v))||
  new Date(v).toISOString()!==v)
  throw Error("REFUSED_P5_STAGE15_T24_COMMIT_"+reason);
 return new Date(v);
}
function date(v:unknown,reason:string):Date{
 const d=v instanceof Date?v:typeof v==="string"?new Date(v):null;
 if(!d||!Number.isFinite(d.getTime()))
  throw Error("REFUSED_P5_STAGE15_T24_COMMIT_"+reason);
 return d;
}
export interface P5Stage15NativeT24ReadbackScope{
 flightInstanceId:string;
 expectedSelectedTNativeUtc:string;
 expectedT24CutoffUtc:string;
 expectedSelectedTVersion:string;
 expectedPopulationQueryId:string;
 expectedFidsResponseSha256:string;
 reviewedFrameSha256:string;
 reviewedConfigSha256:string;
 expectedRestrictedReaderRole:string;
 /** Canonical source semantics review remains an EXTERNAL gate. */
}
export interface P5Stage15NativeT24Witness{
 schema:"v39.phase5.stage15.native-postgres-t24-commit-audit.v1";
 status:"NATIVE_DB_T24_TRANSACTION_COMMIT_TIMESTAMP_VERIFIED_SOURCE_NOT_CERTIFIED";
 flightInstanceId:string;
 snapshotId:string;
 populationQueryId:string;
 selectedTNativeUtc:string;
 t24CutoffUtc:string;
 nativeTransactionCommitUtc:string;
 databaseReadbackAtUtc:string;
 transactionId:string;
 nativeCommitTimestampTracked:true;
 durableBeforeOwnT24Cutoff:true;
 withinThreeMinuteDueWindow:true;
 actualV0079SourceAndPopulationCertified:false;
 nativeProviderScheduleSemanticsCertified:false;
 physicalOperatingLegCertified:false;
 sourceAndMLRetentionRightsCertified:false;
 reviewedGithubOwnerAndProgrammaticWitnessCertified:false;
 t6OrT90WriteAuthorizedByThisCheck:false;
 phase5FreezePassed:false;phase6PaidGo:false;
}
/**
 * If more than one historical T24 row exists for an identity, return 2
 * and REFUSE: no best-guess retime anchor.
 *
 * xmin is the XID for the visible row version. Any post-cutoff UPDATE
 * causes its latest commit to be late, conservatively disabling its use.
 * Database-native commit data must be enabled and still retained.
 */
export const P5_STAGE15_T24_NATIVE_COMMIT_SQL=[
 "SELECT s.id::text AS snapshot_id,s.xmin::text AS native_xid,",
 "pg_xact_commit_timestamp(s.xmin) AS native_commit_at_utc,",
 "s.flight_instance_id,s.prediction_cutoff_utc,",
 "s.selected_t_milestone_utc,s.selected_t_version,",
 "s.population_query_id,s.fids_response_hash,",
 "s.frame_hash,s.config_hash,s.created_at",
 "FROM clean.flight_snapshots s",
 "WHERE s.flight_instance_id=$1 AND s.horizon='T-24h'",
 "AND s.prediction_state='PRE_DEPARTURE'",
 "ORDER BY s.id LIMIT 2"
].join(" ");

export async function inspectP5T24NativeCommitWitness(
 pool:Pick<Pool,"connect">,scope:P5Stage15NativeT24ReadbackScope
):Promise<P5Stage15NativeT24Witness>{
 if(!scope||!ID.test(scope.flightInstanceId??"")||
    !UUID.test(scope.expectedPopulationQueryId??"")||
    !SHA.test(scope.expectedFidsResponseSha256??"")||
    !SHA.test(scope.reviewedFrameSha256??"")||
    !SHA.test(scope.reviewedConfigSha256??"")||
    !ROLE.test(scope.expectedRestrictedReaderRole??"")||
    typeof scope.expectedSelectedTVersion!=="string"||
    scope.expectedSelectedTVersion.length<10||
    scope.expectedSelectedTVersion.length>500)
   HOLD("UNKNOWN_SIGNED_SCOPE_OR_RESTRICTED_READER");
 const selectedT=utc(scope.expectedSelectedTNativeUtc,"SELECTED_T_FORMAT"),
   cutoff=utc(scope.expectedT24CutoffUtc,"T24_CUTOFF_FORMAT");
 if(selectedT.getTime()-cutoff.getTime()!==86_400_000)
   HOLD("T24_NOT_EXACTLY_24_HOURS_BEFORE_SELECTED_T");
 if(!pool||typeof pool.connect!=="function")
   HOLD("MISSING_RESTRICTED_READ_ONLY_POOL");
 const c=await pool.connect();
 let begun=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  begun=true;
  await c.query("SET LOCAL statement_timeout='8000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const identity=(await c.query(
    "SELECT current_database() AS db,current_user AS actor,"+
    "current_setting('transaction_read_only') AS ro,"+
    "current_setting('track_commit_timestamp',true) AS track,"+
    "clock_timestamp() AS db_now,pg_is_in_recovery() AS replica,"+
    "has_table_privilege(current_user,'clean.flight_snapshots','INSERT') AS can_insert,"+
    "has_table_privilege(current_user,'clean.flight_snapshots','UPDATE') AS can_update,"+
    "has_table_privilege(current_user,'clean.flight_snapshots','DELETE') AS can_delete"
  )).rows;
  if(identity.length!==1||identity[0]?.db!=="neondb"||
     identity[0].actor!==scope.expectedRestrictedReaderRole||
     identity[0].ro!=="on"||identity[0].replica!==false||
     identity[0].can_insert!==false||
     identity[0].can_update!==false||
     identity[0].can_delete!==false)
    HOLD("RESTRICTED_DB_ROLE_OR_READ_ONLY_SNAPSHOT_NOT_VERIFIED");
  if(identity[0].track!=="on")
    HOLD("POSTGRES_NATIVE_COMMIT_TIMESTAMP_NOT_ENABLED");
  const now=date(identity[0].db_now,"DB_CLOCK_UNAVAILABLE");
  if(now.getTime()<cutoff.getTime()-86_400_000)
    HOLD("IMPOSSIBLE_DATABASE_TIME_BEFORE_T24");
  const rows=(await c.query(P5_STAGE15_T24_NATIVE_COMMIT_SQL,
    [scope.flightInstanceId])).rows;
  if(rows.length!==1)HOLD("ABSENT_OR_MULTIPLE_FROZEN_T24");
  const r=rows[0];
  // Report only the rejected FIELD, never actual source identifiers or
  // provider content. This matters when the baseline trigger changes a
  // synthetic provenance fixture and when investigating a genuine HOLD.
  if(r.flight_instance_id!==scope.flightInstanceId)
    HOLD("T24_CANONICAL_FLIGHT_ID_CHANGED");
  if(r.selected_t_version!==scope.expectedSelectedTVersion)
    HOLD("T24_SELECTED_T_VERSION_CHANGED");
  if(r.population_query_id!==scope.expectedPopulationQueryId)
    HOLD("T24_SOURCE_QUERY_UUID_CHANGED");
  if(r.fids_response_hash!==scope.expectedFidsResponseSha256)
    HOLD("T24_SOURCE_RESPONSE_HASH_CHANGED");
  if(r.frame_hash!==scope.reviewedFrameSha256)
    HOLD("T24_FROZEN_FRAME_HASH_CHANGED");
  if(r.config_hash!==scope.reviewedConfigSha256)
    HOLD("T24_FROZEN_CONFIG_HASH_CHANGED");
  if(!/^[0-9]+$/.test(String(r.snapshot_id??""))||
     !/^[0-9]+$/.test(String(r.native_xid??"")))
    HOLD("T24_NATIVE_ID_OR_XID_INVALID");
  const storedT=date(r.selected_t_milestone_utc,"STORED_T_INVALID"),
    storedC=date(r.prediction_cutoff_utc,"STORED_CUTOFF_INVALID");
  if(storedT.getTime()!==selectedT.getTime()||
     storedC.getTime()!==cutoff.getTime())
    HOLD("SCHEDULE_RETIME_OR_CHANGED_OWN_T24_CUTOFF");
  // Only the native PostgreSQL XID COMMIT timestamp counts; the row's
  // created_at is deliberately NOT used to determine timeliness.
  if(r.native_commit_at_utc==null)
    HOLD("POSTGRES_NATIVE_COMMIT_TIMESTAMP_PRUNED_OR_UNAVAILABLE");
  const committed=date(r.native_commit_at_utc,"NATIVE_COMMIT_TIMESTAMP_INVALID");
  const ms=committed.getTime();
  if(ms>=cutoff.getTime())
    HOLD("T24_NATIVE_TRANSACTION_COMMITTED_AFTER_CUTOFF");
  if(ms<cutoff.getTime()-180_000)
    HOLD("T24_COMMIT_OUTSIDE_PROSPECTIVE_THREE_MINUTE_WINDOW");
  if(ms>now.getTime())
    HOLD("NATIVE_COMMIT_TIMESTAMP_LATER_THAN_READBACK_CLOCK");
  await c.query("COMMIT");
  begun=false;
  return {
   schema:"v39.phase5.stage15.native-postgres-t24-commit-audit.v1",
   status:"NATIVE_DB_T24_TRANSACTION_COMMIT_TIMESTAMP_VERIFIED_SOURCE_NOT_CERTIFIED",
   flightInstanceId:scope.flightInstanceId,
   snapshotId:String(r.snapshot_id),
   populationQueryId:scope.expectedPopulationQueryId,
   selectedTNativeUtc:selectedT.toISOString(),
   t24CutoffUtc:cutoff.toISOString(),
   nativeTransactionCommitUtc:committed.toISOString(),
   databaseReadbackAtUtc:now.toISOString(),
   transactionId:String(r.native_xid),
   nativeCommitTimestampTracked:true,durableBeforeOwnT24Cutoff:true,
   withinThreeMinuteDueWindow:true,
   actualV0079SourceAndPopulationCertified:false,
   nativeProviderScheduleSemanticsCertified:false,
   physicalOperatingLegCertified:false,
   sourceAndMLRetentionRightsCertified:false,
   reviewedGithubOwnerAndProgrammaticWitnessCertified:false,
   t6OrT90WriteAuthorizedByThisCheck:false,
   phase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(begun)await c.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{c.release();}
}
