/**
 * ONE reviewed source → existing V0087 flight×horizon registration.
 * GH workflow_dispatch/main, no provider HTTP, no paid tokens, no new
 * queue, no PRE/POST/Alert writes. Uses existing Stage30 PREPARE login,
 * existing signed V39 frozen PRE packet and real V0091 source-verifying SQL.
 *
 * Non-idempotent intentionally: unknown INSERT COMMIT acknowledgment HOLD;
 * never automatically resubmit a flight/horizon.
 */
import {readFileSync,lstatSync} from "node:fs";
import {Pool} from "pg";
import {
 makeP5Stage28DedicatedRolePool
} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {
 requireP5CdGithubPrepareAdmission
} from "../server/lib/disruption/phase5CdGithubPrepareRegistrationGate_v39";
import {
 verifyP5CdFrozenRoster,
 type P5CdFrozenRoster,type P5CdFrozenRosterEntry
} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
import {
 preflightP5Stage14ReviewedPermitV39
} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";

const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const MAX=200_000;
function hold(s:string):never{
 throw Error("REFUSED_P5_CD_GH_PREPARE_REGISTER_"+s);
}
function bytes(path:string):Buffer{
 if(!FILE.test(path??""))hold("NOT_REVIEWED_FROZEN_GH_PACKET_PATH");
 const st=lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.size<100||st.size>MAX)
  hold("FILE_SYMLINK_OR_SOURCE_BYTES_NOT_APPROVED");
 return readFileSync(path);
}
const QUERY="SELECT clean.phase5_cd_register_source_flight_v39("+
 "$1,$2,$3,$4,$5::timestamptz,$6,$7,$8,$9,$10) AS task_id";
export async function runP5CdGithubOneSourceEnrollment(
 env:NodeJS.ProcessEnv
){
 const approved=requireP5CdGithubPrepareAdmission(env);
 const path=env.P5_CD_GH_PRE_ROSTER_PATH;
 if(!path||!FILE.test(path))hold("MISSING_REVIEWED_FROZEN_ROSTER_PATH");
 const rosterBytes=bytes(path);
 let roster:P5CdFrozenRoster;
 try{roster=JSON.parse(rosterBytes.toString("utf8")) as P5CdFrozenRoster;}
 catch{return hold("FROZEN_ROSTER_NOT_JSON");}
 if(!Array.isArray(roster?.entries)||roster.entries.length!==1)
  hold("ONE_FUTURE_SOURCE_PACKET_PER_REGISTRATION_ONLY");
 const x=roster.entries[0];
 const frozen:P5CdFrozenRosterEntry={
  filePath:x.filePath,packetSha256:x.packetSha256,
  bytes:bytes(x.filePath)
 };
 const packets=verifyP5CdFrozenRoster(rosterBytes,roster,[frozen],
  approved.gate);
 if(packets.size!==1)hold("SIGNED_SOURCE_ROSTER_NOT_SINGLETON");
 const permit=packets.get(frozen.packetSha256)?.permit;
 if(!permit)hold("SIGNED_SOURCE_PACKET_NOT_BOUND");
 if(preflightP5Stage14ReviewedPermitV39(permit)!==
    permit.selectedTNativeUtc)
  hold("ORIGINAL_STAGE14_FIRST_NATIVE_T_NOT_FROZEN");
 if(permit.horizon!=="T-6h"&&permit.horizon!=="T-90m")
  hold("T24_REQUIRES_SEPARATE_V0081_WITNESS_CONTROLLER");
 // The PG16 V0091 function derives actual original expiry directly
 // from V0079 and verifies source body, identity and as-of time. No
 // caller-supplied expiry, provider key, source writer or task update.
 const pool=new Pool({
  connectionString:approved.databaseUrl,max:1,
  connectionTimeoutMillis:9000,idleTimeoutMillis:1200,
  application_name:"phase5_cd_github_source_bound_one_task_prepare_only"
 });
 try{
  const prepare=makeP5Stage28DedicatedRolePool(pool,{
   group:"prepare",
   reviewedDedicatedLogin:"phase5_p30_prepare_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  const r=await prepare.query(QUERY,[
   permit.manifestSha256,permit.queryDigestSha256,
   permit.flightInstanceId,permit.horizon,permit.selectedTNativeUtc,
   frozen.packetSha256,permit.expectedSourcePopulationQueryId,
   permit.expectedSourceResponseSha256,
   permit.expectedReviewedSourceRightsSha256,
   permit.maxPopulationStalenessSeconds
  ]);
  const id=String(r.rows[0]?.task_id??"");
  if(r.rowCount!==1||!/^[1-9][0-9]{0,18}$/.test(id))
   hold("REGISTRATION_COMMIT_ACK_UNKNOWN_DO_NOT_RETRY");
  return{
   schema:"v39.phase5.github-one-real-source-to-v0087-task.v1",
   status:"ONE_AUTHENTIC_BOUND_SOURCE_FLIGHT_REGISTERED_NOT_PRE",
   flightInstanceId:permit.flightInstanceId,
   horizon:permit.horizon,
   taskId:id,packetSha256:frozen.packetSha256,
   sourcePopulationQueryId:permit.expectedSourcePopulationQueryId,
   registrationCommitAck:true,
   // Neither a digest nor a SQL assertion grants provider Contents rights.
   independentExternalSourceRightsCertifiedByThisRun:false,
   futureStage14PreAttempted:false,
   paidProviderCalls:0,providerCalls:0,alertCreates:0,
   phase5ScientificFreezePassed:false,phase6PaidGo:false
  };
 }finally{await pool.end().catch(()=>{});}
}
if(process.env.P5_CD_GH_PREPARE_EXECUTE==="1"){
 runP5CdGithubOneSourceEnrollment(process.env).then(result=>{
  console.log(JSON.stringify(result,null,2));
 }).catch(err=>{
  const msg=err instanceof Error?err.message:"";
  const safe=/^REFUSED_P5_CD_[A-Z0-9_]+$/.test(msg)?
   msg:"REFUSED_P5_CD_GH_PREPARE_REGISTER_DATABASE_OR_UNKNOWN_COMMIT_HOLD_NO_RETRY";
  console.error(safe);process.exitCode=2;
 });
}
