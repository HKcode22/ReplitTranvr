/**
 * V0091: ONE reviewed frozen T6/T90 flight -> existing V0087 queue.
 * This caller reuses existing Phase5 Stage30 PREPARE login (SET-only),
 * NEVER the PRE or source credential. NO provider GET or paid Alert.
 * Workflow is DISABLED until separate owner-approved exact SHA pins.
 */
import {readFileSync,lstatSync} from "node:fs";
import {Pool} from "pg";
import {makeP5Stage28DedicatedRolePool}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {requireP5CdGithubSourceEnrollRelease}
 from "../server/lib/disruption/phase5CdGithubSourceEnrollGate_v39";
import {
 verifyP5CdOneFrozenSourceEnrollment,
 registerOneP5CdGithubSourceFlightV39
} from "../server/lib/disruption/phase5CdGithubSourceEnrollV0091_v39";
import type {P5CdFrozenRoster,P5CdFrozenRosterEntry}
 from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";

const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const SHA=/^[a-f0-9]{64}$/;
const hold=(s:string):never=>{
 throw Error("REFUSED_P5_CD_GH_V0091_RUNNER_"+s);
};
function readFrozen(path:string):Buffer{
 if(!PATH.test(path??""))hold("NOT_AN_APPROVED_FROZEN_PACKET_PATH");
 const stat=lstatSync(path);
 if(!stat.isFile()||stat.isSymbolicLink()||
    stat.size<100||stat.size>200_000)
  hold("INVALID_OR_SYMLINKED_FROZEN_BYTES");
 return readFileSync(path);
}
export async function runP5CdGithubSingleSourceEnrollment(
 env:NodeJS.ProcessEnv
){
 const gate=requireP5CdGithubSourceEnrollRelease(env);
 if(!PATH.test(env.P5_CD_GH_ROSTER_PATH??"")||
    !SHA.test(env.P5_CD_GH_ENROLL_PACKET_SHA256??""))
  hold("ONE_EXACT_SOURCE_PACKET_NOT_SELECTED");
 const rosterBytes=readFrozen(env.P5_CD_GH_ROSTER_PATH!);
 let roster:P5CdFrozenRoster;
 try{roster=JSON.parse(rosterBytes.toString("utf8")) as P5CdFrozenRoster;}
 catch{hold("REVIEWED_ROSTER_JSON_INVALID");}
 if(!Array.isArray(roster?.entries)||roster.entries.length<1||
    roster.entries.length>96)hold("ROSTER_ENTRIES_UNREVIEWED");
 // Authenticate *every* file in roster, not just selected file.
 const packets:P5CdFrozenRosterEntry[]=roster.entries.map(p=>({
  filePath:p.filePath,packetSha256:p.packetSha256,
  bytes:readFrozen(p.filePath)
 }));
 const verified=verifyP5CdOneFrozenSourceEnrollment(
  gate,rosterBytes,roster,packets);
 if(verified.packetSha256!==gate.packetSha256)
  hold("SELECTED_SOURCE_PACKET_DIGEST_CHANGED");
 // No connection or state-changing SQL until the entire frozen roster,
 // Stage24 receipt digest and ORIGINAL Stage14 native-T permit pass.
 const raw=new Pool({
  connectionString:env.P5_V39_PREPARE_DATABASE_URL,
  max:1,connectionTimeoutMillis:8000,idleTimeoutMillis:2000,
  statement_timeout:15000,
  application_name:"p5_cd_v0091_gh_one_scoped_source_registration"
 });
 try{
  const prepare=makeP5Stage28DedicatedRolePool(raw,{
   group:"prepare",
   reviewedDedicatedLogin:"phase5_p30_prepare_login_20261107",
   forbiddenApplicationLogin:"phase5_p30_pre_login_20261107"
  });
  const result=await registerOneP5CdGithubSourceFlightV39(
   env,prepare,verified);
  return {
   ...result,githubRunId:env.GITHUB_RUN_ID??null,
   databaseRole:"phase5_fids_prepare_prod_20261107",
   stage14PreExecuted:false,
   phase5ScientificFreezePassed:false,
   githubPreWorkerActivated:false
  };
 }finally{
  await raw.end().catch(()=>{});
 }
}
if(process.env.P5_CD_GH_ENROLL_EXECUTE==="1"){
 try{
  console.log(JSON.stringify(
   await runP5CdGithubSingleSourceEnrollment(process.env),null,2));
 }catch(e){
  const m=e instanceof Error&&
   /^REFUSED_P5_CD_[A-Z0-9_]+$/.test(e.message)?
   e.message:"REFUSED_P5_CD_GH_V0091_RUNNER_DB_OR_UNEXPECTED_HOLD_NO_RETRY";
  console.error(m);process.exitCode=2;
 }
}
