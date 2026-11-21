import {describe,it,expect,vi} from "vitest";
import {requirePhase7PostConsumer,consumeCommittedPhase7Post,phase7AuditedPreservationGroups,type Phase7PostConsumer} from "../server/lib/disruption/phase7PostPreservationBridge_v39";
const pin="ab".repeat(32);
const anchor=(id:string,ambiguousIdentity=false)=>({flightInstanceId:id,ambiguousIdentity});
const audit=(ids:string[],anchors:ReturnType<typeof anchor>[],excluded:string[])=>Object.defineProperties({uniqueRetainedPreFlights:ids.length},{privatePreservationAnchors:{value:anchors},privateDecisions:{value:[]},privateAmbiguousPreservationFlightIds:{value:excluded}}) as any;
const receipt=(verifiedGroupCount:number,heldGroupCount:number,excludedAmbiguousGroupCount:number,accountedRetainedFlightCount:number)=>({independentlyReadBack:true as const,sourceMappingPersisted:false as const,providerCalls:0 as const,verifiedGroupCount,heldGroupCount,excludedAmbiguousGroupCount,accountedRetainedFlightCount});
describe("private post preservation admission",()=>{
 it("requires protected policy and consumer before reservation",()=>{
  expect(()=>requirePhase7PostConsumer({},undefined)).toThrow("UNCOMMISSIONED");
  const c={policySha256:pin,preflight:vi.fn(),preserveCommitted:vi.fn()};
  expect(()=>requirePhase7PostConsumer({},c)).toThrow("UNCOMMISSIONED");
  expect(requirePhase7PostConsumer({P6_PHASE7_POST_PRESERVATION_POLICY_SHA256:pin},c)).toBe(c);
 });
 it("does not accept partial readback or log extra private fields",async()=>{
  const a=audit(["a","b"],[anchor("a"),anchor("b")],[]),scope={packet:{}} as any;
  const c:Phase7PostConsumer={policySha256:pin,preflight:vi.fn(),preserveCommitted:vi.fn().mockResolvedValue(receipt(1,1,0,2))};
  await expect(consumeCommittedPhase7Post(c,scope,a)).rejects.toThrow("INCOMPLETE_DURABLE_READBACK_NO_REPLAY");
  vi.mocked(c.preserveCommitted).mockResolvedValue({...receipt(2,0,0,2),privateValue:"NEVER_PUBLIC"} as any);
  expect(JSON.stringify(await consumeCommittedPhase7Post(c,scope,a))).not.toContain("NEVER_PUBLIC");
 });
 it("salvages independently read-back valid groups beside known audit ambiguity",async()=>{
  // Duplicate-only group need not have a singleton anchor. Both groups
  // remain in the denominator. No claim of verified label for ambiguity.
  const a=audit(["a","b","c"],[anchor("a"),anchor("b",true)],["b","c"]),scope={packet:{}} as any;
  const c:Phase7PostConsumer={policySha256:pin,preflight:vi.fn(),preserveCommitted:vi.fn().mockResolvedValue(receipt(1,0,2,3))};
  expect(phase7AuditedPreservationGroups(a).eligible.size).toBe(1);
  expect(await consumeCommittedPhase7Post(c,scope,a)).toMatchObject({verifiedGroupCount:1,excludedAmbiguousGroupCount:2,accountedRetainedFlightCount:3});
  vi.mocked(c.preserveCommitted).mockResolvedValue(receipt(0,0,3,3));
  await expect(consumeCommittedPhase7Post(c,scope,a)).rejects.toThrow("INCOMPLETE_DURABLE_READBACK_NO_REPLAY");
  vi.mocked(c.preserveCommitted).mockResolvedValue(receipt(0,1,2,3));
  await expect(consumeCommittedPhase7Post(c,scope,a)).rejects.toThrow("INCOMPLETE_DURABLE_READBACK_NO_REPLAY");
 });
 it("refuses missing denominator, inconsistent scope, and duplicate exclusions",()=>{
  expect(()=>phase7AuditedPreservationGroups(audit(["a","b"],[anchor("a")],[]))).toThrow("GROUP_DENOMINATOR");
  expect(()=>phase7AuditedPreservationGroups(audit(["a"],[anchor("a")],["a"]))).toThrow("AMBIGUITY_ANCHOR_DRIFT");
  expect(()=>phase7AuditedPreservationGroups(audit(["a"],[],["a","a"]))).toThrow("AMBIGUITY_DENOMINATOR");
 });
});
