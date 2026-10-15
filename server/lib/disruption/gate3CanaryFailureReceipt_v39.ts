/**
 * Phase3 Gate3 — terminal FAILED durable owner receipt only.
 *
 * The prepaid receiver's source row is UNLOGGED. This LOGGED ownership record
 * survives its loss and can preserve an ambiguous provider CREATE/DELETE/
 * BIND or settlement failure for explicit future operator adjudication.
 *
 * IMPORTANT: this function is NOT a paid owner, a subscription cleanup, an
 * account settlement, a successful Gate3 certificate, or a permission to
 * rearm/start another provider subscription. A recorded FAILED state can
 * coexist with unresolved live provider exposure; independent subscription
 * inventory, deletion and financial recovery are still mandatory.
 *
 * Caller MUST provide a transaction-owned PG client and commit/rollback it;
 * this function never begins/commits, never calls any provider API, and
 * never writes provider balances or external account credit deltas.
 */
import type {PoolClient} from "pg";

export type Gate3CanaryFailureCodeV39 =
  |"AUTH_OR_HOST_PARITY_FAILED"
  |"CREATE_AMBIGUOUS_ACCOUNT_HOLD"
  |"BIND_FAILED"
  |"OWNED_DELETE_UNVERIFIED"
  |"WINDOW_STOPPED"
  |"SETTLEMENT_UNRESOLVED"
  |"CREDIT_DIFFERENCE"
  |"SOURCE_INTEGRITY_FAILED"
  |"OPERATOR_ABORTED";
export type Gate3FailureReceiptInputV39=Readonly<{
  sessionId:string;
  icao:string;
  authorizationEvidenceSha256:string;
  failureCode:Gate3CanaryFailureCodeV39;
  safeEvidenceSha256:string;
}>;
export type Gate3FailureReceiptV39=Readonly<{
  schema:"v39.phase3.gate3.failure-receipt.v1";
  disposition:"FAILED_RECORDED"|"ALREADY_IDENTICALLY_FAILED";
  sessionId:string;
  failureCode:Gate3CanaryFailureCodeV39;
  safeEvidenceSha256:string;
  authorizesAnotherRun:false;
  confirmsProviderSubscriptionDeleted:false;
  confirmsAccountSettled:false;
  providerCalls:0;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z]{4}$/;
const ALLOWED=new Set<Gate3CanaryFailureCodeV39>([
  "AUTH_OR_HOST_PARITY_FAILED","CREATE_AMBIGUOUS_ACCOUNT_HOLD",
  "BIND_FAILED","OWNED_DELETE_UNVERIFIED","WINDOW_STOPPED",
  "SETTLEMENT_UNRESOLVED","CREDIT_DIFFERENCE",
  "SOURCE_INTEGRITY_FAILED","OPERATOR_ABORTED",
]);

export async function recordGate3CanaryFailureV39(
  client:Pick<PoolClient,"query">,
  input:Gate3FailureReceiptInputV39,
):Promise<Gate3FailureReceiptV39>{
  if(!input||typeof input!=="object"||Array.isArray(input)||
     typeof input.sessionId!=="string"||!UUID.test(input.sessionId)||
     typeof input.icao!=="string"||!ICAO.test(input.icao)||
     typeof input.authorizationEvidenceSha256!=="string"||
     !SHA.test(input.authorizationEvidenceSha256)||
     typeof input.safeEvidenceSha256!=="string"||
     !SHA.test(input.safeEvidenceSha256)||
     typeof input.failureCode!=="string"||
     !ALLOWED.has(input.failureCode as Gate3CanaryFailureCodeV39))
    throw Error("GATE3_FAILED_RECEIPT_INPUT_INVALID");

  // SELECT FOR UPDATE serializes two competing terminalizers. The canonical
  // SQL guard prohibits any later update/deletion of a terminal owner row.
  const q=await client.query(
    `SELECT session_id,icao,authorization_evidence_sha256,
            state,failure_reason,evidence_sha256
       FROM clean.phase3_gate3_canary_owner_v39
      WHERE session_id=$1 FOR UPDATE`,[input.sessionId],
  );
  if(q.rowCount!==1)throw Error("GATE3_FAILED_RECEIPT_OWNER_NOT_FOUND");
  const row=q.rows[0] as Record<string,unknown>;
  if(row.icao!==input.icao||
     row.authorization_evidence_sha256!==input.authorizationEvidenceSha256)
    throw Error("GATE3_FAILED_RECEIPT_OWNER_SCOPE_MISMATCH");

  if(row.state==="FAILED"){
    if(row.failure_reason!==input.failureCode||
       row.evidence_sha256!==input.safeEvidenceSha256)
      throw Error("GATE3_FAILED_RECEIPT_TERMINAL_CONFLICT");
    return {
      schema:"v39.phase3.gate3.failure-receipt.v1",
      disposition:"ALREADY_IDENTICALLY_FAILED",sessionId:input.sessionId,
      failureCode:input.failureCode,safeEvidenceSha256:input.safeEvidenceSha256,
      authorizesAnotherRun:false,confirmsProviderSubscriptionDeleted:false,
      confirmsAccountSettled:false,providerCalls:0,
    };
  }
  if(row.state!=="PREPARED")
    throw Error("GATE3_FAILED_RECEIPT_TERMINAL_CONFLICT");
  const updated=await client.query(
    `UPDATE clean.phase3_gate3_canary_owner_v39
        SET state='FAILED',failure_reason=$2,evidence_sha256=$3,
            terminal_at_utc=now()
      WHERE session_id=$1 AND state='PREPARED'
      RETURNING session_id`,
    [input.sessionId,input.failureCode,input.safeEvidenceSha256],
  );
  if(updated.rowCount!==1)
    throw Error("GATE3_FAILED_RECEIPT_CONCURRENT_TERMINALIZATION");
  return {
    schema:"v39.phase3.gate3.failure-receipt.v1",
    disposition:"FAILED_RECORDED",sessionId:input.sessionId,
    failureCode:input.failureCode,safeEvidenceSha256:input.safeEvidenceSha256,
    authorizesAnotherRun:false,confirmsProviderSubscriptionDeleted:false,
    confirmsAccountSettled:false,providerCalls:0,
  };
}
