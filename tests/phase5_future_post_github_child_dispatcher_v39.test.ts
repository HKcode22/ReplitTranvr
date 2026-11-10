import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {admitP5FuturePostFrozenForReadOnly,planP5FuturePostOneChild}
 from "../server/lib/disruption/phase5FuturePostGithubReadonlyRelease_v39";
import {admitP5FuturePostGithubParent,runP5FuturePostGithubDispatcher}
 from "../scripts/v39_phase5_future_post_github_child_dispatcher_v39";
import type {P5SignedFuturePostPacket}
 from "../scripts/v39_phase5_one_signed_future_post_outcome_v0083_owner_v39";
import type {P5FuturePostActualPreReadback}
 from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";

const h=(x:string)=>x.repeat(64);
const path="data-collection/phase5/frozen/ci_future_post_0001.json";
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
function fixture(){
 const packet={
  schema:"v39.phase5.github-future-post-reviewed-release.v1",
  approvedCodeSha:"f".repeat(40),
  independentSourceContentsUseAndRESTReleaseAttested:true,
  reviewed:{
   schema:"v39.phase5.future-post-reviewed-outcome-one-get.v1",
   manifestSha256:h("a"),requestSha256:h("b"),
   reviewedSourceRightsSha256:h("c"),
   reviewedProviderPriceSha256:h("d"),
   reviewedCategoryBudgetSha256:h("e"),
   reviewedRequestContextSha256:h("1"),
   reviewedProviderContractSha256:h("2"),
   reviewedFrameSha256:h("3"),
   runDayIndex:1,slot:"HUB",airportIcao:"WSSS",
   flightInstanceId:"leg:ci:100",
   expectedSelectedTNativeUtc:"2027-03-01T09:00:00.000Z",
   plannedSourceFromUtc:"2027-03-01T08:00:00.000Z",
   plannedSourceToUtc:"2027-03-01T14:00:00.000Z",
   fromLocal:"2027-03-01T16:00",toLocal:"2027-03-01T22:00",
   airportIanaTimezone:"Asia/Singapore",
   postDispatchEarliestUtc:"2027-03-01T10:00:00.000Z",
   postDispatchHardLatestUtc:"2027-03-01T10:30:00.000Z",
   expectedApiUnitsPerGet:2,
   independentFuturePostRequestAndRightsReview:true
  }
 } as P5SignedFuturePostPacket;
 const bytes=Buffer.from(JSON.stringify(packet));
 const env:NodeJS.ProcessEnv={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"f".repeat(40),
  GITHUB_RUN_ID:"12345678901",
  V39_P5_POST_APPROVED_CODE_SHA:"f".repeat(40),
  P5_POST_AUTO_DISPATCH_ENABLED:"true",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",
  P5_V39_OTHER_REST_REVIEW_DATABASE_URL:"",
  P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"",
  V39_P5_POST_OWNER_APPROVED:"1",
  V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  P5_POST_FROZEN_PACKET_FILE:path,
  V39_P5_POST_SIGNED_PACKET_SHA256:hash(bytes),
  V39_P5_MANIFEST_SHA256:h("a"),
  V39_P5_RIGHTS_SHA256:h("c"),
  V39_P5_POST_CATEGORY_BUDGET_SHA256:h("e"),
  V39_P5_POST_PROVIDER_CONTRACT_SHA256:h("2"),
  V39_P5_POST_REVIEWED_REQUEST_SHA256:h("b"),
  V39_P5_POST_CONTEXT_SHA256:h("1"),
  V39_P5_FRAME_HASH:h("3"),
  V39_P5_POST_PRICE_SHA256:h("d"),
  V39_P5_SOURCE_DATABASE_URL:
   "postgresql://phase5_p5_source_login_20261108:ci-dummy@localhost:5432/neondb",
  GITHUB_TOKEN:"github_only_synthetic_action_token_123456"
 };
 const pre:P5FuturePostActualPreReadback={
  status:"ACTUAL_SAME_FLIGHT_SOURCE_BOUND_PRE_PARTIAL_ALLOWED",
  manifestSha256:h("a"),runDayIndex:1,flightInstanceId:"leg:ci:100",
  observedValidHorizonCount:1,observedValidHorizons:["T-6h"],
  missingPreHorizons:["T-24h","T-90m"],
  actualSourcePREReferenceIds:["123456"],
  observedFromIndependentRestrictedDb:true,
  providerCalls:0,databaseWrites:0
 };
 const history={total_count:0,workflow_runs:[]};
 const pins=admitP5FuturePostGithubParent(env).pins;
 const p=admitP5FuturePostFrozenForReadOnly(bytes,packet,pins);
 return{packet,bytes,env,p,pre,history,pins};
}
describe("Phase5 one signed future V0083 POST GH child, with 1/3 valid true PRE",()=>{
 it("admits reviewed immutable source POST without REST role keys or provider in parent",()=>{
  const f=fixture();
  expect(f.p.githubRunId).toBe("12345678901");
  expect(f.p.requestSha256).toBe(h("b"));
  expect(planP5FuturePostOneChild(
   f.p,f.pre,"2027-03-01T10:10:00.000Z",f.history,path).shouldDispatch)
   .toBe(true);
 });
 it("allows one truly observed PRE, never requires all T24/T6/T90",()=>{
  const f=fixture();
  const d=planP5FuturePostOneChild(
   f.p,f.pre,"2027-03-01T10:10:00.000Z",f.history,path);
  expect(d.observedPreCount).toBe(1);
  expect(d.missingPreCount).toBe(2);
  expect(d.providerCalls).toBe(0);
  expect(d.databaseWrites).toBe(0);
 });
 it("counts not-due, late/censored and due-needs-history without GH POST",()=>{
  const f=fixture();
  expect(planP5FuturePostOneChild(f.p,f.pre,
   "2027-03-01T09:40:00.000Z",null,path).status)
   .toBe("FUTURE_POST_NOT_YET_IN_REVIEWED_WINDOW");
  expect(planP5FuturePostOneChild(f.p,f.pre,
   "2027-03-01T10:29:00.000Z",null,path).status)
   .toBe("FUTURE_POST_MISSED_OR_TOO_CLOSE_NO_LATE_GET");
  expect(planP5FuturePostOneChild(f.p,f.pre,
   "2027-03-01T10:10:00.000Z",null,path).status)
   .toBe("POST_DUE_REQUIRES_GITHUB_HISTORY_CHECK");
 });
 it("refuses forged packet, changed rights, wrong manifest and missing real source PRE",()=>{
  const f=fixture();
  expect(()=>admitP5FuturePostFrozenForReadOnly(
   Buffer.concat([f.bytes,Buffer.from(" ")]),f.packet,f.pins))
   .toThrow("UNREVIEWED_FROZEN_POST_PACKET_OR_SHA");
  const g=fixture();g.pins.sourceRightsSha256=h("0");
  expect(()=>admitP5FuturePostFrozenForReadOnly(
   g.bytes,g.packet,g.pins)).toThrow("FROZEN_POST_RIGHTS_BUDGET_REQUEST_DRIFT");
  const a=fixture();a.pre.observedValidHorizonCount=0;
  expect(()=>planP5FuturePostOneChild(a.p,a.pre,
   "2027-03-01T10:10:00.000Z",a.history,path))
   .toThrow("NO_REAL_SIGNED_NATIVE_PRE_NOT_ALL_THREE_REQUIRED");
 });
 it("rejects missing separate GO, SOURCE rights, REST roles and wrong GitHub scope",()=>{
  const f=fixture();
  for(const [name,value] of [
   ["V39_PHASE6_PROCESS_ARMED","0"],
   ["V39_PHASE5_FREEZE_SIGNED","0"],
   ["V39_PHASE5_SOURCE_RIGHTS_APPROVED","0"],
   ["V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED","0"],
   ["V39_P5_POST_OWNER_APPROVED","0"],
   ["P5_POST_AUTO_DISPATCH_ENABLED","false"],
   ["GITHUB_EVENT_NAME","pull_request"],
   ["GITHUB_RUN_ATTEMPT","2"],
   ["GITHUB_REF","refs/heads/feature"],
   ["GITHUB_SHA","a".repeat(40)],
   ["GITHUB_TOKEN",""],
   ["AERODATABOX_API_KEY","present"]
  ])expect(()=>admitP5FuturePostGithubParent({...f.env,[name]:value}))
    .toThrow("UNSIGNED_GITHUB_POST_RELEASE_RIGHTS_OR_PHYSICAL_BUDGET");
 });
 it("refuses replay after any prior GH attempt, even failed; no unknown manual",()=>{
  for(const status of ["queued","in_progress","completed"]){
   const f=fixture();
   f.history.total_count=1;
   f.history.workflow_runs=[{
    id:101,display_title:"P5 POST "+path,status,
    conclusion:status==="completed"?"failure":null,
    created_at:"2027-03-01T10:01:00.000Z"
   } as never];
   const d=planP5FuturePostOneChild(f.p,f.pre,
    "2027-03-01T10:10:00.000Z",f.history,path);
   expect(d.shouldDispatch).toBe(false);
   expect(d.status).toBe("PREVIOUS_SIGNED_POST_ATTEMPT_NO_PAID_RETRY");
  }
  const g=fixture();g.history.total_count=101;
  expect(()=>planP5FuturePostOneChild(g.p,g.pre,
   "2027-03-01T10:10:00.000Z",g.history,path))
   .toThrow("GITHUB_POST_RUN_HISTORY_TRUNCATED_OR_UNAVAILABLE");
 });
 it("one POST 204 only means GH child accepted; never provider/SQL charge in parent",async()=>{
  const f=fixture(),calls:{method:string;body?:string;url:string}[]=[];
  const fake=async(u:unknown,opt?:RequestInit)=>{
   calls.push({method:String(opt?.method),url:String(u),
    body:opt?.body?.toString()});
   return opt?.method==="GET"?
     {ok:true,status:200,json:async()=>f.history} as Response:
     {ok:true,status:204} as Response;
  };
  const done=await runP5FuturePostGithubDispatcher(
   f.env,fake as typeof fetch,
   async()=>({pre:f.pre,dbClockUtc:"2027-03-01T10:10:00.000Z"}),
   ()=>f.bytes);
  expect(done.githubChildAcknowledged).toBe(true);
  expect(done.providerCalls).toBe(0);
  expect(done.productionDatabaseWrites).toBe(0);
  expect(calls.map(x=>x.method)).toEqual(["GET","POST"]);
  expect(JSON.parse(calls[1].body!)).toMatchObject({
   ref:"main",inputs:{
    frozen_future_post_packet:path,
    confirm:"ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY"
   }
  });
 });
 it("never replays unknown 5xx GH response and no network before due",async()=>{
  const f=fixture();let calls=0;
  const fake=async(_:unknown,opts?:RequestInit)=>{
   calls++;
   return opts?.method==="GET"?
    {ok:true,status:200,json:async()=>f.history} as Response:
    {ok:false,status:503} as Response;
  };
  await expect(runP5FuturePostGithubDispatcher(
   f.env,fake as typeof fetch,
   async()=>({pre:f.pre,dbClockUtc:"2027-03-01T10:10:00.000Z"}),
   ()=>f.bytes))
   .rejects.toThrow("GH_POST_AMBIGUOUS_NO_PROVIDER_ATTEMPT_RETRY");
  expect(calls).toBe(2);
  const no=async()=>{throw Error("no GH API before due");};
  const early=await runP5FuturePostGithubDispatcher(
   f.env,no as typeof fetch,
   async()=>({pre:f.pre,dbClockUtc:"2027-03-01T09:30:00.000Z"}),
   ()=>f.bytes);
  expect(early.githubChildAcknowledged).toBe(false);
 });
 it("no actual source-bound PRE is a counted skip, not an all-or-nothing study stop",async()=>{
  const f=fixture();
  const result=await runP5FuturePostGithubDispatcher(
   f.env,(async()=>{throw Error("network must not be used");}) as typeof fetch,
   async()=>{throw Error("REFUSED_P5_FUTURE_POST_V0083_NO_VALID_NATIVE_T_SOURCE_PRE_FOR_THIS_POST");},
   ()=>f.bytes);
  expect(result.status).toBe("SKIP_NO_VALID_SOURCE_BOUND_PRE_COUNT_MISSINGNESS");
 });
});
