import {createHash,generateKeyPairSync} from "node:crypto";
import {describe,it,expect} from "vitest";
import {selectP6CommittedNativeSourceQuery,deriveP6CommittedNativeQueryScope} from "../server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs";
const h=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex"),H=(c:string)=>c.repeat(64);
function fixture(){
 const trust={independentStudyTrustPinsApproved:true,reviewedCodeSha:"a".repeat(40),
  manifestSha256:H("a"),rightsSha256:H("b"),releaseSha256:H("c"),calendarSha256:H("d")};
 const q={schema:"v39.phase5.github-source-one-query-template.v2",manifestSha256:trust.manifestSha256,
  queryDigestSha256:H("e"),plan:{independentlyApprovedSourceAndRetention:true,githubOnlyOwnerApproved:true,
   reviewedProviderRightsSha256:trust.rightsSha256,reviewedReleaseSha256:trust.releaseSha256,
   openapiSha256:H("f"),expectedEarlyDrawSha256:H("1"),day:{scheduledStartUtc:"2027-02-10T11:00:00.000Z"},
   sourcePartition:{schema:"v39.phase5.amendment-c.source-segment-partition.v1",windowShape:"4h",segmentIndex:1,
    partitionIndex:1,verifiedProviderMaxRangeMinutes:60,reviewedProviderRangeEvidenceSha256:H("2")},
   acquisition:{runDayIndex:1,slot:"HUB",horizon:"T-6h",icao:"WSSS",providerQueryDirection:"Departure",
    apiUnitsPerAttempt:2,maxAttempts:1,serviceWindowStartUtc:"2027-02-10T11:00:00.000Z",serviceWindowEndUtc:"2027-02-10T12:00:00.000Z"}}};
 const bytes=Buffer.from(JSON.stringify(q)),path="data-collection/phase5/frozen/sourceq_synthetic_query.json";
 const registry=Buffer.from(JSON.stringify({schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:trust.manifestSha256,runDayIndex:1,entries:[{filePath:path,expectedPacketSha256:h(bytes),
   expectedQueryDigestSha256:q.queryDigestSha256}]}));
 const registryPath="data-collection/phase5/frozen/source_synthetic_registry.json";
 const parsed={schema:"v39.phase6.run-day-scoped-append-only-index.v1",runDayIndex:1,revision:1,
  manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,reviewedCodeSha:trust.reviewedCodeSha,
  reviewedRightsSha256:trust.rightsSha256,reviewedReleaseSha256:trust.releaseSha256,
  entries:[{lane:"SOURCE",runDayIndex:1,shardIndex:1,filePath:registryPath,fileSha256:h(registry),
    notBeforeUtc:"2027-02-10T04:00:00.000Z",hardLatestUtc:"2027-02-10T04:30:00.000Z"}]};
 const indexBytes=Buffer.from(JSON.stringify(parsed)),selector={runDayIndex:1,indexRevision:1,indexSha256:h(indexBytes),queryDigestSha256:q.queryDigestSha256};
 const index:any={redactedSummary:{status:"SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH",indexSha256:h(indexBytes),
  indexRevision:1,runDayIndex:1,externalEd25519ReviewerVerified:true,restrictedPrivatePg16ReaderVerified:true,
  actualPrivateRegistryBytesRead:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false,
  observedDbClockUtc:"2027-02-10T04:40:00.000Z"}};
 Object.defineProperties(index,{privateParsedIndex:{value:parsed,enumerable:false},privateCurrentIndexBytes:{value:indexBytes,enumerable:false},
  getFrozen:{value:(p:string)=>{if(p!==registryPath)throw Error("unexpected");return registry},enumerable:false}});
 const receipt:any={redactedSummary:{status:"VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO",kind:"SOURCE_QUERY_PACKET",
  verifiedEd25519Review:true,runDayIndex:1,shardIndex:1,contentSha256:h(bytes),providerCalls:0,databaseWrites:0,githubDispatches:0}};
 Object.defineProperties(receipt,{privateBytes:{value:bytes,enumerable:false},privateLogicalPath:{value:path,enumerable:false}});
 const policy={independentNativeCandidateReadOnlyApproved:true,maximumPopulationStalenessSeconds:3600,providerContractSha256:H("f")};
 return{trust,selector,index,receipt,policy};
}

function pendingFixture(){
 const f=fixture(),old=f.index.privateParsedIndex.entries[0],source=f.index.getFrozen(old.filePath);
 const sourceEntry={...old,publishedAtUtc:"2027-02-10T03:59:00.000Z",reviewEvidenceSha256:H("7"),
  sourceRegistryFilePath:null,sourceRegistrySha256:null};
 const laterPath="data-collection/phase5/frozen/later_synthetic_registry.json";
 const later=Buffer.from(JSON.stringify({schema:"v39.phase5.signed-later-pre-day-registry.v1",manifestSha256:f.trust.manifestSha256,
  reviewedCodeSha:f.trust.reviewedCodeSha,runDayIndex:1,shardIndex:1,sourceDayRegistryFilePath:old.filePath,
  sourceDayRegistrySha256:old.fileSha256,entries:[{filePath:"data-collection/phase5/frozen/pre_synthetic_packet.json",
   expectedPacketSha256:H("8"),expectedQueryDigestSha256:f.selector.queryDigestSha256,
   expectedFlightInstanceId:"flight_existing",expectedHorizon:"T-6h",expectedSelectedTNativeUtc:"2027-02-10T11:20:00.000Z"}]}));
 const prior={...f.index.privateParsedIndex,previousIndexSha256:null,entries:[sourceEntry]};
 const priorBytes=Buffer.from(JSON.stringify(prior));
 const current={...prior,revision:2,previousIndexSha256:h(priorBytes),entries:[sourceEntry,
  {...sourceEntry,lane:"LATER_PRE",filePath:laterPath,fileSha256:h(later),publishedAtUtc:"2027-02-10T04:10:00.000Z",
   notBeforeUtc:"2027-02-10T04:10:00.000Z",hardLatestUtc:"2027-02-10T05:20:00.000Z",
   sourceRegistryFilePath:old.filePath,sourceRegistrySha256:old.fileSha256}]};
 const raw=Buffer.from(JSON.stringify(current)),selector={...f.selector,indexRevision:2,indexSha256:h(raw)};
 const index:any={redactedSummary:{...f.index.redactedSummary,indexRevision:2,indexSha256:h(raw),
  observedDbClockUtc:"2027-02-10T04:40:30.000Z",authoritativeFlightSemanticAdmissionDone:false,githubChildDispatches:0}};
 Object.defineProperties(index,{privateParsedIndex:{value:current},privateCurrentIndexBytes:{value:raw},
  privatePreviousIndexBytes:{value:priorBytes},getFrozen:{value:(p:string)=>p===laterPath?later:source}});
 const scope={...deriveP6CommittedNativeQueryScope(f.receipt,selectP6CommittedNativeSourceQuery(index,selector,f.trust),
  selector,f.trust,f.policy),expectedSourceGithubRunId:"123456"};
 const candidate=(id:string,native:string)=>({flightInstanceId:id,sourcePopulationQueryId:"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  sourceResponseSha256:H("3"),manifestSha256:scope.manifestSha256,queryDigestSha256:scope.queryDigestSha256,
  runDayIndex:1,slot:scope.slot,horizon:scope.horizon,sourceAirportIcao:scope.airportIcao,selectedTNativeUtc:native,
  ownCutoffUtc:new Date(Date.parse(native)-21600000).toISOString(),actualMemberAvailableUtc:"2027-02-10T04:30:00.000Z",
  status:"ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED",externalNativeTAndPhysicalIdentityReviewRequired:true,
  contentsRightsCertifiedHere:false,stage14PermitIssuedHere:false,providerCalls:0,databaseWrites:0});
 const candidates=[candidate("flight_existing","2027-02-10T11:25:00.000Z"),
  candidate("flight_new","2027-02-10T11:05:00.000Z"),candidate("flight_too_late","2027-02-10T10:55:15.000Z"),
  candidate("flight_future","2027-02-10T14:00:00.000Z")];
 const audit={schema:"v39.phase5.actual-source-native-flight-candidates-readonly.v1",
  status:"ACTUAL_SOURCE_CANDIDATE_REVIEW_NOT_PACKET_SIGNING",sourceGithubRunId:"123456",
  actualDbClockUtc:"2027-02-10T04:40:00.000Z",sourcePopulationQueryId:candidates[0].sourcePopulationQueryId,
  sourceResponseSha256:H("3"),queryDigestSha256:scope.queryDigestSha256,observedMemberCount:4,candidateCount:4,censoredCount:0,
  candidates,providerCalls:0,databaseWrites:0,signedPrePacketsCreated:0,phase6PaidGoGranted:false,
  providerContentsRightsCertified:false,physicalOperatingLegIndependentlyCertified:false,nativeTIndependentlyCertified:false,phase5ScientificFreezeGranted:false,
  classifications:{ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED:4,CENSORED_AMBIGUOUS_SOURCE_IDENTITY:0,
   CENSORED_NONNATIVE_OR_UNCONFIRMED_OPERATING_MEMBER:0,CENSORED_MEMBER_NOT_AVAILABLE_BY_ACTUAL_DB_CLOCK:0,
   CENSORED_MISSING_NATIVE_T:0,CENSORED_SOURCE_TOO_STALE_OR_EXPIRED:0,CENSORED_SOURCE_ARRIVED_AFTER_OWN_CUTOFF:0,
   CENSORED_NO_PROSPECTIVE_PRE_LEAD:0,CENSORED_OUTSIDE_APPROVED_SOURCE_WINDOW:0}};
 const build=(x:any)=>{const bytes=Buffer.from(JSON.stringify(x));const a:any={
  status:"ACTUAL_COMMITTED_SOURCE_CANDIDATES_AWAIT_INDEPENDENT_PRE_REVIEW",runDayIndex:1,horizon:scope.horizon,
  candidateAuditSha256:h(bytes),observedMemberCount:4,candidateCount:4,censoredCount:0,actualDbClockUtc:x.actualDbClockUtc,
  providerCalls:0,databaseWrites:0,signedPrePacketsIssued:0,phase6PaidGo:false};
  Object.defineProperties(a,{privateAuditBytes:{value:bytes},privateSourceScope:{value:scope},
   privateSourceRegistrySha256:{value:old.fileSha256},privateSourceRegistryPath:{value:old.filePath},privateSourceRegistryBytes:{value:Buffer.from(source)}});return a;};
 return {a:build(audit),audit,build,index,selector,trust:f.trust};
}

import {selectP6PostNativePreCandidatePage,selectP6PostConditionalT6CandidatePage,readP6ActualNativePostPreCandidatePage,readP6ActualConditionalT6PostPreCandidatePage,proposeP6NativePostPhysicalWindow}
 from "../server/lib/disruption/phase6PostNativePreCandidateReadOnce_v39.mjs";
describe("native POST candidate pages require exact signed SOURCE and later PRE scope",()=>{
 it("projects signed permit candidates only, never counts them as actual PRE or leaks flight IDs",()=>{
  const f=pendingFixture();
  const args={index:f.index,selector:f.selector,trust:f.trust,sourceScope:f.a.privateSourceScope};
  const p=selectP6PostNativePreCandidatePage(args);
  expect(p).toMatchObject({status:"SIGNED_LATER_NATIVE_POST_CANDIDATE_PAGE_NOT_ACTUAL_PRE",totalCandidateCount:1,pageCandidateCount:1,remainingAfterPageCount:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false});
  expect(p.privateCandidates).toEqual([{flightInstanceId:"flight_existing",
   expectedSelectedTNativeUtc:"2027-02-10T11:20:00.000Z",boundSourceQueryDigests:[f.selector.queryDigestSha256]}]);
  expect(JSON.stringify(p)).not.toContain("flight_existing");
  const next=selectP6PostNativePreCandidatePage({...args,afterFlightId:"flight_existing",pageSize:1});
  expect(next.privateCandidates).toHaveLength(0);
  expect(()=>selectP6PostNativePreCandidatePage({...args,pageSize:385})).toThrow("UNBOUND_PAGE_SCOPE");
  expect(()=>selectP6PostNativePreCandidatePage({...args,sourceScope:{...args.sourceScope,horizon:"T-90m"}})).toThrow("CROSS_SOURCE_OR_HORIZON");
  expect(()=>selectP6PostNativePreCandidatePage({...args,sourceScope:{...args.sourceScope,expectedServiceWindowEndUtc:"2027-02-10T11:05:00.000Z"}})).toThrow("NATIVE_T_OUTSIDE_SIGNED_SOURCE");
  expect(()=>selectP6PostNativePreCandidatePage({...args,selector:{...f.selector,queryDigestSha256:H("9")}})).toThrow("SOURCE_QUERY_NOT_UNIQUE");
 });
 it("isolates conditional later PRE from native anchor selection without losing valid peers",()=>{
  const f=pendingFixture(),old=f.index.privateParsedIndex.entries[1],later=JSON.parse(f.index.getFrozen(old.filePath).toString());
  const original=later.entries[0],conditional="leg:g5a:"+H("4");
  function run(id:string,separate=false,marker=true,witnessDigest?:string){
   const bytes=Buffer.from(JSON.stringify({...later,entries:[original,{...original,expectedFlightInstanceId:id,expectedPacketSha256:H("9"),
    ...(witnessDigest===undefined?{}:{expectedT24ReceiptSha256:witnessDigest})}]}));
   const parsed={...f.index.privateParsedIndex,entries:[f.index.privateParsedIndex.entries[0],{...old,fileSha256:h(bytes)}]};
   const raw=Buffer.from(JSON.stringify(parsed)),selector={...f.selector,indexSha256:h(raw)};
   const index:any={redactedSummary:{...f.index.redactedSummary,indexSha256:h(raw)}};
   Object.defineProperties(index,{privateParsedIndex:{value:parsed},privateCurrentIndexBytes:{value:raw},
    getFrozen:{value:(path:string)=>path===old.filePath?bytes:f.index.getFrozen(path)}});
   const sourceScope={...f.a.privateSourceScope,...(marker?{conditionalServiceScope:{reviewedConditionalServiceScope:true,protocolSha256:H("a")}}:{})};
   return (separate?selectP6PostConditionalT6CandidatePage:selectP6PostNativePreCandidatePage)({index,selector,trust:f.trust,sourceScope});
  }
  const out=run(conditional);expect(out.conditionalCandidatesExcludedFromNativeCount).toBe(1);
  expect(out.privateCandidates.map((c:any)=>c.flightInstanceId)).toEqual(["flight_existing"]);
  expect(JSON.stringify(out)).not.toContain(conditional);
  expect(()=>run("leg:g5a:malformed")).toThrow("CONDITIONAL_IDENTITY_NAMESPACE_DRIFT");
  const sep=run(conditional,true);
  expect(sep).toMatchObject({status:"SIGNED_CONDITIONAL_T6_POST_CANDIDATE_PAGE_NOT_ACTUAL_PRE",totalCandidateCount:1,nativeCandidatesExcludedFromConditionalCount:1,phase6PaidGo:false});
  expect(sep.privateCandidates).toEqual([{flightInstanceId:conditional,expectedSelectedTNativeUtc:original.expectedSelectedTNativeUtc,
   expectedPacketSha256:H("9"),boundSourceQueryDigests:[f.selector.queryDigestSha256]}]);
  expect(JSON.stringify(sep)).not.toContain(conditional);
  const witnessed=run(conditional,true,true,H("6"));
  expect(witnessed.privateCandidates[0].expectedT24ReceiptSha256).toBe(H("6"));
  expect(JSON.stringify(witnessed)).not.toContain(H("6"));
  expect(()=>run(conditional,true,true,"bad")).toThrow("SIGNED_CONDITIONAL_T24_RECEIPT_DIGEST");
  expect(()=>run(conditional,true,false)).toThrow("CONDITIONAL_T6_SIGNED_SCOPE_REQUIRED");
  expect(()=>proposeP6NativePostPhysicalWindow({page:sep,policyBytes:Buffer.alloc(0),expectedPolicySha256:H("1"),trust:f.trust})).toThrow("UNAPPROVED_PHYSICAL_WINDOW_SCOPE");
 });
 it("refuses unapproved runtime before a restricted SQL read",async()=>{
  const f=pendingFixture();let calls=0;
  await expect(readP6ActualNativePostPreCandidatePage({
   readerClient:{query:async()=>{calls++;throw Error("NO")}},sourcePool:{},
   trust:f.trust,selector:f.selector,policy:{}})).rejects.toThrow("NO_EXACT_NONPAID_SCOPE");
  expect(calls).toBe(0);
  await expect(readP6ActualConditionalT6PostPreCandidatePage({readerClient:{query:async()=>{calls++;throw Error("NO")}},
   sourcePool:{},trust:f.trust,selector:f.selector,policy:{}})).rejects.toThrow("NO_SEPARATE_CONDITIONAL_POST_READ_SCOPE");
  expect(calls).toBe(0);
 });
});


import {buildP6DelegatedNativePostPacket,buildP6PostDayAppend,chooseP6NativePostWindowHints,readP6PostSourceQueryHints}
 from "../server/lib/disruption/phase6NativePostSignedPublication_v39.mjs";
import {executeP6PostProducerTick,admitP6NativePostProducer,isP6NativePostProducerTrigger} from "../scripts/v39_phase6_native_post_producer_v39.mjs";
describe("prospective native POST physical request drafts",()=>{
 function draftFixture(horizon="T-6h",id="flight_synthetic_anchor"){
  const f=fixture(),q=JSON.parse(f.receipt.privateBytes.toString("utf8"));
  q.queryDigestSha256=h(horizon);q.plan.acquisition.horizon=horizon;
  Object.assign(q.plan,{localFrom:"2027-02-10T19:00",localTo:"2027-02-10T20:00",ianaTimezone:"Asia/Singapore"});
  const sourceScope={manifestSha256:f.trust.manifestSha256,queryDigestSha256:q.queryDigestSha256,
   reviewedReleaseSha256:f.trust.releaseSha256,rightsReviewSha256:f.trust.rightsSha256,providerContractSha256:H("f"),
   runDayIndex:1,slot:"HUB",horizon,airportIcao:"WSSS",expectedServiceWindowStartUtc:"2027-02-10T11:00:00.000Z",
   expectedServiceWindowEndUtc:"2027-02-10T12:00:00.000Z"};
  const candidate={flightInstanceId:id,expectedSelectedTNativeUtc:"2027-02-10T11:20:00.000Z",boundSourceQueryDigests:[q.queryDigestSha256]};
  const pre={status:"ACTUAL_SAME_FLIGHT_SOURCE_BOUND_PRE_PARTIAL_ALLOWED",manifestSha256:f.trust.manifestSha256,runDayIndex:1,
   flightInstanceId:id,observedValidHorizonCount:1,observedValidHorizons:[horizon],missingPreHorizons:[],
   actualSourcePREReferenceIds:["123"],boundSourceRegistryValidHorizonCount:1,
   observedFromIndependentRestrictedDb:true,providerCalls:0,databaseWrites:0};
  const page:any={status:"ACTUAL_NATIVE_POST_PRE_CANDIDATE_PAGE_NO_GO",runDayIndex:1,observedDbClockUtc:"2027-02-10T11:30:00.000Z",
   pageCandidateCount:1,eligibleCount:1,providerCalls:0,databaseWrites:0,postPacketsIssued:0,phase6PaidGo:false,
   privateSourceScope:sourceScope,privateSourceQueryBytes:Buffer.from(JSON.stringify(q)),privateSourceRegistrySha256:H("3"),
   privateSourceRegistryPath:"data-collection/phase5/frozen/source_synthetic_registry.json",privateIndexSha256:H("4"),
   privateReviewedFrameSha256:H("5"),privateCandidates:[candidate],
   privateDecisions:[{flightInstanceId:id,status:"VALID_ACTUAL_PRE_FOR_POST_REVIEW",pre,boundPreRetentionNotAfterUtc:"2027-02-10T15:00:00.000Z"}]};
  const policy={schema:"v39.phase6.native-post-physical-window-policy.v1",independentPostRequestGeometryApproved:true,
   manifestSha256:f.trust.manifestSha256,releaseSha256:f.trust.releaseSha256,rightsSha256:f.trust.rightsSha256,reviewedCodeSha:f.trust.reviewedCodeSha,
   reviewedCategoryBudgetSha256:H("6"),reviewedProviderPriceSha256:H("7"),reviewedFrameSha256:H("5"),reviewedProviderContractSha256:H("f"),
   followupAfterPartitionEndSeconds:1800,dispatchWindowSeconds:1200,expectedApiUnitsPerGet:2};
  const policyBytes=Buffer.from(JSON.stringify(policy));
  return {page,policy,trust:f.trust,policyBytes,expectedPolicySha256:h(policyBytes)};
 }
 it("one physical GET identity across different PRE horizons, anchors and refresh digests; no actual approval or leaked draft",()=>{
  const a=draftFixture(),b=draftFixture("T-90m","flight_other_anchor");
  const x=proposeP6NativePostPhysicalWindow(a),y=proposeP6NativePostPhysicalWindow(b);
  expect(x).toMatchObject({status:"ONE_UNSIGNED_NATIVE_POST_PHYSICAL_REQUEST",postPacketsIssued:0,phase6PaidGo:false,physicalOutcomeCertified:false});
  expect(x.requestSha256).toBe(y.requestSha256);
  expect(x.privateReviewedDraft).toMatchObject({postDispatchEarliestUtc:"2027-02-10T12:30:00.000Z",
   postDispatchHardLatestUtc:"2027-02-10T12:50:00.000Z",expectedApiUnitsPerGet:2});
  expect(x.privateReviewedDraft).not.toHaveProperty("independentFuturePostRequestAndRightsReview");
  expect(JSON.stringify(x)).not.toContain("flight_synthetic_anchor");
  expect(proposeP6NativePostPhysicalWindow({...b,existingRequestSha256s:[x.requestSha256]})).toMatchObject({
   status:"POST_PHYSICAL_REQUEST_ALREADY_INDEXED_NO_REPLAY",postPacketsIssued:0});
 });
 it("refuses conditional identity as a native POST anchor even from a forged candidate page",()=>{
  const f=draftFixture("T-6h","leg:g5a:"+H("a"));
  expect(()=>proposeP6NativePostPhysicalWindow(f)).toThrow("CONDITIONAL_SERVICE_NOT_NATIVE_POST_ANCHOR");
 });
 it("no draft if original PRE expiry cannot cover the prospective actual POST window",()=>{
  const f=draftFixture();f.page.privateDecisions[0].boundPreRetentionNotAfterUtc="2027-02-10T12:45:00.000Z";
  expect(proposeP6NativePostPhysicalWindow(f)).toMatchObject({status:"BOUND_PRE_EXPIRES_BEFORE_POST_DISPATCH_WINDOW",phase6PaidGo:false});
 });
 it("no draft for late windows, no actual PRE or altered protected frame/policy",()=>{
  const f=draftFixture();f.page.observedDbClockUtc="2027-02-10T12:30:00.000Z";
  expect(proposeP6NativePostPhysicalWindow(f).status).toBe("POST_WINDOW_NOT_PROSPECTIVE_NO_BACKFILL");
  const g=draftFixture();g.page.privateDecisions=[{flightInstanceId:g.page.privateCandidates[0].flightInstanceId,status:"POST_PRE_UNAVAILABLE_OR_AMBIGUOUS"}];g.page.eligibleCount=0;
  expect(proposeP6NativePostPhysicalWindow(g).status).toBe("NO_ACTUAL_RETAINED_BOUND_PRE_FOR_POST");
  const k=draftFixture();k.page.privateReviewedFrameSha256=H("9");
  expect(()=>proposeP6NativePostPhysicalWindow(k)).toThrow("PHYSICAL_WINDOW_POLICY_DRIFT");
  expect(()=>proposeP6NativePostPhysicalWindow({...draftFixture(),expectedPolicySha256:H("9")})).toThrow("UNAPPROVED_PHYSICAL_WINDOW_SCOPE");
 });
 function signedFixture(){
  const f=draftFixture(),day=generateKeyPairSync("ed25519"),post=generateKeyPairSync("ed25519"),query=generateKeyPairSync("ed25519");
  const fingerprint=(k:any)=>h(k.publicKey.export({type:"spki",format:"der"})),pem=(k:any)=>k.publicKey.export({type:"spki",format:"pem"}).toString();
  const trust={...f.trust,independentPostReviewerPinsApproved:true,expectedReaderSessionLogin:"phase6_private_reader_login_synthetic",
    dayReviewerFingerprintSha256:fingerprint(day),dayReviewerPublicKeyPem:pem(day),
    queryReviewerFingerprintSha256:fingerprint(query),queryReviewerPublicKeyPem:pem(query),
    postReviewerFingerprintSha256:fingerprint(post),postReviewerPublicKeyPem:pem(post)};
  const p={...f.policy,calendarSha256:trust.calendarSha256,delegatedPostPacketAndDayAppendApproved:true,
   independentSourceContentsUseAndRESTReleaseAttested:true,independentProviderContentRetentionApproved:true,
   externalPostContentsAndBudgetEvidenceSha256:H("8"),expectedPublisherSessionLogin:"phase6_private_publisher_login_synthetic",
   dayReviewerFingerprintSha256:trust.dayReviewerFingerprintSha256,queryReviewerFingerprintSha256:trust.queryReviewerFingerprintSha256,
   postReviewerFingerprintSha256:trust.postReviewerFingerprintSha256,maximumIndexRevision:1024,maximumPrivateRetentionHours:72,
   maximumPopulationStalenessSeconds:2400,validFromUtc:"2027-02-09T00:00:00.000Z",validUntilUtc:"2027-02-17T00:00:00.000Z"};
  const policyBytes=Buffer.from(JSON.stringify(p)),authority={policyBytes,expectedPolicySha256:h(policyBytes),postReviewerKey:post.privateKey,
   dayReviewerKey:day.privateKey,independentDelegatedPostAndDayAppendApproved:true,noProviderCredentialsInReviewer:true};
  const sourceRaw=Buffer.from(JSON.stringify({schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",manifestSha256:trust.manifestSha256,
   runDayIndex:1,entries:[{filePath:"data-collection/phase5/frozen/sourceq_synthetic_post_query.json",
   expectedPacketSha256:h(f.page.privateSourceQueryBytes),expectedQueryDigestSha256:f.page.privateSourceScope.queryDigestSha256}]}));
  const sourcePath=f.page.privateSourceRegistryPath,source={lane:"SOURCE",runDayIndex:1,shardIndex:1,filePath:sourcePath,fileSha256:h(sourceRaw),
   publishedAtUtc:"2027-02-10T04:00:00.000Z",notBeforeUtc:"2027-02-10T04:30:00.000Z",hardLatestUtc:"2027-02-10T05:00:00.000Z",
   reviewEvidenceSha256:H("9"),sourceRegistryFilePath:null,sourceRegistrySha256:null};
  const parsed={schema:"v39.phase6.run-day-scoped-append-only-index.v1",runDayIndex:1,revision:1,previousIndexSha256:null,
   manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,reviewedCodeSha:trust.reviewedCodeSha,
   reviewedReleaseSha256:trust.releaseSha256,reviewedRightsSha256:trust.rightsSha256,entries:[source]};
  const raw=Buffer.from(JSON.stringify(parsed)),clock="2027-02-10T11:30:30.000Z";
  function current(rawIndex=raw,at=clock,wire?:any,postRaw?:Buffer){
   const o=JSON.parse(rawIndex.toString("utf8")), index:any={redactedSummary:{status:"SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH",
    externalEd25519ReviewerVerified:true,restrictedPrivatePg16ReaderVerified:true,actualPrivateRegistryBytesRead:true,
    runDayIndex:1,indexRevision:o.revision,indexSha256:h(rawIndex),observedDbClockUtc:at,providerCalls:0,databaseWrites:0,phase6PaidGo:false}};
   Object.defineProperties(index,{privateParsedIndex:{value:o},privateCurrentIndexBytes:{value:rawIndex},
    getFrozen:{value:(path:string)=>path===sourcePath?sourceRaw:postRaw}});
   return {index,day:{wire:wire??{review:{indexSha256:h(rawIndex),retentionNotAfterUtc:"2027-02-12T00:00:00.000Z",validUntilUtc:"2027-02-12T00:00:00.000Z"}}}};
  }
  Object.assign(f.page,{privateSourceRegistrySha256:h(sourceRaw),privateIndexSha256:h(raw)});
  const proposal=proposeP6NativePostPhysicalWindow({page:f.page,trust,policyBytes,expectedPolicySha256:authority.expectedPolicySha256});
  const args={currentDay:current(),proposal,trust,authority,githubRunId:"123456789",sourceQueryRetentionNotAfterUtc:"2027-02-12T00:00:00.000Z"};
  return {args,current,raw,source,sourceRaw,post,day};
 }
 it("uses original POST packet and exact signed private append bytes; no insert or provider authorization from pure builders",()=>{
  const f=signedFixture(),b=buildP6DelegatedNativePostPacket(f.args);
  expect(b.status).toBe("DELEGATED_POST_PACKET_AWAIT_PUBLICATION_NO_GO");
  const packet=JSON.parse(b.privatePacketBytes.toString("utf8")),r=b.privateWire.review;
  expect(packet.reviewed).not.toHaveProperty("githubRunId");expect(packet.reviewed.independentFuturePostRequestAndRightsReview).toBe(true);
  expect(packet.nativePostSourceBinding).toMatchObject({sourceRegistryPath:f.source.filePath,sourceRegistrySha256:f.source.fileSha256});
  expect(r.logicalPath).toBe("data-collection/phase5/frozen/post_"+b.requestSha256+".json");
  expect(JSON.stringify(b)).not.toContain("flight_synthetic_anchor");
  const receipt:any={redactedSummary:{status:"VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO",verifiedEd25519Review:true,
   kind:"POST_PACKET",runDayIndex:1,shardIndex:r.shardIndex,contentSha256:r.contentSha256,observedDatabaseClockUtc:"2027-02-10T11:30:35.000Z",
   providerCalls:0,databaseWrites:0}};
  Object.defineProperties(receipt,{privateBytes:{value:b.privatePacketBytes},privateLogicalPath:{value:r.logicalPath}});
  const args={currentDay:f.current(f.raw,"2027-02-10T11:30:40.000Z"),signedPacket:b,receipt,trust:f.args.trust,authority:f.args.authority};
  const next=buildP6PostDayAppend(args),index=JSON.parse(next.privateIndexBytes.toString("utf8"));
  expect(next.status).toBe("DELEGATED_POST_DAY_APPEND_AWAIT_PUBLICATION_NO_GO");expect(index.revision).toBe(2);
  expect(index.entries[0]).toEqual(f.source);expect(index.entries[1]).toMatchObject({lane:"POST",fileSha256:r.contentSha256,
   sourceRegistryFilePath:f.source.filePath,sourceRegistrySha256:f.source.fileSha256,notBeforeUtc:packet.reviewed.postDispatchEarliestUtc});
  expect(next.privateWire.review.reviewerPublicKeyFingerprintSha256).toBe(f.args.trust.dayReviewerFingerprintSha256);
  const again=buildP6PostDayAppend({...args,currentDay:f.current(next.privateIndexBytes,"2027-02-10T11:30:45.000Z",next.privateWire,b.privatePacketBytes)});
  expect(again.status).toBe("POST_PHYSICAL_REQUEST_ALREADY_INDEXED_NO_REPLAY");
  expect(()=>buildP6PostDayAppend({...args,receipt:{...receipt,privateBytes:b.privatePacketBytes}})).toThrow("NO_INDEPENDENT_POST_PACKET_READBACK");
 });
 it("refuses unapproved keys and insufficient retention before any publication",()=>{
  const f=signedFixture();
  expect(()=>buildP6DelegatedNativePostPacket({...f.args,authority:{...f.args.authority,postReviewerKey:f.day.privateKey}})).toThrow("DELEGATION_RIGHTS_BUDGET_KEY_OR_SCOPE_DRIFT");
  expect(buildP6DelegatedNativePostPacket({...f.args,sourceQueryRetentionNotAfterUtc:"2027-02-10T12:40:00.000Z"}).status)
   .toBe("POST_RETENTION_OR_EXISTING_ROUTE_WINDOW_CONFLICT");
 });

});


describe("T24-only native POST selection",()=>{
 it("preserves native peer when a separately authenticated conditional T24 registry exists",()=>{
  const f=fixture(),src=f.index.privateParsedIndex.entries[0],scope={...deriveP6CommittedNativeQueryScope(f.receipt,
   selectP6CommittedNativeSourceQuery(f.index,f.selector,f.trust),f.selector,f.trust,f.policy),horizon:"T-24h"};
  const common={manifestSha256:f.trust.manifestSha256,runDayIndex:1,sourceRegistryPath:src.filePath,sourceRegistrySha256:src.fileSha256};
  const entry={queryDigestSha256:f.selector.queryDigestSha256,selectedTNativeUtc:"2027-02-10T11:20:00.000Z",cutoffUtc:"2027-02-09T11:20:00.000Z"};
  const conditionalT24Scope={protocolSha256:H("3"),externalContentUseReviewSha256:H("4")};
  const native={...common,schema:"v39.phase6.native-t24-private-registry.v1",entries:[{...entry,flightInstanceId:"leg:test:synthetic_t24"}]};
  const conditional={...common,schema:"v39.phase6.conditional-t24-private-registry.v1",conditionalT24Scope,
   sourceExpiresAtUtc:"2027-02-10T10:00:00.000Z",entries:[{...entry,flightInstanceId:"leg:g5a:"+H("5")}]};
  function run(regs:any[],scopeDrift=false){
   const list=regs.map(reg=>{const registryBytes=Buffer.from(JSON.stringify(reg));return {reg,registryBytes,review:{registrySha256:h(registryBytes),
    ...(reg.conditionalT24Scope?{conditionalT24Scope:scopeDrift?{...conditionalT24Scope,protocolSha256:H("6")}:conditionalT24Scope}:{})}};});
   const set:any={status:"CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO",runDayIndex:1,providerCalls:0,databaseWrites:0,phase6PaidGo:false,registryCount:list.length};
   Object.defineProperties(set,{privateIndex:{value:f.index},privateRegistries:{value:list}});
   return selectP6PostNativePreCandidatePage({index:f.index,selector:f.selector,trust:f.trust,sourceScope:scope,t24Current:set});
  }
  const page=run([conditional,native]);expect(page.conditionalCandidatesExcludedFromNativeCount).toBe(1);
  expect(page.privateCandidates.map((c:any)=>c.flightInstanceId)).toEqual(["leg:test:synthetic_t24"]);
  expect(run([conditional]).privateCandidates).toHaveLength(0);
  expect(()=>run([conditional,native],true)).toThrow("T24_REGISTRY_TIER_DRIFT");
  expect(()=>run([{...native,entries:conditional.entries}])).toThrow("T24_REGISTRY_TIER_DRIFT");
  expect(()=>run([{...conditional,entries:native.entries}])).toThrow("T24_REGISTRY_TIER_DRIFT");
  expect(()=>run([conditional,conditional])).toThrow("DUPLICATE_CONDITIONAL_T24_CANDIDATE");
 });

 it("uses verified current T24 registry candidate metadata without inventing actual PRE",()=>{
  const f=fixture(),src=f.index.privateParsedIndex.entries[0],scope={...deriveP6CommittedNativeQueryScope(f.receipt,
   selectP6CommittedNativeSourceQuery(f.index,f.selector,f.trust),f.selector,f.trust,f.policy),horizon:"T-24h"};
  const reg={schema:"v39.phase6.native-t24-private-registry.v1",manifestSha256:f.trust.manifestSha256,runDayIndex:1,
   sourceRegistryPath:src.filePath,sourceRegistrySha256:src.fileSha256,entries:[{flightInstanceId:"leg:test:synthetic_t24",
   queryDigestSha256:f.selector.queryDigestSha256,selectedTNativeUtc:"2027-02-10T11:20:00.000Z",cutoffUtc:"2027-02-09T11:20:00.000Z"}]};
  const registryBytes=Buffer.from(JSON.stringify(reg)),set:any={status:"CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO",runDayIndex:1,
   providerCalls:0,databaseWrites:0,phase6PaidGo:false,registryCount:1};
  Object.defineProperties(set,{privateIndex:{value:f.index},privateRegistries:{value:[{reg,review:{registrySha256:h(registryBytes)},registryBytes}]}});
  const a={index:f.index,selector:f.selector,trust:f.trust,sourceScope:scope,t24Current:set};
  expect(selectP6PostNativePreCandidatePage(a).privateCandidates).toMatchObject([{flightInstanceId:"leg:test:synthetic_t24"}]);
  expect(()=>selectP6PostNativePreCandidatePage({...a,t24Current:null})).toThrow("NO_CURRENT_AUTHENTICATED_T24_REGISTRY");
  reg.entries[0].cutoffUtc="2027-02-09T11:21:00.000Z";
  expect(()=>selectP6PostNativePreCandidatePage(a)).toThrow("T24_REGISTRY_SCOPE_DRIFT");
 });
});
describe("bounded actual PRE metadata scheduler",()=>{
 const at="2027-02-10T11:30:00.000Z",policy={followupAfterPartitionEndSeconds:1800,dispatchWindowSeconds:1200};
 const hint=(i:number,horizon="T-6h",icao="WSSS")=>({queryDigestSha256:h(String(i)),horizon,airportIcao:icao,runDayIndex:1,
  fromUtc:"2027-02-10T11:00:00.000Z",toUtc:"2027-02-10T12:00:00.000Z",committedPreHintCount:10});
 it("one physical window with actual fallback from recent PRE horizons and an earlier T24",async()=>{
  const scan=chooseP6NativePostWindowHints([hint(1,"T-24h"),hint(2,"T-6h"),hint(3,"T-90m")],[],policy,at);
  expect(scan.dueWindowCount).toBe(1);expect(scan.privateWindows[0].hints[0].horizon).toBe("T-90m");
  let calls=0;
  const result=await executeP6PostProducerTick(scan,async()=>{calls++;return {status:calls===1?"NO_ACTUAL_RETAINED_BOUND_PRE_FOR_POST":"NATIVE_POST_PACKET_AND_DAY_APPEND_VERIFIED_NO_GO",providerCalls:0,phase6PaidGo:false,existingPacketRecoveredWithoutReinsert:true};});
  expect(result).toMatchObject({attemptedWindows:1,attemptedQueries:2,verified:1,recovered:1,providerCalls:0,phase6PaidGo:false});
  expect(chooseP6NativePostWindowHints([hint(1)], [hint(3)],policy,at).dueWindowCount).toBe(0);
  expect(JSON.stringify(scan)).not.toContain("WSSS");
 });
 it("unknown writer error aborts tick with no automatic retry, STOP gate requires approval before DB",async()=>{
  const scan=chooseP6NativePostWindowHints([hint(1),hint(2,"T-90m")],[],policy,at);let calls=0;
  await expect(executeP6PostProducerTick(scan,async()=>{calls++;throw Error("UNKNOWN_COMMIT");})).rejects.toThrow("UNKNOWN_COMMIT");
  expect(calls).toBe(1);
  expect(()=>admitP6NativePostProducer({})).toThrow("SEPARATE_NONPAID_PRODUCER_APPROVAL_REQUIRED");
 });
 it("reads one bounded real-role-shaped metadata query, rejects unlisted digests, never writes",async()=>{
  const f=fixture(),queryDigests=[h("1")],calls:string[]=[];
  const row={query_digest:queryDigests[0],horizon:"T-24h",airport_icao:"WSSS",service_window_start_utc:"2027-02-10T11:00:00.000Z",
   service_window_end_utc:"2027-02-10T12:00:00.000Z",n:4};
  const pool={connect:async()=>({query:async(sql:string,args:any[])=>{
   calls.push(sql);
   if(sql.startsWith("SELECT current_user"))return {rowCount:1,rows:[{role:"phase5_fids_source_prod_20261107",login:"phase5_p5_source_login_20261108",
    db:"neondb",ro:"on",version:160016,replica:false,now:at}]};
   if(sql.startsWith("SELECT q.query_digest")){expect(sql).toContain("s.flight_instance_id NOT LIKE 'leg:g5a:%'");expect(args).toContain(queryDigests);return {rowCount:1,rows:[row]};}
   return {rowCount:0,rows:[]};},release:()=>calls.push("RELEASE")})};
  const args={sourcePool:pool,trust:f.trust,runDayIndex:1,queryDigests,frameSha256:H("a")};
  expect(await readP6PostSourceQueryHints(args)).toMatchObject({hintCount:1,providerCalls:0,databaseWrites:0});
  expect(calls).toContain("ROLLBACK");row.query_digest=h("2");
  await expect(readP6PostSourceQueryHints(args)).rejects.toThrow("POST_HINT_OUTSIDE_SIGNED_DAY");
 });
});

describe("nonpaid POST producer explicit handoff",()=>{
 it("admits only its own trigger and never treats it as paid POST dispatch approval",()=>{
  const scheduled={GITHUB_EVENT_NAME:"schedule"};
  const dispatched={GITHUB_EVENT_NAME:"workflow_dispatch",P6_NATIVE_POST_PRODUCER_CONFIRM:"PUBLISH_CURRENT_SIGNED_POST_WINDOWS_NO_PROVIDER"};
  expect(isP6NativePostProducerTrigger(scheduled)).toBe(true);
  expect(isP6NativePostProducerTrigger(dispatched)).toBe(true);
  for(const delta of [{P6_NATIVE_POST_PRODUCER_CONFIRM:"RUN_CURRENT_SIGNED_POST_PARENT"},
   {P6_NATIVE_POST_PRODUCER_CONFIRM:"RUN_CURRENT_SIGNED_SOURCE_PARENT"},{P6_NATIVE_POST_PRODUCER_CONFIRM:""},
   {GITHUB_EVENT_NAME:"schedule"},{GITHUB_EVENT_NAME:"pull_request"}])
   expect(isP6NativePostProducerTrigger({...dispatched,...delta})).toBe(false);
  expect(()=>admitP6NativePostProducer(dispatched)).toThrow("SEPARATE_NONPAID_PRODUCER_APPROVAL_REQUIRED");
  const released={...dispatched,GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
   GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"12345",GITHUB_SHA:"a".repeat(40),V39_P5_POST_APPROVED_CODE_SHA:"a".repeat(40),
   P6_NATIVE_POST_PRODUCER_ENABLED:"1",P6_NATIVE_POST_PRODUCER_APPROVED:"1",ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
   P6_PRIVATE_POST_OUTCOME_TAIL_HOURS:"48",V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
   V39_P5_SEVEN_REST_BUDGET_SIGNED:"1",V39_P5_POST_OWNER_APPROVED:"1",V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED:"1"};
  // Both a valid trigger and all original flags are necessary, never sufficient:
  // real signed trust/policy/role material is still required.
  expect(()=>admitP6NativePostProducer(released)).toThrow();
  for(const delta of [{P6_NATIVE_POST_PRODUCER_APPROVED:"0"},{V39_PHASE6_PROCESS_ARMED:"1"},{V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {P6_NATIVE_POST_PRODUCER_ENABLED:"0"},{GITHUB_TOKEN:"forbidden"},{AERODATABOX_API_KEY:"forbidden"},
   {P5_POST_AUTO_DISPATCH_ENABLED:"true"}])
   expect(()=>admitP6NativePostProducer({...released,...delta})).toThrow("SEPARATE_NONPAID_PRODUCER_APPROVAL_REQUIRED");
 });
});

import {P5_FUTURE_POST_ACTUAL_PRE_SQL,P5_FUTURE_POST_ACTUAL_PRE_BATCH_SQL} from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";
it("native single and batched POST lineage SQL exclude conditional service namespace",()=>{
 for(const sql of [P5_FUTURE_POST_ACTUAL_PRE_SQL,P5_FUTURE_POST_ACTUAL_PRE_BATCH_SQL])expect(sql).toContain("s.flight_instance_id NOT LIKE 'leg:g5a:%'");
});

import {auditP5ConditionalPostActualT6Batch,P5_FUTURE_CONDITIONAL_POST_ACTUAL_T6_SQL} from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";
describe("separate conditional actual T6 metadata read preserves frozen reference",()=>{
 const at=(hm:string)=>"2027-02-10T"+hm+":00.000Z";
 const id="leg:g5a:"+H("4"),T=at("11:20");
 const scope={manifestSha256:H("a"),runDayIndex:5,airportIcao:"WSSS",reviewedFrameSha256:H("b"),
  queryDigestSha256:H("c"),rightsSha256:H("d"),protocolSha256:H("e"),releaseSha256:H("f"),providerContractSha256:H("1"),
  slot:"HUB",serviceWindowStartUtc:at("11:00"),serviceWindowEndUtc:at("12:00"),cohortStartUtc:at("11:00"),
  candidates:[{flightInstanceId:id,expectedSelectedTNativeUtc:T,expectedPacketSha256:H("2"),boundSourceQueryDigests:[H("c")]}]};
 const row={flight_instance_id:id,snapshot_id:"1001",horizon:"T-6h",query_digest:H("c"),created_at:at("05:19"),
  prediction_cutoff_utc:at("05:20"),selected_t_milestone_utc:T,fids_response_hash:H("3"),original_available_at:at("05:10"),
  population_query_id:"12345678-1234-4123-8123-123456789abc",source_expires_at_utc:"2027-02-11T04:10:00.000Z",
  binding_response_hash:H("3"),member_available_at:at("05:11"),reported_departure_utc:at("11:35"),
  config_hash:H("7"),selected_t_version:"gate-out:reviewed-ci"};
 function fixture(rows:any[]=[row],clock=at("11:00"),rollbackFails=false){
  const calls:string[]=[],released:boolean[]=[];
  const client={query:async(sql:string,args?:any[])=>{
   calls.push(sql);
   if(sql.startsWith("SELECT current_user"))return {rowCount:1,rows:[{role:"phase5_fids_source_prod_20261107",login:"phase5_p5_source_login_20261108",db:"neondb",ro:"on",version:160000,replica:false,now:clock}]};
   if(sql===P5_FUTURE_CONDITIONAL_POST_ACTUAL_T6_SQL){expect(args).toEqual([scope.manifestSha256,5,"WSSS",[id],scope.reviewedFrameSha256,scope.queryDigestSha256,scope.rightsSha256,scope.protocolSha256,scope.releaseSha256,scope.providerContractSha256,"HUB",scope.serviceWindowStartUtc,scope.serviceWindowEndUtc,scope.cohortStartUtc,3]);return {rows,rowCount:rows.length};}
   if(sql==="SELECT clock_timestamp() AS now")return {rowCount:1,rows:[{now:clock}]};
   if(sql==="ROLLBACK"&&rollbackFails)throw Error("ROLLBACK_UNCERTAIN");
   return {rowCount:null,rows:[]};
  },release:(discard:boolean)=>released.push(discard)};
  return {pool:{connect:async()=>client} as any,calls,released};
 }
 it("reads actual same-query T6 metadata with retimed schedule, never certifies witness, Packet B or outcome",async()=>{
  const f=fixture(),out=await auditP5ConditionalPostActualT6Batch(f.pool,scope);
  expect(out).toMatchObject({status:"ACTUAL_CONDITIONAL_T6_POST_CANDIDATE_BATCH_NO_GO",eligibleCount:1,independentT24WitnessVerified:false,packetBAnchorVerified:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false});
  expect(out.privateDecisions[0]).toMatchObject({status:"ACTUAL_RETAINED_CONDITIONAL_T6_FOR_POST_REVIEW",selectedScheduledDepartureUtc:T,reportedScheduledDepartureUtc:at("11:35"),predictionCutoffUtc:at("05:20"),assessmentWatermarkUtc:at("13:20")});
  expect(JSON.stringify(out)).not.toContain(id);expect(JSON.stringify(out)).not.toContain(at("11:35"));
  expect(f.released).toEqual([false]);expect(f.calls.at(-1)).toBe("ROLLBACK");
  expect(P5_FUTURE_CONDITIONAL_POST_ACTUAL_T6_SQL).toContain("g5a_conditional_operator_composite_no_native_id");
  expect(P5_FUTURE_CONDITIONAL_POST_ACTUAL_T6_SQL).toContain("protocolSha256}'=$8");
  expect(P5_FUTURE_POST_ACTUAL_PRE_SQL).toContain("NOT LIKE 'leg:g5a:%'");
 });
 it("censors missing, duplicate, late, wrong source, expired-at-watermark and changed frozen T",async()=>{
  for(const rows of [[],[row,row],[{...row,created_at:at("05:21")}],[{...row,query_digest:H("9")}],
   [{...row,source_expires_at_utc:at("13:20")}],[{...row,selected_t_milestone_utc:at("11:35")}],
   [{...row,reported_departure_utc:at("12:00")}],[{...row,member_available_at:at("05:20")}],
   [{...row,created_at:at("05:20")}],[{...row,config_hash:"bad"}],[{...row,selected_t_version:"bad"}]])
   expect((await auditP5ConditionalPostActualT6Batch(fixture(rows).pool,scope)).eligibleCount).toBe(0);
  expect((await auditP5ConditionalPostActualT6Batch(fixture([row],at("13:20")).pool,scope)).eligibleCount).toBe(0);
 });
 it("refuses cross-flight rows, missing exact scope and uncertain rollback",async()=>{
  const f=fixture([{...row,flight_instance_id:"leg:g5a:"+H("5")}]);
  await expect(auditP5ConditionalPostActualT6Batch(f.pool,scope)).rejects.toThrow("CONDITIONAL_POST_T6_CROSS_FLIGHT");
  const bad=fixture();await expect(auditP5ConditionalPostActualT6Batch(bad.pool,{...scope,protocolSha256:"bad"})).rejects.toThrow("CONDITIONAL_POST_T6_SCOPE");expect(bad.calls).toHaveLength(0);
  const unknown=fixture([row],at("11:00"),true);await expect(auditP5ConditionalPostActualT6Batch(unknown.pool,scope)).rejects.toThrow("ROLLBACK_UNCERTAIN");expect(unknown.released).toEqual([true]);
 });
});
