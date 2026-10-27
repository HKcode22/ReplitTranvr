/**
 * f.8 Gate 0.5 — descriptive interpretation of authorized ADB-only Gate05d.
 * Input is anonymized aggregate receipts; NO provider calls, raw storage, SQL,
 * HTTP, flight identity or paid permission. This is NOT a statistical survey
 * of distinct physical flights and never certifies exact runway-delay labels.
 */
export interface Gate05dAggregateV39 {
  objects: number;
  scheduledPresent: number;
  revisedPresent: number;
  runwayPresent: number;
  operatorRecords: number;
  marketingRecords: number;
  liveDeparture: number;
  departedOrArrived: number;
  lastUpdatedPresent: number;
}
export interface Gate05dMatchedAggregateV39 extends Gate05dAggregateV39 {
  matchedWsssWithinOneHour: number;
  rawReturnedCount: number;
  fieldActualityIndependentlyEstablished: boolean;
  scheduledRunwayBaselinePresent: boolean;
}
export interface Gate05dEvidenceInputV39 {
  paidAttempts: number;
  apiUnitsSpent: number;
  alertCreditsSpent: number;
  maturedWindowAgeMinutes: readonly [number,number];
  fids: Gate05dAggregateV39;
  flightStatus: Gate05dMatchedAggregateV39;
}
export interface Gate05dEvidenceAssessmentV39 {
  schema: "v39.gate05d.qualified-runway-evidence.v1";
  technicalBilling: "PASS";
  fidsRunwayPresentRecords: number;
  fidsResponseRecords: number;
  fidsRunwayPresentFraction: number;
  fidsRunwayMissingRecords: number;
  matchedFlightStatusRunwayRecords: number;
  matchedFlightStatusRecords: number;
  exactVerifiedRunwayDelayLabels: 0;
  denominatorUnit: "FIDS_RESPONSE_RECORDS_NOT_DISTINCT_PHYSICAL_LEGS";
  statusSelection: "DELIBERATELY_PREFERENTIAL_NOT_RANDOM";
  crossCohortAgeEffectCausal: false;
  matchedWithinFlightRunwayIncrementMeasured: false;
  sourceActualityIndependentlyVerified: false;
  scheduledWheelsOffReferenceVerified: false;
  sourceAsOfCutoffTVerified: false;
  otherReceivedObservationsUsableForQualifiedResearch: true;
  paidProviderCallsByAssessment: 0;
}
function isCount(x:number):boolean{return Number.isSafeInteger(x)&&x>=0;}
function assertCounts(x:Gate05dAggregateV39,label:string):void{
  if(!x||!isCount(x.objects))throw Error(label+"_INVALID_ROWS");
  for(const k of ["scheduledPresent","revisedPresent","runwayPresent",
    "operatorRecords","marketingRecords","liveDeparture","departedOrArrived",
    "lastUpdatedPresent"] as const){
    if(!isCount(x[k])||x[k]>x.objects)throw Error(label+"_INVALID_"+k);
  }
  if(x.operatorRecords+x.marketingRecords>x.objects)
    throw Error(label+"_CODESHARE_DENOMINATOR_ERROR");
}
export function assessGate05dRunwayEvidenceV39(
  input:Gate05dEvidenceInputV39
):Gate05dEvidenceAssessmentV39{
  if(!input||input.paidAttempts!==2||input.apiUnitsSpent!==4||
    input.alertCreditsSpent!==0||
    !Array.isArray(input.maturedWindowAgeMinutes)||
    input.maturedWindowAgeMinutes.length!==2||
    !input.maturedWindowAgeMinutes.every(x=>Number.isFinite(x)&&x>=0)||
    input.maturedWindowAgeMinutes[0]>input.maturedWindowAgeMinutes[1])
    throw Error("GATE05D_NO_CONFIRMED_2GET_BILLING_RECEIPT");
  const {fids,flightStatus:flight}=input;
  assertCounts(fids,"FIDS");
  assertCounts(flight,"FLIGHTSTATUS");
  if(!isCount(flight.matchedWsssWithinOneHour)||
     !isCount(flight.rawReturnedCount)||
     flight.objects!==flight.matchedWsssWithinOneHour||
     flight.rawReturnedCount<flight.objects||
     flight.fieldActualityIndependentlyEstablished!==false||
     flight.scheduledRunwayBaselinePresent!==false)
    throw Error("GATE05D_MATCH_PROVENANCE_NOT_ESTABLISHED");
  if(fids.objects===0)throw Error("GATE05D_NO_FIDS_COVERAGE_DENOMINATOR");
  return {
    schema:"v39.gate05d.qualified-runway-evidence.v1",
    technicalBilling:"PASS",
    fidsRunwayPresentRecords:fids.runwayPresent,
    fidsResponseRecords:fids.objects,
    fidsRunwayPresentFraction:fids.runwayPresent/fids.objects,
    fidsRunwayMissingRecords:fids.objects-fids.runwayPresent,
    matchedFlightStatusRunwayRecords:flight.runwayPresent,
    matchedFlightStatusRecords:flight.objects,
    exactVerifiedRunwayDelayLabels:0,
    denominatorUnit:"FIDS_RESPONSE_RECORDS_NOT_DISTINCT_PHYSICAL_LEGS",
    statusSelection:"DELIBERATELY_PREFERENTIAL_NOT_RANDOM",
    crossCohortAgeEffectCausal:false,
    matchedWithinFlightRunwayIncrementMeasured:false,
    sourceActualityIndependentlyVerified:false,
    scheduledWheelsOffReferenceVerified:false,
    sourceAsOfCutoffTVerified:false,
    otherReceivedObservationsUsableForQualifiedResearch:true,
    paidProviderCallsByAssessment:0,
  };
}
