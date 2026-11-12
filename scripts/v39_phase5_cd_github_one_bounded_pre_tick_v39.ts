/**
 * ONE short GitHub-only C+D PRE controller tick. Disabled by default.
 * Reuse existing Stage30 PRE_LOGIN, Stage28 SET-only adapter,
 * immutable V0087 queue, V0088/89 SQL guard, V0090 role commission
 * and ORIGINAL Stage14 writer. No source GET, POST/Alert, new queue
 * registration, or paid action. Genuine signed roster is required.
 */
import {readFileSync,lstatSync} from "node:fs";
import {Pool} from "pg";
import {
 makeP5Stage28DedicatedRolePool
} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {
 requireP5CdGithubPreRelease
} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import {
 verifyP5CdFrozenRoster,runP5CdGithubPreTick,
 type P5CdFrozenRoster,type P5CdFrozenRosterEntry
} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";

const ROSTER=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const MAX=200_000;
const fail=(s:string):never=>{throw Error("REFUSED_P5_CD_GH_PRE_RUNNER_"+s);};
function bytes(path:string):Buffer{
 if(!FILE.test(path??""))fail("FROZEN_REPO_PACKET_PATH_INVALID");
 const stat=lstatSync(path);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<100||stat.size>MAX)
  fail("UNREVIEWED_FROZEN_PACKET_BYTES_OR_SYMLINK");
 return readFileSync(path);
}
export async function runP5CdGithubPreController(
 env:NodeJS.ProcessEnv
){
 const gate=requireP5CdGithubPreRelease(env);
 if(!ROSTER.test(env.P5_CD_GH_ROSTER_PATH??"")||
    !/^[0-9]{5,25}$/.test(env.GITHUB_RUN_ID??""))
  fail("ROSTER_PATH_OR_GH_RUN_ID_NOT_FROZEN");
 const rosterBytes=bytes(env.P5_CD_GH_ROSTER_PATH!);
 let roster:P5CdFrozenRoster;
 try{roster=JSON.parse(rosterBytes.toString("utf8")) as P5CdFrozenRoster;}
 catch{fail("ROSTER_JSON_NOT_VALID");}
 const entries:P5CdFrozenRosterEntry[]=(roster.entries??[]).map(x=>({
  filePath:x.filePath,packetSha256:x.packetSha256,bytes:bytes(x.filePath)
 }));
 // ALL signed packets verified BEFORE any session is opened or queue
 // is claimed; no source, weather or provider API call.
 const packets=verifyP5CdFrozenRoster(rosterBytes,roster,entries,gate);
 const base=new Pool({
  connectionString:env.P5_V39_PRE_DATABASE_URL,
  max:3,connectionTimeoutMillis:8000,idleTimeoutMillis:2000,
  statement_timeout:15000,
  application_name:"phase5_cd_gh_one_bounded_pre_tick"
 });
 try{
  const pre=makeP5Stage28DedicatedRolePool(base,{
   group:"pre",
   reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  const report=await runP5CdGithubPreTick(env,{
   db:pre,pool:pre,packets
  },{
   owner:"cd-gh-"+env.GITHUB_RUN_ID,limit:2,leaseSeconds:120
  });
  return{
   ...report,
   githubRunId:env.GITHUB_RUN_ID,
   signedRosterVerified:true,
   immutableExistingDatabaseQueue:true,
   noNewTaskEnrollment:true
  };
 }finally{
  await base.end().catch(()=>{});
 }
}
if(process.env.P5_CD_GH_PRE_EXECUTE==="1"){
 try{
  console.log(JSON.stringify(
   await runP5CdGithubPreController(process.env),null,2));
 }catch(e){
  const message=e instanceof Error&&
   /^REFUSED_P5_CD_[A-Z0-9_]+$/.test(e.message)?
   e.message:"REFUSED_P5_CD_GH_PRE_RUNNER_DB_OR_UNEXPECTED_HOLD";
  console.error(message);
  process.exitCode=2;
 }
}
