/**
 * GitHub Actions READ ONLY self-attestation, three independent real
 * RUNNING jobs. Not prearming a future cohort. No paid or DB access.
 */
import {execFileSync} from "node:child_process";
import {assertP4G5OwnerGitHubContextV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {attestP4G5RunningRehearsalJobV39}
 from "../server/lib/disruption/phase4Gate5GitHubRunningJobEvidence_v39";

const repo="HKcode22/ReplitTranvr";
const e=process.env;
const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const job=e.GITHUB_JOB;
const h=job==="owner-t24"?"T-24h":
 job==="owner-t6"?"T-6h":job==="owner-t90"?"T-90m":null;
if(h===null)throw Error("P4_G5_ATTEST_UNKNOWN_JOB_HOLD");
assertP4G5OwnerGitHubContextV39(e,sha,h);
const runId=e.GITHUB_RUN_ID;
const token=e.P4_G5_GH_READ_ONLY_TOKEN;
if(!/^[0-9]{5,25}$/.test(runId??"")||
   !token||token.length<10)
 throw Error("P4_G5_ATTEST_MISSING_GITHUB_READ_ONLY_TOKEN_HOLD");
const observedAtUtc=new Date().toISOString();
async function read(path:string):Promise<unknown>{
 const ac=new AbortController();
 const timeout=setTimeout(()=>ac.abort(),8000);
 try{
  const res=await fetch("https://api.github.com/repos/"+repo+path,{
   headers:{
    "Accept":"application/vnd.github+json",
    "Authorization":"Bearer "+token,
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"phase4-gate5-running-owner-rehearsal"
   },signal:ac.signal,redirect:"error"
  });
  if(!res.ok)throw Error("P4_G5_ATTEST_GITHUB_API_HOLD");
  return await res.json();
 }finally{clearTimeout(timeout);}
}
async function main(){
 let output:ReturnType<typeof attestP4G5RunningRehearsalJobV39>|null=null;
 // GitHub's Actions jobs collection may be momentarily behind this running
 // job. Bounded metadata-only retry, never a source/API-provider retry.
 for(let attempt=0;attempt<4;attempt++){
  try{
   const run=await read("/actions/runs/"+runId);
   const jobs=await read("/actions/runs/"+runId+"/jobs?per_page=100");
   if(!jobs||typeof jobs!=="object"||Array.isArray(jobs))
    throw Error("P4_G5_ATTEST_JOB_COLLECTION_HOLD");
   const collection=jobs as {total_count?:unknown;jobs?:unknown};
   if(typeof collection.total_count!=="number"||
      collection.total_count<3||collection.total_count>100||
      !Array.isArray(collection.jobs))
    throw Error("P4_G5_ATTEST_JOB_COLLECTION_HOLD");
   const matched=collection.jobs.filter(x=>x&&typeof x==="object"&&
      !Array.isArray(x)&&(x as {name?:unknown}).name===job);
   if(matched.length!==1)throw Error("P4_G5_ATTEST_NONUNIQUE_RUNNING_JOB_HOLD");
   output=attestP4G5RunningRehearsalJobV39(
    e,sha,run,matched[0],observedAtUtc,new Date().toISOString());
   break;
  }catch(err){
   if(attempt===3)throw err;
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
 }
 if(!output)throw Error("P4_G5_ATTEST_NOT_RUNNING_HOLD");
 // Redacted to identity/time markers; do not log token, full API bodies,
 // provider flight identities, weather, flight schedule, raw or account data.
 console.log(JSON.stringify(output));
}
void main().catch(err=>{
 const m=err instanceof Error&&/^P4_[A-Z0-9_]+$/.test(err.message)?
   err.message:"P4_G5_ATTEST_READ_ONLY_HOLD";
 console.error(m);process.exitCode=2;
});
