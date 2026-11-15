import {describe,it,expect} from "vitest";
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

import {selectP6LaterCalendarDueDays} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
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
