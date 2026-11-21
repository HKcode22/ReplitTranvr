import {createHash,generateKeyPairSync} from "node:crypto";
import {P5_ACTUAL_SOURCE_RETAINED_ALIAS_READONLY_SQL} from "../server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39";
import {describe,it,expect} from "vitest";
import {addCanonicalFidsEnvelopeHashV39}
 from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {
 compileP5EOneBoundOriginalReadonly,compileP5EBoundOriginalBatchReadonly,P5_E_BATCH_ALL_MEMBERS_SQL,P5_E_BATCH_ORIGINAL_SQL,type P5EOriginalBatchReadScope,
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
    if(sql==="SELECT clock_timestamp() AS at")return {rows:[{at:now}],rowCount:1};
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

describe("Amendment E shared original batch under existing restricted SOURCE session",()=>{
 function batch(){
  const f=fixture(),missingId="leg:ci:original:missing";
  const source={...f.source,run_day_index:1,slot_id:"HUB",horizon:"T-6h",airport_icao:"WSSS",
   github_run_id:"1234567",attempt_run_id:"1234567",early_draw_sha256:h("e"),reviewed_release_sha256:h("f"),
   provider_contract_sha256:h("1"),service_window_start_utc:"2035-11-25T11:00:00.000Z",
   service_window_end_utc:"2035-11-25T13:00:00.000Z",reserved_at:"2035-11-25T05:00:00.000Z",
   fids_retrieval_utc:"2035-11-25T05:01:00.000Z",raw_persisted_at_utc:available,
   bound_at_utc:"2035-11-25T05:03:00.000Z",normalized_members_count:2};
  const member={...f.member,source_airport_icao:"WSSS",provider_content_expired_at_utc:null,population_member_id:"m1",
   flight_number:"SQ12",arr_airport_icao:"YSSY",query_direction:"Departure",provider_record_key:"operating-flight-01"};
  const members=[member,{...member,analytic_identity_id:missingId,canonical_flight_instance_id:missingId,
   population_member_id:"m2",provider_record_key:"missing-native-record"}];
  const scope:P5EOriginalBatchReadScope={source:{manifestSha256:manifest,queryDigestSha256:query,rightsReviewSha256:rights,
   reviewedReleaseSha256:h("f"),providerContractSha256:h("1"),earlyDrawSha256:h("e"),runDayIndex:1,slot:"HUB",horizon:"T-6h",
   airportIcao:"WSSS",expectedSourceGithubRunId:"1234567",maxPopulationStalenessSeconds:3600},
   expectedPopulationQueryId:qid,expectedResponseSha256:source.original_response_hash,
   externalContentUseReviewSha256:h("d"),selected:[id,missingId].map(flightInstanceId=>({flightInstanceId,
    expectedSelectedNativeTUtc:native,expectedForecastCutoffUtc:cutoff,expectedMemberAvailableUtc:available}))};
  const calls:string[]=[];let released=0;let aliasConflict=false;
  const db={async connect(){return{async query(sql:string,args?:unknown[]){
   calls.push(sql);let rows:Record<string,unknown>[]=[];
   if(sql.startsWith("SELECT current_user AS actor"))rows=[{actor:"phase5_fids_source_prod_20261107",
    session_login:"phase5_p5_source_login_20261108",db:"neondb",version:160016,ro:"on",replica:false,now}];
   else if(sql===P5_STAGE14_BOUND_SOURCE_SQL){expect(args).toEqual([manifest,query]);rows=[source];}
   else if(sql===P5_E_BATCH_ALL_MEMBERS_SQL){expect(args).toEqual([qid]);rows=members;}
   else if(sql===P5_E_BATCH_ORIGINAL_SQL){expect(args).toEqual([manifest,query,qid]);rows=[f.original];}
   else if(sql===P5_ACTUAL_SOURCE_RETAINED_ALIAS_READONLY_SQL){expect(args).toEqual([qid,manifest,now,scope.source.providerContractSha256,rights]);rows=members.filter(m=>m.analytic_identity_id.startsWith("leg:p5v1:")).map(m=>({flight_instance_id:m.analytic_identity_id,conflicting_retained_identity:aliasConflict}));}
   else if(sql==="SELECT clock_timestamp() AS at"){rows=[{at:now}];}
   else if(!/^(BEGIN|SET LOCAL|ROLLBACK)/.test(sql))throw Error("UNEXPECTED_SQL");
   return {rows,rowCount:rows.length};},release(){released++;}}}};
  return {db,source,members,scope,calls,original:f.original,released:()=>released,setAliasConflict:(x:boolean)=>{aliasConflict=x;}};
 }
 it("reads body once, verifies native operator and feature values, censors missing native key without rewriting other member",async()=>{
  const f=batch(),x=await compileP5EBoundOriginalBatchReadonly(f.db,f.scope);
  expect(x).toMatchObject({selectedCount:2,noLongerEligibleOrChangedCount:0,matchedCount:1,nativeOriginalCensoredCount:1,
   originalBodyReadCount:1,sourceRightsAuthenticatedHere:false,physicalGateOutCertified:false,providerCalls:0,dbWrites:0,phase6PaidGo:false});
  expect(x.privateDecisions[0]).toMatchObject({status:"MATCHED_NATIVE_ORIGINAL",compiled:{evidencedFidsFields:4}});
  expect(x.privateDecisions[1].status).toBe("CENSORED_NATIVE_ORIGINAL_MEMBER");
  expect(f.calls.filter(q=>q===P5_E_BATCH_ORIGINAL_SQL)).toHaveLength(1);
  expect(f.calls.filter(q=>q===P5_E_BATCH_ALL_MEMBERS_SQL)).toHaveLength(1);
  expect(f.calls.at(-1)).toBe("ROLLBACK");expect(f.released()).toBe(1);
  expect(JSON.stringify(x)).not.toMatch(/leg:ci|operating-flight|observations/);
 });
 it("reruns the full-width production identity conflict screen before any raw body transfer",async()=>{
  const f=batch(),identity="leg:p5v1:"+sha("full width actual identity fixture");
  Object.assign(f.members[0],{analytic_identity_id:identity,canonical_flight_instance_id:identity});
  f.scope.selected=[{...f.scope.selected[0],flightInstanceId:identity}];
  const a=await compileP5EBoundOriginalBatchReadonly(f.db,f.scope);
  expect(a.matchedCount).toBe(1);
  expect(f.calls).toContain(P5_ACTUAL_SOURCE_RETAINED_ALIAS_READONLY_SQL);
  f.calls.length=0;f.setAliasConflict(true);
  const b=await compileP5EBoundOriginalBatchReadonly(f.db,f.scope);
  expect(b.matchedCount).toBe(0);expect(f.calls).not.toContain(P5_E_BATCH_ORIGINAL_SQL);
 });
 it("rereads exact permit page, keeps member clocks private and compiles the original only once",async()=>{
  const f=batch(),s=f.scope.source,p={manifestSha256:s.manifestSha256,queryDigestSha256:s.queryDigestSha256,flightInstanceId:id,
   expectedSourcePopulationQueryId:qid,expectedSourceResponseSha256:f.scope.expectedResponseSha256,expectedReviewedSourceRightsSha256:s.rightsReviewSha256,
   expectedReviewedReleaseSha256:s.reviewedReleaseSha256,expectedProviderContractSha256:s.providerContractSha256,expectedEarlyDrawSha256:s.earlyDrawSha256,
   expectedGithubSourceRunId:s.expectedSourceGithubRunId,runDayIndex:s.runDayIndex,slot:s.slot,horizon:s.horizon,airportIcao:s.airportIcao,
   selectedTNativeUtc:native,maxPopulationStalenessSeconds:s.maxPopulationStalenessSeconds} as P5Stage14SingleFlightPrePermit;
  f.scope.selected=[{...f.scope.selected[0],expectedMemberAvailableUtc:null}];f.scope.prospectivePermits=[p];
  const x=await compileP5EBoundOriginalBatchReadonly(f.db,f.scope);
  expect(x.privatePermitReadbacks?.[0]).toMatchObject({flightInstanceId:id,observedDbClockUtc:now,sourceExpiresAtUtc:expire});
  expect(x.originalBodyReadCount).toBe(1);expect(f.calls.filter(q=>q===P5_E_BATCH_ORIGINAL_SQL)).toHaveLength(1);
  expect(JSON.stringify(x)).not.toContain("normalizedMember");
  await expect(compileP5EBoundOriginalBatchReadonly(f.db,{...f.scope,prospectivePermits:[{...p,expectedGithubSourceRunId:"9999999"}]})).rejects.toThrow("CROSS_ORIGINAL_EXACT_PRE_PERMIT_PAGE");
 });
 it("does not transfer original if pending selections are stale or changed",async()=>{
  const f=batch();f.scope.source.maxPopulationStalenessSeconds=1800;
  const x=await compileP5EBoundOriginalBatchReadonly(f.db,f.scope);
  expect(x).toMatchObject({selectedCount:2,noLongerEligibleOrChangedCount:2,matchedCount:0,originalBodyReadCount:0});
  expect(f.calls).not.toContain(P5_E_BATCH_ORIGINAL_SQL);
 });
 it("holds structural original drift and duplicate selection, not an ordinary missing member",async()=>{
  const f=batch();f.original.stored_response_hash=h("e");
  await expect(compileP5EBoundOriginalBatchReadonly(f.db,f.scope)).rejects.toThrow("BATCH_BODY_OR_RIGHTS_DRIFT");
  expect(f.calls.at(-1)).toBe("ROLLBACK");
  const g=batch();g.scope.selected=[g.scope.selected[0],g.scope.selected[0]];
  await expect(compileP5EBoundOriginalBatchReadonly(g.db,g.scope)).rejects.toThrow("BATCH_MEMBER_SCOPE_OR_CUTOFF_DRIFT");
  expect(g.calls).toHaveLength(0);
 });
});

import {readP7ExactSelectedFeatures,recomputeP7ExactSelectedFeatures,requireP7ActualSourceReadback} from "../server/lib/disruption/phase7IndependentPreSourceReader_v39";
import {signP7ActualPreLaneReceipt,parseP7ReferenceLinkPolicy} from "../server/lib/disruption/phase7ExactPreLaneEvidenceAuthority_v39";
import {createPhase7IndependentPreProofPort} from "../server/lib/disruption/phase7IndependentPreProofIssuer_v39";
import {verifyPhase7SignedPreFieldProof,verifyPhase7SelectedFieldProofs} from "../server/lib/disruption/phase7SignedPreFieldProof_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import type {P5Stage14SingleFlightPrePermit} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import type {Phase7CanonicalFieldDisposition} from "../server/lib/disruption/phase7CanonicalFieldParity_v39";
describe("independent actual-source PRE lane authority and separate proof signer (synthetic SQL fixture)",()=>{
 async function setup(){
  const f=fixture(),man=sha("study"),right=sha("rights"),purpose=sha("independent purpose"),prePolicy=sha("field policy"),terms=sha("terms");
  Object.assign(f.source,{manifest_sha256:man,bound_rights:right,rights_review_sha256:right,run_day_index:1,slot_id:"HUB",horizon:"T-6h",airport_icao:"WSSS",github_run_id:"1234567",attempt_run_id:"1234567",
   early_draw_sha256:sha("draw"),reviewed_release_sha256:sha("release"),provider_contract_sha256:sha("contract"),service_window_start_utc:"2035-11-25T11:00:00.000Z",service_window_end_utc:"2035-11-25T13:00:00.000Z",
   reserved_at:"2035-11-25T05:00:00.000Z",fids_retrieval_utc:"2035-11-25T05:01:00.000Z",raw_persisted_at_utc:available,bound_at_utc:"2035-11-25T05:03:00.000Z"});
  Object.assign(f.member,{source_airport_icao:"WSSS",arr_airport_icao:"YSSY",population_member_id:"fixture-member",provider_content_expired_at_utc:null,query_direction:"Departure"});
  Object.assign(f.original,{binding_rights:right});Object.assign(f.scope,{manifestSha256:man,expectedRightsReviewSha256:right,externalContentUseReviewSha256:purpose});
  const o=await compileP5EOneBoundOriginalReadonly(f.db,f.scope);
  const permit={manifestSha256:man,queryDigestSha256:query,flightInstanceId:id,expectedSourcePopulationQueryId:qid,expectedSourceResponseSha256:f.scope.expectedResponseSha256,
   expectedReviewedSourceRightsSha256:right,expectedReviewedReleaseSha256:sha("release"),expectedProviderContractSha256:sha("contract"),expectedEarlyDrawSha256:sha("draw"),expectedGithubSourceRunId:"1234567",runDayIndex:1,slot:"HUB",horizon:"T-6h",airportIcao:"WSSS",selectedTNativeUtc:native,maxPopulationStalenessSeconds:3600,reviewedSupplementalFeatureBundle:o.bundle} as P5Stage14SingleFlightPrePermit;
  const dispositions:Phase7CanonicalFieldDisposition[]=[
   ...(["origin_icao","destination_icao","operating_carrier"] as const).map(field=>({field,disposition:"PURPOSE_BOUND_REFERENCE_LANE" as const,outputField:null,reviewSha256:sha("review "+field)})),
   ...(["scheduled_arrival_utc","provider_revised_departure_utc","reported_pre_departure_status"] as const).map(field=>({field,disposition:"REVIEWED_DERIVED_BUCKET" as const,outputField:"synthetic_bucket_"+field,reviewSha256:sha("review "+field)}))];
  const lane=generateKeyPairSync("ed25519"),proof=generateKeyPairSync("ed25519");
  const fp=(k:typeof lane)=>sha(k.publicKey.export({type:"spki",format:"der"}));
  const referencePolicy={schema:"v39.phase7.pre-reference-link-purpose-policy.v1",manifestSha256:man,rightsSha256:right,prePolicySha256:prePolicy,termsReviewSha256:terms,independentPurposeReviewSha256:sha("link scope review"),
   validFromUtc:"2035-11-25T00:00:00.000Z",validUntilUtc:expire,scope:"SINGLE_ORIGINAL_MEMBER_LINK_ONLY",allowSubstituteCompilation:false,allowPerFlightTrainingLink:false,
   fields:dispositions.filter(d=>d.disposition==="PURPOSE_BOUND_REFERENCE_LANE").map(d=>({field:d.field,kind:d.field==="operating_carrier"?"airline_icao":"airport_icao",purpose:"link",fieldReviewSha256:d.reviewSha256}))};
  const bytes=Buffer.from(JSON.stringify(referencePolicy)),env={V39_P5_MANIFEST_SHA256:man,V39_P5_RIGHTS_SHA256:right,
   P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:prePolicy,P6_PHASE7_PRE_REFERENCE_LINK_POLICY_BASE64:bytes.toString("base64"),P6_PHASE7_PRE_REFERENCE_LINK_POLICY_SHA256:sha(bytes),
   P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED:"1",P6_PHASE7_PRE_PROOF_ISSUER_APPROVED:"1",P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256:fp(lane),P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:fp(proof),
   P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(proof.publicKey.export({type:"spki",format:"pem"})).toString("base64")};
  const refPolicy=parseP7ReferenceLinkPolicy(env,terms,dispositions);
  const config={env,signer:lane.privateKey,termsReviewSha256:terms,dispositions,referencePolicy:refPolicy};
  return {f,permit,dispositions,config,proof,lane,env,purpose,terms,prePolicy};
 }
 it("authenticates exact original and purpose-only reference links, then independently reselects and verifies proof",async()=>{
  const x=await setup(),a=await readP7ExactSelectedFeatures(x.f.db,x.permit,x.purpose);
  expect(a.selectedCount).toBe(6);expect(JSON.stringify(a)).not.toContain("WSSS");
  const receipt=signP7ActualPreLaneReceipt(x.config,x.permit,a,[]);
  expect(receipt).toMatchObject({referenceLinkFields:3,independentExactFields:0,longTermReferenceTrainingUseApproved:false,providerCalls:0,databaseWrites:0});
  expect(JSON.stringify(receipt)).not.toContain("payloadBase64");
  const port=createPhase7IndependentPreProofPort({env:x.env,policySha256:x.prePolicy,dispositions:x.dispositions,evidenceAuthorityPublicKey:x.lane.publicKey,proofSigningKey:x.proof.privateKey,forbiddenSignerFingerprints:[],
   reader:{readExactLaneEvidence:async p=>({selectedFeatures:(await readP7ExactSelectedFeatures(x.f.db,p,x.purpose)).privateSelectedFeatures,wire:receipt.privateWire}),readDatabaseClockUtc:async()=>now}});
  const wires=await port.readExactPermitProofs([x.permit]),proof=verifyPhase7SignedPreFieldProof(x.env,x.permit,x.prePolicy,x.dispositions,wires.get(hashPhase7DurableCandidate(x.permit)));
  expect(verifyPhase7SelectedFieldProofs(proof,a.privateSelectedFeatures,"2035-11-25T05:59:00.000Z",expire)).toEqual(["origin_icao","destination_icao","operating_carrier"]);
  expect(()=>requireP7ActualSourceReadback({...a})).toThrow("ACTUAL_SOURCE_READBACK_REQUIRED");
  expect(x.f.observed.every(q=>!/^(INSERT|UPDATE|DELETE|ALTER|GRANT|CREATE)/i.test(q))).toBe(true);
 });
 it("refuses drifted original run, stale cutoff, foreign signer or unapproved reference training purpose",async()=>{
  const x=await setup(),a=await readP7ExactSelectedFeatures(x.f.db,x.permit,x.purpose);
  expect(()=>signP7ActualPreLaneReceipt({...x.config,signer:x.proof.privateKey},x.permit,a,[])).toThrow("DISTINCT_ACTUAL_AUTHORITY");
  const rp={...x.config.referencePolicy,allowPerFlightTrainingLink:true},b=Buffer.from(JSON.stringify(rp));
  expect(()=>parseP7ReferenceLinkPolicy({...x.env,P6_PHASE7_PRE_REFERENCE_LINK_POLICY_BASE64:b.toString("base64"),P6_PHASE7_PRE_REFERENCE_LINK_POLICY_SHA256:sha(b)},x.terms,x.dispositions)).toThrow("REFERENCE_PURPOSE_SCOPE");
  await expect(readP7ExactSelectedFeatures(x.f.db,{...x.permit,expectedGithubSourceRunId:"9999999"},x.purpose)).rejects.toThrow("MISSING_OR_CHANGED_AUTHENTIC_BOUND_ORIGINAL");
  await expect(readP7ExactSelectedFeatures(x.f.db,{...x.permit,maxPopulationStalenessSeconds:1},x.purpose)).rejects.toThrow("SOURCE_CLOCK_STALE_RIGHTS_OR_CUTOFF_INVALID");
 });
});
