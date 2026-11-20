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

/** Find the most recent completed exact-main reviewed public weather
 * snapshot in the bounded as-of window. No retry acquisition or private
 * route selectors. No candidate archive is ordinary missingness. A claimed
 * reviewed archive that fails signature/metadata/byte validation is HOLD,
 * never silently replaced by missing data or a different capture.
 */
export async function readP7LatestReviewedPublicNoaaSnapshot(input:{env:NodeJS.ProcessEnv;clockUtc:string;plans:readonly import("./phase7NoaaProductionArchivePlan_v39").P7PublicNoaaPlan[];reader:ReturnType<typeof openP7NoaaGithubArchiveReader>}){
 const {env,clockUtc,plans,reader}=input;
 const {P7_NOAA_PUBLIC_MAX_AGE_MS,P7_NOAA_PRODUCTION_RAW,P7_NOAA_PRODUCTION_REVIEW,publicP7WeatherStationGroups}=await import("./phase7NoaaProductionArchivePlan_v39");
 const {verifyP7PublicNoaaSnapshot}=await import("./phase7NoaaProductionReviewedSnapshot_v39");
 const now=at(clockUtc);
 if(!C.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.V39_P5_APPROVED_CODE_SHA||env.P6_PHASE7_NOAA_ARCHIVE_ISSUER_APPROVED!=="1")hold("PROTECTED_READ_SCOPE");
 const runs=await reader.recentCompletedRuns(env.GITHUB_SHA!,new Date(now-P7_NOAA_PUBLIC_MAX_AGE_MS).toISOString(),clockUtc);
 for(const run of runs){
  if(at(run.updated_at)>now)continue;
  const artifacts=await reader.artifacts(run),raw=artifacts.filter(a=>a.name===P7_NOAA_PRODUCTION_RAW),review=artifacts.filter(a=>a.name===P7_NOAA_PRODUCTION_REVIEW);
  // Completed enabled capture outside its calendar window (or a disabled
  // workflow) produces neither archive. Partial pairs are never usable.
  if(!raw.length&&!review.length)continue;
  if(raw.length!==1||review.length!==1)hold("COMPLETE_ARCHIVE_PAIR_REQUIRED");
  const rawMeta=validateP7NoaaGithubArtifact(await reader.artifact(String(raw[0].id)),run,P7_NOAA_PRODUCTION_RAW,18000000,clockUtc);
  const signedMeta=validateP7NoaaGithubArtifact(await reader.artifact(String(review[0].id)),run,P7_NOAA_PRODUCTION_REVIEW,18000000,clockUtc);
  if(String(rawMeta.id)!==String(raw[0].id)||rawMeta.digest!==raw[0].digest||String(signedMeta.id)!==String(review[0].id)||signedMeta.digest!==review[0].digest||
   at(signedMeta.created_at)<at(rawMeta.created_at)||at(signedMeta.created_at)>at(run.updated_at))hold("ARCHIVE_PAIR_METADATA");
  const zip=await reader.download(signedMeta,18000000),members=readP7NoaaZipMembers(zip,{"reviewed.json":10000000});
  const snapshot=JSON.parse(members["reviewed.json"]),v=verifyP7PublicNoaaSnapshot(env,snapshot);
  if(v.githubRunId!==String(run.id)||v.rawArtifactId!==String(rawMeta.id)||v.rawArchiveSha256!==rawMeta.digest.slice(7)||
   at(v.scopeAtUtc)<at(run.run_started_at)||at(v.reviewedAtUtc)>at(signedMeta.created_at)||at(v.reviewedAtUtc)<at(rawMeta.created_at)||
   v.receipts.some(q=>at(q.artifactCreatedAtUtc)!==at(rawMeta.created_at)||at(q.durableReadAtUtc)<at(rawMeta.created_at)))hold("EXACT_SNAPSHOT_GITHUB_BINDING");
  const expected=publicP7WeatherStationGroups(plans,v.scopeAtUtc);
  if(v.receipts.length!==expected.groups.length*2||v.receipts.some((q,i)=>JSON.stringify(q.requestedAirports)!==JSON.stringify(expected.groups[Math.floor(i/2)])))hold("PUBLIC_PLAN_DENOMINATOR_DRIFT");
  if(now-at(v.scopeAtUtc)>P7_NOAA_PUBLIC_MAX_AGE_MS)continue;
  return {snapshot,status:"EXACT_REVIEWED_PUBLIC_NOAA_SNAPSHOT_READY" as const,snapshotSha256:v.snapshotSha256,stationCount:v.stationCount,receiptCount:v.receipts.length,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 }
 return {snapshot:null,status:"NO_ELIGIBLE_COMPLETED_PUBLIC_NOAA_ARCHIVE" as const,snapshotSha256:null,stationCount:0,receiptCount:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
