/**
 * One shared bounded GitHub workflow_dispatch history reader used by the
 * existing Phase5/6 SOURCE, T24, later PRE and V0083 POST child controllers.
 *
 * The old per_page=100 reader halted forever in a busy window once more than
 * 100 prior runs existed. This completes every history page BEFORE any child
 * dispatch, with bounded 500 run upper cap. It never writes SQL or calls a
 * provider. If GitHub results are incomplete/change during paging, HOLD and
 * do not retry unknown prior jobs or issue a new child.
 */
const ROOT="https://api.github.com";
const PREFIX="/repos/HKcode22/ReplitTranvr/actions/workflows/";
export const P5_COMPLETE_HISTORY_MAX=500;
const PER_PAGE=100;
const WORKFLOWS=new Set([
 "phase5-one-signed-day-source-child-dispatch.yml",
 "phase5-one-signed-native-t24-pre-witness-main-manual.yml",
 "phase5-one-signed-witnessed-later-pre-main-manual.yml",
 "phase5-one-signed-future-post-v0083-main-manual.yml"
]);
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const STAGES=new Set([
 "queued","in_progress","completed","pending","waiting","requested"
]);
const refuse=(s:string):never=>{
 throw Error("REFUSED_P5_COMPLETE_GH_HISTORY_"+s);
};
function utc(s:string):number{
 if(!ISO.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)
  refuse("CREATED_WINDOW_NONCANONICAL");
 return Date.parse(s);
}
export interface P5CompleteGithubWorkflowRun{
 id:number;
 display_title:string;
 status:string;
 conclusion:string|null;
 created_at:string;
}
export interface P5CompleteGithubWorkflowHistory{
 total_count:number;
 workflow_runs:P5CompleteGithubWorkflowRun[];
}
export function reviewP5HistoryUrl(base:string):URL{
 let u:URL;
 try{u=new URL(base);}catch{return refuse("INVALID_GITHUB_URL");}
 if(u.origin!==ROOT||u.username||u.password||u.hash||
    !u.pathname.startsWith(PREFIX)||
    !u.pathname.endsWith("/runs"))
  refuse("UNTRUSTED_GITHUB_HISTORY_ORIGIN");
 const workflow=u.pathname.slice(PREFIX.length,-"/runs".length);
 if(!WORKFLOWS.has(workflow)||
    [...u.searchParams.keys()].some(k=>!
     ["event","per_page","created"].includes(k))||
    u.searchParams.get("event")!=="workflow_dispatch"||
    u.searchParams.get("per_page")!=="100"||
    u.searchParams.has("page")||
    !u.searchParams.has("created"))
  refuse("WORKFLOW_OR_FILTER_UNREVIEWED");
 for(const name of ["event","per_page","created"]){
  if(u.searchParams.getAll(name).length!==1)
   refuse("DUPLICATED_GITHUB_HISTORY_FILTER");
 }
 const m=/^(.*)\.\.(.*)$/.exec(u.searchParams.get("created")??"");
 if(!m)return refuse("CREATED_WINDOW_INVALID");
 const begin=utc(m[1]),end=utc(m[2]);
 if(end<begin||end-begin>24*3600_000)
  refuse("UNBOUNDED_GITHUB_HISTORY_WINDOW");
 return u;
}
function reviewRun(a:unknown):asserts a is P5CompleteGithubWorkflowRun{
 const v=a as Partial<P5CompleteGithubWorkflowRun>|null;
 if(!v||typeof v!=="object"||
    !Number.isSafeInteger(v.id)||Number(v.id)<1||
    typeof v.display_title!=="string"||
    v.display_title.length>240||
    typeof v.created_at!=="string"||
    !ISO.test(v.created_at)||
    !Number.isFinite(Date.parse(v.created_at))||
    new Date(v.created_at).toISOString()!==v.created_at||
    typeof v.status!=="string"||!STAGES.has(v.status)||
    (v.conclusion!==null&&typeof v.conclusion!=="string"))
  refuse("MALFORMED_GITHUB_CHILD_HISTORY");
}
export async function readP5CompleteGithubWorkflowHistory(
 base:string,
 fetcher:typeof fetch,
 headers:Record<string,string>
):Promise<P5CompleteGithubWorkflowHistory>{
 const reviewed=reviewP5HistoryUrl(base);
 if(typeof fetcher!=="function"||!headers||
    typeof headers.Authorization!=="string"||
    !headers.Authorization.startsWith("Bearer ")||
    headers.Authorization.length<27)
  refuse("NO_REVIEWED_GITHUB_READ_CREDENTIAL");
 let total:number|null=null;
 const all:P5CompleteGithubWorkflowRun[]=[];
 const ids=new Set<number>();
 // No additional page is fetched when the collection is already complete.
 for(let page=1;page<=P5_COMPLETE_HISTORY_MAX/PER_PAGE;page++){
  const u=new URL(reviewed);
  u.searchParams.set("page",String(page));
  const res=await fetcher(u.toString(),{method:"GET",headers});
  if(!res.ok)refuse("GITHUB_HISTORY_PAGE_UNAVAILABLE");
  let data:unknown;
  try{data=await res.json();}catch{return refuse("GITHUB_HISTORY_PAGE_NOT_JSON");}
  const d=data as Partial<P5CompleteGithubWorkflowHistory>|null;
  if(!d||!Number.isSafeInteger(d.total_count)||
     Number(d.total_count)<0||
     Number(d.total_count)>P5_COMPLETE_HISTORY_MAX||
     !Array.isArray(d.workflow_runs)||
     (total!==null&&d.total_count!==total))
   return refuse("CHANGED_OR_OVERSIZED_GITHUB_HISTORY");
  total=Number(d.total_count);
  const expected=Math.min(PER_PAGE,total-all.length);
  if(expected<0||d.workflow_runs!.length!==expected)
   refuse("TRUNCATED_OR_OVERLAPPING_GITHUB_HISTORY_PAGE");
  for(const row of d.workflow_runs!){
   reviewRun(row);
   if(ids.has(row.id))refuse("DUPLICATE_GITHUB_CHILD_RUN_ID");
   ids.add(row.id);all.push(row);
  }
  if(all.length===total)
   return{total_count:total,workflow_runs:all};
 }
 return refuse("INCOMPLETE_GITHUB_HISTORY_AFTER_FIVE_PAGES");
}
