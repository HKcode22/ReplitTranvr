import {createHash} from "node:crypto";
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
});
