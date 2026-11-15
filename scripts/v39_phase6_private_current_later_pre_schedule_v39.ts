/** Bounded automatic C+D current-day PRE runner. No new data provider,
 * enqueue, DDL or key. Original Stage14 claims only exact signed shards.
 * Use actual database clock and protected 31-day policy. Four lanes max;
 * no unattended launch until separately reviewed Phase6 STOP gates open.
 */
import {Client,Pool} from "pg";
import {requireP5CdGithubCurrentPrivatePreScope,requireP5CdGithubPreRelease} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import {assertP6CurrentPrivatePreMode,withP6AuthenticatedCurrentPrivateRoster,readP6UnchangedCurrentPreRoster} from "../server/lib/disruption/phase6CurrentPrivatePreScope_v39.mjs";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39";
import {verifyP5CdGithubFrozenCodeLineage} from "../server/lib/disruption/phase5CdGithubCodeLineage_v39";
import {loadP6LaterCalendarWindows,selectP6LaterCalendarDueDays} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
import {readP6DayEpochRestrictedReaderClock} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {readP6CurrentLaterQueueRosters} from "../server/lib/disruption/phase6PrivateLaterQueueRosterReadOnce_v39.mjs";
import {verifyP5CdFrozenRoster,runP5CdGithubPreTick,type P5CdFrozenRoster} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
import {waitP5CdGithubSignedDueWindow} from "../server/lib/disruption/phase5CdGithubDbClockLookahead_v39";
import {runP5CdGithubStage14Microburst} from "../server/lib/disruption/phase5CdGithubBoundedStage14Microburst_v39";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";

const hold=(s:string):never=>{throw Error("REFUSED_P5_CD_GH_CURRENT_PRE_"+s);};
export function admitP6CurrentPrivateLaterPre(env:NodeJS.ProcessEnv){
 const base=requireP5CdGithubCurrentPrivatePreScope(env);
 const trust=assertP6CurrentPrivatePreMode(env);
 if(!/^[0-9]{5,25}$/.test(env.GITHUB_RUN_ID??"")||
    !/^[1-4]$/.test(env.P5_CD_GH_BURST_TICKS||"1")||
    (Number(env.P5_CD_GH_BURST_TICKS||"1")>1&&env.P5_CD_GH_BURST_APPROVED!=="1"))
  hold("UNREVIEWED_BOUNDED_WORKER_CAPACITY");
 let reader:URL,pre:URL;
 try{reader=new URL(env.P6_PRIVATE_READER_DATABASE_URL!);pre=new URL(env.P5_V39_PRE_DATABASE_URL!);}
 catch{return hold("MISSING_RESTRICTED_DATABASE_URL");}
 if(!sameP6NeonDatabaseEndpoint(reader,pre)||
    decodeURIComponent(reader.username)!==trust.expectedReaderSessionLogin||
    reader.username===pre.username||!reader.password||
    reader.searchParams.getAll("sslmode").length!==1||reader.searchParams.get("sslmode")!=="require"||
    [...reader.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (reader.searchParams.has("channel_binding")&&(reader.searchParams.getAll("channel_binding").length!==1||reader.searchParams.get("channel_binding")!=="require")))
  hold("SEPARATE_RESTRICTED_TLS_READER_REQUIRED");
 const calendar=loadP6LaterCalendarWindows(env,trust);
 return {trust,calendar,readerUrl:env.P6_PRIVATE_READER_DATABASE_URL!,
  policy:{independentLaterQueueTransportProjectionApproved:true,existingPaidDispatchApproved:false,
   independentlyApprovedStandaloneProtocolSha256:base.independentlyApprovedStandaloneProtocolSha256}};
}
type Projection=Awaited<ReturnType<typeof readP6CurrentLaterQueueRosters>>["privateRosters"][number];
type Selector={runDayIndex:number;indexRevision:number;shardIndex:number;indexSha256:string;laterRegistrySha256:string};
const selector=(p:Projection):Selector=>({runDayIndex:p.day,indexRevision:p.revision,shardIndex:p.shard,indexSha256:p.signedIndexSha256,laterRegistrySha256:p.signedLaterRegistrySha256});
function verifiedPackets(p:Projection,env:NodeJS.ProcessEnv){
 const raw=p.privateRosterBytes as Buffer;
 return verifyP5CdFrozenRoster(raw,JSON.parse(raw.toString("utf8")) as P5CdFrozenRoster,p.privateEntries,requireP5CdGithubPreRelease(env));
}
export async function runP6CurrentPrivateLaterPre(env:NodeJS.ProcessEnv){
 verifyP5CdGithubFrozenCodeLineage(env);
 const ctx=admitP6CurrentPrivateLaterPre(env);
 async function read<T>(work:(c:Client)=>Promise<T>){
  const c=new Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000,
   application_name:"phase6_current_later_pre_reader"});
  await c.connect();
  try{await c.query("SET ROLE phase6_private_frozen_reader_v39");return await work(c);}
  finally{await c.end();}
 }
 const planned=await read(async c=>{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  let now:string;
  try{now=await readP6DayEpochRestrictedReaderClock(c,ctx.trust.expectedReaderSessionLogin);}
  finally{await c.query("ROLLBACK");}
  const due=selectP6LaterCalendarDueDays(ctx.calendar,now);
  if(!due.dayIndices.length)return {rosters:[] as Projection[],deferredDays:due.deferredDays,deferredShards:0};
  const z=await readP6CurrentLaterQueueRosters({client:c,trust:ctx.trust,policy:ctx.policy,runDayIndices:due.dayIndices});
  if(z.providerCalls!==0||z.databaseWrites!==0||z.phase6PaidGo!==false||
    z.privateRosters.length>4||z.privateRosters.length!==z.hydratedShardCount)
   hold("UNBOUNDED_OR_UNVERIFIED_ROSTER_SELECTION");
  return {rosters:[...z.privateRosters] as Projection[],deferredDays:due.deferredDays,deferredShards:z.deferredDueShardCount};
 });
 // V0092 exact packet SHA + horizon constraints remain authoritative.
 // Extra cross-day check prevents duplicate signed flight-horizon claims
 // from being processed concurrently in this process.
 const seen=new Set<string>();
 for(const p of planned.rosters){
  for(const row of p.privateEntries){
   const permit=JSON.parse(row.bytes.toString("utf8")).prePermit;
   const key=permit?.flightInstanceId+"|"+permit?.horizon;
   if(!permit||seen.has(key))hold("DUPLICATE_FLIGHT_HORIZON_ACROSS_SELECTED_SHARDS");
   seen.add(key);
  }
 }
 if(!planned.rosters.length)return {status:"NO_DUE_CURRENT_PRIVATE_LATER_SHARDS",claimed:0,verified:0,
  providerCalls:0,phase6PaidGo:false,deferredDays:planned.deferredDays,deferredShards:planned.deferredShards};
 const base=new Pool({connectionString:env.P5_V39_PRE_DATABASE_URL,max:8,connectionTimeoutMillis:8000,
  idleTimeoutMillis:2000,statement_timeout:15000,application_name:"phase6_bounded_current_later_pre"});
 let stopped=false;
 const confirmed=planned.rosters.map(()=>({claimed:0,verified:0,ticks:0}));
 const pre=makeP5Stage28DedicatedRolePool(base,{group:"pre",reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",
  forbiddenApplicationLogin:"phase5_runtime_application_login"});
 try{
  const result=await Promise.allSettled(planned.rosters.map(async(p,i)=>{
   let s=selector(p);
   const originalDigest=p.derivedCompatibilityRosterSha256;
   const authenticated=<T>(work:(projection:Projection)=>Promise<T>)=>read(c=>
    withP6AuthenticatedCurrentPrivateRoster({client:c,env,selector:s,policy:ctx.policy,
     expectedUnchangedRosterDigest:originalDigest},async(x:Projection)=>{
      s=selector(x);return work(x);
    }));
   try{
    // The original DB-clock waiter uses the same real PRE role, not UTC
    // wall clock. Scope expires after lookahead and is freshly re-read.
    const early=await authenticated(x=>waitP5CdGithubSignedDueWindow(env,pre,verifiedPackets(x,env)));
    if(early.status==="MAX_REVIEWED_LOOKAHEAD_EXHAUSTED")hold("LOOKAHEAD_EXHAUSTED");
    if(early.status!=="DUE_WINDOW"||stopped)return {claimed:0,verified:0,hold:false,skipped:true};
    return await authenticated(async x=>{
     if(x.derivedCompatibilityRosterSha256!==p.derivedCompatibilityRosterSha256)hold("ROSTER_CHANGED_BEFORE_CLAIM");
     const packets=verifiedPackets(x,env);
     const report=await runP5CdGithubStage14Microburst(env,async()=>{
      // Other already-started lanes can finish; do not start another tick
      // after any lane observes an uncertain result.
      if(stopped)hold("PEER_LANE_STOPPED");
      // No source shard substitution or stale day revision after lookahead.
      // Same exact bytes may be reauthenticated under an appended index.
      const fresh=await read(c=>readP6UnchangedCurrentPreRoster({client:c,env,selector:s,policy:ctx.policy,
       expectedUnchangedRosterDigest:originalDigest}));
      s=fresh.selector;
      if(stopped)hold("PEER_LANE_STOPPED");
      const z=await runP5CdGithubPreTick(env,{db:pre,pool:pre,packets},{
       owner:"cd-gh-"+env.GITHUB_RUN_ID+"-lane"+(i+1),limit:2,leaseSeconds:120});
      // Preserve confirmed prior tick counts if a later DB read or peer
      // STOP causes this lane's microburst to reject.
      confirmed[i].claimed+=z.claimed;confirmed[i].verified+=z.verified;confirmed[i].ticks++;
      if(z.status==="HOLD_UNSIGNED_OR_UNCERTAIN_SNAPSHOT_NO_REPLAY")stopped=true;
      return z;
     });
     return {claimed:report.claimed,verified:report.verified,hold:report.status==="HOLD_UNSIGNED_OR_UNCERTAIN_SNAPSHOT_NO_REPLAY",skipped:false};
    });
   }catch(e){stopped=true;throw e;}
  }));
  let claimed=0,verified=0,held=0,skipped=0,incompleteLanes=0;
  for(const [i,r] of result.entries()){
   if(r.status==="rejected"){held++;incompleteLanes++;claimed+=confirmed[i].claimed;verified+=confirmed[i].verified;continue;}
   claimed+=r.value.claimed;verified+=r.value.verified;held+=Number(r.value.hold);skipped+=Number(r.value.skipped);
  }
  return {status:held?"HOLD_CURRENT_PRIVATE_LATER_PRE_NO_REPLAY":"BOUNDED_CURRENT_PRIVATE_LATER_PRE_COMPLETE",
   lanes:planned.rosters.length,claimed,verified,held,skipped,incompleteLanes,
   aggregateCountsMayExcludeUnknownCommits:incompleteLanes>0,phase6PaidGoGrantedByWorker:false,deferredDays:planned.deferredDays,
   deferredShards:planned.deferredShards,providerCalls:0,phase6PaidGo:false};
 }finally{await base.end();}
}
if(process.env.P6_PRIVATE_CURRENT_PRE_EXECUTE==="1"){
 try{const r=await runP6CurrentPrivateLaterPre(process.env);console.log(JSON.stringify(r));
  if(r.status==="HOLD_CURRENT_PRIVATE_LATER_PRE_NO_REPLAY")process.exitCode=2;}
 catch(e){console.error("HOLD_P6_CURRENT_PRIVATE_LATER_PRE_REDACTED_NO_REPLAY");process.exitCode=2;}
}
