/**
 * Phase5 f.8: physical FIDS request RANGE-PARTITION FLOOR for a 31-parent-day
 * shape-only study. Ten paired days have four known *candidate* airports;
 * the other 21 require future genuinely prospective four-site DB draws.
 *
 * This is only a MATHEMATICAL LOWER BOUND: no refreshes, retries, outcome
 * GETs, validations, other REST categories or Alerts are priced. Signed SHA
 * fields can pin assumed inputs but cannot prove provider entitlement,
 * lawful Contents use or the real available-at of any flight-level PRE.
 */
import {createHash} from "node:crypto";
import type {
 P5Adaptive31ShapeEnvelope,P5Adaptive31ShapeDay
} from "./phase5Prospective31DayShapeEnvelope_v39";

const SHA=/^[a-f0-9]{64}$/;
const ICAO=/^[A-Z]{4}$/;
const HOUR=3600000,MINUTE=60000;
const MATCHED="f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592";
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const refuse=(why:string):never=>{
 throw Error("REFUSED_P5_SHAPE_ONLY_RANGE_FLOOR_"+why);
};
const digest=(x:unknown)=>createHash("sha256")
 .update(JSON.stringify(x)).digest("hex");
const time=(x:unknown,label:string):number=>{
 if(typeof x!=="string"||!/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x))
  refuse(label+"_NOT_EXACT_UTC");
 const n=Date.parse(x);
 if(!Number.isFinite(n)||new Date(n).toISOString()!==x)
  refuse(label+"_INVALID_UTC");
 return n;
};
const integer=(x:unknown,min:number,max:number,label:string):number=>{
 if(typeof x!=="number"||!Number.isSafeInteger(x)||x<min||x>max)
  refuse(label+"_NOT_CANONICAL_INTEGER");
 return x;
};
export interface P5ShapeOnlyRangeFloorInput {
 envelope:P5Adaptive31ShapeEnvelope;
 /** The independently reviewed 31-day shape fingerprint, NOT a magic SHA. */
 separatelyReviewedShapeEnvelopeSha256:string;
 /** Hypothesis from a separately reviewed provider request-range source.
  * This function does not inspect source headers or the subscription. */
 assumedProviderMaxFidsRangeMinutes:number;
 providerRangeEvidenceSha256:string;
 /** Hypothetical units per physical GET, NOT authenticated account pricing. */
 assumedApiUnitsPerPhysicalGet:number;
 /** Policy ceiling for a study cycle, NOT proof of available credits. */
 projectCycleApiUnitCeiling:50000;
}
export interface P5ShapeOnlyRangeFloorDay {
 runDayIndex:number;
 serviceDateUtc:string;
 windowShape:P5Adaptive31ShapeDay["windowShape"];
 selectedAirportIdentitiesState:P5Adaptive31ShapeDay["selectionState"];
 segmentCount:number;
 rangePartitionsPerOneAirportAndHorizon:number;
 minPhysicalGetsFourSlotsThreeHorizons:number;
 minApiUnitsUnderAssumedPrice:number;
 physicalUtcChargeDayAssigned:false;
}
export interface P5ShapeOnlyRangeFloorResult {
 schema:"v39.phase5.f8.31-day-site-unknown-range-partition-floor.v1";
 status:"MATHEMATICAL_FIDS_PARTITION_FLOOR_ONLY_NOT_A_SOURCE_GRID";
 matchedActualB0062FivePairSha256:typeof MATCHED;
 shapeEnvelopeSha256:string;
 providerRangeEvidenceSha256:string;
 assumedProviderMaxFidsRangeMinutes:number;
 assumedApiUnitsPerPhysicalGet:number;
 projectCycleApiUnitCeiling:50000;
 studiedParentDays:31;
 knownPairedParentDays:10;
 ordinaryParentDaysPendingProspectiveDraw:21;
 activeChildSegments:34;
 horizonCount:3;
 airportSlotsPerDay:4;
 totalMinimumPhysicalFidsGets:number;
 totalMinimumFidsApiUnits:number;
 minimumUnitsExceedCycleCap:boolean;
 perRunDay:P5ShapeOnlyRangeFloorDay[];
 /** All categories that make real accounting larger than this floor. */
 sourceRefreshesCosted:false;
 physicalRetriesCosted:false;
 actualUtcChargeDaysAssigned:false;
 sevenRestCategoriesAndAlertsReserved:false;
 actualLiveProviderRangeVerifiedByThisFunction:false;
 actualPriceOrBalanceVerifiedByThisFunction:false;
 all21ProspectiveDrawsCommitted:false;
 legalContentsUseVerified:false;
 realFlightPopulationOrPreCertified:false;
 phase5ScientificFreezePassed:false;
 phase6PaidGo:false;
 providerCalls:0;
 databaseWrites:0;
}
const sealedDay=(day:P5Adaptive31ShapeDay,index:number):{
 partitions:number,activeSegments:number
}=>{
 if(!day||day.runDayIndex!==index+1||
    !["4h","2x2h","up-to-6h"].includes(day.windowShape)||
    !Array.isArray(day.activeSegments)||
    day.activeSegments.length!==(day.windowShape==="2x2h"?2:1))
  refuse("WINDOW_SHAPE_OR_DAY_INDEX");
 const start=time(day.startUtc,"DAY_START"),
  end=time(day.endUtc,"DAY_END");
 const durations=day.activeSegments.map((segment,j)=>{
  if(!segment||segment.segmentIndex!==j+1)refuse("CHILD_SEGMENT_NUMBER");
  const s=time(segment.startUtc,"CHILD_START"),
    e=time(segment.endUtc,"CHILD_END");
  if(s<start||e>end||e<=s)refuse("CHILD_OUTSIDE_EXPOSURE");
  if(j===0&&s!==start)refuse("CHILD_START_MISMATCH");
  if(j>0&&s<Date.parse(day.activeSegments[j-1].endUtc))
   refuse("CHILD_SEGMENTS_OVERLAP");
  return {s,e,length:e-s};
 });
 if(durations.at(-1)?.e!==end)refuse("LAST_SEGMENT_END_MISMATCH");
 if(day.windowShape==="4h"&&
    (end-start!==4*HOUR||durations[0].length!==4*HOUR||
     day.excludedSplitGap!==null))
  refuse("FOUR_HOUR_TREATMENT_CHANGED");
 if(day.windowShape==="2x2h"&&
    (end-start!==5*HOUR||durations.some(d=>d.length!==2*HOUR)||
     !day.excludedSplitGap||
     time(day.excludedSplitGap.startUtc,"GAP_START")!==durations[0].e||
     time(day.excludedSplitGap.endUtc,"GAP_END")!==durations[1].s||
     durations[1].s-durations[0].e!==HOUR))
  refuse("SPLIT_GAP_OR_TREATMENT_CHANGED");
 if(day.windowShape==="up-to-6h"&&
    (end-start!==6*HOUR||durations[0].length!==6*HOUR||
     day.excludedSplitGap!==null))
  refuse("SIX_HOUR_EXPOSURE_BOUND_CHANGED");
 const isPaired=day.pairId!==null;
 if(isPaired){
  const candidates=day.pairedAirportCandidates;
  if(!candidates||day.selectionState!=="PAIRED_CANDIDATE_NOT_SIGNED"||
     SLOTS.some(slot=>!ICAO.test(candidates[slot]??""))||
     new Set(SLOTS.map(s=>candidates[s])).size!==4)
   refuse("REAL_PAIR_CANDIDATES_MISSING");
 }else if(day.pairedAirportCandidates!==null||
          day.selectionState!=="ORDINARY_AIRPORT_IDENTITIES_PENDING_PROSPECTIVE_DB_DRAW"||
          day.crossoverPeriod!==null)
  refuse("FUTURE_ORDINARY_SITE_IDENTITIES_FABRICATED");
 return {partitions:0,activeSegments:durations.length};
};
/**
 * Output is a necessary per-airport/per-horizon minimum to cover *range
 * geometry*. It is NOT sufficient for continuously fresh flight-specific
 * T24/T6/T90, not a physical scheduling plan or an admissible seven-category
 * signed reservation. Real provider max range and price are external facts.
 */
export function calculateP5ShapeOnlyFidsRangePartitionFloor(
 input:P5ShapeOnlyRangeFloorInput
):P5ShapeOnlyRangeFloorResult{
 if(!input||typeof input!=="object")refuse("MISSING_FROZEN_INPUT");
 const e=input.envelope;
 if(!e||e.schema!=="v39.phase5.31day-shape-with-prospective-adaptive-draws.v1"||
    e.status!=="PROVISIONAL_SHAPE_ENVELOPE_ONLY_21_ADAPTIVE_DRAWS_PENDING"||
    e.actualCorrectedB0062SelectionSha256!==MATCHED||
    !SHA.test(input.separatelyReviewedShapeEnvelopeSha256??"")||
    e.shapeEnvelopeSha256!==input.separatelyReviewedShapeEnvelopeSha256||
    !Array.isArray(e.days)||e.days.length!==31||
    digest(e.days)!==e.shapeEnvelopeSha256||
    e.plannedBatchDays!==31||e.knownPairParentDays!==10||
    e.ordinaryAdaptiveParentDays!==21||e.activeChildExposureSegments!==34||
    e.knownUniquePairedAirports!==19||e.frozenAirportsForFutureOrdinaryDays!==0||
    e.phase5ScientificFreezePassed!==false||e.phase6PaidGo!==false||
    !SHA.test(input.providerRangeEvidenceSha256??""))
  refuse("UNREVIEWED_OR_MUTATED_REAL_31_DAY_SHAPE");
 const range=integer(input.assumedProviderMaxFidsRangeMinutes,1,360,
  "PROVIDER_MAX_RANGE")*MINUTE;
 const perGet=integer(input.assumedApiUnitsPerPhysicalGet,1,100,
  "UNIT_PRICE");
 if(input.projectCycleApiUnitCeiling!==50000)
  refuse("CHANGED_PROJECT_REST_CEILING");
 let minGets=0,paired=0,ordinary=0,childSegments=0;
 let previousServiceStart=-Infinity;
 const result:P5ShapeOnlyRangeFloorDay[]=[];
 const shapeCounts={"4h":0,"2x2h":0,"up-to-6h":0};
 for(let i=0;i<31;i++){
  const day=e.days[i],start=time(day?.startUtc,"DAY_START");
  if(start<=previousServiceStart)refuse("NONPROSPECTIVE_DAY_ORDER");
  previousServiceStart=start;
  const preliminary=sealedDay(day,i);
  childSegments+=preliminary.activeSegments;
  shapeCounts[day.windowShape]++;
  if(day.pairId!==null)paired++;else ordinary++;
  const partitions=day.activeSegments.reduce((n,s)=>{
   const duration=time(s.endUtc,"CHILD_END")-time(s.startUtc,"CHILD_START");
   return n+Math.ceil(duration/range);
  },0);
  if(partitions<1||!Number.isSafeInteger(partitions))
   refuse("INVALID_SOURCE_PARTITIONS");
  const minimumGets=partitions*4*3;
  minGets+=minimumGets;
  result.push({
   runDayIndex:day.runDayIndex,serviceDateUtc:day.dateUtc,
   windowShape:day.windowShape,
   selectedAirportIdentitiesState:day.selectionState,
   segmentCount:day.activeSegments.length,
   rangePartitionsPerOneAirportAndHorizon:partitions,
   minPhysicalGetsFourSlotsThreeHorizons:minimumGets,
   minApiUnitsUnderAssumedPrice:minimumGets*perGet,
   physicalUtcChargeDayAssigned:false
  });
 }
 if(childSegments!==34||paired!==10||ordinary!==21||
    shapeCounts["4h"]!==26||shapeCounts["2x2h"]!==3||
    shapeCounts["up-to-6h"]!==2||minGets<408)
  refuse("PARENT_SHAPE_OR_COUNT_DRIFT");
 const minUnits=minGets*perGet;
 return {
  schema:"v39.phase5.f8.31-day-site-unknown-range-partition-floor.v1",
  status:"MATHEMATICAL_FIDS_PARTITION_FLOOR_ONLY_NOT_A_SOURCE_GRID",
  matchedActualB0062FivePairSha256:MATCHED,
  shapeEnvelopeSha256:e.shapeEnvelopeSha256,
  providerRangeEvidenceSha256:input.providerRangeEvidenceSha256,
  assumedProviderMaxFidsRangeMinutes:input.assumedProviderMaxFidsRangeMinutes,
  assumedApiUnitsPerPhysicalGet:perGet,
  projectCycleApiUnitCeiling:50000,
  studiedParentDays:31,knownPairedParentDays:10,
  ordinaryParentDaysPendingProspectiveDraw:21,
  activeChildSegments:34,horizonCount:3,airportSlotsPerDay:4,
  totalMinimumPhysicalFidsGets:minGets,
  totalMinimumFidsApiUnits:minUnits,
  minimumUnitsExceedCycleCap:minUnits>50000,
  perRunDay:result,
  sourceRefreshesCosted:false,physicalRetriesCosted:false,
  actualUtcChargeDaysAssigned:false,
  sevenRestCategoriesAndAlertsReserved:false,
  actualLiveProviderRangeVerifiedByThisFunction:false,
  actualPriceOrBalanceVerifiedByThisFunction:false,
  all21ProspectiveDrawsCommitted:false,
  legalContentsUseVerified:false,realFlightPopulationOrPreCertified:false,
  phase5ScientificFreezePassed:false,phase6PaidGo:false,
  providerCalls:0,databaseWrites:0
 };
}
