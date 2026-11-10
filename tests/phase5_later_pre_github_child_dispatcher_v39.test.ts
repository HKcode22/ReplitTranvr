import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {admitP5LaterPreAutoEnv,reviewP5LaterPreActualReadback,
 planP5LaterPreGithubChild,type P5LaterPreAutoPins,
 type P5LaterPreActualReadback}
 from "../server/lib/disruption/phase5LaterPreGithubChildDecision_v39";
import {digestP5Stage24ReviewedReceipt}
 from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import type {P5SignedWitnessedLaterPrePacket}
 from "../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";

const h=(s:string)=>s.repeat(64);
const code="e".repeat(40);
const path="data-collection/phase5/frozen/later_pre_alpha_0001.json";
const native="2027-02-10T12:00:00.000Z";
const when=(s:string)=>new Date(s);
const receiptBase={
 schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1" as const,
 snapshotId:"123456",flightInstanceId:"leg:fixture:100",
 selectedTNativeUtc:native,
 frozenT24CutoffUtc:"2027-02-09T12:00:00.000Z",
 expectedSelectedTVersion:"departure.scheduledTime.utc:ci:"+h("8"),
 t24OriginalFidsSha256:h("a"),t24SourceQueryDigestSha256:h("c"),
 t24FrameSha256:h("2"),t24ConfigSha256:h("3"),
 witnessDbObservedAtUtc:"2027-02-09T11:58:00.000Z",
 stage17PostCommitReadbackAtUtc:"2027-02-09T11:58:03.000Z"
};
const receipt={...receiptBase,receiptSha256:
 digestP5Stage24ReviewedReceipt(receiptBase)};
function fixture(){
 const p={
  manifestSha256:h("1"),queryDigestSha256:h("c"),
  expectedSourcePopulationQueryId:
   "a23e4567-e89b-42d3-a456-426614174000",
  expectedSourceResponseSha256:h("d"),
  runDayIndex:1,slot:"HUB",horizon:"T-6h" as const,airportIcao:"WSSS",
  flightInstanceId:"leg:fixture:100",expectedGithubSourceRunId:"42834567891",
  expectedReviewedReleaseSha256:h("e"),
  expectedReviewedSourceRightsSha256:h("6"),
  expectedProviderContractSha256:h("7"),expectedEarlyDrawSha256:h("9"),
  reviewedFrameSha256:h("2"),reviewedConfigSha256:h("3"),
  independentlyReviewedOperatingLegEvidenceSha256:h("4"),
  independentlyReviewedNativeTEvidenceSha256:h("5"),
  independentlyReviewedRunAndRetentionEvidenceSha256:h("0"),
  frozenBuilderSha256:h("f"),
  builderFrozenAtUtc:"2027-02-09T00:00:00.000Z",
  selectedTConfig:{
   milestone:"departure.scheduledTime.utc" as const,
   version:"ci",artifactHash:h("8"),
   verifiedProviderNativeSchedule:true,
   semanticsEvidenceSha256:h("5")
  },selectedTNativeUtc:native,maxPopulationStalenessSeconds:7200,
  expectedRestrictedPreWriterRole:P5_STAGE28_GROUPS.pre,
  identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG" as const,
  externalNativeTPhysicalLegAndSourceUseReviewed:true as const,
  reviewedT24WitnessReceipt:receipt
 };
 const packet:P5SignedWitnessedLaterPrePacket={
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:code,
  independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:p
 };
 const bytes=Buffer.from(JSON.stringify(packet));
 const pins:P5LaterPreAutoPins={
  path,codeSha:code,sha:createHash("sha256").update(bytes).digest("hex"),
  token:"gh-ci-not-real-abcdefghijklmnop",url:"postgresql://test"
 };
 const env={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_EVENT_NAME:"schedule",GITHUB_REF:"refs/heads/main",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  V39_P5_LATER_PRE_APPROVED_CODE_SHA:code,
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  AERODATABOX_WEBHOOK_SECRET:"",
  P5_LATER_PRE_AUTO_DISPATCH_ENABLED:"true",
  V39_P5_LATER_PRE_AUTO_DISPATCH_APPROVED:"1",
  V39_P5_LATER_PRE_OWNER_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  P5_LATER_PRE_FROZEN_PACKET_FILE:path,
  V39_P5_LATER_PRE_SIGNED_PACKET_SHA256:pins.sha,
  V39_P5_MANIFEST_SHA256:h("1"),V39_P5_QUERY_DIGEST:h("c"),
  V39_P5_RELEASE_SHA256:h("e"),V39_P5_RIGHTS_SHA256:h("6"),
  V39_P5_FRAME_HASH:h("2"),V39_P5_CONFIG_HASH:h("3"),
  V39_P5_NATIVE_T_SEMANTICS_SHA256:h("5"),
  V39_P5_LATER_PRE_T24_RECEIPT_SHA256:receipt.receiptSha256,
  P5_V39_PRE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:test@localhost:5432/neondb",
  GITHUB_TOKEN:"ci_fake_token_abcdefghijklmnopqrstuvwxyz"
 } as NodeJS.ProcessEnv;
 const original={
  manifest_sha256:p.manifestSha256,
  run_day_index:1,slot_id:"HUB",horizon:"T-6h",airport_icao:"WSSS",
  github_run_id:p.expectedGithubSourceRunId,
  attempt_run_id:p.expectedGithubSourceRunId,
  state:"ACTIVE",early_draw_sha256:p.expectedEarlyDrawSha256,
  reviewed_release_sha256:p.expectedReviewedReleaseSha256,
  rights_review_sha256:p.expectedReviewedSourceRightsSha256,
  provider_contract_sha256:p.expectedProviderContractSha256,
  population_query_id:p.expectedSourcePopulationQueryId,
  original_response_hash:p.expectedSourceResponseSha256,
  fids_response_hash:p.expectedSourceResponseSha256,
  fids_airport_icao:"WSSS",bound_rights:p.expectedReviewedSourceRightsSha256,
  original_current:true,normalized_members_count:1,
  source_available:when("2027-02-10T04:30:00.000Z"),
  reserved_at:when("2027-02-10T04:29:00.000Z"),
  fids_retrieval_utc:when("2027-02-10T04:29:15.000Z"),
  raw_persisted_at_utc:when("2027-02-10T04:29:20.000Z"),
  bound_at_utc:when("2027-02-10T04:31:00.000Z"),
  source_expires_at_utc:when("2027-02-10T10:00:00.000Z"),
  service_window_start_utc:when("2027-02-10T11:00:00.000Z"),
  service_window_end_utc:when("2027-02-10T13:00:00.000Z")
 };
 const member={
  population_query_id:p.expectedSourcePopulationQueryId,
  analytic_identity_id:p.flightInstanceId,
  canonical_flight_instance_id:p.flightInstanceId,
  source_airport_icao:"WSSS",dep_airport_icao:"WSSS",
  population_role:"requested_airport_primary",
  scope_classification:"confirmed_core",
  codeshare_resolution_status:"confirmed_operating_leg",
  source_type:"fids",response_hash:p.expectedSourceResponseSha256,
  provider_content_expired_at_utc:null,population_member_id:"member-1",
  dep_scheduled_utc:when(native),
  available_at:when("2027-02-10T04:30:10.000Z")
 };
 const witness={
  snapshot_id:"123456",joined_snapshot_id:"123456",
  flight_instance_id:p.flightInstanceId,
  selected_t_version:receipt.expectedSelectedTVersion,
  fids_response_hash:receipt.t24OriginalFidsSha256,
  source_query_digest:receipt.t24SourceQueryDigestSha256,
  frame_hash:receipt.t24FrameSha256,config_hash:receipt.t24ConfigSha256,
  source_t24_population_query_id:"a23e4567-e89b-42d3-a456-426614174000",
  snapshot_prediction_state:"PRE_DEPARTURE",snapshot_horizon:"T-24h",
  selected_t_native_utc:when(native),
  t24_cutoff_utc:when("2027-02-09T12:00:00.000Z"),
  post_pre_commit_db_observed_at_utc:when(receipt.witnessDbObservedAtUtc)
 };
 const actual:P5LaterPreActualReadback={
  observedDbClockUtc:when("2027-02-10T05:00:00.000Z"),
  actor:P5_STAGE28_GROUPS.pre,database:"neondb",readonly:"on",
  originalRows:[original],memberRows:[member],
  sameHorizonCount:0,t24SnapshotCount:1,witnessedT24Rows:[witness]
 };
 return{packet,bytes,pins,env,actual};
}
const plan=(f:ReturnType<typeof fixture>)=>
 reviewP5LaterPreActualReadback(f.bytes,f.packet,f.pins,f.actual,f.env);
describe("scheduled later PRE independent signed GH and real PG decision",()=>{
 it("requires true cron, pinned main, distinct PRE login, independent GO",()=>{
  const f=fixture();
  expect(admitP5LaterPreAutoEnv(f.env).path).toBe(path);
  for(const changed of [
   {GITHUB_EVENT_NAME:"workflow_dispatch"},
   {GITHUB_REF:"refs/pull/123/merge"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {V39_PHASE6_PROCESS_ARMED:"0"},
   {V39_PHASE5_FREEZE_SIGNED:"0"},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {V39_P5_LATER_PRE_AUTO_DISPATCH_APPROVED:"0"},
   {AERODATABOX_API_KEY:"no"},
   {P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"cross-privilege"}
  ])expect(()=>admitP5LaterPreAutoEnv({...f.env,...changed}))
    .toThrow("MAIN_RIGHTS_FREEZE_PAID_GO_OR_SIGNED_PACKET_ABSENT");
  expect(()=>admitP5LaterPreAutoEnv({...f.env,
    P5_V39_PRE_DATABASE_URL:"postgresql://runtime:x@localhost/neondb"}))
    .toThrow("PRE_ROLE_NOT_SEPARATELY_COMMISSIONED");
 });
 it("reuses actual bound provider original, physical member, T24 receipt",()=>{
  const d=plan(fixture());
  expect(d.status).toBe("LATER_PRE_READY_FOR_GITHUB_HISTORY");
  expect(d.cutoffUtc).toBe("2027-02-10T06:00:00.000Z");
  expect(d.evidenceTier).toBe("WITNESSED_T24_LATER");
  const decision=planP5LaterPreGithubChild(d,{total_count:0,workflow_runs:[]});
  expect(decision.shouldDispatch).toBe(true);
 });
 it("does not dispatch pending, future, already committed, too-late",()=>{
  const f=fixture();
  expect(plan({...f,actual:{...f.actual,originalRows:[]}}).status)
   .toBe("LATER_PRE_SOURCE_PENDING");
  expect(plan({...f,actual:{...f.actual,t24SnapshotCount:0,
    witnessedT24Rows:[]}}).status).toBe("LATER_PRE_WITNESS_PENDING");
  expect(plan({...f,actual:{...f.actual,sameHorizonCount:1}}).status)
   .toBe("LATER_PRE_ALREADY_SAVED_NO_CHILD");
  expect(plan({...f,actual:{...f.actual,
   observedDbClockUtc:when("2027-02-10T04:00:00.000Z")}}).status)
   .toBe("LATER_PRE_NOT_YET_WITHIN_LEAD");
  expect(plan({...f,actual:{...f.actual,
   observedDbClockUtc:when("2027-02-10T05:50:00.000Z")}}).status)
   .toBe("LATER_PRE_TOO_LATE_CENSOR");
 });
 it("rejects false source-original hash, spoofed native T, non-RO and ambiguous T24",()=>{
  const f=fixture();
  const o=f.actual.originalRows[0];
  const m=f.actual.memberRows[0];
  for(const changed of [
   {originalRows:[{...o,original_response_hash:h("f")}]},
   {memberRows:[{...m,scope_classification:"unknown"}]},
   {memberRows:[{...m,dep_scheduled_utc:when("2027-02-10T13:00:00.000Z")}]},
   {originalRows:[{...o,source_expires_at_utc:
    when("2027-02-10T05:00:00.000Z")}]},
  ])expect(()=>plan({...f,actual:{...f.actual,...changed}}))
    .toThrow("ACTUAL_PROVIDER_ORIGINAL_MEMBER_CLOCK_INVALID");
  expect(()=>plan({...f,actual:{...f.actual,readonly:"off" as "on"}}))
    .toThrow("NON_READONLY_OR_AMBIGUOUS_ACTUAL_PG_READBACK");
  expect(()=>plan({...f,actual:{...f.actual,t24SnapshotCount:2}}))
    .toThrow("UNSAFE_SNAPSHOT_OR_FROZEN_BUILDER");
 });
 it("requires exact GH child identity and bounded history; no blind retry",()=>{
  const d=plan(fixture());
  expect(()=>planP5LaterPreGithubChild(d,{total_count:101,workflow_runs:[]}))
   .toThrow("UNBOUNDED_GITHUB_LATER_PRE_HISTORY");
  expect(()=>planP5LaterPreGithubChild(d,{total_count:1,
    workflow_runs:[{id:2,display_title:"old manually ran",status:"completed",
      conclusion:"success",created_at:"2027-02-10T04:30:00Z"}]}))
   .toThrow("UNIDENTIFIABLE_PRIOR_LATER_PRE_ATTEMPT_HOLD");
  const repeated=planP5LaterPreGithubChild(d,{total_count:1,
   workflow_runs:[{id:2,display_title:"P5 LATER PRE "+path,
     status:"completed",conclusion:"failure",created_at:"2027-02-10T04:30:00Z"}]});
  expect(repeated.shouldDispatch).toBe(false);
  expect(repeated.status).toBe("EXISTING_LATER_PRE_CHILD_NEVER_BLIND_RETRY");
 });
 it("v2 missing-T24 still needs separate amendment and real no-T24 catalog",()=>{
  const f=fixture();
  const p={...f.packet.prePermit,reviewedT24WitnessReceipt:undefined,
   reviewedStandaloneLaterNoT24:{
    schema:"v39.phase5.standalone-later-asof-no-t24.v1" as const,
    reviewedProtocolSha256:h("b"),
    reviewedOriginalResponseSha256:f.packet.prePermit.expectedSourceResponseSha256,
    reviewedNativeTSemanticsSha256:
     f.packet.prePermit.independentlyReviewedNativeTEvidenceSha256,
    missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED" as const,
    independentLaterAsOfAndMissingnessReviewAttested:true as const
   }};
  const packet:P5SignedWitnessedLaterPrePacket={
   ...f.packet,prePermit:p,
   schema:"v39.phase5.github-standalone-later-pre-asof-reviewed.v2",
   independentlyReviewedLaterWithoutT24AsOfAttested:true,
   independentLaterHorizonAndT24ReviewAttested:undefined
  };
  const bytes=Buffer.from(JSON.stringify(packet));
  const pins={...f.pins,sha:createHash("sha256").update(bytes).digest("hex")};
  const actual={...f.actual,t24SnapshotCount:0,witnessedT24Rows:[]};
  const env={...f.env,
   V39_P5_STANDALONE_LATER_PRE_INDEPENDENT_APPROVED:"1",
   V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256:h("b")};
  const d=reviewP5LaterPreActualReadback(bytes,packet,pins,actual,env);
  expect(d.status).toBe("LATER_PRE_READY_FOR_GITHUB_HISTORY");
  expect(d.evidenceTier).toBe("STANDALONE_ASOF_T24_MISSING");
  expect(()=>reviewP5LaterPreActualReadback(bytes,packet,pins,actual,
   {...env,V39_P5_STANDALONE_LATER_PRE_INDEPENDENT_APPROVED:"0"}))
   .toThrow("INDEPENDENT_NO_T24_AMENDMENT_NOT_APPROVED");
  expect(()=>reviewP5LaterPreActualReadback(bytes,packet,pins,
    {...actual,t24SnapshotCount:1},env))
   .toThrow("STANDALONE_PATH_AMBIGUOUS_EXISTING_T24");
 });
});
