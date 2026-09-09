// ============================================================
// v3 — Airport tier catalog for the tier-rotating collection.
// See MDplan/V3_CollectionStrategy.md for the sampling rationale.
//
// Tiers (by traffic class, NOT by value judgement):
//   HUB       — mega hubs (dense, high delay-propagation, heavy traffic)
//   MID       — large/medium airports
//   REGIONAL  — smaller / feeder airports
//
// WHY SO MANY (this file grew on 2026-08-09):
//   Airport subscriptions capture the WHOLE airport, so the tier list is the
//   ONLY lever we have over which flights enter the dataset. Adding an airport
//   to this list costs NOTHING — it is only subscribed (and only costs credits)
//   when a batch actually PICKS it. So a big catalog = broad future coverage
//   with zero risk; the rotating controller samples from it and records the
//   selection probability.
//
//   There are ~4,072 airports worldwide with scheduled commercial flights
//   (ATAG 2023; ~50k airports total but most are private strips with no
//   scheduled service). AeroDataBox covers the subset that has both ICAO+IATA
//   codes + flight schedules. We can't subscribe to all of them at once on a
//   60k-unit budget — and we don't need to: ~500 airports carry >90% of the
//   world's passengers. The catalog below is the curated sampling frame; the
//   free `GET /health/services/feeds/{service}/airports` endpoint (see
//   aerodataboxLimiter_v3.listFeedAirports) can enumerate the full covered
//   universe for the coverage report in the collection diagnostics.
//
//   Every entry is checked for live coverage (free) before subscribing, so a
//   wrong/uncovered code is safely skipped, never charged.
//
//   NOTE: every ICAO appears in EXACTLY ONE tier (the map would silently
//   pick the first if duplicated — don't duplicate across tiers).
// ============================================================

export type AirportTier = "HUB" | "MID" | "REGIONAL";

export const AIRPORT_TIERS: readonly AirportTier[] = ["HUB", "MID", "REGIONAL"];

/** Tier → ICAO codes (US + international mix, ~280 unique airports). */
export const AIRPORT_CATALOG: Record<AirportTier, readonly string[]> = {
  HUB: [
    // --- US mega-hubs ---
    "KJFK", "KLAX", "KORD", "KATL", "KDFW", "KSFO", "KSEA", "KMIA",
    // --- Europe mega-hubs ---
    "EGLL", "LFPG", "EHAM", "EDDF", "LEMD", "LTFM", "UUEE",
    // --- Middle East / Gulf mega-hubs ---
    "OMDB", "OTHH",
    // --- Asia mega-hubs ---
    "RJTT", "RJAA", "RKSI", "VHHH", "WSSS", "ZBAA", "ZSPD", "RCTP",
    // --- Oceania ---
    "YSSY", "YMML",
    // --- Canada / South America ---
    "CYYZ", "SBGR", "SAEZ",
  ],
  MID: [
    // --- US large ---
    "KLGA", "KEWR", "KDEN", "KIAH", "KCLT", "KPHL", "KBOS", "KDCA",
    "KFLL", "KMSP", "KSLC", "KTPA", "KPHX", "KLAS", "KBNA", "KSAN",
    "KPDX", "KSTL", "KMKE", "KBWI", "KCVG", "KCMH", "KSJC", "KOAK",
    "KONT", "KSNA", "KSMF", "KPIT", "KRDU", "KMSY",
    // --- Europe large ---
    "EDDM", "LIRF", "LEBL", "EIDW", "EGKK", "EGGW", "EDDT", "EDDB",
    "EKCH", "ESSA", "ENGM", "EBBR", "LSZH", "LOWW", "LPPT", "LGAV",
    "LFSB", "LFMN", "LSGG", "EDDH", "LEPA", "LEMG",
    // --- Asia / Pacific large ---
    "RJBB", "RJGG", "ZGGG", "ZUUU", "ZUCK", "ZBAD", "ZGSZ", "RPLL",
    "WIII", "WMKK", "VTBS", "VVTS", "YPPH", "YBBN", "NZAA",
    "VABB", "VIDP",
    // --- Middle East / Africa / South America large ---
    "OMAA", "OERK", "OEJN", "HECA", "OLBA",
    "FAOR", "FACT", "HKJK", "DTAA", "DNMM", "DGAA",
    "SCEL", "SKBO", "MMMX", "MMGL", "MMUN", "SBGL", "SBKP", "SBCF", "SPIM",
  ],
  REGIONAL: [
    // --- US regional / feeder ---
    "KABQ", "KTUS", "KBDL", "KBOI", "KFAT", "KTUL", "KOKC", "KOMA",
    "KDSM", "KCID", "KGRR", "KSDF", "KMEM", "KLEX", "KCHS", "KSAV",
    "KJAX", "KPBI", "KRSW", "KPFN", "KMYR", "KAVL", "KGPT",
    "KHSV", "KCAE", "KTRI", "KROA", "KCRW", "KMLI", "KSPI", "KFWA",
    "KSBN", "KTVC", "KLAN", "KFNT", "KCMX", "KESC", "KIWA", "KYIP",
    "KFLG", "KGJT", "KASE", "KEKO", "KRNO", "KSMX", "KSBP", "KMFR",
    "KEUG", "KPSC", "KGEG", "KMSO", "KBIL", "KGTF", "KCPR", "KCYS",
    "KBIS", "KMOT", "KFSD", "KRAP", "KGFK", "KDLH", "KPIA",
    "KCMI", "KRFD", "KBMI", "KIND",
    // --- Europe regional / secondary ---
    "EGPH", "EGGD", "EGNV", "EGHH", "EGNX", "EGCC", "EGLC", "EGSS",
    "LFPB", "LFPO", "LFSZ", "LFBD", "LFML", "LFBO", "LFLL", "LFRS",
    "EDDV", "EDDC", "EDDE", "EDDL", "EDDS", "EDDN", "EDVE",
    "LZIB", "LKPR", "EPWA", "EPGD", "LBSF", "LHBP", "LYBE", "LDZA",
    "LOWI", "LOWS", "LIMC", "LIMF", "LIRN", "LIRP", "LSGS",
    // --- Asia / Oceania regional ---
    "ZBHH", "ZSSS", "ZSNJ", "ZSHC", "ZSOF", "ZSJN",
    "VVDN", "VTSG", "VTBD", "VVPB", "VVNB", "RPVM", "RPVE", "WADD",
    "WAAA", "WMKL", "WMSK", "YPAD", "NZCH",
    "NZWN",
    // --- Africa / Middle East / Latin America regional ---
    "GMMN", "GMME", "HETB", "HSSS", "FLLS", "FNLU", "GOBD",
    "DNAA", "DRRN", "FMMI", "HTDA", "HAAB", "OLKA",
    "MMPR", "MMCZ", "MMVR", "MGGT", "MNMG", "MPTO", "MROC",
    "SVMI", "SKBQ", "SEQU", "SPJC", "SLLP", "SCFA", "SAWH",
    "SBBR", "SBRF", "SBFZ", "SBEG", "SBSV", "SBPA",
  ],
};

/** Map built once: ICAO → tier (fast lookup for stamping rows). */
const TIER_BY_ICAO: ReadonlyMap<string, AirportTier> = (() => {
  const m = new Map<string, AirportTier>();
  for (const tier of AIRPORT_TIERS) {
    for (const icao of AIRPORT_CATALOG[tier]) m.set(icao.toUpperCase(), tier);
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

// ---------------------------------------------------------------------------
// Frame tier resolution (§1.5.10 / Phase 0J).
//
// Missing traffic reference stays visible as tier='UNCLASSIFIED' with
// tier_verified=false — never null-coerced, never blanket REGIONAL.
// ---------------------------------------------------------------------------

export type FrameTier = AirportTier | "UNCLASSIFIED";

export interface TierResolution {
  tier: FrameTier;
  tierVerified: boolean;
  tierSource: "catalog" | "missing_reference";
}

/** Resolve the frame tier: catalog hit → verified tier; miss → UNCLASSIFIED. */
export function resolveFrameTier(icao: string | null | undefined): TierResolution {
  const hit = tierForIcao(icao);
  if (hit) return { tier: hit, tierVerified: true, tierSource: "catalog" };
  return { tier: "UNCLASSIFIED", tierVerified: false, tierSource: "missing_reference" };
}

// ---------------------------------------------------------------------------
// Anchor-score component formulas (§1.5.10 / §3.2.8 / Plan §9).
// Frozen: traffic_score = min(1, metric/hub_cut); geo = 0.5*deg + 0.3*intl +
// 0.2*rarity; carrier = 0.6*eff_norm + 0.4*intl; yield = mean of 3 clamped
// components; anchor = 0.40*t + 0.20*g + 0.20*c + 0.20*y.
// ---------------------------------------------------------------------------

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/** FROZEN: traffic_score = min(1, traffic_metric_value / hub_cut_metric). */
export function trafficScore(trafficMetricValue: number, hubCutMetric: number): number {
  if (!Number.isFinite(trafficMetricValue) || !Number.isFinite(hubCutMetric) || hubCutMetric <= 0) return 0;
  return clamp01(trafficMetricValue / hubCutMetric);
}

/** FROZEN: geo_score = 0.5*degree_norm + 0.3*intl_share + 0.2*region_rarity. */
export function geoScore(degreeNorm: number, intlShare: number, regionRarity: number): number {
  return 0.5 * clamp01(degreeNorm) + 0.3 * clamp01(intlShare) + 0.2 * clamp01(regionRarity);
}

/** FROZEN: carrier_score = 0.6*effective_carriers_norm + 0.4*intl_share. */
export function carrierScore(effectiveCarriersNorm: number, intlShare: number): number {
  return 0.6 * clamp01(effectiveCarriersNorm) + 0.4 * clamp01(intlShare);
}

/** One standardized yield component vs the frozen reference (clamped). */
export function standardizeYieldComponent(candidate: number, reference: number): number | null {
  if (!Number.isFinite(candidate) || !Number.isFinite(reference) || reference <= 0) return null;
  return clamp01(candidate / reference);
}

/** FROZEN: yield_score = arithmetic mean of the valid standardized components. */
export function yieldScore(components: Array<number | null>): number | null {
  const valid = components.filter((c): c is number => typeof c === "number" && Number.isFinite(c));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** FROZEN: anchor_score = 0.40*traffic + 0.20*geo + 0.20*carrier + 0.20*yield. */
export function anchorScore(traffic: number, geo: number, carrier: number, yield_: number | null): number | null {
  if (yield_ === null) return null; // no imputation from invalid references
  return 0.4 * traffic + 0.2 * geo + 0.2 * carrier + 0.2 * yield_;
}

/** Capacity is a feasibility GATE (rows_per_hour ≥ 60), never a score component. */
export const ANCHOR_CAPACITY_GATE_ROWS_PER_HOUR = 60;

/** Cumulative probe ceiling per immutable probe_budget_day_id (NOT per candidate, NOT UTC reset). */
export const PROBE_CAP_DAILY = 500;

export function passesCapacityGate(rowsPerHour: number): boolean {
  return Number.isFinite(rowsPerHour) && rowsPerHour >= ANCHOR_CAPACITY_GATE_ROWS_PER_HOUR;
}
