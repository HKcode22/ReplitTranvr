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

export async function getAirportWeather(iataCode: string): Promise<WeatherSignal> {
  const code = (iataCode || "").trim().toUpperCase();
  if (!code) return defaultSignal("");

  const icao = iataToIcao(code);
  if (!icao) return defaultSignal(code);

  const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(
    icao,
  )}&format=json`;

  console.log(`[weather] fetching ${code} (${icao})`);

  try {
    const resp = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Travnr-Disruption-Monitor/1.0" },
    });
    if (!resp.ok) {
      console.warn(`[weather] HTTP ${resp.status} for ${icao}`);
      return defaultSignal(code);
    }
    const data: any = await resp.json();
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      console.log(`[weather] no METAR found for ${icao}`);
      return defaultSignal(code);
    }
    const wxString = String(row.wxString || row.wx_string || "").toUpperCase();
    const hasThunderstorm = /\bTS\b|TSRA|TSGR/.test(wxString);
    const hasFreezing = /\bFZ\b|FZRA|FZDZ|FZFG|\bSN\b|\bPL\b/.test(wxString);
    const windSpeedKt = Number(row.wspd ?? row.wind_speed_kt ?? 0) || 0;
    const gustSpeedKt = Number(row.wgst ?? row.wind_gust_kt ?? 0) || 0;
    const visMiles = Number(row.visib ?? row.visibility_statute_mi ?? 10);
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

    console.log(
      `[weather] ${code} cat=${flightCategory} vis=${visibilityMiles} ceil=${ceilingFt} ts=${hasThunderstorm} fz=${hasFreezing} contrib=${riskContribution}`,
    );

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
    };
  } catch (err: any) {
    console.warn(`[weather] fetch failed for ${icao}:`, err?.message || err);
    return defaultSignal(code);
  }
}
