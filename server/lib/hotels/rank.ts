import { HotelOption, HotelSearchRequest, RankingHints } from "./types";

// Pure ranking function. No DB, no network, no env reads — fully
// deterministic and unit-testable.
//
// Per-signal weights (kept here so reviewers can tune them in one place):
const W_BUDGET_FIT = 25; // strong reward for being under per-night budget
const W_REFUNDABLE = 12; // reward refundable when caller asked for it
const W_GUEST_RATING = 18; // 0..10 → 0..18
const W_AMENITIES = 12; // requested-amenity coverage
const W_NEIGHBORHOOD = 10; // exact / fuzzy neighborhood match
const W_HOTEL_TYPE = 8; // requested type match (boutique / family / etc.)
const W_STAR_FIT = 8; // meets requested minimum star rating
const W_PROXIMITY = 7; // closer to city center wins
// Optional bonuses driven by RankingHints (small — never dominate base signals)
const W_HINT_FAMILY = 4;
const W_HINT_BUSINESS = 4;
const W_HINT_BOUTIQUE = 4;
const W_HINT_AI_CONFIDENCE = 5;

export interface RankedHotelOption extends HotelOption {
  rankScore: number;
  rankReasons: Record<string, number>;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function normalizeStr(s: string | undefined | null): string {
  return (s || "").toLowerCase().trim();
}

export function rankHotels(
  options: HotelOption[],
  request: HotelSearchRequest,
  hints?: RankingHints,
): RankedHotelOption[] {
  if (!Array.isArray(options) || options.length === 0) return [];

  const requestedAmenities = (request.amenities || []).map(normalizeStr).filter(Boolean);
  const requestedNeighborhood = normalizeStr(request.neighborhood);
  const requestedHotelType = normalizeStr(request.hotelType);
  const minStar = request.starRatingMin ?? 0;

  const ranked: RankedHotelOption[] = options.map((opt) => {
    const reasons: Record<string, number> = {};

    // 1) Budget fit — full points if under budget, partial if within 20% over.
    if (request.budgetPerNight && request.budgetPerNight > 0) {
      const ratio = opt.pricePerNight / request.budgetPerNight;
      let score = 0;
      if (ratio <= 1) score = W_BUDGET_FIT;
      else if (ratio <= 1.2) score = W_BUDGET_FIT * (1 - (ratio - 1) / 0.2);
      reasons.budgetFit = Math.round(score * 100) / 100;
    } else {
      reasons.budgetFit = 0;
    }

    // 2) Refundable when caller asked for refundable-only.
    if (request.refundableOnly) {
      reasons.refundable = opt.cancellationPolicy.refundable ? W_REFUNDABLE : 0;
    } else {
      // Mild bonus for refundable even when not strictly required.
      reasons.refundable = opt.cancellationPolicy.refundable ? W_REFUNDABLE * 0.25 : 0;
    }

    // 3) Guest rating — direct linear scaling (0..10 → 0..W_GUEST_RATING).
    const gr = typeof opt.guestRating === "number" ? clamp(opt.guestRating, 0, 10) : 0;
    reasons.guestRating = (gr / 10) * W_GUEST_RATING;

    // 4) Amenities coverage — fraction of requested amenities present.
    if (requestedAmenities.length > 0) {
      const have = new Set((opt.amenities || []).map(normalizeStr));
      const matched = requestedAmenities.filter((a) => have.has(a)).length;
      reasons.amenities = (matched / requestedAmenities.length) * W_AMENITIES;
    } else {
      reasons.amenities = 0;
    }

    // 5) Neighborhood match — exact substring match either direction.
    if (requestedNeighborhood) {
      const hood = normalizeStr(opt.neighborhood);
      const match = hood === requestedNeighborhood
        || hood.includes(requestedNeighborhood)
        || requestedNeighborhood.includes(hood);
      reasons.neighborhood = match ? W_NEIGHBORHOOD : 0;
    } else {
      reasons.neighborhood = 0;
    }

    // 6) Hotel type match.
    if (requestedHotelType) {
      reasons.hotelType = normalizeStr(opt.hotelType) === requestedHotelType ? W_HOTEL_TYPE : 0;
    } else {
      reasons.hotelType = 0;
    }

    // 7) Star rating fit — full points at/above minimum, zero below.
    if (minStar > 0) {
      reasons.starFit = opt.starRating >= minStar ? W_STAR_FIT : 0;
    } else {
      // Default: prefer 4★+ slightly when no min specified.
      reasons.starFit = opt.starRating >= 4 ? W_STAR_FIT * 0.5 : 0;
    }

    // 8) Proximity — closer to center wins. Anything ≤ 1km gets full,
    // falls off linearly to 0 at 8km.
    if (typeof opt.distanceFromCenterKm === "number") {
      const d = opt.distanceFromCenterKm;
      let score = 0;
      if (d <= 1) score = W_PROXIMITY;
      else if (d < 8) score = W_PROXIMITY * (1 - (d - 1) / 7);
      reasons.proximity = Math.round(score * 100) / 100;
    } else {
      reasons.proximity = 0;
    }

    // Optional hint bonuses — small so they never override the 8 base signals.
    if (hints) {
      if (hints.isFamilyTrip && normalizeStr(opt.hotelType) === "family") {
        reasons.hintFamily = W_HINT_FAMILY;
      }
      if (hints.isBusinessTrip && normalizeStr(opt.hotelType) === "business") {
        reasons.hintBusiness = W_HINT_BUSINESS;
      }
      if (hints.prefersBoutique && normalizeStr(opt.hotelType) === "boutique") {
        reasons.hintBoutique = W_HINT_BOUTIQUE;
      }
      if (typeof hints.aiConfidence === "number") {
        reasons.hintAiConfidence = clamp(hints.aiConfidence, 0, 1) * W_HINT_AI_CONFIDENCE;
      }
    }

    const rankScore = Object.values(reasons).reduce((a, b) => a + b, 0);
    return {
      ...opt,
      rankScore: Math.round(rankScore * 100) / 100,
      rankReasons: reasons,
    };
  });

  ranked.sort((a, b) => b.rankScore - a.rankScore);

  // Return top 3-5 — at least 3 if available, at most 5.
  const topCount = clamp(ranked.length, 3, 5);
  return ranked.slice(0, topCount);
}
