import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
 admitP6OneVerifiedPrivateLaterPreToExistingStage14,
 P6_PRIVATE_LATER_PRE_STAGE14_BRIDGE_SCHEMA
} from "../server/lib/disruption/phase6PrivateLaterPreExistingStage14Bridge_v39";
import {digestP5Stage24ReviewedReceipt}
 from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";

const H=(v:string)=>v.repeat(64);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const CODE="f".repeat(40),ROUTE=H("9"),QUERY=H("c");
const NATIVE="2027-02-10T12:00:00.000Z";
const SOURCE="data-collection/phase5/frozen/source_registry_day04.json";
const LATER="data-collection/phase5/frozen/later_registry_day04.json";
const PACK="data-collection/phase5/frozen/later_native_flight_0001.json";
const FLIGHT="leg:ci:100";
const PUB="postgresql://phase5_p30_pre_login_20261107:ci-pre@localhost:5432/neondb";
const UUID="a23e4567-e89b-42d3-a456-426614174000";
function fixture(horizon:"T-6h"|"T-90m"="T-6h"){
 const receiptBase={
  schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1",
  snapshotId:"123456",flightInstanceId:FLIGHT,
  selectedTNativeUtc:NATIVE,
  frozenT24CutoffUtc:"2027-02-09T12:00:00.000Z",
  expectedSelectedTVersion:"departure.scheduledTime.utc:native-ci-only:"+H("8"),
  t24OriginalFidsSha256:H("a"),t24SourceQueryDigestSha256:H("b"),
  t24FrameSha256:H("2"),t24ConfigSha256:H("3"),
  witnessDbObservedAtUtc:"2027-02-09T11:58:00.000Z",
  stage17PostCommitReadbackAtUtc:"2027-02-09T11:58:03.000Z"
 };
 const reviewedT24WitnessReceipt={
  ...receiptBase,receiptSha256:digestP5Stage24ReviewedReceipt(receiptBase as any)
 };
 const packet={
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:CODE,independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:{
   manifestSha256:H("1"),queryDigestSha256:QUERY,
   expectedSourcePopulationQueryId:UUID,
   expectedSourceResponseSha256:H("d"),
   runDayIndex:4,slot:"HUB",horizon,airportIcao:"WSSS",
   flightInstanceId:FLIGHT,expectedGithubSourceRunId:"42363348762",
   expectedReviewedReleaseSha256:H("e"),
   expectedReviewedSourceRightsSha256:H("6"),
   expectedProviderContractSha256:H("7"),
   expectedEarlyDrawSha256:H("9"),
   reviewedFrameSha256:H("2"),reviewedConfigSha256:H("3"),
   independentlyReviewedOperatingLegEvidenceSha256:H("4"),
   independentlyReviewedNativeTEvidenceSha256:H("5"),
   independentlyReviewedRunAndRetentionEvidenceSha256:H("0"),
   frozenBuilderSha256:H("f"),builderFrozenAtUtc:"2027-02-08T00:00:00.000Z",
   selectedTConfig:{
    milestone:"departure.scheduledTime.utc",version:"native-ci-only",
    artifactHash:H("8"),verifiedProviderNativeSchedule:true,
    semanticsEvidenceSha256:H("5")
   },selectedTNativeUtc:NATIVE,maxPopulationStalenessSeconds:3600,
   expectedRestrictedPreWriterRole:P5_STAGE28_GROUPS.pre,
   identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG",
   externalNativeTPhysicalLegAndSourceUseReviewed:true,
   reviewedT24WitnessReceipt
  }
 };
 const bytes=Buffer.from(JSON.stringify(packet));
 const source={schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:H("1"),runDayIndex:4,
  entries:[{filePath:"data-collection/phase5/frozen/sourceq_native_00001.json",
   expectedPacketSha256:H("5"),expectedQueryDigestSha256:QUERY}]
 };
 const sourceBytes=Buffer.from(JSON.stringify(source));
 const later={schema:"v39.phase5.signed-later-pre-day-registry.v1",
  reviewedCodeSha:CODE,manifestSha256:H("1"),
  sourceDayRegistryFilePath:SOURCE,
  sourceDayRegistrySha256:sha(sourceBytes),
  runDayIndex:4,shardIndex:2,
  entries:[{
   filePath:PACK,expectedPacketSha256:sha(bytes),
   expectedQueryDigestSha256:QUERY,expectedFlightInstanceId:FLIGHT,
   expectedHorizon:horizon,expectedSelectedTNativeUtc:NATIVE,
   expectedSourcePopulationQueryId:UUID,
   expectedT24ReceiptSha256:reviewedT24WitnessReceipt.receiptSha256
  }]
 };
 const laterBytes=Buffer.from(JSON.stringify(later));
 const cutoff=Date.parse(NATIVE)-
  (horizon==="T-6h"?21600000:5400000);
 const pgAt=new Date(cutoff-60*60000).toISOString();
 const indexAt=new Date(cutoff-61*60000).toISOString();
 const route={
  lane:"LATER_PRE",runDayIndex:4,shardIndex:2,
  signedFrozenPath:LATER,signedFrozenSha256:sha(laterBytes),
  boundSourceRegistryPath:SOURCE,boundSourceRegistrySha256:sha(sourceBytes),
  routingIntentSha256:ROUTE,newPaidDispatchAuthorizedHere:false,
  independentlyAuthenticatedGHHistoryRequired:true,
  privateBytesOnlyFromRestrictedReader:true,
  notBeforeUtc:new Date(cutoff-120*60000).toISOString(),
  hardLatestUtc:new Date(cutoff).toISOString()
 };
 const indexHandoff:any={redactedSummary:{
  schema:"v39.phase6.private-index-and-full-registries-memory-handoff-no-dispatch.v1",
  status:"SIGNED_RESTRICTED_INMEMORY_31DAY_REGISTRY_HANDOFF_NO_DISPATCH",
  phase6PaidGo:false,providerCalls:0,databaseWrites:0,
  githubChildDispatches:0,underlyingPerFlightPacketsNotHydratedHere:true,
  observedRestrictedPgClockUtc:indexAt
 }};
 Object.defineProperties(indexHandoff,{
  privateRoutingCandidates:{
   value:[route],enumerable:false,writable:false
  },
  privateRegistryBytes:{
   value:new Map([[SOURCE,sourceBytes],[LATER,laterBytes]]),
   enumerable:false,writable:false
  }
 });
 const entry={
  filePath:PACK,packetSha256:sha(bytes),queryDigestSha256:QUERY,
  flightInstanceId:FLIGHT,horizon,selectedTNativeUtc:NATIVE,
  t24ReceiptSha256:reviewedT24WitnessReceipt.receiptSha256,
  bytes,packet
 };
 const verified={
  schema:"v39.phase5.verified-later-pre-day-registry.v1",
  registryFilePath:LATER,registrySha256:sha(laterBytes),
  sourceDayRegistrySha256:sha(sourceBytes),manifestSha256:H("1"),
  approvedCodeSha:CODE,runDayIndex:4,shardIndex:2,
  entries:[entry],providerCalls:0,databaseWrites:0,
  githubChildDispatches:0,
  phase5ScientificFreezeCertifiedByRegistry:false,
  phase6PaidGoGrantedByRegistry:false
 };
 const due={
  schema:"v39.phase5.later-pre-registry-clock-due-selection.v1",
  observedDbClockUtc:pgAt,totalSignedFlightHorizons:1,
  dueForActualPgReadback:1,selectedForActualPgReadback:[entry],
  deferredWithinWindowCount:0,statuses:[],providerCalls:0,
  databaseWrites:0,githubChildDispatches:0,phase6PaidGoGrantedHere:false
 };
 const hydrated:any={
  schema:"v39.phase5.phase6-pg16-private-later-hydration.v1",
  verified,due,observedDbClockUtc:pgAt,
  redactedSummary:{
   runDayIndex:4,shardIndex:2,signedNativeFlightHorizons:1,
   dueForRealReadback:1,genuinelyMissedOrTooClose:0,
   deferredWithinWindow:0,actualPrivatePayloadsRead:3,
   sourceRegistrySha256:sha(sourceBytes),laterRegistrySha256:sha(laterBytes),
   privateReaderRoleVerified:true,publicCheckoutContentsEmitted:false,
   providerCalls:0,databaseWrites:0,githubDispatches:0,
   phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
  }
 };
 const env:NodeJS.ProcessEnv={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:CODE,
  V39_P5_LATER_PRE_APPROVED_CODE_SHA:CODE,
  P5_LATER_PRE_CONFIRM:"ONE_SIGNED_WITNESSED_T6_OR_T90_PRE_NO_PROVIDER",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  AERODATABOX_WEBHOOK_SECRET:"",
  V39_P5_LATER_PRE_OWNER_APPROVED:"1",
  V39_P5_LATER_PRE_DAY_REGISTRY_OWNER_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  V39_P5_LATER_PRE_DAY_REGISTRY_SHA256:sha(laterBytes),
  V39_P5_SOURCE_BATCH_REGISTRY_SHA256:sha(sourceBytes),
  V39_P5_MANIFEST_SHA256:H("1"),V39_P5_RELEASE_SHA256:H("e"),
  V39_P5_RIGHTS_SHA256:H("6"),P5_LATER_PRE_DAY_INDEX:"4",
  V39_P5_LATER_PRE_SIGNED_PACKET_SHA256:"0".repeat(64),
  V39_P5_LATER_PRE_T24_RECEIPT_SHA256:"0".repeat(64),
  V39_P5_QUERY_DIGEST:"0".repeat(64),
  V39_P5_FRAME_HASH:H("2"),V39_P5_CONFIG_HASH:H("3"),
  V39_P5_NATIVE_T_SEMANTICS_SHA256:H("5"),
  P5_V39_PRE_DATABASE_URL:PUB
 };
 const pins={
  expectedRoutingIntentSha256:ROUTE,
  expectedLaterPacketPath:PACK,
  expectedLaterPacketSha256:sha(bytes),
  expectedQueryDigestSha256:QUERY,expectedSourceRegistryPath:SOURCE,
  expectedFlightInstanceId:FLIGHT,expectedHorizon:horizon
 };
 const args:any={indexHandoff,hydrated,env,pins};
 return {args,entry,indexHandoff,hydrated,env,route,bytes,
  sourceBytes,laterBytes,cutoff,pgAt};
}
function dayEpoch(f:ReturnType<typeof fixture>){
 const bytes=f.indexHandoff.privateRegistryBytes as Map<string,Buffer>;
 const signedDaySha=H("4");
 f.indexHandoff.redactedSummary={
  schema:"v39.phase6.day-epoch-exact-source-pre-post-original-semantics-no-go.v1",
  status:"ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO",
  runDayIndex:4,externallySignedDayEpochIndexSha256:signedDaySha,
  reviewedEd25519SourceWasOriginalDayBytes:true,
  originalV0096GlobalChainNotUsed:true,
  derivedProjectionIsNotAnAdditionalReviewerSignature:true,
  actualIndividualChildPaidReleaseDone:false,
  observedRealPgClockUtc:new Date(f.cutoff-61*60000).toISOString(),
  phase6PaidGo:false,providerCalls:0,databaseWrites:0,
  githubChildDispatches:0
 };
 Object.defineProperty(f.indexHandoff,"getFrozen",{
  enumerable:false,writable:false,value:(path:string)=>{
   const raw=bytes.get(path);
   if(!raw)throw Error("CI_PRIVATE_DAY_REGISTRY_ABSENT");
   return Buffer.from(raw);
  }
 });
 f.args.pins.expectedDayEpochIndexSha256=signedDaySha;
 return f;
}
function run(f:ReturnType<typeof fixture>){
 return admitP6OneVerifiedPrivateLaterPreToExistingStage14(f.args);
}
describe("Phase6 exact V0096 LATER_PRE route into original Stage14 without SQL/REST",()=>{
 it.each(["T-6h","T-90m"] as const)(
  "reuses original %s PRE-only login, T24 receipt, signed byte SHA, due PG clock",h=>{
   const f=fixture(h),x=run(f);
   expect(x.redactedSummary.schema).toBe(P6_PRIVATE_LATER_PRE_STAGE14_BRIDGE_SCHEMA);
   expect(x.redactedSummary.horizon).toBe(h);
   expect(x.redactedSummary.phase6PaidGo).toBe(false);
   expect(x.redactedSummary.sqlWrites).toBe(0);
   expect(x.redactedSummary.providerCalls).toBe(0);
   expect(x.redactedSummary.originalPhase5SignedRegistryAndStage14GatesUsed).toBe(true);
   expect(x.redactedSummary.nativeCutoffUtc).toBe(new Date(f.cutoff).toISOString());
   expect(x.privatePacketBytes).toEqual(f.bytes);
   expect(x.delegatedOriginalStage14Env.V39_P5_QUERY_DIGEST).toBe(QUERY);
   expect(x.delegatedOriginalStage14Env.V39_P5_LATER_PRE_SIGNED_PACKET_SHA256)
    .toBe(sha(f.bytes));
   expect(JSON.stringify(x)).not.toContain("ci-pre");
   expect(JSON.stringify(x)).not.toContain(FLIGHT);
   expect(JSON.stringify(x)).not.toContain("prePermit");
  });
 it("stops when Phase5 freeze, Contents rights or PRE-only login missing",()=>{
  for(const k of ["V39_PHASE5_FREEZE_SIGNED",
   "V39_PHASE5_SOURCE_RIGHTS_APPROVED",
   "V39_PHASE6_PROCESS_ARMED",
   "V39_P5_LATER_PRE_OWNER_APPROVED"]){
   const f=fixture();f.env[k]="0";
   expect(()=>run(f)).toThrow("EXISTING_DAY_REGISTRY_CHILD_RELEASE_REFUSED");
  }
  const g=fixture();g.env.P5_V39_PRE_DATABASE_URL=
   "postgresql://wrong_user:secret@localhost/neondb";
  expect(()=>run(g)).toThrow("EXISTING_STAGE14_NATIVE_T_WITNESS_OR_PRE_ROLE_REFUSED");
 });
 it("refuses switched flight, horizon, packet bytes and source day registry",()=>{
  const a=fixture();a.args.pins.expectedFlightInstanceId="leg:forged";
  expect(()=>run(a)).toThrow("UNSIGNED_OR_SWAPPED_NATIVE_FLIGHT_HORIZON_PACKET");
  const b=fixture();b.args.pins.expectedHorizon="T-90m";
  expect(()=>run(b)).toThrow("UNSIGNED_OR_SWAPPED_NATIVE_FLIGHT_HORIZON_PACKET");
  const c=fixture();c.entry.bytes=Buffer.from("tampered".repeat(30));
  expect(()=>run(c)).toThrow("UNSIGNED_OR_SWAPPED_NATIVE_FLIGHT_HORIZON_PACKET");
  const d=fixture();d.indexHandoff.privateRegistryBytes.set(SOURCE,Buffer.from("wrong"));
  expect(()=>run(d)).toThrow("PRIVATE_SOURCE_OR_LATER_REGISTRY_SHA_CHANGED");
 });
 it("does not let source query digest, registry SHA or signed code drift",()=>{
  const a=fixture();a.env.V39_P5_LATER_PRE_DAY_REGISTRY_SHA256=H("0");
  expect(()=>run(a)).toThrow("ORIGINAL_DAY_SOURCE_MANIFEST_CODE_PINS_CHANGED");
  const b=fixture();b.env.V39_P5_LATER_PRE_APPROVED_CODE_SHA=H("f");
  expect(()=>run(b)).toThrow("EXISTING_DAY_REGISTRY_CHILD_RELEASE_REFUSED");
  const c=fixture();c.args.pins.expectedQueryDigestSha256=H("8");
  expect(()=>run(c)).toThrow("UNSIGNED_OR_SWAPPED_NATIVE_FLIGHT_HORIZON_PACKET");
 });
 it("censors too-late or wrongly timed PRE and refuses stale PG reader snapshot",()=>{
  const a=fixture();
  const almost=new Date(a.cutoff-14*60000).toISOString();
  a.hydrated.observedDbClockUtc=almost;
  a.hydrated.due.observedDbClockUtc=almost;
  a.indexHandoff.redactedSummary.observedRestrictedPgClockUtc=
   new Date(a.cutoff-15*60000).toISOString();
  expect(()=>run(a)).toThrow("ACTUAL_PG_CUTOFF_TOO_CLOSE_OR_NOT_DUE");

  const b=fixture();
  b.indexHandoff.redactedSummary.observedRestrictedPgClockUtc=
   new Date(Date.parse(b.pgAt)-121000).toISOString();
  expect(()=>run(b)).toThrow("SIGNED_SHARD_WINDOW_OR_PG_READER_CLOCK_EXPIRED");
 });
 it("fails closed if a V0096 due-shard has no corresponding authentic PRE due entry",()=>{
  const f=fixture();
  f.hydrated.due.selectedForActualPgReadback=[];
  expect(()=>run(f)).toThrow("NO_UNIQUE_DUE_SIGNED_LATER_FLIGHT");
  const g=fixture();g.args.indexHandoff.privateRoutingCandidates[0].lane="POST";
  expect(()=>run(g)).toThrow("SOURCE_REGISTRY_DAY_SHARD_OR_SIGNED_ROUTE_DRIFT");
 });
});

describe("NEW authenticated per-day Ed25519 PRE: original Stage14 unchanged (NO GO)",()=>{
 it.each(["T-6h","T-90m"] as const)(
  "accepts actual reviewed day-epoch registry for %s and reuses T24 native cutoff/Stage14",h=>{
   const f=dayEpoch(fixture(h)),out=run(f);
   expect(out.redactedSummary.horizon).toBe(h);
   expect(out.redactedSummary.originalPhase5SignedRegistryAndStage14GatesUsed).toBe(true);
   expect(out.redactedSummary.sqlWrites).toBe(0);
   expect(out.redactedSummary.phase6PaidGo).toBe(false);
   expect(JSON.stringify(out)).not.toContain(FLIGHT);
   expect(JSON.stringify(out)).not.toContain("ci-pre");
  });
 it("rejects wrong externally signed day index SHA and cross-day flight",()=>{
  const a=dayEpoch(fixture());
  a.args.pins.expectedDayEpochIndexSha256=H("8");
  expect(()=>run(a)).toThrow("UNVERIFIED_SIGNED_PRIVATE_INDEX_HANDOFF");
  const b=dayEpoch(fixture());
  b.indexHandoff.redactedSummary.runDayIndex=5;
  expect(()=>run(b)).toThrow("SOURCE_REGISTRY_DAY_SHARD_OR_SIGNED_ROUTE_DRIFT");
 });
 it("refuses changed exact private SOURCE bytes, missing path, or unsigned getter",()=>{
  const a=dayEpoch(fixture());
  a.indexHandoff.privateRegistryBytes.set(SOURCE,Buffer.from("changed"));
  expect(()=>run(a)).toThrow("PRIVATE_SOURCE_OR_LATER_REGISTRY_SHA_CHANGED");
  const b=dayEpoch(fixture());
  b.indexHandoff.privateRegistryBytes.delete(LATER);
  expect(()=>run(b)).toThrow("PRIVATE_SOURCE_OR_LATER_REGISTRY_LOOKUP_REFUSED_REDACTED");
  const c=dayEpoch(fixture());
  c.indexHandoff.redactedSummary.derivedProjectionIsNotAnAdditionalReviewerSignature=false;
  expect(()=>run(c)).toThrow("UNVERIFIED_SIGNED_PRIVATE_INDEX_HANDOFF");
 });
});
