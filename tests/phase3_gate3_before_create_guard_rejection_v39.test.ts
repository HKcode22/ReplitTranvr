import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

describe("Gate3 last pre-POST guard failure is unpaid-only, never ambiguous paid",()=>{
 it("provider runner invokes guard exactly once OUTSIDE provider CREATE catch",()=>{
   const src=readFileSync("server/lib/disruption/prepaidProbeWindow_v39.ts","utf8");
   const guard=src.indexOf("await input.beforeProviderCreate!()");
   const providerTry=src.indexOf("const creation = await resolveAmbiguousPrepaidCreateV39(");
   const providerPost=src.indexOf('createOnce:()=>createSubscription("FlightByAirportIcao"');
   expect(guard).toBeGreaterThan(0);
   expect(providerTry).toBeGreaterThan(guard);
   expect(providerPost).toBeGreaterThan(providerTry);
   expect((src.match(/await input\.beforeProviderCreate!\(\)/g)||[]).length).toBe(1);
 });
 it("only a rejected final guard may attempt evidence-checked unpaid closeout",()=>{
   const src=readFileSync("scripts/v39_gate3_one_wsss_operator_v39.ts","utf8");
   const flag=src.indexOf("let lastPreCreateGuardRejected=false");
   const guard=src.indexOf("beforeProviderCreate:async()=>{",flag);
   const caught=src.indexOf("lastPreCreateGuardRejected=true",guard);
   const paidRunner=src.indexOf("executeGate3ActualWindowV39(v39Pool",flag);
   const outerRecovery=src.indexOf("if(lastPreCreateGuardRejected)",caught);
   expect(flag).toBeGreaterThan(0);
   expect(paidRunner).toBeGreaterThan(flag);
   expect(guard).toBeGreaterThan(paidRunner);
   expect(caught).toBeGreaterThan(guard);
   expect(outerRecovery).toBeGreaterThan(caught);
   expect(src.slice(outerRecovery,outerRecovery+130)).toContain(
     "return await abortBeforePaidExecution()");
   expect(src.slice(outerRecovery)).toContain(
     "GATE3_OPERATOR_OUTCOME_HOLD_EXACT_ACCOUNT_RECOVERY_REQUIRED");
   expect(src).toContain("terminateUnpaidGate3PrecreateRealV39(");
 });
});
