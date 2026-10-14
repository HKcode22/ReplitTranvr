import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {join} from "node:path";
describe("Phase2G five-probe runtime closeout read-only surface",()=>{
 const s=readFileSync(join(process.cwd(),
  "scripts/v39_phase2g_early_pilot_closeout_readonly_v39.ts"),"utf8");
 it("uses readonly SQL transaction and makes no paid provider mutations",()=>{
  expect(s).toContain('BEGIN TRANSACTION READ ONLY');
  expect(s).toContain('SET LOCAL statement_timeout');
  expect(s).toContain('FROM clean.adb_anchor_probe');
  expect(s).toContain('FROM clean.adb_probe_reconciliation_evidence');
  expect(s).toContain('FROM clean.provider_content_blob_ref');
  expect(s).toContain('FROM clean.adb_incident_stop');
  expect(s).toContain('listSubscriptionsStrict');
  expect(s).not.toContain('createSubscription(');
  expect(s).not.toContain('deleteSubscription(');
  expect(s).not.toContain('refillBalance(');
  expect(s).not.toMatch(/await c\.query\(["'`]\s*\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
 });
 it("hardpins YSSY original immutable recon before emitting fieldwork closeout",()=>{
  expect(s).toContain("Number(r.external_spend_credits)!==231");
  expect(s).toContain("Number(r.internal_received_credits)!==229");
  expect(s).toContain("gap!==2");
  expect(s).toContain('paid_gate3_authorized:false');
 });
});
