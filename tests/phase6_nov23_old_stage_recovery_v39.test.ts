import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {recoverP6Nov22StageInputFromCommittedEvidence} from "../review-tools/p6_nov23_prospective_revision_owner_v39";
import {P6_NOV22_STAGE_CODE,P6_NOV22_STAGE_SHA,P6_NOV22_COST_SHA} from "../scripts/v39_phase6_revised_stage_executable_bridge_v39";

const digest=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");

describe("Gate 5 exact Nov22 private-stage recovery from committed evidence",()=>{
 it("reconstructs byte-identical historical stage and cost without private files",()=>{
  const r=recoverP6Nov22StageInputFromCommittedEvidence();
  expect(digest(r.input)).toBe(P6_NOV22_STAGE_SHA);
  expect(r.costSha256).toBe(P6_NOV22_COST_SHA);
  expect(r.input.codeSha40).toBe(P6_NOV22_STAGE_CODE);
  expect(r.input.manifestSha256).toBe("3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7");
  expect(r.input.configSha256).toBe("001a3f0634cc41b8d1327be36404efa74feaaea21fe4ef6eead7e993acaf4c88");
  expect(r.input.calendarSha256).toBe("9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6");
  expect(r.input.phase6AuthorizationId).toBe("AUTH-20261119-P5INERTFREEZE");
  expect(r.input.predecessorEvidenceIds).toHaveLength(27);
  expect(r.input.slotBudgetInput.cycleRestCeilingUnits).toBe(49468);
  expect(r.input.alertSafety.alertRunSpendCeilingCredits).toBe(680);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.phase6PaidGo).toBe(false);
 });
});

import {readFileSync} from "node:fs";
import {reconstructP6ExactMondayHistoricalCandidate} from "../review-tools/p6_nov23_prospective_revision_owner_v39";
import {compileP6ProspectiveDisabledStageRevisionV39,P6_EXACT_MONDAY_IDENTITY_SUCCESSOR as K} from "../server/lib/disruption/phase6ProspectiveDisabledStageRevision_v39";
const OLD_DECISION_RAW="{\n  \"schema\": \"v39.phase6.monday-prospective-date-independent-review.v1\",\n  \"reviewDigest\": \"3eb640b6aa44de9c137847da70bee74d0a7d2897d14ad60975726fe6c55a63e1\",\n  \"dateReceiptSha256\": \"2d760133b7f881e9233f645756b0b6cf1f57464a3800c1442e3d0c39a5e722e6\",\n  \"oldStageSha256\": \"6d06cd56f3cf09b7d4f5a6033b70f253e6247a9e1b27dbb839b0080a66e771fc\",\n  \"sourceInventorySha256\": \"70c7b655c09ae5bca086f553c709d8e7c53e2384003e092587b9e0c587f01c1f\",\n  \"reviewedBy\": \"ChatGPT independent Gate 4 calendar audit f5d8639, exact-hash binding\",\n  \"reviewedAtUtc\": \"2026-11-21T13:51:53.058Z\",\n  \"independentProspectiveRevisionApproved\": true,\n  \"originalScientificDesignPreserved\": true,\n  \"oldStageRemainsArchivedEvidence\": true,\n  \"noBackfillApproved\": true,\n  \"sourceUseDeferredToPhase6Activation\": true,\n  \"phase6PaidGo\": false\n}\n";
const HNOW=new Date("2026-11-22T03:40:00.000Z");
function actualMondayIdentityContext(){
 const a=reconstructP6ExactMondayHistoricalCandidate(K.oldCode,OLD_DECISION_RAW,HNOW);
 const b=reconstructP6ExactMondayHistoricalCandidate(K.newCode,readFileSync("data-collection/phase5/evidence/2026-11-22_monday_exact_machine_bound_date_decision.json","utf8"),HNOW);
 expect(a.stageSha).toBe(K.oldStage);expect(a.costSha).toBe(K.oldCost);
 expect(b.stageSha).toBe(K.newStage);expect(b.costSha).toBe(K.newCost);
 return {oldInput:a.ctx.newInput,oldStageReview:a.ctx.newStageReview,oldFreezeReview:a.ctx.newFreezeReview,
 newInput:b.ctx.newInput,newStageReview:b.ctx.newStageReview,newFreezeReview:b.ctx.newFreezeReview,
 newManifestRaw:b.ctx.newManifestRaw,now:HNOW,review:{...b.ctx.review,schema:K.schema,
 expectedOldStageInputSha256:K.oldStage,expectedOldCostEnvelopeSha256:K.oldCost,
 expectedOriginalFrozenManifestSha256:K.oldManifest,expectedPriorCodeSha40:K.oldCode}};
}
describe("Exact owner-observed Monday identity succession — no new scientific dates",()=>{
 it("reconstructs both real public-evidence packets and requires exact unchanged budget/calendar economics",()=>{
  const c=actualMondayIdentityContext(),r=compileP6ProspectiveDisabledStageRevisionV39(c);
  expect(r.changedParentDays).toBe(0);expect(r.firstOldServiceUtc).toBe(r.firstNewServiceUtc);
  expect(r.new.cost.costOnlyCategoryDraftSha256).toBe(K.newCost);
  expect(r.providerCalls).toBe(0);expect(r.phase6PaidGo).toBe(false);
 });
 it("rejects generic zero-day revision or any altered exact identity, budget or cutoff",()=>{
  const c=actualMondayIdentityContext();
  expect(()=>compileP6ProspectiveDisabledStageRevisionV39({...c,review:{...c.review,schema:"v39.phase6.prospective-disabled-stage-revision-review.v2"}})).toThrow();
  expect(()=>compileP6ProspectiveDisabledStageRevisionV39({...c,review:{...c.review,expectedOldCostEnvelopeSha256:"f".repeat(64)}})).toThrow();
  const bad=structuredClone(c);bad.newInput.slotBudgetInput.cycleRestCeilingUnits++;
  expect(()=>compileP6ProspectiveDisabledStageRevisionV39(bad)).toThrow();
  expect(()=>compileP6ProspectiveDisabledStageRevisionV39({...c,now:new Date("2026-11-24T00:00:00.000Z")})).toThrow("FIRST_PROSPECTIVE_T24_WINDOW_ALREADY_DUE");
 });
});
