import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const file="scripts/v39_gate05_wsss_newpaid_prearm_readonly_20261027.mjs";
const source=readFileSync(file,"utf8");
describe("Gate05 WSSS no-paid exact-scope prearm",()=>{
  it("parses under standalone Node ESM",()=>{
    expect(()=>execFileSync(process.execPath,["--check",file],{
      timeout:10000,stdio:["ignore","pipe","pipe"]
    })).not.toThrow();
  });
  it("only reads FREE provider endpoints and independently checks public receiver",()=>{
    expect(source).toContain('["/subscriptions/balance","/subscriptions/webhook"]');
    expect(source).toContain('method:"GET"');
    expect(source).toContain('MIN_SPACING=2600');
    expect(source).toContain('last=Date.now()');
    expect(source).toContain('"/__v39/workspace-runtime"');
    for(const danger of [
      'method:"POST"','method:"DELETE"','/balance/refill',
      '/flights/airports/icao/','subscribeWebhook(',
      'createGate4SingleWithRawReceiptV39('])
      expect(source).not.toContain(danger);
  });
  it("does not promote historical NEXT4 to a new scientifically reviewed Gate05 binding",()=>{
    expect(source).toContain("selectedNewPilotReceiverScopeVerified:false");
    expect(source).toContain("newIndependentStopArmed:false");
    expect(source).toContain("newPaidAuthorizationGranted:false");
    expect(source).toContain("originalStrictScientificGate05Passed:false");
  });
  it("enforces account inventory and explicit 500-credit versus 1900 floor arithmetic",()=>{
    expect(source).toContain("creditsAfter-HISTORIC_PROTECTED_FLOOR");
    expect(source).toContain("headroom>=PROPOSED_ALERT_BUDGET");
    expect(source).toContain("active.length===0");
    expect(source).toContain("stable&&runtimeStatus");
    expect(source).toContain("HISTORIC_PROTECTED_FLOOR=1900");
    expect(source).toContain("PROPOSED_ALERT_BUDGET=500");
  });
});
