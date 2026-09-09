/** V3.9-f.8 weather/history cutoff-safety tests. */
import { describe,it,expect } from "vitest";
import { isWeatherAvailableAtCutoff,validateTafIssueTime,selectOperationalWeather,iataToIcao,type WeatherCandidate } from "../server/lib/disruption/weatherSignal";
import { isHistoryReadySimple,computeHistoryReadyAt,evaluateHistoryCompleteness,HISTORY_MIN_QUALIFYING_FLIGHTS } from "../server/lib/disruption/historicalFeatureStore_v3";

describe("weather availability",()=>{
  const cutoff=new Date("2026-08-15T12:00:00Z");
  it("rejects ERA5 operationally but allows historical issue time retrospectively",()=>{expect(isWeatherAvailableAtCutoff(new Date("2026-08-15T10:00:00Z"),cutoff,"era5","operational")).toBe(false);expect(isWeatherAvailableAtCutoff(new Date("2026-08-15T10:00:00Z"),cutoff,"era5","retrospective")).toBe(true);});
  it("rejects missing issue time instead of treating it as known",()=>{expect(isWeatherAvailableAtCutoff(null,cutoff,"metar","operational")).toBe(false);});
  it("rejects future issue time",()=>{expect(isWeatherAvailableAtCutoff(new Date("2026-08-15T14:00:00Z"),cutoff,"metar","operational")).toBe(false);});
  it("validates TAF issue time fail-closed",()=>{expect(validateTafIssueTime(new Date("2026-08-15T06:00:00Z"),cutoff)).toBe(true);expect(validateTafIssueTime(null,cutoff)).toBe(false);});
  it("does not invent a global K-prefix ICAO",()=>{expect(iataToIcao("LAX")).toBe("KLAX");expect(iataToIcao("XYZ")).toBe("");});
});

describe("operational as-known weather selection",()=>{
  const cutoff=new Date("2026-09-01T12:00:00Z");
  const cand=(source:string,issueH:number|null,availH:number|null):WeatherCandidate=>({source,issueTime:issueH===null?null:new Date(cutoff.getTime()-issueH*3_600_000),availableAt:availH===null?null:new Date(cutoff.getTime()-availH*3_600_000),payload:{}});
  it("prefers frozen source precedence among cutoff-safe candidates",()=>{const r=selectOperationalWeather([cand("gfs",1,1),cand("archive_metar",2,2),cand("live_metar",3,3)],cutoff);expect(r.weatherMissing).toBe(false);expect(r.sourceUsed).toBe("live_metar");});
  it("missing issue time or available_at is never operationally usable",()=>{expect(selectOperationalWeather([cand("live_metar",null,1)],cutoff).weatherMissing).toBe(true);expect(selectOperationalWeather([cand("live_metar",1,null)],cutoff).weatherMissing).toBe(true);});
  it("ERA5 is never selected operationally",()=>{expect(selectOperationalWeather([cand("era5",1,1)],cutoff).weatherMissing).toBe(true);});
  it("future issue/availability are excluded",()=>{expect(selectOperationalWeather([{source:"live_metar",issueTime:new Date(cutoff.getTime()+1),availableAt:new Date(cutoff.getTime()-1),payload:{}}],cutoff).weatherMissing).toBe(true);expect(selectOperationalWeather([{source:"live_metar",issueTime:new Date(cutoff.getTime()-1),availableAt:new Date(cutoff.getTime()+1),payload:{}}],cutoff).weatherMissing).toBe(true);});
  it("older than 6h becomes explicit missing",()=>{const r=selectOperationalWeather([cand("live_metar",7,7)],cutoff);expect(r.weatherMissing).toBe(true);expect(r.selected).toBeNull();});
  it("empty input remains missing rather than benign weather",()=>{expect(selectOperationalWeather([],cutoff)).toMatchObject({weatherMissing:true,selected:null,sourceUsed:"none"});});
});

describe("historical readiness",()=>{
  it("compares cutoff with history_ready_at",()=>{expect(isHistoryReadySimple("2026-08-15T00:00:00Z","2026-08-15T12:00:00Z")).toBe(true);expect(isHistoryReadySimple("2026-08-15T12:00:00Z","2026-08-15T00:00:00Z")).toBe(false);});
  it("history_ready_at=max(bootstrap_end,cutoff-lookback)",()=>{const cutoff=new Date("2026-09-01T00:00:00Z");expect(computeHistoryReadyAt(new Date("2026-08-28T00:00:00Z"),cutoff,7).toISOString()).toBe("2026-08-28T00:00:00.000Z");expect(computeHistoryReadyAt(new Date("2026-08-01T00:00:00Z"),cutoff,7).toISOString()).toBe("2026-08-25T00:00:00.000Z");});
  it("requires five qualifying flights for complete aggregate history",()=>{expect(HISTORY_MIN_QUALIFYING_FLIGHTS).toBe(5);expect(evaluateHistoryCompleteness(5).complete).toBe(true);expect(evaluateHistoryCompleteness(4).complete).toBe(false);});
});
