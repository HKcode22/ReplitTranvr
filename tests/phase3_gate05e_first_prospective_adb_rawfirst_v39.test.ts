import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {gate05eFutureWsssWindowV39} from
 "../server/lib/disruption/gate05eProspectiveWindow_v39";

const scriptPath="scripts/v39_gate05e_wsss_one_prospective_fids_rawfirst_20261027.mjs";
const source=readFileSync(scriptPath,"utf8");
describe("Gate05e one-GET future AeroDataBox baseline, no provider in tests",()=>{
 it("is syntactically valid source and never embeds credentials",()=>{
   expect(()=>execFileSync(process.execPath,["--check",scriptPath],
     {timeout:5000,encoding:"utf8"})).not.toThrow();
   expect(source).not.toContain("AIza");
   expect(source).not.toContain("x-rapidapi-key:");
 });
 it("captures before all candidate T-24h cutoffs, not as fabricated PRE scientific PASS",()=>{
   const t=Date.parse("2026-10-27T12:00:00.000Z");
   const w=gate05eFutureWsssWindowV39(t);
   expect(w.serviceWindowStartUtc).toBe("2026-10-28T12:08:00.000Z");
   expect(w.serviceWindowEndUtc).toBe("2026-10-28T12:18:00.000Z");
   expect(w.cutoffWindowStartUtc).toBe("2026-10-27T12:08:00.000Z");
   expect(w.cutoffWindowEndUtc).toBe("2026-10-27T12:18:00.000Z");
   expect(w.providerScheduleSemanticsVerified).toBe(false);
   expect(w.fidsWindowMinutes).toBe(10);
   expect(()=>gate05eFutureWsssWindowV39(NaN)).toThrow();
 });
 it("overrides ordinary FIDS 3-attempt retry, preserves atomic raw and normalized member clocks",()=>{
   expect(source).toContain("fetchFidsPopulation(");
   expect(source).toContain("{fetchAirport:customFetch}");
   expect(source).toContain("attempts!==0");
   expect(source).toContain("attempts=1");
   expect(source).toContain("maxPaidGets:1");
   expect(source).toContain("automaticRetries:0");
   expect(source).toContain("G05E_RAW_READBACK_HOLD");
   expect(source).toContain("raw_present");
   expect(source).toContain("available_at");
   expect(source).toContain("rawPersistedAtUtc");
   expect(source).toContain("officialOpenapiSha256");
   expect(source).toContain('flag:"wx"');
   expect(source).not.toContain("fetchFidsAirport(");
   expect(source).not.toContain("withFlightPlan:");
   expect(source).not.toContain("subscriptions/webhook");
 });
 it("spend is exactly one ADB GET expected 2 units and cannot impersonate full f.8 labels",()=>{
   expect(source).toContain("apiUnitsRemaining<2");
   expect(source).toContain("headerDebit!==2");
   expect(source).toContain("spent!==2||alertDebit!==0");
   expect(source).toContain("GATE05E_REVIEWED_MAIN_SHA");
   expect(source).toContain("GATE05E_PAID_GO");
   expect(source).toContain("originalExactRunwayLabelProven:false");
   expect(source).toContain('prospectiveAsOfT24FinalVerdict:"CANDIDATE_NOT_SCIENTIFICALLY_CERTIFIED"');
   expect(source).not.toContain("https://api.cirium.com");
   expect(source).not.toContain("DELETE FROM");
   expect(source).not.toContain("POST ");
 });
});