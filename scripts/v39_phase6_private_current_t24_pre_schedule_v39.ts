/** Dynamic T24 comparator worker: original queue claim, Stage14 PRE and
 * independent V0081 witness writer, then exact private receipt custody.
 * No SOURCE GET, PREPARE role, new queue, new DDL or new reviewer grant.
 * Four lanes maximum, 16 individual original singleton attempts maximum.
 * Explicit STOP-default Phase6 schedule; legacy singleton remains disjoint.
 */
import {Client,Pool} from "pg";
import {requireP5CdGithubCurrentPrivateT24Scope,requireP5CdGithubPreRelease} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import {withP6AuthenticatedCurrentT24Roster} from "../server/lib/disruption/phase6CurrentPrivateT24Scope_v39.mjs";
import {readP6CurrentT24QueuePackets} from "../server/lib/disruption/phase6PrivateT24QueueRouting_v39.mjs";
import {readP6T24ProtectedQueueTrust,readP6T24RoutingClock} from "./v39_phase6_private_t24_restartable_enrollment_v39.mjs";
import {loadP6LaterCalendarWindows,selectP6LaterCalendarDueDays} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
import {verifyP5CdGithubFrozenCodeLineage} from "../server/lib/disruption/phase5CdGithubCodeLineage_v39";
import {verifyP5CdFrozenRoster,type P5CdFrozenRoster,type P5CdFrozenRosterEntry} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
import {requireP5CdT24DispatchEvent,runP5CdOneQueuedT24Witness} from "../server/lib/disruption/phase5CdGithubQueuedT24Witness_v39";
import {waitP5CdGithubSignedDueWindow} from "../server/lib/disruption/phase5CdGithubDbClockLookahead_v39";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {admitP6CommittedT24Custody,openP6CommittedT24Custody} from "./v39_phase6_committed_t24_witness_custody_v39.mjs";
const hold=(s:string):never=>{throw Error("HOLD_P6_CURRENT_T24_WORKER_"+s);};
const opts={allowReviewedT24Witness:true as const};
export function admitP6CurrentT24Worker(env:NodeJS.ProcessEnv){
 const base=requireP5CdGithubCurrentPrivateT24Scope(env),trust=readP6T24ProtectedQueueTrust(env);
 requireP5CdT24DispatchEvent(env);
 if(!/^[0-9]{5,25}$/.test(env.GITHUB_RUN_ID??"")||base.approvedCodeSha!==trust.reviewedCodeSha||
    decodeURIComponent(new URL(env.P6_PRIVATE_READER_DATABASE_URL!).username)!==trust.expectedReaderSessionLogin||
    !/^[1-4]$/.test(env.P6_T24_WORKER_LANES||"1")||!/^[1-4]$/.test(env.P6_T24_WORKER_TICKS_PER_LANE||"1")||
    ((Number(env.P6_T24_WORKER_LANES||"1")>1||Number(env.P6_T24_WORKER_TICKS_PER_LANE||"1")>1)&&env.P6_T24_WORKER_BOUNDED_PARALLEL_APPROVED!=="1"))
  hold("UNREVIEWED_T24_CAPACITY");
 return {base,trust,calendar:loadP6LaterCalendarWindows(env,trust,undefined,"T24"),lanes:Number(env.P6_T24_WORKER_LANES||"1"),ticks:Number(env.P6_T24_WORKER_TICKS_PER_LANE||"1")};
}
type Projection=Awaited<ReturnType<typeof readP6CurrentT24QueuePackets>>["privatePackets"][number];
type Selected={runDayIndex:number;registrySha256:string;packetSha256:string;digest:string;cutoff:number};
/** Priority is individual flight cutoff, not registry ending time. Retain
 * no identifier in the returned public report. Actual claim is still V0092. */
export function selectP6CurrentT24WorkerPackets(report:Awaited<ReturnType<typeof readP6CurrentT24QueuePackets>>,ctx:ReturnType<typeof admitP6CurrentT24Worker>){
 if(report.status!=="CURRENT_SIGNED_T24_QUEUE_PACKET_PROJECTION_NO_GO"||report.purpose!=="PRE_EXECUTION"||
    report.providerCalls!==0||report.databaseWrites!==0||report.queueClaims!==0||report.phase6PaidGo!==false||
    !Array.isArray(report.privatePackets)||report.privatePackets.length!==report.packetCount||report.packetCount>384)
  hold("UNVERIFIED_T24_ROUTING");
 const seen=new Set<string>(),list:Selected[]=[];
 for(const p of report.privatePackets as Projection[]){
  const packets=verifyP5CdFrozenRoster(p.rosterBytes,p.roster as P5CdFrozenRoster,p.files,{...ctx.base,rosterSha256:p.rosterSha256},"T24_WITH_SEPARATE_WITNESS");
  const entry=packets.get(p.entry.packetSha256),f=entry?.permit;
  if(!f||f.horizon!=="T-24h"||!entry?.witnessReview||seen.has(f.flightInstanceId)||
     p.cutoff!==Date.parse(f.selectedTNativeUtc)-86400000)hold("T24_DUPLICATE_OR_WRONG_HORIZON");
  seen.add(f.flightInstanceId);
  list.push({runDayIndex:p.runDayIndex,registrySha256:p.registrySha256,packetSha256:p.entry.packetSha256,digest:p.rosterSha256,cutoff:p.cutoff});
 }
 list.sort((a,b)=>a.cutoff-b.cutoff||a.packetSha256.localeCompare(b.packetSha256));
 return {packets:list.slice(0,ctx.lanes*ctx.ticks),deferred:Math.max(0,list.length-ctx.lanes*ctx.ticks)};
}
export async function runP6CurrentT24Worker(env:NodeJS.ProcessEnv){
 verifyP5CdGithubFrozenCodeLineage(env);
 const ctx=admitP6CurrentT24Worker(env);
 async function read<T>(work:(c:Client)=>Promise<T>){
  const c=new Client({connectionString:env.P6_PRIVATE_READER_DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p6_t24_current_private_reader"});
  await c.connect();
  try{await c.query("SET ROLE phase6_private_frozen_reader_v39");return await work(c);}
  finally{await c.end();}
 }
 const plan=await read(async c=>{
  const due=selectP6LaterCalendarDueDays(ctx.calendar,await readP6T24RoutingClock(c,ctx.trust));
  const report=due.dayIndices.length?await readP6CurrentT24QueuePackets({client:c,trust:ctx.trust,runDayIndices:due.dayIndices,purpose:"PRE_EXECUTION"}):null;
  return {due,report};
 });
 const selection=plan.report?selectP6CurrentT24WorkerPackets(plan.report,ctx):{packets:[] as Selected[],deferred:0};
 const counts={selected:selection.packets.length,committedPreAndWitness:0,privateReceiptReadBack:0,noDue:0,held:0,notStarted:0,deferredPackets:selection.deferred,deferredShards:plan.report?.deferredRegistryCount??0,deferredDays:plan.due.deferredDays};
 if(!selection.packets.length)return {status:"NO_DUE_CURRENT_PRIVATE_T24",...counts,providerCalls:0,phase6PaidGo:false};
 const preRaw=new Pool({connectionString:env.P5_V39_PRE_DATABASE_URL,max:ctx.lanes,connectionTimeoutMillis:8000,idleTimeoutMillis:2000,statement_timeout:15000,application_name:"p6_current_t24_pre"});
 const witnessRaw=new Pool({connectionString:env.P5_V39_T24_WITNESS_DATABASE_URL,max:ctx.lanes,connectionTimeoutMillis:8000,idleTimeoutMillis:2000,statement_timeout:15000,application_name:"p6_current_t24_witness"});
 const pre=makeP5Stage28DedicatedRolePool(preRaw,{group:"pre",reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",forbiddenApplicationLogin:"phase5_runtime_application_login"});
 const witness=makeP5Stage28DedicatedRolePool(witnessRaw,{group:"witness",reviewedDedicatedLogin:"phase5_p30_witness_login_20261107",forbiddenApplicationLogin:"phase5_runtime_application_login"});
 let next=0,stopped=false;
 const auth=<T>(s:Selected,work:(x:{raw:Buffer;roster:P5CdFrozenRoster;files:P5CdFrozenRosterEntry[];digest:string})=>Promise<T>)=>read(c=>
  withP6AuthenticatedCurrentT24Roster({client:c,env,runDayIndex:s.runDayIndex,registrySha256:s.registrySha256,packetSha256:s.packetSha256,expectedDigest:s.digest},work));
 try{
  await Promise.allSettled(Array.from({length:Math.min(ctx.lanes,selection.packets.length)},async()=>{
   for(let tick=0;tick<ctx.ticks&&!stopped&&next<selection.packets.length;tick++){
    const s=selection.packets[next++];
    let custody:Awaited<ReturnType<typeof openP6CommittedT24Custody>>=null;
    try{
     const first=await auth(s,async x=>{
      const packets=verifyP5CdFrozenRoster(x.raw,x.roster,x.files,requireP5CdGithubPreRelease(env,opts),"T24_WITH_SEPARATE_WITNESS");
      const entry=packets.get(s.packetSha256);
      if(!entry?.witnessReview)hold("ACTUAL_T24_WITNESS_NOT_FOUND");
      const port=admitP6CommittedT24Custody(env,entry.permit,entry.witnessReview);
      if(!port)hold("ACTUAL_T24_CUSTODY_REQUIRED");
      custody=await openP6CommittedT24Custody(port);
      if(!custody)hold("CUSTODY_NOT_OPEN");
      return waitP5CdGithubSignedDueWindow(env,pre,packets,undefined,opts);
     });
     if(first.status==="MAX_REVIEWED_LOOKAHEAD_EXHAUSTED")hold("T24_LOOKAHEAD_EXHAUSTED");
     if(first.status!=="DUE_WINDOW"){counts.noDue++;continue;}
     if(stopped){counts.notStarted++;continue;}
     const result=await auth(s,async x=>{
      if(stopped)return null;
      return runP5CdOneQueuedT24Witness(env,{preDb:pre,prePool:pre,witnessPool:witness,rosterBytes:x.raw,roster:x.roster,files:x.files});
     });
     if(!result){counts.notStarted++;continue;}
     if(result.status==="NO_DUE_SIGNED_T24_TASK"){counts.noDue++;continue;}
     if(result.status!=="T24_PRE_V0081_WITNESS_AND_QUEUE_VERIFIED_NOT_SCIENTIFIC_FREEZE")hold("UNKNOWN_PRE_WITNESS_NO_REPLAY");
     counts.committedPreAndWitness++;
     // A valid actual PRE/witness remains counted even if private custody
     // fails. No retry of the original PRE or second transaction.
     const port=custody as Awaited<ReturnType<typeof openP6CommittedT24Custody>>;
     if(!port)hold("CUSTODY_NOT_OPEN_AFTER_ACTUAL_PRE");
     const saved=await port.publish(result);
     if(!saved.privateT24CustodyCommittedAndReadBack)hold("CUSTODY_UNKNOWN_NO_REPLAY");
     counts.privateReceiptReadBack++;
    }catch(e){if(e instanceof Error&&e.message==="HOLD_P6_CURRENT_T24_SCOPE_CUTOFF_ALREADY_PASSED"){counts.noDue++;}else{counts.held++;stopped=true;}}
    finally{await (custody as Awaited<ReturnType<typeof openP6CommittedT24Custody>>)?.close();}
   }
  }));
  counts.notStarted+=selection.packets.length-next;
  return {status:counts.held?"HOLD_CURRENT_PRIVATE_T24_NO_REPLAY":"BOUNDED_CURRENT_PRIVATE_T24_COMPLETE",...counts,providerCalls:0,phase6PaidGo:false};
 }finally{await Promise.allSettled([preRaw.end(),witnessRaw.end()]);}
}
if(process.env.P6_PRIVATE_CURRENT_T24_EXECUTE==="1"){
 runP6CurrentT24Worker(process.env).then(r=>{console.log(JSON.stringify(r));if(r.status==="HOLD_CURRENT_PRIVATE_T24_NO_REPLAY")process.exitCode=2;})
 .catch(()=>{console.error("HOLD_P6_CURRENT_PRIVATE_T24_REDACTED_NO_REPLAY");process.exitCode=2;});
}
