/**
 * Gate 5 descriptive missingness / partial-identification calculation.
 * No source fetches, no database operations, no CI scientific auto-PASS.
 *
 * An unknown physical flight denominator is NOT the number of repeated
 * FIDS source rows. Under arbitrarily outcome-dependent missingness, the
 * binary event frequency among known applicable flights is identified only
 * between observed positives / applicable and
 * (observed positives + all unlabeled applicable) / applicable.
 *
 * This is a finite-frame deterministic bound, NOT an i.i.d. confidence
 * interval and NOT proof that any caller's numerator/denominator is real.
 */
export const P4_G5_PARTIAL_IDENTIFICATION_SCHEMA_V39=
 "v39.phase4.gate5-binary-outcome-partial-identification.v1" as const;
export type P4G5EvidenceFrameV39="FLIGHT_LEVEL_SCOPED"|"SOURCE_ONLY_REPEATED_ROWS";
export type P4G5ScientificTargetV39=
 "ORIGINAL_ACTUAL_ONLY_WHEELS_OFF"|"ALTERNATIVE_PROVIDER_TERMINAL_STATUS"|
 "ALTERNATIVE_FORECAST_REVISION";
export type P4G5HorizonV39="T-24h"|"T-6h"|"T-90m";
export interface P4G5BoundedCellV39{
  cohortId:string;
  airportIcao:string;horizon:P4G5HorizonV39;
  evidenceFrame:P4G5EvidenceFrameV39;
  target:P4G5ScientificTargetV39;
  // The source-only diagnostic may report this aggregate; it is never N.
  repeatedSourceObservationRows:number|null;
  // Every count below must refer to independently identity-resolved flights.
  populationMembers:number|null;
  horizonEligible:number|null;
  preExpected:number|null;prePersisted:number|null;
  capturedInsidePopulation:number|null;
  capturedOutsidePopulation:number|null;
  unresolvedWebhookIdentities:number|null;
  // Three mutually exclusive applicability categories.
  targetKnownApplicable:number|null;
  targetKnownNotApplicable:number|null;
  targetApplicabilityUnknown:number|null;
  // Five disjoint classes within targetKnownApplicable.
  // reportedVerifiedObserved is a claim by upstream evidence, NOT authenticated
  // by this numerical function. For actual-only it must be physical actual.
  reportedVerifiedObserved:number|null;
  reportedVerifiedPositive:number|null;
  adsbProxyOnly:number|null;estimatedOrUnverified:number|null;
  pending:number|null;missingOrCensored:number|null;
}
type Ratio={numerator:number|null;denominator:number|null;
 value:number|null;reason:string|null};
export interface P4G5BoundedCellReportV39{
 schema:typeof P4_G5_PARTIAL_IDENTIFICATION_SCHEMA_V39;
 cohortId:string;airportIcao:string;horizon:P4G5HorizonV39;
 evidenceFrame:P4G5EvidenceFrameV39;target:P4G5ScientificTargetV39;
 repeatedSourceObservationRows:number|null;
 countClass:"SOURCE_ONLY_NO_FLIGHT_DENOMINATOR"|
  "FLIGHT_LEVEL_PARTIAL_COUNTS"|"FLIGHT_LEVEL_COMPLETE_COUNTS";
 preCompleteness:Ratio;webhookCapture:Ratio;verifiedTargetCoverage:Ratio;
 outsidePopulationCaptureRate:null;
 /** Identified risk among KNOWN applicable flights; not whole flight population. */
 outcomeBoundsAmongKnownApplicable:{lower:number;upper:number;
  width:number;observedOnlyRate:number|null;
  unlabeledApplicable:number;denominator:number}|null;
 populationWideRisk:null;
 nonIgnorableMissingnessCouldReverseConclusions:true;
 unknownApplicabilityPreventsFullTargetPopulationClaim:boolean;
 independentlyAuthenticatedTargetSemantics:false;
 certifiedProviderSourceRights:false;
 iidSamplingOrMissingAtRandomAssumed:false;
 gate5ScientificPassed:false;phase5Authorized:false;phase6Authorized:false;
 providerCalls:0;databaseWrites:0;
}
function reject(reason:string):never{
 throw Error("P4_G5_PARTIAL_IDENTIFICATION_"+reason+"_HOLD");
}
const integer=(n:number|null):n is number=>
 typeof n==="number"&&Number.isSafeInteger(n)&&n>=0;
const H=["T-24h","T-6h","T-90m"];
const F=["FLIGHT_LEVEL_SCOPED","SOURCE_ONLY_REPEATED_ROWS"];
const T=["ORIGINAL_ACTUAL_ONLY_WHEELS_OFF",
 "ALTERNATIVE_PROVIDER_TERMINAL_STATUS","ALTERNATIVE_FORECAST_REVISION"];
const fields=[
 "repeatedSourceObservationRows","populationMembers","horizonEligible",
 "preExpected","prePersisted","capturedInsidePopulation",
 "capturedOutsidePopulation","unresolvedWebhookIdentities",
 "targetKnownApplicable","targetKnownNotApplicable","targetApplicabilityUnknown",
 "reportedVerifiedObserved","reportedVerifiedPositive",
 "adsbProxyOnly","estimatedOrUnverified","pending","missingOrCensored"
] as const;
function ratio(n:number|null,d:number|null):Ratio{
 if(n===null||d===null)return {
  numerator:n,denominator:d,value:null,reason:"NOT_MEASURED"};
 if(d===0)return {
  numerator:n,denominator:d,value:null,reason:"ZERO_MEASURED_DENOMINATOR"};
 if(n>d)reject("NUMERATOR_EXCEEDS_DENOMINATOR");
 return {numerator:n,denominator:d,value:n/d,reason:null};
}
function checkCell(c:P4G5BoundedCellV39){
 if(!c||!/^[A-Z][A-Z0-9_-]{7,79}$/.test(c.cohortId)||
    !/^[A-Z]{4}$/.test(c.airportIcao)||
    !H.includes(c.horizon)||!F.includes(c.evidenceFrame)||
    !T.includes(c.target))reject("SCOPE");
 for(const k of fields){
  const n=c[k];
  if(n!==null&&!integer(n))reject("BAD_NONNEGATIVE_COUNT_"+k);
 }
 if(c.evidenceFrame==="SOURCE_ONLY_REPEATED_ROWS"){
  if(fields.some(k=>k!=="repeatedSourceObservationRows"&&c[k]!==null))
   reject("SOURCE_ONLY_CANNOT_ASSERT_FLIGHT_COUNTS");
  return;
 }
 if(c.populationMembers!==null&&c.horizonEligible!==null&&
    c.horizonEligible>c.populationMembers)reject("ELIGIBLE_EXCEEDS_POPULATION");
 if(c.preExpected!==null&&c.horizonEligible!==null&&
    c.preExpected!==c.horizonEligible)reject("PRE_EXPECTED_NOT_ELIGIBLE");
 if(c.preExpected!==null&&c.prePersisted!==null&&
    c.prePersisted>c.preExpected)reject("PRE_EXCEEDS_EXPECTED");
 if(c.capturedInsidePopulation!==null&&c.horizonEligible!==null&&
    c.capturedInsidePopulation>c.horizonEligible)
   reject("CAPTURE_EXCEEDS_ELIGIBLE");
 const app=[c.targetKnownApplicable,c.targetKnownNotApplicable,
  c.targetApplicabilityUnknown];
 if(app.every(x=>x!==null)&&c.horizonEligible!==null&&
    app.reduce<number>((a,b)=>a+(b??0),0)!==c.horizonEligible)
  reject("APPLICABILITY_NOT_PARTITION");
 const label=[c.reportedVerifiedObserved,c.adsbProxyOnly,
  c.estimatedOrUnverified,c.pending,c.missingOrCensored];
 if(label.every(x=>x!==null)&&c.targetKnownApplicable!==null&&
    label.reduce<number>((a,b)=>a+(b??0),0)!==c.targetKnownApplicable)
  reject("LABEL_CLASS_NOT_PARTITION");
 if(c.reportedVerifiedObserved!==null&&c.targetKnownApplicable!==null&&
    c.reportedVerifiedObserved>c.targetKnownApplicable)
  reject("VERIFIED_EXCEEDS_KNOWN_APPLICABLE");
 if(c.reportedVerifiedObserved!==null&&c.reportedVerifiedPositive!==null&&
    c.reportedVerifiedPositive>c.reportedVerifiedObserved)
  reject("POSITIVE_EXCEEDS_VERIFIED");
 if(c.reportedVerifiedPositive!==null&&
    c.reportedVerifiedObserved===null)
  reject("POSITIVE_WITHOUT_VERIFIED_OBSERVED");
}
export function auditP4G5BinaryOutcomeBoundsV39(
 c:P4G5BoundedCellV39
):P4G5BoundedCellReportV39{
 checkCell(c);
 const sourceOnly=c.evidenceFrame==="SOURCE_ONLY_REPEATED_ROWS";
 const pre=ratio(c.prePersisted,c.preExpected);
 const capture=ratio(c.capturedInsidePopulation,c.horizonEligible);
 const label=ratio(c.reportedVerifiedObserved,c.targetKnownApplicable);
 let bounds:P4G5BoundedCellReportV39["outcomeBoundsAmongKnownApplicable"]=null;
 const n=c.targetKnownApplicable,k=c.reportedVerifiedObserved,
  x=c.reportedVerifiedPositive;
 if(!sourceOnly&&n!==null&&k!==null&&x!==null&&n>0){
  if(k>n)reject("VERIFIED_EXCEEDS_APPLICABLE");
  // Directed worst-case bounds remain valid even if unlabeled flights have
  // arbitrary risk and are not missing-at-random.
  const missing=n-k;
  bounds={lower:x/n,upper:(x+missing)/n,
   width:missing/n,observedOnlyRate:k>0?x/k:null,
   unlabeledApplicable:missing,denominator:n};
 }
 const complete=!sourceOnly&&fields.filter(
  x=>x!=="repeatedSourceObservationRows").every(k=>c[k]!==null);
 return {
  schema:P4_G5_PARTIAL_IDENTIFICATION_SCHEMA_V39,
  cohortId:c.cohortId,airportIcao:c.airportIcao,horizon:c.horizon,
  evidenceFrame:c.evidenceFrame,target:c.target,
  repeatedSourceObservationRows:c.repeatedSourceObservationRows,
  countClass:sourceOnly?"SOURCE_ONLY_NO_FLIGHT_DENOMINATOR":
   complete?"FLIGHT_LEVEL_COMPLETE_COUNTS":"FLIGHT_LEVEL_PARTIAL_COUNTS",
  preCompleteness:pre,webhookCapture:capture,verifiedTargetCoverage:label,
  outsidePopulationCaptureRate:null,
  outcomeBoundsAmongKnownApplicable:bounds,populationWideRisk:null,
  nonIgnorableMissingnessCouldReverseConclusions:true,
  unknownApplicabilityPreventsFullTargetPopulationClaim:
   c.targetApplicabilityUnknown===null||
   c.targetApplicabilityUnknown>0,
  independentlyAuthenticatedTargetSemantics:false,
  certifiedProviderSourceRights:false,
  iidSamplingOrMissingAtRandomAssumed:false,
  gate5ScientificPassed:false,phase5Authorized:false,phase6Authorized:false,
  providerCalls:0,databaseWrites:0
 };
}
export function summarizeP4G5BoundsAcrossCellsV39(
 cells:readonly P4G5BoundedCellV39[]
){
 if(!Array.isArray(cells)||cells.length===0||cells.length>3000)
  reject("CELL_COLLECTION");
 const seen=new Set<string>();
 const audited=cells.map(c=>{
  const key=c.cohortId+"|"+c.airportIcao+"|"+c.horizon+"|"+c.target;
  if(seen.has(key))reject("DUPLICATE_COHORT_HORIZON_TARGET_CELL");
  seen.add(key);return auditP4G5BinaryOutcomeBoundsV39(c);
 });
 const known=audited.filter(x=>x.outcomeBoundsAmongKnownApplicable!==null);
 const widths=known.map(x=>x.outcomeBoundsAmongKnownApplicable!.width);
 return {
  schema:"v39.phase4.gate5-partial-identification-multi-stratum.v1" as const,
  totalCells:audited.length,sourceOnlyCells:audited.filter(
   x=>x.evidenceFrame==="SOURCE_ONLY_REPEATED_ROWS").length,
  numericallyIdentifiableCells:known.length,
  maximumUnlabeledOutcomeRiskWidth:widths.length?Math.max(...widths):null,
  cells:audited,
  noIndependentSamplingOrCausalIdentificationClaim:true as const,
  gate5ScientificPassed:false as const,
  phase5Authorized:false as const,phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}
