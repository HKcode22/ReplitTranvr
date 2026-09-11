import { createHash } from "crypto";

/**
 * Phase 2C — frozen country → macro-region mapping (Plan §4.2).
 *
 * Binding rules encoded here:
 * - Default is a 1:1 ISO-3166 country → macro-region lookup.
 * - Explicit overrides: Turkey → EU, Greenland → NA, Australia → OC.
 * - Russia (RU) is split by frozen airport longitude: <60°E → EU, ≥60°E → AP.
 *   A Russian airport without a valid longitude is UNMAPPED, never guessed.
 * - Missing/invalid country → UNMAPPED (excluded from strata, never forced).
 * - No ICAO-prefix fallback exists in this artifact.
 */

export type MacroRegion = "NA" | "EU" | "AP" | "MEA" | "SA" | "OC";
export type RegionResolution = MacroRegion | "UNMAPPED" | "NEEDS_LONGITUDE";

export const REGION_MAPPING_VERSION = "country-macro-region@v1";
export const REGION_MAPPING_SOURCE = "ISO-3166-1 country rows with Plan §4.2 overrides (TR→EU, GL→NA, AU→OC, RU 60°E split)";

const NA = new Set(
  "US CA MX GL BS BB CU DM DO GD HT JM KN LC VC VG VI PR GU TT AW BQ CW SX MF GP MQ BL TC KY BM MS AI BZ CR SV GT HN NI PA".split(" "),
);
const EU = new Set(
  "AL AD AT BY BE BA BG HR CY CZ DK EE FO FI FR DE GI GR GG HU IS IE IM IT JE LV LI LT LU MT MD MC ME NL MK NO PL PT RO SM RS SK SI ES SJ SE CH UA GB VA AX TR".split(" "),
);
const AP = new Set(
  "CN HK MO TW JP KP KR MN AF BD BT IN LK MV NP PK BN KH TL ID LA MY MM PH SG TH VN KZ KG TJ TM UZ".split(" "),
);
const MEA = new Set(
  "AE BH QA SA YE OM KW IQ IL JO LB SY IR EG DZ TN LY MA EH SD SS ET ER DJ SO KE UG TZ RW BI MG MU SC KM MZ MW ZM ZW BW NA ZA LS SZ SN GM GN GW SL LR CI GH TG BJ NG NE ML BF MR CV ST CM CF TD CG CD GA GQ AO SH".split(" "),
);
const SA = new Set("AR BO BR CL CO EC GY PY PE SR UY VE FK GS".split(" "));
const OC = new Set("AU NZ PG FJ SB VU NC PF WS TO TV KI MH FM PW NR CK NU TK WF".split(" "));

export const REGION_COUNTRY_COUNT = NA.size + EU.size + AP.size + MEA.size + SA.size + OC.size;

/** Russia split meridian (degrees east). Frozen by Plan §4.2. */
export const RUSSIA_SPLIT_LON_E = 60;

export function resolveRegion(isoCountry: string | null | undefined, longitudeE?: number | null): RegionResolution {
  const code = (isoCountry ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "UNMAPPED";
  // Explicit override: Russia requires a valid longitude.
  if (code === "RU") {
    if (typeof longitudeE !== "number" || !Number.isFinite(longitudeE)) return "NEEDS_LONGITUDE";
    return longitudeE < RUSSIA_SPLIT_LON_E ? "EU" : "AP";
  }
  if (NA.has(code)) return "NA";
  if (EU.has(code)) return "EU";
  if (AP.has(code)) return "AP";
  if (MEA.has(code)) return "MEA";
  if (SA.has(code)) return "SA";
  if (OC.has(code)) return "OC";
  return "UNMAPPED";
}

const MAPPING_CANONICAL = JSON.stringify({
  version: REGION_MAPPING_VERSION,
  source: REGION_MAPPING_SOURCE,
  russia_split_lon_e: RUSSIA_SPLIT_LON_E,
  NA: [...NA].sort(),
  EU: [...EU].sort(),
  AP: [...AP].sort(),
  MEA: [...MEA].sort(),
  SA: [...SA].sort(),
  OC: [...OC].sort(),
});

export const REGION_MAPPING_HASH = createHash("sha256").update(MAPPING_CANONICAL, "utf8").digest("hex");
