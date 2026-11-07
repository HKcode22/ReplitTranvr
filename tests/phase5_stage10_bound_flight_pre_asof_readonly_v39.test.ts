import {describe,it,expect} from "vitest";
import {
 readP5OneBoundSourceFlightPreCandidates,
 P5_STAGE10_BOUND_SOURCE_SQL,P5_STAGE10_BOUND_MEMBERS_SQL,
 type P5Stage10ReadScope
} from "../server/lib/disruption/phase5V0079BoundFlightPreAsOfReadback_v39";

const sha=(c:string)=>c.repeat(64);
const sourceQueryId="123e4567-e89b-42d3-a456-426614174000";
const baselineScope:P5Stage10ReadScope={
 expectedManifestSha256:sha("a"),expectedQueryDigestSha256:sha("b"),
 expectedRightsReviewSha256:sha("c"),expectedFrameSha256:sha("d"),
 expectedReaderRole:"phase5_fids_pre_reader_ciuser01",
 runDayIndex:1,slot:"HUB",horizon:"T-24h",airportIcao:"WSSS",
 maxPopulationStalenessSeconds:3600
};
const source={
 query_digest:sha("b"),manifest_sha256:sha("a"),run_day_index:1,
 slot_id:"HUB",horizon:"T-24h",airport_icao:"WSSS",
 github_run_id:"42358210175",state:"ACTIVE",
 rights_review_sha256:sha("c"),bound_rights:sha("c"),
 service_window_start_utc:"2026-11-09T14:00:00.000Z",
 service_window_end_utc:"2026-11-09T18:00:00.000Z",
 planned_cutoff:"2026-11-08T14:00:00.000Z",
 reservation_sha256:sha("e"),attempt_run_id:"42358210175",
 reserved_at:"2026-11-08T13:50:00.000Z",
 population_query_id:sourceQueryId,normalized_members_count:1,
 bound_hash:sha("f"),source_hash:sha("f"),
 source_expires_at_utc:"2026-11-09T10:00:00.000Z",
 fids_retrieval_utc:"2026-11-08T13:51:00.000Z",
 raw_persisted_at_utc:"2026-11-08T13:52:00.000Z",
 source_available:"2026-11-08T13:52:00.000Z",raw_current:true
};
function member(o:Record<string,unknown>={}){
 return {
  population_member_id:"223e4567-e89b-42d3-a456-426614174000",
  population_query_id:sourceQueryId,
  analytic_identity_id:"leg:ci:one",
  canonical_flight_instance_id:"leg:ci:one",
  dep_airport_icao:"WSSS",
  population_role:"requested_airport_primary",
  scope_classification:"confirmed_core",
  codeshare_resolution_status:"confirmed_operating_leg",
  dep_scheduled_utc:"2026-11-09T14:00:00.000Z",
  member_available:"2026-11-08T13:53:00.000Z",
  member_hash:sha("f"),source_airport_icao:"WSSS",
  source_type:"fids",
  t24_frozen_t:null,t24_cutoff:null,t24_created_at:null,t24_version:null,
  ...o
 };
}
function fake(
 args:{clock?:string;scope?:P5Stage10ReadScope;
       header?:any;members?:any[];role?:string;
       ro?:string;sourceRows?:any[]}={}
){
 const calls:{sql:string;args:unknown[]|undefined}[]=[];
 let released=false;
 const rows=args.members??[member()];
 const head={...source,normalized_members_count:rows.length,...args.header};
 const who={
  db:"neondb",
  role:args.role??(args.scope??baselineScope).expectedReaderRole,
  ro:args.ro??"on",replica:false,
  at:args.clock??"2026-11-08T13:58:00.000Z"
 };
 const c={
  release(){released=true;},
  async query(sql:string,params?:unknown[]){
   calls.push({sql,args:params});
   if(sql.includes("current_database()"))return {rows:[who],rowCount:1};
   if(sql===P5_STAGE10_BOUND_SOURCE_SQL)return {
    rows:args.sourceRows??[head],rowCount:args.sourceRows?.length??1
   };
   if(sql===P5_STAGE10_BOUND_MEMBERS_SQL)return {
    rows,rowCount:rows.length
   };
   return {rows:[],rowCount:null};
  }
 };
 return {pool:{connect:async()=>c},calls,get released(){return released}};
}
describe("Phase5 Stage10 bound source -> per-flight as-of readback (NO PRE)",()=>{
 it("requires real source original with exact hashes and clock-bound row count",async()=>{
  const f=fake();
  const o=await readP5OneBoundSourceFlightPreCandidates(
   f.pool as any,baselineScope);
  expect(o.status).toBe("READONLY_CANDIDATES_NOT_PRE_OR_FREEZE");
  expect(o.boundOriginalVerified).toBe(true);
  expect(o.sourceObservationCount).toBe(1);
  expect(o.candidatePhysicalLegCount).toBe(1);
  expect(o.sourceAsOfCandidates).toBe(1);
  expect(o.potentiallyDuePreCandidates).toBe(1);
  expect(o.preSnapshotsWritten).toBe(0);
  expect(o.scientificFlightLevelPreCertified).toBe(false);
  expect(o.legalPurposeAndRetentionCertified).toBe(false);
  expect(o.phase6PaidGo).toBe(false);
  expect(f.calls.map(x=>x.sql)).toContain("COMMIT");
  expect(f.calls.some(x=>/^INSERT|^UPDATE|^DELETE/.test(x.sql))).toBe(false);
  expect(f.released).toBe(true);
 });
 it("does NOT call missing or ambiguous raw population a valid physical leg",async()=>{
  const f=fake({members:[
   member({population_role:"opposite_movement_context"}),
   member({canonical_flight_instance_id:null,analytic_identity_id:"provisional:abc"}),
   member({scope_classification:"unknown"}),
   member({codeshare_resolution_status:"g5a_conditional_operator_composite_no_native_id"})
  ]});
  const o=await readP5OneBoundSourceFlightPreCandidates(f.pool as any,baselineScope);
  expect(o.sourceObservationCount).toBe(4);
  expect(o.sourceAsOfCandidates).toBe(0);
  expect(o.reasons.NONPRIMARY_MOVEMENT).toBe(1);
  expect(o.reasons.NONCORE_OR_UNKNOWN_SCOPE).toBe(1);
  expect(o.reasons.NO_CONFIRMED_OPERATING_LEG).toBe(2);
 });
 it("never uses a response available after a flight's own decision cutoff",async()=>{
  const f=fake({clock:"2026-11-08T14:01:00.000Z",
   members:[member({member_available:"2026-11-08T14:00:01.000Z"})]});
  const o=await readP5OneBoundSourceFlightPreCandidates(f.pool as any,baselineScope);
  expect(o.sourceAsOfCandidates).toBe(0);
  expect(o.reasons.OBSERVATION_AFTER_FLIGHT_CUTOFF).toBe(1);
 });
 it("enforces the explicitly frozen maximum population staleness",async()=>{
  const s={...baselineScope,maxPopulationStalenessSeconds:300};
  const f=fake({scope:s});
  const o=await readP5OneBoundSourceFlightPreCandidates(f.pool as any,s);
  expect(o.sourceAsOfCandidates).toBe(0);
  expect(o.reasons.POPULATION_TOO_STALE).toBe(1);
 });
 it("separates not-yet-due and already-late from a possible timely PRE",async()=>{
  const early=fake({clock:"2026-11-08T13:54:00.000Z"});
  const a=await readP5OneBoundSourceFlightPreCandidates(early.pool as any,baselineScope);
  expect(a.sourceAsOfCandidates).toBe(1);
  expect(a.potentiallyDuePreCandidates).toBe(0);
  expect(a.reasons.PREDICTION_CUTOFF_NOT_YET_DUE).toBe(1);
  const late=fake({clock:"2026-11-08T14:00:01.000Z"});
  const b=await readP5OneBoundSourceFlightPreCandidates(late.pool as any,baselineScope);
  expect(b.sourceAsOfCandidates).toBe(1);
  expect(b.potentiallyDuePreCandidates).toBe(0);
  expect(b.reasons.PRE_COMMIT_CUTOFF_PASSED).toBe(1);
 });
 it("T6/T90 cannot re-anchor T to revised source schedule",async()=>{
  const s:{[key:string]:unknown}={...baselineScope,horizon:"T-6h"};
  const f=fake({scope:s as P5Stage10ReadScope,header:{horizon:"T-6h"}});
  const o=await readP5OneBoundSourceFlightPreCandidates(f.pool as any,
    s as P5Stage10ReadScope);
  expect(o.sourceAsOfCandidates).toBe(0);
  expect(o.reasons.NO_VERIFIED_FROZEN_T24_ANCHOR).toBe(1);
 });
 it("blocks duplicate claimed physical operating legs, even if each row says confirmed",async()=>{
  const f=fake({members:[
   member({population_member_id:"323e4567-e89b-42d3-a456-426614174001"}),
   member({population_member_id:"323e4567-e89b-42d3-a456-426614174002"})
  ]});
  const o=await readP5OneBoundSourceFlightPreCandidates(f.pool as any,baselineScope);
  expect(o.sourceAsOfCandidates).toBe(0);
  expect(o.reasons.AMBIGUOUS_DUPLICATE_LEG).toBe(2);
 });
 it("a bound original with genuinely zero rows is different from missing original",async()=>{
  const f=fake({members:[]});
  const o=await readP5OneBoundSourceFlightPreCandidates(f.pool as any,baselineScope);
  expect(o.boundOriginalVerified).toBe(true);
  expect(o.sourceObservationCount).toBe(0);
  const missing=fake({sourceRows:[]});
  await expect(readP5OneBoundSourceFlightPreCandidates(
    missing.pool as any,baselineScope))
    .rejects.toThrow("NO_SINGLE_AUTHENTIC_BOUND_SOURCE");
  expect(missing.calls.some(x=>x.sql==="ROLLBACK")).toBe(true);
 });
 it("source expiry, raw expiry, wrong role, hashes, and count drift fail closed",async()=>{
  for(const extras of [
   {header:{source_expires_at_utc:"2026-11-08T13:57:00.000Z"}},
   {header:{raw_current:false}},
   {header:{bound_hash:sha("0")}},
   {header:{attempt_run_id:"11111"}},
   {header:{normalized_members_count:2}},
   {role:"neondb_owner"},
   {ro:"off"}
  ]){
   const f=fake(extras);
   await expect(readP5OneBoundSourceFlightPreCandidates(
    f.pool as any,baselineScope)).rejects.toThrow("REFUSED_P5_STAGE10");
   expect(f.calls.some(x=>x.sql==="ROLLBACK")).toBe(true);
   expect(f.released).toBe(true);
  }
 });
 it("refuses unreviewed, unbounded or stale scope before database connection",async()=>{
  for(const s of [
   {...baselineScope,maxPopulationStalenessSeconds:0},
   {...baselineScope,maxPopulationStalenessSeconds:100000},
   {...baselineScope,expectedReaderRole:"postgres"},
   {...baselineScope,expectedRightsReviewSha256:"123"},
   {...baselineScope,runDayIndex:32}
  ]){
   const f=fake();
   await expect(readP5OneBoundSourceFlightPreCandidates(
    f.pool as any,s as P5Stage10ReadScope))
    .rejects.toThrow("UNFROZEN_OR_INVALID_SCOPE");
   expect(f.calls).toHaveLength(0);
  }
 });
});
