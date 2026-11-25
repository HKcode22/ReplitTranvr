/** Narrow, incident-specific first-physical-attempt recovery. An Actions
 * submission is not a physical GET. Only the four reviewed PRE-lane failures
 * at old main are eligible to be excluded from the submitted-digest set.
 * Both caller passes still require the live unprearmed/unreserved DB queue,
 * the same signed query, prospective lead/cutoff and atomic reservation.
 * No failed workflow rerun, no backdating, no ambiguous attempt retry.
 */
import {p6ApprovedRuntimeSuccessor,P6_PHASE5B_REVIEWED_POLICY_ANCHOR} from "./phase6ReviewedRuntimeCode_v39.mjs";
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const OLD="9fee7360cfa8a5411a7fe8229f37216197fec528";
const CASES=new Map([
 [45532068606,138929577662],[45532070782,138929583283],[45532073815,138929594043],[45532076611,138929602957]
]);
const STEP="Preflight independent PRE lane role (no provider, no DB writes)";
const PAID=/^Authenticate real private PG(?:16|\*\*\*6) signed index and query, then ORIGINAL one-physical-GET child$/;
const id=x=>Number.isSafeInteger(x)&&x>0;
async function verified(row,fetcher,headers){
 if(row.status!=="completed"||row.conclusion!=="failure"||!/^P5 SOURCE [a-f0-9]{64}$/.test(row.display_title))return false;
 const read=async path=>{const r=await fetcher(ROOT+path,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error("READ");return r.json()};
 const run=await read("/actions/runs/"+row.id);
 if(run.id!==row.id||run.head_sha!==OLD||run.head_branch!=="main"||run.path!==".github/workflows/phase5-one-signed-day-source-child-dispatch.yml"||run.event!=="workflow_dispatch"||
  run.run_attempt!==1||run.status!=="completed"||run.conclusion!=="failure"||run.display_title!==row.display_title)return false;
 const all=await read("/actions/runs/"+row.id+"/jobs?filter=all&per_page=100");
 if(all.total_count!==2||all.jobs?.length!==2||!all.jobs.every(j=>id(j.id)&&j.run_id===row.id&&j.head_sha===OLD&&j.run_attempt===1&&j.status==="completed"))return false;
 const j=all.jobs.find(x=>x.id===CASES.get(row.id)&&x.name==="exact-private-source-existing-one-get-child");
 const other=all.jobs.find(x=>x.name==="exact-reviewed-source-child");
 if(j?.conclusion!=="failure"||other?.conclusion!=="skipped"||other.steps?.length||!Array.isArray(j.steps))return false;
 const step=(n,p,c)=>j.steps.filter(s=>s.number===n&&p(s.name)&&s.status==="completed"&&s.conclusion===c).length===1;
 return step(7,n=>n===STEP,"failure")&&step(11,n=>PAID.test(n),"skipped")&&
  [8,9,10,12,13].every(n=>step(n,()=>true,"skipped"))&&step(14,n=>n==="Stop private PRE role processes and verify scratch cleanup","success");
}
export async function excludeP6KnownNoPhysicalStartSubmissions(history,env,fetcher,headers){
 if(env.GITHUB_SHA===OLD||!p6ApprovedRuntimeSuccessor(env,P6_PHASE5B_REVIEWED_POLICY_ANCHOR))return history;
 const rows=[];
 for(const row of history.workflow_runs){
  if(CASES.has(row.id)){
   try{if(await verified(row,fetcher,headers))continue;}catch{/* fail closed per digest; unrelated candidates remain eligible */}
  }
  rows.push(row);
 }
 return {...history,total_count:rows.length,workflow_runs:rows};
}
