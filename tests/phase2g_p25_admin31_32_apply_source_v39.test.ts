import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
const s=readFileSync(new URL(
 "../scripts/v39_p25_admin31_32_apply_v39.ts",import.meta.url),"utf8");
describe("P25 YSSY P19 exact admin31+32 atomic APPLY — source only",()=>{
 it("requires new affirmative authorization and SHA256 binding",()=>{
  expect(s).toContain('P25_ADMIN31_32_APPROVED!=="YES"');
  expect(s).toContain('argv[0]!=="--apply"');
  expect(s).toContain('argv[1]!=="--expected-binding"');
  expect(s).toContain("planBindingSha256!==argv[2]");
  expect(s).toContain('GITHUB_ACTIONS==="true"');
 });
 it("single serializable transaction locks exact incidents and budget",()=>{
  expect(s).toContain('BEGIN ISOLATION LEVEL SERIALIZABLE');
  expect(s).toContain("pg_try_advisory_xact_lock");
  expect(s).toContain("ORDER BY id ASC FOR UPDATE");
  expect(s).toContain("WHERE probe_budget_day_id=$1 FOR UPDATE");
  expect(s).toContain('SET LOCAL lock_timeout');
 });
 it("only admin budget row and two incident flags may be changed",()=>{
  const updateStrings=[...s.matchAll(/UPDATE clean\.[a-z_]+/g)]
    .map(m=>m[0]).sort();
  expect(updateStrings).toEqual([
    "UPDATE clean.adb_incident_stop",
    "UPDATE clean.adb_probe_budget_day"
  ]);
  expect(s).toContain("WHERE id=ANY($2::bigint[]) AND resolved=false");
  expect(s).toContain("resolved.rowCount!==2");
  expect(s).toContain("closed.rowCount!==1");
  expect(s).toContain("historicalScientificPass:false");
 });
 it("original failed-delivery-gap 231/229 remains immutable",()=>{
  expect(s).toContain('historic_reconciliation_preserved');
  expect(s).toContain('YSSY_P25_FAILED_PROBE_EXPIRED_SOURCE_ADMIN_CLOSED');
  expect(s).toContain('unchanged[0].status!=="failed"');
  expect(s).toContain('unchanged[0].reconciliation_status!=="DELIVERY_GAP"');
  expect(s).toContain('Number(unchanged[0].external_spend_credits)!==231');
  expect(s).toContain('Number(unchanged[0].internal_received_credits)!==229');
  expect(s).toContain('Number(unchanged[0].delivery_gap_credits)!==2');
 });
 it("unknown commit outcome cannot be replayed automatically",()=>{
  expect(s).toContain("HOLD_TRANSACTION_ROLLBACK_OR_COMMIT_UNCERTAIN");
  expect(s).toContain("HOLD_POSTCOMMIT_RECHECK_REQUIRED");
  expect(s).toContain("shouldNotAutomaticallyRetry:true");
  expect(s).toContain("independentPostCommitReadbackRequired:true");
 });
 it("uses strict free provider inventory; no paid endpoint or object deletion",()=>{
  expect(s).toContain("await listSubscriptionsStrict()");
  expect(s).not.toContain("await listSubscriptions()");
  expect(s).not.toContain("createSubscription(");
  expect(s).not.toContain("deleteSubscription(");
  expect(s).not.toContain("deleteProviderBlob");
 });
});
