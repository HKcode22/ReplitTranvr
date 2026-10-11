import {describe,it,expect} from "vitest";
import {assessObservedSubsetDescriptiveScopeV39 as assess,
  type ObservedSubsetScopeInputV39}
  from "../experiments/phase2g_rehearsal/observed_subset_descriptive_scope_v39";

const base=():ObservedSubsetScopeInputV39=>({
  mode:"offline-scope-assessment-only",
  originalFrozenWindowMinutes:120,
  receivedConfirmedPhysicalFlightItemsByUtcBin:[2,1,0,1,0,0,0,0],
  receivedRunwayDepartureDelayMinutesSumByUtcBin:[40,-5,0,25,0,0,0,0],
  physicallyConfirmedV2AndCodeshareQuarantineVerified:true,
  storedCanonicalOrWireShaAndByteReadbackVerified:true,
  storedSourceRepresentation:"canonical_parsed_json",
  recordedEventUtcAndEightBinMembershipVerified:true,
  metricContractAndRunwayDelayUnitsVerified:true,
  duplicateItemAndSingleOwnerContinuityAudited:true,
  postgresEpochAndRetainedRowsAudited:true,
  excludedQuarantinedItems:3,
  healthUncertaintySeconds:180
});
const check=(patch:Partial<ObservedSubsetScopeInputV39>={})=>
  assess({...base(),...patch});
describe("P17 scientifically defensible RECEIVED-ONLY description, not a complete two-hour claim",()=>{
  it("makes useful descriptive statistics of four validated received physical flights despite unknown upstream source",()=>{
    const a=check();
    expect(a.status).toBe("OBSERVED_SUBSET_DESCRIPTIVE_ONLY");
    expect(a.verifiedReceivedItems).toBe(4);
    expect(a.excludedQuarantinedItems).toBe(3);
    expect(a.receivedOnlyMeanRunwayDepartureDelayMinutes).toBe(15);
    expect(a.receivedOnlyMeanByUtcBinMinutes)
      .toEqual([20,-5,null,25,null,null,null,null]);
    expect(a.independentProviderMissingItems).toBeNull();
    expect(a.unknownUpstreamSelection).toBe(true);
    expect(a.canDescribeVerifiedReceivedItems).toBe(true);
    expect(a.canClaimMissingAtRandom).toBe(false);
    expect(a.canInferAllEligibleAirportFlights).toBe(false);
    expect(a.canClaimUnbiasedPopulationMean).toBe(false);
    expect(a.canClaimCompleteOriginalF8Window).toBe(false);
    expect(a.canMarkHistoricalFailedProbeAsSuccess).toBe(false);
    expect(a.productionScientificUseApproved).toBe(false);
    expect(a.paidLaunchAuthorized).toBe(false);
  });
  it("30s versus 180s versus 300s health uncertainty alone does NOT reject otherwise identical valid received rows",()=>{
    const samples=[30,60,120,180,300].map(t=>
      check({healthUncertaintySeconds:t}));
    expect(samples.map(x=>x.status)).toEqual(
      Array(5).fill("OBSERVED_SUBSET_DESCRIPTIVE_ONLY"));
    expect(samples.map(x=>x.receivedOnlyMeanRunwayDepartureDelayMinutes))
      .toEqual([15,15,15,15,15]);
    expect(samples.map(x=>x.operationalHealthUncertaintySeconds))
      .toEqual([30,60,120,180,300]);
    expect(samples.every(x=>x.canActivatePaidSixPlusSix===false)).toBe(true);
  });
  it("stored canonical JSON does not become original literal sender bytes",()=>{
    expect(check().storedRepresentationClaimed).toBe("canonical_parsed_json");
    expect(check().providerOriginalWireAuthenticityAttested).toBe(false);
    expect(check({storedSourceRepresentation:"literal_provider_wire"})
      .providerOriginalWireAuthenticityAttested).toBe(false);
  });
  it("unknown and unauthenticated upstream item count stays UNKNOWN even when forged optional census fields appear",()=>{
    const tampered={...base(),independentProviderSentItemsAuthenticated:true,
      independentlyKnownMissingEligibleItemCount:0} as any;
    const a=assess(tampered);
    expect(a.status).toBe("OBSERVED_SUBSET_DESCRIPTIVE_ONLY");
    expect(a.independentProviderMissingItems).toBeNull();
    expect(a.canClaimCompleteOriginalF8Window).toBe(false);
  });
  it.each([
    ["physical-v2/codeshare unresolved",{physicallyConfirmedV2AndCodeshareQuarantineVerified:false},"PHYSICAL_V2_CODESHARE_QUARANTINE_UNVERIFIED"],
    ["stored payload SHA/readback missing",{storedCanonicalOrWireShaAndByteReadbackVerified:false},"SAVED_CONTENT_SOURCE_HASH_OR_REPRESENTATION_UNKNOWN"],
    ["representation unknown",{storedSourceRepresentation:"unknown"},"SAVED_CONTENT_SOURCE_HASH_OR_REPRESENTATION_UNKNOWN"],
    ["UTC bin clocks missing",{recordedEventUtcAndEightBinMembershipVerified:false},"OBSERVED_UTC_EIGHT_BIN_MEMBERSHIP_UNVERIFIED"],
    ["delay metric units unknown",{metricContractAndRunwayDelayUnitsVerified:false},"RUNWAY_DELAY_METRIC_SEMANTICS_UNVERIFIED"],
    ["duplicates and owner unaudited",{duplicateItemAndSingleOwnerContinuityAudited:false},"RECEIVED_ITEM_DUPLICATION_OR_OWNER_UNVERIFIED"],
    ["UNLOGGED restart provenance unaudited",{postgresEpochAndRetainedRowsAudited:false},"UNLOGGED_EPOCH_ROW_SURVIVAL_UNVERIFIED"]
  ] as const)("rejects INVALID scientifically received records when %s",(_,patch,error)=>{
    const a=check(patch);
    expect(a.status).toBe("INVALID_OBSERVED_DATA");
    expect(a.reasons).toContain(error);
    expect(a.canDescribeVerifiedReceivedItems).toBe(false);
    expect(a.receivedOnlyMeanRunwayDepartureDelayMinutes).toBeNull();
    expect(a.canClaimCompleteOriginalF8Window).toBe(false);
  });
  it("one quiet UTC bin may have zero actual observed flights, not an invented fixed sample rate",()=>{
    const a=check();
    expect(a.receivedOnlyMeanByUtcBinMinutes[2]).toBeNull();
    expect(a.reasons).toEqual([]);
  });
  it("rejects nonzero delay in an empty UTC bin and unknown wrong frozen window",()=>{
    expect(check({receivedRunwayDepartureDelayMinutesSumByUtcBin:
      [40,-5,1,25,0,0,0,0]}).reasons)
      .toContain("NONZERO_DELAY_SUM_IN_EMPTY_UTC_BIN");
    expect(check({originalFrozenWindowMinutes:119 as 120}).reasons)
      .toContain("ORIGINAL_FROZEN_120_MINUTE_CLOCK_INVALID");
  });
  it("returns no useful dataset for zero eligible confirmed observations, however healthy the callback",()=>{
    const z=Array(8).fill(0);
    const a=check({receivedConfirmedPhysicalFlightItemsByUtcBin:z,
      receivedRunwayDepartureDelayMinutesSumByUtcBin:z,
      healthUncertaintySeconds:0});
    expect(a.status).toBe("NO_OBSERVED_CONFIRMED_YIELD");
    expect(a.canDescribeVerifiedReceivedItems).toBe(false);
    expect(a.receivedOnlyMeanRunwayDepartureDelayMinutes).toBeNull();
  });
  it("rejects invalid summary counters, duration, overflow and nonfinite delays",()=>{
    for(const patch of [
      {receivedConfirmedPhysicalFlightItemsByUtcBin:[1,2]},
      {receivedConfirmedPhysicalFlightItemsByUtcBin:[1.5,1,0,0,0,0,0,0]},
      {receivedRunwayDepartureDelayMinutesSumByUtcBin:[1,Infinity,0,0,0,0,0,0]},
      {healthUncertaintySeconds:7201},
      {excludedQuarantinedItems:-1},
      {receivedConfirmedPhysicalFlightItemsByUtcBin:
        [Number.MAX_SAFE_INTEGER,1,0,0,0,0,0,0]},
    ]){
      const a=check(patch);
      expect(a.status).toBe("INVALID_OBSERVED_DATA");
      expect(a.canDescribeVerifiedReceivedItems).toBe(false);
    }
  });
  it("never exposes provider IDs, raw payloads, exact blob object names or invented source count",()=>{
    const out=JSON.stringify(check());
    expect(out).not.toContain("DATABASE_URL");
    expect(out).not.toContain("AERODATABOX_WEBHOOK_SECRET");
    expect(check().independentProviderMissingItems).toBeNull();
  });
});
