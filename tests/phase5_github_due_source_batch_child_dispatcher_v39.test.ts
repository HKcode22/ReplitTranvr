import {describe,it,expect} from "vitest";
import {admitP5GitHubDueChildDispatcher,
 selectP5DueSignedSourceChildIntents,bindP5ExactChildIntentFiles}
 from "../scripts/v39_phase5_github_due_source_batch_child_dispatcher_v39";
import type {P5SourceBatchResult}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
const h=(s:string)=>s.repeat(64);
const t=Date.parse("2027-02-01T10:00:00.000Z");
const iso=(delta:number)=>new Date(t+delta*60000).toISOString();
const registry="data-collection/phase5/frozen/future_day01_registry.json";
const file0="data-collection/phase5/frozen/future_day01_wsss.json";
const file1="data-collection/phase5/frozen/future_day01_yssy.json";
function fixture(){
 const due=(ch:string,icao:string,offset=60)=>({
  schema:"v39.phase5.one-signed-unattended-due-queue-handoff.v1",
  status:"SIGNED_QUERY_DUE_FOR_INDEPENDENT_RELEASE_NO_DISPATCH",
  queryDigestSha256:h(ch),runDayIndex:1,airportIcao:icao,
  plannedDispatchUtc:iso(offset)
 });
 const batch={
  schema:"v39.phase5.signed-per-day-source-batch-actual-db-handoff.v1",
  status:"BOUND_SIGNED_DAY_SOURCE_BATCH_REVIEWED_NO_DISPATCH",
  observedDbClockUtc:iso(0),runDayIndex:1,
  inspectedQueryCount:2,dbMissingHoldCount:0,
  githubChildDispatchCount:0,databaseWrites:0,providerCalls:0,
  paidPhase6GoGranted:false,handoffs:[due("e","WSSS"),due("f","YSSY")]
 } as unknown as P5SourceBatchResult;
 const entries=[
  {filePath:file0,expectedQueryDigestSha256:h("e")},
  {filePath:file1,expectedQueryDigestSha256:h("f")}
 ];
 const recent={total_count:0,workflow_runs:[]};
 return{batch,entries,recent};
}
const expectedEnv:NodeJS.ProcessEnv={
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"f".repeat(40),
 V39_P5_QUEUE_APPROVED_CODE_SHA:"f".repeat(40),
 V39_P5_APPROVED_CODE_SHA:"f".repeat(40),
 ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
 DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",
 P5_AUTO_SOURCE_DISPATCH_ENABLED:"true",
 P5_SOURCE_QUEUE_OBSERVER_ENABLED:"true",
 P5_SOURCE_BATCH_REGISTRY_OBSERVER_ENABLED:"true",
 P5_SOURCE_SIGNED_PACKET_OBSERVER_ENABLED:"false",
 V39_P5_SOURCE_QUEUE_OWNER_APPROVED:"1",
 V39_P5_AUTO_SOURCE_DISPATCH_APPROVED:"1",
 V39_P5_SIGNED_DAY_REGISTRY_RELEASE:"1",
 V39_PHASE5_FREEZE_SIGNED:"1",
 V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 V39_PHASE6_PROCESS_ARMED:"1",
 V39_P5_SOURCE_DB_ROLE_REVIEWED:"1",
 V39_P5_SEVEN_REST_BUDGET_SIGNED:"1",
 V39_P5_REST_UNIT_PRICE_APPROVED:"2",
 V39_P5_SOURCE_BATCH_REGISTRY_SHA256:h("a"),
 V39_P5_MANIFEST_SHA256:h("b"),
 V39_P5_RELEASE_SHA256:h("c"),
 V39_P5_RIGHTS_SHA256:h("d"),
 V39_P5_PROVIDER_CONTRACT_SHA256:h("e"),
 P5_SOURCE_BATCH_REGISTRY_FILE:registry,
 P5_SOURCE_BATCH_RUN_DAY_INDEX:"1",
 GITHUB_TOKEN:"github_only_synthetic_token_1234"
};
describe("Phase5 GitHub per-day paid-source child dispatcher admission and offline planning",()=>{
 it("requires exact approved main SHA, genuine future GO and dedicated source budget/rights",()=>{
  const x=admitP5GitHubDueChildDispatcher(expectedEnv);
  expect(x.day).toBe(1);expect(x.registryFilePath).toBe(registry);
  for(const [key,value] of [
   ["V39_PHASE6_PROCESS_ARMED","0"],
   ["V39_PHASE5_SOURCE_RIGHTS_APPROVED","0"],
   ["V39_P5_SEVEN_REST_BUDGET_SIGNED","0"],
   ["V39_P5_AUTO_SOURCE_DISPATCH_APPROVED","0"],
   ["GITHUB_EVENT_NAME","pull_request"],
   ["GITHUB_REF","refs/heads/dev"],
   ["GITHUB_SHA","a".repeat(40)],
   ["P5_AUTO_SOURCE_DISPATCH_ENABLED","false"],
   ["P5_SOURCE_BATCH_REGISTRY_OBSERVER_ENABLED","false"],
   ["AERODATABOX_API_KEY","not_allowed"],
   ["GITHUB_TOKEN",""]
  ]){
   expect(()=>admitP5GitHubDueChildDispatcher({
    ...expectedEnv,[key]:value
   })).toThrow("UNSIGNED_GITHUB_PARENT_SOURCE_GO_OR_REGISTRY");
  }
 });
 it("emits two real due GH child intents, without GH POST/provider/SQL itself",()=>{
  const f=fixture();const plan=selectP5DueSignedSourceChildIntents(
   f.batch,f.recent,registry);
  expect(plan.eligibleCount).toBe(2);
  expect(plan.githubChildDispatchedByPurePlanner).toBe(0);
  expect(plan.providerCalls).toBe(0);
  const bound=bindP5ExactChildIntentFiles(plan,f.batch,f.entries);
  expect(bound.map(x=>x.frozenPacketPath)).toEqual([file0,file1]);
  expect(bound.map(x=>x.queryDigestSha256)).toEqual([h("e"),h("f")]);
 });
 it("recognizes a matching already queued child from exact GitHub run-name, suppresses new dispatch",()=>{
  const f=fixture();
  f.recent={
   total_count:1,
   workflow_runs:[{
    display_title:"P5 SOURCE "+h("e"),id:123456,
    status:"queued",conclusion:null,created_at:iso(-5)
   }]
  };
  const p=selectP5DueSignedSourceChildIntents(
   f.batch,f.recent,registry);
  expect(p.alreadyGitHubDispatched).toBe(1);
  expect(p.selectedForIndependentReleaseCount).toBe(1);
  expect(p.intents[0].queryDigestSha256).toBe(h("f"));
 });
 it("never reruns already prearmed, stopped or missed source queries",()=>{
  const f=fixture();
  const variants=[
   "SIGNED_QUERY_ALREADY_PREARMED_OR_RESERVED_NO_REDISPATCH",
   "SIGNED_QUERY_STOPPED_NO_DISPATCH",
   "SIGNED_QUERY_MISSED_OR_TOO_LATE_CENSOR",
   "SIGNED_QUERY_NOT_YET_IN_DB_QUEUE_LOOKAHEAD"
  ];
  for(const status of variants){
   (f.batch.handoffs[0] as any).status=status;
   const p=selectP5DueSignedSourceChildIntents(
    f.batch,f.recent,registry);
   expect(p.intents.map(x=>x.queryDigestSha256)).toEqual([h("f")]);
  }
 });
 it("blocks unexpected missing DB query, incomplete GH history, out-of-window or changed review",()=>{
  const a=fixture();(a.batch as any).dbMissingHoldCount=1;
  expect(()=>selectP5DueSignedSourceChildIntents(
   a.batch,a.recent,registry)).toThrow(
   "UNVERIFIED_BATCH_OR_UNEXPECTED_DB_MISSING");
  const b=fixture();(b.recent as any).total_count=101;
  expect(()=>selectP5DueSignedSourceChildIntents(
   b.batch,b.recent,registry)).toThrow(
   "UNBOUNDED_OR_INCOMPLETE_GITHUB_RUN_HISTORY");
  const c=fixture();(c.batch.handoffs[0] as any).plannedDispatchUtc=iso(4);
  expect(()=>selectP5DueSignedSourceChildIntents(
   c.batch,c.recent,registry)).toThrow(
   "UNSAFE_LEAD_TIME_TO_SOURCE_CUTOFF");
  const d=fixture();(d.batch.handoffs[0] as any).runDayIndex=2;
  expect(()=>selectP5DueSignedSourceChildIntents(
   d.batch,d.recent,registry)).toThrow(
   "DUPLICATED_OR_MIXED_DAY_DB_HANDOFF");
 });
 it("will not route a source digest to an absent, duplicated or changed local frozen file",()=>{
  const f=fixture();const p=selectP5DueSignedSourceChildIntents(
   f.batch,f.recent,registry);
  expect(()=>bindP5ExactChildIntentFiles(
   p,f.batch,[f.entries[0],f.entries[0]]
  )).toThrow("DUPLICATE_OR_MALFORMED_SIGNED_SOURCE_REGISTRY");
  expect(()=>bindP5ExactChildIntentFiles(
   p,f.batch,[f.entries[0]]
  )).toThrow("REGISTRY_ENTRY_COUNT_MISMATCH");
  expect(()=>bindP5ExactChildIntentFiles(
   p,f.batch,[f.entries[0],{
    ...f.entries[1],filePath:"../../wrong.json"
   }]
  )).toThrow("DUPLICATE_OR_MALFORMED_SIGNED_SOURCE_REGISTRY");
 });
 it("treats malformed GitHub run-name identities as HOLD, never arbitrary first page",()=>{
  const f=fixture();
  f.recent={
   total_count:1,workflow_runs:[{
    display_title:"P5 SOURCE invalid",
    status:"completed",conclusion:"success",id:12345,created_at:iso(-5)
   }]
  };
  expect(()=>selectP5DueSignedSourceChildIntents(
   f.batch,f.recent,registry)).toThrow("MALFORMED_GITHUB_CHILD_RUN_IDENTITY");
 });
});
