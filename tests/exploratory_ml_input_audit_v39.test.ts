import {describe, expect, it} from "vitest";
import {auditMlPilotInputV39, type MlPilotRowV39, type MlPilotSplitV39}
  from "../server/lib/disruption/exploratoryMlInputAudit_v39";

const split: MlPilotSplitV39={
  trainBeforeUtc:"2026-10-01T00:00:00Z",
  validationBeforeUtc:"2026-10-02T00:00:00Z",
  testBeforeUtc:"2026-10-03T00:00:00Z",
  featureNames:["scheduledHourUtc","priorRouteCount"],
};
const sha="a".repeat(64);
const base=(key:string,cutoff:string,tier:MlPilotRowV39["tier"]="A_VERIFIED_PRIMARY"):MlPilotRowV39=>({
  rowId:key,flightInstanceId:key,
  predictionCutoffUtc:cutoff,
  labelObservedAtUtc:new Date(Date.parse(cutoff)+2*60*60*1000).toISOString(),
  labelIsActual:true,delayMinutes:12,
  tier,originSourceSha256:sha,
  featureValues:{scheduledHourUtc:12,priorRouteCount:8},
  featureAvailableAtUtc:{
    scheduledHourUtc:new Date(Date.parse(cutoff)-60_000).toISOString(),
    priorRouteCount:new Date(Date.parse(cutoff)-3600_000).toISOString(),
  },
});
const good=()=>[
  base("a","2026-09-30T12:00:00Z"),
  base("b","2026-10-01T12:00:00Z"),
  base("c","2026-10-02T12:00:00Z","B_DEGRADED_OBSERVED_ONLY"),
];
describe("qualified exploratory ML input audit, never Phase6 protected test",()=>{
  it("checks frozen future-time folds and distinct flight keys without training",()=>{
    const result=auditMlPilotInputV39(good(),split);
    expect(result).toMatchObject({
      status:"READY_FOR_EXPLORATORY_MODEL_ONLY",
      totalRows:3,acceptedRows:3,
      qualifiedTierBRows:1,seenSourceShaCount:1,
      splitSizes:{TRAIN:1,VALIDATION:1,EXPLORATORY_TEST:1},
      modelTrained:false,phase6EvaluationCertified:false,
    });
  });
  it("must refuse future values even if origin blobs were SHA verified",()=>{
    const rows=good(); rows[0].featureAvailableAtUtc.scheduledHourUtc =
      "2026-09-30T12:00:01Z";
    const r=auditMlPilotInputV39(rows,split);
    expect(r.status).toBe("HOLD");
    expect(r.rejectedByReason.FUTURE_OR_UNVERIFIED_FEATURE).toBe(1);
    expect(r.splitSizes.TRAIN).toBe(0);
  });
  it("refuses future-feature timestamp with fractional seconds as an instant",()=>{
    const rows=good();
    rows[0].featureAvailableAtUtc.scheduledHourUtc="2026-09-30T12:00:00.100Z";
    const r=auditMlPilotInputV39(rows,split);
    expect(r.rejectedByReason.FUTURE_OR_UNVERIFIED_FEATURE).toBe(1);
  });
  it("refuses estimated/missing actual labels",()=>{
    const rows=good(); rows[1].labelIsActual=false;
    const r=auditMlPilotInputV39(rows,split);
    expect(r.rejectedByReason.LABEL_NOT_OBSERVED_ACTUAL_AFTER_CUTOFF).toBe(1);
  });
  it("refuses labels whose evidence was available before actual outcome",()=>{
    const rows=good();rows[1].labelObservedAtUtc="2026-10-01T11:59:59Z";
    expect(auditMlPilotInputV39(rows,split).rejectedByReason.LABEL_NOT_OBSERVED_ACTUAL_AFTER_CUTOFF).toBe(1);
  });
  it("refuses cross-fold reuse of same flight identity",()=>{
    const rows=good();rows[2].flightInstanceId="a";
    const r=auditMlPilotInputV39(rows,split);
    expect(r.status).toBe("HOLD");
    expect(r.crossPartitionFlightOverlap).toBe(true);
    expect(r.rejectedByReason.CROSS_PARTITION_FLIGHT_ID).toBe(1);
  });
  it("refuses duplicate observation IDs and unknown source provenance",()=>{
    const rows=good();rows[1].rowId="a";rows[2].originSourceSha256="";
    const r=auditMlPilotInputV39(rows,split);
    expect(r.rejectedByReason.DUPLICATE_OR_INVALID_ROW_ID).toBe(1);
    expect(r.rejectedByReason.SOURCE_SHA_UNVERIFIED).toBe(1);
  });
  it("refuses unregistered or nonnumeric feature values",()=>{
    const rows=good();rows[0].featureValues.priorRouteCount=null;
    expect(auditMlPilotInputV39(rows,split).rejectedByReason.FUTURE_OR_UNVERIFIED_FEATURE).toBe(1);
  });
  it("refuses empty split, reversed training cutoff and malformed data",()=>{
    const bad={...split,validationBeforeUtc:"2026-09-01T00:00:00Z"};
    const r=auditMlPilotInputV39(good(),bad);
    expect(r.status).toBe("HOLD");
    expect(r.rejectedByReason.INVALID_SPLIT_OR_FEATURE_FREEZE).toBe(1);
    expect(auditMlPilotInputV39([],split).status).toBe("HOLD");
    expect(auditMlPilotInputV39(null as unknown as MlPilotRowV39[],split).status).toBe("HOLD");
  });
});
