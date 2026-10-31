import {describe,it,expect} from "vitest";
import {buildPreSnapshot} from "../server/lib/disruption/preSnapshotBuilder_v3";
import {
 selectP4DurableWeatherAsOf,preWeatherFeatureAsOfV39,
 type P4DurableWeatherReceipt
} from "../server/lib/disruption/phase4Gate5WeatherAsOfFeature_v39";

const cutoff=new Date("2026-10-31T11:00:00.000Z");
const o={airportIcao:"WSSS",cutoffUtc:cutoff,frozenGrid:"gfs" as const};
const c=(change:Partial<P4DurableWeatherReceipt>={}):P4DurableWeatherReceipt=>({
 source:"live_metar",airportIcao:"WSSS",sourceVersion:"metar-2026-10",
 contentSha256:"a".repeat(64),
 issueTimeUtc:new Date("2026-10-31T10:30:00Z"),
 observationTimeUtc:new Date("2026-10-31T10:25:00Z"),
 firstAvailableAtUtc:new Date("2026-10-31T10:31:00Z"),
 durablyStoredAtUtc:new Date("2026-10-31T10:32:00Z"),
 validFromUtc:null,validToUtc:null,
 stationIcao:"WSSS",stationDistanceKm:0,gridCellId:null,
 featureValue:{windSpeedKt:10,visibilityMiles:7},...change
});
const grid=(change:Partial<P4DurableWeatherReceipt>={}):P4DurableWeatherReceipt=>c({
 source:"gfs",sourceVersion:"noaa-gfs-2026",
 issueTimeUtc:new Date("2026-10-31T08:00:00Z"),
 firstAvailableAtUtc:new Date("2026-10-31T08:15:00Z"),
 durablyStoredAtUtc:new Date("2026-10-31T08:16:00Z"),
 observationTimeUtc:null,stationIcao:null,stationDistanceKm:null,
 gridCellId:"0.25deg:WSSS",
 validFromUtc:new Date("2026-10-31T10:00:00Z"),
 validToUtc:new Date("2026-10-31T12:00:00Z"),
 ...change
});
describe("Phase 4 as-known-at-cutoff durable weather boundary",()=>{
 it("uses frozen precedence after separate source issue/observation/receipt cutoff checks",()=>{
  const r=selectP4DurableWeatherAsOf([
   grid(),c({source:"archive_metar",contentSha256:"b".repeat(64)}),c()
  ],o);
  expect(r.source).toBe("live_metar");
  expect(r.selected?.stationIcao).toBe("WSSS");
  expect(r.effectiveInformationAvailableAtUtc?.toISOString())
   .toBe("2026-10-31T10:32:00.000Z");
  expect(r.weatherMissing).toBe(false);
 });
 it("never backdates a late-retrieved archived METAR into past PRE",()=>{
  const archive=c({source:"archive_metar",
    firstAvailableAtUtc:new Date("2026-10-31T11:00:01Z"),
    durablyStoredAtUtc:new Date("2026-10-31T11:00:02Z")});
  expect(selectP4DurableWeatherAsOf([archive],o).weatherMissing).toBe(true);
  expect(selectP4DurableWeatherAsOf([
   c({durablyStoredAtUtc:new Date("2026-10-31T11:00:01Z")})
  ],o).weatherMissing).toBe(true);
  expect(selectP4DurableWeatherAsOf([
   c({issueTimeUtc:new Date("2026-10-31T11:00:01Z")})
  ],o).weatherMissing).toBe(true);
 });
 it("rejects source issued before 6h horizon, physical stale METAR, future observed METAR",()=>{
  for(const change of [
   {issueTimeUtc:new Date("2026-10-31T04:59:59Z")},
   {observationTimeUtc:new Date("2026-10-31T04:59:59Z")},
   {observationTimeUtc:new Date("2026-10-31T11:01:00Z")}
  ])expect(selectP4DurableWeatherAsOf([c(change)],o).weatherMissing).toBe(true);
 });
 it("requires nearest station within 30km, ignores invalid and wrong-airport stations",()=>{
  expect(selectP4DurableWeatherAsOf([c({stationDistanceKm:30})],o).weatherMissing).toBe(false);
  for(const change of [
   {stationDistanceKm:30.0001},{stationDistanceKm:-1},
   {stationDistanceKm:null},{stationIcao:"BAD"},{airportIcao:"YSSY"}
  ])expect(selectP4DurableWeatherAsOf([c(change)],o).weatherMissing).toBe(true);
  expect(selectP4DurableWeatherAsOf([
   c({stationDistanceKm:31}),grid()
  ],o).source).toBe("gfs");
 });
 it("requires frozen grid choice, precise valid interval and prior stored source",()=>{
  expect(selectP4DurableWeatherAsOf([grid()],o).source).toBe("gfs");
  expect(selectP4DurableWeatherAsOf([grid({source:"nam"})],o).weatherMissing).toBe(true);
  expect(selectP4DurableWeatherAsOf([grid({source:"nam"})],{
   ...o,frozenGrid:"nam"
  }).source).toBe("nam");
  for(const change of [
   {validFromUtc:new Date("2026-10-31T11:00:01Z")},
   {validToUtc:new Date("2026-10-31T10:59:59Z")},
   {validFromUtc:null},{validToUtc:null},{gridCellId:null},
   {durablyStoredAtUtc:new Date("2026-10-31T11:00:01Z")},
   {issueTimeUtc:new Date("2026-10-31T11:00:01Z")}
  ])expect(selectP4DurableWeatherAsOf([grid(change)],o).weatherMissing).toBe(true);
 });
 it("only admits finite numeric or boolean flat derived metrics, never raw bodies",()=>{
  for(const value of [null,undefined,{}, {windSpeedKt:Infinity},
   {windSpeedKt:NaN},{rawMetar:"METAR WSSS"},{nested:{temperature:20}},
   {windSpeedKt:null},{windSpeedKt:1,raw:"payload"}]){
   expect(selectP4DurableWeatherAsOf([c({featureValue:value})],o).weatherMissing)
    .toBe(true);
  }
  expect(selectP4DurableWeatherAsOf([
   c({featureValue:{windSpeedKt:15,hasThunderstorm:false,visibilityMiles:null}})
  ],o).weatherMissing).toBe(false);
 });
 it("ERA5 never enters operational as-of; incomplete provenance remains missing",()=>{
  for(const change of [
   {source:"era5" as const},{contentSha256:"bad"},
   {sourceVersion:""},{issueTimeUtc:null},{firstAvailableAtUtc:null},
   {durablyStoredAtUtc:null},{firstAvailableAtUtc:new Date("2026-10-31T10:00:00Z"),
    issueTimeUtc:new Date("2026-10-31T10:30:00Z")}
  ])expect(selectP4DurableWeatherAsOf([c(change)],o).weatherMissing).toBe(true);
  expect(selectP4DurableWeatherAsOf([],o).reason).toBe("NO_DURABLE_CUTOFF_SAFE_WEATHER");
  expect(selectP4DurableWeatherAsOf([],{
   ...o,cutoffUtc:new Date(NaN)
  }).reason).toBe("INVALID_PREDICTION_CUTOFF");
 });
 it("keeps optional weather missing while allowing PRE for eligible population",()=>{
  const missing=preWeatherFeatureAsOfV39([],o);
  expect(missing.weatherMissing).toBe(true);
  expect(missing.feature).toMatchObject({
   featureName:"airport_weather",value:null,informationAvailableAt:null,source:null
  });
  const base={
   flightInstanceId:"confirmed-physical-test-only",populationQueryId:"query-id",
   populationMemberAtCutoff:true,
   populationObservationAvailableAtUtc:new Date("2026-10-31T10:00:00Z"),
   horizonEligible:true,horizon:"T-6h" as const,
   selectedTMilestoneUtc:new Date("2026-10-31T17:00:00Z"),
   selectedTVersion:"test-nonproduction",
   predictionCutoffUtc:cutoff,
   frameHash:null,configHash:null,fidsResponseHash:null,scheduleVersion:null
  };
  const a=buildPreSnapshot({...base,features:[missing.feature]});
  expect(a.status).toBe("snapshot");
  if(a.status==="snapshot"){
   expect(a.snapshot.features[0]).toMatchObject({
    featureName:"airport_weather",missing:true,value:null
   });
  }
  const selected=preWeatherFeatureAsOfV39([c()],o);
  const b=buildPreSnapshot({...base,features:[selected.feature]});
  expect(b.status).toBe("snapshot");
  if(b.status==="snapshot"){
   expect(b.snapshot.features[0]).toMatchObject({
    featureName:"airport_weather",missing:false,
    value:{windSpeedKt:10,visibilityMiles:7}
   });
  }
 });
});
