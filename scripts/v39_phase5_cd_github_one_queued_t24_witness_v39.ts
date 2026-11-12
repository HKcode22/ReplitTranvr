/**
 * Manual, one signed future V0091 T24 task → original Stage14 PRE +
 * INDEPENDENT Stage17 V0081 witness. Never a paid/provider dispatch.
 * No new queue, no role installer, no automated T24 cron.
 */
import {readFileSync,lstatSync} from "node:fs";
import {Pool} from "pg";
import {waitP5CdGithubSignedDueWindow}
 from "../server/lib/disruption/phase5CdGithubDbClockLookahead_v39";
import {verifyP5CdFrozenRoster}
 from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
import {preflightP5Stage14ReviewedPermitV39}
 from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {verifyP5T24PreWitnessCrossReview}
 from "../server/lib/disruption/phase5T24PreIndependentWitnessChain_v39";
import {verifyP5CdGithubFrozenCodeLineage}
 from "../server/lib/disruption/phase5CdGithubCodeLineage_v39";
import {
 makeP5Stage28DedicatedRolePool
} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {
 requireP5CdGithubPreRelease
} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import {
 runP5CdOneQueuedT24Witness,requireP5CdT24DispatchEvent
} from "../server/lib/disruption/phase5CdGithubQueuedT24Witness_v39";
import type {P5CdFrozenRoster}
 from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";

const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
function hold(m:string):never{throw Error("REFUSED_P5_CD_QUEUED_T24_MAIN_"+m);}
function bytes(file:string):Buffer{
 if(!FILE.test(file??""))hold("UNREVIEWED_FROZEN_FILE_PATH");
 const st=lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<100||st.size>200_000)
  hold("UNREVIEWED_FROZEN_PACKET_OR_SYMLINK");
 return readFileSync(file);
}
export async function runP5CdOneQueuedT24GithubMain(env:NodeJS.ProcessEnv){
 verifyP5CdGithubFrozenCodeLineage(env);
 const released=requireP5CdGithubPreRelease(env,
  {allowReviewedT24Witness:true});
 requireP5CdT24DispatchEvent(env);
 if(!FILE.test(env.P5_CD_GH_ROSTER_PATH??""))
  hold("SIGNED_T24_SINGLETON_ROSTER_REQUIRED");
 const rosterBytes=bytes(env.P5_CD_GH_ROSTER_PATH!);
 let roster:P5CdFrozenRoster;
 try{roster=JSON.parse(rosterBytes.toString("utf8")) as P5CdFrozenRoster;}
 catch{hold("FROZEN_T24_ROSTER_JSON_MALFORMED");}
 if(!Array.isArray(roster.entries)||roster.entries.length!==1)
  hold("EXACT_ONE_T24_PACKET_PER_MANUAL_TICK");
 const p=roster.entries[0],packetBytes=bytes(p.filePath);
 // Verify the entire immutable packet + independent witness contract
 // before opening either restricted PostgreSQL connection.
 const packets=verifyP5CdFrozenRoster(rosterBytes,roster,[{
  filePath:p.filePath,packetSha256:p.packetSha256,bytes:packetBytes
 }],released,"T24_WITH_SEPARATE_WITNESS");
 if(packets.size!==1)hold("NOT_ONE_INDEPENDENT_T24_PACKET");
 const expected=[...packets.values()][0];
 if(expected.permit.horizon!=="T-24h"||!expected.witnessReview)
  hold("NO_SIGNED_T24_INDEPENDENT_WITNESS");
 verifyP5T24PreWitnessCrossReview(
  expected.permit,expected.witnessReview);
 preflightP5Stage14ReviewedPermitV39(expected.permit);
 const preRaw=new Pool({
  connectionString:env.P5_V39_PRE_DATABASE_URL,
  max:2,connectionTimeoutMillis:8000,idleTimeoutMillis:1400,
  application_name:"p5_cd_t24_queued_pre_only"
 });
 const witnessRaw=new Pool({
  connectionString:env.P5_V39_T24_WITNESS_DATABASE_URL,
  max:2,connectionTimeoutMillis:8000,idleTimeoutMillis:1400,
  application_name:"p5_cd_t24_separate_v0081_witness_only"
 });
 try{
  const pre=makeP5Stage28DedicatedRolePool(preRaw,{
   group:"pre",
   reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  const witness=makeP5Stage28DedicatedRolePool(witnessRaw,{
   group:"witness",
   reviewedDedicatedLogin:"phase5_p30_witness_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  // Schedule may arrive early; use only DB clock and original
  // 180-second cutoff window. V0092 still owns the actual scoped claim.
  const clock=await waitP5CdGithubSignedDueWindow(
   env,pre,packets,undefined,{allowReviewedT24Witness:true});
  if(clock.status==="MAX_REVIEWED_LOOKAHEAD_EXHAUSTED")
   hold("T24_DB_CLOCK_LOOKAHEAD_EXHAUSTED_NO_REPLAY");
  const result=await runP5CdOneQueuedT24Witness(env,{
   preDb:pre,prePool:pre,witnessPool:witness,
   rosterBytes,roster,files:[{
    filePath:p.filePath,packetSha256:p.packetSha256,bytes:packetBytes
   }]
  });
  return{...result,dbClockDueWindow:clock};
 }finally{
  await Promise.all([preRaw.end().catch(()=>{}),
   witnessRaw.end().catch(()=>{})]);
 }
}
if(process.env.P5_CD_GH_QUEUED_T24_EXECUTE==="1"){
 runP5CdOneQueuedT24GithubMain(process.env).then(report=>{
  console.log(JSON.stringify(report,null,2));
  if(report.status!==
    "T24_PRE_V0081_WITNESS_AND_QUEUE_VERIFIED_NOT_SCIENTIFIC_FREEZE"&&
     report.status!=="NO_DUE_SIGNED_T24_TASK"){
   console.error("REFUSED_P5_CD_QUEUED_T24_MAIN_NO_VERIFIED_WITNESS_OR_UNCERTAIN_HOLD");
   process.exitCode=2;
  }
 }).catch(e=>{
  const msg=e instanceof Error?e.message:"";
  console.error(/^REFUSED_P5_CD_[A-Z0-9_]+$/.test(msg)?
   msg:"REFUSED_P5_CD_QUEUED_T24_MAIN_DB_OR_UNKNOWN_COMMIT_NO_RETRY");
  process.exitCode=2;
 });
}
