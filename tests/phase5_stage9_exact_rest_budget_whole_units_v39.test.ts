import {describe,expect,it} from "vitest";
import {phase5Stage9ExactWholeUnit}
 from "../server/lib/disruption/phase5Stage9V0082AtomicSegmentedDayPrepare_v39";

describe("Phase5 atomic Stage9 source/REST budget rejects numeric-coercion false zeros",()=>{
 it("allows real finite whole-number units and canonical PG integer text",()=>{
  for(const v of [0,2,50000,"0","2","50000"]){
   expect(phase5Stage9ExactWholeUnit(v)).toBe(true);
  }
  expect(phase5Stage9ExactWholeUnit(1,1,360)).toBe(true);
  expect(phase5Stage9ExactWholeUnit("360",1,360)).toBe(true);
 });
 it("never treats missing, blank, Boolean or whitespace as a legitimate zero reservation",()=>{
  for(const v of [null,undefined,false,true,""," ","\t","00","01"," 0","0 ","+0","-0",{},[],[0]]){
   expect(phase5Stage9ExactWholeUnit(v)).toBe(false);
  }
 });
 it("rejects noninteger, NaN, infinite, overflowed or out-of-range budgets",()=>{
  for(const v of [-1,50001,1.5,NaN,Infinity,-Infinity,"1.0","-1","1e2",
    "0x2",9007199254740992,"9007199254740992","50001"]){
   expect(phase5Stage9ExactWholeUnit(v)).toBe(false);
  }
  expect(phase5Stage9ExactWholeUnit("0",1,360)).toBe(false);
  expect(phase5Stage9ExactWholeUnit("361",1,360)).toBe(false);
  expect(phase5Stage9ExactWholeUnit(2,10,1)).toBe(false);
  expect(phase5Stage9ExactWholeUnit(2,-1,3)).toBe(false);
 });
});
