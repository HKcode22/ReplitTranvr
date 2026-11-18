/** Deterministic queue/admission sensitivity using the exact frozen SOURCE
 * opportunities. Shared runner allocation is not identical to DB-ready
 * worker capacity. No network, provider, DB, new admission or release authority. */
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {loadFrozenCycle} from "./source_outage_accounting_v39.mjs";
const MIN=60000,hold=s=>{throw Error("HOLD_SHARED_RUNNER_REVIEW_"+s)};
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const noGo={providerCalls:0,databaseWrites:0,dispatches:0,phase6PaidGo:false,permitReplay:false};
export function modelSharedSourceRunners(plan,cfg){
 const {totalSlots,reservedSlots,appCap,leadMinutes,tailMinutes,startupMs,phaseMinutes=5,batch=8,blackouts=[],explicitWakes=null}=cfg??{};
 if(!int(totalSlots,1,64)||!int(reservedSlots,0,totalSlots-1)||!int(appCap,1,24)||
    !int(leadMinutes,15,105)||!int(tailMinutes,0,60)||!int(startupMs,0,30*MIN)||
    !int(phaseMinutes,0,9)||!int(batch,1,8)||!Array.isArray(blackouts)||blackouts.length>100)hold("CONFIG");
 if(!Array.isArray(plan?.queries)||!plan.queries.length||plan.queries.length>6144)hold("PLAN");
 const all=[...plan.queries].sort((a,b)=>a.planned-b.planned||a.key.localeCompare(b.key));
 if(new Set(all.map(q=>q.key)).size!==all.length||all.some(q=>typeof q.key!=="string"||!Number.isSafeInteger(q.planned)||!Number.isSafeInteger(q.hard)||q.hard<q.planned))hold("PLAN_IDENTITY");
 const outage=blackouts.map(x=>{
  if(!Number.isSafeInteger(x?.start)||!Number.isSafeInteger(x?.end)||x.end<=x.start)hold("OUTAGES");
  return x;
 });
 const slots=totalSlots-reservedSlots,waiting=[],running=[],records=new Map();
 const first=all[0].planned,last=all.at(-1).planned;
 const begin=Math.ceil((first-leadMinutes*MIN-phaseMinutes*MIN)/(10*MIN))*10*MIN+phaseMinutes*MIN;
 const end=last-15*MIN;
 if(explicitWakes!==null&&(!Array.isArray(explicitWakes)||explicitWakes.length>100000||explicitWakes.some((t,i)=>!Number.isSafeInteger(t)||i>0&&t<=explicitWakes[i-1])))hold("WAKE_PLAN");
 const ticks=explicitWakes===null?Array.from({length:Math.max(0,Math.floor((end-begin)/(10*MIN))+1)},(_,i)=>begin+i*10*MIN):explicitWakes.filter(t=>t>=first-leadMinutes*MIN&&t<=end);
 let peakRunning=0,peakAcknowledged=0,peakWaiting=0,admitted=0,blockedTicks=0,lo=0,hi=0;
 // Acknowledged queued jobs occupy application capacity, but do not occupy
 // a physical runner until an actual slot is released. FIFO is a scenario,
 // not a guarantee of GitHub ordering. Never create a retry of a task.
 function allocate(at){
  while(waiting.length&&running.length<slots){
   const {q,tick}=waiting.shift(),ready=at+startupMs;
   const disposition=ready<=q.planned?"READY_BY_NOMINAL":ready<=q.hard?"READY_AFTER_NOMINAL_WITHIN_HARD_WINDOW":"READY_AFTER_HARD_WINDOW";
   records.set(q.key,{disposition,tick,allocated:at,ready});
   running.push({key:q.key,until:Math.max(ready,q.planned)+tailMinutes*MIN});
  }
  peakRunning=Math.max(peakRunning,running.length);
  peakAcknowledged=Math.max(peakAcknowledged,running.length+waiting.length);
  peakWaiting=Math.max(peakWaiting,waiting.length);
 }
 function drainTo(t){
  for(;;){
   const next=Math.min(...running.map(x=>x.until));
   if(next>t)break;
   for(let i=running.length-1;i>=0;i--)if(running[i].until<=next)running.splice(i,1);
   allocate(next);
  }
 }
 for(const tick of ticks){
  drainTo(tick);allocate(tick);
  if(outage.some(x=>x.start<=tick&&tick<x.end))continue;
  while(lo<all.length&&all[lo].planned<tick+15*MIN)lo++;
  hi=Math.max(lo,hi);while(hi<all.length&&all[hi].planned<=tick+leadMinutes*MIN)hi++;
  const eligible=all.slice(lo,hi).filter(q=>!records.has(q.key));
  const room=Math.max(0,appCap-running.length-waiting.length);
  if(room<Math.min(batch,eligible.length))blockedTicks++;
  for(const q of eligible.slice(0,Math.min(batch,room))){
   waiting.push({q,tick});records.set(q.key,{disposition:"ACKNOWLEDGED_QUEUED",tick});
   admitted++;
  }
  allocate(tick);
 }
 while(running.length||waiting.length){if(!running.length)hold("STALLED_QUEUE");drainTo(Math.min(...running.map(x=>x.until)));}
 const counts={},byHorizon={},bySplit={},byHorizonAndSplit={};let maxQueueMs=0,maxSetupLateMs=0;
 const inc=(o,k)=>{o[k]=(o[k]??0)+1;};
 for(const q of all){
  const x=records.get(q.key)??{disposition:"NOT_ADMITTED_WITHIN_PREARM_LEAD"};
  if(x.disposition==="ACKNOWLEDGED_QUEUED")hold("UNACCOUNTED_ACK");
  inc(counts,x.disposition);inc(byHorizon[q.horizon]??={},x.disposition);
  inc(bySplit[q.split]??={},x.disposition);inc(byHorizonAndSplit[q.horizon+"/"+q.split]??={},x.disposition);
  if(x.allocated!==undefined){maxQueueMs=Math.max(maxQueueMs,x.allocated-x.tick);maxSetupLateMs=Math.max(maxSetupLateMs,x.ready-q.planned);}
 }
 if(Object.values(counts).reduce((a,b)=>a+b,0)!==all.length||peakRunning>slots||peakAcknowledged>appCap)hold("ACCOUNTING");
 return {status:"SHARED_RUNNER_QUEUE_SCENARIO_NOT_OBSERVED_PROVIDER_LOSS",planned:all.length,admitted,
  config:{totalSlots,reservedSlots,physicalSourceSlots:slots,appCap,leadMinutes,tailMinutes,startupMs,phaseMinutes,batch,blackouts:outage.length,explicitWakeCount:explicitWakes===null?null:ticks.length},
  counts,byHorizon,bySplit,byHorizonAndSplit,peakRunning,peakAcknowledged,peakWaiting,blockedTicks,maxQueueMs,maxSetupLateMs,...noGo};
}
function main(){
 const p=loadFrozenCycle(process.cwd());
 // Compare observed platform scenarios; never infer account entitlement
 // from a single allocation sample. 120s is a deliberately assumed
 // startup sensitivity for readiness, not measured production PG setup.
 for(const total of [20,24])for(const reserved of [0,4,8])for(const tail of [3,15])for(const lead of [60,90]){
  for(const appCap of [...new Set([Math.min(total-reserved,24),24])]){
   const a=modelSharedSourceRunners(p,{totalSlots:total,reservedSlots:reserved,appCap,leadMinutes:lead,tailMinutes:tail,startupMs:120000});
   console.log(JSON.stringify({scenario:"shared-runner-capacity",...a,byHorizonAndSplit:{"T-6h/test":a.byHorizonAndSplit["T-6h/test"]}}));
  }
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv[2]!=="--frozen-cycle")hold("CLI_MODE");main();}
 catch(e){console.error(/^HOLD_SHARED_RUNNER_REVIEW_[A-Z_]+$/.test(e?.message??"")?e.message:"HOLD_SHARED_RUNNER_REVIEW_REDACTED");process.exitCode=2;}
}
