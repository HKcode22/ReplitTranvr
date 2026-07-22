import {
  HotelProvider,
  HotelProviderCapabilities,
  HotelProviderInfo,
  HotelSearchRequest,
  HotelOption,
  HotelQuote,
  HotelBookingRequest,
  HotelBookingResult,
  HotelProviderError,
} from "../types";

// Phase 3: providerInfo for the mock so the admin comparison endpoint can
// list all six adapters uniformly.
export const providerInfo: HotelProviderInfo = {
  name: "Mock (in-memory)",
  slug: "mock",
  status: "production", // production-ready for QA/testing — not for real bookings
  inventoryType: ["hotels"],
  regions: ["global"],
  paymentModel: ["pay_now"],
  currencies: ["USD"],
  commissionModel: "n/a",
  supportsInstantConfirmation: true,
  certificationRequired: false,
  estimatedTimeToProduction: "n/a (deterministic mock)",
  monthlyMinimums: null,
  requiredEnv: [],
  docsUrl: "internal",
  notes: "Deterministic seeded mock used for QA, ranking sanity checks, and Phase 4/5 dry-runs. Never hits a real API.",
};

// Deterministic mock hotel provider used in Phase 1. Same input always
// produces the same output so QA can sanity-check ranking changes without
// network noise. No external calls, no persistence.

const NEIGHBORHOODS = [
  "Downtown",
  "Old Town",
  "Riverside",
  "Marina",
  "Arts District",
  "Financial District",
  "University Quarter",
  "Beachfront",
  "Historic Center",
  "Airport District",
];

const HOTEL_BRANDS = [
  "Grand Plaza",
  "Harborview",
  "The Meridian",
  "Skyline Suites",
  "Ivy & Oak",
  "Cobalt House",
  "Aurora Lodge",
  "The Wayfarer",
  "Nimbus Hotel",
  "Cascade Inn",
  "Lantern Court",
  "Pinecrest Resort",
];

const HOTEL_TYPES = ["boutique", "business", "resort", "family", "budget"];

const ALL_AMENITIES = [
  "wifi",
  "pool",
  "gym",
  "spa",
  "restaurant",
  "bar",
  "room_service",
  "concierge",
  "laundry",
  "ac",
  "kitchenette",
  "workspace",
];

// Tiny stable string hash → unsigned 32-bit. Used to seed the per-search RNG
// from `(destination, checkInDate)` so repeat calls return the same hotels.
function hashString(input: string): number {
  let h = 2166136261 >>> 0; // FNV-1a 32-bit
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// mulberry32 — small deterministic PRNG seeded from the hash above.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(rng: () => number, arr: T[], min: number, max: number): T[] {
  const count = min + Math.floor(rng() * (max - min + 1));
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(checkIn);
  const b = Date.parse(checkOut);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

const CAPABILITIES: HotelProviderCapabilities = {
  supportsSearch: true,
  supportsRoomRates: true,
  supportsPriceCheck: true,
  supportsBooking: true,
  supportsCancellation: true,
  supportsLoyalty: false,
  supportsPayAtProperty: false,
  supportsSpecialRequests: false,
};

export class MockHotelProvider implements HotelProvider {
  readonly name = "mock";
  readonly capabilities = CAPABILITIES;

  isConfigured(): boolean {
    return true; // mock has no creds
  }

  async searchHotels(request: HotelSearchRequest): Promise<HotelOption[]> {
    const seed = hashString(`${request.destination.toLowerCase()}|${request.checkInDate}`);
    const rng = makeRng(seed);
    const nights = nightsBetween(request.checkInDate, request.checkOutDate);
    const currency = request.currency || "USD";

    // 8-12 hotels per search, deterministic by seed.
    const count = 8 + Math.floor(rng() * 5);
    const usedNames = new Set<string>();
    const options: HotelOption[] = [];

    for (let i = 0; i < count; i++) {
      // Distinctive name = brand + neighborhood, kept unique within the set.
      let name = "";
      let attempts = 0;
      do {
        const brand = pick(rng, HOTEL_BRANDS);
        const hood = pick(rng, NEIGHBORHOODS);
        name = `${brand} ${hood}`;
        attempts++;
      } while (usedNames.has(name) && attempts < 20);
      usedNames.add(name);

      const star = 3 + Math.floor(rng() * 3); // 3..5
      const neighborhood = pick(rng, NEIGHBORHOODS);
      const hotelType = pick(rng, HOTEL_TYPES);
      const amenities = pickN(rng, ALL_AMENITIES, 3, 8);
      const freeBreakfast = rng() < 0.45;
      const freeParking = rng() < 0.4;
      const petFriendly = rng() < 0.3;
      const refundable = rng() < 0.6;

      // Price scales with star rating with a little jitter.
      const basePrice = 60 + star * 55;
      const jitter = Math.floor(rng() * 80) - 30;
      const pricePerNight = Math.max(45, basePrice + jitter);
      const taxesAndFees = Math.round(pricePerNight * 0.14 * nights);
      const totalPrice = pricePerNight * nights + taxesAndFees;

      const guestRating = Math.round((6.5 + rng() * 3.4) * 10) / 10; // 6.5..9.9
      const guestReviewCount = 50 + Math.floor(rng() * 4500);
      const distanceFromCenterKm = Math.round(rng() * 80) / 10; // 0.0..8.0

      const hotelId = `mock-h-${seed.toString(36)}-${i}`;
      const offerId = `mock-o-${seed.toString(36)}-${i}`;

      // Stable Unsplash placeholder: signed `sig` keeps the picture
      // consistent for the same hotel id across requests.
      const sig = (seed + i * 9973) % 1_000_000;
      const thumb = `https://source.unsplash.com/640x400/?hotel,room&sig=${sig}`;

      options.push({
        providerHotelId: hotelId,
        providerOfferId: offerId,
        name,
        starRating: star,
        neighborhood,
        destination: request.destination,
        address: `${100 + i * 7} ${neighborhood} Ave, ${request.destination}`,
        latitude: null,
        longitude: null,
        thumbnail: { url: thumb, alt: name },
        images: [{ url: thumb, alt: name }],
        amenities,
        hotelType,
        freeBreakfast,
        freeParking,
        petFriendly,
        pricePerNight,
        totalPrice,
        taxesAndFees,
        currency,
        cancellationPolicy: {
          refundable,
          freeCancellationUntil: refundable
            ? new Date(Date.parse(request.checkInDate) - 86_400_000).toISOString()
            : null,
          description: refundable
            ? "Free cancellation until 24 hours before check-in"
            : "Non-refundable",
        },
        guestRating,
        guestReviewCount,
        distanceFromCenterKm,
        sourceRawPayload: { mock: true, seed, index: i },
      });
    }

    return options;
  }

  async getHotelDetails(providerHotelId: string): Promise<HotelOption | null> {
    // Mock has no real persistence. Return null so callers fall back to
    // the matching option from a prior `searchHotels` call.
    return null;
  }

  async getRoomRates(
    providerHotelId: string,
    request: HotelSearchRequest,
  ): Promise<HotelOption[]> {
    const all = await this.searchHotels(request);
    return all.filter((o) => o.providerHotelId === providerHotelId);
  }

  async priceCheckOrQuote(providerOfferId: string): Promise<HotelQuote> {
    // Deterministic mock quote — pretend the price is unchanged and the
    // quote is good for 30 minutes.
    const seed = hashString(providerOfferId);
    const rng = makeRng(seed);
    const totalPrice = 200 + Math.floor(rng() * 800);
    return {
      providerOfferId,
      totalPrice,
      currency: "USD",
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      priceChanged: false,
      cancellationPolicy: {
        refundable: true,
        freeCancellationUntil: new Date(Date.now() + 24 * 3600_000).toISOString(),
        description: "Free cancellation until 24 hours before check-in",
      },
    };
  }

  async createBooking(request: HotelBookingRequest): Promise<HotelBookingResult> {
    if (!request.travelers || request.travelers.length === 0) {
      throw new HotelProviderError("At least one traveler is required", "hotel_invalid_request");
    }
    const id = `mock-b-${hashString(request.providerOfferId).toString(36)}`;
    return {
      providerBookingId: id,
      status: "confirmed",
      confirmationCode: id.toUpperCase(),
      totalPrice: 0, // unknown in mock without quote context
      currency: "USD",
      cancellationPolicy: {
        refundable: true,
        freeCancellationUntil: new Date(Date.now() + 24 * 3600_000).toISOString(),
        description: "Free cancellation until 24 hours before check-in",
      },
      raw: { mock: true },
    };
  }

  async getBooking(providerBookingId: string): Promise<HotelBookingResult | null> {
    return {
      providerBookingId,
      status: "confirmed",
      confirmationCode: providerBookingId.toUpperCase(),
      totalPrice: 0,
      currency: "USD",
      cancellationPolicy: {
        refundable: true,
        freeCancellationUntil: null,
        description: "Free cancellation until 24 hours before check-in",
      },
      raw: { mock: true },
    };
  }

  async cancelBooking(providerBookingId: string): Promise<HotelBookingResult> {
    return {
      providerBookingId,
      status: "cancelled",
      confirmationCode: providerBookingId.toUpperCase(),
      totalPrice: 0,
      currency: "USD",
      cancellationPolicy: {
        refundable: true,
        freeCancellationUntil: null,
        description: "Cancelled",
      },
      raw: { mock: true, cancelled: true },
    };
  }
}
