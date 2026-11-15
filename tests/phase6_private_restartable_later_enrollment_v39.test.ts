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
  expect(result).toEqual({newlyRegistered:0,alreadyRegistered:1,expiredBeforeEnrollment:1});expect(calls).toBe(1);
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
