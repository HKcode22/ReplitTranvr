'use strict';
// Review only: invoke on the exact preserved compact review JSON, not a live DB.
const fs=require('node:fs'),crypto=require('node:crypto');
function compute(rows){
 const iso=t=>new Date(t*60000).toISOString();
 const assert=(v,m)=>{if(!v)throw Error(m)};
 assert(rows.length===31&&rows.every((d,i)=>d.runDayIndex===i+1),"calendar");
 function make(old){let a=[];for(const r of rows){const delta=old?(Date.parse(r.originalStartUtc)-Date.parse(r.startUtc))/60000:0;for(const s of r.segments){const start=Date.parse(s.startUtc)/60000+delta,end=Date.parse(s.endUtc)/60000+delta;assert(Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&end>start&&(end-start)%15===0,"segment");for(let t=start;t<end;t+=15)for(const [h,lag] of [["T-24h",1440],["T-6h",360],["T-90m",90]])for(const slot of ["HUB","MID_A","MID_B","REGIONAL"])a.push({day:r.runDayIndex,t:t-lag-15,h,slot})}}a.sort((x,y)=>x.t-y.t);assert(a.length===6144,"denominator");return a}
 function sim(a,lead,tail,interval,phase){let i=0,missed=0,peak=0,active=[];for(let t=Math.floor((a[0].t-105)/interval)*interval+phase;t<=a.at(-1).t;t+=interval){active=active.filter(x=>x>t);while(i<a.length&&a[i].t-t<15){i++;missed++}let av=Math.max(0,Math.min(8,24-active.length));while(av>0&&i<a.length&&a[i].t-t<=lead){active.push(a[i].t+tail);i++;av--}peak=Math.max(peak,active.length)}missed+=a.length-i;return {missed,peak}}
 function capacity(a){return {completionTails:[0,5,15,25,35,60].map(tail=>{const rs=Array.from({length:10},(_,p)=>sim(a,90,tail,10,p));return{tailMinutes:tail,phaseZeroMissed:rs[0].missed,worstMissed:Math.max(...rs.map(z=>z.missed)),peakInFlight:Math.max(...rs.map(z=>z.peak))}}),regularCadence:[5,10,15,20,30,60,90,120].map(gap=>{const rs=Array.from({length:gap},(_,p)=>sim(a,90,15,gap,p));return {intervalMinutes:gap,minMissed:Math.min(...rs.map(z=>z.missed)),maxMissed:Math.max(...rs.map(z=>z.missed))}})}}
 function workload(a){const inst=new Map(),daily=new Map();for(const r of a){inst.set(r.t,(inst.get(r.t)??0)+1);const day=iso(r.t).slice(0,10);daily.set(day,(daily.get(day)??0)+1)}const windows=[15,30,60,120,240,360,480,532,635,720,1440].map(n=>{let l=0,b={count:0};for(let i=0;i<a.length;i++){while(a[i].t-a[l].t>=n)l++;if(i-l+1>b.count)b={count:i-l+1,firstRequestUtc:iso(a[l].t),lastRequestUtc:iso(a[i].t)}}return {minutes:n,...b}});let maxDueDays=0,maxDueQueries=0;for(const t of inst.keys())for(const now of [t-90,t-15]){const due=a.filter(x=>x.t-now>=15&&x.t-now<=90);maxDueDays=Math.max(maxDueDays,new Set(due.map(x=>x.day)).size);maxDueQueries=Math.max(maxDueQueries,due.length)}return{templateCount:a.length,distinctRequestInstants:inst.size,sourceUtcDates:daily.size,peakTemplatesAtInstant:Math.max(...inst.values()),peakUtcDateTemplates:Math.max(...daily.values()),maxDueDays,maxDueQueries,windows}}
 const old=make(true),a=make(false);
 const start=Math.floor((a[0].t-105)/10)*10,end=Math.ceil((a.at(-1).t+180)/10)*10;
 function step(state,t,skip){let active=state.active.filter(x=>x>t),i=state.i,byDay=state.byDay,missed=state.missed;if(!skip){while(i<a.length&&a[i].t-t<15){missed++;if(byDay)byDay[a[i].day]=(byDay[a[i].day]??0)+1;i++}let av=Math.max(0,Math.min(8,24-active.length));while(av>0&&i<a.length&&a[i].t-t<=90){active.push(a[i].t+15);i++;av--}}return {i,active,missed,byDay}}
 let base={i:0,active:[],missed:0},snap=[];for(let t=start;t<=end;t+=10){snap.push(base);base=step(base,t,false)}const terminal=base;assert(base.i===6144&&base.missed===0,"baseline");
 const singleBlackouts=[60,90,120,240,350,490].map(outage=>{let worst={missed:-1};for(let k=0;k<snap.length;k++){const s=start+10*k;let z={...snap[k],byDay:{}};for(let i=k;i<snap.length;i++){const t=start+10*i;z=step(z,t,t<s+outage);const b=snap[i+1]??terminal;if(t>=s+outage&&z.i===b.i&&z.active.length===b.active.length&&z.active.every((v,j)=>v===b.active[j]))break}if(z.missed>worst.missed)worst={missed:z.missed,outageStart:iso(s),resume:iso(s+outage),byDay:z.byDay}}return{outageMinutes:outage,...worst}});
 return {schema:"v39.phase5.compact-calendar-runtime-capacity-review.v1",status:"MODEL_ONLY_NO_RELEASE",currentMain:"345f642e0df3266853a1f9d5e3f12fa262ddf1ee",runtimeProfile:{perTick:8,inFlight:24,maxLookaheadMinutes:90,minLookaheadMinutes:15,nominalTickMinutes:10},original:{capacity:capacity(old),workload:workload(old)},compact:{capacity:capacity(a),workload:workload(a),singleBlackouts,baselineMissed:0,baselineTickCount:snap.length},actualLatencyMeasured:false,physicalRetentionGuaranteed:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false}
}
if(require.main===module){
 if(process.argv.length!==3)throw Error('EXACT_RECEIPT_PATH_REQUIRED');
 const b=fs.readFileSync(process.argv[2]);
 const blob=crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
 if(blob!=='ee17a694594356e2b0c772545c490c198db11b42')throw Error('REVIEW_RECEIPT_DRIFT');
 const p=JSON.parse(b.toString('utf8'));
 if(p.status!=='PROSPECTIVE_COMPACT_REVIEW_NOT_RELEASE'||p.phase6PaidGo!==false)throw Error('REVIEW_SCOPE');
 console.log(JSON.stringify(compute(p.cases[0].rows),null,2));
}
module.exports={compute};
