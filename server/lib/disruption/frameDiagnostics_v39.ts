import { createHash } from "crypto";

export const FRAME_DIAGNOSTIC_TIERS_V39 = ["HUB", "MID", "REGIONAL"] as const;
export const FRAME_DIAGNOSTIC_REGIONS_V39 = [
  "North America",
  "Europe",
  "Asia-Pacific",
  "Gulf/Africa",
  "South America",
  "Oceania",
] as const;

export type FrameDiagnosticTierV39 = (typeof FRAME_DIAGNOSTIC_TIERS_V39)[number];
export type FrameDiagnosticRegionV39 = (typeof FRAME_DIAGNOSTIC_REGIONS_V39)[number];

export interface FrameDiagnosticInputV39 {
  tier: string;
  tierVerified: boolean;
  region: string | null;
  preEligible: boolean;
  postEligible: boolean;
}

export interface FrameDiagnosticCellV39 {
  tier: FrameDiagnosticTierV39;
  region: FrameDiagnosticRegionV39;
  total: number;
  preEligible: number;
  postEligible: number;
  dualEligible: number;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

export function frameDiagnosticsHashV39(cells: readonly FrameDiagnosticCellV39[]): string {
  return createHash("sha256").update(canonical(cells), "utf8").digest("hex");
}

/**
 * Binding 3-tier × 6-region diagnostic table. UNCLASSIFIED and UNMAPPED rows
 * stay visible elsewhere in the final frame but are not silently assigned to
 * one of these 18 primary sampling cells.
 */
export function buildFrameDiagnostics18V39(
  rows: readonly FrameDiagnosticInputV39[],
): FrameDiagnosticCellV39[] {
  const cells: FrameDiagnosticCellV39[] = [];
  for (const tier of FRAME_DIAGNOSTIC_TIERS_V39) {
    for (const region of FRAME_DIAGNOSTIC_REGIONS_V39) {
      const members = rows.filter((row) => row.tierVerified && row.tier === tier && row.region === region);
      cells.push({
        tier,
        region,
        total: members.length,
        preEligible: members.filter((row) => row.preEligible).length,
        postEligible: members.filter((row) => row.postEligible).length,
        dualEligible: members.filter((row) => row.preEligible && row.postEligible).length,
      });
    }
  }
  if (cells.length !== 18) throw new Error("FRAME_DIAGNOSTICS_INTERNAL_CELL_COUNT");
  return cells;
}
