import {describe,expect,it} from "vitest";
import {providerBalancePollMsV39} from "../server/lib/disruption/prepaidProbeWindow_v39";

describe("Gate3 soft-credit-stop provider balance polling without altering P25",()=>{
  it("checks live provider balance every 5s in prospective Gate3 only",()=>{
    expect(providerBalancePollMsV39("phase3_credit_canary")).toBe(5_000);
  });
  it("retains the existing 60s control-plane cadence for Phase2 anchor/smoke",()=>{
    expect(providerBalancePollMsV39("anchor_probe")).toBe(60_000);
    expect(providerBalancePollMsV39("phase2_safety_smoke")).toBe(60_000);
  });
  it("reduces latency but never constitutes a provider-enforced spending guarantee",()=>{
    expect(providerBalancePollMsV39("phase3_credit_canary")).toBeGreaterThan(0);
    expect(providerBalancePollMsV39("phase3_credit_canary"))
      .toBeLessThan(providerBalancePollMsV39("anchor_probe"));
  });
});
