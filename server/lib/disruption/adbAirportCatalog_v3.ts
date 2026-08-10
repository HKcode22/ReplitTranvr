// ============================================================
// v3 — Airport tier catalog for the tier-rotating collection.
// See MDplan/V3_CollectionStrategy.md for the sampling rationale.
//
// Tiers (by traffic class, NOT by value judgement):
//   HUB       — mega hubs (dense, high delay-propagation, heavy traffic)
//   MID       — large/medium airports
//   REGIONAL  — smaller / feeder airports
//
// Airport subscriptions capture the WHOLE airport, so the tier list is the
// ONLY lever we have over which flights enter the dataset. Keep a healthy
// mix; the collection controller rotates through these lists per batch and
// records the selection probability so the dataset stays auditable.
//
// The list below is curated + adjustable — edit freely. Add/remove ICAOs;
// every entry is checked for live coverage (free) before subscribing.
// ============================================================

export type AirportTier = "HUB" | "MID" | "REGIONAL";

export const AIRPORT_TIERS: readonly AirportTier[] = ["HUB", "MID", "REGIONAL"];

/** Tier → ICAO codes (US + international mix). */
export const AIRPORT_CATALOG: Record<AirportTier, readonly string[]> = {
  HUB: [
    "KJFK", "KLAX", "KORD", "KATL", "KDFW", "KSFO", // US mega hubs
    "EGLL", "LFPG", "EHAM", "EDDF", "WSSS", "RJTT", "OMDB", // global hubs
  ],
  MID: [
    "KLGA", "KEWR", "KSEA", "KMIA", "KIAD", "KDEN", "KIAH", "KCLT", // US large
    "EDDM", "RJAA", "RKSI", "VHHH", "YSSY", "LEMD", // international large
  ],
  REGIONAL: [
    "KRDU", "KSJC", "KPIT", "KABQ", "KTUS", "KSTL", "KPDX", "KBDL",
    "KSMF", "KOAK", "KMSY", "KMKE", "YVR", "CYYZ",
  ],
};

/** Map built once: ICAO → tier (fast lookup for stamping rows). */
const TIER_BY_ICAO: ReadonlyMap<string, AirportTier> = (() => {
  const m = new Map<string, AirportTier>();
  for (const tier of AIRPORT_TIERS) {
    for (const icao of AIRPORT_CATALOG[tier]) m.set(icao, tier);
  }
  return m;
})();

/** Tier for an ICAO, or null if the airport is not in the catalog. */
export function tierForIcao(icao: string | null | undefined): AirportTier | null {
  if (!icao) return null;
  return TIER_BY_ICAO.get(icao.toUpperCase()) ?? null;
}

export function allCatalogAirports(): string[] {
  return AIRPORT_TIERS.flatMap((t) => [...AIRPORT_CATALOG[t]]);
}
