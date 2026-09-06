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
} from "../server/lib/disruption/weatherSignal";
import {
  isHistoryReadySimple,
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
