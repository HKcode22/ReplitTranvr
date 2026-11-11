import {describe,it,expect} from "vitest";
import {buildPreSnapshot} from "../server/lib/disruption/preSnapshotBuilder_v3";
import {selectP5AmendmentEAsOfFeaturesOffline,type P5EAsOfRequest,
 type P5EAsOfObservation}
 from "../server/lib/disruption/phase5AmendmentEAsOfFeatureSelectionOffline_v39";
const flight="leg:synthetic:e-primary";
const originalT="2026-11-18T18:00:00.000Z";
const t6="2026-11-18T12:00:00.000Z";
const t90="2026-11-18T16:30:00.000Z";
const obs=(at:string,value:number,record:string):P5EAsOfObservation=>({
 flightInstanceId:flight,field:"origin_metar_wind_kt",
 value,source:"NOAA_METAR",sourceRecordId:record,
 observedAtUtc:at,availableAtUtc:at,
 rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"
});
const req:P5EAsOfRequest={
 flightInstanceId:flight,horizon:"T-6h",
 selectedNativeTUtc:originalT,cutoffUtc:t6,
 issuedAtUtc:"2026-11-18T11:58:00.000Z",
 fields:["origin_metar_wind_kt","prior_route_departure_delay_median_minutes"],
 observations:[
  obs("2026-11-18T11:57:00.000Z",12,"synthetic-old-metar"),
  obs("2026-11-18T12:01:00.000Z",25,"synthetic-future-metar")
 ]
};
describe("Amendment E PRE as-of features — nonpaid research contract",()=>{
 it("T6 uses last available information at actual ISSUE time, not future cutoff",()=>{
  const r=selectP5AmendmentEAsOfFeaturesOffline(req);
  expect(r.fields[0].value).toBe(12);
  expect(r.fields[0].sourceRecordId).toBe("synthetic-old-metar");
  expect(r.fields[1].missingReason).toBe("NO_RECORD");
  expect(r.independentSourceLicenseVerifiedByThisFunction).toBe(false);
  expect(r.actualStage14WriterUpdated).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
 });
 it("T90 is a separate updated snapshot with newly available data",()=>{
  const r=selectP5AmendmentEAsOfFeaturesOffline({
   ...req,horizon:"T-90m",cutoffUtc:t90,
   issuedAtUtc:"2026-11-18T16:29:00.000Z"
  });
  expect(r.fields[0].value).toBe(25);
 });
 it("earlier-than-cutoff issuance never borrows later pre-cutoff data",()=>{
  const r=selectP5AmendmentEAsOfFeaturesOffline({
   ...req,observations:[obs("2026-11-18T11:59:00.000Z",40,"synthetic-too-late")]
  });
  expect(r.fields[0]).toMatchObject({
   value:null,missingReason:"NOT_AVAILABLE_BY_ISSUE"
  });
 });
 it("honestly masks unverified rights instead of inventing a training feature",()=>{
  const r=selectP5AmendmentEAsOfFeaturesOffline({
   ...req,observations:[{
    ...obs("2026-11-18T11:57:00.000Z",12,"synthetic-rights-hold"),
    rightsDisposition:"HOLD_UNVERIFIED"
   }]
  });
  expect(r.fields[0].missingReason).toBe("RIGHTS_UNVERIFIED");
  expect(r.builderInputs[0].value).toBeNull();
 });
 it("refuses another operating leg and unsupported outcome leakage fields",()=>{
  expect(()=>selectP5AmendmentEAsOfFeaturesOffline({
   ...req,observations:[{
    ...obs("2026-11-18T11:57:00.000Z",1,"synthetic-other"),
    flightInstanceId:"leg:synthetic:other"
   }]
  })).toThrow("UNVERIFIED_FIELD_IDENTITY_OR_VALUE");
  expect(()=>selectP5AmendmentEAsOfFeaturesOffline({
   ...req,fields:["actual_gate_out_delay_minutes" as any]
  })).toThrow("UNREVIEWED_OR_REPEATED_FEATURE");
 });
 it("refuses contradictory equal-time values, rather than arbitrarily picking one",()=>{
  const o=obs("2026-11-18T11:57:00.000Z",12,"synthetic-tie");
  const r=selectP5AmendmentEAsOfFeaturesOffline({
   ...req,observations:[o,{...o,value:25}]
  });
  expect(r.fields[0].missingReason).toBe("AMBIGUOUS_LATEST_SOURCE");
 });
 it("rejects impossible observation times and nonfinite values",()=>{
  expect(()=>selectP5AmendmentEAsOfFeaturesOffline({
   ...req,observations:[{
    ...obs("2026-11-18T11:57:00.000Z",20,"synthetic-bad-time"),
    observedAtUtc:"2026-11-18T11:59:00.000Z"
   }]
  })).toThrow("OBSERVED_AFTER_SYSTEM_AVAILABLE");
  expect(()=>selectP5AmendmentEAsOfFeaturesOffline({
   ...req,observations:[obs("2026-11-18T11:57:00.000Z",NaN,"synthetic-nan")]
  })).toThrow("UNVERIFIED_FIELD_IDENTITY_OR_VALUE");
 });
 it("rejects a T6 issuance after cutoff and a shifted selected T",()=>{
  expect(()=>selectP5AmendmentEAsOfFeaturesOffline({
   ...req,issuedAtUtc:"2026-11-18T12:00:01.000Z"
  })).toThrow("HORIZON_OR_FORECAST_ISSUED_AFTER_CUTOFF");
  expect(()=>selectP5AmendmentEAsOfFeaturesOffline({
   ...req,selectedNativeTUtc:"2026-11-18T18:15:00.000Z"
  })).toThrow("HORIZON_OR_FORECAST_ISSUED_AFTER_CUTOFF");
 });
 it("integrates selected inputs with the EXISTING pure PRE builder; no DB writing",()=>{
  const r=selectP5AmendmentEAsOfFeaturesOffline(req);
  const built=buildPreSnapshot({
   flightInstanceId:flight,populationQueryId:null,
   populationMemberAtCutoff:true,
   populationObservationAvailableAtUtc:new Date("2026-11-18T11:57:00.000Z"),
   horizonEligible:true,horizon:"T-6h",
   selectedTMilestoneUtc:new Date(originalT),
   selectedTVersion:"synthetic-original-T",
   predictionCutoffUtc:new Date(t6),
   features:r.builderInputs,frameHash:null,configHash:null,
   fidsResponseHash:null,scheduleVersion:null
  });
  expect(built.status).toBe("snapshot");
  if(built.status==="snapshot"){
   expect(built.snapshot.features[0].value).toBe(12);
   expect(built.snapshot.features[1].missing).toBe(true);
  }
 });
});
