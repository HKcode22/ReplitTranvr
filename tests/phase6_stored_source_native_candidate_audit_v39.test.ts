import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {selectP6CommittedNativeSourceQuery,deriveP6CommittedNativeQueryScope,auditP6StoredCommittedNativeSource,selectP6PendingNativeLaterReview,readP6PendingNativeLaterReview}
 from "../server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs";
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
describe("signed committed SOURCE candidate handoff",()=>{
 it("uses exact signed query after source dispatch window, not a due-source dispatch route",()=>{
  const f=fixture(),selected=selectP6CommittedNativeSourceQuery(f.index,f.selector,f.trust);
  const s=deriveP6CommittedNativeQueryScope(f.receipt,selected,f.selector,f.trust,f.policy);
  expect(s.airportIcao).toBe("WSSS");expect(s.horizon).toBe("T-6h");
  expect(s.expectedServiceWindowEndUtc).toBe("2027-02-10T12:00:00.000Z");
  expect("expectedSourceGithubRunId" in s).toBe(false);
 });
 it("rejects cross-study, absent digest, tampered packet or unapproved policy",()=>{
  const f=fixture();
  expect(()=>selectP6CommittedNativeSourceQuery(f.index,{...f.selector,queryDigestSha256:H("9")},f.trust)).toThrow("SOURCE_QUERY_NOT_UNIQUE");
  expect(()=>selectP6CommittedNativeSourceQuery(f.index,f.selector,{...f.trust,manifestSha256:H("9")})).toThrow("UNAUTHENTICATED");
  const selected=selectP6CommittedNativeSourceQuery(f.index,f.selector,f.trust);
  expect(()=>deriveP6CommittedNativeQueryScope(f.receipt,selected,f.selector,f.trust,{...f.policy,providerContractSha256:H("9")})).toThrow("CONTRACT_DRIFT");
  f.receipt.privateBytes[0]=0;
  expect(()=>deriveP6CommittedNativeQueryScope(f.receipt,selected,f.selector,f.trust,f.policy)).toThrow("UNVERIFIED_SOURCE_QUERY_RECEIPT");
 });
 it("unapproved scope stops before any SQL",async()=>{
  const f=fixture();let calls=0;
  await expect(auditP6StoredCommittedNativeSource({readerClient:{query:async()=>{calls++;throw Error("NO")}},
   sourcePool:{},trust:f.trust,selector:f.selector,policy:f.policy})).rejects.toThrow("NO_EXPLICIT");
  expect(calls).toBe(0);
 });
});

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
  candidates,providerCalls:0,databaseWrites:0,signedPrePacketsCreated:0,phase6PaidGoGranted:false};
 const build=(x:any)=>{const bytes=Buffer.from(JSON.stringify(x));const a:any={
  status:"ACTUAL_COMMITTED_SOURCE_CANDIDATES_AWAIT_INDEPENDENT_PRE_REVIEW",runDayIndex:1,horizon:scope.horizon,
  candidateAuditSha256:h(bytes),observedMemberCount:4,candidateCount:4,censoredCount:0,actualDbClockUtc:x.actualDbClockUtc,
  providerCalls:0,databaseWrites:0,signedPrePacketsIssued:0,phase6PaidGo:false};
  Object.defineProperties(a,{privateAuditBytes:{value:bytes},privateSourceScope:{value:scope},
   privateSourceRegistrySha256:{value:old.fileSha256}});return a;};
 return {a:build(audit),audit,build,index,selector,trust:f.trust};
}
describe("overlapping native source refresh intake preserves existing frozen horizons",()=>{
 it("keeps only prospective new candidates while preserving changed-T and late/deferred counts and original bytes",()=>{
  const f=pendingFixture(),x=selectP6PendingNativeLaterReview(f.a,f.index,f.selector,f.trust);
  expect(x).toMatchObject({originalEligibleCount:4,alreadyIndexed:1,changedNativeT:1,tooLate:1,
   notYetWithinShardWindow:1,pendingCount:1,phase6PaidGo:false,signedPrePacketsIssued:0});
  expect(x.privatePendingCandidates.map((c:any)=>c.flightInstanceId)).toEqual(["flight_new"]);
  expect(h(x.privateOriginalAuditBytes)).toBe(f.a.candidateAuditSha256);
  expect(JSON.stringify(x)).not.toContain("flight_new");
 });
 it("rejects invalid native cutoff and tampered source audit",()=>{
  const f=pendingFixture();const bad={...f.audit,candidates:f.audit.candidates.map((c,i)=>i===1?{...c,ownCutoffUtc:"2027-02-10T05:06:00.000Z"}:c)};
  expect(()=>selectP6PendingNativeLaterReview(f.build(bad),f.index,f.selector,f.trust)).toThrow("INVALID_CANDIDATE");
  f.a.privateAuditBytes[0]=0;
  expect(()=>selectP6PendingNativeLaterReview(f.a,f.index,f.selector,f.trust)).toThrow("UNVERIFIED_OR_WRONG_HORIZON");
 });
 it("does not plan from a stale readback or unapproved runtime",async()=>{
  const f=pendingFixture();f.index.redactedSummary.observedDbClockUtc="2027-02-10T04:43:00.000Z";
  expect(()=>selectP6PendingNativeLaterReview(f.a,f.index,f.selector,f.trust)).toThrow("AUDIT_OR_CLOCK_DRIFT");
  let calls=0;
  await expect(readP6PendingNativeLaterReview({readerClient:{query:async()=>{calls++;}},trust:f.trust,
    a:f.a,selector:f.selector,policy:{}})).rejects.toThrow("NO_EXPLICIT");
  expect(calls).toBe(0);
 });
});
