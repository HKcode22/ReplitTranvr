import {describe,it,expect} from "vitest";
import {
 auditPhase5SourceDay,P5_DAILY_SOURCE_METRICS_SQL,
} from "../server/lib/disruption/phase5DaySourceQualityReadonly_v39";
const manifest="a".repeat(64);
function fake(mode:"ok"|"no-budget"|"no-denominator"="ok"){
 const calls:string[]=[];
 let released=0;
 const client={
  async query(sql:string,params:unknown[]=[]){
   calls.push(sql);
   if(sql.startsWith("BEGIN")||sql.startsWith("SET")||
      sql==="COMMIT"||sql==="ROLLBACK")
     return {rowCount:0,rows:[]};
   if(sql.includes("clock_timestamp() AS at"))
     return {rowCount:1,rows:[{at:new Date("2026-11-09T14:00:00.000Z")}]};
   if(sql.includes("phase5_fids_cycle_budget_v39"))
     return mode==="no-budget"?{rowCount:0,rows:[]}:
      {rowCount:1,rows:[{
       cycle_api_ceiling:50000,other_category_reserved_units:1000,
       protected_api_floor_units:100,physically_reserved_units:6,
       daily_api_ceiling:1900,daily_other_reserved_units:100,
       daily_source_reserved_units:6,budget_day_utc:"2026-11-09",
      }]};
   if(sql.includes("COUNT(DISTINCT slot_id)"))
     return {rowCount:1,rows:[{
      draw_rows:4,distinct_slots:4,distinct_airports:4,
     }]};
   if(sql.includes("clean.flight_snapshots"))
     return {rowCount:1,rows:[{
      horizon:"T-24h",snapshots_seen:2,clock_order_candidate_pre:1,
     }]};
   if(sql===P5_DAILY_SOURCE_METRICS_SQL)
     return mode==="no-denominator"?{rowCount:0,rows:[]}:
      {rowCount:1,rows:[{
       slot_id:"HUB",horizon:"T-24h",planned_queries:4,
       reserved_physical_gets:3,bound_originals:2,
       missed_get_window:1,not_yet_due:0,
       reserved_without_original_after_cutoff:1,
       source_bound_before_planned_cutoff:1,
       source_bound_late_to_planned_cutoff:1,
       source_rights_metadata_expired:0,
       population_observation_rows:"123",active_query_rows:4,
       stopped_query_rows:0,
      }]};
   throw Error("UNEXPECTED_SQL_IN_READ_ONLY_TEST");
  },
  release(){released++;}
 };
 return {
  pool:{async connect(){return client;}} as any,
  calls,getReleased:()=>released,
 };
}
describe("Phase5 independent daily metadata-only source quality",()=>{
 it("reports real grouped denominators but never claims operating-leg PRE or Phase6 GO",async()=>{
  const m=fake();
  const r=await auditPhase5SourceDay(m.pool,manifest,1);
  expect(r.status).toBe("AUDIT_ONLY_NOT_PHASE5_FREEZE_OR_PHASE6_GO");
  expect(r.totalPlannedQueries).toBe(4);
  expect(r.totalBoundOriginals).toBe(2);
  expect(r.sourceQueryGroups[0].missedGetWindow).toBe(1);
  expect(r.sourceQueryGroups[0].populationObservationRows).toBe(123);
  expect(r.earlySample.distinctAirports).toBe(4);
  expect(r.preCandidateSnapshots[0].clockOrderCandidates).toBe(1);
  expect(r.actualFlightLevelPreCertified).toBe(false);
  expect(r.providerRawContentsRead).toBe(false);
  expect(r.storedProviderRawContentsExported).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(m.calls[0]).toBe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(m.calls).toContain("COMMIT");
  expect(m.getReleased()).toBe(1);
 });
 it("SQL selects aggregate metadata only, never raw provider Content or flight IDs",()=>{
  expect(P5_DAILY_SOURCE_METRICS_SQL).not.toContain("raw_payload");
  expect(P5_DAILY_SOURCE_METRICS_SQL).not.toContain("flight_number");
  expect(P5_DAILY_SOURCE_METRICS_SQL).not.toContain("raw_body");
  expect(P5_DAILY_SOURCE_METRICS_SQL).not.toContain("SELECT *");
  expect(P5_DAILY_SOURCE_METRICS_SQL).toContain("prediction_cutoff_utc");
 });
 it("refuses invalid manifest and day BEFORE connecting",async()=>{
  const m=fake();
  await expect(auditPhase5SourceDay(m.pool,"",1)).rejects
   .toThrow("UNSIGNED_MANIFEST_OR_DAY");
  await expect(auditPhase5SourceDay(m.pool,manifest,32)).rejects
   .toThrow("UNSIGNED_MANIFEST_OR_DAY");
  expect(m.calls).toHaveLength(0);
 });
 it("does not call an uninstalled V0079 source ledger zero rows",async()=>{
  const m=fake("no-budget");
  await expect(auditPhase5SourceDay(m.pool,manifest,1)).rejects
   .toThrow("DAY_BUDGET_NOT_INSTALLED_OR_FROZEN");
  expect(m.calls).toContain("ROLLBACK");
  expect(m.getReleased()).toBe(1);
 });
 it("treats empty signed source frame as HOLD, not successful zero missingness",async()=>{
  const m=fake("no-denominator");
  await expect(auditPhase5SourceDay(m.pool,manifest,1)).rejects
   .toThrow("NO_SIGNED_SOURCE_QUERY_DENOMINATOR");
  expect(m.calls).toContain("ROLLBACK");
 });
});
