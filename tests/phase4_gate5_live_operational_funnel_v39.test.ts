import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {auditP4LiveGate5FunnelV39,P4_LIVE_COHORT_SQL_V39,P4_LIVE_SNAPSHOTS_SQL_V39}
 from "../server/lib/disruption/phase4Gate5LiveFunnel_v39";

const scope={airport:"WSSS" as const,
 windowStartUtc:"2026-10-31T17:00:00.000Z",
 windowEndUtc:"2026-10-31T18:00:00.000Z",
 auditUtc:"2026-10-31T00:20:00.000Z"};
const horizons=["T-24h","T-6h","T-90m"];
function rows(overrides:Record<string,unknown>={}){
 return horizons.map(h=>({
  horizon:h,source_query_receipts:1,source_population_observations:24,
  primary_observations:24,unverified_scope_observations:24,
  unverified_operator_observations:24,invalid_source_lineage_observations:0,
  missing_schedule_observations:0,provisional_distinct_analytic_ids:24,
  no_initial_schedule:0,provisional_asof_eligible_ids:20,
  observed_core_classified_ids:0,...overrides
 }));
}
function db(x:unknown[]=rows(),snap:unknown[]=[]){
 return {query:vi.fn(async(sql:string,args:unknown[])=>{
   expect(args).toEqual([scope.airport,scope.windowStartUtc,scope.windowEndUtc,scope.auditUtc]);
   if(sql===P4_LIVE_COHORT_SQL_V39)return {rows:x};
   if(sql===P4_LIVE_SNAPSHOTS_SQL_V39)return {rows:snap};
   throw Error("unexpected SQL");
 })};
}
describe("Phase4 live production same-cohort funnel",()=>{
 it("measures 24 raw population observations, 20 provisional as-of identities and zero PRE snapshots",async()=>{
   const q=db();
   const r=await auditP4LiveGate5FunnelV39(q,scope);
   expect(r.sourceQueryReceipts).toBe(1);
   expect(r.populationObservations).toBe(24);
   expect(r.primaryObservations).toBe(24);
   expect(r.horizons).toHaveLength(3);
   expect(r.horizons[0].candidateDistinctAnalyticIds).toBe(24);
   expect(r.horizons[0].candidateAsOfEligibleIds).toBe(20);
   expect(r.horizons[0].persistedPreSnapshots).toBe(0);
   expect(r.horizons[0].webhookCapturedWithConfirmedIdentity).toBeNull();
   expect(r.horizons[0].capturedOutsidePopulation).toBeNull();
   expect(r.horizons[0].expectedCertifiedSnapshots).toBeNull();
   expect(r.horizons[0].targetObserved).toBeNull();
   expect(r.strictGate5Passed).toBe(false);
   expect(r.providerCalls).toBe(0);
   expect(q.query).toHaveBeenCalledTimes(2);
 });
 it("measures existing persisted snapshots separately without calling them certified",async()=>{
   const r=await auditP4LiveGate5FunnelV39(db(rows(),[
     {horizon:"T-24h",persisted_snapshots:3}
   ]),scope);
   expect(r.horizons[0].persistedPreSnapshots).toBe(3);
   expect(r.horizons[1].persistedPreSnapshots).toBe(0);
   expect(r.horizons[0].expectedCertifiedSnapshots).toBeNull();
 });
 it("no eligible source is unknown, never a zero-population coverage percentage",async()=>{
   const r=await auditP4LiveGate5FunnelV39(db(rows({
    source_query_receipts:0,source_population_observations:0,
    primary_observations:0,unverified_scope_observations:0,
    unverified_operator_observations:0,
    provisional_distinct_analytic_ids:0,
    provisional_asof_eligible_ids:0
   })),scope);
   expect(r.populationObservations).toBe(0);
   expect(r.horizons[0].expectedCertifiedSnapshots).toBeNull();
   expect(r.horizons[0].webhookCapturedWithConfirmedIdentity).toBeNull();
 });
 it("invalid, contradictory or duplicated source and snapshot counts fail",async()=>{
   for(const bad of [
     {provisional_asof_eligible_ids:25},
     {observed_core_classified_ids:21},
     {unverified_scope_observations:25},
     {invalid_source_lineage_observations:25},
     {source_query_receipts:0}
   ]) await expect(auditP4LiveGate5FunnelV39(db(rows(bad)),scope))
       .rejects.toThrow("P4_LIVE_FUNNEL_IMPOSSIBLE_COUNTS");
   await expect(auditP4LiveGate5FunnelV39(db(rows(),[
    {horizon:"T-6h",persisted_snapshots:2},
    {horizon:"T-6h",persisted_snapshots:2}
   ]),scope)).rejects.toThrow("P4_LIVE_FUNNEL_SNAPSHOT_HORIZON_HOLD");
 });
 it("fixed scope read-only SQL excludes expired or older-than-24h source and no writes",async()=>{
   const bad={...scope,windowStartUtc:"2026-10-29T17:00:00.000Z"};
   const q=db();
   await expect(auditP4LiveGate5FunnelV39(q,bad)).rejects.toThrow("P4_LIVE_FUNNEL_SCOPE_HOLD");
   expect(q.query).not.toHaveBeenCalled();
   for(const sql of [P4_LIVE_COHORT_SQL_V39,P4_LIVE_SNAPSHOTS_SQL_V39]){
     expect(sql).toContain("raw_expired_at_utc IS NULL");
     expect(sql).toContain("raw_persisted_at_utc >= $4::timestamptz - interval '24 hours'");
     expect(sql).toContain("service_window_start_utc=$2::timestamptz");
     expect(sql).toContain("LIMIT 12");
     expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|DROP)\b/i);
   }
   const script=readFileSync("scripts/v39_gate5_source_inventory_readonly_actions.ts","utf8");
   expect(script).toContain("auditP4LiveGate5FunnelV39");
   expect(script).toContain("sameCohortOperationalFunnel");
   expect(script).toContain("REPEATABLE READ READ ONLY");
 });
});
