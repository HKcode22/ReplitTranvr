import {describe,it,expect} from "vitest";
import {auditP4FreshCohortV39,
 P4_FRESH_COHORT_SOURCE_SQL_V39,
 P4_FRESH_COHORT_PRE_SQL_V39,
 P4_FRESH_COHORT_OUTCOME_SQL_V39,
 type P4FreshCohortScopeV39}
 from "../server/lib/disruption/phase4Gate5FreshCohortReadOnly_v39";
import {readFileSync} from "node:fs";
const scope=():P4FreshCohortScopeV39=>({
 airportIcao:"WSSS",
 serviceWindowStartUtc:"2026-11-04T17:00:00.000Z",
 serviceWindowEndUtc:"2026-11-04T18:00:00.000Z",
 readAsOfUtc:"2026-11-04T20:00:00.000Z",
 reviewedFrozenManifestSha256:"a".repeat(64)
});
const source=(patch:Record<string,unknown>={})=>({
 ever_retained_query_receipts:2,retained_original_query_receipts:1,
 source_population_rows:86,invalid_hash_or_clock_rows:0,
 source_consistent_primary_rows:86,
 provisional_distinct_analytic_identities:86,
 tagged_core_canonical_identities:4,...patch
});
const outcome=(patch:Record<string,unknown>={})=>({
 provisional_resolved_origin_identities:3,
 provisional_matched_core_callback_identities:1,
 provisional_outside_sampled_core_callback_identities:2,
 outcome_rows:3,outcome_status_observed:0,
 outcome_status_pending:2,outcome_status_censored:1,
 outcome_status_missing:0,outcome_status_not_applicable:0,...patch
});
const db=(a:Record<string,unknown>,p:unknown[],o:Record<string,unknown>)=>{
 const calls:{sql:string;args:unknown[]}[]=[];
 let i=0;
 return {calls,query:async(sql:string,args:unknown[])=>{
  calls.push({sql,args});const result=[{rows:[a]},{rows:p},{rows:[o]}][i++];
  if(!result)throw Error("P4_FRESH_UNEXPECTED_SQL");
  return result;
 }};
};
describe("Phase4 Gate5 fresh cohort independent read-only candidate census",()=>{
 it("uses a NEW frozen service interval; counts source/PRE/outcomes but not scientific truth",async()=>{
  const c=db(source(),[{horizon:"T-90m",persisted_pre_rows:2}],outcome());
  const r=await auditP4FreshCohortV39(c,scope());
  expect(c.calls).toHaveLength(3);
  expect(c.calls.every(x=>x.args[1]==="2026-11-04T17:00:00.000Z")).toBe(true);
  expect(c.calls.every(x=>x.args[2]==="2026-11-04T18:00:00.000Z")).toBe(true);
  expect(r.retainedOriginalQueryReceiptsMeasured).toBe(1);
  expect(r.provisionalDistinctAnalyticIdentities).toBe(86);
  expect(r.taggedCoreCanonicalIdentities).toBe(4);
  expect(r.persistedPreRowsLinkedToRetainedSource).toEqual({
   "T-24h":0,"T-6h":0,"T-90m":2
  });
  expect(r.sourceScopedOutcomeStatusCounts).toEqual({
   observed:0,pending:2,censored:1,missing:0,not_applicable:0
  });
  expect(r.provisionalMatchedCoreWebhookIdentities).toBe(1);
  expect(r.provisionalOutsideSampledCoreWebhookIdentities).toBe(2);
  expect(r.independentlyCertifiedPersistedPreCount).toBeNull();
  expect(r.actualOnlyWheelsOffLabelsObserved).toBeNull();
  expect(r.completeOperatingLegDenominator).toBeNull();
  expect(r.strictGate5Passed).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
 });
 it("absence of ORIGINAL retained source makes denominator NULL instead of an observed zero",async()=>{
  const c=db(source({
   ever_retained_query_receipts:1,retained_original_query_receipts:0,
   source_population_rows:0,source_consistent_primary_rows:0,
   provisional_distinct_analytic_identities:0,tagged_core_canonical_identities:0
  }),[],outcome({
   provisional_resolved_origin_identities:0,
   provisional_matched_core_callback_identities:0,
   provisional_outside_sampled_core_callback_identities:0,
   outcome_rows:0,outcome_status_pending:0,outcome_status_censored:0
  }));
  const r=await auditP4FreshCohortV39(c,scope());
  expect(r.status).toBe("NO_RETAINED_SOURCE_DENOMINATORS_UNKNOWN_NOT_ZERO");
  expect(r.historicalQueryReceiptsMeasured).toBe(1);
  expect(r.retainedOriginalQueryReceiptsMeasured).toBe(0);
  expect(r.provisionalDistinctAnalyticIdentities).toBeNull();
  expect(r.persistedPreRowsLinkedToRetainedSource).toBeNull();
  expect(r.actualOnlyWheelsOffLabelsObserved).toBeNull();
 });
 it("rejects counters implying capture above sampled core, contradictory targets or fabricated zero",async()=>{
  const c=db(source(),[],outcome({provisional_matched_core_callback_identities:5}));
  await expect(auditP4FreshCohortV39(c,scope()))
    .rejects.toThrow("P4_FRESH_COUNTER_CONTRADICTION_HOLD");
  const c2=db(source(),[],outcome({outcome_status_observed:3}));
  await expect(auditP4FreshCohortV39(c2,scope()))
    .rejects.toThrow("P4_FRESH_COUNTER_CONTRADICTION_HOLD");
 });
 it("never treats source hash mismatch as a countable trusted original",async()=>{
  const c=db(source({invalid_hash_or_clock_rows:87}),[],outcome());
  await expect(auditP4FreshCohortV39(c,scope()))
    .rejects.toThrow("P4_FRESH_COUNTER_CONTRADICTION_HOLD");
 });
 it("rejects malformed scope, fraudulent reviewed-manifest digest and missing exact rows",async()=>{
  const valid=db(source(),[],outcome());
  await expect(auditP4FreshCohortV39(valid,{
   ...scope(),reviewedFrozenManifestSha256:"not-a-hash"
  })).rejects.toThrow("P4_FRESH_COHORT_MANIFEST_SCOPE_HOLD");
  await expect(auditP4FreshCohortV39(valid,{
   ...scope(),serviceWindowStartUtc:"2026-11-04T17:00Z"
  })).rejects.toThrow("P4_FRESH_INVALID_UTC:start");
  const missing={query:async()=>({rows:[]})};
  await expect(auditP4FreshCohortV39(missing,scope()))
    .rejects.toThrow("P4_FRESH_READONLY_RESULT_SHAPE_HOLD");
 });
 it("SQL is bounded to the reviewed cohort with no writes, no HTTP and no old Oct31 literal",()=>{
  for(const sql of [P4_FRESH_COHORT_SOURCE_SQL_V39,
   P4_FRESH_COHORT_PRE_SQL_V39,P4_FRESH_COHORT_OUTCOME_SQL_V39]){
   expect(sql).toContain("source_airport_icao=$1");
   expect(sql).toContain("service_window_start_utc=$2::timestamptz");
   expect(sql).toContain("service_window_end_utc=$3::timestamptz");
   expect(sql).toContain("$4::timestamptz");
   expect(sql).not.toContain("2026-10-31");
   expect(sql).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bTRUNCATE\b/i);
  }
  const src=readFileSync(
   "server/lib/disruption/phase4Gate5FreshCohortReadOnly_v39.ts","utf8");
  expect(src).not.toContain("AERODATABOX_API_KEY");
  expect(src).not.toContain("fetch(");
  expect(src).not.toContain("process.env");
  expect(src).not.toContain("new pg.Client");
 });
});