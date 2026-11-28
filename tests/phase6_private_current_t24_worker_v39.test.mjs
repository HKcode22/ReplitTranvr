import assert from "node:assert/strict";
import test from "node:test";
import {createHash,generateKeyPairSync} from "node:crypto";
import {readFileSync} from "node:fs";
import {loadP6CurrentT24CalendarWindows,loadP6LaterCalendarWindows,isP6CurrentPreTrigger,P6_CURRENT_T24_DISPATCH_CONFIRM} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
import {currentT24FailureDiagnostic,runP6BoundedT24Packets,localP6T24SingletonEnv,admitP6CurrentT24Worker} from "../scripts/v39_phase6_private_current_t24_worker_v39.mjs";
import {requireP5CdGithubCurrentPrivateT24Scope,requireP5CdGithubPreRelease} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39.ts";
const code="a".repeat(40),h="b".repeat(64);
const env=()=>({GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
 GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,P5_CD_GH_PRE_APPROVED_CODE_SHA:code,
 P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
 P5_CD_GH_T24_ONE_FLIGHT_CONFIRM:"ONE_REVIEWED_SOURCE_QUEUED_T24_PRE_AND_INDEPENDENT_WITNESS_NO_PROVIDER",
 P5_CD_GH_T24_SCHEDULE_ENABLED:"1",P6_PRIVATE_T24_EXECUTION_ENABLED:"1",P5_CD_GH_PRE_ARMED:"1",
 P5_CD_GH_PRE_STOP:"0",P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",P5_CD_GH_T24_WITNESS_APPROVED:"1",
 V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE6_PROCESS_ARMED:"1",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 ADB_AUTO_COLLECT:"0",V39_P5_MANIFEST_SHA256:h,V39_P5_RIGHTS_SHA256:h,
 P5_V39_PRE_DATABASE_URL:"postgresql://phase5_p30_pre_login_20261107:ci@ep-test.neon.tech/neondb?sslmode=require",
 P5_V39_T24_WITNESS_DATABASE_URL:"postgresql://phase5_p30_witness_login_20261107:ci@ep-test.neon.tech/neondb?sslmode=require"});
const packets=n=>Array.from({length:n},(_,i)=>({entry:{packetSha256:(i+1).toString(16).padStart(64,"0"),permit:{horizon:"T-24h"}},cutoff:Date.parse("2030-01-01T00:00:00.000Z")+i}));
test("current T24 stable scope cannot authorize a legacy hash, competing mode or provider credential",()=>{
 const a=env();assert.equal(requireP5CdGithubCurrentPrivateT24Scope(a).rosterSha256,undefined);
 assert.throws(()=>requireP5CdGithubPreRelease(a,{allowReviewedT24Witness:true}));
 for(const b of [{P6_PRIVATE_T24_EXECUTION_ENABLED:"0"},{P5_CD_GH_PRE_ROSTER_SHA256:h},{P5_CD_GH_ROSTER_PATH:"unsafe"},
  {P5_T24_AUTO_DISPATCH_ENABLED:"true"},{P5_CD_GH_QUEUED_T24_EXECUTE:"1"},{RAPIDAPI_KEY:"forbidden"},
  {GITHUB_EVENT_NAME:"workflow_dispatch"},{P5_CD_GH_PRE_STOP:"1"}])
  assert.throws(()=>requireP5CdGithubCurrentPrivateT24Scope({...a,...b}));
 assert.throws(()=>admitP6CurrentT24Worker(a),/PROTECTED_CUSTODY_AND_ENROLLMENT/);
 assert.throws(()=>localP6T24SingletonEnv(a,{}),/NO_EXACT/);
});
test("one attempt per packet within four bounded parallel lanes, aggregate only",async()=>{
 const p=packets(24),seen=new Set();let active=0,peak=0;
 const r=await runP6BoundedT24Packets(p,4,async x=>{
  active++;peak=Math.max(peak,active);assert(!seen.has(x.entry.packetSha256));seen.add(x.entry.packetSha256);
  await Promise.resolve();active--;return "VERIFIED_WITH_CUSTODY";
 });
 assert.equal(peak,4);assert.equal(seen.size,24);assert.equal(r.verified,24);assert.equal(r.custodied,24);assert.equal(r.held,0);
 assert(!JSON.stringify(r).includes(p[0].entry.packetSha256));
});
test("unknown custody after confirmed PRE preserves partial confirmed evidence and stops remaining work",async()=>{
 const r=await runP6BoundedT24Packets(packets(5),1,async()=> "VERIFIED_CUSTODY_UNKNOWN");
 assert.equal(r.status,"HOLD_CURRENT_PRIVATE_T24_UNKNOWN_NO_REPLAY");assert.equal(r.attemptedCount,1);
 assert.equal(r.verified,1);assert.equal(r.custodied,0);assert.equal(r.held,1);assert.equal(r.deferredCount,4);
});
test("unknown PRE stops next attempts and bounds or duplicate packets are refused",async()=>{
 const p=packets(3),r=await runP6BoundedT24Packets(p,1,async()=>{throw Error("synthetic uncertainty");});
 assert.equal(r.attemptedCount,1);assert.equal(r.held,1);assert.equal(r.verified,0);
 await assert.rejects(runP6BoundedT24Packets(p,5,async()=> "NO_DUE"),/UNBOUNDED/);
 await assert.rejects(runP6BoundedT24Packets([p[0],p[0]],1,async()=> "NO_DUE"),/NONUNIQUE/);
 let calls=0;
 const bound=await runP6BoundedT24Packets(p,1,async()=> "NO_DUE",()=>calls++===0?0:720001);
 assert.equal(bound.attemptedCount,0);assert.equal(bound.deferredCount,3);
});

test("explicit current T24 execution has same scoped release; no legacy roster or later PRE bypass",()=>{
 const e={...env(),GITHUB_EVENT_NAME:"workflow_dispatch",P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:P6_CURRENT_T24_DISPATCH_CONFIRM};
 assert.equal(requireP5CdGithubCurrentPrivateT24Scope(e).rosterSha256,undefined);
 assert.throws(()=>requireP5CdGithubPreRelease(e,{allowReviewedT24Witness:true}));
 assert.throws(()=>admitP6CurrentT24Worker(e),/PROTECTED_CUSTODY_AND_ENROLLMENT/);
 assert.equal(isP6CurrentPreTrigger(e),false);
 for(const d of [{P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:"wrong"},{P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:""},
  {GITHUB_EVENT_NAME:"schedule"},{P6_PRIVATE_T24_EXECUTION_ENABLED:"0"},{P5_T24_AUTO_DISPATCH_ENABLED:"true"},
  {P5_CD_GH_PRE_STOP:"1"},{V39_PHASE5_FREEZE_SIGNED:"0"},{P5_CD_GH_ROSTER_PATH:"legacy"},
  {P6_PRIVATE_CURRENT_PRE_DISPATCH_CONFIRM:"RUN_CURRENT_SIGNED_PRE_TICK_NO_PROVIDER"}])
  assert.throws(()=>requireP5CdGithubCurrentPrivateT24Scope({...e,...d}));
});
test("current T24 exact calendar parity; explicit dispatch cannot authorize enrollment",()=>{
 const trust={reviewedCodeSha:code,manifestSha256:h,calendarSha256:h,releaseSha256:h,rightsSha256:h};
 const plans=new Map(),hash=b=>createHash("sha256").update(b).digest("hex");
 const dayPlanSha256s=Array.from({length:31},(_,i)=>{
  const runDayIndex=i+1,bytes=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex,
   templates:Array.from({length:12},()=>({runDayIndex,horizon:"T-24h",
    scheduledRequestUtc:"2030-01-01T00:00:00.000Z",earliestPlannedCutoffUtc:"2030-01-01T00:15:00.000Z",
    serviceWindowEndUtc:"2030-01-02T04:00:00.000Z"}))}));
  plans.set("data-collection/phase5/planning/phase6-source-day-"+String(runDayIndex).padStart(2,"0")+".json",bytes);
  return {runDayIndex,sha256:hash(bytes)};
 });
 const policy=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",
  delegatedDailyPacketProductionApproved:true,approvedCodeSha:code,manifestSha256:h,calendarSha256:h,releaseSha256:h,rightsSha256:h,
  dayPlanSha256s,validFromUtc:"2030-01-01T00:00:00.000Z",validUntilUtc:"2030-03-01T00:00:00.000Z"}));
 const scheduled={...env(),P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",P6_NONPAID_DAILY_POLICY_BASE64:policy.toString("base64"),
  P6_NONPAID_DAILY_POLICY_SHA256:hash(policy)};
 const manual={...scheduled,GITHUB_EVENT_NAME:"workflow_dispatch",P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:P6_CURRENT_T24_DISPATCH_CONFIRM};
 const read=path=>plans.get(path);
 assert.deepEqual(loadP6CurrentT24CalendarWindows(manual,trust,read),loadP6CurrentT24CalendarWindows(scheduled,trust,read));
 assert.throws(()=>loadP6LaterCalendarWindows(manual,trust,read,"T24"),/EXPLICIT_SCHEDULE_SCOPE_REQUIRED/);
 assert.throws(()=>loadP6CurrentT24CalendarWindows({...manual,P6_PRIVATE_T24_RUN_DAYS:"1"},trust,read),/EXPLICIT_SCHEDULE_SCOPE_REQUIRED/);
});

test("T24 runtime diagnostic preserves bounded known reason and hides unknown exception contents",()=>{
 for(const m of ["HOLD_P6_T24_ENROLL_WRONG_RESTRICTED_TLS_URL","HOLD_P6_CURRENT_T24_STUDY_TRUST_DRIFT","HOLD_P6_CURRENT_T24_CONDITIONAL_T24_PROTOCOL_SCOPE_MISSING_OR_DRIFT","HOLD_P6_COMMITTED_T24_CUSTODY_POLICY_SHA_DRIFT","REFUSED_P5_CD_GH_CODE_LINEAGE_BASELINE_NOT_ANCESTOR_OR_EXECUTABLE_DRIFT","REFUSED_P5_CONDITIONAL_QUEUE_PACKET_SEPARATE_PROSPECTIVE_SCOPE_AND_PROOF_REQUIRED","HOLD_P7_PROTECTED_PRE_RESOLVER_DISTINCT_TLS_READER"])assert.equal(currentT24FailureDiagnostic(Error(m)),m);
 for(const m of ["postgresql://user:private@host/neondb","HOLD_P6_CURRENT_T24_FOO private-password","HOLD_P6_CURRENT_T24_"+"X".repeat(200),"unexpected SQL exception"])assert.equal(currentT24FailureDiagnostic(Error(m)),"HOLD_P6_CURRENT_T24_REDACTED_NO_REPLAY");
});

test("complete synthetic protected T24 startup with the actual 31 checked-in calendar files",()=>{
 const digest=b=>createHash("sha256").update(b).digest("hex");
 const key=()=>{const {publicKey,privateKey}=generateKeyPairSync("ed25519");return {pem:publicKey.export({format:"pem",type:"spki"}),fp:digest(publicKey.export({format:"der",type:"spki"})),privateWire:Buffer.from(privateKey.export({format:"pem",type:"pkcs8"})).toString("base64")};};
 const day=key(),query=key(),later=key(),custody=key();
 const reader="phase6_private_reader_login_fixture_20261123";
 const trust={independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:reader,reviewedCodeSha:code,manifestSha256:h,calendarSha256:h,releaseSha256:h,rightsSha256:h,dayReviewerFingerprintSha256:day.fp,dayReviewerPublicKeyPem:day.pem,queryReviewerFingerprintSha256:query.fp,queryReviewerPublicKeyPem:query.pem};
 const pins=Array.from({length:31},(_,i)=>({runDayIndex:i+1,sha256:digest(readFileSync("data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json"))}));
 const policy=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,approvedCodeSha:code,manifestSha256:h,calendarSha256:h,releaseSha256:h,rightsSha256:h,frameSha256:h,configSha256:h,dayPlanSha256s:pins,validFromUtc:"2026-11-23T23:45:00.000Z",validUntilUtc:"2026-12-29T04:00:00.000Z",nativeLaterReview:{approved:true,nativeT24ReviewApproved:true,independentT24WitnessProtocolReviewed:true,reviewedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107",frameSha256:h,configSha256:h,laterReviewerFingerprintSha256:later.fp,laterReviewerPublicKeyPem:later.pem,maximumPrivateRetentionHours:96,validFromUtc:"2026-11-23T23:45:00.000Z",validUntilUtc:"2026-12-29T04:00:00.000Z",maximumT24ExecutionLanes:4,selectedTConfig:{verifiedProviderNativeSchedule:true,milestone:"departure.scheduledTime.utc",version:"synthetic-test",artifactHash:h,semanticsEvidenceSha256:h}}}));
 const complete={...env(),P6_T24_CUSTODY_ENABLED:"1",P6_T24_CUSTODY_APPROVED:"1",P5_CD_GH_E_ROUTE_FEATURES_APPROVED:"1",P5_CD_GH_E_SUPPLEMENTAL_FEATURES_APPROVED:"1",P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64:custody.privateWire,P6_PRIVATE_PUBLISHER_DATABASE_URL:"postgresql://phase6_private_publisher_login_fixture:ci@ep-test.neon.tech/neondb?sslmode=require",P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+reader+":ci@ep-test.neon.tech/neondb?sslmode=require",P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:Buffer.from(JSON.stringify(trust)).toString("base64"),V39_P5_RELEASE_SHA256:h,P6_NONPAID_DAILY_POLICY_BASE64:policy.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:digest(policy)};
 const admitted=admitP6CurrentT24Worker(complete);
 assert.equal(admitted.lanes,4);assert.equal(admitted.calendar.windows.length,31);
 assert.equal(admitP6CurrentT24Worker({...complete,GITHUB_EVENT_NAME:"workflow_dispatch",P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:P6_CURRENT_T24_DISPATCH_CONFIRM}).lanes,4);
 for(const k of ["P6_T24_CUSTODY_APPROVED","P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED","P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED","P6_NONPAID_DAILY_POLICY_SHA256","P6_PRIVATE_READER_DATABASE_URL","P5_CD_GH_PRE_ARMED"])assert.throws(()=>admitP6CurrentT24Worker({...complete,[k]:""}),undefined,k);
});

test("conditional T24 workflow projection and singleton verification require matching protocol pin",async()=>{
 const workflow=readFileSync(".github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml","utf8");
 const matches=workflow.match(/P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:\s*\$\{\{\s*vars\.P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256\s*\}\}/g)??[];
 assert.equal(matches.length,2,"both T24 execution jobs must project P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256");
 const {hashPhase7DurableCandidate}=await import("../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39.ts");
 const digest=b=>createHash("sha256").update(b).digest("hex");
 const key=()=>{const {publicKey,privateKey}=generateKeyPairSync("ed25519");return {pem:publicKey.export({format:"pem",type:"spki"}),fp:digest(publicKey.export({format:"der",type:"spki"})),privateWire:Buffer.from(privateKey.export({format:"pem",type:"pkcs8"})).toString("base64")};};
 const day=key(),query=key(),later=key(),custody=key();
 const m=digest("manifest"),rg=digest("rights"),cal=digest("calendar"),rel=digest("release"),fr=digest("frame"),cfg=digest("config"),art=digest("artifact"),sem=digest("semantics");
 const protocol=digest("conditional-protocol"),extUse=digest("conditional-external-use"),svcKey=digest("service-key"),policySha=digest("p7-policy");
 const reader="phase6_private_reader_login_fixture_20261123";
 const trust={independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:reader,reviewedCodeSha:code,manifestSha256:m,calendarSha256:cal,releaseSha256:rel,rightsSha256:rg,dayReviewerFingerprintSha256:day.fp,dayReviewerPublicKeyPem:day.pem,queryReviewerFingerprintSha256:query.fp,queryReviewerPublicKeyPem:query.pem};
 const pins=Array.from({length:31},(_,i)=>({runDayIndex:i+1,sha256:digest(readFileSync("data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json"))}));
 const policy=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,approvedCodeSha:code,manifestSha256:m,calendarSha256:cal,releaseSha256:rel,rightsSha256:rg,frameSha256:fr,configSha256:cfg,dayPlanSha256s:pins,validFromUtc:"2026-11-23T23:45:00.000Z",validUntilUtc:"2026-12-29T04:00:00.000Z",
  conditionalPreFeatureReview:{schema:"v39.phase5.conditional-pre-feature-review-policy.v1",approved:true,protocolSha256:protocol,externalContentUseReviewSha256:extUse,rightsSha256:rg},
  nativeLaterReview:{approved:true,nativeT24ReviewApproved:true,independentT24WitnessProtocolReviewed:true,reviewedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107",frameSha256:fr,configSha256:cfg,laterReviewerFingerprintSha256:later.fp,laterReviewerPublicKeyPem:later.pem,maximumPrivateRetentionHours:96,validFromUtc:"2026-11-23T23:45:00.000Z",validUntilUtc:"2026-12-29T04:00:00.000Z",maximumT24ExecutionLanes:4,conditionalT24Scope:{protocolSha256:protocol,externalContentUseReviewSha256:extUse},selectedTConfig:{verifiedProviderNativeSchedule:true,milestone:"departure.scheduledTime.utc",version:"synthetic-test",artifactHash:art,semanticsEvidenceSha256:sem}}}));
 const complete={...env(),V39_P5_MANIFEST_SHA256:m,V39_P5_RIGHTS_SHA256:rg,P6_T24_CUSTODY_ENABLED:"1",P6_T24_CUSTODY_APPROVED:"1",P5_CD_GH_E_ROUTE_FEATURES_APPROVED:"1",P5_CD_GH_E_SUPPLEMENTAL_FEATURES_APPROVED:"1",P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64:custody.privateWire,P6_PRIVATE_PUBLISHER_DATABASE_URL:"postgresql://phase6_private_publisher_login_fixture:ci@ep-test.neon.tech/neondb?sslmode=require",P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+reader+":ci@ep-test.neon.tech/neondb?sslmode=require",P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:Buffer.from(JSON.stringify(trust)).toString("base64"),V39_P5_RELEASE_SHA256:rel,P6_NONPAID_DAILY_POLICY_BASE64:policy.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:digest(policy),P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:protocol};
 assert.equal(admitP6CurrentT24Worker(complete).lanes,4);
 assert.throws(()=>admitP6CurrentT24Worker({...complete,P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:""}),/CONDITIONAL_T24_PROTOCOL_SCOPE_MISSING_OR_DRIFT/);
 assert.throws(()=>admitP6CurrentT24Worker({...complete,P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:digest("wrong-protocol")}),/INVALID_CONDITIONAL_POLICY_PIN/);
 const prePermit={manifestSha256:m,queryDigestSha256:digest("q"),expectedSourcePopulationQueryId:"11111111-1111-4111-8111-111111111111",expectedSourceResponseSha256:digest("resp"),runDayIndex:5,slot:"HUB",horizon:"T-24h",airportIcao:"WSSS",flightInstanceId:"leg:g5a:"+svcKey,expectedGithubSourceRunId:"1234567",expectedReviewedReleaseSha256:rel,expectedReviewedSourceRightsSha256:rg,expectedProviderContractSha256:digest("contract"),expectedEarlyDrawSha256:digest("draw"),reviewedFrameSha256:fr,reviewedConfigSha256:cfg,independentlyReviewedOperatingLegEvidenceSha256:digest("leg"),independentlyReviewedNativeTEvidenceSha256:sem,independentlyReviewedRunAndRetentionEvidenceSha256:digest("ret"),frozenBuilderSha256:digest("builder"),builderFrozenAtUtc:"2026-11-28T00:00:00.000Z",selectedTConfig:{verifiedProviderNativeSchedule:true,milestone:"departure.scheduledTime.utc",version:"synthetic-test",artifactHash:art,semanticsEvidenceSha256:sem},selectedTNativeUtc:"2026-11-30T16:00:00.000Z",maxPopulationStalenessSeconds:3600,expectedRestrictedPreWriterRole:"phase5_fids_pre_writer_prod_20261107",identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",reviewedProtocolAmendmentSha256:protocol,reviewedStableServiceKeySha256:svcKey,expectedOperatorFlightNumber:"SQ101",expectedDestinationIcao:"OMAA",externalConditionalScheduleSourceAndUseReviewed:true,requireProspectiveConditionalSourceMarker:true,reviewedSupplementalFeatureBundle:{schema:"v39.phase5.e-signed-source-supplement.v1",flightInstanceId:"leg:g5a:"+svcKey,populationQueryId:"11111111-1111-4111-8111-111111111111",originalResponseSha256:digest("resp"),fields:["operating_carrier","scheduled_arrival_utc","provider_revised_departure_utc","reported_pre_departure_status"],observations:[],observationsSha256:digest("[]"),externalSourceAndContentsReviewReceiptSha256:extUse}};
 const witnessReview={flightInstanceId:prePermit.flightInstanceId,sourcePopulationQueryId:prePermit.expectedSourcePopulationQueryId,expectedSourceResponseSha256:prePermit.expectedSourceResponseSha256,expectedSourceQueryDigestSha256:prePermit.queryDigestSha256,expectedFrameSha256:fr,expectedConfigSha256:cfg,selectedTNativeUtc:prePermit.selectedTNativeUtc,expectedT24CutoffUtc:"2026-11-29T16:00:00.000Z",expectedSelectedTVersion:"departure.scheduledTime.utc:synthetic-test:"+art,expectedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107",reviewedConditionalProtocolSha256:protocol};
 const proofMeta={schema:"v39.phase7.separate-pre-field-proof.v1",manifestSha256:m,rightsSha256:rg,policySha256:policySha,permitSha256:hashPhase7DurableCandidate(prePermit),issuedAtUtc:"2026-11-29T15:00:00.000Z",validUntilUtc:"2026-11-29T16:00:00.000Z",fields:[]};
 const phase7FieldProof={payloadBase64:Buffer.from(JSON.stringify(proofMeta)).toString("base64"),signatureBase64:Buffer.alloc(64,7).toString("base64")};
 const packet={schema:"v39.phase5.github-conditional-t24-pre-witness-reviewed.v1",reviewedCodeSha:code,reviewArtifactSha256:digest("review-artifact"),independentlyReviewedConditionalScheduleServiceAndSourceAttested:true,reviewedConditionalProtocolSha256:protocol,prePermit,witnessReview,phase7FieldProof};
 const packetBytes=Buffer.from(JSON.stringify(packet)),packetSha256=digest(packetBytes),filePath="data-collection/phase5/frozen/cond_t24_fixture.json";
 const roster={schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1",reviewedCodeSha:code,manifestSha256:m,rightsSha256:rg,entries:[{filePath,packetSha256}]};
 const rosterBytes=Buffer.from(JSON.stringify(roster)),rosterSha256=digest(rosterBytes);
 const projection={rosterSha256,rosterBytes,roster,files:[{filePath,packetSha256,bytes:packetBytes}],entry:{packetSha256,permit:prePermit,witnessReview}};
 const ok=localP6T24SingletonEnv(complete,projection);
 assert.equal(ok.packets.size,1);
 assert.equal(ok.packets.get(packetSha256)?.permit.identityEvidenceTier,"CONDITIONAL_QUERY_FILTERED_SERVICE");
 assert.throws(()=>localP6T24SingletonEnv({...complete,P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:""},projection),/SEPARATE_PROSPECTIVE_SCOPE_AND_PROOF_REQUIRED/);
});
