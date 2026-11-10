/**
 * Default-OFF source-original -> selected native T24 PRE readiness, actual PG16.
 * This is a repeatable READ ONLY handoff and NEVER writes a PRE/witness or
 * calls AeroDataBox. The existing signed manual T24 owner is still the only
 * prospective PRE + independently committed V0081 witness writer.
 */
import {readFileSync,lstatSync} from "node:fs";
import {Pool} from "pg";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {P5_STAGE14_BOUND_SOURCE_SQL,P5_STAGE14_PHYSICAL_MEMBER_SQL}
 from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {reviewP5OneNativeT24RealSourceHandoff,
 type P5T24SourceReadinessPins,type P5T24ActualOriginalReadback}
 from "../server/lib/disruption/phase5T24OriginalBoundReadonlyHandoff_v39";
import type {P5NativeT24SignedReleasePacket}
 from "./v39_phase5_one_signed_native_t24_pre_witness_github_owner_v39";

const CODE=/^[0-9a-f]{40}$/;
const SHA=/^[0-9a-f]{64}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const deny=(why:string):never=>{throw Error("REFUSED_P5_T24_SOURCE_READONLY_"+why);};
export const P5_T24_ALREADY_SAVED_SQL=[
 "SELECT s.id::text AS id FROM clean.flight_snapshots s",
 "WHERE s.flight_instance_id=$1 AND s.horizon='T-24h'",
 "AND s.prediction_state='PRE_DEPARTURE'",
 "ORDER BY s.id LIMIT 3"
].join(" ");
export const P5_T24_ALREADY_WITNESSED_SQL=[
 "SELECT w.snapshot_id::text AS snapshot_id",
 "FROM clean.phase5_t24_postcommit_witness_v39 w",
 "WHERE w.flight_instance_id=$1",
 "ORDER BY w.snapshot_id LIMIT 3"
].join(" ");
export function admitP5T24SourceReadonlyObserver(env:NodeJS.ProcessEnv):
 {path:string;conn:string;pins:P5T24SourceReadinessPins}{
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="schedule"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_T24_APPROVED_CODE_SHA||
    env.P5_T24_SOURCE_READONLY_ENABLED!=="true"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||
    env.DATABASE_URL||
    env.V39_DATABASE_RUNTIME_URL||
    env.V39_P5_SOURCE_DATABASE_URL||
    env.P5_V39_T24_WITNESS_DATABASE_URL||
    env.V39_P5_T24_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1")
  deny("UNSIGNED_MAIN_OR_UNREVIEWED_T24_RELEASE");
 const path=env.P5_T24_READONLY_SIGNED_PACKET_FILE??"";
 if(!PATH.test(path))deny("UNAPPROVED_SIGNED_T24_PACKET_PATH");
 const hashes=[
  env.V39_P5_T24_SIGNED_PACKET_SHA256,
  env.V39_P5_MANIFEST_SHA256,env.V39_P5_QUERY_DIGEST,
  env.V39_P5_RELEASE_SHA256,env.V39_P5_RIGHTS_SHA256,
  env.V39_P5_FRAME_HASH,env.V39_P5_CONFIG_HASH,
  env.V39_P5_NATIVE_T_SEMANTICS_SHA256
 ];
 if(!hashes.every(x=>typeof x==="string"&&SHA.test(x)))
  deny("MISSING_INDEPENDENT_SIGNED_T24_PINS");
 let url:URL;
 try{url=new URL(env.P5_V39_PRE_DATABASE_URL??"");}
 catch{return deny("MISSING_RESTRICTED_PRE_READONLY_LOGIN");}
 if(!["postgres:","postgresql:"].includes(url.protocol)||
    decodeURIComponent(url.username)!=="phase5_p30_pre_login_20261107"||
    !url.password||!url.hostname||url.pathname!=="/neondb"||url.hash)
  deny("UNCOMMISSIONED_SOURCE_READONLY_PRE_LOGIN");
 return {
  path,conn:env.P5_V39_PRE_DATABASE_URL!,
  pins:{
   frozenPacketPath:path,
   expectedPacketSha256:env.V39_P5_T24_SIGNED_PACKET_SHA256!,
   expectedApprovedMainSha:env.GITHUB_SHA!,
   expectedManifestSha256:env.V39_P5_MANIFEST_SHA256!,
   expectedQueryDigestSha256:env.V39_P5_QUERY_DIGEST!,
   expectedReleaseSha256:env.V39_P5_RELEASE_SHA256!,
   expectedRightsSha256:env.V39_P5_RIGHTS_SHA256!,
   expectedFrameSha256:env.V39_P5_FRAME_HASH!,
   expectedConfigSha256:env.V39_P5_CONFIG_HASH!,
   expectedNativeSemanticsSha256:env.V39_P5_NATIVE_T_SEMANTICS_SHA256!
  }
 };
}
export async function auditP5T24ActualOriginalReadyReadonly(
 pool:Pick<Pool,"connect">,
 bytes:Buffer,packet:P5NativeT24SignedReleasePacket,
 pins:P5T24SourceReadinessPins
){
 const pre=packet?.prePermit;
 if(!pre||!pool||typeof pool.connect!=="function")
  deny("NO_SIGNED_T24_PRE_OR_RESTRICTED_DB_CLIENT");
 const client=await pool.connect();
 let tx=false;
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const r=await client.query(
   "SELECT current_user AS actor,current_database() AS db,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now"
  );
  const current=r.rows[0];
  if(r.rowCount!==1||current.actor!==P5_STAGE28_GROUPS.pre||
     current.db!=="neondb"||current.ro!=="on"||
     current.replica!==false)
    deny("UNVERIFIED_PRE_ONLY_READONLY_SQL_SESSION");
  const sources=await client.query(P5_STAGE14_BOUND_SOURCE_SQL,
   [pre.manifestSha256,pre.queryDigestSha256]);
  if(sources.rowCount>1)
   deny("AMBIGUOUS_PROVIDER_SOURCE_ORIGINAL_READBACK");
  const members=await client.query(P5_STAGE14_PHYSICAL_MEMBER_SQL,
   [pre.expectedSourcePopulationQueryId,pre.flightInstanceId]);
  if(members.rowCount>1)
   deny("AMBIGUOUS_FLIGHT_MEMBER_IDENTITY_READBACK");
  const snapshots=await client.query(P5_T24_ALREADY_SAVED_SQL,
   [pre.flightInstanceId]);
  const witnessed=await client.query(P5_T24_ALREADY_WITNESSED_SQL,
   [pre.flightInstanceId]);
  const actual:P5T24ActualOriginalReadback={
   observedDbClockUtc:current.now,
   effectiveRole:current.actor,
   databaseName:current.db,
   transactionReadOnly:current.ro,
   // Stage14 source SQL filters q.query_digest=$2, but doesn't
   // project it. The exact searched digest is propagated as metadata.
   originalRows:sources.rows.map((x:Record<string,unknown>)=>
    ({...x,query_digest:pre.queryDigestSha256})),
   memberRows:members.rows,
   priorSnapshotCount:snapshots.rows.length,
   priorWitnessCount:witnessed.rows.length
  };
  const reviewed=reviewP5OneNativeT24RealSourceHandoff(
   bytes,packet,pins,actual);
  await client.query("COMMIT");tx=false;
  return reviewed;
 }catch(e){
  if(tx)await client.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{client.release();}
}
export async function runP5T24SourceReadonlyOwner(env:NodeJS.ProcessEnv){
 const approved=admitP5T24SourceReadonlyObserver(env);
 const stat=lstatSync(approved.path);
 if(!stat.isFile()||stat.isSymbolicLink()||
    stat.size<100||stat.size>200000)
  deny("SIGNED_NATIVE_T24_PACKET_NOT_REAL_FILE");
 const bytes=readFileSync(approved.path);
 let packet:P5NativeT24SignedReleasePacket;
 try{packet=JSON.parse(bytes.toString("utf8")) as P5NativeT24SignedReleasePacket;}
 catch{return deny("SIGNED_NATIVE_T24_PACKET_NOT_JSON");}
 const raw=new Pool({
  connectionString:approved.conn,max:1,
  connectionTimeoutMillis:8000,idleTimeoutMillis:1500,
  application_name:"p5_native_t24_source_readonly_handoff"
 });
 try{
  const scoped=makeP5Stage28DedicatedRolePool(raw,{
   group:"pre",
   reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  return await auditP5T24ActualOriginalReadyReadonly(
   scoped,bytes,packet,approved.pins);
 }finally{await raw.end().catch(()=>{});}
}
if(process.env.P5_T24_SOURCE_READONLY_ENTRYPOINT==="1")
 runP5T24SourceReadonlyOwner(process.env).then(out=>{
  console.log(JSON.stringify(out));
 }).catch(e=>{
  const msg=e instanceof Error?e.message:"";
  console.error(/^REFUSED_(?:P5|PHASE5)_[A-Z0-9_]+$/.test(msg)?
   msg:"REFUSED_P5_T24_SOURCE_READONLY_UNVERIFIED_OR_DB_HOLD");
  process.exitCode=2;
 });
