import {deriveP6ConditionalT24Scope,verifyP6T24PrivateRegistry,p6T24RegistryReviewPreimage} from "../server/lib/disruption/phase6PrivateT24RegistryTransport_v39.mjs";
import {projectP6T24QueuePackets} from "../server/lib/disruption/phase6PrivateT24QueueRouting_v39.mjs";
import {resolveP7ConditionalPublicationPage} from "../server/lib/disruption/phase7IndependentPreProofPublication_v39.mjs";
import type {Phase7CanonicalFieldDisposition} from "../server/lib/disruption/phase7CanonicalFieldParity_v39";
import {verifyP5SignedLaterPreDayRegistry,type P5SignedLaterPreDayRegistry,type P5SignedLaterPreDayRegistryPins} from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedSourceBatchRegistry} from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {addCanonicalFidsEnvelopeHashV39} from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {readP7ExactConditionalSelectedFeaturesPage,readP7ReviewedTierSelectedFeaturesPage,requireP7ActualSourceReadback} from "../server/lib/disruption/phase7IndependentPreSourceReader_v39";
import {digestP5ConditionalPermitEvidence,prepareP5ConditionalPrePermitForIndependentSigning,prepareP5ConditionalPrePermitPageForIndependentSigning,buildP5ConditionalPrePacketPreview,buildP5ConditionalPreProofPage,completeP5ConditionalPreProofPage,attachP5ConditionalPreFieldProof,prepareP5ConditionalPrePermitPageFromSignedReviews,p5ConditionalReviewPagePreimage,type P5ConditionalReviewPage} from "../server/lib/disruption/phase5ConditionalPrePermitPreparation_v39";
import {generateKeyPairSync,sign} from "node:crypto";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import {digestP5LaterShardPrivatePacketFileManifest,signedP5ExternalLaterReviewBytes,verifyP5ExternalEd25519ReviewOfLaterShard,type P5Ed25519ExternalLaterShardReview,type P5Ed25519ReviewWireEnvelope} from "../server/lib/disruption/phase5ExternalEd25519LaterShardReviewerVerify_v39";
import {proposeP5ConditionalLaterPacketsAsUnsignedDayShard} from "../server/lib/disruption/phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39";
import {verifyP5ConditionalQueuePacket} from "../server/lib/disruption/phase5ConditionalPreQueuePacket_v39";
import {verifyP5CdFrozenRoster,type P5CdFrozenRoster} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
import {readP5CdConditionalPreScope} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import type {P5Stage14SingleFlightPrePermit} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {prepareP5BoundConditionalServiceReview as prepare,readP5BoundConditionalServiceReview as read,readP5SignedConditionalServiceReview as readSigned,matchP5ConditionalStage14Members as match} from "../server/lib/disruption/phase5ConditionalBoundSourceReview_v39";
const h=(c:string)=>c.repeat(64),t=(s:string)=>"2035-11-25T"+s+":00.000Z";
function fixture(){
 const manifest=createHash("sha256").update("synthetic manifest").digest("hex"),rights=createHash("sha256").update("synthetic rights review").digest("hex");
 const departures=[{number:"SQ78",codeshareStatus:"IsOperator",isCargo:false,airline:{icao:"SIA"},status:"Scheduled",departure:{scheduledTime:{utc:t("12:00")},revisedTime:{utc:t("12:15")}},arrival:{airport:{icao:"YSSY"},scheduledTime:{utc:t("20:00")}}}];
 const bytes=Buffer.from(JSON.stringify({departures,arrivals:[]}));
 const body=createHash("sha256").update(bytes).digest("hex");
 const id="c23e4567-e89b-42d3-a456-426614174013";
 const p=addCanonicalFidsEnvelopeHashV39({fidsRequestContract:{schema:"v39.fids-request-frame.application-intent.v1",endpointKind:"airport_local_fids",direction:"Departure",airportIcao:"WSSS",fromLocal:"2035-11-25T19:00",toLocal:"2035-11-25T20:00",withLeg:true,withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false,withLocation:false,openapiSha256:h("e")},payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",originalHttpWireBytesPreserved:false,originalDecodedEntityBodyPreserved:true,originalDecodedEntityBodyEvidence:{schema:"v39.fids-fetch-decoded-source-body.v1",representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",bodySha256:body,bodyLengthBytes:bytes.length,bodyBase64:bytes.toString("base64")},departures,arrivals:[],fetchedAtUtc:t("05:01")});
 const scope={source:{manifestSha256:manifest,queryDigestSha256:h("b"),reviewedReleaseSha256:h("c"),rightsReviewSha256:rights,providerContractSha256:h("e"),earlyDrawSha256:h("f"),runDayIndex:2,slot:"HUB",horizon:"T-6h" as const,airportIcao:"WSSS",expectedSourceGithubRunId:"123456",maxPopulationStalenessSeconds:3600,plannedRequestUtc:t("05:00")},protocolSha256:h("1"),ownerProspectiveSeparateTierApproved:true as const,frozenStudyStartUtc:t("00:00"),policyEffectiveUtc:t("04:00"),minimumReviewLeadSeconds:900,expectedPopulationQueryId:id,expectedResponseSha256:h("2"),expectedDecodedBodySha256:body,expectedLocalFrom:"2035-11-25T19:00",expectedLocalTo:"2035-11-25T20:00"};
 const o={manifest_sha256:manifest,run_day_index:2,slot_id:"HUB",horizon:"T-6h",airport_icao:"WSSS",fids_airport_icao:"WSSS",github_run_id:"123456",attempt_run_id:"123456",state:"ACTIVE",early_draw_sha256:h("f"),reviewed_release_sha256:h("c"),rights_review_sha256:rights,provider_contract_sha256:h("e"),bound_rights:rights,population_query_id:id,original_response_hash:h("2"),fids_response_hash:h("2"),original_current:true,reserved_at:t("05:00"),fids_retrieval_utc:t("05:01"),raw_persisted_at_utc:t("05:02"),source_available:t("05:02"),bound_at_utc:t("05:03"),source_expires_at_utc:t("23:00"),service_window_start_utc:t("11:00"),service_window_end_utc:t("15:00")};
 const r={raw_payload:p,stored_response_hash:h("2"),raw_expired_at_utc:null,raw_persisted_at_utc:t("05:02"),decoded_original_body_sha256:body,binding_rights:rights,source_expires_at_utc:t("23:00"),population_query_id:id};
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
  // Exact independent conditional readback uses the same original and actual
  // restricted reader, not a publisher's self-declared feature values.
  const p={manifestSha256:scope.source.manifestSha256,queryDigestSha256:scope.source.queryDigestSha256,
   expectedSourcePopulationQueryId:scope.expectedPopulationQueryId,expectedSourceResponseSha256:scope.expectedResponseSha256,
   runDayIndex:2,slot:"HUB",horizon:"T-6h",airportIcao:"WSSS",flightInstanceId:id,expectedGithubSourceRunId:"123456",
   expectedReviewedReleaseSha256:scope.source.reviewedReleaseSha256,expectedReviewedSourceRightsSha256:scope.source.rightsReviewSha256,
   expectedProviderContractSha256:scope.source.providerContractSha256,expectedEarlyDrawSha256:scope.source.earlyDrawSha256,
   selectedTNativeUtc:t("12:00"),maxPopulationStalenessSeconds:3600,identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",
   requireProspectiveConditionalSourceMarker:true,externalConditionalScheduleSourceAndUseReviewed:true,
   reviewedProtocolAmendmentSha256:scope.protocolSha256,reviewedStableServiceKeySha256:id.slice(8),
   expectedOperatorFlightNumber:"SQ78",expectedDestinationIcao:"YSSY",reviewedSupplementalFeatureBundle:draft.compiled.bundle
  } as P5Stage14SingleFlightPrePermit;
  const proofScope={...input,externalContentUseReviewSha256:h("8")};
  // T029: actual restricted source reread + separate reviewed bytes construct
  // the existing Stage14 permit, not an invented native identity or T24.
  const review={schema:"v39.phase5.external-conditional-pre-permit-review.v1",reviewedCodeSha:"a".repeat(40),
   reviewedProtocolSha256:scope.protocolSha256,reviewedMemberEvidenceSha256:digestP5ConditionalPermitEvidence(withFeature.memberReview.privateReviewProposals[0],draft,withFeature.privateSourceBoundAtUtc),
   reviewedAtUtc:t("05:04"),reviewedFrameSha256:h("4"),reviewedConfigSha256:h("5"),reviewedConditionalServiceEvidenceSha256:h("6"),
   reviewedReportedScheduleEvidenceSha256:h("7"),reviewedRunAndRetentionEvidenceSha256:h("8"),frozenBuilderSha256:h("9"),builderFrozenAtUtc:t("04:00"),
   selectedTConfig:{milestone:"departure.scheduledTime.utc",version:"v1",artifactHash:h("a"),verifiedProviderNativeSchedule:true,semanticsEvidenceSha256:h("7")},
   reviewedConditionalScheduleSourceAndUse:true,nativeOperatingLegCertified:false,
   reviewedStandaloneLaterNoT24:{schema:"v39.phase5.standalone-later-asof-no-t24.v1",reviewedProtocolSha256:h("b"),reviewedOriginalResponseSha256:scope.expectedResponseSha256,
    reviewedNativeTSemanticsSha256:h("7"),missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",independentLaterAsOfAndMissingnessReviewAttested:true}};
  const preparePermit=async(v:unknown=review,patch:Record<string,unknown>={},clocks:string[]=[])=>{
   const bytes=Buffer.from(JSON.stringify(v)),pins={expectedReviewArtifactSha256:createHash("sha256").update(bytes).digest("hex"),expectedReviewedCodeSha:"a".repeat(40),expectedConditionalProtocolSha256:scope.protocolSha256,expectedExternalContentUseReviewSha256:h("8"),separatelyApprovedStandaloneProtocolSha256:h("b"),...patch};
   return prepareP5ConditionalPrePermitForIndependentSigning(make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m],clocks).pool,proofScope,id,bytes,pins);
  };
  const built=await preparePermit();
  expect(built.privatePermit).toMatchObject(p);
  // T035: one bounded C+D page uses one actual original read, validates
  // independent artifacts before SQL and never signs or duplicates a permit.
  const pageInput={flightInstanceId:id,reviewBytes:Buffer.from(JSON.stringify(review)),pins:{expectedReviewArtifactSha256:createHash("sha256").update(JSON.stringify(review)).digest("hex"),expectedReviewedCodeSha:"a".repeat(40),expectedConditionalProtocolSha256:scope.protocolSha256,expectedExternalContentUseReviewSha256:h("8"),separatelyApprovedStandaloneProtocolSha256:h("b")}};
  const pageDb=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
  const page=await prepareP5ConditionalPrePermitPageForIndependentSigning(pageDb.pool,proofScope,[pageInput]);
  expect(page).toMatchObject({preparedCount:1,originalBodyReadCount:1,signedPrePacketsIssued:0,providerCalls:0,databaseWrites:0});
  expect(page.privatePrepared[0].privatePermit).toEqual(built.privatePermit);
  expect(pageDb.queries.filter(x=>x.includes("SELECT r.raw_payload"))).toHaveLength(1);
  // T045: a protected independent reviewer signs exact dynamic artifact pins,
  // not a publisher-selected digest. Authenticate before touching SQL.
  const permitReviewer=generateKeyPairSync("ed25519");
  const permitAuthority={expectedReviewerFingerprintSha256:createHash("sha256").update(permitReviewer.publicKey.export({format:"der",type:"spki"})).digest("hex"),
   reviewerPublicKeyPem:permitReviewer.publicKey.export({type:"spki",format:"pem"}).toString(),expectedReviewedCodeSha:review.reviewedCodeSha,
   forbiddenSignerFingerprints:[h("f")],independentlyApprovedStandaloneProtocolSha256:h("b")};
  const reviewPage:P5ConditionalReviewPage={schema:"v39.phase5.conditional-pre-external-review-page.v1",reviewedCodeSha:review.reviewedCodeSha,
   manifestSha256:proofScope.source.manifestSha256,rightsSha256:proofScope.source.rightsReviewSha256,protocolSha256:proofScope.protocolSha256,
   externalContentUseReviewSha256:proofScope.externalContentUseReviewSha256,queryDigestSha256:proofScope.source.queryDigestSha256,
   populationQueryId:proofScope.expectedPopulationQueryId,responseSha256:proofScope.expectedResponseSha256,runDayIndex:proofScope.source.runDayIndex,
   horizon:proofScope.source.horizon,sourceGithubRunId:proofScope.source.expectedSourceGithubRunId,
   reviews:[{flightInstanceId:id,reviewArtifactBase64:pageInput.reviewBytes.toString("base64"),reviewArtifactSha256:pageInput.pins.expectedReviewArtifactSha256,separatelyApprovedStandaloneProtocolSha256:h("b")}]};
  const reviewWire=(x=reviewPage)=>({page:x,signatureBase64:sign(null,p5ConditionalReviewPagePreimage(x),permitReviewer.privateKey).toString("base64")});
  const wireDb=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
  const signedPage=await prepareP5ConditionalPrePermitPageFromSignedReviews(wireDb.pool,proofScope,[id],reviewWire(),permitAuthority);
  expect(signedPage.privatePrepared[0].privatePermit).toEqual(built.privatePermit);
  expect(wireDb.queries.filter(x=>x.includes("SELECT r.raw_payload"))).toHaveLength(1);
  const rejectDb=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
  const tryReview=(w=reviewWire(),a=permitAuthority,ids=[id])=>prepareP5ConditionalPrePermitPageFromSignedReviews(rejectDb.pool,proofScope,ids,w,a);
  await expect(tryReview({...reviewWire(),signatureBase64:Buffer.alloc(64).toString("base64")})).rejects.toThrow("SIGNED_REVIEW_PAGE_SIGNATURE");
  await expect(tryReview(reviewWire({...reviewPage,queryDigestSha256:h("0")}))).rejects.toThrow("EXACT_SIGNED_REVIEW_PAGE_SCOPE");
  await expect(tryReview(reviewWire({...reviewPage,reviews:[{...reviewPage.reviews[0],reviewArtifactSha256:h("0")}]}))).rejects.toThrow("EXACT_SIGNED_REVIEW_ARTIFACT_BYTES");
  await expect(tryReview(reviewWire(),{...permitAuthority,independentlyApprovedStandaloneProtocolSha256:h("0")})).rejects.toThrow("EXACT_SIGNED_REVIEW_ARTIFACT_SET");
  await expect(tryReview(reviewWire(),{...permitAuthority,forbiddenSignerFingerprints:[permitAuthority.expectedReviewerFingerprintSha256]})).rejects.toThrow("EXACT_SIGNED_REVIEW_PAGE_SCOPE");
  await expect(tryReview(reviewWire(),permitAuthority,[id,id])).rejects.toThrow("EXACT_SIGNED_REVIEW_PAGE_SCOPE");
  expect(rejectDb.queries).toHaveLength(0);
  expect(JSON.stringify(page)).not.toMatch(/SQ78|privatePrepared|SIA/);
  const badPage=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
  await expect(prepareP5ConditionalPrePermitPageForIndependentSigning(badPage.pool,proofScope,[pageInput,pageInput])).rejects.toThrow("EXACT_PAGE_SCOPE");
  await expect(prepareP5ConditionalPrePermitPageForIndependentSigning(badPage.pool,proofScope,[pageInput,{...pageInput,flightInstanceId:"leg:g5a:"+h("9"),pins:{...pageInput.pins,expectedReviewArtifactSha256:h("0")}}])).rejects.toThrow("INDEPENDENT_REVIEW_PINS");
  expect(badPage.queries).toHaveLength(0);
  const missingPage=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
  await expect(prepareP5ConditionalPrePermitPageForIndependentSigning(missingPage.pool,proofScope,[pageInput,{...pageInput,flightInstanceId:"leg:g5a:"+h("9")}])).rejects.toThrow("CURRENT_ELIGIBLE_MEMBER_REQUIRED");
  expect(missingPage.queries.filter(x=>x.includes("SELECT r.raw_payload"))).toHaveLength(1);
  expect(built.privatePermit.externalNativeTPhysicalLegAndSourceUseReviewed).toBeUndefined();
  expect(built.privateWitnessReview).toBeNull();
  // T036 actual prepared conditional permit -> independent signed proof ->
  // exact private packet bytes -> existing C+D roster consumer. Synthetic
  // signer is fixture only; no production registry signature or SQL claim.
  const preview=buildP5ConditionalPrePacketPreview(built),keys=generateKeyPairSync("ed25519");
  const hd=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex"),policySha=hd("policy"),env={
   P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:policySha,P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:hd(keys.publicKey.export({type:"spki",format:"der"})),P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(keys.publicKey.export({type:"spki",format:"pem"})).toString("base64")};
  const meta=Buffer.from(JSON.stringify({schema:"v39.phase7.separate-pre-field-proof.v1",manifestSha256:p.manifestSha256,rightsSha256:p.expectedReviewedSourceRightsSha256,policySha256:policySha,permitSha256:hashPhase7DurableCandidate(preview.packet.prePermit),issuedAtUtc:t("05:04"),validUntilUtc:t("06:00"),fields:[]}));
  const wire={payloadBase64:meta.toString("base64"),signatureBase64:sign(null,meta,keys.privateKey).toString("base64")};
  // T041: same actual independently prepared member enters the shared
  // bounded proof interface; never expose the private packet in JSON.
  const proofPage=buildP5ConditionalPreProofPage(page.privatePrepared);
  expect(proofPage).toMatchObject({phase7ProofPreviewOnly:true,signatureIssued:false,packetCount:1,providerCalls:0,databaseWrites:0,phase6PaidGo:false});
  expect(proofPage.privateCompletedPackets[0].completed.packet.prePermit).toEqual(built.privatePermit);
  expect(Object.getOwnPropertyDescriptor(proofPage,"privateCompletedPackets")?.enumerable).toBe(false);
  expect(JSON.stringify(proofPage)).not.toMatch(/SQ78|privateCompletedPackets|SIA/);
  expect(()=>buildP5ConditionalPreProofPage([])).toThrow("EXACT_PROOF_PAGE_SCOPE");
  expect(()=>buildP5ConditionalPreProofPage([built,built])).toThrow("EXACT_PROOF_PAGE_SCOPE");
  expect(()=>buildP5ConditionalPreProofPage(Array(97).fill(built))).toThrow("EXACT_PROOF_PAGE_SCOPE");
  expect(()=>buildP5ConditionalPreProofPage([{...built}])).toThrow("ACTUAL_PREPARED_PERMIT_REQUIRED");
  const proofKey=hashPhase7DurableCandidate(preview.packet.prePermit),proofs=new Map([[proofKey,wire]]);
  const attachedPage=completeP5ConditionalPreProofPage(proofPage,env,policySha,[],proofs);
  expect(attachedPage).toMatchObject({packetCount:1,signatureIssued:false,databaseWrites:0});
  expect(JSON.stringify(attachedPage)).not.toMatch(/SQ78|privateAttachedPackets|payloadBase64/);
  expect(()=>completeP5ConditionalPreProofPage(proofPage,env,policySha,[],new Map())).toThrow("EXACT_CONDITIONAL_PROOF_SET");
  expect(()=>completeP5ConditionalPreProofPage(proofPage,env,policySha,[],new Map([...proofs,["extra",wire]]))).toThrow("EXACT_CONDITIONAL_PROOF_SET");
  expect(()=>completeP5ConditionalPreProofPage({...proofPage},env,policySha,[],proofs)).toThrow("ACTUAL_CONDITIONAL_PROOF_PAGE_REQUIRED");
  // T046: actual shared policy/proof resolver. The empty-disposition
  // policy is a synthetic wire/clock fixture, not production field approval.
  const contract={sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:"2036-01-01T00:00:00.000Z"},profile={mappingExpiryHours:24},dispositions:Phase7CanonicalFieldDisposition[]=[];
  const staticReview={schema:"v39.phase7.prospective-pre-preservation-review.v1",manifestSha256:p.manifestSha256,
   rightsSha256:p.expectedReviewedSourceRightsSha256,contractSha256:hashPhase7DurableCandidate(contract),profileSha256:hashPhase7DurableCandidate(profile),
   dispositionsSha256:hashPhase7DurableCandidate(dispositions),mappingHours:24,researchExpiryUtc:contract.researchExpiryUtc,
   approvedForPreDurableStorage:true,boundedSameLegLinkApproved:true};
  const staticSha=hashPhase7DurableCandidate(staticReview);
  const protectedEnv={...env,V39_P5_MANIFEST_SHA256:p.manifestSha256,V39_P5_RIGHTS_SHA256:p.expectedReviewedSourceRightsSha256,
   P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:staticSha,
   P6_PHASE7_PRE_POLICY_BASE64:Buffer.from(JSON.stringify({contract,profile,dispositions,review:staticReview,reviewSha256:staticSha})).toString("base64")};
  const sharedWire=(permit:P5Stage14SingleFlightPrePermit)=>{
   const raw=Buffer.from(JSON.stringify({...JSON.parse(meta.toString("utf8")),policySha256:staticSha,permitSha256:hashPhase7DurableCandidate(permit)}));
   return {payloadBase64:raw.toString("base64"),signatureBase64:sign(null,raw,keys.privateKey).toString("base64")};
  };
  let portCalls=0;
  const sharedPort={readExactPermitProofs:async(permits:readonly P5Stage14SingleFlightPrePermit[])=>{
   portCalls++;return new Map(permits.map(x=>[hashPhase7DurableCandidate(x),sharedWire(x)]));
  }};
  const sharedDb=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
  const sharedArgs={pool:sharedDb.pool,scope:proofScope,requestedFlightIds:[id],reviewWire:reviewWire(),reviewAuthority:permitAuthority,
   env:protectedEnv,port:sharedPort,readClock:async()=>t("05:05"),forbiddenSignerFingerprints:[h("e")]};
  const shared=await resolveP7ConditionalPublicationPage(sharedArgs);
  expect(shared.privateAttachedPackets[0].packet.prePermit).toEqual(built.privatePermit);
  expect(shared.packetCount).toBe(1);expect(portCalls).toBe(1);
  expect(JSON.stringify(shared)).not.toMatch(/SQ78|privateAttachedPackets|payloadBase64/);
  await expect(resolveP7ConditionalPublicationPage({...sharedArgs,readClock:async()=>t("05:45")})).rejects.toThrow("STALE_OR_LATE_PROOF");
  await expect(resolveP7ConditionalPublicationPage({...sharedArgs,port:{readExactPermitProofs:async()=>new Map()}})).rejects.toThrow("EXACT_PROOF_SET_MISSING");
  const aliasDb=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
  await expect(resolveP7ConditionalPublicationPage({...sharedArgs,pool:aliasDb.pool,
   forbiddenSignerFingerprints:[permitAuthority.expectedReviewerFingerprintSha256]})).rejects.toThrow("CONDITIONAL_PROTECTED_SCOPE_OR_SIGNER_ALIAS");
  expect(aliasDb.queries).toHaveLength(0);
  const packet=attachedPage.privateAttachedPackets[0];
  expect(packet.packetSha256).toBe(hd(packet.packetBytes));
  expect(JSON.stringify(packet)).not.toMatch(/SQ78|payloadBase64|privatePermit/);
  const release={schema:"v39.phase5.cd-gh-pre-explicit-release.v1" as const,releaseMode:"PHASE6_APPROVED" as const,approvedCodeSha:review.reviewedCodeSha,
   rosterSha256:"",rightsSha256:p.expectedReviewedSourceRightsSha256,manifestSha256:p.manifestSha256,stop:false as const,providerCalls:0 as const,scientificFreezeEstablishedByThisFunction:false as const,
   conditionalPreScope:{protocolSha256:scope.protocolSha256,externalContentUseReviewSha256:h("8")},independentlyApprovedStandaloneProtocolSha256:h("b")};
  const path="data-collection/phase5/frozen/conditional_ci_packet.json",roster:P5CdFrozenRoster={schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1",reviewedCodeSha:release.approvedCodeSha,manifestSha256:release.manifestSha256,rightsSha256:release.rightsSha256,entries:[{filePath:path,packetSha256:packet.packetSha256}]};
  const rosterBytes=Buffer.from(JSON.stringify(roster)),gate={...release,rosterSha256:hd(rosterBytes)},files=[{filePath:path,packetSha256:packet.packetSha256,bytes:packet.packetBytes}];
  expect(verifyP5CdFrozenRoster(rosterBytes,roster,files,gate).get(packet.packetSha256)?.permit).toEqual(built.privatePermit);
  // T039: actual same fixture independent proof and packet through existing
  // signed later-day registry. No extra writer or approval inferred.
  const src:P5SignedSourceBatchRegistry={schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",manifestSha256:gate.manifestSha256,runDayIndex:p.runDayIndex,entries:[{filePath:"data-collection/phase5/frozen/source_ci_query_packet.json",expectedPacketSha256:h("2"),expectedQueryDigestSha256:p.queryDigestSha256}]};
  const srcBytes=Buffer.from(JSON.stringify(src)),reg:P5SignedLaterPreDayRegistry={schema:"v39.phase5.signed-later-pre-day-registry.v1",manifestSha256:gate.manifestSha256,reviewedCodeSha:gate.approvedCodeSha,runDayIndex:p.runDayIndex,shardIndex:1,sourceDayRegistrySha256:hd(srcBytes),sourceDayRegistryFilePath:"data-collection/phase5/frozen/source_ci_registry.json",entries:[{filePath:path,expectedPacketSha256:packet.packetSha256,expectedQueryDigestSha256:p.queryDigestSha256,expectedFlightInstanceId:p.flightInstanceId,expectedHorizon:"T-6h",expectedSelectedTNativeUtc:p.selectedTNativeUtc,expectedSourcePopulationQueryId:p.expectedSourcePopulationQueryId}]};
  const regBytes=Buffer.from(JSON.stringify(reg)),rp:P5SignedLaterPreDayRegistryPins={registryFilePath:"data-collection/phase5/frozen/later_ci_registry.json",expectedRegistrySha256:hd(regBytes),expectedSourceDayRegistrySha256:hd(srcBytes),expectedManifestSha256:gate.manifestSha256,expectedApprovedMainSha:gate.approvedCodeSha,expectedRunDayIndex:p.runDayIndex,expectedReleaseSha256:p.expectedReviewedReleaseSha256,expectedRightsSha256:gate.rightsSha256,conditionalPreScope:gate.conditionalPreScope,independentlyApprovedStandaloneProtocolSha256:gate.independentlyApprovedStandaloneProtocolSha256};
  // T042: real proof-attached page -> unsigned conditional registry producer
  // -> exact existing consumer, with no native attestation or signed publish.
  const proposalScope={expectedExternallyApprovedSourceRegistrySha256:hd(srcBytes),sourceRegistryFilePath:reg.sourceDayRegistryFilePath,
   proposedLaterRegistryFilePath:rp.registryFilePath,reviewedMainCodeSha:gate.approvedCodeSha,expectedManifestSha256:gate.manifestSha256,
   expectedReviewedReleaseSha256:p.expectedReviewedReleaseSha256,expectedReviewedSourceRightsSha256:gate.rightsSha256,
   runDayIndex:p.runDayIndex,shardIndex:1,conditionalPreScope:gate.conditionalPreScope,independentlyApprovedStandaloneProtocolSha256:h("b")};
  const proposalFile={proposedFilePath:path,expectedExternallyPinnedReviewArtifactSha256:packet.packet.reviewArtifactSha256,completed:packet};
  const plan=proposeP5ConditionalLaterPacketsAsUnsignedDayShard(srcBytes,src,proposalScope,[proposalFile]);
  expect(plan).toMatchObject({independentlySignedRegistry:false,flightFilesPublished:0,registeredV0091Tasks:0,providerCalls:0,databaseWrites:0});
  expect(verifyP5SignedLaterPreDayRegistry(plan.registryProposalBytes,plan.registryProposal,srcBytes,src,{...rp,expectedRegistrySha256:plan.proposedRegistrySha256},()=>packet.packetBytes).entries[0].packet.prePermit).toEqual(built.privatePermit);
  expect(()=>proposeP5ConditionalLaterPacketsAsUnsignedDayShard(srcBytes,src,proposalScope,[proposalFile,{...proposalFile,proposedFilePath:"data-collection/phase5/frozen/conditional_duplicate.json"}])).toThrow();
  expect(()=>proposeP5ConditionalLaterPacketsAsUnsignedDayShard(srcBytes,src,{...proposalScope,conditionalPreScope:{...proposalScope.conditionalPreScope,protocolSha256:h("0")}},[proposalFile])).toThrow();
  expect(()=>proposeP5ConditionalLaterPacketsAsUnsignedDayShard(srcBytes,src,proposalScope,[{...proposalFile,completed:{...packet}}])).toThrow("ACTUAL_PROOF_ATTACHED_PACKET_REQUIRED");
  expect(()=>proposeP5ConditionalLaterPacketsAsUnsignedDayShard(srcBytes,{...src,runDayIndex:3},proposalScope,[proposalFile])).toThrow("SOURCE_REGISTRY_SCOPE_OR_EXACT_BYTES_CHANGED");
  // T043: a distinct conditional reviewer scope is signed along with exact
  // source/registry/packet manifest; native reviewer wires cannot authorize it.
  const reviewer=generateKeyPairSync("ed25519"),reviewerPem=reviewer.publicKey.export({type:"spki",format:"pem"}).toString(),
   reviewerFp=hd(reviewer.publicKey.export({type:"spki",format:"der"}));
  const conditionalPreScope={...proposalScope.conditionalPreScope,independentlyApprovedStandaloneProtocolSha256:h("b")};
  const reviewerPins={expectedReviewerPublicKeyFingerprintSha256:reviewerFp,expectedApprovedMainCodeSha:gate.approvedCodeSha,
   expectedReviewedReleaseSha256:p.expectedReviewedReleaseSha256,expectedReviewedRightsSha256:gate.rightsSha256,
   expectedIndependentReviewerEvidenceDigestSha256:hd("conditional reviewer fixture"),conditionalPreScope};
  const externalReview:P5Ed25519ExternalLaterShardReview={schema:"v39.phase5.external-ed25519-later-shard-review.v1",
   audience:"HKcode22/ReplitTranvr:PHASE6_LATER_PRE_REVIEW_ONLY",reviewerPublicKeyFingerprintSha256:reviewerFp,
   reviewedMainCodeSha:gate.approvedCodeSha,reviewedManifestSha256:gate.manifestSha256,reviewedReleaseSha256:p.expectedReviewedReleaseSha256,
   reviewedRightsSha256:gate.rightsSha256,sourceDayRegistrySha256:plan.sourceRegistrySha256,sourceDayRegistryFilePath:reg.sourceDayRegistryFilePath,
   proposedRegistrySha256:plan.proposedRegistrySha256,proposedRegistryFilePath:plan.proposedRegistryFilePath,
   packetFileManifestSha256:digestP5LaterShardPrivatePacketFileManifest(plan),runDayIndex:p.runDayIndex,shardIndex:1,
   reviewedAtUtc:t("05:04"),validUntilUtc:t("05:59"),independentReviewerEvidenceDigestSha256:reviewerPins.expectedIndependentReviewerEvidenceDigestSha256,conditionalPreScope};
  const wireFor=(review:P5Ed25519ExternalLaterShardReview):P5Ed25519ReviewWireEnvelope=>({schema:"v39.phase5.external-ed25519-later-shard-envelope.v1",
   review,signatureBase64:sign(null,signedP5ExternalLaterReviewBytes(review),reviewer.privateKey).toString("base64")});
  const signed=wireFor(externalReview),check=(w=signed,pins=reviewerPins,clock=t("05:05"))=>verifyP5ExternalEd25519ReviewOfLaterShard(plan,w,reviewerPem,pins,clock);
  expect(check()).toMatchObject({signatureCryptographicallyVerified:true,privatePacketOrRegistryFilesPublished:0,phase6PaidGoGranted:false});
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(plan,signed,reviewerPem,{...reviewerPins,conditionalPreScope:undefined},t("05:05"))).toThrow();
  expect(()=>check(wireFor({...externalReview,conditionalPreScope:{...conditionalPreScope,protocolSha256:h("0")}}))).toThrow();
  expect(()=>check(wireFor({...externalReview,conditionalPreScope:undefined}))).toThrow();
  expect(()=>check(signed,reviewerPins,t("06:00"))).toThrow("REVIEW_SIGNATURE_PREMATURE_EXPIRED_OR_REPLAYED");
  const {conditionalPreScope:_scope,...legacyReview}=externalReview;
  expect(()=>check({...signed,signatureBase64:wireFor(legacyReview).signatureBase64})).toThrow("EXTERNAL_REVIEW_SIGNATURE_INVALID");
  // T047 synthetic T24 signed transport/witness metadata, not a real PRE.
  // Use a separate conditional registry domain and the existing singleton
  // roster. No standalone later approval is allowed in a T24 packet.
  const {reviewedStandaloneLaterNoT24:_laterOnly,...t24Base}=built.privatePermit;
  const t24Permit={...t24Base,horizon:"T-24h" as const,selectedTNativeUtc:"2035-11-26T06:00:00.000Z"};
  const witnessReview={flightInstanceId:t24Permit.flightInstanceId,sourcePopulationQueryId:t24Permit.expectedSourcePopulationQueryId,
   expectedSourceResponseSha256:t24Permit.expectedSourceResponseSha256,expectedSourceQueryDigestSha256:t24Permit.queryDigestSha256,
   expectedFrameSha256:t24Permit.reviewedFrameSha256,expectedConfigSha256:t24Permit.reviewedConfigSha256,selectedTNativeUtc:t24Permit.selectedTNativeUtc,
   expectedT24CutoffUtc:t("06:00"),expectedSelectedTVersion:t24Permit.selectedTConfig.milestone+":"+t24Permit.selectedTConfig.version+":"+t24Permit.selectedTConfig.artifactHash,
   expectedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107",reviewedConditionalProtocolSha256:scope.protocolSha256};
  const t24Packet={...packet.packet,schema:"v39.phase5.github-conditional-t24-pre-witness-reviewed.v1",prePermit:t24Permit,
   witnessReview,phase7FieldProof:sharedWire(t24Permit)};
  const t24Bytes=Buffer.from(JSON.stringify(t24Packet)),t24Digest=hd(t24Bytes),t24Path="data-collection/phase5/frozen/t24p_"+t24Digest+".json",
   sourcePath=reg.sourceDayRegistryFilePath,sourceEvidence=h("d");
  const t24Trust={independentStudyTrustPinsApproved:true,independentNativeT24RegistryApproved:true,reviewedCodeSha:gate.approvedCodeSha,
   manifestSha256:gate.manifestSha256,calendarSha256:h("a"),rightsSha256:gate.rightsSha256,releaseSha256:p.expectedReviewedReleaseSha256,
   expectedT24ReviewerFingerprintSha256:reviewerFp,expectedT24PolicySha256:h("e"),expectedFrameSha256:t24Permit.reviewedFrameSha256,
   expectedConfigSha256:t24Permit.reviewedConfigSha256,maximumPrivateRetentionHours:48,policyValidFromUtc:t("00:00"),policyValidUntilUtc:t("23:00"),
   expectedSelectedTVersion:witnessReview.expectedSelectedTVersion,dayReviewerFingerprintSha256:h("4"),queryReviewerFingerprintSha256:h("5"),
   t24ReviewerPublicKeyPem:reviewerPem,conditionalT24Scope:gate.conditionalPreScope};
  const t24Reg={schema:"v39.phase6.conditional-t24-private-registry.v1",runDayIndex:p.runDayIndex,shardIndex:1,reviewedCodeSha:gate.approvedCodeSha,
   manifestSha256:gate.manifestSha256,rightsSha256:gate.rightsSha256,releaseSha256:p.expectedReviewedReleaseSha256,
   sourceRegistryPath:sourcePath,sourceRegistrySha256:hd(srcBytes),sourceReviewEvidenceSha256:sourceEvidence,conditionalT24Scope:gate.conditionalPreScope,
   entries:[{filePath:t24Path,packetSha256:t24Digest,flightInstanceId:p.flightInstanceId,queryDigestSha256:p.queryDigestSha256,
    selectedTNativeUtc:t24Permit.selectedTNativeUtc,cutoffUtc:t("06:00")}]};
  const idx={runDayIndex:p.runDayIndex,manifestSha256:gate.manifestSha256,reviewedCodeSha:gate.approvedCodeSha,
   reviewedRightsSha256:gate.rightsSha256,reviewedReleaseSha256:p.expectedReviewedReleaseSha256,calendarSha256:t24Trust.calendarSha256,
   entries:[{lane:"SOURCE",filePath:sourcePath,fileSha256:hd(srcBytes),reviewEvidenceSha256:sourceEvidence}]};
  const idxBytes=Buffer.from(JSON.stringify(idx)),index=Object.defineProperties({redactedSummary:{status:"SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH",
   externalEd25519ReviewerVerified:true,restrictedPrivatePg16ReaderVerified:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false,runDayIndex:p.runDayIndex,indexSha256:hd(idxBytes)}},
   {privateCurrentIndexBytes:{value:idxBytes},privateParsedIndex:{value:idx},getFrozen:{value:()=>srcBytes}});
  const t24RegBytes=Buffer.from(JSON.stringify(t24Reg)),t24RegSha=hd(t24RegBytes);
  const t24Review={schema:"v39.phase6.conditional-t24-registry-ed25519.v1",audience:"HKcode22/ReplitTranvr:PHASE6_T24_CONDITIONAL_PRE_REGISTRY_ONLY",
   logicalPath:"data-collection/phase5/frozen/t24r_"+t24RegSha+".json",runDayIndex:p.runDayIndex,shardIndex:1,registrySha256:t24RegSha,
   reviewedCodeSha:gate.approvedCodeSha,manifestSha256:gate.manifestSha256,rightsSha256:gate.rightsSha256,releaseSha256:p.expectedReviewedReleaseSha256,
   policySha256:t24Trust.expectedT24PolicySha256,reviewedAtUtc:t("05:04"),validUntilUtc:t("07:00"),retentionNotAfterUtc:t("08:00"),
   reviewerFingerprintSha256:reviewerFp,conditionalT24Scope:gate.conditionalPreScope};
  const t24Wire={review:t24Review,signatureBase64:sign(null,p6T24RegistryReviewPreimage(t24Review),reviewer.privateKey).toString("base64")};
  const t24Files=[{filePath:t24Path,packetSha256:t24Digest,bytes:t24Bytes}],t24Args={trust:t24Trust,index,registryBytes:t24RegBytes,wire:t24Wire,observedDbClockUtc:t("05:05"),files:t24Files};
  expect(verifyP6T24PrivateRegistry(t24Args).reg).toEqual(t24Reg);
  expect(()=>verifyP6T24PrivateRegistry({...t24Args,trust:{...t24Trust,conditionalT24Scope:undefined}})).toThrow("CONDITIONAL_T24_SCOPE");
  expect(()=>verifyP6T24PrivateRegistry({...t24Args,wire:{...t24Wire,signatureBase64:sign(null,p6T24RegistryReviewPreimage({...t24Review,schema:"v39.phase6.native-t24-registry-ed25519.v1"}),reviewer.privateKey).toString("base64")}})).toThrow("REGISTRY_SIGNATURE_INVALID");
  const gotT24=Object.defineProperties({status:"EXACT_PRIVATE_CONDITIONAL_T24_PACKETS_READONLY_NO_GO",registrySha256:t24RegSha,
   runDayIndex:p.runDayIndex,observedDbClockUtc:t("05:05"),packetCount:1,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
   {privateRegistry:{value:t24Reg},privateFiles:{value:t24Files}});
  expect(projectP6T24QueuePackets(gotT24,t24Trust,"ENROLLMENT")[0].entry.permit).toEqual(t24Permit);
  expect(projectP6T24QueuePackets(gotT24,t24Trust,"PRE_EXECUTION")).toHaveLength(0);
  expect(()=>projectP6T24QueuePackets(gotT24,{...t24Trust,conditionalT24Scope:undefined},"ENROLLMENT")).toThrow("CONDITIONAL_T24_SCOPE");
  const t24Policy={rightsSha256:gate.rightsSha256,nativeLaterReview:{conditionalT24Scope:gate.conditionalPreScope},
   conditionalPreFeatureReview:{schema:"v39.phase5.conditional-pre-feature-review-policy.v1",approved:true,rightsSha256:gate.rightsSha256,...gate.conditionalPreScope}};
  expect(deriveP6ConditionalT24Scope(t24Policy)).toEqual(gate.conditionalPreScope);
  expect(()=>deriveP6ConditionalT24Scope({...t24Policy,conditionalPreFeatureReview:undefined})).toThrow("CONDITIONAL_T24_SCOPE");
  const readReg=(pins=rp,r=reg,s=src)=>verifyP5SignedLaterPreDayRegistry(regBytes,r,srcBytes,s,pins,()=>packet.packetBytes);
  expect(readReg().entries[0].packet.prePermit).toEqual(built.privatePermit);
  expect(()=>readReg({...rp,conditionalPreScope:undefined})).toThrow("SEPARATE_PROSPECTIVE_SCOPE");
  expect(()=>readReg({...rp,conditionalPreScope:{...rp.conditionalPreScope!,protocolSha256:h("0")}})).toThrow("SEPARATE_PROSPECTIVE_SCOPE");
  expect(()=>readReg(rp,{...reg,shardIndex:2})).toThrow("PARSED_REGISTRY_BYTES_DRIFT");
  expect(()=>readReg(rp,reg,{...src,entries:[{...src.entries[0],expectedPacketSha256:h("0")}]})).toThrow("PARSED_REGISTRY_BYTES_DRIFT");
  expect(()=>verifyP5CdFrozenRoster(rosterBytes,roster,files,{...gate,conditionalPreScope:undefined})).toThrow("SEPARATE_PROSPECTIVE_SCOPE");
  expect(()=>verifyP5CdFrozenRoster(rosterBytes,roster,files,{...gate,releaseMode:"PHASE5_CANARY"})).toThrow("SEPARATE_PROSPECTIVE_SCOPE");
  expect(()=>verifyP5ConditionalQueuePacket({...packet.packet,phase7FieldProof:wire,independentLaterHorizonAndT24ReviewAttested:true},gate,"LATER_ONLY")).toThrow("PACKET_SCHEMA_OR_HORIZON");
  expect(()=>verifyP5ConditionalQueuePacket({...packet.packet,phase7FieldProof:wire,prePermit:{...packet.packet.prePermit,externalNativeTPhysicalLegAndSourceUseReviewed:true}},gate,"LATER_ONLY")).toThrow("SEPARATE_PROSPECTIVE_SCOPE");
  expect(()=>buildP5ConditionalPrePacketPreview({...built} as typeof built)).toThrow("ACTUAL_PREPARED_PERMIT_REQUIRED");
  expect(()=>attachP5ConditionalPreFieldProof(preview,env,policySha,[],{...wire,signatureBase64:Buffer.alloc(64).toString("base64")})).toThrow("SIGNATURE");
  const daily={schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,approvedCodeSha:gate.approvedCodeSha,manifestSha256:gate.manifestSha256,rightsSha256:gate.rightsSha256,releaseSha256:p.expectedReviewedReleaseSha256,
   conditionalPreFeatureReview:{schema:"v39.phase5.conditional-pre-feature-review-policy.v1",approved:true,rightsSha256:gate.rightsSha256,protocolSha256:scope.protocolSha256,externalContentUseReviewSha256:h("8")}};
  const dailyBytes=Buffer.from(JSON.stringify(daily)),policyEnv={P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:scope.protocolSha256,P6_NONPAID_DAILY_POLICY_BASE64:dailyBytes.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:hd(dailyBytes),P5_CD_GH_PRE_APPROVED_CODE_SHA:gate.approvedCodeSha,V39_P5_MANIFEST_SHA256:gate.manifestSha256,V39_P5_RIGHTS_SHA256:gate.rightsSha256,V39_P5_RELEASE_SHA256:p.expectedReviewedReleaseSha256};
  expect(readP5CdConditionalPreScope(policyEnv)).toEqual(gate.conditionalPreScope);
  expect(readP5CdConditionalPreScope({...policyEnv,P6_NONPAID_DAILY_POLICY_SHA256:""})).toBeUndefined();
  expect(()=>readP5CdConditionalPreScope({...policyEnv,P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:h("0")})).toThrow("INVALID_CONDITIONAL_POLICY_PIN");
  expect(JSON.stringify(built)).not.toMatch(/SQ78|privatePermit|SIA/);
  await expect(preparePermit({...review,nativeOperatingLegCertified:true})).rejects.toThrow(/EXACT_CONDITIONAL_REVIEW/);
  await expect(preparePermit({...review,reviewedMemberEvidenceSha256:h("0")})).rejects.toThrow(/MEMBER_REVIEW_OR_PROSPECTIVE_CLOCK/);
  await expect(preparePermit(review,{expectedReviewArtifactSha256:h("0")})).rejects.toThrow(/INDEPENDENT_REVIEW_PINS/);
  await expect(preparePermit(review,{},[t("05:04"),t("05:04"),t("05:04"),t("05:45")])).rejects.toThrow(/CURRENT_ELIGIBLE_MEMBER_REQUIRED/);
  await expect(preparePermit(review,{separatelyApprovedStandaloneProtocolSha256:h("c")})).rejects.toThrow(/MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW/);
  const proofRead=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
  const selected=await readP7ExactConditionalSelectedFeaturesPage(proofRead.pool,[p],proofScope);
  expect(selected).toHaveLength(1);
  expect(()=>requireP7ActualSourceReadback(selected[0])).not.toThrow();
  expect(selected[0].privateSelectedFeatures.filter(x=>x.value!==null&&x.value!==undefined).map(x=>x.featureName))
   .toEqual(expect.arrayContaining(["origin_icao","destination_icao","operating_carrier","scheduled_arrival_utc","provider_revised_departure_utc","reported_pre_departure_status"]));
  expect(JSON.stringify(selected)).not.toMatch(/SIA|SQ78|Scheduled|privateSelectedFeatures/);
  expect(proofRead.queries.filter(x=>x.includes("SELECT r.raw_payload"))).toHaveLength(1);
  for(const patch of [{identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG"},{reviewedProtocolAmendmentSha256:h("9")},{queryDigestSha256:h("9")},{requireProspectiveConditionalSourceMarker:undefined}]){
   const rejected=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
   await expect(readP7ExactConditionalSelectedFeaturesPage(rejected.pool,[{...p,...patch} as P5Stage14SingleFlightPrePermit],proofScope)).rejects.toThrow(/EXACT_CONDITIONAL_PERMIT_PAGE_BINDING/);
   expect(rejected.queries).toHaveLength(0);
  }
  const changed=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]);
  await expect(readP7ExactConditionalSelectedFeaturesPage(changed.pool,[{...p,expectedDestinationIcao:"OMAA"}],proofScope)).rejects.toThrow(/EXACT_CONDITIONAL_PERMIT_MEMBER_NO_LONGER_ELIGIBLE/);
  const lateProof=make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m],[t("05:04"),t("05:04"),t("05:04"),t("05:45")]);
  await expect(readP7ExactConditionalSelectedFeaturesPage(lateProof.pool,[p],proofScope)).rejects.toThrow(/EXACT_CONDITIONAL_PERMIT_MEMBER_NO_LONGER_ELIGIBLE/);
  const omitted={...draft.compiled.bundle,observations:[],observationsSha256:createHash("sha256").update("[]").digest("hex")};
  await expect(readP7ExactConditionalSelectedFeaturesPage(make(scope.protocolSha256,expectedDecodedBodySha256,marked,[m]).pool,[{...p,reviewedSupplementalFeatureBundle:omitted}],proofScope)).rejects.toThrow(/FIDS_FEATURE_DRIFT/);
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
it("T025 independent conditional authority routing refuses absent scope and mixed tiers before DB read",async()=>{
 let calls=0;const pool={connect:async()=>{calls++;throw Error("unexpected DB");}};
 const p={identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE"} as P5Stage14SingleFlightPrePermit;
 const n={identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG"} as P5Stage14SingleFlightPrePermit;
 await expect(readP7ReviewedTierSelectedFeaturesPage(pool,[p],h("8"))).rejects.toThrow("INDEPENDENT_CONDITIONAL_SCOPE_REQUIRED");
 await expect(readP7ReviewedTierSelectedFeaturesPage(pool,[p,n],h("8"))).rejects.toThrow("MIXED_IDENTITY_TIERS");
 await expect(readP7ReviewedTierSelectedFeaturesPage(pool,[n,p],h("8"))).rejects.toThrow("MIXED_IDENTITY_TIERS");
 expect(calls).toBe(0);
});
