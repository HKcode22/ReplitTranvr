import {createHash} from "node:crypto";
import {describe,expect,it,vi} from "vitest";
import {fetchFidsAirport} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {fetchFidsPopulation} from "../server/lib/disruption/fidsCensus_v3";
import {canonicalEnvelopeSha256V39,verifyCanonicalFidsEnvelopeV39}
 from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {auditStoredDecodedFidsReadbackV39,verifyStoredDecodedFidsBodyV39,
 P4_FIDS_DECODED_READBACK_SQL_V39}
 from "../server/lib/disruption/phase4Gate5DecodedFidsReadback_v39";

const scope={airport:"WSSS",readAsOfUtc:"2026-10-30T01:00:00.000Z"};
const params={
 airportIcao:"WSSS",fromLocal:"2026-10-31T08:00",toLocal:"2026-10-31T12:00",
 ianaTimezone:"Asia/Singapore",withCancelled:true,withCodeshared:true,
 withCargo:false,withPrivate:false,direction:"Departure" as const,
 serviceWindowStartUtc:new Date("2026-10-31T00:00:00Z"),
 serviceWindowEndUtc:new Date("2026-10-31T04:00:00Z"),
 cutoffUtc:new Date("2026-10-30T00:00:00Z"),
 providerApiVersion:"1.15.4.0",fidsProtocolVersion:"v3.9-f.8",
 openapiSha256:"a".repeat(64)
};
const bodyString=' {\n"departures":[{"number":"SQ100","departure":{"scheduledTime":{"utc":"2026-10-31T01:00:00Z"},"airport":{"icao":"WSSS"}},"arrival":{"airport":{"icao":"YSSY"}},"codeshareStatus":1,"isCargo":false}],"arrivals":[]} ';
const body=Buffer.from(bodyString,"utf8");

async function genuine(){
 const fetchImpl=vi.fn(async()=>new Response(body,{status:200}));
 const captured=await fetchFidsAirport("WSSS",params.fromLocal,params.toLocal,{
  direction:"Departure",strictDepartureList:true,
  budgetOwner:{reserve:async()=>undefined},
  fetchImpl:fetchImpl as typeof fetch
 });
 const persist=vi.fn(async(_q:any,_rows:any[])=>1);
 await fetchFidsPopulation(params,{fetchAirport:async()=>captured,persist,
  now:()=>new Date("2026-10-30T00:00:00.000Z")});
 const query=persist.mock.calls[0][0];
 return {payload:query.rawPayload,persisted_response_hash:query.responseHash};
}
function reader(rows:unknown[]){
 const query=vi.fn(async(sql:string,params:readonly unknown[])=>{
  expect(sql).toBe(P4_FIDS_DECODED_READBACK_SQL_V39);
  expect(params).toEqual(["WSSS",scope.readAsOfUtc]);
  return {rows};
 });
 return {query};
}
describe("Phase4 FIDS decoded-body retained readback, offline only",()=>{
 it("validates byte SHA and normalized source arrays after FIDS gateway->atomic persistence handoff",async()=>{
  const row=await genuine();
  expect(verifyStoredDecodedFidsBodyV39(row)).toBe("verified");
  const r=await auditStoredDecodedFidsReadbackV39(reader([row]),scope);
  expect(r).toMatchObject({
   status:"BOUNDED_SAMPLE_INTEGRITY_VERIFIED_NOT_SOURCE_AUTHENTICITY",
   sampled:1,bodyShaAndDecodedArraysVerified:1,
   bodyAndEnvelopeShaVerified:1,bodyWithoutEnvelopeHash:0,
   legacyWithoutBodyEvidence:0,rejectedIntegrity:0,
   entirePopulationVerified:false,independentProviderHttpOriginCertified:false,
   originalHttpWireBytesCertified:false,persistedWrapperHashRecomputed:false,
   scheduledPassengerScopeCertified:false,actualDepartureMilestoneCertified:false,
   strictGate5Passed:false,phase6Authorized:false,providerCalls:0,databaseWrites:0
  });
 });
 it("preserves source equality when JSONB reorders stored object keys",async()=>{
  const row=await genuine();
  const payload=row.payload as any;
  const first=payload.departures[0];
  payload.departures=[Object.fromEntries(Object.entries(first).reverse())];
  expect(JSON.stringify(payload.departures)).not.toBe(
   JSON.stringify(JSON.parse(bodyString).departures));
  expect(verifyStoredDecodedFidsBodyV39(row)).toBe("verified");
 });
 it("canonical envelope survives JSONB object key reordering, but not source metadata mutation",async()=>{
  const row=await genuine(),raw=row.payload as any;
  expect(verifyCanonicalFidsEnvelopeV39(raw)).toBe("verified");
  expect(raw.canonicalEnvelopeSha256).toBe(canonicalEnvelopeSha256V39(raw));
  // Storage may reorder keys even inside request contract or arrays.
  raw.fidsRequestContract=Object.fromEntries(
    Object.entries(raw.fidsRequestContract).reverse());
  raw.departures[0]=Object.fromEntries(
    Object.entries(raw.departures[0]).reverse());
  expect(verifyCanonicalFidsEnvelopeV39(raw)).toBe("verified");
  expect(verifyStoredDecodedFidsBodyV39(row)).toBe("verified");
  raw.fidsRequestContract.withCancelled=false;
  expect(verifyCanonicalFidsEnvelopeV39(raw)).toBe("rejected");
  expect(verifyStoredDecodedFidsBodyV39(row)).toBe("rejected");
 });
 it("historical body-only source is never counted as envelope-verified",async()=>{
  const row=await genuine(),raw=row.payload as any;
  delete raw.canonicalEnvelopeSha256;
  delete raw.canonicalEnvelopeHashSchema;
  expect(verifyCanonicalFidsEnvelopeV39(raw)).toBe("legacy_no_canonical_hash");
  expect(verifyStoredDecodedFidsBodyV39(row)).toBe("verified");
  const r=await auditStoredDecodedFidsReadbackV39(reader([row]),scope);
  expect(r.bodyShaAndDecodedArraysVerified).toBe(1);
  expect(r.bodyAndEnvelopeShaVerified).toBe(0);
  expect(r.bodyWithoutEnvelopeHash).toBe(1);
  expect(r.strictGate5Passed).toBe(false);
 });
 it("rejected malformed envelope cannot fall back to historical no-hash status",async()=>{
  const row=await genuine(),raw=row.payload as any;
  delete raw.canonicalEnvelopeSha256;
  expect(verifyCanonicalFidsEnvelopeV39(raw)).toBe("rejected");
  expect(verifyStoredDecodedFidsBodyV39(row)).toBe("rejected");
 });
 it("rejects corrupted base64, altered checksum, tampered normalized array and forged flag",async()=>{
  const r=await genuine();
  const clone=()=>JSON.parse(JSON.stringify(r));
  const altered=[
   (()=>{const a=clone();a.payload.originalDecodedEntityBodyEvidence.bodySha256="0".repeat(64);return a})(),
   (()=>{const a=clone();a.payload.originalDecodedEntityBodyEvidence.bodyBase64="@@@";return a})(),
   (()=>{const a=clone();a.payload.departures[0].number="FAKE";return a})(),
   (()=>{const a=clone();a.payload.originalDecodedEntityBodyPreserved=false;return a})(),
   (()=>{const a=clone();a.payload.originalHttpWireBytesPreserved=true;return a})(),
   (()=>{const a=clone();a.persisted_response_hash="not-a-sha";return a})(),
  ];
  for(const a of altered)expect(verifyStoredDecodedFidsBodyV39(a)).toBe("rejected");
  const out=await auditStoredDecodedFidsReadbackV39(reader([altered[0]]),scope);
  expect(out.status).toBe("READBACK_INTEGRITY_FAILURE_HOLD");
  expect(out.rejectedIntegrity).toBe(1);
 });
 it("does not claim readback custody for legitimate legacy reconstructed-only records",async()=>{
  const row=await genuine(),raw=row.payload as any;
  raw.originalDecodedEntityBodyPreserved=false;
  raw.originalDecodedEntityBodyEvidence=null;
  // Simulate a genuinely older reconstructed-only row, not a mutated newer
  // hash-bound envelope. Historical records have neither canonical field.
  delete raw.canonicalEnvelopeHashSchema;
  delete raw.canonicalEnvelopeSha256;
  expect(verifyStoredDecodedFidsBodyV39(row)).toBe("legacy");
  const r=await auditStoredDecodedFidsReadbackV39(reader([row]),scope);
  expect(r.status).toBe("LEGACY_ONLY_DECODED_BODY_UNVERIFIED");
  expect(r.bodyShaAndDecodedArraysVerified).toBe(0);
 });
 it("absent source is UNMEASURABLE, not successful zero or scientific PASS",async()=>{
  const r=await auditStoredDecodedFidsReadbackV39(reader([]),scope);
  expect(r.status).toBe("NO_RETAINED_SOURCE_UNMEASURABLE");
  expect(r.sampled).toBe(0);
  expect(r.strictGate5Passed).toBe(false);
 });
 it("bounded samples explicitly report incompleteness and reject unbounded rows",async()=>{
  const row=await genuine();
  const four=[row,row,row,row];
  const r=await auditStoredDecodedFidsReadbackV39(reader([...four,row]),scope);
  expect(r.sampled).toBe(4);
  expect(r.moreRetainedRowsBeyondSample).toBe(true);
  expect(r.entirePopulationVerified).toBe(false);
  await expect(auditStoredDecodedFidsReadbackV39(reader([...four,row,row]),scope))
   .rejects.toThrow("P4_FIDS_READBACK_UNBOUNDED_RESULT");
 });
 it("only fetches bounded, unexpired source with parameterized read-only SQL",()=>{
  expect(P4_FIDS_DECODED_READBACK_SQL_V39).toContain("raw_expired_at_utc IS NULL");
  expect(P4_FIDS_DECODED_READBACK_SQL_V39).toContain("raw_payload IS NOT NULL");
  expect(P4_FIDS_DECODED_READBACK_SQL_V39).toContain("available_at<=$2::timestamptz");
  expect(P4_FIDS_DECODED_READBACK_SQL_V39).toContain("LIMIT 5");
  expect(P4_FIDS_DECODED_READBACK_SQL_V39).not.toMatch(/\b(?:UPDATE|DELETE|INSERT|TRUNCATE)\b/i);
 });
 it("invalid scope fails before any database access",async()=>{
  const db=reader([]);
  await expect(auditStoredDecodedFidsReadbackV39(db,{...scope,airport:"WSS"}))
   .rejects.toThrow("P4_FIDS_READBACK_BAD_SCOPE");
  await expect(auditStoredDecodedFidsReadbackV39(db,{...scope,readAsOfUtc:"2026-10-30"}))
   .rejects.toThrow("P4_FIDS_READBACK_BAD_SCOPE");
  expect(db.query).not.toHaveBeenCalled();
 });
 it("current source-body evidence includes hash-bound original bytes, not a provider signature",async()=>{
  const r=await genuine();
  const e=(r.payload as any).originalDecodedEntityBodyEvidence;
  expect(Buffer.from(e.bodyBase64,"base64")).toEqual(body);
  expect(e.bodySha256).toBe(createHash("sha256").update(body).digest("hex"));
  expect((r.payload as any).originalHttpWireBytesPreserved).toBe(false);
 });
});
