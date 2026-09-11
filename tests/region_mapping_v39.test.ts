import { describe, expect, it } from "vitest";
import { REGION_COUNTRY_COUNT, REGION_MAPPING_HASH, resolveRegion } from "../server/lib/disruption/regionMapping_v39";

describe("frozen country → macro-region mapping", () => {
  it("has a stable hash and a plausible country count", () => {
    expect(REGION_MAPPING_HASH).toMatch(/^[a-f0-9]{64}$/);
    expect(REGION_COUNTRY_COUNT).toBeGreaterThan(200);
  });

  it("applies the explicit overrides", () => {
    expect(resolveRegion("TR")).toBe("EU");
    expect(resolveRegion("GL")).toBe("NA");
    expect(resolveRegion("AU")).toBe("OC");
  });

  it("splits Russia at 60°E and refuses without longitude", () => {
    expect(resolveRegion("RU", 37.6)).toBe("EU");
    expect(resolveRegion("RU", 60.0)).toBe("AP");
    expect(resolveRegion("RU", 100.0)).toBe("AP");
    expect(resolveRegion("RU")).toBe("NEEDS_LONGITUDE");
    expect(resolveRegion("RU", NaN)).toBe("NEEDS_LONGITUDE");
  });

  it("maps representative countries and leaves unknown codes UNMAPPED", () => {
    expect(resolveRegion("US")).toBe("NA");
    expect(resolveRegion("DE")).toBe("EU");
    expect(resolveRegion("JP")).toBe("AP");
    expect(resolveRegion("AE")).toBe("MEA");
    expect(resolveRegion("BR")).toBe("SA");
    expect(resolveRegion("NZ")).toBe("OC");
    expect(resolveRegion("XX")).toBe("UNMAPPED");
    expect(resolveRegion("")).toBe("UNMAPPED");
    expect(resolveRegion(null)).toBe("UNMAPPED");
  });

  it("is case- and whitespace-tolerant but never guesses", () => {
    expect(resolveRegion(" us ")).toBe("NA");
    expect(resolveRegion("U")).toBe("UNMAPPED");
  });
});
