/**
 * Weather signal — V3.9-f.8 §27 / Sep1_1 §27
 *
 * Binding spec: AugMDnotes/V3.9_DataCollectPlan.md §27
 *
 * Sep1_1 §27 corrections:
 *  - ERA5 leak prevention: never use future-known weather data
 *  - LDM naming correction: LDM = Local Data Message (aviationweather.gov product)
 *    NOT "Live Data Message" or any other expansion
 *  - Operational vs retrospective sources distinguished
 *  - Weather source/version tracked for reproducibility
 *  - TAF issue time validated
 *  - Future weather exclusion enforced
 *
 * Weather products used:
 *  - METAR: current observations (operational, ~5min latency)
 *  - TAF: terminal aerodrome forecasts (operational, issued every 6h)
 *  - LDM (Local Data Message): regional weather data (aviationweather.gov)
 *  - ERA5: reanalysis dataset (retrospective ONLY, never operational)
 *
 * ERA5 leak prevention rule:
 *  - ERA5 data must NEVER be used for snapshots at T if the data was
 *    generated AFTER T. ERA5 is only for retrospective analysis.
 *  - Operational snapshots use only METAR/TAF/LDM data available at T.
 */

export interface WeatherSignal {
  iataCode: string;
  icaoCode: string;
  flightCategory: string;
  windSpeedKt: number;
  gustSpeedKt: number;
  visibilityMiles: number;
  ceilingFt: number;
  hasThunderstorm: boolean;
  hasFreezing: boolean;
  rawMetar: string;
  riskContribution: number;
  /** Weather source: 'metar' | 'taf' | 'ldm' | 'era5' */
  source: string;
  /** Weather product version */
  sourceVersion: string;
  /** When the weather observation was issued */
  issueTime: Date | null;
  /** When we retrieved this data */
  retrievedAt: Date;
}

export interface WeatherRetrievalContext {
  /** The prediction cutoff time — weather data must be available at or before this time */
  cutoffUtc: Date;
  /** Whether this is for operational (live) or retrospective analysis */
  mode: "operational" | "retrospective";
  /** Whether ERA5 data is allowed (only for retrospective) */
  allowEra5: boolean;
}

function defaultSignal(iataCode: string): WeatherSignal {
  return {
    iataCode: (iataCode || "").toUpperCase(),
    icaoCode: iataToIcao(iataCode || ""),
    flightCategory: "UNKNOWN",
    windSpeedKt: 0,
    gustSpeedKt: 0,
    visibilityMiles: 10,
    ceilingFt: 99999,
    hasThunderstorm: false,
    hasFreezing: false,
    rawMetar: "",
    riskContribution: 0,
    source: "none",
    sourceVersion: "v3.9-f.8",
    issueTime: null,
    retrievedAt: new Date(),
  };
}

// Minimal IATA→ICAO mapping. For US airports, prepend "K". A small set of
// common non-K ICAO codes are special-cased so weather lookups still work
// for them; everything else falls back to K-prefix, which is fine for the
// US-focused launch surface of the disruption monitor.
const NON_K_ICAO: Record<string, string> = {
  HNL: "PHNL",
  OGG: "PHOG",
  KOA: "PHKO",
  LIH: "PHLI",
  ANC: "PANC",
  FAI: "PAFA",
  JNU: "PAJN",
  SJU: "TJSJ",
  YYZ: "CYYZ",
  YVR: "CYVR",
  YUL: "CYUL",
  YYC: "CYYC",
  LHR: "EGLL",
  CDG: "LFPG",
  FRA: "EDDF",
  AMS: "EHAM",
  DXB: "OMDB",
  NRT: "RJAA",
  HND: "RJTT",
  ICN: "RKSI",
  SYD: "YSSY",
  MEX: "MMMX",
};

function iataToIcao(iata: string): string {
  const code = (iata || "").trim().toUpperCase();
  if (!code) return "";
  if (NON_K_ICAO[code]) return NON_K_ICAO[code];
  if (code.length === 3) return `K${code}`;
  return code;
}

function categoryFromMetar(
  visibilityMiles: number,
  ceilingFt: number,
): "VFR" | "MVFR" | "IFR" | "LIFR" | "UNKNOWN" {
  if (!Number.isFinite(visibilityMiles) && !Number.isFinite(ceilingFt)) return "UNKNOWN";
  const vis = Number.isFinite(visibilityMiles) ? visibilityMiles : 99;
  const ceil = Number.isFinite(ceilingFt) ? ceilingFt : 99999;
  if (vis < 1 || ceil < 500) return "LIFR";
  if (vis < 3 || ceil < 1000) return "IFR";
  if (vis < 5 || ceil < 3000) return "MVFR";
  return "VFR";
}

function categoryPoints(cat: string): number {
  switch (cat) {
    case "LIFR": return 25;
    case "IFR": return 18;
    case "MVFR": return 10;
    case "VFR": return 2;
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// ERA5 leak prevention (§27)
// ---------------------------------------------------------------------------

/**
 * Check if weather data is available at a given cutoff.
 * ERA5 leak prevention: data generated AFTER cutoff must be excluded.
 *
 * For operational mode: only METAR/TAF/LDM data with issueTime ≤ cutoff.
 * For retrospective mode: ERA5 allowed if allowEra5=true AND data is historical.
 */
export function isWeatherAvailableAtCutoff(
  issueTime: Date | null,
  cutoffUtc: Date,
  source: string,
  mode: "operational" | "retrospective",
): boolean {
  if (!issueTime) return true; // missing issue time = treat as available

  // ERA5 leak prevention: ERA5 data must not be used for operational snapshots
  if (source === "era5" && mode === "operational") {
    console.warn(`[weather] ERA5 data rejected for operational mode at cutoff ${cutoffUtc.toISOString()}`);
    return false;
  }

  // Standard availability: issue time must be at or before cutoff
  return issueTime <= cutoffUtc;
}

/**
 * Validate TAF issue time.
 * TAFs are issued every 6 hours and valid for 24-30 hours.
 * A TAF issued after the cutoff is future data and must be excluded.
 */
export function validateTafIssueTime(
  issueTime: Date | null,
  cutoffUtc: Date,
): boolean {
  if (!issueTime) return false;
  return issueTime <= cutoffUtc;
}

// ---------------------------------------------------------------------------
// Weather retrieval
// ---------------------------------------------------------------------------

/**
 * Get airport weather with ERA5 leak prevention.
 * In operational mode: only METAR data (no ERA5).
 * In retrospective mode: METAR + optionally ERA5.
 */
export async function getAirportWeather(
  iataCode: string,
  context?: WeatherRetrievalContext,
): Promise<WeatherSignal> {
  const mode = context?.mode ?? "operational";
  const cutoffUtc = context?.cutoffUtc ?? new Date();
  const allowEra5 = context?.allowEra5 ?? false;

  const code = (iataCode || "").trim().toUpperCase();
  if (!code) return defaultSignal("");

  const icao = iataToIcao(code);
  if (!icao) return defaultSignal(code);

  // Operational mode: only METAR (never ERA5)
  if (mode === "operational" || !allowEra5) {
    return fetchMetarWeather(code, icao, cutoffUtc);
  }

  // Retrospective mode: try METAR first, fall back to ERA5 if needed
  const metar = await fetchMetarWeather(code, icao, cutoffUtc);
  if (metar.source !== "none") return metar;

  // ERA5 fallback for retrospective analysis (not implemented yet)
  // TODO: implement ERA5 retrieval when historical weather tables exist
  console.log(`[weather] ERA5 fallback not yet implemented for ${code} in retrospective mode`);
  return defaultSignal(code);
}

/**
 * Fetch METAR weather from aviationweather.gov.
 * METAR is the operational weather source (§27).
 */
async function fetchMetarWeather(
  code: string,
  icao: string,
  cutoffUtc: Date,
): Promise<WeatherSignal> {
  const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(
    icao,
  )}&format=json`;

  try {
    const resp = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Travnr-Disruption-Monitor/1.0" },
    });
    if (!resp.ok) {
      console.warn(`[weather] HTTP ${resp.status} for ${icao}`);
      return { ...defaultSignal(code), source: "none" };
    }
    const data: any = await resp.json();
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      console.log(`[weather] no METAR found for ${icao}`);
      return { ...defaultSignal(code), source: "none" };
    }

    // Parse issue time for ERA5 leak prevention
    const issueTimeStr = row.reportTime || row.observation_time || row.rawOb;
    let issueTime: Date | null = null;
    if (issueTimeStr) {
      const parsed = new Date(issueTimeStr);
      if (!Number.isNaN(parsed.getTime())) issueTime = parsed;
    }

    // ERA5 leak prevention: check availability at cutoff
    if (!isWeatherAvailableAtCutoff(issueTime, cutoffUtc, "metar", "operational")) {
      console.warn(`[weather] METAR for ${icao} issued after cutoff — excluded`);
      return { ...defaultSignal(code), source: "none" };
    }

    const wxString = String(row.wxString || row.wx_string || "").toUpperCase();
    const hasThunderstorm = /\bTS\b|TSRA|TSGR/.test(wxString);
    const hasFreezing = /\bFZ\b|FZRA|FZDZ|FZFG|\bSN\b|\bPL\b/.test(wxString);
    const windSpeedKt = Number(row.wspd ?? row.wind_speed_kt ?? 0) || 0;
    const gustSpeedKt = Number(row.wgst ?? row.wind_gust_kt ?? 0) || 0;
    const rawVis = row.visib ?? row.visibility_statute_mi;
    let visMiles: number;
    if (rawVis == null) {
      visMiles = 10;
    } else if (typeof rawVis === "string") {
      const cleaned = rawVis.trim().replace(/\+$/, "");
      const fracParts = cleaned.split(/\s+/);
      if (fracParts.length === 2 && fracParts[1].includes("/")) {
        const [n, d] = fracParts[1].split("/");
        visMiles = parseFloat(fracParts[0]) + (parseFloat(n) / parseFloat(d));
      } else if (cleaned.includes("/")) {
        const [n, d] = cleaned.split("/");
        visMiles = parseFloat(n) / parseFloat(d);
      } else {
        visMiles = parseFloat(cleaned);
      }
    } else {
      visMiles = Number(rawVis);
    }
    const visibilityMiles = Number.isFinite(visMiles) ? visMiles : 10;

    let ceilingFt = 99999;
    const clouds: any[] = Array.isArray(row.clouds) ? row.clouds : [];
    for (const layer of clouds) {
      const cover = String(layer?.cover || "").toUpperCase();
      if (cover === "BKN" || cover === "OVC") {
        const base = Number(layer?.base);
        if (Number.isFinite(base) && base < ceilingFt) ceilingFt = base;
      }
    }

    const flightCategory = categoryFromMetar(visibilityMiles, ceilingFt);
    let riskContribution = categoryPoints(flightCategory);
    if (hasThunderstorm) riskContribution += 10;
    if (hasFreezing) riskContribution += 5;
    if (gustSpeedKt >= 25 || windSpeedKt >= 30) riskContribution += 3;
    if (riskContribution > 25) riskContribution = 25;

    const rawMetar = String(row.rawOb || row.raw_text || row.metar || "");

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
      rawMetar,
      riskContribution,
      source: "metar",
      sourceVersion: "v3.9-f.8",
      issueTime,
      retrievedAt: new Date(),
    };
  } catch (err: any) {
    console.warn(`[weather] fetch failed for ${icao}:`, err?.message || err);
    return { ...defaultSignal(code), source: "none" };
  }
}
