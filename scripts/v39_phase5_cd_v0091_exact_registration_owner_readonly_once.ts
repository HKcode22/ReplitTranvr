/**
 * Owner-only V0091 one-flight REGISTRATION RECONCILIATION.
 * For unknown COMMIT/ACK, never issue V0091 a second time on guesswork.
 * Queries only the already live V0087 queue, no FIDS raw bodies or
 * paid calls, and no update/insert. A missing row in one MVCC snapshot
 * does NOT conclusively prove the first transaction aborted.
 */
import "dotenv/config";
import pg from "pg";
const {Client}=pg;
const SHA=/^[a-f0-9]{64}$/;
const FLIGHT=/^[A-Za-z0-9_.:|-]{5,200}$/;
const HORIZON=new Set(["T-24h","T-6h","T-90m"]);
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const hold=(s:string):never=>{throw Error("HOLD_P5_CD_V0091_READONLY_"+s);};
function check(e:NodeJS.ProcessEnv){
 if(!e.DATABASE_URL||e.GITHUB_ACTIONS==="true"||
    !SHA.test(e.P5_CD_AUDIT_MANIFEST_SHA256??"")||
    !SHA.test(e.P5_CD_AUDIT_PACKET_SHA256??"")||
    !FLIGHT.test(e.P5_CD_AUDIT_FLIGHT_ID??"")||
    !HORIZON.has(e.P5_CD_AUDIT_HORIZON??"")||
    !ISO.test(e.P5_CD_AUDIT_SELECTED_NATIVE_T_UTC??"")||
    !Number.isFinite(Date.parse(e.P5_CD_AUDIT_SELECTED_NATIVE_T_UTC!))||
    new Date(e.P5_CD_AUDIT_SELECTED_NATIVE_T_UTC!)
     .toISOString()!==e.P5_CD_AUDIT_SELECTED_NATIVE_T_UTC)
  hold("EXACT_ONE_FLIGHT_PACKET_SCOPE_REQUIRED");
 return{
  manifest:e.P5_CD_AUDIT_MANIFEST_SHA256!,
  packet:e.P5_CD_AUDIT_PACKET_SHA256!,
  flight:e.P5_CD_AUDIT_FLIGHT_ID!,
  horizon:e.P5_CD_AUDIT_HORIZON!,
  native:e.P5_CD_AUDIT_SELECTED_NATIVE_T_UTC!
 };
}
export async function auditP5CdV0091OneFlightReadOnly(
 db:{query(sql:string,params?:unknown[]):Promise<{rows:any[]}>},
 e:NodeJS.ProcessEnv
){
 const p=check(e);
 let open=false;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  open=true;
  await db.query("SET LOCAL statement_timeout='12000ms'");
  await db.query("SET LOCAL lock_timeout='1500ms'");
  const m=(await db.query(
   "SELECT current_database() AS db,current_user AS role,"+
   "current_setting('server_version_num')::integer AS ver,"+
   "current_setting('transaction_read_only') AS ro,"+
   "clock_timestamp() AS observed_utc"
  )).rows[0];
  if(!m||m.db!=="neondb"||m.role!=="neondb_owner"||
     m.ver<160000||m.ro!=="on"||!m.observed_utc)
   hold("REAL_NEONDB_OWNER_READONLY_SNAPSHOT_NOT_VERIFIED");
  const rows=(await db.query(
   "SELECT task_id::text,state,manifest_sha256,packet_sha256,"+
   "selected_native_t_utc,prediction_cutoff_utc,lease_generation,"+
   "verified_snapshot_id::text AS verified_snapshot_id"+
   " FROM clean.phase5_cd_pre_task_v39"+
   " WHERE manifest_sha256=$1 AND flight_instance_id=$2"+
   " AND horizon=$3 LIMIT 2",
   [p.manifest,p.flight,p.horizon])).rows;
  if(rows.length>1)hold("MULTIPLE_REGISTERED_TASKS_UNEXPECTED");
  const r=rows[0];
  const nativeUtc=r?.selected_native_t_utc instanceof Date?
    r.selected_native_t_utc.toISOString():
    r?.selected_native_t_utc;
  const matching=!!r&&r.manifest_sha256===p.manifest&&
    r.packet_sha256===p.packet&&nativeUtc===p.native;
  const state=matching&&
    ["READY","CLAIMED","WRITE_STARTED_UNKNOWN",
     "VERIFIED_ON_TIME","MISSED","QUARANTINED"].includes(r.state)
      ?r.state:null;
  if(r&&(!matching||!state))
   hold("REGISTERED_TASK_MATCHES_FLIGHT_BUT_PACKET_OR_NATIVE_T_DRIFT");
  await db.query("COMMIT");open=false;
  return{
   schema:"v39.phase5.cd-v0091-one-registration-owner-readonly-audit.v1",
   status:r?
    "EXACT_TASK_VISIBLE_NO_DUPLICATE_REGISTRATION":
    "NO_TASK_VISIBLE_IN_THIS_SNAPSHOT_NOT_PROOF_OF_ABORT",
   taskId:r?r.task_id:null,
   queueState:state,
   sourcePacketAndFirstNativeTMatch:matching,
   snapshotReceiptPresent:!!(matching&&r.verified_snapshot_id),
   observedDatabaseUtc:m.observed_utc instanceof Date?
    m.observed_utc.toISOString():m.observed_utc,
   noRetryAuthorizedByThisReadback:true,
   providerCalls:0,paidProviderCalls:0,databaseWrites:0,
   phase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(open)await db.query("ROLLBACK").catch(()=>{});
  throw e;
 }
}
if(process.argv[1]?.endsWith(
 "v39_phase5_cd_v0091_exact_registration_owner_readonly_once.ts")){
 let client:InstanceType<typeof Client>|undefined;
 try{
  client=new Client({
   connectionString:process.env.DATABASE_URL,
   connectionTimeoutMillis:8_000,
   application_name:"p5_cd_v0091_exact_registration_readonly_owner"
  });
  await client.connect();
  console.log(JSON.stringify(
   await auditP5CdV0091OneFlightReadOnly(client,process.env),null,2));
 }catch(e){
  const msg=e instanceof Error&&
   /^HOLD_P5_CD_V0091_READONLY_[A-Z0-9_]+$/.test(e.message)?
    e.message:"HOLD_P5_CD_V0091_READONLY_DB_OR_UNEXPECTED_NO_RETRY";
  console.error(msg);process.exitCode=2;
 }finally{if(client)await client.end().catch(()=>{});}
}
