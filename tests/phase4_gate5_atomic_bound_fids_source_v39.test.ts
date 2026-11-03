import {beforeEach,describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
const mock=vi.hoisted(()=>({persist:vi.fn()}));
vi.mock("../server/lib/disruption/fidsCensus_v3",()=>({
 persistFidsObservation:mock.persist
}));
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
function fakeDb(overrides:{
 status?:string;retrievalCommitted?:string;cutoff?:string;
 clockSequence?:readonly string[];
 insertCount?:number;boundHash?:string;readbackCount?:number;
}={}){
 const calls:Array<{sql:string;args:unknown[]}>=[];let clockCalls=0;
 const db={query:async(sql:string,args:unknown[]=[])=>{
  calls.push({sql,args});
  if(sql===P4_G5_V0077_COMMITTED_ATTEMPT_READ_SQL_V39)return {
   rows:[{state:overrides.status??"ACTIVE",
    manifest_sha256:sha("b"),github_run_id:"123456789012",
    committed_at_utc:overrides.retrievalCommitted??"2027-01-15T09:59:30.000Z",
    prediction_cutoff_utc:overrides.cutoff??cutoff}],rowCount:1
  };
  if(sql===P4_G5_V0077_SOURCE_DB_CLOCK_SQL_V39){
   const observed=overrides.clockSequence?.[clockCalls++]??received;
   return {rows:[{db_now_utc:observed}],rowCount:1};
  }
  if(sql===P4_G5_V0077_INSERT_ORIGINAL_BINDING_SQL_V39)return {
   rows:overrides.insertCount===0?[]:[{population_query_id:qid}],
   rowCount:overrides.insertCount??1
  };
  if(sql===P4_G5_V0077_VERIFY_ATOMIC_SOURCE_SQL_V39)return {
   rows:[{original_response_sha256:overrides.boundHash??sha("a"),
    response_hash:sha("a"),available_at:received,
    source_use_expires_at_utc:expiry,
    normalized_count:overrides.readbackCount??1}],rowCount:1
  };
  throw Error("UNEXPECTED_SQL");
 }};
 return {db,calls};
}
describe("Gate5 V0077 raw-first FIDS + normalized + binding atomic DB-only adapter",()=>{
 beforeEach(()=>mock.persist.mockReset());
 it("retains a hard NULL live release even for a hash-shaped manifest",()=>{
  expect(P4_G5_ATOMIC_FIDS_PRODUCER_RELEASE_SHA_V39).toBeNull();
  expect(()=>requireP4G5AtomicFidsLiveReleaseV39(sha("b")))
   .toThrow("P4_G5_V0077_FIDS_LIVE_PRODUCER_NOT_REVIEWED_HOLD");
 });
 it("runs the exact owner reservation, binding and readback inside existing before-COMMIT hook",async()=>{
  const c=fakeDb();
  mock.persist.mockImplementation(async(q,r,callback)=>{
   await callback(c.db,{query:q,durableAvailableAt:new Date(received),
    normalizedInsertedRows:r.length});
   return r.length;
  });
  const output=await persistP4G5BoundFidsDbOnlyV39(original(),[member()],binding());
  expect(output.status).toBe(
   "ORIGINAL_NORMALIZED_AND_V0077_BOUND_SAME_DB_COMMIT_NOT_LIVE_AUTHORIZED");
  expect(output.originalBound).toBe(true);
  expect(output.normalizedRowsInserted).toBe(1);
  expect(output.providerCallsMadeByThisMethod).toBe(0);
  expect(output.scientificGate5Passed).toBe(false);
  expect(c.calls.map(x=>x.sql)).toEqual([
   P4_G5_V0077_COMMITTED_ATTEMPT_READ_SQL_V39,
   P4_G5_V0077_SOURCE_DB_CLOCK_SQL_V39,
   P4_G5_V0077_INSERT_ORIGINAL_BINDING_SQL_V39,
   P4_G5_V0077_VERIFY_ATOMIC_SOURCE_SQL_V39,
   P4_G5_V0077_SOURCE_DB_CLOCK_SQL_V39
  ]);
  expect(c.calls[2].args).toEqual([
   qid,sha("e"),sha("d"),sha("b"),sha("a"),sha("1"),expiry
  ]);
 });
 it("preflight rejects unknown request/identity/hash/rights/content without SQL",async()=>{
  for(const [query,rows,b] of [
   [{...original(),queryDirection:"Both"},[member()],binding()],
   [original(),[member()],{...binding(),expectedOwnerGithubRunId:"INVALID"}],
   [original(),[{...member(),responseHash:sha("f")}],binding()],
   [{...original(),rawPayload:{...original().rawPayload,
     originalDecodedEntityBodyPreserved:false}},[member()],binding()],
   [{...original(),rawPayload:{...original().rawPayload,
     originalDecodedEntityBodyEvidence:{
      ...original().rawPayload.originalDecodedEntityBodyEvidence,
      bodySha256:sha("f")
     }}},[member()],binding()],
   [original(),[member()],{...binding(),sourceUseExpiresAtUtc:
     "2027-01-17T12:00:00.000Z"}]
  ] as const){
   await expect(persistP4G5BoundFidsDbOnlyV39(query as any,
    [...rows] as any,b as any)).rejects.toThrow();
   expect(mock.persist).not.toHaveBeenCalled();
  }
 });
 it("rejects inactive owner and does not emit V0077 binding insert",async()=>{
  const c=fakeDb({status:"PREPARED"});
  mock.persist.mockImplementation(async(q,r,callback)=>{
   await callback(c.db,{query:q,durableAvailableAt:new Date(received),
    normalizedInsertedRows:r.length});return r.length;
  });
  await expect(persistP4G5BoundFidsDbOnlyV39(original(),[member()],binding()))
   .rejects.toThrow("P4_G5_V0077_ORIGINAL_OWNER_NOT_ACTIVE_OR_COMMITTED_HOLD");
  expect(c.calls).toHaveLength(1);
 });
 it("rejects late durable receipt or physically impossible GET, without binding",async()=>{
  for(const overrides of [
   {cutoff:"2027-01-15T09:59:00.000Z"},
   {retrievalCommitted:"2027-01-15T10:00:01.000Z"}
  ]){
   const c=fakeDb(overrides);
   mock.persist.mockImplementation(async(q,r,callback)=>{
    await callback(c.db,{query:q,durableAvailableAt:new Date(received),
     normalizedInsertedRows:r.length});return r.length;
   });
   await expect(persistP4G5BoundFidsDbOnlyV39(original(),[member()],binding()))
    .rejects.toThrow("P4_G5_V0077_ORIGINAL_RETENTION_OR_CUTOFF_HOLD");
   expect(c.calls).toHaveLength(1);
  }
 });
 it("DB clock forbids after-cutoff original binding and late commit",async()=>{
  for(const [overrides,needle] of [
   [{clockSequence:["2027-01-15T11:00:00.000Z"]},
    "P4_G5_V0077_ORIGINAL_DB_CLOCK_CUTOFF_HOLD"],
   [{clockSequence:[received,"2027-01-15T11:00:00.000Z"]},
    "P4_G5_V0077_ORIGINAL_COMMIT_TOO_LATE_ROLLBACK"]
  ] as const){
   const c=fakeDb(overrides);
   mock.persist.mockImplementation(async(q,r,callback)=>{
    await callback(c.db,{query:q,durableAvailableAt:new Date(received),
     normalizedInsertedRows:r.length});return r.length;
   });
   await expect(persistP4G5BoundFidsDbOnlyV39(
    original(),[member()],binding())).rejects.toThrow(needle);
  }
 });
 it("a refusal or incomplete binding readback cannot be reported as a successful source",async()=>{
  for(const overrides of [
   {insertCount:0},{boundHash:sha("f")},{readbackCount:0}
  ]){
   const c=fakeDb(overrides);
   mock.persist.mockImplementation(async(q,r,callback)=>{
    await callback(c.db,{query:q,durableAvailableAt:new Date(received),
     normalizedInsertedRows:r.length});return r.length;
   });
   await expect(persistP4G5BoundFidsDbOnlyV39(original(),[member()],binding()))
    .rejects.toThrow(/P4_G5_V0077_ORIGINAL_(?:BINDING_NOT_INSERTED|ATOMIC_READBACK)_HOLD/);
  }
 });
 it("cannot claim commit if the existing persistence callback does not complete",async()=>{
  mock.persist.mockResolvedValue(1);
  await expect(persistP4G5BoundFidsDbOnlyV39(original(),[member()],binding()))
   .rejects.toThrow("P4_G5_V0077_ORIGINAL_TRANSACTION_NOT_VERIFIED_HOLD");
 });
 it("preflight explicitly verifies body integrity and does not pretend rights authorization",()=>{
  expect(()=>assertP4G5AtomicOriginalBindingScopeV39(original(),[member()],binding()))
   .not.toThrow();
  for(const sql of [P4_G5_V0077_COMMITTED_ATTEMPT_READ_SQL_V39,
   P4_G5_V0077_VERIFY_ATOMIC_SOURCE_SQL_V39])
   expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|GRANT|DROP)\b/i);
 });
});
