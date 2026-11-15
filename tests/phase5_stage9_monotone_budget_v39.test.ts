import {describe,it,expect} from "vitest";
import {phase5Stage9MonotoneChargeBudgetAdmissible as ok} from "../server/lib/disruption/phase5Stage9V0082AtomicSegmentedDayPrepare_v39";
describe("immutable signed UTC cap with monotone current reservation",()=>{
 const signed={otherReserved:200,alreadyReserved:100,candidateUnits:192,remainingAfterProposal:1408};
 const actual={daily_api_ceiling:1900,daily_other_reserved_units:200,physically_reserved_units:100};
 it("accepts unchanged or bounded irreversible +2 increments without changing signed proposal",()=>{
  expect(ok(signed,actual)).toBe(true);
  expect(ok(signed,{...actual,physically_reserved_units:102})).toBe(true);
  expect(ok(signed,{...actual,physically_reserved_units:1508})).toBe(true);
 });
 it("rejects cap drift, counter rollback or odd/inconsistent increment, overrun and malformed counters",()=>{
  for(const x of [
   {...actual,daily_api_ceiling:1898},{...actual,daily_api_ceiling:1902},
   {...actual,daily_other_reserved_units:198},{...actual,physically_reserved_units:98},
   {...actual,physically_reserved_units:101},{...actual,physically_reserved_units:1510},
   {...actual,physically_reserved_units:null},{...actual,physically_reserved_units:""}
  ])expect(ok(signed,x)).toBe(false);
  expect(ok({...signed,candidateUnits:0},actual)).toBe(false);
 });
}); 
