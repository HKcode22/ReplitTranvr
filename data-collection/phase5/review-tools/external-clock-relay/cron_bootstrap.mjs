/** Owner-only cron-job.org bootstrap. Keys read from inherited env (set by
 * masked local prompts), never printed. No production GH credential sent to cron.
 * Creates one disabled job then validates exact destination/schedule and enables.
 * A failed/unknown request is not retried; inspect dashboard before repeating. */
import {cronJobSpec} from "./relay.mjs";
const key=process.env.TRAVNR_CRON_ACCOUNT_KEY,token=process.env.TRAVNR_CRON_RELAY_TOKEN;
if(typeof key!=="string"||key.length<16||!token)throw Error("HOLD_LOCAL_CREDENTIALS_REQUIRED");
const spec=cronJobSpec(token);
const root="https://api.cron-job.org";
async function req(method,path,body){
 const r=await fetch(root+path,{method,headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},redirect:"error",signal:AbortSignal.timeout(10000),...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)throw Error("HOLD_CRON_HTTP_"+r.status+"_INSPECT_DASHBOARD");
 return r.json();
}
function check(x,enabled){
 const j=x?.jobDetails;
 if(!j||Array.isArray(j)||j.title!==spec.title||j.url!==spec.url||j.enabled!==enabled||
    j.requestMethod!==1||j.schedule?.timezone!=="UTC"||j.schedule.expiresAt!==spec.schedule.expiresAt||
    JSON.stringify(j.schedule.minutes)!==JSON.stringify(spec.schedule.minutes)||
    j.extendedData?.body!==spec.extendedData.body)throw Error("HOLD_CRON_EXACT_READBACK");
 const h=j.extendedData?.headers;
 if(!h||h.Authorization!==spec.extendedData.headers.Authorization||
    h["X-GitHub-Api-Version"]!=="2022-11-28")throw Error("HOLD_CRON_HEADER_READBACK");
}
try{
 const list=await req("GET","/jobs");
 if(list.someFailed===true||!Array.isArray(list.jobs)||list.jobs.some(x=>x.title===spec.title||x.url===spec.url))throw Error("HOLD_EXISTING_CRON_JOB_INSPECT_NO_DUPLICATE");
 console.log("CRON_CREATE_DISABLED_ATTEMPT_NO_REPLAY");
 const a=await req("PUT","/jobs",{job:spec});
 if(!Number.isSafeInteger(a.jobId)||a.jobId<1)throw Error("HOLD_CRON_CREATE_ACK_UNKNOWN");
 console.log(JSON.stringify({stage:"CRON_DISABLED_JOB_ACK",jobId:a.jobId}));
 await new Promise(r=>setTimeout(r,1200));
 check(await req("GET","/jobs/"+a.jobId),false);
 console.log("CRON_ENABLE_ATTEMPT_NO_REPLAY");
 await req("PATCH","/jobs/"+a.jobId,{job:{enabled:true}});
 check(await req("GET","/jobs/"+a.jobId),true);
 console.log(JSON.stringify({status:"EXTERNAL_CLOCK_PILOT_ENABLED_NOT_EXECUTION_PROOF",jobId:a.jobId,expiresAtUtcInteger:spec.schedule.expiresAt,productionTokenSentToCron:false,providerCalls:0}));
}catch(e){const m=e?.message??"";console.error(/^HOLD_[A-Z0-9_]+$/.test(m)?m:"HOLD_CRON_UNKNOWN_INSPECT_DASHBOARD_NO_REPLAY");process.exitCode=2;}
