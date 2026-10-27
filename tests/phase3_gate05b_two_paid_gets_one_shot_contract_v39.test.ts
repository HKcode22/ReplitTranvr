import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";

const source="scripts/v39_gate05b_wsss_two_fids_gets_once_20261027.mjs";
const s=readFileSync(source,"utf8");
describe("Gate05b new paid WSSS FIDS retake source contract — NO LIVE CALL IN CI",()=>{
  it("loads as valid Node ESM syntax",()=>{
    expect(()=>execFileSync(process.execPath,["--check",source],{
      timeout:12_000,stdio:["ignore","pipe","pipe"]
    })).not.toThrow();
  });
  it("requires fresh affirmative owner approval, verified GitHub source and finite Oct28 expiry",()=>{
    expect(s).toContain('GATE05B_PAID_GO');
    expect(s).toContain('GATE05B_REVIEWED_MAIN_SHA');
    expect(s).toContain('git",["rev-parse","FETCH_HEAD"]');
    expect(s).toContain("GATE05B_HOLD_MAIN_SOURCE_MISMATCH");
    expect(s).toContain("2026-10-29T03:00:00.000Z");
  });
  it("declares only 2 paid FIDS GETs with zero retry or provider subscription mutation",()=>{
    expect(s).toContain("if(paidAttempts>=2)");
    expect(s).toContain('for(const withLocation of [false,true])');
    expect(s).toContain('method:"GET"');
    expect(s).toContain("MIN_MS=2600");
    expect(s).toContain("AbortSignal.timeout(12_000)");
    expect(s).toContain("GATE05B_HOLD_NON_ALLOWLISTED_PATH");
    expect(s).toContain("GATE05B_HOLD_QUERY_CONTRACT");
    expect(s).not.toContain('method:"POST"');
    expect(s).not.toContain('method:"DELETE"');
    expect(s).not.toContain("fetchFidsAirport(");
    expect(s).not.toContain("retryCount");
  });
  it("must durably consume one-run intent before request and never save flight records",()=>{
    const intent=s.indexOf('writeFileSync(receiptPath,JSON.stringify(base)');
    const loop=s.indexOf("for(const withLocation of [false,true])");
    expect(intent).toBeGreaterThan(0);
    expect(loop).toBeGreaterThan(intent);
    expect(s).toContain('{flag:"wx",mode:0o600}');
    expect(s).toContain('historicalDataRetained:false');
    expect(s).toContain("runwayTimestampActualityProven:false");
    expect(s).toContain("scheduledWheelsOffReferenceProven:false");
    expect(s).toContain("actualWheelsOffProven:false");
    expect(s).toContain("scheduledWheelsOffSourceProven:false");
    expect(s).toContain("apiUnitsSpent:spent");
    expect(s).toContain("spent===4&&creditsDelta===0");
  });
  it("rejects insufficient quota and protects 1900 Alert credit floor",()=>{
    expect(s).toContain("if(pre.api<4||pre.requests<1||pre.credits<1900)");
    expect(s).toContain("GATE05B_HOLD_QUOTA_OR_ALERT_CREDIT_FLOOR");
    expect(s).toContain("GATE05B_PAID_RECHECK_HOLD_DO_NOT_RERUN");
  });
});
