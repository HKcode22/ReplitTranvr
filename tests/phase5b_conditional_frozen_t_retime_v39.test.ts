/** I143/T139: actual conditional source/issuer/proof entry points with
 * synthetic signed custody and restrictive read-only SQL observations.
 * No provider call, real DB, production evidence or new scientific tier. */
import {describe,it,expect} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import * as bound from "../server/lib/disruption/phase5ConditionalBoundSourceReview_v39";
import {addCanonicalFidsEnvelopeHashV39} from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {inspectP5ConditionalRoute,p5ConditionalStage14Id} from "../server/lib/disruption/phase5ConditionalServiceIdentity_v39";
import {digestP5Stage24ReviewedReceipt} from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import {P6_T24_CUSTODY_SCHEMA,p6T24WitnessCustodyPath,p6T24WitnessCustodyPreimage} from "../server/lib/disruption/phase6PrivateT24WitnessReceiptTransport_v39.mjs";
import {issueP5ConditionalLaterSignedReviewPage,prepareP5ConditionalPrePermitPageFromSignedReviews,buildP5ConditionalPrePacketPreview,attachP5ConditionalPreFieldProof} from "../server/lib/disruption/phase5ConditionalPrePermitPreparation_v39";
import {readP7ExactConditionalSelectedFeaturesPage} from "../server/lib/disruption/phase7IndependentPreSourceReader_v39";
import {phase7SelectedFeatureDigest,verifyPhase7SignedPreFieldProof,verifyPhase7SelectedFieldProofs} from "../server/lib/disruption/phase7SignedPreFieldProof_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import {selectP6ConditionalLaterPage} from "../scripts/v39_phase6_stored_source_postcommit_native_later_v39.mjs";
import {readP6LaterT24EvidencePage} from "../server/lib/disruption/phase6LaterT24EvidenceBatchReadOnly_v39";
import {auditP5ActualSourceFlightCandidates,digestP5ActualSourceCandidateAudit} from "../server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39";
import {buildP5UnsignedNativePreReviewDossier,digestP5UnsignedNativePreDossier} from "../server/lib/disruption/phase5SourceBoundUnsignedPreDossier_v39";
const hash=(v:string|Buffer)=>createHash("sha256").update(v).digest("hex"),h=(c:string)=>c.repeat(64);
const t=(v:string)=>"2035-11-25T"+v+":00.000Z";
type Horizon="T-6h"|"T-90m";
function fixture(horizon:Horizon="T-6h",reported="13:00",options:{now?:string;available?:string;expiry?:string;witness?:string;duplicate?:boolean}={}){
 const planned=t(horizon==="T-6h"?"05:00":"10:00"),retrieved=t(horizon==="T-6h"?"05:01":"10:01");
 const available=options.available??t(horizon==="T-6h"?"05:02":"10:02"),now=options.now??t(horizon==="T-6h"?"05:04":"10:04"),expiry=options.expiry??t("23:00");
 const manifest=hash("synthetic retime manifest"),rights=hash("synthetic source rights"),protocol=hash("existing conditional protocol"),content=hash("conditional feature use"),code="a".repeat(40);
 const originalQuery="c23e4567-e89b-42d3-a456-426614174013",cohort=t("11:00"),trace:string[]=[];
 const flight={number:"SQ 0078",codeshareStatus:"IsOperator",isCargo:false,isPrivate:null,isCharter:null,airline:null,status:null,
  departure:{scheduledTime:{utc:t(reported)},revisedTime:null},arrival:{airport:{icao:"YSSY"},scheduledTime:null}};
 const route=inspectP5ConditionalRoute(flight,"WSSS");if(route.status!=="ok")throw Error("synthetic route");
 const id=p5ConditionalStage14Id(route.route,cohort),departures=options.duplicate?[flight,JSON.parse(JSON.stringify(flight))]:[flight];
 const body=Buffer.from(JSON.stringify({departures,arrivals:[]})),bodyHash=hash(body);
 const raw=addCanonicalFidsEnvelopeHashV39({fidsRequestContract:{schema:"v39.fids-request-frame.application-intent.v1",endpointKind:"airport_local_fids",direction:"Departure",airportIcao:"WSSS",fromLocal:"2035-11-25T19:00",toLocal:"2035-11-25T23:00",withLeg:true,withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false,withLocation:false,openapiSha256:h("e"),phase5ConditionalService:{protocolSha256:protocol,cohortStartUtc:cohort}},payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",originalHttpWireBytesPreserved:false,originalDecodedEntityBodyPreserved:true,originalDecodedEntityBodyEvidence:{schema:"v39.fids-fetch-decoded-source-body.v1",representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",bodySha256:bodyHash,bodyLengthBytes:body.length,bodyBase64:body.toString("base64")},departures,arrivals:[],fetchedAtUtc:retrieved});
 const response=hash(JSON.stringify(raw));
 const scope={source:{manifestSha256:manifest,queryDigestSha256:hash("later source "+horizon),reviewedReleaseSha256:h("c"),rightsReviewSha256:rights,providerContractSha256:h("e"),earlyDrawSha256:h("f"),runDayIndex:2,slot:"HUB" as const,horizon,airportIcao:"WSSS",expectedSourceGithubRunId:"123456",maxPopulationStalenessSeconds:3600,plannedRequestUtc:planned},protocolSha256:protocol,ownerProspectiveSeparateTierApproved:true as const,frozenStudyStartUtc:cohort,policyEffectiveUtc:t("04:00"),minimumReviewLeadSeconds:900,expectedPopulationQueryId:originalQuery,expectedResponseSha256:response,expectedLocalFrom:"2035-11-25T19:00",expectedLocalTo:"2035-11-25T23:00",expectedServiceWindowStartUtc:cohort,expectedServiceWindowEndUtc:t("15:00"),externalContentUseReviewSha256:content};
 const source={manifest_sha256:manifest,run_day_index:2,slot_id:"HUB",horizon,airport_icao:"WSSS",fids_airport_icao:"WSSS",github_run_id:"123456",attempt_run_id:"123456",state:"ACTIVE",early_draw_sha256:h("f"),reviewed_release_sha256:h("c"),rights_review_sha256:rights,provider_contract_sha256:h("e"),bound_rights:rights,population_query_id:originalQuery,original_response_hash:response,fids_response_hash:response,original_current:true,reserved_at:planned,fids_retrieval_utc:retrieved,raw_persisted_at_utc:available,source_available:available,bound_at_utc:available,source_expires_at_utc:expiry,service_window_start_utc:cohort,service_window_end_utc:t("15:00"),conditional_source_protocol_sha256:protocol,decoded_original_body_sha256:bodyHash,normalized_members_count:1};
 const original={raw_payload:raw,stored_response_hash:response,raw_expired_at_utc:null,raw_persisted_at_utc:available,decoded_original_body_sha256:bodyHash,binding_rights:rights,source_expires_at_utc:expiry,population_query_id:originalQuery};
 const member={population_query_id:originalQuery,response_hash:response,provider_content_expired_at_utc:null,population_member_id:"synthetic-member-1",analytic_identity_id:id,canonical_flight_instance_id:id,source_airport_icao:"WSSS",dep_airport_icao:"WSSS",arr_airport_icao:"YSSY",flight_number:"SQ78",scope_classification:"unknown",codeshare_resolution_status:"g5a_conditional_operator_composite_no_native_id",source_type:"fids",population_role:"requested_airport_primary",query_direction:"Departure",dep_scheduled_utc:t(reported),available_at:available,fids_retrieval_utc:retrieved};
 const sourcePool={connect:async()=>({release(){},query:async(sql:string)=>{
  if(sql.startsWith("SELECT session_user"))return {rows:[{login:"phase5_p5_source_login_20261108",actor:"phase5_fids_source_prod_20261107",db:"neondb",version:160010,ro:"on",primary:true}]};
  if(sql.includes("FROM clean.phase5_fids_allowed_query_v39"))return {rows:[source]};
  if(sql.includes("SELECT r.raw_payload")){trace.push("source_original");return {rows:[original]};}
  if(sql.includes("FROM clean.flight_population"))return {rows:[member]};
  if(sql.startsWith("SELECT clock_timestamp()"))return {rows:[{at:now}]};
  if(/^(BEGIN|SET LOCAL|COMMIT|ROLLBACK)/.test(sql))return {rows:[]};
  throw Error("Unexpected source SQL");
 }})};
 const reviewer=generateKeyPairSync("ed25519"),custodyKeys=generateKeyPairSync("ed25519"),reviewerFp=hash(reviewer.publicKey.export({format:"der",type:"spki"}));
 const selectedVersion="departure.scheduledTime.utc:v1:"+h("e");
 const protectedCustody={independentT24CustodyTrustApproved:true as const,policySha256:hash("custody policy"),reviewerFingerprintSha256:hash(custodyKeys.publicKey.export({format:"der",type:"spki"})),reviewerPublicKeyPem:custodyKeys.publicKey.export({format:"pem",type:"spki"}).toString(),maximumRetentionHours:24,policyValidFromUtc:"2035-11-24T00:00:00.000Z",policyValidUntilUtc:t("23:00")};
 const trust={...protectedCustody,runDayIndex:2,reviewedCodeSha:code,manifestSha256:manifest,rightsSha256:rights,releaseSha256:h("c"),expectedFrameSha256:h("4"),expectedConfigSha256:h("5"),expectedSelectedTVersion:selectedVersion};
 const receiptFields={schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1" as const,snapshotId:"17",flightInstanceId:id,selectedTNativeUtc:t("12:00"),frozenT24CutoffUtc:"2035-11-24T12:00:00.000Z",expectedSelectedTVersion:selectedVersion,t24OriginalFidsSha256:h("1"),t24SourceQueryDigestSha256:h("2"),t24FrameSha256:h("4"),t24ConfigSha256:h("5"),witnessDbObservedAtUtc:"2035-11-24T11:59:40.000Z",stage17PostCommitReadbackAtUtc:"2035-11-24T11:59:50.000Z"};
 const receipt={...receiptFields,receiptSha256:digestP5Stage24ReviewedReceipt(receiptFields)};
 const packet=Buffer.from(JSON.stringify({schema:"v39.phase6.private-t24-witness-candidate.v1",runDayIndex:2,manifestSha256:manifest,candidate:{schema:"v39.phase5.unsigned-t24-stage24-handoff.v1",status:"DURABLE_T24_RECEIPT_CANDIDATE_AWAITING_INDEPENDENT_REVIEW",receipt,reviewedByIndependentAuthority:false,mayLaunchLaterPreAutomatically:false,providerCalls:0}}));
 const custodyReview={schema:P6_T24_CUSTODY_SCHEMA,audience:"HKcode22/ReplitTranvr:PHASE6_T24_WITNESS_CUSTODY_ONLY",logicalPath:p6T24WitnessCustodyPath({...trust,flightInstanceId:id}),runDayIndex:2,packetSha256:hash(packet),receiptSha256:receipt.receiptSha256,reviewedCodeSha:code,manifestSha256:manifest,rightsSha256:rights,releaseSha256:h("c"),policySha256:trust.policySha256,reviewedAtUtc:t("04:00"),validUntilUtc:t("23:00"),retentionNotAfterUtc:t("23:00"),reviewerPublicKeyFingerprintSha256:trust.reviewerFingerprintSha256};
 const custodyWire={review:custodyReview,signatureBase64:sign(null,p6T24WitnessCustodyPreimage(custodyReview),custodyKeys.privateKey).toString("base64")};
 const wireBytes=Buffer.from(JSON.stringify(custodyWire));
 const custodyRow={kind:"T24_WITNESS_RECEIPT_CANDIDATE",logical_path:custodyReview.logicalPath,run_day_index:2,shard_index:1,content_sha256:hash(packet),reviewed_code_sha:code,manifest_sha256:manifest,rights_sha256:rights,external_review_sha256:hash(wireBytes),externally_reviewed_at_utc:t("04:00"),retention_not_after_utc:t("23:00"),committed_at_utc:t("04:01"),payload_bytes:packet,review_wire_bytes:wireBytes};
 const login="phase6_private_reader_login_ci_retime";
 const custody={trust,scope:{privateT24CustodyApproved:true as const,existingPaidDispatchApproved:false as const,adbAutoCollect:"0" as const,phase6ProcessArmed:"0" as const,expectedSessionLogin:login},readerClient:{query:async(sql:string)=>{
  if(sql.includes("clock_timestamp()"))return {rowCount:1,rows:[{db:"neondb",actor:"phase6_private_frozen_reader_v39",login,ro:"on",replica:false,version:160010,db_now:now,index_select:true,index_insert:false,index_update:false,index_delete:false,packet_select:true,packet_insert:false,packet_update:false,packet_delete:false,login_enabled:true,login_superuser:false,login_createrole:false,login_bypassrls:false,group_login:false,group_superuser:false,group_bypassrls:false}]};
  if(sql.includes("logical_path=ANY")){trace.push("signed_custody");const rows=["MISSING","NO_CUSTODY"].includes(options.witness??"")?[]:[custodyRow];return {rowCount:rows.length,rows};}
  if(/^(BEGIN|SET LOCAL|ROLLBACK|COMMIT)/.test(sql))return {rowCount:0,rows:[]};throw Error("Unexpected custody SQL");
 }}};
 const witnessRow={snapshot_id:"17",joined_snapshot_id:"17",flight_instance_id:id,selected_t_version:selectedVersion,fids_response_hash:receipt.t24OriginalFidsSha256,source_query_digest:receipt.t24SourceQueryDigestSha256,frame_hash:h("4"),config_hash:h("5"),source_t24_population_query_id:"c23e4567-e89b-42d3-a456-426614174014",snapshot_prediction_state:"PRE_DEPARTURE",snapshot_horizon:"T-24h",selected_t_native_utc:receipt.selectedTNativeUtc,t24_cutoff_utc:receipt.frozenT24CutoffUtc,post_pre_commit_db_observed_at_utc:receipt.witnessDbObservedAtUtc};
 const metadataPool={connect:async()=>({release(){},query:async(sql:string)=>{
  if(sql.includes("current_database()"))return {rowCount:1,rows:[{db:"neondb",actor:"phase6_private_frozen_reader_v39",login,ro:"on",replica:false,version:160010,now,snap_read:true,witness_read:true,snap_write:false,witness_write:false,base_access:false,login_enabled:true,login_super:false,login_admin:false,login_bypass:false,group_login:false,group_super:false,group_bypass:false}]};
  if(sql.includes("SELECT flight_instance_id")){const rows=options.witness==="MISSING"?[]:[{flight_instance_id:id,snapshot_id:"17"}];if(options.witness==="AMBIGUOUS")rows.push({flight_instance_id:id,snapshot_id:"18"});return {rowCount:rows.length,rows};}
  if(sql.includes("SELECT")&&sql.includes("witness")){trace.push("persisted_witness");const rows=options.witness==="MISSING"?[]:[{...witnessRow,...(options.witness==="WRONG_T"?{selected_t_native_utc:t("12:15")}:{}),...(options.witness==="WRONG_LEG"?{flight_instance_id:"leg:g5a:"+h("0")}:{}),...(options.witness==="WRONG_ORIGINAL"?{fids_response_hash:h("0")}:{} )}];return {rowCount:rows.length,rows};}
  if(/^(BEGIN|SET LOCAL|ROLLBACK|COMMIT)/.test(sql))return {rowCount:0,rows:[]};throw Error("Unexpected metadata SQL");
 }})};
 const cs={protocolSha256:protocol,externalContentUseReviewSha256:content};
 const policy={schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,approvedCodeSha:code,manifestSha256:manifest,rightsSha256:rights,releaseSha256:h("c"),providerContractSha256:h("e"),frameSha256:h("4"),configSha256:h("5"),
  conditionalPreFeatureReview:{schema:"v39.phase5.conditional-pre-feature-review-policy.v1",approved:true,rightsSha256:rights,...cs},
  conditionalLaterPermitReview:{schema:"v39.phase5.conditional-later-permit-review-delegation.v1",approved:true,...cs,reviewerFingerprintSha256:reviewerFp,reportedScheduleSemanticsSha256:h("7"),validFromUtc:t("04:00"),validUntilUtc:t("23:00"),standaloneNoT24ProtocolSha256:null},
  nativeLaterReview:{approved:true,t24Custody:protectedCustody,frameSha256:h("4"),configSha256:h("5"),builderSha256:h("9"),builderFrozenAtUtc:t("04:00"),runAndRetentionEvidenceSha256:h("8"),laterReviewerFingerprintSha256:h("c"),validFromUtc:t("00:00"),validUntilUtc:t("23:00"),selectedTConfig:{milestone:"departure.scheduledTime.utc",version:"v1",artifactHash:h("e"),verifiedProviderNativeSchedule:true,semanticsEvidenceSha256:h("7")},
   conditionalLaterDayAppendPolicy:{schema:"v39.phase6.delegated-later-day-append-review-policy.v1",delegatedAutomatedLaterDayAppendApproved:true,approvedCodeSha:code,manifestSha256:manifest,rightsSha256:rights,releaseSha256:h("c"),laterReviewerFingerprintSha256:h("c"),dayReviewerFingerprintSha256:h("d"),queryReviewerFingerprintSha256:h("f"),validFromUtc:t("00:00"),validUntilUtc:t("23:00"),conditionalLaterPreScope:cs}}};
 const policyBytes=Buffer.from(JSON.stringify(policy)),policySha=hash(policyBytes);
 const issue=()=>issueP5ConditionalLaterSignedReviewPage(sourcePool,metadataPool,scope,[id],custody,{policyBytes,expectedPolicySha256:policySha,expectedReviewedCodeSha:code,expectedReviewerFingerprintSha256:reviewerFp,forbiddenSignerFingerprints:[h("c"),h("d"),h("f")],signer:reviewer.privateKey,env:{P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED:"1",P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256:reviewerFp,P6_NONPAID_DAILY_POLICY_SHA256:policySha,V39_P5_MANIFEST_SHA256:manifest,V39_P5_RIGHTS_SHA256:rights,P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN:login,P6_CONDITIONAL_LATER_METADATA_READ_ENABLED:"1"}});
 const authority={expectedReviewerFingerprintSha256:reviewerFp,reviewerPublicKeyPem:reviewer.publicKey.export({format:"pem",type:"spki"}).toString(),expectedReviewedCodeSha:code,forbiddenSignerFingerprints:[h("c")]};
 return {id,scope,sourcePool,issue,authority,receipt,trace,member,source,now,reported};
}

describe("I143/T139 conditional later PRE keeps authentic frozen T through retiming",()=>{
 for(const [horizon,reported] of [["T-6h","13:00"],["T-6h","11:00"],["T-90m","12:45"],["T-90m","11:30"]] as const){
  it(horizon+" "+reported+" authentic issuer and independent proof retain original T and nullable fields",async()=>{
   const f=fixture(horizon,reported),issued=await f.issue();
   expect(issued.reviewedCount).toBe(1);expect(issued.heldCount).toBe(0);expect(issued.providerCalls).toBe(0);expect(issued.databaseWrites).toBe(0);
   const witnessAt=f.trace.indexOf("persisted_witness");expect(witnessAt).toBeGreaterThan(f.trace.indexOf("signed_custody"));expect(f.trace.slice(witnessAt+1)).toContain("source_original");
   const prepared=await prepareP5ConditionalPrePermitPageFromSignedReviews(f.sourcePool,f.scope,[f.id],issued.privateWire!,f.authority),p=prepared.privatePrepared[0].privatePermit;
   expect(p.selectedTNativeUtc).toBe(t("12:00"));expect(p.reviewedT24WitnessReceipt).toEqual(f.receipt);expect(p.reviewedStandaloneLaterNoT24).toBeUndefined();
   expect(p.reviewedSupplementalFeatureBundle!.fields).toHaveLength(4);expect(p.reviewedSupplementalFeatureBundle!.observations).toHaveLength(0);
   const reread=await bound.readP5SignedConditionalServiceReview(f.sourcePool,f.scope,[f.receipt]),proposal=reread.memberReview.privateReviewProposals[0];
   expect(proposal).toMatchObject({currentReportedScheduleUtc:t(reported),selectedTNativeUtc:t("12:00"),forecastReferenceEvidence:"REVIEWED_T24_REFERENCE",referenceT24ReceiptSha256:f.receipt.receiptSha256,predictionCutoffUtc:t(horizon==="T-6h"?"06:00":"10:30")});
   const proofRead=await readP7ExactConditionalSelectedFeaturesPage(f.sourcePool,[p],f.scope),selected=proofRead[0].privateSelectedFeatures;
   expect(proofRead[0].selectedCount).toBe(2);expect(selected.filter(x=>x.value===null||x.value===undefined)).toHaveLength(4);
   const proofKeys=generateKeyPairSync("ed25519"),policy=hash("synthetic PRE preservation policy"),fp=hash(proofKeys.publicKey.export({format:"der",type:"spki"}));
   const fields=selected.filter(x=>x.value!==null&&x.value!==undefined).map(x=>({field:x.featureName,selectedFeatureSha256:phase7SelectedFeatureDigest(x),independentEvidenceSha256:hash("synthetic separately authenticated field "+x.featureName)}));
   const meta={schema:"v39.phase7.separate-pre-field-proof.v1",manifestSha256:p.manifestSha256,rightsSha256:p.expectedReviewedSourceRightsSha256,policySha256:policy,permitSha256:hashPhase7DurableCandidate(p),issuedAtUtc:f.now,validUntilUtc:proposal.predictionCutoffUtc,fields};
   const bytes=Buffer.from(JSON.stringify(meta)),wire={payloadBase64:bytes.toString("base64"),signatureBase64:sign(null,bytes,proofKeys.privateKey).toString("base64")};
   const env={P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:policy,P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:fp,P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(proofKeys.publicKey.export({format:"pem",type:"spki"}).toString()).toString("base64")};
   const dispositions=fields.map(x=>({field:x.field,disposition:"INDEPENDENT_SOURCE_EXACT_LANE",outputField:null,reviewSha256:hash("synthetic field policy")})) as any;
   const checked=verifyPhase7SignedPreFieldProof(env,p,policy,dispositions,wire);
   expect(verifyPhase7SelectedFieldProofs(checked,selected,f.now,t("23:00"))).toHaveLength(2);
   const attached=attachP5ConditionalPreFieldProof(buildP5ConditionalPrePacketPreview(prepared.privatePrepared[0]),env,policy,dispositions,wire);
   expect(attached.packet.prePermit.selectedTNativeUtc).toBe(t("12:00"));expect(attached.phase6PaidGo).toBe(false);
   await expect(readP7ExactConditionalSelectedFeaturesPage(f.sourcePool,[{...p,selectedTNativeUtc:t(reported)}],f.scope)).rejects.toThrow(/EXACT_CONDITIONAL_PERMIT_MEMBER_NO_LONGER_ELIGIBLE/);
   expect(()=>verifyPhase7SignedPreFieldProof(env,{...p,selectedTNativeUtc:t(reported)},policy,dispositions,wire)).toThrow(/EXACT_PERMIT/);
  });
 }
 it("unsigned identity inventory survives current-schedule timing filters without granting eligibility",async()=>{
  const f=fixture("T-6h","11:00"),inventory=await bound.readP5ConditionalLaterIdentityInventory(f.sourcePool,f.scope);
  expect(inventory.report.status).toBe("CONDITIONAL_SERVICE_IDENTITY_INVENTORY_NOT_PRE_ELIGIBLE");expect(inventory.report.predictionTimingReviewed).toBe(false);
  expect(inventory.report.counts.conditionalCandidates).toBe(0);expect(inventory.report.counts.identityReviewCandidates).toBe(1);expect(inventory.report.trainingOrPrePublicationAuthorized).toBe(false);
  const actual={privateConditionalSourceReview:inventory,privateConditionalSourceScope:f.scope},current={index:{privateParsedIndex:{runDayIndex:2,manifestSha256:f.scope.source.manifestSha256,entries:[]},redactedSummary:{runDayIndex:2,observedDbClockUtc:f.now}}};
  expect(selectP6ConditionalLaterPage(actual,current,new Set())).toEqual([f.id]);expect(selectP6ConditionalLaterPage(actual,current,new Set([f.id]))).toEqual([]);
  expect((await bound.readP5SignedConditionalServiceReview(f.sourcePool,f.scope)).memberReview.stage14MatchedMembershipCount).toBe(0);
 });
 for(const kind of ["MISSING","NO_CUSTODY","AMBIGUOUS","WRONG_T","WRONG_ORIGINAL"]){
  it(kind+" actual T24 evidence cannot become a frozen reference or standalone permission",async()=>{
   const f=fixture("T-6h","13:00",{witness:kind}),r=await f.issue();expect(r.reviewedCount).toBe(0);expect(r.heldCount).toBe(1);expect(r.privateWire).toBeNull();
  });
 }
 it("wrong-leg witness and duplicate conditional service remain structural refusals",async()=>{
  await expect(fixture("T-6h","13:00",{witness:"WRONG_LEG"}).issue()).rejects.toThrow(/UNREVIEWED_CROSS_PAGE_SQL_ROW/);
  await expect(fixture("T-6h","13:00",{duplicate:true}).issue()).rejects.toThrow(/CONDITIONAL_CURRENT_MEMBER_REQUIRED/);
 });
 it("a delayed reported schedule cannot extend the frozen cutoff or revive a stale source",async()=>{
  const late=fixture("T-6h","13:00",{now:t("06:04"),available:t("06:02")});expect((await late.issue()).privateWire).toBeNull();
  const stale=fixture("T-6h","11:00");stale.scope.source.maxPopulationStalenessSeconds=3000;expect((await stale.issue()).privateWire).toBeNull();
 });
 it("source expiry, signed service frame and absent source marker remain enforced",async()=>{
  await expect(fixture("T-6h","13:00",{expiry:t("05:04")}).issue()).rejects.toThrow(/ORIGINAL_SCOPE_OR_EXPIRY/);
  expect((await fixture("T-6h","13:00",{expiry:t("05:30")}).issue()).privateWire).toBeNull();
  await expect(fixture("T-6h","15:00").issue()).rejects.toThrow(/CONDITIONAL_CURRENT_MEMBER_REQUIRED/);
  const unmarked=fixture();unmarked.source.conditional_source_protocol_sha256=h("0");await expect(unmarked.issue()).rejects.toThrow(/SIGNED_SOURCE_MARKER_OR_BODY_BINDING/);
 });
 it("extra native scope properties cannot activate conditional frozen-reference rebinding",async()=>{
  for(const reported of ["12:00","12:15"]){
   const f=fixture("T-6h",reported),nativeId="leg:future:00001",scope={...f.scope.source,maxPopulationStalenessSeconds:7200};
   const member={...f.member,analytic_identity_id:nativeId,canonical_flight_instance_id:nativeId,scope_classification:"confirmed_core",codeshare_resolution_status:"confirmed_operating_leg"};
   const audit=auditP5ActualSourceFlightCandidates(scope,[f.source],[member],f.now);
   const dossier=buildP5UnsignedNativePreReviewDossier(audit,{expectedActualCandidateAuditSha256:digestP5ActualSourceCandidateAudit(audit),expectedManifestSha256:scope.manifestSha256,expectedQueryDigestSha256:scope.queryDigestSha256,expectedSourceResponseSha256:f.scope.expectedResponseSha256,expectedSourcePopulationQueryId:f.scope.expectedPopulationQueryId,expectedSourceGithubRunId:scope.expectedSourceGithubRunId,expectedReviewedReleaseSha256:scope.reviewedReleaseSha256,expectedReviewedSourceRightsSha256:scope.rightsReviewSha256,expectedEarlyDrawSha256:scope.earlyDrawSha256,expectedProviderContractSha256:scope.providerContractSha256,expectedSourceDayRegistrySha256:hash("native source registry"),expectedReviewedMainCodeSha:"a".repeat(40),expectedRunDayIndex:2,expectedSlot:"HUB",expectedHorizon:"T-6h",expectedAirportIcao:"WSSS"});
   expect(dossier.candidateCount).toBe(1);
   const receipt={...f.receipt,flightInstanceId:nativeId};receipt.receiptSha256=digestP5Stage24ReviewedReceipt(receipt);
   const pool={connect:async()=>({release(){},query:async(sql:string)=>{
    if(sql.includes("current_database()"))return {rowCount:1,rows:[{db:"neondb",actor:"phase5_fids_pre_writer_prod_20261107",login:"phase5_p30_pre_login_20261107",version:160010,ro:"on",replica:false,now:f.now}]};
    if(sql.includes("FROM clean.phase5_t24_postcommit_witness_v39"))return {rowCount:1,rows:[{snapshot_id:"17",joined_snapshot_id:"17",flight_instance_id:nativeId,selected_t_version:receipt.expectedSelectedTVersion,fids_response_hash:receipt.t24OriginalFidsSha256,source_query_digest:receipt.t24SourceQueryDigestSha256,frame_hash:receipt.t24FrameSha256,config_hash:receipt.t24ConfigSha256,source_t24_population_query_id:f.scope.expectedPopulationQueryId,snapshot_prediction_state:"PRE_DEPARTURE",snapshot_horizon:"T-24h",selected_t_native_utc:receipt.selectedTNativeUtc,t24_cutoff_utc:receipt.frozenT24CutoffUtc,post_pre_commit_db_observed_at_utc:receipt.witnessDbObservedAtUtc}]};
    if(sql.includes("FROM clean.flight_snapshots"))return {rowCount:1,rows:[{flight_instance_id:nativeId,snapshot_id:"17"}]};
    if(/^(BEGIN|SET LOCAL|ROLLBACK)/.test(sql))return {rowCount:0,rows:[]};throw Error("Unexpected native SQL");
   }})};
   const supplied={independentDossierReviewPinned:true as const,independentT24EvidenceReadApproved:true as const,existingPaidDispatchApproved:false as const,expectedDossierSha256:digestP5UnsignedNativePreDossier(dossier),expectedManifestSha256:scope.manifestSha256,expectedRightsSha256:scope.rightsReviewSha256,expectedReleaseSha256:scope.reviewedReleaseSha256,expectedFrameSha256:receipt.t24FrameSha256,expectedConfigSha256:receipt.t24ConfigSha256,expectedSelectedTVersion:receipt.expectedSelectedTVersion,pageIndex:1,reviewedReceipts:[{expectedReceiptSha256:receipt.receiptSha256,receipt}],conditionalFrozenT24SourceWindow:{startUtc:t("11:00"),endUtc:t("15:00")}};
   const result=await readP6LaterT24EvidencePage(pool as any,dossier,supplied);
   expect(result.privateDecisions[0].status).toBe(reported==="12:00"?"T24_PERSISTED_AND_SEPARATE_RECEIPT_MATCH_REVIEW_REQUIRED":"T24_RECEIPT_OR_NATIVE_ANCHOR_MISMATCH");
  }
 });
});
