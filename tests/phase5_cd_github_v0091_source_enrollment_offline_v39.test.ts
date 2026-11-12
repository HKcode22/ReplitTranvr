import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 requireP5CdGithubSourceEnrollRelease
} from "../server/lib/disruption/phase5CdGithubSourceEnrollGate_v39";
import {
 verifyP5CdOneFrozenSourceEnrollment,
 registerOneP5CdGithubSourceFlightV39
} from "../server/lib/disruption/phase5CdGithubSourceEnrollV0091_v39";
import {digestP5Stage24ReviewedReceipt}
 from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import type {P5CdFrozenRoster}
 from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";

const H=(x:string)=>x.repeat(64);
const SHA="a".repeat(40);
const id="leg:ci:cd:v0091:001",qid="c23e4567-e89b-42d3-a456-426614174013";
const native="2035-11-25T12:00:00.000Z";
const frame=H("3"),config=H("2"),rights=H("d"),manifest=H("a");
const query=H("b"),response=H("c"),art=H("6");
const file="data-collection/phase5/frozen/ci_v39_cd_v0091_packet.json";
const sum=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",
 GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",
 GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_RUN_ATTEMPT:"1",
 GITHUB_SHA:SHA,
 P5_CD_GH_ENROLL_APPROVED_CODE_SHA:SHA,
 P5_CD_GH_ENROLL_CONFIRM:"REGISTER_ONE_BOUND_EXISTING_FIDS_ORIGINAL_NO_PROVIDER",
 P5_CD_GH_ENROLL_ARMED:"1",
 P5_CD_GH_ENROLL_APPROVED:"1",
 P5_CD_GH_ENROLL_STOP:"0",
 P5_CD_GH_PRE_STOP:"0",
 P5_CD_GH_PRE_MODE:"PHASE5_CANARY",
 P5_CD_GH_PHASE5_CANARY_APPROVED:"1",
 V39_PHASE6_PROCESS_ARMED:"0",
 V39_PHASE5_FREEZE_SIGNED:"0",
 V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 ADB_AUTO_COLLECT:"0",
 P5_CD_GH_PRE_ROSTER_SHA256:H("e"),
 P5_CD_GH_ENROLL_PACKET_SHA256:H("f"),
 V39_P5_MANIFEST_SHA256:manifest,
 V39_P5_RIGHTS_SHA256:rights,
 P5_V39_PREPARE_DATABASE_URL:
  "postgresql://phase5_p30_prepare_login_20261107:ci-only@reviewed.example.com/neondb?sslmode=verify-full"
});
function fixture(){
 const selectedTConfig={
  milestone:"departure.scheduledTime.utc" as const,
  version:"ci-native-t",artifactHash:art,
  verifiedProviderNativeSchedule:true as const,
  semanticsEvidenceSha256:H("7")
 };
 const original={
  schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1" as const,
  snapshotId:"11",flightInstanceId:id,selectedTNativeUtc:native,
  frozenT24CutoffUtc:"2035-11-24T12:00:00.000Z",
  expectedSelectedTVersion:selectedTConfig.milestone+":"+
   selectedTConfig.version+":"+selectedTConfig.artifactHash,
  t24OriginalFidsSha256:H("1"),t24SourceQueryDigestSha256:H("2"),
  t24FrameSha256:frame,t24ConfigSha256:config,
  witnessDbObservedAtUtc:"2035-11-24T11:57:30.000Z",
  stage17PostCommitReadbackAtUtc:"2035-11-24T11:57:45.000Z"
 };
 const permit={
  manifestSha256:manifest,queryDigestSha256:query,
  expectedSourcePopulationQueryId:qid,
  expectedSourceResponseSha256:response,
  runDayIndex:1,slot:"HUB",
  horizon:"T-6h" as const,airportIcao:"WSSS",
  flightInstanceId:id,expectedGithubSourceRunId:"42363348888",
  expectedReviewedReleaseSha256:H("5"),
  expectedReviewedSourceRightsSha256:rights,
  expectedProviderContractSha256:H("4"),
  expectedEarlyDrawSha256:H("8"),
  reviewedFrameSha256:frame,
  reviewedConfigSha256:config,
  independentlyReviewedOperatingLegEvidenceSha256:H("8"),
  independentlyReviewedNativeTEvidenceSha256:H("7"),
  independentlyReviewedRunAndRetentionEvidenceSha256:H("9"),
  frozenBuilderSha256:H("c"),builderFrozenAtUtc:"2035-11-24T04:00:00.000Z",
  selectedTConfig,selectedTNativeUtc:native,
  maxPopulationStalenessSeconds:3600,
  expectedRestrictedPreWriterRole:"phase5_fids_pre_writer_prod_20261107",
  externalNativeTPhysicalLegAndSourceUseReviewed:true as const,
  reviewedT24WitnessReceipt:{
   ...original,receiptSha256:digestP5Stage24ReviewedReceipt(original)
  }
 };
 const rawPacket=Buffer.from(JSON.stringify({
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:SHA,
  independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:permit
 }));
 const digest=sum(rawPacket);
 const roster:P5CdFrozenRoster={
  schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1",
  reviewedCodeSha:SHA,manifestSha256:manifest,rightsSha256:rights,
  entries:[{filePath:file,packetSha256:digest}]
 };
 const rawRoster=Buffer.from(JSON.stringify(roster));
 const e={...env(),
  P5_CD_GH_PRE_ROSTER_SHA256:sum(rawRoster),
  P5_CD_GH_ENROLL_PACKET_SHA256:digest
 };
 const release=requireP5CdGithubSourceEnrollRelease(e);
 const entries=[{filePath:file,packetSha256:digest,bytes:rawPacket}];
 return {permit,roster,rawRoster,release,entries,e,digest};
}
describe("Phase5 real V0091 GH PREPARE-only registration from signed V0079 original",()=>{
 it("admits explicit bounded Phase5 canary without Phase6 paid activation",()=>{
  const g=requireP5CdGithubSourceEnrollRelease(env());
  expect(g.releaseMode).toBe("PHASE5_CANARY");
  expect(g.paidProviderCalls).toBe(0);
  expect(g.phase6GoGrantedHere).toBe(false);
 });
 it.each([
  ["STOP",{P5_CD_GH_ENROLL_STOP:"1"}],
  ["global PRE STOP",{P5_CD_GH_PRE_STOP:"1"}],
  ["absent reviewer approval",{P5_CD_GH_ENROLL_APPROVED:""}],
  ["absent owner arm",{P5_CD_GH_ENROLL_ARMED:""}],
  ["different code SHA",{GITHUB_SHA:"b".repeat(40)}],
  ["wrong branch",{GITHUB_REF:"refs/pull/100/merge"}],
  ["wrong repository",{GITHUB_REPOSITORY:"evil/fork"}],
  ["wrong event",{GITHUB_EVENT_NAME:"pull_request"}],
  ["retry",{GITHUB_RUN_ATTEMPT:"2"}],
  ["wrong mode",{P5_CD_GH_PRE_MODE:"PHASE6_APPROVED"}],
  ["no independent source rights",{V39_PHASE5_SOURCE_RIGHTS_APPROVED:""}],
  ["unexpected paid provider",{AERODATABOX_API_KEY:"secret"}],
  ["PRE credential present",{P5_V39_PRE_DATABASE_URL:"not-allowed"}],
  ["source credential present",{V39_P5_SOURCE_DATABASE_URL:"not-allowed"}],
  ["wrong DB user",{P5_V39_PREPARE_DATABASE_URL:
   "postgresql://travnr_runtime:x@reviewed.example.com/neondb"}],
  ["local DB",{P5_V39_PREPARE_DATABASE_URL:
   "postgresql://phase5_p30_prepare_login_20261107:x@localhost:5432/neondb"}],
  ["no source manifest",{V39_P5_MANIFEST_SHA256:""}],
  ["unreviewed packet hash",{P5_CD_GH_ENROLL_PACKET_SHA256:"invalid"}]
 ])("fails closed for %s",(_name,change)=>{
  expect(()=>requireP5CdGithubSourceEnrollRelease({...env(),...change}))
   .toThrow("REFUSED_P5_CD_GH_SOURCE_ENROLL");
 });
 it("verifies complete original Stage14 witnessed T6 permit before SQL",()=>{
  const f=fixture();
  const p=verifyP5CdOneFrozenSourceEnrollment(
   f.release,f.rawRoster,f.roster,f.entries);
  expect(p.permit.flightInstanceId).toBe(id);
  expect(p.packetSha256).toBe(f.digest);
 });
 it("rejects forged T24 witness digest and source-rights drift",()=>{
  const f=fixture();
  const changed=JSON.parse(f.entries[0].bytes.toString("utf8"));
  changed.prePermit.reviewedT24WitnessReceipt.receiptSha256=H("f");
  const bytes=Buffer.from(JSON.stringify(changed)),packetHash=sum(bytes);
  const roster={...f.roster,entries:[{filePath:file,packetSha256:packetHash}]};
  const rawRoster=Buffer.from(JSON.stringify(roster));
  expect(()=>verifyP5CdOneFrozenSourceEnrollment(
   {...f.release,rosterSha256:sum(rawRoster),packetSha256:packetHash},
   rawRoster,roster,[{filePath:file,packetSha256:packetHash,bytes}]
  )).toThrow("EXTERNAL_T24_STAGE17_RECEIPT_DIGEST_OR_NATIVE_T_DRIFT");
  expect(()=>verifyP5CdOneFrozenSourceEnrollment(
   {...f.release,rightsSha256:H("0")},
   f.rawRoster,f.roster,f.entries
  )).toThrow("FROZEN_ROSTER_NOT_INDEPENDENTLY_PINNED");
 });
 it("calls only V0091 source registration SQL with exact saved original and ZERO paid GET",async()=>{
  const f=fixture();let n=0;
  const db={query:async(sql:string,args?:unknown[])=>{
   n++;
   expect(sql).toContain("clean.phase5_cd_register_source_flight_v39");
   expect(sql).not.toContain("INSERT INTO clean.phase5_cd_pre_task_v39");
   expect(args).toEqual([
    manifest,query,id,"T-6h",native,f.digest,qid,response,rights,3600
   ]);
   return{rows:[{task_id:"27"}]};
  }};
  const p=verifyP5CdOneFrozenSourceEnrollment(
   f.release,f.rawRoster,f.roster,f.entries);
  const out=await registerOneP5CdGithubSourceFlightV39(f.e,db,p);
  expect(out.taskId).toBe("27");
  expect(out.status).toBe(
   "REGISTERED_RETURNED_TASK_ID_INDEPENDENT_READBACK_PENDING");
  expect(out.independentDatabaseReadbackHere).toBe(false);
  expect(out.providerCalls).toBe(0);
  expect(n).toBe(1);
 });
 it("unknown INSERT ACK stays HOLD with no blind repeat",async()=>{
  const f=fixture();let calls=0;
  const db={query:async()=>{calls++;throw Error("connection reset after unknown commit")}};
  const p=verifyP5CdOneFrozenSourceEnrollment(
   f.release,f.rawRoster,f.roster,f.entries);
  await expect(registerOneP5CdGithubSourceFlightV39(f.e,db,p))
   .rejects.toThrow("REGISTRATION_RESULT_OR_COMMIT_UNKNOWN_INDEPENDENT_AUDIT_NO_RETRY");
  expect(calls).toBe(1);
 });
 it("refuses invalid DB task id without retry",async()=>{
  const f=fixture();
  const p=verifyP5CdOneFrozenSourceEnrollment(
   f.release,f.rawRoster,f.roster,f.entries);
  await expect(registerOneP5CdGithubSourceFlightV39(f.e,
   {query:async()=>({rows:[{task_id:null}]})},p))
   .rejects.toThrow("REGISTRATION_TASK_ACK_AMBIGUOUS_INDEPENDENT_AUDIT_NO_RETRY");
 });
});
