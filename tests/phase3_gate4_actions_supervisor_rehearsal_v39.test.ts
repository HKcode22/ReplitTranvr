import {describe,it,expect,vi} from "vitest";
import {runGate4ActionsRehearsalV39} from
 "../scripts/v39_gate4_actions_supervisor_rehearsal_v39";
describe("Gate4 Actions in-job rehearsal no-provider",()=>{
 it("five simulated 5-second ticks trigger only known-id STOP at signed deadline",async()=>{
  const wait=vi.fn(async()=>undefined);
  const events:Array<Record<string,unknown>>=[];
  const out=await runGate4ActionsRehearsalV39(wait,x=>events.push(x));
  expect(out).toMatchObject({
   status:"GATE4_ACTIONS_IN_JOB_SYNTHETIC_PASS",ticks:5,
   providerRequests:0,providerMutations:0,liveStopArmed:false
  });
  expect(wait).toHaveBeenCalledTimes(4);
  expect(wait).toHaveBeenCalledWith(5000);
  expect(events.map(x=>x.status))
   .toEqual(["WATCH","WATCH","WATCH","WATCH","STOP_EXACT_OWNED"]);
  expect(events.every(x=>x.providerRequests===0&&
   x.providerMutations===0&&x.guaranteesHardCreditCap===false)).toBe(true);
 });
});
