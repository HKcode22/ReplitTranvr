/**
 * Phase 3/Gate3 — immutable LOGGED SETTLED candidate receipt (DRAFT/OFFLINE).
 *
 * Finishes the SQL half of a future reviewed Gate3 execution owner. The
 * shared prepaid window may return 'settling' after an exact deleted,
 * externally settled, source-matched exposure. An UNLOGGED session cannot
 * be used as a durable terminal result after a crash.
 *
 * THIS MODULE DOES NOT AUTHENTICATE the caller-supplied source/host booleans,
 * operator AUTH, provider account reads, or original bytes. Its result is
 * *SQL durability of a candidate*, NEVER live Gate3 PASS or authority to
 * start another paid subscription. Actual owner must independently verify
 * those facts and exact identity before invoking this provider-free module.
 *
 * No provider SDK, original payload, subscription ID, provider balance or
 * external credit delta is read, written or logged by this module.
 */
import type {Pool,PoolClient} from "pg";
import {
  assessGate3CanaryTerminalV39,
  type Gate3TerminalAssessmentInputV39,
} from "./gate3CanaryTerminalAssessment_v39";

export type Gate3SettledCommitInputV39=Readonly<{
  sessionId:string;
  icao:string;
  authorizationEvidenceSha256:string;
  assessment:Gate3TerminalAssessmentInputV39;
}>;

export type Gate3SettledCommitReceiptV39=Readonly<{
  schema:"v39.phase3.gate3.settled-candidate-commit.v1";
  disposition:"COMMITTED_SETTLED_CANDIDATE"|"ALREADY_IDENTICAL_SETTLED_CANDIDATE";
  sessionId:string;
  safeMetadataDigestSha256:string;
  committed:true;
  liveGate3Certified:false;
  providerAuthenticityVerifiedHere:false;
  signedOperatorAuthorizationVerifiedHere:false;
  authorizesAnotherPaidRun:false;
  confirmsRetainedOriginalsDeleted:false;
  providerCalls:0;
}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ICAO=/^[A-Z]{4}$/;
const SHA=/^[0-9a-f]{64}$/;

function validateCandidate(input:Gate3SettledCommitInputV39):{
  digest:string;internal:number;reads:number;
}{
  if(!input||typeof input!=="object"||Array.isArray(input)||
     typeof input.sessionId!=="string"||!UUID.test(input.sessionId)||
     typeof input.icao!=="string"||!ICAO.test(input.icao)||
     typeof input.authorizationEvidenceSha256!=="string"||
     !SHA.test(input.authorizationEvidenceSha256)||
     !input.assessment||typeof input.assessment!=="object"||
     input.assessment.expectedSessionId!==input.sessionId)
    throw Error("GATE3_SETTLED_CANDIDATE_SCOPE_INVALID");
  const review=assessGate3CanaryTerminalV39(input.assessment);
  if(review.status!=="OFFLINE_CANDIDATE"||
     !review.safeMetadataDigestSha256)
    throw Error("GATE3_SETTLED_CANDIDATE_ASSESSMENT_HOLD");
  return {
    digest:review.safeMetadataDigestSha256,
    internal:input.assessment.result.internalSendCredits,
    reads:input.assessment.result.settlementReads,
  };
}

/**
 * Single PG checked-out connection, one BEGIN and one COMMIT attempt.
 * Ambiguous COMMIT destroys that pooled connection, requires independent
 * LOGGED state readback, and never retries/certifies the paid experiment.
 * A successful ACK only certifies the SQL receipt's durability.
 */
export async function commitGate3SettledCandidateV39(
  pool:Pick<Pool,"connect">,
  input:Gate3SettledCommitInputV39,
):Promise<Gate3SettledCommitReceiptV39>{
  const candidate=validateCandidate(input); // refuse HOLD before any SQL
  if(!pool||typeof pool.connect!=="function")
    throw Error("GATE3_SETTLED_COMMIT_POOL_REQUIRED");
  let client:PoolClient;
  try{client=await pool.connect();}
  catch{throw Error("GATE3_SETTLED_COMMIT_CONNECT_FAILED_HOLD");}
  let began=false,commitAttempted=false,discardConnection=false;
  try{
    await client.query("BEGIN");
    began=true;
    const q=await client.query(
      `SELECT icao,authorization_evidence_sha256,canary_credit_ceiling,
              fixed_exposure_seconds,state,exact_reconciliation_verified,
              internal_received_credits,stable_read_count,
              owned_subscription_delete_verified,foreign_billable_count,
              evidence_sha256,failure_reason
         FROM clean.phase3_gate3_canary_owner_v39
        WHERE session_id=$1 FOR UPDATE`,
      [input.sessionId],
    );
    if(q.rowCount!==1)throw Error("GATE3_SETTLED_OWNER_NOT_FOUND");
    const row=q.rows[0] as Record<string,unknown>;
    if(row.icao!==input.icao||
       row.authorization_evidence_sha256!==input.authorizationEvidenceSha256||
       row.canary_credit_ceiling!==input.assessment.canaryCreditCeiling||
       row.fixed_exposure_seconds!==input.assessment.fixedExposureSeconds)
      throw Error("GATE3_SETTLED_OWNER_SCOPE_OR_BUDGET_MISMATCH");
    let disposition:Gate3SettledCommitReceiptV39["disposition"];
    if(row.state==="SETTLED"){
      // Canonical SQL guard already prohibits terminal modification;
      // identical replay still requires a newly ACKNOWLEDGED read tx.
      if(row.exact_reconciliation_verified!==true||
         Number(row.internal_received_credits)!==candidate.internal||
         Number(row.stable_read_count)!==candidate.reads||
         row.owned_subscription_delete_verified!==true||
         Number(row.foreign_billable_count)!==0||
         row.evidence_sha256!==candidate.digest||
         row.failure_reason!==null)
        throw Error("GATE3_SETTLED_TERMINAL_CONFLICT");
      disposition="ALREADY_IDENTICAL_SETTLED_CANDIDATE";
    }else if(row.state==="PREPARED"){
      const updated=await client.query(
        `UPDATE clean.phase3_gate3_canary_owner_v39
            SET state='SETTLED',exact_reconciliation_verified=true,
                internal_received_credits=$2,stable_read_count=$3,
                owned_subscription_delete_verified=true,
                foreign_billable_count=0,evidence_sha256=$4,
                terminal_at_utc=now()
          WHERE session_id=$1 AND state='PREPARED'
          RETURNING session_id`,
        [input.sessionId,candidate.internal,candidate.reads,candidate.digest],
      );
      if(updated.rowCount!==1)
        throw Error("GATE3_SETTLED_CONCURRENT_TERMINALIZATION");
      disposition="COMMITTED_SETTLED_CANDIDATE";
    }else{
      // FAILED (or unknown) must never silently become SETTLED.
      throw Error("GATE3_SETTLED_TERMINAL_CONFLICT");
    }
    commitAttempted=true;
    await client.query("COMMIT");
    return {
      schema:"v39.phase3.gate3.settled-candidate-commit.v1",
      disposition,sessionId:input.sessionId,
      safeMetadataDigestSha256:candidate.digest,
      committed:true,liveGate3Certified:false,
      providerAuthenticityVerifiedHere:false,
      signedOperatorAuthorizationVerifiedHere:false,
      authorizesAnotherPaidRun:false,
      confirmsRetainedOriginalsDeleted:false,
      providerCalls:0,
    };
  }catch(error){
    if(commitAttempted){
      discardConnection=true;
      throw Error("GATE3_SETTLED_COMMIT_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
    }
    if(began){
      try{await client.query("ROLLBACK");}
      catch{discardConnection=true;}
    }else discardConnection=true; // BEGIN response itself may be ambiguous
    throw error;
  }finally{
    client.release(discardConnection);
  }
}
