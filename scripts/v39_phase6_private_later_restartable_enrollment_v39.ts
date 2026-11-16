/**
 * Current signed day -> private exact native packets -> original V0091
 * via narrow V0100 idempotent wrapper. Separate PREPARE and reader roles.
 * No provider keys, PRE writer credentials, queue claims or public flight
 * data. The compatibility digest is NOT independent approval; the actual
 * independent stored day signature and stable scope are the authority.
 */
import {Client,Pool} from "pg";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39";
import {loadP6LaterCalendarWindows,selectP6LaterCalendarDueDays,isP6CurrentEnrollmentDispatch,loadP6CurrentEnrollmentCalendarWindows} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
import {readP6DayEpochRestrictedReaderClock} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {readP6StableSourceTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {readP6CurrentLaterQueueRosters} from "../server/lib/disruption/phase6PrivateLaterQueueRosterReadOnce_v39.mjs";
import {verifyP5CdGithubFrozenCodeLineage} from "../server/lib/disruption/phase5CdGithubCodeLineage_v39";
import {requireP5CdGithubPreparePrivateDayScope} from "../server/lib/disruption/phase5CdGithubPrepareRegistrationGate_v39";
import {verifyP5CdFrozenRoster,type P5CdFrozenRoster,type P5CdVerifiedTaskPacket} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
import {makeP5CdV0091RegisterArgs,requireP5CdLaterEvidenceForEnrollment} from "./v39_phase5_cd_github_one_source_bound_enqueue_v39";
import {preflightP5Stage14ReviewedPermitV39} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
const hold=(s:string):never=>{throw Error("HOLD_P6_PRIVATE_RESTARTABLE_ENROLL_"+s);};
const SHA=/^[a-f0-9]{64}$/;
const QUERY="SELECT * FROM clean.phase5_cd_ensure_exact_source_flight_v39($1,$2,$3,$4,$5::timestamptz,$6,$7,$8,$9,$10)";
export function admitP6PrivateLaterEnrollment(env:NodeJS.ProcessEnv){
 const scoped=requireP5CdGithubPreparePrivateDayScope(env);
 const currentDispatch=isP6CurrentEnrollmentDispatch(env,"LATER");
 const trust=readP6StableSourceTrust(env);
 if(trust.reviewedCodeSha!==scoped.gate.approvedCodeSha||
    env.P5_CD_GH_PREPARE_EXECUTE==="1"||
    env.P5_CD_GH_REGISTER_HORIZON==="T-24h"||
    env.P6_PRIVATE_PUBLISHER_DATABASE_URL||
    (!currentDispatch&&env.P5_CD_GH_PREPARE_PRIVATE_DAY_CONFIRM!=="REGISTER_CURRENT_SIGNED_LATER_DAY_NO_PROVIDER")||
    env.P6_PRIVATE_T24_RUN_DAYS)
  hold("WRONG_STABLE_PRIVATE_RELEASE_OR_LEGACY_MODE");
 const raw=env.P6_PRIVATE_LATER_RUN_DAYS??"";
 const scheduled=env.GITHUB_EVENT_NAME==="schedule",current=scheduled||currentDispatch;
 if(current?Boolean(raw):!/^(?:[1-9]|[12][0-9]|3[01])(?:,(?:[1-9]|[12][0-9]|3[01]))?$/.test(raw))
  hold("ONE_OR_TWO_EXPLICIT_REVIEWED_RUN_DAYS_OR_SCHEDULE_ONLY");
 const runDayIndices=current?[]:raw.split(",").map(Number);
 const calendar=scheduled?loadP6LaterCalendarWindows(env,trust):currentDispatch?loadP6CurrentEnrollmentCalendarWindows(env,trust):null;
 if(new Set(runDayIndices).size!==runDayIndices.length)hold("DUPLICATE_DAY");
 let u:URL,p:URL;
 try{u=new URL(env.P6_PRIVATE_READER_DATABASE_URL??"");p=new URL(scoped.databaseUrl);}
 catch{return hold("MISSING_DISTINCT_DATABASE_LOGIN");}
 if(!["postgresql:","postgres:"].includes(u.protocol)||
    decodeURIComponent(u.username)!==trust.expectedReaderSessionLogin||
    decodeURIComponent(u.username)===decodeURIComponent(p.username)||
    !u.password||u.pathname!=="/neondb"||u.hash||!sameP6NeonDatabaseEndpoint(u,p)||
    !u.hostname.endsWith(".neon.tech")||(u.port!==""&&u.port!=="5432")||
    u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="require"||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))
  hold("WRONG_SEPARATE_TLS_READER");
 return {scoped,trust,runDayIndices,calendar,readerUrl:env.P6_PRIVATE_READER_DATABASE_URL!,
  policy:{independentLaterQueueTransportProjectionApproved:true,existingPaidDispatchApproved:false,
   independentlyApprovedStandaloneProtocolSha256:scoped.gate.independentlyApprovedStandaloneProtocolSha256}};
}
export function selectP6PrivateEnrollmentPackets(
 report:Awaited<ReturnType<typeof readP6CurrentLaterQueueRosters>>,
 ctx:ReturnType<typeof admitP6PrivateLaterEnrollment>
){
 if(report.status!=="CURRENT_SIGNED_LATER_QUEUE_ROSTERS_READONLY_NO_GO"||
    report.requestedDayCount!==ctx.runDayIndices.length||
    report.providerCalls!==0||report.databaseWrites!==0||report.queueClaims!==0||
    report.tasksEnqueued!==0||report.phase6PaidGo!==false||
    !Array.isArray(report.privateRosters)||report.privateRosters.length!==report.hydratedShardCount||
    report.privateRosters.length>4)
  hold("UNAUTHENTICATED_CURRENT_DAY_REPORT");
 const all=new Map<string,{entry:P5CdVerifiedTaskPacket,cutoff:number}>();
 const ids=new Set<string>(),shards=new Set<string>();
 let alreadyExpired=0;
 for(const r of report.privateRosters){
  if(r.status!=="VERIFIED_PRIVATE_LATER_QUEUE_ROSTER_PROJECTION_NO_GO"||
     !ctx.runDayIndices.includes(r.day)||r.providerCalls!==0||r.databaseWrites!==0||
     r.phase6PaidGo!==false||!SHA.test(r.signedIndexSha256)||
     !SHA.test(r.signedLaterRegistrySha256)||!SHA.test(r.derivedCompatibilityRosterSha256)||
     shards.has(r.day+":"+r.shard)||!Buffer.isBuffer(r.privateRosterBytes))
   hold("BAD_PRIVATE_ROSTER_PROJECTION");
  shards.add(r.day+":"+r.shard);
  const roster=JSON.parse(r.privateRosterBytes.toString("utf8")) as P5CdFrozenRoster;
  const verified=verifyP5CdFrozenRoster(r.privateRosterBytes,roster,r.privateEntries,
   {...ctx.scoped.gate,rosterSha256:r.derivedCompatibilityRosterSha256});
  const clock=Date.parse(r.observedDbClockUtc);
  if(!Number.isFinite(clock)||verified.size!==r.packetCount)hold("BAD_DB_CLOCK_OR_PACKET_COUNT");
  for(const [sha,entry] of verified){
   const p=entry.permit,key=p.flightInstanceId+"|"+p.horizon;
   if(all.has(sha)||ids.has(key)||!["T-6h","T-90m"].includes(p.horizon))
    hold("DUPLICATE_OR_WRONG_HORIZON_IN_SIGNED_DAYS");
   ids.add(key);
   requireP5CdLaterEvidenceForEnrollment(p,ctx.policy.independentlyApprovedStandaloneProtocolSha256);
   if(preflightP5Stage14ReviewedPermitV39(p,ctx.policy.independentlyApprovedStandaloneProtocolSha256)!==p.selectedTNativeUtc)
    hold("NATIVE_T_CHANGED");
   const cutoff=Date.parse(p.selectedTNativeUtc)-(p.horizon==="T-6h"?21600000:5400000);
   if(cutoff<=clock+2000){alreadyExpired++;continue;}
   all.set(sha,{entry,cutoff});
  }
 }
 const ordered=[...all.values()].sort((a,b)=>a.cutoff-b.cutoff||a.entry.packetSha256.localeCompare(b.entry.packetSha256));
 if(ordered.length>384)hold("FOUR_SHARD_PACKET_BOUND");
 // Four existing 96-member shards; do not truncate to the same earliest
 // 96 on every restart and starve the other due shards.
 return {packets:ordered,deferred:0,alreadyExpired};
}
type Queryer={query:(sql:string,args?:unknown[])=>Promise<{rows:any[];rowCount?:number|null}>};
export async function executeP6PrivateEnrollmentBatch(db:Queryer,packets:ReturnType<typeof selectP6PrivateEnrollmentPackets>["packets"]){
 if(packets.length>384)hold("UNBOUNDED_BATCH");
 const start=performance.now();let added=0,existing=0,expired=0,processed=0;
 for(const {entry,cutoff} of packets){
  // A clean time bound is an ordinary deferred suffix, not an ambiguous
  // commit. Unknown SQL results still throw and halt immediately.
  if(performance.now()-start>=120000)break;
  processed++;
  const r=await db.query("SELECT clock_timestamp() AS now");
  const now=new Date(r.rows[0]?.now).getTime();
  if(r.rows.length!==1||!Number.isFinite(now))hold("MISSING_DATABASE_CLOCK");
  if(now+2000>=cutoff){expired++;continue;}
  // One autocommit SQL function call; unknown ACK stops immediately.
  // A later exact restart is safe because V0100 checks every stored binding.
  const q=await db.query(QUERY,makeP5CdV0091RegisterArgs(entry.permit,entry.packetSha256));
  const x=q.rows[0];
  if(q.rowCount!==1||!x||!/^\d{1,19}$/.test(String(x.task_id))||
     String(x.task_id)==="0"||typeof x.newly_registered!=="boolean")
   hold("UNKNOWN_REGISTRATION_ACK_STOP_EXACT_RESTART_ONLY");
  if(x.newly_registered)added++;else existing++;
 }
 return {newlyRegistered:added,alreadyRegistered:existing,expiredBeforeEnrollment:expired,timeBoundDeferred:packets.length-processed};
}
export async function runP6PrivateLaterEnrollment(env:NodeJS.ProcessEnv){
 verifyP5CdGithubFrozenCodeLineage(env);
 const ctx=admitP6PrivateLaterEnrollment(env);
 const c=new Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000});
 await c.connect();
 let selected:ReturnType<typeof selectP6PrivateEnrollmentPackets>;
 try{
  await c.query("SET ROLE phase6_private_frozen_reader_v39");
  if(ctx.calendar){
   await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
   let at:string;
   try{at=await readP6DayEpochRestrictedReaderClock(c,ctx.trust.expectedReaderSessionLogin);}
   finally{await c.query("ROLLBACK");}
   const due=selectP6LaterCalendarDueDays(ctx.calendar,at);
   ctx.runDayIndices=due.dayIndices;
   if(!ctx.runDayIndices.length)return {status:"NO_DUE_REVIEWED_CALENDAR_DAYS",providerCalls:0,preWrites:0,phase6PaidGo:false};
   console.log(JSON.stringify({selectedStudyDays:due.dayIndices.length,deferredStudyDays:due.deferredDays}));
  }
  const report=await readP6CurrentLaterQueueRosters({client:c,trust:ctx.trust,policy:ctx.policy,runDayIndices:ctx.runDayIndices});
  selected=selectP6PrivateEnrollmentPackets(report,ctx);
 }finally{await c.end();}
 if(!selected.packets.length)return {status:"NO_PROSPECTIVE_CURRENT_SIGNED_LATER_PACKETS",newlyRegistered:0,
  alreadyRegistered:0,expiredBeforeEnrollment:selected.alreadyExpired,providerCalls:0,preWrites:0,phase6PaidGo:false};
 const pool=new Pool({connectionString:ctx.scoped.databaseUrl,max:1,connectionTimeoutMillis:8000,statement_timeout:10000,query_timeout:15000});
 try{
  const pre=makeP5Stage28DedicatedRolePool(pool,{group:"prepare",reviewedDedicatedLogin:"phase5_p30_prepare_login_20261107",forbiddenApplicationLogin:"phase5_runtime_application_login"});
  const conn=await pre.connect();
  try{
   const result=await executeP6PrivateEnrollmentBatch(conn,selected.packets);
   return {status:"CURRENT_SIGNED_LATER_V0091_REGISTRATION_COMPLETE_NO_PRE",
    ...result,expiredAtProjection:selected.alreadyExpired,deferredPackets:selected.deferred,
    providerCalls:0,preWrites:0,phase6PaidGo:false};
  }finally{conn.release();}
 }finally{await pool.end();}
}
if(process.env.P6_PRIVATE_LATER_ENROLL_ENTRYPOINT==="1"){
 runP6PrivateLaterEnrollment(process.env).then(x=>console.log(JSON.stringify(x))).catch(()=>{
  console.error("HOLD_P6_PRIVATE_LATER_ENROLL_REDACTED_STOP_EXACT_RESTART_ONLY");process.exitCode=2;
 });
}
