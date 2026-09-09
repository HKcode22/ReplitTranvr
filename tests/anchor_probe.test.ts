import { describe, expect, it } from "vitest";
import {
  completeBucketStability,
  cumulativeProbeExposure,
  deriveProbeStop,
  probeCapStopReason,
  ambiguityRankingInvariant,
} from "../scripts/anchor_probe";

describe("anchor probe accounting", () => {
  it("charges reservations and all terminal/uncertain outcomes cumulatively", () => {
    expect(cumulativeProbeExposure([
      { status: "completed", reservedCredits: 20, settledCredits: 18, internalSendCredits: 18 },
      { status: "failed", reservedCredits: 30, settledCredits: null, internalSendCredits: 4 },
      { status: "probing", reservedCredits: 40, settledCredits: null, internalSendCredits: null },
      { status: "abandoned", reservedCredits: 10, settledCredits: 12, internalSendCredits: 11 },
    ])).toBe(102);
  });

  it("settlement or internal exposure cannot be hidden by a smaller reservation", () => {
    expect(cumulativeProbeExposure([
      { status: "completed", reservedCredits: 5, settledCredits: 8, internalSendCredits: 10 },
    ])).toBe(10);
  });

  it("derives the SEND-aware cap stop from the larger observed exposure", () => {
    expect(probeCapStopReason(480, 15, 20)).toBe("probe_cap_soft_stop");
    expect(probeCapStopReason(479, 15, 20)).toBeNull();
  });
});

describe("anchor probe ambiguity bounds", () => {
  it("accepts ranking only when lower and upper-bound orders agree", () => {
    expect(ambiguityRankingInvariant([
      { icao: "AAAA", lower: 10, upper: 12 },
      { icao: "BBBB", lower: 8, upper: 9 },
    ])).toBe(true);
    expect(ambiguityRankingInvariant([
      { icao: "AAAA", lower: 10, upper: 12 },
      { icao: "BBBB", lower: 8, upper: 13 },
    ])).toBe(false);
  });
});

describe("anchor probe complete aligned bucket stability", () => {
  const m = 60_000;
  it("builds the entire epoch-aligned grid and includes zero-event buckets", () => {
    const result = completeBucketStability(2 * m, 62 * m, [16 * m, 17 * m, 46 * m], 3);
    expect(result.bucketCounts).toEqual([2, 0, 1]);
    expect(result.status).toBe("PASS");
    expect(result.stability).not.toBeNull();
  });

  it("excludes partial edge buckets and refuses too few complete buckets", () => {
    const result = completeBucketStability(2 * m, 31 * m, [3 * m, 16 * m], 2);
    expect(result.bucketCounts).toEqual([1]);
    expect(result).toMatchObject({ stability: null, status: "INSUFFICIENT_SAMPLE" });
  });

  it("gives an all-zero complete exposure stability zero", () => {
    expect(completeBucketStability(0, 60 * m, [], 4)).toEqual({
      bucketCounts: [0, 0, 0, 0], stability: 0, status: "PASS",
    });
  });
});

describe("anchor probe censoring", () => {
  it("derives normal completion rather than hard-coding censoring", () => {
    expect(deriveProbeStop(100, 100)).toEqual({ durationCensored: false, stopReason: null });
  });

  it("derives early-stop censoring and its reason", () => {
    expect(deriveProbeStop(100, 90, "probe_cap_soft_stop")).toEqual({
      durationCensored: true, stopReason: "probe_cap_soft_stop",
    });
  });
});
