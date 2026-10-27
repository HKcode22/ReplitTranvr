import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const file="scripts/v39_gate05_free_airport_feed_coverage_v39.mjs";
const content=readFileSync(file,"utf8");

describe("Free-tier Gate05 airport coverage probe: rate-limited host, no retries",()=>{
  it("is syntactically valid standalone Node ESM",()=>{
    expect(()=>execFileSync(process.execPath,["--check",file],{
      timeout:10000,stdio:["ignore","pipe","pipe"]
    })).not.toThrow();
  });
  it("spaces GET starts beyond a potential one-request/second plan",()=>{
    expect(content).toContain("MIN_GET_START_SPACING_MS=2500");
    expect(content).toContain("await pause(delay)");
    expect(content).toContain("lastGetStartMs=Date.now()");
    expect(content).toContain('method:"GET"');
  });
  it("reports only allowlisted paths with no automatic retry and no paid FIDS",()=>{
    expect(content).toContain('if(r.status!==200)');
    expect(content).toContain("GATE05_FREE_FEED_HTTP_HOLD");
    expect(content).toContain("NO_AUTOMATIC_RETRY");
    expect(content).toContain("retry-after");
    expect(content).toContain("x-ratelimit-requests-remaining");
    expect(content).toContain("x-ratelimit-api-units-remaining");
    expect(content).toContain("noPaidFidsRequests:true,noRetries:true");
    expect(content).toContain('for(const icao of ["WSSS","YSSY"])');
    expect(content).not.toContain('method:"POST"');
    expect(content).not.toContain('method:"DELETE"');
    expect(content).not.toContain("subscribeWebhook(");
  });
});
