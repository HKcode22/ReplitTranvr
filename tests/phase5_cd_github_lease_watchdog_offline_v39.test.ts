import {describe,it,expect} from "vitest";
import {createHash,generateKeyPairSync} from "node:crypto";
import {requireP5CdGithubPreRelease} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import {
 requireP5CdLeaseWatchdogRelease,runP5CdGithubLeaseWatchdog
} from "../server/lib/disruption/phase5CdGithubLeaseWatchdog_v39";
const hash="a".repeat(64),code="b".repeat(40);
function released():NodeJS.ProcessEnv{
 return{
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  P5_CD_GH_PRE_APPROVED_CODE_SHA:code,
  P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,
  P5_CD_GH_WATCHDOG_ENABLED:"1",P5_CD_GH_WATCHDOG_EXECUTE:"1",
  P5_CD_GH_WATCHDOG_CONFIRM:
   "REAP_EXISTING_CD_LEASES_ONLY_NO_REPLAY_NO_PROVIDER",
  P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
  P5_CD_GH_PRE_ARMED:"1",P5_CD_GH_PRE_STOP:"0",
  P5_CD_GH_PRE_MODE:"PHASE5_CANARY",
  P5_CD_GH_PHASE5_CANARY_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"0",V39_PHASE6_PROCESS_ARMED:"0",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",ADB_AUTO_COLLECT:"0",
  P5_CD_GH_PRE_ROSTER_SHA256:hash,V39_P5_MANIFEST_SHA256:hash,
  V39_P5_RIGHTS_SHA256:hash,
  P5_V39_PRE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:ci-only@reviewed.example.com/neondb?sslmode=verify-full"
 };
}
function current():NodeJS.ProcessEnv{
 const d=generateKeyPairSync("ed25519").publicKey,q=generateKeyPairSync("ed25519").publicKey;
 const fingerprint=(key:typeof d)=>createHash("sha256").update(key.export({format:"der",type:"spki"})).digest("hex");
 const trust={independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:"phase6_private_reader_login_ci_reaper",
  reviewedCodeSha:code,manifestSha256:hash,calendarSha256:hash,releaseSha256:hash,rightsSha256:hash,
  dayReviewerFingerprintSha256:fingerprint(d),dayReviewerPublicKeyPem:d.export({format:"pem",type:"spki"}).toString(),
  queryReviewerFingerprintSha256:fingerprint(q),queryReviewerPublicKeyPem:q.export({format:"pem",type:"spki"}).toString()};
 return {...released(),P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",P5_CD_GH_PHASE5_CANARY_APPROVED:"0",
  V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE6_PROCESS_ARMED:"1",P5_CD_GH_PRE_ROSTER_SHA256:"",
  P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED:"1",P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",
  P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:Buffer.from(JSON.stringify(trust)).toString("base64"),V39_P5_RELEASE_SHA256:hash};
}
function granted(){return{
 db:"neondb",role:"phase5_fids_pre_writer_prod_20261107",
 v0092:true,can_reap:true,old_claim:false,direct_update:false
};}
function mockDb(permission=granted(),states:string[]=[]){
 const queries:Array<{sql:string;args?:unknown[]}>=[];let writes=0;
 return{
  queries,get writes(){return writes;},
  db:{query:async(sql:string,args?:unknown[])=>{
   queries.push({sql,args});
   if(sql.startsWith("SELECT current_database()"))
    return{rows:[permission],rowCount:1};
   if(sql.includes("phase5_cd_reap_once_v39")){
    writes++;
    return{rows:states.map((state,i)=>({
     task_id:String(i+1),new_state:state
    })),rowCount:states.length};
   }
   throw Error("UNEXPECTED_OTHER_QUEUE_SQL");
  }}
 };
}
describe("Phase5 independent V0087 queue lease watchdog (NO provider)",()=>{
 it("rejects STOP, unarmed, wrong event and paid keys before database use",async()=>{
  const cases=[
   {P5_CD_GH_PRE_STOP:"1"},
   {P5_CD_GH_WATCHDOG_ENABLED:"0"},
   {P5_CD_GH_WATCHDOG_EXECUTE:"0"},
   {P5_CD_GH_WATCHDOG_CONFIRM:""},
   {GITHUB_EVENT_NAME:"pull_request"},
   {AERODATABOX_API_KEY:"SHOULD_NOT_BE_USED"}
  ];
  for(const delta of cases){
   const m=mockDb();
   await expect(runP5CdGithubLeaseWatchdog({
    ...released(),...delta
   },m.db)).rejects.toThrow("REFUSED_P5_CD_");
   expect(m.queries.length).toBe(0);
  }
 });
 it("allows recovery only under current reviewed study without minting any flight roster authority",async()=>{
  const e=current(),m=mockDb(granted(),["READY","QUARANTINED"]);
  expect(requireP5CdLeaseWatchdogRelease(e).releaseMode).toBe("PHASE6_APPROVED");
  expect(()=>requireP5CdGithubPreRelease(e)).toThrow("NO_REVIEWED_MAIN");
  const r=await runP5CdGithubLeaseWatchdog(e,m.db);
  expect(r).toMatchObject({claims:0,taskEnrollments:0,directSnapshotWrites:0,quarantinedUnknownWrite:1,readyAfterUnstartedLease:1,providerCalls:0,unknownWriteAutomaticallyRetried:false});
  expect(m.queries.length).toBe(2);expect(m.queries[1].args).toEqual([64]);
  for(const delta of [{P5_CD_GH_PRE_ROSTER_SHA256:hash},{P5_CD_GH_PRE_STOP:"1"},
   {V39_PHASE6_PROCESS_ARMED:"0"},{V39_P5_RELEASE_SHA256:"c".repeat(64)},
   {P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:"invalid"},{P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"0"},
   {RAPIDAPI_KEY:"CI_FORBIDDEN"},{P5_CD_GH_PRIVATE_CURRENT_APPROVED:"1"}]){
   const bad=mockDb();await expect(runP5CdGithubLeaseWatchdog({...e,...delta},bad.db)).rejects.toThrow();
   expect(bad.queries.length).toBe(0);
  }
 });
 it("requires V0092 and PRE grant, denies old broad claim and direct queue DML",async()=>{
  for(const delta of [
   {v0092:false},{can_reap:false},{old_claim:true},{direct_update:true},
   {role:"phase5_runtime_application_login"},
   {db:"wrongdb"}
  ]){
   const m=mockDb({...granted(),...delta});
   await expect(runP5CdGithubLeaseWatchdog(
    released(),m.db)).rejects.toThrow(
     "V0092_OR_RESTRICTED_QUEUE_REAPER_NOT_COMMISSIONED");
   expect(m.queries.length).toBe(1);
   expect(m.writes).toBe(0);
  }
 });
 it("reuses exactly one bounded existing reaper, no claims or new flight writer",async()=>{
  const m=mockDb(granted(),[]);
  const r=await runP5CdGithubLeaseWatchdog(released(),m.db);
  expect(r.status).toBe("EMPTY_OR_SAFE_RECOVERY");
  expect(r.inspectedAndMoved).toBe(0);
  expect(r.claims).toBe(0);
  expect(r.directSnapshotWrites).toBe(0);
  expect(r.taskEnrollments).toBe(0);
  expect(r.providerCalls).toBe(0);
  expect(m.queries.length).toBe(2);
  expect(m.queries[1]?.sql).toContain("phase5_cd_reap_once_v39");
  expect(m.queries[1]?.args).toEqual([64]);
  expect(m.queries.every(q=>!q.sql.includes("INSERT INTO")&&
    !q.sql.startsWith("SELECT * FROM clean.phase5_cd_claim_signed_roster_v39("))).toBe(true);
 });
 it("counts missed and recovered leases; UNKNOWN is quarantined NOT auto-retried",async()=>{
  const m=mockDb(granted(),["READY","MISSED","QUARANTINED"]);
  const r=await runP5CdGithubLeaseWatchdog(released(),m.db);
  expect(r.status).toBe("UNKNOWN_WRITE_QUARANTINED_NO_AUTORETRY");
  expect(r.inspectedAndMoved).toBe(3);
  expect(r.readyAfterUnstartedLease).toBe(1);
  expect(r.missedDeadlineOrExpiredSource).toBe(1);
  expect(r.quarantinedUnknownWrite).toBe(1);
  expect(r.unknownWriteAutomaticallyRetried).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
  expect(m.writes).toBe(1);
 });
 it("refuses invalid reaper states, never fabricates an ACK",async()=>{
  const m=mockDb(granted(),["VERIFIED_ON_TIME"]);
  await expect(runP5CdGithubLeaseWatchdog(
   released(),m.db)).rejects.toThrow("REAPER_STATE_UNEXPECTED");
  expect(m.writes).toBe(1);
 });
 it("manual dispatch still needs exact confirmation and separate approval",()=>{
  expect(requireP5CdLeaseWatchdogRelease({
   ...released(),GITHUB_EVENT_NAME:"workflow_dispatch"
  }).releaseMode).toBe("PHASE5_CANARY");
  expect(()=>requireP5CdLeaseWatchdogRelease({
   ...released(),P5_CD_GH_WATCHDOG_CONFIRM:"wrong"
  })).toThrow("NOT_SEPARATELY_ENABLED_OR_CONFIRMED");
 });
});
