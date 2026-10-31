import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {auditP4LivePreBuilderCandidatesV39,P4_LIVE_PREVIEW_SQL_V39}
 from "../server/lib/disruption/phase4Gate5LivePreBuilderCandidates_v39";
const scope={airport:"WSSS" as const,
 windowStartUtc:"2026-10-31T17:00:00.000Z",
 windowEndUtc:"2026-10-31T18:00:00.000Z",
 auditUtc:"2026-10-31T00:50:00.000Z"};
const ids=["provisional:sample001","provisional:sample002"];
const h=["T-24h","T-6h","T-90m"] as const;
const cutoffs=["2026-10-30T17:10:00.000Z",
 "2026-10-31T11:10:00.000Z","2026-10-31T15:40:00.000Z"];
function rows(){
 return ids.flatMap(id=>h.map((horizon,i)=>({
  analytic_identity_id:id,horizon,first_schedule:new Date("2026-10-31T17:10:00.000Z"),
  prediction_cutoff_utc:new Date(cutoffs[i]),
  population_query_id:"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  response_hash:"a".repeat(64),
  observed_schedule:new Date("2026-10-31T17:10:00.000Z"),
  source_available:new Date("2026-10-30T14:00:00.000Z"),
  scope_classification:"unknown",
  codeshare_resolution_status:"ambiguous_codeshare"
 })));
}
function db(data:unknown[]=rows()){
 return {query:vi.fn(async(sql:string,args:unknown[])=>{
  expect(sql).toBe(P4_LIVE_PREVIEW_SQL_V39);
  expect(args).toEqual([scope.airport,scope.windowStartUtc,scope.windowEndUtc,scope.auditUtc]);
  return {rows:data};
 })};
}
describe("real Phase4 FIDS-backed PRE builder execution",()=>{
 it("builds all as-of candidate horizon features; independent missing optional callbacks/weather",async()=>{
  const q=db();
  const r=await auditP4LivePreBuilderCandidatesV39(q,scope);
  expect(r.provisionalDistinctIdentityCount).toBe(2);
  expect(r.horizons.map(x=>x.previewBuilt)).toEqual([2,2,2]);
  expect(r.horizons.map(x=>x.optionalWebhookFeatureMissing)).toEqual([2,2,2]);
  expect(r.horizons.map(x=>x.optionalWeatherFeatureMissing)).toEqual([2,2,2]);
  expect(r.horizons.map(x=>x.requiredScheduleFeaturePresent)).toEqual([2,2,2]);
  expect(r.horizons[0].cutoffAlreadyReachedPreviewCount).toBe(2);
  expect(r.horizons[1].previewBeforeActualCutoffCount).toBe(2);
  expect(r.horizons[2].previewBeforeActualCutoffCount).toBe(2);
  expect(r.noSnapshotPersistedByPreview).toBe(true);
  expect(r.firstTProviderSemanticsIndependentlyVerified).toBe(false);
  expect(r.providerCalls).toBe(0);expect(r.databaseWrites).toBe(0);
  expect(q.query).toHaveBeenCalledTimes(1);
 });
 it("distinguishes candidate no FIDS-before-cutoff from nonexistent airport population",async()=>{
  const f=rows();f[0]={...f[0],population_query_id:null as any,
   response_hash:null as any,observed_schedule:null as any,source_available:null as any};
  const r=await auditP4LivePreBuilderCandidatesV39(db(f),scope);
  expect(r.provisionalDistinctIdentityCount).toBe(2);
  expect(r.horizons[0].insufficientSourceAtCutoff).toBe(1);
  expect(r.horizons[0].previewBuilt).toBe(1);
  expect(r.horizons[1].previewBuilt).toBe(2);
 });
 it("source receipt newer than nominal cutoff is never silently accepted",async()=>{
  const f=rows();
  f[0]={...f[0],source_available:new Date("2026-10-30T19:00:00Z")};
  await expect(auditP4LivePreBuilderCandidatesV39(db(f),scope))
   .rejects.toThrow("P4_PREVIEW_LATE_OR_MALFORMED_SOURCE");
 });
 it("duplicate flight/horizon, missing T and missing source hash are explicit",async()=>{
  const f=rows();f[1]={...f[1],horizon:f[0].horizon};
  await expect(auditP4LivePreBuilderCandidatesV39(db(f),scope))
    .rejects.toThrow("P4_PREVIEW_DUPLICATE_ID_HORIZON");
  const t=rows();t[0]={...t[0],first_schedule:null as any};
  await expect(auditP4LivePreBuilderCandidatesV39(db(t),scope))
    .rejects.toThrow("P4_PREVIEW_FIRST_SCHEDULE_CUTOFF_CONTRADICTION");
  const a=rows();a[0]={...a[0],response_hash:"BAD"};
  await expect(auditP4LivePreBuilderCandidatesV39(db(a),scope))
    .rejects.toThrow("P4_PREVIEW_LATE_OR_MALFORMED_SOURCE");
 });
 it("never writes to source or certified PRE snapshots, enforces one cohort and local protection",async()=>{
  const q=db();
  await expect(auditP4LivePreBuilderCandidatesV39(q,{...scope,
   windowEndUtc:"2026-11-01T18:00:00.000Z"}))
   .rejects.toThrow("P4_PREVIEW_SCOPE_HOLD");
  expect(q.query).not.toHaveBeenCalled();
  const sql=P4_LIVE_PREVIEW_SQL_V39;
  for(const token of ["raw_payload IS NOT NULL",
   "raw_expired_at_utc IS NULL","raw_persisted_at_utc >= $4::timestamptz - interval '24 hours'",
   "source_consistent","p.effective_available<=f.first_schedule-h.lag",
   "LIMIT 1","LEFT JOIN LATERAL"])expect(sql).toContain(token);
  expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|DROP)\b/i);
  const wire=readFileSync("scripts/v39_gate5_source_inventory_readonly_actions.ts","utf8");
  expect(wire).toContain("auditP4LivePreBuilderCandidatesV39");
  expect(wire).toContain("P4_GATE5_PRE_BUILDER_CUTOFF_PARITY_HOLD");
  expect(wire).toContain("REPEATABLE READ READ ONLY");
 });
});
