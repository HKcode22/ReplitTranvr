import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
 assertP4G5AtomicOriginalBindingScopeV39,
 persistP4G5BoundFidsDbOnlyV39,
 requireP4G5AtomicFidsLiveReleaseV39,
 P4_G5_ATOMIC_FIDS_PRODUCER_RELEASE_SHA_V39,
 P4_G5_V0077_COMMITTED_ATTEMPT_READ_SQL_V39,
 P4_G5_V0077_SOURCE_DB_CLOCK_SQL_V39,
 P4_G5_V0077_INSERT_ORIGINAL_BINDING_SQL_V39,
 P4_G5_V0077_VERIFY_ATOMIC_SOURCE_SQL_V39
} from "../server/lib/disruption/phase4Gate5AtomicBoundSourceV39";

const sha=(x:string)=>x.repeat(64);
const received="2027-01-15T10:00:00.000Z";
const cutoff="2027-01-15T11:00:00.000Z";
const expiry="2027-01-16T06:00:00.000Z";
const qid="11111111-1111-4111-8111-111111111111";
const body=Buffer.from('{"departures":[],"arrivals":[]}');
const bodyHash=createHash("sha256").update(body).digest("hex");
function original(){
 return {
 populationQueryId:qid,
 responseHash:sha("a"),
 sourceAirportIcao:"WSSS",
 queryDirection:"Departure",
 serviceWindowStartUtc:new Date("2027-01-15T17:00:00.000Z"),
 serviceWindowEndUtc:new Date("2027-01-15T18:00:00.000Z"),
 fromLocal:"2027-01-16T01:00",
 toLocal:"2027-01-16T02:00",
 airportIanaTimezone:"Asia/Singapore",
 fidsRetrievalUtc:new Date(received),availableAtUtc:new Date(received),
 providerApiVersion:"1.15.4.0",fidsProtocolVersion:"v3.9-f.8",
 openapiSha256:sha("f"),
 rawPayload:{
  originalDecodedEntityBodyPreserved:true,
  originalHttpWireBytesPreserved:false,
  originalDecodedEntityBodyEvidence:{
   representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
   bodyBase64:body.toString("base64"),
   bodySha256:bodyHash,
   bodyLengthBytes:body.length
  }
 }
 } as any;
}
function binding(){
 return {
 manifestSha256:sha("b"),horizon:"T-6h" as const,
 expectedOwnerGithubRunId:"123456789012",
 reviewedRunAuthorizationSha256:sha("c"),
 queryDigest:sha("d"),expectedReservationSha256:sha("e"),
 rightsReviewArtifactSha256:sha("1"),
 sourceUseExpiresAtUtc:expiry,
 expectedAirportIcao:"WSSS",
 expectedServiceStartUtc:"2027-01-15T17:00:00.000Z",
 expectedServiceEndUtc:"2027-01-15T18:00:00.000Z",
 expectedFromLocal:"2027-01-16T01:00",
 expectedToLocal:"2027-01-16T02:00"
 };
}
function member(){
 return {populationQueryId:qid,responseHash:sha("a"),sourceType:"fids",
  sourceAirportIcao:"WSSS",queryDirection:"Departure",
  windowStartUtc:new Date("2027-01-15T17:00:00.000Z"),
  windowEndUtc:new Date("2027-01-15T18:00:00.000Z")} as any;
}
describe("Gate5 V0077 atomic original producer: fail closed and source contract",()=>{
 it("live producer is unarmed even if caller passes SHA-shaped reviewed manifest",()=>{
  expect(P4_G5_ATOMIC_FIDS_PRODUCER_RELEASE_SHA_V39).toBeNull();
  expect(()=>requireP4G5AtomicFidsLiveReleaseV39(sha("b")))
   .toThrow("P4_G5_V0077_FIDS_LIVE_PRODUCER_NOT_REVIEWED_HOLD");
 });
 it("valid synthetic source is only an admissible candidate, not a rights certificate",()=>{
  expect(()=>assertP4G5AtomicOriginalBindingScopeV39(
   original(),[member()],binding())).not.toThrow();
 });
 it("wrong airport, window, direction and runner identity fail before any DB",()=>{
  for(const [q,rows,b] of [
   [{...original(),queryDirection:"Both"},[member()],binding()],
   [{...original(),sourceAirportIcao:"YSSY"},[member()],binding()],
   [original(),[member()],{...binding(),expectedOwnerGithubRunId:"UNATTESTED"}],
   [original(),[member()],{...binding(),expectedServiceStartUtc:"2027-01-16T17:00:00.000Z"}],
   [original(),[{...member(),responseHash:sha("f")}],binding()],
   [original(),[{...member(),sourceAirportIcao:"YSSY"}],binding()]
  ] as const)
   expect(()=>assertP4G5AtomicOriginalBindingScopeV39(
    q as any,[...rows] as any,b as any)).toThrow();
 });
 it("mismatched/missing original decoded body evidence refuses source",()=>{
  const o=original();
  for(const rawPayload of [
   {...o.rawPayload,originalDecodedEntityBodyPreserved:false},
   {...o.rawPayload,originalDecodedEntityBodyEvidence:{
    ...o.rawPayload.originalDecodedEntityBodyEvidence,bodySha256:sha("f")}},
   {...o.rawPayload,originalDecodedEntityBodyEvidence:{
    ...o.rawPayload.originalDecodedEntityBodyEvidence,bodyBase64:"abc!"}}
  ]){
   expect(()=>assertP4G5AtomicOriginalBindingScopeV39(
    {...original(),rawPayload},[member()],binding())).toThrow();
  }
 });
 it("future source-use expiry beyond technical 24h and malformed receipts refuse",()=>{
  for(const b of [
   {...binding(),sourceUseExpiresAtUtc:"2027-01-17T12:00:00.000Z"},
   {...binding(),sourceUseExpiresAtUtc:"invalid"},
   {...binding(),manifestSha256:"not-a-sha"}
  ])
   expect(()=>assertP4G5AtomicOriginalBindingScopeV39(
    original(),[member()],b as any)).toThrow();
  expect(()=>assertP4G5AtomicOriginalBindingScopeV39(
   {...original(),availableAtUtc:new Date("2027-01-15T09:59:00.000Z")},
   [member()],binding())).toThrow();
 });
 it("V0076 committed owner and readback query is read-only",()=>{
  for(const sql of [P4_G5_V0077_COMMITTED_ATTEMPT_READ_SQL_V39,
   P4_G5_V0077_VERIFY_ATOMIC_SOURCE_SQL_V39])
   expect(sql).not.toMatch(/\\b(?:INSERT|UPDATE|DELETE|GRANT|DROP)\\b/i);
  expect(P4_G5_V0077_COMMITTED_ATTEMPT_READ_SQL_V39)
   .toContain("a.expected_reservation_sha256=$1");
  expect(P4_G5_V0077_COMMITTED_ATTEMPT_READ_SQL_V39)
   .toContain("o.github_run_id=$5");
  expect(P4_G5_V0077_INSERT_ORIGINAL_BINDING_SQL_V39)
   .toContain("clean.phase4_g5_fids_original_binding_v39");
  expect(P4_G5_V0077_SOURCE_DB_CLOCK_SQL_V39)
   .toContain("clock_timestamp()");
 });
});
