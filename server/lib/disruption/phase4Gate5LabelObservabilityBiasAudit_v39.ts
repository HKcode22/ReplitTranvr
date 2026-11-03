/**
 * f.8 §§5/7/13 Gate5 -> Phase7: pure bounded offline missing-label audit.
 *
 * Population membership is selected from FIDS as-of the prediction cutoff,
 * never from the subset that happened to produce a webhook, ADS-B trace or
 * a labeled outcome. These are independently counted dimensions.
 *
 * Caller-supplied label evidence must be independently checked upstream.
 * This module deliberately NEVER certifies scientific Gate5 or absence of
 * selection bias. It returns anonymous denominators and descriptive gaps,
 * not automatic inverse-propensity weights.
 */
export type P4G5HorizonV39="T-24h"|"T-6h"|"T-90m";
export type P4G5TierV39="HUB"|"MID"|"REGIONAL";
export type P4G5LabelClassV39=
 "EXTERNAL_ACTUAL_ONLY_VERIFIED"|"ADSB_INFERRED_PROXY_ONLY"|
 "ESTIMATED_OR_UNVERIFIED"|"PENDING"|"MISSING";
export interface P4G5LabelObservationV39 {
  /** 64-character digest for in-memory duplicate detection, never output. */
  scopedFlightDigest:string;
  airportIcao:string;
  tier:P4G5TierV39;
  horizon:P4G5HorizonV39;
  providerPopulationMemberAsOfCutoff:boolean;
  horizonEligible:boolean;
  operatingLegIdentityVerified:boolean;
  persistedPreSnapshot:boolean;
  webhookCaptured:boolean;
  labelClass:P4G5LabelClassV39;
}
export interface P4G5LabelCoverageBucketV39 {
  airportIcao:string;tier:P4G5TierV39;horizon:P4G5HorizonV39;
  populationMembers:number;horizonEligible:number;prePersisted:number;
  webhookCaptured:number;capturedOutsideFidsPopulation:number;
  exactActualLabelReported:number;inferredProxyOnly:number;estimatedOrUnverified:number;
  pending:number;missing:number;unverifiedOperatingLeg:number;
  preCoverageRate:number|null;exactLabelCoverageRate:number|null;
  webhookCoverageRate:number|null;
}
export interface P4G5LabelCoverageAuditV39 {
  schema:"v39.phase4.gate5-label-observability-bias-offline.v1";
  buckets:readonly P4G5LabelCoverageBucketV39[];
  minCountForDescriptiveStratum:number;
  maxMinusMinReportedLabelCoverage:number|null;
  comparedStratumCount:number;
  totalCapturedOutsideFidsPopulation:number;
  outsideFidsPopulationCaptureRate:null;
  labelSelectionBiasAbsentProven:false;
  missingNotZeroDelay:true;
  auditedEvidenceDoesNotCertifySemantics:true;
  inversePropensityWeightsApproved:false;
  gate5ScientificPass:false;
  phase7ModelEvaluationApproved:false;
  noProviderCalls:true;noDatabaseWrites:true;
}
const sha=/^[a-f0-9]{64}$/;
const icao=/^[A-Z]{4}$/;
const tiers=["HUB","MID","REGIONAL"];
const horizons=["T-24h","T-6h","T-90m"];
const classes=["EXTERNAL_ACTUAL_ONLY_VERIFIED","ADSB_INFERRED_PROXY_ONLY",
 "ESTIMATED_OR_UNVERIFIED","PENDING","MISSING"];
/**
 * Repeated horizon retrievals are *not* separate physical flights. A digest
 * must refer to the same audited operating-leg candidate at a given horizon.
 * Rate denominator stays FIDS population/horizon eligible, never capture-only.
 */
export function auditP4G5LabelObservabilityV39(
  records:readonly P4G5LabelObservationV39[],minStratumN=20
):P4G5LabelCoverageAuditV39 {
  if(!Array.isArray(records)||records.length>30000||
     !Number.isInteger(minStratumN)||minStratumN<10||minStratumN>10000)
    throw Error("P4_G5_LABEL_AUDIT_BOUNDARY_HOLD");
  const seen=new Set<string>();
  const byKey=new Map<string,P4G5LabelCoverageBucketV39>();
  for(const r of records){
    if(!r||!sha.test(r.scopedFlightDigest)||!icao.test(r.airportIcao)||
       !tiers.includes(r.tier)||!horizons.includes(r.horizon)||
       !classes.includes(r.labelClass)||[
        r.providerPopulationMemberAsOfCutoff,r.horizonEligible,
        r.operatingLegIdentityVerified,r.persistedPreSnapshot,r.webhookCaptured
       ].some(x=>typeof x!=="boolean"))
      throw Error("P4_G5_LABEL_AUDIT_INVALID_SOURCE_ROW");
    const duplicateKey=r.scopedFlightDigest+"|"+r.horizon;
    if(seen.has(duplicateKey))throw Error("P4_G5_LABEL_AUDIT_REPEAT_HORIZON_FLIGHT");
    seen.add(duplicateKey);
    // A not-in-frame flight can still be captured outside the population.
    // Such a capture is not silently promoted to a PRE or target denominator.
    if((r.horizonEligible&&!r.providerPopulationMemberAsOfCutoff)||
       (r.persistedPreSnapshot&&(!r.horizonEligible||
          !r.operatingLegIdentityVerified))||
       (r.labelClass==="EXTERNAL_ACTUAL_ONLY_VERIFIED"&&
          (!r.horizonEligible||!r.operatingLegIdentityVerified)))
      throw Error("P4_G5_LABEL_AUDIT_LINEAGE_OR_TARGET_HOLD");
    const key=[r.airportIcao,r.tier,r.horizon].join("|");
    let b=byKey.get(key);
    if(!b){b={airportIcao:r.airportIcao,tier:r.tier,horizon:r.horizon,
      populationMembers:0,horizonEligible:0,prePersisted:0,
      webhookCaptured:0,capturedOutsideFidsPopulation:0,
      exactActualLabelReported:0,
      inferredProxyOnly:0,estimatedOrUnverified:0,
      pending:0,missing:0,unverifiedOperatingLeg:0,
      preCoverageRate:null,exactLabelCoverageRate:null,
      webhookCoverageRate:null};
      byKey.set(key,b);
    }
    if(!r.providerPopulationMemberAsOfCutoff){
      // Capture outside the provider-observable FIDS denominator is an
      // independent dimension. Count it without promoting that identity
      // to population/PRE. The total universe outside FIDS is unknown,
      // so an outside-population capture *rate* must be NULL, not zero.
      if(r.webhookCaptured)b.capturedOutsideFidsPopulation++;
      continue;
    }
    b.populationMembers++;
    if(!r.operatingLegIdentityVerified)b.unverifiedOperatingLeg++;
    if(!r.horizonEligible)continue;
    b.horizonEligible++;
    if(r.persistedPreSnapshot)b.prePersisted++;
    if(r.webhookCaptured)b.webhookCaptured++;
    if(r.labelClass==="EXTERNAL_ACTUAL_ONLY_VERIFIED")b.exactActualLabelReported++;
    if(r.labelClass==="ADSB_INFERRED_PROXY_ONLY")b.inferredProxyOnly++;
    if(r.labelClass==="ESTIMATED_OR_UNVERIFIED")b.estimatedOrUnverified++;
    if(r.labelClass==="PENDING")b.pending++;
    if(r.labelClass==="MISSING")b.missing++;
  }
  const buckets=[...byKey.values()].sort((a,b)=>
    [a.airportIcao,a.tier,a.horizon].join("|").localeCompare(
     [b.airportIcao,b.tier,b.horizon].join("|")));
  for(const b of buckets){
    if(!b.horizonEligible)continue; // rate=NULL, never 0/0
    b.preCoverageRate=b.prePersisted/b.horizonEligible;
    b.webhookCoverageRate=b.webhookCaptured/b.horizonEligible;
    b.exactLabelCoverageRate=b.exactActualLabelReported/b.horizonEligible;
    if(b.exactActualLabelReported+b.inferredProxyOnly+
       b.estimatedOrUnverified+b.pending+b.missing!==b.horizonEligible)
      throw Error("P4_G5_LABEL_AUDIT_LABEL_CLASS_PARTITION_HOLD");
  }
  const eligible=buckets.filter(b=>b.horizonEligible>=minStratumN);
  // Descriptive only: mix of airport/tier/horizon groups, not causal proof.
  const rates=eligible.map(b=>b.exactLabelCoverageRate as number);
  return {schema:"v39.phase4.gate5-label-observability-bias-offline.v1",
    buckets,minCountForDescriptiveStratum:minStratumN,
    comparedStratumCount:rates.length,
    totalCapturedOutsideFidsPopulation:buckets.reduce(
     (n,b)=>n+b.capturedOutsideFidsPopulation,0),
    outsideFidsPopulationCaptureRate:null,
    maxMinusMinReportedLabelCoverage:rates.length>=2?
      Math.max(...rates)-Math.min(...rates):null,
    labelSelectionBiasAbsentProven:false,missingNotZeroDelay:true,
    auditedEvidenceDoesNotCertifySemantics:true,
    inversePropensityWeightsApproved:false,gate5ScientificPass:false,
    phase7ModelEvaluationApproved:false,
    noProviderCalls:true,noDatabaseWrites:true
  };
}
