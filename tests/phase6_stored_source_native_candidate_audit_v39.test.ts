import {createHash,generateKeyPairSync,createPublicKey,sign} from "node:crypto";
import {describe,it,expect} from "vitest";
import {selectP6CommittedNativeSourceQuery,deriveP6CommittedNativeQueryScope,deriveP6ConditionalProofReadScope,readP6ConditionalProofScopeFromStoredSource,assertP6SameCommittedSourceAcrossRevisions,readP6CurrentCommittedSourceSnapshot,verifyP6ConditionalSourceInstructionProof,auditP6StoredCommittedNativeSource,selectP6PendingNativeLaterReview,readP6PendingNativeLaterReview,buildP6PostcommitUnsignedPreReview,completeP6PostcommitReviewedPreBatch,signP6DelegatedNativeLaterReviewPage}
 from "../server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs";
const h=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex"),H=(c:string)=>c.repeat(64);
function fixture(){
 const trust={independentStudyTrustPinsApproved:true,reviewedCodeSha:"a".repeat(40),
  manifestSha256:h("synthetic manifest"),rightsSha256:h("synthetic rights"),releaseSha256:H("c"),calendarSha256:H("d")};
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
 it("derives the prospective conditional scope only from exact verified SOURCE packet bytes",()=>{
  const f=fixture(),selected=selectP6CommittedNativeSourceQuery(f.index,f.selector,f.trust);
  const packet=JSON.parse(f.receipt.privateBytes.toString("utf8"));
  const plan=packet.plan;
  plan.acquisition.scheduledRequestUtc="2027-02-10T04:00:00.000Z";
  plan.localFrom="2027-02-10T19:00";plan.localTo="2027-02-10T20:00";
  const marker={reviewedConditionalServiceScope:true,protocolSha256:H("9"),effectiveUtc:"2027-02-09T00:00:00.000Z",cohortStartUtc:plan.day.scheduledStartUtc};
  const derive=(conditional:any)=>{
   const bytes=Buffer.from(JSON.stringify({...packet,plan:{...plan,conditionalService:conditional}}));
   const digest=h(bytes),receipt:any={redactedSummary:{...f.receipt.redactedSummary,contentSha256:digest}};
   Object.defineProperties(receipt,{privateBytes:{value:bytes},privateLogicalPath:{value:f.receipt.privateLogicalPath}});
   return deriveP6CommittedNativeQueryScope(receipt,{...selected,q:{...selected.q,expectedPacketSha256:digest}},f.selector,f.trust,f.policy);
  };
  expect(derive(marker).conditionalServiceScope).toMatchObject({...marker,localFrom:plan.localFrom,localTo:plan.localTo});
  expect(derive(undefined).conditionalServiceScope).toBeUndefined();
  for(const patch of [{effectiveUtc:"2027-02-10T05:00:00.000Z"},{cohortStartUtc:"2027-02-11T11:00:00.000Z"},{reviewedConditionalServiceScope:false},{protocolSha256:"bad"},{extra:true}])
   expect(()=>derive({...marker,...patch})).toThrow(/SIGNED_CONDITIONAL_SCOPE_DRIFT/);
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

import {deriveP6T24QueueTrust,chooseP6T24QueueRegistries,projectP6T24QueuePackets} from "../server/lib/disruption/phase6PrivateT24QueueRouting_v39.mjs";
describe("current private T24 registry routing into the existing queue",()=>{
 function fixture(){
  const f=t24RegistryFixture(),p=buildP6DelegatedT24PrivateRegistry(f),reg=JSON.parse(p.privateRegistryBytes.toString("utf8")),review=p.privateWire.review;
  const set=Object.defineProperty({status:"CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO",runDayIndex:1,
   observedDbClockUtc:f.current.observedDbClockUtc,registryCount:1,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
   "privateRegistries",{value:[{reg,review}]});
  const got=(at:string,files=p.privateFiles)=>Object.defineProperties({status:"EXACT_PRIVATE_NATIVE_T24_PACKETS_READONLY_NO_GO",runDayIndex:1,
   registrySha256:review.registrySha256,observedDbClockUtc:at,packetCount:1,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
   {privateRegistry:{value:reg},privateFiles:{value:files}});
  return {...f,p,set,got};
 }
 it("reuses exact singleton T24 worker roster at native cutoff, enrollment earlier than execution",()=>{
  const f=fixture();
  expect(chooseP6T24QueueRegistries([f.set],f.trust,"ENROLLMENT").selectors).toHaveLength(1);
  expect(chooseP6T24QueueRegistries([f.set],f.trust,"PRE_EXECUTION").selectors).toHaveLength(0);
  const x=projectP6T24QueuePackets(f.got("2027-02-10T04:42:00.000Z"),f.trust,"ENROLLMENT");
  expect(x).toHaveLength(1);expect(x[0].entry.permit.horizon).toBe("T-24h");
  expect(x[0].entry.witnessReview).toBeDefined();expect(x[0].rosterSha256).toBe(h(x[0].rosterBytes));
  expect(projectP6T24QueuePackets(f.got("2027-02-10T04:55:00.000Z"),f.trust,"PRE_EXECUTION")).toHaveLength(1);
  expect(projectP6T24QueuePackets(f.got("2027-02-10T05:05:00.000Z"),f.trust,"PRE_EXECUTION")).toHaveLength(0);
  expect(()=>projectP6T24QueuePackets(f.got("2027-02-10T04:55:00.000Z",[{...f.p.privateFiles[0],bytes:Buffer.from("bad")}]),f.trust,"PRE_EXECUTION")).toThrow("EXACT_PACKET_BYTES_DRIFT");
  expect(()=>chooseP6T24QueueRegistries([f.set,f.set],f.trust,"ENROLLMENT")).toThrow("DUPLICATE_DAY");
 });
 it("derives the same public-key-only trust from protected policy and rejects wrong key or hash",()=>{
  const f=fixture(),p=JSON.parse(f.authority.policyBytes.toString());
  p.frameSha256=p.nativeLaterReview.frameSha256;p.configSha256=p.nativeLaterReview.configSha256;
  p.nativeLaterReview.maximumPrivateRetentionHours=12;
  const b=Buffer.from(JSON.stringify(p)),a={trust:f.authority.trust,policyBytes:b,expectedPolicySha256:h(b),reviewerPublicKeyPem:f.trust.t24ReviewerPublicKeyPem};
  expect(deriveP6T24QueueTrust(a)).toMatchObject({expectedSelectedTVersion:f.trust.expectedSelectedTVersion,expectedT24ReviewerFingerprintSha256:f.trust.expectedT24ReviewerFingerprintSha256});
  expect(()=>deriveP6T24QueueTrust({...a,expectedPolicySha256:H("8")})).toThrow("UNPINNED_POLICY");
  expect(()=>deriveP6T24QueueTrust({...a,reviewerPublicKeyPem:generateKeyPairSync("ed25519").publicKey.export({type:"spki",format:"pem"})})).toThrow("WRONG_REVIEWER_KEY");
 });
});

describe("independent PRE proof publication boundary",()=>{
 it("previews both permit types without a publishable registry or signature",()=>{
  const later=delegatedNativeFixture();
  const p=signP6DelegatedNativeLaterReviewPage({...later.args,scope:{...later.args.scope,phase7ProofPreviewOnly:true}} as any) as any;
  expect(p).toMatchObject({phase7ProofPreviewOnly:true,signatureIssued:false});expect(p.privateCompletedPackets).toHaveLength(1);expect(p.privatePlan).toBeUndefined();expect(JSON.stringify(p)).not.toContain("flight_new");
  const f=t24RegistryFixture(),q=buildP6DelegatedT24PrivateRegistry({...f,phase7ProofScope:{phase7ProofPreviewOnly:true}} as any) as any;
  expect(q).toMatchObject({phase7ProofPreviewOnly:true,packetCount:0,proofRequestCount:1});expect(q.privateCompletedPackets).toHaveLength(1);expect(q.privateWire).toBeUndefined();expect(JSON.stringify(q)).not.toContain(f.id);
 });
 it("rejects a mixed preview and proof-required invocation",()=>{
  const f=delegatedNativeFixture();expect(()=>signP6DelegatedNativeLaterReviewPage({...f.args,scope:{...f.args.scope,phase7ProofPreviewOnly:true,phase7ProofRequired:true}} as any)).toThrow("PHASE7_MIXED_PROOF_MODE");
 });
});

import {resolveP7PublicationProofs} from "../server/lib/disruption/phase7IndependentPreProofPublication_v39.mjs";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import {sign as signProof} from "node:crypto";
describe("private publication with independently signed test proof wires",()=>{
 it("attaches the exact wire to both horizons and rejects missing or stale proof sets",async()=>{
  for(const horizon of ["T24","LATER"]){
   const f=horizon==="T24"?t24RegistryFixture():delegatedNativeFixture().args;
   const call=(scope:any)=>horizon==="T24"?buildP6DelegatedT24PrivateRegistry({...f,phase7ProofScope:scope} as any):signP6DelegatedNativeLaterReviewPage({...f,scope:{...(f as any).scope,...scope}} as any);
   const preview=call({phase7ProofPreviewOnly:true}) as any;
   const permit=preview.privateCompletedPackets[0].completed.packet.prePermit,digest=hashPhase7DurableCandidate(permit);
   const key=generateKeyPairSync("ed25519"),publicKey=key.publicKey.export({format:"pem",type:"spki"});
   // Synthetic proof transport only; this fixture certifies no actual source or field.
   const contract={sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:"2027-12-31T00:00:00.000Z"},profile={mappingExpiryHours:24},dispositions=[];
   const review={schema:"v39.phase7.prospective-pre-preservation-review.v1",manifestSha256:permit.manifestSha256,rightsSha256:permit.expectedReviewedSourceRightsSha256,contractSha256:hashPhase7DurableCandidate(contract),profileSha256:hashPhase7DurableCandidate(profile),dispositionsSha256:hashPhase7DurableCandidate(dispositions),mappingHours:24,researchExpiryUtc:contract.researchExpiryUtc,approvedForPreDurableStorage:true,boundedSameLegLinkApproved:true};
   const policy={contract,profile,dispositions,review,reviewSha256:hashPhase7DurableCandidate(review)};
   const env={P6_PHASE7_PRE_POLICY_BASE64:Buffer.from(JSON.stringify(policy)).toString("base64"),P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:policy.reviewSha256,P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:h(key.publicKey.export({format:"der",type:"spki"})),P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(publicKey).toString("base64"),V39_P5_MANIFEST_SHA256:permit.manifestSha256,V39_P5_RIGHTS_SHA256:permit.expectedReviewedSourceRightsSha256};
   const bytes=Buffer.from(JSON.stringify({schema:"v39.phase7.separate-pre-field-proof.v1",manifestSha256:permit.manifestSha256,rightsSha256:permit.expectedReviewedSourceRightsSha256,policySha256:policy.reviewSha256,permitSha256:digest,issuedAtUtc:"2027-02-10T04:42:00.000Z",validUntilUtc:"2027-02-10T05:04:00.000Z",fields:[]}));
   const wire={payloadBase64:bytes.toString("base64"),signatureBase64:signProof(null,bytes,key.privateKey).toString("base64")};
   const port={readExactPermitProofs:async()=>new Map([[digest,wire]])};
   const p=await resolveP7PublicationProofs({preview,env,port,readClock:async()=>"2027-02-10T04:43:00.000Z"});
   const signed=call(p) as any;
   const packet=horizon==="T24"?signed.privateFiles[0].bytes:signed.privatePlan.proposedPacketFiles[0].bytes;
   expect(JSON.parse(packet.toString()).phase7FieldProof).toEqual(wire);
   await expect(resolveP7PublicationProofs({preview,env,port:{readExactPermitProofs:async()=>new Map()},readClock:async()=>"2027-02-10T04:43:00.000Z"})).rejects.toThrow("EXACT_PROOF_SET_MISSING");
   await expect(resolveP7PublicationProofs({preview,env,port,readClock:async()=>"2027-02-10T05:04:00.000Z"})).rejects.toThrow("STALE_OR_LATE_PROOF");
  }
 });
});

describe("T028 independent conditional proof signed-source scope",()=>{
 it("binds verified query bytes, separate content purpose and permit; refuses native promotion, drift or missing approval",()=>{
  const f=fixture(),s=selectP6CommittedNativeSourceQuery(f.index,f.selector,f.trust);
  const p=JSON.parse(f.receipt.privateBytes.toString("utf8"));
  p.plan.acquisition.scheduledRequestUtc="2027-02-10T04:00:00.000Z";
  p.plan.localFrom="2027-02-10T19:00";p.plan.localTo="2027-02-10T20:00";
  p.plan.conditionalService={reviewedConditionalServiceScope:true,protocolSha256:H("9"),effectiveUtc:"2027-02-09T00:00:00.000Z",cohortStartUtc:p.plan.day.scheduledStartUtc};
  const bytes=Buffer.from(JSON.stringify(p)),digest=h(bytes),receipt:any={redactedSummary:{...f.receipt.redactedSummary,contentSha256:digest}};
  Object.defineProperties(receipt,{privateBytes:{value:bytes},privateLogicalPath:{value:f.receipt.privateLogicalPath}});
  const selected={...s,q:{...s.q,expectedPacketSha256:digest}};
  const policy={...f.policy,conditionalPreFeatureReview:{schema:"v39.phase5.conditional-pre-feature-review-policy.v1",approved:true,protocolSha256:H("9"),rightsSha256:f.trust.rightsSha256,externalContentUseReviewSha256:H("8")}};
  const permit={identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",requireProspectiveConditionalSourceMarker:true,externalConditionalScheduleSourceAndUseReviewed:true,reviewedProtocolAmendmentSha256:H("9"),
   manifestSha256:f.trust.manifestSha256,queryDigestSha256:f.selector.queryDigestSha256,runDayIndex:1,slot:"HUB",horizon:"T-6h",airportIcao:"WSSS",expectedReviewedSourceRightsSha256:f.trust.rightsSha256,expectedReviewedReleaseSha256:f.trust.releaseSha256,expectedProviderContractSha256:H("f"),expectedEarlyDrawSha256:H("1"),maxPopulationStalenessSeconds:3600,expectedGithubSourceRunId:"123456",expectedSourceResponseSha256:H("3"),expectedSourcePopulationQueryId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",reviewedSupplementalFeatureBundle:{externalSourceAndContentsReviewReceiptSha256:H("8")}};
  const run=(v:any=permit,pol:any=policy)=>deriveP6ConditionalProofReadScope(receipt,selected,f.selector,f.trust,pol,v);
  expect(run()).toMatchObject({protocolSha256:H("9"),externalContentUseReviewSha256:H("8"),minimumReviewLeadSeconds:900,expectedLocalFrom:p.plan.localFrom,source:{expectedSourceGithubRunId:"123456",plannedRequestUtc:p.plan.acquisition.scheduledRequestUtc}});
  for(const patch of [{identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG"},{externalNativeTPhysicalLegAndSourceUseReviewed:true},{queryDigestSha256:H("0")},{expectedEarlyDrawSha256:H("0")},{reviewedSupplementalFeatureBundle:{externalSourceAndContentsReviewReceiptSha256:H("0")}}])expect(()=>run({...permit,...patch})).toThrow("EXACT_CONDITIONAL_PROOF_SCOPE");
  expect(()=>run(permit,f.policy)).toThrow("EXACT_CONDITIONAL_PROOF_SCOPE");
  expect(()=>run(permit,{...policy,conditionalPreFeatureReview:{...policy.conditionalPreFeatureReview,extra:true}})).toThrow("EXACT_CONDITIONAL_PROOF_SCOPE");
 });
 it("missing separate scope stops before reading private storage",async()=>{
  const f=fixture();let calls=0;
  await expect(readP6ConditionalProofScopeFromStoredSource({readerClient:{query:async()=>{calls++;}},trust:f.trust,selector:f.selector,policy:f.policy,permit:{}})).rejects.toThrow("NO_EXPLICIT_CONDITIONAL_PROOF_SCOPE");
  expect(calls).toBe(0);
 });
});

describe("F038 conditional proof current signed SOURCE revision continuity",()=>{
 it("accepts an advanced append-only revision with exact unchanged SOURCE, rejects rollback and changed bytes",()=>{
  const f=fixture(),old=f.index.privateParsedIndex.entries[0],registry=f.index.getFrozen(old.filePath);
  const make=(change=false)=>{
   const bytes=change?Buffer.from(JSON.stringify({...JSON.parse(registry.toString()),entries:[{...JSON.parse(registry.toString()).entries[0],expectedPacketSha256:H("8")}]})):registry;
   const parsed={...f.index.privateParsedIndex,revision:2,previousIndexSha256:f.selector.indexSha256,entries:[{...old,fileSha256:h(bytes)}]};
   const raw=Buffer.from(JSON.stringify(parsed)),selector={...f.selector,indexRevision:2,indexSha256:h(raw)};
   const index:any={redactedSummary:{...f.index.redactedSummary,indexRevision:2,indexSha256:h(raw)}};
   Object.defineProperties(index,{privateParsedIndex:{value:parsed},privateCurrentIndexBytes:{value:raw},getFrozen:{value:()=>bytes}});
   return {index,selector};
  };
  const current=make(),changed=make(true);
  expect(assertP6SameCommittedSourceAcrossRevisions(f.index,current.index,f.selector,current.selector,f.trust).q.expectedPacketSha256).toBe(h(f.receipt.privateBytes));
  expect(()=>assertP6SameCommittedSourceAcrossRevisions(current.index,f.index,current.selector,f.selector,f.trust)).toThrow("REVISION_ROLLBACK");
  expect(()=>assertP6SameCommittedSourceAcrossRevisions(f.index,changed.index,f.selector,changed.selector,f.trust)).toThrow("ORIGINAL_SIGNED_QUERY_CHANGED");
  expect(()=>assertP6SameCommittedSourceAcrossRevisions(f.index,current.index,f.selector,{...current.selector,indexRevision:1},f.trust)).toThrow("REVISION_ROLLBACK");
 });
});

import {p6DayEpochReviewPreimage,P6_DAY_EPOCH_REVIEW_SCHEMA,P6_DAY_EPOCH_REVIEW_AUDIENCE} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {signedP6PrivateSourcePostReviewBytes,P6_SOURCE_POST_REVIEW_SCHEMA,P6_SOURCE_POST_REVIEW_AUDIENCE} from "../server/lib/disruption/phase6PrivateSourcePostReadOnce_v39.mjs";
describe("T033 exact signed SOURCE instruction transport (no raw or reader credentials)",()=>{
 function setup(){
  const f=fixture(),p=JSON.parse(f.receipt.privateBytes.toString());
  p.plan.acquisition.scheduledRequestUtc="2027-02-10T04:00:00.000Z";
  p.plan.localFrom="2027-02-10T19:00";p.plan.localTo="2027-02-10T20:00";
  p.plan.conditionalService={reviewedConditionalServiceScope:true,protocolSha256:H("9"),effectiveUtc:"2027-02-09T00:00:00.000Z",cohortStartUtc:p.plan.day.scheduledStartUtc};
  const bytes=Buffer.from(JSON.stringify(p)),old=f.index.privateParsedIndex.entries[0],path=f.receipt.privateLogicalPath;
  const reg=Buffer.from(JSON.stringify({schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",manifestSha256:f.trust.manifestSha256,runDayIndex:1,entries:[{filePath:path,expectedPacketSha256:h(bytes),expectedQueryDigestSha256:f.selector.queryDigestSha256}]}));
  const idx={...f.index.privateParsedIndex,previousIndexSha256:null,entries:[{...old,fileSha256:h(reg),publishedAtUtc:"2027-02-10T03:55:00.000Z",reviewEvidenceSha256:H("5"),sourceRegistryFilePath:null,sourceRegistrySha256:null}]};
  const raw=Buffer.from(JSON.stringify(idx)),selector={...f.selector,indexSha256:h(raw)};
  const dk=generateKeyPairSync("ed25519"),qk=generateKeyPairSync("ed25519"),fp=(k:any)=>h(k.publicKey.export({type:"spki",format:"der"}));
  const trust={...f.trust,dayReviewerFingerprintSha256:fp(dk),dayReviewerPublicKeyPem:dk.publicKey.export({type:"spki",format:"pem"}),
   queryReviewerFingerprintSha256:fp(qk),queryReviewerPublicKeyPem:qk.publicKey.export({type:"spki",format:"pem"})};
  const times={reviewedAtUtc:"2027-02-10T03:56:00.000Z",validUntilUtc:"2027-02-10T08:00:00.000Z",retentionNotAfterUtc:"2027-02-11T03:56:00.000Z"};
  const day={schema:P6_DAY_EPOCH_REVIEW_SCHEMA,audience:P6_DAY_EPOCH_REVIEW_AUDIENCE,runDayIndex:1,indexRevision:1,indexSha256:h(raw),previousIndexSha256:null,
   reviewedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,releaseSha256:trust.releaseSha256,rightsSha256:trust.rightsSha256,externalReviewEvidenceSha256:H("5"),...times,reviewerPublicKeyFingerprintSha256:fp(dk)};
  const query={schema:P6_SOURCE_POST_REVIEW_SCHEMA,audience:P6_SOURCE_POST_REVIEW_AUDIENCE,kind:"SOURCE_QUERY_PACKET",logicalPath:path,contentSha256:h(bytes),reviewedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,runDayIndex:1,shardIndex:1,externalReviewEvidenceSha256:H("6"),...times,reviewerPublicKeyFingerprintSha256:fp(qk)};
  const proof={schema:"v39.phase6.conditional-source-instruction-proof.v1",dayWire:{review:day,signatureBase64:sign(null,p6DayEpochReviewPreimage(day),dk.privateKey).toString("base64")},indexBase64:raw.toString("base64"),sourceRegistries:[{path:old.filePath,bytesBase64:reg.toString("base64")}],queryWire:{review:query,signatureBase64:sign(null,signedP6PrivateSourcePostReviewBytes(query),qk.privateKey).toString("base64")},queryBase64:bytes.toString("base64")};
  const policy={...f.policy,existingPaidDispatchApproved:false,noProviderCredentialsInAudit:true,conditionalPreFeatureReview:{schema:"v39.phase5.conditional-pre-feature-review-policy.v1",approved:true,protocolSha256:H("9"),rightsSha256:trust.rightsSha256,externalContentUseReviewSha256:H("8")}};
  const permit={identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",requireProspectiveConditionalSourceMarker:true,externalConditionalScheduleSourceAndUseReviewed:true,reviewedProtocolAmendmentSha256:H("9"),manifestSha256:trust.manifestSha256,queryDigestSha256:selector.queryDigestSha256,runDayIndex:1,slot:"HUB",horizon:"T-6h",airportIcao:"WSSS",expectedReviewedSourceRightsSha256:trust.rightsSha256,expectedReviewedReleaseSha256:trust.releaseSha256,expectedProviderContractSha256:H("f"),expectedEarlyDrawSha256:H("1"),maxPopulationStalenessSeconds:3600,expectedGithubSourceRunId:"123456",expectedSourceResponseSha256:H("3"),expectedSourcePopulationQueryId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",reviewedSupplementalFeatureBundle:{externalSourceAndContentsReviewReceiptSha256:H("8")}};
  return {proof,args:{trust,selector,policy,permit,observedDbClockUtc:"2027-02-10T04:40:00.000Z",expectedSourceRunId:"123456"}};
 }
 it("independently authenticates the exact day and SOURCE signatures, registry and query, at DB clock",()=>{
  const {proof,args}=setup();
  expect(verifyP6ConditionalSourceInstructionProof(proof,args)).toMatchObject({protocolSha256:H("9"),externalContentUseReviewSha256:H("8"),source:{expectedSourceGithubRunId:"123456",plannedRequestUtc:"2027-02-10T04:00:00.000Z"}});
 });
 it("refuses byte drift, omitted registry, bad signatures, wrong run and expired review",()=>{
  const {proof,args}=setup(),run=(v:any=proof,a:any=args)=>verifyP6ConditionalSourceInstructionProof(v,a);
  expect(()=>run({...proof,queryBase64:Buffer.from("tampered").toString("base64")})).toThrow("CONDITIONAL_INSTRUCTION_QUERY_HASH");
  expect(()=>run({...proof,indexBase64:Buffer.from("tampered").toString("base64")})).toThrow("CONDITIONAL_INSTRUCTION_INDEX_HASH");
  expect(()=>run({...proof,sourceRegistries:[]})).toThrow("CONDITIONAL_INSTRUCTION_PROOF_SCOPE");
  expect(()=>run({...proof,sourceRegistries:[{...proof.sourceRegistries[0],bytesBase64:Buffer.from("tampered").toString("base64")}]})).toThrow("CONDITIONAL_INSTRUCTION_REGISTRY_HASH");
  expect(()=>run({...proof,queryWire:{...proof.queryWire,signatureBase64:Buffer.alloc(64).toString("base64")}})).toThrow("SIGNATURE_BAD");
  expect(()=>run(proof,{...args,observedDbClockUtc:"2027-02-10T08:00:00.000Z"})).toThrow("CONDITIONAL_INSTRUCTION_PROOF_EXPIRED");
  expect(()=>run(proof,{...args,expectedSourceRunId:"654321"})).toThrow("CONDITIONAL_INSTRUCTION_PROOF_SCOPE");
  expect(()=>run(proof,{...args,permit:{...args.permit,externalNativeTPhysicalLegAndSourceUseReviewed:true}})).toThrow("EXACT_CONDITIONAL_PROOF_SCOPE");
 });
});

describe("T037 concurrent append while authenticating current SOURCE snapshot",()=>{
 const stale="HOLD_P6_DAY_EPOCH_FULL_REGISTRY_STALE_OR_MISSING_DAY_REVISION_FOR_PLANNING";
 function setup(){
  const f=fixture(),old=f.index.privateParsedIndex.entries[0],reg=f.index.getFrozen(old.filePath);
  const make=(revision:number,changed=false)=>{
   const b=changed?Buffer.from(JSON.stringify({...JSON.parse(reg.toString()),entries:[{...JSON.parse(reg.toString()).entries[0],expectedPacketSha256:H("8")}]})):reg;
   const parsed={...f.index.privateParsedIndex,revision,previousIndexSha256:f.selector.indexSha256,entries:[{...old,fileSha256:h(b)}]};
   const raw=Buffer.from(JSON.stringify(parsed)),selector={...f.selector,indexRevision:revision,indexSha256:h(raw)};
   const index:any={redactedSummary:{...f.index.redactedSummary,indexRevision:revision,indexSha256:h(raw)}};
   Object.defineProperties(index,{privateParsedIndex:{value:parsed},privateCurrentIndexBytes:{value:raw},getFrozen:{value:()=>b}});
   return {index,selector};
  };
  const second=make(2),third=make(3),changed=make(3,true);
  const state={originalReads:0,currentReads:0,planningHydrations:0};
  const run=(errors:string[],last=third)=>readP6CurrentCommittedSourceSnapshot({readerClient:{},trust:f.trust,selector:f.selector},{
   read:async (arg:any)=>{
    const isOriginal=arg.selector.kind==="EXACT_DAY";
    const value=isOriginal?{index:f.index,selector:f.selector}:++state.currentReads===1?second:last;
    if(isOriginal){state.originalReads++;expect(arg.selector.indexSha256).toBe(f.selector.indexSha256)}
    return {pins:{expectedIndexRevision:value.selector.indexRevision,expectedIndexSha256:value.selector.indexSha256},wire:value.index};
   },
   hydrate:async(arg:any)=>{
    if(arg.scope.requireCurrentRevisionForPlanning){const n=state.planningHydrations++;if(errors[n])throw Error(errors[n]);}
    return arg.wire;
   }
  } as any);
  return {f,second,third,changed,state,run};
 }
 it("retries only explicit current-revision race, keeps immutable original anchor and checks unchanged query",async()=>{
  const x=setup(),r=await x.run([stale]);
  expect(r.selector).toEqual(x.third.selector);
  expect(r.selected.q.expectedPacketSha256).toBe(h(x.f.receipt.privateBytes));
  expect(x.state).toEqual({originalReads:1,currentReads:2,planningHydrations:2});
 });
 it("never retries integrity or expired-source errors; three stale reads are the strict bound",async()=>{
  for(const e of ["HOLD_P6_DAY_EPOCH_FULL_REGISTRY_REGISTRY_SHA_DAY_KIND_RIGHTS_OR_RETENTION_DRIFT","HOLD_P6_DAY_EPOCH_FULL_REGISTRY_DAY_INDEX_EXPIRED_BETWEEN_READS"]){
   const x=setup();await expect(x.run([e])).rejects.toThrow(e);expect(x.state.currentReads).toBe(1);
  }
  const x=setup();await expect(x.run([stale,stale,stale])).rejects.toThrow(stale);expect(x.state.currentReads).toBe(3);
  const y=setup();await expect(y.run([stale],y.changed)).rejects.toThrow("ORIGINAL_SIGNED_QUERY_CHANGED");
 });
});
