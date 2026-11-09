import {describe,it,expect} from "vitest";
import type {Pool} from "pg";
import {
 selectP5GitHubNextEarlyDraw,type P5SchedulerDayRow
} from "../server/lib/disruption/phase5GithubClockEarlyDrawSelector_v39";
import {
 parseP5GitHubApprovedEarlyDrawContext,
 runP5GitHubAutonomousEarlyDraw
} from "../scripts/v39_phase5_github_six_slot_early_draw_owner_v39";

const h=(c:string)=>c.repeat(64);
const FIRST=Date.parse("2027-01-20T08:00:00.000Z");
const NOW=new Date(FIRST-48*3600000).toISOString();
const dates=(first=FIRST):P5SchedulerDayRow[]=>
 Array.from({length:31},(_,i)=>{
  const s=new Date(first+i*48*3600000).toISOString();
  return {
   run_day_index:i+1,scheduled_start_utc:s,
   calendar_hash:h("a"),config_hash:h("b"),frame_hash:h("c"),
   date_utc:s.slice(0,10),draw_count:0
  };
 });
const args=(dbClockUtc=NOW,rows=dates())=>({
 dbClockUtc,expectedCalendarSha256:h("a"),
 expectedConfigSha256:h("b"),expectedFrameSha256:h("c"),rows
});
const env=()=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_SHA:"e".repeat(40),
 GITHUB_RUN_ATTEMPT:"1",GITHUB_EVENT_NAME:"schedule",
 ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
 V39_P5_EARLY_DRAW_OWNER_APPROVED:"1",
 V39_PHASE5_FREEZE_SIGNED:"1",
 V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 V39_PHASE6_PROCESS_ARMED:"1",
 V39_P5_MANIFEST_SHA256:h("d"),V39_P5_CALENDAR_HASH:h("a"),
 V39_P5_CONFIG_HASH:h("b"),V39_P5_FRAME_HASH:h("c"),
 V39_P5_EARLY_DRAW_EFFECTIVE_ROLE:"phase5_fids_early_draw_ci",
 V39_P5_EARLY_DRAW_DATABASE_URL:
  "postgresql://phase5_fids_early_draw_ci:dummy@localhost:5432/neondb"
});
describe("one real-time GitHub clock owner reuses existing early selector",()=>{
 it("selects day1 48h early without fabricating airport identities or provider calls",()=>{
  const out=selectP5GitHubNextEarlyDraw(args());
  expect(out).toMatchObject({
   status:"ONE_DUE_REVIEWED_DAY",runDayIndex:1,
   priorCommittedDays:0,providerCalls:0,databaseWrites:0
  });
  expect("selectedAirports" in out).toBe(false);
 });
 it("finds next after a safely committed earlier four-slot day",()=>{
  const rows=dates();rows[0].draw_count=4;
  const out=selectP5GitHubNextEarlyDraw(args(
   new Date(FIRST+48*3600000-48*3600000).toISOString(),rows
  ));
  // Day2 is still more than 72h away at this instant.
  expect(out.status).toBe("NOT_DUE_OR_ALREADY_SELECTED");
  if(out.status==="NOT_DUE_OR_ALREADY_SELECTED"){
   expect(out.selectedDays).toBe(1);
   expect(out.nextDueRunDayIndex).toBe(2);
  }
  const due=selectP5GitHubNextEarlyDraw(args(
   new Date(FIRST).toISOString(),rows
  ));
  expect(due).toMatchObject({status:"ONE_DUE_REVIEWED_DAY",runDayIndex:2});
 });
 it("refuses missing earlier draw rather than skip to a later day",()=>{
  const rows=dates();
  expect(()=>selectP5GitHubNextEarlyDraw(args(
   new Date(FIRST+25*3600000).toISOString(),rows
  ))).toThrow("EARLIER_UNSELECTED_DAY_MISSED_NON_BACKFILLABLE_CUTOFF");
 });
 it("enforces strict 24h45 and inclusive 72h selection clock",()=>{
  expect(selectP5GitHubNextEarlyDraw(args(
   new Date(FIRST-72*3600000).toISOString()
  ))).toMatchObject({status:"ONE_DUE_REVIEWED_DAY",runDayIndex:1});
  expect(()=>selectP5GitHubNextEarlyDraw(args(
   new Date(FIRST-(24*3600000+45*60000)).toISOString()
  ))).toThrow("EARLIER_UNSELECTED_DAY_MISSED_NON_BACKFILLABLE_CUTOFF");
  expect(selectP5GitHubNextEarlyDraw(args(
   new Date(FIRST-72*3600000-1).toISOString()
  )).status).toBe("NOT_DUE_OR_ALREADY_SELECTED");
 });
 it("refuses partial/duplicate four-slot draws, calendar SHA drift and 30 rows",()=>{
  const partial=dates();partial[0].draw_count=2;
  expect(()=>selectP5GitHubNextEarlyDraw(args(NOW,partial)))
   .toThrow("CALENDAR_OR_FOUR_SLOT_DRAW_DRIFT");
  const dupe=dates();dupe[1].run_day_index=1;
  expect(()=>selectP5GitHubNextEarlyDraw(args(NOW,dupe)))
   .toThrow("CALENDAR_OR_FOUR_SLOT_DRAW_DRIFT");
  const wrong=dates();wrong[16].frame_hash=h("e");
  expect(()=>selectP5GitHubNextEarlyDraw(args(NOW,wrong)))
   .toThrow("CALENDAR_OR_FOUR_SLOT_DRAW_DRIFT");
  expect(()=>selectP5GitHubNextEarlyDraw(args(NOW,dates().slice(1))))
   .toThrow("MISSING_FROZEN_31_PARENT_DAY_CALENDAR");
 });
 it("refuses the wrong GitHub event, second attempt, provider key or unsigned GO",()=>{
  const v=env();
  expect(parseP5GitHubApprovedEarlyDrawContext(v).calendar).toBe(h("a"));
  for(const bad of [
   {GITHUB_EVENT_NAME:"pull_request"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_REF:"refs/heads/other"},
   {AERODATABOX_API_KEY:"secret"},
   {V39_PHASE5_FREEZE_SIGNED:"0"},
   {V39_PHASE6_PROCESS_ARMED:"0"},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"}
  ])expect(()=>parseP5GitHubApprovedEarlyDrawContext({...v,...bad}))
   .toThrow("NO_MAIN_ONLY_SIGNED_PHASE6_AUTH");
  expect(()=>parseP5GitHubApprovedEarlyDrawContext({
   ...v,GITHUB_EVENT_NAME:"workflow_dispatch"
  })).toThrow("NO_MAIN_ONLY_SIGNED_PHASE6_AUTH");
  expect(parseP5GitHubApprovedEarlyDrawContext({
   ...v,GITHUB_EVENT_NAME:"workflow_dispatch",
   P5_EARLY_DRAW_MANUAL_CONFIRM:"ONE_FUTURE_EARLY_DRAW_AFTER_SEPARATE_PHASE6_GO"
  }).manifest).toBe(h("d"));
 });
 it("uses only READ ONLY database snapshots for not-yet-due checks",async()=>{
  const calls:string[]=[];
  let released=0,ended=0;
  const fake={
   connect:async()=>({
    query:async(sql:string)=>{
     calls.push(sql);
     if(sql.includes("current_database()"))return {rows:[{
      db:"neondb",role:"phase5_fids_early_draw_ci",
      ro:"on",replica:false,now:new Date(FIRST-80*3600000)
     }]};
     if(sql.includes("FROM clean.adb_phase6_authorization"))return{
      rowCount:1,rows:[{
       manifest_sha256:h("d"),calendar_hash:h("a"),
       config_hash:h("b"),enabled:true,revoked_at_utc:null
      }]};
     if(sql.includes("FROM clean.adb_phase6_calendar_day"))return{
      rowCount:31,rows:dates()
     };
     return {rowCount:0,rows:[]};
    },
    release:()=>{released++;}
   }),
   end:async()=>{ended++;}
  } as unknown as Pool;
  const res=await runP5GitHubAutonomousEarlyDraw(
   env(),()=>fake
  );
  expect(res.status).toBe("NO_DUE_FUTURE_DRAW_AT_DB_CLOCK");
  expect(res.providerCalls).toBe(0);
  expect(calls[0]).toBe("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(calls.includes("ROLLBACK")).toBe(true);
  expect(calls.some(x=>/\b(?:INSERT|UPDATE|DELETE|COMMIT)\b/i.test(x))).toBe(false);
  expect(released).toBe(1);
  expect(ended).toBe(1);
 });
});
