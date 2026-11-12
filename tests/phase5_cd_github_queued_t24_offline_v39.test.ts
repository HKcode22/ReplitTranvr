import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 verifyP5CdFrozenRoster,type P5CdFrozenRoster
} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
import {
 requireP5CdGithubPreRelease
} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import {runP5CdOneQueuedT24Witness,requireP5CdT24DispatchEvent}
 from "../server/lib/disruption/phase5CdGithubQueuedT24Witness_v39";
import type {P5Stage14SingleFlightPrePermit}
 from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
const h=(x:string)=>x.repeat(64);
const code="a".repeat(40),native="2035-11-25T12:00:00.000Z";
const path="data-collection/phase5/frozen/ci_queued_t24_01.json";
const qid="c23e4567-e89b-42d3-a456-426614174013";
function fixture(){
 const permit={
  manifestSha256:h("a"),queryDigestSha256:h("b"),
  expectedSourcePopulationQueryId:qid,
  expectedSourceResponseSha256:h("c"),
  runDayIndex:1,slot:"HUB",horizon:"T-24h",
  airportIcao:"WSSS",flightInstanceId:"leg:ci:t24:001",
  expectedGithubSourceRunId:"42363348888",
  expectedReviewedReleaseSha256:h("4"),
  expectedReviewedSourceRightsSha256:h("d"),
  expectedProviderContractSha256:h("5"),
  expectedEarlyDrawSha256:h("6"),
  reviewedFrameSha256:h("7"),reviewedConfigSha256:h("8"),
  independentlyReviewedOperatingLegEvidenceSha256:h("9"),
  independentlyReviewedNativeTEvidenceSha256:h("e"),
  independentlyReviewedRunAndRetentionEvidenceSha256:h("f"),
  frozenBuilderSha256:h("b"),
  builderFrozenAtUtc:"2035-11-24T10:00:00.000Z",
  selectedTConfig:{
   milestone:"departure.scheduledTime.utc",version:"ci-t24",
   artifactHash:h("3"),verifiedProviderNativeSchedule:true,
   semanticsEvidenceSha256:h("e")
  },
  selectedTNativeUtc:native,
  maxPopulationStalenessSeconds:3600,
  expectedRestrictedPreWriterRole:
   "phase5_fids_pre_writer_prod_20261107",
  externalNativeTPhysicalLegAndSourceUseReviewed:true
 } satisfies P5Stage14SingleFlightPrePermit;
 const witnessReview={
  flightInstanceId:permit.flightInstanceId,
  sourcePopulationQueryId:qid,
  expectedSourceResponseSha256:permit.expectedSourceResponseSha256,
  expectedSourceQueryDigestSha256:permit.queryDigestSha256,
  expectedFrameSha256:permit.reviewedFrameSha256,
  expectedConfigSha256:permit.reviewedConfigSha256,
  selectedTNativeUtc:native,
  expectedT24CutoffUtc:"2035-11-24T12:00:00.000Z",
  expectedSelectedTVersion:
   "departure.scheduledTime.utc:ci-t24:"+h("3"),
  expectedWitnessOnlyRole:
   "phase5_fids_t24_witness_prod_20261107"
 };
 const json=Buffer.from(JSON.stringify({
  schema:"v39.phase5.github-native-t24-pre-witness-reviewed.v1",
  reviewedCodeSha:code,
  independentNativeT24AndSourceReviewAttested:true,
  prePermit:permit,witnessReview
 }));
 const digest=createHash("sha256").update(json).digest("hex");
 const roster:P5CdFrozenRoster={
  schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1",
  reviewedCodeSha:code,manifestSha256:h("a"),rightsSha256:h("d"),
  entries:[{filePath:path,packetSha256:digest}]
 };
 const bytes=Buffer.from(JSON.stringify(roster));
 const hash=createHash("sha256").update(bytes).digest("hex");
 const env:NodeJS.ProcessEnv={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",
  GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",
  GITHUB_SHA:code,
  P5_CD_GH_PRE_APPROVED_CODE_SHA:code,
  P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,
  P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
  P5_CD_GH_PRE_ARMED:"1",P5_CD_GH_PRE_STOP:"0",
  P5_CD_GH_PRE_MODE:"PHASE5_CANARY",
  P5_CD_GH_PHASE5_CANARY_APPROVED:"1",
  P5_CD_GH_T24_WITNESS_APPROVED:"1",
  P5_CD_GH_T24_ONE_FLIGHT_CONFIRM:
   "ONE_REVIEWED_SOURCE_QUEUED_T24_PRE_AND_INDEPENDENT_WITNESS_NO_PROVIDER",
  V39_PHASE5_FREEZE_SIGNED:"0",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"0",ADB_AUTO_COLLECT:"0",
  P5_CD_GH_PRE_ROSTER_SHA256:hash,
  V39_P5_RIGHTS_SHA256:h("d"),V39_P5_MANIFEST_SHA256:h("a"),
  GITHUB_RUN_ID:"12345678",
  P5_V39_PRE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:secret@reviewed.example.com/neondb?sslmode=verify-full",
  P5_V39_T24_WITNESS_DATABASE_URL:
   "postgresql://phase5_p30_witness_login_20261107:secret@reviewed.example.com/neondb?sslmode=verify-full"
 };
 return{permit,witnessReview,json,digest,roster,bytes,hash,env};
}
describe("Phase5 true queued T24 Stage14 and separate Stage17 witness handoff",()=>{
 it("rejects T24 under later-only default, allows only explicit T24+independent witness roster",()=>{
  const f=fixture();
  const release=requireP5CdGithubPreRelease(f.env,{
   allowReviewedT24Witness:true});
  const packet={filePath:path,packetSha256:f.digest,bytes:f.json};
  expect(()=>verifyP5CdFrozenRoster(
   f.bytes,f.roster,[packet],release
  )).toThrow("T24_WITNESS_OR_STANDALONE_LATER_CHAIN_NOT_YET_CONNECTED");
  const roster=verifyP5CdFrozenRoster(
   f.bytes,f.roster,[packet],release,"T24_WITH_SEPARATE_WITNESS");
  expect(roster.size).toBe(1);
  expect(roster.get(f.digest)?.witnessReview?.flightInstanceId)
   .toBe(f.permit.flightInstanceId);
 });
 it("rejects altered independent T24 witness fields even with self-consistent packet SHA",()=>{
  const f=fixture();
  const packet=JSON.parse(f.json.toString("utf8"));
  packet.witnessReview.expectedT24CutoffUtc="2035-11-24T12:01:00.000Z";
  const bytes=Buffer.from(JSON.stringify(packet));
  const hash=createHash("sha256").update(bytes).digest("hex");
  const roster={...f.roster,
   entries:[{filePath:path,packetSha256:hash}]};
  const rosterBytes=Buffer.from(JSON.stringify(roster));
  const release={
   ...requireP5CdGithubPreRelease(f.env,{allowReviewedT24Witness:true}),
   rosterSha256:createHash("sha256").update(rosterBytes).digest("hex")
  };
  expect(()=>verifyP5CdFrozenRoster(rosterBytes,roster,
   [{filePath:path,packetSha256:hash,bytes}],release,
   "T24_WITH_SEPARATE_WITNESS"))
   .toThrow("INDEPENDENT_T24_PRE_AND_WITNESS_SCOPE_DRIFT");
 });
 it("never accepts PRE credential as witness, missing separate approval or an unreviewed host",()=>{
  const f=fixture();
  for(const patch of [
   {P5_CD_GH_T24_WITNESS_APPROVED:"0"},
   {P5_V39_T24_WITNESS_DATABASE_URL:f.env.P5_V39_PRE_DATABASE_URL},
   {P5_V39_T24_WITNESS_DATABASE_URL:
    "postgresql://phase5_p30_witness_login_20261107:secret@another.example.com/neondb"},
   {P5_V39_T24_WITNESS_DATABASE_URL:""}
  ]){
   expect(()=>requireP5CdGithubPreRelease({
    ...f.env,...patch
   },{allowReviewedT24Witness:true})).toThrow("REFUSED_P5_CD_GITHUB_PRE_");
  }
  expect(()=>requireP5CdGithubPreRelease(f.env))
   .toThrow("REFUSED_P5_CD_GITHUB_PRE_");
 });
 it("STOP prevents any queued claim, PRE or witness DB call",async()=>{
  const f=fixture();
  let calls=0;
  const db={query:async()=>{calls++;throw Error("MUST_NOT_CALL_DB");}};
  const pool={connect:async()=>{calls++;throw Error("MUST_NOT_CONNECT");}};
  await expect(runP5CdOneQueuedT24Witness({
   ...f.env,P5_CD_GH_PRE_STOP:"1"
  },{
   preDb:db,prePool:pool as any,
   witnessPool:{...pool} as any,
   rosterBytes:f.bytes,roster:f.roster,
   files:[{filePath:path,packetSha256:f.digest,bytes:f.json}]
  })).rejects.toThrow("REFUSED_P5_CD_GITHUB_PRE_");
  expect(calls).toBe(0);
 });
 it("refuses mismatched PRE and independent witness pools before DB claims",async()=>{
  const f=fixture();
  const pool={connect:async()=>{throw Error("MUST_NOT_CONNECT");}};
  const db={query:async()=>{throw Error("MUST_NOT_QUERY");}};
  await expect(runP5CdOneQueuedT24Witness(f.env,{
   preDb:db,prePool:pool as any,witnessPool:pool as any,
   rosterBytes:f.bytes,roster:f.roster,
   files:[{filePath:path,packetSha256:f.digest,bytes:f.json}]
  })).rejects.toThrow("DISTINCT_PRE_WITNESS_OR_SINGLE_FROZEN_PACKET_REQUIRED");
 });
 it("keeps automatic T24 separately STOP-default and refuses unapproved event",()=>{
  const f=fixture();
  expect(requireP5CdT24DispatchEvent(f.env)).toBe("MANUAL");
  const scheduled={...f.env,GITHUB_EVENT_NAME:"schedule",
   P5_CD_GH_T24_SCHEDULE_ENABLED:"0"};
  expect(()=>requireP5CdT24DispatchEvent(scheduled))
   .toThrow("T24_UNREVIEWED_EVENT_OR_SCHEDULE_DISABLED");
  expect(requireP5CdT24DispatchEvent({
   ...scheduled,P5_CD_GH_T24_SCHEDULE_ENABLED:"1"
  })).toBe("SCHEDULED");
  expect(()=>requireP5CdT24DispatchEvent({
   ...scheduled,P5_CD_GH_T24_SCHEDULE_ENABLED:"1",
   P5_CD_GH_T24_ONE_FLIGHT_CONFIRM:""
  })).toThrow("T24_EXACT_CONFIRMATION_REQUIRED");
  expect(()=>requireP5CdT24DispatchEvent({
   ...scheduled,P5_CD_GH_T24_SCHEDULE_ENABLED:"1",
   GITHUB_EVENT_NAME:"pull_request"
  })).toThrow("T24_UNREVIEWED_EVENT_OR_SCHEDULE_DISABLED");
 });
 it("scheduled mode still refuses STOP before any queue read or claim",async()=>{
  const f=fixture();
  let q=0;const db={query:async()=>{q++;throw Error("DB_FORBIDDEN");}};
  const pool={connect:async()=>{q++;throw Error("POOL_FORBIDDEN");}};
  await expect(runP5CdOneQueuedT24Witness({
   ...f.env,GITHUB_EVENT_NAME:"schedule",
   P5_CD_GH_T24_SCHEDULE_ENABLED:"1",P5_CD_GH_PRE_STOP:"1"
  },{
   preDb:db,prePool:pool as any,witnessPool:{...pool} as any,
   rosterBytes:f.bytes,roster:f.roster,
   files:[{filePath:path,packetSha256:f.digest,bytes:f.json}]
  })).rejects.toThrow("REFUSED_P5_CD_GITHUB_PRE_");
  expect(q).toBe(0);
 });
});
