/**
 * Gate3 ledger-BOUND reservation of the REAL LOGGED/UNLOGGED source.
 *
 * Unlike the lower-level unapproved draft preparer, this is the prospective
 * owner-facing source reservation entrypoint: exact approved AUTH bytes and
 * the independent checked-in evidence ledger are verified BEFORE any SQL.
 *
 * Ledger hash approval is NOT a cryptographic human signature, approval for
 * a production migration, published webhook proof, or paid-provider AUTH.
 * Never call AeroDataBox here; the shared paid runner retains its hard STOP.
 */
import type {Pool} from "pg";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {
  approvedArtifactHashesFromLedger,sha256HexString,verifyAuthRecord,
  type AuthRecord,
} from "./authRecord_v39";
import {
  prepareGate3CanaryDraftWithPoolV39,
  type Gate3DraftPreparedV39,
} from "./gate3PrepaidCanaryPreparation_v39";

export type Gate3LedgerBoundPreparationInputV39=Readonly<{
  authArtifactRaw:string;
  expectedAuthId:string;
  expectedAirportFilterWindow:string;
  icao:string;
  canaryCreditCeiling:number;
  fixedExposureSeconds:number;
  nowUtc?:Date;
}>;

export type Gate3LedgerBoundPreparedV39=Gate3DraftPreparedV39 & Readonly<{
  status:"SOURCE_PREPARED_LEDGER_MATCH_NOT_PAID_AUTH";
  authArtifactSha256:string;
  independentLedgerHashMatched:true;
  signedOperatorAuthorizationVerifiedHere:false;
  publishedHostCustodyVerifiedHere:false;
  providerAccountInventoryVerifiedHere:false;
  authorizesPaidProviderCalls:false;
}>;

const AUTH_ID=/^AUTH-\d{8}-[A-Z0-9]+$/;
const ICAO=/^[A-Z]{4}$/;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const validInt=(v:unknown,max:number)=>typeof v==="number"&&
  Number.isSafeInteger(v)&&v>=1&&v<=max;

function sourceEvidenceIds(raw:string):string[]{
  return Array.from(new Set(
    Array.from(raw.matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g))
      .map(m=>m[1]),
  ));
}

/**
 * Pure, provider/SQL-free validation; refuse BEFORE pool.connect.
 * Source preparation is NOT the paid launch, nor a cryptographic signature.
 */
export function reviewGate3LedgerBoundPreparationV39(
  input:Gate3LedgerBoundPreparationInputV39,
  evidenceLedgerRaw:string,
):Readonly<{authArtifactSha256:string;icao:string;
  canaryCreditCeiling:number;fixedExposureSeconds:number;nowUtc:Date}>{
  if(!input||typeof input!=="object"||Array.isArray(input)||
     typeof input.authArtifactRaw!=="string"||
     typeof evidenceLedgerRaw!=="string"||
     typeof input.expectedAuthId!=="string"||!AUTH_ID.test(input.expectedAuthId)||
     typeof input.icao!=="string"||!ICAO.test(input.icao)||
     typeof input.expectedAirportFilterWindow!=="string"||
     !validInt(input.canaryCreditCeiling,100)||
     !validInt(input.fixedExposureSeconds,3600)||
     !(input.nowUtc===undefined||
       (input.nowUtc instanceof Date&&Number.isFinite(input.nowUtc.getTime()))))
    throw Error("GATE3_LEDGER_PREPARE_EXACT_SCOPE_REQUIRED");
  const now=input.nowUtc??new Date();
  let record:AuthRecord;
  try{
    const parsed:unknown=JSON.parse(input.authArtifactRaw);
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||
       !Array.isArray((parsed as AuthRecord).predecessorEvidenceIds))
      throw Error("bad");
    record=parsed as AuthRecord;
  }catch{
    throw Error("GATE3_LEDGER_PREPARE_AUTH_ARTIFACT_INVALID_HOLD");
  }

  const hash=sha256HexString(input.authArtifactRaw);
  const approved=approvedArtifactHashesFromLedger(evidenceLedgerRaw);
  const verdict=verifyAuthRecord(record,{
    nowUtc:now,expectedPhaseGate:"Phase 3 / Gate 3",
    existingEvidenceIds:sourceEvidenceIds(evidenceLedgerRaw),
    artifactHash:hash,approvedArtifactHashes:approved,
  });
  if(!verdict.verified)
    throw Error("GATE3_LEDGER_PREPARE_AUTH_NOT_INDEPENDENTLY_APPROVED_HOLD");
  if(record.authorizationId!==input.expectedAuthId||
     record.maxAlertCredits!==input.canaryCreditCeiling||
     record.airportFilterWindow!==input.expectedAirportFilterWindow||
     !record.cleanupOwner?.trim()||
     !record.predecessorEvidenceIds.length||
     (record.maxRestUnitsByCategory!==null&&
       (typeof record.maxRestUnitsByCategory!=="object"||
        Object.values(record.maxRestUnitsByCategory).some(x=>x!==0))))
    throw Error("GATE3_LEDGER_PREPARE_APPROVED_SCOPE_MISMATCH_HOLD");

  const prefix=input.icao+"/departures/";
  if(!input.expectedAirportFilterWindow.startsWith(prefix))
    throw Error("GATE3_LEDGER_PREPARE_WRONG_AIRPORT_HOLD");
  const tail=input.expectedAirportFilterWindow.slice(prefix.length);
  const sep=tail.lastIndexOf("+");
  const stamp=sep<0?"":tail.slice(0,sep);
  const duration=sep<0?"":tail.slice(sep+1);
  const start=Date.parse(stamp);
  if(!UTC.test(stamp)||!Number.isFinite(start)||
     duration!==String(input.fixedExposureSeconds)+"s")
    throw Error("GATE3_LEDGER_PREPARE_WINDOW_INVALID_HOLD");

  // Creating a reservation for an already-past or far-off window risks
  // leaving a stale LOGGED owner and subsequent billable duplicate attempts.
  // No overlong reservations or silent automatic rescheduling.
  if(start<now.getTime()||start>now.getTime()+120_000)
    throw Error("GATE3_LEDGER_PREPARE_WINDOW_NOT_IMMINENT_HOLD");
  const exp=record.expiresAtUtc?Date.parse(record.expiresAtUtc):NaN;
  const begin=record.startNotBeforeUtc?Date.parse(record.startNotBeforeUtc):NaN;
  if(!Number.isFinite(exp)||!Number.isFinite(begin)||
     now.getTime()<begin||exp<start+
       (input.fixedExposureSeconds+600)*1000)
    throw Error("GATE3_LEDGER_PREPARE_EXPLICIT_AUTH_LIFETIME_HOLD");

  return {authArtifactSha256:hash,icao:input.icao,
    canaryCreditCeiling:input.canaryCreditCeiling,
    fixedExposureSeconds:input.fixedExposureSeconds,nowUtc:now};
}

/**
 * One exact ledger-pinned AUTH -> one atomic REAL prepared-session reservation.
 * No hidden fallback, no automatic retries on unknown COMMIT/UNLOGGED loss.
 */
export async function prepareGate3LedgerBoundSessionV39(
  pool:Pick<Pool,"connect">,input:Gate3LedgerBoundPreparationInputV39,
):Promise<Gate3LedgerBoundPreparedV39>{
  // Always read the independent evidence ledger from the reviewed checkout.
  // No caller-supplied ledger bytes can self-approve their own AUTH hash.
  let ledgerRaw:string;
  try {
    ledgerRaw=readFileSync(join(process.cwd(),
      "SEPmd","V3.9_RUN_REPORTS_AND_EVIDENCE.md"),"utf8");
  } catch {
    throw Error("GATE3_LEDGER_PREPARE_REVIEWED_LEDGER_FILE_MISSING_HOLD");
  }
  const reviewed=reviewGate3LedgerBoundPreparationV39(input,ledgerRaw);
  if(!pool||typeof pool.connect!=="function")
    throw Error("GATE3_LEDGER_PREPARE_DB_POOL_REQUIRED");
  const prepared=await prepareGate3CanaryDraftWithPoolV39(pool,{
    icao:reviewed.icao,
    authorizationEvidenceSha256:reviewed.authArtifactSha256,
    canaryCreditCeiling:reviewed.canaryCreditCeiling,
    fixedExposureSeconds:reviewed.fixedExposureSeconds,
    nowUtc:reviewed.nowUtc,
  });
  return {
    ...prepared,status:"SOURCE_PREPARED_LEDGER_MATCH_NOT_PAID_AUTH",
    authArtifactSha256:reviewed.authArtifactSha256,
    independentLedgerHashMatched:true,
    signedOperatorAuthorizationVerifiedHere:false,
    publishedHostCustodyVerifiedHere:false,
    providerAccountInventoryVerifiedHere:false,
    authorizesPaidProviderCalls:false,
  };
}
