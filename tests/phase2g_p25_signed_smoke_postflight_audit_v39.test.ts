import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";

const s=readFileSync("scripts/v39_p25_signed_smoke_postflight_readonly_v39.ts","utf8");

describe("P25 signed public POST after-action uses only read-only exact identifiers",()=>{
 it("separates synthetic session and preserved historical incident30",()=>{
  expect(s).toContain('const HIST="6267293e-75a0-42a7-b977-89543f200ebc"');
  expect(s).toContain('const TEST="c2380814-6210-43a0-847f-bf8066013063"');
  expect(s).toContain('const RECEIPT="ecc7ed79f706fcb59d288b158898cdfb65e27901f0ef8477a374176cad0d356d"');
  expect(s).toContain("counts.test_sessions===0");
  expect(s).toContain("counts.test_tombstones===1");
  expect(s).toContain("counts.historical_refs===30");
  expect(s).toContain("counts.historical_retained===30");
  expect(s).toContain('i?.recorded_cleanup==="false"');
  expect(s).toContain('p?.reconciliation_status==="UNRESOLVED"');
  expect(s).toContain("counts.open_incidents===1");
 });
 it("cannot read or mutate provider, blobs, or database",()=>{
  expect(s).toContain('await c.query("BEGIN TRANSACTION READ ONLY")');
  expect(s).toContain('await c.query("ROLLBACK")');
  expect(s).not.toMatch(/\b(?:INSERT INTO|UPDATE clean\.|DELETE FROM clean\.|TRUNCATE\s+TABLE|ALTER TABLE|CREATE TABLE|DROP TABLE)\b/i);
  expect(s).not.toContain("getBalance");
  expect(s).not.toContain("createRequiredProviderBlobStoreV39");
  expect(s).not.toContain("cleanupPrepaidProbeSessionV39");
  expect(s).toContain("paid_run_authorized:false");
  expect(s).toContain("alert_credits_spent:0");
  expect(s).toContain("Never count this as 168h live-flight retention proof");
 });
});
