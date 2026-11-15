import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {projectP6VerifiedLaterQueueRoster,readP6PrivateLaterQueueRoster} from "../server/lib/disruption/phase6PrivateLaterQueueRosterReadOnce_v39.mjs";
import {verifyP5SignedLaterPreDayRegistry} from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
const sha=(x:string)=>x.repeat(64),hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const code="a".repeat(40),native="2035-11-25T12:00:00.000Z",qid="c23e4567-e89b-42d3-a456-426614174013";
const file="data-collection/phase5/frozen/ci_v39_cd_existing_t6_packet.json";
const rights=sha("d"),manifest=sha("a"),protocol=sha("b"),release=sha("3"),calendar=sha("c");
function fixture(){
 const permit={
  expectedRestrictedPreWriterRole:"phase5_fids_pre_writer_prod_20261107",
  manifestSha256:manifest,expectedReviewedSourceRightsSha256:rights,
  externalNativeTPhysicalLegAndSourceUseReviewed:true,
  expectedSourceResponseSha256:sha("c"),
  reviewedFrameSha256:sha("e"),
  queryDigestSha256:sha("2"),
  expectedReviewedReleaseSha256:sha("3"),
  expectedProviderContractSha256:sha("4"),
  expectedEarlyDrawSha256:sha("5"),
  reviewedConfigSha256:sha("6"),
  independentlyReviewedOperatingLegEvidenceSha256:sha("7"),
  independentlyReviewedNativeTEvidenceSha256:sha("8"),
  independentlyReviewedRunAndRetentionEvidenceSha256:sha("9"),
  frozenBuilderSha256:sha("c"),
  builderFrozenAtUtc:"2035-11-25T05:00:00.000Z",
  selectedTConfig:{
   milestone:"departure.scheduledTime.utc",
   version:"ci-native-t",
   artifactHash:sha("f"),verifiedProviderNativeSchedule:true,
   semanticsEvidenceSha256:sha("8")
  },
  expectedGithubSourceRunId:"42363348888",
  runDayIndex:1,slot:"HUB",airportIcao:"WSSS",
  maxPopulationStalenessSeconds:3600,
  reviewedT24WitnessReceipt:{schema:"ci-prior-independent-witness"} ,
  flightInstanceId:"leg:ci:cd:t6:001",horizon:"T-6h",
  selectedTNativeUtc:native,expectedSourcePopulationQueryId:qid
 };
 const packet={...permit,reviewedT24WitnessReceipt:undefined,reviewedStandaloneLaterNoT24:{
  schema:"v39.phase5.standalone-later-asof-no-t24.v1",reviewedProtocolSha256:protocol,
  reviewedOriginalResponseSha256:permit.expectedSourceResponseSha256,
  reviewedNativeTSemanticsSha256:permit.independentlyReviewedNativeTEvidenceSha256,
  missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",
  independentLaterAsOfAndMissingnessReviewAttested:true
 }};
 const bytes=Buffer.from(JSON.stringify({schema:"v39.phase5.github-standalone-later-pre-asof-reviewed.v2",
  reviewedCodeSha:code,independentlyReviewedLaterWithoutT24AsOfAttested:true,prePermit:packet}));
 const sourcePath="data-collection/phase5/frozen/source_ci_roster_day.json",
  laterPath="data-collection/phase5/frozen/later_ci_roster_day.json";
 const source={schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",manifestSha256:manifest,
  runDayIndex:1,entries:[{filePath:"data-collection/phase5/frozen/sourceq_ci_roster_day.json",
   expectedPacketSha256:sha("3"),expectedQueryDigestSha256:permit.queryDigestSha256}]};
 const sourceBytes=Buffer.from(JSON.stringify(source));
 const registry={schema:"v39.phase5.signed-later-pre-day-registry.v1",manifestSha256:manifest,
  reviewedCodeSha:code,sourceDayRegistrySha256:hash(sourceBytes),sourceDayRegistryFilePath:sourcePath,
  runDayIndex:1,shardIndex:1,entries:[{filePath:file,expectedPacketSha256:hash(bytes),
   expectedQueryDigestSha256:permit.queryDigestSha256,expectedFlightInstanceId:permit.flightInstanceId,
   expectedHorizon:"T-6h",expectedSelectedTNativeUtc:native,expectedSourcePopulationQueryId:qid}]};
 const registryBytes=Buffer.from(JSON.stringify(registry));
 const common={runDayIndex:1,shardIndex:1,publishedAtUtc:"2035-11-25T05:00:00.000Z",
  notBeforeUtc:"2035-11-25T05:05:00.000Z",hardLatestUtc:"2035-11-25T06:00:00.000Z",
  reviewEvidenceSha256:sha("e")};
 const signed={schema:"v39.phase6.run-day-scoped-append-only-index.v1",runDayIndex:1,revision:1,
  previousIndexSha256:null,manifestSha256:manifest,calendarSha256:calendar,reviewedCodeSha:code,
  reviewedReleaseSha256:release,reviewedRightsSha256:rights,
  entries:[{...common,lane:"SOURCE",filePath:sourcePath,fileSha256:hash(sourceBytes),
   sourceRegistryFilePath:null,sourceRegistrySha256:null},
   {...common,lane:"LATER_PRE",filePath:laterPath,fileSha256:hash(registryBytes),
    sourceRegistryFilePath:sourcePath,sourceRegistrySha256:hash(sourceBytes)}]};
 const raw=Buffer.from(JSON.stringify(signed)),now="2035-11-25T05:58:00.000Z";
 const index={redactedSummary:{status:"SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH",
  indexSha256:hash(raw),indexRevision:1,runDayIndex:1,externalEd25519ReviewerVerified:true,
  restrictedPrivatePg16ReaderVerified:true,actualPrivateRegistryBytesRead:true,
  authoritativeFlightSemanticAdmissionDone:false,providerCalls:0,databaseWrites:0,githubChildDispatches:0,
  phase6PaidGo:false,observedDbClockUtc:now},privateParsedIndex:signed,privateCurrentIndexBytes:raw,
  privatePreviousIndexBytes:null,getFrozen:(path:string)=>path===sourcePath?sourceBytes:registryBytes};
 const verified=verifyP5SignedLaterPreDayRegistry(registryBytes,registry as any,sourceBytes,source as any,{
  registryFilePath:laterPath,expectedRegistrySha256:hash(registryBytes),expectedSourceDayRegistrySha256:hash(sourceBytes),
  expectedManifestSha256:manifest,expectedApprovedMainSha:code,expectedRunDayIndex:1,
  expectedReleaseSha256:release,expectedRightsSha256:rights},()=>bytes);
 const hydrated={schema:"v39.phase5.phase6-pg16-private-later-hydration.v1",verified,observedDbClockUtc:now,
  redactedSummary:{privateReaderRoleVerified:true,providerCalls:0,databaseWrites:0,githubDispatches:0,phase6PaidGoGranted:false}};
 const selector={runDayIndex:1,indexRevision:1,indexSha256:hash(raw),shardIndex:1,laterRegistrySha256:hash(registryBytes)};
 const trust={independentStudyTrustPinsApproved:true,reviewedCodeSha:code,manifestSha256:manifest,
  calendarSha256:calendar,releaseSha256:release,rightsSha256:rights};
 const policy={independentLaterQueueTransportProjectionApproved:true,existingPaidDispatchApproved:false,
  independentlyApprovedStandaloneProtocolSha256:protocol};
 return {index,hydrated,selector,trust,policy,bytes};
}
describe("authenticated private later registry to existing queue roster",()=>{
 it("keeps a valid late-horizon packet in the real two-minute write window despite missing T24",()=>{
  const f=fixture(),out=projectP6VerifiedLaterQueueRoster(f);
  expect(out.packetCount).toBe(1);expect(out.nearCutoffCount).toBe(1);expect(out.standaloneCount).toBe(1);
  expect(out.expiredCutoffCount).toBe(0);expect(out.phase6PaidGo).toBe(false);
  expect(out.independentlySignedDerivedRoster).toBe(false);expect(out.originalLaterReviewWireReverified).toBe(false);
  expect(out.privateEntries[0].bytes).toEqual(f.bytes);
  expect(JSON.stringify(out)).not.toContain("leg:ci");
  expect(Object.keys(out)).not.toContain("privateEntries");
 });
 it("refuses a substituted registry, packet or independent study scope",()=>{
  const f=fixture();
  expect(()=>projectP6VerifiedLaterQueueRoster({...f,selector:{...f.selector,laterRegistrySha256:sha("1")}})).toThrow("EXACT_LATER_SHARD_NOT_FOUND");
  expect(()=>projectP6VerifiedLaterQueueRoster({...f,trust:{...f.trust,rightsSha256:sha("1")}})).toThrow("WRONG_AUTHENTICATED_DAY_STUDY");
  f.hydrated.verified.entries[0].bytes=Buffer.from("changed");
  expect(()=>projectP6VerifiedLaterQueueRoster(f)).toThrow("PACKET_BYTES_OUTSIDE_SIGNED_REGISTRY");
 });
 it("never infers a missing-T24 approval from the signed packet",()=>{
  const f=fixture();
  expect(()=>projectP6VerifiedLaterQueueRoster({...f,policy:{...f.policy,independentlyApprovedStandaloneProtocolSha256:undefined}})).toThrow("T24_WITNESS_OR_STANDALONE");
 });
 it("rejects an expired shard or clock drift between the two actual reader transactions",()=>{
  const f=fixture();f.hydrated.observedDbClockUtc="2035-11-25T06:00:00.000Z";
  expect(()=>projectP6VerifiedLaterQueueRoster(f)).toThrow("SHARD_CLOCK_EXPIRED_OR_DRIFTED");
 });
 it("refuses an unapproved read before any database query",async()=>{
  const f=fixture();let queries=0;
  await expect(readP6PrivateLaterQueueRoster({client:{query:async()=>{queries++;throw Error("unexpected");}},
    trust:f.trust,selector:f.selector,policy:{...f.policy,independentLaterQueueTransportProjectionApproved:false}}))
   .rejects.toThrow("NO_EXACT_INDEPENDENT_PROJECTION_SCOPE");
  expect(queries).toBe(0);
 });
});
