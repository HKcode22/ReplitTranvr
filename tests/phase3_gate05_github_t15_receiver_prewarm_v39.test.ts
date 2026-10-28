import {readFileSync} from "node:fs";
import {describe,it,expect,vi} from "vitest";
import {prewarmGate05ReceiverV39} from
 "../scripts/v39_gate05_receiver_prewarm_only_v39";
const start="2026-10-28T08:00:00.000Z";
const receiver="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
const pass={status:"PASS" as const,git_head:receiver,
 published_deployment:true as const,prepaid_route_registered:true as const,
 provider_mutation:false as const};
describe("Gate05 FREE published prewarm on GitHub T-15, never ARMED proof",()=>{
 it("uses only pinned read-only health GET and GitHub clock",async()=>{
   const t=Date.parse(start);let current=t-16*60000;
   const read=vi.fn(async()=>pass);
   const result=await prewarmGate05ReceiverV39({
      startUtc:start,receiver,now:()=>current,
      sleepImpl:async ms=>{current+=ms;},readImpl:read
   });
   expect(result).toBe("PASS");
   expect(read).toHaveBeenCalledTimes(1);
   expect(read.mock.calls[0].length).toBe(1);
 });
 it("skips optional prewarm once mandatory T-10 time approaches",async()=>{
   const read=vi.fn(async()=>pass);
   expect(await prewarmGate05ReceiverV39({
     startUtc:start,receiver,now:()=>Date.parse(start)-10.5*60000,
     readImpl:read
   })).toBe("SKIPPED");
   expect(read).not.toHaveBeenCalled();
 });
 it("does not throw on a transient optional prewarm timeout",async()=>{
   const read=vi.fn(async()=>{throw Error("GATE05_PUBLISHED_RECEIVER_TRANSPORT_RETRIES_EXHAUSTED");});
   expect(await prewarmGate05ReceiverV39({
     startUtc:start,receiver,now:()=>Date.parse(start)-14*60000,readImpl:read
   })).toBe("DEGRADED");
 });
 it("does not mask a positive mismatched receiver as a transient outage",async()=>{
   const read=vi.fn(async()=>{throw Error("GATE05_PUBLISHED_RECEIVER_SOURCE_OR_ADMISSION_UNVERIFIED");});
   await expect(prewarmGate05ReceiverV39({
     startUtc:start,receiver,now:()=>Date.parse(start)-14*60000,readImpl:read
   })).rejects.toThrow("SOURCE_OR_ADMISSION_UNVERIFIED");
 });
 it("does not change the independently authenticated T-10 STOP or source",()=>{
   const workflow=readFileSync(".github/workflows/phase3-gate05-science-exact-owned-stop.yml","utf8");
   const warm=workflow.indexOf("Prewarm exact published receiver at T-15");
   const arm=workflow.indexOf("Wait on GitHub clock until T-10 minutes");
   const stop=workflow.indexOf("Run independently authorized exact-owned STOP, never CREATE");
   expect(warm).toBeGreaterThan(0);
   expect(arm).toBeGreaterThan(warm);
   expect(stop).toBeGreaterThan(arm);
   expect(workflow).toContain("environment: gate05-safety");
   expect(workflow).toContain("scripts/v39_gate05_receiver_prewarm_only_v39.ts");
 });
});
