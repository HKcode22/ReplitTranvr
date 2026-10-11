import {describe,expect,it} from "vitest";
import {evaluateHypotheticalYssyLossV39 as adjudicate,
  type YssyLossProtocolV39}
  from "../experiments/phase2g_rehearsal/yssy_bounded_loss_scientific_adjudication_v39";

const base=():YssyLossProtocolV39=>({
  mode:"synthetic_only",frozenWindowMinutes:120,
  originalF8RequiresCompleteEvidence:true,
  independentlyAuthenticatedProviderSenderLedger:true,
  independentlyAttributedPerAttemptFlightItemCredits:true,
  originalRawAndSourceUtcVerified:true,
  physicalFlightV2ObservedRowsValid:true,
  originalEightBinClockPreserved:true,
  exactOwnerCleanupAndBudgetValid:true,
  observedMaximumConsecutiveHealthFailures:4,
  observedLongestHealthFailureSeconds:45,
  senderFlightItemsByBin:[8,17,0,12,28,15,10,10],
  storedFlightItemsByBin:[8,17,0,12,28,15,10,10],
  prospectivelyFrozenMaxMissingFlightItems:2,
  prospectivelyFrozenMaxMissingFraction:0.02,
  prospectivelyFrozenMaxMissingFlightItemsPer15m:1
});
const check=(patch:Partial<YssyLossProtocolV39>={})=>
  adjudicate({...base(),...patch});
describe("P15/P17 user-proposed less-strict YSSY 6+6 SCIENTIFIC COUNTERFACTUAL (NO paid activation)",()=>{
  it("healthy signed ledger + GET-only transient 4 failures with no lost flight items is a complete RECEIPT candidate",()=>{
    const r=check();
    expect(r.status).toBe("COMPLETE_RECEIPT_CANDIDATE");
    expect(r.healthOnlyFailure).toBe(true);
    expect(r.missingFlightItems).toBe(0);
    expect(r.missingBins).toEqual([]);
    expect(r.totalSenderFlightItems).toBe(100);
    expect(r.scientificOriginalF8PassAuthorized).toBe(false);
    expect(r.paidLaunchAuthorized).toBe(false);
  });
  it("one independently provable missing billable flight item produces CENSORED candidate, not historical F8 PASS",()=>{
    const r=check({storedFlightItemsByBin:[8,17,0,12,28,15,10,9]});
    expect(r.status).toBe("BOUNDED_CENSORED_CANDIDATE");
    expect(r.missingFlightItems).toBe(1);
    expect(r.missingBins).toEqual([7]);
    expect(r.missingItemsBy15m).toEqual([0,0,0,0,0,0,0,1]);
    expect(r.partialScientificPassAuthorized).toBe(false);
  });
  it("unknown original provider ledger cannot be reinterpreted as ZERO missed flight items from stored PostgreSQL rows",()=>{
    const r=check({senderFlightItemsByBin:null,
      independentlyAuthenticatedProviderSenderLedger:false});
    expect(r.status).toBe("UNVERIFIABLE");
    expect(r.unknownMissingItems).toBe(true);
    expect(r.missingFlightItems).toBeNull();
    expect(r.errors).toContain("INDEPENDENT_ATTEMPT_SOURCE_MISSING");
  });
  it("self-reported matching sender/item totals without AUTHENTIC independent witness are NOT proof of completeness",()=>{
    const r=check({independentlyAuthenticatedProviderSenderLedger:false});
    expect(r.status).toBe("UNVERIFIABLE");
    expect(r.scientificOriginalF8PassAuthorized).toBe(false);
  });
  it("the historical 260 external / 259 receiver scenario is counted as one provably MISSING item, not complete",()=>{
    const r=check({senderFlightItemsByBin:[32,32,32,32,33,33,33,33],
      storedFlightItemsByBin:[32,32,32,32,33,33,33,32]});
    expect(r.totalSenderFlightItems).toBe(260);
    expect(r.totalStoredFlightItems).toBe(259);
    expect(r.status).toBe("BOUNDED_CENSORED_CANDIDATE");
    expect(r.missingFlightItems).toBe(1);
    // This is a hypothetical frozen protocol with full sender evidence,
    // NOT a retroactive approval of actual historical P2G22.
    expect(r.scientificOriginalF8PassAuthorized).toBe(false);
  });
  it("concentrated missing items in one 15m bin FAIL despite small whole-window aggregate fraction",()=>{
    const r=check({senderFlightItemsByBin:[100,100,100,100,100,100,100,100],
      storedFlightItemsByBin:[96,100,100,100,100,100,100,100],
      prospectivelyFrozenMaxMissingFlightItems:4,
      prospectivelyFrozenMaxMissingFraction:0.02,
      prospectivelyFrozenMaxMissingFlightItemsPer15m:1});
    expect(r.status).toBe("OUTSIDE_PROPOSED_LOSS_BOUND");
    expect(r.errors).toContain("LOSS_EXCEEDS_PRE_FROZEN_MAX_OR_BIN_LIMIT");
    expect(r.missingBins).toEqual([0]);
  });
  it("unknown cutoff or after-the-fact flexibility cannot certify a partial run",()=>{
    for(const p of [
      {prospectivelyFrozenMaxMissingFlightItems:null},
      {prospectivelyFrozenMaxMissingFraction:null},
      {prospectivelyFrozenMaxMissingFlightItemsPer15m:null}
    ]){
      const r=check({...p,storedFlightItemsByBin:[8,17,0,12,28,15,10,9]});
      expect(r.status).toBe("UNVERIFIABLE");
      expect(r.errors).toContain("PROSPECTIVE_LOSS_BOUND_NOT_FROZEN");
    }
  });
  it("more than 6+6 failures or 180s ceiling is not a permissive scientific excuse",()=>{
    expect(check({observedMaximumConsecutiveHealthFailures:13}).status)
      .toBe("INVALID_INTEGRITY");
    expect(check({observedLongestHealthFailureSeconds:181}).status)
      .toBe("INVALID_INTEGRITY");
  });
  it("missing/duplicate physical evidence or incorrect 15m clock must not be covered by small numeric missingness",()=>{
    expect(check({physicalFlightV2ObservedRowsValid:false}).status)
      .toBe("INVALID_INTEGRITY");
    expect(check({originalEightBinClockPreserved:false}).status)
      .toBe("INVALID_INTEGRITY");
    expect(check({exactOwnerCleanupAndBudgetValid:false}).status)
      .toBe("INVALID_INTEGRITY");
  });
  it("receiver claiming MORE credited items than sender is corruption, never negative missing data",()=>{
    const r=check({storedFlightItemsByBin:[8,17,1,12,28,15,10,10]});
    expect(r.status).toBe("INVALID_INTEGRITY");
    expect(r.errors).toContain("STORED_ITEMS_EXCEED_PROVIDER_SENDER_ITEMS");
  });
  it("quiet but real zero-send 15m bin is legal and does not imply missing notifications",()=>{
    const r=check();
    expect(r.senderFlightItemsByBin).toBeUndefined();
    expect(r.missingItemsBy15m![2]).toBe(0);
    expect(r.errors).toEqual([]);
  });
  it("zero sender items for entire YSSY window cannot be mislabeled as useful yield",()=>{
    const r=check({
      senderFlightItemsByBin:[0,0,0,0,0,0,0,0],
      storedFlightItemsByBin:[0,0,0,0,0,0,0,0]
    });
    expect(r.status).toBe("UNVERIFIABLE");
    expect(r.errors).toContain("ZERO_SENT_ITEMS_NO_YSSY_YIELD");
  });
  it("8 bins must be preserved, cannot replace original irregular source traffic with a fixed 15-per-bin assumption",()=>{
    const r=check({senderFlightItemsByBin:[12,15]});
    expect(r.status).toBe("INVALID_INTEGRITY");
    expect(r.errors).toContain("INVALID_SENDER_EIGHT_BINS");
  });
});
