import {describe,it,expect} from "vitest";
import {persistP4G5ReviewedPreForCohortV39,
 classifyP4G5PreCutoffAgainstDbClockV39,
 P4_G5_PRE_DB_CLOCK_SQL_V39}
 from "../server/lib/disruption/phase4Gate5ScopedPreWriter_v39";
import {PRE_SNAPSHOT_BUILDER_VERSION}
 from "../server/lib/disruption/preSnapshotBuilder_v3";

const sha=(a:string)=>a.repeat(64);
const H=["T-24h","T-6h","T-90m"] as const;
const nowByHorizon={
 "T-24h":"2027-01-14T17:09:00.000Z",
 "T-6h":"2027-01-15T11:09:00.000Z",
 "T-90m":"2027-01-15T15:39:00.000Z"
};
const scope=(h:typeof H[number]="T-24h",at=nowByHorizon[h])=>({
 airportIcao:"WSSS",serviceStartUtc:"2027-01-15T17:00:00.000Z",
 serviceEndUtc:"2027-01-15T18:00:00.000Z",
 observedAtUtc:at,horizon:h,
 reviewedFrozenManifestSha256:sha("a"),
 expectedOwnerGithubRunId:"123456789012"
});
const permit=()=>({
 exactCohortManifestSha256:sha("a"),
 independentSelectedTSourceEvidenceSha256:sha("b"),
 independentPhysicalOperatingIdentityEvidenceSha256:sha("c"),
 independentlyReviewedSourceRetentionEvidenceSha256:sha("d"),
 reviewedRunAuthorizationSha256:sha("e"),
 frozenBuilderSourceSha256:sha("8"),
 builderFrozenAtUtc:"2027-01-13T12:00:00.000Z",
 verifiedExternalSourceAndRightsReview:true as const,
 selectedTConfig:{
  milestone:"departure.scheduledTime.utc",version:"source-reviewed@1",
  artifactHash:sha("f"),semanticsEvidenceSha256:sha("b"),
  verifiedProviderNativeSchedule:true as const
 }
});
const horizons=["T-24h","T-6h","T-90m"];
const cutoffs=["2027-01-14T17:10:00Z",
 "2027-01-15T11:10:00Z","2027-01-15T15:40:00Z"];
function rows(){
 return horizons.map((h,i)=>({
  analytic_identity_id:"provider-provisional-1",
  canonical_flight_instance_id:"operator-canonical-1",
  population_member_id:"11111111-1111-1111-1111-111111111111",
  population_query_id:"22222222-2222-2222-2222-222222222222",
  response_hash:sha("a"),original_hash:sha("a"),
  first_schedule:new Date("2027-01-15T17:10:00Z"),
  dep_scheduled_utc:new Date("2027-01-15T17:10:00Z"),
  horizon:h,prediction_cutoff_utc:new Date(cutoffs[i]),
  effective_available:new Date("2027-01-14T16:00:00Z"),
  member_available:new Date("2027-01-14T16:00:00Z"),
  source_available:new Date("2027-01-14T15:59:00Z"),
 all_parent_member_provenance_valid:true,
  population_role:"requested_airport_primary",
  scope_classification:"confirmed_core",
  codeshare_resolution_status:"confirmed_operating_leg"
 }));
}
function db(opts:{
 insertRowCount?:number;failInsertAt?:number;conflict?:boolean;
 missingBoundOriginal?:boolean;
 featureDrift?:boolean;horizon?:typeof H[number];now?:string;
 clockSequence?:string[];malformedClock?:boolean
}={}){
 const calls:{sql:string;args:unknown[]}[]=[];let insertCalls=0,clockCalls=0;
 const initial=opts.now??nowByHorizon[opts.horizon??"T-24h"];
 return {calls,query:async(sql:string,args:unknown[]=[])=>{
  calls.push({sql,args});
  if(sql===P4_G5_PRE_DB_CLOCK_SQL_V39){
   const value=opts.clockSequence?.[clockCalls++]??initial;
   return {rows:[{db_now_utc:opts.malformedClock?null:new Date(value)}],rowCount:1};
  }
  if(sql.includes("AS valid_originals"))
   return {rows:[{expected_slots:3,bound_originals:3,
    valid_originals:opts.missingBoundOriginal?2:3}],rowCount:1};
  if(sql.includes("FROM firsts f JOIN source_integrity si"))
   return {rows:rows(),rowCount:3};
  if(sql.startsWith("INSERT INTO clean.flight_snapshots")){
   insertCalls++;
   if(opts.failInsertAt===insertCalls)throw Error("simulated-db-failure");
   return {rows:[],rowCount:opts.insertRowCount??1};
  }
  if(sql.includes("FROM clean.flight_snapshots")){
   return {rows:[{
    selected_t_milestone_utc:new Date("2027-01-15T17:10:00Z"),
    selected_t_version:opts.conflict?"wrong":
     "departure.scheduledTime.utc:source-reviewed@1:"+sha("f"),
    population_query_id:"22222222-2222-2222-2222-222222222222",
    fids_response_hash:sha("a"),
    builder_version:PRE_SNAPSHOT_BUILDER_VERSION,
    same_features:!opts.featureDrift,same_missingness:true,
    same_frame:true,same_config:true,same_provenance:true
   }],rowCount:1};
  }
  return {rows:[],rowCount:0};
 }};
}
describe("Scoped Gate5 PRE writer requires independently reviewed native T and rights",()=>{
 it("no certificate means zero SQL calls including zero BEGIN",async()=>{
  const c=db();
  await expect(persistP4G5ReviewedPreForCohortV39(c,scope(),{
   ...permit(),verifiedExternalSourceAndRightsReview:false
  } as any)).rejects.toThrow("P4_G5_PRE_EXTERNAL_SEMANTIC_OR_RIGHTS_PROOF_HOLD");
  expect(c.calls).toHaveLength(0);
  await expect(persistP4G5ReviewedPreForCohortV39(c,scope(),{
   ...permit(),exactCohortManifestSha256:sha("1")
  })).rejects.toThrow("P4_G5_PRE_EXTERNAL_SEMANTIC_OR_RIGHTS_PROOF_HOLD");
  expect(c.calls).toHaveLength(0);
 });
 it("writes only its own due horizon in one serializable TX, never all three at once",async()=>{
  for(const horizon of H){
   const c=db({horizon});
   const out=await persistP4G5ReviewedPreForCohortV39(
    c,scope(horizon),permit());
   expect(c.calls[0].sql).toContain("SERIALIZABLE READ WRITE");
   expect(c.calls.filter(x=>x.sql.startsWith("INSERT INTO clean.flight_snapshots")))
    .toHaveLength(1);
   expect(c.calls.at(-1)?.sql).toBe("COMMIT");
   expect(out.horizon).toBe(horizon);
   expect(out.newlyPersistedRows).toBe(1);
   expect(out.expectedSourceQualifiedRows).toBe(1);
   expect(out.databaseWrites).toBe(1);
   expect(out.providerCalls).toBe(0);
   expect(out.strictGate5Passed).toBe(false);
   expect(out.notYetDueCandidates).toBe(0);
   expect(out.lateCutoffCandidatesNotBackfilled).toBe(0);
   expect(out.otherHorizonsUntouched).toBe(true);
   expect(out.allThreeOriginalReceiptsV0077BoundAndUnexpired).toBe(true);
   const bound=c.calls.find(x=>x.sql.includes("AS valid_originals"));
   expect(bound?.args).toEqual(["WSSS",scope(horizon).serviceStartUtc,
    scope(horizon).serviceEndUtc,scope(horizon).observedAtUtc,
    sha("a"),horizon,"123456789012",sha("e")]);
   expect(c.calls.some(x=>x.sql.includes(
    "JOIN clean.phase4_g5_fids_original_binding_v39 b"))).toBe(true);
   expect(out.sourceAsOfMissingByHorizon.map(x=>x.horizon)).toEqual([horizon]);
   expect(out.optionalFeatureMissingNeverSuppressesEligibleSnapshot).toBe(true);
  }
 });
 it("unbound or expired original frame cannot be converted into PRE zeros or writes",async()=>{
  const c=db({missingBoundOriginal:true});
  await expect(persistP4G5ReviewedPreForCohortV39(c,scope(),permit()))
   .rejects.toThrow("P4_G5_PRE_V0077_THREE_BOUND_ORIGINALS_UNVERIFIED_HOLD");
  expect(c.calls.at(-1)?.sql).toBe("ROLLBACK");
  expect(c.calls.some(x=>x.sql.startsWith("INSERT INTO clean.flight_snapshots")))
   .toBe(false);
  const absent=db();
  await expect(persistP4G5ReviewedPreForCohortV39(
   absent,{...scope(),expectedOwnerGithubRunId:"not-attested"},permit()))
   .rejects.toThrow("P4_G5_PRE_SINGLE_HORIZON_SCOPE_REQUIRED");
  expect(absent.calls).toHaveLength(0);
 });
 it("validates idempotent conflict against exact frozen T version, FIDS hash, builder version",async()=>{
  const c=db({insertRowCount:0});
  const out=await persistP4G5ReviewedPreForCohortV39(c,scope(),permit());
  expect(out.newlyPersistedRows).toBe(0);
  expect(out.previousVerifiedIdempotentRows).toBe(1);
  const bad=db({insertRowCount:0,conflict:true});
  await expect(persistP4G5ReviewedPreForCohortV39(bad,scope(),permit()))
   .rejects.toThrow("P4_G5_PRE_EXISTING_SNAPSHOT_PROVENANCE_CONFLICT");
  expect(bad.calls.at(-1)?.sql).toBe("ROLLBACK");
  const changedFeatures=db({insertRowCount:0,featureDrift:true});
  await expect(persistP4G5ReviewedPreForCohortV39(changedFeatures,scope(),permit()))
   .rejects.toThrow("P4_G5_PRE_EXISTING_SNAPSHOT_PROVENANCE_CONFLICT");
  expect(changedFeatures.calls.at(-1)?.sql).toBe("ROLLBACK");
 });
 it("holds every write when a feature transform was frozen after a flight prediction cutoff",async()=>{
  const c=db();
  await expect(persistP4G5ReviewedPreForCohortV39(c,scope(),{
   ...permit(),builderFrozenAtUtc:"2027-01-14T17:11:00.000Z"
  })).rejects.toThrow("P4_G5_PRE_TRANSFORM_NOT_FROZEN_BY_CUTOFF");
  expect(c.calls.at(-1)?.sql).toBe("ROLLBACK");
  expect(c.calls.some(x=>x.sql.startsWith("INSERT INTO clean.flight_snapshots"))).toBe(false);
 });
 it("rollback on DB failure and never declare a partial successful PRE write",async()=>{
  const c=db({failInsertAt:1});
  await expect(persistP4G5ReviewedPreForCohortV39(c,scope(),permit()))
   .rejects.toThrow("simulated-db-failure");
  expect(c.calls.at(-1)?.sql).toBe("ROLLBACK");
  expect(c.calls.some(x=>x.sql==="COMMIT")).toBe(false);
 });
 it("refuses invalid horizon and all unfrozen permission changes before SQL",async()=>{
  const c=db();
  await expect(persistP4G5ReviewedPreForCohortV39(c,{
   ...scope(),horizon:"UNKNOWN" as any
  },permit())).rejects.toThrow("P4_G5_PRE_SINGLE_HORIZON_SCOPE_REQUIRED");
  expect(c.calls).toHaveLength(0);
 });
 it("skips late PRE without writing a false historical backfill",async()=>{
  const c=db({now:"2027-01-14T17:10:01.000Z"});
  const out=await persistP4G5ReviewedPreForCohortV39(
   c,scope("T-24h","2027-01-14T17:10:01.000Z"),permit());
  expect(out.newlyPersistedRows).toBe(0);
  expect(out.lateCutoffCandidatesNotBackfilled).toBe(1);
  expect(out.status).toBe("NO_CURRENTLY_DUE_PRE_ROWS_NO_BACKFILL");
  expect(c.calls.some(x=>x.sql.startsWith("INSERT INTO clean.flight_snapshots")))
   .toBe(false);
 });
 it("keeps future PRE untouched rather than pretending it exists",async()=>{
  const c=db({now:"2027-01-14T17:00:00.000Z"});
  const out=await persistP4G5ReviewedPreForCohortV39(
   c,scope("T-24h","2027-01-14T17:00:00.000Z"),permit());
  expect(out.newlyPersistedRows).toBe(0);
  expect(out.notYetDueCandidates).toBe(1);
  expect(out.lateCutoffCandidatesNotBackfilled).toBe(0);
  expect(c.calls.some(x=>x.sql.startsWith("INSERT INTO clean.flight_snapshots")))
   .toBe(false);
 });
 it("never uses caller-claimed future/far-stale observation time to override DB clock",async()=>{
  for(const claimed of [
   "2027-01-14T17:10:00.000Z",
   "2027-01-14T17:04:00.000Z"
  ]){
   const c=db();
   await expect(persistP4G5ReviewedPreForCohortV39(
    c,scope("T-24h",claimed),permit()))
    .rejects.toThrow("P4_G5_PRE_CLAIMED_OBSERVATION_CLOCK_NOT_CURRENT_HOLD");
   expect(c.calls.at(-1)?.sql).toBe("ROLLBACK");
   expect(c.calls.some(x=>x.sql.startsWith("INSERT INTO clean.flight_snapshots")))
    .toBe(false);
  }
 });
 it("unavailable DB clock fails closed before staging or any PRE writes",async()=>{
  const c=db({malformedClock:true});
  await expect(persistP4G5ReviewedPreForCohortV39(c,scope(),permit()))
   .rejects.toThrow("P4_G5_PRE_UNVERIFIED_DATABASE_CLOCK_HOLD");
  expect(c.calls.at(-1)?.sql).toBe("ROLLBACK");
  expect(c.calls.some(x=>x.sql.startsWith("INSERT INTO clean.flight_snapshots")))
   .toBe(false);
 });
 it("late pre-COMMIT DB clock rolls back all new snapshots",async()=>{
  const c=db({clockSequence:[
   "2027-01-14T17:09:00.000Z",
   "2027-01-14T17:09:00.000Z",
   "2027-01-14T17:10:00.000Z"
  ]});
  await expect(persistP4G5ReviewedPreForCohortV39(c,scope(),permit()))
   .rejects.toThrow("P4_G5_PRE_COMMIT_TOO_LATE_ROLLBACK");
  expect(c.calls.some(x=>x.sql.startsWith("INSERT INTO clean.flight_snapshots")))
   .toBe(true);
  expect(c.calls.at(-1)?.sql).toBe("ROLLBACK");
 });
 it("classifies independently clocked early, timely, late cutoffs",()=>{
  const c=new Date("2027-01-14T17:10:00.000Z");
  expect(classifyP4G5PreCutoffAgainstDbClockV39(
   c,new Date("2027-01-14T17:08:00.000Z"))).toBe("DUE");
  expect(classifyP4G5PreCutoffAgainstDbClockV39(
   c,new Date("2027-01-14T17:00:00.000Z"))).toBe("NOT_YET_DUE");
  expect(classifyP4G5PreCutoffAgainstDbClockV39(
   c,new Date("2027-01-14T17:10:01.000Z"))).toBe("LATE_NO_BACKFILL");
 });
 it("blocks unknown native target, malformed SHA and incomplete source rows",async()=>{
  for(const changed of [
   {...permit(),selectedTConfig:{...permit().selectedTConfig,milestone:"generic-fids"}},
   {...permit(),independentlyReviewedSourceRetentionEvidenceSha256:"not-sha"},
   {...permit(),selectedTConfig:{...permit().selectedTConfig,semanticsEvidenceSha256:sha("9")}}
  ]){
   const c=db();
   await expect(persistP4G5ReviewedPreForCohortV39(c,scope(),changed as any))
    .rejects.toThrow("P4_G5_PRE_EXTERNAL_SEMANTIC_OR_RIGHTS_PROOF_HOLD");
   expect(c.calls).toHaveLength(0);
  }
 });
});
