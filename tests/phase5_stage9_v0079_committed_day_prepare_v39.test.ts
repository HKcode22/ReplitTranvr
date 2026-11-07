import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 commitStage9P5DayV0079PreparedRows,
 type P5Stage9PreparedDayReview
} from "../server/lib/disruption/phase5Stage9V0079CommittedDayPrepare_v39";
import {
 planStage8P5DayV0079Proposals,
 type Stage8DayProposalInput
} from "../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39";
import {
 materializeP5DynamicDaySourceGrid,P5_DYNAMIC_DAY_GRID_SCHEMA,
 type P5DynamicDayGridInput
} from "../server/lib/disruption/phase5DynamicDaySourceGrid_v39";
import {verifyPreparedDailyDraw} from
 "../server/lib/disruption/phase5EarlyPreselectionReadback_v39";
import type {P5CommittedDayReadonlyResult} from
 "../server/lib/disruption/phase5CommittedDayGridReadonly_v39";
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const sha=(c:string)=>c.repeat(64);
const ISO=(n:number)=>new Date(n).toISOString();
const start=Date.parse("2026-11-09T14:00:00.000Z");
const S=[
 ["HUB","WSSS","ASIA","Asia/Singapore"],
 ["MID_A","OMAA","MIDDLE_EAST","Asia/Dubai"],
 ["MID_B","SKBO","SOUTH_AMERICA","America/Bogota"],
 ["REGIONAL","KGPT","NORTH_AMERICA","America/Chicago"]
] as const;
const H=[["T-24h",1440,"T24"],["T-6h",360,"T6"],["T-90m",90,"T90"]] as const;
function context(){
 const day={
  runDayIndex:1,scheduledStartUtc:new Date(start),
  frozenDrawSeed:"phase5-stage9-test",
  drawType:"NEW_TEMPLATE" as const,anchorIcao:"WSSS",
  slotRegions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",
   MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
  pairAirportSet:null,calendarHash:sha("a"),configHash:sha("b"),frameHash:sha("c")
 };
 const draw=S.map(([slot,icao,region])=>({
  slot_id:slot,target_region:region,draw_type:day.drawType,
  selected_icao:icao,frozen_draw_seed:day.frozenDrawSeed,
  selected_at_utc:"2026-11-08T10:00:00.000Z",
  adaptive_state_hash:slot==="REGIONAL"?sha("d"):null,
  probability_vector:slot==="REGIONAL"?
   [{icao:"KGPT",probability:1,drawScore:1}]:null,
  airport_layer_design_probability:slot==="REGIONAL"?1:null
 }));
 const templates:P5DynamicDayGridInput["templates"]=[];
 for(const [slot] of S)for(const [h,min,label] of H){
  const cutoff=start-min*60_000,req=cutoff-600_000;
  templates.push({
   runDayIndex:1,budgetDayUtc:"2026-11-09",
   physicalChargeDayUtc:ISO(req).slice(0,10),
   slot,horizon:h,providerQueryDirection:"Departure",
   serviceWindowStartUtc:ISO(start),
   serviceWindowEndUtc:ISO(start+4*3_600_000),
   earliestPlannedCutoffUtc:ISO(cutoff),
   scheduledRequestUtc:ISO(req),
   maxResponseAndPersistSeconds:120,maxAttempts:1,apiUnitsPerAttempt:2,
   queryKey:"p5_day1_"+slot+"_"+label
  });
 }
 const selected=verifyPreparedDailyDraw(day,draw);
 const grid=materializeP5DynamicDaySourceGrid({
  schema:P5_DYNAMIC_DAY_GRID_SCHEMA,
  reviewedCalendarSha256:sha("a"),reviewedConfigSha256:sha("b"),
  reviewedFrameSha256:sha("c"),providerContractSha256:sha("f"),
  day,committedEarlyDrawRows:draw,
  expectedCommittedEarlyDrawSha256:selected.stateHash,templates
 });
 const stage7:P5CommittedDayReadonlyResult={
  schema:"v39.phase5.db-readback-day-grid.v1",
  status:"SAVED_SOURCE_DAY_READ_ONLY_CANDIDATES_NOT_RELEASED",
  dbClockAtReadUtc:"2026-11-08T10:01:00.000Z",
  restrictedReaderRoleVerified:true,databaseReadOnlySnapshot:true,
  databaseWrites:0,providerCalls:0,selectedDayCandidateGrid:grid,
  sourceResponseCaptured:false,flightLevelPreCertified:false,
  accountRightsCertified:false,phase5FreezePassed:false,phase6Go:false
 };
 const source:Stage8DayProposalInput={
  stage7,day,savedEarlyDrawRows:draw,
  manifestSha256:sha("e"),calendarSha256:sha("a"),
  configSha256:sha("b"),frameSha256:sha("c"),
  providerContractSha256:sha("f"),reviewedReleaseSha256:sha("1"),
  rightsReviewSha256:sha("2"),
  localFrames:S.map(([slot,icao,_region,ianaTimezone])=>({
   slot,icao,ianaTimezone,providerApiVersion:"1.15.4",
   fidsProtocolVersion:"v39"
  })),
  chargeDayBudgets:[
   {chargeDayUtc:"2026-11-08",dailyApiCeiling:1900,
    otherCategoriesReserved:50,existingSourceReserved:0},
   {chargeDayUtc:"2026-11-09",dailyApiCeiling:1900,
    otherCategoriesReserved:50,existingSourceReserved:0}
  ],
  cycleUnitsAvailable:500
 };
 const proposal=planStage8P5DayV0079Proposals(source);
 const pins:P5Stage9PreparedDayReview={
  proposal,expectedProposalSha256:proposal.dayProposalSha256,
  expectedManifestSha256:sha("e"),
  expectedCalendarSha256:sha("a"),expectedConfigSha256:sha("b"),
  expectedFrameSha256:sha("c"),
  expectedProviderContractSha256:sha("f"),
  expectedRightsReviewSha256:sha("2"),expectedReleaseSha256:sha("1"),
  expectedChargeDayBudgetHashSha256:hash(proposal.actualUtcChargeBudgets),
  expectedRestrictedWriterRole:"phase5_fids_prepare_test12345",
  independentFreezeApproved:true,independentRightsReviewApproved:true,
  githubOnlyProspectiveOwnerApproved:true
 };
 return {pins,day,draw};
}
function fake(pins:P5Stage9PreparedDayReview,day:any,draw:any[],extra:{
  who?:Record<string,unknown>;
  newClock?:Date;
  preparedRows?:any[];
  changedDraw?:any[];
  budgets?:any[];
}={}){
 const logs:string[]=[];
 let released=false;
 const auth={
  manifest_sha256:sha("e"),calendar_hash:sha("a"),
  config_hash:sha("b"),enabled:true,revoked_at_utc:null
 };
 const cal={
  run_day_index:1,scheduled_start_utc:day.scheduledStartUtc,
  frozen_draw_seed:day.frozenDrawSeed,draw_type:day.drawType,
  anchor_icao:day.anchorIcao,slot_regions:day.slotRegions,
  pair_airport_set:null,calendar_hash:sha("a"),
  config_hash:sha("b"),frame_hash:sha("c"),date_utc:"2026-11-09"
 };
 const calls:any[]=[];
 const client={
  release(){released=true;},
  async query(sql:string,params?:unknown[]){
   logs.push(sql);calls.push(params);
   // Real PostgreSQL 16 rejects every SELECT row-locking clause for a
   // SELECT+INSERT-only role. Simulate that privilege boundary in mocks.
   if(/\bFOR\s+(?:SHARE|UPDATE|KEY SHARE|NO KEY UPDATE)\b/i.test(sql))
    throw Error("POSTGRES_42501_INSERT_ONLY_ROLE_CANNOT_LOCK_ROWS");
   if(sql.includes("current_database()"))return {
    rowCount:1,rows:[{
     db:"neondb",actor:pins.expectedRestrictedWriterRole,read_only:"off",
     at:extra.newClock??new Date("2026-11-08T10:05:00.000Z"),
     replica:false,can_insert:true,can_update:false,can_delete:false,
     ...extra.who
    }]
   };
   if(sql.includes("FROM clean.adb_phase6_authorization"))
    return {rowCount:1,rows:[auth]};
   if(sql.includes("FROM clean.adb_phase6_calendar_day"))
    return {rowCount:1,rows:[cal]};
   if(sql.includes("FROM clean.adb_sampling_draw"))
    return {rowCount:4,rows:extra.changedDraw??draw};
   if(sql.includes("FROM clean.phase5_fids_day_budget_v39"))
    return {rowCount:1,rows:[{
     early_draw_sha256:pins.proposal.earlyDrawSha256,
     calendar_hash:sha("a"),config_hash:sha("b"),frame_hash:sha("c"),
     budget_day_utc:"2026-11-09",daily_api_ceiling:1900,
     daily_other_reserved_units:100,daily_source_reserved_units:0
    }]};
   if(sql.includes("FROM clean.phase5_fids_cycle_budget_v39"))
    return {rowCount:1,rows:[{
     cycle_api_ceiling:50000,other_category_reserved_units:100,
     protected_api_floor_units:100,physically_reserved_units:0
    }]};
   if(sql.includes("FROM clean.phase5_fids_utc_charge_budget_v39"))
    return {rowCount:2,rows:extra.budgets??[
     {charge_day_utc:"2026-11-08",daily_api_ceiling:1900,
      daily_other_reserved_units:50,physically_reserved_units:0},
     {charge_day_utc:"2026-11-09",daily_api_ceiling:1900,
      daily_other_reserved_units:50,physically_reserved_units:0}
    ]};
   if(sql.includes("FROM clean.phase5_fids_allowed_query_v39"))
    return {rowCount:extra.preparedRows?.length??0,rows:extra.preparedRows??[]};
   if(sql.includes("INSERT INTO clean.phase5_fids_allowed_query_v39"))
    return {rowCount:1,rows:[{query_digest:params?.[0]}]};
   return {rowCount:1,rows:[{}]};
  }
 };
 const pool={connect:async()=>client};
 return {pool,logs,calls,get released(){return released}};
}
describe("Phase5 Stage9: exact day V0079 PREPARED DB writer ONLY",()=>{
 it("writes exactly 12 on an independently reviewed prospective day, zero paid GET",async()=>{
  const {pins,day,draw}=context(),f=fake(pins,day,draw);
  const result=await commitStage9P5DayV0079PreparedRows(f.pool as any,pins);
  expect(result.status).toBe("TWELVE_V0079_PREPARED_QUERY_ROWS_COMMITTED_NOT_SOURCE_GET");
  expect(result.queryRowCount).toBe(12);
  expect(result.databaseWrites).toBe(12);
  expect(result.providerCalls).toBe(0);
  expect(result.paidSourceAttempts).toBe(0);
  expect(result.realGithubRunBound).toBe(false);
  expect(result.flightLevelPreCertified).toBe(false);
  expect(result.phase6PaidGo).toBe(false);
  expect(f.logs.filter(x=>x.startsWith("INSERT INTO clean.phase5_fids_allowed_query_v39"))).toHaveLength(12);
  expect(f.logs).toContain("COMMIT");
  expect(f.released).toBe(true);
 });
 it("refuses unreviewed rights or changed source-query digest *before* database connect",async()=>{
  const {pins,day,draw}=context(),f=fake(pins,day,draw);
  const a={...pins,independentRightsReviewApproved:false as any};
  await expect(commitStage9P5DayV0079PreparedRows(f.pool as any,a)).rejects.toThrow("NO_INDEPENDENT_RELEASE");
  const q=structuredClone(pins);
  q.proposal.queries[0].airport_icao="YSSY";
  await expect(commitStage9P5DayV0079PreparedRows(f.pool as any,q)).rejects.toThrow("QUERY_DIGEST_CHANGED");
  expect(f.logs).toHaveLength(0);
 });
 it("refuses ordinary owner/writeable roles and rolls back",async()=>{
  const {pins,day,draw}=context(),f=fake(pins,day,draw,{who:{
   actor:"neondb_owner",can_update:true
  }});
  await expect(commitStage9P5DayV0079PreparedRows(f.pool as any,pins))
   .rejects.toThrow("NO_EXACT_INSERT_ONLY_PRODUCTION_ROLE");
  expect(f.logs).toContain("ROLLBACK");
  expect(f.logs.some(x=>x.startsWith("INSERT INTO clean."))).toBe(false);
 });
 it("refuses a post-T24-day write or changed saved actual airport",async()=>{
  const {pins,day,draw}=context();
  const late=fake(pins,day,draw,{newClock:new Date("2026-11-08T13:51:00.000Z")});
  await expect(commitStage9P5DayV0079PreparedRows(late.pool as any,pins))
   .rejects.toThrow("MISSED_DAY_SOURCE_PREPARE_WINDOW");
  const changed=fake(pins,day,draw,{changedDraw:draw.map(x=>
   x.slot_id==="REGIONAL"?{...x,selected_icao:"YSSY"}:x)});
  await expect(commitStage9P5DayV0079PreparedRows(changed.pool as any,pins)).rejects.toThrow();
  expect(changed.logs).toContain("ROLLBACK");
 });
 it("rejects existing partial rows and changed Day0 charge budget",async()=>{
  const {pins,day,draw}=context();
  const prior=fake(pins,day,draw,{preparedRows:[{query_digest:"already"}]});
  await expect(commitStage9P5DayV0079PreparedRows(prior.pool as any,pins))
   .rejects.toThrow("EXISTING_QUERY_ROWS");
  const wrong=fake(pins,day,draw,{budgets:[
   {charge_day_utc:"2026-11-08",daily_api_ceiling:5,
    daily_other_reserved_units:0,physically_reserved_units:0},
   {charge_day_utc:"2026-11-09",daily_api_ceiling:1900,
    daily_other_reserved_units:50,physically_reserved_units:0}
  ]});
  await expect(commitStage9P5DayV0079PreparedRows(wrong.pool as any,pins))
   .rejects.toThrow("ACTUAL_UTC_CHARGE_DAY_BUDGET_MISMATCH");
 });
 it("rejects a reviewer-hashed but source-unrelated UTC Day0 request count",async()=>{
  const {pins,day,draw}=context();
  pins.proposal.actualUtcChargeBudgets[0].queries=5;
  pins.proposal.actualUtcChargeBudgets[0].candidateUnits=10;
  pins.expectedChargeDayBudgetHashSha256=hash(pins.proposal.actualUtcChargeBudgets);
  const f=fake(pins,day,draw);
  await expect(commitStage9P5DayV0079PreparedRows(f.pool as any,pins))
   .rejects.toThrow("UNCORRELATED_UTC_CHARGE_DAY_ACCOUNTING");
  expect(f.logs).toHaveLength(0);
 });
});
