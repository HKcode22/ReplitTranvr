import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,it,expect} from "vitest";
import {refuseLegacyGate3CanaryReceiverV39}
  from "../server/lib/disruption/gate3CanaryReceiverReadiness_v39";

describe("legacy raw-after-ACK contract and incompatible paid Gate3 NO-GO",()=>{
  it("requires explicit HTTP 200 only after durable raw commit, with sanitized repair needed",()=>{
    const routes=readFileSync(join(process.cwd(),"server/routes_v3.ts"),"utf8");
    const raw=routes.indexOf("await persistRawDeliveryTransaction(");
    const catcher=routes.indexOf('console.error("[adb-v3-webhook] semantic processing error after raw durability:"');
    const handler=routes.slice(catcher,routes.indexOf('  app.post(',catcher));
    expect(raw).toBeGreaterThan(0);
    expect(catcher).toBeGreaterThan(raw);
    expect(handler).toContain('res.status(200).json({received:true,error:"semantic_processing_failed_after_raw_durability"})');
    expect(handler).not.toContain('error:err?.message||"error"');
    expect(handler).toContain("secondary incident write failed");
    expect(handler).toContain("secondary outcome update failed");
  });
  it("pre-durable raw persistence failure still issues HTTP 5xx",()=>{
    const src=readFileSync(join(process.cwd(),"server/routes_v3.ts"),"utf8");
    expect(src).toContain('res.status(500).json({error:"Raw persistence failed; please retry"})');
  });
  it("pre-durable raw errors do not await a second SQL incident write before HTTP 500",()=>{
    const src=readFileSync(join(process.cwd(),"server/routes_v3.ts"),"utf8");
    const beginning=src.indexOf('}catch(rawErr:any){');
    const end=src.indexOf('const extracted:ExtractedWebhookRow[]',beginning);
    expect(beginning).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(beginning);
    const errorPath=src.slice(beginning,end);
    expect(errorPath).toContain('void recordIncident("raw-persistence"');
    expect(errorPath).not.toContain('await recordIncident("raw-persistence"');
    expect(errorPath).toContain('if(!res.headersSent)res.status(500).json');
    expect(errorPath).not.toContain('console.error("[adb-v3-webhook] raw delivery persistence failed — returning 5xx:",rawErr?.message');
  });
  it("hard-refuses legacy canary before provider balance reads or subscription creation",()=>{
    expect(()=>refuseLegacyGate3CanaryReceiverV39()).toThrow(
      "GATE3_LEGACY_CANARY_RECEIVER_INCOMPATIBLE_WITH_PUBLISHED_PREPAID_ONLY_RUNTIME");
    const owner=readFileSync(join(process.cwd(),"scripts/credit_canary.ts"),"utf8");
    const i=owner.indexOf("  refuseLegacyGate3CanaryReceiverV39();");
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(owner.indexOf("  const b1 = await getBalance();"));
    expect(i).toBeLessThan(owner.indexOf("  const sub = await createSubscription("));
  });
});
