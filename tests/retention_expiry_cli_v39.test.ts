import { describe, expect, it } from "vitest";
import { parseRetentionCliArgs } from "../scripts/v39_retention_expiry_v39";

describe("V3.9 retention expiry operator CLI", () => {
  it("defaults to bounded dry-run mode", () => {
    expect(parseRetentionCliArgs([])).toEqual({ apply: false, limit: 100, rawRetentionHours: undefined, fidsRetentionHours: undefined });
  });

  it("parses explicit APPLY and per-class TTL overrides", () => {
    expect(parseRetentionCliArgs(["--apply", "--limit", "250", "--raw-hours", "166", "--fids-hours", "22"]))
      .toEqual({ apply: true, limit: 250, rawRetentionHours: 166, fidsRetentionHours: 22 });
  });

  it("refuses unbounded or invalid values and unknown arguments", () => {
    expect(() => parseRetentionCliArgs(["--limit", "0"])).toThrow("1 through 1000");
    expect(() => parseRetentionCliArgs(["--limit", "1001"])).toThrow("1 through 1000");
    expect(() => parseRetentionCliArgs(["--raw-hours", "169"])).toThrow("1 through 168");
    expect(() => parseRetentionCliArgs(["--fids-hours", "25"])).toThrow("1 through 24");
    expect(() => parseRetentionCliArgs(["--unknown"])).toThrow("unknown argument");
  });
});
