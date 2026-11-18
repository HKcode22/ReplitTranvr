#!/usr/bin/env node
/** Detached owner-side backup probe, no dependencies. Mac launchd calls observe only.
 * No database, provider key, paid lanes, or automatic production dispatch.
 * One manual canary per private state directory, no replay after unknown POST. */
import {mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,lstatSync,readFileSync} from "node:fs";
import {resolve,join} from "node:path";
import {homedir} from "node:os";
import {randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const REPO="HKcode22/ReplitTranvr",CANARY="phase5-autonomous-clock-canary-no-provider.yml";
const MIN=60000, SHA=/^[a-f0-9]{40}$/, ID=x=>Number.isSafeInteger(x)&&x>0;
const LANES=Object.freeze([
 {key:"primary",file:"phase5-primary-fids-expiry-no-provider.yml",job:"primary-fids-expiry",step:"Verify exact main and execute only bounded primary FIDS expiry",warn:30,critical:60},
 {key:"heartbeat",file:"phase6-autonomous-gh-controller-heartbeat-no-provider.yml",job:"actual-main-nonpaid-controller-heartbeat",step:"Read only GH workflow history and primary expiry execution metadata",warn:45,critical:90}
]);
const fail=x=>{throw Error("HOLD_MAC_WATCH_"+x)};
const ms=x=>{const n=Date.parse(x);if(!Number.isFinite(n))fail("INVALID_TIME");return n;};
const iso=n=>new Date(n).toISOString();
const age=(now,t)=>{const n=now-ms(t);if(n< -5000)fail("CLOCK_SKEW");return Math.max(0,Math.round(n/MIN*10)/10);};
function exactRun(x,lane,pin,now){
 if(!ID(x?.id)||x.path!==".github/workflows/"+lane.file||x.head_branch!=="main"||!SHA.test(x.head_sha??"")||
    !["schedule","workflow_dispatch"].includes(x.event)||!Number.isInteger(x.run_attempt)||x.run_attempt<1||
    !["queued","in_progress","waiting","pending","requested","completed"].includes(x.status))fail("RUN_IDENTITY");
 age(now,x.created_at);
 return x;
}
function latestRows(x,lane,pin,now){
 if(!Number.isSafeInteger(x?.total_count)||x.total_count<0||!Array.isArray(x.workflow_runs)||
    x.workflow_runs.length!==Math.min(x.total_count,10)||new Set(x.workflow_runs.map(y=>y.id)).size!==x.workflow_runs.length)fail("HISTORY");
 return x.workflow_runs.map(y=>exactRun(y,lane,pin,now)).sort((a,b)=>ms(b.created_at)-ms(a.created_at)||b.id-a.id);
}
function successfulStep(x,r,lane,now){
 if(!Number.isSafeInteger(x?.total_count)||x.total_count<1||!Array.isArray(x.jobs)||x.jobs.length!==x.total_count||x.total_count>100)fail("JOBS");
 const matches=x.jobs.filter(j=>j.name===lane.job);
 if(matches.length!==1)return null;
 const j=matches[0];
 if(!ID(j.id)||j.run_id!==r.id||j.head_sha!==r.head_sha||j.run_attempt!==r.run_attempt||j.status!=="completed"||j.conclusion!=="success")return null;
 const steps=j.steps?.filter(s=>s.name===lane.step&&s.status==="completed"&&s.conclusion==="success")??[];
 if(steps.length!==1)return null;
 const completed=ms(j.completed_at);
 if(completed<ms(r.created_at))fail("JOB_TIME");
 return {runId:r.id,jobId:j.id,completedUtc:iso(completed),ageMinutes:age(now,iso(completed)),event:r.event,attempt:r.run_attempt};
}
async function observe(pin,{get,now=Date.now}){
 if(!SHA.test(pin??"")||typeof get!=="function")fail("PIN");
 const start=now(),main=await get("/git/ref/heads/main");
 if(main?.object?.sha!==pin)return {status:"MAIN_MOVED_REVIEW_REQUIRED",expectedMain:pin,observedMain:main?.object?.sha??null,observedUtc:iso(start),permitDispatch:false};
 const lanes=[];
 for(const lane of LANES){
  const all=latestRows(await get("/actions/workflows/"+lane.file+"/runs?branch=main&per_page=10"),lane,pin,now());
  const current=all.filter(r=>r.head_sha===pin),latest=current[0],success=current.find(r=>r.status==="completed"&&r.conclusion==="success"&&r.run_attempt===1);
  let receipt=null;
  if(success)receipt=successfulStep(await get("/actions/runs/"+success.id+"/jobs?filter=latest&per_page=100"),success,lane,now());
  const recentFailure=latest?.status==="completed"&&latest.conclusion!=="success"&&latest.conclusion!=="skipped";
  const level=recentFailure?"CRITICAL_FAILED_RUN":!receipt?"UNKNOWN_NO_VERIFIED_STEP":receipt.ageMinutes>=lane.critical?"CRITICAL_STALE_STEP":receipt.ageMinutes>=lane.warn?"WARN_STALE_STEP":"RECENT_STEP_ONLY";
  lanes.push({lane:lane.key,level,latest:latest?{runId:latest.id,event:latest.event,status:latest.status,conclusion:latest.conclusion,createdUtc:latest.created_at,ageMinutes:age(now(),latest.created_at)}:null,lastObservedSuccessfulStep:receipt});
 }
 return {status:"READONLY_GITHUB_METADATA_NOT_COLLECTION_OR_DELETION_PROOF",reviewedMain:pin,observedUtc:iso(now()),lanes,permitDispatch:false,providerCalls:0,databaseReads:0,databaseWrites:0};
}
function checkAck(a,pin){
 if(!ID(a?.workflow_run_id)||a.run_url!==ROOT+"/actions/runs/"+a.workflow_run_id||
    a.html_url!=="https://github.com/"+REPO+"/actions/runs/"+a.workflow_run_id)fail("UNKNOWN_ACK_NO_RETRY");
 return {status:"MAC_CANARY_ACK_NOT_EXECUTION_PROOF",reviewedMain:pin,runId:a.workflow_run_id,url:a.html_url,providerCalls:0,databaseWrites:0,permitPaid:false};
}
async function canary(pin,{get,reserve,post,save,now=Date.now,randomChain}){
 if(!SHA.test(pin??"")||typeof randomChain!=="function")fail("PIN");
 if((await get("/git/ref/heads/main"))?.object?.sha!==pin)fail("MAIN_MOVED");
 const chain=randomChain();if(!/^[a-f0-9]{32}$/.test(chain))fail("CHAIN");
 const pending={status:"DISPATCH_ATTEMPT_LATCHED_UNKNOWN_UNTIL_ACK",reviewedMain:pin,chain,attemptUtc:iso(now())};
 // Exclusive, durable local latch before the only POST; no retry after any uncertainty.
 reserve(pending);
 if((await get("/git/ref/heads/main"))?.object?.sha!==pin)fail("MAIN_MOVED_AFTER_LATCH");
 const inputs={mode:"BOUNDED_HANDOFF",handoff_confirm:"MEASURE_THREE_GITHUB_HANDOFFS_NO_PROVIDER_NO_DB",approved_main_sha:pin,chain_id:chain,hop:"0",parent_run_id:"0",sent_at_utc:"",deadline_utc:iso(now()+20*MIN)};
 let ack;
 try{ack=checkAck(await post("/actions/workflows/"+CANARY+"/dispatches",{ref:"main",return_run_details:true,inputs}),pin);}
 catch{fail("UNKNOWN_ACK_NO_RETRY");}
 const result={...ack,chain,attemptUtc:pending.attemptUtc};
 save(result);return result;
}

export function localHealthFingerprint(value){
 if(!value||typeof value!=="object")return "NO_PRIOR_RECEIPT";
 return [value.status,...(Array.isArray(value.lanes)?value.lanes.map(l=>l.lane+":"+l.level):[])].join("|");
}
export function localGap(previous,observedUtc){
 if(!previous?.observedUtc)return null;
 const a=Date.parse(previous.observedUtc),b=Date.parse(observedUtc);
 if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)return {status:"LOCAL_CLOCK_OR_RECEIPT_UNKNOWN"};
 const minutes=Math.round((b-a)/6000)/10;
 return minutes>20?{status:"LOCAL_MONITOR_GAP_OBSERVED",minutes}:null;
}
export function launchAgentXml({node,script,dir,pin}){
 if(!SHA.test(pin??"")||[node,script,dir].some(v=>typeof v!=="string"||!v.startsWith("/")||/[\x00-\x1f]/.test(v)))fail("LAUNCH_AGENT_PATHS");
 const esc=v=>v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");
 const string=v=>"<string>"+esc(v)+"</string>";
 return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n'+
  '<key>Label</key>'+string("com.travnr.github-watch")+'\n<key>ProgramArguments</key><array>'+[node,script,"observe-notify",pin,dir].map(string).join("")+'</array>\n'+
  '<key>RunAtLoad</key><true/>\n<key>StartInterval</key><integer>600</integer>\n<key>StandardOutPath</key>'+string("/dev/null")+'\n'+
  '<key>StandardErrorPath</key>'+string(join(dir,"launchd-errors.log"))+'\n</dict></plist>\n';
}
export {observe,canary,LANES};
async function get(path){
 const res=await fetch(ROOT+path,{headers:{Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},redirect:"error",signal:AbortSignal.timeout(10000)});
 // No retries and no credentials for public metadata. Rate limit/unavailable is UNKNOWN.
 if(!res.ok)fail("PUBLIC_API_UNAVAILABLE_"+res.status);
 return res.json();
}
function privateDir(path){
 mkdirSync(path,{recursive:true,mode:0o700});
 const x=lstatSync(path);
 if(!x.isDirectory()||x.isSymbolicLink()||(x.mode&0o077)!==0||x.uid!==process.getuid())fail("PRIVATE_STATE_DIR");
}
function fresh(path,value){
 const fd=openSync(path,"wx",0o600);
 try{writeFileSync(fd,JSON.stringify(value)+"\n");fsyncSync(fd);}finally{closeSync(fd);}
}
function atom(path,value){
 const temp=path+"."+randomBytes(8).toString("hex")+".tmp";
 fresh(temp,value);renameSync(temp,path);
}
async function main(){
 const [mode,pin,custom]=process.argv.slice(2);
 if(!["observe","observe-notify","canary","inspect","launch-agent"].includes(mode)||!SHA.test(pin??"")||process.argv.length>5)fail("USAGE");
 const dir=resolve(custom??join(homedir(),".travnr-github-watch"));
 privateDir(dir);
 if(mode==="inspect"){
  console.log(readFileSync(join(dir,"canary.json"),"utf8"));return;
 }
 if(mode==="launch-agent"){
  if(process.platform!=="darwin")fail("MAC_ONLY");
  console.log(launchAgentXml({node:process.execPath,script:fileURLToPath(import.meta.url),dir,pin}));return;
 }
 if(mode==="observe"||mode==="observe-notify"){
  let previous=null;
  try{previous=JSON.parse(readFileSync(join(dir,"latest.json"),"utf8"));}catch{}
  let result;try{result=await observe(pin,{get});}
  catch(e){result={status:"METADATA_UNAVAILABLE_NOT_HEALTHY",observedUtc:iso(Date.now()),reviewedMain:pin,reason:/^HOLD_MAC_WATCH_[A-Z0-9_]+$/.test(e.message)?e.message:"NETWORK_OR_RESPONSE_UNKNOWN",permitDispatch:false};}
  const gap=localGap(previous,result.observedUtc);
  const fingerprint=localHealthFingerprint(result);
  const old=localHealthFingerprint(previous);
  const degraded=result.status!=="READONLY_GITHUB_METADATA_NOT_COLLECTION_OR_DELETION_PROOF"||
    result.lanes?.some(l=>l.level!=="RECENT_STEP_ONLY");
  const changed=fingerprint!==old;
  if(gap)result.localMonitorGap=gap;
  if(mode==="observe-notify"&&process.platform==="darwin"&&(gap||changed&&(degraded||previous))){
   // Notification is best-effort. Do not pass shell syntax or arbitrary metadata.
   const message=gap?"Local watcher gap detected; inspect latest.json":
    degraded?"GitHub scheduling requires attention; inspect latest.json":"GitHub metadata state changed; inspect latest.json";
   try{execFileSync("/usr/bin/osascript",["-e",'on run argv\n display notification (item 1 of argv) with title "Travnr scheduler"\nend run',message],{timeout:5000,stdio:"ignore"});result.notificationAttempt="COMMAND_ACKNOWLEDGED_NOT_DELIVERY_PROOF";}
   catch{result.notificationAttempt="UNVERIFIED_OR_UNAVAILABLE";}
  }
  atom(join(dir,"latest.json"),result);console.log(JSON.stringify(result));return;
 }
 // Authenticated gh is used ONLY for the explicitly requested test dispatch.
 // Do not pass provider or database secrets to the child process.
 const safe={PATH:process.env.PATH,HOME:process.env.HOME,GH_PROMPT_DISABLED:"1",GH_HOST:"github.com",
  ...(process.env.GH_CONFIG_DIR?{GH_CONFIG_DIR:process.env.GH_CONFIG_DIR}:{}),
  ...(process.env.GH_TOKEN?{GH_TOKEN:process.env.GH_TOKEN}:{}),
  ...(process.env.GITHUB_TOKEN?{GITHUB_TOKEN:process.env.GITHUB_TOKEN}:{})};
 const latch=join(dir,"canary.json");
 const result=await canary(pin,{get,randomChain:()=>randomBytes(16).toString("hex"),
  reserve:x=>fresh(latch,x),save:x=>atom(latch,x),post:async(path,body)=>{
   const out=execFileSync("gh",["api","--hostname","github.com","--method","POST","repos/"+REPO+path,"--input","-"],
    {input:JSON.stringify(body),env:safe,timeout:20000,maxBuffer:32768,stdio:["pipe","pipe","ignore"]});
   return JSON.parse(out.toString("utf8"));
  }});
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error(/^HOLD_MAC_WATCH_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_MAC_WATCH_LOCAL_STATE_OR_UNKNOWN_NO_RETRY");process.exitCode=2;});
}
