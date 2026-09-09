/**
 * V3.9-f.8 weather availability/selection owner.
 *
 * Binding authority: SEPmd/V3.9_DataCollectPlan_f.8.md §§10, 12.2 and the
 * Phase-0I implementation contract. Unknown weather remains missing; it is
 * never converted into benign wind/visibility/ceiling values.
 */

export interface WeatherSignal {
  iataCode: string;
  icaoCode: string;
  flightCategory: "VFR" | "MVFR" | "IFR" | "LIFR" | "UNKNOWN";
  windSpeedKt: number | null;
  gustSpeedKt: number | null;
  visibilityMiles: number | null;
  ceilingFt: number | null;
  hasThunderstorm: boolean | null;
  hasFreezing: boolean | null;
  rawMetar: string | null;
  riskContribution: number | null;
  source: string;
  sourceVersion: string;
  issueTime: Date | null;
  /** Earliest time this observation was usable by our system. */
  availableAt: Date | null;
  retrievedAt: Date;
  weatherMissing: boolean;
}

export interface WeatherRetrievalContext {
  cutoffUtc: Date;
  mode: "operational" | "retrospective";
  allowEra5: boolean;
}

/**
 * Small explicit compatibility map only. The research pipeline must use the
 * frozen airport reference/frame mapping. There is deliberately NO global
 * "K"+IATA heuristic because V3.9 is global.
 */
const VERIFIED_IATA_ICAO: Record<string, string> = {
  HNL: "PHNL", OGG: "PHOG", KOA: "PHKO", LIH: "PHLI", ANC: "PANC", FAI: "PAFA", JNU: "PAJN", SJU: "TJSJ",
  YYZ: "CYYZ", YVR: "CYVR", YUL: "CYUL", YYC: "CYYC", LHR: "EGLL", CDG: "LFPG", FRA: "EDDF", AMS: "EHAM",
  DXB: "OMDB", NRT: "RJAA", HND: "RJTT", ICN: "RKSI", SYD: "YSSY", MEX: "MMMX",
  LAX: "KLAX", SFO: "KSFO", JFK: "KJFK", ORD: "KORD", ATL: "KATL", DFW: "KDFW", DEN: "KDEN", SEA: "KSEA",
};

export function iataToIcao(iata: string): string {
  const code = (iata || "").trim().toUpperCase();
  return VERIFIED_IATA_ICAO[code] ?? "";
}

function missingSignal(iataCode: string, retrievedAt = new Date()): WeatherSignal {
  const code = (iataCode || "").trim().toUpperCase();
  return {
    iataCode: code,
    icaoCode: iataToIcao(code),
    flightCategory: "UNKNOWN",
    windSpeedKt: null,
    gustSpeedKt: null,
    visibilityMiles: null,
    ceilingFt: null,
    hasThunderstorm: null,
    hasFreezing: null,
    rawMetar: null,
    riskContribution: null,
    source: "none",
    sourceVersion: "v3.9-f.8",
    issueTime: null,
    availableAt: null,
    retrievedAt,
    weatherMissing: true,
  };
}

function categoryFromMetar(visibilityMiles: number | null, ceilingFt: number | null): WeatherSignal["flightCategory"] {
  if (visibilityMiles === null && ceilingFt === null) return "UNKNOWN";
  const vis = visibilityMiles ?? Number.POSITIVE_INFINITY;
  const ceil = ceilingFt ?? Number.POSITIVE_INFINITY;
  if (vis < 1 || ceil < 500) return "LIFR";
  if (vis < 3 || ceil < 1000) return "IFR";
  if (vis < 5 || ceil < 3000) return "MVFR";
  return "VFR";
}

function categoryPoints(cat: WeatherSignal["flightCategory"]): number {
  switch (cat) {
    case "LIFR": return 25;
    case "IFR": return 18;
    case "MVFR": return 10;
    case "VFR": return 2;
    default: return 0;
  }
}

/** Missing/invalid issue time is never cutoff-safe. */
export function isWeatherAvailableAtCutoff(
  issueTime: Date | null,
  cutoffUtc: Date,
  source: string,
  mode: "operational" | "retrospective",
): boolean {
  if (source === "era5" && mode === "operational") return false;
  if (!issueTime) return false;
  const issue = issueTime.getTime();
  const cutoff = cutoffUtc.getTime();
  return Number.isFinite(issue) && Number.isFinite(cutoff) && issue <= cutoff;
}

export function validateTafIssueTime(issueTime: Date | null, cutoffUtc: Date): boolean {
  return isWeatherAvailableAtCutoff(issueTime, cutoffUtc, "taf", "operational");
}

export const WEATHER_OPERATIONAL_PRECEDENCE = ["live_metar", "archive_metar", "gfs", "nam"] as const;
export type WeatherOperationalSource = (typeof WEATHER_OPERATIONAL_PRECEDENCE)[number];
export const WEATHER_OPERATIONAL_LOOKBACK_HOURS = 6;

export interface WeatherCandidate {
  source: string;
  issueTime: Date | null;
  availableAt: Date | null;
  payload: unknown;
}

export interface WeatherSelection {
  selected: WeatherCandidate | null;
  weatherMissing: boolean;
  sourceUsed: WeatherOperationalSource | "none" | null;
  reason: string;
}

/**
 * Select as-known weather using BOTH provider issue time and our availability
 * time. Unknown clocks fail closed. ERA5 is never an operational fallback.
 */
export function selectOperationalWeather(candidates: WeatherCandidate[], cutoffUtc: Date): WeatherSelection {
  const cutoffMs = cutoffUtc.getTime();
  if (!Number.isFinite(cutoffMs)) {
    return { selected: null, weatherMissing: true, sourceUsed: "none", reason: "invalid cutoff" };
  }
  const precedence = WEATHER_OPERATIONAL_PRECEDENCE as readonly string[];
  const eligible = candidates.filter((c) => {
    if (!precedence.includes(c.source) || c.source === "era5") return false;
    if (!c.issueTime || !c.availableAt) return false;
    const issue = c.issueTime.getTime();
    const available = c.availableAt.getTime();
    return Number.isFinite(issue) && Number.isFinite(available) && issue <= cutoffMs && available <= cutoffMs;
  });
  if (eligible.length === 0) {
    return { selected: null, weatherMissing: true, sourceUsed: "none", reason: "no cutoff-safe operational observation" };
  }
  const rank = (s: string) => precedence.indexOf(s);
  eligible.sort((a, b) => rank(a.source) - rank(b.source) || b.issueTime!.getTime() - a.issueTime!.getTime());
  const winner = eligible[0];
  const ageHours = (cutoffMs - winner.issueTime!.getTime()) / 3_600_000;
  if (ageHours > WEATHER_OPERATIONAL_LOOKBACK_HOURS) {
    return { selected: null, weatherMissing: true, sourceUsed: "none", reason: "latest qualifying observation older than 6h" };
  }
  return {
    selected: winner,
    weatherMissing: false,
    sourceUsed: winner.source as WeatherOperationalSource,
    reason: "selected by frozen operational precedence and cutoff clocks",
  };
}

/**
 * Convenience current-weather fetch used by the product surface. Research
 * historical/as-of materialization should use the historical feature store and
 * selectOperationalWeather rather than pretending a current fetch existed in
 * the past. Unknown ICAO mapping fails closed.
 */
export async function getAirportWeather(iataCode: string, context?: WeatherRetrievalContext): Promise<WeatherSignal> {
  const code = (iataCode || "").trim().toUpperCase();
  const retrievedAt = new Date();
  if (!code) return missingSignal("", retrievedAt);
  const icao = iataToIcao(code);
  if (!icao) return missingSignal(code, retrievedAt);

  const mode = context?.mode ?? "operational";
  const cutoffUtc = context?.cutoffUtc ?? retrievedAt;
  if (mode === "retrospective") {
    // Current METAR retrieval cannot establish what our system knew at a past
    // cutoff. A historical/archive owner must supply an as-known candidate.
    return missingSignal(code, retrievedAt);
  }
  return fetchMetarWeather(code, icao, cutoffUtc);
}

async function fetchMetarWeather(code: string, icao: string, cutoffUtc: Date): Promise<WeatherSignal> {
  const retrievedAt = new Date();
  const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(icao)}&format=json`;
  try {
    const resp = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Travnr-Disruption-Monitor/1.0" } });
    if (!resp.ok) return missingSignal(code, retrievedAt);
    const data: any = await resp.json();
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return missingSignal(code, retrievedAt);

    const issueRaw = row.reportTime ?? row.observation_time ?? null;
    const parsed = issueRaw ? new Date(issueRaw) : null;
    const issueTime = parsed && Number.isFinite(parsed.getTime()) ? parsed : null;
    if (!isWeatherAvailableAtCutoff(issueTime, cutoffUtc, "metar", "operational")) return missingSignal(code, retrievedAt);

    const numberOrNull = (value: unknown): number | null => {
      if (value === null || value === undefined || value === "") return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    const windSpeedKt = numberOrNull(row.wspd ?? row.wind_speed_kt);
    const gustSpeedKt = numberOrNull(row.wgst ?? row.wind_gust_kt);

    let visibilityMiles: number | null = null;
    const rawVis = row.visib ?? row.visibility_statute_mi;
    if (typeof rawVis === "number" && Number.isFinite(rawVis)) visibilityMiles = rawVis;
    else if (typeof rawVis === "string") {
      const cleaned = rawVis.trim().replace(/\+$/, "");
      const parts = cleaned.split(/\s+/);
      let value = Number.NaN;
      if (parts.length === 2 && parts[1].includes("/")) {
        const [n, d] = parts[1].split("/").map(Number);
        value = Number(parts[0]) + n / d;
      } else if (cleaned.includes("/")) {
        const [n, d] = cleaned.split("/").map(Number);
        value = n / d;
      } else value = Number(cleaned);
      if (Number.isFinite(value)) visibilityMiles = value;
    }

    let ceilingFt: number | null = null;
    for (const layer of Array.isArray(row.clouds) ? row.clouds : []) {
      const cover = String(layer?.cover ?? "").toUpperCase();
      const base = Number(layer?.base);
      if ((cover === "BKN" || cover === "OVC") && Number.isFinite(base)) {
        ceilingFt = ceilingFt === null ? base : Math.min(ceilingFt, base);
      }
    }

    const wxString = String(row.wxString ?? row.wx_string ?? "").toUpperCase();
    const hasThunderstorm = /\bTS\b|TSRA|TSGR/.test(wxString);
    const hasFreezing = /\bFZ\b|FZRA|FZDZ|FZFG|\bSN\b|\bPL\b/.test(wxString);
    const flightCategory = categoryFromMetar(visibilityMiles, ceilingFt);
    let riskContribution = categoryPoints(flightCategory);
    if (hasThunderstorm) riskContribution += 10;
    if (hasFreezing) riskContribution += 5;
    if ((gustSpeedKt ?? 0) >= 25 || (windSpeedKt ?? 0) >= 30) riskContribution += 3;
    riskContribution = Math.min(25, riskContribution);

    return {
      iataCode: code,
      icaoCode: icao,
      flightCategory,
      windSpeedKt,
      gustSpeedKt,
      visibilityMiles,
      ceilingFt,
      hasThunderstorm,
      hasFreezing,
      rawMetar: String(row.rawOb ?? row.raw_text ?? row.metar ?? "") || null,
      riskContribution,
      source: "live_metar",
      sourceVersion: "aviationweather-data-api",
      issueTime,
      availableAt: retrievedAt,
      retrievedAt,
      weatherMissing: false,
    };
  } catch {
    return missingSignal(code, retrievedAt);
  }
}
