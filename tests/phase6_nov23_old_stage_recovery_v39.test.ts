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
