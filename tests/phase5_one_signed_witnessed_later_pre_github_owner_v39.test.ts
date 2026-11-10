import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 admitP5SignedWitnessedLaterPre,
 type P5SignedWitnessedLaterPrePacket
} from "../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";
import {digestP5Stage24ReviewedReceipt}
 from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";

const hash=(x:string)=>x.repeat(64);
const code="f".repeat(40);
const path="data-collection/phase5/frozen/later_pre_0001.json";
const native="2027-02-10T12:00:00.000Z";
const t24="2027-02-09T12:00:00.000Z";
const preUrl="postgresql://phase5_p30_pre_login_20261107:ci-pre@localhost:5432/neondb";
function fixture(horizon:"T-6h"|"T-90m"="T-6h"){
 const selectedTConfig={
  milestone:"departure.scheduledTime.utc" as const,version:"native-ci-only",
  artifactHash:hash("8"),verifiedProviderNativeSchedule:true,
  semanticsEvidenceSha256:hash("5")
 };
 const receiptBase={
  schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1" as const,
  snapshotId:"123456",flightInstanceId:"leg:ci:100",
  selectedTNativeUtc:native,frozenT24CutoffUtc:t24,
  expectedSelectedTVersion:
   "departure.scheduledTime.utc:native-ci-only:"+hash("8"),
  t24OriginalFidsSha256:hash("a"),t24SourceQueryDigestSha256:hash("b"),
  t24FrameSha256:hash("2"),t24ConfigSha256:hash("3"),
  witnessDbObservedAtUtc:"2027-02-09T11:58:00.000Z",
  stage17PostCommitReadbackAtUtc:"2027-02-09T11:58:03.000Z"
 };
 const reviewedT24WitnessReceipt={...receiptBase,
  receiptSha256:digestP5Stage24ReviewedReceipt(receiptBase)};
 const prePermit={
  manifestSha256:hash("1"),queryDigestSha256:hash("c"),
  expectedSourcePopulationQueryId:
   "a23e4567-e89b-42d3-a456-426614174000",
  expectedSourceResponseSha256:hash("d"),
  runDayIndex:1,slot:"HUB",horizon,airportIcao:"WSSS",
  flightInstanceId:"leg:ci:100",expectedGithubSourceRunId:"42363348762",
  expectedReviewedReleaseSha256:hash("e"),
  expectedReviewedSourceRightsSha256:hash("6"),
  expectedProviderContractSha256:hash("7"),
  expectedEarlyDrawSha256:hash("9"),
  reviewedFrameSha256:hash("2"),reviewedConfigSha256:hash("3"),
  independentlyReviewedOperatingLegEvidenceSha256:hash("4"),
  independentlyReviewedNativeTEvidenceSha256:hash("5"),
  independentlyReviewedRunAndRetentionEvidenceSha256:hash("0"),
  frozenBuilderSha256:hash("f"),
  builderFrozenAtUtc:"2027-02-08T00:00:00.000Z",
  selectedTConfig,selectedTNativeUtc:native,
  maxPopulationStalenessSeconds:3600,
  expectedRestrictedPreWriterRole:P5_STAGE28_GROUPS.pre,
  identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG" as const,
  externalNativeTPhysicalLegAndSourceUseReviewed:true as const,
  reviewedT24WitnessReceipt
 };
 const packet:P5SignedWitnessedLaterPrePacket={
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:code,independentLaterHorizonAndT24ReviewAttested:true,
  prePermit
 };
 const bytes=Buffer.from(JSON.stringify(packet));
 const env={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  V39_P5_LATER_PRE_APPROVED_CODE_SHA:code,
  P5_LATER_PRE_CONFIRM:"ONE_SIGNED_WITNESSED_T6_OR_T90_PRE_NO_PROVIDER",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  V39_P5_LATER_PRE_OWNER_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  V39_P5_LATER_PRE_SIGNED_PACKET_SHA256:
   createHash("sha256").update(bytes).digest("hex"),
  V39_P5_LATER_PRE_T24_RECEIPT_SHA256:
   reviewedT24WitnessReceipt.receiptSha256,
  V39_P5_MANIFEST_SHA256:hash("1"),
  V39_P5_QUERY_DIGEST:hash("c"),
  V39_P5_RELEASE_SHA256:hash("e"),
  V39_P5_RIGHTS_SHA256:hash("6"),
  V39_P5_FRAME_HASH:hash("2"),V39_P5_CONFIG_HASH:hash("3"),
  V39_P5_NATIVE_T_SEMANTICS_SHA256:hash("5"),
  P5_V39_PRE_DATABASE_URL:preUrl
 } as NodeJS.ProcessEnv;
 return {packet,bytes,env};
}
function admitted(f:ReturnType<typeof fixture>,
 env=f.env,packet=f.packet,bytes=f.bytes,file=path){
 return admitP5SignedWitnessedLaterPre(env,bytes,packet,file);
}
function resigned(f:ReturnType<typeof fixture>,packet:P5SignedWitnessedLaterPrePacket){
 const bytes=Buffer.from(JSON.stringify(packet));
 return {packet,bytes,env:{...f.env,
  V39_P5_LATER_PRE_SIGNED_PACKET_SHA256:
   createHash("sha256").update(bytes).digest("hex")
 }};
}
describe("Phase5 later PRE reuses restricted Stage14 and T24 V0081 witness",()=>{
 it.each(["T-6h","T-90m"] as const)(
  "admits independently signed %s flight only with real reviewed T24 receipt",h=>{
   const f=fixture(h),result=admitted(f);
   expect(result.prePermit.horizon).toBe(h);
   expect(result.cutoffMs).toBe(Date.parse(native)-
    (h==="T-6h"?21600_000:5400_000));
   expect(result.preDatabaseUrl).toBe(preUrl);
 });
 it("refuses changed source packet raw bytes, unsigned code or missing independent GO",()=>{
  const f=fixture();
  expect(()=>admitted(f,f.env,f.packet,
   Buffer.concat([f.bytes,Buffer.from(" ")]))).toThrow(
    "PACKET_BYTES_NOT_INDEPENDENTLY_REVIEWED");
  for(const bad of [
   {GITHUB_SHA:"a".repeat(40)},
   {GITHUB_REF:"refs/pull/530/merge"},
   {GITHUB_REPOSITORY:"other/repo"},
   {GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_EVENT_NAME:"pull_request"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {V39_P5_LATER_PRE_OWNER_APPROVED:"0"},
   {V39_PHASE5_FREEZE_SIGNED:"0"},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {V39_PHASE6_PROCESS_ARMED:"0"},
   {ADB_AUTO_COLLECT:"1"},
   {AERODATABOX_API_KEY:"should-never-be-present"}
  ])expect(()=>admitted(f,{...f.env,...bad}))
    .toThrow("UNSIGNED_MAIN_OR_SEPARATE_RELEASE_GO");
 });
 it("rejects forged independent receipt even when exact packet SHA is recomputed",()=>{
  const f=fixture(),fake={...f.packet,
   prePermit:{...f.packet.prePermit,
    reviewedT24WitnessReceipt:{
     ...f.packet.prePermit.reviewedT24WitnessReceipt!,
     snapshotId:"999999"
    }
   }
  };
  const r=resigned(f,fake);
  expect(()=>admitted(r)).toThrow("INDEPENDENT_T24_RECEIPT_SCOPE_NOT_REVIEWED");
 });
 it("rejects changed signed T, horizon T24 substitution and conditional tier upgrade",()=>{
  const f=fixture();
  for(const patch of [
   {horizon:"T-24h"},
   {selectedTNativeUtc:"2027-02-10T13:00:00.000Z"},
   {identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE"},
   {expectedRestrictedPreWriterRole:P5_STAGE28_GROUPS.source},
   {flightInstanceId:"other:flight:100"},
   {reviewedFrameSha256:hash("0")},
  ]){
   const packet={...f.packet,prePermit:{...f.packet.prePermit,...patch}
   } as P5SignedWitnessedLaterPrePacket;
   const r=resigned(f,packet);
   expect(()=>admitted(r)).toThrow(
    /LATER_SOURCE_IDENTITY_OR_ROLE_NOT_REVIEWED|INDEPENDENT_T24_RECEIPT_SCOPE_NOT_REVIEWED/);
  }
 });
 it("rejects different T24 original reviewer digest or a changed T24 cutoff",()=>{
  const f=fixture();
  const fake={...f.packet,prePermit:{...f.packet.prePermit,
   reviewedT24WitnessReceipt:{
    ...f.packet.prePermit.reviewedT24WitnessReceipt!,
    frozenT24CutoffUtc:"2027-02-09T11:00:00.000Z"
   }
  }} as P5SignedWitnessedLaterPrePacket;
  const r=resigned(f,fake);
  expect(()=>admitted(r)).toThrow(
   /INDEPENDENT_T24_RECEIPT_SCOPE_NOT_REVIEWED|T24_ANCHOR_NOT_FROZEN_FOR_LATER_HORIZON/);
  expect(()=>admitted(f,{...f.env,
   V39_P5_LATER_PRE_T24_RECEIPT_SHA256:hash("0")}))
   .toThrow("INDEPENDENT_T24_RECEIPT_SCOPE_NOT_REVIEWED");
 });
 it("refuses application, witness, source and wrong PRE role credentials",()=>{
  const f=fixture();
  for(const bad of [
   {P5_V39_PRE_DATABASE_URL:
    "postgresql://phase5_p30_witness_login_20261107:ci@localhost/neondb"},
   {P5_V39_PRE_DATABASE_URL:
    "postgresql://app:ci@localhost/neondb"},
  ])expect(()=>admitted(f,{...f.env,...bad}))
   .toThrow("UNCOMMISSIONED_OR_CROSS_ROLE_PRE_DATABASE_LOGIN");
  for(const bad of [
   {DATABASE_URL:preUrl},
   {V39_P5_SOURCE_DATABASE_URL:preUrl},
   {P5_V39_T24_WITNESS_DATABASE_URL:preUrl}
  ])expect(()=>admitted(f,{...f.env,...bad}))
   .toThrow("FORBIDDEN_APPLICATION_OR_OTHER_ROLE_REUSE");
 });
 it("refuses path traversal and old Phase4 packet paths",()=>{
  const f=fixture();
  for(const bad of ["../x.json","data-collection/phase5/frozen/../x.json",
   "data-collection/phase4/frozen/later_pre_0001.json"])
   expect(()=>admitted(f,f.env,f.packet,f.bytes,bad))
    .toThrow("PACKET_BYTES_NOT_INDEPENDENTLY_REVIEWED");
 });
});

describe("honest v2 standalone later PRE is separately approved and cannot invent T24",()=>{
 function alternate(horizon:"T-6h"|"T-90m"="T-6h"){
  const f=fixture(horizon);
  const packet:P5SignedWitnessedLaterPrePacket={
   ...f.packet,
   schema:"v39.phase5.github-standalone-later-pre-asof-reviewed.v2",
   independentLaterHorizonAndT24ReviewAttested:undefined,
   independentlyReviewedLaterWithoutT24AsOfAttested:true,
   prePermit:{
    ...f.packet.prePermit,reviewedT24WitnessReceipt:undefined,
    reviewedStandaloneLaterNoT24:{
     schema:"v39.phase5.standalone-later-asof-no-t24.v1",
     reviewedProtocolSha256:hash("b"),
     reviewedOriginalResponseSha256:
       f.packet.prePermit.expectedSourceResponseSha256,
     reviewedNativeTSemanticsSha256:
       f.packet.prePermit.independentlyReviewedNativeTEvidenceSha256,
     missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",
     independentLaterAsOfAndMissingnessReviewAttested:true
    }
   }
  };
  const signed=resigned(f,packet);
  return {...signed,env:{
   ...signed.env,
   V39_P5_LATER_PRE_T24_RECEIPT_SHA256:"",
   V39_P5_STANDALONE_LATER_PRE_INDEPENDENT_APPROVED:"1",
   V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256:hash("b")
  }};
 }
 it.each(["T-6h","T-90m"] as const)(
  "admits %s only under different signed no-T24 evidence tier",horizon=>{
   const f=alternate(horizon),x=admitted(f);
   expect(x.standaloneProtocolSha256).toBe(hash("b"));
   expect(x.prePermit.reviewedT24WitnessReceipt).toBeUndefined();
   expect(x.cutoffMs).toBe(Date.parse(native)-
     (horizon==="T-6h"?21600_000:5400_000));
  });
 it("rejects absent external amendment, signed approval and manipulated source",()=>{
  const f=alternate();
  for(const bad of [
   {V39_P5_STANDALONE_LATER_PRE_INDEPENDENT_APPROVED:"0"},
   {V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256:hash("9")},
   {V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256:""}
  ])expect(()=>admitted(f,{...f.env,...bad}))
   .toThrow("INDEPENDENT_STANDALONE_LATER_ASOF_AND_MISSING_T24_NOT_REVIEWED");
  const p={...f.packet,prePermit:{...f.packet.prePermit,
   expectedSourceResponseSha256:hash("e")}};
  expect(()=>admitted(resigned(f,p))).toThrow(
   "INDEPENDENT_STANDALONE_LATER_ASOF_AND_MISSING_T24_NOT_REVIEWED");
 });
 it("cannot quietly downgrade witnessed packet or claim nonexistent witness",()=>{
  const f=alternate();
  const bad={...f.packet,prePermit:{
   ...f.packet.prePermit,
   reviewedT24WitnessReceipt:fixture().packet.prePermit.reviewedT24WitnessReceipt
  }};
  expect(()=>admitted(resigned(f,bad))).toThrow(
   "INDEPENDENT_STANDALONE_LATER_ASOF_AND_MISSING_T24_NOT_REVIEWED");
  const g=fixture();
  const forged={...g.packet,
   schema:"v39.phase5.github-standalone-later-pre-asof-reviewed.v2" as const,
   independentlyReviewedLaterWithoutT24AsOfAttested:true as const};
  expect(()=>admitted(resigned(g,forged))).toThrow(
   "INDEPENDENT_STANDALONE_LATER_ASOF_AND_MISSING_T24_NOT_REVIEWED");
 });
});
