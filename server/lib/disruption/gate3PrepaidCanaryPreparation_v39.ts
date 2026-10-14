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
import type {PoolClient} from "pg";

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
const EXPIRY_BUFFER_SECONDS=600;
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
    const existing=await client.query(
      "SELECT session_id FROM clean.phase3_gate3_canary_owner_v39 WHERE state='PREPARED' LIMIT 1",
    );
    if(existing.rowCount!==0)
      throw Error("GATE3_PREPARE_PRIOR_UNSETTLED_OWNER_HOLD");
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
    if(began&&!commitAttempted){
      await client.query("ROLLBACK").catch(()=>undefined);
    }
    if(commitAttempted)
      throw Error("GATE3_PREPARE_COMMIT_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
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
