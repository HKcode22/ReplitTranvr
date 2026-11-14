import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {reviewP6PrivateDaySourceDueParentNoDispatch}
 from "../server/lib/disruption/phase6PrivateSourceDayEpochDueParentReview_v39";
const sha=(s:Buffer|string)=>createHash("sha256").update(s).digest("hex");
const H=(x:string)=>x.repeat(64),main="f".repeat(40);
const manifest=H("a"),root="data-collection/phase5/frozen/";
const now="2026-11-14T06:00:00.000Z";
const planned="2026-11-14T06:30:00.000Z";
const latest="2026-11-14T06:45:00.000Z";
const digest=(day:number,n:number)=>sha("signed query "+day+" "+n);
function fixture(){
 const secrets={q1:digest(1,1),q2:digest(1,2),q3:digest(1,3),
  q4:digest(2,1),q5:digest(2,2)};
 const rows=[
  {day:1,n:1,d:secrets.q1},{day:1,n:2,d:secrets.q2},
  {day:1,n:3,d:secrets.q3},{day:2,n:1,d:secrets.q4},
  {day:2,n:2,d:secrets.q5}
 ];
 const sourceObserver={
  schema:"v39.phase5.github-upcoming-source-queue-observer.v1",
  checkedAtDatabaseUtc:now,manifestSha256:manifest,observedQueries:5,
  providerCalls:0,databaseWrites:0,externalGithubDispatches:0,
  signedDaySourceBatch:null,signedPacketHandoff:null,
  candidates:rows.map(x=>({
   queryDigestSha256:x.d,runDayIndex:x.day,
   status:"DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH",
   plannedDispatchUtc:planned,latestDispatchUtc:latest
  }))
 };
 const days=([1,2] as const).map(day=>{
  const registryPath=root+`source_study_day_${day}_01.json`;
  const registry=Buffer.from(JSON.stringify({
   schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
   manifestSha256:manifest,runDayIndex:day,
   entries:rows.filter(x=>x.day===day).map(x=>({
    filePath:root+`sourceq_packet_day_${day}_number_${x.n}.json`,
    expectedPacketSha256:sha("packet "+day+" "+x.n),
    expectedQueryDigestSha256:x.d
   }))
  }));
  const route={
   lane:"SOURCE",runDayIndex:day,shardIndex:1,
   signedFrozenPath:registryPath,signedFrozenSha256:sha(registry),
   routingIntentSha256:sha("route "+day),
   notBeforeUtc:"2026-11-14T05:30:00.000Z",
   hardLatestUtc:"2026-11-14T06:40:00.000Z",
   boundSourceRegistryPath:null,boundSourceRegistrySha256:null,
   privateBytesOnlyFromRestrictedReader:true,
   independentlyAuthenticatedGHHistoryRequired:true,
   newPaidDispatchAuthorizedHere:false
  };
  const d={
   redactedSummary:{
    schema:"v39.phase6.day-epoch-exact-source-pre-post-original-semantics-no-go.v1",
    status:"ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO",
    runDayIndex:day,externallySignedDayEpochIndexSha256:sha("signed day "+day),
    observedRealPgClockUtc:now,
    reviewedEd25519SourceWasOriginalDayBytes:true,
    originalV0096GlobalChainNotUsed:true,
    derivedProjectionIsNotAnAdditionalReviewerSignature:true,
    phase6PaidGo:false,providerCalls:0,databaseWrites:0,
    githubChildDispatches:0
   }
  } as any;
  Object.defineProperty(d,"privateRoutingCandidates",{
   enumerable:false,writable:false,value:[route]
  });
  Object.defineProperty(d,"getFrozen",{
   enumerable:false,writable:false,
   value:(path:string)=>{
    if(path!==registryPath)throw Error("CI_PRIVATE_SOURCE_PATH_MISSING");
    return Buffer.from(registry);
   }
  });
  return{d,registry,route};
 });
 const history={
  total_count:1,workflow_runs:[{
   id:1001,display_title:"P5 SOURCE "+secrets.q1,
   status:"completed",conclusion:"failure",
   created_at:"2026-11-14T05:45:00.000Z"
  }]
 };
 const input=()=>({
  days:days.map(x=>x.d),sourceObserver:sourceObserver as any,history,
  expectedManifestSha256:manifest,expectedMainSha:main
 });
 return{days,sourceObserver,history,secrets,input};
}
describe("Phase5 original SOURCE parent: signed day epoch and actual DB due metadata (NO GO)",()=>{
 it("selects up to 4 signed due private-mode existing child proposals across 2 independent study days",()=>{
  const f=fixture(),r=reviewP6PrivateDaySourceDueParentNoDispatch(f.input());
  expect(r.redactedSummary.studyDayCount).toBe(2);
  expect(r.redactedSummary.sourceRegistryCount).toBe(2);
  expect(r.redactedSummary.candidateCount).toBe(4);
  expect(r.redactedSummary.alreadySubmittedGitHubChildren).toBe(1);
  expect(r.redactedSummary.deferredDueCount).toBe(0);
  expect(r.redactedSummary.githubDispatches).toBe(0);
  expect(r.redactedSummary.phase6PaidGo).toBe(false);
  expect(r.redactedSummary.originalChildStillMustVerifyIndividualSignedPacket).toBe(true);
  expect(Object.keys(r)).toEqual(["redactedSummary"]);
  const exposed=JSON.stringify(r);
  expect(exposed).not.toContain("source_study_day_");
  expect(exposed).not.toContain("sourceq_packet_");
  expect(exposed).not.toContain(f.secrets.q2);
  const selected=(r as any).privateChildProposals as Array<{
   runDayIndex:number;existingChildWorkflow:string;
   childInputShape:{private_transport:string;query_digest:string}
  }>;
  expect(selected.map(x=>x.runDayIndex)).toEqual([1,1,2,2]);
  expect(selected[0].childInputShape.private_transport).toBe("true");
  expect(selected.map(x=>x.childInputShape.query_digest).sort()).toEqual(
   [f.secrets.q2,f.secrets.q3,f.secrets.q4,f.secrets.q5].sort());
  expect(selected.every(x=>x.existingChildWorkflow===
   "phase5-one-signed-day-source-child-dispatch.yml")).toBe(true);
 });
 it("prioritizes earliest actual DB cutoff over signed registry order and reports explicit deferral",()=>{
  const f=fixture();
  f.history.total_count=0;f.history.workflow_runs=[];
  // All five are valid and due; the last registry entry has earliest
  // actual cutoff so must not be dropped merely because it was appended last.
  f.sourceObserver.candidates[4].latestDispatchUtc=
   "2026-11-14T06:35:00.000Z";
  const r=reviewP6PrivateDaySourceDueParentNoDispatch(f.input());
  expect(r.redactedSummary.candidateCount).toBe(4);
  expect(r.redactedSummary.eligibleDueUnsubmitted).toBe(5);
  expect(r.redactedSummary.deferredDueCount).toBe(1);
  const selected=(r as any).privateChildProposals as Array<{
   queryDigestSha256:string
  }>;
  expect(selected[0].queryDigestSha256).toBe(f.secrets.q5);
  expect(r.redactedSummary.githubDispatches).toBe(0);
 });
 it("honestly skips source registry queries outside the observed rolling DB queue window",()=>{
  const f=fixture();
  f.sourceObserver.candidates=f.sourceObserver.candidates.filter(
   x=>x.queryDigestSha256!==f.secrets.q5);
  f.sourceObserver.observedQueries=4;
  const x=reviewP6PrivateDaySourceDueParentNoDispatch(f.input());
  expect(x.redactedSummary.signedQueriesNotVisibleInBoundedQueueWindow).toBe(1);
  expect(x.redactedSummary.candidateCount).toBe(3);
  expect(x.redactedSummary.phase6PaidGo).toBe(false);
 });
 it("does not dispatch and counts missed/censored and future/prearmed source",()=>{
  const f=fixture();
  f.sourceObserver.candidates[1].status="MISSED_DISPATCH_CUTOFF_NO_BACKFILL";
  f.sourceObserver.candidates[2].status="PREARMED_OR_RESERVED_REQUIRES_SEPARATE_READBACK";
  const x=reviewP6PrivateDaySourceDueParentNoDispatch(f.input());
  expect(x.redactedSummary.missedOrStoppedCensored).toBe(1);
  expect(x.redactedSummary.notYetDueOrPrearmed).toBe(1);
  expect(x.redactedSummary.candidateCount).toBe(2);
 });
 it("fails closed on incomplete GH run history including an already failed original request",()=>{
  const f=fixture();
  f.history.total_count=2;
  expect(()=>reviewP6PrivateDaySourceDueParentNoDispatch(f.input())).
   toThrow(/INCOMPLETE_OR_UNREVIEWED_GH_CHILD_HISTORY/);
  f.history.total_count=1;
  f.history.workflow_runs[0].display_title="P5 SOURCE xinvalid";
  expect(()=>reviewP6PrivateDaySourceDueParentNoDispatch(f.input())).
   toThrow(/INVALID_PREVIOUS_SOURCE_CHILD_ID/);
 });
 it("rejects cross-day signed route and duplicate query digest across day registries",()=>{
  const f=fixture();
  f.days[1].route.runDayIndex=1;
  expect(()=>reviewP6PrivateDaySourceDueParentNoDispatch(f.input())).
   toThrow(/NOT_UNIQUE_GENUINELY_DUE_SIGNED_SOURCE_ROUTE/);
  const g=fixture();
  g.sourceObserver.candidates[4].runDayIndex=1;
  expect(()=>reviewP6PrivateDaySourceDueParentNoDispatch(g.input())).
   toThrow(/SIGNED_DAY_VERSUS_REAL_SOURCE_QUEUE_DRIFT/);
 });
 it("rejects a changed source registry byte even if the route SHA looks reviewed",()=>{
  const f=fixture();
  f.days[0].registry.fill(84);
  expect(()=>reviewP6PrivateDaySourceDueParentNoDispatch(f.input())).
   toThrow(/UNSIGNED_OR_CHANGED_PRIVATE_SOURCE_REGISTRY_BYTES/);
 });
 it("rejects false Ed25519 review, private accessor leakage and stale reader clock",()=>{
  const f=fixture();
  f.days[0].d.redactedSummary.reviewedEd25519SourceWasOriginalDayBytes=false;
  expect(()=>reviewP6PrivateDaySourceDueParentNoDispatch(f.input())).
   toThrow(/NOT_ONE_VERIFIED_SIGNED_DAY_OR_FRESH_DB_CLOCK/);
  const g=fixture();
  g.days[1].d.redactedSummary.observedRealPgClockUtc=
   "2026-11-14T05:40:00.000Z";
  expect(()=>reviewP6PrivateDaySourceDueParentNoDispatch(g.input())).
   toThrow(/NOT_ONE_VERIFIED_SIGNED_DAY_OR_FRESH_DB_CLOCK/);
  const h=fixture();
  h.days[0].d={
   redactedSummary:h.days[0].d.redactedSummary,
   privateRoutingCandidates:[h.days[0].route],
   getFrozen:h.days[0].d.getFrozen
  };
  expect(()=>reviewP6PrivateDaySourceDueParentNoDispatch(h.input())).
   toThrow(/NOT_ONE_VERIFIED_SIGNED_DAY_OR_FRESH_DB_CLOCK/);
 });
 it("refuses two identical signed study days and any unreviewed GH paid child",()=>{
  const f=fixture();
  expect(()=>reviewP6PrivateDaySourceDueParentNoDispatch({
   ...f.input(),days:[f.days[0].d,f.days[0].d]
  })).toThrow(/NOT_ONE_VERIFIED_SIGNED_DAY_OR_FRESH_DB_CLOCK/);
  expect(reviewP6PrivateDaySourceDueParentNoDispatch(f.input()).
   redactedSummary.parentDoesNotApproveSourceContentsBudgetOrPaidGo).toBe(true);
 });
});
