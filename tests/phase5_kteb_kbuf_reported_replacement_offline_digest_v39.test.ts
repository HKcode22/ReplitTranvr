import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Offline integrity reconstruction ONLY: KBUF was reported in a truncated
 * owner Replit readback. This does not certify that the corrected full
 * production receipt, provider schedule, rights or signed pair set exists.
 */
const ORIGINAL_DIGEST =
  "3dbcc18dd44bdbb7e5323766a9a6bfacacc0bb2e38e3ccce9aff442611738763";
const REPORTED_REPLACEMENT = "KBUF";
const RECONSTRUCTED_CORRECTED_DIGEST =
  "f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592";
const SLOTS = ["HUB", "MID_A", "MID_B", "REGIONAL"] as const;

function recorded() {
  return JSON.parse(readFileSync(new URL(
    "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pair_owner_readonly_original.json",
    import.meta.url), "utf8"));
}
function selectedIcaos(packet: any) {
  return packet.candidatePairAirportSets.map((pair: any) => ({
    pairId: pair.pairId,
    icaos: SLOTS.map(slot => pair.airports[slot].icao)
  }));
}
function digest(rows: unknown) {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}
function reconstructReportedOneSlotReplacement(packet: any) {
  const original = selectedIcaos(packet);
  const corrected = JSON.parse(JSON.stringify(original));
  const target = corrected.find((x: any) => x.pairId === "pair-3");
  if (!target || target.icaos[1] !== "KTEB") {
    throw new Error("HOLD_ORIGINAL_PAIR3_NOT_KTEB");
  }
  target.icaos[1] = REPORTED_REPLACEMENT;
  return { original, corrected };
}

describe("Phase5 owner-reported KTEB to KBUF correction: pure offline reconstruction, NOT owner proof", () => {
  it("reproduces the archived real original 20-slot selection exactly", () => {
    const p = recorded();
    expect(p.status).toBe("FIVE_FULL_FRAME_PAIR_CANDIDATE_TEMPLATES_ONLY_NOT_FROZEN");
    expect(p.scannedFullyQualifiedMidRegionalAirports).toBe(1013);
    expect(p.candidatePairAirportSets).toHaveLength(5);
    expect(p.selectedAirportIcaosSha256).toBe(ORIGINAL_DIGEST);
    expect(digest(selectedIcaos(p))).toBe(ORIGINAL_DIGEST);
    expect(p.providerCalls).toBe(0);
    expect(p.databaseWrites).toBe(0);
    expect(p.webhookPosts).toBe(0);
    expect(p.crossoverAirportSetSigned).toBe(false);
    expect(p.treatmentOrderRandomized).toBe(false);
    expect(p.thirtyOneBatchDayCalendarSigned).toBe(false);
    expect(p.phase6PaidGo).toBe(false);
  });

  it("reconstructs reported KBUF with exactly ONE change in twenty slots and matches pasted f511 prefix", () => {
    const {original, corrected} = reconstructReportedOneSlotReplacement(recorded());
    const diffs: string[] = [];
    original.forEach((row: any, i: number) => {
      expect(corrected[i].pairId).toBe(row.pairId);
      row.icaos.forEach((icao: string, j: number) => {
        if (corrected[i].icaos[j] !== icao) {
          diffs.push(row.pairId + ":" + SLOTS[j] + ":" + icao + "->" + corrected[i].icaos[j]);
        }
      });
    });
    expect(diffs).toEqual(["pair-3:MID_A:KTEB->KBUF"]);
    expect(digest(corrected)).toBe(RECONSTRUCTED_CORRECTED_DIGEST);
    expect(digest(corrected).startsWith("f511")).toBe(true);
    expect(corrected.filter((x: any) => x.icaos.includes("KTEB"))).toHaveLength(0);
  });

  it("detects a second, undocumented replacement rather than accepting a new digest", () => {
    const {original, corrected} = reconstructReportedOneSlotReplacement(recorded());
    corrected[3].icaos[2] = "KAAA";
    expect(digest(corrected)).not.toBe(RECONSTRUCTED_CORRECTED_DIGEST);
    expect(corrected.flatMap((x: any, i: number) =>
      x.icaos.map((v: string, j: number) => v !== original[i].icaos[j] ? 1 : 0)
    ).reduce((a: number,b: number) => a+b,0)).toBe(2);
  });
});
