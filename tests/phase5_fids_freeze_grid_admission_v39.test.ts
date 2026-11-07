import { describe, expect, it } from "vitest";
import {
  evaluateP5FidsGrid,
  P5_FIDS_GRID_SCHEMA,
  type P5FidsAcquisition,
  type P5FidsGridInput,
  type P5Slot,
  type P5FidsHorizon,
} from "../server/lib/disruption/phase5FidsFreezeGridAdmission_v39";

const H: { horizon: P5FidsHorizon; beforeMinutes: number; label: string }[] = [
  { horizon: "T-24h", beforeMinutes: 1440, label: "T24" },
  { horizon: "T-6h", beforeMinutes: 360, label: "T6" },
  { horizon: "T-90m", beforeMinutes: 90, label: "T90" },
];
const S: [P5Slot, string][] = [
  ["HUB", "WSSS"], ["MID_A", "OMAA"],
  ["MID_B", "SKBO"], ["REGIONAL", "KGPT"],
];
const start = Date.parse("2027-01-01T00:00:00.000Z");
const iso = (x: number) => new Date(x).toISOString();

function sampleGrid(): P5FidsGridInput {
  const acquisitions: P5FidsAcquisition[] = [];
  const otherCategoryReservedPerDay: Record<string, number> = {};
  // T24 source for service day1 is physically charged on Day0.
  otherCategoryReservedPerDay[iso(start - 86_400_000).slice(0,10)] = 10;
  for (let day = 1; day <= 31; day++) {
    const dayStart = start + (day - 1) * 86_400_000;
    const date = iso(dayStart).slice(0, 10);
    otherCategoryReservedPerDay[date] = 10;
    const serviceStart = dayStart + 14 * 3_600_000;
    for (const [slot, icao] of S) {
      for (const h of H) {
        const cutoff = serviceStart - h.beforeMinutes * 60_000;
        acquisitions.push({
          runDayIndex: day,
          budgetDayUtc: date,
          physicalChargeDayUtc: iso(cutoff - 600_000).slice(0, 10),
          slot, icao, horizon: h.horizon,
          providerQueryDirection: "Departure",
          serviceWindowStartUtc: iso(serviceStart),
          serviceWindowEndUtc: iso(serviceStart + 4 * 3_600_000),
          earliestPlannedCutoffUtc: iso(cutoff),
          scheduledRequestUtc: iso(cutoff - 600_000),
          // Prospective selection occurs BEFORE T24 cutoff, not at batch start.
          plannedAirportSelectionUtc: iso(serviceStart - 1460 * 60_000),
          maxResponseAndPersistSeconds: 300,
          apiUnitsPerAttempt: 2,
          maxAttempts: 1,
          queryKey: "day" + day + "_" + slot + "_" + h.label,
        });
      }
    }
  }
  return {
    schema: P5_FIDS_GRID_SCHEMA,
    startDayUtc: "2027-01-01",
    calendarHash: "a".repeat(64),
    configHash: "b".repeat(64),
    frameHash: "c".repeat(64),
    providerContractHash: "d".repeat(64),
    protectedProjectApiUnits: 5_000,
    otherCategoryReservedUnits: 500,
    protectedApiFloorUnits: 100,
    dailyProjectApiCeilingUnits: 1_900,
    otherCategoryReservedPerDay,
    acquisitions,
  };
}
const copy = () => sampleGrid();

describe("Phase5 frozen 31-day FIDS source-grid arithmetic (NO provider)", () => {
  it("validates exactly 31 days × 4 slots × 3 horizons and worst-case provider request units", () => {
    const out = evaluateP5FidsGrid(copy());
    expect(out.status).toBe("SCHEDULE_BUDGET_ARITHMETIC_VERIFIED_NOT_PHASE6_AUTHORIZED");
    expect(out.days).toBe(31);
    expect(out.distinctSlotHorizonGroups).toBe(31 * 4 * 3);
    expect(out.plannedFidsRequests).toBe(372);
    expect(out.worstCaseFidsApiUnits).toBe(372 * 2);
    expect(out.worstCaseProjectReservedApiUnits).toBe(744 + 500 + 100);
    expect(out.minAdvanceMarginSeconds).toBe(300);
    expect(out.chargeDays).toBe(32);
    expect(out.byDay).toHaveLength(32);
    expect(out.byServiceDay).toHaveLength(31);
    expect(out.byDay[0].budgetDayUtc).toBe("2026-12-31");
    expect(out.byDay[0].combinedReservedUnits).toBe(4 * 2 + 10);
    expect(out.byDay[1].budgetDayUtc).toBe("2027-01-01");
    expect(out.byDay[1].combinedReservedUnits).toBe(4 * 3 * 2 + 10);
    expect(out.authorizesPaidCollection).toBe(false);
    expect(out.confirmsFlightLevelPre).toBe(false);
    expect(out.confirmsLiveSource).toBe(false);
    expect(out.confirmsSourceUseRights).toBe(false);
    expect(out.confirmsActualEarlyAirportSelection).toBe(false);
    expect(out.gridSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fingerprints the same frozen grid independent of row ordering", () => {
    const a = copy(), b = copy();
    b.acquisitions.reverse();
    expect(evaluateP5FidsGrid(a).gridSha256)
      .toBe(evaluateP5FidsGrid(b).gridSha256);
  });

  it("refuses missing 90-minute horizon on even one selected airport/day", () => {
    const a = copy();
    a.acquisitions.splice(0, 1);
    expect(() => evaluateP5FidsGrid(a)).toThrow("REFUSED_P5_FIDS_GRID_");
  });

  it("refuses request scheduled later than safe response+commit cutoff", () => {
    const a = copy();
    a.acquisitions[0].scheduledRequestUtc = a.acquisitions[0].earliestPlannedCutoffUtc;
    expect(() => evaluateP5FidsGrid(a)).toThrow("REQUEST_NOT_BEFORE_CUTOFF");
  });

  it("refuses undisclosed daily non-FIDS allocation", () => {
    const a = copy();
    delete a.otherCategoryReservedPerDay["2027-01-01"];
    expect(() => evaluateP5FidsGrid(a)).toThrow("UNRESERVED_OTHER_DAILY_SPEND");
  });

  it("refuses a daily combined reservation above the frozen cap", () => {
    const a = copy();
    a.dailyProjectApiCeilingUnits = 33; // 24 FIDS max + 10 other = 34
    expect(() => evaluateP5FidsGrid(a)).toThrow("DAILY_BUDGET_EXCEEDED");
  });

  it("refuses total FIDS + non-FIDS reserves + protected floor above project envelope", () => {
    const a = copy();
    a.protectedProjectApiUnits = 1_300; // calculated total 1344
    expect(() => evaluateP5FidsGrid(a)).toThrow("PROJECT_CEILING_EXCEEDED");
  });

  it("refuses non-FIDS monthly underreservation even when daily allocations fit", () => {
    const a = copy();
    a.otherCategoryReservedUnits = 250; // 32 physical UTC dates ×10=320
    expect(() => evaluateP5FidsGrid(a)).toThrow("OTHER_CATEGORIES_UNDERRESERVED");
  });

  it("refuses duplicate source query keys regardless of HTTP idempotency", () => {
    const a = copy();
    a.acquisitions[1].queryKey = a.acquisitions[0].queryKey;
    expect(() => evaluateP5FidsGrid(a)).toThrow("DUPLICATE_QUERY_KEY");
  });

  it("refuses a different source ICAO for one horizon of the same slot and day", () => {
    const a = copy();
    a.acquisitions[1].icao = "YSSY";
    expect(() => evaluateP5FidsGrid(a)).toThrow("SLOT_AIRPORT_CHANGED_WITHIN_DAY");
  });

  it("refuses two different slots silently using the same airport", () => {
    const a = copy();
    for (const r of a.acquisitions) if (r.runDayIndex === 1 && r.slot === "MID_A") r.icao = "WSSS";
    expect(() => evaluateP5FidsGrid(a)).toThrow("SAME_AIRPORT_MULTIPLE_DAY_SLOTS");
  });

  it("never permits charging a T24 request to the future flight-service day", () => {
    const a=copy();
    const first=a.acquisitions.find(r=>r.runDayIndex===1&&r.horizon==="T-24h")!;
    expect(first.budgetDayUtc).toBe("2027-01-01");
    expect(first.physicalChargeDayUtc).toBe("2026-12-31");
    first.physicalChargeDayUtc=first.budgetDayUtc;
    expect(()=>evaluateP5FidsGrid(a)).toThrow("PHYSICAL_GET_UTC_DAY_MISMATCH");
  });

  it("requires explicit Day0 non-FIDS reserves even when service days 1–31 are funded", () => {
    const a=copy();
    delete a.otherCategoryReservedPerDay["2026-12-31"];
    expect(()=>evaluateP5FidsGrid(a)).toThrow("UNRESERVED_OTHER_DAILY_SPEND");
  });

  it("enforces the actual UTC day cap even when every service-day line seems under limit", () => {
    const a=copy();
    a.otherCategoryReservedPerDay["2027-01-01"]=1880; // actual 24 + 1880 = 1904
    a.otherCategoryReservedUnits=3000; // avoid cycle underreservation as blocker
    a.protectedProjectApiUnits=7000;
    expect(()=>evaluateP5FidsGrid(a)).toThrow("DAILY_BUDGET_EXCEEDED");
  });

  it("refuses a swapped budget-day without changing run-day index", () => {
    const a = copy();
    a.acquisitions[0].budgetDayUtc = "2027-01-02";
    expect(() => evaluateP5FidsGrid(a)).toThrow("NONCONTIGUOUS_31_DAY_CALENDAR");
  });

  it("refuses reversed horizon cutoffs even when all source requests are early", () => {
    const a = copy();
    const first = a.acquisitions[0], second = a.acquisitions[1];
    const cut = first.earliestPlannedCutoffUtc;
    first.earliestPlannedCutoffUtc = second.earliestPlannedCutoffUtc;
    second.earliestPlannedCutoffUtc = cut;
    first.scheduledRequestUtc = iso(Date.parse(first.earliestPlannedCutoffUtc) - 600_000);
    second.scheduledRequestUtc = iso(Date.parse(second.earliestPlannedCutoffUtc) - 600_000);
    first.physicalChargeDayUtc = first.scheduledRequestUtc.slice(0, 10);
    second.physicalChargeDayUtc = second.scheduledRequestUtc.slice(0, 10);
    expect(() => evaluateP5FidsGrid(a)).toThrow("INCONSISTENT_HORIZON_ORDER");
  });

  it("refuses any multi-GET or unreviewed price plan despite a larger reserved budget", () => {
    const a=copy();
    a.acquisitions[0].maxAttempts=2;
    expect(()=>evaluateP5FidsGrid(a)).toThrow("MAX_ATTEMPTS");
    const b=copy();
    b.acquisitions[0].apiUnitsPerAttempt=3;
    expect(()=>evaluateP5FidsGrid(b)).toThrow("V0079_TWO_UNIT_PRICE_REQUIRED");
  });

  it("refuses unspecified 0-second end-to-end latency, price or too many attempts", () => {
    const a = copy();
    a.acquisitions[0].maxResponseAndPersistSeconds = 0;
    expect(() => evaluateP5FidsGrid(a)).toThrow("UNKNOWN_LATENCY_COST_OR_RETRIES");
    a.acquisitions[0].maxResponseAndPersistSeconds = 300;
    a.acquisitions[0].maxAttempts = 2;
    expect(() => evaluateP5FidsGrid(a)).toThrow("MAX_ATTEMPTS");
    a.acquisitions[0].maxAttempts = 1;
    a.acquisitions[0].apiUnitsPerAttempt = 0;
    expect(() => evaluateP5FidsGrid(a)).toThrow("V0079_TWO_UNIT_PRICE_REQUIRED");
  });

  it("rejects missing verified external contract pin rather than guessing provider rights", () => {
    const a = copy();
    a.providerContractHash = "";
    expect(() => evaluateP5FidsGrid(a)).toThrow("PROVIDER_CONTRACT_HASH");
  });

  it("refuses impossible per-day projects above the 1900 planning envelope", () => {
    const a = copy();
    a.dailyProjectApiCeilingUnits = 1_901;
    expect(() => evaluateP5FidsGrid(a)).toThrow("DAILY_LIMIT");
    a.dailyProjectApiCeilingUnits = 1_900;
    a.protectedProjectApiUnits = 50_001;
    expect(() => evaluateP5FidsGrid(a)).toThrow("PROJECT_BUDGET");
  });
});


describe("Phase5 early airport selection timing blocks late adaptive startBatch draws", () => {
  it("refuses a proposed selection at the Phase6 parent start (after T24 source)", () => {
    const a = sampleGrid();
    const day1 = a.acquisitions.filter(r => r.runDayIndex === 1 && r.slot === "HUB");
    for (const r of day1) {
      r.plannedAirportSelectionUtc = "2027-01-01T14:00:00.000Z";
    }
    expect(() => evaluateP5FidsGrid(a)).toThrow("AIRPORT_SELECTED_AFTER_SOURCE_ACQUISITION");
  });

  it("refuses an inconsistent selection timestamp across the three horizons", () => {
    const a = sampleGrid();
    a.acquisitions[1].plannedAirportSelectionUtc =
      "2026-12-31T13:39:00.000Z";
    expect(() => evaluateP5FidsGrid(a)).toThrow("INCONSISTENT_EARLY_SELECTION_SCHEDULE");
  });

  it("rejects missing selection time rather than treating an unpicked airport as frozen", () => {
    const a = sampleGrid();
    a.acquisitions[0].plannedAirportSelectionUtc = "";
    expect(() => evaluateP5FidsGrid(a)).toThrow("AIRPORT_PRESELECTION_UTC_FORMAT");
  });
});
