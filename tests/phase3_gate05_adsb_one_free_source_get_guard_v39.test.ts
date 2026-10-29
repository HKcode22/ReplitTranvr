import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
const script=readFileSync("scripts/v39_gate05_adsb_lol_wsss_one_free_get_20261029.ts","utf8");
const workflow=readFileSync(".github/workflows/phase3-gate05-wsss-one-public-adsb-free-get.yml","utf8");
describe("Gate05 one FREE WSSS ADS-B research-only GET and no paid runner",()=>{
 it("makes exactly one HTTP GET and never uses AeroDataBox or local database",()=>{
  expect(script).toContain("https://api.adsb.lol/v2/point/1.359211/103.989325/60");
  expect(script.match(/\bfetch\(/g)).toHaveLength(1);
  expect(script).toContain('method:"GET"');
  expect(script).not.toContain("AERODATABOX_API_KEY");
  expect(script).not.toContain("DATABASE_URL");
  expect(script).not.toContain("db.query");
  expect(script).not.toContain("node-fetch");
 });
 it("fails closed if run from a different branch, event or attempt",()=>{
  expect(script).toContain('process.env.GITHUB_ACTIONS!=="true"');
  expect(script).toContain('process.env.GITHUB_REF!=="refs/heads/main"');
  expect(script).toContain('process.env.GITHUB_EVENT_NAME!=="push"');
  expect(script).toContain('process.env.GITHUB_RUN_ATTEMPT!=="1"');
  expect(workflow).toContain("ref:");
  expect(workflow).toContain("persist-credentials: false");
 });
 it("runs automatically on new main workflow release without secrets or a schedule",()=>{
  expect(workflow).toContain("push:");
  expect(workflow).toContain("phase3-gate05-wsss-one-public-adsb-free-get.yml");
  expect(workflow).not.toContain("workflow_dispatch:");
  expect(workflow).not.toContain("schedule:");
  expect(workflow).not.toContain("cron:");
  expect(workflow).toContain("AERODATABOX_API_KEY: ''");
  expect(workflow).toContain("DATABASE_URL: ''");
  expect(workflow).toContain("GH_TOKEN: ''");
 });
 it("prints anonymous source availability only, not aircraft identifiers",()=>{
  expect(script).toContain("gate05AdsbAggregateOnlyV39");
  expect(script).not.toContain("console.log(parsed)");
  expect(script).not.toContain("console.log(data)");
  expect(script).not.toContain("console.log(body)");
  expect(script).toContain("oneSnapshotCannotEstablishDailyCoverageOrFlightMatches:true");
  expect(script).toContain("providerSourcePermissionForLongRunNotGranted:true");
  expect(script).toContain("noPaidProviderRequests:true");
 });
});