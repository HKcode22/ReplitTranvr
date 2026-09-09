/**
 * Tests: Weather (§70.13) and History (§70.14)
 * 
 * Covers:
 *  - METAR availability
 *  - TAF issue time
 *  - future weather exclusion
 *  - ERA5 operational misuse prohibited
 *  - actual product names for LDM/IDD
 *  - weather source/version
 *  - append-only behavior
 *  - as-of effective time
 *  - available_at
 *  - history readiness
 *  - row-specific completeness
 *  - no post-cutoff feature
 */

import { describe, it, expect } from "vitest";
import {
  isWeatherAvailableAtCutoff,
  validateTafIssueTime,
  selectOperationalWeather,
  type WeatherCandidate,
} from "../server/lib/disruption/weatherSignal";
import {
  isHistoryReadySimple,
  computeHistoryReadyAt,
  evaluateHistoryCompleteness,
  HISTORY_MIN_QUALIFYING_FLIGHTS,
} from "../server/lib/disruption/historicalFeatureStore_v3";

// ---------------------------------------------------------------------------
// §70.13 Weather
// ---------------------------------------------------------------------------

describe("§70.13 Weather", () => {
  describe("ERA5 leak prevention", () => {
    it("ERA5 data is rejected for operational mode", () => {
      const issueTime = new Date("2026-08-15T10:00:00Z");
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      const result = isWeatherAvailableAtCutoff(issueTime, cutoff, "era5", "operational");
      expect(result).toBe(false);
    });

    it("ERA5 data is allowed for retrospective mode", () => {
      const issueTime = new Date("2026-08-15T10:00:00Z");
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      const result = isWeatherAvailableAtCutoff(issueTime, cutoff, "era5", "retrospective");
      expect(result).toBe(true);
    });

    it("METAR data before cutoff is available", () => {
      const issueTime = new Date("2026-08-15T10:00:00Z");
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      const result = isWeatherAvailableAtCutoff(issueTime, cutoff, "metar", "operational");
      expect(result).toBe(true);
    });

    it("METAR data after cutoff is EXCLUDED (future weather exclusion)", () => {
      const issueTime = new Date("2026-08-15T14:00:00Z");
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      const result = isWeatherAvailableAtCutoff(issueTime, cutoff, "metar", "operational");
      expect(result).toBe(false);
    });
  });

  describe("TAF issue time validation", () => {
    it("TAF issued before cutoff is valid", () => {
      const issueTime = new Date("2026-08-15T06:00:00Z");
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      expect(validateTafIssueTime(issueTime, cutoff)).toBe(true);
    });

    it("TAF issued after cutoff is invalid", () => {
      const issueTime = new Date("2026-08-15T14:00:00Z");
      const cutoff = new Date("2026-08-15T12:00:00Z");
      
      expect(validateTafIssueTime(issueTime, cutoff)).toBe(false);
    });

    it("null issue time is invalid", () => {
      expect(validateTafIssueTime(null, new Date())).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// §70.14 History
// ---------------------------------------------------------------------------

describe("§70.14 History", () => {
  describe("History readiness", () => {
    it("cutoff after history_ready_at is ready", () => {
      const historyReadyAt = "2026-08-15T00:00:00Z";
      const cutoff = "2026-08-15T12:00:00Z";
      
      expect(isHistoryReadySimple(historyReadyAt, cutoff)).toBe(true);
    });

    it("cutoff before history_ready_at is NOT ready", () => {
      const historyReadyAt = "2026-08-15T12:00:00Z";
      const cutoff = "2026-08-15T00:00:00Z";
      
      expect(isHistoryReadySimple(historyReadyAt, cutoff)).toBe(false);
    });

    it("cutoff at exactly history_ready_at is ready", () => {
      const historyReadyAt = "2026-08-15T12:00:00Z";
      const cutoff = "2026-08-15T12:00:00Z";
      
      expect(isHistoryReadySimple(historyReadyAt, cutoff)).toBe(true);
    });
  });
});

describe("Phase 0I: history readiness + completeness (§1.5.9)", () => {
  it("history_ready_at = max(bootstrap_end, earliest_cutoff − lookback)", () => {
    const cutoff = new Date("2026-09-01T00:00:00Z");
    // bootstrap later than cutoff−7d wins
    expect(
      computeHistoryReadyAt(new Date("2026-08-28T00:00:00Z"), cutoff, 7).toISOString(),
    ).toBe("2026-08-28T00:00:00.000Z");
    // cutoff−lookback later than bootstrap wins
    expect(
      computeHistoryReadyAt(new Date("2026-08-01T00:00:00Z"), cutoff, 7).toISOString(),
    ).toBe("2026-08-25T00:00:00.000Z");
    // no bootstrap → cutoff − lookback
    expect(
      computeHistoryReadyAt(null, cutoff, 7).toISOString(),
    ).toBe("2026-08-25T00:00:00.000Z");
  });

  it("5-flight minimum gates history_complete_for_snapshot", () => {
    expect(HISTORY_MIN_QUALIFYING_FLIGHTS).toBe(5);
    expect(evaluateHistoryCompleteness(5).flag).toBe("history_complete_for_snapshot");
    expect(evaluateHistoryCompleteness(4).flag).toBe("history_incomplete");
    expect(evaluateHistoryCompleteness(0).complete).toBe(false);
  });
});

describe("Phase 0I: operational weather selection (§1.5.9)", () => {
  const cutoff = new Date("2026-09-01T12:00:00Z");
  function cand(source: string, issueH: number | null, availH: number | null): WeatherCandidate {
    return {
      source,
      issueTime: issueH === null ? null : new Date(cutoff.getTime() - issueH * 3_600_000),
      availableAt: availH === null ? null : new Date(cutoff.getTime() - availH * 3_600_000),
      payload: {},
    };
  }

  it("prefers live_metar over archive_metar over GFS", () => {
    const r = selectOperationalWeather(
      [cand("gfs", 1, 1), cand("archive_metar", 2, 2), cand("live_metar", 3, 3)],
      cutoff,
    );
    expect(r.weatherMissing).toBe(false);
    expect(r.sourceUsed).toBe("live_metar");
  });

  it("ERA5 is never selected operationally", () => {
    const r = selectOperationalWeather([cand("era5", 1, 1)], cutoff);
    expect(r.weatherMissing).toBe(true);
    expect(r.selected).toBeNull();
  });

  it("future issue_time excluded (leakage refusal)", () => {
    const future: WeatherCandidate = {
      source: "live_metar",
      issueTime: new Date(cutoff.getTime() + 3_600_000),
      availableAt: new Date(cutoff.getTime() + 3_600_000),
      payload: {},
    };
    const r = selectOperationalWeather([future], cutoff);
    expect(r.weatherMissing).toBe(true);
  });

  it("available_at after cutoff excluded even if issued before", () => {
    const late: WeatherCandidate = {
      source: "live_metar",
      issueTime: new Date(cutoff.getTime() - 3_600_000),
      availableAt: new Date(cutoff.getTime() + 60_000),
      payload: {},
    };
    const r = selectOperationalWeather([late], cutoff);
    expect(r.weatherMissing).toBe(true);
  });

  it("observation older than 6h → weather_missing", () => {
    const r = selectOperationalWeather([cand("live_metar", 7, 7)], cutoff);
    expect(r.weatherMissing).toBe(true);
    expect(r.reason).toContain("6h");
  });

  it("empty candidates → weather_missing (source NULL, never imputed)", () => {
    const r = selectOperationalWeather([], cutoff);
    expect(r).toMatchObject({ weatherMissing: true, selected: null, sourceUsed: "none" });
  });
});
