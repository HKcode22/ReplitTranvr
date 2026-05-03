// Curated city → primary IATA map.
//
// Why this exists: Bland's transcript and Duffel's place search both make
// occasional bad airport picks for unambiguous cities — the most painful
// example is "Boston" resolving to MHT (Manchester, NH) instead of BOS
// (Logan). A small curated map avoids that whole class of bug for the cities
// our travelers actually fly to/from, without trying to replicate Duffel's
// global coverage.
//
// Three groups:
//   SINGLE_AIRPORT_CITIES — one major commercial airport. The voice agent
//     should never ask "which airport"; the post-call resolver must always
//     return this code.
//   MULTI_AIRPORT_PRIMARY — multiple comparable major airports. The agent
//     uses the assume-and-offer pattern; the post-call resolver defaults to
//     the listed primary unless the caller specified otherwise.
//   AMBIGUOUS_NAMES — city names that exist in multiple states/countries
//     with no clear primary. The agent must ask state/country.
//
// Keys are normalized to lowercase, no diacritics, no trailing punctuation.
// Lookups go through `normalizeCity` so callers don't have to worry about
// casing, "St." vs "Saint", or trailing commas.

export const SINGLE_AIRPORT_CITIES: Record<string, string> = {
  // US — top metros with one dominant commercial airport
  "boston": "BOS",
  "denver": "DEN",
  "seattle": "SEA",
  "atlanta": "ATL",
  "phoenix": "PHX",
  "philadelphia": "PHL",
  "philly": "PHL",
  "detroit": "DTW",
  "minneapolis": "MSP",
  "minneapolis st paul": "MSP",
  "minneapolis saint paul": "MSP",
  "twin cities": "MSP",
  "charlotte": "CLT",
  "salt lake city": "SLC",
  "slc": "SLC",
  "nashville": "BNA",
  "austin": "AUS",
  "san diego": "SAN",
  "las vegas": "LAS",
  "vegas": "LAS",
  "orlando": "MCO",
  "tampa": "TPA",
  "raleigh": "RDU",
  "raleigh durham": "RDU",
  "durham": "RDU",
  "indianapolis": "IND",
  "indy": "IND",
  "pittsburgh": "PIT",
  "cincinnati": "CVG",
  "kansas city": "MCI",
  "st louis": "STL",
  "saint louis": "STL",
  "cleveland": "CLE",
  "milwaukee": "MKE",
  "new orleans": "MSY",
  "memphis": "MEM",
  "albuquerque": "ABQ",
  "boise": "BOI",
  "buffalo": "BUF",
  "rochester": "ROC", // NY — Minnesota's RST is not a major commercial airport
  "hartford": "BDL",
  "providence": "PVD",
  "jacksonville": "JAX",
  "omaha": "OMA",
  "tucson": "TUS",
  "el paso": "ELP",
  "oklahoma city": "OKC",
  "tulsa": "TUL",
  "louisville": "SDF",
  "honolulu": "HNL",
  "anchorage": "ANC",
  // Canada — primary commercial airports
  "vancouver": "YVR",
  "calgary": "YYC",
  "edmonton": "YEG",
  "ottawa": "YOW",
  "winnipeg": "YWG",
  "halifax": "YHZ",
  // International — single dominant airport
  "berlin": "BER",
  "amsterdam": "AMS",
  "madrid": "MAD",
  "barcelona": "BCN",
  "lisbon": "LIS",
  "vienna": "VIE",
  "zurich": "ZRH",
  "geneva": "GVA",
  "munich": "MUC",
  "frankfurt": "FRA",
  "copenhagen": "CPH",
  "oslo": "OSL",
  "helsinki": "HEL",
  "dublin": "DUB",
  "edinburgh": "EDI",
  "athens": "ATH",
  "prague": "PRG",
  "warsaw": "WAW",
  "budapest": "BUD",
  "reykjavik": "KEF",
  "singapore": "SIN",
  "hong kong": "HKG",
  "dubai": "DXB",
  "doha": "DOH",
  "auckland": "AKL",
  "sydney": "SYD",
  "melbourne": "MEL",
  "mexico city": "MEX",
  "lima": "LIM",
  "santiago": "SCL",
  "bogota": "BOG",
  "panama city": "PTY",
};

// Multi-airport metros — picks the primary IATA we default to when the
// transcript only yields the bare city name. The full list of options stays
// as MULTI_AIRPORT_OPTIONS for ambiguity logging.
export const MULTI_AIRPORT_PRIMARY: Record<string, string> = {
  "new york": "JFK",
  "new york city": "JFK",
  "nyc": "JFK",
  "los angeles": "LAX",
  "la": "LAX",
  "san francisco": "SFO",
  "sf": "SFO",
  "bay area": "SFO",
  "washington": "DCA",
  "washington dc": "DCA",
  "dc": "DCA",
  "chicago": "ORD",
  "houston": "IAH",
  "miami": "MIA",
  "dallas": "DFW",
  "dallas fort worth": "DFW",
  "london": "LHR",
  "paris": "CDG",
  "tokyo": "HND",
  "moscow": "SVO",
  "rome": "FCO",
  "milan": "MXP",
  "stockholm": "ARN",
  "shanghai": "PVG",
  "seoul": "ICN",
  "buenos aires": "EZE",
  "sao paulo": "GRU",
  "são paulo": "GRU",
  "beijing": "PEK",
  "istanbul": "IST",
  "bangkok": "BKK",
  "kuala lumpur": "KUL",
  "jakarta": "CGK",
  "delhi": "DEL",
  "new delhi": "DEL",
  "mumbai": "BOM",
  "toronto": "YYZ",
  "montreal": "YUL",
  "berlin metro": "BER",
};

export const MULTI_AIRPORT_OPTIONS: Record<string, string[]> = {
  "new york": ["JFK", "LGA", "EWR"],
  "new york city": ["JFK", "LGA", "EWR"],
  "nyc": ["JFK", "LGA", "EWR"],
  "los angeles": ["LAX", "BUR", "LGB", "SNA", "ONT"],
  "la": ["LAX", "BUR", "LGB", "SNA", "ONT"],
  "san francisco": ["SFO", "OAK", "SJC"],
  "sf": ["SFO", "OAK", "SJC"],
  "bay area": ["SFO", "OAK", "SJC"],
  "washington": ["DCA", "IAD", "BWI"],
  "washington dc": ["DCA", "IAD", "BWI"],
  "dc": ["DCA", "IAD", "BWI"],
  "chicago": ["ORD", "MDW"],
  "houston": ["IAH", "HOU"],
  "miami": ["MIA", "FLL"],
  "dallas": ["DFW", "DAL"],
  "dallas fort worth": ["DFW", "DAL"],
  "london": ["LHR", "LGW", "STN", "LTN", "LCY", "SEN"],
  "paris": ["CDG", "ORY", "BVA"],
  "tokyo": ["HND", "NRT"],
  "moscow": ["SVO", "DME", "VKO"],
  "rome": ["FCO", "CIA"],
  "milan": ["MXP", "LIN", "BGY"],
  "stockholm": ["ARN", "BMA", "NYO"],
  "shanghai": ["PVG", "SHA"],
  "seoul": ["ICN", "GMP"],
  "buenos aires": ["EZE", "AEP"],
  "sao paulo": ["GRU", "CGH", "VCP"],
  "toronto": ["YYZ", "YTZ"],
  "montreal": ["YUL", "YMX"],
};

// City names that exist in multiple states/countries with no obvious primary.
// The voice agent must ask state/country before resolving these.
export const AMBIGUOUS_NAMES: Set<string> = new Set([
  "springfield",   // IL, MA, MO, OR, ...
  "richmond",      // VA, CA, KY, ...
  "columbus",      // OH, GA, IN, ...
  "portland",      // OR vs ME
  "cambridge",     // MA, UK, ON, ...
  "birmingham",    // AL vs UK
  "san jose",      // CA vs Costa Rica
  "naples",        // Italy vs FL
  "newcastle",     // UK vs AU
  "valencia",      // ES vs VE
  "córdoba",
  "cordoba",
  "georgetown",
  "lebanon",
]);

// Strip diacritics, lowercase, collapse internal whitespace, drop trailing
// punctuation, normalize "St." / "Saint" forms. Returns "" for falsy/garbage
// input so callers can do a single `if (!key)` short-circuit.
export function normalizeCity(input: string | null | undefined): string {
  if (!input || typeof input !== "string") return "";
  let s = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]+$/g, "")
    .replace(/^[.,!?;:]+/g, "");
  // "st louis" / "saint louis" / "st. louis" all collapse to "st louis"
  s = s.replace(/\bsaint\b/g, "st").replace(/\bst\.\s*/g, "st ");
  // Drop common trailing qualifiers the AI tends to append.
  s = s.replace(/\b(usa|us|u\.s\.a\.|u\.s\.|america)$/g, "").trim();
  // Drop trailing ", XX" state/province qualifier ("Boston, MA" -> "boston").
  // Only strip a single 2-letter code so we don't eat real city words.
  s = s.replace(/,\s*[a-z]{2}\s*$/g, "").trim();
  s = s.replace(/[.,!?;:]+$/g, "").trim();
  s = s.replace(/\s+/g, " ");
  return s;
}

export interface CityResolution {
  iata: string;
  source: "single_airport" | "multi_airport_primary";
  // For multi-airport metros, the alternatives the caller could have meant.
  // Empty for single-airport cities.
  alternatives: string[];
}

// Resolve a free-text city name to its primary IATA using only the curated
// maps (no Duffel call). Returns null when the city is unknown OR when it's
// in AMBIGUOUS_NAMES (caller should keep asking / fall back to other heuristics).
export function resolveCityToPrimaryIata(name: string | null | undefined): CityResolution | null {
  const key = normalizeCity(name);
  if (!key) return null;
  if (AMBIGUOUS_NAMES.has(key)) return null;
  if (Object.prototype.hasOwnProperty.call(SINGLE_AIRPORT_CITIES, key)) {
    return { iata: SINGLE_AIRPORT_CITIES[key], source: "single_airport", alternatives: [] };
  }
  if (Object.prototype.hasOwnProperty.call(MULTI_AIRPORT_PRIMARY, key)) {
    const alts = MULTI_AIRPORT_OPTIONS[key] || [];
    return {
      iata: MULTI_AIRPORT_PRIMARY[key],
      source: "multi_airport_primary",
      alternatives: alts.filter(c => c !== MULTI_AIRPORT_PRIMARY[key]),
    };
  }
  return null;
}

// Convenience predicate for the prompt-builder — used to remind the agent
// which cities never need an "which airport" question. Multi-airport metros
// (where the agent uses assume-and-offer) return false on purpose.
export function isSingleAirportCity(name: string | null | undefined): boolean {
  const key = normalizeCity(name);
  if (!key) return false;
  return Object.prototype.hasOwnProperty.call(SINGLE_AIRPORT_CITIES, key);
}

// Multi-airport / ambiguity check used by post-call extraction logging.
// Mirrors the previous inline MULTI_AIRPORT_CITIES table so downstream
// callers stay one-line.
export function isAmbiguousCityName(name: string | null | undefined): { ambiguous: boolean; options: string[] } {
  const key = normalizeCity(name);
  if (!key) return { ambiguous: false, options: [] };
  if (AMBIGUOUS_NAMES.has(key)) return { ambiguous: true, options: [] };
  if (Object.prototype.hasOwnProperty.call(MULTI_AIRPORT_OPTIONS, key)) {
    const opts = MULTI_AIRPORT_OPTIONS[key];
    if (opts.length > 1) return { ambiguous: true, options: opts };
  }
  return { ambiguous: false, options: [] };
}

// Guard called after Duffel place search returns an IATA. If the original
// query was a curated city name, force the curated primary IATA — Duffel
// has been known to return MHT for "Boston", OAK for "San Francisco", etc.
// Returns the corrected code and a flag indicating whether a substitution
// happened so callers can log a warning.
export function guardAgainstSecondaryAirport(
  originalQuery: string,
  duffelIata: string,
): { iata: string; substituted: boolean; expected: string | null } {
  const resolved = resolveCityToPrimaryIata(originalQuery);
  if (!resolved) return { iata: duffelIata, substituted: false, expected: null };
  // If the caller spelled out an explicit IATA in the query (e.g. "MHT"),
  // skip the guard — they meant the secondary airport on purpose.
  if (/\b[A-Z]{3}\b/.test(originalQuery) && originalQuery.toUpperCase().includes(duffelIata)) {
    return { iata: duffelIata, substituted: false, expected: resolved.iata };
  }
  if (duffelIata !== resolved.iata) {
    return { iata: resolved.iata, substituted: true, expected: resolved.iata };
  }
  return { iata: duffelIata, substituted: false, expected: resolved.iata };
}
