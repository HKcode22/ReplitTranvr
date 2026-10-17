import {describe,it,expect} from "vitest";
import {evaluatePhase2gQualityDimensionsV39 as quality}
  from "../server/lib/disruption/phase2gPilotQualityScorecard_v39";

const YSSY = {
  actualWindowSeconds:7203.639,targetWindowSeconds:7200,
  externalSettledCredits:231,receivedVerifiedItems:229,
  savedOriginalReferences:58,hashVerifiedOriginalReferences:58,
  observedResolvedOperatorRows:221,observedTotalRows:229,
  // Provider sender HTTP attempts are NOT independently measured by P25.
  providerObservedCallbackAttempts:null,
  receiverRecordedSuccess2xx:58,historicalReconciliation:"DELIVERY_GAP"
};

describe("descriptive multidimensional early-pilot quality without faux statistical pass",()=>{
  it("reports observed ratios without claiming end-to-end delivery success",()=>{
    const s=quality(YSSY);
    expect(s.observationCompletionRatio).toBe(1);
    expect(s.providerCreditReconciliationRatio).toBeCloseTo(229/231,12);
    expect(s.verifiedSourceReferenceRatio).toBe(1);
    expect(s.resolvedOperatorRowShare).toBeCloseTo(221/229,12);
    expect(s.descriptiveObservedItemsPerHour).toBeCloseTo(114.442159,4);
    expect(s.receiverRecorded2xxRatio).toBeNull();
    expect(s.providerDeliverySuccessProbability).toBeNull();
    expect(s.missingnessMechanismDetermined).toBe(false);
    expect(s.sourceCanBeUsedForUnqualifiedPrimaryInference).toBe(false);
    expect(s.originalReconciliation).toBe("DELIVERY_GAP");
    expect(s.confirmatoryAcceptanceStatusIsUnchanged).toBe(true);
  });
  it("rejects internal counts above provider without clipping to a magic pass",()=>{
    expect(()=>quality({...YSSY,receivedVerifiedItems:232})).toThrow("RECEIVED_EXCEEDS_EXTERNAL");
  });
  it("rejects corrupted counts, over-resolved identity and invalid durations",()=>{
    expect(()=>quality({...YSSY,actualWindowSeconds:-1})).toThrow("INVALID_TIME_WINDOW");
    expect(()=>quality({...YSSY,hashVerifiedOriginalReferences:59})).toThrow("HASH_VERIFIED_EXCEEDS_REFERENCES");
    expect(()=>quality({...YSSY,observedResolvedOperatorRows:230})).toThrow("RESOLVED_EXCEEDS_OBSERVED");
  });
  it("supports unknown independent sender count without fabricating 100% ACK reliability",()=>{
    const r=quality(YSSY);
    expect(r.receiverRecorded2xxRatio).toBeNull();
    const observed=quality({...YSSY,providerObservedCallbackAttempts:60});
    expect(observed.receiverRecorded2xxRatio).toBeCloseTo(58/60);
    expect(observed.providerDeliverySuccessProbability).toBeNull();
  });
});
