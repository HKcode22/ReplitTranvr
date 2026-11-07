/**
 * Stage21b: deterministic finite candidate-calendar solver for f.8 §8.7.
 * It chooses ONE of the already frozen, supplied candidate windows for each
 * 1..31 parent batch day; it NEVER fabricates dates, airports or permissions.
 *
 * Exhaustive bounded search with hard constraint pruning + f.8 verifier.
 * If the search cap is reached, return HOLD (never falsely claim UNSAT/optimal).
 * The true production candidate-generation/§8.5 region-anchor optimizer,
 * source-rights review and actual signed calendar remain open.
 */
import {createHash} from "node:crypto";
import {auditP5F8CrossoverCandidate}
  from "./phase5F8CrossoverCalendarFreezeGuard_v39.mjs";
const SHA=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const H=3_600_000;
const hash=s=>createHash("sha256").update(s).digest("hex");
const valid=s=>typeof s==="string"&&ISO.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const shapes={"4h":26,"2x2h":3,"up-to-6h":2};
const slo=["HUB","MID_A","MID_B","REGIONAL"];
const verdict=(status,details={})=>({
 schema:"v39.phase5.f8.finite-candidate-calendar-csp-result.v1",
 status,...details,
 actualAirportAdaptiveSelectionsCertified:false,
 actualProviderWindowStalenessAndRestChargeDatesCertified:false,
 fullRegionAnchorFreshestFirstOptimizerCertified:false,
 sourceProviderMLAndBackupRightsCertified:false,
 signedActual31BatchDayScheduleReleased:false,
 providerCalls:0,databaseWrites:0,paidAlertCreates:0,
 phase5FreezePassed:false,phase6Go:false
});
export function digestP5F8FrozenCandidatePool(basePacket,candidateDays,timeSeed){
 return hash(JSON.stringify({basePacket,candidateDays,timeSeed}));
}
const key=c=>[
 c.startUtc,c.utcSlot,c.windowShape,c.pairId??"ordinary",
 c.pairRole??"none",c.runDayIndex
].join("|");
function balanceScore(days){
 const counts=new Map();
 for(const row of days){
  const week=new Date(row.startUtc).getUTCDay();
  const cls=week===0||week===6?"weekend":"weekday";
  const group=cls+"|"+row.utcSlot;
  counts.set(group,(counts.get(group)??0)+1);
 }
 const avg=31/12;
 let score=0;
 for(const cls of ["weekday","weekend"])
  for(const slot of ["00","04","08","12","16","20"]){
   const count=counts.get(cls+"|"+slot)??0;
   score+=(count-avg)**2;
  }
 return score;
}
function earlyValid(row,selected,slotSet,seen,shapeCounter){
 if(!row||!valid(row.startUtc)||!valid(row.endUtc)||
    Date.parse(row.endUtc)<=Date.parse(row.startUtc)||
    !Object.prototype.hasOwnProperty.call(shapes,row.windowShape)||
    shapeCounter[row.windowShape]>=shapes[row.windowShape]||
    !["00","04","08","12","16","20"].includes(row.utcSlot)||
    row.startUtc.slice(11,13)!==row.utcSlot||
    slotSet.has(row.utcSlot))
  return false;
 const prev=selected.at(-1);
 if(prev&&Date.parse(row.startUtc)<Date.parse(prev.endUtc))return false;
 if(!row.airports||slo.some(s=>typeof row.airports[s]!=="string"))return false;
 const start=Date.parse(row.startUtc);
 for(const slot of slo){
  const last=seen.get(row.airports[slot]);
  if(last!==undefined&&start-last<24*H)return false;
 }
 return true;
}
export function solveP5F8FrozenCandidatePool(p){
 if(!p||p.schema!=="v39.phase5.f8.finite-candidate-calendar-csp-input.v1"||
    !p.basePacket||!Array.isArray(p.candidateDays)||
    p.candidateDays.length!==31||
    !SHA.test(p.timeWindowScheduleSeedSha256)||
    !SHA.test(p.expectedCandidateSetSha256)||
    !Number.isSafeInteger(p.maxSearchNodes)||
    p.maxSearchNodes<1||p.maxSearchNodes>200000||
    p.candidateDays.some((rows,i)=>!Array.isArray(rows)||
      rows.length<1||rows.length>6||
      rows.some(row=>row?.runDayIndex!==i+1)))
   return verdict("HOLD_INVALID_FROZEN_CANDIDATE_POOL",{
    reason:"MISSING_EXACT_31_DAY_CANDIDATE_CONSTRAINTS"
   });
 if(digestP5F8FrozenCandidatePool(p.basePacket,p.candidateDays,
    p.timeWindowScheduleSeedSha256)!==p.expectedCandidateSetSha256)
   return verdict("HOLD_INVALID_FROZEN_CANDIDATE_POOL",{
    reason:"CHANGED_FROZEN_CANDIDATE_POOL_HASH"
   });
 if(p.basePacket.days!==undefined)
   return verdict("HOLD_INVALID_FROZEN_CANDIDATE_POOL",{
    reason:"UNSIGNED_PRESELECTED_SOLUTION_IN_BASE_PACKET"
   });
 const selected=[],seen=new Map(),shapeCount={"4h":0,"2x2h":0,"up-to-6h":0};
 let visited=0,feasible=0,exhausted=false,best=null,bestScore=Infinity;
 let bestLex=null,lastCandidateHoldCodes=[];
 function dfs(i){
  if(exhausted)return;
  if(i===31){
   if(Object.entries(shapes).some(([k,n])=>shapeCount[k]!==n))return;
   const evaluated=auditP5F8CrossoverCandidate({
    ...p.basePacket,days:selected
   });
   if(evaluated.status!=="SAT_STRUCTURAL_CANDIDATE_NOT_FINAL_FREEZE"){
    lastCandidateHoldCodes=evaluated.errors.slice(0,10);
    return;
   }
   feasible++;
   const score=balanceScore(selected);
   const canon=selected.map(key).join("~");
   if(score<bestScore||(score===bestScore&&
       (bestLex===null||canon<bestLex))){
    best=structuredClone(selected);
    bestScore=score;bestLex=canon;
   }
   return;
  }
  const currentBlock=selected.slice(i-(i%6));
  const used=new Set(currentBlock.map(x=>x.utcSlot));
  const options=p.candidateDays[i].slice().sort((a,b)=>{
   const x=hash(p.timeWindowScheduleSeedSha256+"|"+key(a));
   const y=hash(p.timeWindowScheduleSeedSha256+"|"+key(b));
   return x.localeCompare(y)||key(a).localeCompare(key(b));
  });
  for(const row of options){
   visited++;
   if(visited>p.maxSearchNodes){exhausted=true;return;}
   if(!earlyValid(row,selected,used,seen,shapeCount))continue;
   const old=new Map(seen);
   for(const slot of slo)seen.set(row.airports[slot],
     Date.parse(row.endUtc));
   selected.push(row);
   shapeCount[row.windowShape]++;
   const left=31-i-1;
   if(Object.entries(shapes).every(([k,n])=>
      shapeCount[k]<=n&&n-shapeCount[k]<=left))
    dfs(i+1);
   shapeCount[row.windowShape]--;
   selected.pop();
   seen.clear();for(const [k,v] of old)seen.set(k,v);
   if(exhausted)return;
  }
 }
 dfs(0);
 if(exhausted)
  return verdict("HOLD_BOUNDED_SEARCH_NOT_PROVEN_COMPLETE",{
   visitedNodes:visited,maxSearchNodes:p.maxSearchNodes,
   feasibleCandidatesSeenBeforeExhaustion:feasible,
   reason:"CANNOT_ASSERT_UNSAT_OR_GLOBAL_SOFT_OPTIMUM"
  });
 if(!best)
  return verdict("UNSAT_SUPPLIED_FROZEN_CANDIDATE_POOL_ONLY",{
   visitedNodes:visited,feasibleCandidates:0,
   sampledRejectedConstraints:lastCandidateHoldCodes,
   reason:"NO_FEASIBLE_ASSIGNMENT_IN_THIS_SUPPLIED_FINITE_POOL"
  });
 const audit=auditP5F8CrossoverCandidate({...p.basePacket,days:best});
 if(audit.status!=="SAT_STRUCTURAL_CANDIDATE_NOT_FINAL_FREEZE")
  return verdict("HOLD_INTERNAL_SOLVER_AUDITOR_INCONSISTENCY");
 return verdict("SAT_FINITE_CANDIDATE_SCHEDULE_NOT_SCIENTIFIC_RELEASE",{
  visitedNodes:visited,feasibleCandidates:feasible,
  weekdayByUTCImbalanceScore:bestScore,
  tieBreak:"LEXICALLY_SMALLEST_CANONICAL_SCHEDULE_AT_EQUAL_SCORE",
  inputCandidateSetSha256:p.expectedCandidateSetSha256,
  selectedCandidateCalendarSha256:audit.proposedCalendarSha256,
  days:best,structuralAudit:audit
 });
}
