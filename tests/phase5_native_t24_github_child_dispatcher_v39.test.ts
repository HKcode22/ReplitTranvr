import {describe,it,expect} from "vitest";
import {planP5T24WitnessedChild}
 from "../server/lib/disruption/phase5T24GithubChildDispatchDecision_v39";
import {admitP5T24GithubDispatcher,runP5T24GithubChildDispatcher}
 from "../scripts/v39_phase5_t24_github_child_dispatcher_v39";
import type {P5T24ActualSourceHandoffDecision}
 from "../server/lib/disruption/phase5T24OriginalBoundReadonlyHandoff_v39";

const path="data-collection/phase5/frozen/native_t24_future01.json";
const sha="a".repeat(64),code="f".repeat(40);
const utc="2027-03-01T10:00:00.000Z";
const cutoff="2027-03-01T11:00:00.000Z";
function fixture(){
 const ready={
  schema:"v39.phase5.native-t24-bound-original-db-readonly-handoff.v1",
  status:"SIGNED_T24_READY_FOR_DISTINCT_WITNESS_CHILD_NO_DISPATCH",
  reviewedFrozenPacketSha256:sha,
  manifestSha256:"b".repeat(64),queryDigestSha256:"c".repeat(64),
  runDayIndex:1,flightInstanceId:"leg:ci:100",
  sourcePopulationQueryId:"a23e4567-e89b-42d3-a456-426614174000",
  selectedNativeScheduledT:"2027-03-02T11:00:00.000Z",
  selectedT24CutoffUtc:cutoff,observedDbClockUtc:utc,
  originalRowCount:1,memberRowCount:1,
  existingT24Snapshots:0,existingT24Witnesses:0,
  providerCalls:0,productionDatabaseWrites:0,githubChildDispatches:0,
  nativePhysicalLegCertifiedByThisReadback:false,
  legalSourceRightsCertifiedByThisReadback:false,
  phase5ScientificFreezeCertifiedHere:false,phase6PaidGoGrantedHere:false
 } as P5T24ActualSourceHandoffDecision;
 const env:NodeJS.ProcessEnv={
  GITHUB_ACTIONS:"true",
  GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_EVENT_NAME:"schedule",GITHUB_REF:"refs/heads/main",
  GITHUB_RUN_ATTEMPT:"1",
  GITHUB_SHA:code,V39_P5_T24_APPROVED_CODE_SHA:code,
  P5_T24_AUTO_DISPATCH_ENABLED:"true",
  P5_T24_SOURCE_READONLY_ENABLED:"true",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",
  V39_P5_SOURCE_DATABASE_URL:"",
  P5_V39_T24_WITNESS_DATABASE_URL:"",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  V39_P5_T24_OWNER_APPROVED:"1",
  P5_T24_READONLY_SIGNED_PACKET_FILE:path,
  V39_P5_T24_SIGNED_PACKET_SHA256:sha,
  GITHUB_TOKEN:"gh_mock_token_for_ci_no_network_123456"
 };
 return{ready,env,history:{total_count:0,workflow_runs:[]}};
}
const plan=(f:ReturnType<typeof fixture>)=>
 planP5T24WitnessedChild(f.ready,f.history,path,sha);

describe("real GH native T24 witness child default-OFF, zero-provider admission",()=>{
 it("plans exactly one signed native source-bound T24 candidate, not SQL writes",()=>{
  const f=fixture(),x=plan(f);
  expect(x.shouldDispatch).toBe(true);
  expect(x.status).toBe("SIGNED_T24_GH_CHILD_CAN_BE_REQUESTED");
  expect(x.providerCalls).toBe(0);
  expect(x.databaseWrites).toBe(0);
 });
 it("rejects missing independent GO, GH token, wrong SHA and PR branch",()=>{
  const f=fixture();expect(admitP5T24GithubDispatcher(f.env).path).toBe(path);
  for(const [name,value] of [
   ["P5_T24_AUTO_DISPATCH_ENABLED","false"],
   ["P5_T24_SOURCE_READONLY_ENABLED","false"],
   ["V39_PHASE5_FREEZE_SIGNED","0"],
   ["V39_PHASE5_SOURCE_RIGHTS_APPROVED","0"],
   ["V39_PHASE6_PROCESS_ARMED","0"],
   ["V39_P5_T24_OWNER_APPROVED","0"],
   ["GITHUB_RUN_ATTEMPT","2"],
   ["GITHUB_EVENT_NAME","pull_request"],
   ["GITHUB_REF","refs/heads/feature"],
   ["GITHUB_SHA","0".repeat(40)],
   ["GITHUB_TOKEN",""],
   ["AERODATABOX_API_KEY","not-allowed"]
  ])expect(()=>admitP5T24GithubDispatcher({...f.env,[name]:value}))
     .toThrow("GITHUB_MAIN_T24_RIGHTS_GO_OR_SIGNATURE_NOT_APPROVED");
 });
 it("blocks changed SHA, wrong original, too late, and a witnessed or uncertain PRE",()=>{
  const f=fixture();(f.ready as any).reviewedFrozenPacketSha256="b".repeat(64);
  expect(()=>plan(f)).toThrow("UNVERIFIED_BOUND_SOURCE_OR_SIGNED_PACKET");
  const g=fixture();(g.ready as any).existingT24Snapshots=1;
  expect(()=>plan(g)).toThrow("NO_REAL_DUE_SOURCE_OR_ALREADY_COMMITTED");
  const h=fixture();(h.ready as any).originalRowCount=0;
  expect(()=>plan(h)).toThrow("NO_REAL_DUE_SOURCE_OR_ALREADY_COMMITTED");
  const i=fixture();(i.ready as any).observedDbClockUtc="2027-03-01T10:59:00.000Z";
  expect(()=>plan(i)).toThrow("NO_REAL_DUE_SOURCE_OR_ALREADY_COMMITTED");
 });
 it("honestly skips missed/expired/incomplete-witness or already witnessed source",()=>{
  for(const status of [
   "SIGNED_T24_SOURCE_ORIGINAL_NOT_YET_BOUND",
   "SIGNED_T24_SOURCE_INVALID_OR_EXPIRED_HOLD",
   "SIGNED_T24_CUTOFF_TOO_CLOSE_FOR_SCHEDULED_DISPATCH",
   "SIGNED_T24_CUTOFF_MISSED_CENSOR_NO_BACKFILL",
   "SIGNED_T24_PRE_EXISTS_WITNESS_UNCERTAIN_NO_REPLAY",
   "SIGNED_T24_ALREADY_COMMITTED_AND_WITNESSED_NO_REDISPATCH"
  ]){
   const f=fixture();(f.ready as any).status=status;
   expect(plan(f).shouldDispatch).toBe(false);
  }
 });
 it("skips existing completed, queued, failed and running same frozen packet",()=>{
  for(const status of ["queued","in_progress","completed"]){
   const f=fixture();
   f.history.workflow_runs.push({
    id:12345,display_title:"P5 T24 "+path,status,
    conclusion:status==="completed"?"failure":null,
    created_at:"2027-03-01T09:45:00.000Z"
   } as never);
   f.history.total_count=1;
   expect(plan(f).shouldDispatch).toBe(false);
   expect(plan(f).status).toBe("EXISTING_T24_GH_CHILD_NO_REPLAY");
  }
 });
 it("refuses truncated history, malformed run or unidentifiable old manual T24 run",()=>{
  const a=fixture();a.history.total_count=101;
  expect(()=>plan(a)).toThrow("UNBOUNDED_OR_INCOMPLETE_GH_CHILD_HISTORY");
  const b=fixture();b.history.total_count=1;
  b.history.workflow_runs=[{
   id:12,display_title:"Phase5 native T24 PRE old manual",
   status:"completed",conclusion:"success",
   created_at:"2027-03-01T09:40:00.000Z"
  } as never];
  expect(()=>plan(b)).toThrow("UNKNOWN_PRIOR_MANUAL_T24_RUN_CANNOT_RULE_OUT_REPLAY");
 });
 it("makes one GH POST after GET history; 204 means request ACK, never PRE COMMIT",async()=>{
  const f=fixture(),seen:{method:string;url:string;body?:string}[]=[];
  const fake=async(url:unknown,opts?:RequestInit)=>{
   const method=String(opts?.method);
   seen.push({method,url:String(url),body:opts?.body?.toString()});
   return method==="GET"?
    {ok:true,status:200,json:async()=>f.history} as Response:
    {ok:true,status:204} as Response;
  };
  const result=await runP5T24GithubChildDispatcher(
   f.env,fake as typeof fetch,async()=>f.ready as any);
  expect(result.acknowledgedGithubChild).toBe(true);
  expect(result.preWitnessCommitsCertifiedByParent).toBe(false);
  expect(seen.map(x=>x.method)).toEqual(["GET","POST"]);
  expect(JSON.parse(seen[1].body!)).toMatchObject({
   ref:"main",inputs:{frozen_native_t24_packet:path,
    confirm:"ONE_SIGNED_NATIVE_T24_PRE_AND_WITNESS_NO_PROVIDER"}
  });
  expect(seen[1].url).toContain("/dispatches");
 });
 it("holds ambiguous GH POST and never retries; no GitHub call for nonready source",async()=>{
  const f=fixture();let attempts=0;
  const fake=async(_:unknown,opts?:RequestInit)=>{
   attempts++;
   return opts?.method==="GET"?
    {ok:true,status:200,json:async()=>f.history} as Response:
    {ok:false,status:502} as Response;
  };
  await expect(runP5T24GithubChildDispatcher(
   f.env,fake as typeof fetch,async()=>f.ready as any))
   .rejects.toThrow("AMBIGUOUS_GITHUB_T24_WORKFLOW_POST_NO_BLIND_RETRY");
  expect(attempts).toBe(2);
  const g=fixture();(g.ready as any).status="SIGNED_T24_PRE_EXISTS_WITNESS_UNCERTAIN_NO_REPLAY";
  const noCalls=async()=>{throw Error("GH network must not be called");};
  const no=await runP5T24GithubChildDispatcher(
   g.env,noCalls as typeof fetch,async()=>g.ready as any);
  expect(no.acknowledgedGithubChild).toBe(false);
 });
});
