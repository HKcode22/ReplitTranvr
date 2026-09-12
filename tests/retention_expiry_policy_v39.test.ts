import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIDS_RETENTION_HOURS,
  DEFAULT_RAW_PROVIDER_RETENTION_HOURS,
  resolveRetentionPrimaryPolicy,
  validateRetentionDays,
  validateRetentionHours,
} from "../server/lib/disruption/retentionExpiry_v39";

describe("V3.9 primary retention policy", () => {
  it("uses distinct default clocks for raw provider content and live FIDS cache", () => {
    const policy = resolveRetentionPrimaryPolicy({});
    expect(policy.rawProviderHours).toBe(168);
    expect(policy.liveFidsHours).toBe(24);
    expect(DEFAULT_RAW_PROVIDER_RETENTION_HOURS).toBe(168);
    expect(DEFAULT_FIDS_RETENTION_HOURS).toBe(24);
  });

  it("keeps backward compatibility for the old raw-day setting without applying it to FIDS", () => {
    const policy = resolveRetentionPrimaryPolicy({ V39_RAW_PROVIDER_RETENTION_DAYS: "6" });
    expect(policy.rawProviderHours).toBe(144);
    expect(policy.liveFidsHours).toBe(24);
  });

  it("supports recovery-window compensation through separate hour settings", () => {
    const policy = resolveRetentionPrimaryPolicy({
      V39_RAW_PROVIDER_RETENTION_HOURS: "166",
      V39_FIDS_RETENTION_HOURS: "22",
    });
    expect(policy).toEqual({ rawProviderHours: 166, liveFidsHours: 22 });
  });

  it("refuses values above either hard class maximum", () => {
    expect(() => validateRetentionHours(169, 168, "raw")).toThrow("1 through 168 hours");
    expect(() => validateRetentionHours(25, 24, "fids")).toThrow("1 through 24 hours");
    expect(() => validateRetentionDays(8)).toThrow("1 through 7");
    expect(() => resolveRetentionPrimaryPolicy({ V39_FIDS_RETENTION_HOURS: "168" })).toThrow("V39_FIDS_RETENTION_HOURS");
  });
});
