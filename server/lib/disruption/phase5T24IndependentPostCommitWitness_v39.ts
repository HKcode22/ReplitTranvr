/**
 * Phase5 Stage17 — independent durable T24 PRE commit witness for deployed
 * PostgreSQL where native track_commit_timestamp=OFF.
 *
 * 1. Stage14 PRE must ALREADY have committed and be visible in a SEPARATE
 *    transaction. We only SELECT it here; witness role cannot INSERT PRE.
 * 2. A V0081 BEFORE INSERT trigger independently stamps DB clock, validates
 *    exact immutable T24/operating source, and refuses late or not-yet-due.
 * 3. COMMIT the witness, then read the persisted witness back with a fresh DB
 *    clock strictly before the original flight cutoff.
 *
 * This does NOT activate Stage14 T6/T90, install migrations, verify provider
 * legal/semantic rights, contact AeroDataBox, or authorize Phase6.
 */
import type {Pool,PoolClient} from "pg";
const SHA=/^[0-9a-f]{64}$/;
const ROLE=/^phase5_fids_t24_witness_[a-z0-9_]{6,40}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ID=/^[a-zA-Z0-9_.:|-]{5,200}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const HOLD=(s:string):never=>{throw Error("REFUSED_P5_STAGE17_T24_WITNESS_"+s);};
const dt=(x:unknown,k:string):Date=>{
 const v=x instanceof Date?x:typeof x==="string"?new Date(x):null;
 if(!v||!Number.isFinite(v.getTime()))
  throw Error("REFUSED_P5_STAGE17_T24_WITNESS_"+k);
 return v;
};
function validateUTC(x:string,k:string):Date{
 if(typeof x!=="string"||!ISO.test(x)||!Number.isFinite(Date.parse(x))||
  new Date(x).toISOString()!==x)
  HOLD(k);
 return new Date(x);
}
export interface P5Stage17T24WitnessPermit{
 expectedSnapshotId:string;
 flightInstanceId:string;
 sourcePopulationQueryId:string;
 expectedSourceResponseSha256:string;
 expectedSourceQueryDigestSha256:string;
 expectedFrameSha256:string;expectedConfigSha256:string;
 selectedTNativeUtc:string;expectedT24CutoffUtc:string;
 expectedSelectedTVersion:string;
 expectedWitnessOnlyRole:string;
}
export interface P5Stage17WitnessResult{
 schema:"v39.phase5.stage17.separate-transaction-t24-pre-commit-witness.v1";
 status:"T24_PRE_SEPARATE_TRANSACTION_DB_WITNESS_DURABLE_BEFORE_CUTOFF";
 snapshotId:string;flightInstanceId:string;
 frozenT24CutoffUtc:string;
 postPreCommitDbObservedAtUtc:string;
 postWitnessCommitReadbackAtUtc:string;
 originalT24SnapshotVisibleInSeparateTransaction:true;
 witnessCommittedAndReadBackBeforeOwnCutoff:true;
 nativeCommitTimestampTrackingRequired:false;
 flightSourceAndNativeTIndependentlyCertifiedByThisModule:false;
 sourceLegalRetentionAndPurposeCertified:false;
 signed31DayScientificFreezePassed:false;
 paidPhase6Authorized:false;
 providerCalls:0;databaseSourceWrites:0;alertCreates:0;
}
export const P5_STAGE17_T24_SELECT_SQL=[
 "SELECT id::text AS snapshot_id,flight_instance_id,",
 "population_query_id,fids_response_hash,frame_hash,config_hash,",
 "selected_t_milestone_utc,selected_t_version,prediction_cutoff_utc",
 "FROM clean.flight_snapshots",
 "WHERE id=$1::bigint AND horizon='T-24h'",
 "AND prediction_state='PRE_DEPARTURE'"
].join(" ");
export const P5_STAGE17_WITNESS_READBACK_SQL=[
 "SELECT clock_timestamp() AS readback_at,",
 "w.snapshot_id::text AS snapshot_id,w.flight_instance_id,",
 "w.population_query_id,w.fids_response_hash,w.source_query_digest,",
 "w.frame_hash,w.config_hash,w.selected_t_native_utc,",
 "w.selected_t_version,w.t24_cutoff_utc,",
 "w.post_pre_commit_db_observed_at_utc,",
 "s.id::text AS joined_snapshot_id",
 "FROM clean.phase5_t24_postcommit_witness_v39 w",
 "JOIN clean.flight_snapshots s ON s.id=w.snapshot_id",
 "WHERE w.snapshot_id=$1::bigint LIMIT 2"
].join(" ");
function validPermit(p:P5Stage17T24WitnessPermit){
 if(!p||!/^[1-9][0-9]{0,17}$/.test(p.expectedSnapshotId??"")||
  !ID.test(p.flightInstanceId??"")||
  !UUID.test(p.sourcePopulationQueryId??"")||
  ![p.expectedSourceResponseSha256,p.expectedSourceQueryDigestSha256,
    p.expectedFrameSha256,p.expectedConfigSha256].every(x=>SHA.test(x??""))||
  !ROLE.test(p.expectedWitnessOnlyRole??"")||
  typeof p.expectedSelectedTVersion!=="string"||
  p.expectedSelectedTVersion.length<10||p.expectedSelectedTVersion.length>500)
  HOLD("INVALID_SIGNED_T24_WITNESS_SCOPE");
 const native=validateUTC(p.selectedTNativeUtc,"NATIVE_T_UTC_INVALID");
 const cutoff=validateUTC(p.expectedT24CutoffUtc,"CUTOFF_UTC_INVALID");
 if(native.getTime()-cutoff.getTime()!==86_400_000)
   HOLD("FROZEN_T24_ANCHOR_SHIFTED");
 return cutoff;
}
function exactSnapshot(s:Record<string,unknown>,p:P5Stage17T24WitnessPermit,
 cutoff:Date){
 if(String(s.snapshot_id??"")!==p.expectedSnapshotId||
    s.flight_instance_id!==p.flightInstanceId||
    s.population_query_id!==p.sourcePopulationQueryId||
    s.fids_response_hash!==p.expectedSourceResponseSha256||
    s.frame_hash!==p.expectedFrameSha256||
    s.config_hash!==p.expectedConfigSha256||
    s.selected_t_version!==p.expectedSelectedTVersion||
    dt(s.selected_t_milestone_utc,"STORED_NATIVE_T").getTime()!==
      Date.parse(p.selectedTNativeUtc)||
    dt(s.prediction_cutoff_utc,"STORED_T24_CUTOFF").getTime()!==
      cutoff.getTime())HOLD("PRE_SNAPSHOT_PROVENANCE_OR_T_CHANGED");
}
function inDueWindow(now:Date,cutoff:Date){
 if(now.getTime()<cutoff.getTime()-180_000)
  HOLD("T24_WITNESS_TOO_EARLY");
 if(now.getTime()>=cutoff.getTime()-2000)
  HOLD("MISSED_T24_COMMIT_WITNESS_NO_BACKFILL");
}
export async function persistP5T24SeparateTransactionWitness(
 pool:Pick<Pool,"connect">,p:P5Stage17T24WitnessPermit
):Promise<P5Stage17WitnessResult>{
 const cutoff=validPermit(p);
 if(!pool||typeof pool.connect!=="function")
  HOLD("MISSING_RESTRICTED_WITNESS_ROLE_POOL");
 const c:PoolClient=await pool.connect();
 let opened=false,commitStarted=false;
 try{
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  opened=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const ident=(await c.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('transaction_read_only') AS read_only,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now,"+
   "has_table_privilege(current_user,'clean.flight_snapshots','SELECT') AS snapshot_read,"+
   "has_table_privilege(current_user,'clean.flight_snapshots','INSERT') AS snapshot_write,"+
   "has_table_privilege(current_user,'clean.phase5_t24_postcommit_witness_v39','INSERT') AS witness_write,"+
   "has_table_privilege(current_user,'clean.phase5_t24_postcommit_witness_v39','SELECT') AS witness_read,"+
   "has_table_privilege(current_user,'clean.phase5_t24_postcommit_witness_v39','UPDATE') AS witness_update,"+
   "has_table_privilege(current_user,'clean.phase5_t24_postcommit_witness_v39','DELETE') AS witness_delete,"+
   "has_table_privilege(current_user,'clean.phase5_fids_allowed_query_v39','INSERT') AS source_write"
  )).rows[0];
  if(ident?.db!=="neondb"||ident.actor!==p.expectedWitnessOnlyRole||
    ident.read_only!=="off"||ident.replica!==false||
    ident.snapshot_read!==true||ident.snapshot_write!==false||
    ident.witness_write!==true||ident.witness_read!==true||
    ident.witness_update!==false||ident.witness_delete!==false||
    ident.source_write!==false)
    HOLD("NOT_STRICTLY_INDEPENDENT_WITNESS_ONLY_ROLE");
  inDueWindow(dt(ident.now,"DB_NOW"),cutoff);
  await c.query(
   "SELECT pg_advisory_xact_lock(hashtext('phase5-t24-witness'),hashtext($1))",
   [p.flightInstanceId]
  );
  const original=(await c.query(P5_STAGE17_T24_SELECT_SQL,
   [p.expectedSnapshotId])).rows;
  if(original.length!==1)HOLD("ABSENT_ALREADY_COMMITTED_T24_PRE");
  exactSnapshot(original[0],p,cutoff);
  const duplicate=(await c.query(
   "SELECT snapshot_id::text AS id FROM clean.phase5_t24_postcommit_witness_v39"+
   " WHERE flight_instance_id=$1 OR snapshot_id=$2::bigint LIMIT 2",
   [p.flightInstanceId,p.expectedSnapshotId])).rows;
  if(duplicate.length!==0)HOLD("EXISTING_IMMUTABLE_T24_WITNESS_NO_RETRY");
  // The V0081 BEFORE INSERT trigger re-reads genuine source/physical-leg,
  // overrides every caller-provided witness field with DB-derived values,
  // and stamps clock_timestamp() AFTER it can see the already COMMITTED PRE.
  const inserted=(await c.query(
   "INSERT INTO clean.phase5_t24_postcommit_witness_v39(snapshot_id)"+
   " VALUES($1::bigint) RETURNING snapshot_id::text AS id,"+
   "post_pre_commit_db_observed_at_utc AS stamped",
   [p.expectedSnapshotId])).rows;
  if(inserted.length!==1||inserted[0].id!==p.expectedSnapshotId)
   HOLD("POST_PRE_COMMIT_WITNESS_INSERT_REFUSED");
  inDueWindow(dt((await c.query(
   "SELECT clock_timestamp() AS now")).rows[0]?.now,
   "DB_BEFORE_WITNESS_COMMIT"),cutoff);
  commitStarted=true;
  await c.query("COMMIT");opened=false;
  // This is the essential second proof: witness transaction was DURABLE and
  // visible, and DB clock still strictly precedes the own T24 cutoff.
  const readback=(await c.query(P5_STAGE17_WITNESS_READBACK_SQL,
   [p.expectedSnapshotId])).rows;
  if(readback.length!==1)HOLD("POST_WITNESS_COMMIT_ABSENT_OR_AMBIGUOUS");
  const v=readback[0],t=dt(v.readback_at,"AFTER_WITNESS_COMMIT_CLOCK");
  const recorded=dt(v.post_pre_commit_db_observed_at_utc,"PRE_COMMITTED_OBSERVED_AT");
  if(String(v.snapshot_id)!==p.expectedSnapshotId||
    String(v.joined_snapshot_id)!==p.expectedSnapshotId||
    v.flight_instance_id!==p.flightInstanceId||
    v.population_query_id!==p.sourcePopulationQueryId||
    v.fids_response_hash!==p.expectedSourceResponseSha256||
    v.source_query_digest!==p.expectedSourceQueryDigestSha256||
    v.frame_hash!==p.expectedFrameSha256||
    v.config_hash!==p.expectedConfigSha256||
    v.selected_t_version!==p.expectedSelectedTVersion||
    dt(v.selected_t_native_utc,"WITNESS_NATIVE_T").getTime()!==
      Date.parse(p.selectedTNativeUtc)||
    dt(v.t24_cutoff_utc,"WITNESS_CUTOFF").getTime()!==cutoff.getTime()||
    recorded.getTime()<cutoff.getTime()-180_000||
    recorded.getTime()>t.getTime()||
    t.getTime()>=cutoff.getTime())
     HOLD("POST_WITNESS_COMMIT_TOO_LATE_OR_UNVERIFIED_QUARANTINE");
  return {
   schema:"v39.phase5.stage17.separate-transaction-t24-pre-commit-witness.v1",
   status:"T24_PRE_SEPARATE_TRANSACTION_DB_WITNESS_DURABLE_BEFORE_CUTOFF",
   snapshotId:p.expectedSnapshotId,flightInstanceId:p.flightInstanceId,
   frozenT24CutoffUtc:cutoff.toISOString(),
   postPreCommitDbObservedAtUtc:recorded.toISOString(),
   postWitnessCommitReadbackAtUtc:t.toISOString(),
   originalT24SnapshotVisibleInSeparateTransaction:true,
   witnessCommittedAndReadBackBeforeOwnCutoff:true,
   nativeCommitTimestampTrackingRequired:false,
   flightSourceAndNativeTIndependentlyCertifiedByThisModule:false,
   sourceLegalRetentionAndPurposeCertified:false,
   signed31DayScientificFreezePassed:false,
   paidPhase6Authorized:false,
   providerCalls:0,databaseSourceWrites:0,alertCreates:0
  };
 }catch(e){
  if(opened&&!commitStarted)
   await c.query("ROLLBACK").catch(()=>{});
  if(commitStarted)
   HOLD("AMBIGUOUS_WITNESS_COMMIT_QUARANTINE_DO_NOT_RETRY");
  throw e;
 }finally{c.release();}
}
