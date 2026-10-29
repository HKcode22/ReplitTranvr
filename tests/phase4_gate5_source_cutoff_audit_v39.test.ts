import {describe,expect,it,vi} from "vitest";
import {auditP4Gate5SourceCutoffsV39,P4_G5_SOURCE_TIMING_SQL_V39,
 P4_G5_SNAPSHOT_SQL_V39}
 from "../server/lib/disruption/phase4Gate5SourceCutoffAudit_v39";
import {P4_INV_FIDS_SQL}
 from "../server/lib/disruption/phase4Gate5SourceInventory_v39";
const id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const scope={airport:"WSSS",auditUtc:"2026-10-29T13:00:00.000Z"};
const receipt={query_id:id,airport:"WSSS",raw_present:true,
 raw_expired_at_utc:null};
const timing={
 observations:31,primary_rows:31,context_rows:0,no_schedule:0,
 hash_mismatch:0,available_before_receipt:0,available_after_audit:0,
 before_24h:0,before_6h:5,before_90m:20,
 after_candidate_schedule:0,confirmed_core_operating_records:0
};
const snap={
 horizon:"T-6h",snapshot_rows:2,t_field_present:2,
 hash_matches:2,internal_t_arithmetic_consistent:2,strict_lineage_candidates:0
};
function fake(opts:{receipts?:unknown[];timing?:unknown;snapshots?:unknown[]}={}){
 const calls:string[]=[];
 const db={query:vi.fn(async(sql:string,params:unknown[])=>{
  calls.push(sql);
  if(sql===P4_INV_FIDS_SQL){
   expect(params).toEqual(["WSSS",scope.auditUtc]);
   return {rows:opts.receipts??[receipt]};
  }
  if(sql===P4_G5_SOURCE_TIMING_SQL_V39){
   expect(params).toEqual([[id],"WSSS",scope.auditUtc]);
   return {rows:[opts.timing??timing]};
  }
  if(sql===P4_G5_SNAPSHOT_SQL_V39){
   expect(params).toEqual([[id],"WSSS",scope.auditUtc]);
   return {rows:opts.snapshots??[snap]};
  }
  throw Error("UNEXPECTED_SQL");
 })};
 return {db,calls};
}
describe("Phase4 Gate5 actual retained source cutoff+PRE snapshot evidence",()=>{
 it("source clock counts remain observations, not validated population",async()=>{
  const {db,calls}=fake();
  const r=await auditP4Gate5SourceCutoffsV39(db,scope);
  expect(calls).toHaveLength(3);
  expect(r.latestSourceReceiptSample).toBe(1);
  expect(r.retainedQueryReceipts).toBe(1);
  expect(r.observedRows).toBe(31);
  expect(r.beforeCandidateSchedule).toEqual({
   "T-24h":0,"T-6h":5,"T-90m":20
  });
  expect(r.confirmedCoreOperatingRows).toBe(0);
  expect(r.observedSnapshots?.["T-6h"]).toEqual({
   persistedRows:2,selectedTFieldPresent:2,sourceHashMatched:2,
   internalClockArithmeticMatched:2,strictSourceLineageCandidates:0
  });
  expect(r.observedSnapshots?.["T-24h"].persistedRows).toBe(0);
  expect(r.sourceCutoffDenominatorsCertified).toBe(false);
  expect(r.webhookCaptureOutsidePopulationMeasured).toBe(false);
  expect(r.noVerifiedFirstT.certified).toBe(false);
  expect(r.strictGate5Passed).toBe(false);
  expect(r.phase6Authorized).toBe(false);
  expect(r.databaseWrites).toBe(0);
  expect(JSON.stringify(r)).not.toContain(id);
 });
 it("empty retained source returns NULL fields, no invented denominator",async()=>{
  const {db,calls}=fake({receipts:[]});
  const r=await auditP4Gate5SourceCutoffsV39(db,scope);
  expect(calls).toHaveLength(1);
  expect(r.noRetainedSource).toBe(true);
  expect(r.observedRows).toBeNull();
  expect(r.beforeCandidateSchedule["T-24h"]).toBeNull();
  expect(r.observedSnapshots).toBeNull();
 });
 it("expired original cannot enter source cohort",async()=>{
  const {db,calls}=fake({receipts:[{...receipt,raw_expired_at_utc:
   new Date("2026-10-28T00:00:00Z")}]});
  const r=await auditP4Gate5SourceCutoffsV39(db,scope);
  expect(calls).toHaveLength(1);
  expect(r.retainedQueryReceipts).toBe(0);
  expect(r.observedSnapshots).toBeNull();
 });
 it("impossible as-of monotonic counters refuse, not a fake fraction",async()=>{
  const {db}=fake({timing:{...timing,before_24h:6,before_6h:5}});
  await expect(auditP4Gate5SourceCutoffsV39(db,scope))
   .rejects.toThrow("P4_G5_IMPOSSIBLE_SOURCE_COUNTERS");
 });
 it("mismatched query field, bad clock and duplicate source rows fail",async()=>{
  for(const bad of [
   {...receipt,query_id:"not-a-uuid"},
   {...receipt,airport:"YSSY"},
  ]){
   await expect(auditP4Gate5SourceCutoffsV39(fake({receipts:[bad]}).db,scope))
    .rejects.toThrow("P4_G5_BAD_RECEIPT");
  }
  await expect(auditP4Gate5SourceCutoffsV39(fake({receipts:[receipt,receipt]}).db,scope))
   .rejects.toThrow("P4_G5_DUPLICATE_RECEIPT");
 });
 it("snapshot totals must not exceed horizon counts",async()=>{
  const {db}=fake({snapshots:[{...snap,strict_lineage_candidates:3}]});
  await expect(auditP4Gate5SourceCutoffsV39(db,scope))
   .rejects.toThrow("P4_G5_IMPOSSIBLE_SNAPSHOT_COUNTERS");
 });
 it("disallows unidentified snapshot horizons and repeated grouped rows",async()=>{
  await expect(auditP4Gate5SourceCutoffsV39(fake({snapshots:[
   {...snap,horizon:"T+10m"}]}).db,scope))
   .rejects.toThrow("P4_G5_BAD_SNAPSHOT_HORIZON");
  await expect(auditP4Gate5SourceCutoffsV39(fake({snapshots:[snap,snap]}).db,scope))
   .rejects.toThrow("P4_G5_BAD_SNAPSHOT_HORIZON");
 });
 it("both source SQL statements only SELECT and do not surface IDs",()=>{
  for(const sql of [P4_G5_SOURCE_TIMING_SQL_V39,P4_G5_SNAPSHOT_SQL_V39]){
   expect(sql.trim().startsWith("WITH")).toBe(true);
   expect(sql).not.toMatch(/\b(UPDATE|DELETE|INSERT|CREATE|TRUNCATE|DROP)\b/i);
   expect(sql).toContain("clean.");
  }
  expect(P4_G5_SNAPSHOT_SQL_V39).toContain("p.available_at<=s.prediction_cutoff_utc");
  expect(P4_G5_SNAPSHOT_SQL_V39).toContain("s.source_available<=s.prediction_cutoff_utc");
 });
});
