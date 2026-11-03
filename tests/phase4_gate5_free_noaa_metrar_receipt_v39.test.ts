import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 decodeP4G5FreeNoaaMetarV39,validateP4G5NoaaDurableArtifactV39
} from "../server/lib/disruption/phase4Gate5NoaaMetarReceipt_v39";
const requested=["WSSS","OMAA","SKBO","YSSY"] as const;
const obs=(utc:string)=>Date.parse(utc)/1000;
const sample=(fields:Record<string,unknown>={})=>({
 icaoId:"WSSS",
 obsTime:obs("2026-11-02T19:58:00.000Z"),
 receiptTime:"2026-11-02 20:01:00.000Z",
 reportTime:"2026-11-02 20:00:00.000Z",
 temp:30,dewp:25,wdir:190,wspd:8,wgst:12,
 altim:1009,visib:"10+",
 rawOb:"WSSS 021958Z 19008KT 9999 FEW018 30/25 Q1009",
 ...fields
});
const collectedAtUtc="2026-11-02T20:03:00.000Z";
const decode=(records:unknown[],collected=collectedAtUtc)=>
 decodeP4G5FreeNoaaMetarV39({
  sourceJsonText:JSON.stringify(records),collectedAtUtc:collected,
  requestedAirports:requested
 });
describe("Gate5 official NOAA worldwide METAR source and actual durable PRE cutoff",()=>{
 it("parses sampled NOAA receipt with physically different obs, report, source and downloaded clocks",()=>{
  const r=decode([sample(),sample({icaoId:"OMAA",wspd:12}),sample({icaoId:"ZZZZ"})]);
  expect(r.acceptedAirportCount).toBe(2);
  expect(r.missingAirports).toEqual(["SKBO","YSSY"]);
  expect(r.rejectedUnexpectedAirportCount).toBe(1);
  expect(r.sourceBodySha256).toMatch(/^[a-f0-9]{64}$/);
  const w=r.receipts.find(x=>x.airportIcao==="WSSS")!;
  expect(w.weatherObservationAtUtc).toBe("2026-11-02T19:58:00.000Z");
  expect(w.weatherIssuedAtUtc).toBe("2026-11-02T20:01:00.000Z");
  expect(w.collectedAtUtc).toBe(collectedAtUtc);
  expect(w.durableArtifactReadAtUtc).toBeNull();
  expect(w.metrics).toEqual({
    temperatureC:30,dewpointC:25,windDirectionDeg:190,
    windSpeedKt:8,windGustKt:12,altimeterHPa:1009
  });
  expect(r.sourceIsActualRunwayTime).toBe(false);
  expect(r.sourceIsFlightPopulation).toBe(false);
  expect(r.noPaidProviderCalls).toBe(true);
 });
 it("will NOT let local fetch be treated as durable before separate artifact upload",()=>{
  const r=decode([sample()]);
  const a=validateP4G5NoaaDurableArtifactV39(
   r,"2026-11-02T20:05:00.000Z",[
    {airportIcao:"WSSS",cutoffUtc:"2026-11-02T20:04:00.000Z"},
    {airportIcao:"WSSS",cutoffUtc:"2026-11-02T20:05:00.000Z"},
    {airportIcao:"SKBO",cutoffUtc:"2026-11-02T20:05:00.000Z"}
   ]);
  expect(a.reports.map(x=>x.weatherAvailableForThisActualCutoff))
   .toEqual([false,true,false]);
  expect(a.reports.every(x=>x.frozenFlightPredictionCutoffAudited===false))
   .toBe(true);
  expect(a.databaseWrites).toBe(0);
  expect(a.scientificGate5Passed).toBe(false);
 });
 it("late posted observation never enters an earlier PRE or fabricated early collection",()=>{
  const late=decode([sample({
   obsTime:obs("2026-11-02T20:02:00.000Z"),
   reportTime:"2026-11-02 20:06:00.000Z"
  })]);
  expect(late.acceptedAirportCount).toBe(0);
  expect(late.missingAirports).toContain("WSSS");
 });
 it("invalid station, malformed source array, excessive and invalid data refuse",()=>{
  expect(()=>decode([{obsTime:1}])).toThrow("P4_G5_NOAA_INVALID_STATION");
  expect(()=>decode("invalid" as unknown as unknown[]))
   .toThrow("P4_G5_NOAA_JSON_NOT_BOUNDED_ARRAY");
  expect(()=>decode([sample({obsTime:"2026-11-02"})]))
   .toThrow("P4_G5_NOAA_INVALID_OBS_UNIX_SECONDS");
  expect(()=>decode([sample({receiptTime:"yesterday"})]))
   .toThrow("P4_G5_NOAA_INVALID_UTC_RECEIPT");
  expect(()=>decode(Array.from({length:401},()=>sample())))
   .toThrow("P4_G5_NOAA_JSON_NOT_BOUNDED_ARRAY");
 });
 it("no source returns an explicit missing class not false negative flight outcome",()=>{
  const r=decode([]);
  expect(r.sourceStatus).toBe("NO_DATA_RETURNED");
  expect(r.acceptedAirportCount).toBe(0);
  expect(r.missingAirports).toEqual([...requested]);
  const a=validateP4G5NoaaDurableArtifactV39(
   r,"2026-11-02T20:10:00.000Z",[
    {airportIcao:"WSSS",cutoffUtc:"2026-11-02T20:10:00.000Z"}
   ]);
  expect(a.reports[0].weatherMissing).toBe(true);
 });
 it("stale reports, future observations, rows without usable metrics are missing",()=>{
  const a=decode([sample({obsTime:obs("2026-10-25T20:00:00.000Z")})]);
  expect(a.acceptedAirportCount).toBe(0);
  const b=decode([sample({obsTime:obs("2026-11-03T20:00:00.000Z")})]);
  expect(b.acceptedAirportCount).toBe(0);
  const c=decode([sample({temp:"??",dewp:"X",wspd:null,altim:"Q"})]);
  expect(c.acceptedAirportCount).toBe(0);
 });
 it("deduplicates same-station refreshes, chooses latest physical weather observation",()=>{
  const a=sample({obsTime:obs("2026-11-02T19:00:00.000Z"),temp:28,
    receiptTime:"2026-11-02 19:01:00.000Z"});
  const b=sample({temp:30});
  const r=decode([b,a]);
  expect(r.acceptedAirportCount).toBe(1);
  expect(r.receipts[0].metrics.temperatureC).toBe(30);
 });
 it("durable timestamp cannot precede HTTP fetch; code contains no ADB paid request",()=>{
  expect(()=>validateP4G5NoaaDurableArtifactV39(
   decode([sample()]),"2026-11-02T20:01:00.000Z",[]
  )).toThrow("P4_G5_NOAA_ARTIFACT_TIME_OR_CUTOFF_HOLD");
  const code=readFileSync(
   "scripts/v39_phase4_gate5_free_noaa_metar_actions.ts","utf8");
  expect(code).not.toContain("fetchFidsAirport");
  expect(code).not.toContain("getV39Pool");
  expect(code).not.toContain("new pg.");
  expect(code).not.toContain("phase6:start");
  expect(code).toContain("https://aviationweather.gov/api/data/metar");
 });
});
