/**
 * Phase3/Gate3 LOGGED failure receipt transaction owner (DRAFT / no provider).
 *
 * A recorded FAILED receipt is useful for crash recovery only if COMMIT is
 * acknowledged. Never report durability from a successful UPDATE alone.
 *
 * IMPORTANT: an ambiguous COMMIT is a HOLD; NEVER retry by creating another
 * canary or guessing transaction outcome. Independently read the same LOGGED
 * session under operator control. Even a committed FAILED receipt proves
 * neither owned provider DELETE nor paid credit settlement.
 *
 * This module does not accept a callback to create/delete subscriptions,
 * import the provider SDK, read provider balances, or approve another run.
 */
import type {Pool,PoolClient} from "pg";
import {
  recordGate3CanaryFailureV39,
  type Gate3FailureReceiptInputV39,
} from "./gate3CanaryFailureReceipt_v39";

export type Gate3CommittedFailureV39 = Readonly<{
  schema:"v39.phase3.gate3.failure-commit.v1";
  disposition:"DURABLY_FAILED"|"DURABLY_ALREADY_IDENTICAL_FAILED";
  sessionId:string;
  failureCode:Gate3FailureReceiptInputV39["failureCode"];
  safeEvidenceSha256:string;
  committed:true;
  authorizesAnotherRun:false;
  confirmsProviderSubscriptionDeleted:false;
  confirmsAccountSettled:false;
  providerCalls:0;
}>;

/**
 * Uses an exclusive checked-out connection. No transaction is assumed active.
 * There is precisely ONE BEGIN and ONE COMMIT attempt, no SQL/provider retry.
 *
 * If COMMIT throws, the database may already have committed; release the
 * connection and fail with an explicit UNKNOWN receipt. Caller must perform
 * a separate read-only verification before any subsequent paid action.
 */
export async function commitGate3CanaryFailureV39(
  pool:Pick<Pool,"connect">,
  input:Gate3FailureReceiptInputV39,
):Promise<Gate3CommittedFailureV39>{
  if(!pool||typeof pool.connect!=="function")
    throw Error("GATE3_FAILED_COMMIT_POOL_REQUIRED");
  let client:PoolClient;
  try{client=await pool.connect();}
  catch{throw Error("GATE3_FAILED_COMMIT_CONNECT_FAILED_HOLD");}

  let began=false;
  let commitAttempted=false;
  try{
    // recordGate3CanaryFailureV39 validates exact UUID/auth/scope/failure
    // before issuing SELECT ... FOR UPDATE or UPDATE.
    await client.query("BEGIN");
    began=true;
    const receipt=await recordGate3CanaryFailureV39(client,input);
    commitAttempted=true;
    await client.query("COMMIT");
    return {
      schema:"v39.phase3.gate3.failure-commit.v1",
      disposition:receipt.disposition==="FAILED_RECORDED"
        ?"DURABLY_FAILED":"DURABLY_ALREADY_IDENTICAL_FAILED",
      sessionId:receipt.sessionId,
      failureCode:receipt.failureCode,
      safeEvidenceSha256:receipt.safeEvidenceSha256,
      committed:true,
      authorizesAnotherRun:false,
      confirmsProviderSubscriptionDeleted:false,
      confirmsAccountSettled:false,
      providerCalls:0,
    };
  }catch(err){
    if(commitAttempted){
      // A failed/timeout COMMIT response can hide a successful write.
      // Do not rollback/retry or pronounce it absent; operator must
      // reconcile against LOGGED owner via an independent connection.
      throw Error("GATE3_FAILED_COMMIT_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
    }
    if(began) await client.query("ROLLBACK").catch(()=>undefined);
    throw err;
  }finally{
    client.release();
  }
}
