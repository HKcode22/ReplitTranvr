// Pure adapter: maps the call-parsed travel details (and optional callRequest
// form fields as fallbacks) into a provider-agnostic HotelSearchRequest.
//
// No DB, no network, no env reads — fully unit-testable.
//
// Returns null when there isn't enough information to even attempt a hotel
// search (we require at least a destination and a check-in date — without
// those there's no useful query to send to any provider).

import type { HotelSearchRequest } from "./types";

// Minimal subset of fields we read from `parseTravelDetailsFromTranscript`.
// Kept loose with `?` because the parser returns nulls for missing fields.
export interface ParsedTravelDetailsLike {
  destination: string | null;
  departureDate: string | null;
  returnDate: string | null;
  passengers: number;
  budget?: number | null;
}

// Minimal subset of fields we read from a CallRequest row when present.
// Inbound (stateless) calls pass null and only rely on parsed details.
export interface CallRequestLike {
  destination?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

// Default trip length when the caller never gave a return date.
// TODO: revisit once we have real conversion data on hotel CTR vs trip length.
const DEFAULT_NIGHTS = 3;

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function isISODate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function extractHotelDetailsFromAnalysis(
  details: ParsedTravelDetailsLike,
  callRequest: CallRequestLike | null,
): HotelSearchRequest | null {
  // Destination: parsed value first, then form fallback. Hotels can resolve
  // city names directly (unlike Duffel which needs IATA), so we don't bother
  // converting to airport codes here — the provider does its own lookup.
  const destination =
    (details.destination && details.destination.trim()) ||
    (callRequest?.destination && callRequest.destination.trim()) ||
    null;
  if (!destination) return null;

  // Check-in: prefer parsed departure date, else form date. Must be ISO.
  const checkInRaw = details.departureDate || callRequest?.dateFrom || null;
  if (!isISODate(checkInRaw)) return null;
  const checkInDate = checkInRaw;

  // Check-out: prefer parsed return date, else form date, else default
  // DEFAULT_NIGHTS after check-in. We never return without a checkout — the
  // provider contract requires both dates.
  let checkOutDate: string;
  const checkOutRaw = details.returnDate || callRequest?.dateTo || null;
  if (isISODate(checkOutRaw)) {
    checkOutDate = checkOutRaw;
  } else {
    checkOutDate = addDaysISO(checkInDate, DEFAULT_NIGHTS);
  }

  // Sanity: checkout must be strictly after check-in. If a bad return date
  // slipped through (e.g. caller said "back the same day"), default forward.
  if (Date.parse(checkOutDate) <= Date.parse(checkInDate)) {
    checkOutDate = addDaysISO(checkInDate, DEFAULT_NIGHTS);
  }

  // Adults: mirror the flight passenger count, clamped to a sane range.
  const rawAdults = Number.isFinite(details.passengers) ? details.passengers : 1;
  const adults = Math.max(1, Math.min(20, Math.trunc(rawAdults)));

  const req: HotelSearchRequest = {
    destination,
    checkInDate,
    checkOutDate,
    adults,
    rooms: 1,
  };

  // Pass through the flight budget as a per-night hint if present and
  // positive. It's a rough signal — Phase 4 keeps it simple.
  if (typeof details.budget === "number" && details.budget > 0) {
    req.budgetPerNight = details.budget;
  }

  return req;
}
