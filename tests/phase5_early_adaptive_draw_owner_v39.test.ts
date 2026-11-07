import { describe, expect, it } from "vitest";
import {
  commitEarlyPhase5Draw,
  earlyDrawReleasePinsFingerprint,
  validateEarlyDrawWindow,
  type EarlyDrawOwnerPins,
} from "../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39";

const start="2026-11-10T14:00:00.000Z";
const now="2026-11-09T10:00:00.000Z";
const H=(s:string)=>s.repeat(64);
const pins:EarlyDrawOwnerPins={
  runDayIndex:1,expectedManifestSha256:H("a"),
  expectedCalendarHash:H("b"),expectedConfigHash:H("c"),
  expectedFrameHash:H("d"),
  phase5FreezeApproved:true,githubOnlyApproved:true,
};
const frame=[
  {icao:"WSSS",tier:"HUB",region:"ASIA"},
  {icao:"OMAA",tier:"MID",region:"MIDDLE_EAST"},
  {icao:"SKBO",tier:"MID",region:"SOUTH_AMERICA"},
  {icao:"KGPT",tier:"REGIONAL",region:"NORTH_AMERICA"},
].map(z=>({ ...z,
  traffic_prior:10,in_frame:true,
  pre_eligible:true,post_eligible:true,exclusion_reason:null,
  ema_yield:null,m_i:1,zero_yield_state:"normal",
  consecutive_zero_yield:0,first_zero_yield_date:null,
  last_successful_phase6_observation_at:null,
  last_direct_observation_at:null,last_selected_at:null,
  provider_failure:false,coverage_failed:false,state_version:0,
}));
type Row=Record<string,any>;
function mockDb(opts:{
  disabled?:boolean; mismatchedFrame?:boolean;
  wrongCalendar?:boolean; beforeNow?:string;
  partial?:boolean; failAfterInsert?:boolean;
  expireAtCommit?:boolean; mutableReadback?:boolean;
}={}){
 const queries:string[]=[];
 const initial:Row[]=opts.partial ? [{
   slot_id:"HUB",selected_icao:"WSSS",target_region:"ASIA",
   draw_type:"NEW_TEMPLATE",frozen_draw_seed:"seed",
 }] : [];
 const db={draws:initial,updates:[] as Row[]};
 let inTx=false;
 let txDraws:Row[]=[];
 let txUpdates:Row[]=[];
 let clockReads=0;
 let releases=0;
 const client={
  async query(sql:string,params:any[]=[]):Promise<any>{
   queries.push(sql);
   if(sql.startsWith("BEGIN")){inTx=true;txDraws=db.draws.map(x=>({...x}));txUpdates=[];return {rowCount:0,rows:[]};}
   if(sql==="COMMIT"){db.draws=txDraws;db.updates.push(...txUpdates);inTx=false;return {rowCount:0,rows:[]};}
   if(sql==="ROLLBACK"){inTx=false;return {rowCount:0,rows:[]};}
   if(sql.startsWith("SET LOCAL")||sql.includes("pg_advisory_xact_lock"))
     return {rowCount:1,rows:[{}]};
   if(sql.includes("FROM clean.adb_phase6_authorization"))
     return {rowCount:1,rows:[{
       enabled:!opts.disabled,revoked_at_utc:null,
       manifest_sha256:pins.expectedManifestSha256,
       calendar_hash:pins.expectedCalendarHash,
       config_hash:pins.expectedConfigHash,
     }]};
   if(sql.includes("FROM clean.adb_phase6_calendar_day"))
     return {rowCount:1,rows:[{
       run_day_index:1,scheduled_start_utc:new Date(start),
       date_utc:new Date("2026-11-10T00:00:00Z"),
       frozen_draw_seed:"early-owner-test-seed",
       draw_type:"NEW_TEMPLATE",anchor_icao:"WSSS",
       slot_regions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",
         MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
       pair_airport_set:null,
       calendar_hash:opts.wrongCalendar?H("e"):pins.expectedCalendarHash,
       config_hash:pins.expectedConfigHash,frame_hash:pins.expectedFrameHash,
     }]};
   if(sql.includes("clock_timestamp() AS at")){
     clockReads++;
     return {rowCount:1,rows:[{at:new Date(opts.expireAtCommit && clockReads===2
       ? "2026-11-09T14:00:00.000Z":opts.beforeNow??now)}]};
   }
   if(sql.includes("FROM clean.adb_sampling_draw")){
     const rows=txDraws.map(x=>({...x}));
     if(opts.mutableReadback && rows.length===4 && sql.includes("WHERE run_day_index"))
       rows[0].selected_icao="YSSY";
     return {rowCount:rows.length,rows};
   }
   if(sql.includes("FROM clean.adb_sampling_frame_registry"))
     return {rowCount:1,rows:[{active_frame_version:"frozen-frame",
       frame_hash:opts.mismatchedFrame?H("f"):pins.expectedFrameHash}]};
   if(sql.includes("FROM clean.adb_airport_sampling_state") && sql.includes("FOR UPDATE"))
     return {rowCount:0,rows:[]};
   if(sql.includes("FROM clean.adb_sampling_frame f"))
     return {rowCount:frame.length,rows:frame};
   if(sql.includes("INSERT INTO clean.adb_sampling_draw")){
     if(opts.failAfterInsert && txDraws.length===1)throw Error("SIMULATED_DB_WRITE_FAILURE");
     txDraws.push({
       slot_id:params[1],target_region:params[2],
       draw_type:params[3],selected_icao:params[4],
       frozen_draw_seed:params[5],adaptive_state_hash:params[6],
       probability_vector:params[7]?JSON.parse(params[7]):null,
       airport_layer_design_probability:params[8],selected_at_utc:params[9],
     });
     return {rowCount:1,rows:[]};
   }
   if(sql.includes("INSERT INTO clean.adb_airport_sampling_state")){
     txUpdates.push({icao:params[0],run_day:params[2]});
     return {rowCount:1,rows:[]};
   }
   throw Error("UNEXPECTED_SQL_IN_OFFLINE_TEST");
  },
  release(){releases++;}
 };
 return {pool:{async connect(){return client;}} as any,db,queries,
   getReleaseCount:()=>releases,getClockReads:()=>clockReads,
   getInTx:()=>inTx};
}

describe("Phase5 early adaptive DB owner (mock transaction, no provider)",()=>{
 it("commits one atomic four-slot draw and returns NON-PRE, NON-PROVIDER evidence",async()=>{
  const m=mockDb();
  const r=await commitEarlyPhase5Draw(m.pool,pins);
  expect(r.status).toBe("EARLY_DRAW_COMMITTED");
  expect(r.selectedAirportCount).toBe(4);
  expect(r.flightLevelPreVerified).toBe(false);
  expect(r.flightAlertSubscriptionsCreated).toBe(0);
  expect(r.providerCalls).toBe(0);
  expect(r.drawSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(m.db.draws.map(x=>x.selected_icao)).toEqual(["WSSS","OMAA","SKBO","KGPT"]);
  expect(new Set(m.db.draws.map(x=>new Date(x.selected_at_utc).toISOString())).size).toBe(1);
  expect(m.db.updates).toHaveLength(4);
  expect(m.getReleaseCount()).toBe(1);
  expect(m.queries[0]).toBe("BEGIN ISOLATION LEVEL SERIALIZABLE");
  expect(m.queries.some(s=>s.includes("pg_advisory_xact_lock"))).toBe(true);
  expect(m.getClockReads()).toBe(2);
 });
 it("idempotently readbacks earlier draw instead of updating selection or adaptive state",async()=>{
  const m=mockDb();
  const a=await commitEarlyPhase5Draw(m.pool,pins);
  const b=await commitEarlyPhase5Draw(m.pool,pins);
  expect(b.status).toBe("EARLY_DRAW_IDEMPOTENT_READBACK");
  expect(b.drawSha256).toBe(a.drawSha256);
  expect(m.db.draws).toHaveLength(4);
  expect(m.db.updates).toHaveLength(4);
 });
 it("refuses missing signed approval before even connecting to database",async()=>{
  const m=mockDb();
  await expect(commitEarlyPhase5Draw(m.pool,{
    ...pins,phase5FreezeApproved:false as true,
  })).rejects.toThrow("NOT_APPROVED_FOR_EARLY_DB_WRITE");
  expect(m.queries).toHaveLength(0);
 });
 it("refuses missing actual enabled authorization; rollback and no sampling",async()=>{
  const m=mockDb({disabled:true});
  await expect(commitEarlyPhase5Draw(m.pool,pins)).rejects
    .toThrow("NO_FROZEN_ENABLED_AUTHORIZATION");
  expect(m.db.draws).toHaveLength(0);
  expect(m.queries).toContain("ROLLBACK");
 });
 it("refuses wrong calendar or frame before any draw insert",async()=>{
  const a=mockDb({wrongCalendar:true}),b=mockDb({mismatchedFrame:true});
  await expect(commitEarlyPhase5Draw(a.pool,pins)).rejects.toThrow("CALENDAR_OR_FRAME_UNPINNED");
  await expect(commitEarlyPhase5Draw(b.pool,pins)).rejects.toThrow("ACTIVE_FRAME_HASH_MISMATCH");
  expect(a.db.draws).toHaveLength(0);
  expect(b.db.draws).toHaveLength(0);
 });
 it("refuses a new draw too late for the T24 acquisition",async()=>{
  const m=mockDb({beforeNow:"2026-11-09T14:00:00.000Z"});
  await expect(commitEarlyPhase5Draw(m.pool,pins)).rejects.toThrow("LATE_FOR_T24_SOURCE");
  expect(m.db.draws).toHaveLength(0);
 });
 it("refuses new draw implausibly early to prevent unbounded adaptive lag",async()=>{
  const m=mockDb({beforeNow:"2026-11-01T14:00:00.000Z"});
  await expect(commitEarlyPhase5Draw(m.pool,pins)).rejects.toThrow("PRESELECTION_TOO_EARLY");
  expect(m.db.draws).toHaveLength(0);
 });
 it("refuses partial historical draw rather than silently completing with a new random one",async()=>{
  const m=mockDb({partial:true});
  await expect(commitEarlyPhase5Draw(m.pool,pins)).rejects
    .toThrow("PARTIAL_OR_UNKNOWN_EXISTING_DRAW");
  expect(m.db.draws).toHaveLength(1);
 });
 it("rolls back all source and sampling-state updates after one failed insert",async()=>{
  const m=mockDb({failAfterInsert:true});
  await expect(commitEarlyPhase5Draw(m.pool,pins)).rejects.toThrow("SIMULATED_DB_WRITE_FAILURE");
  expect(m.db.draws).toHaveLength(0);
  expect(m.db.updates).toHaveLength(0);
  expect(m.queries).toContain("ROLLBACK");
 });
 it("rechecks true database clock immediately before COMMIT",async()=>{
  const m=mockDb({expireAtCommit:true});
  await expect(commitEarlyPhase5Draw(m.pool,pins)).rejects.toThrow("LATE_FOR_T24_SOURCE");
  expect(m.db.draws).toHaveLength(0);
 });
 it("detects DB readback mutation and rolls transaction back",async()=>{
  const m=mockDb({mutableReadback:true});
  await expect(commitEarlyPhase5Draw(m.pool,pins)).rejects
    .toThrow("FROZEN_ANCHOR_MISMATCH");
  expect(m.db.draws).toHaveLength(0);
 });
 it("rejects malformed release pins and invalid run-day",()=>{
  expect(()=>earlyDrawReleasePinsFingerprint({...pins,runDayIndex:32}))
    .toThrow("INVALID_RUN_DAY");
  expect(()=>earlyDrawReleasePinsFingerprint({...pins,expectedManifestSha256:""}))
    .toThrow("INCOMPLETE_RELEASE_PINS");
  expect(earlyDrawReleasePinsFingerprint(pins)).toMatch(/^[0-9a-f]{64}$/);
 });
 it("uses strict 24h45m and 72h boundaries, never promises per-flight PRE",()=>{
  expect(()=>validateEarlyDrawWindow(
    new Date("2026-11-09T13:15:00.000Z"),new Date(start),
  )).toThrow("LATE_FOR_T24_SOURCE");
  expect(()=>validateEarlyDrawWindow(
    new Date("2026-11-06T13:59:59.000Z"),new Date(start),
  )).toThrow("PRESELECTION_TOO_EARLY");
  expect(()=>validateEarlyDrawWindow(new Date(now),new Date(start))).not.toThrow();
 });
});
