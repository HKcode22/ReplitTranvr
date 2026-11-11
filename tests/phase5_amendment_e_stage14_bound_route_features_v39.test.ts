import {describe,it,expect} from "vitest";
import {selectP5EStage14BoundRouteFeatures}
 from "../server/lib/disruption/phase5AmendmentEStage14BoundRouteFeatures_v39";
const SHA="a".repeat(64);
const qid="c23e4567-e89b-42d3-a456-426614174013";
const native="2035-11-25T12:00:00.000Z";
const cutoff="2035-11-25T06:00:00.000Z";
const base={
 flightInstanceId:"leg:ci:e:001",horizon:"T-6h" as const,
 selectedNativeTUtc:native,cutoffUtc:cutoff,
 issuedAtUtc:"2035-11-25T05:59:00.000Z",
 expectedOriginalResponseSha256:SHA,
 expectedPopulationQueryId:qid,
 originalSourceUseIndependentlyReviewedOutsideThisFunction:true as const,
 normalizedMember:{
  analytic_identity_id:"leg:ci:e:001",
  population_query_id:qid,response_hash:SHA,
  dep_airport_icao:"WSSS",arr_airport_icao:"YSSY",
  available_at:new Date("2035-11-25T05:30:00.000Z"),
  fids_retrieval_utc:new Date("2035-11-25T05:29:00.000Z")
 }
};
describe("Phase5 ONE Amendment E real Stage14 FIDS origin/destination bridge",()=>{
 it("selects exactly two source-bound categorical fields available by issuance",()=>{
  const r=selectP5EStage14BoundRouteFeatures(base);
  expect(r.features.map(x=>[x.featureName,x.value])).toEqual([
   ["origin_icao","WSSS"],["destination_icao","YSSY"]
  ]);
  expect(r.decisions.every(x=>x.missingReason===null)).toBe(true);
  expect(r.sourceOriginalSha256).toBe(SHA);
  expect(r.independentLicenseVerifiedHere).toBe(false);
  expect(r.weatherAndHistorySourceBridgeComplete).toBe(false);
 });
 it("does not use a new FIDS member observation after actual issue time",()=>{
  const r=selectP5EStage14BoundRouteFeatures({
   ...base,normalizedMember:{...base.normalizedMember,
    available_at:new Date("2035-11-25T05:59:20.000Z"),
    fids_retrieval_utc:new Date("2035-11-25T05:59:10.000Z")
   }
  });
  expect(r.features.every(x=>x.value===null)).toBe(true);
  expect(r.decisions.map(x=>x.missingReason)).toEqual([
   "NOT_AVAILABLE_BY_ISSUE","NOT_AVAILABLE_BY_ISSUE"
  ]);
 });
 it("allows missing destination without dropping population-covered PRE",()=>{
  const r=selectP5EStage14BoundRouteFeatures({
   ...base,normalizedMember:{...base.normalizedMember,arr_airport_icao:null}
  });
  expect(r.features[0].value).toBe("WSSS");
  expect(r.features[1].value).toBeNull();
  expect(r.decisions[1].missingReason).toBe("NO_RECORD");
 });
 it("refuses changed original SHA and flight identity",()=>{
  expect(()=>selectP5EStage14BoundRouteFeatures({
   ...base,expectedOriginalResponseSha256:"b".repeat(64)
  })).toThrow("SOURCE_OR_FLIGHT_IDENTITY_NOT_MATCHED");
  expect(()=>selectP5EStage14BoundRouteFeatures({
   ...base,flightInstanceId:"leg:ci:e:other"
  })).toThrow("SOURCE_OR_FLIGHT_IDENTITY_NOT_MATCHED");
 });
 it("refuses output after cutoffs, observed after available, and unreviewed source",()=>{
  expect(()=>selectP5EStage14BoundRouteFeatures({
   ...base,issuedAtUtc:"2035-11-25T06:00:01.000Z"
  })).toThrow("HORIZON_OR_FORECAST_ISSUED_AFTER_CUTOFF");
  expect(()=>selectP5EStage14BoundRouteFeatures({
   ...base,normalizedMember:{...base.normalizedMember,
    fids_retrieval_utc:new Date("2035-11-25T05:40:00.000Z")
   }
  })).toThrow("OBSERVED_AFTER_SYSTEM_AVAILABLE");
  expect(()=>selectP5EStage14BoundRouteFeatures({
   ...base,originalSourceUseIndependentlyReviewedOutsideThisFunction:false as any
  })).toThrow("SOURCE_OR_FLIGHT_IDENTITY_NOT_MATCHED");
 });
});
