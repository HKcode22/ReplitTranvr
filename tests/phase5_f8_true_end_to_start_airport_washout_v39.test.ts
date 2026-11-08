import {describe,expect,it} from "vitest";
import {
 chooseAirportsForRunDay,type AirportSamplingState,
 type FrameSamplingCandidate,type FrozenRunDaySamplingPlan
} from "../server/lib/disruption/phase6SamplingDecision_v39";

const H=(s:string)=>s.repeat(64);
const seed="scientifically-frozen-day-seed";
const frame:FrameSamplingCandidate[]=[
 {icao:"WSSS",tier:"HUB",region:"ASIA"},
 {icao:"OMAA",tier:"MID",region:"MIDDLE_EAST"},
 {icao:"SKBO",tier:"MID",region:"SOUTH_AMERICA"},
 {icao:"KGPT",tier:"REGIONAL",region:"NORTH_AMERICA"}
].map(x=>({...x,trafficPrior:10,tierPrior:10,inFrame:true,
 preEligible:true,postEligible:true,exclusionReason:null}));
const plan=(at:string):FrozenRunDaySamplingPlan=>({
 runDayIndex:2,calendarHash:H("a"),configHash:H("b"),
 windowStartUtc:new Date(at),frozenDrawSeed:seed,
 drawType:"NEW_TEMPLATE",anchorIcao:"WSSS",pairAirportSet:null,
 slotRegions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",
 MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"}
});
const state=(end:string|null):AirportSamplingState=>({
 icao:"WSSS",emaYield:null,mi:1,zeroYieldState:"normal",
 consecutiveZeroYield:0,firstZeroYieldDate:null,
 lastSuccessfulPhase6ObservationAt:null,lastDirectObservationAt:null,
 lastSelectedAt:"2026-11-09T08:00:00.000Z",
 lastWindowEndUtc:end,
 providerFailure:false,coverageFailed:false,stateVersion:0
});

describe("f.8 24h WASHOUT is previous WINDOW END to new START",()=>{
 it("rejects 24h start-to-start if previous 4h window yields only 20h end-to-start",()=>{
  expect(()=>chooseAirportsForRunDay(
    plan("2026-11-10T08:00:00.000Z"),frame,
    [state("2026-11-09T12:00:00.000Z")]))
   ).toThrow(/REFUSED_WASHOUT/);
 });
 it("admits exactly 24h between previous end and next start",()=>{
  const x=chooseAirportsForRunDay(
    plan("2026-11-10T12:00:00.000Z"),frame,
    [state("2026-11-09T12:00:00.000Z")]);
  expect(x.selections).toHaveLength(4);
  expect(x.selections.find(s=>s.slotId==="HUB")?.icao).toBe("WSSS");
 });
 it("rejects absent prior END rather than inventing 24h washout",()=>{
  expect(()=>chooseAirportsForRunDay(
    plan("2026-11-10T12:00:00.000Z"),frame,
    [state(null)])).toThrow("REFUSED_WASHOUT_PREVIOUS_WINDOW_END_UNVERIFIED");
 });
 it("rejects prior end earlier than start",()=>{
  expect(()=>chooseAirportsForRunDay(
    plan("2026-11-10T12:00:00.000Z"),frame,
    [state("2026-11-09T07:00:00.000Z")]))
   .toThrow("REFUSED_WASHOUT_PREVIOUS_WINDOW_END_UNVERIFIED");
 });
 it("first never-selected airport remains eligible without fake past window",()=>{
  const x=chooseAirportsForRunDay(plan("2026-11-10T12:00:00.000Z"),frame,[]);
  expect(x.selections).toHaveLength(4);
 });
 it("also rejects 2x2h previous window whose last segment ended five hours after start",()=>{
  // Previous actual exposure is 08:00–10:00 and 11:00–13:00.
  // Tuesday 12:00 gives only 23 hours from END; Tuesday 13:00 gives 24.
  expect(()=>chooseAirportsForRunDay(
    plan("2026-11-10T12:00:00.000Z"),frame,
    [state("2026-11-09T13:00:00.000Z")]))
   .toThrow(/REFUSED_WASHOUT/);
  expect(chooseAirportsForRunDay(
    plan("2026-11-10T13:00:00.000Z"),frame,
    [state("2026-11-09T13:00:00.000Z")]).selections).toHaveLength(4);
 });
});
