import {describe,it,expect,vi} from "vitest";
import {requirePhase7PostConsumer,consumeCommittedPhase7Post,type Phase7PostConsumer} from "../server/lib/disruption/phase7PostPreservationBridge_v39";
const pin="ab".repeat(32);
describe("private post preservation admission",()=>{
 it("requires protected policy and consumer before reservation",()=>{
  expect(()=>requirePhase7PostConsumer({},undefined)).toThrow("UNCOMMISSIONED");
  const c={policySha256:pin,preflight:vi.fn(),preserveCommitted:vi.fn()};
  expect(()=>requirePhase7PostConsumer({},c)).toThrow("UNCOMMISSIONED");
  expect(requirePhase7PostConsumer({P6_PHASE7_POST_PRESERVATION_POLICY_SHA256:pin},c)).toBe(c);
 });
 it("does not accept partial readback or log extra private fields",async()=>{
  const audit=Object.defineProperties({uniqueRetainedPreFlights:2},{privatePreservationAnchors:{value:[]},privateDecisions:{value:[]}}) as any;
  const scope={packet:{}} as any;
  const c:Phase7PostConsumer={policySha256:pin,preflight:vi.fn(),preserveCommitted:vi.fn().mockResolvedValue({
   independentlyReadBack:true,sourceMappingPersisted:false,providerCalls:0,verifiedGroupCount:1,heldGroupCount:1,accountedRetainedFlightCount:2})};
  await expect(consumeCommittedPhase7Post(c,scope,audit)).rejects.toThrow("INCOMPLETE_DURABLE_READBACK_NO_REPLAY");
  vi.mocked(c.preserveCommitted).mockResolvedValue({independentlyReadBack:true,sourceMappingPersisted:false,providerCalls:0,verifiedGroupCount:2,heldGroupCount:0,accountedRetainedFlightCount:2,privateValue:"NEVER_PUBLIC"} as any);
  expect(JSON.stringify(await consumeCommittedPhase7Post(c,scope,audit))).not.toContain("NEVER_PUBLIC");
 });
});
