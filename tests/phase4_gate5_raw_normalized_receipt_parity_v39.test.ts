import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 auditP4RawNormalizedReceiptParityV39,P4_RECEIPT_PARITY_SQL_V39
} from "../server/lib/disruption/phase4Gate5RawNormalizedReceiptParity_v39";
import type {P4FreshCohortScopeV39} from "../server/lib/disruption/phase4Gate5FreshCohortReadOnly_v39";
const scope=():P4FreshCohortScopeV39=>({
 airportIcao:"WSSS",serviceWindowStartUtc:"2026-10-31T17:00:00.000Z",
 serviceWindowEndUtc:"2026-10-31T18:00:00.000Z",
 readAsOfUtc:"2026-11-01T02:43:35.710Z",
 reviewedFrozenManifestSha256:"a".repeat(64)
});
const item=(n:number,raw:number,normalized:number,other:Record<string,unknown>={})=>({
 receipt_rank:n,raw_departure_rows:raw,normalized_rows:normalized,
 primary_rows:normalized,context_or_unknown_rows:0,
 missing_analytic_identity_rows:0,hash_mismatch_rows:0,
 earlier_than_parent_receipt_rows:0,
 distinct_provisional_analytic_ids:normalized,
 total_retained_original_receipts:2,...other
});
function db(rows:unknown[]){
 const calls:unknown[][]=[];
 return {calls,query:async(sql:string,args:unknown[])=>{
  expect(sql).toBe(P4_RECEIPT_PARITY_SQL_V39);
  calls.push(args);return {rows};
 }};
}
describe("Phase4 historical raw-versus-normalized source receipt parity — read only",()=>{
 it("measures receipt-level 111 vs 110 without claiming a specific missing flight",async()=>{
  const q=db([item(1,86,86),item(2,25,24)]);
  const r=await auditP4RawNormalizedReceiptParityV39(q,scope());
  expect(r.inspectedOriginalReceipts).toBe(2);
  expect(r.rawDepartures).toBe(111);
  expect(r.normalizedPopulationRows).toBe(110);
  expect(r.netDifference).toBe(1);
  expect(r.perReceipt.map(x=>x.netRawMinusNormalized)).toEqual([0,1]);
  expect(q.calls).toEqual([["WSSS","2026-10-31T17:00:00.000Z",
   "2026-10-31T18:00:00.000Z","2026-11-01T02:43:35.710Z"]]);
  expect(r.causesOfDifferenceVerified).toBe(false);
  expect(r.physicalOperatingFlightsCertified).toBe(false);
  expect(r.strictGate5Passed).toBe(false);
 });
 it("net zero can mask offsetting source and normalized differences",async()=>{
  const q=db([item(1,50,47),item(2,60,63,{distinct_provisional_analytic_ids:60})]);
  const r=await auditP4RawNormalizedReceiptParityV39(q,scope());
  expect(r.netDifference).toBe(0);
  expect(r.perReceipt.map(x=>x.netRawMinusNormalized)).toEqual([3,-3]);
  expect(r.causesOfDifferenceVerified).toBe(false);
 });
 it("reports unknown, not measured zero, when no original is retained",async()=>{
  const r=await auditP4RawNormalizedReceiptParityV39(db([]),scope());
  expect(r.status).toBe("NO_RETAINED_SOURCE_RECONCILIATION_UNKNOWN");
  expect(r.rawDepartures).toBeNull();
  expect(r.normalizedPopulationRows).toBeNull();
  expect(r.totalRetainedOriginalReceipts).toBeNull();
 });
 it("rejects missing raw departures shape, noncontiguous original ranks and illegal counts",async()=>{
  await expect(auditP4RawNormalizedReceiptParityV39(db([
   item(1,86,86,{raw_departure_rows:null})
  ]),scope())).rejects.toThrow("P4_RECEIPT_PARITY_MISSING_RAW_OR_COUNT");
  await expect(auditP4RawNormalizedReceiptParityV39(db([
   item(2,86,86)
  ]),scope())).rejects.toThrow("P4_RECEIPT_PARITY_COUNTER_CONTRADICTION_HOLD");
  await expect(auditP4RawNormalizedReceiptParityV39(db([
   item(1,86,86,{hash_mismatch_rows:100})
  ]),scope())).rejects.toThrow("P4_RECEIPT_PARITY_COUNTER_CONTRADICTION_HOLD");
 });
 it("tracks context and missing identity without promoting to physical flights",async()=>{
  const r=await auditP4RawNormalizedReceiptParityV39(db([
   item(1,86,86,{primary_rows:80,context_or_unknown_rows:6,
    missing_analytic_identity_rows:1,distinct_provisional_analytic_ids:79}),
   item(2,25,24)
  ]),scope());
  expect(r.perReceipt[0].contextOrUnknownNormalizedObservations).toBe(6);
  expect(r.perReceipt[0].missingAnalyticIdentityRows).toBe(1);
  expect(r.physicalOperatingFlightsCertified).toBe(false);
 });
 it("SQL is bounded to retained source cohort and no provider or writes",()=>{
  for(const q of ["source_airport_icao=$1","service_window_start_utc=$2",
   "service_window_end_utc=$3","available_at<=$4",
   "raw_expired_at_utc IS NULL","LIMIT 12",
   "population_query_id=q.population_query_id"]){
    expect(P4_RECEIPT_PARITY_SQL_V39).toContain(q);
  }
  expect(P4_RECEIPT_PARITY_SQL_V39)
   .not.toMatch(/\bINSERT\s+INTO\b|\bUPDATE\s+clean\.|\bDELETE\s+FROM\b/i);
  const s=readFileSync("server/lib/disruption/phase4Gate5RawNormalizedReceiptParity_v39.ts","utf8");
  expect(s).not.toContain("fetch(");
  expect(s).not.toContain("process.env");
  expect(s).not.toContain("AERODATABOX_API_KEY");
 });
});