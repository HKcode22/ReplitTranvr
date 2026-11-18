import {execFileSync} from "node:child_process";
import {existsSync,openSync,writeFileSync,fsyncSync,closeSync,readFileSync,lstatSync} from "node:fs";
import {dirname,isAbsolute} from "node:path";
const C={"relay":"HKcode22/TravnrClockRelay","url":"https://api.github.com/repos/HKcode22/TravnrClockRelay/actions/workflows/external-clock.yml/dispatches","title":"Travnr isolated 90-minute external clock pilot","minutes":[2,12,22,32,42,52],"blobs":{"relay.mjs":"c2b0177710e93a86b2cff724eb87320a1d46a7db","cli.mjs":"d08a62dc8033b0b0f7edb8c3b8dc09d03de2746d","relay.test.mjs":"156932d1463a118a6090648ba7f74f1a09ea4e3c",".github/workflows/external-clock.yml":"9fcb3cafb28718384d501f8f9248b90746196415"}};
function makeCore(C){
 const hold=s=>{throw Error("HOLD_PILOT_"+s)}, eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b), id=x=>Number.isSafeInteger(x)&&x>0, sha=x=>typeof x==="string"&&/^[a-f0-9]{40}$/.test(x), iso=x=>new Date(x).toISOString(), ts=s=>{const n=Date.parse(s);if(typeof s!=="string"||!Number.isFinite(n))hold("UTC");return n;};
 const spec=(token,now)=>{if(!/^github_pat_[A-Za-z0-9_]{25,}$/.test(token||""))hold("NEW_FINE_GRAINED_RELAY_TOKEN_REQUIRED");return {title:C.title,url:C.url,enabled:false,saveResponses:true,requestMethod:1,requestTimeout:30,redirectSuccess:false,schedule:{timezone:"UTC",expiresAt:Number(iso(now+90*60000).slice(0,19).replace(/[-:T]/g,"")),hours:[-1],mdays:[-1],minutes:C.minutes,months:[-1],wdays:[-1]},notification:{onFailure:true,onFailureCount:1,onDisable:true,onSuccess:true,mode:1},extendedData:{headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28"},body:JSON.stringify({ref:"main",return_run_details:true})}};};
 function check(d,s,enabled,jobId){
  const j=d?.jobDetails,h=j?.extendedData?.headers??{},norm=Object.fromEntries(Object.entries(h).map(([k,v])=>[k.toLowerCase(),v]));
  if(!j||Array.isArray(j)||j.title!==s.title||j.url!==s.url||j.enabled!==enabled||(jobId!==undefined&&j.jobId!==jobId)||j.requestMethod!==1||j.saveResponses!==true||j.redirectSuccess!==false||j.requestTimeout!==30||j.auth?.enable!==false||j.extendedData?.body!==s.extendedData.body)hold("JOB_READBACK");
  for(const [k,v] of Object.entries(s.schedule))if(!eq(j.schedule?.[k],v))hold("SCHEDULE_READBACK");
  for(const [k,v] of Object.entries(s.notification))if(!eq(j.notification?.[k],v))hold("NOTIFICATION_READBACK");
  for(const [k,v] of Object.entries(s.extendedData.headers))if(norm[k.toLowerCase()]!==v)hold("HEADER_READBACK");
  if(Object.keys(norm).length!==4)hold("EXTRA_HEADERS");
  return j;
 }
 function expected(start,end){
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||end-start>91*60000)hold("PILOT_INTERVAL");
  const a=[];for(let t=Math.floor(start/60000)*60000+60000;t<end;t+=60000)if(C.minutes.includes(new Date(t).getUTCMinutes()))a.push(t/1000);return a;
 }
 function ack(row,detail){
  const d=detail?.jobHistoryDetails;if(!d||d.identifier!==row.identifier||d.jobId!==row.jobId||d.datePlanned!==row.datePlanned||d.date!==row.date||d.url!==C.url||d.status!==1||d.httpStatus!==200||typeof d.body!=="string"||d.body.length>10000)hold("CRON_DETAIL");
  let a;try{a=JSON.parse(d.body)}catch{hold("CRON_ACK_JSON")}
  const n=a?.workflow_run_id;if(!id(n)||a.run_url!=="https://api.github.com/repos/"+C.relay+"/actions/runs/"+n||a.html_url!=="https://github.com/"+C.relay+"/actions/runs/"+n)hold("CRON_ACK_ID");
  return n;
 }
 function receipt(run,jobs,log,rid,pin,planned,actual=planned){
  if(!sha(pin)||run?.id!==rid||run.head_sha!==pin||run.head_branch!=="main"||run.path!==".github/workflows/external-clock.yml"||run.event!=="workflow_dispatch"||run.run_attempt!==1)hold("GH_RUN_IDENTITY");
  if(run.status!=="completed")return {status:"GITHUB_PENDING",runId:rid};
  if(run.conclusion!=="success")return {status:"GITHUB_FAILED",runId:rid};
  if(!Array.isArray(jobs?.jobs)||jobs.total_count!==jobs.jobs.length)hold("GH_JOBS");
  const js=jobs.jobs.filter(j=>j.name==="independent-pulse");
  if(js.length!==1||js[0].run_id!==rid||js[0].head_sha!==pin||js[0].run_attempt!==1||js[0].status!=="completed"||js[0].conclusion!=="success"||!id(js[0].id)||!js[0].steps?.some(s=>s.name==="Run node cli.mjs"&&s.conclusion==="success"))hold("GH_JOB_IDENTITY");
  const out=[];for(const line of String(log).split(/\r?\n/)){const p=line.indexOf('{"status":"EXTERNAL_CLOCK_OBSERVED_NO_TARGET_DISPATCH"');if(p>=0){try{out.push(JSON.parse(line.slice(p).trim()))}catch{hold("GH_LOG_JSON")}}}
  if(out.length!==1)hold("GH_RECEIPT_COUNT");
  const o=out[0],created=ts(run.created_at),observed=ts(o.runnerObservedUtc),started=ts(js[0].started_at),finished=ts(js[0].completed_at);
  if(o.relayRunId!==rid||o.mode!=="CLOCK_ONLY"||ts(o.actualCreatedUtc)!==created||o.providerCallsByRelay!==0||o.databaseReadsByRelay!==0||o.databaseWritesByRelay!==0||o.paidAuthorityGranted!==false||!Number.isSafeInteger(o.creationToObservedMs)||o.creationToObservedMs<0||Math.abs(o.creationToObservedMs-(observed-created))>1000||observed<created||created<planned*1000-5000||created<actual*1000-5000||started<created-5000||observed<started-5000||observed>finished+1000)hold("GH_RECEIPT_SCOPE_CLOCK");
  return {status:"CLOCK_ONLY_PROVEN",runId:rid,jobId:js[0].id,createdUtc:iso(created),observedUtc:iso(observed),plannedToRunnerMs:observed-planned*1000,creationToRunnerMs:observed-created,cronActualToCreationMs:created-actual*1000};
 }
 function classify(plans,history,jobId,asOf,enableReadback=0){
  if(!Array.isArray(history)||history.length>100)hold("HISTORY_BOUND");
  const rows=history.filter(x=>x.jobId===jobId&&plans.includes(x.datePlanned));
  return plans.map(p=>{
   const x=rows.filter(r=>r.datePlanned===p);
   if(x.length>1)return {planned:p,status:"DUPLICATE_CRON_SLOT"};
   if(x.length===0)return {planned:p,status:p*1000<=enableReadback?"ENABLE_BOUNDARY_UNCERTAIN":asOf>=p*1000+120000?"OVERDUE_NOT_OBSERVED":"WAITING_FOR_CRON"};
   const r=x[0];if(!Number.isSafeInteger(r.date)||!Number.isSafeInteger(r.jitter)||typeof r.identifier!=="string"||!/^[A-Za-z0-9-]{1,100}$/.test(r.identifier)||r.url!==C.url||Math.abs((r.date-r.datePlanned)*1000-r.jitter)>2000)hold("CRON_HISTORY_IDENTITY");
   if(r.status!==1||r.httpStatus!==200)return {planned:p,status:"CRON_HTTP_NOT_SUCCESS",httpStatus:r.httpStatus};
   return {planned:p,status:"CRON_ACK_REQUIRES_GITHUB_PROOF",row:r,jitterMs:r.jitter};
  });
 }
 function summarize(plans,out,now,end,unexpected){
  const good=out.filter(r=>r.status==="CLOCK_ONLY_PROVEN"),latencies=good.map(r=>r.plannedToRunnerMs).sort((a,b)=>a-b);
  const late=latencies.filter(x=>x>120000).length,complete=now>=end&&plans.length>0&&good.length===plans.length&&unexpected===0;
  const percentile=p=>latencies.length?latencies[Math.ceil(p*latencies.length)-1]:null;
  return {expectedTotal:plans.length,observedDue:out.length,proven:good.length,unexpectedHistoryRows:unexpected,
   over120Seconds:late,p50PlannedToRunnerMs:percentile(.5),maxPlannedToRunnerMs:percentile(1),
   pilotExpired:now>=end,allSlotsProven:complete,allSlotsWithin120Seconds:complete&&late===0};
 }
 return {check,spec,expected,ack,receipt,classify,summarize,hold,sha,id,ts,iso};
}
function selftest(core,C){const a=core, t=Date.parse("2026-11-18T06:00:00Z"),p=t/1000+120,pin="a".repeat(40), checks=[];const test=(name,fn)=>{fn();checks.push(name)};const ok=x=>{if(!x)throw Error("TEST_FAILURE")}, rejects=f=>{let b=false;try{f()}catch{b=true}ok(b)};
 const s=a.spec("github_pat_"+"x".repeat(40),t);s.auth={enable:false};const d={jobDetails:{...JSON.parse(JSON.stringify(s)),jobId:5}};
 const row={jobId:5,identifier:"5-1",datePlanned:p,date:p+3,jitter:3200,url:C.url,status:1,httpStatus:200};
 const detail={jobHistoryDetails:{...row,body:JSON.stringify({workflow_run_id:9,run_url:"https://api.github.com/repos/"+C.relay+"/actions/runs/9",html_url:"https://github.com/"+C.relay+"/actions/runs/9"})}};
 const run={id:9,head_sha:pin,head_branch:"main",path:".github/workflows/external-clock.yml",event:"workflow_dispatch",run_attempt:1,status:"completed",conclusion:"success",created_at:a.iso((p+4)*1000)};
 const jobs={total_count:1,jobs:[{id:11,name:"independent-pulse",run_id:9,head_sha:pin,run_attempt:1,status:"completed",conclusion:"success",started_at:a.iso((p+6)*1000),completed_at:a.iso((p+21)*1000),steps:[{name:"Run node cli.mjs",conclusion:"success"}]}]};
 const o={status:"EXTERNAL_CLOCK_OBSERVED_NO_TARGET_DISPATCH",relayRunId:9,mode:"CLOCK_ONLY",actualCreatedUtc:run.created_at,runnerObservedUtc:a.iso((p+20)*1000),creationToObservedMs:16000,providerCallsByRelay:0,databaseReadsByRelay:0,databaseWritesByRelay:0,paidAuthorityGranted:false};
 test("exact disabled config",()=>ok(a.check(d,s,false).enabled===false));
 test("reject changed schedule",()=>rejects(()=>a.check({jobDetails:{...s,schedule:{...s.schedule,hours:[0]}}},s,false)));
 test("reject redirect",()=>rejects(()=>a.check({jobDetails:{...s,redirectSuccess:true}},s,false)));
 test("reject wrong notification",()=>rejects(()=>a.check({jobDetails:{...s,notification:{...s.notification,onDisable:false}}},s,false)));
 test("9 expected slots",()=>ok(a.expected(t,t+90*60000).length===9));
 test("exclude enable boundary",()=>ok(a.expected(p*1000,t+90*60000).length===8));
 test("missing slot overdue vs pending",()=>{ok(a.classify([p],[],5,p*1000+120000)[0].status==="OVERDUE_NOT_OBSERVED");ok(a.classify([p],[],5,p*1000+1)[0].status==="WAITING_FOR_CRON")});
 test("duplicate slot not green",()=>ok(a.classify([p],[row,row],5,t+600000)[0].status==="DUPLICATE_CRON_SLOT"));
 test("HTTP failure not green",()=>ok(a.classify([p],[{...row,httpStatus:503}],5,t+600000)[0].status==="CRON_HTTP_NOT_SUCCESS"));
 test("exact ack",()=>ok(a.ack(row,detail)===9));
 test("wrong repo ack rejected",()=>rejects(()=>a.ack(row,{jobHistoryDetails:{...detail.jobHistoryDetails,body:'{"workflow_run_id":9}'}})));
 test("exact zero-provider receipt and end-to-end delay",()=>ok(a.receipt(run,jobs,"prefix "+JSON.stringify(o),9,pin,p).plannedToRunnerMs===20000));
 test("pending not proof",()=>ok(a.receipt({...run,status:"in_progress"},null,"",9,pin,p).status==="GITHUB_PENDING"));
 test("wrong sha rejected",()=>rejects(()=>a.receipt({...run,head_sha:"b".repeat(40)},jobs,JSON.stringify(o),9,pin,p)));
 test("nonzero provider rejected",()=>rejects(()=>a.receipt(run,jobs,JSON.stringify({...o,providerCallsByRelay:1}),9,pin,p)));
 test("empty logs rejected",()=>rejects(()=>a.receipt(run,jobs,"",9,pin,p)));
 test("exact job identity",()=>{ok(a.check(d,s,false,5).jobId===5);rejects(()=>a.check(d,s,false,6));});
 test("missing auth flag is not verified",()=>rejects(()=>a.check({jobDetails:{...s,auth:undefined}},s,false)));
 test("enable boundary remains visible and not falsely complete",()=>{ok(a.classify([p],[],5,p*1000+120000,p*1000+5)[0].status==="ENABLE_BOUNDARY_UNCERTAIN");ok(!a.summarize([p],[],t+600000,t+500000,0).allSlotsProven);});
 test("cron actual timestamp and jitter reconcile",()=>{rejects(()=>a.classify([p],[{...row,jitter:999999}],5,t+600000));rejects(()=>a.receipt(run,jobs,JSON.stringify(o),9,pin,p,p+60));});
 test("runner timestamp must be inside actual job bounds",()=>rejects(()=>a.receipt(run,{total_count:1,jobs:[{...jobs.jobs[0],completed_at:a.iso((p+10)*1000)}]},JSON.stringify(o),9,pin,p)));
 test("all slots and timing are distinct gates",()=>{const z=a.summarize([p],[{status:"CLOCK_ONLY_PROVEN",plannedToRunnerMs:120001}],t+600000,t+500000,0);ok(z.allSlotsProven&&!z.allSlotsWithin120Seconds&&z.over120Seconds===1);ok(!a.summarize([p],[{status:"CLOCK_ONLY_PROVEN",plannedToRunnerMs:20}],t+600000,t+500000,1).allSlotsProven);});
 return checks;
}

const A=makeCore(C), path=process.env.TRAVNR_CLOCK_PILOT_JOURNAL;
const {hold,sha,id,iso,ts}=A;
function gh(args){try{const env={...process.env,GH_PROMPT_DISABLED:"1",GH_HOST:"github.com"};delete env.TRAVNR_CRON_ACCOUNT_KEY;delete env.TRAVNR_CRON_RELAY_TOKEN;return execFileSync("gh",args,{env,encoding:"utf8",timeout:30000,maxBuffer:4*1024*1024,stdio:["ignore","pipe","ignore"]}).trim()}catch{hold("GITHUB_READ_FAILED")}}
function ghGet(p){return JSON.parse(gh(["api","--hostname","github.com","--method","GET","repos/"+C.relay+p]));}
async function cron(method,p,body){
 const key=process.env.TRAVNR_CRON_ACCOUNT_KEY;if(typeof key!=="string"||key.length<16)hold("CRON_KEY_REQUIRED");
 const r=await fetch("https://api.cron-job.org"+p,{method,headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},redirect:"error",signal:AbortSignal.timeout(12000),...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)hold("CRON_HTTP_"+r.status+"_NO_BLIND_REPLAY");return r.json();
}
function privateJournal(checkExisting=false){
 if(!path||!isAbsolute(path))hold("ABSOLUTE_JOURNAL_REQUIRED");
 const d=lstatSync(dirname(path));
 if(!d.isDirectory()||d.isSymbolicLink()||(d.mode&0o077)!==0||d.uid!==process.getuid())hold("PRIVATE_JOURNAL_DIRECTORY_REQUIRED");
 if(checkExisting){const j=lstatSync(path);if(!j.isFile()||j.isSymbolicLink()||(j.mode&0o077)!==0||j.uid!==process.getuid()||j.size>65536)hold("PRIVATE_JOURNAL_FILE_REQUIRED");}
}
function record(x,first=false){privateJournal(!first);const value={...x,utc:iso(Date.now())},line=JSON.stringify(value)+"\n";
 const fd=openSync(path,first?"wx":"a",0o600);try{writeFileSync(fd,line);fsyncSync(fd);}finally{closeSync(fd);}console.log(line.trim());return value;
}
function journal(){privateJournal(true);return readFileSync(path,"utf8").trim().split("\n").map(JSON.parse);}
function expiry(z){z=String(z);if(!/^\d{14}$/.test(z))hold("EXPIRY");const n=Date.parse(z.slice(0,4)+"-"+z.slice(4,6)+"-"+z.slice(6,8)+"T"+z.slice(8,10)+":"+z.slice(10,12)+":"+z.slice(12,14)+"Z");if(!Number.isFinite(n)||Number(iso(n).slice(0,19).replace(/[-:T]/g,""))!==Number(z))hold("EXPIRY");return n;}
function clockPreflight(){
 if(gh(["variable","get","TRAVNR_RELAY_MODE","-R",C.relay])!=="CLOCK_ONLY")hold("NOT_CLOCK_ONLY");
 const pin=ghGet("/git/ref/heads/main")?.object?.sha;if(!sha(pin))hold("RELAY_PIN");
 for(const [f,h] of Object.entries(C.blobs)){if(ghGet("/contents/"+f+"?ref="+pin)?.sha!==h)hold("RELAY_CODE_DRIFT");}
 if(ghGet("/git/ref/heads/main")?.object?.sha!==pin)hold("RELAY_PIN_DRIFT");
 if(gh(["secret","list","-R",C.relay,"--json","name","--jq",".[].name"]).split("\n").some(x=>x.length))hold("RELAY_SECRETS_PRESENT_CLOCK_ONLY");
 return pin;
}
async function setup(){
 privateJournal();if(existsSync(path))hold("JOURNAL_EXISTS_INSPECT_NO_REPLAY");
 const pin=clockPreflight(),s=A.spec(process.env.TRAVNR_CRON_RELAY_TOKEN,Date.now());
 const l=await cron("GET","/jobs");if(l.someFailed!==false||!Array.isArray(l.jobs)||l.jobs.some(j=>j.title===C.title||j.url===C.url))hold("EXISTING_OR_INCOMPLETE_CRON_JOBS");
 record({stage:"CREATE_DISABLED_ATTEMPT_NO_REPLAY",pin,expiresAt:s.schedule.expiresAt},true);
 const ack=await cron("PUT","/jobs",{job:s});if(!id(ack.jobId))hold("CREATE_ACK");
 const n=ack.jobId;record({stage:"CREATE_ACK",jobId:n});await new Promise(r=>setTimeout(r,1200));
 A.check(await cron("GET","/jobs/"+n),s,false,n);
 if(clockPreflight()!==pin)hold("PIN_DRIFT_BEFORE_ENABLE");
 record({stage:"ENABLE_ATTEMPT_NO_REPLAY",jobId:n});await cron("PATCH","/jobs/"+n,{job:{enabled:true}});
 A.check(await cron("GET","/jobs/"+n),s,true,n);
 record({stage:"ENABLED",jobId:n,pin,expiresAt:s.schedule.expiresAt,productionTokenSentToCron:false,providerCalls:0});
}
async function inspect(){
 // Read-only reconciliation after any unknown setup boundary; do not repeat PUT/PATCH.
 const rows=journal(),last=rows.at(-1),l=await cron("GET","/jobs");
 if(l.someFailed!==false||!Array.isArray(l.jobs))hold("INCOMPLETE_CRON_JOBS");
 const xs=l.jobs.filter(j=>j.title===C.title||j.url===C.url);
 const brief=xs.map(j=>({jobId:j.jobId,enabled:j.enabled,exactTitle:j.title===C.title,exactUrl:j.url===C.url,expiresAt:j.schedule?.expiresAt??null,nextExecution:j.nextExecution??null}));
 console.log(JSON.stringify({status:"READ_ONLY_PILOT_INSPECTION_NO_REPLAY",journalStage:last.stage,journalJobId:last.jobId??null,matchingJobs:brief,providerCalls:0,paidAuthorityGranted:false}));
}
async function audit(){
 const rows=journal(),e=rows.at(-1);
 if(e.stage!=="ENABLED"||!id(e.jobId)||!sha(e.pin))hold("SETUP_NOT_VERIFIED");
 const started=rows.filter(x=>x.stage==="ENABLE_ATTEMPT_NO_REPLAY"&&x.jobId===e.jobId);
 if(started.length!==1||ts(started[0].utc)>ts(e.utc))hold("ENABLE_BOUNDARY");
 const end=expiry(e.expiresAt),now=Date.now(),plans=A.expected(ts(started[0].utc),end),hist=await cron("GET","/jobs/"+e.jobId+"/history");
 if(!Array.isArray(hist.history)||hist.history.length>100)hold("HISTORY_BOUND");
 const unexpected=hist.history.filter(x=>x.jobId!==e.jobId||!plans.includes(x.datePlanned)).length;
 const out=[],used=new Set();
 for(const x of A.classify(plans,hist.history,e.jobId,now,ts(e.utc))){
  if(x.planned*1000>now)continue;
  const base={plannedUtc:iso(x.planned*1000),status:x.status};
  if(!x.row){out.push({...base,...(x.httpStatus?{httpStatus:x.httpStatus}:{})});continue;}
  try{
   const detail=await cron("GET","/jobs/"+e.jobId+"/history/"+encodeURIComponent(x.row.identifier));
   const n=A.ack(x.row,detail);if(used.has(n))hold("DUPLICATE_GITHUB_ACK_ID");used.add(n);
   const run=ghGet("/actions/runs/"+n);
   let js=null,log="";
   if(run.status==="completed"&&run.conclusion==="success"){
    js=ghGet("/actions/runs/"+n+"/jobs?filter=latest&per_page=100");
    const j=js.jobs?.find(j=>j.name==="independent-pulse");
    if(!id(j?.id))hold("PULSE_JOB_MISSING");
    log=gh(["run","view",String(n),"-R",C.relay,"--job",String(j.id),"--log"]);
   }
   out.push({...base,cronJitterMs:x.jitterMs,cronActualUtc:iso(x.row.date*1000),...A.receipt(run,js,log,n,e.pin,x.planned,x.row.date)});
  }catch(err){out.push({...base,status:"EVIDENCE_HOLD",reason:/^HOLD_PILOT_[A-Z0-9_]+$/.test(err?.message||"")?err.message:"HOLD_PILOT_UNKNOWN"});}
  await new Promise(r=>setTimeout(r,250));
 }
 console.log(JSON.stringify({status:"CLOCK_ONLY_AUDIT_NOT_COLLECTION_PROOF",jobId:e.jobId,relayPin:e.pin,...A.summarize(plans,out,now,end,unexpected),rows:out,providerCalls:0,paidAuthorityGranted:false}));
}
try{
 const mode=process.argv[2];
 if(mode==="--self-test")console.log(JSON.stringify({status:"MOCK_TESTS_PASS",tests:selftest(A,C)}));
 else if(mode==="setup")await setup();
 else if(mode==="audit")await audit();
 else if(mode==="inspect")await inspect();
 else hold("MODE");
}catch(e){console.error(/^HOLD_PILOT_[A-Z0-9_]+$/.test(e?.message||"")?e.message:"HOLD_PILOT_UNKNOWN_INSPECT_NO_REPLAY");process.exitCode=2;}
