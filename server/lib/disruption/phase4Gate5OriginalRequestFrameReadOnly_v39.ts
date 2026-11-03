/**
 * Future Gate5 only: independent READ-ONLY original FIDS request-frame audit.
 *
 * V0076 proves a committed paid-attempt reservation; V0077 links that
 * reservation to a retained original. Neither table by itself validates
 * the original FIDS request's airport/local range/filter flags against the
 * reviewed frozen acquisition grid. This module compares all three.
 *
 * Requires a caller-owned REPEATABLE READ READ ONLY transaction and an
 * independently reviewed/pinned manifest SHA. No HTTP, SQL mutation,
 * provider credentials, original body output, or scientific auto-PASS.
 */
import {createHash} from "node:crypto";
import {draftP4Gate5ThreeHorizonGridV39,
 type P4Gate5GridDraftInputV39,
 type P4Gate5GridHorizonV39} from "./phase4Gate5FrozenGridDraft_v39";
import {verifyCanonicalFidsEnvelopeV39} from "./fidsEnvelopeCanonical_v39";
import {verifyStoredDecodedFidsBodyV39}
 from "./phase4Gate5DecodedFidsReadback_v39";

export const P4_G5_REQUEST_FRAME_SOURCE_SCHEMA_V39 =
 "v39.phase4.gate5-frozen-original-request-frame-audit.v1" as const;
const SHA=/^[0-9a-f]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const H=["T-24h","T-6h","T-90m"] as const;

export interface P4G5OriginalFrameReviewScopeV39 {
 reviewedManifestBytes:string;
 independentlyReviewedManifestSha256:string;
 expectedCohortId:string;
 horizon:P4Gate5GridHorizonV39;
 queryIndex:number;
 populationQueryId:string;
 expectedOwnerGithubRunId?:string;
 readAsOfUtc:string;
}

export interface P4G5OriginalFrameDbV39 {
 query(sql:string,params:readonly unknown[]):Promise<{rows:unknown[]}>;
}

export const P4_G5_ORIGINAL_FRAME_READONLY_SQL_V39=[
 "SELECT b.manifest_sha256,b.query_digest,b.population_query_id,",
 "b.original_response_sha256,b.expected_reservation_sha256,",
 "b.source_use_expires_at_utc,b.bound_at_utc,",
 "a.owner_digest,a.github_run_id,a.physical_attempt_number,",
 "a.committed_at_utc,o.horizon,o.github_run_id AS owner_github_run_id,",
 "q.query_index,q.planned_dispatch_utc,q.hard_latest_dispatch_utc,",
 "q.prediction_cutoff_utc,",
 "s.source_airport_icao,s.query_direction,s.from_local,s.to_local,",
 "s.airport_iana_timezone,s.service_window_start_utc,",
 "s.service_window_end_utc,s.fids_retrieval_utc,s.available_at,",
 "s.response_hash,s.provider_api_version,s.fids_protocol_version,",
 "s.openapi_sha256,s.raw_payload",
 "FROM clean.phase4_g5_fids_original_binding_v39 b",
 "JOIN clean.phase4_g5_fids_physical_attempt_v39 a",
 "ON a.expected_reservation_sha256=b.expected_reservation_sha256",
 "JOIN clean.phase4_g5_fids_allowed_query_v39 q",
 "ON q.query_digest=b.query_digest",
 "AND q.query_digest=a.query_digest",
 "AND q.owner_digest=a.owner_digest",
 "JOIN clean.phase4_g5_fids_physical_owner_v39 o",
 "ON o.owner_digest=a.owner_digest",
 "AND o.github_run_id=a.github_run_id",
 "AND o.manifest_sha256=b.manifest_sha256",
 "JOIN clean.fids_query_response s",
 "ON s.population_query_id=b.population_query_id",
 "WHERE b.manifest_sha256=$1",
 "AND b.query_digest=$2",
 "AND b.population_query_id=$3::uuid",
 "AND s.raw_payload IS NOT NULL",
 "AND s.raw_expired_at_utc IS NULL",
 "AND s.available_at<=$4::timestamptz",
 "AND b.bound_at_utc<=$4::timestamptz",
 "AND b.source_use_expires_at_utc>$4::timestamptz",
 "LIMIT 2"
].join(" ");

function fail(reason:string):never{
 throw Error("P4_G5_ORIGINAL_REQUEST_FRAME_"+reason+"_HOLD");
}
function object(x:unknown):Record<string,unknown>{
 if(x===null||typeof x!=="object"||Array.isArray(x))fail("NONOBJECT");
 return x as Record<string,unknown>;
}
function asUtc(x:unknown,why:string):number{
 const s=x instanceof Date?x.toISOString():x;
 if(typeof s!=="string"||!UTC.test(s))fail("INVALID_UTC_"+why);
 const t=Date.parse(s);
 if(!Number.isFinite(t)||new Date(t).toISOString()!==s)
  fail("INVALID_UTC_"+why);
 return t;
}
function hex(x:unknown):x is string{
 return typeof x==="string"&&SHA.test(x);
}
function digest(parts:string[]){
 return createHash("sha256").update(parts.join("|"),"utf8").digest("hex");
}
function value(obj:Record<string,unknown>,key:string):string{
 const v=obj[key];
 if(typeof v!=="string"||v.length>500)fail("MISSING_FIELD_"+key);
 return v;
}
function sameTime(v:unknown,expected:string,label:string){
 if(asUtc(v,label)!==asUtc(expected,"expected_"+label))fail("TIMING_"+label);
}
function parseReviewedManifest(scope:P4G5OriginalFrameReviewScopeV39){
 if(!scope||typeof scope.reviewedManifestBytes!=="string"||
  scope.reviewedManifestBytes.length>20000||
  !hex(scope.independentlyReviewedManifestSha256)||
  !/^[A-Z][A-Z0-9_-]{7,79}$/.test(scope.expectedCohortId)||
  !H.includes(scope.horizon)||
  !Number.isSafeInteger(scope.queryIndex)||scope.queryIndex<0||
  !UUID.test(scope.populationQueryId)||
  typeof scope.readAsOfUtc!=="string"||
 (scope.expectedOwnerGithubRunId!==undefined&&
  !/^[0-9]{5,25}$/.test(scope.expectedOwnerGithubRunId)))
  fail("INVALID_REVIEW_SCOPE");
 asUtc(scope.readAsOfUtc,"readAsOfUtc");
 if(createHash("sha256").update(scope.reviewedManifestBytes,"utf8")
  .digest("hex")!==scope.independentlyReviewedManifestSha256)
  fail("MANIFEST_BYTES_SHA_MISMATCH");
 let p:unknown;
 try{p=JSON.parse(scope.reviewedManifestBytes);}catch{fail("MANIFEST_JSON");}
 const m=object(p);
 if(scope.reviewedManifestBytes!==JSON.stringify(m,null,2)+"\n"||
  m.cohortId!==scope.expectedCohortId)
  fail("MANIFEST_CANONICAL_OR_COHORT");
 const grid=m.grid as P4Gate5GridDraftInputV39;
 if(!grid||typeof grid!=="object"||Array.isArray(grid))
  fail("MANIFEST_GRID");
 // Reuse the binding Plan's DST, budget, lead, window, flags and timezone
 // rules; no custom second clock interpretation or replay of past grid.
 const drafted=draftP4Gate5ThreeHorizonGridV39(grid);
 const owner=drafted.horizonOwners.find(h=>h.horizon===scope.horizon);
 const slots=drafted.queries.filter(q=>q.horizon===scope.horizon);
 if(!owner||scope.queryIndex>=slots.length||
    owner.queryCount!==slots.length)fail("QUERY_NOT_IN_FROZEN_GRID");
 const q=slots[scope.queryIndex],index=String(scope.queryIndex);
 const manifestSha=scope.independentlyReviewedManifestSha256;
 const queryDigest=digest([
  manifestSha,scope.expectedCohortId,scope.horizon,index,
  q.candidateGridCutoffUtc,q.plannedPhysicalStartUtc,
  q.providerQueryFromLocal,q.providerQueryToLocal
 ]);
 const ownerDigest=digest([
  manifestSha,scope.expectedCohortId,scope.horizon,
  owner.earliestPhysicalStartUtc,owner.latestPhysicalStartUtc,
  String(owner.queryCount)
 ]);
 return {grid,drafted,owner,q,queryDigest,ownerDigest};
}

export function assessP4Gate5OriginalRequestFrameV39(
 scope:P4G5OriginalFrameReviewScopeV39,
 row:unknown
){
 const frame=parseReviewedManifest(scope),r=object(row);
 const expectedManifest=scope.independentlyReviewedManifestSha256;
 if(r.manifest_sha256!==expectedManifest||
    r.query_digest!==frame.queryDigest||
    r.population_query_id!==scope.populationQueryId||
    r.owner_digest!==frame.ownerDigest||
    r.horizon!==scope.horizon||
    r.query_index!==scope.queryIndex||
    r.github_run_id!==r.owner_github_run_id||
    (scope.expectedOwnerGithubRunId!==undefined&&
     r.github_run_id!==scope.expectedOwnerGithubRunId)||
    !/^[0-9]{5,25}$/.test(value(r,"github_run_id")))
  fail("V0076_V0077_OWNER_QUERY_OR_MANIFEST_MISMATCH");
 const attempt=r.physical_attempt_number;
 if(!Number.isSafeInteger(attempt)||Number(attempt)<1||
    Number(attempt)>frame.grid.maxAttemptsPerQuery||
    r.expected_reservation_sha256!==digest([
     expectedManifest,frame.ownerDigest,frame.queryDigest,String(attempt)
    ]))
  fail("PHYSICAL_RESERVATION_MISMATCH");
 sameTime(r.planned_dispatch_utc,frame.q.plannedPhysicalStartUtc,"planned");
 sameTime(r.prediction_cutoff_utc,frame.q.candidateGridCutoffUtc,"cutoff");
 const cutoff=asUtc(r.prediction_cutoff_utc,"cutoff");
 const latest=asUtc(r.hard_latest_dispatch_utc,"latest");
 const planned=asUtc(r.planned_dispatch_utc,"planned");
 const committed=asUtc(r.committed_at_utc,"committed");
 const observed=asUtc(r.fids_retrieval_utc,"retrieved");
 const available=asUtc(r.available_at,"available");
 const bound=asUtc(r.bound_at_utc,"bound");
 const expires=asUtc(r.source_use_expires_at_utc,"expires");
 const read=asUtc(scope.readAsOfUtc,"readAsOfUtc");
 if(planned>committed||committed>latest||
    latest>cutoff-15*60000||
    observed<committed||available<observed||available>cutoff||
    bound<available||bound>read||expires<=read||
    read<available)
  fail("ASOF_OR_RETENTION_CLOCK");
 const g=frame.grid;
 if(r.source_airport_icao!==g.airportIcao||
    r.query_direction!=="Departure"||
    r.airport_iana_timezone!==g.airportIanaTimezone||
    r.from_local!==frame.q.providerQueryFromLocal||
    r.to_local!==frame.q.providerQueryToLocal)
  fail("ORIGINAL_PROVIDER_QUERY_SCOPE");
 sameTime(r.service_window_start_utc,g.serviceWindowStartUtc,"windowStart");
 sameTime(r.service_window_end_utc,g.serviceWindowEndUtc,"windowEnd");
 const contract=object(object(r.raw_payload).fidsRequestContract);
 const required:Record<string,unknown>={
  schema:"v39.fids-request-frame.application-intent.v1",
  endpointKind:"airport_local_fids",
  airportIcao:g.airportIcao,
  fromLocal:frame.q.providerQueryFromLocal,
  toLocal:frame.q.providerQueryToLocal,
  direction:"Departure",withLeg:true,withCancelled:true,
  withCodeshared:true,withCargo:false,withPrivate:false,
  withLocation:false,
  originalHttpBytesPreserved:false,
  sourceTransportRequestReceiptVerified:false,
  providerApiVersion:r.provider_api_version,
  fidsProtocolVersion:r.fids_protocol_version,
  openapiSha256:r.openapi_sha256
 };
 if(!hex(r.openapi_sha256)||!value(r,"provider_api_version")||
    !value(r,"fids_protocol_version"))
  fail("UNPINNED_SOURCE_CONTRACT_VERSION");
 for(const [k,v] of Object.entries(required))
  if(contract[k]!==v)fail("SOURCE_CONTRACT_FIELD_"+k);
 if(!hex(r.response_hash)||r.response_hash!==r.original_response_sha256)
  fail("ORIGINAL_HASH_V0077_PARITY");
 if(verifyCanonicalFidsEnvelopeV39(r.raw_payload)!=="verified"||
    verifyStoredDecodedFidsBodyV39({
     payload:r.raw_payload,persisted_response_hash:r.response_hash
    })!=="verified")
  fail("RAW_DECODED_BODY_OR_ENVELOPE_PARITY");

 // This report contains NO source rows, request local timestamps, flight IDs,
 // provider payloads, base64, or other reconstructable provider Contents.
 return {
  schema:P4_G5_REQUEST_FRAME_SOURCE_SCHEMA_V39,
  status:"ORIGINAL_AND_FROZEN_REQUEST_APPLICATION_INTENT_MATCH_NOT_HTTP_CERTIFIED" as const,
  manifestSha256:expectedManifest,queryDigest:frame.queryDigest,
  horizon:scope.horizon,queryIndex:scope.queryIndex,
  originalSourceBodyReadbackMatched:true as const,
  originalStoredRequestFrameMatched:true as const,
  originalLinkedToCommittedV0076Attempt:true as const,
  independentManifestGitHubPinAuthenticated:false as const,
  independentGitHubPaidOwnerAttested:false as const,
  independentProviderTransportOriginAuthenticated:false as const,
  perRecordNativeSelectedTCertified:false as const,
  perRecordWheelsOffActualOnlyCertified:false as const,
  retainedSourceLegalRightsCertified:false as const,
  uniqueOperatingFlightDenominatorCertified:false as const,
  persistedPREAsOfCertified:false as const,
  strictGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}

/** A missing, expired or unproven source is UNKNOWN/HOLD, never zero. */
export async function readP4Gate5OriginalRequestFrameV39(
 db:P4G5OriginalFrameDbV39,
 scope:P4G5OriginalFrameReviewScopeV39
){
 const frame=parseReviewedManifest(scope);
 const result=await db.query(P4_G5_ORIGINAL_FRAME_READONLY_SQL_V39,[
  scope.independentlyReviewedManifestSha256,frame.queryDigest,
  scope.populationQueryId,scope.readAsOfUtc
 ]);
 if(!result||!Array.isArray(result.rows)||result.rows.length>1)
  fail("DUPLICATE_OR_MALFORMED_READBACK");
 if(result.rows.length===0)
  return {
   schema:P4_G5_REQUEST_FRAME_SOURCE_SCHEMA_V39,
   status:"ORIGINAL_SOURCE_BINDING_MISSING_EXPIRED_OR_UNMEASURABLE" as const,
   manifestSha256:scope.independentlyReviewedManifestSha256,
   queryDigest:frame.queryDigest,
   originalSourceBodyReadbackMatched:null,
   originalStoredRequestFrameMatched:null,
   strictGate5Passed:false as const,
   phase5FreezeAuthorized:false as const,
   phase6Authorized:false as const,
   providerCalls:0 as const,databaseWrites:0 as const
  };
 return assessP4Gate5OriginalRequestFrameV39(scope,result.rows[0]);
}
