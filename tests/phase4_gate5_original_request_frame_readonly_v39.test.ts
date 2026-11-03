import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {addCanonicalFidsEnvelopeHashV39}
 from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {draftP4Gate5ThreeHorizonGridV39,
 type P4Gate5GridDraftInputV39}
 from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";
import {
 assessP4Gate5OriginalRequestFrameV39,
 readP4Gate5OriginalRequestFrameV39,
 P4_G5_ORIGINAL_FRAME_READONLY_SQL_V39
} from "../server/lib/disruption/phase4Gate5OriginalRequestFrameReadOnly_v39";
type Row=Record<string,any>;
const hash=(text:string)=>createHash("sha256").update(text).digest("hex");
const digest=(...parts:string[])=>hash(parts.join("|"));
const grid=():P4Gate5GridDraftInputV39=>({
 airportIcao:"WSSS",airportIanaTimezone:"Asia/Singapore",
 serviceWindowStartUtc:"2026-11-06T17:00:00.000Z",
 serviceWindowEndUtc:"2026-11-06T18:00:00.000Z",
 assignmentFrozenAtUtc:"2026-11-05T10:00:00.000Z",
 acquisitionGuardMinutes:20,refreshCadenceMinutes:30,
 maxStalenessMinutes:45,githubPrearmLeadMinutes:60,
 apiUnitsPerPhysicalAttempt:2,maxAttemptsPerQuery:1,
 projectRestApiUnitsBudget:18,maxSourceQueries:9
});
const UUID="b00bb00b-0000-4000-8000-000000000077";
function fixture(){
 const cohortId="WSSS_FUTURE_FRAME_CI";
 const g=grid(),bytes=JSON.stringify({cohortId,grid:g},null,2)+"\n";
 const manifestSha=hash(bytes),draft=draftP4Gate5ThreeHorizonGridV39(g);
 const h="T-24h" as const,index=0;
 const q=draft.queries.filter(x=>x.horizon===h)[index];
 const owner=draft.horizonOwners.find(x=>x.horizon===h)!;
 const ownerDigest=digest(manifestSha,cohortId,h,
  owner.earliestPhysicalStartUtc,owner.latestPhysicalStartUtc,
  String(owner.queryCount));
 const queryDigest=digest(manifestSha,cohortId,h,String(index),
  q.candidateGridCutoffUtc,q.plannedPhysicalStartUtc,
  q.providerQueryFromLocal,q.providerQueryToLocal);
 const reservation=digest(manifestSha,ownerDigest,queryDigest,"1");
 const at=(ms:number)=>new Date(Date.parse(q.plannedPhysicalStartUtc)+ms).toISOString();
 const body=Buffer.from('{"departures":[],"arrivals":[]}');
 const raw=addCanonicalFidsEnvelopeHashV39({
  departures:[],arrivals:[],
  payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",
  originalHttpWireBytesPreserved:false,
  originalDecodedEntityBodyPreserved:true,
  originalDecodedEntityBodyEvidence:{
   schema:"v39.fids-fetch-decoded-source-body.v1",
   representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
   bodyLengthBytes:body.length,bodySha256:hash(body.toString("utf8")),
   bodyBase64:body.toString("base64")
  },
  fidsRequestContract:{
   schema:"v39.fids-request-frame.application-intent.v1",
   endpointKind:"airport_local_fids",airportIcao:"WSSS",
   fromLocal:q.providerQueryFromLocal,toLocal:q.providerQueryToLocal,
   direction:"Departure",withLeg:true,withCancelled:true,
   withCodeshared:true,withCargo:false,withPrivate:false,
   withLocation:false,
   originalHttpBytesPreserved:false,
   sourceTransportRequestReceiptVerified:false,
   providerApiVersion:"1.15.4.0",fidsProtocolVersion:"v3.9-f.8",
   openapiSha256:"a".repeat(64)
  }
 });
 const sourceSha="b".repeat(64);
 const scope={
  reviewedManifestBytes:bytes,independentlyReviewedManifestSha256:manifestSha,
  expectedCohortId:cohortId,horizon:h,queryIndex:index,
  populationQueryId:UUID,readAsOfUtc:at(60000)
 };
 const row:Row={
  manifest_sha256:manifestSha,query_digest:queryDigest,
  population_query_id:UUID,original_response_sha256:sourceSha,
  expected_reservation_sha256:reservation,source_use_expires_at_utc:at(86400000),
  bound_at_utc:at(40000),owner_digest:ownerDigest,
  github_run_id:"12345678",owner_github_run_id:"12345678",
  physical_attempt_number:1,committed_at_utc:at(5000),
  horizon:h,query_index:index,
  planned_dispatch_utc:q.plannedPhysicalStartUtc,
  hard_latest_dispatch_utc:new Date(Date.parse(q.candidateGridCutoffUtc)-15*60000).toISOString(),
  prediction_cutoff_utc:q.candidateGridCutoffUtc,
  source_airport_icao:"WSSS",query_direction:"Departure",
  from_local:q.providerQueryFromLocal,to_local:q.providerQueryToLocal,
  airport_iana_timezone:"Asia/Singapore",
  service_window_start_utc:g.serviceWindowStartUtc,
  service_window_end_utc:g.serviceWindowEndUtc,
  fids_retrieval_utc:at(10000),available_at:at(35000),
  response_hash:sourceSha,provider_api_version:"1.15.4.0",
  fids_protocol_version:"v3.9-f.8",openapi_sha256:"a".repeat(64),
  raw_payload:raw
 };
 return {scope,row};
}
function altered(t:(r:Row)=>void){
 const x=fixture(),r:Row=JSON.parse(JSON.stringify(x.row));
 t(r);return {scope:x.scope,row:r};
}
function rehashRaw(row:Row){
 const raw:Row={...row.raw_payload};
 delete raw.canonicalEnvelopeSha256;
 delete raw.canonicalEnvelopeHashSchema;
 row.raw_payload=addCanonicalFidsEnvelopeHashV39(raw);
}
function db(rows:unknown[]){
 return {query:vi.fn(async(sql:string,params:readonly unknown[])=>{
  expect(sql).toBe(P4_G5_ORIGINAL_FRAME_READONLY_SQL_V39);
  expect(params).toHaveLength(4);
  return {rows};
 })};
}
describe("Phase4 future frozen grid ↔ V0076/V0077 ↔ retained original FIDS request verification",()=>{
 it("checks exact original body, manifest, owner, physical attempt and all FIDS flags without source output",()=>{
  const {scope,row}=fixture();
  const result=assessP4Gate5OriginalRequestFrameV39(scope,row);
  expect(result.status)
   .toBe("ORIGINAL_AND_FROZEN_REQUEST_APPLICATION_INTENT_MATCH_NOT_HTTP_CERTIFIED");
  expect(result.originalStoredRequestFrameMatched).toBe(true);
  expect(result.originalSourceBodyReadbackMatched).toBe(true);
  expect(result.originalLinkedToCommittedV0076Attempt).toBe(true);
  expect(result.manifestSha256).toBe(scope.independentlyReviewedManifestSha256);
  for(const flag of [
   "independentManifestGitHubPinAuthenticated",
   "independentGitHubPaidOwnerAttested",
   "independentProviderTransportOriginAuthenticated",
   "perRecordNativeSelectedTCertified",
   "perRecordWheelsOffActualOnlyCertified",
   "retainedSourceLegalRightsCertified",
   "uniqueOperatingFlightDenominatorCertified",
   "persistedPREAsOfCertified","strictGate5Passed",
   "phase5FreezeAuthorized","phase6Authorized"
  ] as const) expect(result[flag]).toBe(false);
  expect(result.providerCalls).toBe(0);
  expect(result.databaseWrites).toBe(0);
  const printable=JSON.stringify(result);
  for(const secret of ["bodyBase64","departures","fidsRequestContract",
   "WSSS_FUTURE_FRAME_CI","2026-11-06T17:00","12345678"])
   expect(printable).not.toContain(secret);
 });
 it("does one read-only bound query; missing source is UNKNOWN rather than zero",async()=>{
  const {scope,row}=fixture(),good=db([row]);
  const r=await readP4Gate5OriginalRequestFrameV39(good,scope);
  expect(r.status).toContain("ORIGINAL_AND_FROZEN_REQUEST");
  expect(good.query).toHaveBeenCalledTimes(1);
  expect(good.query.mock.calls[0][1]).toEqual([
   scope.independentlyReviewedManifestSha256,row.query_digest,
   scope.populationQueryId,scope.readAsOfUtc
  ]);
  const missing=await readP4Gate5OriginalRequestFrameV39(db([]),scope);
  expect(missing.status).toBe("ORIGINAL_SOURCE_BINDING_MISSING_EXPIRED_OR_UNMEASURABLE");
  expect(missing.originalSourceBodyReadbackMatched).toBeNull();
  expect(missing.strictGate5Passed).toBe(false);
  await expect(readP4Gate5OriginalRequestFrameV39(db([row,row]),scope))
   .rejects.toThrow("P4_G5_ORIGINAL_REQUEST_FRAME_DUPLICATE");
 });
 it("rejects wrong manifest blob, replayed cohort, grid and mismatched query slot",()=>{
  const {scope,row}=fixture();
  for(const changed of [
   {...scope,independentlyReviewedManifestSha256:"f".repeat(64)},
   {...scope,expectedCohortId:"OTHER_FUTURE_COHORT"},
   {...scope,queryIndex:2},
   {...scope,horizon:"T-6h" as const},
   {...scope,reviewedManifestBytes:scope.reviewedManifestBytes.trim()},
   {...scope,readAsOfUtc:"2026-11-06T10:00:00.000Z"},
   {...scope,populationQueryId:"invalid"}
  ])expect(()=>assessP4Gate5OriginalRequestFrameV39(changed,row)).toThrow();
 });
 it("rejects forged V0076 attempt and V0077 reference, not merely labels",()=>{
  const changes=[
   (r:Row)=>{r.manifest_sha256="f".repeat(64);},
   (r:Row)=>{r.query_digest="f".repeat(64);},
   (r:Row)=>{r.owner_digest="f".repeat(64);},
   (r:Row)=>{r.expected_reservation_sha256="f".repeat(64);},
   (r:Row)=>{r.physical_attempt_number=2;},
   (r:Row)=>{r.github_run_id="99999999";},
   (r:Row)=>{r.query_index=1;},
   (r:Row)=>{r.planned_dispatch_utc="2026-11-05T16:46:00.000Z";},
   (r:Row)=>{r.prediction_cutoff_utc="2026-11-05T17:01:00.000Z";},
   (r:Row)=>{r.committed_at_utc="2026-11-05T16:44:00.000Z";},
   (r:Row)=>{r.hard_latest_dispatch_utc="2026-11-05T17:10:00.000Z";},
   (r:Row)=>{r.response_hash="f".repeat(64);},
   (r:Row)=>{r.original_response_sha256="f".repeat(64);}
  ];
  for(const change of changes){
   const x=altered(change);
   expect(()=>assessP4Gate5OriginalRequestFrameV39(x.scope,x.row))
    .toThrow(/P4_G5_ORIGINAL_REQUEST_FRAME_.*_HOLD/);
  }
 });
 it("rejects original source wrong airport, range, timezone and changed filter flags",()=>{
  const changes=[
   (r:Row)=>{r.source_airport_icao="YSSY";},
   (r:Row)=>{r.query_direction="Arrival";},
   (r:Row)=>{r.from_local="2026-11-07T02:00";},
   (r:Row)=>{r.to_local="2026-11-07T03:00";},
   (r:Row)=>{r.service_window_start_utc="2026-11-06T18:00:00.000Z";},
   (r:Row)=>{r.service_window_end_utc="2026-11-06T19:00:00.000Z";},
   (r:Row)=>{r.airport_iana_timezone="UTC";},
   (r:Row)=>{r.raw_payload.fidsRequestContract.airportIcao="YSSY";rehashRaw(r);},
   (r:Row)=>{r.raw_payload.fidsRequestContract.fromLocal="2026-11-07T02:00";rehashRaw(r);},
   (r:Row)=>{r.raw_payload.fidsRequestContract.withLeg=false;rehashRaw(r);},
   (r:Row)=>{r.raw_payload.fidsRequestContract.withCodeshared=false;rehashRaw(r);},
   (r:Row)=>{r.raw_payload.fidsRequestContract.withCancelled=false;rehashRaw(r);},
   (r:Row)=>{r.raw_payload.fidsRequestContract.withCargo=true;rehashRaw(r);},
   (r:Row)=>{r.raw_payload.fidsRequestContract.withPrivate=true;rehashRaw(r);},
   (r:Row)=>{r.raw_payload.fidsRequestContract.withLocation=true;rehashRaw(r);},
   (r:Row)=>{r.raw_payload.fidsRequestContract.direction="Both";rehashRaw(r);},
   (r:Row)=>{r.raw_payload.fidsRequestContract.openapiSha256="f".repeat(64);rehashRaw(r);}
  ];
  for(const change of changes){
   const x=altered(change);
   expect(()=>assessP4Gate5OriginalRequestFrameV39(x.scope,x.row)).toThrow();
  }
 });
 it("rejects expired/backdated and post-cutoff originals, unavailable/forged bytes",()=>{
  const changes=[
   (r:Row)=>{r.source_use_expires_at_utc="2026-11-05T16:45:30.000Z";},
   (r:Row)=>{r.available_at="2026-11-05T17:01:00.000Z";},
   (r:Row)=>{r.fids_retrieval_utc="2026-11-05T16:44:00.000Z";},
   (r:Row)=>{r.bound_at_utc="2026-11-05T16:45:10.000Z";},
   (r:Row)=>{r.raw_payload.departures=[{number:"FAKE"}];rehashRaw(r);},
   (r:Row)=>{r.raw_payload.originalDecodedEntityBodyEvidence.bodySha256="f".repeat(64);rehashRaw(r);},
   (r:Row)=>{delete r.raw_payload.canonicalEnvelopeSha256;
     delete r.raw_payload.canonicalEnvelopeHashSchema;},
   (r:Row)=>{r.raw_payload.fidsRequestContract.sourceTransportRequestReceiptVerified=true;rehashRaw(r);},
   (r:Row)=>{r.raw_payload.fidsRequestContract.originalHttpBytesPreserved=true;rehashRaw(r);}
  ];
  for(const change of changes){
   const x=altered(change);
   expect(()=>assessP4Gate5OriginalRequestFrameV39(x.scope,x.row)).toThrow();
  }
 });
 it("never modifies original paid collection or claims source auth/legal rights",()=>{
  const sql=P4_G5_ORIGINAL_FRAME_READONLY_SQL_V39;
  for(const part of ["clean.phase4_g5_fids_original_binding_v39",
   "clean.phase4_g5_fids_physical_attempt_v39",
   "clean.phase4_g5_fids_allowed_query_v39",
   "clean.phase4_g5_fids_physical_owner_v39",
   "clean.fids_query_response","s.raw_expired_at_utc IS NULL",
   "b.source_use_expires_at_utc>$4","LIMIT 2"])
    expect(sql).toContain(part);
  expect(sql).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bALTER\b/i);
  const src=readFileSync(
   "server/lib/disruption/phase4Gate5OriginalRequestFrameReadOnly_v39.ts","utf8");
  for(const bad of ["fetch(","process.env","AERODATABOX_API_KEY","RAPIDAPI_KEY",
   "new pg.Client","INSERT INTO","COMMIT","SECURITY DEFINER"])
   expect(src).not.toContain(bad);
  expect(src).toContain("independentProviderTransportOriginAuthenticated:false");
  expect(src).toContain("retainedSourceLegalRightsCertified:false");
  expect(src).toContain("perRecordWheelsOffActualOnlyCertified:false");
  const hold=JSON.parse(readFileSync(
   "data-collection/phase4/GATE5_NEXT_FROZEN_COHORT_READONLY_AUDIT_HOLD.json","utf8"));
  expect(hold.mode).toBe("HOLD_NO_REVIEWED_NEXT_COHORT");
  expect(hold.providerCallsAuthorized).toBe(false);
  expect(hold.databaseWritesAuthorized).toBe(false);
 });
});
