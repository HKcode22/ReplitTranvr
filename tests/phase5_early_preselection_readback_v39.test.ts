import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  verifyPreparedDailyDraw,
  type PreparedDayForReadback,
  type PreparedDrawRow,
} from "../server/lib/disruption/phase5EarlyPreselectionReadback_v39";

function fixture(): { day: PreparedDayForReadback; rows: PreparedDrawRow[] } {
  const day: PreparedDayForReadback = {
    runDayIndex: 1,
    scheduledStartUtc: new Date("2026-11-08T14:00:00.000Z"),
    frozenDrawSeed: "frozen_draw_seed_20261108",
    drawType: "NEW_TEMPLATE",
    anchorIcao: "WSSS",
    slotRegions: {
      HUB: "ASIA", MID_A: "MIDDLE_EAST",
      MID_B: "SOUTH_AMERICA", REGIONAL: "NORTH_AMERICA",
    },
    pairAirportSet: null,
    calendarHash: "a".repeat(64),
    configHash: "b".repeat(64),
    frameHash: "c".repeat(64),
  };
  const assignments = [
    ["HUB", "WSSS", "ASIA"],
    ["MID_A", "OMAA", "MIDDLE_EAST"],
    ["MID_B", "SKBO", "SOUTH_AMERICA"],
    ["REGIONAL", "KGPT", "NORTH_AMERICA"],
  ];
  const rows: PreparedDrawRow[] = assignments.map(([slot, airport, region]) => ({
    slot_id: slot,
    target_region: region,
    draw_type: day.drawType,
    selected_icao: airport,
    frozen_draw_seed: day.frozenDrawSeed,
    selected_at_utc: "2026-11-07T13:00:00.000Z",
    adaptive_state_hash: slot === "REGIONAL" ? "d".repeat(64) : null,
    probability_vector: slot === "REGIONAL" ? [
      { icao: "KGPT", probability: 1, drawScore: 1 },
    ] : null,
    airport_layer_design_probability: slot === "REGIONAL" ? 1 : null,
  }));
  return { day, rows };
}
const guarded = (run: (f: ReturnType<typeof fixture>) => void) => {
  const f = fixture();
  run(f);
  return () => verifyPreparedDailyDraw(f.day, f.rows);
};

describe("Phase5 early source preselection admission, zero provider / DB calls", () => {
  it("passes one early, same-transaction, four-unique-slot readback only as calendar timing", () => {
    const { day, rows } = fixture();
    const result = verifyPreparedDailyDraw(day, rows);
    expect(result.selections.map(x => x.icao)).toEqual(["WSSS","OMAA","SKBO","KGPT"]);
    expect(result.verifiedCalendarLeadOnly).toBe(true);
    expect(result.verifiedFlightLevelPre).toBe(false);
    expect(result.selectedAtUtc).toBe("2026-11-07T13:00:00.000Z");
    expect(result.stateHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates order-independent digest, not relative to PostgreSQL result order", () => {
    const a = fixture();
    const b = fixture();
    b.rows.reverse();
    expect(verifyPreparedDailyDraw(a.day,a.rows).stateHash)
      .toBe(verifyPreparedDailyDraw(b.day,b.rows).stateHash);
  });

  it("refuses an absent prior selection; never generates a fallback", () => {
    expect(guarded(f=>{f.rows=[];})).toThrow("MISSING_OR_DUPLICATED_SLOTS");
  });

  it("refuses one missing regional or extra row", () => {
    expect(guarded(f=>{f.rows.splice(3,1);})).toThrow("MISSING_OR_DUPLICATED_SLOTS");
    expect(guarded(f=>{f.rows.push({...f.rows[0]});})).toThrow("MISSING_OR_DUPLICATED_SLOTS");
  });

  it("refuses selecting at batch start or merely 5 minutes before T-24h", () => {
    expect(guarded(f=>{f.rows[0].selected_at_utc="2026-11-08T14:00:00.000Z";}))
      .toThrow("DRAW_TOO_LATE_FOR_T24_SOURCE");
    expect(guarded(f=>{for(const x of f.rows) x.selected_at_utc="2026-11-07T13:55:00.000Z";}))
      .toThrow("DRAW_TOO_LATE_FOR_T24_SOURCE");
  });

  it("refuses selections that cannot be one atomic committed sample", () => {
    expect(guarded(f=>{f.rows[0].selected_at_utc="2026-11-07T12:00:00.000Z";}))
      .toThrow("NONATOMIC_DRAW_TIMESTAMPS");
  });

  it("refuses changing airport under the same slot or repeating in two slots", () => {
    expect(guarded(f=>{f.rows[1].selected_icao="WSSS";}))
      .toThrow("INVALID_OR_DUPLICATE_AIRPORT");
    expect(guarded(f=>{f.rows[0].selected_icao="XXXX";}))
      .toThrow("FROZEN_ANCHOR_MISMATCH");
  });

  it("refuses conflicting region, seed, template, or invalid hash", () => {
    expect(guarded(f=>{f.rows[1].target_region="ASIA";}))
      .toThrow("WRONG_FROZEN_REGION");
    expect(guarded(f=>{f.rows[1].frozen_draw_seed="new";}))
      .toThrow("MISMATCHED_SEED_OR_TEMPLATE");
    expect(guarded(f=>{f.rows[2].draw_type="PAIR_REPLAY";}))
      .toThrow("MISMATCHED_SEED_OR_TEMPLATE");
    expect(guarded(f=>{f.day.frameHash="";}))
      .toThrow("UNPINNED_CALENDAR_CONFIG_OR_FRAME");
  });

  it("requires pair replay exact frozen airport and region", () => {
    const { day, rows } = fixture();
    day.drawType="PAIR_REPLAY";
    day.pairAirportSet = {
      HUB:{icao:"WSSS",region:"ASIA"},
      MID_A:{icao:"OMAA",region:"MIDDLE_EAST"},
      MID_B:{icao:"SKBO",region:"SOUTH_AMERICA"},
      REGIONAL:{icao:"KGPT",region:"NORTH_AMERICA"},
    };
    for(const x of rows) {x.draw_type="PAIR_REPLAY";}
    rows[3].adaptive_state_hash=null;
    expect(verifyPreparedDailyDraw(day,rows).selections).toHaveLength(4);
    day.pairAirportSet.REGIONAL.icao="YSSY";
    expect(()=>verifyPreparedDailyDraw(day,rows)).toThrow("PAIR_TEMPLATE_MISMATCH");
  });

  it("refuses missing regional probability or impossible direct-slot probability", () => {
    expect(guarded(f=>{f.rows[3].airport_layer_design_probability=null;}))
      .toThrow("REGIONAL_PROBABILITY_MISSING");
    expect(guarded(f=>{f.rows[0].airport_layer_design_probability=1;}))
      .toThrow("DIRECT_SLOT_PROBABILITY");
  });

  it("refuses regional vector not totaling one or not containing chosen airport", () => {
    expect(guarded(f=>{f.rows[3].probability_vector=[
      {icao:"KGPT",probability:0.75,drawScore:1},
    ];})).toThrow("REGIONAL_PROBABILITY_NOT_MATCHED");
    expect(guarded(f=>{f.rows[3].probability_vector=[
      {icao:"YSSY",probability:1,drawScore:1},
    ];})).toThrow("REGIONAL_PROBABILITY_NOT_MATCHED");
  });

  it("refuses missing adaptive-state hash on ordinary randomized day", () => {
    expect(guarded(f=>{f.rows[3].adaptive_state_hash=null;}))
      .toThrow("ADAPTIVE_STATE_HASH_MISSING");
  });

  it("never treats a readback as validated PRE feature capture", () => {
    const { day, rows } = fixture();
    const r=verifyPreparedDailyDraw(day, rows);
    expect(r.verifiedFlightLevelPre).toBe(false);
  });

  it("Phase6 child segment also refuses tampered or missing early parent readback", () => {
    const code=readFileSync("server/lib/disruption/phase6SegmentActivation_v39.ts","utf8");
    const child=code.slice(code.indexOf("async function loadSelections("),code.indexOf("\nasync function cleanupCreated(",code.indexOf("async function loadSelections(")));
    expect(child).toContain("verifyPreparedDailyDraw(");
    expect(child).toContain("prepared.stateHash !== day.sampling_state_hash");
    const active=code.slice(code.indexOf("export async function activateFrozenPlannedSegment("));
    expect(active.indexOf("await loadSelections(input.batchId,input.runDayIndex)"))
      .toBeLessThan(active.indexOf("await getBalance()"));
    expect(active).not.toContain("chooseAirportsForRunDay(");
  });

  it("source startBatch must consume persisted early draw, no late redraw or sampling mutation", () => {
    const code=readFileSync("server/lib/disruption/adbCollectionController_v3.ts","utf8");
    const start=code.slice(code.indexOf("export async function startBatch():"),code.indexOf("\ninterface SegmentSettlementResult",code.indexOf("export async function startBatch():")));
    expect(start).toContain("await loadPreparedDailyDraw(day)");
    expect(start).not.toContain("chooseAirportsForRunDay(");
    expect(start).not.toContain("await persistSamplingDecision(");
    expect(start.indexOf("await loadPreparedDailyDraw(day)")).toBeLessThan(start.indexOf("await assertBudgetHeadroom(auth)"));
  });
});
