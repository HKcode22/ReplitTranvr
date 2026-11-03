import {describe,it,expect} from "vitest";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
const script="scripts/v39_phase4_gate5_free_bts_aug2026_reference_actions.py";
describe("Free BTS actual wheels-off monthly source parser (zero-provider)",()=>{
 it("proves actual tested CSV/ZIP counts with synthetic August 2026 BTS-format file",()=>{
  const p=spawnSync("python3",[script,"--self-test"],{
   encoding:"utf8",timeout:30000,maxBuffer:200000
  });
  expect(p.error).toBeUndefined();
  expect(p.status).toBe(0);
  expect(p.stdout).toContain("P4_G5_FREE_BTS_SELFTEST_PASS");
 });
 it("pins real official HTTPS August 2026 reporting-carrier source; no API keys or DB",()=>{
  const source=readFileSync(script,"utf8");
  expect(source).toContain("https://transtats.bts.gov/PREZIP/");
  expect(source).toContain("On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2026_8.zip");
  expect(source).toContain("WheelsOff");
  expect(source).toContain("FlightDate");
  expect(source).toContain("Cancelled");
  expect(source).toContain("CRSDepTime");
  expect(source).not.toContain("fetchFidsAirport");
  expect(source).not.toContain("psycopg2");
  expect(source).not.toContain("requests.post");
 });
});
