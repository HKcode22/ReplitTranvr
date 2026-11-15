/** Draft metadata only. Preserve f.8 §8.5 and Amendment D four-HUB
 * prospective scope, count new templates (not period-2 replay). Reuses
 * actual corrected pair archive through the existing date compiler.
 * External seeds are claims, not witnessed independent randomness.
 */
import {createHash} from "node:crypto";
import {proposeP5RealCorrectedPairDateGeometry} from "./phase5CorrectedPairDateGeometryProposal_v39";
import type {P5B0062OrdinaryAnchorPlan} from "./phase5RealFivePairB0062CalendarOnlyDraft_v39";
const HUBS={WSSS:"Asia-Pacific",OMAA:"Gulf/Africa",SKBO:"South America",YSSY:"Oceania"} as const;
const R=["Asia-Pacific","Europe","Gulf/Africa","North America","Oceania","South America"] as const;
const S=["MID_A","MID_B","REGIONAL"] as const;
type Hub=keyof typeof HUBS;
type Slot=typeof S[number];
type Region=typeof R[number];
type Day=ReturnType<typeof proposeP5RealCorrectedPairDateGeometry>["days"][number];
type Pair={pairId:string;airports:Record<"HUB"|Slot,{icao:string;region:string}>};
type Seeds=Record<"HUB"|Slot,string>;
const HASH=/^[0-9a-f]{64}$/;
const D=86400000;
const sha=(x:string)=>createHash("sha256").update(x).digest("hex");
const hold=(s:string):never=>{throw Error("REFUSED_P5_PROSPECTIVE_REGION_ROTATION_"+s);};
const canon=(x:unknown)=>sha(JSON.stringify(x));
const rank=<T extends string>(values:readonly T[],seed:string,domain:string)=>[...values].sort((a,b)=>
 sha(seed+"|"+domain+"|"+a).localeCompare(sha(seed+"|"+domain+"|"+b))||a.localeCompare(b));
export function proposeP5OrdinaryHubRegionRotation(input:{
 ownerCorrectedReadback:unknown;firstRunDateUtc:string;claimedRotationSeeds:Seeds
}){
 const seeds=input.claimedRotationSeeds;
 if(!seeds||Object.keys(seeds).length!==4||
   !["HUB",...S].every(k=>HASH.test(seeds[k as keyof Seeds]??""))||
   new Set(Object.values(seeds)).size!==4)hold("DISTINCT_EXTERNAL_SLOT_SEED_CLAIMS_REQUIRED");
 const geo=proposeP5RealCorrectedPairDateGeometry(input);
 if(geo.status!=="DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE"||!geo.dateMapSha256||geo.days.length!==31)
  hold("EXISTING_REAL_PAIR_DATE_GEOMETRY_REQUIRED");
 const pairs=(input.ownerCorrectedReadback as {candidatePairAirportSets:Pair[]}).candidatePairAirportSets;
 const byPair=new Map(pairs.map(p=>[p.pairId,p]));
 for(const p of pairs){
  const a=p.airports;
  if(HUBS[a.HUB.icao as Hub]!==a.HUB.region||S.some(k=>!R.includes(a[k].region as Region)))
   hold("PAIR_REGION_DRIFT");
 }
 // A new template consumes rotation positions; period2 replays exact slots.
 const newDays=geo.days.filter(d=>d.crossoverPeriod!==2);
 if(newDays.length!==26||newDays.filter(d=>d.pairId===null).length!==21)hold("DRAW_REPLAY_GEOMETRY");
 const pos=new Map(newDays.map((d,i)=>[d.runDayIndex,i]));
 const assigned=new Map<number,Hub>();
 const last=new Map<Hub,number>(),used=new Set<Hub>();
 let nodes=0;
 function visit(i:number):boolean{
  if(i===geo.days.length)return true;
  if(++nodes>100000)hold("BOUNDED_SEARCH_INCOMPLETE");
  const day=geo.days[i],replay=day.crossoverPeriod===2;
  const position=pos.get(day.runDayIndex);
  const fixed=day.airportsIfKnown?.HUB as Hub|undefined;
  const block=position===undefined?-1:Math.floor(position/4);
  const atStart=position!==undefined&&position%4===0;
  const priorUsed=[...used];
  if(atStart)used.clear();
  const choices=fixed?[fixed]:rank(Object.keys(HUBS) as Hub[],seeds.HUB,"HUB|"+block+"|"+String(position));
  const start=Date.parse(day.conservativeStartUtc),end=Date.parse(day.conservativeEndUtc);
  for(const hub of choices){
   if(!Object.hasOwn(HUBS,hub)||(!replay&&used.has(hub)))continue;
   const prev=last.get(hub);
   if(prev!==undefined&&start-prev<D)continue;
   assigned.set(day.runDayIndex,hub);last.set(hub,end);
   if(!replay)used.add(hub);
   if(visit(i+1))return true;
   if(!replay)used.delete(hub);
   assigned.delete(day.runDayIndex);
   if(prev===undefined)last.delete(hub);else last.set(hub,prev);
  }
  used.clear();for(const x of priorUsed)used.add(x);
  return false;
 }
 if(!visit(0))hold("NO_FOUR_HUB_ROTATION_WITH_CONSERVATIVE_WASHOUT");
 const regions=new Map<number,Record<Slot,Region>>();
 for(const day of newDays)regions.set(day.runDayIndex,{} as Record<Slot,Region>);
 for(const slot of S)for(let at=0;at<newDays.length;at+=R.length){
  const b=newDays.slice(at,at+R.length),seen=new Set<Region>();
  for(const day of b)if(day.pairId){
   const fixed=byPair.get(day.pairId)!.airports[slot].region as Region;
   if(seen.has(fixed))hold("FIXED_PAIR_REGION_COLLISION_WITHIN_NEW_DRAW_BLOCK");
   seen.add(fixed);regions.get(day.runDayIndex)![slot]=fixed;
  }
  const remaining=rank(R.filter(r=>!seen.has(r)),seeds[slot],slot+"|"+Math.floor(at/R.length));
  for(const day of b)if(!day.pairId){
   const next=remaining.shift();
   if(!next)hold("REGION_BLOCK_EXHAUSTED");
   regions.get(day.runDayIndex)![slot]=next!;
  }
 }
 const all=geo.days.map((day:Day)=>{
  const anchorIcao=assigned.get(day.runDayIndex)!;
  const sourceDay=day.crossoverPeriod===2?day.runDayIndex-6:day.runDayIndex;
  const cells=regions.get(sourceDay);
  if(!cells)hold("REPLAY_WITHOUT_TEMPLATE");
  return {runDayIndex:day.runDayIndex,anchorIcao,
   slotRegions:{HUB:HUBS[anchorIcao],...cells!},
   drawType:day.crossoverPeriod===2?"PAIR_REPLAY":"NEW_TEMPLATE",
   ordinaryAirportIdentitiesSelected:false};
 });
 const ordinaryHubsAndRegions:P5B0062OrdinaryAnchorPlan[]=all.filter(d=>
  geo.days[d.runDayIndex-1].pairId===null).map(({runDayIndex,anchorIcao,slotRegions})=>({runDayIndex,anchorIcao,slotRegions}));
 const newRows=all.filter(x=>x.drawType==="NEW_TEMPLATE");
 for(let i=0;i<newRows.length;i+=4){
  const block=newRows.slice(i,i+4);
  if(new Set(block.map(x=>x.anchorIcao)).size!==block.length)hold("HUB_ROTATION_VERIFIER");
 }
 for(const slot of S)for(let i=0;i<newRows.length;i+=6){
  const block=newRows.slice(i,i+6);
  if(new Set(block.map(x=>x.slotRegions[slot])).size!==block.length)hold("REGION_ROTATION_VERIFIER");
 }
 return {status:"PROSPECTIVE_ORDINARY_HUB_REGION_METADATA_PROPOSAL_NO_GO",
  dateMapSha256:geo.dateMapSha256,claimedRotationSeedsSha256:canon(seeds),
  all31SlotMetadata:all,ordinaryHubsAndRegions,rotationSha256:canon(all),
  newTemplateDraws:26,replayedDays:5,ordinaryPlans:21,ordinaryAirportSelectionsCreated:0,
  boundedSearchNodes:nodes,eligibleCellsBasedOnArchivedFrameOnly:true,
  independentSeedWitnessVerified:false,actualFrameCellAvailabilityAtDrawVerified:false,
  providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
