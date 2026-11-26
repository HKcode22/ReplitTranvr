import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {addCanonicalFidsEnvelopeHashV39} from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {prepareP5BoundConditionalServiceReview as prepare,readP5BoundConditionalServiceReview as read,readP5SignedConditionalServiceReview as readSigned,matchP5ConditionalStage14Members as match} from "../server/lib/disruption/phase5ConditionalBoundSourceReview_v39";
const h=(c:string)=>c.repeat(64),t=(s:string)=>"2035-11-25T"+s+":00.000Z";
function fixture(){
 const departures=[{number:"SQ78",codeshareStatus:"IsOperator",isCargo:false,airline:{icao:"SIA"},status:"Scheduled",departure:{scheduledTime:{utc:t("12:00")},revisedTime:{utc:t("12:15")}},arrival:{airport:{icao:"YSSY"},scheduledTime:{utc:t("20:00")}}}];
 const bytes=Buffer.from(JSON.stringify({departures,arrivals:[]}));
 const body=createHash("sha256").update(bytes).digest("hex");
 const id="c23e4567-e89b-42d3-a456-426614174013";
 const p=addCanonicalFidsEnvelopeHashV39({fidsRequestContract:{schema:"v39.fids-request-frame.application-intent.v1",endpointKind:"airport_local_fids",direction:"Departure",airportIcao:"WSSS",fromLocal:"2035-11-25T19:00",toLocal:"2035-11-25T20:00",withLeg:true,withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false,withLocation:false,openapiSha256:h("e")},payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",originalHttpWireBytesPreserved:false,originalDecodedEntityBodyPreserved:true,originalDecodedEntityBodyEvidence:{schema:"v39.fids-fetch-decoded-source-body.v1",representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",bodySha256:body,bodyLengthBytes:bytes.length,bodyBase64:bytes.toString("base64")},departures,arrivals:[],fetchedAtUtc:t("05:01")});
 const scope={source:{manifestSha256:h("a"),queryDigestSha256:h("b"),reviewedReleaseSha256:h("c"),rightsReviewSha256:h("d"),providerContractSha256:h("e"),earlyDrawSha256:h("f"),runDayIndex:2,slot:"HUB",horizon:"T-6h" as const,airportIcao:"WSSS",expectedSourceGithubRunId:"123456",maxPopulationStalenessSeconds:3600,plannedRequestUtc:t("05:00")},protocolSha256:h("1"),ownerProspectiveSeparateTierApproved:true as const,frozenStudyStartUtc:t("00:00"),policyEffectiveUtc:t("04:00"),minimumReviewLeadSeconds:900,expectedPopulationQueryId:id,expectedResponseSha256:h("2"),expectedDecodedBodySha256:body,expectedLocalFrom:"2035-11-25T19:00",expectedLocalTo:"2035-11-25T20:00"};
 const o={manifest_sha256:h("a"),run_day_index:2,slot_id:"HUB",horizon:"T-6h",airport_icao:"WSSS",fids_airport_icao:"WSSS",github_run_id:"123456",attempt_run_id:"123456",state:"ACTIVE",early_draw_sha256:h("f"),reviewed_release_sha256:h("c"),rights_review_sha256:h("d"),provider_contract_sha256:h("e"),bound_rights:h("d"),population_query_id:id,original_response_hash:h("2"),fids_response_hash:h("2"),original_current:true,reserved_at:t("05:00"),fids_retrieval_utc:t("05:01"),raw_persisted_at_utc:t("05:02"),source_available:t("05:02"),bound_at_utc:t("05:03"),source_expires_at_utc:t("23:00"),service_window_start_utc:t("11:00"),service_window_end_utc:t("15:00")};
 const r={raw_payload:p,stored_response_hash:h("2"),raw_expired_at_utc:null,raw_persisted_at_utc:t("05:02"),decoded_original_body_sha256:body,binding_rights:h("d"),source_expires_at_utc:t("23:00"),population_query_id:id};
 return {scope,o,r};
}
describe("source-bound conditional service preparation",()=>{
 it("extracts prospective positive operator review candidate from exact original, without a native or publication claim",()=>{
  const {scope,o,r}=fixture(),x=prepare(scope,[o],[r],t("05:04"));
  expect(x.counts.conditionalCandidates).toBe(1);
  expect(x.privateCandidates[0].runDayIndex).toBe(2);
  expect(x.trainingOrPrePublicationAuthorized).toBe(false);
  expect(JSON.stringify(x)).not.toContain("SQ78");
 });
 it("matches only exact prospectively marked G5A normalized membership, not old provisional rows",()=>{
  const {scope,o,r}=fixture();
  const raw=r.raw_payload as any;
  const {canonicalEnvelopeHashSchema,canonicalEnvelopeSha256,...bare}=raw;
  const marked=addCanonicalFidsEnvelopeHashV39({...bare,fidsRequestContract:{...bare.fidsRequestContract,phase5ConditionalService:{protocolSha256:scope.protocolSha256,cohortStartUtc:scope.frozenStudyStartUtc}}});
  const report=prepare(scope,[o],[{...r,raw_payload:marked}],t("05:04"));
  const id=report.privateCandidates[0].stage14ConditionalFlightInstanceId!;
  expect(id).toMatch(/^leg:g5a:[a-f0-9]{64}$/);
  const m={population_query_id:scope.expectedPopulationQueryId,response_hash:scope.expectedResponseSha256,provider_content_expired_at_utc:null,population_member_id:"member-1",analytic_identity_id:id,canonical_flight_instance_id:id,source_airport_icao:"WSSS",dep_airport_icao:"WSSS",arr_airport_icao:"YSSY",flight_number:"SQ78",scope_classification:"unknown",codeshare_resolution_status:"g5a_conditional_operator_composite_no_native_id",source_type:"fids",population_role:"requested_airport_primary",query_direction:"Departure",dep_scheduled_utc:t("12:00"),available_at:t("05:02")};
  const x=match(scope,report,[m],1,t("05:04"));
  expect(x.stage14MatchedMembershipCount).toBe(1);
  // A previously valid report may no longer meet the required lead.
  expect(match(scope,report,[m],1,t("05:45")).stage14MatchedMembershipCount).toBe(0);
  expect(x.privateReviewProposals[0]).toMatchObject({flightInstanceId:id,identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",reviewedStableServiceKeySha256:id.slice(8)});
  expect(x.actualPreIssued).toBe(false);
  expect(x.privateReviewProposals[0]).toMatchObject({sourceMemberAvailableUtc:t("05:02"),observedDbClockUtc:t("05:04"),
   sourceBodySha256:scope.expectedDecodedBodySha256,queryDigestSha256:scope.source.queryDigestSha256});
  for(const patch of [{dep_scheduled_utc:null},{available_at:null},{available_at:"invalid"},{available_at:t("05:01")}])
   expect(match(scope,report,[{...m,...patch}],1,t("05:04"),t("05:02")).stage14MatchedMembershipCount).toBe(0);
  expect(()=>match(scope,report,[m,{...m,analytic_identity_id:"other"}],2,t("05:04"))).toThrow(/DUPLICATE_POPULATION_MEMBER_ID/);
  expect(JSON.stringify(x)).not.toContain(id);
  expect(match(scope,report,[{...m,canonical_flight_instance_id:null}],1,t("05:04")).stage14MatchedMembershipCount).toBe(0);
  expect(match(scope,prepare(scope,[o],[r],t("05:04")),[m],1,t("05:04")).stage14MatchedMembershipCount).toBe(0);
  expect(()=>match(scope,report,[m],2,t("05:04"))).toThrow(/MEMBER_COUNT/);
  expect(()=>match(scope,report,[{...m,response_hash:h("9")}],1,t("05:04"))).toThrow(/MEMBER_CUSTODY/);
 });
 it("rejects wrong response, body, rights, day, request scope, and late binding",()=>{
  const {scope,o,r}=fixture();
  expect(()=>prepare(scope,[{...o,original_response_hash:h("9")}],[r],t("05:04"))).toThrow(/ORIGINAL_BINDING/);
  expect(()=>prepare(scope,[o],[{...r,decoded_original_body_sha256:h("9")}],t("05:04"))).toThrow(/ORIGINAL_BINDING/);
  expect(()=>prepare(scope,[o],[{...r,binding_rights:h("9")}],t("05:04"))).toThrow(/ORIGINAL_BINDING/);
  expect(()=>prepare(scope,[{...o,run_day_index:3}],[r],t("05:04"))).toThrow(/ORIGINAL_BINDING/);
  expect(()=>prepare({...scope,expectedLocalTo:"wrong"},[o],[r],t("05:04"))).toThrow(/ORIGINAL_BINDING/);
  expect(()=>prepare(scope,[{...o,bound_at_utc:t("05:10")}],[r],t("05:04"))).toThrow(/SOURCE_CLOCK/);
  expect(()=>prepare({...scope,policyEffectiveUtc:t("05:01")},[o],[r],t("05:04"))).toThrow(/RETROSPECTIVE/);
 });
 it("accepts the real Stage28 SOURCE group and rejects the login-only or wrong database session before raw read",async()=>{
  const {scope,o,r}=fixture();
  const good={login:"phase5_p5_source_login_20261108",actor:"phase5_fids_source_prod_20261107",db:"neondb",version:160010,ro:"on",primary:true};
  const make=(role:Record<string,unknown>)=>{
   const queries:string[]=[];
   const pool={connect:async()=>({release(){},query:async(sql:string)=>{
    queries.push(sql);
    if(sql.startsWith("SELECT session_user"))return {rows:[role]};
    if(sql.includes("FROM clean.phase5_fids_allowed_query_v39"))return {rows:[{...o,normalized_members_count:0}]};
    if(sql.includes("SELECT r.raw_payload"))return {rows:[r]};
    if(sql.includes("FROM clean.flight_population"))return {rows:[]};
    if(sql.startsWith("SELECT clock_timestamp()"))return {rows:[{at:t("05:04")}]};
    return {rows:[]};
   }})};
   return {pool,queries};
  };
  const ok=make(good);
  const result=await read(ok.pool,scope);
  expect(result.report.counts.conditionalCandidates).toBe(1);
  expect(result.memberReview.stage14MatchedMembershipCount).toBe(0);
  expect(ok.queries.at(-1)).toBe("COMMIT");
  for(const bad of [{actor:good.login},{actor:"phase5_fids_pre_writer_prod_20261107"},{db:"wrong"},{version:150000},{version:170000},{version:NaN},{primary:false},{ro:"off"}]){
   const rejected=make({...good,...bad});
   await expect(read(rejected.pool,scope)).rejects.toThrow(/ROLE/);
   expect(rejected.queries.some(x=>x.includes("raw_payload"))).toBe(false);
   expect(rejected.queries.at(-1)).toBe("ROLLBACK");
  }
 });
 it("runtime signed read binds the actual stored digest and requires the prospective source marker before raw read",async()=>{
  const {scope,o,r}=fixture();
  const {expectedDecodedBodySha256,...rest}=scope;
  const input={...rest,expectedServiceWindowStartUtc:t("11:00"),expectedServiceWindowEndUtc:t("15:00")};
  const raw=r.raw_payload as any;
  const {canonicalEnvelopeHashSchema,canonicalEnvelopeSha256,...bare}=raw;
  const marked=addCanonicalFidsEnvelopeHashV39({...bare,fidsRequestContract:{...bare.fidsRequestContract,phase5ConditionalService:{protocolSha256:scope.protocolSha256,cohortStartUtc:scope.frozenStudyStartUtc}}});
  const make=(marker:string,body:string,original=marked,members:Record<string,unknown>[]=[],clocks:string[]=[])=>{
   const queries:string[]=[];let clockIndex=0;
   const pool={connect:async()=>({release(){},query:async(sql:string)=>{
    queries.push(sql);
    if(sql.startsWith("SELECT session_user"))return {rows:[{login:"phase5_p5_source_login_20261108",actor:"phase5_fids_source_prod_20261107",db:"neondb",version:160010,ro:"on",primary:true}]};
    if(sql.includes("FROM clean.phase5_fids_allowed_query_v39"))return {rows:[{...o,normalized_members_count:members.length,conditional_source_protocol_sha256:marker,decoded_original_body_sha256:body}]};
    if(sql.includes("SELECT r.raw_payload"))return {rows:[{...r,raw_payload:original}]};
    if(sql.includes("FROM clean.flight_population"))return {rows:members};
    if(sql.startsWith("SELECT clock_timestamp()"))return {rows:[{at:clocks[clockIndex++]??t("05:04")}]};
    return {rows:[]};
   }})};
   return {pool,queries};
  };
  const good=make(scope.protocolSha256,expectedDecodedBodySha256);
  expect((await readSigned(good.pool,input)).report.counts.conditionalCandidates).toBe(1);
  const window=make(scope.protocolSha256,expectedDecodedBodySha256);
  await expect(readSigned(window.pool,{...input,expectedServiceWindowEndUtc:t("14:00")})).rejects.toThrow(/SIGNED_SOURCE_WINDOW_DRIFT/);
  expect(window.queries.some(x=>x.includes("SELECT r.raw_payload"))).toBe(false);
  expect(good.queries.at(-1)).toBe("COMMIT");
  const id=prepare(scope,[o],[{...r,raw_payload:marked}],t("05:04")).privateCandidates[0].stage14ConditionalFlightInstanceId!;
  const m={population_query_id:scope.expectedPopulationQueryId,response_hash:scope.expectedResponseSha256,provider_content_expired_at_utc:null,population_member_id:"member-1",analytic_identity_id:id,canonical_flight_instance_id:id,source_airport_icao:"WSSS",dep_airport_icao:"WSSS",arr_airport_icao:"YSSY",flight_number:"SQ78",scope_classification:"unknown",codeshare_resolution_status:"g5a_conditional_operator_composite_no_native_id",source_type:"fids",population_role:"requested_airport_primary",query_direction:"Departure",dep_scheduled_utc:t("12:00"),available_at:t("05:02")};
  const actual=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
  const noFeature=await readSigned(actual.pool,input);
  expect(noFeature.conditionalFeatureReview.featureDraftCount).toBe(0);
  const withFeature=await readSigned(actual.pool,{...input,externalContentUseReviewSha256:h("8")});
  expect(withFeature.conditionalFeatureReview).toMatchObject({featureDraftCount:1,evidencedFidsFields:4,missingFidsFields:0,actualPreIssued:false});
  const draft=withFeature.privateFeatureDrafts[0];
  expect(draft.identityEvidenceTier).toBe("CONDITIONAL_QUERY_FILTERED_SERVICE");
  expect(draft.physicalGateOutCertified).toBe(false);
  expect(draft.compiled.bundle.observations.map(x=>[x.field,x.value])).toEqual([["operating_carrier","SIA"],["scheduled_arrival_utc",t("20:00")],["provider_revised_departure_utc",t("12:15")],["reported_pre_departure_status","Scheduled"]]);
  expect(draft.compiled.bundle.externalSourceAndContentsReviewReceiptSha256).toBe(h("8"));
  // F033: the final clock arrives after the minimum review lead was lost.
  // No stale private proposal or candidate can survive just because the
  // earlier source/member read completed before the boundary.
  const late=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m],
   [t("05:04"),t("05:04"),t("05:04"),t("05:45")]);
  const expiredLead=await readSigned(late.pool,{...input,externalContentUseReviewSha256:h("8")});
  expect(expiredLead.observedDbClockUtc).toBe(t("05:45"));
  expect(expiredLead.report.counts).toMatchObject({conditionalCandidates:0,lateOrStale:1});
  expect(expiredLead.report.privateCandidates).toHaveLength(0);
  expect(expiredLead.memberReview.stage14MatchedMembershipCount).toBe(0);
  expect(expiredLead.memberReview.privateReviewProposals).toHaveLength(0);
  expect(expiredLead.conditionalFeatureReview).toMatchObject({featureDraftCount:0,lateDraftCount:1,actualPreIssued:false});
  expect(expiredLead.privateFeatureDrafts).toHaveLength(0);
  const stillLive=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m],
   [t("05:04"),t("05:04"),t("05:04"),t("05:44")]);
  const updated=await readSigned(stillLive.pool,{...input,externalContentUseReviewSha256:h("8")});
  expect(updated.memberReview.privateReviewProposals[0].observedDbClockUtc).toBe(t("05:44"));
  expect(updated.privateFeatureDrafts).toHaveLength(1);
  expect(JSON.stringify(withFeature)).not.toMatch(/SIA|SQ78|Scheduled|privateFeatureDrafts/);
  await expect(readSigned(actual.pool,{...input,externalContentUseReviewSha256:"bad"})).rejects.toThrow(/CONDITIONAL_FEATURE_REVIEW_SCOPE/);
  for(const [marker,body] of [[h("9"),expectedDecodedBodySha256],[scope.protocolSha256,"bad"]]){
   const rejected=make(marker,body);
   await expect(readSigned(rejected.pool,input)).rejects.toThrow(/SIGNED_SOURCE_MARKER_OR_BODY_BINDING/);
   expect(rejected.queries.some(x=>x.includes("SELECT r.raw_payload"))).toBe(false);
  }
  const wrongCohort=make(scope.protocolSha256,expectedDecodedBodySha256,addCanonicalFidsEnvelopeHashV39({...bare,fidsRequestContract:{...bare.fidsRequestContract,phase5ConditionalService:{protocolSha256:scope.protocolSha256,cohortStartUtc:t("01:00")}}}));
  await expect(readSigned(wrongCohort.pool,input)).rejects.toThrow(/SIGNED_ORIGINAL_COHORT_MARKER_DRIFT/);
  expect(wrongCohort.queries.at(-1)).toBe("ROLLBACK");
  const wrongBody=make(scope.protocolSha256,h("9"));
  await expect(readSigned(wrongBody.pool,input)).rejects.toThrow(/ORIGINAL_BINDING/);
  expect(wrongBody.queries.at(-1)).toBe("ROLLBACK");
 });
 it("fails before any original body read if source role is wrong",async()=>{
  const {scope}=fixture(),queries:string[]=[];
  const pool={connect:async()=>({release(){},query:async(sql:string)=>{queries.push(sql);return {rows:sql.startsWith("SELECT session_user")?[{login:"wrong",actor:"wrong",ro:"on",primary:true}]:[]};}})};
  await expect(read(pool,scope)).rejects.toThrow(/ROLE/);
  expect(queries.some(x=>x.includes("raw_payload"))).toBe(false);
  expect(queries.at(-1)).toBe("ROLLBACK");
 });
});