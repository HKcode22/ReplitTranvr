import { describe, expect, it } from "vitest";
import {
  REGION_COUNTRY_COUNT,
  REGION_EXPLICIT_UNMAPPED_ISO,
  REGION_MAPPING_HASH,
  REGION_MAPPING_RETRIEVAL_DATE,
  REGION_MAPPING_VERSION,
  REGION_REVIEWED_ISO_COUNT,
  resolveRegion,
} from "../server/lib/disruption/regionMapping_v39";

describe("frozen country → macro-region mapping", () => {
  it("has a versioned hash and reviews all 249 ISO alpha-2 rows", () => {
    expect(REGION_MAPPING_VERSION).toBe("country-macro-region@v2");
    expect(REGION_MAPPING_RETRIEVAL_DATE).toBe("2026-09-11");
    expect(REGION_MAPPING_HASH).toMatch(/^[a-f0-9]{64}$/);
    expect(REGION_COUNTRY_COUNT).toBe(243);
    expect(REGION_REVIEWED_ISO_COUNT).toBe(249);
    expect(REGION_EXPLICIT_UNMAPPED_ISO).toEqual(["AQ", "BV", "HM", "TF", "UM"]);
  });

  it("applies the explicit Plan overrides", () => {
    expect(resolveRegion("TR")).toBe("EU");
    expect(resolveRegion("GL")).toBe("NA");
    expect(resolveRegion("AU")).toBe("OC");
  });

  it("splits Russia at 60°E and uses the Plan UNMAPPED policy without longitude", () => {
    expect(resolveRegion("RU", 37.6)).toBe("EU");
    expect(resolveRegion("RU", 59.999999)).toBe("EU");
    expect(resolveRegion("RU", 60.0)).toBe("AP");
    expect(resolveRegion("RU", 100.0)).toBe("AP");
    expect(resolveRegion("RU")).toBe("UNMAPPED");
    expect(resolveRegion("RU", NaN)).toBe("UNMAPPED");
  });

  it("covers previously omitted airport-relevant ISO rows", () => {
    expect(resolveRegion("AG")).toBe("NA");
    expect(resolveRegion("AM")).toBe("AP");
    expect(resolveRegion("AZ")).toBe("AP");
    expect(resolveRegion("GE")).toBe("AP");
    expect(resolveRegion("GF")).toBe("SA");
    expect(resolveRegion("IO")).toBe("MEA");
    expect(resolveRegion("MP")).toBe("OC");
    expect(resolveRegion("PS")).toBe("MEA");
    expect(resolveRegion("RE")).toBe("MEA");
    expect(resolveRegion("YT")).toBe("MEA");
  });

  it("leaves explicitly ambiguous or unsupported territory codes UNMAPPED", () => {
    for (const code of REGION_EXPLICIT_UNMAPPED_ISO) expect(resolveRegion(code)).toBe("UNMAPPED");
    expect(resolveRegion("XX")).toBe("UNMAPPED");
    expect(resolveRegion("")).toBe("UNMAPPED");
    expect(resolveRegion(null)).toBe("UNMAPPED");
  });

  it("is case- and whitespace-tolerant but never guesses", () => {
    expect(resolveRegion(" us ")).toBe("NA");
    expect(resolveRegion("U")).toBe("UNMAPPED");
  });
});
