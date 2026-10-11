/**
 * P17/P19: scientifically useful OBSERVED-SUBSET-only descriptive scope.
 *
 * A known/validated RECEIVED cohort can have a descriptive mean even if
 * the upstream provider sender ledger is unavailable. Unknown selection
 * means the result does NOT estimate all airport flights or prove F.8.
 *
 * No API calls, historical reclassification, secret access or paid launch.
 * Users must verify actual row/metric source in a separate trusted workflow;
 * this pure helper does not authenticate caller-provided booleans.
 */
export type ObservedSubsetScopeInputV39 = Readonly<{
  mode:"offline-scope-assessment-only";
  originalFrozenWindowMinutes:120;
  receivedConfirmedPhysicalFlightItemsByUtcBin:readonly number[];
  receivedRunwayDepartureDelayMinutesSumByUtcBin:readonly number[];
  physicallyConfirmedV2AndCodeshareQuarantineVerified:boolean;
  storedCanonicalOrWireShaAndByteReadbackVerified:boolean;
  storedSourceRepresentation:"canonical_parsed_json"|"literal_provider_wire"|"unknown";
  recordedEventUtcAndEightBinMembershipVerified:boolean;
  metricContractAndRunwayDelayUnitsVerified:boolean;
  duplicateItemAndSingleOwnerContinuityAudited:boolean;
  postgresEpochAndRetainedRowsAudited:boolean;
  excludedQuarantinedItems:number;
  healthUncertaintySeconds:number;
  independentProviderSentItemsAuthenticated:boolean;
  independentlyKnownMissingEligibleItemCount:number|null;
}>;
export type ObservedSubsetScopeOutputV39 = Readonly<{
  schema:"v39.observed-subset-descriptive-scope.v1";
  status:"OBSERVED_SUBSET_DESCRIPTIVE_ONLY"|"NO_OBSERVED_CONFIRMED_YIELD"|"INVALID_OBSERVED_DATA";
  reasons:readonly string[];
  verifiedReceivedItems:number;
  excludedQuarantinedItems:number;
  receivedOnlyMeanRunwayDepartureDelayMinutes:number|null;
  receivedOnlyMeanByUtcBinMinutes:readonly (number|null)[];
  originalSourceByteForByteProviderWireEstablished:boolean;
  independentProviderMissingItems:number|null;
  unknownUpstreamSelection:boolean;
  observedUtcBinClockPreserved:boolean;
  operationalHealthUncertaintySeconds:number;
  canDescribeVerifiedReceivedItems:boolean;
  canInferAllEligibleAirportFlights:false;
  canClaimMissingAtRandom:false;
  canClaimUnbiasedPopulationMean:false;
  canClaimCompleteOriginalF8Window:false;
  canMarkHistoricalFailedProbeAsSuccess:false;
  canActivatePaidSixPlusSix:false;
  paidLaunchAuthorized:false;
}>;
const nat=(v:unknown):v is number=>typeof v==="number"&&
  Number.isSafeInteger(v)&&v>=0;
const n8=(x:unknown):x is readonly number[]=>Array.isArray(x)&&
  x.length===8&&x.every(nat);
const finite8=(x:unknown):x is readonly number[]=>Array.isArray(x)&&
  x.length===8&&x.every(v=>typeof v==="number"&&Number.isFinite(v));
export function assessObservedSubsetDescriptiveScopeV39(
  x:ObservedSubsetScopeInputV39
):ObservedSubsetScopeOutputV39{
  if(x.mode!=="offline-scope-assessment-only")
    throw Error("P17_OBSERVED_SCOPE_ONLY_NO_PAID_MODE");
  const err:string[]=[];
  if(x.originalFrozenWindowMinutes!==120)
    err.push("ORIGINAL_FROZEN_120_MINUTE_CLOCK_INVALID");
  if(!n8(x.receivedConfirmedPhysicalFlightItemsByUtcBin)||
     !finite8(x.receivedRunwayDepartureDelayMinutesSumByUtcBin))
    err.push("OBSERVED_EIGHT_BIN_COUNTS_OR_DELAY_SUMS_INVALID");
  if(!nat(x.excludedQuarantinedItems)||!nat(x.healthUncertaintySeconds)||
     x.healthUncertaintySeconds>7200)
    err.push("EXCLUSION_OR_HEALTH_WITNESS_INVALID");
  if(!x.physicallyConfirmedV2AndCodeshareQuarantineVerified)
    err.push("PHYSICAL_V2_CODESHARE_QUARANTINE_UNVERIFIED");
  if(!x.storedCanonicalOrWireShaAndByteReadbackVerified||
     x.storedSourceRepresentation==="unknown"||
     !["canonical_parsed_json","literal_provider_wire"].includes(x.storedSourceRepresentation))
    err.push("SAVED_CONTENT_SOURCE_HASH_OR_REPRESENTATION_UNKNOWN");
  if(!x.recordedEventUtcAndEightBinMembershipVerified)
    err.push("OBSERVED_UTC_EIGHT_BIN_MEMBERSHIP_UNVERIFIED");
  if(!x.metricContractAndRunwayDelayUnitsVerified)
    err.push("RUNWAY_DELAY_METRIC_SEMANTICS_UNVERIFIED");
  if(!x.duplicateItemAndSingleOwnerContinuityAudited)
    err.push("RECEIVED_ITEM_DUPLICATION_OR_OWNER_UNVERIFIED");
  if(!x.postgresEpochAndRetainedRowsAudited)
    err.push("UNLOGGED_EPOCH_ROW_SURVIVAL_UNVERIFIED");
  let count=0,sum=0;
  const means:(number|null)[]=Array(8).fill(null);
  if(n8(x.receivedConfirmedPhysicalFlightItemsByUtcBin)&&
     finite8(x.receivedRunwayDepartureDelayMinutesSumByUtcBin)){
    for(let i=0;i<8;i++){
      const n=x.receivedConfirmedPhysicalFlightItemsByUtcBin[i],
        s=x.receivedRunwayDepartureDelayMinutesSumByUtcBin[i];
      if(n===0&&s!==0)err.push("NONZERO_DELAY_SUM_IN_EMPTY_UTC_BIN");
      count+=n;sum+=s;
      if(n>0)means[i]=s/n;
    }
    if(!nat(count)||!Number.isFinite(sum))
      err.push("OBSERVED_COUNT_OR_DELAY_TOTAL_OVERFLOW");
    if(means.some(v=>v!==null&&!Number.isFinite(v)))
      err.push("OBSERVED_MEAN_NOT_FINITE");
  }
  if(x.independentlyKnownMissingEligibleItemCount!==null&&
     !nat(x.independentlyKnownMissingEligibleItemCount))
    err.push("INVALID_PROVIDER_MISSING_ITEM_COUNT");
  // A Boolean from an untrusted caller is NOT independently authenticated.
  // This helper can characterize an observed sample, not establish a true
  // upstream census or validate a billed credit ledger.
  const externallyKnownMissing=x.independentProviderSentItemsAuthenticated===true&&
    x.independentlyKnownMissingEligibleItemCount!==null&&
    nat(x.independentlyKnownMissingEligibleItemCount)?
      x.independentlyKnownMissingEligibleItemCount:null;
  const okay=err.length===0&&count>0;
  const status:ObservedSubsetScopeOutputV39["status"]=err.length>0?
    "INVALID_OBSERVED_DATA":count===0?
    "NO_OBSERVED_CONFIRMED_YIELD":"OBSERVED_SUBSET_DESCRIPTIVE_ONLY";
  return {
    schema:"v39.observed-subset-descriptive-scope.v1",
    status,reasons:err,
    verifiedReceivedItems:okay?count:0,
    excludedQuarantinedItems:nat(x.excludedQuarantinedItems)?
      x.excludedQuarantinedItems:0,
    receivedOnlyMeanRunwayDepartureDelayMinutes:okay?sum/count:null,
    receivedOnlyMeanByUtcBinMinutes:okay?means:Array(8).fill(null),
    originalSourceByteForByteProviderWireEstablished:
      okay&&x.storedSourceRepresentation==="literal_provider_wire",
    independentProviderMissingItems:externallyKnownMissing,
    unknownUpstreamSelection:externallyKnownMissing===null,
    observedUtcBinClockPreserved:okay,
    operationalHealthUncertaintySeconds:nat(x.healthUncertaintySeconds)?
      x.healthUncertaintySeconds:0,
    canDescribeVerifiedReceivedItems:okay,
    canInferAllEligibleAirportFlights:false,
    canClaimMissingAtRandom:false,
    canClaimUnbiasedPopulationMean:false,
    canClaimCompleteOriginalF8Window:false,
    canMarkHistoricalFailedProbeAsSuccess:false,
    canActivatePaidSixPlusSix:false,
    paidLaunchAuthorized:false
  };
}
