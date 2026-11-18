import {execFileSync} from "node:child_process";
import {existsSync,writeFileSync,appendFileSync,readFileSync} from "node:fs";
const C={"relay":"HKcode22/TravnrClockRelay","url":"https://api.github.com/repos/HKcode22/TravnrClockRelay/actions/workflows/external-clock.yml/dispatches","title":"Travnr isolated 90-minute external clock pilot","minutes":[2,12,22,32,42,52],"blobs":{"relay.mjs":"c2b0177710e93a86b2cff724eb87320a1d46a7db","cli.mjs":"d08a62dc8033b0b0f7edb8c3b8dc09d03de2746d","relay.test.mjs":"156932d1463a118a6090648ba7f74f1a09ea4e3c",".github/workflows/external-clock.yml":"9fcb3cafb28718384d501f8f9248b90746196415"}};
function makeCore(C){
 const hold=s=>{throw Error("HOLD_PILOT_"+s)}, eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b), id=x=>Number.isSafeInteger(x)&&x>0, sha=x=>typeof x==="string"&&/^[a-f0-9]{40}$/.test(x), iso=x=>new Date(x).toISOString(), ts=s=>{const n=Date.parse(s);if(typeof s!=="string"||!Number.isFinite(n))hold("UTC");return n;};
 const spec=(token,now)=>{if(!/^github_pat_[A-Za-z0-9_]{25,}$/.test(token||""))hold("NEW_FINE_GRAINED_RELAY_TOKEN_REQUIRED");return {title:C.title,url:C.url,enabled:false,saveResponses:true,requestMethod:1,requestTimeout:30,redirectSuccess:false,schedule:{timezone:"UTC",expiresAt:Number(iso(now+90*60000).slice(0,19).replace(/[-:T]/g,"")),hours:[-1],mdays:[-1],minutes:C.minutes,months:[-1],wdays:[-1]},notification:{onFailure:true,onFailureCount:1,onDisable:true,onSuccess:true,mode:1},extendedData:{headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28"},body:JSON.stringify({ref:"main",return_run_details:true})}};};
 function check(d,s,enabled){
  const j=d?.jobDetails,h=j?.extendedData?.headers??{},norm=Object.fromEntries(Object.entries(h).map(([k,v])=>[k.toLowerCase(),v]));
  if(!j||Array.isArray(j)||j.title!==s.title||j.url!==s.url||j.enabled!==enabled||j.requestMethod!==1||j.saveResponses!==true||j.redirectSuccess!==false||j.requestTimeout!==30||j.auth?.enable===true||j.extendedData?.body!==s.extendedData.body)hold("JOB_READBACK");
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
 function receipt(run,jobs,log,rid,pin,planned){
  if(!sha(pin)||run?.id!==rid||run.head_sha!==pin||run.head_branch!=="main"||run.path!==".github/workflows/external-clock.yml"||run.event!=="workflow_dispatch"||run.run_attempt!==1)hold("GH_RUN_IDENTITY");
  if(run.status!=="completed")return {status:"GITHUB_PENDING",runId:rid};
  if(run.conclusion!=="success")return {status:"GITHUB_FAILED",runId:rid};
  if(!Array.isArray(jobs?.jobs)||jobs.total_count!==jobs.jobs.length)hold("GH_JOBS");
  const js=jobs.jobs.filter(j=>j.name==="independent-pulse");
  if(js.length!==1||js[0].run_id!==rid||js[0].head_sha!==pin||js[0].run_attempt!==1||js[0].status!=="completed"||js[0].conclusion!=="success"||!id(js[0].id)||!js[0].steps?.some(s=>s.name==="Run node cli.mjs"&&s.conclusion==="success"))hold("GH_JOB_IDENTITY");
  const out=[];for(const line of String(log).split(/\r?\n/)){const p=line.indexOf('{"status":"EXTERNAL_CLOCK_OBSERVED_NO_TARGET_DISPATCH"');if(p>=0){try{out.push(JSON.parse(line.slice(p).trim()))}catch{hold("GH_LOG_JSON")}}}
  if(out.length!==1)hold("GH_RECEIPT_COUNT");
  const o=out[0],created=ts(run.created_at),observed=ts(o.runnerObservedUtc);
  if(o.relayRunId!==rid||o.mode!=="CLOCK_ONLY"||ts(o.actualCreatedUtc)!==created||o.providerCallsByRelay!==0||o.databaseReadsByRelay!==0||o.databaseWritesByRelay!==0||o.paidAuthorityGranted!==false||!Number.isSafeInteger(o.creationToObservedMs)||o.creationToObservedMs<0||Math.abs(o.creationToObservedMs-(observed-created))>1000||observed<created||created<planned*1000-5000)hold("GH_RECEIPT_SCOPE_CLOCK");
  return {status:"CLOCK_ONLY_PROVEN",runId:rid,jobId:js[0].id,createdUtc:iso(created),observedUtc:iso(observed),plannedToRunnerMs:observed-planned*1000,creationToRunnerMs:observed-created};
 }
 function classify(plans,history,jobId,asOf){
  if(!Array.isArray(history)||history.length>100)hold("HISTORY_BOUND");
  const rows=history.filter(x=>x.jobId===jobId&&plans.includes(x.datePlanned));
  return plans.map(p=>{
   const x=rows.filter(r=>r.datePlanned===p);
   if(x.length>1)return {planned:p,status:"DUPLICATE_CRON_SLOT"};
   if(x.length===0)return {planned:p,status:asOf>=p*1000+120000?"OVERDUE_NOT_OBSERVED":"WAITING_FOR_CRON"};
   const r=x[0];if(!Number.isSafeInteger(r.date)||!Number.isSafeInteger(r.jitter)||typeof r.identifier!=="string"||!/^[A-Za-z0-9-]{1,100}$/.test(r.identifier)||r.url!==C.url)hold("CRON_HISTORY_IDENTITY");
   if(r.status!==1||r.httpStatus!==200)return {planned:p,status:"CRON_HTTP_NOT_SUCCESS",httpStatus:r.httpStatus};
   return {planned:p,status:"CRON_ACK_REQUIRES_GITHUB_PROOF",row:r,jitterMs:r.jitter};
  });
 }
 return {check,spec,expected,ack,receipt,classify,hold,sha,id,ts,iso};
}
function selftest(core,C){const a=core, t=Date.parse("2026-11-18T06:00:00Z"),p=t/1000+120,pin="a".repeat(40), checks=[];const test=(name,fn)=>{fn();checks.push(name)};const ok=x=>{if(!x)throw Error("TEST_FAILURE")}, rejects=f=>{let b=false;try{f()}catch{b=true}ok(b)};
 const s=a.spec("github_pat_"+"x".repeat(40),t),d={jobDetails:JSON.parse(JSON.stringify(s))};
 const row={jobId:5,identifier:"5-1",datePlanned:p,date:p+3,jitter:3200,url:C.url,status:1,httpStatus:200};
 const detail={jobHistoryDetails:{...row,body:JSON.stringify({workflow_run_id:9,run_url:"https://api.github.com/repos/"+C.relay+"/actions/runs/9",html_url:"https://github.com/"+C.relay+"/actions/runs/9"})}};
 const run={id:9,head_sha:pin,head_branch:"main",path:".github/workflows/external-clock.yml",event:"workflow_dispatch",run_attempt:1,status:"completed",conclusion:"success",created_at:a.iso((p+4)*1000)};
 const jobs={total_count:1,jobs:[{id:11,name:"independent-pulse",run_id:9,head_sha:pin,run_attempt:1,status:"completed",conclusion:"success",steps:[{name:"Run node cli.mjs",conclusion:"success"}]}]};
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
 return checks;
}

const A=makeCore(C), path=process.env.TRAVNR_CLOCK_PILOT_JOURNAL;
const {hold,sha,id,iso,ts}=A;
function gh(args){try{return execFileSync("gh",args,{encoding:"utf8",timeout:30000,maxBuffer:4*1024*1024,stdio:["ignore","pipe","pipe"]}).trim()}catch{hold("GITHUB_READ_FAILED")}}
function ghGet(p){return JSON.parse(gh(["api","repos/"+C.relay+p]));}
async function cron(method,p,body){
 const key=process.env.TRAVNR_CRON_ACCOUNT_KEY;if(typeof key!=="string"||key.length<16)hold("CRON_KEY_REQUIRED");
 const r=await fetch("https://api.cron-job.org"+p,{method,headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},redirect:"error",signal:AbortSignal.timeout(12000),...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)hold("CRON_HTTP_"+r.status+"_NO_BLIND_REPLAY");return r.json();
}
function record(x,first=false){const line=JSON.stringify({...x,utc:iso(Date.now())})+"\n";if(first)writeFileSync(path,line,{flag:"wx",mode:0o600});else appendFileSync(path,line,{mode:0o600});console.log(line.trim());}
function clockPreflight(){
 if(gh(["variable","get","TRAVNR_RELAY_MODE","-R",C.relay])!=="CLOCK_ONLY")hold("NOT_CLOCK_ONLY");
 const pin=ghGet("/git/ref/heads/main")?.object?.sha;if(!sha(pin))hold("RELAY_PIN");
 for(const [f,h] of Object.entries(C.blobs)){if(ghGet("/contents/"+f+"?ref="+pin)?.sha!==h)hold("RELAY_CODE_DRIFT");}
 if(ghGet("/git/ref/heads/main")?.object?.sha!==pin)hold("RELAY_PIN_DRIFT");
 if(gh(["secret","list","-R",C.relay,"--json","name","--jq",".[].name"]).split("\n").some(x=>x.length))hold("RELAY_SECRETS_PRESENT_CLOCK_ONLY");
 return pin;
}
async function setup(){
 if(!path||existsSync(path))hold("JOURNAL_EXISTS_INSPECT_NO_REPLAY");
 const pin=clockPreflight(),s=A.spec(process.env.TRAVNR_CRON_RELAY_TOKEN,Date.now());
 const l=await cron("GET","/jobs");if(l.someFailed!==false||!Array.isArray(l.jobs)||l.jobs.some(j=>j.title===C.title||j.url===C.url))hold("EXISTING_OR_INCOMPLETE_CRON_JOBS");
 record({stage:"CREATE_DISABLED_ATTEMPT_NO_REPLAY",pin,expiresAt:s.schedule.expiresAt},true);
 const ack=await cron("PUT","/jobs",{job:s});if(!id(ack.jobId))hold("CREATE_ACK");
 const n=ack.jobId;record({stage:"CREATE_ACK",jobId:n});await new Promise(r=>setTimeout(r,1200));
 A.check(await cron("GET","/jobs/"+n),s,false);
 if(clockPreflight()!==pin)hold("PIN_DRIFT_BEFORE_ENABLE");
 record({stage:"ENABLE_ATTEMPT_NO_REPLAY",jobId:n});await cron("PATCH","/jobs/"+n,{job:{enabled:true}});
 A.check(await cron("GET","/jobs/"+n),s,true);
 record({stage:"ENABLED",jobId:n,pin,expiresAt:s.schedule.expiresAt,productionTokenSentToCron:false,providerCalls:0});
}
async function audit(){
 if(!path||!existsSync(path))hold("MISSING_PILOT_JOURNAL");
 const rows=readFileSync(path,"utf8").trim().split("\n").map(JSON.parse), e=rows.at(-1);
 if(e.stage!=="ENABLED"||!id(e.jobId)||!sha(e.pin))hold("SETUP_NOT_VERIFIED");
 const z=String(e.expiresAt);if(!/^\d{14}$/.test(z))hold("EXPIRY");
 const end=Date.parse(z.slice(0,4)+"-"+z.slice(4,6)+"-"+z.slice(6,8)+"T"+z.slice(8,10)+":"+z.slice(10,12)+":"+z.slice(12,14)+"Z");
 const now=Date.now(), plans=A.expected(ts(e.utc),end), hist=await cron("GET","/jobs/"+e.jobId+"/history");
 const out=[],used=new Set();
 for(const x of A.classify(plans,hist.history,e.jobId,now)){
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
   out.push({...base,cronJitterMs:x.jitterMs,cronActualUtc:iso(x.row.date*1000),...A.receipt(run,js,log,n,e.pin,x.planned)});
  }catch(err){out.push({...base,status:"EVIDENCE_HOLD",reason:/^HOLD_PILOT_[A-Z0-9_]+$/.test(err?.message||"")?err.message:"HOLD_PILOT_UNKNOWN"});}
  await new Promise(r=>setTimeout(r,250));
 }
 const good=out.filter(r=>r.status==="CLOCK_ONLY_PROVEN"), late=good.filter(r=>r.plannedToRunnerMs>120000);
 console.log(JSON.stringify({status:"CLOCK_ONLY_AUDIT_NOT_COLLECTION_PROOF",jobId:e.jobId,relayPin:e.pin,expectedTotal:plans.length,observedDue:out.length,proven:good.length,over120Seconds:late.length,pilotExpired:now>=end,allSlotsProven:now>=end&&plans.length>0&&good.length===plans.length,rows:out,providerCalls:0,paidAuthorityGranted:false}));
}
try{
 const mode=process.argv[2];
 if(mode==="--self-test")console.log(JSON.stringify({status:"MOCK_TESTS_PASS",tests:selftest(A,C)}));
 else if(mode==="setup")await setup();
 else if(mode==="audit")await audit();
 else hold("MODE");
}catch(e){console.error(/^HOLD_PILOT_[A-Z0-9_]+$/.test(e?.message||"")?e.message:"HOLD_PILOT_UNKNOWN_INSPECT_NO_REPLAY");process.exitCode=2;}
