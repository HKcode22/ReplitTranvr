/**
 * Phase 5 — exact 40 paired airport × conservative UTC-window reviewer matrix.
 *
 * From the original production corrected five-pair receipt ONLY. No provider,
 * database, web/HTTP, secrets, flight counts, invented original response,
 * source rights or release authority. The public-context overlay is a
 * REVIEWER CLAIM, never source-native coverage proof and never an ML feature.
 */
import {createHash} from "node:crypto";
import {
 proposeP5RealCorrectedPairDateGeometry,
 type P5DateOnlyCandidateInput
} from "./phase5CorrectedPairDateGeometryProposal_v39";

export const P5_CROSSOVER_40_WINDOW_REVIEW_SCHEMA =
 "v39.phase5.crossover-40-conservative-window-review.v1" as const;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
type Slot=typeof SLOTS[number];
const SHA=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const refusal=(code:string):never=>{
 throw new Error("REFUSED_P5_40_WINDOW_REVIEW_"+code);
};
const sha=(obj:unknown)=>createHash("sha256")
 .update(JSON.stringify(obj)).digest("hex");
const validIso=(text:string)=>ISO.test(text)&&
 Number.isFinite(Date.parse(text))&&
 new Date(Date.parse(text)).toISOString()===text;

export type P5PublicContextClass=
 "PUBLIC_SCHEDULE_INDICATES_SERVICE"|
 "PUBLIC_SCHEDULE_INDICATES_ZERO"|"PUBLIC_CONTEXT_INCONCLUSIVE";
export interface P5PublicContextClaim{
 /** A captured source must be tied to a particular airport, date and UTC window. */
 reviewKeySha256:string;
 observedAtUtc:string;
 sourceUrl:string;
 publicContextClass:P5PublicContextClass;
 /** For an independent reviewer: what time/window does the cited page show? */
 reviewerNotes:string;
}
export interface P5CrossoverWindowRow {
 reviewKeySha256:string;
 pairId:string;
 crossoverPeriod:1|2;
 runDayIndex:number;
 slot:Slot;
 airportIcao:string;
 startUtc:string;
 conservativeEndUtc:string;
 dateUtc:string;
 /** Endpoint is a conservative six-hour superset, NOT an active FIDS GET grid. */
 intervalKind:"MAX_SIX_HOUR_REVIEW_ENVELOPE_NOT_ACTIVE_EXPOSURE";
 weekdayClass:"weekday"|"weekend";
 publicContext:P5PublicContextClaim|null;
 providerNativeWindowSourceVerified:false;
 scheduledPassengerPopulation:"UNKNOWN";
 uniquePhysicalOperatingLegCount:null;
 directedRouteSupportCount:null;
 cutoffSafeSourceAvailableAtUtc:null;
}
export interface P5Crossover40ReviewResult{
 schema:typeof P5_CROSSOVER_40_WINDOW_REVIEW_SCHEMA;
 status:"HOLD_ALL_40_PROVIDER_NATIVE_WINDOWS_UNVERIFIED";
 calendarInputStatus:"DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE";
 correctedOwnerSelectedIcaosSha256:
  "f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592";
 firstRunDateUtc:string;
 candidateDateMapSha256:string;
 windowIdentitySha256:string;
 pairedRunDays:number;
 pairedAirportWindowRows:number;
 uniquePhysicalAirports:number;
 distinctDirectedRoutesVerified:0;
 windowsWithOnlyPublicContext:number;
 windowsWithoutPublicContext:number;
 nativeVerifiedWindows:0;
 unknownPopulationWindows:40;
 reviewRows:P5CrossoverWindowRow[];
 publicContextDoesNotCertifyProvider:true;
 historicalFrameIsNotFutureFlightPopulation:true;
 segmentAndHorizonSourceCoverageVerified:false;
 operatingLegDeduplicationVerified:false;
 ordinaryAdaptiveDaysVerified:false;
 sevenCategoryPhysicalRestBudgetVerified:false;
 lawfulSourceRetentionVerified:false;
 independentPhase5FreezePassed:false;
 phase6PaidGo:false;
 providerCalls:0;
 databaseWrites:0;
 paidAlertCreates:0;
}
function validatedPublicContext(claim:P5PublicContextClaim, startUtc:string){
 if(!SHA.test(claim.reviewKeySha256)||
    !validIso(claim.observedAtUtc)||
    Date.parse(claim.observedAtUtc)>Date.parse(startUtc)||
    !["PUBLIC_SCHEDULE_INDICATES_SERVICE",
      "PUBLIC_SCHEDULE_INDICATES_ZERO",
      "PUBLIC_CONTEXT_INCONCLUSIVE"].includes(claim.publicContextClass)||
    typeof claim.reviewerNotes!=="string"||
    !claim.reviewerNotes.trim()||claim.reviewerNotes.length>1200||
    typeof claim.sourceUrl!=="string"||claim.sourceUrl.length>1000)
  refusal("PUBLIC_CONTEXT_INVALID_OR_RETROSPECTIVE");
 let url:URL;
 try{url=new URL(claim.sourceUrl);}catch{refusal("PUBLIC_CONTEXT_INVALID_URL");}
 if(url!.protocol!=="https:"||!url!.hostname||url!.username||
    url!.password||url!.hash||url!.search)
  refusal("PUBLIC_CONTEXT_UNSAFE_URL");
}

/**
 * Builds the complete, deterministic REVIEW BACKLOG. Optional public sources
 * annotate it without ever certifying provider-supplied originals or flight
 * counts. All rows remain UNKNOWN until external authenticated source/audit.
 */
export function buildP5Crossover40WindowReview(
 input:P5DateOnlyCandidateInput,
 claims:readonly P5PublicContextClaim[]=[]
):P5Crossover40ReviewResult {
 if(!Array.isArray(claims)||claims.length>40)
  refusal("CLAIM_SET_INVALID");
 const candidate=proposeP5RealCorrectedPairDateGeometry(input);
 const dateMapSha256=candidate.dateMapSha256;
 if(candidate.status!=="DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE"||
    !dateMapSha256||!SHA.test(dateMapSha256)||
    candidate.days.length!==31)
  throw new Error("REFUSED_P5_40_WINDOW_REVIEW_DATE_CANDIDATE_UNSAT_OR_INCOMPLETE");
 const paired=candidate.days.filter(d=>d.pairId!==null);
 if(paired.length!==10||
    paired.some(d=>d.crossoverPeriod===null||!d.airportsIfKnown))
  refusal("PAIR_DAY_INTEGRITY_FAILURE");
 const basic=paired.flatMap(day=>{
  const pairId=day.pairId;
  const crossoverPeriod=day.crossoverPeriod;
  const airports=day.airportsIfKnown;
  if(!pairId||!crossoverPeriod||!airports)
   throw new Error("REFUSED_P5_40_WINDOW_REVIEW_INVALID_PAIR_DAY");
  return SLOTS.map(slot=>{
   const icao=airports[slot];
   if(!icao||!/^[A-Z]{4}$/.test(icao))
    throw new Error("REFUSED_P5_40_WINDOW_REVIEW_INVALID_KNOWN_AIRPORT");
   const identity={
    dateMapSha256,
    pairId,crossoverPeriod,
    runDayIndex:day.runDayIndex,slot,airportIcao:icao,
    startUtc:day.conservativeStartUtc,
    conservativeEndUtc:day.conservativeEndUtc
   };
   return {
    reviewKeySha256:sha(identity),
    pairId,crossoverPeriod,
   runDayIndex:day.runDayIndex,slot,airportIcao:icao,
   startUtc:day.conservativeStartUtc,
   conservativeEndUtc:day.conservativeEndUtc,
    dateUtc:day.dateUtc,weekdayClass:day.weekdayClass
   };
  });
 });
 const keys=new Set(basic.map(r=>r.reviewKeySha256));
 const airportSet=new Set(basic.map(r=>r.airportIcao));
 if(basic.length!==40||keys.size!==40||airportSet.size!==19)
  refusal("FORTY_ROWS_OR_NINETEEN_AIRPORTS_INVALID");
 for(let pair=1;pair<=5;pair++){
  const left=basic.filter(r=>r.pairId===`pair-${pair}`&&r.crossoverPeriod===1);
  const right=basic.filter(r=>r.pairId===`pair-${pair}`&&r.crossoverPeriod===2);
  if(left.length!==4||right.length!==4||
     left.some(x=>right.find(y=>y.slot===x.slot)?.airportIcao!==x.airportIcao))
    refusal("CROSSOVER_REPLAY_IDENTITY_DRIFT");
 }
 const publicByKey=new Map<string,P5PublicContextClaim>();
 for(const claim of claims){
  if(!claim||typeof claim!=="object"||
     !keys.has(claim.reviewKeySha256)||
     publicByKey.has(claim.reviewKeySha256))
   refusal("UNKNOWN_OR_DUPLICATE_REVIEW_KEY");
  const base=basic.find(r=>r.reviewKeySha256===claim.reviewKeySha256);
  if(!base)throw new Error("REFUSED_P5_40_WINDOW_REVIEW_REVIEW_KEY_MISSING");
  validatedPublicContext(claim,base.startUtc);
  publicByKey.set(claim.reviewKeySha256,claim);
 }
 const rows:P5CrossoverWindowRow[]=basic.map(r=>({
  ...r,
  intervalKind:"MAX_SIX_HOUR_REVIEW_ENVELOPE_NOT_ACTIVE_EXPOSURE",
  publicContext:publicByKey.get(r.reviewKeySha256)??null,
  providerNativeWindowSourceVerified:false,
  scheduledPassengerPopulation:"UNKNOWN",
  uniquePhysicalOperatingLegCount:null,
  directedRouteSupportCount:null,
  cutoffSafeSourceAvailableAtUtc:null
 }));
 return {
  schema:P5_CROSSOVER_40_WINDOW_REVIEW_SCHEMA,
  status:"HOLD_ALL_40_PROVIDER_NATIVE_WINDOWS_UNVERIFIED",
  calendarInputStatus:"DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE",
  correctedOwnerSelectedIcaosSha256:
   "f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592",
  firstRunDateUtc:input.firstRunDateUtc,
  candidateDateMapSha256:dateMapSha256,
  windowIdentitySha256:sha(basic),
  pairedRunDays:10,
  pairedAirportWindowRows:40,
  uniquePhysicalAirports:19,
  distinctDirectedRoutesVerified:0,
  windowsWithOnlyPublicContext:publicByKey.size,
  windowsWithoutPublicContext:40-publicByKey.size,
  nativeVerifiedWindows:0,
  unknownPopulationWindows:40,
  reviewRows:rows,
  publicContextDoesNotCertifyProvider:true,
  historicalFrameIsNotFutureFlightPopulation:true,
  segmentAndHorizonSourceCoverageVerified:false,
  operatingLegDeduplicationVerified:false,
  ordinaryAdaptiveDaysVerified:false,
  sevenCategoryPhysicalRestBudgetVerified:false,
  lawfulSourceRetentionVerified:false,
  independentPhase5FreezePassed:false,
  phase6PaidGo:false,
  providerCalls:0,databaseWrites:0,paidAlertCreates:0
 };
}
