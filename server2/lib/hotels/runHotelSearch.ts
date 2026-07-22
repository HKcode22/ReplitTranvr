// Phase 4 orchestrator: turns a parsed call result into a persisted hotel
// search + ranked options. Designed to be invoked fire-and-forget from the
// post-call paths so it can never block, slow, or break the email/proposal
// flow that ships flights to the caller.
//
// Contract:
//   - Single attempt, no retry. A failure marks the search "failed" and ends.
//   - Always swallows its own errors. The caller's `.catch()` is just a
//     belt-and-braces guard against bugs in this file itself.
//   - No-op when `details` doesn't yield a usable HotelSearchRequest.

import { storage } from "../../storage";
import type { InsertHotelOption } from "@shared/schema";
import { getHotelProvider } from "./index";
import { rankHotels } from "./rank";
import {
  HotelProviderNotConfiguredError,
  type HotelOption as HotelOptionDTO,
  type HotelSearchRequest,
} from "./types";
import {
  extractHotelDetailsFromAnalysis,
  type CallRequestLike,
  type ParsedTravelDetailsLike,
} from "./extract";

export interface RunHotelSearchInput {
  source: "inbound" | "outbound";
  // Inbound (stateless caller) has no call request row — pass null.
  callRequestId: number | null;
  callRequest: CallRequestLike | null;
  details: ParsedTravelDetailsLike;
  // Inbound has no userId. Outbound passes the owning user.
  userId: string | null;
  // Always null in Phase 4 — no proposal row exists at the point we hook in
  // (outbound saves the proposal later in the flow; inbound only creates a
  // guest_proposals row, not an itinerary_proposals row). Wired for future
  // phases that may want to associate a hotel search with a saved proposal.
  proposalId: number | null;
  logPrefix: string;
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// Convert a numeric value to the string form drizzle wants for `numeric`
// columns (Postgres NUMERIC). Returns null for missing/NaN.
function num(v: number | null | undefined): string | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return String(v);
}

function mapOptionToRow(
  searchId: number,
  provider: string,
  opt: HotelOptionDTO,
  rankMeta: { rankScore: number; rankReasons: Record<string, number> } | undefined,
): InsertHotelOption {
  // Free-cancellation deadline arrives as ISO string; persist as Date or null.
  let freeCancellationUntil: Date | null = null;
  const fcu = opt.cancellationPolicy?.freeCancellationUntil;
  if (typeof fcu === "string" && fcu.length > 0) {
    const parsed = new Date(fcu);
    if (!isNaN(parsed.getTime())) freeCancellationUntil = parsed;
  }

  return {
    searchId,
    provider,
    providerHotelId: opt.providerHotelId,
    providerRateId: opt.providerOfferId ?? null,
    name: opt.name,
    address: opt.address ?? null,
    neighborhood: opt.neighborhood ?? null,
    latitude: num(opt.latitude ?? null),
    longitude: num(opt.longitude ?? null),
    starRating: num(opt.starRating ?? null),
    guestRating: num(opt.guestRating ?? null),
    images: Array.isArray(opt.images) ? opt.images.map((i) => i.url) : [],
    description: null,
    amenities: Array.isArray(opt.amenities) ? opt.amenities : [],
    roomName: null,
    bedType: null,
    boardType: null,
    cancellationPolicy: opt.cancellationPolicy?.description ?? null,
    refundable: opt.cancellationPolicy?.refundable ?? null,
    freeCancellationUntil,
    nightlyPrice: num(opt.pricePerNight ?? null),
    taxesAndFees: num(opt.taxesAndFees ?? null),
    totalPrice: num(opt.totalPrice ?? null),
    currency: opt.currency ?? null,
    payNowOrLater: null,
    checkInInstructions: null,
    specialInstructions: null,
    // Admin-only field — never surfaced to non-admin endpoints.
    sourceRawPayload: opt.sourceRawPayload ?? null,
    rankScore: num(rankMeta?.rankScore ?? null),
    rankReasons: rankMeta?.rankReasons ?? null,
  };
}

export async function runHotelSearchForCall(input: RunHotelSearchInput): Promise<void> {
  const { source, callRequestId, callRequest, details, userId, proposalId, logPrefix } = input;
  const lp = `${logPrefix} [hotels]`;

  // Step 1: build the normalized request. Bail silently when there isn't
  // enough info — no DB row gets created in that case.
  let request: HotelSearchRequest | null;
  try {
    request = extractHotelDetailsFromAnalysis(details, callRequest);
  } catch (err) {
    console.error(`${lp} extract threw unexpectedly:`, errMsg(err));
    return;
  }
  if (!request) {
    console.log(`${lp} skipping reason=insufficient_details source=${source}`);
    return;
  }

  const provider = getHotelProvider();
  console.log(
    `${lp} starting source=${source} provider=${provider.name} dest="${request.destination}" in=${request.checkInDate} out=${request.checkOutDate} adults=${request.adults}`,
  );

  // Step 2: persist the pending search row up front so even a provider
  // failure leaves an audit trail for the admin endpoints to surface.
  let searchId: number;
  try {
    const row = await storage.createHotelSearch({
      userId: userId ?? null,
      callRequestId: callRequestId ?? null,
      proposalId: proposalId ?? null,
      provider: provider.name,
      request,
      status: "pending",
    });
    searchId = row.id;
  } catch (err) {
    console.error(`${lp} createHotelSearch failed:`, errMsg(err));
    return;
  }

  // Step 3: single-attempt provider call. No retry. On any failure mark
  // the row "failed" with the error message and exit cleanly.
  let options: HotelOptionDTO[];
  try {
    options = await provider.searchHotels(request);
  } catch (err) {
    const isStub = err instanceof HotelProviderNotConfiguredError;
    const msg = errMsg(err);
    console[isStub ? "warn" : "error"](
      `${lp} search failed search_id=${searchId} provider=${provider.name} err=${msg}`,
    );
    await storage
      .updateHotelSearchStatus(searchId, "failed", msg.slice(0, 1000))
      .catch((upErr: unknown) => {
        console.error(`${lp} updateHotelSearchStatus(failed) threw:`, errMsg(upErr));
      });
    return;
  }

  // Step 4: rank and persist. An empty option list is still a successful
  // search — the provider just had nothing to return for that query.
  if (options.length === 0) {
    console.log(`${lp} search_id=${searchId} provider=${provider.name} returned 0 options`);
    await storage
      .updateHotelSearchStatus(searchId, "completed")
      .catch((upErr: unknown) => {
        console.error(`${lp} updateHotelSearchStatus(completed) threw:`, errMsg(upErr));
      });
    return;
  }

  // Persist only the ranked top set (rankHotels returns 3-5 best matches).
  // Phase 4 contract: the post-call hotel store is curated, not exhaustive
  // — admins / future surfaces consume the ranked options directly without
  // needing to re-rank. The full provider response is intentionally
  // dropped here; debug-level inspection is available via the
  // `sourceRawPayload` field on each persisted ranked row.
  const ranked = rankHotels(options, request);
  const rows: InsertHotelOption[] = ranked.map((r) =>
    mapOptionToRow(searchId, provider.name, r, {
      rankScore: r.rankScore,
      rankReasons: r.rankReasons,
    }),
  );

  try {
    await storage.bulkCreateHotelOptions(rows);
  } catch (err) {
    console.error(`${lp} bulkCreateHotelOptions failed search_id=${searchId}:`, errMsg(err));
    await storage
      .updateHotelSearchStatus(searchId, "failed", `persist_options: ${errMsg(err)}`.slice(0, 1000))
      .catch(() => undefined);
    return;
  }

  await storage
    .updateHotelSearchStatus(searchId, "completed")
    .catch((upErr: unknown) => {
      console.error(`${lp} updateHotelSearchStatus(completed) threw:`, errMsg(upErr));
    });

  console.log(
    `${lp} completed search_id=${searchId} provider=${provider.name} returned=${options.length} persisted_ranked=${ranked.length}`,
  );
}
