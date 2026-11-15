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

import {selectP6PostNativePreCandidatePage,readP6ActualNativePostPreCandidatePage,proposeP6NativePostPhysicalWindow}
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
 it("refuses unapproved runtime before a restricted SQL read",async()=>{
  const f=pendingFixture();let calls=0;
  await expect(readP6ActualNativePostPreCandidatePage({
   readerClient:{query:async()=>{calls++;throw Error("NO")}},sourcePool:{},
   trust:f.trust,selector:f.selector,policy:{}})).rejects.toThrow("NO_EXACT_NONPAID_SCOPE");
  expect(calls).toBe(0);
 });
});


import {buildP6DelegatedNativePostPacket,buildP6PostDayAppend,chooseP6NativePostWindowHints,readP6PostSourceQueryHints}
 from "../server/lib/disruption/phase6NativePostSignedPublication_v39.mjs";
import {executeP6PostProducerTick,admitP6NativePostProducer} from "../scripts/v39_phase6_native_post_producer_v39.mjs";
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
   if(sql.startsWith("SELECT q.query_digest")){expect(args).toContain(queryDigests);return {rowCount:1,rows:[row]};}
   return {rowCount:0,rows:[]};},release:()=>calls.push("RELEASE")})};
  const args={sourcePool:pool,trust:f.trust,runDayIndex:1,queryDigests,frameSha256:H("a")};
  expect(await readP6PostSourceQueryHints(args)).toMatchObject({hintCount:1,providerCalls:0,databaseWrites:0});
  expect(calls).toContain("ROLLBACK");row.query_digest=h("2");
  await expect(readP6PostSourceQueryHints(args)).rejects.toThrow("POST_HINT_OUTSIDE_SIGNED_DAY");
 });
});
