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
import {join} from "node:path";
import {compileP6ProspectiveDisabledStageRevisionV39,P6_EXACT_MONDAY_IDENTITY_SUCCESSOR as K} from "../server/lib/disruption/phase6ProspectiveDisabledStageRevision_v39";
const HNOW=new Date("2026-11-22T03:40:00.000Z");
const fixturePair=process.env.P6_EXACT_MONDAY_FIXTURE_PAIR;
function actualMondayIdentityContext(){
 const a=JSON.parse(readFileSync(join(fixturePair!,"old","prospective-revision-package.json"),"utf8"));
 const b=JSON.parse(readFileSync(join(fixturePair!,"new","prospective-revision-package.json"),"utf8"));
 expect(digest(a.newInput)).toBe(K.oldStage);expect(a.newFreezeReview.expectedSignedSevenCategoryCostSha256).toBe(K.oldCost);
 expect(digest(b.newInput)).toBe(K.newStage);expect(b.newFreezeReview.expectedSignedSevenCategoryCostSha256).toBe(K.newCost);
 return {oldInput:a.newInput,oldStageReview:a.newStageReview,oldFreezeReview:a.newFreezeReview,
 newInput:b.newInput,newStageReview:b.newStageReview,newFreezeReview:b.newFreezeReview,
 newManifestRaw:b.newManifestRaw,now:HNOW,review:{...b.review,schema:K.schema,
 expectedOldStageInputSha256:K.oldStage,expectedOldCostEnvelopeSha256:K.oldCost,
 expectedOriginalFrozenManifestSha256:K.oldManifest,expectedPriorCodeSha40:K.oldCode}};
}
describe.skipIf(!fixturePair)("Exact owner-observed Monday identity succession — no new scientific dates",()=>{
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
