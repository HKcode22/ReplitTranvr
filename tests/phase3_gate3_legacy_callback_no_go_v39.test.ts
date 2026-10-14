import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,it,expect} from "vitest";
import {sendLegacySemanticWebhookFailureV39}
  from "../server/lib/disruption/legacyWebhookFailureResponse_v39";
import {refuseLegacyGate3CanaryReceiverV39}
  from "../server/lib/disruption/gate3CanaryReceiverReadiness_v39";

describe("legacy webhook failure ACK and incompatible paid Gate3 NO-GO",()=>{
  it("returns sanitized 503, not a false HTTP 200",()=>{
    const calls:unknown[]=[];
    const response={
      headersSent:false,
      status(code:number){calls.push(["status",code]);return this;},
      json(body:{received:false;error:string}){calls.push(["json",body]);return this;},
    };
    expect(sendLegacySemanticWebhookFailureV39(response)).toBe(true);
    expect(calls).toEqual([
      ["status",503],
      ["json",{received:false,error:"Semantic webhook processing failed"}],
    ]);
  });
  it("never attempts a second ACK when headers were already sent",()=>{
    const calls:unknown[]=[];
    const response={
      headersSent:true,
      status(code:number){calls.push(code);return this;},
      json(body:{received:false;error:string}){calls.push(body);return this;},
    };
    expect(sendLegacySemanticWebhookFailureV39(response)).toBe(false);
    expect(calls).toHaveLength(0);
  });
  it("semantic-processing catch sends an explicit failure even if diagnostics error",()=>{
    const routes=readFileSync(join(process.cwd(),"server/routes_v3.ts"),"utf8");
    const start=routes.indexOf('console.error("[adb-v3-webhook] semantic processing error after raw durability:"');
    expect(start).toBeGreaterThan(0);
    const handler=routes.slice(start,routes.indexOf('  app.post(',start));
    expect(handler).toContain("sendLegacySemanticWebhookFailureV39(res)");
    expect(handler).not.toContain("res.status(200).json({received:true,error:");
    expect(handler).toContain("secondary incident write failed");
    expect(handler).toContain("secondary outcome update failed");
  });
  it("owner refuses before any provider GET or subscription mutation",()=>{
    expect(()=>refuseLegacyGate3CanaryReceiverV39()).toThrow(
      "GATE3_LEGACY_CANARY_RECEIVER_INCOMPATIBLE_WITH_PUBLISHED_PREPAID_ONLY_RUNTIME");
    const owner=readFileSync(join(process.cwd(),"scripts/credit_canary.ts"),"utf8");
    const i=owner.indexOf("  refuseLegacyGate3CanaryReceiverV39();");
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(owner.indexOf("  const b1 = await getBalance();"));
    expect(i).toBeLessThan(owner.indexOf('  const sub = await createSubscription('));
  });
});
