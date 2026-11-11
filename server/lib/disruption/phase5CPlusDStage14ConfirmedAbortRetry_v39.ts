/**
 * Phase5 C+D: narrowly scoped real-Stage14 SQLSTATE 40001 replay experiment.
 * No production queue, no live worker/cron, no provider GET or paid GO.
 *
 * A retry is considered only after Stage14 emits its special proof that:
 * (1) PostgreSQL returned SQLSTATE 40001 from an INSERT or COMMIT,
 *     definitively aborting the whole transaction, and
 * (2) a separate PostgreSQL ROLLBACK was acknowledged.
 * Before every new attempt, independently SELECT for ANY existing PRE for
 * this canonical flight+horizon and verify queue lease/owner again.
 * Any ambiguous COMMIT, lost rollback, non-40001, late deadline,
 * changed flight identity or unknown row MUST quarantine; no retry.
 *
 * In production the owner/lease/fence must ultimately be checked inside
 * the SAME Stage14 SQL transaction, not solely in this outer test adapter.
 */
import type {Pool} from "pg";
import {persistP5V0079SingleBoundFlightPre,
 P5Stage14ConfirmedPrecommitSerializationAbort,
 P5Stage14ConfirmedCommitSerializationAbort,
 type P5Stage14SingleFlightPrePermit,
 type P5Stage14SingleFlightPreResult}
 from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {reviewP5CPlusDExistingStage14ProofOffline}
 from "./phase5CPlusDStage14ResultBridgeOffline_v39";
import type {P5PreQueueCandidate}
 from "./phase5CPlusDParallelPreProofOfConcept_v39";

const hold=(r:string):never=>{
 throw Error("REFUSED_P5_CD_STAGE14_SAFE_RETRY_"+r);
};
async function readOnlyNoPriorPre(
 readback:Pick<Pool,"connect">,flight:string,horizon:string
):Promise<boolean>{
 const c=await readback.connect();let begun=false;
 try{
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  begun=true;
  await c.query("SET LOCAL statement_timeout='6000ms'");
  const r=await c.query(
   "SELECT id FROM clean.flight_snapshots WHERE "+
   "flight_instance_id=$1 AND horizon=$2 LIMIT 2",[flight,horizon]);
  await c.query("ROLLBACK");begun=false;
  return r.rows.length===0;
 }catch(e){
  if(begun)await c.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{c.release();}
}
export async function persistP5CPlusDStage14WithConfirmedAbortRetry(
 writer:Pick<Pool,"connect">,
 readback:Pick<Pool,"connect">,
 queued:P5PreQueueCandidate,
 permit:P5Stage14SingleFlightPrePermit,
 /** For a future production adapter this check MUST happen at transaction
  * admission in Stage14 as well, not only here. */
 currentLeaseOwned:()=>Promise<boolean>,
 maxVerifiedAbortRetries=6
):Promise<{
 saved:P5Stage14SingleFlightPreResult;
 acknowledgedPrecommitSerializationRetries:number;
 finalLiveQueueLeaseAuthenticatedByThisFunction:false;
 liveDbBenchmark:false;
 phase6PaidGo:false;
}>{
 if(!writer||!readback||
    !queued||!permit||typeof currentLeaseOwned!=="function"||
    !Number.isSafeInteger(maxVerifiedAbortRetries)||
    maxVerifiedAbortRetries<0||maxVerifiedAbortRetries>8||
    queued.handoffState!=="EXTERNALLY_REVIEWED_PENDING"||
    queued.flightInstanceId!==permit.flightInstanceId||
    queued.horizon!==permit.horizon||
    queued.selectedNativeTUtc!==permit.selectedTNativeUtc)
  hold("INVALID_BOUNDED_OWNER_OR_SOURCE_SCOPE");
 let retries=0;
 while(true){
  if(!(await currentLeaseOwned()))hold("STALE_LEASE_OR_STOP_NO_RETRY");
  // From the very first invocation also refuse any already-existing
  // canonical flight/horizon under ANY native schedule revision.
  if(!(await readOnlyNoPriorPre(readback,queued.flightInstanceId,
    queued.horizon)))
   hold("CANONICAL_FLIGHT_HORIZON_ALREADY_HAS_PRE_NO_RETRY");
  try{
   const saved=await persistP5V0079SingleBoundFlightPre(writer,permit);
   reviewP5CPlusDExistingStage14ProofOffline(queued,permit,saved);
   if(!(await currentLeaseOwned()))
    hold("POST_COMMIT_LEASE_LOST_QUARANTINE_NO_RETRY");
   return{
    saved,acknowledgedPrecommitSerializationRetries:retries,
    finalLiveQueueLeaseAuthenticatedByThisFunction:false,
    liveDbBenchmark:false,phase6PaidGo:false
   };
  }catch(e){
   if(!(e instanceof P5Stage14ConfirmedPrecommitSerializationAbort) &&
      !(e instanceof P5Stage14ConfirmedCommitSerializationAbort))
    throw e; // Includes all unknown COMMIT/reconciliation failures.
   if(retries>=maxVerifiedAbortRetries)
    hold("BOUNDED_CONFIRMED_40001_RETRIES_EXHAUSTED");
   // Only the known-aborted SQL transaction gets a fresh attempt.
   retries++;
   const backoffMs=Math.min(400,20*(2**retries))+
    ((queued.flightInstanceId.length*17+
      queued.flightInstanceId.charCodeAt(queued.flightInstanceId.length-1)*
      13+retries*31)%67);
   // No DB lock/session/transaction is held while waiting.
   await new Promise<void>(resolve=>setTimeout(resolve,backoffMs));
  }
 }
}
