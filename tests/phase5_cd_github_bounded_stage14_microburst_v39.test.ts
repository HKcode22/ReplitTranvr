import {describe,it,expect} from "vitest";
import {
 admitP5CdGithubStage14Microburst,
 runP5CdGithubStage14Microburst
} from "../server/lib/disruption/phase5CdGithubBoundedStage14Microburst_v39";
import type {P5CdTickReport,P5CdTickRecord}
 from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";

const sh="a".repeat(64),code="b".repeat(40);
function env():NodeJS.ProcessEnv{
 return{
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  P5_CD_GH_PRE_APPROVED_CODE_SHA:code,
  P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,
  P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
  P5_CD_GH_PRE_ARMED:"1",P5_CD_GH_PRE_STOP:"0",
  P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",
  P5_CD_GH_PHASE5_CANARY_APPROVED:"0",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  AERODATABOX_WEBHOOK_SECRET:"",DATABASE_URL:"",
  V39_DATABASE_RUNTIME_URL:"",
  V39_P5_SOURCE_DATABASE_URL:"",
  P5_V39_PREPARE_DATABASE_URL:"",
  P5_V39_T24_WITNESS_DATABASE_URL:"",
  P5_V39_OTHER_REST_REVIEW_DATABASE_URL:"",
  P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"",
  P5_CD_GH_PRE_ROSTER_SHA256:sh,
  V39_P5_RIGHTS_SHA256:sh,V39_P5_MANIFEST_SHA256:sh,
  P5_V39_PRE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:synthetic@neon.example.net/neondb"
 };
}
function tick(ids:string[],kind:P5CdTickRecord["result"]="VERIFIED_ON_TIME",
 overrides:Partial<P5CdTickReport>={}):P5CdTickReport{
 const records=ids.map(taskId=>({taskId,result:kind}));
 const all=records.every(x=>x.result==="VERIFIED_ON_TIME");
 return{
  schema:"v39.phase5.cd-gh-bounded-pre-tick.v1",
  status:all?"COMPLETED_WITH_PROSPECTIVE_EVIDENCE_OR_RECORDED_MISSINGNESS":
   "HOLD_UNSIGNED_OR_UNCERTAIN_SNAPSHOT_NO_REPLAY",
  claimed:ids.length,verified:all?ids.length:0,
  reaped:[],results:records,
  providerCalls:0,paidProviderCalls:0,tasksEnqueued:0,
  independentScientificFreezeGranted:false,
  phase6PaidGoGrantedByTick:false,
  ...overrides
 };
}
describe("Phase6 opt-in burst of ORIGINAL V0092/Stage14 two-flight PRE ticks",()=>{
 it("defaults exactly to one tick, even on approved Phase6",async()=>{
  const e=env();let calls=0;
  expect(admitP5CdGithubStage14Microburst(e).maxTicks).toBe(1);
  const x=await runP5CdGithubStage14Microburst(e,async()=>{
   calls++;return tick(["1","2"]);
  });
  expect(calls).toBe(1);
  expect(x.claimed).toBe(2);
  expect(x.verified).toBe(2);
  expect(x.reviewedTickLimit).toBe(1);
  expect(x.stoppedFor).toBe("TICK_BOUND_REACHED");
  expect(x.noConcurrentWorkersLaunched).toBe(true);
  expect(x.providerCalls).toBe(0);
  expect(x.phase6PaidGoGrantedByTick).toBe(false);
 });
 it("only opted-in review allows four sequential two-task ticks",async()=>{
  const e={...env(),P5_CD_GH_BURST_TICKS:"4",P5_CD_GH_BURST_APPROVED:"1"};
  let calls=0;
  const out=await runP5CdGithubStage14Microburst(e,async()=>{
   calls++;
   return tick([String(10*calls+1),String(10*calls+2)]);
  });
  expect(calls).toBe(4);
  expect(out.claimed).toBe(8);
  expect(out.verified).toBe(8);
  expect(out.originalStage14ClaimCapacityCeiling).toBe(8);
  expect(out.ticksExecuted).toBe(4);
  expect(out.stoppedFor).toBe("TICK_BOUND_REACHED");
  expect(out.results).toHaveLength(8);
  expect(out.paidProviderCalls).toBe(0);
 });
 it("stops when original queue claim returns fewer than two tasks",async()=>{
  const e={...env(),P5_CD_GH_BURST_TICKS:"4",P5_CD_GH_BURST_APPROVED:"1"};
  let n=0;
  const out=await runP5CdGithubStage14Microburst(e,async()=>{
   n++;
   return n===1?tick(["1","2"]):tick(["3"]);
  });
  expect(n).toBe(2);
  expect(out.claimed).toBe(3);
  expect(out.stoppedFor).toBe("SIGNED_ROSTER_DRAINED");
 });
 it("never retries or processes another flight after UNKNOWN Stage14 COMMIT",async()=>{
  const e={...env(),P5_CD_GH_BURST_TICKS:"4",P5_CD_GH_BURST_APPROVED:"1"};
  let n=0;
  const out=await runP5CdGithubStage14Microburst(e,async()=>{
   n++;
   return n===1?tick(["1","2"]):
    tick(["3"],"WRITE_STARTED_UNKNOWN_NO_AUTORETRY");
  });
  expect(n).toBe(2);
  expect(out.claimed).toBe(3);
  expect(out.verified).toBe(2);
  expect(out.status).toBe("HOLD_UNSIGNED_OR_UNCERTAIN_SNAPSHOT_NO_REPLAY");
  expect(out.stoppedFor).toBe("UNSIGNED_OR_UNKNOWN_COMMIT_NO_RETRY");
  expect(out.results.at(-1)?.result).toBe(
   "WRITE_STARTED_UNKNOWN_NO_AUTORETRY");
 });
 it("propagates a possible SQL unknown-commit exception immediately; no second call",async()=>{
  const e={...env(),P5_CD_GH_BURST_TICKS:"4",P5_CD_GH_BURST_APPROVED:"1"};
  let n=0;
  await expect(runP5CdGithubStage14Microburst(e,async()=>{
   n++;throw Error("DB_UNKNOWN_COMMIT_UNSAFE_TO_REPLAY");
  })).rejects.toThrow("DB_UNKNOWN_COMMIT_UNSAFE_TO_REPLAY");
  expect(n).toBe(1);
 });
 it("enforces opt-in Phase6 release, no Phase5 canary expansion",()=>{
  const e=env();
  for(const value of ["0","5","20","-1","a","1.5"]){
   expect(()=>admitP5CdGithubStage14Microburst({
    ...e,P5_CD_GH_BURST_TICKS:value
   })).toThrow("MAX_FOUR_SIGNED_TICKS");
  }
  expect(()=>admitP5CdGithubStage14Microburst({
   ...e,P5_CD_GH_BURST_TICKS:"4"
  })).toThrow("PHASE6_BATCH_CAPACITY_NOT_INDEPENDENTLY_APPROVED");
  expect(()=>admitP5CdGithubStage14Microburst({
   ...e,P5_CD_GH_BURST_TICKS:"4",P5_CD_GH_BURST_APPROVED:"1",
   P5_CD_GH_PRE_MODE:"PHASE5_CANARY",
   P5_CD_GH_PHASE5_CANARY_APPROVED:"1",
   V39_PHASE5_FREEZE_SIGNED:"0",V39_PHASE6_PROCESS_ARMED:"0"
  })).toThrow("PHASE6_BATCH_CAPACITY_NOT_INDEPENDENTLY_APPROVED");
  expect(()=>admitP5CdGithubStage14Microburst({
   ...e,P5_CD_GH_PRE_STOP:"1",P5_CD_GH_BURST_TICKS:"4",
   P5_CD_GH_BURST_APPROVED:"1"
  })).toThrow("NO_REVIEWED_MAIN_SOURCE_RIGHTS_FROZEN_GO_OR_STOP_ACTIVE");
 });
 it("rejects forged extra tasks, provider calls, invalid receipts and same task twice",async()=>{
  const e={...env(),P5_CD_GH_BURST_TICKS:"3",P5_CD_GH_BURST_APPROVED:"1"};
  for(const bad of [
   tick(["1","2","3"]),
   tick(["1","2"],"VERIFIED_ON_TIME",{providerCalls:1 as 0}),
   tick(["1","2"],"VERIFIED_ON_TIME",{verified:1}),
   tick(["1","1"])
  ]){
   await expect(runP5CdGithubStage14Microburst(e,async()=>bad))
    .rejects.toThrow(/REFUSED_P5_CD_GH_MICROBURST_/);
  }
  let n=0;
  await expect(runP5CdGithubStage14Microburst(e,async()=>{
   n++;return tick(n===1?["1","2"]:["2","3"]);
  })).rejects.toThrow("REPEATED_STAGE14_TASK_ACROSS_MICROTICKS");
  expect(n).toBe(2);
 });
 it("fails closed on quarantined reaper or unsigned task, without extra tick",async()=>{
  const e={...env(),P5_CD_GH_BURST_TICKS:"4",P5_CD_GH_BURST_APPROVED:"1"};
  let n=0;
  const out=await runP5CdGithubStage14Microburst(e,async()=>{
   n++;
   return tick(["1"],"VERIFIED_ON_TIME",{
    status:"HOLD_UNSIGNED_OR_UNCERTAIN_SNAPSHOT_NO_REPLAY",
    reaped:[{taskId:"old",state:"QUARANTINED"}]
   });
  });
  expect(n).toBe(1);
  expect(out.stoppedFor).toBe("UNSIGNED_OR_UNKNOWN_COMMIT_NO_RETRY");
 });
});
