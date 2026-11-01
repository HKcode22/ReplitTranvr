import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {prepareP4G5PhysicalOwnerV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {auditP4G5V0076IndependentLedgerReadOnlyV39,
 P4_G5_LEDGER_BUDGET_SQL,P4_G5_LEDGER_OWNERS_SQL,
 P4_G5_LEDGER_QUERIES_SQL,P4_G5_LEDGER_ATTEMPTS_SQL}
 from "../server/lib/disruption/phase4Gate5V0076IndependentLedgerReadOnly_v39";
const bytes=readFileSync(
 "data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json","utf8");
const m=JSON.parse(bytes),hash=createHash("sha256").update(bytes).digest("hex");
function expected(){
 return (["T-24h","T-6h","T-90m"] as const).map((h,index)=>{
  const lag=h==="T-24h"?1440:h==="T-6h"?360:90;
  const first=Date.parse(m.grid.serviceWindowStartUtc)-
   (lag+m.grid.acquisitionGuardMinutes)*60000;
  return {
   owner:prepareP4G5PhysicalOwnerV39({
    cohortId:m.cohortId,frozenManifestBytes:bytes,
    reviewedManifestSha256:hash,grid:m.grid,horizon:h,
    actualOwnerProcessStartedAtUtc:new Date(first-
     (m.grid.githubPrearmLeadMinutes+5)*60000).toISOString()
   }),
   githubRunId:String(90000111+index),
   reviewedAuthorizationSha256:"a".repeat(64)
  };
 });
}
function fake(){
 const calls:string[]=[];
 const db={async query(sql:string){
  calls.push(sql);return {rows:[] as Record<string,unknown>[]};
 }};
 return {db,calls};
}
describe("Gate5 independent 3-horizon V0076 ledger audit, not scientific PASS",()=>{
 it("requires distinct complete exact three owners before reading DB",async()=>{
  const f=fake(),e=expected();
  for(const subset of [
   e.slice(0,2),
   [e[0],e[0],e[2]],
   [e[0],{...e[1],githubRunId:e[0].githubRunId},e[2]],
   [e[0],{...e[1],reviewedAuthorizationSha256:"bad"},e[2]],
   [e[0],{...e[1],owner:{...e[1].owner,manifestSha256:"b".repeat(64)}},e[2]],
   [e[0],{...e[1],owner:{...e[1].owner,
     actualPaidOwnerAuthorized:true as any}},e[2]]
  ]){
   await expect(auditP4G5V0076IndependentLedgerReadOnlyV39(
    f.db,subset as any)).rejects.toThrow();
  }
  expect(f.calls).toHaveLength(0);
 });
 it("fails closed with missing budget and rolls back caller's read-only transaction",async()=>{
  const f=fake();
  await expect(auditP4G5V0076IndependentLedgerReadOnlyV39(
   f.db,expected())).rejects.toThrow("P4_G5_LEDGER_MISSING_OR_EXTRA_BOUND_ROWS");
  expect(f.calls[0]).toContain("REPEATABLE READ READ ONLY");
  expect(f.calls.at(-1)).toBe("ROLLBACK");
  expect(f.calls.some(x=>x.includes("INSERT INTO"))).toBe(false);
 });
 it("all four independent SELECTs bind cohort manifest and exact immutable source queries",()=>{
  for(const sql of [
   P4_G5_LEDGER_BUDGET_SQL,P4_G5_LEDGER_OWNERS_SQL,
   P4_G5_LEDGER_QUERIES_SQL,P4_G5_LEDGER_ATTEMPTS_SQL
  ]){
   expect(sql).toContain("manifest_sha256=$1");
   expect(sql).not.toContain("INSERT INTO");
   expect(sql).not.toContain("UPDATE ");
   expect(sql).not.toContain("DELETE FROM");
  }
  expect(P4_G5_LEDGER_ATTEMPTS_SQL).toContain("physical_attempt_number");
  expect(P4_G5_LEDGER_QUERIES_SQL).toContain("last_reserved_attempt");
  expect(P4_G5_LEDGER_OWNERS_SQL).toContain("github_run_id");
 });
 it("GitHub main-push disposable PostgreSQL integration rejects synthetic ledger drift",()=>{
  const w=readFileSync(
   ".github/workflows/phase4-gate5-v0076-independent-ledger-disposable-pg16.yml","utf8");
  const script=readFileSync(
   "scripts/v39_phase4_gate5_v0076_independent_ledger_disposable_pg16_actions.ts","utf8");
  expect(w).toContain("postgres:16");
  expect(w).toContain("gate5_ledger");
  expect(w).toContain("persist-credentials: false");
  expect(w).not.toContain("secrets.");
  expect(w).not.toContain("workflow_dispatch:");
  expect(w).not.toContain("schedule:");
  expect(script).toContain("P4_G5_LEDGER_NONREFUNDABLE_BUDGET_PARITY_HOLD");
  expect(script).toContain("P4_G5_LEDGER_QUERY_LAST_RESERVED_MISMATCH");
  expect(script).toContain("P4_G5_IRREVERSIBLE_PHYSICAL_RESERVATION");
  expect(script).toContain("sourceSemanticsVerified:false");
  expect(script).toContain("strictGate5Passed:false");
  expect(script).not.toContain("https://aerodatabox");
 });
});
