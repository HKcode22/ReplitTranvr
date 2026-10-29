import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const script="scripts/v39_gate05_wsss_postrun_free_readonly_audit_20261028.mjs";
const workflow=".github/workflows/phase3-gate05-wsss-postrun-free-audit.yml";
const s=readFileSync(script,"utf8");
const y=readFileSync(workflow,"utf8");

describe("Gate05 completed WSSS exact-scope READ-ONLY audit",()=>{
 it("records exact new successful paid scope and the originally frozen 60-minute window",()=>{
  for(const v of [
    "618582a3-ea3f-4a10-a756-c974c472af3c",
    "84b7f1565d0402facc8c3b9aacedc599eb6e2af1",
    "2026-10-29T03:45:00.000Z","2026-10-29T04:45:00.000Z",
    "1fcded99e76cc974dc518495bd127000a3a7a9cb4344e41b6b89cb9e01b98b23",
    "cd93866bc18a2d1368981837d4af8c036094e421c7d30dd03570e0b611f43746"
  ])expect(s).toContain(v);
  expect(s).toContain("EXACT_OWNER_SCOPE_MISMATCH");
  expect(s).toContain("OWNER_PROVIDER_ID_NOT_BOUND");
 });
 it("only runs guarded database SELECT, journal+UNLOGGED counts, and FREE account GET",()=>{
  expect(s).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(s).toContain('options:"-c default_transaction_read_only=on"');
  expect(s).toContain('await db.query("ROLLBACK")');
  expect(s).toContain("clean.gate05_science_delivery_custody_v39");
  expect(s).toContain("clean.provider_content_blob_ref");
  expect(s).toContain("clean.prepaid_probe_delivery_runtime");
  expect(s).toContain("clean.prepaid_probe_item_runtime");
  expect(s).toContain('["/subscriptions/balance","/subscriptions/webhook"]');
  expect(s).toContain('method:"GET"');
  expect(s).not.toContain('method:"POST"');
  expect(s).not.toMatch(/db\.query\(\s*["'](?:INSERT|UPDATE|DELETE|ALTER|CREATE|TRUNCATE)/);
  expect(s).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(s).not.toContain("refillBalance");
  expect(y).toContain('GH_TOKEN: ""');
  expect(y).toContain('GATE05_PROVIDER_CREATE_ALLOWED: ""');
  expect(y).toContain("environment: phase2g-paid");
  expect(y).toContain("push:");
  expect(y).toContain("paths:");
  expect(y).not.toContain("cron:");
 });
 it("does not conflate metadata/UNLOGGED rows, observed provider debits and scientific certification",()=>{
  expect(s).toContain("loggedRawRefMismatchCount");
  expect(s).toContain("inWindowNotificationThreshold100Met");
  expect(s).toContain("unloggedDistinctFlightKeysNotSourceCertified");
  expect(s).toContain("originalBlobBytesReadback:false");
  expect(s).toContain("loggedHttpAckVerified:false");
  expect(s).toContain("physicalOperatingFlightsIndependentlyVerified:false");
  expect(s).toContain("sameCohortProspectiveT24T6T90Captured:false");
  expect(s).toContain("actualVsEstimatedRunwaySourceCertified:false");
  expect(s).toContain("originalStrictSciencePassed:false");
  expect(s).toContain("netAccountDebitProvisional");
  expect(s).toContain("dbFinalizationProven");
 });
 it("validates JS parse offline without contacting provider or Neon",()=>{
  const p=spawnSync(process.execPath,["--check",script],
    {encoding:"utf8",timeout:10000});
  expect(p.status).toBe(0);
 });
});