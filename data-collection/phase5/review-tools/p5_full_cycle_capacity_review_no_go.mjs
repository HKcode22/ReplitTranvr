// Review only: run from the repository root against exact 31 committed metadata plans.
// No provider, DB, GitHub API, deployment, file writes or approval.
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const PLAN_BLOBS=[
 [
  "data-collection/phase5/planning/phase6-source-day-01.json",
  "74b153f0f9f9c860196d9622aaa48b93048bb95f"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-02.json",
  "1c07214373af2667f7bd6fdf7e8aab6669aa6ac0"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-03.json",
  "74fa3937da34aacf4df733aa650b71d45b6c60c1"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-04.json",
  "b0113a1574cbb1e50cdd8229b7f50f2f77fc06d6"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-05.json",
  "3cb3377929c2783c517604a6a21a2678ba6affea"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-06.json",
  "40b38c79a6eb8b0aa3ae1e079ce88fd53225dbaa"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-07.json",
  "1c9f90bad695a9f91eb3b27259fe5789530845c8"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-08.json",
  "11ef708ca7ecfecc1bd13da0fda5181c08c76a5a"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-09.json",
  "4ed10514418cb60a40f5858b9bfee1f7979d7392"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-10.json",
  "f4ad7f92ffaab18f8d63d1490204aff28c61bbba"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-11.json",
  "1a98b3d61362ee08459769f65a55a27e46b01607"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-12.json",
  "143b7fa5f0a3d656096e25b4eb2cf69391e90470"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-13.json",
  "bb2a0374aa67a5bd71f2140e356e0b74e4d69573"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-14.json",
  "7d17a9deb9728308c66c9cb79bc0f55dbff24db8"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-15.json",
  "1a23affd9decdb19a88afea577e3f23f288178ad"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-16.json",
  "6159a355d25862b4a8eae266c6e9211b71bcb69e"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-17.json",
  "b678ddc14a9ad0922809f0bbfc128572ce7b7aac"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-18.json",
  "baafb6cdb599f3ac37c5a354abd2293035ce4c1c"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-19.json",
  "1ddfe860930dea9216e437e22fdb49c8163a9113"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-20.json",
  "99119a63b65cd166b9a462c64b748f1b7d94caed"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-21.json",
  "7fbb53550f71013802ffc4fa0d7bb37498eacd5b"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-22.json",
  "b969161fc5d0d13294093cdc594bc2eba5596777"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-23.json",
  "6ea511a8958048e3e93bbc66a84ab741bfeefc5c"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-24.json",
  "c3be69585a5935e67a9ce4593152fd4b08d72460"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-25.json",
  "b0d59cf90558d9684797588dd09f82523f64f3f7"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-26.json",
  "f8271a4d1d120963e2ee197b382cf61d9b8d0674"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-27.json",
  "2077b16702b46d99a4e8cc09b6ef854ea860bfff"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-28.json",
  "0684a118058436308d4ebdce98b86d1850768e72"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-29.json",
  "eb3fbe72e532c8322273756f71d3879d08d80022"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-30.json",
  "eb57345e82fe0b83a357b5ee4ace8451e0a51397"
 ],
 [
  "data-collection/phase5/planning/phase6-source-day-31.json",
  "149f3ecdb90db14ca7e633e28ca0c497fcf297d4"
 ]
];

const ORIGIN=Date.parse("2026-11-20T00:00:00Z");
function requireTrue(ok,label){if(!ok)throw Error("HOLD_CAPACITY_REVIEW_"+label);}
function baseline(ts,lead,cap,tail){
 const lo=Math.ceil((ts[0]-lead-5)/10)*10+5,hi=ts.at(-1)-15;
 const ticks=[];for(let t=lo;t<=hi;t+=10)ticks.push(t);
 const initial={p:0,active:[],miss:0,admitted:0,prep:0,peak:0,blocked:0};
 function step(s,t,skip){
  s.active=s.active.filter(x=>x>t);
  while(s.p<ts.length&&ts[s.p]<t+15){s.p++;s.miss++;}
  if(!skip){
   let eligible=0;while(s.p+eligible<ts.length&&ts[s.p+eligible]<=t+lead)eligible++;
   const n=Math.min(8,cap-s.active.length,eligible);
   if(n<Math.min(8,eligible))s.blocked++;
   for(let j=0;j<n;j++){const x=ts[s.p++];s.active.push(x+tail);s.admitted++;s.prep+=x-t;}
   s.peak=Math.max(s.peak,s.active.length);
  }
  return s;
 }
 const clone=s=>({...s,active:[...s.active]});
 let s=clone(initial);const before=[],after=[];
 for(const t of ticks){before.push(clone(s));step(s,t,false);after.push(clone(s));}
 const totalMiss=s.miss+(ts.length-s.p);
 // Independent full replay for a selected interruption, used to check the
 // accelerated exact-state convergence calculation at each returned worst.
 function fullReplay(start,duration){
  let a=clone(initial);
  for(const t of ticks)step(a,t,t>=start&&t<start+duration);
  return a.miss+ts.length-a.p;
 }
 function worst(duration){
  let max=-1,start=null;
  for(let i=0;i<ticks.length;i++){
   let a=clone(before[i]),end=false;
   for(let j=i;j<ticks.length;j++){
    step(a,ticks[j],ticks[j]<ticks[i]+duration);
    const b=after[j];
    if(ticks[j]>=ticks[i]+duration&&a.p===b.p&&a.active.length===b.active.length&&a.active.every((v,k)=>v===b.active[k])){
     const total=totalMiss+a.miss-b.miss;
     if(total>max){max=total;start=ticks[i];}
     end=true;break;
    }
   }
   if(!end){const total=a.miss+ts.length-a.p;if(total>max){max=total;start=ticks[i];}}
  }
  requireTrue(fullReplay(start,duration)===max,"BLACKOUT_FULL_REPLAY_MISMATCH");
  return {duration,missed:max,startUtc:new Date(ORIGIN+start*60000).toISOString()};
 }
 requireTrue(s.admitted+totalMiss===ts.length,"CARDINALITY");
 return {lead,cap,tail,missed:totalMiss,admitted:s.admitted,peak:s.peak,
  meanAdvanceMin:Math.round(s.prep/s.admitted*100)/100,
  modeledSlotMinutes:s.prep+tail*s.admitted,blocked:s.blocked,worst};
}
function analyze(dayTimes){
 requireTrue(dayTimes.length===31,"DAY_COUNT");
 const ts=dayTimes.flat().sort((a,b)=>a-b);
 requireTrue(ts.length===6144&&dayTimes[0].length===192,"TEMPLATE_COUNT");
 const check=[35,60,90,105].map(lead=>{let x=baseline([...dayTimes[0]].sort((a,b)=>a-b),lead,24,3);return [x.missed,x.peak,x.meanAdvanceMin];});
 requireTrue(JSON.stringify(check)===JSON.stringify([[0,12,32.5],[0,20,57.5],[0,24,84.38],[0,24,90]]),"PRIOR_DAY1_PARITY");
 const clean=({worst,...x})=>x;
 const profiles=[];for(const lead of [35,60,90])for(const cap of [12,16,20,24])for(const tail of [3,15])profiles.push(clean(baseline(ts,lead,cap,tail)));
 const worst=[];for(const cap of [16,20,24]){
  const p=baseline(ts,90,cap,15);worst.push({cap,nominalMissed:p.missed,blackouts:[60,120,350,590].map(d=>p.worst(d))});
 }
 const byClock=new Map();for(const t of ts)byClock.set(t,(byClock.get(t)??0)+1);
 requireTrue(byClock.size===1516&&Math.max(...byClock.values())===8,"CLOCK_PARITY");
 return {schema:"v39.phase5.full-cycle-capacity-review.v1",status:"MODEL_ONLY_NOT_LIVE_CAPACITY_OR_PAID_GO",
  n:ts.length,distinctClocks:byClock.size,maxSimultaneous:Math.max(...byClock.values()),
  day1:check,profiles,worst,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}

export {analyze};
export function readExactPlannedClocks(root="."){
 const horizons={"T-24h":0,"T-6h":0,"T-90m":0},keys=new Set();
 const rows=PLAN_BLOBS.map(([path,wanted],i)=>{
  const bytes=readFileSync(resolve(root,path));
  const blob=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
  requireTrue(blob===wanted,"PLAN_BLOB_DRIFT_"+(i+1));
  const j=JSON.parse(bytes);
  requireTrue(j.schema==="v39.phase6.reviewed-future-day-source-plan.v1"&&j.runDayIndex===i+1&&Array.isArray(j.templates),"DAY_SHAPE");
  return j.templates.map(t=>{
   const m=(Date.parse(t.scheduledRequestUtc)-ORIGIN)/60000;
   requireTrue(Number.isSafeInteger(m)&&m%15===0&&t.runDayIndex===i+1&&t.apiUnitsPerAttempt===2&&t.maxAttempts===1&&
    typeof t.queryKey==="string"&&!keys.has(t.queryKey)&&Object.hasOwn(horizons,t.horizon),"TEMPLATE_SHAPE");
   keys.add(t.queryKey);horizons[t.horizon]++;return m;
  });
 });
 requireTrue(Object.values(horizons).every(n=>n===2048),"HORIZON_COUNTS");
 return rows;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length>3)throw Error("usage: node p5_full_cycle_capacity_review_no_go.mjs [repo-root]");
 console.log(JSON.stringify(analyze(readExactPlannedClocks(process.argv[2]??".")),null,2));
}
