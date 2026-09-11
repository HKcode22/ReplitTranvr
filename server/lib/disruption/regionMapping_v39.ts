import { createHash } from "crypto";

/**
 * Phase 2C — frozen country → macro-region mapping (Plan §4.2).
 *
 * Binding rules encoded here:
 * - Default is an explicitly reviewed ISO-3166-1 alpha-2 country → macro-region lookup.
 * - Explicit overrides: Turkey → EU, Greenland → NA, Australia → OC.
 * - Russia (RU) is split by frozen airport longitude: <60°E → EU, ≥60°E → AP.
 *   A Russian airport without a valid longitude is UNMAPPED, never guessed.
 * - Five ISO territory codes that cannot be assigned honestly to one of the six
 *   project macro-regions without an additional airport-level rule are frozen
 *   explicitly as UNMAPPED rather than silently omitted.
 * - Missing/invalid country → UNMAPPED (excluded from strata, never forced).
 * - No ICAO-prefix fallback exists in this artifact.
 */

export type MacroRegion = "NA" | "EU" | "AP" | "MEA" | "SA" | "OC";
export type RegionResolution = MacroRegion | "UNMAPPED";

export const REGION_MAPPING_VERSION = "country-macro-region@v2";
export const REGION_MAPPING_RETRIEVAL_DATE = "2026-09-11";
export const REGION_MAPPING_SOURCE =
  "ISO 3166-1 alpha-2 project lookup reviewed 2026-09-11 with Plan §4.2 overrides; RU uses frozen airport longitude; ambiguous Antarctic/outlying territory codes are explicitly UNMAPPED";

const NA = new Set(
  "US CA MX GL BS BB CU DM DO GD HT JM KN LC VC VG VI PR GU TT AW BQ CW SX MF GP MQ BL TC KY BM MS AI BZ CR SV GT HN NI PA AG PM".split(" "),
);
const EU = new Set(
  "AL AD AT BY BE BA BG HR CY CZ DK EE FO FI FR DE GI GR GG HU IS IE IM IT JE LV LI LT LU MT MD MC ME NL MK NO PL PT RO SM RS SK SI ES SJ SE CH UA GB VA AX TR".split(" "),
);
const AP = new Set(
  "CN HK MO TW JP KP KR MN AF BD BT IN LK MV NP PK BN KH TL ID LA MY MM PH SG TH VN KZ KG TJ TM UZ AM AZ GE".split(" "),
);
const MEA = new Set(
  "AE BH QA SA YE OM KW IQ IL JO LB SY IR EG DZ TN LY MA EH SD SS ET ER DJ SO KE UG TZ RW BI MG MU SC KM MZ MW ZM ZW BW NA ZA LS SZ SN GM GN GW SL LR CI GH TG BJ NG NE ML BF MR CV ST CM CF TD CG CD GA GQ AO SH IO PS RE YT".split(" "),
);
const SA = new Set("AR BO BR CL CO EC GY PY PE SR UY VE FK GS GF".split(" "));
const OC = new Set("AU NZ PG FJ SB VU NC PF WS TO TV KI MH FM PW NR CK NU TK WF AS CC CX MP NF PN".split(" "));

/**
 * Explicitly reviewed ISO alpha-2 codes that remain UNMAPPED under the six-region
 * Plan because they are Antarctic/sub-Antarctic or geographically heterogeneous.
 * If one enters the measured frame, it remains visible and is excluded from the
 * primary region strata until a separately frozen airport-level override exists.
 */
export const REGION_EXPLICIT_UNMAPPED_ISO = Object.freeze(["AQ", "BV", "HM", "TF", "UM"] as const);
const EXPLICIT_UNMAPPED = new Set<string>(REGION_EXPLICIT_UNMAPPED_ISO);

/** Mapped country rows only; RU is handled separately by longitude. */
export const REGION_COUNTRY_COUNT = NA.size + EU.size + AP.size + MEA.size + SA.size + OC.size;
/** 243 mapped rows + RU + 5 explicitly-unmapped rows = all 249 ISO alpha-2 rows reviewed. */
export const REGION_REVIEWED_ISO_COUNT = REGION_COUNTRY_COUNT + 1 + EXPLICIT_UNMAPPED.size;

/** Russia split meridian (degrees east). Frozen by Plan §4.2. */
export const RUSSIA_SPLIT_LON_E = 60;

export function resolveRegion(isoCountry: string | null | undefined, longitudeE?: number | null): RegionResolution {
  const code = (isoCountry ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "UNMAPPED";
  if (code === "RU") {
    if (typeof longitudeE !== "number" || !Number.isFinite(longitudeE)) return "UNMAPPED";
    return longitudeE < RUSSIA_SPLIT_LON_E ? "EU" : "AP";
  }
  if (EXPLICIT_UNMAPPED.has(code)) return "UNMAPPED";
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
  retrieval_date: REGION_MAPPING_RETRIEVAL_DATE,
  source: REGION_MAPPING_SOURCE,
  russia_split_lon_e: RUSSIA_SPLIT_LON_E,
  explicit_unmapped_iso: [...REGION_EXPLICIT_UNMAPPED_ISO].sort(),
  NA: [...NA].sort(),
  EU: [...EU].sort(),
  AP: [...AP].sort(),
  MEA: [...MEA].sort(),
  SA: [...SA].sort(),
  OC: [...OC].sort(),
});

export const REGION_MAPPING_HASH = createHash("sha256").update(MAPPING_CANONICAL, "utf8").digest("hex");
