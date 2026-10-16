/**
 * Gate3 actual owner AUTH+prepared-session boundary. READ ONLY.
 *
 * Scope: verify the exact hash-locked AUTH bytes against an independently
 * supplied evidence ledger, then check that the LOGGED owner matches the
 * UNLOGGED prepaid session. This is not a cryptographic signature check,
 * a provider-account preflight, a hosted receiver test, or a paid owner.
 * This file NEVER invokes provider SDK or mutates PostgreSQL.
 *
 * A syntactically valid hash or a user-supplied flag alone cannot authorize.
 * The caller may only advance after a separate operator-reviewed LIVE
 * release parity and provider source/balance/subscription audit.
 */
import type {PoolClient} from "pg";
import {
  approvedArtifactHashesFromLedger,
  sha256HexString,verifyAuthRecord,type AuthRecord,
} from "./authRecord_v39";
import {
  reviewGate3PreparedSessionV39,
  type Gate3PreparedSessionExpectedV39,
} from "./gate3PreparedSessionReview_v39";

export interface Gate3OwnerPreflightInputV39 {
  authArtifactRaw:string;
  evidenceLedgerRaw:string;
  expectedAuthId:string;
  expectedAirportFilterWindow:string;
  expectedSession:Gate3PreparedSessionExpectedV39;
  nowUtc?:Date;
}
export type Gate3OwnerPreflightV39 =Readonly<{
  schema:"v39.gate3.owner-auth-and-prearm.v1";
  status:"HOLD"|"OFFLINE_AUTH_SESSION_CONSISTENT";
  reasons:readonly string[];
  sessionId:string|null;
  authorizationRecordHash:string|null;
  approvalEvidenceInLedger:boolean;
  preparedSessionShapeVerified:boolean;
  publishedReceiverVerified:false;
  realProviderBalanceVerified:false;
  externalCreditsVerified:false;
  paidCanaryAuthorized:false;
  providerCalls:0;
  databaseMutations:0;
}>;
const GATE="Phase 3 / Gate 3";
const AUTH_ID=/^AUTH-\d{8}-[A-Z0-9]+$/;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const ICAO=/^[A-Z]{4}$/;
const SHA=/^[0-9a-f]{64}$/;
function evidenceIds(raw:string):string[]{
  return Array.from(new Set(
    Array.from(raw.matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g))
      .map(m=>m[1]),
  ));
}
/** Offline source/SQL check, fail closed. It produces no token that a paid
 * create/balance operation can use as authorization. */
export async function reviewGate3OwnerPreflightV39(
  client:Pick<PoolClient,"query">,input:Gate3OwnerPreflightInputV39,
):Promise<Gate3OwnerPreflightV39>{
  if(!input||typeof input!=="object"||Array.isArray(input)||
     typeof input.authArtifactRaw!=="string"||
     typeof input.evidenceLedgerRaw!=="string"||
     typeof input.expectedAuthId!=="string"||
     !AUTH_ID.test(input.expectedAuthId)||
     typeof input.expectedAirportFilterWindow!=="string"||
     !input.expectedSession||
     !ICAO.test(input.expectedSession.icao)||
     !SHA.test(input.expectedSession.authorizationEvidenceSha256)||
     !Number.isSafeInteger(input.expectedSession.canaryCreditCeiling)||
     input.expectedSession.canaryCreditCeiling<1||
     input.expectedSession.canaryCreditCeiling>100||
     !Number.isSafeInteger(input.expectedSession.fixedExposureSeconds)||
     input.expectedSession.fixedExposureSeconds<1||
     input.expectedSession.fixedExposureSeconds>3600||
     !(input.nowUtc===undefined||
       (input.nowUtc instanceof Date&&Number.isFinite(input.nowUtc.getTime())))){
    throw Error("GATE3_OWNER_PREFLIGHT_INPUT_INVALID");
  }
  const reasons:string[]=[];
  let hash:string|null=null;
  let approved=false;
  let prepared=false;
  let record:AuthRecord|null=null;
  try{
    const parsed:unknown=JSON.parse(input.authArtifactRaw);
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||
       !Array.isArray((parsed as AuthRecord).predecessorEvidenceIds))
      throw Error("AUTH_SHAPE_INVALID");
    record=parsed as AuthRecord;
  }catch{
    reasons.push("AUTH_ARTIFACT_JSON_INVALID");
  }
  if(record){
    hash=sha256HexString(input.authArtifactRaw);
    const approvedHashes=approvedArtifactHashesFromLedger(input.evidenceLedgerRaw);
    approved=approvedHashes.includes(hash);
    const auth=verifyAuthRecord(record,{
      nowUtc:input.nowUtc??new Date(),
      expectedPhaseGate:GATE,
      existingEvidenceIds:evidenceIds(input.evidenceLedgerRaw),
      artifactHash:hash,
      approvedArtifactHashes:approvedHashes,
    });
    if(!auth.verified)reasons.push("AUTH_RECORD_OR_LEDGER_NOT_VERIFIED");
    if(record.authorizationId!==input.expectedAuthId)
      reasons.push("AUTH_ID_NOT_EXACT_MATCH");
    const icao=input.expectedSession.icao;
    const scope=input.expectedAirportFilterWindow;
    const prefix=icao+"/departures/";
    const tail=scope.startsWith(prefix)?scope.slice(prefix.length):"";
    const plus=tail.lastIndexOf("+");
    const stamp=plus<0?"":tail.slice(0,plus);
    const lengthToken=plus<0?"":tail.slice(plus+1);
    if(!UTC.test(stamp)||!Number.isFinite(Date.parse(stamp))||
       lengthToken!==String(input.expectedSession.fixedExposureSeconds)+"s"||
       record.airportFilterWindow!==scope)
      reasons.push("AUTH_AIRPORT_WINDOW_SCOPE_NOT_EXACT");
    if(record.maxAlertCredits!==input.expectedSession.canaryCreditCeiling ||
       !Number.isInteger(record.maxAlertCredits)||
       record.maxAlertCredits>100 || record.maxAlertCredits<1)
      reasons.push("AUTH_CREDIT_CEILING_NOT_EXACT");
    if(typeof record.cleanupOwner!=="string"||!record.cleanupOwner.trim())
      reasons.push("AUTH_CLEANUP_OWNER_MISSING");
    if(record.maxRestUnitsByCategory!==null &&
       (!record.maxRestUnitsByCategory||
        typeof record.maxRestUnitsByCategory!=="object"||
        Object.values(record.maxRestUnitsByCategory).some(v=>v!==0)))
      reasons.push("AUTH_REST_UNITS_NOT_ZERO");
    if(!Array.isArray(record.predecessorEvidenceIds)||
       record.predecessorEvidenceIds.length===0)
      reasons.push("AUTH_PREDECESSOR_EVIDENCE_REQUIRED");
    if(hash!==input.expectedSession.authorizationEvidenceSha256)
      reasons.push("LOGGED_OWNER_AUTH_HASH_NOT_EXACT");
  }
  // Never query DB on invalid or unapproved AUTH; no source content is
  // mutated or returned. A valid ledger+session result is still NOT
  // a signed, deployed or provider-backed authorization to spend.
  if(!reasons.length){
    try{
      const r=await reviewGate3PreparedSessionV39(client,{
        ...input.expectedSession,
        nowUtc:input.nowUtc,
      });
      if(r.status!=="OFFLINE_SOURCE_SHAPE_VALID")
        reasons.push(...r.reasons.map(x=>"SESSION_"+x));
      else prepared=true;
    }catch{
      reasons.push("PREPARED_SESSION_READ_FAILED");
    }
  }
  return {
    schema:"v39.gate3.owner-auth-and-prearm.v1",
    status:reasons.length?"HOLD":"OFFLINE_AUTH_SESSION_CONSISTENT",
    reasons:reasons.sort(),sessionId:input.expectedSession.sessionId,
    authorizationRecordHash:hash,
    approvalEvidenceInLedger:approved,preparedSessionShapeVerified:prepared,
    publishedReceiverVerified:false,realProviderBalanceVerified:false,
    externalCreditsVerified:false,paidCanaryAuthorized:false,
    providerCalls:0,databaseMutations:0,
  };
}
