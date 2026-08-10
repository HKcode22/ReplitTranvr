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
