import {createHash,generateKeyPairSync,createPublicKey} from "node:crypto";
import {describe,it,expect} from "vitest";
import {selectP6CommittedNativeSourceQuery,deriveP6CommittedNativeQueryScope,auditP6StoredCommittedNativeSource,selectP6PendingNativeLaterReview,readP6PendingNativeLaterReview,buildP6PostcommitUnsignedPreReview,completeP6PostcommitReviewedPreBatch,signP6DelegatedNativeLaterReviewPage}
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


describe("existing unsigned review builder connected to actual postcommit scope",()=>{
 it("keeps full audit and dossier, forwards only new timely later entries, and emits redacted counts",()=>{
  const f=pendingFixture(),p=selectP6PendingNativeLaterReview(f.a,f.index,f.selector,f.trust);
  const x=buildP6PostcommitUnsignedPreReview(f.a,f.trust,p);
  expect(x).toMatchObject({originalCandidateCount:4,reviewEntryCount:1,independentReviewStillRequired:true,
   signedPrePacketsIssued:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false});
  expect(x.privateOriginalDossier.entries).toHaveLength(4);
  expect(x.privateOriginalDossier.sourceAuditSha256).toBe(f.a.candidateAuditSha256);
  expect(x.privateReviewEntries.map((e:any)=>e.source.flightInstanceId)).toEqual(["flight_new"]);
  expect(JSON.stringify(x)).not.toMatch(/flight_new|flight_existing|privateOriginalDossier/);
 });
 it("refuses missing selection, cross-study trust and altered original private bytes",()=>{
  const f=pendingFixture(),p=selectP6PendingNativeLaterReview(f.a,f.index,f.selector,f.trust);
  expect(()=>buildP6PostcommitUnsignedPreReview(f.a,f.trust)).toThrow("UNSIGNED_REVIEW_PENDING_SCOPE");
  expect(()=>buildP6PostcommitUnsignedPreReview(f.a,{...f.trust,rightsSha256:H("9")},p)).toThrow("UNSIGNED_REVIEW_UNAUTHENTICATED_SOURCE");
  p.privateOriginalAuditBytes[0]=0;
  expect(()=>buildP6PostcommitUnsignedPreReview(f.a,f.trust,p)).toThrow("UNSIGNED_REVIEW_PENDING_SCOPE");
 });
});


function completedBatchFixture(){
 const f=pendingFixture(),p=selectP6PendingNativeLaterReview(f.a,f.index,f.selector,f.trust);
 const handoff=buildP6PostcommitUnsignedPreReview(f.a,f.trust,p);
 const d=handoff.privateOriginalDossier,e=handoff.privateReviewEntries[0],s=e.source;
 const review={
  schema:"v39.phase5.external-native-later-pre-packet-review.v1",reviewedCodeSha:d.reviewedMainCodeSha,
  reviewedSourceDossierSha256:handoff.privateOriginalDossierSha256,reviewedSourceAuditSha256:d.sourceAuditSha256,
  reviewedSourceDayRegistrySha256:d.sourceDayRegistrySha256,reviewedFlightInstanceId:s.flightInstanceId,
  reviewedQueryDigestSha256:s.queryDigestSha256,reviewedSourcePopulationQueryId:s.expectedSourcePopulationQueryId,
  reviewedSourceOriginalResponseSha256:s.expectedSourceResponseSha256,reviewedSourceGithubRunId:s.expectedGithubSourceRunId,
  reviewedRunDayIndex:s.runDayIndex,reviewedHorizon:s.horizon,reviewedNativeScheduledTUtc:s.selectedTNativeUtc,
  reviewedOwnCutoffUtc:s.ownPreCutoffUtc,reviewedAtUtc:"2027-02-10T04:41:00.000Z",
  independentlyReviewedOperatingLegEvidenceSha256:H("7"),independentlyReviewedNativeTEvidenceSha256:H("7"),
  independentlyReviewedRunAndRetentionEvidenceSha256:H("5"),reviewedFrameSha256:H("8"),reviewedConfigSha256:H("9"),
  frozenBuilderSha256:H("a"),builderFrozenAtUtc:"2027-02-10T04:00:00.000Z",
  selectedTConfig:{milestone:"departure.scheduledTime.utc",version:"v1",artifactHash:H("d"),
   verifiedProviderNativeSchedule:true,semanticsEvidenceSha256:H("7")},
  maxPopulationStalenessSeconds:3600,externalNativeTPhysicalLegAndSourceUseReviewed:true,
  reviewedStandaloneLaterNoT24:{schema:"v39.phase5.standalone-later-asof-no-t24.v1",
   reviewedProtocolSha256:H("e"),reviewedOriginalResponseSha256:s.expectedSourceResponseSha256,
   reviewedNativeTSemanticsSha256:H("7"),missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",
   independentLaterAsOfAndMissingnessReviewAttested:true}};
 const scope={expectedDossierSha256:handoff.privateOriginalDossierSha256,
  expectedReviewedReleaseSha256:s.expectedReviewedReleaseSha256,expectedReviewedSourceRightsSha256:s.expectedReviewedSourceRightsSha256,
  proposedLaterRegistryFilePath:"data-collection/phase5/frozen/later_review_batch.json",shardIndex:2,
  observedDbClockUtc:"2027-02-10T04:42:00.000Z"};
 const item=(v:any=review)=>{const reviewBytes=Buffer.from(JSON.stringify(v));return{reviewBytes,
  proposedFilePath:"data-collection/phase5/frozen/pre_review_batch_packet.json",
  pins:{expectedDossierSha256:scope.expectedDossierSha256,expectedReviewArtifactSha256:h(reviewBytes),
   expectedApprovedMainCodeSha:d.reviewedMainCodeSha,expectedReviewedReleaseSha256:scope.expectedReviewedReleaseSha256,
   expectedReviewedSourceRightsSha256:scope.expectedReviewedSourceRightsSha256,
   expectedSourceDayRegistrySha256:d.sourceDayRegistrySha256,separatelyApprovedNoT24ProtocolSha256:H("e")}}};
 return {handoff,scope,review,item};
}
describe("existing native packet completion from selected independently reviewed candidates",()=>{
 it("constructs exact original v2 packet and later registry proposal with no provider calls or public flight data",()=>{
  const f=completedBatchFixture(),x=completeP6PostcommitReviewedPreBatch(f.handoff,f.scope,[f.item()]);
  expect(x).toMatchObject({selectedCount:1,suppliedReviewCount:1,unreviewedCount:0,lateReviewedCount:0,
   completedPacketCount:1,laterRegistryProposed:true,independentlySignedRegistry:false,phase6PaidGo:false});
  const plan=x.privateLaterRegistryPlan!;
  expect(plan.registryProposal.entries[0].expectedFlightInstanceId).toBe("flight_new");
  expect(plan.registryProposal.entries[0].expectedHorizon).toBe("T-6h");
  expect(plan.proposedPacketFiles[0].sha256).toBe(h(plan.proposedPacketFiles[0].bytes));
  expect(JSON.stringify(x)).not.toMatch(/flight_new|privateLaterRegistryPlan|packetBytes/);
 });
 it("tolerates no independent review or elapsed preparation time without issuing a packet",()=>{
  const f=completedBatchFixture();
  expect(completeP6PostcommitReviewedPreBatch(f.handoff,f.scope,[])).toMatchObject({unreviewedCount:1,completedPacketCount:0});
  expect(completeP6PostcommitReviewedPreBatch(f.handoff,{...f.scope,observedDbClockUtc:"2027-02-10T04:50:00.000Z"},[f.item()]))
   .toMatchObject({lateReviewedCount:1,completedPacketCount:0,laterRegistryProposed:false});
 });
 it("rejects review for excluded flight, duplicate review, age-policy drift, and modified SOURCE bytes",()=>{
  const f=completedBatchFixture();
  for(const bad of [{...f.review,reviewedFlightInstanceId:"flight_existing"},{...f.review,maxPopulationStalenessSeconds:7200},
    {...f.review,reviewedAtUtc:"2027-02-10T04:43:00.000Z"}])
   expect(()=>completeP6PostcommitReviewedPreBatch(f.handoff,f.scope,[f.item(bad)])).toThrow("REVIEW_BATCH_UNSELECTED_DUPLICATE_OR_POLICY_DRIFT");
  expect(()=>completeP6PostcommitReviewedPreBatch(f.handoff,f.scope,[f.item(),f.item()])).toThrow("REVIEW_BATCH_UNSELECTED_DUPLICATE_OR_POLICY_DRIFT");
  f.handoff.privateSourceRegistryBytes[0]=0;
  expect(()=>completeP6PostcommitReviewedPreBatch(f.handoff,f.scope,[f.item()])).toThrow("REVIEW_BATCH_SCOPE_OR_SOURCE_DRIFT");
 });
});


import {verifyP5ExternalEd25519ReviewOfLaterShard} from "../server/lib/disruption/phase5ExternalEd25519LaterShardReviewerVerify_v39";
function delegatedNativeFixture(){
 const f=completedBatchFixture(),d=f.handoff.privateOriginalDossier,s=f.handoff.privateReviewEntries[0].source;
 const key=generateKeyPairSync("ed25519"),fp=h(key.publicKey.export({type:"spki",format:"der"}));
 const trust={independentStudyTrustPinsApproved:true,reviewedCodeSha:d.reviewedMainCodeSha,manifestSha256:d.manifestSha256,
  releaseSha256:s.expectedReviewedReleaseSha256,rightsSha256:s.expectedReviewedSourceRightsSha256,calendarSha256:H("d"),
  dayReviewerFingerprintSha256:H("0"),queryReviewerFingerprintSha256:H("1")};
 const receipt=H("5"),observations=[{flightInstanceId:s.flightInstanceId,field:"reported_pre_departure_status",value:"Expected",
  source:"AERODATABOX_FIDS",sourceRecordId:s.expectedSourceResponseSha256,observedAtUtc:s.sourceMemberAvailableAtUtc,
  availableAtUtc:s.sourceMemberAvailableAtUtc,rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"}];
 const bundle={schema:"v39.phase5.e-signed-source-supplement.v1",flightInstanceId:s.flightInstanceId,
  populationQueryId:s.expectedSourcePopulationQueryId,originalResponseSha256:s.expectedSourceResponseSha256,
  observationsSha256:h(JSON.stringify(observations)),externalSourceAndContentsReviewReceiptSha256:receipt,
  fields:["reported_pre_departure_status"],observations};
 const policy={schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,
  approvedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,releaseSha256:trust.releaseSha256,
  rightsSha256:trust.rightsSha256,calendarSha256:trust.calendarSha256,providerContractSha256:s.expectedProviderContractSha256,
  nativePreFeatureReview:{approved:true,rightsSha256:trust.rightsSha256,externalContentUseReviewSha256:receipt},
  nativeLaterReview:{approved:true,laterReviewerFingerprintSha256:fp,frameSha256:H("8"),configSha256:H("9"),builderSha256:H("a"),
   builderFrozenAtUtc:"2027-02-10T04:00:00.000Z",runAndRetentionEvidenceSha256:H("5"),selectedTConfig:f.review.selectedTConfig,
   standaloneNoT24ProtocolSha256:H("e"),validFromUtc:"2027-02-10T00:00:00.000Z",validUntilUtc:"2027-02-11T00:00:00.000Z"}};
 const authorityFor=(p:any=policy)=>{const policyBytes=Buffer.from(JSON.stringify(p));return{trust,policyBytes,expectedPolicySha256:h(policyBytes),
  independentDelegatedNativeReviewApproved:true,noProviderCredentialsInReviewer:true,laterReviewerKey:key.privateKey};};
 const feature=(matched=true)=>Object.defineProperty({status:"EXACT_BOUND_ORIGINAL_NATIVE_FEATURE_BATCH_NOT_SIGNED",runDayIndex:d.runDayIndex,
  horizon:d.horizon,observedDbClockUtc:"2027-02-10T04:41:00.000Z",providerCalls:0,dbWrites:0,phase6PaidGo:false,matchedCount:matched?1:0},
  "privateDecisions",{value:[{flightInstanceId:s.flightInstanceId,status:matched?"MATCHED_NATIVE_ORIGINAL":"CENSORED_NATIVE_ORIGINAL_MEMBER",
   compiled:matched?{bundle,sourceBodyAndCanonicalEnvelopeIntegrityVerified:true,sameOriginalNativeOperatingLegBoundOnly:true,
    physicalGateOutCertified:false,sourceRightsIndependentlyCertifiedByThisFunction:false,providerCalls:0,databaseWrites:0}:undefined}]});
 const evidence=(status="T24_ABSENT_AFTER_CUTOFF_SEPARATE_MISSINGNESS_REVIEW_REQUIRED")=>Object.defineProperty({
  status:"ACTUAL_T24_EVIDENCE_PAGE_FOR_SEPARATE_LATER_REVIEW_NO_GO",runDayIndex:d.runDayIndex,expectedDossierSha256:f.scope.expectedDossierSha256,
  observedDbClockUtc:"2027-02-10T04:41:30.000Z",candidateCount:1,reviewedPacketsIssued:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
  "privateDecisions",{value:[{flightInstanceId:s.flightInstanceId,horizon:s.horizon,status,receiptSha256:null}]});
 const args={handoff:f.handoff,featureReview:feature(),evidence:evidence(),authority:authorityFor(),
  scope:{...f.scope,reviewValidUntilUtc:"2027-02-10T08:00:00.000Z",retentionNotAfterUtc:"2027-02-10T12:00:00.000Z"}};
 return{args,authorityFor,policy,feature,evidence,bundle};
}
describe("protected delegated native later review reuses exact original packet and shard signing",()=>{
 it("signs existing later registry only for the source-matched flight with approved genuine missing T24, including its feature bundle",()=>{
  const f=delegatedNativeFixture(),x=signP6DelegatedNativeLaterReviewPage(f.args);
  expect(x).toMatchObject({pageCandidateCount:1,reviewedCount:1,signatureIssued:true,humanReviewPerformed:false,
   providerCalls:0,databaseWrites:0,phase6PaidGo:false});
  const plan=x.privatePlan!,wire=x.privateWire!,pins=x.privateReviewerPins!;
  const pkt=JSON.parse(plan.proposedPacketFiles[0].bytes.toString("utf8"));
  expect(pkt.prePermit.reviewedSupplementalFeatureBundle).toEqual(f.bundle);
  expect(pkt.prePermit.reviewedStandaloneLaterNoT24.missingT24Class).toBe("HONEST_T24_UNOBSERVED_NOT_BACKFILLED");
  expect(verifyP5ExternalEd25519ReviewOfLaterShard(plan,wire,x.privateReviewerPublicKeyPem!,pins,f.args.scope.observedDbClockUtc))
   .toMatchObject({signatureCryptographicallyVerified:true,privatePacketOrRegistryFilesPublished:0,phase6PaidGoGranted:false});
  expect(JSON.stringify(x)).not.toMatch(/flight_new|observations|privatePlan|signatureBase64/);
 });
 it("does not sign an unresolved/invalid T24, missing source-native record, or unapproved no-T24 tier",()=>{
  const f=delegatedNativeFixture();
  for(const evidence of [f.evidence("T24_PRIVATE_CUSTODY_INVALID_OR_EXPIRED_UNRESOLVED"),f.evidence("T24_EXISTS_PRIVATE_RECEIPT_UNAVAILABLE")])
   expect(signP6DelegatedNativeLaterReviewPage({...f.args,evidence})).toMatchObject({signatureIssued:false,unresolvedT24:1});
  expect(signP6DelegatedNativeLaterReviewPage({...f.args,featureReview:f.feature(false)})).toMatchObject({signatureIssued:false,missingNativeOriginal:1});
  expect(signP6DelegatedNativeLaterReviewPage({...f.args,authority:f.authorityFor({...f.policy,
   nativeLaterReview:{...f.policy.nativeLaterReview,standaloneNoT24ProtocolSha256:null}})})).toMatchObject({signatureIssued:false,unresolvedT24:1});
 });
 it("rejects unpinned policy and mismatched separate key, and does not review late candidates",()=>{
  const f=delegatedNativeFixture();
  expect(()=>signP6DelegatedNativeLaterReviewPage({...f.args,authority:{...f.args.authority,expectedPolicySha256:H("9")}})).toThrow("NO_EXACT_POLICY");
  expect(()=>signP6DelegatedNativeLaterReviewPage({...f.args,authority:{...f.args.authority,
   laterReviewerKey:generateKeyPairSync("ed25519").privateKey}})).toThrow("WRONG_KEY");
  expect(signP6DelegatedNativeLaterReviewPage({...f.args,scope:{...f.args.scope,observedDbClockUtc:"2027-02-10T04:50:00.000Z"}}))
   .toMatchObject({signatureIssued:false,lateOrRetention:1});
 });
});


import {buildP6DelegatedT24PrivateRegistry,verifyP6T24PrivateRegistry} from "../server/lib/disruption/phase6PrivateT24RegistryTransport_v39.mjs";
function t24RegistryFixture(){
 const f=pendingFixture(),base=delegatedNativeFixture(),raw=f.a.privateAuditBytes,sourceScope={...f.a.privateSourceScope,horizon:"T-24h"};
 const id="leg:synthetic-t24-001",c={...f.audit.candidates[1],flightInstanceId:id,horizon:"T-24h",
  selectedTNativeUtc:"2027-02-11T05:05:00.000Z",ownCutoffUtc:"2027-02-10T05:05:00.000Z"};
 const audit={...JSON.parse(raw.toString()),observedMemberCount:1,candidateCount:1,candidates:[c],
  classifications:{...f.audit.classifications,ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED:1}};
 const ab=Buffer.from(JSON.stringify(audit)),a={...f.a,horizon:"T-24h",observedMemberCount:1,candidateCount:1,candidateAuditSha256:h(ab)};
 Object.defineProperties(a,{privateAuditBytes:{value:ab},privateSourceScope:{value:sourceScope},
  privateSourceRegistrySha256:{value:f.a.privateSourceRegistrySha256},privateSourceRegistryPath:{value:f.a.privateSourceRegistryPath},
  privateSourceRegistryBytes:{value:f.a.privateSourceRegistryBytes}});
 const handoff=buildP6PostcommitUnsignedPreReview(a,f.trust);
 const obs=base.bundle.observations.map(x=>({...x,flightInstanceId:id}));
 const bundle={...base.bundle,flightInstanceId:id,observations:obs,observationsSha256:h(JSON.stringify(obs))};
 const features=Object.defineProperty({status:"EXACT_BOUND_ORIGINAL_NATIVE_FEATURE_BATCH_NOT_SIGNED",runDayIndex:1,horizon:"T-24h",
  observedDbClockUtc:"2027-02-10T04:41:00.000Z",providerCalls:0,dbWrites:0,phase6PaidGo:false,matchedCount:1},"privateDecisions",
  {value:[{flightInstanceId:id,status:"MATCHED_NATIVE_ORIGINAL",compiled:{bundle,sourceBodyAndCanonicalEnvelopeIntegrityVerified:true,
   sameOriginalNativeOperatingLegBoundOnly:true,physicalGateOutCertified:false,sourceRightsIndependentlyCertifiedByThisFunction:false}}]});
 const v={...base.policy.nativeLaterReview,nativeT24ReviewApproved:true,independentT24WitnessProtocolReviewed:true,
  reviewedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107"};
 const authority=base.authorityFor({...base.policy,nativeLaterReview:v});
 const trust={...authority.trust,independentNativeT24RegistryApproved:true,expectedT24ReviewerFingerprintSha256:v.laterReviewerFingerprintSha256,
  expectedT24PolicySha256:authority.expectedPolicySha256,expectedFrameSha256:v.frameSha256,expectedConfigSha256:v.configSha256,
  expectedSelectedTVersion:v.selectedTConfig.milestone+":"+v.selectedTConfig.version+":"+v.selectedTConfig.artifactHash,
  maximumPrivateRetentionHours:12,policyValidFromUtc:v.validFromUtc,policyValidUntilUtc:v.validUntilUtc,
  t24ReviewerPublicKeyPem:createPublicKey(authority.laterReviewerKey).export({type:"spki",format:"pem"})};
 const current=Object.defineProperties({status:"CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO",runDayIndex:1,
  observedDbClockUtc:"2027-02-10T04:42:00.000Z",nextShardIndex:1},{privateIndex:{value:f.index},privateExistingFlightIds:{value:new Set()}});
 return{handoff,features,authority,trust,current:current as any,id};
}
describe("private native T24 registry",()=>{
 it("signs the existing T24 PRE and separate witness permit, never a fabricated receipt, and rejects tampering",()=>{
  const f=t24RegistryFixture(),p=buildP6DelegatedT24PrivateRegistry(f);
  expect(p).toMatchObject({status:"SIGNED_NATIVE_T24_REGISTRY_AWAIT_PRIVATE_PUBLICATION",packetCount:1,phase6PaidGo:false});
  const args={trust:f.trust,index:f.current.privateIndex,registryBytes:p.privateRegistryBytes,wire:p.privateWire,
   observedDbClockUtc:f.current.observedDbClockUtc,files:p.privateFiles};
  const verified=verifyP6T24PrivateRegistry(args);
  expect(verified.reg.entries[0].flightInstanceId).toBe(f.id);
  const packet=JSON.parse(p.privateFiles[0].bytes.toString());
  expect(packet.schema).toBe("v39.phase5.github-native-t24-pre-witness-reviewed.v1");
  expect(packet.prePermit.reviewedSupplementalFeatureBundle).toBeDefined();
  expect(packet.witnessReview).toBeDefined();
  expect(packet.prePermit.reviewedT24WitnessReceipt).toBeUndefined();
  expect(JSON.stringify(p)).not.toContain(f.id);
  expect(()=>verifyP6T24PrivateRegistry({...args,wire:{...p.privateWire,signatureBase64:Buffer.alloc(64).toString("base64")}})).toThrow("REGISTRY_SIGNATURE_INVALID");
  f.current.privateExistingFlightIds.add(f.id);
  expect(buildP6DelegatedT24PrivateRegistry(f)).toMatchObject({status:"NO_ELIGIBLE_NEW_NATIVE_T24_PACKET",candidateCount:0});
 });
});


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
