import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {requireP5CdGithubPreparePrivateDayScope,requireP5CdGithubPrepareAdmission} from "../server/lib/disruption/phase5CdGithubPrepareRegistrationGate_v39";
import {executeP6PrivateEnrollmentBatch} from "../scripts/v39_phase6_private_later_restartable_enrollment_v39";
const code="a".repeat(40),h="b".repeat(64);
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
 GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
 P5_CD_GH_PRE_APPROVED_CODE_SHA:code,P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,
 P5_CD_GH_PREPARE_CONFIRM:"REGISTER_ONE_ALREADY_BOUND_SOURCE_FLIGHT_NO_PROVIDER",
 P5_CD_GH_PREPARE_PRIVATE_DAY_APPROVED:"1",P5_CD_GH_PREPARE_ARMED:"1",P5_CD_GH_PRE_ARMED:"1",
 P5_CD_GH_PRE_STOP:"0",P5_CD_GH_PRE_MODE:"PHASE5_CANARY",P5_CD_GH_PHASE5_CANARY_APPROVED:"1",
 V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE5_FREEZE_SIGNED:"0",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 ADB_AUTO_COLLECT:"0",V39_P5_MANIFEST_SHA256:h,V39_P5_RIGHTS_SHA256:h,
 P5_V39_PREPARE_DATABASE_URL:"postgresql://phase5_p30_prepare_login_20261107:ci@ep-test.neon.tech/neondb?sslmode=require"
});
describe("current signed later PREPARE role scope",()=>{
 it("no legacy hash required or self-declared",()=>{
  expect(requireP5CdGithubPreparePrivateDayScope(env()).gate).not.toHaveProperty("rosterSha256");
  expect(()=>requireP5CdGithubPrepareAdmission(env())).toThrow();
 });
 it.each([{P5_CD_GH_PREPARE_PRIVATE_DAY_APPROVED:"0"},{P5_CD_GH_PRE_ROSTER_SHA256:h},
 {P5_CD_GH_PRE_ROSTER_PATH:"forbidden"},{P5_CD_GH_PRE_STOP:"1"},{GITHUB_EVENT_NAME:"schedule"},
 {RAPIDAPI_KEY:"forbidden"},{P5_V39_PRE_DATABASE_URL:"forbidden"}])("rejects mixed or unauthorized mode %j",delta=>{
  expect(()=>requireP5CdGithubPreparePrivateDayScope({...env(),...delta})).toThrow();
 });
});
describe("bounded original registration exact restart",()=>{
 const now=Date.parse("2035-01-01T00:00:00.000Z");
 const pkt={entry:{packetSha256:h,permit:{manifestSha256:h,queryDigestSha256:h,
 flightInstanceId:"leg:ci:1",horizon:"T-6h",selectedTNativeUtc:"2035-01-01T07:00:00.000Z",
 expectedSourcePopulationQueryId:"c23e4567-e89b-42d3-a456-426614174013",expectedSourceResponseSha256:h,
 expectedReviewedSourceRightsSha256:h,maxPopulationStalenessSeconds:3600}},cutoff:now+3600000} as any;
 it("reports exact existing ACK and expired cutoff without second SQL write",async()=>{
  let calls=0;
  const result=await executeP6PrivateEnrollmentBatch({query:async(sql)=>{
   if(sql.startsWith("SELECT clock"))return {rows:[{now:new Date(now)}]};
   calls++;return {rows:[{task_id:"1",newly_registered:false}],rowCount:1};
  }},[pkt,{...pkt,cutoff:now}]);
  expect(result).toEqual({newlyRegistered:0,alreadyRegistered:1,expiredBeforeEnrollment:1,timeBoundDeferred:0});expect(calls).toBe(1);
 });
 it("can reach the second 96-member shard without truncating exact replays",async()=>{
  let calls=0;
  const out=await executeP6PrivateEnrollmentBatch({query:async(sql)=>{
   if(sql.startsWith("SELECT clock"))return {rows:[{now:new Date(now)}]};
   calls++;return {rows:[{task_id:String(calls),newly_registered:calls>96}],rowCount:1};
  }},Array.from({length:97},()=>pkt));
  expect(calls).toBe(97);expect(out.newlyRegistered).toBe(1);expect(out.alreadyRegistered).toBe(96);
 });
 it("stops entire batch immediately on unknown ACK rather than blindly continuing",async()=>{
  let writes=0;
  await expect(executeP6PrivateEnrollmentBatch({query:async(sql)=>{
   if(sql.startsWith("SELECT clock"))return {rows:[{now:new Date(now)}]};
   writes++;return {rows:[],rowCount:0};
  }},[pkt,pkt])).rejects.toThrow("UNKNOWN_REGISTRATION_ACK");
  expect(writes).toBe(1);
 });
});

import {selectP6LaterCalendarDueDays,loadP6LaterCalendarWindows,loadP6CurrentEnrollmentCalendarWindows,isP6CurrentEnrollmentDispatch,P6_CURRENT_LATER_ENROLL_CONFIRM,P6_CURRENT_T24_ENROLL_CONFIRM,isP6CurrentPreTrigger,isP6CurrentT24Trigger} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
describe("bounded reviewed calendar scheduling",()=>{
 it("selects earliest closing relevant days using DB clock, not today's UTC day number",()=>{
  const now=Date.parse("2035-01-01T00:00:00.000Z"),ms=[{day:1,children:[{start:now-1,end:now+100}]},
   {day:2,children:[{start:now-1,end:now+200}]},{day:3,children:[{start:now-1,end:now+50}]},
   {day:4,children:[{start:now+1,end:now+1000}]},{day:5,children:[{start:now-100,end:now}]}];
  expect(selectP6LaterCalendarDueDays({windows:ms,validFrom:now-1000,validUntil:now+10000},new Date(now).toISOString())).toEqual({dayIndices:[3,1],deferredDays:1});
 });
 it("rejects expired protected calendar policy",()=>{
  const now=Date.parse("2035-01-01T00:00:00.000Z");
  expect(()=>selectP6LaterCalendarDueDays({windows:[],validFrom:now-100,validUntil:now},new Date(now).toISOString())).toThrow("CALENDAR_POLICY_NOT_LIVE");
 });
});

import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39";
describe("same Neon physical endpoint, not same hostname spelling",()=>{
 const url=(host:string,db="neondb")=>new URL("postgresql://ci:ci@"+host+"/"+db+"?sslmode=require");
 it("canonicalizes only one pooler suffix and default PostgreSQL port",()=>{
  expect(sameP6NeonDatabaseEndpoint(url("ep-test.neon.tech"),url("ep-test-pooler.neon.tech:5432"))).toBe(true);
  expect(sameP6NeonDatabaseEndpoint(url("ep-test.aws.neon.tech"),url("ep-test-pooler.aws.neon.tech"))).toBe(true);
 });
 it.each(["ep-other-pooler.neon.tech","ep-test-pooler.neon.tech:6432","ep-test-pooler.neon.tech.evil.example","ep-test-pooler-pooler.neon.tech","ep-test-pooler.other.neon.tech"])("rejects different physical endpoints: %s",host=>{
  expect(sameP6NeonDatabaseEndpoint(url("ep-test.neon.tech"),url(host))).toBe(false);
 });
 it("rejects a different database on the same endpoint",()=>{
  expect(sameP6NeonDatabaseEndpoint(url("ep-test.neon.tech"),url("ep-test-pooler.neon.tech","other"))).toBe(false);
 });
});

describe("exact current enrollment handoff retains the original signed calendar",()=>{
 const trust={reviewedCodeSha:code,manifestSha256:h,calendarSha256:h,releaseSha256:h,rightsSha256:h};
 const plans=new Map<string,Buffer>(),hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
 const dayPlanSha256s=Array.from({length:31},(_,i)=>{
  const runDayIndex=i+1;
  const bytes=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex,
   templates:Array.from({length:12},(_,j)=>({runDayIndex,horizon:j<4?"T-24h":j<8?"T-6h":"T-90m",
    scheduledRequestUtc:"2035-01-01T00:00:00.000Z",earliestPlannedCutoffUtc:"2035-01-01T00:15:00.000Z",
    serviceWindowEndUtc:"2035-01-02T04:00:00.000Z"}))}));
  plans.set("data-collection/phase5/planning/phase6-source-day-"+String(runDayIndex).padStart(2,"0")+".json",bytes);
  return {runDayIndex,sha256:hash(bytes)};
 });
 const policy=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",
  delegatedDailyPacketProductionApproved:true,approvedCodeSha:code,manifestSha256:h,calendarSha256:h,releaseSha256:h,rightsSha256:h,
  dayPlanSha256s,validFromUtc:"2035-01-01T00:00:00.000Z",validUntilUtc:"2035-03-01T00:00:00.000Z"}));
 const scheduled:NodeJS.ProcessEnv={...env(),GITHUB_EVENT_NAME:"schedule",P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",P5_CD_GH_PHASE5_CANARY_APPROVED:"0",
  V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE6_PROCESS_ARMED:"1",
  P6_PRIVATE_LATER_ENROLL_ENABLED:"1",P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED:"1",
  P6_PRIVATE_T24_ENROLL_ENABLED:"1",P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",
  P6_NONPAID_DAILY_POLICY_BASE64:policy.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:hash(policy)};
 const read=(path:string)=>plans.get(path)!;
 it.each([["LATER",P6_CURRENT_LATER_ENROLL_CONFIRM],["T24",P6_CURRENT_T24_ENROLL_CONFIRM]] as const)("uses exact original %s calendar and DB-clock selection", (horizon,confirm)=>{
  const manual={...scheduled,GITHUB_EVENT_NAME:"workflow_dispatch",P5_CD_GH_PREPARE_PRIVATE_DAY_CONFIRM:confirm};
  expect(isP6CurrentEnrollmentDispatch(manual,horizon)).toBe(true);
  expect(isP6CurrentEnrollmentDispatch(manual,horizon==="LATER"?"T24":"LATER")).toBe(false);
  expect(isP6CurrentPreTrigger(manual)).toBe(false);
  expect(isP6CurrentT24Trigger(manual)).toBe(false);
  expect(loadP6CurrentEnrollmentCalendarWindows(manual,trust,read,horizon)).toEqual(loadP6LaterCalendarWindows(scheduled,trust,read,horizon));
  expect(()=>loadP6LaterCalendarWindows(manual,trust,read,horizon)).toThrow("EXPLICIT_SCHEDULE_SCOPE_REQUIRED");
  for(const delta of [{P6_PRIVATE_LATER_RUN_DAYS:"1"},{P6_PRIVATE_T24_RUN_DAYS:"1"},{P5_CD_GH_PRE_MODE:"PHASE5_CANARY"},
   {P5_CD_GH_PREPARE_PRIVATE_DAY_CONFIRM:"REGISTER_CURRENT_SIGNED_T24_DAY_NO_PROVIDER"},
   {P6_PRIVATE_CURRENT_PRE_DISPATCH_CONFIRM:"RUN_CURRENT_SIGNED_PRE_TICK_NO_PROVIDER"},
   {P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:"RUN_CURRENT_SIGNED_T24_WITH_WITNESS_NO_PROVIDER"},
   {[horizon==="LATER"?"P6_PRIVATE_LATER_ENROLL_ENABLED":"P6_PRIVATE_T24_ENROLL_ENABLED"]:"0"},
   {[horizon==="LATER"?"P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED":"P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED"]:"0"}]){
   expect(isP6CurrentEnrollmentDispatch({...manual,...delta},horizon)).toBe(false);
   expect(()=>loadP6CurrentEnrollmentCalendarWindows({...manual,...delta},trust,read,horizon)).toThrow("CURRENT_ENROLLMENT_DISPATCH_REQUIRED");
  }
  expect(()=>loadP6CurrentEnrollmentCalendarWindows({...manual,V39_PHASE5_FREEZE_SIGNED:"0"},trust,read,horizon)).toThrow("EXPLICIT_SCHEDULE_SCOPE_REQUIRED");
  expect(()=>loadP6CurrentEnrollmentCalendarWindows({...manual,P6_NONPAID_DAILY_POLICY_SHA256:"d".repeat(64)},trust,read,horizon)).toThrow("POLICY_HASH_DRIFT");
  expect(()=>requireP5CdGithubPreparePrivateDayScope({...manual,P5_CD_GH_PRE_STOP:"1"})).toThrow();
 });
});
