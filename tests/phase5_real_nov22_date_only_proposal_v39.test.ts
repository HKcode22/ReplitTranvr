import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {proposeP5RealCorrectedPairDateGeometry} from "../server/lib/disruption/phase5CorrectedPairDateGeometryProposal_v39";
const load=(p:string)=>JSON.parse(readFileSync(p,"utf8"));
describe("real corrected pair date-only Nov22 proposal; not a signed calendar",()=>{
 it("matches exact existing production geometry compiler, no selection/treatment/GO",()=>{
  const draft=load("data-collection/phase5/planning/2026-11-15_nov22_service_start_date_only_candidate.json");
  const x=proposeP5RealCorrectedPairDateGeometry({ownerCorrectedReadback:load("data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json"),firstRunDateUtc:draft.firstRunDateUtc});
  expect(x.status).toBe("DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE");
  expect(x.days).toEqual(draft.days);expect(x.skippedDatesByReason).toEqual(draft.skippedDatesByReason);
  expect(x.days.filter(d=>d.airportsIfKnown===null)).toHaveLength(21);
  expect(draft.treatmentAssigned).toBe(false);expect(x.phase6PaidGo).toBe(false);
  expect(x.providerCalls).toBe(0);expect(x.databaseWrites).toBe(0);
 });
});
