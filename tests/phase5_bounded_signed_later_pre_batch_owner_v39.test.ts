import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {planP5BoundedSignedLaterPreBatch}
 from "../server/lib/disruption/phase5BoundedSignedLaterPreBatchPlan_v39";
import {admitP5BoundLaterBatchOwnerEnv,
 verifyP5BatchNoPriorGithubAttempt,
 executeP5BoundedLaterBatchNoRetry,
 type P5BoundedBatchReadyEntry,type P5BoundLaterBatchEvent}
 from "../scripts/v39_phase5_bounded_signed_later_pre_batch_owner_v39";
import type {P5VerifiedLaterPreRegistryEntry}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedWitnessedLaterPrePacket}
 from "../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";
const H=(x:string)=>x.repeat(64);
const CODE="e".repeat(40);
const P="data-collection/phase5/frozen/";
const DB="2027-02-10T05:00:00.000Z";
const native="2027-02-10T12:00:00.000Z";
function entry(i:number,offsetMinutes=0):P5VerifiedLaterPreRegistryEntry{
 const path=P+"native_later_"+String(i).padStart(4,"0")+".json";
 const selected=new Date(Date.parse(native)+offsetMinutes*60000).toISOString();
 const bytes=Buffer.from(JSON.stringify({
  dummyPayload:"valid SHA-bound immutable flight PRE".repeat(10)
 }));
 const packet={
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:CODE,independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:{
   manifestSha256:H("a"),queryDigestSha256:H("b"),
   flightInstanceId:"leg:future:"+i,horizon:"T-6h",
   selectedTNativeUtc:selected
  }
 } as unknown as P5SignedWitnessedLaterPrePacket;
 return{
  filePath:path,packetSha256:createHash("sha256").update(bytes).digest("hex"),
  queryDigestSha256:H("b"),flightInstanceId:"leg:future:"+i,
  selectedTNativeUtc:selected,horizon:"T-6h",bytes,packet
 };
}
function env():NodeJS.ProcessEnv{
 return {
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:CODE,
  GITHUB_RUN_ID:"42899999999",
  GITHUB_TOKEN:"fake_token_for_testing_abcdefghijklmnop",
  V39_P5_LATER_PRE_APPROVED_CODE_SHA:CODE,
  P5_LATER_PRE_CONFIRM:"ONE_SIGNED_WITNESSED_T6_OR_T90_PRE_NO_PROVIDER",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  AERODATABOX_WEBHOOK_SECRET:"",
  V39_P5_LATER_PRE_OWNER_APPROVED:"1",
  V39_P5_LATER_PRE_DAY_REGISTRY_OWNER_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  V39_P5_MANIFEST_SHA256:H("1"),V39_P5_RELEASE_SHA256:H("2"),
  V39_P5_RIGHTS_SHA256:H("3"),
  V39_P5_LATER_PRE_DAY_REGISTRY_SHA256:H("4"),
  V39_P5_SOURCE_BATCH_REGISTRY_SHA256:H("5"),
  P5_LATER_PRE_DAY_INDEX:"4",
  V39_P5_BOUND_LATER_PRE_BATCH_OWNER_APPROVED:"1",
  P5_BOUND_LATER_PRE_BATCH_NONCE_SHA256:H("e"),
  V39_P5_BOUND_LATER_PRE_BATCH_APPROVED_NONCE_SHA256:H("e"),
  P5_BOUND_LATER_PRE_BATCH_CONFIRM:
    "ONE_SIGNED_BOUND_EIGHT_FLIGHT_PRE_BATCH_NO_PROVIDER",
  P5_BOUND_LATER_PRE_BATCH_REGISTRY_FILE:
    P+"later_registry_day04.json",
  P5_BOUND_LATER_PRE_BATCH_PACKET_PATHS_JSON:
    JSON.stringify([entry(1).filePath,entry(2).filePath]),
  P5_LATER_PRE_AUTO_DISPATCH_ENABLED:"false",
  P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED:"false",
  P5_V39_PRE_DATABASE_URL:
    "postgresql://phase5_p30_pre_login_20261107:pw@localhost/neondb"
 };
}
const prepared=(e:P5VerifiedLaterPreRegistryEntry):P5BoundedBatchReadyEntry=>({
 filePath:e.filePath,packetSha256:e.packetSha256,
 packetBytes:e.bytes,packet:e.packet,delegatedEnv:env()
});
const goodResult=(e:P5VerifiedLaterPreRegistryEntry)=>({
 schema:"v39.phase5.github-one-witnessed-later-pre.v1",
 status:"LATER_PRE_COMMITTED_WITH_EXISTING_T24_WITNESS_NOT_SCIENTIFIC_GO",
 packetSha256:e.packetSha256,
 runDayIndex:4,horizon:e.horizon,
 committedSnapshotId:"1001",
 postCommitDbClockAtUtc:"2027-02-10T05:57:05.000Z",
 providerCalls:0,alertCreates:0,t24WitnessVerified:true,
 t24MissingExplicitlyRecorded:false,noBackfill:true,
 phase5FreezeGrantedHere:false,phase6PaidGoGrantedHere:false
} as const);
describe("bounded Stage14 signed future multi-flight PRE owner",()=>{
 it("plans 8 distinct native flights in one 2m cutoff band and never claims PRE committed",()=>{
  const x=planP5BoundedSignedLaterPreBatch(
   Array.from({length:8},(_,i)=>entry(i,i%2)),DB);
  expect(x.count).toBe(8);
  expect(x.spreadMilliseconds).toBe(60000);
  expect(x.productionPreSnapshotsCommitted).toBe(0);
  expect(x.providerCalls).toBe(0);
  expect(x.phase6PaidGoGrantedHere).toBe(false);
 });
 it("rejects ninth flight, late owner dispatch, distant deadlines and duplicate per-flight horizon",()=>{
  expect(()=>planP5BoundedSignedLaterPreBatch(
   Array.from({length:9},(_,i)=>entry(i)),DB))
   .toThrow("BATCH_SIZE_NOT_INDEPENDENTLY_BOUNDED");
  expect(()=>planP5BoundedSignedLaterPreBatch(
   [entry(1)],"2027-02-10T05:50:00.000Z"))
   .toThrow("FLIGHT_NOT_WITHIN_PROSPECTIVE_SIGNED_BATCH_WORK_WINDOW");
  expect(()=>planP5BoundedSignedLaterPreBatch(
   [entry(1),entry(2,3)],DB))
   .toThrow("TOO_MANY_DIFFERENT_DEADLINES_FOR_ONE_BATCH_JOB");
  expect(()=>planP5BoundedSignedLaterPreBatch(
   [entry(1),{...entry(2),flightInstanceId:"leg:future:1"}],DB))
   .toThrow("UNAUTHENTICATED_OR_DUPLICATE_SIGNED_FLIGHT_HORIZON");
 });
 it("requires one current GH run matching independent nonce; prior failed or unknown attempts HOLD",()=>{
  const nonce=H("e"),title="P5 LATER SIGNED BATCH "+nonce;
  const current={id:42899999999,display_title:title};
  expect(verifyP5BatchNoPriorGithubAttempt(
   [current],"42899999999",nonce).independentlyScopedOneAttempt)
   .toBe(true);
  expect(()=>verifyP5BatchNoPriorGithubAttempt(
   [current,{id:42899999998,display_title:title}],
   "42899999999",nonce))
   .toThrow("PREVIOUS_ATTEMPT_OF_BATCH_NONCE_NO_RETRY");
  // A prior matching nonce is stronger evidence of replay than the
  // missing current run. Both are holds, never a license to retry.
  expect(()=>verifyP5BatchNoPriorGithubAttempt(
   [{id:42899999998,display_title:title}],
   "42899999999",nonce))
   .toThrow("PREVIOUS_ATTEMPT_OF_BATCH_NONCE_NO_RETRY");
  expect(()=>verifyP5BatchNoPriorGithubAttempt(
   [{id:42899999998,display_title:"P5 LATER SIGNED BATCH "+H("a")}],
   "42899999999",nonce))
   .toThrow("CURRENT_GITHUB_BATCH_RUN_NOT_OBSERVED_NO_WRITE");
  expect(()=>verifyP5BatchNoPriorGithubAttempt(
   [current,current],"42899999999",nonce))
   .toThrow("MALFORMED_OR_REPEATED_GITHUB_BATCH_RUN");
  expect(()=>verifyP5BatchNoPriorGithubAttempt(
   [{...current,display_title:"unknown legacy name"}],
   "42899999999",nonce))
   .toThrow("CURRENT_BATCH_RUN_NAME_NOT_INDEPENDENTLY_PINNED");
 });
 it("retains earliest own PRE cutoff then path order",()=>{
  const a=entry(9,1),b=entry(2),c=entry(4,1);
  const p=planP5BoundedSignedLaterPreBatch([a,c,b],DB);
  expect(p.ordered.map(x=>x.entry.filePath)).toEqual([
   b.filePath,c.filePath,a.filePath
  ]);
 });
 it("requires separately signed manual main + source rights, freeze and paid GO",()=>{
  const p=admitP5BoundLaterBatchOwnerEnv(env());
  expect(p.selectedPaths).toHaveLength(2);
  expect(p.runDayIndex).toBe(4);
  for(const change of [
   {GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {P5_BOUND_LATER_PRE_BATCH_NONCE_SHA256:H("f")},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {V39_PHASE5_FREEZE_SIGNED:"0"},
   {V39_PHASE6_PROCESS_ARMED:"0"},
   {V39_P5_BOUND_LATER_PRE_BATCH_OWNER_APPROVED:"0"},
   {P5_LATER_PRE_AUTO_DISPATCH_ENABLED:"true"},
   {P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED:"true"},
   {AERODATABOX_API_KEY:"forbidden"},
   {P5_V39_OTHER_REST_REVIEW_DATABASE_URL:"cross-role"}
  ])expect(()=>admitP5BoundLaterBatchOwnerEnv({...env(),...change}))
    .toThrow();
  expect(()=>admitP5BoundLaterBatchOwnerEnv({...env(),
   P5_BOUND_LATER_PRE_BATCH_PACKET_PATHS_JSON:JSON.stringify([
    entry(1).filePath,entry(1).filePath])}))
   .toThrow("BATCH_SELECTION_DUPLICATE_UNBOUNDED_OR_UNREVIEWED");
  expect(()=>admitP5BoundLaterBatchOwnerEnv({...env(),
   P5_V39_PRE_DATABASE_URL:"postgresql://app:pw@localhost/neondb"}))
   .toThrow("CROSS_ROLE_OR_APPLICATION_DATABASE_LOGIN");
 });
 it("executes independently reviewed existing Stage14 owner once per flight and emits receipts",async()=>{
  const e1=entry(1),e2=entry(2);
  const planned=planP5BoundedSignedLaterPreBatch([e2,e1],DB);
  const events:P5BoundLaterBatchEvent[]=[];
  const run=vi.fn(async(
   _env:NodeJS.ProcessEnv,_bytes:Buffer,_packet:P5SignedWitnessedLaterPrePacket,
   path:string)=>{
    const e=path===e1.filePath?e1:e2;
    return goodResult(e);
  });
  const r=await executeP5BoundedLaterBatchNoRetry(
   planned,[prepared(e1),prepared(e2)],
   run as unknown as Parameters<typeof executeP5BoundedLaterBatchNoRetry>[2],
   event=>events.push(event));
  expect(r.committedSnapshotCount).toBe(2);
  expect(run).toHaveBeenCalledTimes(2);
  expect(events.map(e=>e.kind)).toEqual([
   "ATTEMPT_STARTED","POSTCOMMIT_PRE_VERIFIED",
   "ATTEMPT_STARTED","POSTCOMMIT_PRE_VERIFIED"
  ]);
  expect(r.commits.map(x=>x.packetSha256)).toEqual([
   e1.packetSha256,e2.packetSha256
  ]);
 });
 it("quarantines uncertain failed/unknown COMMIT and NEVER attempts following flights",async()=>{
  const es=[entry(1),entry(2),entry(3)];
  const plan=planP5BoundedSignedLaterPreBatch(es,DB);
  const events:P5BoundLaterBatchEvent[]=[];
  const run=vi.fn(async(
   _env:NodeJS.ProcessEnv,_bytes:Buffer,
   _packet:P5SignedWitnessedLaterPrePacket,path:string)=>{
    if(path===es[1].filePath)throw Error("socket reset AFTER possible PG COMMIT");
    return goodResult(es[0]);
  });
  await expect(executeP5BoundedLaterBatchNoRetry(
   plan,es.map(prepared),
   run as unknown as Parameters<typeof executeP5BoundedLaterBatchNoRetry>[2],
   e=>events.push(e)))
   .rejects.toThrow("UNKNOWN_COMMIT_QUARANTINE_READONLY_RECONCILE_NO_RETRY");
  expect(run).toHaveBeenCalledTimes(2);
  expect(events.map(x=>x.kind)).toEqual([
   "ATTEMPT_STARTED","POSTCOMMIT_PRE_VERIFIED",
   "ATTEMPT_STARTED","UNKNOWN_COMMIT_OR_WRITE_FAILURE_QUARANTINE"
  ]);
  expect(events[1].packetSha256).toBe(es[0].packetSha256);
  expect(events[3].packetSha256).toBe(es[1].packetSha256);
 });
});
