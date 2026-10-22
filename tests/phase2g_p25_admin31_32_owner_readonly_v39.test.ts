import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
const s=readFileSync(new URL(
 "../scripts/v39_p25_admin31_32_readonly_review_v39.ts",import.meta.url
),"utf8");
describe("P25 YSSY incident31+32 review diagnostic must remain READ ONLY",()=>{
 it("only accepts --dry-run; no SQL UPDATE or DELETE",()=>{
  expect(s).toContain('argv[0]!=="--dry-run"');
  expect(s).toContain("BEGIN TRANSACTION READ ONLY");
  expect(s).not.toContain("UPDATE clean.");
  expect(s).not.toContain("DELETE FROM clean.");
  expect(s).toContain("approvalToApply:false");
 });
 it("requires both exact open incidents and immutable science",()=>{
  expect(s).toContain('d31.kind==="stage1_supervisor_recovery"');
  expect(s).toContain('d32.kind==="prepaid_probe_failed"');
  expect(s).toContain('d32.reconciliationStatus==="DELIVERY_GAP"');
  expect(s).toContain("probe_id=19 AND probe_budget_day_id=$1");
  expect(s).toContain("external_spend_credits");
 });
 it("requires all 58 verified source tombstones and strict free inventory",()=>{
  expect(s).toContain("listSubscriptionsStrict()");
  expect(s).not.toContain("listSubscriptions()");
  expect(s).toContain("count(DISTINCT deletion_run_id)");
  expect(s).toContain("deletion_verified_at_utc IS NOT NULL");
  expect(s).toContain("rowsInDeletionRun:Number(runs?.n??NaN)");
  expect(s).toContain("count(deletion_run_id)::int AS run_assigned");
  expect(s).toContain("count(deleted_at_utc)::int AS deleted_at_count");
  expect(s).toContain("paidProviderCalls:0,databaseWrites:0,blobDeletes:0");
 });
});
