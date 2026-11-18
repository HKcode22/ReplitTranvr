/** Offline sensitivity for native SOURCE wakes and existing bounded
 * rolling-controller geometry. NOT the actual signed policy epoch, live
 * readiness, or authorization. No network, DB, provider, or dispatch. */
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {loadFrozenCycle} from "./source_outage_accounting_v39.mjs";
import {modelSharedSourceRunners} from "./source_shared_runner_capacity_v39.mjs";
const M=60000,W=120*M,hold=s=>{throw Error("HOLD_WAKE_COVERAGE_"+s)};
const int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export function buildWakes({from,to,windowOrigin,rootOffsetMinutes=13,rootDelayMs=0,setupMs=30000,waveWorkMs=30000,handoffMs=30000,parentBusyMs=0,native=true,rolling=true,rootOutages=[],nativeOutages=[]}){
 if(![from,to,windowOrigin].every(Number.isSafeInteger)||to<=from||to-from>60*86400000||
 !int(rootOffsetMinutes,0,119)||!int(rootDelayMs,0,120*M)||!int(setupMs,0,15*M)||!int(waveWorkMs,0,5*M)||
 !int(handoffMs,0,10*M)||!int(parentBusyMs,0,60*M)||typeof native!=="boolean"||typeof rolling!=="boolean"||
 ![rootOutages,nativeOutages].every(a=>Array.isArray(a)&&a.length<=100&&a.every(x=>Number.isSafeInteger(x?.start)&&Number.isSafeInteger(x?.end)&&x.end>x.start)))hold("CONFIG");
 const inside=(xs,t)=>xs.some(x=>x.start<=t&&t<x.end),events=[],roots=[];
 if(native)for(let t=Math.ceil((from-5*M)/(10*M))*10*M+5*M;t<=to;t+=10*M)if(!inside(nativeOutages,t))events.push({t,kind:"NATIVE"});
 if(rolling){
  for(let start=windowOrigin+Math.floor((from-windowOrigin)/W)*W;start<=to;start+=W){
   const end=start+W,nominal=start+rootOffsetMinutes*M,epoch=nominal+rootDelayMs;
   if(inside(rootOutages,nominal)||epoch>=end||end-epoch<20*M){roots.push({start,status:"NO_ROOT_IN_MODELED_WINDOW",waves:0});continue;}
   const multi=end-epoch>=90*M,chainEnd=multi?end:Math.min(end,epoch+30*M);
   let at=epoch+setupMs,waves=0,hops=0;
   for(let hop=0;hop<(multi?4:1);hop++){
    const deadline=hop===0?Math.min(chainEnd,epoch+30*M):Math.min(chainEnd,at+30*M);
    if(deadline-at<15*M)break;
    hops++;
    let lastEnd=at;
    for(let k=0;k<8&&at<deadline-13*M;k++){
     // Conservative assumed time until SOURCE route is evaluated in the wave.
     const candidate=at+waveWorkMs;
     if(candidate<=deadline-12*M-M&&candidate>=from&&candidate<=to)events.push({t:candidate,kind:"ROLLING"});
     waves++;lastEnd=candidate;
     if(k===7||candidate+2*M>=deadline-13*M)break;
     at=candidate+2*M;
    }
    // Immediate successor after closing reconciliation is a scenario.
    // The earlier simple 10m model did not represent this bounded tail.
    if(!multi||hop===3||chainEnd-lastEnd<18*M||handoffMs>5*M)break;
    at=lastEnd+handoffMs+setupMs;
   }
   roots.push({start,status:multi?"FOUR_MODELED":"SINGLE_MODELED",waves,hops});
  }
 }
 events.sort((a,b)=>a.t-b.t||a.kind.localeCompare(b.kind));
 const accepted=[],suppressed={cooldownOrBusy:0};
 for(const e of events){
  // Existing route cooldown is measured from creation. Apply the same
  // conservative no-overlap/cooldown approximation to both wake sources.
  if(accepted.length&&e.t-accepted.at(-1).t<Math.max(10*M,parentBusyMs)){suppressed.cooldownOrBusy++;continue;}
  accepted.push(e);
 }
 const gaps=accepted.slice(1).map((e,i)=>e.t-accepted[i].t);
 return {wakes:accepted.map(x=>x.t),roots,counts:{native:accepted.filter(x=>x.kind==="NATIVE").length,rolling:accepted.filter(x=>x.kind==="ROLLING").length,...suppressed},maxInternalWakeGapMs:gaps.length?Math.max(...gaps):null};
}
export function analyze(plan,cfg){
 const first=Math.min(...plan.queries.map(q=>q.planned)),last=Math.max(...plan.queries.map(q=>q.planned));
 const w=buildWakes({from:first-90*M,to:last-15*M,windowOrigin:0,...cfg});
 const a=modelSharedSourceRunners(plan,{totalSlots:20,reservedSlots:4,appCap:24,leadMinutes:90,tailMinutes:15,startupMs:120000,explicitWakes:w.wakes});
 return {status:"MODELED_CONTROLLER_WAKE_COVERAGE_NOT_LIVE_OR_RELEASE_PROOF",native:cfg.native??true,rolling:cfg.rolling??true,rootOffsetMinutes:cfg.rootOffsetMinutes??13,
 rootDelayMs:cfg.rootDelayMs??0,waveWorkMs:cfg.waveWorkMs??30000,parentBusyMs:cfg.parentBusyMs??0,
 wakes:w.counts,maxInternalWakeGapMs:w.maxInternalWakeGapMs,rootModes:w.roots.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{}),
 counts:a.counts,primaryTest:a.byHorizonAndSplit["T-6h/test"],planned:a.planned,peakWaiting:a.peakWaiting,
 providerCalls:0,databaseWrites:0,dispatches:0,phase6PaidGo:false,permitReplay:false};
}
function main(){
 const p=loadFrozenCycle(process.cwd());
 for(const [native,rolling] of [[true,false],[false,true],[true,true]])for(const delay of [0,15,35,60,100])for(const busy of [0,12*M]){
  const a=analyze(p,{native,rolling,rootDelayMs:delay*M,parentBusyMs:busy});
  console.log(JSON.stringify({scenario:"bounded-controller-wake",...a}));
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv[2]!=="--frozen-cycle")hold("CLI_MODE");main();}
 catch(e){console.error(/^HOLD_WAKE_COVERAGE_[A-Z_]+$/.test(e?.message??"")?e.message:"HOLD_WAKE_COVERAGE_REDACTED");process.exitCode=2;}
}
