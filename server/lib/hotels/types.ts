// Provider-agnostic hotel abstraction shared by every adapter (mock today,
// real adapters in Phase 3). Every future caller goes through the
// `getHotelProvider()` factory so we can swap providers via one env var.
//
// Phase 1: in-memory only. No DB writes, no public surface.

export interface HotelProviderCapabilities {
  supportsSearch: boolean;
  supportsRoomRates: boolean;
  supportsPriceCheck: boolean;
  supportsBooking: boolean;
  supportsCancellation: boolean;
  supportsLoyalty: boolean;
  supportsPayAtProperty: boolean;
  supportsSpecialRequests: boolean;
}

export interface HotelSearchRequest {
  destination: string; // city name or IATA-like locator
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  adults: number;
  children?: number;
  rooms?: number;
  budgetPerNight?: number; // USD
  totalHotelBudget?: number; // USD
  refundableOnly?: boolean;
  amenities?: string[]; // e.g. ["wifi", "pool", "gym", "breakfast"]
  neighborhood?: string;
  hotelType?: string; // "boutique" | "business" | "resort" | "family" | etc.
  starRatingMin?: number; // 1..5
  currency?: string; // default USD
}

export interface HotelImage {
  url: string;
  alt?: string;
}

export interface HotelCancellationPolicy {
  refundable: boolean;
  freeCancellationUntil?: string | null; // ISO datetime
  description: string;
}

export interface HotelOption {
  providerHotelId: string;
  providerOfferId: string;
  name: string;
  starRating: number;
  neighborhood: string;
  destination: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  thumbnail: HotelImage;
  images: HotelImage[];
  amenities: string[];
  hotelType?: string;
  freeBreakfast: boolean;
  freeParking: boolean;
  petFriendly: boolean;
  pricePerNight: number; // in `currency`
  totalPrice: number;
  taxesAndFees: number;
  currency: string;
  cancellationPolicy: HotelCancellationPolicy;
  guestRating?: number | null; // 0..10
  guestReviewCount?: number | null;
  distanceFromCenterKm?: number | null;
  // Provider-supplied raw payload kept for debugging only. Admin-only —
  // never serialize this to non-admin endpoints.
  sourceRawPayload?: unknown;
}

export interface HotelQuote {
  providerOfferId: string;
  totalPrice: number;
  currency: string;
  expiresAt: string; // ISO
  priceChanged: boolean;
  cancellationPolicy: HotelCancellationPolicy;
}

export interface HotelTravelerDetails {
  givenName: string;
  familyName: string;
  dateOfBirth?: string; // YYYY-MM-DD
}

export interface HotelBookingRequest {
  providerOfferId: string;
  travelers: HotelTravelerDetails[];
  contactEmail: string;
  contactPhone?: string;
  specialRequests?: string;
}

export interface HotelBookingResult {
  providerBookingId: string;
  status: "confirmed" | "pending" | "failed" | "cancelled";
  confirmationCode?: string;
  totalPrice: number;
  currency: string;
  cancellationPolicy: HotelCancellationPolicy;
  raw?: unknown;
}

// Optional ranking hints supplied by upstream callers (e.g. AI confidence
// from the call analysis, or inferred trip persona). Phase 1 ranker uses
// these as bonus signals; absence is safe.
export interface RankingHints {
  aiConfidence?: number; // 0..1
  isFamilyTrip?: boolean;
  isBusinessTrip?: boolean;
  prefersBoutique?: boolean;
}

export interface HotelProvider {
  readonly name: string;
  readonly capabilities: HotelProviderCapabilities;
  isConfigured(): boolean;

  searchHotels(request: HotelSearchRequest): Promise<HotelOption[]>;
  getHotelDetails(providerHotelId: string): Promise<HotelOption | null>;
  getRoomRates(providerHotelId: string, request: HotelSearchRequest): Promise<HotelOption[]>;
  priceCheckOrQuote(providerOfferId: string): Promise<HotelQuote>;
  createBooking(request: HotelBookingRequest): Promise<HotelBookingResult>;
  getBooking(providerBookingId: string): Promise<HotelBookingResult | null>;
  cancelBooking(providerBookingId: string): Promise<HotelBookingResult>;
}

// Typed error classes for programmatic handling. All carry a `code` string
// so callers can branch without string-matching messages.
export class HotelProviderError extends Error {
  code: string;
  constructor(message: string, code: string = "hotel_provider_error") {
    super(message);
    this.name = "HotelProviderError";
    this.code = code;
  }
}

export class HotelProviderUnsupportedError extends HotelProviderError {
  constructor(message: string) {
    super(message, "hotel_provider_unsupported");
    this.name = "HotelProviderUnsupportedError";
  }
}

export class HotelProviderNotConfiguredError extends HotelProviderError {
  constructor(message: string) {
    super(message, "hotel_provider_not_configured");
    this.name = "HotelProviderNotConfiguredError";
  }
}

// Phase 3: typed metadata block declared next to each adapter. The admin
// comparison endpoint enumerates these so the team can pick a real
// provider before any one of them ships a real implementation.
export interface HotelProviderInfo {
  name: string; // human-readable
  slug: string; // matches HOTEL_PROVIDER value
  status: "stub" | "beta" | "production"; // implementation maturity
  inventoryType: Array<"hotels" | "vacation_rentals" | "apartments" | "hostels">;
  regions: string[]; // ISO country codes or "global"
  paymentModel: Array<"pay_now" | "pay_at_property" | "deposit">;
  currencies: string[]; // ISO 4217
  commissionModel: "merchant" | "agency" | "wholesale" | "mixed" | "n/a";
  supportsInstantConfirmation: boolean;
  certificationRequired: boolean;
  estimatedTimeToProduction: string;
  monthlyMinimums: string | null;
  requiredEnv: string[]; // env var NAMES only — never values
  docsUrl: string;
  notes: string;
}
