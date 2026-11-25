/** Narrow, incident-specific first-physical-attempt recovery. An Actions
 * submission is not a physical GET. Only the 64 reviewed PRE-lane failures
 * at old main are eligible to be excluded from the submitted-digest set.
 * Both caller passes still require the live unprearmed/unreserved DB queue,
 * the same signed query, prospective lead/cutoff and atomic reservation.
 * No failed workflow rerun, no backdating, no ambiguous attempt retry.
 */
import {p6ApprovedRuntimeSuccessor,P6_PHASE5B_REVIEWED_POLICY_ANCHOR} from "./phase6ReviewedRuntimeCode_v39.mjs";
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const OLD="9fee7360cfa8a5411a7fe8229f37216197fec528";
const CASES=new Map([
 [45532068606,138929577662],
 [45532070782,138929583283],
 [45532073815,138929594043],
 [45532076611,138929602957],
 [45534482515,138937603561],
 [45534485138,138937611485],
 [45534487706,138937621171],
 [45534494646,138937645521],
 [45535628753,138941407714],
 [45535630813,138941412397],
 [45535633409,138941423802],
 [45535635346,138941428702],
 [45537950755,138949114513],
 [45537953765,138949123851],
 [45537956962,138949133383],
 [45537960398,138949145727],
 [45539134538,138953046047],
 [45539137227,138953053555],
 [45539139560,138953062565],
 [45539141891,138953068460],
 [45541441846,138960678818],
 [45541444046,138960686576],
 [45541446515,138960694363],
 [45541449514,138960704846],
 [45542568297,138964359900],
 [45542570669,138964366732],
 [45542573037,138964376545],
 [45542574801,138964383418],
 [45544800145,138971720060],
 [45544801966,138971727034],
 [45544803836,138971735237],
 [45544805767,138971741602],
 [45545955462,138975518147],
 [45545957585,138975524003],
 [45545959624,138975530304],
 [45545961660,138975538509],
 [45548249412,138982947002],
 [45548251306,138982953043],
 [45548253138,138982957951],
 [45548254517,138982963401],
 [45549360145,138986556882],
 [45549362369,138986564428],
 [45549364705,138986570264],
 [45549366986,138986578920],
 [45551569807,138993726494],
 [45551571916,138993733876],
 [45551574100,138993741863],
 [45551575986,138993748925],
 [45552733766,138997455483],
 [45552736455,138997463828],
 [45552738720,138997471783],
 [45552741079,138997479442],
 [45555058722,139005013571],
 [45555061058,139005021075],
 [45555063248,139005027194],
 [45555065098,139005033283],
 [45556186805,139008691882],
 [45556188869,139008698445],
 [45556190847,139008708059],
 [45556192657,139008710255],
 [45558501341,139016257718],
 [45558503688,139016264664],
 [45558505861,139016272909],
 [45558508190,139016280994]
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
export async function excludeP6KnownNoPhysicalStartSubmissions(history,env,fetcher,headers,candidateDigests){
 if(env.GITHUB_SHA===OLD||!p6ApprovedRuntimeSuccessor(env,P6_PHASE5B_REVIEWED_POLICY_ANCHOR))return history;
 // Production callers scope to live due digests/proposals. Unknown, expired,
 // non-due and already reserved submissions are never excluded by this pass.
 const candidates=history.workflow_runs.filter(row=>CASES.has(row.id)&&
  (candidateDigests===undefined||candidateDigests.has(row.display_title?.slice("P5 SOURCE ".length))));
 const excluded=new Set();
 // Bounded parallel reads avoid spending the entire two-minute freshness
 // allowance walking historical non-due runs. Every removal is still verified.
 for(let i=0;i<candidates.length;i+=8){
  await Promise.all(candidates.slice(i,i+8).map(async row=>{
   try{if(await verified(row,fetcher,headers))excluded.add(row.id);}catch{/* fail closed per digest */}
  }));
 }
 const rows=history.workflow_runs.filter(row=>!excluded.has(row.id));
 return {...history,total_count:rows.length,workflow_runs:rows};
}
