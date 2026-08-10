// ============================================================
// v3 — payload flattening (readability mirror of payload_json).
//
// The raw AeroDataBox flight item is deeply nested
//   { arrival: { airport: { location: { lat, lon } } }, ... }
// which is hard to eyeball in the table / CSV. This utility writes
// a SINGLE-LEVEL JSON object with dot-notation keys:
//   { "arrival.airport.location.lat": -2.157419, ... }
//
// Readability upgrades (never lose data):
//   - status numeric code            -> "EnRoute"
//   - codeshareStatus numeric code   -> "IsOperator"
//   - departure.quality / arrival.quality numeric codes
//                                     -> ["Basic","Live"]
//   - everything else kept as-is, arrays kept as arrays.
//
// Filled into the new payload_json_flat JSONB column by the
// extractor (new rows) and by the backfill (existing rows).
// payload_json stays as the untouched raw source of truth.
// ============================================================

import { CODESHARE_CODE, QUALITY_CODE, STATUS_CODE_BY_NUMBER } from "./flightNotificationExtractor_v3";

/**
 * Flatten a nested object into a single-level map of dot-notation keys.
 * Arrays are kept as JSON arrays (leaf). Returns null for non-objects.
 */
export function flattenPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const out: Record<string, unknown> = {};

  function walk(value: unknown, prefix: string, key: string): void {
    // Enum code -> readable name (exact key match on known fields).
    if (key === "status" && isNum(value)) {
      out[prefix || key] = STATUS_CODE_BY_NUMBER[Math.trunc(value)] ?? value;
      return;
    }
    if (key === "codeshareStatus" && isNum(value)) {
      out[prefix || key] = CODESHARE_CODE[Math.trunc(value)] ?? value;
      return;
    }
    // quality[] arrays of numeric codes -> names.
    if (/quality$/.test(key) && Array.isArray(value)) {
      out[prefix || key] = value.map((v) =>
        isNum(v) ? QUALITY_CODE[Math.trunc(v)] ?? v : v,
      );
      return;
    }

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(v, prefix ? `${prefix}.${k}` : k, k);
      }
      return;
    }

    out[prefix || key] = value;
  }

  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    walk(v, k, k);
  }
  return out;
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
