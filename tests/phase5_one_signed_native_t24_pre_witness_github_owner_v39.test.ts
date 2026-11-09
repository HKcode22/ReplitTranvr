import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 admitP5NativeT24GitHubRelease,
 p5T24DueDecision,waitForP5ActualT24DatabaseClock,
 type P5NativeT24SignedReleasePacket
} from "../scripts/v39_phase5_one_signed_native_t24_pre_witness_github_owner_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
const h=(x:string)=>x.repeat(64),code="f".repeat(40);
const PATH="data-collection/phase5/frozen/native_t24_00001.json";
function fixture(){
 const native="2027-01-30T12:00:00.000Z";
 const prePermit={
  manifestSha256:h("a"),queryDigestSha256:h("b"),
  expectedSourcePopulationQueryId:"a23e4567-e89b-42d3-a456-426614174000",
  expectedSourceResponseSha256:h("c"),
  runDayIndex:1,slot:"HUB",horizon:"T-24h",airportIcao:"WSSS",
  flightInstanceId:"leg:ci:100",expectedGithubSourceRunId:"42363348762",
  expectedReviewedReleaseSha256:h("d"),
  expectedReviewedSourceRightsSha256:h("e"),
  expectedProviderContractSha256:h("f"),
  expectedEarlyDrawSha256:h("1"),
  reviewedFrameSha256:h("2"),reviewedConfigSha256:h("3"),
  independentlyReviewedOperatingLegEvidenceSha256:h("4"),
  independentlyReviewedNativeTEvidenceSha256:h("5"),
  independentlyReviewedRunAndRetentionEvidenceSha256:h("6"),
  frozenBuilderSha256:h("7"),
  builderFrozenAtUtc:"2027-01-28T00:00:00.000Z",
  selectedTConfig:{
   milestone:"departure.scheduledTime.utc",version:"native-ci-only",
   artifactHash:h("8"),verifiedProviderNativeSchedule:true,
   semanticsEvidenceSha256:h("5")
  },selectedTNativeUtc:native,
  maxPopulationStalenessSeconds:3600,
  expectedRestrictedPreWriterRole:P5_STAGE28_GROUPS.pre,
  externalNativeTPhysicalLegAndSourceUseReviewed:true
 };
 const witnessReview={
  flightInstanceId:prePermit.flightInstanceId,
  sourcePopulationQueryId:prePermit.expectedSourcePopulationQueryId,
  expectedSourceResponseSha256:prePermit.expectedSourceResponseSha256,
  expectedSourceQueryDigestSha256:prePermit.queryDigestSha256,
  expectedFrameSha256:prePermit.reviewedFrameSha256,
  expectedConfigSha256:prePermit.reviewedConfigSha256,
  selectedTNativeUtc:native,
  expectedT24CutoffUtc:"2027-01-29T12:00:00.000Z",
  expectedSelectedTVersion:"departure.scheduledTime.utc:native-ci-only:"+h("8"),
  expectedWitnessOnlyRole:P5_STAGE28_GROUPS.witness
 };
 const packet={
  schema:"v39.phase5.github-native-t24-pre-witness-reviewed.v1",
  reviewedCodeSha:code,independentNativeT24AndSourceReviewAttested:true,
  prePermit,witnessReview
 } as P5NativeT24SignedReleasePacket;
 const bytes=Buffer.from(JSON.stringify(packet));
 const preUrl="postgresql://phase5_p30_pre_login_20261107:ci-pre@localhost:5432/neondb";
 const witUrl="postgresql://phase5_p30_witness_login_20261107:ci-wit@localhost:5432/neondb";
 const env={
  GITHUB_ACTIONS:"true",
  GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",
  GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",
  GITHUB_SHA:code,V39_P5_T24_APPROVED_CODE_SHA:code,
  P5_NATIVE_T24_CONFIRM:"ONE_SIGNED_NATIVE_T24_PRE_AND_WITNESS_NO_PROVIDER",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  V39_P5_T24_OWNER_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  V39_P5_T24_SIGNED_PACKET_SHA256:
   createHash("sha256").update(bytes).digest("hex"),
  V39_P5_MANIFEST_SHA256:h("a"),V39_P5_QUERY_DIGEST:h("b"),
  V39_P5_RELEASE_SHA256:h("d"),V39_P5_RIGHTS_SHA256:h("e"),
  V39_P5_FRAME_HASH:h("2"),V39_P5_CONFIG_HASH:h("3"),
  V39_P5_NATIVE_T_SEMANTICS_SHA256:h("5"),
  P5_V39_PRE_DATABASE_URL:preUrl,
  P5_V39_T24_WITNESS_DATABASE_URL:witUrl
 } as NodeJS.ProcessEnv;
 return {packet,bytes,env,preUrl,witUrl};
}
const admitted=(env:NodeJS.ProcessEnv,packet:P5NativeT24SignedReleasePacket,
 bytes:Buffer, path=PATH)=>admitP5NativeT24GitHubRelease(env,bytes,packet,path);
describe("one reviewed future native T24 PRE and distinct independent witness GitHub admission",()=>{
 it("accepts only true independently pinned source and two distinct installed roles",()=>{
  const f=fixture();
  const a=admitted(f.env,f.packet,f.bytes);
  expect(a.cutoffMs).toBe(Date.parse("2027-01-29T12:00:00.000Z"));
  expect(a.preDatabaseUrl).toBe(f.preUrl);
  expect(a.witnessDatabaseUrl).toBe(f.witUrl);
  expect(JSON.stringify({packetSha256:a.packetSha256,cutoffMs:a.cutoffMs}))
   .not.toContain("ci-pre");
 });
 it("rejects altered JSON bytes even if supplied decoded object is unchanged",()=>{
  const f=fixture();
  expect(()=>admitted(f.env,f.packet,Buffer.concat([f.bytes,Buffer.from(" ")])))
   .toThrow("PACKET_BYTES_NOT_INDEPENDENTLY_REVIEWED");
 });
 it("rejects code drift, missing scientific/source GO, pull request, schedule, retries",()=>{
  const f=fixture();
  for(const invalid of [
   {GITHUB_SHA:"a".repeat(40)},
   {GITHUB_REPOSITORY:"someone/other"},
   {GITHUB_REF:"refs/pull/525/merge"},
   {GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_EVENT_NAME:"pull_request"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {V39_PHASE6_PROCESS_ARMED:"0"},
   {V39_PHASE5_FREEZE_SIGNED:"0"},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {V39_P5_T24_OWNER_APPROVED:"0"},
   {ADB_AUTO_COLLECT:"1"},
   {AERODATABOX_API_KEY:"must-never-have-provider-key"},
  ])expect(()=>admitted({...f.env,...invalid},f.packet,f.bytes))
    .toThrow("UNSIGNED_MAIN_OR_SEPARATE_RELEASE_GO");
 });
 it("rejects any bogus old path, arbitrary task, or missing packet signature",()=>{
  const f=fixture();
  for(const path of ["../old.json",
   "data-collection/phase5/frozen/../old.json",
   "data-collection/phase4/frozen/native_t24_00001.json"])
   expect(()=>admitted(f.env,f.packet,f.bytes,path))
    .toThrow("PACKET_BYTES_NOT_INDEPENDENTLY_REVIEWED");
  expect(()=>admitted({...f.env,
    V39_P5_T24_SIGNED_PACKET_SHA256:h("0")
  },f.packet,f.bytes)).toThrow("PACKET_BYTES_NOT_INDEPENDENTLY_REVIEWED");
 });
 it("rejects cross-flight witness, native evidence drift, conditional tier or role swap",()=>{
  const f=fixture();
  for(const change of [
   {prePermit:{...f.packet.prePermit,identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE"}},
   {prePermit:{...f.packet.prePermit,
    independentlyReviewedNativeTEvidenceSha256:h("0")}},
   {prePermit:{...f.packet.prePermit,
    expectedRestrictedPreWriterRole:P5_STAGE28_GROUPS.source}},
   {witnessReview:{...f.packet.witnessReview,flightInstanceId:"leg:other:999"}},
   {witnessReview:{...f.packet.witnessReview,
    expectedWitnessOnlyRole:P5_STAGE28_GROUPS.pre}},
  ]){
   const packet={...f.packet,...change} as P5NativeT24SignedReleasePacket;
   const bytes=Buffer.from(JSON.stringify(packet));
   const env={...f.env,V39_P5_T24_SIGNED_PACKET_SHA256:
    createHash("sha256").update(bytes).digest("hex")};
   expect(()=>admitted(env,packet,bytes)).toThrow(
    /NATIVE_SOURCE_T24_FLIGHT_OR_ROLE_NOT_REVIEWED|INDEPENDENT_T24_PRE_AND_WITNESS_SCOPE_DRIFT/);
  }
 });
 it("refuses app credentials, same role, mismatched DB and different DB host",()=>{
  const f=fixture();
  for(const invalid of [
   {P5_V39_PRE_DATABASE_URL:f.witUrl},
   {P5_V39_T24_WITNESS_DATABASE_URL:f.preUrl},
   {P5_V39_T24_WITNESS_DATABASE_URL:
     f.witUrl.replace("localhost","otherhost")},
   {P5_V39_T24_WITNESS_DATABASE_URL:
     f.witUrl.replace("/neondb","/otherdb")}
  ])expect(()=>admitted({...f.env,...invalid},f.packet,f.bytes))
   .toThrow(/NONCOMMISSIONED_OR_CROSS_SCOPE_LOGIN|DATABASE_NOT_DISTINCT_ROLES_SAME_DB/);
  expect(()=>admitted({...f.env,DATABASE_URL:f.preUrl},
   f.packet,f.bytes)).toThrow("ORDINARY_APPLICATION_WORKER_CREDENTIAL_REUSE");
 });
 it("uses trusted database clock and refuses late T24 with NO backfill",()=>{
  const cutoff=Date.parse("2027-01-29T12:00:00.000Z");
  expect(p5T24DueDecision(cutoff-180000,cutoff)).toBe("DUE");
  expect(p5T24DueDecision(cutoff-180001,cutoff)).toBe("WAIT");
  expect(()=>p5T24DueDecision(cutoff-1999,cutoff))
   .toThrow("MISSED_T24_CUTOFF_NO_BACKFILL_OR_RETRY");
 });
 it("waits only to due moment using simulated DB clock, no database or provider",async()=>{
  const cutoff=Date.parse("2027-01-29T12:00:00.000Z");
  const ticks=[new Date(cutoff-185000),new Date(cutoff-180000)];
  let n=0,slept=0;
  await waitForP5ActualT24DatabaseClock(cutoff,async()=>ticks[n++],
    async(ms)=>{slept+=ms;});
  expect(n).toBe(2);
  expect(slept).toBe(5000);
  await expect(waitForP5ActualT24DatabaseClock(cutoff,
    async()=>new Date(cutoff-91*60_000),async()=>{}))
   .rejects.toThrow("SIGNED_T24_JOB_STARTED_TOO_EARLY");
 });
});
