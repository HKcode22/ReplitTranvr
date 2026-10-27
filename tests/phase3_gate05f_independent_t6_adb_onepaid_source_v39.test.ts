import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {gate05fSeparateT6WindowV39} from
 "../server/lib/disruption/gate05fSeparateT6Window_v39";

const file="scripts/v39_gate05f_wsss_independent_t6_rawfirst_once_20261027.mjs";
const src=readFileSync(file,"utf8");
describe("Gate05f independent T-6h prospective FIDS with no provider test calls",()=>{
 it("freezes future service window at +6h8 to +6h18 relative to actual owner launch",()=>{
  const t=Date.parse("2026-10-27T23:02:00.000Z");
  const w=gate05fSeparateT6WindowV39(t);
  expect(w.serviceWindowStartUtc).toBe("2026-10-28T05:10:00.000Z");
  expect(w.serviceWindowEndUtc).toBe("2026-10-28T05:20:00.000Z");
  expect(w.cutoffWindowStartUtc).toBe("2026-10-27T23:10:00.000Z");
  expect(w.cutoffWindowEndUtc).toBe("2026-10-27T23:20:00.000Z");
  expect(w.separateCohortFromGate05e).toBe(true);
  expect(w.providerScheduleSemanticsVerified).toBe(false);
  expect(()=>gate05fSeparateT6WindowV39(NaN)).toThrow();
 });
 it("validates EXACT new reviewed source syntax and isolates all old paid scopes",()=>{
  expect(()=>execFileSync(process.execPath,["--check",file],
    {timeout:5000,encoding:"utf8"})).not.toThrow();
  expect(src).toContain("gate05fSeparateT6Window_v39.ts");
  expect(src).toContain("gate05f-first-prospective-20261027");
  expect(src).toContain("GATE05F_PAID_GO");
  expect(src).toContain("GATE05F_REVIEWED_MAIN_SHA");
  expect(src).toContain("AUTHORIZE_NEW_GATE05F_ONE_WSSS_FUTURE_FIDS_GET_EXPECTED_2_API_UNITS_ZERO_RETRIES_RAWFIRST");
  expect(src).toContain("gate05f.first-prospective-rawfirst@1");
  expect(src).not.toContain('proposedHorizon:"T-24h"');
  expect(src).not.toContain("interval '24 hours'");
  expect(src).not.toContain("GATE05E_PAID_GO");
  expect(src).not.toContain("aa89e0c3-23ab-4b93-99dd-7624b456931f");
 });
 it("uses provider GET once, atomic raw-first real DB, strict cost check, no automatic retries",()=>{
  expect(src).toContain("maxPaidGets:1");
  expect(src).toContain("automaticRetries:0");
  expect(src).toContain("attempts!==0");
  expect(src).toContain("attempts=1");
  expect(src).toContain("fetchFidsPopulation(");
  expect(src).toContain("{fetchAirport:customFetch}");
  expect(src).toContain("headerDebit!==2");
  expect(src).toContain("spent!==2||alertDebit!==0");
  expect(src).toContain('flag:"wx"');
  expect(src).toContain("G05F_RAW_READBACK_HOLD");
  expect(src).toContain("AS before_t6");
  expect(src).toContain("AS within10");
  expect(src).toContain("officialOpenapiSha256");
  expect(src).not.toContain("fetchFidsAirport(");
  expect(src).not.toContain("https://api.cirium.com");
  expect(src).not.toContain("subscriptions/webhook");
  expect(src).not.toContain("DELETE FROM");
 });
 it("does not grant final scientific T or exact runway-label certification",()=>{
  expect(src).toContain("actualTVerified:false");
  expect(src).toContain("actualRunwayVerified:false");
  expect(src).toContain("scheduledRunwayVerified:false");
  expect(src).toContain("originalExactRunwayLabelProven:false");
  expect(src).toContain('prospectiveAsOfT6FinalVerdict:"CANDIDATE_NOT_SCIENTIFICALLY_CERTIFIED"');
 });
});