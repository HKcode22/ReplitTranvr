/**
 * NONPAID: derive the exact B0062 31-calendar-row SHAPE CANDIDATE from the
 * existing real corrected five-pair selection and an externally supplied
 * treatment precommitment, 21 predeclared ordinary HUB/region plans, and 31
 * separately supplied frozen future regional draw seeds.
 *
 * This calls the EXISTING checked 31-day shape engine and the EXISTING
 * B0062 staging calendar validator. No new sampling implementation.
 *
 * Not a signed calendar, immutable independent timestamp, current-provider
 * flight coverage, actual ordinary airport draw, legal rights, DB writer,
 * seven-category freeze, paid API request or Phase6 release.
 */
import {createHash} from "node:crypto";
import {
 proposeP5Adaptive31ShapeEnvelope
} from "./phase5Prospective31DayShapeEnvelope_v39";
import {
 inspectP5B0062InertCalendarOnlyRows
} from "./phase5B0062InertCalendarUtcBudgetStage_v39.mjs";

const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const SHA=/^[0-9a-f]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const NAMES=[
 "Asia-Pacific","Europe","Gulf/Africa","North America",
 "Oceania","South America"
] as const;
type Slot=typeof SLOTS[number];
type Regions=Record<Slot,string>;
type PairAirport={icao:string;region:string};
const HUBS:Readonly<Record<string,string>>={
 WSSS:"Asia-Pacific",OMAA:"Gulf/Africa",
 SKBO:"South America",YSSY:"Oceania"
};
const digest=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const hold=(s:string):never=>{throw Error("REFUSED_P5_ACTUAL_FIVE_PAIR_B0062_CALENDAR_DRAFT_"+s);};
const exactUtc=(s:string)=>typeof s==="string"&&UTC.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(Date.parse(s)).toISOString()===s;
const exactRegions=(x:Regions)=>{
 if(!x||typeof x!=="object"||Array.isArray(x)||
    Object.keys(x).length!==4||
    SLOTS.some(k=>!NAMES.includes(x[k] as typeof NAMES[number])))
  hold("NOT_REAL_B0062_SIX_REGION_SLOT_PLAN");
 return x;
};
export interface P5B0062OrdinaryAnchorPlan{
 runDayIndex:number;
 anchorIcao:string;
 slotRegions:Regions;
}
export interface P5B0062FrozenDaySeed{
 runDayIndex:number;
 frozenDrawSeed:string;
}
export interface P5B0062FromRealPairCandidateInput{
 schema:"v39.phase5.actual-five-pair-31-b0062-draft-input.v1";
 ownerCorrectedReadback:unknown;
 firstRunDateUtc:string;
 /** An externally claimed treatment seed; NOT authenticated by this code. */
 claimedTreatment:{
  treatmentSeedHex:string;
  announcedCommitmentSha256:string;
  claimedCommitmentObservedAtUtc:string;
 };
 /** An independently reviewed prospective 21-day HUB/region plan is REQUIRED. */
 ordinaryHubsAndRegions:P5B0062OrdinaryAnchorPlan[];
 /** 31 externally frozen per-day draw seeds; no RNG created in this code. */
 predeclaredDailyDrawSeeds:P5B0062FrozenDaySeed[];
 /** Informative only; DB clock and witness MUST be checked separately. */
 assembledAtUtc:string;
}
const indexed=<T extends {runDayIndex:number}>(
 rows:T[],expected:number[],label:string
):Map<number,T>=>{
 if(!Array.isArray(rows)||rows.length!==expected.length)
  hold(label+"_MISSING_EXACT_ROWS");
 const m=new Map<number,T>();
 for(const r of rows){
  if(!r||!expected.includes(r.runDayIndex)||m.has(r.runDayIndex))
   hold(label+"_BAD_OR_REPEATED_INDEX");
  m.set(r.runDayIndex,r);
 }
 if(expected.some(i=>!m.has(i)))hold(label+"_MISSING_INDEX");
 return m;
};
function verifiedOwnerPairs(raw:unknown){
 // First the pre-existing shape envelope independently validates the entire
 // corrected 5-pair source SHA/19 unique airports. Here we only extract
 // its paired slot-region metadata after that assertion has passed.
 const p=raw as {candidatePairAirportSets?:Array<{
  pairId:string;airports:Record<Slot,PairAirport>;
 }>};
 const pairs=p?.candidatePairAirportSets;
 if(!Array.isArray(pairs)||pairs.length!==5)
  hold("ACTUAL_CORRECTED_PAIR_EVIDENCE_MISSING");
 const m=new Map<string,Record<Slot,PairAirport>>();
 for(let i=1;i<=5;i++){
  // Array existence and five-element length were validated above.
  const rawPair=pairs![i-1];
  if(rawPair?.pairId!=="pair-"+i||
     !rawPair.airports||
     Object.keys(rawPair.airports).length!==4||
     SLOTS.some(k=>!rawPair.airports[k]||
      !/^[A-Z]{4}$/.test(rawPair.airports[k].icao)||
      !NAMES.includes(rawPair.airports[k].region as typeof NAMES[number])))
   hold("PAIRED_REGION_OR_ICAO_CHANGED");
  const sites=Object.fromEntries(SLOTS.map(k=>[
   k,{icao:rawPair.airports[k].icao,region:rawPair.airports[k].region}
  ])) as Record<Slot,PairAirport>;
  if(sites.HUB.region!==HUBS[sites.HUB.icao])
   hold("PAIRED_HUB_REGION_NOT_REAL");
  m.set(rawPair.pairId,sites);
 }
 return m;
}
/**
 * All 31 calendar rows are prospects, not observations. No future ordinary
 * MID/REGIONAL airport identity is materialized.
 */
export function buildP5ActualFivePairB0062CalendarOnlyDraft(
 p:P5B0062FromRealPairCandidateInput
){
 if(!p||p.schema!=="v39.phase5.actual-five-pair-31-b0062-draft-input.v1"||
    !exactUtc(p.assembledAtUtc)||
    !Array.isArray(p.ordinaryHubsAndRegions)||
    !Array.isArray(p.predeclaredDailyDrawSeeds))
  hold("MISSING_EXPLICIT_PROSPECTIVE_INPUT");
 const envelope=proposeP5Adaptive31ShapeEnvelope({
  ownerCorrectedReadback:p.ownerCorrectedReadback,
  firstRunDateUtc:p.firstRunDateUtc,claimedTreatment:p.claimedTreatment
 });
 if(envelope.status!=="PROVISIONAL_SHAPE_ENVELOPE_ONLY_21_ADAPTIVE_DRAWS_PENDING"||
    envelope.days.length!==31||
    envelope.actualCorrectedB0062SelectionSha256!==
     "f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592"||
    envelope.all21AdaptiveDrawsAuthentic!==false||
    envelope.phase5ScientificFreezePassed!==false||
    envelope.phase6PaidGo!==false)
  hold("EXISTING_PROSPECTIVE_SHAPE_ENGINE_NOT_UNARMED");
 const ownerPairs=verifiedOwnerPairs(p.ownerCorrectedReadback);
 const ordinaryIndexes=envelope.days.filter(x=>x.pairId===null).
  map(x=>x.runDayIndex);
 if(ordinaryIndexes.length!==21)
  hold("ORDINARY_FUTURE_SELECTION_NOT_21");
 const anchors=indexed(p.ordinaryHubsAndRegions,ordinaryIndexes,"ORDINARY_HUB_PLAN");
 const seeds=indexed(p.predeclaredDailyDrawSeeds,
  envelope.days.map(x=>x.runDayIndex),"FUTURE_REGION_DRAW_SEEDS");
 if(new Set([...seeds.values()].map(s=>s.frozenDrawSeed)).size!==31)
  hold("FUTURE_REGIONAL_DAY_DRAW_SEEDS_REPEATED");
 const lastKnownHUBEnd=new Map<string,number>();
 const rows=envelope.days.map(day=>{
  const seed=seeds.get(day.runDayIndex)?.frozenDrawSeed;
  if(!SHA.test(seed??""))hold("DAY_DRAW_SEED_NOT_EXPLICIT_64_HEX");
  const paired=day.pairId!==null;
  let anchorIcao:string,slotRegions:Regions,pairAirportSet:
    Record<Slot,PairAirport>|null;
  if(paired){
   const fromMap=ownerPairs.get(day.pairId!);
   if(!fromMap)hold("ACTUAL_PAIRED_AIRPORT_SHA_OR_PAIR_REPLAY_CHANGED");
   // TS strict-null control flow does not narrow through our fail-closed
   // throw helper; runtime still explicitly denies a missing pair before use.
   const sites=fromMap!;
   if(!day.pairedAirportCandidates||
      SLOTS.some(k=>sites[k].icao!==day.pairedAirportCandidates?.[k]))
    hold("ACTUAL_PAIRED_AIRPORT_SHA_OR_PAIR_REPLAY_CHANGED");
   anchorIcao=sites.HUB.icao;
   slotRegions=Object.fromEntries(SLOTS.map(k=>[k,sites[k].region])) as Regions;
   pairAirportSet=sites;
  }else{
   const plan=anchors.get(day.runDayIndex)!;
   anchorIcao=plan.anchorIcao;
   slotRegions=exactRegions(plan.slotRegions);
   pairAirportSet=null;
  }
  if(HUBS[anchorIcao]!==slotRegions.HUB)
   hold("KNOWN_HUB_NOT_IN_REAL_ACTIVE_FRAME_REGION");
  const start=Date.parse(day.startUtc),end=Date.parse(day.endUtc);
  const last=lastKnownHUBEnd.get(anchorIcao);
  if(last!==undefined&&start-last<24*3600_000)
   hold("ALL_31_KNOWN_HUB_24H_END_TO_START_WASHOUT");
  lastKnownHUBEnd.set(anchorIcao,end);
  const idx=String(day.runDayIndex).padStart(2,"0");
  return {
   runDayIndex:day.runDayIndex,
   budgetDayId:"p5-f8-"+day.dateUtc.replace(/-/g,"")+"-"+idx,
   startUtc:day.startUtc,
   utcSlot:day.utcSlot.slice(0,2),
   timeClass:day.utcSlot,
   windowShape:day.windowShape,
   partition:day.partition,
   pairId:paired?"pair_00"+day.pairId!.slice(5):null,
   crossoverPeriod:day.crossoverPeriod,
   pairRole:day.pairRole,
   drawType:day.crossoverPeriod===2?"PAIR_REPLAY":"NEW_TEMPLATE",
   slotRegions,anchorIcao,pairAirportSet,
   frozenDrawSeed:seed
  };
 });
 const counts=inspectP5B0062InertCalendarOnlyRows(rows);
 if(counts.knownPairedAirportDays!==10||
    counts.unknownOrdinaryAirportDays!==21)
  hold("EXISTING_PRODUCTION_STAGER_CALENDAR_VALIDATOR_HOLD");
 const core={
  schema:"v39.phase5.actual-five-pair-b0062-calendar-only-draft.v1",
  actualCorrectedPairSelectionSha256:
   envelope.actualCorrectedB0062SelectionSha256,
  proposedShapeEnvelopeSha256:envelope.shapeEnvelopeSha256,
  proposedDateMapSha256:envelope.dateMapSha256,
  claimedTreatmentAssignmentSha256:envelope.claimedTreatmentAssignmentSha256,
  claimedTreatmentCommitmentSha256:envelope.claimedTreatmentCommitmentSha256,
  assembledAtUtc:p.assembledAtUtc,
  calendarDays:rows
 };
 return {
  ...core,proposedCalendarRowsSha256:digest(rows),
  proposedCalendarDraftSha256:digest(core),
  status:"REAL_FIVE_PAIR_31_DAY_CALENDAR_ROWS_DRAFT_NOT_SIGNED",
  knownPairedParentDays:10,
  futureOrdinaryParentDaysWithUnknownAirportSelections:21,
  totalB0062Rows:31,
  actualIndependentSeedCommitWitnessVerified:false,
  actual31FrozenCalendarApproved:false,
  futureOrdinaryAirportsSelected:0,
  trueProviderPassengerFlightAvailabilityVerified:false,
  providerApiRangePriceAndRightsVerified:false,
  actualUtcSevenRestBudgetSigned:false,
  restrictedProductionWriterCommissioned:false,
  phase5ScientificFreezePassed:false,phase6PaidGo:false,
  providerCalls:0,databaseWrites:0,paidAlertCreates:0
 };
}
