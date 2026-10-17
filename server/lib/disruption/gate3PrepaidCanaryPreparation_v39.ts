/**
 * Gate3 isolated prepaid session PREPARATION only (not a paid owner).
 *
 * This helper has no AeroDataBox import, reads no provider account,
 * creates no paid subscription and does not authorize a live canary.
 * The calling paid owner, not this module, MUST independently verify:
 * exact signed AUTH artifact + published callback + provider balance/active
 * subscription inventory + permissible retained-originals lifecycle.
 *
 * Use one PostgreSQL transaction for LOGGED ownership and UNLOGGED session
 * reservation; an orphaned runtime row cannot be armed directly (V0065).
 * A LOGGED PREPARED row surviving UNLOGGED loss is a recovery/STOP signal,
 * not authority to restart automatically or charge another provider credit.
 */
import {randomUUID} from "node:crypto";
import type {Pool,PoolClient} from "pg";

export interface Gate3DraftPreparationV39 {
  icao:string;
  authorizationEvidenceSha256:string;
  canaryCreditCeiling:number;
  fixedExposureSeconds:number;
  nowUtc?:Date;
}
export interface Gate3DraftPreparedV39 {
  sessionId:string;
  icao:string;
  state:"PREPARED";
  runtimeState:"armed";
  canaryCreditCeiling:number;
  fixedExposureSeconds:number;
  sessionExpiresAtUtc:string;
  approvalVerifiedHere:false;
  authorizedPaidProviderCalls:false;
}
const EXACT_ICAO=/^[A-Z]{4}$/;
const EXACT_SHA=/^[0-9a-f]{64}$/;
// Gate3 pre-arm waits for a separately launched GitHub runner; keep exact
// callback custody through the 600s window and 300s rescue grace, including
// cold-start lead and later settlement. A stale PREPARED row still blocks retry.
const EXPIRY_BUFFER_SECONDS=1500;

/**
 * Existing durable FAILED incident can still carry an unverified subscription
 * or billable balance. Never treat only PREPARED rows as the entire account
 * exposure gate. A later independently documented provider clearance must
 * be versioned/reviewed; no boolean self-clearance exists here.
 * Exported only so real disposable-PG regression tests run this exact SQL.
 */
export const GATE3_PRIOR_OWNER_ADMISSION_SQL_V39=`SELECT session_id,state,failure_reason
  FROM clean.phase3_gate3_canary_owner_v39
 WHERE state='PREPARED'
    OR (state='FAILED' AND failure_reason IN
       ('CREATE_AMBIGUOUS_ACCOUNT_HOLD',
        'BIND_FAILED',
        'OWNED_DELETE_UNVERIFIED',
        'SETTLEMENT_UNRESOLVED'))
 LIMIT 1` as const;
const canaryValid=(n:unknown,max:number)=>typeof n==="number"&&
  Number.isSafeInteger(n)&&n>=1&&n<=max;

export function validateGate3DraftPreparationV39(
  input:Gate3DraftPreparationV39,
):void{
  if(!input||typeof input!=="object"||Array.isArray(input))
    throw Error("GATE3_PREPARE_INVALID_INPUT");
  if(typeof input.icao!=="string"||!EXACT_ICAO.test(input.icao))
    throw Error("GATE3_PREPARE_EXACT_UPPERCASE_ICAO_REQUIRED");
  if(typeof input.authorizationEvidenceSha256!=="string"||
     !EXACT_SHA.test(input.authorizationEvidenceSha256))
    throw Error("GATE3_PREPARE_SIGNED_AUTH_ARTIFACT_HASH_REQUIRED");
  // A tiny canary should never inherit the main collection 1900 ceiling.
  if(!canaryValid(input.canaryCreditCeiling,100))
    throw Error("GATE3_PREPARE_SMALL_CANARY_CEILING_1_TO_100_REQUIRED");
  if(!canaryValid(input.fixedExposureSeconds,3600))
    throw Error("GATE3_PREPARE_FIXED_EXPOSURE_1_TO_3600_REQUIRED");
  const now=input.nowUtc??new Date();
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))
    throw Error("GATE3_PREPARE_NOW_INVALID");
}

/**
 * Takes ownership of a caller-supplied, already-connected PoolClient.
 * The caller MUST NEVER mix this method's BEGIN/COMMIT with another tx.
 * A failed or ambiguous COMMIT is a HOLD requiring durable source inspection,
 * never a safe excuse to re-arm a new session.
 */
export async function prepareGate3CanaryDraftV39(
  client:PoolClient,input:Gate3DraftPreparationV39,
):Promise<Gate3DraftPreparedV39>{
  validateGate3DraftPreparationV39(input);
  const now=input.nowUtc??new Date();
  const expires=new Date(now.getTime()+
    (input.fixedExposureSeconds+EXPIRY_BUFFER_SECONDS)*1000);
  const sessionId=randomUUID();
  let began=false,commitAttempted=false;
  try{
    await client.query("BEGIN");
    began=true;
    // Serialize independent Gate3 reservations, but never claim this lock
    // isolates provider operations from other owners. A published owner still
    // checks the live provider subscription inventory before actual creation.
    await client.query("SELECT pg_advisory_xact_lock(39003,3)");
    // An immutable FAILED receipt can still coexist with a billable owned
    // subscription or unsettled provider charges. A new session MUST NOT
    // start merely because the previous row left PREPARED. Those failures
    // require separate reviewed account recovery, not auto-retry or a waiver
    // based on the age of the receipt. Ordinary scientific mismatch does not
    // itself assert that another billable subscription is alive.
    const existing=await client.query(GATE3_PRIOR_OWNER_ADMISSION_SQL_V39);
    if(existing.rowCount!==0){
      if(existing.rows[0]?.state==="FAILED")
        throw Error("GATE3_PREPARE_PRIOR_UNRESOLVED_ACCOUNT_FAILURE_HOLD");
      throw Error("GATE3_PREPARE_PRIOR_UNSETTLED_OWNER_HOLD");
    }
    await client.query(
      `INSERT INTO clean.phase3_gate3_canary_owner_v39
         (session_id,icao,authorization_evidence_sha256,
          canary_credit_ceiling,fixed_exposure_seconds,
          created_at_utc,expires_at_utc,state)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PREPARED')`,
      [sessionId,input.icao,input.authorizationEvidenceSha256,
        input.canaryCreditCeiling,input.fixedExposureSeconds,now,expires],
    );
    await client.query(
      `INSERT INTO clean.prepaid_probe_session_runtime
         (session_id,owner_kind,owner_probe_id,stage,icao,
          state,created_at_utc,expires_at_utc)
       VALUES ($1,'phase3_credit_canary',NULL,NULL,$2,'armed',$3,$4)`,
      [sessionId,input.icao,now,expires],
    );
    commitAttempted=true;
    await client.query("COMMIT");
  }catch(err){
    if(commitAttempted)
      throw Error("GATE3_PREPARE_COMMIT_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
    if(!began)
      throw Error("GATE3_PREPARE_BEGIN_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
    try {
      await client.query("ROLLBACK");
    } catch {
      throw Error("GATE3_PREPARE_ROLLBACK_FAILED_DURABLE_AUDIT_REQUIRED");
    }
    throw err;
  }
  return {
    sessionId,icao:input.icao,state:"PREPARED",runtimeState:"armed",
    canaryCreditCeiling:input.canaryCreditCeiling,
    fixedExposureSeconds:input.fixedExposureSeconds,
    sessionExpiresAtUtc:expires.toISOString(),
    approvalVerifiedHere:false,authorizedPaidProviderCalls:false,
  };
}


/**
 * Actual pool-owned PREPARED reservation entrypoint for the future reviewed
 * Gate3 operator. Unlike passing around a borrowed PoolClient, this wrapper
 * destroys any PG connection whose transaction state cannot be established.
 * A lost COMMIT acknowledgment may have committed the LOGGED owner already:
 * NEVER auto-generate/prepare a second UUID to "retry" an ambiguous outcome.
 *
 * This only commits source identity and an armed UNLOGGED runtime session.
 * It does not verify signed human authorization, published receiver/host
 * parity, provider subscription inventory, provider balance, or retention
 * rights. It does not create, authorize, or touch a paid subscription.
 */
export async function prepareGate3CanaryDraftWithPoolV39(
  pool:Pick<Pool,"connect">,
  input:Gate3DraftPreparationV39,
):Promise<Gate3DraftPreparedV39>{
  // Reject corrupt scope before acquiring a client / touching SQL.
  validateGate3DraftPreparationV39(input);
  if(!pool||typeof pool.connect!=="function")
    throw Error("GATE3_PREPARE_POOL_REQUIRED");
  let client:PoolClient;
  try { client=await pool.connect(); }
  catch { throw Error("GATE3_PREPARE_POOL_CONNECT_FAILED_HOLD"); }
  let destroy=false;
  try {
    return await prepareGate3CanaryDraftV39(client,input);
  } catch(error) {
    const message=error instanceof Error?error.message:"";
    destroy=message==="GATE3_PREPARE_COMMIT_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED"||
      message==="GATE3_PREPARE_BEGIN_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED"||
      message==="GATE3_PREPARE_ROLLBACK_FAILED_DURABLE_AUDIT_REQUIRED";
    throw error;
  } finally {
    client.release(destroy);
  }
}
