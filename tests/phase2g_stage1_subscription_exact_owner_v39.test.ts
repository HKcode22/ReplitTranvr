import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,it,expect} from "vitest";
import {isExactStage1ProviderSubscriptionOwnerV39 as exact}
  from "../scripts/v39_phase2g_subscription_exact_owner_match_v39";
const expected={
  icao:"YSSY",
  webhookSubscriberId:"https://replit-tranvr--hk84164.replit.app/api/v1/webhooks/aerodatabox/synthetic/prepaid/12345678-1234-4234-8234-123456789abc"
};
const owned=()=>({
  isActive:true,billingType:"CreditBased",
  subject:{type:"FlightByAirportIcao",id:"YSSY"},
  subscriber:{type:"WebHook",id:expected.webhookSubscriberId}
});
describe("P16 exact-session provider subscription ownership before DELETE (offline only)",()=>{
  it("requires exact billable subscription, target airport, webhook kind and same full callback URL",()=>{
    expect(exact(owned(),expected)).toBe(true);
    for(const changed of [
      {isActive:false},
      {billingType:"LifetimeBased"},
      {subject:{type:"FlightByAirportIcao",id:"SKBO"}},
      {subject:{type:"FlightByAirportIata",id:"YSSY"}},
      {subscriber:{type:"Email",id:expected.webhookSubscriberId}},
      {subscriber:{type:"WebHook",id:expected.webhookSubscriberId+"/other"}},
      {subscriber:{type:"WebHook",id:expected.webhookSubscriberId.replace("/synthetic/","/other/")}}
    ]){
      expect(exact({...owned(),...changed},expected)).toBe(false);
    }
  });
  it("rejects malformed expected ICAO or non-HTTPS source address",()=>{
    expect(exact(owned(),{...expected,icao:"YSS"})).toBe(false);
    expect(exact(owned(),{...expected,webhookSubscriberId:"http://example.test/prepaid/any"})).toBe(false);
    expect(exact(null,expected)).toBe(false);
  });
  it("actual abnormal exit recovery uses strict predicate in both bound and UNLOGGED-reset paths",()=>{
    const source=readFileSync(join(process.cwd(),
      "scripts/v39_phase2g_stage1_recover_after_exit_v39.ts"),"utf8");
    expect(source).toContain("isExactStage1ProviderSubscriptionOwnerV39");
    expect(source).toContain("RECOVERY_REFUSED:BOUND_SUBSCRIPTION_EXACT_OWNER_MISMATCH");
    expect(source).toContain("bound_provider_subscription_ownership_mismatch_no_delete");
    expect(source).toContain("RECOVERY_REFUSED:SUBSCRIPTION_CLEANUP_NOT_VERIFIED");
    expect(source.match(/isExactStage1ProviderSubscriptionOwnerV39\(/g)?.length).toBe(3);
    const activeBound=source.indexOf("if (owned?.isActive)");
    const check=source.indexOf("isExactStage1ProviderSubscriptionOwnerV39(owned",activeBound);
    const deletion=source.indexOf("await deleteSubscriptionVerifiedStrict(",activeBound);
    expect(activeBound).toBeGreaterThan(0);
    expect(check).toBeGreaterThan(activeBound);
    expect(check).toBeLessThan(deletion);
  });
});
