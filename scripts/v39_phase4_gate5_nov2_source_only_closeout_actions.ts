/**
 * Read-only GitHub Actions automatic post-closeout for the exact three
 * Nov2 provider-nonretained source-field runs. DOES NOT call AeroDataBox,
 * connect to PostgreSQL, handle flight IDs or create source artifacts.
 * GitHub's completed-job log redirect is fetched WITHOUT forwarding token.
 */
import {assessP4Nov2SourceReceiptV39,combineP4Nov2SourceReceiptsV39}
 from "../server/lib/disruption/phase4Gate5Nov2EphemeralReceiptsV39";
import type {Nov2HorizonV39} from
 "../server/lib/disruption/phase4Gate5Nov2EphemeralReceiptsV39";
const OWNER="HKcode22/ReplitTranvr",PREFIX="https://api.github.com/repos/"+OWNER;
const ACTION_NAME="Phase4 Gate5 WSSS Nov2 Three Horizon Real Paid Aggregate";
const SOURCES:{
 horizon:Nov2HorizonV39;runId:number;jobId:number;headSha:string;jobName:string
}[]=[
 {horizon:"T-24h",runId:41309044744,jobId:124855394173,
  headSha:"90d543c377a631d8e2789403d1273b6bd97062ed",jobName:"owner-t24"},
 {horizon:"T-6h",runId:41402736335,jobId:125137897353,
  headSha:"eea16c78209ce10e09467ac7e2d54e2b0f84bd31",jobName:"owner-t6"},
 {horizon:"T-90m",runId:41437078179,jobId:125250256608,
  headSha:"1c7740dac119b54996b250be8de233ad04c79577",jobName:"owner-t90"}
];
function assertGH(){
 const e=process.env;
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==OWNER||
    e.GITHUB_EVENT_NAME!=="workflow_run"||
    e.GITHUB_REF!=="refs/heads/main"||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    e.GITHUB_WORKFLOW!=="Phase4 Gate5 Nov2 Source-only Independent Closeout"||
    e.GITHUB_JOB!=="source-only-independent-closeout"||
    e.P4_G5_NOV2_TRIGGER_RUN!=="41437078179"||
    !e.GITHUB_TOKEN||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
    !!e.DATABASE_URL||!!e.V39_DATABASE_RUNTIME_URL||
    !!e.GATE05_AUTOMATION_DATABASE_URL)
  throw Error("P4_G5_NOV2_READONLY_GITHUB_CONTEXT_HOLD");
 return e.GITHUB_TOKEN;
}
async function gh(url:string,token:string){
 const resp=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(18000),
  headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json",
   "X-GitHub-Api-Version":"2022-11-28"}});
 if(!resp.ok)throw Error("P4_G5_NOV2_GH_METADATA_UNAVAILABLE");
 const json:unknown=await resp.json();
 if(!json||typeof json!=="object"||Array.isArray(json))
  throw Error("P4_G5_NOV2_GH_METADATA_INVALID");
 return json as Record<string,unknown>;
}
async function jobText(jobId:number,token:string){
 const resp=await fetch(PREFIX+"/actions/jobs/"+jobId+"/logs",{
  redirect:"manual",signal:AbortSignal.timeout(18000),
  headers:{Authorization:"Bearer "+token,
   Accept:"application/vnd.github+json",
   "X-GitHub-Api-Version":"2022-11-28"}
 });
 // Github API sends a 302 temporary signed URL; never pass auth to that host.
 if(resp.status!==302&&resp.status!==307)
  throw Error("P4_G5_NOV2_JOB_LOG_REDIRECT_UNAVAILABLE");
 const location=resp.headers.get("location");
 if(!location)throw Error("P4_G5_NOV2_JOB_LOG_REDIRECT_MISSING");
 const dest=new URL(location);
 if(dest.protocol!=="https:"||dest.username||dest.password||
    !/(\.blob\.core\.windows\.net|\.githubusercontent\.com|\.s3\.amazonaws\.com)$/i.test(dest.hostname))
  throw Error("P4_G5_NOV2_JOB_LOG_REDIRECT_UNTRUSTED");
 const result=await fetch(dest.toString(),{
  redirect:"error",signal:AbortSignal.timeout(18000)
 }); // NO token/header to signed location.
 if(!result.ok)throw Error("P4_G5_NOV2_JOB_LOG_UNAVAILABLE");
 const size=Number(result.headers.get("content-length"));
 if(Number.isFinite(size)&&size>3_000_000)
  throw Error("P4_G5_NOV2_JOB_LOG_TOO_LARGE");
 const body=await result.text();
 if(body.length>3_000_000)throw Error("P4_G5_NOV2_JOB_LOG_TOO_LARGE");
 return body;
}
export async function mainP4Nov2SourceCloseoutV39(){
 const token=assertGH();
 const results=[];
 for(const spec of SOURCES){
  const run=await gh(PREFIX+"/actions/runs/"+spec.runId,token);
  const job=await gh(PREFIX+"/actions/jobs/"+spec.jobId,token);
  if(run.id!==spec.runId||run.name!==ACTION_NAME||
     run.head_sha!==spec.headSha||run.event!=="push"||
     run.head_branch!=="main"||run.run_attempt!==1||
     job.id!==spec.jobId||job.run_id!==spec.runId||
     job.name!==spec.jobName||job.status!=="completed"||
     run.status!=="completed")
   throw Error("P4_G5_NOV2_SOURCE_JOB_IDENTITY_UNVERIFIED");
  const conclusion=job.conclusion;
  if(conclusion!=="success"&&conclusion!=="failure"&&
     conclusion!=="cancelled")
   throw Error("P4_G5_NOV2_SOURCE_JOB_CONCLUSION_UNKNOWN");
  const log=await jobText(spec.jobId,token);
  const receipt=assessP4Nov2SourceReceiptV39(spec.horizon,conclusion,log);
  results.push(receipt);
  console.log(JSON.stringify({event:"NOV2_SOURCE_ONLY_INDEPENDENT_HORIZON_REVIEW",
   runId:spec.runId,jobId:spec.jobId,...receipt}));
 }
 const combined=combineP4Nov2SourceReceiptsV39(results);
 console.log(JSON.stringify({
  event:"NOV2_SOURCE_ONLY_INDEPENDENT_AGGREGATE_FINAL",
  ...combined,logSource:"GH_COMPLETED_JOB_LOGS_NOT_PROVIDER_ORIGINALS",
  providerNativeSourceSemanticsCertified:false,
  applicableSourceRetentionRightsCertified:false
 }));
 if(!combined.confirmedFromSuppliedLogsOnly)process.exitCode=2;
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_nov2_source_only_closeout_actions.ts"))
 void mainP4Nov2SourceCloseoutV39().catch(()=>{
  console.error("P4_G5_NOV2_POSTRUN_HOLD_LOG_OR_GITHUB_EVIDENCE_UNAVAILABLE");
  process.exitCode=2;
 });
