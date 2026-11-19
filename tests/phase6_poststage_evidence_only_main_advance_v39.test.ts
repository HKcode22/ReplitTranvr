import {describe,it,expect} from "vitest";
import {verifyP6PostStageEvidenceOnlyMainAdvance} from
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
