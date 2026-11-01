import {describe,it,expect} from "vitest";
import {persistP4G5ReviewedPreForCohortV39}
 from "../server/lib/disruption/phase4Gate5ScopedPreWriter_v39";
import {PRE_SNAPSHOT_BUILDER_VERSION}
 from "../server/lib/disruption/preSnapshotBuilder_v3";

const sha=(a:string)=>a.repeat(64);
const scope=()=>({
 airportIcao:"WSSS",serviceStartUtc:"2027-01-15T17:00:00.000Z",
 serviceEndUtc:"2027-01-15T18:00:00.000Z",
 observedAtUtc:"2027-01-15T20:00:00.000Z",
 reviewedFrozenManifestSha256:sha("a")
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
function db(opts:{insertRowCount?:number;failInsertAt?:number;conflict?:boolean;featureDrift?:boolean}={}){
 const calls:{sql:string;args:unknown[]}[]=[];let insertCalls=0;
 return {calls,query:async(sql:string,args:unknown[]=[])=>{
  calls.push({sql,args});
  if(sql.includes("FROM firsts f CROSS JOIN h"))
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
 it("uses one serializable transaction for 3 flight-specific cutoffs, then COMMIT",async()=>{
  const c=db();
  const out=await persistP4G5ReviewedPreForCohortV39(c,scope(),permit());
  expect(c.calls[0].sql).toContain("SERIALIZABLE READ WRITE");
  expect(c.calls.filter(x=>x.sql.startsWith("INSERT INTO clean.flight_snapshots")))
   .toHaveLength(3);
  expect(c.calls.at(-1)?.sql).toBe("COMMIT");
  expect(out.newlyPersistedRows).toBe(3);
  expect(out.expectedSourceQualifiedRows).toBe(3);
  expect(out.databaseWrites).toBe(3);
  expect(out.providerCalls).toBe(0);
  expect(out.strictGate5Passed).toBe(false);
  expect(out.optionalFeatureMissingNeverSuppressesEligibleSnapshot).toBe(true);
 });
 it("validates idempotent conflict against exact frozen T version, FIDS hash, builder version",async()=>{
  const c=db({insertRowCount:0});
  const out=await persistP4G5ReviewedPreForCohortV39(c,scope(),permit());
  expect(out.newlyPersistedRows).toBe(0);
  expect(out.previousVerifiedIdempotentRows).toBe(3);
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
  const c=db({failInsertAt:2});
  await expect(persistP4G5ReviewedPreForCohortV39(c,scope(),permit()))
   .rejects.toThrow("simulated-db-failure");
  expect(c.calls.at(-1)?.sql).toBe("ROLLBACK");
  expect(c.calls.some(x=>x.sql==="COMMIT")).toBe(false);
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
