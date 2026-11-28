/** Owner GitHub-only audit. No DB/secret access, paid calls, workflow
 * dispatch, retries or raw log output. Uses existing authenticated gh.
 * Exact current main; one bounded 100-row metadata page, at most 64 terminal child logs. */
import {execFileSync} from "node:child_process";
import {classifyP6PaidChildReceipt,isP6PaidSourceStep,selectP6PaidChildAuditRuns} from "./v39_phase5b_source_diagnostics_v39.mjs";
const R="HKcode22/ReplitTranvr",WF="phase5-one-signed-day-source-child-dispatch.yml";
const H=/^[a-f0-9]{40}$/,int=x=>Number.isSafeInteger(x)&&x>0;
const gh=(...a)=>execFileSync("gh",a,{encoding:"utf8",timeout:30000,maxBuffer:10*1024*1024,stdio:["ignore","pipe","pipe"]});
const api=p=>JSON.parse(gh("api",p));
const fail=()=>{throw Error("AUDIT_METADATA_UNVERIFIED")};
try{
 const head=process.argv[2];if(process.argv.length!==3||!H.test(head??"")||gh("api","user","--jq",".login").trim()!=="HKcode22")fail();
 const main=()=>api("repos/"+R+"/git/ref/heads/main").object.sha;
 if(main()!==head)fail();
 const w=api("repos/"+R+"/actions/workflows/"+WF);
 if(!int(w.id)||w.path!==".github/workflows/"+WF)fail();
 const q=api("repos/"+R+"/actions/workflows/"+w.id+"/runs?branch=main&event=workflow_dispatch&head_sha="+head+"&per_page=100");
 const sample=selectP6PaidChildAuditRuns(q),receipts=[];
 for(const run of q.workflow_runs)if(run.head_sha!==head||run.workflow_id!==w.id||run.path!==w.path)fail();
 for(const run of sample.selected){
  if(run.status!=="completed"){receipts.push(classifyP6PaidChildReceipt(run,[],null));continue;}
  let jobs=[],log=null;
  try{
   const j=api("repos/"+R+"/actions/runs/"+run.id+"/jobs?filter=latest&per_page=20");
   if(!Number.isSafeInteger(j.total_count)||j.total_count<1||j.total_count>20||j.jobs?.length!==j.total_count)fail();
   jobs=j.jobs;
   const job=jobs.find(x=>x.name==="exact-private-source-existing-one-get-child");
   if(int(job?.id)&&job.steps?.some(x=>isP6PaidSourceStep(x)&&x.conclusion!=="skipped")){
    // Capture escape-bearing logs privately. Only fixed allowlisted diagnostics
    // leave the classifier; never render terminal control bytes or raw contents.
    try{log=gh("api","--allow-escape-sequences","repos/"+R+"/actions/jobs/"+job.id+"/logs");}catch{/* unknown log, no replay */}
   }
  }catch{/* unverified metadata, no collection claim */}
  receipts.push(classifyP6PaidChildReceipt(run,jobs,log));
 }
 if(main()!==head)fail();
 const counts={};for(const x of receipts)counts[x.status]=(counts[x.status]??0)+1;
 console.log(JSON.stringify({status:"EXACT_MAIN_PAID_CHILD_AUDIT_NOT_BILLING_OR_PRE_PROOF",head,observedAtUtc:new Date().toISOString(),
  matchingWorkflowRuns:q.total_count,inspectedRuns:receipts.length,allMatchingRunMetadataInspected:sample.allMatchingMetadataInspected,
  metadataRows:sample.metadataRows,activeMetadataRows:sample.activeMetadataRows,terminalMetadataRows:sample.terminalMetadataRows,
  terminalSelected:sample.terminalSelected,terminalOmitted:sample.terminalOmitted,
  allMatchingTerminalRunsSelected:sample.allMatchingMetadataInspected&&sample.terminalOmitted===0,
  counts,receipts,providerCalls:0,workflowDispatches:0,databaseReads:0,databaseWrites:0,providerBillingVerified:false,actualPreCommitVerified:false}));
}catch{console.error("HOLD_P6_PAID_CHILD_AUDIT_METADATA_UNVERIFIED_NO_REPLAY");process.exitCode=2;}
