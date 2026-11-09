/**
 * Phase 5: bounded, deterministic date-only candidate for the ACTUAL
 * corrected five B0062 crossover airport proposals.
 *
 * Does not assign treatment order, define a provider request grid, evaluate
 * scheduled-flight reachability, obtain data-use rights, write PostgreSQL,
 * dispatch GitHub, call AeroDataBox, or authorize Phase6.
 *
 * A conservative 6h maximum is used for every parent's geometry, so dates
 * remain safe under any later valid 4h/2x2h/<=6h treatment assignment.
 * The candidate still needs the independent formal f.8 calendar/source audit.
 */
import {createHash} from "node:crypto";

export const P5_REAL_PAIR_DATE_CANDIDATE_SCHEMA =
 "v39.phase5.corrected-owner-five-pair-date-geometry-proposal.v1" as const;
const EXPECTED_CORRECTED =
 "f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592";
const EXPECTED_ORIGINAL =
 "3dbcc18dd44bdbb7e5323766a9a6bfacacc0bb2e38e3ccce9aff442611738763";
const EXPECTED_FRAME =
 "02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94";
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const HOURS=[0,4,8,12,16,20] as const;
const DAY=86_400_000, HOUR=3_600_000, CONSERVATIVE_MAX=6*HOUR;
type Slot=typeof SLOTS[number];
type Airport={icao:string;region:string};
type Pair={pairId:string;airports:Record<Slot,Airport>};
type Packet={
 schema:string;status:string;frozenFrameHash:string;
 originalOwnerPairProposalSha256:string;selectedAirportIcaosSha256:string;
 scannedFullyQualifiedMidRegionalAirports:number;
 sampledWithoutTop48TrafficTruncation:boolean;
 scheduledPassengerScopeExclusions:string[];
 originalPair3MidA:string;replacementPair3MidA:string;
 crossoverAirportSetSigned:boolean;independentTreatmentOrderSeedSet:boolean;
 treatmentOrderRandomized:boolean;thirtyOneBatchDayCalendarSigned:boolean;
 phase6PaidGo:boolean;providerCalls:number;databaseWrites:number;webhookPosts:number;
 candidatePairAirportSets:Pair[];
};
export interface P5DateOnlyCandidateInput{
 ownerCorrectedReadback:unknown;
 firstRunDateUtc:string;
 /** Inclusive span bound from first day to the last (max 366 days). */
 maxCalendarSpanDays?:number;
}
export interface P5DateOnlyCandidateDay{
 runDayIndex:number;
 dateUtc:string;utcSlot:string;conservativeStartUtc:string;conservativeEndUtc:string;
 pairId:string|null;crossoverPeriod:1|2|null;
 weekdayClass:"weekday"|"weekend";
 airportsIfKnown:Record<Slot,string>|null;
}
export interface P5DateOnlyCandidateResult{
 schema:typeof P5_REAL_PAIR_DATE_CANDIDATE_SCHEMA;
 status:"DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE"|
        "HOLD_NO_DATE_GEOMETRY_WITHIN_BOUNDED_HORIZON";
 firstRunDateUtc:string;lastRunDateUtc:string|null;
 elapsedCalendarDays:number|null;dateMapSha256:string|null;
 reviewedRunDatesByIndex:Record<string,string>;
 days:P5DateOnlyCandidateDay[];
 skippedDatesByReason:Record<string,number>;
 repeatedKnownPairAirportsWashoutChecked:true;
 conservativeAllWindowsMaxSixHours:true;
 ordinaryAdaptiveAirportIdentityVerified:false;
 serviceWindowPassengerFlightsVerified:false;
 providerRangeAndSourceGetCoverageVerified:false;
 physicalUtcChargeDayBudgetVerified:false;
 sourceContentsRightsAndExpiryVerified:false;
 separateTreatmentOrderRandomizationCertified:false;
 genuinePrePostAndReceiverVerified:false;
 phase5ScientificFreezePassed:false;phase6PaidGo:false;
 providerCalls:0;databaseWrites:0;paidAlertCreates:0;
}
const fail=(reason:string):never=>{throw Error("REFUSED_P5_REAL_PAIR_DATE_PROPOSAL_"+reason);};
const digest=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const strictDate=(s:unknown):number=>{
 if(typeof s!=="string"||!/^\d{4}-\d\d-\d\d$/.test(s))fail("INVALID_START_DATE");
 const ms=Date.parse(s+"T00:00:00.000Z");
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==s)
  fail("INVALID_START_DATE");
 return ms;
};
const iso=(ms:number)=>new Date(ms).toISOString();
const date=(ms:number)=>iso(ms).slice(0,10);
const weekday=(ms:number):"weekday"|"weekend"=>{
 const n=new Date(ms).getUTCDay();return n===0||n===6?"weekend":"weekday";
};
const airportSet=(pair:Pair):Record<Slot,string>=>Object.fromEntries(
 SLOTS.map(s=>[s,pair.airports[s].icao])
) as Record<Slot,string>;
function exactOwnerPairs(raw:unknown):Pair[]{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))fail("MISSING_OWNER_PACKET");
 const p=raw as Packet;
 if(p.schema!=="phase5.full-b0062-five-pair-selection-review.v1"||
    p.status!=="FIVE_POST_SELECTION_SCOPE_ADJUDICATED_PAIR_CANDIDATES_NOT_FROZEN"||
    p.frozenFrameHash!==EXPECTED_FRAME||
    p.originalOwnerPairProposalSha256!==EXPECTED_ORIGINAL||
    p.selectedAirportIcaosSha256!==EXPECTED_CORRECTED||
    p.scannedFullyQualifiedMidRegionalAirports!==1013||
    p.sampledWithoutTop48TrafficTruncation!==true||
    p.crossoverAirportSetSigned!==false||
    p.independentTreatmentOrderSeedSet!==false||
    p.treatmentOrderRandomized!==false||
    p.thirtyOneBatchDayCalendarSigned!==false||
    p.phase6PaidGo!==false||
    p.providerCalls!==0||p.databaseWrites!==0||p.webhookPosts!==0||
    p.originalPair3MidA!=="KTEB"||p.replacementPair3MidA!=="KBUF"||
    !Array.isArray(p.scheduledPassengerScopeExclusions)||
    JSON.stringify(p.scheduledPassengerScopeExclusions)!=='["KTEB"]'||
    !Array.isArray(p.candidatePairAirportSets)||
    p.candidatePairAirportSets.length!==5)fail("UNTRUSTED_OR_CHANGED_OWNER_READBACK");
 const pairs=p.candidatePairAirportSets;
 for(let n=0;n<5;n++){
  const x=pairs[n];
  if(x?.pairId!==`pair-${n+1}`||
     !x.airports||Object.keys(x.airports).length!==4||
     SLOTS.some(s=>typeof x.airports[s]?.icao!=="string"||
       !/^[A-Z]{4}$/.test(x.airports[s].icao)||
       typeof x.airports[s].region!=="string"||!x.airports[s].region.trim())||
     new Set(SLOTS.map(s=>x.airports[s].icao)).size!==4)
   fail("INVALID_PAIR_SLOT_OR_REPLAY_IDENTITY");
 }
 const selected=pairs.map(x=>({
  pairId:x.pairId,icaos:SLOTS.map(s=>x.airports[s].icao)
 }));
 if(digest(selected)!==EXPECTED_CORRECTED||
    pairs[2].airports.MID_A.icao!=="KBUF"||
    pairs[3].airports.HUB.icao!=="SKBO"||
    pairs[4].airports.HUB.icao!=="SKBO"||
    new Set(pairs.map(x=>x.airports.HUB.icao)).size!==4||
    new Set(pairs.flatMap(x=>SLOTS.filter(s=>s!=="HUB")
      .map(s=>x.airports[s].icao))).size!==15)
   fail("OWNER_PAIR_SHA_OR_SELECTION_IDENTITY_DRIFT");
 return pairs;
}

/**
 * Earliest sequential UTC dates satisfying:
 * - one unique future date for each of 31 days;
 * - 00/04/08/12/16/20 UTC slots in every six-run block;
 * - same weekday/weekend class for the two periods of each pair;
 * - 24 hours after conservative six-hour END for every KNOWN repeated
 *   airport (across pairs as well as within one pair);
 * - parent windows do not overlap.
 *
 * Ordinary future airports remain unknown and need real early-draw DB washout.
 * Greedy earliest-fit is NOT globally optimal, and it neither proves
 * scheduled-passenger flights during the dates nor a physical REST budget.
 */
export function proposeP5RealCorrectedPairDateGeometry(
 input:P5DateOnlyCandidateInput
):P5DateOnlyCandidateResult{
 if(!input||typeof input!=="object")fail("INVALID_INPUT");
 const pairs=exactOwnerPairs(input.ownerCorrectedReadback);
 const first=strictDate(input.firstRunDateUtc);
 const span=input.maxCalendarSpanDays??120;
 if(!Number.isSafeInteger(span)||span<31||span>366)
  fail("INVALID_BOUNDED_SEARCH_SPAN");
 const maxDate=first+(span-1)*DAY;
 const map:Record<string,string>={};
 const days:P5DateOnlyCandidateDay[]=[];
 const lastEndByKnownIcao=new Map<string,number>();
 const firstPairClass=new Map<number,"weekday"|"weekend">();
 const skipped:Record<string,number>={};
 let previousMidnight=first-DAY,previousParentEnd=-Infinity;
 for(let n=1;n<=31;n++){
  const p=n<=5?n:n>=7&&n<=11?n-6:null;
  const period=p===null?null:n<=5?1:2;
  const pair=p===null?null:pairs[p-1];
  const hour=HOURS[(n-1)%6];
  let chosen:P5DateOnlyCandidateDay|null=null;
  for(let midnight=previousMidnight+DAY;midnight<=maxDate;midnight+=DAY){
   const start=midnight+hour*HOUR,end=start+CONSERVATIVE_MAX;
   let rejection:string|null=null;
   if(start<previousParentEnd)rejection="PARENT_WINDOW_OVERLAP";
   if(!rejection&&p!==null&&period===2&&
     weekday(midnight)!==firstPairClass.get(p))rejection="PAIRED_WEEKDAY_CLASS_MISMATCH";
   if(!rejection&&pair){
    for(const slot of SLOTS){
     const icao=pair.airports[slot].icao;
     const prev=lastEndByKnownIcao.get(icao);
     if(prev!==undefined&&start-prev<DAY){
      rejection="KNOWN_AIRPORT_END_TO_START_WASHOUT_LT24H";break;
     }
    }
   }
   if(rejection){skipped[rejection]=(skipped[rejection]??0)+1;continue;}
   chosen={
    runDayIndex:n,dateUtc:date(midnight),
    utcSlot:`${String(hour).padStart(2,"0")}:00`,
    conservativeStartUtc:iso(start),conservativeEndUtc:iso(end),
    pairId:pair?.pairId??null,crossoverPeriod:period,
    weekdayClass:weekday(midnight),
    airportsIfKnown:pair?airportSet(pair):null
   };
   if(pair){
    if(period===1)firstPairClass.set(p!,chosen.weekdayClass);
    for(const slot of SLOTS)lastEndByKnownIcao.set(pair.airports[slot].icao,end);
   }
   previousMidnight=midnight;previousParentEnd=end;
   map[String(n)]=chosen.dateUtc;days.push(chosen);
   break;
  }
  if(!chosen)break;
 }
 const complete=days.length===31;
 return {
  schema:P5_REAL_PAIR_DATE_CANDIDATE_SCHEMA,
  status:complete?"DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE":
     "HOLD_NO_DATE_GEOMETRY_WITHIN_BOUNDED_HORIZON",
  firstRunDateUtc:input.firstRunDateUtc,
  lastRunDateUtc:complete?days[30].dateUtc:null,
  elapsedCalendarDays:complete?
    1+(strictDate(days[30].dateUtc)-first)/DAY:null,
  dateMapSha256:complete?digest(map):null,
  reviewedRunDatesByIndex:map,days,
  skippedDatesByReason:skipped,
  repeatedKnownPairAirportsWashoutChecked:true,
  conservativeAllWindowsMaxSixHours:true,
  ordinaryAdaptiveAirportIdentityVerified:false,
  serviceWindowPassengerFlightsVerified:false,
  providerRangeAndSourceGetCoverageVerified:false,
  physicalUtcChargeDayBudgetVerified:false,
  sourceContentsRightsAndExpiryVerified:false,
  separateTreatmentOrderRandomizationCertified:false,
  genuinePrePostAndReceiverVerified:false,
  phase5ScientificFreezePassed:false,phase6PaidGo:false,
  providerCalls:0,databaseWrites:0,paidAlertCreates:0
 };
}
