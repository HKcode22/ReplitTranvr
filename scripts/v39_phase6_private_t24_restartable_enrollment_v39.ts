/** T24 counterpart of the existing restartable later enrollment, using
 * the same prepare-only login and V0100. No PRE or witness write, paid
 * source, signing key, queue schema or separate provider budget. */
import {Client,Pool} from "pg";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39";
import {readP6T24RegistryRoutingTrust,readP6CurrentT24Routing,projectP6T24CompatibilityRoster} from "../server/lib/disruption/phase6CurrentPrivateT24Routing_v39.mjs";
import {verifyP5CdGithubFrozenCodeLineage} from "../server/lib/disruption/phase5CdGithubCodeLineage_v39";
import {requireP5CdGithubPreparePrivateDayScope} from "../server/lib/disruption/phase5CdGithubPrepareRegistrationGate_v39";
import {verifyP5CdFrozenRoster,type P5CdVerifiedTaskPacket} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
import {preflightP5Stage14ReviewedPermitV39} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {executeP6PrivateEnrollmentBatch} from "./v39_phase6_private_later_restartable_enrollment_v39";
const hold=(s:string):never=>{throw Error("HOLD_P6_PRIVATE_T24_ENROLL_"+s);};
export function admitP6PrivateT24Enrollment(env:NodeJS.ProcessEnv){
 const scoped=requireP5CdGithubPreparePrivateDayScope(env),trust=readP6T24RegistryRoutingTrust(env);
 if(env.GITHUB_EVENT_NAME!=="schedule"||env.P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED!=="1"||
    env.P5_CD_GH_T24_PREPARE_APPROVED!=="1"||env.P5_CD_GH_T24_WITNESS_APPROVED!=="1"||
    env.P5_CD_GH_PREPARE_PRIVATE_DAY_CONFIRM!=="REGISTER_CURRENT_SIGNED_T24_DAY_NO_PROVIDER"||
    env.P5_CD_GH_PREPARE_EXECUTE==="1"||env.P6_PRIVATE_LATER_ENROLL_ENTRYPOINT==="1"||
    env.P5_T24_AUTO_DISPATCH_ENABLED==="true"||env.P5_CD_GH_T24_SCHEDULE_ENABLED==="1"||
    env.P6_PRIVATE_PUBLISHER_DATABASE_URL||env.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64||
    env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64||env.P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64||
    trust.reviewedCodeSha!==scoped.gate.approvedCodeSha)
  hold("NO_EXPLICIT_T24_RELEASE_OR_COMPETING_LEGACY_WORKER");
 let reader:URL,prepare:URL;
 try{reader=new URL(env.P6_PRIVATE_READER_DATABASE_URL??"");prepare=new URL(scoped.databaseUrl);}
 catch{return hold("MISSING_RESTRICTED_DATABASE_URL");}
 if(!sameP6NeonDatabaseEndpoint(reader,prepare)||decodeURIComponent(reader.username)!==trust.expectedReaderSessionLogin||
    reader.username===prepare.username||!reader.password||
    reader.searchParams.getAll("sslmode").length!==1||reader.searchParams.get("sslmode")!=="require"||
    [...reader.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (reader.searchParams.has("channel_binding")&&(reader.searchParams.getAll("channel_binding").length!==1||reader.searchParams.get("channel_binding")!=="require")))
  hold("WRONG_DISTINCT_TLS_READER");
 return {scoped,trust,readerUrl:env.P6_PRIVATE_READER_DATABASE_URL!};
}
export function selectP6T24EnrollmentPackets(report:Awaited<ReturnType<typeof readP6CurrentT24Routing>>,ctx:ReturnType<typeof admitP6PrivateT24Enrollment>){
 if(report.status!=="CURRENT_PRIVATE_T24_ROUTING_READONLY_NO_GO"||report.purpose!=="ENROLLMENT"||
    report.providerCalls!==0||report.databaseWrites!==0||report.phase6PaidGo!==false||
    !Array.isArray(report.privatePackets)||report.privatePackets.length!==report.hydratedShardCount||report.privatePackets.length>4)
  hold("UNVERIFIED_T24_ROUTING");
 const seen=new Set<string>(),packets:Array<{entry:P5CdVerifiedTaskPacket;cutoff:number}>=[];
 let expired=0;
 for(const p of report.privatePackets){
  const x=projectP6T24CompatibilityRoster(p,ctx.trust);
  const verified=verifyP5CdFrozenRoster(x.raw,x.roster,x.files,{...ctx.scoped.gate,rosterSha256:x.digest},"T24_WITH_SEPARATE_WITNESS");
  const clock=Date.parse(p.observedDbClockUtc);
  if(!Number.isFinite(clock)||verified.size!==p.packetCount)hold("BAD_CLOCK_OR_T24_PACKET_COUNT");
  for(const entry of verified.values()){
   const permit=entry.permit;
   if(permit.horizon!=="T-24h"||!entry.witnessReview||seen.has(permit.flightInstanceId)||
      preflightP5Stage14ReviewedPermitV39(permit)!==permit.selectedTNativeUtc)
    hold("T24_EXACT_NATIVE_WITNESS_OR_DUPLICATE");
   seen.add(permit.flightInstanceId);
   const cutoff=Date.parse(permit.selectedTNativeUtc)-86400000;
   if(cutoff<=clock+2000){expired++;continue;}
   packets.push({entry,cutoff});
  }
 }
 if(packets.length>384)hold("T24_BOUND");
 packets.sort((a,b)=>a.cutoff-b.cutoff||a.entry.packetSha256.localeCompare(b.entry.packetSha256));
 return {packets,expired};
}
export async function runP6PrivateT24Enrollment(env:NodeJS.ProcessEnv){
 verifyP5CdGithubFrozenCodeLineage(env);
 const ctx=admitP6PrivateT24Enrollment(env),c=new Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000});
 let selection:ReturnType<typeof selectP6T24EnrollmentPackets>,deferredShards=0;
 await c.connect();
 try{
  await c.query("SET ROLE phase6_private_frozen_reader_v39");
  const report=await readP6CurrentT24Routing({client:c,env,purpose:"ENROLLMENT"});
  selection=selectP6T24EnrollmentPackets(report,ctx);deferredShards=report.deferredShards;
 }finally{await c.end();}
 if(!selection.packets.length)return {status:"NO_PROSPECTIVE_CURRENT_SIGNED_T24_PACKETS",newlyRegistered:0,alreadyRegistered:0,
  expiredAtProjection:selection.expired,deferredShards,providerCalls:0,preWrites:0,phase6PaidGo:false};
 const pool=new Pool({connectionString:ctx.scoped.databaseUrl,max:1,connectionTimeoutMillis:8000,statement_timeout:10000,query_timeout:15000});
 try{
  const prepare=makeP5Stage28DedicatedRolePool(pool,{group:"prepare",reviewedDedicatedLogin:"phase5_p30_prepare_login_20261107",forbiddenApplicationLogin:"phase5_runtime_application_login"});
  const conn=await prepare.connect();
  try{
   const result=await executeP6PrivateEnrollmentBatch(conn,selection.packets);
   return {status:"CURRENT_SIGNED_T24_V0091_REGISTRATION_COMPLETE_NO_PRE",...result,expiredAtProjection:selection.expired,deferredShards,providerCalls:0,preWrites:0,phase6PaidGo:false};
  }finally{conn.release();}
 }finally{await pool.end();}
}
if(process.env.P6_PRIVATE_T24_ENROLL_ENTRYPOINT==="1"){
 runP6PrivateT24Enrollment(process.env).then(x=>console.log(JSON.stringify(x))).catch(()=>{
  console.error("HOLD_P6_PRIVATE_T24_ENROLL_REDACTED_STOP_EXACT_RESTART_ONLY");process.exitCode=2;
 });
}
