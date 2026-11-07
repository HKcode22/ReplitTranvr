/**
 * V0080 staged actual GitHub run-ID PREARM binding. The signed source template
 * cannot know the later GITHUB_RUN_ID. This caller does NOT call a provider,
 * install DB grants, start Phase6, or write PRE. Its single SQL function
 * commits a real run ID BEFORE V0079 permits any physical FIDS GET.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
const HASH=/^[a-f0-9]{64}$/;
const RUN=/^[0-9]{5,25}$/;
function hold(s:string):never{throw Error("REFUSED_P5_V0080_PREARM_"+s);}
export interface P5V0080Context{
  pool:Pick<Pool,"query">;
  manifestSha256:string;
  queryDigestSha256:string;
  githubRunId:string;
  earlyDrawSha256:string;
  rightsReviewSha256:string;
}
export function phase5PrearmDigest(x:Omit<P5V0080Context,"pool">):string{
 return createHash("sha256").update([
  "phase5-v0080",x.manifestSha256,x.queryDigestSha256,
  x.githubRunId,x.earlyDrawSha256,x.rightsReviewSha256
 ].join("|")).digest("hex");
}
export async function prearmP5V0080ActualGitHubRun(
 x:P5V0080Context,
):Promise<{prearmSha256:string;prearmedAtUtc:string;githubRunId:string}>{
 if(!x||!x.pool||typeof x.pool.query!=="function"||
    ![x.manifestSha256,x.queryDigestSha256,x.earlyDrawSha256,
      x.rightsReviewSha256].every(s=>HASH.test(s))||
    !RUN.test(x.githubRunId)||x.githubRunId==="00000")
  hold("INVALID_RELEASE_OR_GITHUB_RUN");
 const sha=phase5PrearmDigest(x);
 // This is the only V0080 mutation, committed by pg's implicit standalone
 // transaction. No physical provider GET should occur until readback passes.
 const result=await x.pool.query(
  "SELECT clean.prearm_phase5_fids_github_query_v39($1,$2,$3,$4,$5,$6) AS prearmed",
  [x.manifestSha256,x.queryDigestSha256,x.githubRunId,
   x.earlyDrawSha256,x.rightsReviewSha256,sha],
 );
 if(result.rowCount!==1||!result.rows[0]?.prearmed)
  hold("DATABASE_PREARM_NOT_COMMITTED");
 const check=await x.pool.query([
  "SELECT prearm_sha256,github_run_id,manifest_sha256,",
  "early_draw_sha256,rights_review_sha256,prearmed_at_utc",
  "FROM clean.phase5_fids_github_prearm_v39",
  "WHERE query_digest=$1 AND manifest_sha256=$2"
 ].join(" "),[x.queryDigestSha256,x.manifestSha256]);
 if(check.rowCount!==1||check.rows[0].prearm_sha256!==sha||
    check.rows[0].github_run_id!==x.githubRunId||
    check.rows[0].manifest_sha256!==x.manifestSha256||
    check.rows[0].early_draw_sha256!==x.earlyDrawSha256||
    check.rows[0].rights_review_sha256!==x.rightsReviewSha256)
  hold("REAL_GITHUB_BINDING_NOT_READ_BACK");
 const actual=check.rows[0].prearmed_at_utc;
 const stamp=actual instanceof Date?actual.toISOString():new Date(String(actual)).toISOString();
 return {prearmSha256:sha,prearmedAtUtc:stamp,githubRunId:x.githubRunId};
}


/**
 * A GitHub job may begin before its signed physical GET time. V0080 prearm is
 * permitted earlier but V0079 MUST NOT reserve until planned_dispatch_utc.
 * Never dispatch early, backdate a GET or silently lose the one-time prearm.
 * Poll the actual database clock rather than assuming GH runner time.
 */
export async function waitForP5ScheduledPhysicalDispatch(
 plannedUtc:string,
 cutoffUtc:string,
 maxResponseAndPersistSeconds:number,
 readDbClock:()=>Promise<Date>,
 sleep:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
):Promise<void>{
 const stamp=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
 if(!stamp.test(plannedUtc)||!stamp.test(cutoffUtc)||
    !Number.isInteger(maxResponseAndPersistSeconds)||
    maxResponseAndPersistSeconds<1||maxResponseAndPersistSeconds>3600)
  hold("UNSIGNED_SCHEDULE_OR_CUTOFF");
 const planned=Date.parse(plannedUtc),cutoff=Date.parse(cutoffUtc);
 if(!Number.isFinite(planned)||!Number.isFinite(cutoff)||cutoff<=planned)
  hold("INVALID_PROSPECTIVE_REQUEST_TIME");
 const maxWaitMs=2*60*60_000;
 for(let poll=0;poll<=1500;poll++){
  const clock=await readDbClock();
  if(!(clock instanceof Date)||!Number.isFinite(clock.getTime()))
   hold("UNTRUSTED_DATABASE_CLOCK");
  const now=clock.getTime();
  if(now>planned+15*60_000||
     now+maxResponseAndPersistSeconds*1000>cutoff)
   hold("MISSED_PROSPECTIVE_DISPATCH_OR_FLIGHT_CUTOFF");
  if(now>=planned)return;
  if(planned-now>maxWaitMs)
   hold("GITHUB_JOB_STARTED_TOO_EARLY");
  await sleep(Math.min(5_000,planned-now));
 }
 hold("SCHEDULE_POLL_LIMIT_HOLD");
}
