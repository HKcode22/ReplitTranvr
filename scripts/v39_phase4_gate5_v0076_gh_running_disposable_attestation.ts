/**
 * Read-only Actions API self-attestation for isolated V0076 PostgreSQL test.
 * No provider, production DB, or source reads. No token in output.
 */
import {attestP4G5V0076DisposableRunningOwnerV39}
 from "../server/lib/disruption/phase4Gate5V0076DisposableRunningOwner_v39";

export async function requireP4G5V0076DisposableGitHubProof(
 env:NodeJS.ProcessEnv,checkoutSha:string
){
 const token=env.P4_G5_GH_READ_ONLY_TOKEN;
 const id=env.GITHUB_RUN_ID;
 if(!token||token.length<10||!/^[1-9][0-9]{4,24}$/.test(id??""))
  throw Error("P4_G5_V0076_ATTEST_MISSING_GITHUB_TOKEN_OR_ID");
 const base="https://api.github.com/repos/HKcode22/ReplitTranvr";
 const get=async(path:string):Promise<unknown>=>{
  const response=await fetch(base+path,{
   method:"GET",redirect:"error",signal:AbortSignal.timeout(8000),
   headers:{"Accept":"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"phase4-gate5-v0076-disposable-job",
    "Authorization":"Bearer "+token}
  });
  if(!response.ok)throw Error("P4_G5_V0076_ATTEST_GITHUB_API_HOLD");
  return await response.json();
 };
 for(let n=0;n<4;n++){
  try{
   const observed=new Date().toISOString();
   const run=await get("/actions/runs/"+id);
   const raw=await get("/actions/runs/"+id+"/jobs?per_page=100");
   if(!raw||typeof raw!=="object"||Array.isArray(raw))
    throw Error("P4_G5_V0076_ATTEST_JOB_COLLECTION_HOLD");
   const list=raw as {total_count?:unknown;jobs?:unknown};
   if(list.total_count!==1||!Array.isArray(list.jobs)||
      list.jobs.length!==1)
    throw Error("P4_G5_V0076_ATTEST_JOB_COLLECTION_HOLD");
   return attestP4G5V0076DisposableRunningOwnerV39(
    env,checkoutSha,run,list.jobs[0],observed,new Date().toISOString());
  }catch(err){
   if(n===3)throw err;
   await new Promise(resolve=>setTimeout(resolve,1500));
  }
 }
 throw Error("P4_G5_V0076_ATTEST_GITHUB_NOT_RUNNING_HOLD");
}
