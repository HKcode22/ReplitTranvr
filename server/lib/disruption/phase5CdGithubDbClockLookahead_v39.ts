/**
 * Phase5 C+D: GitHub 5-minute cron is NOT a deadline guarantee.
 * Start up to 8 minutes before a reviewed native-T horizon cutoff,
 * read the REAL PostgreSQL clock using the ALREADY restricted Stage30 PRE
 * session, wait briefly, and only then invoke the EXISTING V0087 claim.
 *
 * No queue rows read/inserted/changed here; no provider/HTTP/Alert.
 * A source packet may be stale or not registered: V0087 claim + Stage14
 * independently own eligibility and correctness. No backfill or shifted T.
 *
 * This is a small-canary capacity improvement, NOT proof that GitHub cron
 * always fires in time. No DB session timer is promised after job cancels.
 */
import type {P5CdTaskExecutor} from "./phase5CdDurableQueueClient_v39";
import type {P5CdVerifiedTaskPacket}
 from "./phase5CdGithubBoundedPreTick_v39";
import {requireP5CdGithubPreRelease}
 from "./phase5CdGithubPreReleaseGate_v39";

const WINDOW_MS=180_000,SAFETY_MS=2_000,LOOKAHEAD_MS=480_000;
const OFFSETS={"T-24h":86_400_000,"T-6h":21_600_000,"T-90m":5_400_000};
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
function stop(m:string):never{throw Error("REFUSED_P5_CD_GH_EARLY_PRE_"+m);}
function exactMs(value:unknown):number{
 const ms=typeof value==="string"?Date.parse(value):NaN;
 if(typeof value!=="string"||!ISO.test(value)||
    !Number.isFinite(ms)||new Date(ms).toISOString()!==value)
  stop("FROZEN_NATIVE_T_OR_DB_CLOCK_NOT_CANONICAL");
 return ms;
}
export interface P5CdDueWaitDecision{
 status:"DUE_WINDOW"|"WAIT_FOR_SIGNED_CUTOFF"|"NO_NEAR_SIGNED_CUTOFF";
 waitMs:number;
 eligibleSignedCutoffs:number;
}
/** Pure: a signed packet is a SCHEDULING HINT, not evidence of a queued task. */
export function decideP5CdUpcomingDueWindow(
 nowUtc:string,packets:Map<string,P5CdVerifiedTaskPacket>
):P5CdDueWaitDecision{
 const now=exactMs(nowUtc);
 if(!(packets instanceof Map)||packets.size<1||packets.size>96)
  stop("BOUNDED_REVIEWED_PACKET_ROSTER_REQUIRED");
 let nearest=Infinity;
 let eligibleSignedCutoffs=0;
 for(const x of packets.values()){
  const p=x?.permit;
  if(!p||!["T-6h","T-90m"].includes(p.horizon))
   stop("T24_OR_STANDALONE_WITNESS_REQUIRES_OTHER_WORKFLOW");
  const native=exactMs(p.selectedTNativeUtc);
  const cutoff=native-OFFSETS[p.horizon as "T-6h"|"T-90m"];
  if(!Number.isFinite(cutoff))stop("INVALID_NATIVE_T_CUTOFF");
  if(cutoff<=now+SAFETY_MS)continue;
  const left=cutoff-now;
  if(left<=WINDOW_MS){
   return{status:"DUE_WINDOW",waitMs:0,
    eligibleSignedCutoffs:eligibleSignedCutoffs+1};
  }
  if(left<=WINDOW_MS+LOOKAHEAD_MS){
   nearest=Math.min(nearest,left-WINDOW_MS);
   eligibleSignedCutoffs++;
  }
 }
 if(Number.isFinite(nearest))
  return{status:"WAIT_FOR_SIGNED_CUTOFF",
   waitMs:Math.max(0,Math.ceil(nearest)),eligibleSignedCutoffs};
 return{status:"NO_NEAR_SIGNED_CUTOFF",waitMs:0,eligibleSignedCutoffs:0};
}
export interface P5CdDueWaitReport{
 schema:"v39.phase5.gh-cd-dbclock-lookahead-no-provider.v1";
 status:"DUE_WINDOW"|"NO_NEAR_SIGNED_CUTOFF"|
  "MAX_REVIEWED_LOOKAHEAD_EXHAUSTED";
 dbClockPolls:number;
 waitedMs:number;
 paidProviderCalls:0;
 tasksClaimedByWaiter:0;
 tasksEnqueuedByWaiter:0;
 noDeadlineAccuracyGuaranteed:true;
}
/** This function must be called after frozen-roster and exact GH code-lineage
 * verification. Connection is an existing SET-only restricted PRE identity.
 * Revalidate release gate before every poll, using current process inputs.
 * External GitHub secret changes do not retroactively change an ACTIVE job:
 * owner must cancel the run separately if revoking during its life.
 */
export async function waitP5CdGithubSignedDueWindow(
 env:NodeJS.ProcessEnv,
 db:Pick<P5CdTaskExecutor,"query">,
 packets:Map<string,P5CdVerifiedTaskPacket>,
 sleep:(ms:number)=>Promise<void>=
  ms=>new Promise(resolve=>setTimeout(resolve,ms))
):Promise<P5CdDueWaitReport>{
 requireP5CdGithubPreRelease(env);
 if(!db||typeof db.query!=="function"||typeof sleep!=="function")
  stop("MISSING_RESTRICTED_PRE_DB_CLOCK_READER");
 let first=NaN,last=NaN,polls=0,waitedMs=0;
 // 8-minute maximum; little 5-second sleeps avoid monopolizing runners.
 for(let i=0;i<=105;i++){
  requireP5CdGithubPreRelease(env);
  const row=(await db.query(
   "SELECT clock_timestamp() AS now_utc,current_user AS role"
  )).rows[0];
  if(row?.role!=="phase5_fids_pre_writer_prod_20261107")
   stop("NOT_EXISTING_STAGE30_SET_ONLY_PRE_ROLE");
  const now=row?.now_utc instanceof Date?
    row.now_utc.toISOString():row?.now_utc;
  const ms=exactMs(now);
  polls++;
  if(Number.isFinite(last)&&ms<last)stop("DATABASE_CLOCK_MOVED_BACKWARD");
  last=ms;
  if(!Number.isFinite(first))first=ms;
  if(ms-first>LOOKAHEAD_MS)
   return{schema:"v39.phase5.gh-cd-dbclock-lookahead-no-provider.v1",
    status:"MAX_REVIEWED_LOOKAHEAD_EXHAUSTED",
    dbClockPolls:polls,waitedMs,
    paidProviderCalls:0,tasksClaimedByWaiter:0,tasksEnqueuedByWaiter:0,
    noDeadlineAccuracyGuaranteed:true};
  const decision=decideP5CdUpcomingDueWindow(now,packets);
  if(decision.status!=="WAIT_FOR_SIGNED_CUTOFF")
   return{schema:"v39.phase5.gh-cd-dbclock-lookahead-no-provider.v1",
    status:decision.status,
    dbClockPolls:polls,waitedMs,
    paidProviderCalls:0,tasksClaimedByWaiter:0,tasksEnqueuedByWaiter:0,
    noDeadlineAccuracyGuaranteed:true};
  const remaining=LOOKAHEAD_MS-(ms-first);
  const delay=Math.min(5_000,remaining,decision.waitMs);
  if(delay<=0)
   return{schema:"v39.phase5.gh-cd-dbclock-lookahead-no-provider.v1",
    status:"MAX_REVIEWED_LOOKAHEAD_EXHAUSTED",
    dbClockPolls:polls,waitedMs,
    paidProviderCalls:0,tasksClaimedByWaiter:0,tasksEnqueuedByWaiter:0,
    noDeadlineAccuracyGuaranteed:true};
  await sleep(delay);
  waitedMs+=delay;
 }
 return{schema:"v39.phase5.gh-cd-dbclock-lookahead-no-provider.v1",
  status:"MAX_REVIEWED_LOOKAHEAD_EXHAUSTED",
  dbClockPolls:polls,waitedMs,
  paidProviderCalls:0,tasksClaimedByWaiter:0,tasksEnqueuedByWaiter:0,
  noDeadlineAccuracyGuaranteed:true};
}
