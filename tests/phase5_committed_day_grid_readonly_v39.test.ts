import { describe,expect,it } from "vitest";
import {
 readCommittedP5DayCandidateGrid,type P5CommittedDayReadonlyScope
} from "../server/lib/disruption/phase5CommittedDayGridReadonly_v39";
import {verifyPreparedDailyDraw} from
 "../server/lib/disruption/phase5EarlyPreselectionReadback_v39";

const sha=(x:string)=>x.repeat(64);
const start=Date.parse("2026-11-09T14:00:00.000Z");
const fmt=(x:number)=>new Date(x).toISOString();
const list=[
 ["HUB","WSSS","ASIA"],["MID_A","OMAA","MIDDLE_EAST"],
 ["MID_B","SKBO","SOUTH_AMERICA"],["REGIONAL","KGPT","NORTH_AMERICA"]
] as const;
const horizons=[["T-24h",1440,"T24"],["T-6h",360,"T6"],
 ["T-90m",90,"T90"]] as const;
function fixture(){
 const cal={
  run_day_index:1,scheduled_start_utc:new Date(start),
  frozen_draw_seed:"frozen-phase5-day1",
  draw_type:"NEW_TEMPLATE",anchor_icao:"WSSS",
  slot_regions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",
   MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
  pair_airport_set:null,
  calendar_hash:sha("a"),config_hash:sha("b"),frame_hash:sha("c"),
  date_utc:"2026-11-09"
 };
 const draw=list.map(([slot,icao,region])=>({
  slot_id:slot,target_region:region,draw_type:"NEW_TEMPLATE",
  selected_icao:icao,frozen_draw_seed:cal.frozen_draw_seed,
  selected_at_utc:"2026-11-08T10:00:00.000Z",
  adaptive_state_hash:slot==="REGIONAL"?sha("d"):null,
  probability_vector:slot==="REGIONAL"?
   [{icao:"KGPT",probability:1,drawScore:1}]:null,
  airport_layer_design_probability:slot==="REGIONAL"?1:null
 }));
 const day={
  runDayIndex:1,scheduledStartUtc:cal.scheduled_start_utc,
  frozenDrawSeed:cal.frozen_draw_seed,
  drawType:"NEW_TEMPLATE" as const,anchorIcao:cal.anchor_icao,
  slotRegions:cal.slot_regions,pairAirportSet:null,
  calendarHash:cal.calendar_hash,configHash:cal.config_hash,
  frameHash:cal.frame_hash
 };
 const templates:P5CommittedDayReadonlyScope["templates"]=[];
 for(const [slot] of list)for(const [horizon,min,label] of horizons){
  const cutoff=start-min*60_000,request=cutoff-600_000;
  templates.push({
   runDayIndex:1,budgetDayUtc:"2026-11-09",
   physicalChargeDayUtc:fmt(request).slice(0,10),
   slot,horizon,providerQueryDirection:"Departure",
   serviceWindowStartUtc:fmt(start),
   serviceWindowEndUtc:fmt(start+4*3_600_000),
   earliestPlannedCutoffUtc:fmt(cutoff),
   scheduledRequestUtc:fmt(request),
   maxResponseAndPersistSeconds:120,
   maxAttempts:1,apiUnitsPerAttempt:2,
   queryKey:"p5_day1_"+slot+"_"+label
  });
 }
 const scope:P5CommittedDayReadonlyScope={
  expectedManifestSha256:sha("e"),
  expectedCalendarSha256:sha("a"),
  expectedConfigSha256:sha("b"),
  expectedFrameSha256:sha("c"),
  expectedProviderContractSha256:sha("f"),
  expectedEarlyDrawSha256:verifyPreparedDailyDraw(day,draw).stateHash,
  expectedRestrictedReaderRole:"p5_reader",
  runDayIndex:1,templates
 };
 const auth={
  manifest_sha256:sha("e"),calendar_hash:sha("a"),config_hash:sha("b"),
  enabled:true,revoked_at_utc:null
 };
 return {scope,cal,draw,auth};
}
function fake(x=fixture(),opts:{
  role?:string;readOnly?:string;now?:string;
  missingAuth?:boolean;missingDay?:boolean;partialDraw?:boolean;
 }={}){
 const sql:string[]=[];
 let release=0;
 const client={
  async query(text:string){
   sql.push(text);
   if(text.startsWith("SELECT current_user"))return {rowCount:1,rows:[{
    reader_role:opts.role??"p5_reader",
    read_only:opts.readOnly??"on",
    at:new Date(opts.now??"2026-11-08T12:00:00.000Z")
   }]};
   if(text.includes("FROM clean.adb_phase6_authorization"))
    return {rowCount:opts.missingAuth?0:1,rows:opts.missingAuth?[]:[x.auth]};
   if(text.includes("FROM clean.adb_phase6_calendar_day"))
    return {rowCount:opts.missingDay?0:1,rows:opts.missingDay?[]:[x.cal]};
   if(text.includes("FROM clean.adb_sampling_draw"))
    return {rowCount:opts.partialDraw?3:4,
     rows:opts.partialDraw?x.draw.slice(0,3):x.draw};
   return {rowCount:0,rows:[]};
  },release(){release++;}
 };
 return {pool:{async connect(){return client;}} as any,
  sql, get release(){return release;}};
}
describe("Phase5 real frozen calendar/early-draw readback (mock PG, NO provider)",()=>{
 it("reads auth, calendar and exact four draws in a repeatable-read read-only tx",async()=>{
  const f=fixture(),o=fake(f);
  const r=await readCommittedP5DayCandidateGrid(o.pool,f.scope);
  expect(r.status).toBe("SAVED_SOURCE_DAY_READ_ONLY_CANDIDATES_NOT_RELEASED");
  expect(r.selectedDayCandidateGrid.acquisitions).toHaveLength(12);
  expect(r.selectedDayCandidateGrid.candidateFidsApiUnits).toBe(24);
  expect(r.databaseReadOnlySnapshot).toBe(true);
  expect(r.databaseWrites).toBe(0);expect(r.providerCalls).toBe(0);
  expect(r.phase6Go).toBe(false);
  expect(o.sql[0]).toBe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(o.sql.at(-1)).toBe("COMMIT");
  expect(o.sql.some(v=>/INSERT|DELETE|UPDATE|TRUNCATE/i.test(v))).toBe(false);
  expect(o.release).toBe(1);
 });
 it("refuses a reviewed segmented shape that disagrees with the actual DB day",async()=>{
   const f=fixture();
   f.scope.reviewedSegmentedSource={
     windowShape:"2x2h",verifiedProviderMaxRangeMinutes:120,
     reviewedProviderRangeEvidenceSha256:sha("9")
   };
   const cal=f.cal as typeof f.cal&{
      window_shape?:string;active_duration_minutes?:number};
   cal.window_shape="4h";cal.active_duration_minutes=240;
   const o=fake(f);
   await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
     .rejects.toThrow("SAVED_AMENDMENT_C_TREATMENT_SHAPE_CHANGED");
   expect(o.sql).toContain("ROLLBACK");
   expect(o.sql.some(s=>s.includes("adb_sampling_draw"))).toBe(false);
 });
 it("rejects wrong reader role before any source query, and rolls back",async()=>{
  const f=fixture(),o=fake(f,{role:"app_runtime"});
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("UNVERIFIED_RESTRICTED_READ_ONLY_ROLE");
  expect(o.sql).toContain("ROLLBACK");
  expect(o.sql.some(s=>s.includes("adb_sampling_draw"))).toBe(false);
  expect(o.release).toBe(1);
 });
 it("rejects read-write DB transaction even if role name looks correct",async()=>{
  const f=fixture(),o=fake(f,{readOnly:"off"});
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("UNVERIFIED_RESTRICTED_READ_ONLY_ROLE");
  expect(o.sql).toContain("ROLLBACK");
 });
 it("rejects revoked or wrong frozen authorization",async()=>{
  const f=fixture();f.auth.enabled=false;
  const o=fake(f);
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("ACTIVE_MANIFEST_OR_AUTH_CHANGED");
  expect(o.sql).toContain("ROLLBACK");
 });
 it("rejects day mismatch and partially persisted four-airport set",async()=>{
  const f=fixture();f.cal.frame_hash=sha("1");
  const o=fake(f);
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("SAVED_DAY_PIN_MISMATCH");
  const a=fixture(),p=fake(a,{partialDraw:true});
  await expect(readCommittedP5DayCandidateGrid(p.pool,a.scope))
   .rejects.toThrow("FOUR_COMMITTED_DRAW_ROWS_NOT_FOUND");
 });
 it("refuses wrong expected signed draw without substitute or fallback",async()=>{
  const f=fixture();f.scope.expectedEarlyDrawSha256=sha("0");
  const o=fake(f);
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("UNVERIFIED_EARLY_DRAW_READBACK");
  expect(o.sql).toContain("ROLLBACK");
 });
 it("rejects a retroactive readback after the first source GET time",async()=>{
  const f=fixture(),o=fake(f,{now:"2026-11-08T14:30:00.000Z"});
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("EARLIEST_SOURCE_REQUEST_ALREADY_DUE");
  expect(o.sql).toContain("ROLLBACK");
 });
 it("rejects future-dated source draw rather than pretending it committed",async()=>{
  const f=fixture(),o=fake(f,{now:"2026-11-08T09:00:00.000Z"});
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("DRAW_NOT_YET_PERSISTED_AT_DB_CLOCK");
  expect(o.sql).toContain("ROLLBACK");
 });
 it("rejects unsigned scope and never attempts to connect",async()=>{
  const f=fixture();f.scope.expectedRestrictedReaderRole="!";
  let called=0;
  await expect(readCommittedP5DayCandidateGrid({
   async connect(){called++;throw Error("should not connect");}
  } as any,f.scope)).rejects.toThrow("UNPINNED_READBACK_OR_DAY");
  expect(called).toBe(0);
 });
});
