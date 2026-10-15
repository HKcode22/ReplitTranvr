import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {assessGate3CanaryTerminalV39} from
  "../server/lib/disruption/gate3CanaryTerminalAssessment_v39";
import type {PrepaidLiveWindowResultV39} from
  "../server/lib/disruption/prepaidProbeWindow_v39";

const sid=randomUUID();
const start=new Date("2026-10-14T17:00:00Z");
const end=new Date("2026-10-14T17:05:00Z");
function result():PrepaidLiveWindowResultV39{
  return {
    status:"settling",
    runtimeSessionId:sid,windowStart:start,windowEnd:end,
    durationCensored:false,stopReason:null,
    reconciliationStatus:"MATCH",externalCredits:5,
    internalSendCredits:5,maxObservedUnsettledCreditGap:0,
    settlementReads:4,subscriptionDeleted:true,
    cleanupVerifiedAtUtc:null,
    metrics:{
      rowsDelivered:3,uniqueFlights:3,tailChainLinks:0,
      internalSendCredits:5,confirmedUniqueLower:3,
      confirmedPlusAmbiguousUpper:3,ambiguousUnknown:0,
      firstObservationMs:[],deliveryCount:3,
      notificationItemsReceived:5,explicitCostDeliveryCount:3,
      fallbackDeliveryCount:0,costItemDisagreementCount:0,
      callbackRequestsSeen:3,callbackSuccess2xx:3,callbackFailures:0,
    },
  };
}
function input(){
  return {
    expectedSessionId:sid,canaryCreditCeiling:20,
    fixedExposureSeconds:300,
    sourceReadbackVerified:true,
    publishedReceiverParityVerified:true,
    foreignActiveBillableCount:0,
    result:result(),
  };
}
describe("Gate3 exact terminal candidate never grants paid authority",()=>{
  it("positive synthetic case is CANDIDATE, not Gate3 PASS or source certification",()=>{
    const r=assessGate3CanaryTerminalV39(input());
    expect(r).toMatchObject({
      status:"OFFLINE_CANDIDATE",reasons:[],
      paidProviderCalls:0,approvedPaidCanary:false,
      authoritativeProviderEvidenceVerifiedHere:false,
      durableOwnerReceiptWritten:false,
    });
    expect(r.safeMetadataDigestSha256).toMatch(/^[0-9a-f]{64}$/);
  });
  it("missing external billed item is HOLD even if reported status is MATCH",()=>{
    for(const externalCredits of [null,0,4,21] as (number|null)[]){
      const x=input();x.result.externalCredits=externalCredits;
      const y=assessGate3CanaryTerminalV39(x);
      expect(y.status).toBe("HOLD");
      expect(y.safeMetadataDigestSha256).toBeNull();
    }
  });
  it("historic-like two-credit discrepancy cannot pass with a forged MATCH label",()=>{
    const x=input();x.result.externalCredits=7;
    const a=assessGate3CanaryTerminalV39(x);
    expect(a.reasons).toContain("EXTERNAL_RECEIVED_ITEM_CREDITS_DIFFER");
    expect(a.status).toBe("HOLD");
  });
  it("delete unknown, unsettled or censored window all refuse",()=>{
    const patches:Partial<PrepaidLiveWindowResultV39>[]=[
      {subscriptionDeleted:false},{status:"failed"},
      {durationCensored:true},{stopReason:"watchdog_exception"},
      {reconciliationStatus:"UNRESOLVED"},{settlementReads:2},
      {runtimeSessionId:randomUUID()},
    ];
    for(const patch of patches){
      const x=input();x.result={...x.result,...patch};
      expect(assessGate3CanaryTerminalV39(x).status).toBe("HOLD");
    }
  });
  it("fabricated uncensored flag cannot hide a window shorter than frozen exposure",()=>{
    const x=input();
    x.result.windowEnd=new Date(x.result.windowStart.getTime()+1000);
    expect(assessGate3CanaryTerminalV39(x).reasons)
      .toContain("ACTUAL_EXPOSURE_SHORTER_THAN_FROZEN_DURATION");
  });
  it("missing raw readback, receiver parity or provider isolation refuses",()=>{
    for(const patch of [
      {sourceReadbackVerified:false},
      {publishedReceiverParityVerified:false},
      {foreignActiveBillableCount:1},
    ]){
      const v=assessGate3CanaryTerminalV39({...input(),...patch});
      expect(v.status).toBe("HOLD");
      expect(v.safeMetadataDigestSha256).toBeNull();
    }
  });
  it("callback failure/cost inconsistency/missing delivery cannot be hidden",()=>{
    const mutations=[
      {callbackFailures:1},
      {costItemDisagreementCount:1},
      {internalSendCredits:4},
      {deliveryCount:0},
    ];
    for(const patch of mutations){
      const x=input();
      x.result.metrics={...x.result.metrics!,...patch};
      expect(assessGate3CanaryTerminalV39(x).status).toBe("HOLD");
    }
    const x=input();x.result.metrics=null;
    expect(assessGate3CanaryTerminalV39(x).reasons)
      .toContain("SOURCE_AND_CALLBACK_METRICS_MISSING");
  });
  it("malformed input refuses before trying any provider access",()=>{
    for(const patch of [
      {expectedSessionId:"invalid"},
      {canaryCreditCeiling:101},
      {canaryCreditCeiling:0},
      {foreignActiveBillableCount:-1},
    ]){
      expect(()=>assessGate3CanaryTerminalV39({...input(),...patch}))
        .toThrow("GATE3_TERMINAL_ASSESSMENT_INPUT_INVALID");
    }
  });
  it("safe digest is independent of provider account balance values, does not log external credit fields",()=>{
    const a=assessGate3CanaryTerminalV39(input());
    const b=assessGate3CanaryTerminalV39(input());
    expect(a.safeMetadataDigestSha256).toBe(b.safeMetadataDigestSha256);
    const source=readFileSync(
      "server/lib/disruption/gate3CanaryTerminalAssessment_v39.ts","utf8",
    );
    const fragment=source.slice(source.indexOf("const safeMetadataDigestSha256=status"),source.indexOf("  return {\n    schema:",source.indexOf("const safeMetadataDigestSha256=status")));
    expect(fragment).not.toContain("externalCredits");
    expect(fragment).not.toContain("balanceBefore");
  });
});
