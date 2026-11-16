/** STOP-default T24 enrollment. Existing private reader + V0100 PREPARE
 * only; no provider, signer, PRE/witness writer or new database objects.
 * Same reviewed 31-day policy, same bounded registry routing as later PRE. */
import pg from "pg";
import {pathToFileURL} from "node:url";
import {readP6StableSourceTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {deriveP6T24QueueTrust,readP6CurrentT24QueuePackets} from "../server/lib/disruption/phase6PrivateT24QueueRouting_v39.mjs";
import {loadP6LaterCalendarWindows,selectP6LaterCalendarDueDays,isP6CurrentEnrollmentDispatch,loadP6CurrentEnrollmentCalendarWindows} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
import {readP6DayEpochRestrictedReaderClock} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39.ts";
import {verifyP5CdGithubFrozenCodeLineage} from "../server/lib/disruption/phase5CdGithubCodeLineage_v39.ts";
import {requireP5CdGithubPreparePrivateDayScope} from "../server/lib/disruption/phase5CdGithubPrepareRegistrationGate_v39.ts";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts";
import {executeP6PrivateEnrollmentBatch} from "./v39_phase6_private_later_restartable_enrollment_v39.ts";
const hold=s=>{throw Error("HOLD_P6_T24_ENROLL_"+s);};
const SHA=/^[a-f0-9]{64}$/;
export function readP6T24ProtectedQueueTrust(env){
 const t=readP6StableSourceTrust(env),raw=env.P6_NONPAID_DAILY_POLICY_BASE64;
 if(typeof raw!=="string"||raw.length<100||raw.length>46668||!SHA.test(env.P6_NONPAID_DAILY_POLICY_SHA256??""))
  hold("MISSING_PROTECTED_POLICY");
 const b=Buffer.from(raw,"base64");
 if(b.length>35000||b.toString("base64")!==raw)hold("INVALID_PROTECTED_POLICY");
 let p;try{p=JSON.parse(b.toString("utf8"));}catch{hold("INVALID_PROTECTED_POLICY");}
 return deriveP6T24QueueTrust({trust:t,policyBytes:b,expectedPolicySha256:env.P6_NONPAID_DAILY_POLICY_SHA256,
  reviewerPublicKeyPem:p?.nativeLaterReview?.laterReviewerPublicKeyPem});
}
export function checkedP6T24TlsUrl(raw,expectedLogin,base){
 let u;try{u=new URL(raw);}catch{hold("MISSING_RESTRICTED_TLS_URL");}
 if(decodeURIComponent(u.username)!==expectedLogin||!u.password||!sameP6NeonDatabaseEndpoint(u,base??u)||
    u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="require"||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))
  hold("WRONG_RESTRICTED_TLS_URL");
 return u;
}
export function admitP6T24Enrollment(env){
 const scoped=requireP5CdGithubPreparePrivateDayScope(env);
 const currentDispatch=isP6CurrentEnrollmentDispatch(env,"T24");
 if(env.P6_PRIVATE_T24_ENROLL_ENABLED!=="1"||env.P5_CD_GH_T24_PREPARE_APPROVED!=="1"||
    env.P5_CD_GH_T24_WITNESS_APPROVED!=="1"||(!currentDispatch&&env.P5_CD_GH_PREPARE_PRIVATE_DAY_CONFIRM!=="REGISTER_CURRENT_SIGNED_T24_DAY_NO_PROVIDER")||
    env.P6_PRIVATE_LATER_ENROLL_ENTRYPOINT==="1"||env.P5_CD_GH_PREPARE_EXECUTE==="1"||env.P6_PRIVATE_LATER_RUN_DAYS||
    env.P5_CD_GH_REGISTER_HORIZON!=="T-24h"||env.P6_PRIVATE_PUBLISHER_DATABASE_URL||
    env.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64||env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64||env.P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0")
  hold("NO_EXPLICIT_SEPARATE_T24_ENROLLMENT_SCOPE");
 if(env.GITHUB_EVENT_NAME==="schedule"&&env.P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED!=="1")hold("T24_SCHEDULE_DISABLED");
 const trust=readP6T24ProtectedQueueTrust(env);
 if(trust.reviewedCodeSha!==scoped.gate.approvedCodeSha||trust.manifestSha256!==scoped.gate.manifestSha256||trust.rightsSha256!==scoped.gate.rightsSha256)
  hold("REVIEWED_PREPARE_TRUST_DRIFT");
 const p=checkedP6T24TlsUrl(scoped.databaseUrl,"phase5_p30_prepare_login_20261107");
 checkedP6T24TlsUrl(env.P6_PRIVATE_READER_DATABASE_URL,trust.expectedReaderSessionLogin,p);
 const raw=env.P6_PRIVATE_T24_RUN_DAYS??"",scheduled=env.GITHUB_EVENT_NAME==="schedule",current=scheduled||currentDispatch;
 if(current?Boolean(raw):!/^(?:[1-9]|[12][0-9]|3[01])(?:,(?:[1-9]|[12][0-9]|3[01]))?$/.test(raw))hold("INVALID_DAY_SCOPE");
 const days=current?[]:raw.split(",").map(Number);
 if(new Set(days).size!==days.length)hold("DUPLICATE_DAY_SCOPE");
 return {trust,scoped,days,calendar:scheduled?loadP6LaterCalendarWindows(env,trust,undefined,"T24"):currentDispatch?loadP6CurrentEnrollmentCalendarWindows(env,trust,undefined,"T24"):null,
  readerUrl:env.P6_PRIVATE_READER_DATABASE_URL};
}
export async function readP6T24RoutingClock(client,trust){
 await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{return await readP6DayEpochRestrictedReaderClock(client,trust.expectedReaderSessionLogin);}
 finally{await client.query("ROLLBACK");}
}
export async function runP6T24Enrollment(env){
 verifyP5CdGithubFrozenCodeLineage(env);
 const ctx=admitP6T24Enrollment(env),reader=new pg.Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000,
  application_name:"p6_native_t24_enrollment_reader"});
 let selected,days=ctx.days;
 try{
  await reader.connect();await reader.query("SET ROLE phase6_private_frozen_reader_v39");
  if(ctx.calendar)days=selectP6LaterCalendarDueDays(ctx.calendar,await readP6T24RoutingClock(reader,ctx.trust)).dayIndices;
  if(!days.length)return {status:"NO_DUE_T24_STUDY_DAYS",providerCalls:0,preWrites:0,phase6PaidGo:false};
  selected=await readP6CurrentT24QueuePackets({client:reader,trust:ctx.trust,runDayIndices:days,purpose:"ENROLLMENT"});
  if(selected.status!=="CURRENT_SIGNED_T24_QUEUE_PACKET_PROJECTION_NO_GO"||selected.purpose!=="ENROLLMENT"||
     selected.privatePackets.length!==selected.packetCount||selected.packetCount>384||selected.providerCalls!==0||
     selected.databaseWrites!==0||selected.queueClaims!==0||selected.phase6PaidGo!==false||
     selected.privatePackets.some(x=>x.entry.permit.horizon!=="T-24h"||!x.entry.witnessReview))
   hold("EXACT_T24_ROUTING_REQUIRED");
 }finally{await reader.end();}
 if(!selected.packetCount)return {status:"NO_PROSPECTIVE_SIGNED_T24_PACKETS",providerCalls:0,preWrites:0,phase6PaidGo:false};
 const raw=new pg.Pool({connectionString:ctx.scoped.databaseUrl,max:1,connectionTimeoutMillis:8000,statement_timeout:10000,
  query_timeout:15000,application_name:"p6_native_t24_v0100_prepare"});
 try{
  const prepare=makeP5Stage28DedicatedRolePool(raw,{group:"prepare",reviewedDedicatedLogin:"phase5_p30_prepare_login_20261107",forbiddenApplicationLogin:"phase5_runtime_application_login"});
  const conn=await prepare.connect();
  try{
   const r=await executeP6PrivateEnrollmentBatch(conn,selected.privatePackets);
   return {status:"CURRENT_SIGNED_T24_V0091_REGISTRATION_COMPLETE_NO_PRE",...r,
    deferredRegistries:selected.deferredRegistryCount,providerCalls:0,preWrites:0,phase6PaidGo:false};
  }finally{conn.release();}
 }finally{await raw.end();}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{console.log(JSON.stringify(await runP6T24Enrollment(process.env)));}
 catch(e){const msg=String(e?.message??"");console.error(/^HOLD_P6_T24_ENROLL_[A-Z0-9_]+$/.test(msg)?msg:"HOLD_P6_T24_ENROLL_REDACTED_STOP_EXACT_RESTART_ONLY");process.exitCode=2;}
}
