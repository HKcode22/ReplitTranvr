import {describe,it,expect} from "vitest";
import {
 decideP5CdUpcomingDueWindow,waitP5CdGithubSignedDueWindow
} from "../server/lib/disruption/phase5CdGithubDbClockLookahead_v39";
import type {P5CdVerifiedTaskPacket}
 from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
const native="2035-11-25T12:00:00.000Z";
const hash="b".repeat(64);
const code="a".repeat(40);
function packets(){
 return new Map<string,P5CdVerifiedTaskPacket>([[
  hash,{packetSha256:hash,permit:{
    horizon:"T-6h",selectedTNativeUtc:native
  } as P5CdVerifiedTaskPacket["permit"]}
 ]]);
}
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
 P5_CD_GH_PRE_APPROVED_CODE_SHA:code,
 P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,
 P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
 P5_CD_GH_PRE_ARMED:"1",P5_CD_GH_PRE_STOP:"0",
 P5_CD_GH_PRE_MODE:"PHASE5_CANARY",
 P5_CD_GH_PHASE5_CANARY_APPROVED:"1",
 V39_PHASE5_FREEZE_SIGNED:"0",
 V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 V39_PHASE6_PROCESS_ARMED:"0",ADB_AUTO_COLLECT:"0",
 P5_CD_GH_PRE_ROSTER_SHA256:hash,V39_P5_RIGHTS_SHA256:hash,
 V39_P5_MANIFEST_SHA256:hash,
 P5_V39_PRE_DATABASE_URL:
 "postgresql://phase5_p30_pre_login_20261107:ci-only@reviewed.example.com/neondb?sslmode=verify-full"
});
describe("Phase5 C+D GitHub early DB-clock PRE window, NO provider/queue writes",()=>{
 it("waits from a genuine frozen T6 to the existing 3-minute window, not to a shifted T",()=>{
  const p=packets();
  const before=decideP5CdUpcomingDueWindow("2035-11-25T05:56:58.000Z",p);
  expect(before).toEqual({
   status:"WAIT_FOR_SIGNED_CUTOFF",waitMs:2000,
   eligibleSignedCutoffs:1
  });
  expect(decideP5CdUpcomingDueWindow("2035-11-25T05:57:00.000Z",p).status)
   .toBe("DUE_WINDOW");
  expect(decideP5CdUpcomingDueWindow("2035-11-25T06:00:00.000Z",p).status)
   .toBe("NO_NEAR_SIGNED_CUTOFF");
 });
 it("exits early when signed cutoffs are far away, never waiting a month",()=>{
  expect(decideP5CdUpcomingDueWindow(
   "2035-11-25T05:45:00.000Z",packets()).status)
   .toBe("NO_NEAR_SIGNED_CUTOFF");
 });
 it("uses actual restricted DB time and stays read-only until returning due",async()=>{
  const sqls:string[]=[],sleeps:number[]=[];
  let n=0;
  const db={query:async(sql:string)=>{
   sqls.push(sql);
   n++;
   return{rows:[{
    now_utc:new Date(n===1?"2035-11-25T05:56:58.000Z":
                             "2035-11-25T05:57:00.000Z"),
    role:"phase5_fids_pre_writer_prod_20261107"
   }]};
  }};
  const result=await waitP5CdGithubSignedDueWindow(env(),db,packets(),
   async ms=>{sleeps.push(ms)});
  expect(result.status).toBe("DUE_WINDOW");
  expect(result.dbClockPolls).toBe(2);
  expect(result.waitedMs).toBe(2000);
  expect(result.tasksClaimedByWaiter).toBe(0);
  expect(result.paidProviderCalls).toBe(0);
  expect(sleeps).toEqual([2000]);
  expect(sqls.every(x=>x.startsWith("SELECT clock_timestamp()"))).toBe(true);
 });
 it("rejects STOP before SQL and wrong database role after a SELECT clock only",async()=>{
  let count=0;
  const db={query:async()=>{
   count++;return{rows:[{
    now_utc:new Date("2035-11-25T05:56:58.000Z"),
    role:"travnr_runtime"
   }]};
  }};
  await expect(waitP5CdGithubSignedDueWindow({
   ...env(),P5_CD_GH_PRE_STOP:"1"
  },db,packets(),async()=>{}))
   .rejects.toThrow("REFUSED_P5_CD_GITHUB_PRE_");
  expect(count).toBe(0);
  await expect(waitP5CdGithubSignedDueWindow(env(),db,packets(),async()=>{}))
   .rejects.toThrow("NOT_EXISTING_STAGE30_SET_ONLY_PRE_ROLE");
  expect(count).toBe(1);
 });
 it("observes revocation between clock polls, never continuing a stopped tick",async()=>{
  const e=env();let count=0;
  const db={query:async()=>{
   count++;
   return{rows:[{
    now_utc:new Date("2035-11-25T05:56:58.000Z"),
    role:"phase5_fids_pre_writer_prod_20261107"
   }]};
  }};
  await expect(waitP5CdGithubSignedDueWindow(e,db,packets(),
    async()=>{e.P5_CD_GH_PRE_STOP="1"}))
    .rejects.toThrow("REFUSED_P5_CD_GITHUB_PRE_");
  expect(count).toBe(1);
 });
 it("bounded time budget exits without inventing due or writing to queue",async()=>{
  const db={query:async()=>({rows:[{
   now_utc:new Date("2035-11-25T05:56:55.000Z"),
   role:"phase5_fids_pre_writer_prod_20261107"
  }]})};
  const result=await waitP5CdGithubSignedDueWindow(env(),db,packets(),
    async()=>{});
  expect(result.status).toBe("MAX_REVIEWED_LOOKAHEAD_EXHAUSTED");
  expect(result.dbClockPolls).toBeLessThanOrEqual(106);
  expect(result.tasksClaimedByWaiter).toBe(0);
 });
 it("T24 can only enter the unchanged cutoff when isolated witness scope is explicit",()=>{
  const t24=new Map(packets());
  t24.set(hash,{packetSha256:hash,permit:{
   horizon:"T-24h",selectedTNativeUtc:native
  } as P5CdVerifiedTaskPacket["permit"]});
  expect(()=>decideP5CdUpcomingDueWindow(
   "2035-11-24T11:57:00.000Z",t24))
   .toThrow("T24_OR_STANDALONE_WITNESS_REQUIRES_OTHER_WORKFLOW");
  expect(decideP5CdUpcomingDueWindow(
   "2035-11-24T11:56:58.000Z",t24,
   {allowReviewedT24Witness:true}).status)
    .toBe("WAIT_FOR_SIGNED_CUTOFF");
  expect(decideP5CdUpcomingDueWindow(
   "2035-11-24T11:57:00.000Z",t24,
   {allowReviewedT24Witness:true}).status).toBe("DUE_WINDOW");
 });
 it("T24 dedicated clock requires distinct witness credential before DB query",async()=>{
  const t24=new Map(packets());
  t24.set(hash,{packetSha256:hash,permit:{
   horizon:"T-24h",selectedTNativeUtc:native
  } as P5CdVerifiedTaskPacket["permit"]});
  const e={...env(),P5_CD_GH_T24_WITNESS_APPROVED:"1",
   P5_V39_T24_WITNESS_DATABASE_URL:
    "postgresql://phase5_p30_witness_login_20261107:ci-only@reviewed.example.com/neondb?sslmode=verify-full"};
  let n=0;
  const db={query:async()=>{n++;return{rows:[{
   now_utc:new Date("2035-11-24T11:57:00.000Z"),
   role:"phase5_fids_pre_writer_prod_20261107"
  }]};}};
  await expect(waitP5CdGithubSignedDueWindow(
   {...e,P5_CD_GH_T24_WITNESS_APPROVED:"0"},
   db,t24,async()=>{},{allowReviewedT24Witness:true}))
    .rejects.toThrow("SEPARATE_T24_WITNESS_RELEASE_NOT_REVIEWED");
  expect(n).toBe(0);
  const r=await waitP5CdGithubSignedDueWindow(
   e,db,t24,async()=>{},{allowReviewedT24Witness:true});
  expect(r.status).toBe("DUE_WINDOW");
  expect(r.tasksClaimedByWaiter).toBe(0);
  expect(n).toBe(1);
 });
});
