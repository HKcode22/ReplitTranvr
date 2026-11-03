import {describe,it,expect} from "vitest";
import {stageP4G5ScopedPreV39,P4_G5_SCOPED_PRE_SOURCE_SQL,
 P4_G5_SCOPED_PRE_V0077_BOUND_SOURCE_SQL_V39,
 P4_G5_SCOPED_PRE_V0077_FRAME_SQL_V39}
 from "../server/lib/disruption/phase4Gate5ScopedPreStaging_v39";

const scope=()=>({
 airportIcao:"WSSS",serviceStartUtc:"2027-01-15T17:00:00.000Z",
 serviceEndUtc:"2027-01-15T18:00:00.000Z",
 observedAtUtc:"2027-01-15T20:00:00.000Z",
 reviewedFrozenManifestSha256:"a".repeat(64)
});
const horizons=["T-24h","T-6h","T-90m"] as const;
const cutoffs=["2027-01-14T17:10:00.000Z",
 "2027-01-15T11:10:00.000Z","2027-01-15T15:40:00.000Z"];
const rows=()=>horizons.map((h,i)=>({
 analytic_identity_id:"operating-provisional-001",first_schedule:new Date("2027-01-15T17:10:00Z"),
 horizon:h,prediction_cutoff_utc:new Date(cutoffs[i]),
 canonical_flight_instance_id:"verified-canonical-001",
 population_member_id:"11111111-1111-1111-1111-111111111111",
 population_query_id:"22222222-2222-2222-2222-222222222222",
 response_hash:"a".repeat(64),original_hash:"a".repeat(64),
 dep_scheduled_utc:new Date("2027-01-15T17:10:00Z"),
 effective_available:new Date("2027-01-14T16:00:00Z"),
 member_available:new Date("2027-01-14T16:00:00Z"),
 source_available:new Date("2027-01-14T15:59:00Z"),
 all_parent_member_provenance_valid:true,
 population_role:"requested_airport_primary",scope_classification:"confirmed_core",
 codeshare_resolution_status:"confirmed_operating_leg"
}));
const db=(r:unknown[])=>{
 const calls:{sql:string;args?:unknown[]}[]=[];
 return {calls,query:async(sql:string,args?:unknown[])=>{
  calls.push({sql,args});
  return {rows:r,rowCount:r.length};
 }};
};
describe("Gate5 new-cohort PRE as-of staging, not falsely certified persistence",()=>{
 it("builds 3 separate PRE cutoff previews from same immutable earliest T",async()=>{
  const c=db(rows()),r=await stageP4G5ScopedPreV39(c,scope());
  expect(c.calls).toHaveLength(1);
  expect(c.calls[0].args).toEqual(["WSSS",scope().serviceStartUtc,
   scope().serviceEndUtc,scope().observedAtUtc]);
  expect(r.counts.map(c=>c.sourceObserved)).toEqual([1,1,1]);
  expect(r.counts.map(c=>c.built)).toEqual([1,1,1]);
  expect(r.candidateInMemoryRows).toBe(3);
  expect(r.staged.map(x=>x.snapshot.predictionCutoffUtc.toISOString()))
   .toEqual(cutoffs);
  for(const row of r.staged){
   expect(row.snapshot.features[0].missing).toBe(false);
   expect(row.snapshot.features[1].missing).toBe(true);
   expect(row.snapshot.features[2].missing).toBe(true);
   expect(row.snapshot.selectedTVersion).toContain("NOT_CERTIFIED");
  }
  expect(r.certifiedSnapshotRowsPersisted).toBe(0);
  expect(r.strictGate5Passed).toBe(false);
  expect(r.databaseWrites).toBe(0);
 });
 it("only binds source in the exact manifest/horizon/GitHub run and valid 3-slot V0077 frame",async()=>{
  const calls:{sql:string;args?:unknown[]}[]=[];
  const c={query:async(sql:string,args?:unknown[])=>{
   calls.push({sql,args});
   return sql===P4_G5_SCOPED_PRE_V0077_FRAME_SQL_V39?
    {rows:[{expected_slots:3,bound_originals:3,valid_originals:3,valid_slots:3}],rowCount:1}:
    {rows:rows(),rowCount:3};
  }};
  const bound={horizon:"T-6h" as const,
   expectedOwnerGithubRunId:"123456789012",
   reviewedRunAuthorizationSha256:"b".repeat(64)};
  const out=await stageP4G5ScopedPreV39(c,scope(),bound);
  expect(out.candidateInMemoryRows).toBe(3);
  expect(calls).toHaveLength(2);
  expect(calls[0].sql).toBe(P4_G5_SCOPED_PRE_V0077_FRAME_SQL_V39);
  expect(calls[1].sql).toBe(P4_G5_SCOPED_PRE_V0077_BOUND_SOURCE_SQL_V39);
  expect(calls[0].args).toEqual(["WSSS",scope().serviceStartUtc,
    scope().serviceEndUtc,scope().observedAtUtc,
    "a".repeat(64),"T-6h","123456789012","b".repeat(64)]);
  for(const required of ["clean.phase4_g5_fids_original_binding_v39",
   "clean.phase4_g5_fids_physical_attempt_v39",
   "ow.horizon=$6","ow.github_run_id=$7",
   "ow.reviewed_authorization_sha256=$8",
   "b.source_use_expires_at_utc>clock_timestamp()"])
   expect(P4_G5_SCOPED_PRE_V0077_BOUND_SOURCE_SQL_V39).toContain(required);
  expect(out.strictGate5Passed).toBe(false);
 });
 it("admits the actual 1/3 source-bound prefix before the first flight cutoff",async()=>{
  const calls:string[]=[];
  const reader={query:async(sql:string)=>{
   calls.push(sql);
   if(sql===P4_G5_SCOPED_PRE_V0077_FRAME_SQL_V39)
    return {rows:[{expected_slots:3,bound_originals:1,
     valid_originals:1,valid_slots:1}],rowCount:1};
   return {rows:rows(),rowCount:3};
  }};
  const out=await stageP4G5ScopedPreV39(reader,scope(),{
   horizon:"T-24h",expectedOwnerGithubRunId:"123456789012",
   reviewedRunAuthorizationSha256:"b".repeat(64)
  });
  expect(calls).toEqual([P4_G5_SCOPED_PRE_V0077_FRAME_SQL_V39,
   P4_G5_SCOPED_PRE_V0077_BOUND_SOURCE_SQL_V39]);
  expect(out.sourceBoundPrefixAtRead).toEqual({
   expectedSlots:3,validBoundOriginals:1
  });
  expect(out.sourceFullThreeOriginalFrameAsOfRead).toBe(false);
  expect(out.strictGate5Passed).toBe(false);
 });
 it("accepts a distinct valid 2/3 prefix without misreporting 3/3 completion",async()=>{
  const reader={query:async(sql:string)=>sql===P4_G5_SCOPED_PRE_V0077_FRAME_SQL_V39?
   {rows:[{expected_slots:3,bound_originals:2,valid_originals:2,
    valid_slots:2}],rowCount:1}:{rows:rows(),rowCount:3}};
  const r=await stageP4G5ScopedPreV39(reader,scope(),{
   horizon:"T-6h",expectedOwnerGithubRunId:"123456789012",
   reviewedRunAuthorizationSha256:"b".repeat(64)
  });
  expect(r.sourceBoundPrefixAtRead?.validBoundOriginals).toBe(2);
  expect(r.sourceFullThreeOriginalFrameAsOfRead).toBe(false);
 });
 it("refuses zero source, invalid/expired prefix, or duplicated query slots",async()=>{
  for(const sample of [
   {expected_slots:3,bound_originals:0,valid_originals:0,valid_slots:0},
   {expected_slots:3,bound_originals:1,valid_originals:0,valid_slots:0},
   {expected_slots:3,bound_originals:2,valid_originals:2,valid_slots:1},
   {expected_slots:2,bound_originals:1,valid_originals:1,valid_slots:1},
  ]){
   const reader={query:async()=>({rows:[sample],rowCount:1})};
   await expect(stageP4G5ScopedPreV39(reader,scope(),{
    horizon:"T-90m",expectedOwnerGithubRunId:"123456789012",
    reviewedRunAuthorizationSha256:"b".repeat(64)
   })).rejects.toThrow("P4_G5_PRE_V0077_BOUND_PREFIX_INVALID_OR_UNOBSERVED_HOLD");
  }
 });
 it("incomplete or expired three-source binding holds rather than zero PRE",async()=>{
  const calls:string[]=[];
  const db={query:async(sql:string)=>{
   calls.push(sql);
   return {rows:[{expected_slots:3,bound_originals:3,valid_originals:2,valid_slots:2}],
    rowCount:1};
  }};
  await expect(stageP4G5ScopedPreV39(db,scope(),{
   horizon:"T-24h",expectedOwnerGithubRunId:"123456789012",
   reviewedRunAuthorizationSha256:"b".repeat(64)
  })).rejects.toThrow("P4_G5_PRE_V0077_BOUND_PREFIX_INVALID_OR_UNOBSERVED_HOLD");
  expect(calls).toEqual([P4_G5_SCOPED_PRE_V0077_FRAME_SQL_V39]);
  const duplicateSlots={query:async(sql:string)=>{
   calls.push(sql);
   return {rows:[{expected_slots:3,bound_originals:3,valid_originals:3,
    valid_slots:2}],rowCount:1};
  }};
  calls.length=0;
  await expect(stageP4G5ScopedPreV39(duplicateSlots,scope(),{
   horizon:"T-24h",expectedOwnerGithubRunId:"123456789012",
   reviewedRunAuthorizationSha256:"b".repeat(64)
  })).rejects.toThrow("P4_G5_PRE_V0077_BOUND_PREFIX_INVALID_OR_UNOBSERVED_HOLD");
  expect(calls).toEqual([P4_G5_SCOPED_PRE_V0077_FRAME_SQL_V39]);
  const noDb=db;calls.length=0;
  await expect(stageP4G5ScopedPreV39(noDb,scope(),{
   horizon:"T-6h",expectedOwnerGithubRunId:"FAKE",
   reviewedRunAuthorizationSha256:"b".repeat(64)
  })).rejects.toThrow("P4_G5_PRE_V0077_SOURCE_OWNER_SCOPE_HOLD");
  expect(calls).toHaveLength(0);
 });
 it("missing candidate at first horizon remains explicit, not zero-flight denominator",async()=>{
  const vals=rows();
  vals[0]={...vals[0],population_query_id:null as any,
   response_hash:null as any,original_hash:null as any,
   effective_available:null as any,member_available:null as any,
   source_available:null as any};
  const r=await stageP4G5ScopedPreV39(db(vals),scope());
  expect(r.counts[0].sourceUnobserved).toBe(1);
  expect(r.counts[0].built).toBe(0);
  expect(r.counts[1].built).toBe(1);
  expect(r.counts[2].built).toBe(1);
 });
 it("unknown operating/codeshare identity does not become a certified physical flight",async()=>{
  const vals=rows().map(v=>({...v,canonical_flight_instance_id:null as any,
   scope_classification:"unknown",
   codeshare_resolution_status:"ambiguous_unknown"}));
  const r=await stageP4G5ScopedPreV39(db(vals),scope());
  expect(r.counts.map(x=>x.unverifiedScopeOrIdentity)).toEqual([1,1,1]);
  expect(r.candidateInMemoryRows).toBe(0);
 });
 it("hard-refuses member-before-parent, late source and response-hash mismatch",async()=>{
  for(const change of [
   {member_available:new Date("2027-01-14T15:58:00Z")},
   {effective_available:new Date("2027-01-14T18:00:00Z")},
   {response_hash:"b".repeat(64)}
  ]){
   const vals=rows();vals[0]={...vals[0],...change};
   await expect(stageP4G5ScopedPreV39(db(vals),scope()))
    .rejects.toThrow("P4_G5_PRE_ORIGINAL_ASOF_OR_HASH_HOLD");
  }
 });
 it("refuses any earlier invalid original SHA/clock even if latest source looks valid",async()=>{
  const vals=rows();vals[0]={...vals[0],all_parent_member_provenance_valid:false};
  await expect(stageP4G5ScopedPreV39(db(vals),scope()))
   .rejects.toThrow("P4_G5_PRE_HISTORICAL_SOURCE_LINEAGE_HOLD");
 });
 it("rejects duplicate ID/horizon, bad cutoff, malformed manifest scope",async()=>{
  const vals=rows();vals[1]={...vals[1],horizon:"T-24h"};
  await expect(stageP4G5ScopedPreV39(db(vals),scope()))
    .rejects.toThrow("P4_G5_PRE_DUPLICATE_FLIGHT_HORIZON");
  const bad=rows();bad[0]={...bad[0],prediction_cutoff_utc:new Date("2027-01-14T17:11:00Z")};
  await expect(stageP4G5ScopedPreV39(db(bad),scope()))
    .rejects.toThrow("P4_G5_PRE_HORIZON_TIMESTAMP_CONTRADICTION");
  await expect(stageP4G5ScopedPreV39(db(rows()),{...scope(),
   reviewedFrozenManifestSha256:"NOT_HASH"}))
    .rejects.toThrow("P4_G5_PRE_MANIFEST_OR_AIRPORT_HOLD");
 });
 it("SQL reads only exact cohort and original source, never late FIDS or writes",()=>{
  const sql=P4_G5_SCOPED_PRE_SOURCE_SQL;
  for(const t of ["service_window_start_utc=$2::timestamptz",
   "service_window_end_utc=$3::timestamptz","raw_payload IS NOT NULL",
   "raw_expired_at_utc IS NULL","p.effective_available<=f.first_schedule-h.lag",
   "DISTINCT ON (analytic_identity_id)","LEFT JOIN LATERAL"])
   expect(sql).toContain(t);
  expect(sql).toContain("response_hash IS NOT NULL AND original_hash IS NOT NULL");
  expect(sql).toContain("member_available IS NOT NULL AND source_available IS NOT NULL");
  expect(sql).not.toContain("2026-10-31");
  expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|DROP)\b/i);
 });
});
