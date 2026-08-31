/**
 * FIDS / flight_population census — V3.9-f.7 §5.1-5.4
 *
 * Binding spec: AugMDnotes/V3.9_DataCollectPlan.md §§5.1-5.4
 * Implements: S1 provider-observable prediction population
 * Status: STUB — schema exists (migrations/0019 flight_population), fetcher not yet wired to live AeroDataBox FIDS.
 * Gate 5 + REST budget proof (§5.4) require this before Phase 6.
 *
 * Frozen protocol (§5.1):
 *  endpoint GET /flights/schedule — direction Both, withCancelled=true, withCodeshared=true,
 *  withCargo=false, withPrivate=false, withLocation=false,
 *  local fromLocal/toLocal in airport IANA tz (see §5.3), 12h window, raw JSON + hash persisted.
 *
 * Worst-case proof (§5.4): BASE 744 + VALIDATION 60 + RETRIES 75 + CONTINGENCY 40 < 1000 REST units.
 */

export interface FidsCensusParams {
  airportIcao: string;
  fromLocal: string; // airport local, YYYY-MM-DD HH:mm
  toLocal: string;   // airport local
  ianaTimezone: string;
  withCancelled: boolean;
  withCodeshared: boolean;
}

export interface FidsCensusResult {
  airportIcao: string;
  fromLocal: string;
  toLocal: string;
  ianaTimezone: string;
  retrievalUtc: string;
  rawJson: unknown;
  responseHash: string;
  flightInstanceIds: string[]; // canonical ids via flightInstanceCanonical_v3
  truncated?: boolean;
}

/** STUB — throws until live FIDS endpoint verified at Gate 0.5 */
export async function fetchFidsPopulation(_params: FidsCensusParams): Promise<FidsCensusResult> {
  throw new Error(
    "FIDS census fetcher not yet implemented — see AugMDnotes/V3.9_DataCollectPlan.md §5.1-5.4 and flightInstanceCanonical_v3.ts §7.1. " +
      "Implement DST-aware fromLocal/toLocal conversion via IANA tz (§5.3), persist raw JSON+hash, deduplicate via canonical id. " +
      "Gate 5 requires population ≥ captured funnel."
  );
}

/** DST-aware UTC interval → local fromLocal/toLocal (see §5.3) */
export function utcIntervalToLocal(utcFrom: Date, utcTo: Date, ianaTimezone: string): { fromLocal: string; toLocal: string } {
  // Use Intl.DateTimeFormat with timeZone — verified via tests/fidsTimezone.test.ts (must cover spring-forward / fall-back)
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ianaTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(d)
      .replace(",", "");
  return { fromLocal: fmt(utcFrom), toLocal: fmt(utcTo) };
}
