/**
 * Phase4 Gate5: retrospective verification of prospectively retained
 * fetch-decoded FIDS response-body bytes (PR #268). This is a READ-ONLY,
 * bounded *local storage consistency* audit, not an HTTP transport receipt.
 *
 * It never verifies the provider's per-flight actual-vs-estimate semantics,
 * independently signed origin, or historical PRE eligibility. Do not log
 * source arrays, flight identifiers, raw body, base64, or SQL row objects.
 */
import {createHash} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import {verifyCanonicalFidsEnvelopeV39} from "./fidsEnvelopeCanonical_v39";

export const P4_FIDS_READBACK_SCHEMA_V39 =
  "v39.phase4.fids-decoded-body-readback.v1" as const;
export const P4_FIDS_READBACK_MAX_RECORDS = 4;
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const HEX64 = /^[a-f0-9]{64}$/;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const UTC = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;

export const P4_FIDS_DECODED_READBACK_SQL_V39 = [
  "SELECT raw_payload AS payload, response_hash AS persisted_response_hash",
  "FROM clean.fids_query_response",
  "WHERE source_airport_icao=$1 AND available_at<=$2::timestamptz",
  "AND raw_expired_at_utc IS NULL AND raw_payload IS NOT NULL",
  "ORDER BY available_at DESC, population_query_id DESC",
  "LIMIT 5"
].join(" ");

export interface P4FidsReadbackDb {
  query(sql:string,params:readonly unknown[]):Promise<{rows:unknown[]}>;
}
export interface P4FidsReadbackScope {
  airport:string;
  readAsOfUtc:string;
}
export type P4FidsBodyReadbackStatus =
  | "NO_RETAINED_SOURCE_UNMEASURABLE"
  | "LEGACY_ONLY_DECODED_BODY_UNVERIFIED"
  | "BOUNDED_SAMPLE_INTEGRITY_VERIFIED_NOT_SOURCE_AUTHENTICITY"
  | "READBACK_INTEGRITY_FAILURE_HOLD";
export interface P4FidsReadbackReport {
  schema:typeof P4_FIDS_READBACK_SCHEMA_V39;
  status:P4FidsBodyReadbackStatus;
  sampled:number;
  bodyShaAndDecodedArraysVerified:number;
  bodyAndEnvelopeShaVerified:number;
  bodyWithoutEnvelopeHash:number;
  legacyWithoutBodyEvidence:number;
  rejectedIntegrity:number;
  moreRetainedRowsBeyondSample:boolean;
  entirePopulationVerified:false;
  independentProviderHttpOriginCertified:false;
  originalHttpWireBytesCertified:false;
  persistedWrapperHashRecomputed:false;
  scheduledPassengerScopeCertified:false;
  actualDepartureMilestoneCertified:false;
  strictGate5Passed:false;
  phase6Authorized:false;
  providerCalls:0;
  databaseWrites:0;
}
type Verdict="verified"|"legacy"|"rejected";
function obj(x:unknown):Record<string,unknown>|null {
  return x!==null && typeof x==="object" && !Array.isArray(x)
    ? x as Record<string,unknown> : null;
}
function sha(b:Buffer):string{return createHash("sha256").update(b).digest("hex");}

export function verifyStoredDecodedFidsBodyV39(value:unknown):Verdict {
  const row=obj(value);
  const raw=obj(row?.payload);
  if(!raw || !HEX64.test(String(row?.persisted_response_hash ?? "")))
    return "rejected";
  if(raw.payloadRepresentation!=="RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES" ||
     raw.originalHttpWireBytesPreserved!==false ||
     !Array.isArray(raw.departures) || !Array.isArray(raw.arrivals))
    return "rejected";
  // Additional checksum covers the entire persisted source envelope, not
  // merely the original decoded provider response-body bytes. Historical
  // pre-hash rows remain explicitly unverified for envelope custody.
  if(verifyCanonicalFidsEnvelopeV39(raw)==="rejected")return "rejected";
  const flag=raw.originalDecodedEntityBodyPreserved;
  const evidence=raw.originalDecodedEntityBodyEvidence;
  if(flag===false && evidence===null) return "legacy";
  if(flag!==true) return "rejected";
  const e=obj(evidence);
  if(!e ||
     e.schema!=="v39.fids-fetch-decoded-source-body.v1" ||
     e.representation!=="FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE" ||
     !Number.isSafeInteger(e.bodyLengthBytes) ||
     Number(e.bodyLengthBytes)<1 || Number(e.bodyLengthBytes)>MAX_BODY_BYTES ||
     typeof e.bodyBase64!=="string" || !BASE64.test(e.bodyBase64) ||
     typeof e.bodySha256!=="string" || !HEX64.test(e.bodySha256))
    return "rejected";
  const body=Buffer.from(e.bodyBase64,"base64");
  if(body.length!==e.bodyLengthBytes ||
     body.toString("base64")!==e.bodyBase64 ||
     sha(body)!==e.bodySha256) return "rejected";
  let decoded:unknown;
  try {
    // UTF-8 round-trip check disallows replacement-character normalization.
    const text=body.toString("utf8");
    if(!Buffer.from(text,"utf8").equals(body))return "rejected";
    decoded=JSON.parse(text);
  } catch {return "rejected";}
  const original=obj(decoded), request=obj(raw.fidsRequestContract);
  if(!original || !request ||
     !["Departure","Arrival","Both"].includes(String(request.direction)))
    return "rejected";
  if(request.direction!=="Arrival" && !Array.isArray(original.departures))
    return "rejected";
  if(request.direction!=="Departure" && !Array.isArray(original.arrivals))
    return "rejected";
  // PostgreSQL JSONB may reorder object properties; compare semantic JSON
  // objects, while preserving array order and exact raw body bytes + SHA.
  if(!isDeepStrictEqual(Array.isArray(original.departures)?original.departures:[], raw.departures) ||
     !isDeepStrictEqual(Array.isArray(original.arrivals)?original.arrivals:[], raw.arrivals))
    return "rejected";
  return "verified";
}

export async function auditStoredDecodedFidsReadbackV39(
  db:P4FidsReadbackDb, scope:P4FidsReadbackScope
):Promise<P4FidsReadbackReport>{
  if(!scope || !/^[A-Z]{4}$/.test(scope.airport) ||
     typeof scope.readAsOfUtc!=="string" || !UTC.test(scope.readAsOfUtc) ||
     !Number.isFinite(Date.parse(scope.readAsOfUtc)) ||
     new Date(scope.readAsOfUtc).toISOString()!==scope.readAsOfUtc)
    throw Error("P4_FIDS_READBACK_BAD_SCOPE");
  // One fixed, parameterized SELECT. All calls must use a caller-owned
  // read-only repeatable-read transaction. SQL excludes expired content.
  const result=await db.query(P4_FIDS_DECODED_READBACK_SQL_V39,
    [scope.airport,scope.readAsOfUtc]);
  if(!result || !Array.isArray(result.rows) ||
     result.rows.length>P4_FIDS_READBACK_MAX_RECORDS+1)
    throw Error("P4_FIDS_READBACK_UNBOUNDED_RESULT");
  const rows=result.rows.slice(0,P4_FIDS_READBACK_MAX_RECORDS);
  let verified=0,envelopeVerified=0,bodyOnly=0,legacy=0,rejected=0;
  for(const r of rows){
    const verdict=verifyStoredDecodedFidsBodyV39(r);
    if(verdict==="verified"){
      verified++;
      const raw=obj(obj(r)?.payload);
      if(verifyCanonicalFidsEnvelopeV39(raw)==="verified")envelopeVerified++;
      else bodyOnly++;
    }else if(verdict==="legacy")legacy++;
    else rejected++;
  }
  const status:P4FidsBodyReadbackStatus=rejected>0
    ?"READBACK_INTEGRITY_FAILURE_HOLD"
    :rows.length===0?"NO_RETAINED_SOURCE_UNMEASURABLE"
    :verified===0?"LEGACY_ONLY_DECODED_BODY_UNVERIFIED"
    :"BOUNDED_SAMPLE_INTEGRITY_VERIFIED_NOT_SOURCE_AUTHENTICITY";
  return {
    schema:P4_FIDS_READBACK_SCHEMA_V39,status,sampled:rows.length,
    bodyShaAndDecodedArraysVerified:verified,
    bodyAndEnvelopeShaVerified:envelopeVerified,
    bodyWithoutEnvelopeHash:bodyOnly,
    legacyWithoutBodyEvidence:legacy,rejectedIntegrity:rejected,
    moreRetainedRowsBeyondSample:result.rows.length>P4_FIDS_READBACK_MAX_RECORDS,
    entirePopulationVerified:false,
    independentProviderHttpOriginCertified:false,
    originalHttpWireBytesCertified:false,
    persistedWrapperHashRecomputed:false,
    scheduledPassengerScopeCertified:false,
    actualDepartureMilestoneCertified:false,
    strictGate5Passed:false,phase6Authorized:false,
    providerCalls:0,databaseWrites:0,
  };
}
