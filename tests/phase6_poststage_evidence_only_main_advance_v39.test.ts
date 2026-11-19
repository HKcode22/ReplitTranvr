import {describe,it,expect} from "vitest";
import {verifyP6PostStageEvidenceOnlyMainAdvance,verifyP6PostStageReviewedBridgeAdvance,
 verifyP6DeferredActivationPredecessors,
 P6_POST_STAGE_REVIEWED_BRIDGE_SELF_SHA256,P6_POST_STAGE_REVIEWED_BRIDGE_COMPANION_BLOBS} from
 "../scripts/v39_phase6_enable_source_owner_v39";

const STAGE="a".repeat(40),HEAD="b".repeat(40);
const LEDGER="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json";
const RIGHTS="data-collection/phase5/evidence/2026-11-19_actual_source_rights_activation_review.json";
const SCIENCE="data-collection/phase5/evidence/2026-11-19_final_scientific_freeze_receipt.md";

describe("Phase6 deferred source-rights evidence-only main continuity",()=>{
 it("accepts unchanged staged main",()=>{
  expect(verifyP6PostStageEvidenceOnlyMainAdvance(STAGE,STAGE,[],true)).
   toEqual({stageCode:STAGE,currentHead:STAGE,evidenceOnlyAdvance:false,changedPaths:0});
 });
 it("accepts only a descendant containing scoped evidence and the dedicated approval ledger",()=>{
  expect(verifyP6PostStageEvidenceOnlyMainAdvance(STAGE,HEAD,[RIGHTS,SCIENCE,LEDGER],true)).
   toEqual({stageCode:STAGE,currentHead:HEAD,evidenceOnlyAdvance:true,changedPaths:3});
 });
 it.each([
  ["executable script",["scripts/v39_phase6_enable_source_owner_v39.ts"]],
  ["workflow",[".github/workflows/phase6-source.yml"]],
  ["runtime config",["package-lock.json"]],
  ["other ledger",["data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md"]],
  ["planning bytes",["data-collection/phase5/planning/phase6-source-day-01.json"]],
  ["wrong evidence directory",["data-collection/phase6/evidence/source-rights.json"]]
 ])("rejects %s changes",(_name,paths)=>{
  expect(()=>verifyP6PostStageEvidenceOnlyMainAdvance(STAGE,HEAD,paths,true)).
   toThrow("HOLD_P6_EXACT_SOURCE_AUTH_POST_STAGE_MAIN_NOT_EVIDENCE_ONLY_DESCENDANT");
 });
 it("rejects a non-descendant even when paths are evidence-only",()=>{
  expect(()=>verifyP6PostStageEvidenceOnlyMainAdvance(STAGE,HEAD,[RIGHTS,LEDGER],false)).
   toThrow("HOLD_P6_EXACT_SOURCE_AUTH_POST_STAGE_MAIN_NOT_EVIDENCE_ONLY_DESCENDANT");
 });
 it("rejects synthetic diffs when the SHA did not move",()=>{
  expect(()=>verifyP6PostStageEvidenceOnlyMainAdvance(STAGE,STAGE,[RIGHTS],true)).
   toThrow("HOLD_P6_EXACT_SOURCE_AUTH_POST_STAGE_IDENTICAL_MAIN_HAS_DIFF");
 });
});


describe("Phase6 reviewed post-stage bridge integrity",()=>{
 const STAGED="ae0915d1eb0c37651d280ff3f178efdb640ed509";
 const SCRIPT="scripts/v39_phase6_enable_source_owner_v39.ts";
 const P5TEST="tests/phase5_source_rights_deferred_to_phase6_activation_v39.test.mjs";
 const P6TEST="tests/phase6_poststage_evidence_only_main_advance_v39.test.ts";
 const V9TEST="tests/phase5_v0093_cost_only_inert_seven_rest_freeze_pg16_v39.test.ts";
 const SELF=P6_POST_STAGE_REVIEWED_BRIDGE_SELF_SHA256;
 const BLOBS=P6_POST_STAGE_REVIEWED_BRIDGE_COMPANION_BLOBS;
 const PATHS=[SCRIPT,...Object.keys(BLOBS).sort()];
 it("accepts the exact reviewed bridge",()=>{
  expect(verifyP6PostStageReviewedBridgeAdvance({
   stageCode:STAGED,currentHead:"b".repeat(40),stageIsAncestor:true,
   changedPaths:PATHS,currentBridgeBlobs:BLOBS,selfNormalizedSha256:SELF
  })).toEqual({stageCode:STAGED,currentHead:"b".repeat(40),reviewedBridgeApplied:true,
   reviewedBridgePaths:Object.keys(BLOBS).length+1,evidenceOnlyChangedPaths:0});
 });
 it("pins the complete Phase 7 retention successor as reviewed bridge input",()=>{
  expect(BLOBS).toMatchObject({
   "server/lib/disruption/phase6DerivedTrainingReleaseContract_v39.ts":"7c01a7f4a67ff72888f63b7dce23621092af4c68",
   "server/lib/disruption/phase6DerivedTrainingReleasePacket_v39.ts":"83053982738a2f57162bf2aa491841c1edfd355b",
   "tests/phase6_derived_training_release_contract_v39.test.ts":"834b53e5e061d3caf924b916e059f7fd3afb7d26",
   "tests/phase6_derived_training_release_packet_v39.test.ts":"2721708b73e719a58bf4667b37e3e60a65c10ad9",
   "data-collection/phase5/2026-11-19_PHASE6_EPHEMERAL_SOURCE_AND_PHASE7_MODEL_RELEASE_PROFILE_DRAFT.md":"b2a47de5570158e67edd01c64c034fc1c0111fee",
   "data-collection/phase5/2026-11-19_PHASE6_SECOND_RETENTION_PHASE7_DERIVED_RELEASE_PACKET.md":"c0d8e2230aa31705e0c942b4402043d021f73972",
   "server/lib/disruption/phase7DerivedReleaseWriter_v39.ts":"3cb110701d01c2ca733509c373b57dcb9ffb0071",
   "tests/phase7_derived_release_writer_v39.test.ts":"8388385f85cb90311daf218d2d0c21155fc7f458",
   "server/lib/disruption/phase7ReviewedSourceTransformation_v39.ts":"5140030b8e98567b0b2c2ed95a505274572f9089",
   "tests/phase7_reviewed_source_transformation_v39.test.ts":"1382be1bcc0f70a5fe45c20921f70840118dd574"
  });
 });
 it("accepts only evidence/ledger changes in addition to the exact bridge",()=>{
  expect(verifyP6PostStageReviewedBridgeAdvance({
   stageCode:STAGED,currentHead:"c".repeat(40),stageIsAncestor:true,
   changedPaths:[...PATHS,RIGHTS,LEDGER],currentBridgeBlobs:BLOBS,selfNormalizedSha256:SELF
  })).toMatchObject({reviewedBridgeApplied:true,evidenceOnlyChangedPaths:2});
 });
 it("rejects a changed normalized activation script",()=>{
  expect(()=>verifyP6PostStageReviewedBridgeAdvance({
   stageCode:STAGED,currentHead:"d".repeat(40),stageIsAncestor:true,
   changedPaths:PATHS,currentBridgeBlobs:BLOBS,selfNormalizedSha256:"f".repeat(64)
  })).toThrow("HOLD_P6_EXACT_SOURCE_AUTH_POST_STAGE_REVIEWED_BRIDGE_SELF_CHANGED");
 });
 it("rejects a changed companion bridge blob",()=>{
  expect(()=>verifyP6PostStageReviewedBridgeAdvance({
   stageCode:STAGED,currentHead:"d".repeat(40),stageIsAncestor:true,
   changedPaths:PATHS,currentBridgeBlobs:{...BLOBS,[P6TEST]:"f".repeat(40)},selfNormalizedSha256:SELF
  })).toThrow("HOLD_P6_EXACT_SOURCE_AUTH_POST_STAGE_REVIEWED_BRIDGE_BLOB_CHANGED");
 });
 it("rejects executable changes outside the reviewed bridge",()=>{
  expect(()=>verifyP6PostStageReviewedBridgeAdvance({
   stageCode:STAGED,currentHead:"e".repeat(40),stageIsAncestor:true,
   changedPaths:[...PATHS,"package-lock.json"],currentBridgeBlobs:BLOBS,selfNormalizedSha256:SELF
  })).toThrow("HOLD_P6_EXACT_SOURCE_AUTH_POST_STAGE_AFTER_BRIDGE_NOT_EVIDENCE_ONLY");
 });
 it("rejects missing bridge paths",()=>{
  expect(()=>verifyP6PostStageReviewedBridgeAdvance({
   stageCode:STAGED,currentHead:"e".repeat(40),stageIsAncestor:true,
   changedPaths:[P5TEST,P6TEST],currentBridgeBlobs:BLOBS,selfNormalizedSha256:SELF
  })).toThrow("HOLD_P6_EXACT_SOURCE_AUTH_POST_STAGE_AFTER_BRIDGE_NOT_EVIDENCE_ONLY");
 });
});


describe("Phase6 deferred source-rights predecessor extension",()=>{
 const staged=[
  "RUN-20261119-FINALOWNERMETADATA",
  "RUN-20261119-NATIVECOREPREARMREVIEW",
  "RUN-20261119-CURRENTGITHUBSTOP"
 ];
 it("preserves the frozen predecessor chain as an ordered prefix and appends later evidence",()=>{
  expect(verifyP6DeferredActivationPredecessors(staged,[...staged,"RUN-20261119-SOURCEUSE"])).
   toEqual({stagedPredecessors:3,activationPredecessors:4,appendedPredecessors:1});
 });
 it.each([
  ["identical list",staged],
  ["removed staged evidence",[staged[0],staged[2],"RUN-20261119-SOURCEUSE"]],
  ["reordered staged evidence",[staged[1],staged[0],staged[2],"RUN-20261119-SOURCEUSE"]],
  ["prefixed new evidence",["RUN-20261119-SOURCEUSE",...staged]]
 ])("rejects %s",(_name,actual)=>{
  expect(()=>verifyP6DeferredActivationPredecessors(staged,actual)).
   toThrow("HOLD_P6_EXACT_SOURCE_AUTH_DEFERRED_PREDECESSOR_EXTENSION_REQUIRED");
 });
});
