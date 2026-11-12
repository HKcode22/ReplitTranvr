import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {addCanonicalFidsEnvelopeHashV39}
 from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {
 compileP5EOneBoundOriginalReadonly,
 P5_E_READONLY_ORIGINAL_MEMBER_SQL,
 type P5EV0079BoundFeatureReadScope
} from "../server/lib/disruption/phase5AmendmentEOriginalFidsReadonlyCompiler_v39";
import {
 P5_STAGE14_BOUND_SOURCE_SQL,P5_STAGE14_PHYSICAL_MEMBER_SQL
} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
const h=(c:string)=>c.repeat(64),sha=(x:string|Buffer)=>
 createHash("sha256").update(x).digest("hex");
const id="leg:ci:original:one",qid="c23e4567-e89b-42d3-a456-426614174013";
const manifest=h("a"),query=h("b"),rights=h("c");
const now="2035-11-25T05:20:00.000Z",cutoff="2035-11-25T06:00:00.000Z",
native="2035-11-25T12:00:00.000Z",available="2035-11-25T05:02:00.000Z",
expire="2035-11-25T07:00:00.000Z";
function fixture(){
 const flight={
  id:"operating-flight-01",number:"SQ 12",codeshareStatus:"IsOperator",
  airline:{icao:"SIA"},status:"Expected",
  departure:{airport:{icao:"WSSS"},scheduledTime:{utc:native},
   revisedTime:{utc:"2035-11-25T12:28:00.000Z"}},
  arrival:{airport:{icao:"YSSY"},scheduledTime:{utc:"2035-11-25T20:44:00.000Z"}}
 };
 const decoded={departures:[flight],arrivals:[]};
 const body=Buffer.from(JSON.stringify(decoded),"utf8");
 const raw=addCanonicalFidsEnvelopeHashV39({
  payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",
  originalHttpWireBytesPreserved:false,
  originalDecodedEntityBodyPreserved:true,
  originalDecodedEntityBodyEvidence:{
   schema:"v39.fids-fetch-decoded-source-body.v1",
   representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
   bodySha256:sha(body),bodyLengthBytes:body.length,
   bodyBase64:body.toString("base64")
  },
  fidsRequestContract:{schema:"v39.fids-request-frame.application-intent.v1",
   airportIcao:"WSSS",direction:"Departure"},
  departures:decoded.departures,arrivals:decoded.arrivals,
  fetchedAtUtc:"2035-11-25T05:01:00.000Z"
 });
 const response=sha(JSON.stringify(raw));
 const source={
  state:"ACTIVE",manifest_sha256:manifest,
  original_response_hash:response,fids_response_hash:response,
  fids_airport_icao:"WSSS",bound_rights:rights,rights_review_sha256:rights,
  original_current:true,population_query_id:qid,
  normalized_members_count:1,source_expires_at_utc:expire,
  source_available:available
 };
 const member={
  population_query_id:qid,analytic_identity_id:id,
  canonical_flight_instance_id:id,codeshare_resolution_status:"confirmed_operating_leg",
  scope_classification:"confirmed_core",population_role:"requested_airport_primary",
  source_type:"fids",response_hash:response,
  dep_airport_icao:"WSSS",dep_scheduled_utc:native,
  available_at:available
 };
 const original={
  raw_payload:raw,stored_response_hash:response,
  binding_rights:rights,decoded_original_body_sha256:sha(body),
  source_expires_at_utc:expire,raw_persisted_at_utc:available,
  provider_content_expired_at_utc:null,raw_expired_at_utc:null,
  provider_record_key:"operating-flight-01",flight_number:"SQ12",
  dep_airport_icao:"WSSS",arr_airport_icao:"YSSY",
  dep_scheduled_utc:native,member_available_at:available,
  canonical_flight_instance_id:id,analytic_identity_id:id,
  population_query_id:qid,member_response_hash:response,
  codeshare_resolution_status:"confirmed_operating_leg",
  scope_classification:"confirmed_core",population_role:"requested_airport_primary"
 };
 const scope:P5EV0079BoundFeatureReadScope={
  manifestSha256:manifest,queryDigestSha256:query,
  flightInstanceId:id,expectedPopulationQueryId:qid,
  expectedResponseSha256:response,expectedRightsReviewSha256:rights,
  expectedSelectedNativeTUtc:native,expectedForecastCutoffUtc:cutoff,
  expectedOriginIcao:"WSSS",externalContentUseReviewSha256:h("d")
 };
 const observed:string[]=[];
 let released=0,role="phase5_fids_source_prod_20261107",
  login="phase5_p5_source_login_20261108";
 const db={
  async connect(){return{
   async query(sql:string,params?:unknown[]){
    observed.push(sql);
    if(sql.startsWith("SELECT current_user AS actor"))
     return{rows:[{actor:role,session_login:login,db:"neondb",version:160000,ro:"on",
      replica:false,now}],rowCount:1};
    if(sql===P5_STAGE14_BOUND_SOURCE_SQL)
     return{rows:[source],rowCount:1};
    if(sql===P5_STAGE14_PHYSICAL_MEMBER_SQL)
     return{rows:[member],rowCount:1};
    if(sql===P5_E_READONLY_ORIGINAL_MEMBER_SQL)
     return{rows:[original],rowCount:1};
    if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||
       sql==="COMMIT"||sql==="ROLLBACK")
     return{rows:[],rowCount:0};
    throw Error("UNEXPECTED_SQL_NO_SOURCE_API");
   },
   release(){released++;}
  }}
 };
 return {scope,source,member,original,observed,db,
  getReleased:()=>released,setRole:(v:string)=>{role=v;},
  setLogin:(v:string)=>{login=v;}};
}
describe("Phase5 reuse Stage14/V0079 read-only authenticated feature compiler",()=>{
 it("uses existing source/member JOIN and a real unexpired original in read-only TX",async()=>{
  const x=fixture();
  const r=await compileP5EOneBoundOriginalReadonly(x.db,x.scope);
  expect(r.status).toBe("EXACT_SOURCE_COVERED_FEATURE_PACKET_DRAFT_NOT_SIGNED");
  expect(r.evidencedFidsFields).toBe(4);
  expect(r.bundle.observations.map(o=>o.value))
   .toEqual(["SIA","2035-11-25T20:44:00.000Z",
    "2035-11-25T12:28:00.000Z","Expected"]);
  expect(x.observed[0]).toBe(
   "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(x.observed).toContain(P5_STAGE14_BOUND_SOURCE_SQL);
  expect(x.observed).toContain(P5_STAGE14_PHYSICAL_MEMBER_SQL);
  expect(x.observed).toContain(P5_E_READONLY_ORIGINAL_MEMBER_SQL);
  expect(x.observed.at(-1)).toBe("COMMIT");
  expect(x.getReleased()).toBe(1);
  expect(r.providerCalls).toBe(0);
  expect(r.dbWrites).toBe(0);
  expect(r.sourceRightsAuthenticatedHere).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
 });
 it("rejects unreviewed role before reading any source contents",async()=>{
  const x=fixture();x.setRole("neondb_owner");
  await expect(compileP5EOneBoundOriginalReadonly(x.db,x.scope))
   .rejects.toThrow("NOT_EXISTING_RESTRICTED_READONLY_SOURCE_ROLE");
  expect(x.observed).not.toContain(P5_E_READONLY_ORIGINAL_MEMBER_SQL);
  expect(x.observed.at(-1)).toBe("ROLLBACK");
  expect(x.getReleased()).toBe(1);
 });
 it("refuses the PREPARE role even though it can read allowed query metadata",async()=>{
  const x=fixture();x.setRole("phase5_fids_prepare_prod_20261107");
  await expect(compileP5EOneBoundOriginalReadonly(x.db,x.scope))
   .rejects.toThrow("NOT_EXISTING_RESTRICTED_READONLY_SOURCE_ROLE");
  expect(x.observed).not.toContain(P5_STAGE14_BOUND_SOURCE_SQL);
  expect(x.observed).not.toContain(P5_STAGE14_PHYSICAL_MEMBER_SQL);
  expect(x.observed).not.toContain(P5_E_READONLY_ORIGINAL_MEMBER_SQL);
  expect(x.observed.at(-1)).toBe("ROLLBACK");
  expect(x.getReleased()).toBe(1);
 });
 it("rejects neondb_owner masquerading as SOURCE through SET ROLE",async()=>{
  const x=fixture();x.setLogin("neondb_owner");
  await expect(compileP5EOneBoundOriginalReadonly(x.db,x.scope))
   .rejects.toThrow("NOT_EXISTING_RESTRICTED_READONLY_SOURCE_ROLE");
  expect(x.observed).not.toContain(P5_STAGE14_BOUND_SOURCE_SQL);
  expect(x.observed).not.toContain(P5_STAGE14_PHYSICAL_MEMBER_SQL);
  expect(x.observed).not.toContain(P5_E_READONLY_ORIGINAL_MEMBER_SQL);
  expect(x.observed.at(-1)).toBe("ROLLBACK");
  expect(x.getReleased()).toBe(1);
 });
 it("never tries to SET ROLE or grant tables during a source read-only operation",async()=>{
  const x=fixture();
  await compileP5EOneBoundOriginalReadonly(x.db,x.scope);
  expect(x.observed.every(q=>!/^\s*(?:GRANT|REVOKE|ALTER|INSERT|UPDATE|DELETE|CREATE|SET ROLE)/i.test(q))).toBe(true);
  expect(x.observed.some(q=>q.includes("REPEATABLE READ READ ONLY"))).toBe(true);
 });
 it("refuses original expiry and missing physical member",async()=>{
  const x=fixture();x.source.source_expires_at_utc=
   "2035-11-25T05:30:00.000Z";
  await expect(compileP5EOneBoundOriginalReadonly(x.db,x.scope))
   .rejects.toThrow("SOURCE_NOT_DURABLE_ACTIVE_AND_BEFORE_CUTOFF");
  const y=fixture();y.member.canonical_flight_instance_id="provisional:fake";
  await expect(compileP5EOneBoundOriginalReadonly(y.db,y.scope))
   .rejects.toThrow("V0079_ORIGINAL_NORMALIZED_IDENTITY_OR_LICENSE_DRIFT");
 });
 it("rejects after-cutoff query; never claims a retroactive PRE",async()=>{
  const x=fixture();x.scope.expectedForecastCutoffUtc=
   "2035-11-25T05:00:00.000Z";
  await expect(compileP5EOneBoundOriginalReadonly(x.db,x.scope))
   .rejects.toThrow("CUTOFF_ALREADY_MISSED_NO_FEATURE_BACKFILL");
 });
 it("refuses rights mismatch, changed original provider body and non-operator",async()=>{
  const x=fixture();x.original.binding_rights=h("e");
  await expect(compileP5EOneBoundOriginalReadonly(x.db,x.scope))
   .rejects.toThrow("V0079_ORIGINAL_NORMALIZED_IDENTITY_OR_LICENSE_DRIFT");
  const y=fixture();
  const payload=y.original.raw_payload as Record<string,any>;
  payload.departures[0].status="Departed";
  await expect(compileP5EOneBoundOriginalReadonly(y.db,y.scope))
   .rejects.toThrow("ORIGINAL_DECODED_BODY_OR_ENVELOPE_INTEGRITY_UNVERIFIED");
  const z=fixture();z.original.codeshare_resolution_status="resolved_marketing";
  await expect(compileP5EOneBoundOriginalReadonly(z.db,z.scope))
   .rejects.toThrow("V0079_ORIGINAL_NORMALIZED_IDENTITY_OR_LICENSE_DRIFT");
 });
 it("never silently skips an expired raw object or a source mismatch",async()=>{
  const x=fixture();x.original.raw_expired_at_utc=now as unknown as null;
  await expect(compileP5EOneBoundOriginalReadonly(x.db,x.scope))
   .rejects.toThrow("V0079_ORIGINAL_NORMALIZED_IDENTITY_OR_LICENSE_DRIFT");
  const y=fixture();y.source.original_response_hash=h("e");
  await expect(compileP5EOneBoundOriginalReadonly(y.db,y.scope))
   .rejects.toThrow("V0079_ORIGINAL_NORMALIZED_IDENTITY_OR_LICENSE_DRIFT");
 });
});
