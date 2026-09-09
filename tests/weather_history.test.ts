/** V3.9-f.8 weather/history cutoff-safety tests. */
import { describe, it, expect } from "vitest";
import {
  isWeatherAvailableAtCutoff,
  validateTafIssueTime,
  selectOperationalWeather,
  iataToIcao,
  type WeatherCandidate,
} from "../server/lib/disruption/weatherSignal";
import {
  isHistoryReadySimple,
  computeHistoryReadyAt,
  evaluateHistoryCompleteness,
  HISTORY_MIN_QUALIFYING_FLIGHTS,
  getHistoricalFeatureAsOf,
  getHistoricalFeatureAsOfResult,
  getHistoricalFeaturesAsOf,
  insertHistoricalFeature,
  isHistoryReady,
  getHistoryReadiness,
  HistoryStoreInfrastructureError,
  type HistoryQueryExecutor,
} from "../server/lib/disruption/historicalFeatureStore_v3";

describe("weather availability", () => {
  const cutoff = new Date("2026-08-15T12:00:00Z");
  it("rejects ERA5 operationally but allows historical issue time retrospectively", () => {
    expect(isWeatherAvailableAtCutoff(new Date("2026-08-15T10:00:00Z"), cutoff, "era5", "operational")).toBe(false);
    expect(isWeatherAvailableAtCutoff(new Date("2026-08-15T10:00:00Z"), cutoff, "era5", "retrospective")).toBe(true);
  });
  it("rejects missing issue time instead of treating it as known", () => {
    expect(isWeatherAvailableAtCutoff(null, cutoff, "metar", "operational")).toBe(false);
  });
  it("rejects future issue time", () => {
    expect(isWeatherAvailableAtCutoff(new Date("2026-08-15T14:00:00Z"), cutoff, "metar", "operational")).toBe(false);
  });
  it("validates TAF issue time fail-closed", () => {
    expect(validateTafIssueTime(new Date("2026-08-15T06:00:00Z"), cutoff)).toBe(true);
    expect(validateTafIssueTime(null, cutoff)).toBe(false);
  });
  it("does not invent a global K-prefix ICAO", () => {
    expect(iataToIcao("LAX")).toBe("KLAX");
    expect(iataToIcao("XYZ")).toBe("");
  });
});

describe("operational as-known weather selection", () => {
  const cutoff = new Date("2026-09-01T12:00:00Z");
  const cand = (source: string, issueH: number | null, availH: number | null): WeatherCandidate => ({
    source,
    issueTime: issueH === null ? null : new Date(cutoff.getTime() - issueH * 3_600_000),
    availableAt: availH === null ? null : new Date(cutoff.getTime() - availH * 3_600_000),
    payload: {},
  });
  it("prefers frozen source precedence among cutoff-safe candidates", () => {
    const r = selectOperationalWeather([cand("gfs", 1, 1), cand("archive_metar", 2, 2), cand("live_metar", 3, 3)], cutoff);
    expect(r.weatherMissing).toBe(false);
    expect(r.sourceUsed).toBe("live_metar");
  });
  it("missing issue time or available_at is never operationally usable", () => {
    expect(selectOperationalWeather([cand("live_metar", null, 1)], cutoff).weatherMissing).toBe(true);
    expect(selectOperationalWeather([cand("live_metar", 1, null)], cutoff).weatherMissing).toBe(true);
  });
  it("ERA5 is never selected operationally", () => {
    expect(selectOperationalWeather([cand("era5", 1, 1)], cutoff).weatherMissing).toBe(true);
  });
  it("future issue/availability are excluded", () => {
    expect(selectOperationalWeather([{ source: "live_metar", issueTime: new Date(cutoff.getTime() + 1), availableAt: new Date(cutoff.getTime() - 1), payload: {} }], cutoff).weatherMissing).toBe(true);
    expect(selectOperationalWeather([{ source: "live_metar", issueTime: new Date(cutoff.getTime() - 1), availableAt: new Date(cutoff.getTime() + 1), payload: {} }], cutoff).weatherMissing).toBe(true);
  });
  it("older than 6h becomes explicit missing", () => {
    const r = selectOperationalWeather([cand("live_metar", 7, 7)], cutoff);
    expect(r.weatherMissing).toBe(true);
    expect(r.selected).toBeNull();
  });
  it("empty input remains missing rather than benign weather", () => {
    expect(selectOperationalWeather([], cutoff)).toMatchObject({ weatherMissing: true, selected: null, sourceUsed: "none" });
  });
});

describe("historical readiness", () => {
  it("compares cutoff with history_ready_at", () => {
    expect(isHistoryReadySimple("2026-08-15T00:00:00Z", "2026-08-15T12:00:00Z")).toBe(true);
    expect(isHistoryReadySimple("2026-08-15T12:00:00Z", "2026-08-15T00:00:00Z")).toBe(false);
  });
  it("history_ready_at=max(bootstrap_end,cutoff-lookback)", () => {
    const cutoff = new Date("2026-09-01T00:00:00Z");
    expect(computeHistoryReadyAt(new Date("2026-08-28T00:00:00Z"), cutoff, 7).toISOString()).toBe("2026-08-28T00:00:00.000Z");
    expect(computeHistoryReadyAt(new Date("2026-08-01T00:00:00Z"), cutoff, 7).toISOString()).toBe("2026-08-25T00:00:00.000Z");
  });
  it("requires five qualifying flights for complete aggregate history", () => {
    expect(HISTORY_MIN_QUALIFYING_FLIGHTS).toBe(5);
    expect(evaluateHistoryCompleteness(5).complete).toBe(true);
    expect(evaluateHistoryCompleteness(4).complete).toBe(false);
  });
});

describe("historical feature-store fail-closed boundary", () => {
  const empty: HistoryQueryExecutor = { query: async () => ({ rows: [], rowCount: 0 }) };
  const broken: HistoryQueryExecutor = { query: async () => { throw new Error("db down"); } };

  it("distinguishes a successful missing-as-of lookup from infrastructure failure", async () => {
    const status = await getHistoricalFeatureAsOfResult("airport", "KLAX", "dep_delay_mean", "2026-09-01T12:00:00Z", empty);
    expect(status).toEqual({ status: "MISSING_AS_OF", row: null });
    await expect(getHistoricalFeatureAsOf("airport", "KLAX", "dep_delay_mean", "2026-09-01T12:00:00Z", broken))
      .rejects.toBeInstanceOf(HistoryStoreInfrastructureError);
  });

  it("batch lookup returns empty only for a successful empty query; DB failure throws", async () => {
    expect((await getHistoricalFeaturesAsOf("route", "KLAX-KSFO", ["otp"], "2026-09-01T12:00:00Z", empty)).size).toBe(0);
    await expect(getHistoricalFeaturesAsOf("route", "KLAX-KSFO", ["otp"], "2026-09-01T12:00:00Z", broken))
      .rejects.toBeInstanceOf(HistoryStoreInfrastructureError);
  });

  it("insert failure propagates instead of pretending the append succeeded", async () => {
    await expect(insertHistoricalFeature({
      entityType: "airport",
      entityId: "KLAX",
      featureName: "dep_delay_mean",
      featureValue: 12,
      source: "test",
      sourceVersion: "1",
      sourceTimestamp: "2026-09-01T10:00:00Z",
      informationAvailableTimestamp: "2026-09-01T10:01:00Z",
      validFrom: "2026-09-01T10:00:00Z",
      validTo: null,
      batchId: null,
      payloadSha256: null,
    }, broken)).rejects.toBeInstanceOf(HistoryStoreInfrastructureError);
  });

  it("readiness missing is NOT_READY but readiness DB failure is infrastructure failure", async () => {
    expect(await isHistoryReady("airport", "KLAX", "2026-09-01T12:00:00Z", empty)).toBe(false);
    expect(await getHistoryReadiness("airport", "KLAX", empty)).toBeNull();
    await expect(isHistoryReady("airport", "KLAX", "2026-09-01T12:00:00Z", broken))
      .rejects.toBeInstanceOf(HistoryStoreInfrastructureError);
    await expect(getHistoryReadiness("airport", "KLAX", broken))
      .rejects.toBeInstanceOf(HistoryStoreInfrastructureError);
  });
});
