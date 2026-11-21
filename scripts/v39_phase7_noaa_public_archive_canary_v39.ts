/** Actual free NOAA two-GET canary on exact same-repository draft PR.
 * Isolated archive review job downloads exact ZIP bytes independently.
 * No signer secrets, database access, private flight selectors or paid calls. */
import {mkdirSync,writeFileSync,readFileSync,lstatSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {join} from "node:path";
import {captureP7NoaaPublicSource,readP7NoaaBoundedResponse,verifyP7NoaaArchive,P7_NOAA_CANARY_STATIONS,P7_NOAA_ARTIFACT_NAME,type P7NoaaCapture} from "../server/lib/disruption/phase7NoaaPublicArchive_v39";
const e=process.env,repo="HKcode22/ReplitTranvr";
const hold=(s:string):never=>{throw Error("HOLD_P7_NOAA_CANARY_"+s)};
const N=/^[1-9][0-9]{4,24}$/,C=/^[a-f0-9]{40}$/;
const dir="/tmp/p7-noaa-public-canary";
function context(job:string){
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==repo||e.GITHUB_EVENT_NAME!=="pull_request"||
  e.GITHUB_HEAD_REF!=="phase6/nov23-exact-calendar-compiler-review"||e.GITHUB_RUN_ATTEMPT!=="1"||e.GITHUB_JOB!==job||
  !N.test(e.GITHUB_RUN_ID??"")||!C.test(e.P7_NOAA_CODE_SHA??"")||e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||
  [e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET,e.DATABASE_URL,e.V39_DATABASE_RUNTIME_URL,e.V39_P5_SOURCE_DATABASE_URL].some(Boolean)||
  Object.entries(e).some(([k,v])=>k.startsWith("P6_PHASE7_")&&/PRIVATE_KEY|DATABASE_URL/.test(k)&&v))hold("NO_PROVIDER_NO_DATABASE_SCOPE");
 if(execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim()!==e.P7_NOAA_CODE_SHA)hold("EXACT_CHECKOUT");
}
async function capture(){
 context("p7-noaa-public-capture");
 if(e.GH_TOKEN)hold("CAPTURE_TOKEN_FORBIDDEN");
 const plan=JSON.parse(readFileSync("data-collection/phase5/planning/phase6-source-day-01.json","utf8"));
 if(plan.runDayIndex!==1||JSON.stringify(Object.values(plan.pairedIcaos).sort())!==JSON.stringify(P7_NOAA_CANARY_STATIONS))hold("PUBLIC_CALENDAR_DRIFT");
 const m=await captureP7NoaaPublicSource("METAR",P7_NOAA_CANARY_STATIONS);
 await new Promise(r=>setTimeout(r,1100));
 const t=await captureP7NoaaPublicSource("TAF",P7_NOAA_CANARY_STATIONS);
 mkdirSync(dir,{mode:0o700});
 const meta:P7NoaaCapture={schema:"v39.phase7.noaa-public-source-canary.v1",githubRunId:e.GITHUB_RUN_ID!,codeSha:e.P7_NOAA_CODE_SHA!,sources:[m.receipt,t.receipt]};
 for(const [n,b] of [["metar.json",m.body],["taf.json",t.body],["capture.json",JSON.stringify(meta)]] as const)writeFileSync(join(dir,n),b,{flag:"wx",mode:0o600});
 console.log(JSON.stringify({status:"P7_NOAA_PUBLIC_CAPTURE_PENDING_DURABLE_READBACK",METAR:m.rowCount,TAF:t.rowCount,paidProviderCalls:0,databaseWrites:0,phase6PaidGo:false}));
}
async function gh(path:string){
 if(!e.GH_TOKEN)hold("READ_TOKEN");
 return fetch("https://api.github.com/repos/"+repo+path,{headers:{Authorization:"Bearer "+e.GH_TOKEN,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},redirect:"manual",signal:AbortSignal.timeout(15000)});
}
async function json(path:string){
 const r=await gh(path);if(r.status!==200)hold("METADATA_HTTP_"+r.status);
 return JSON.parse((await readP7NoaaBoundedResponse(r,250000)).toString("utf8"));
}
async function review(){
 context("p7-noaa-public-verify");
 const id=e.P7_NOAA_ARTIFACT_ID??"",digest=(e.P7_NOAA_ARTIFACT_DIGEST??"").replace(/^sha256:/,"");
 if(!N.test(id)||!/^[a-f0-9]{64}$/.test(digest))hold("ARTIFACT_ID");
 const run=await json("/actions/runs/"+e.GITHUB_RUN_ID),a=await json("/actions/artifacts/"+id);
 if(String(run.id)!==e.GITHUB_RUN_ID||run.head_sha!==e.P7_NOAA_CODE_SHA||run.event!=="pull_request"||run.run_attempt!==1||
  run.head_repository?.full_name!==repo||run.path!==".github/workflows/phase4-gate5-free-noaa-weather-receipt.yml"||
  String(a.id)!==id||a.name!==P7_NOAA_ARTIFACT_NAME||a.expired!==false||String(a.workflow_run?.id)!==e.GITHUB_RUN_ID||
  a.digest!=="sha256:"+digest||!Number.isSafeInteger(a.size_in_bytes)||a.size_in_bytes<100||a.size_in_bytes>2200000)hold("EXACT_GITHUB_ARTIFACT");
 const redirect=await gh("/actions/artifacts/"+id+"/zip");
 if(redirect.status!==302)hold("ARCHIVE_REDIRECT");
 const path=redirect.headers.get("location");if(!path)hold("ARCHIVE_URL");
 const u=new URL(path!);
 // GitHub issues the signed archive URL. Never forward GitHub auth to it.
 if(u.protocol!=="https:"||u.username||u.password||!u.hostname)hold("ARCHIVE_URL");
 const r=await fetch(u,{redirect:"error",signal:AbortSignal.timeout(20000)});
 if(r.status!==200)hold("ARCHIVE_HTTP");
 const archiveBytes=await readP7NoaaBoundedResponse(r,2200000);
 if(archiveBytes.length!==a.size_in_bytes)hold("ARCHIVE_SIZE");
 mkdirSync(dir,{mode:0o700});const zip=join(dir,"source.zip");writeFileSync(zip,archiveBytes,{mode:0o600,flag:"wx"});
 const names=execFileSync("unzip",["-Z1",zip],{encoding:"utf8",timeout:3000,maxBuffer:4096}).trim().split("\n").sort();
 if(JSON.stringify(names)!==JSON.stringify(["capture.json","metar.json","taf.json"]))hold("ARCHIVE_MEMBERS");
 function member(name:string,max:number){if(!lstatSync(zip).isFile())hold("ARCHIVE_FILE");return new TextDecoder("utf-8",{fatal:true}).decode(execFileSync("unzip",["-p",zip,name],{timeout:3000,maxBuffer:max}))}
 const meta=JSON.parse(member("capture.json",15000)),metar=member("metar.json",1000000),taf=member("taf.json",1000000);
 const durableReadAtUtc=new Date().toISOString();
 const report=verifyP7NoaaArchive({capture:meta,metar,taf,githubRunId:e.GITHUB_RUN_ID!,codeSha:e.P7_NOAA_CODE_SHA!,githubArtifactId:id,artifactDigest:digest,archiveBytes,
  artifactCreatedAtUtc:new Date(a.created_at).toISOString(),durableReadAtUtc,reviewedAtUtc:new Date().toISOString()});
 writeFileSync(join(dir,"review.json"),JSON.stringify(report),{flag:"wx",mode:0o600});
 console.log(JSON.stringify(report));
}
const mode=process.argv[2];
Promise.resolve().then(()=>mode==="capture"?capture():mode==="review"?review():hold("MODE")).catch(err=>{const m=String(err?.message??"");console.error(/^HOLD_P7_[A-Z0-9_]+$/.test(m)?m:"HOLD_P7_NOAA_CANARY_REDACTED");process.exitCode=2});
