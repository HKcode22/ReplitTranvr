import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {auditP4LiveCaptureOutcomeV39,P4_LIVE_CAPTURE_SQL_V39}
 from "../server/lib/disruption/phase4Gate5LiveCaptureOutcome_v39";
const scope={airport:"WSSS" as const,windowStartUtc:"2026-10-31T17:00:00.000Z",
 windowEndUtc:"2026-10-31T18:00:00.000Z",
 auditUtc:"2026-10-31T00:30:00.000Z"};
const row={
 retained_fids_receipts:1,core_canonical_identities:0,
 webhook_resolved_with_wsss_origin:0,
 webhook_resolved_matched_to_core:0,
 webhook_resolved_outside_sampled_core:0,
 wheelsoff_outcome_rows:0,wheelsoff_status_observed:0,
 wheelsoff_status_pending:0,wheelsoff_status_censored:0,
 wheelsoff_status_missing:0,wheelsoff_status_not_applicable:0
};
function db(data:Record<string,unknown>=row){
 return {query:vi.fn(async(sql:string,args:unknown[])=>{
   expect(sql).toBe(P4_LIVE_CAPTURE_SQL_V39);
   expect(args).toEqual([scope.airport,scope.windowStartUtc,scope.windowEndUtc,scope.auditUtc]);
   return {rows:[data]};
 })};
}
describe("Phase4 real webhook resolved-capture/outcome funnel",()=>{
 it("reports no *verified* matched events without falsely certifying no captured flights",async()=>{
  const client=db();
  const r=await auditP4LiveCaptureOutcomeV39(client,scope);
  expect(r.retainedFidsReceipts).toBe(1);
  expect(r.confirmedCoreCanonicalIdentities).toBe(0);
  expect(r.resolvedWebhookMatchedToSampledCore).toBe(0);
  expect(r.serviceWindowCompletedAtAudit).toBe(false);
  expect(r.certifiedCapturedOutsidePopulation).toBeNull();
  expect(r.unresolvedWebhookIdentityObservations).toBeNull();
  expect(r.fullWebhookCaptureRate).toBeNull();
  expect(r.verifiedActualRunwayLabels).toBeNull();
  expect(r.strictGate5Passed).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(client.query).toHaveBeenCalledTimes(1);
 });
 it("counts distinct WSSS resolved associations, matched core and nonmatched sample separately",async()=>{
  const client=db({...row,core_canonical_identities:7,
    webhook_resolved_with_wsss_origin:5,
    webhook_resolved_matched_to_core:3,
    webhook_resolved_outside_sampled_core:2,
    wheelsoff_outcome_rows:4,wheelsoff_status_observed:2,
    wheelsoff_status_censored:1,wheelsoff_status_pending:1});
  const r=await auditP4LiveCaptureOutcomeV39(client,scope);
  expect(r.resolvedWebhookMatchedToSampledCore).toBe(3);
  expect(r.resolvedWebhookOutsideSampledCore).toBe(2);
  expect(r.certifiedCapturedOutsidePopulation).toBeNull();
  expect(r.wheelsoffStatusObserved).toBe(2);
  expect(r.wheelsoffStatusCensored).toBe(1);
  expect(r.verifiedActualRunwayLabels).toBeNull();
 });
 it("rejects inconsistent identity or outcome ledgers instead of hiding errors",async()=>{
  for(const change of [
   {core_canonical_identities:2,webhook_resolved_with_wsss_origin:4,
    webhook_resolved_matched_to_core:3,webhook_resolved_outside_sampled_core:1},
   {webhook_resolved_with_wsss_origin:1,
    webhook_resolved_matched_to_core:0,webhook_resolved_outside_sampled_core:0},
   {wheelsoff_outcome_rows:2,wheelsoff_status_observed:1},
   {retained_fids_receipts:0,core_canonical_identities:1},
   {wheelsoff_outcome_rows:1,wheelsoff_status_observed:1}
  ])await expect(auditP4LiveCaptureOutcomeV39(db({...row,...change}),scope))
   .rejects.toThrow("P4_LIVE_CAPTURE_IMPOSSIBLE_COUNTERS");
 });
 it("fails unreviewed airport/cohort before any query, with read-only bounded SQL",async()=>{
  const client=db();
  await expect(auditP4LiveCaptureOutcomeV39(client,{...scope,airport:"WSSS",
    windowStartUtc:"2026-10-30T17:00:00.000Z"}))
    .rejects.toThrow("P4_LIVE_CAPTURE_BAD_SCOPE");
  expect(client.query).not.toHaveBeenCalled();
  const sql=P4_LIVE_CAPTURE_SQL_V39;
  expect(sql).toContain("raw_persisted_at_utc >= $4::timestamptz - interval '24 hours'");
  expect(sql).toContain("service_window_start_utc=$2::timestamptz");
  expect(sql).toContain("webhook_identity_resolution");
  expect(sql).toContain("webhook_flight_identity");
  expect(sql).toContain("flight_outcomes");
  expect(sql).toContain("resolution_status='resolved'");
  expect(sql).toContain("r.provider_identity_expired_at_utc IS NULL");
  expect(sql).toContain("x.target='wheels_off'");
  expect(sql).not.toMatch(/\b(?:UPDATE|INSERT|DELETE|CREATE|TRUNCATE|DROP)\b/i);
  const operator=readFileSync("scripts/v39_gate5_source_inventory_readonly_actions.ts","utf8");
  expect(operator).toContain("auditP4LiveCaptureOutcomeV39");
  expect(operator).toContain("sameCohortResolvedCaptureAndOutcomes");
  expect(operator).toContain("P4_GATE5_CAPTURE_COHORT_FIDS_RECEIPT_PARITY_HOLD");
  expect(operator).toContain("REPEATABLE READ READ ONLY");
 });
});
