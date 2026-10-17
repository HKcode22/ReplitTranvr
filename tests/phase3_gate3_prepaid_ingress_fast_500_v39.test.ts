/**
 * Gate3 will reuse the published Phase2 prepaid receiver. If original
 * persistence fails, waiting on the same failed PostgreSQL connection for a
 * *secondary* incident must not defer the primary HTTP 500 response.
 * Source-order regression; real no-provider PG tests remain separate.
 */
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

describe("prepaid webhook original-durability failure response",()=>{
  it("returns HTTP 500 before asynchronous failure/incident diagnostics",()=>{
    const source=readFileSync("server/routes_v3.ts","utf8");
    const start=source.indexOf("const prepaidWebhookIngress=async(");
    const end=source.indexOf("const webhookIngress=async(",start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const handler=source.slice(start,end);
    const error=handler.indexOf(
      "durable persistence failed — returning 5xx");
    const response=handler.indexOf(
      'res.status(500).json({error:"Prepaid probe persistence failed; please retry"})',error);
    const callback=handler.indexOf(
      "void recordPrepaidProbeCallbackFailureV39(",error);
    const incident=handler.indexOf('void recordIncident("raw-persistence"',error);
    expect(error).toBeGreaterThan(0);
    expect(response).toBeGreaterThan(error);
    expect(callback).toBeGreaterThan(response);
    expect(incident).toBeGreaterThan(response);
    const preResponse=handler.slice(error,response);
    expect(preResponse).not.toContain("await recordPrepaidProbeCallbackFailureV39(");
    expect(preResponse).not.toContain('await recordIncident("raw-persistence"');
    expect(handler).toContain("!err?.phase2gFailureRecorded");
    expect(handler).toContain("!err?.phase2gCallbackAccountingUncertain");
    expect(handler.slice(response)).toContain(".catch(()=>undefined)");
  });
});
