/** Exact GitHub archive metadata and bounded ZIP contents reader. No
 * provider URL or private flight selector traverses an external request.
 * The GitHub token is read-only and never forwarded to archive redirects.
 */
import {createHash} from "node:crypto";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {readP7NoaaBoundedResponse} from "./phase7NoaaPublicArchive_v39";
import {P7_NOAA_PRODUCTION_WORKFLOW} from "./phase7NoaaProductionArchivePlan_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_NOAA_GITHUB_ARCHIVE_"+s)};
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/,NUM=/^[1-9][0-9]{4,24}$/;
const repo="HKcode22/ReplitTranvr";
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const at=(v:unknown)=>{if(typeof v!=="string"||!Number.isFinite(Date.parse(v)))return hold("GITHUB_CLOCK");return Date.parse(v)};
export type P7NoaaArchiveRun={id:number;head_sha:string;head_branch:string;head_repository:{full_name:string};path:string;event:string;run_attempt:number;created_at:string;run_started_at:string;updated_at:string;status:string;conclusion:string|null};
export type P7NoaaGithubArtifact={id:number;name:string;expired:boolean;digest:string;size_in_bytes:number;created_at:string;expires_at:string;workflow_run:{id:number;head_sha?:string;head_branch?:string}};
type Json=Record<string,any>;
export function validateP7ProductionNoaaRun(run:unknown,codeSha:string,runId?:string,completed=false){
 const r=run as P7NoaaArchiveRun;
 if(!r||!C.test(codeSha)||r.head_sha!==codeSha||!NUM.test(String(r.id))||(runId!==undefined&&String(r.id)!==runId)||
  r.head_branch!=="main"||r.head_repository?.full_name!==repo||r.path!==P7_NOAA_PRODUCTION_WORKFLOW||
  !["schedule","workflow_dispatch"].includes(r.event)||r.run_attempt!==1||
  at(r.created_at)>at(r.run_started_at)||at(r.run_started_at)>at(r.updated_at)||
  (completed&&(r.status!=="completed"||r.conclusion!=="success")))hold("EXACT_PRODUCTION_RUN");
 return r;
}
export function validateP7NoaaGithubArtifact(artifact:unknown,run:P7NoaaArchiveRun,name:string,max:number,clockUtc:string){
 const a=artifact as P7NoaaGithubArtifact;
 if(!a||!NUM.test(String(a.id))||a.name!==name||a.expired!==false||String(a.workflow_run?.id)!==String(run.id)||
  (a.workflow_run.head_sha!==undefined&&a.workflow_run.head_sha!==run.head_sha)||
  (a.workflow_run.head_branch!==undefined&&a.workflow_run.head_branch!=="main")||
  typeof a.digest!=="string"||!H.test(a.digest.replace(/^sha256:/,""))||!a.digest.startsWith("sha256:")||
  !Number.isSafeInteger(a.size_in_bytes)||a.size_in_bytes<100||a.size_in_bytes>max||
  at(a.created_at)<at(run.run_started_at)||at(a.created_at)>at(clockUtc)||at(a.expires_at)<=at(clockUtc))hold("EXACT_ARTIFACT");
 return a;
}
export function readP7NoaaZipMembers(archive:Buffer,spec:Readonly<Record<string,number>>){
 if(!Buffer.isBuffer(archive)||archive.length<100||archive.length>18000000||!spec||Object.keys(spec).length<1||Object.keys(spec).length>13||
  Object.entries(spec).some(([k,v])=>! /^[a-z0-9_.-]{1,48}$/.test(k)||k==="."||k===".."||!Number.isSafeInteger(v)||v<1||v>18000000))hold("ZIP_BOUND");
 const dir=mkdtempSync(join(tmpdir(),"p7-noaa-zip-")),path=join(dir,"archive.zip");
 try{
  writeFileSync(path,archive,{flag:"wx",mode:0o600});
  const actual=execFileSync("unzip",["-Z1",path],{encoding:"utf8",timeout:3000,maxBuffer:4096,stdio:["ignore","pipe","ignore"]}).trim().split("\n").sort();
  const expected=Object.keys(spec).sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected))hold("EXACT_ZIP_MEMBERS");
  const out:Record<string,string>=Object.create(null);
  for(const name of expected){
   const bytes=execFileSync("unzip",["-p",path,name],{timeout:5000,maxBuffer:spec[name],stdio:["ignore","pipe","ignore"]});
   out[name]=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  }
  return out;
 }finally{rmSync(dir,{recursive:true,force:true})}
}
export function openP7NoaaGithubArchiveReader(token:string,http:typeof fetch=fetch){
 if(!token||token.length>4096||/[\s\r\n]/.test(token))hold("READ_TOKEN");
 async function gh(path:string){
  if(!path.startsWith("/actions/")||path.includes("..")||path.includes("#")||path.includes("\\"))hold("API_PATH");
  return http("https://api.github.com/repos/"+repo+path,{headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},redirect:"manual",signal:AbortSignal.timeout(15000)});
 }
 async function json(path:string,max=2000000):Promise<Json>{
  const r=await gh(path);if(r.status!==200)hold("METADATA_HTTP_"+r.status);
  return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(await readP7NoaaBoundedResponse(r,max)));
 }
 async function run(id:string){if(!NUM.test(id))hold("RUN_ID");return json("/actions/runs/"+id,250000);}
 async function artifact(id:string){if(!NUM.test(id))hold("ARTIFACT_ID");return json("/actions/artifacts/"+id,250000);}
 async function download(a:P7NoaaGithubArtifact,max:number){
  if(!NUM.test(String(a.id))||!a.digest.startsWith("sha256:")||!H.test(a.digest.slice(7))||a.size_in_bytes>max)hold("DOWNLOAD_SCOPE");
  const redirect=await gh("/actions/artifacts/"+a.id+"/zip");
  if(redirect.status!==302)hold("ARCHIVE_REDIRECT");
  const loc=redirect.headers.get("location");if(!loc)return hold("ARCHIVE_URL");
  const u=new URL(loc);
  if(u.protocol!=="https:"||u.username||u.password||!u.hostname)hold("ARCHIVE_URL");
  const r=await http(u,{redirect:"error",signal:AbortSignal.timeout(25000)});
  if(r.status!==200)hold("ARCHIVE_HTTP_"+r.status);
  const bytes=await readP7NoaaBoundedResponse(r,max);
  if(bytes.length!==a.size_in_bytes||sha(bytes)!==a.digest.slice(7))hold("ARCHIVE_BYTES");
  return bytes;
 }
 async function recentCompletedRuns(codeSha:string,fromUtc:string,toUtc:string){
  if(!C.test(codeSha)||at(fromUtc)>=at(toUtc))hold("RUN_SEARCH");
  const p=new URLSearchParams({branch:"main",status:"success",head_sha:codeSha,created:fromUtc+".."+toUtc,per_page:"20"});
  const x=await json("/actions/workflows/"+P7_NOAA_PRODUCTION_WORKFLOW.split("/").pop()+"/runs?"+p.toString());
  if(!Array.isArray(x.workflow_runs)||x.workflow_runs.length>20||!Number.isSafeInteger(x.total_count)||x.total_count!==x.workflow_runs.length)hold("BOUNDED_RUN_DENOMINATOR");
  return (x.workflow_runs as unknown[]).map(r=>validateP7ProductionNoaaRun(r,codeSha,undefined,true)).sort((a,b)=>at(b.run_started_at)-at(a.run_started_at)||b.id-a.id);
 }
 async function artifacts(run:P7NoaaArchiveRun){
  const x=await json("/actions/runs/"+run.id+"/artifacts?per_page=20");
  if(!Array.isArray(x.artifacts)||x.artifacts.length>20||x.total_count!==x.artifacts.length)hold("BOUNDED_ARTIFACT_DENOMINATOR");
  return x.artifacts as P7NoaaGithubArtifact[];
 }
 return {run,artifact,download,recentCompletedRuns,artifacts};
}
