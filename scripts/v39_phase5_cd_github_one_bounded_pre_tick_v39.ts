/**
 * ONE short GitHub-only C+D PRE controller tick. Disabled by default.
 * Reuse existing Stage30 PRE_LOGIN, Stage28 SET-only adapter,
 * immutable V0087 queue, V0088/89 SQL guard, V0090 role commission
 * and ORIGINAL Stage14 writer. No source GET, POST/Alert, new queue
 * registration, or paid action. Genuine signed roster is required.
 */
import {readFileSync,lstatSync} from "node:fs";
import {Client,Pool} from "pg";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39";
import {readP6PrivateLaterQueueRoster} from "../server/lib/disruption/phase6PrivateLaterQueueRosterReadOnce_v39.mjs";
import {readP6StableSourceTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {verifyP5CdGithubFrozenCodeLineage} from "../server/lib/disruption/phase5CdGithubCodeLineage_v39";
import {waitP5CdGithubSignedDueWindow}
 from "../server/lib/disruption/phase5CdGithubDbClockLookahead_v39";
import {
 makeP5Stage28DedicatedRolePool
} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {
 requireP5CdGithubPreRelease
} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import {runP5CdGithubStage14Microburst}
 from "../server/lib/disruption/phase5CdGithubBoundedStage14Microburst_v39";
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
/** Private exact-shard execution is an explicit alternative to checkout data.
 * The independent protected compatibility roster pin remains mandatory.
 * The day-index signature and underlying native packet bytes are rechecked;
 * the original later reviewer wire is not stored/reverified by #703.
 */
export function admitP5PrivateLaterWorker(env:NodeJS.ProcessEnv){
 const gate=requireP5CdGithubPreRelease(env);
 if(env.P5_CD_GH_PRIVATE_LATER_MODE!=="PRIVATE_EXACT_SHARD"||
    env.P5_CD_GH_PRIVATE_LATER_APPROVED!=="1"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    (env.P5_CD_GH_PRE_ROSTER_PATH||env.P5_CD_GH_ROSTER_PATH)||
    (env.P5_CD_GH_BURST_TICKS||"1")!=="1"||
    env.GITHUB_SHA!==gate.approvedCodeSha||env.RAPIDAPI_KEY)
  fail("PRIVATE_EXACT_SHARD_RELEASE_REQUIRED");
 const number=(v:string|undefined,max:number)=>{
  if(!/^[1-9][0-9]{0,5}$/.test(v??"")||Number(v)>max)
   return fail("INVALID_PRIVATE_SHARD_SELECTOR");
  return Number(v);
 };
 const selector={runDayIndex:number(env.P5_CD_GH_PRIVATE_DAY,31),
  indexRevision:number(env.P5_CD_GH_PRIVATE_REVISION,1024),
  shardIndex:number(env.P5_CD_GH_PRIVATE_SHARD,100000),
  indexSha256:env.P5_CD_GH_PRIVATE_INDEX_SHA??"",
  laterRegistrySha256:env.P5_CD_GH_PRIVATE_REGISTRY_SHA??""};
 if(![selector.indexSha256,selector.laterRegistrySha256].every(x=>/^[0-9a-f]{64}$/.test(x)))
  fail("INVALID_PRIVATE_SHARD_SELECTOR");
 const trust=readP6StableSourceTrust(env);
 let reader:URL,pre:URL;
 try{reader=new URL(env.P6_PRIVATE_READER_DATABASE_URL??"");
  pre=new URL(env.P5_V39_PRE_DATABASE_URL??"");}
 catch{return fail("PRIVATE_READER_URL_MISSING");}
 if(!["postgres:","postgresql:"].includes(reader.protocol)||
    decodeURIComponent(reader.username)!==trust.expectedReaderSessionLogin||
    decodeURIComponent(reader.username)===decodeURIComponent(pre.username)||
    !reader.password||reader.pathname!=="/neondb"||reader.hash||
    !reader.hostname.endsWith(".neon.tech")||!sameP6NeonDatabaseEndpoint(reader,pre)||
    reader.searchParams.getAll("sslmode").length!==1||
    reader.searchParams.get("sslmode")!=="require"||
    [...reader.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (reader.searchParams.has("channel_binding")&&
     (reader.searchParams.getAll("channel_binding").length!==1||
      reader.searchParams.get("channel_binding")!=="require")))
  fail("PRIVATE_READER_MUST_BE_SEPARATE_RESTRICTED_TLS_LOGIN");
 return {selector,trust,gate,readerUrl:env.P6_PRIVATE_READER_DATABASE_URL!,
  policy:{independentLaterQueueTransportProjectionApproved:true,
   existingPaidDispatchApproved:false,
   independentlyApprovedStandaloneProtocolSha256:gate.independentlyApprovedStandaloneProtocolSha256}};
}
export function bindP5PrivateProjectionToWorker(
 projection:Awaited<ReturnType<typeof readP6PrivateLaterQueueRoster>>,
 ctx:ReturnType<typeof admitP5PrivateLaterWorker>
){
 const s=ctx.selector;
 if(projection.status!=="VERIFIED_PRIVATE_LATER_QUEUE_ROSTER_PROJECTION_NO_GO"||
    projection.day!==s.runDayIndex||projection.revision!==s.indexRevision||
    projection.shard!==s.shardIndex||projection.signedIndexSha256!==s.indexSha256||
    projection.signedLaterRegistrySha256!==s.laterRegistrySha256||
    projection.derivedCompatibilityRosterSha256!==ctx.gate.rosterSha256||
    projection.providerCalls!==0||projection.databaseWrites!==0||
    projection.phase6PaidGo!==false)
  fail("PRIVATE_PROJECTION_NOT_MATCHED_TO_PROTECTED_ROSTER_PIN");
 const raw:Buffer=projection.privateRosterBytes;
 const roster=JSON.parse(raw.toString("utf8")) as P5CdFrozenRoster;
 return verifyP5CdFrozenRoster(raw,roster,projection.privateEntries,ctx.gate);
}
async function loadPrivatePackets(env:NodeJS.ProcessEnv){
 const ctx=admitP5PrivateLaterWorker(env);
 const c=new Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,
  query_timeout:20000,application_name:"phase6_private_later_pre_readonly"});
 await c.connect();
 try{
  await c.query("SET ROLE phase6_private_frozen_reader_v39");
  const projection=await readP6PrivateLaterQueueRoster({client:c,trust:ctx.trust,
   selector:ctx.selector,policy:ctx.policy});
  return bindP5PrivateProjectionToWorker(projection,ctx);
 }finally{await c.end();}
}
/** Canonical workflow env is P5_CD_GH_PRE_ROSTER_PATH.
 * Accept legacy direct caller alias only when it cannot conflict. */
export function readP5CdCheckoutRosterPath(env:NodeJS.ProcessEnv){
 const primary=env.P5_CD_GH_PRE_ROSTER_PATH,legacy=env.P5_CD_GH_ROSTER_PATH;
 if(primary&&legacy&&primary!==legacy)fail("CONFLICTING_LEGACY_ROSTER_PATH");
 const p=primary||legacy||"";
 if(!ROSTER.test(p))fail("ROSTER_PATH_OR_GH_RUN_ID_NOT_FROZEN");
 return p;
}
export async function runP5CdGithubPreController(env:NodeJS.ProcessEnv){
 verifyP5CdGithubFrozenCodeLineage(env);
 const gate=requireP5CdGithubPreRelease(env);
 if(!/^[0-9]{5,25}$/.test(env.GITHUB_RUN_ID??""))
  fail("ROSTER_PATH_OR_GH_RUN_ID_NOT_FROZEN");
 const mode=env.P5_CD_GH_PRIVATE_LATER_MODE||"CHECKOUT";
 if(!["CHECKOUT","PRIVATE_EXACT_SHARD"].includes(mode))
  fail("UNKNOWN_PRE_TRANSPORT_MODE");
 const privateMode=mode==="PRIVATE_EXACT_SHARD";
 let packets:ReturnType<typeof verifyP5CdFrozenRoster>;
 if(privateMode)packets=await loadPrivatePackets(env);
 else{
  if(env.P6_PRIVATE_READER_DATABASE_URL||env.P5_CD_GH_PRIVATE_DAY||
     env.P5_CD_GH_PRIVATE_REVISION||env.P5_CD_GH_PRIVATE_SHARD||
     env.P5_CD_GH_PRIVATE_INDEX_SHA||env.P5_CD_GH_PRIVATE_REGISTRY_SHA||
     env.P5_CD_GH_PRIVATE_LATER_APPROVED==="1")
   fail("ROSTER_PATH_OR_GH_RUN_ID_NOT_FROZEN");
  const rosterBytes=bytes(readP5CdCheckoutRosterPath(env));
  const roster=JSON.parse(rosterBytes.toString("utf8")) as P5CdFrozenRoster;
  const entries:P5CdFrozenRosterEntry[]=(roster.entries??[]).map(x=>({
   filePath:x.filePath,packetSha256:x.packetSha256,bytes:bytes(x.filePath)
  }));
  packets=verifyP5CdFrozenRoster(rosterBytes,roster,entries,gate);
 }
 // Native packet scope is verified before opening the PRE writer session.
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
  // GitHub 5-minute cron can miss a 3-minute PRE window. Start early
  // from the reviewed frozen native T, then check the restricted real
  // PostgreSQL clock BEFORE claiming, never claim or write early.
  const early=await waitP5CdGithubSignedDueWindow(env,pre,packets);
  // The opt-in capacity wrapper REUSES the original per-flight Stage14
  // V0092 claim -> WRITE_STARTED -> postcommit readback -> ACK. Default is
  // exactly one existing two-task tick; no additional SQL privileges.
  // The signed day revision and retention validity may change while waiting.
  // Re-read exact current shard through the private reader immediately before
  // invoking the original worker. The independent roster pin must still match.
  if(privateMode)packets=await loadPrivatePackets(env);
  const report=await runP5CdGithubStage14Microburst(env,()=>
   runP5CdGithubPreTick(env,{
    db:pre,pool:pre,packets
   },{
    owner:"cd-gh-"+env.GITHUB_RUN_ID,limit:2,leaseSeconds:120
   })
  );
  return{
   ...report,
   earlyDbClockDueWindow:early,
   githubRunId:env.GITHUB_RUN_ID,
   signedRosterVerified:true,
   privateExactShardTransport:privateMode,
   immutableExistingDatabaseQueue:true,
   noNewTaskEnrollment:true
  };
 }finally{
  await base.end().catch(()=>{});
 }
}
if(process.env.P5_CD_GH_PRE_EXECUTE==="1"){
 try{
  const result=await runP5CdGithubPreController(process.env);
  console.log(JSON.stringify(result,null,2));
  if(result.earlyDbClockDueWindow.status==="MAX_REVIEWED_LOOKAHEAD_EXHAUSTED"){
   console.error("REFUSED_P5_CD_GH_PRE_RUNNER_LOOKAHEAD_BUDGET_EXHAUSTED");
   process.exitCode=2;
  }
  if(result.status==="HOLD_UNSIGNED_OR_UNCERTAIN_SNAPSHOT_NO_REPLAY"){
   console.error("REFUSED_P5_CD_GH_PRE_RUNNER_UNCERTAIN_OR_UNSIGNED_TASK_HOLD");
   process.exitCode=2;
  }
 }catch(e){
  const message=e instanceof Error&&
   /^REFUSED_P5_CD_[A-Z0-9_]+$/.test(e.message)?
   e.message:"REFUSED_P5_CD_GH_PRE_RUNNER_DB_OR_UNEXPECTED_HOLD";
  console.error(message);
  process.exitCode=2;
 }
}
