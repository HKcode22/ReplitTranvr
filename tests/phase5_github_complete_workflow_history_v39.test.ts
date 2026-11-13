import {describe,it,expect} from "vitest";
import {
 readP5CompleteGithubWorkflowHistory,reviewP5HistoryUrl,
 P5_COMPLETE_HISTORY_MAX
} from "../server/lib/disruption/phase5GithubCompleteWorkflowHistory_v39";
import {selectP5DueSignedSourceChildIntents}
 from "../scripts/v39_phase5_github_due_source_batch_child_dispatcher_v39";
import {planP5SignedLaterBatchChildren}
 from "../scripts/v39_phase5_later_pre_signed_day_batch_dispatcher_v39";

const r="https://api.github.com/repos/HKcode22/ReplitTranvr/actions/workflows/";
const from="2027-02-10T01:00:00.000Z";
const until="2027-02-10T04:01:00.000Z";
const base=(kind:string)=>r+kind+
 "/runs?event=workflow_dispatch&per_page=100&created="+
 encodeURIComponent(from+".."+until);
const workflows=[
 "phase5-one-signed-day-source-child-dispatch.yml",
 "phase5-one-signed-native-t24-pre-witness-main-manual.yml",
 "phase5-one-signed-witnessed-later-pre-main-manual.yml",
 "phase5-one-signed-future-post-v0083-main-manual.yml"
];
const headers={Accept:"application/vnd.github+json",
 Authorization:"Bearer test_github_actions_token_not_real_1234567"};
function run(id:number,title?:string){
 return {
  id,display_title:title??"P5 SOURCE "+"a".repeat(64),
  status:"completed",conclusion:"failure",
  created_at:"2027-02-10T02:00:00.000Z"
 };
}
function pages(n:number,settings:{
 failPage?:number;racePage?:number;dropPage?:number;
 duplicateAt?:number;malformed?:boolean
}={}){
 const rows=Array.from({length:n},(_,i)=>run(i+1));
 const seen:number[]=[];
 const fetcher=async (url:string,opts:any)=>{
  const u=new URL(url);
  const page=Number(u.searchParams.get("page"));
  seen.push(page);
  expect(opts.method).toBe("GET");
  expect(opts.headers.Authorization).toBe(headers.Authorization);
  expect(u.searchParams.get("event")).toBe("workflow_dispatch");
  expect(u.searchParams.get("per_page")).toBe("100");
  if(settings.failPage===page)
   return{ok:false,status:503,json:async()=>({})};
  let slice=rows.slice((page-1)*100,page*100);
  if(settings.dropPage===page)slice=slice.slice(0,-1);
  if(settings.duplicateAt&&page===settings.duplicateAt)
   slice=[{...rows[0]},...slice.slice(1)];
  if(settings.malformed&&page===1)
   slice[0]={...slice[0],status:"unknown"};
  return{ok:true,status:200,json:async()=>({
   total_count:settings.racePage===page?n+1:n,
   workflow_runs:slice
  })};
 };
 return {fetcher:fetcher as unknown as typeof fetch,seen};
}
describe("one exact complete GH child history for all four Phase6 lanes",()=>{
 it("rejects any unaudited host, workflow, page, event, or large search window",()=>{
  for(const candidate of [
   base(workflows[0]).replace("api.github.com","example.com"),
   base("phase5-unreviewed-paid-danger.yml"),
   base(workflows[0])+"&page=1",
   base(workflows[0]).replace("workflow_dispatch","push"),
   base(workflows[0]).replace("per_page=100","per_page=1000"),
   base(workflows[0]).replace("2027-02-10T04%3A01%3A00.000Z",
                                  "2027-02-13T04%3A01%3A00.000Z")
  ])
   expect(()=>reviewP5HistoryUrl(candidate)).toThrow(
    "REFUSED_P5_COMPLETE_GH_HISTORY_");
  for(const wf of workflows)
   expect(reviewP5HistoryUrl(base(wf)).pathname).toContain(wf);
 });
 it("one exact fully audited page, including zero runs",async()=>{
  const a=pages(0);
  const out=await readP5CompleteGithubWorkflowHistory(
   base(workflows[0]),a.fetcher,headers);
  expect(out.total_count).toBe(0);
  expect(out.workflow_runs).toEqual([]);
  expect(a.seen).toEqual([1]);
 });
 it("fetches 150 runs across two pages, including earlier failed run, before any dispatch",async()=>{
  const a=pages(150);
  const h=await readP5CompleteGithubWorkflowHistory(
   base(workflows[0]),a.fetcher,headers);
  expect(h.total_count).toBe(150);
  expect(h.workflow_runs.map(x=>x.id)).toEqual(
   Array.from({length:150},(_,i)=>i+1));
  expect(a.seen).toEqual([1,2]);
  const empty={
   schema:"v39.phase5.signed-per-day-source-batch-actual-db-handoff.v1",
   status:"BOUND_SIGNED_DAY_SOURCE_BATCH_REVIEWED_NO_DISPATCH",
   observedDbClockUtc:"2027-02-10T03:00:00.000Z",
   runDayIndex:1,inspectedQueryCount:1,dbMissingHoldCount:0,
   githubChildDispatchCount:0,databaseWrites:0,providerCalls:0,
   paidPhase6GoGranted:false,
   handoffs:[{
    schema:"v39.phase5.one-signed-unattended-due-queue-handoff.v1",
    status:"SIGNED_QUERY_DUE_FOR_INDEPENDENT_RELEASE_NO_DISPATCH",
    runDayIndex:1,queryDigestSha256:"a".repeat(64),
    plannedDispatchUtc:"2027-02-10T04:00:00.000Z"
   }]
  } as any;
  const decision=selectP5DueSignedSourceChildIntents(h as any, h as any,
   "data-collection/phase5/frozen/example_registry.json");
  // The first hundred were not silently treated as the whole population.
  expect(decision.alreadyGitHubDispatched).toBe(1);
  expect(decision.selectedForIndependentReleaseCount).toBe(0);
 });
 it("supports complete five-page maximum and refuses 501 or changed totals",async()=>{
  const max=pages(P5_COMPLETE_HISTORY_MAX);
  const result=await readP5CompleteGithubWorkflowHistory(
   base(workflows[3]),max.fetcher,headers);
  expect(result.workflow_runs).toHaveLength(500);
  expect(max.seen).toEqual([1,2,3,4,5]);
  const beyond=pages(501);
  await expect(readP5CompleteGithubWorkflowHistory(
   base(workflows[3]),beyond.fetcher,headers)).rejects.toThrow(
    "CHANGED_OR_OVERSIZED_GITHUB_HISTORY");
  expect(beyond.seen).toEqual([1]);
  const changed=pages(150,{racePage:2});
  await expect(readP5CompleteGithubWorkflowHistory(
   base(workflows[1]),changed.fetcher,headers)).rejects.toThrow(
    "CHANGED_OR_OVERSIZED_GITHUB_HISTORY");
 });
 it("HOLD on duplicate ids, truncated page, malformed attempt, failed GitHub GET",async()=>{
  for(const [opts,label] of [
   [{duplicateAt:2},"DUPLICATE_GITHUB_CHILD_RUN_ID"],
   [{dropPage:2},"TRUNCATED_OR_OVERLAPPING_GITHUB_HISTORY_PAGE"],
   [{malformed:true},"MALFORMED_GITHUB_CHILD_HISTORY"],
   [{failPage:2},"GITHUB_HISTORY_PAGE_UNAVAILABLE"]
  ] as const){
   const f=pages(150,opts);
   await expect(readP5CompleteGithubWorkflowHistory(
    base(workflows[2]),f.fetcher,headers)).rejects.toThrow(label);
  }
 });
});
