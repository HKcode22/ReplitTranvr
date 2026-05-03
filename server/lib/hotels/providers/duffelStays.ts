import {
  HotelProvider,
  HotelProviderCapabilities,
  HotelProviderInfo,
  HotelProviderNotConfiguredError,
  HotelSearchRequest,
  HotelOption,
  HotelQuote,
  HotelBookingRequest,
  HotelBookingResult,
} from "../types";

// Phase 3 STUB. Zero outbound network calls. Every method throws until a
// future task implements it. No SDK imports at module load (we reuse the
// existing @duffel/api dependency lazily inside method bodies later).
//
// TODO(provider-impl): https://duffel.com/docs/api/v2/stays

const CAPABILITIES: HotelProviderCapabilities = {
  // Reflects what Duffel Stays advertises in their public docs.
  supportsSearch: true,
  supportsRoomRates: true,
  supportsPriceCheck: true,
  supportsBooking: true,
  supportsCancellation: true,
  supportsLoyalty: false,
  supportsPayAtProperty: false,
  supportsSpecialRequests: true,
};

export const providerInfo: HotelProviderInfo = {
  name: "Duffel Stays",
  slug: "duffel-stays",
  status: "stub",
  inventoryType: ["hotels"],
  regions: ["global"],
  paymentModel: ["pay_now"],
  currencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
  commissionModel: "merchant",
  supportsInstantConfirmation: true,
  certificationRequired: false,
  estimatedTimeToProduction: "1-2 weeks (reuses existing Duffel account + token)",
  monthlyMinimums: null,
  requiredEnv: ["DUFFEL_API_TOKEN"],
  docsUrl: "https://duffel.com/docs/api/v2/stays",
  notes:
    "Reuses our existing Duffel account and token (already wired for flights). Lowest integration friction of the five candidates. Inventory is smaller than the wholesale APIs (Hotelbeds/RateHawk).",
};

export class DuffelStaysProvider implements HotelProvider {
  readonly name = "duffel-stays";
  readonly capabilities = CAPABILITIES;

  isConfigured(): boolean {
    return Boolean(process.env.DUFFEL_API_TOKEN);
  }

  async searchHotels(_request: HotelSearchRequest): Promise<HotelOption[]> {
    throw new HotelProviderNotConfiguredError(
      "DuffelStaysProvider.searchHotels is a Phase 3 stub — see TODO(provider-impl)",
    );
  }
  async getHotelDetails(_id: string): Promise<HotelOption | null> {
    throw new HotelProviderNotConfiguredError(
      "DuffelStaysProvider.getHotelDetails is a Phase 3 stub",
    );
  }
  async getRoomRates(_id: string, _r: HotelSearchRequest): Promise<HotelOption[]> {
    throw new HotelProviderNotConfiguredError(
      "DuffelStaysProvider.getRoomRates is a Phase 3 stub",
    );
  }
  async priceCheckOrQuote(_offerId: string): Promise<HotelQuote> {
    throw new HotelProviderNotConfiguredError(
      "DuffelStaysProvider.priceCheckOrQuote is a Phase 3 stub",
    );
  }
  async createBooking(_r: HotelBookingRequest): Promise<HotelBookingResult> {
    throw new HotelProviderNotConfiguredError(
      "DuffelStaysProvider.createBooking is a Phase 3 stub",
    );
  }
  async getBooking(_id: string): Promise<HotelBookingResult | null> {
    throw new HotelProviderNotConfiguredError(
      "DuffelStaysProvider.getBooking is a Phase 3 stub",
    );
  }
  async cancelBooking(_id: string): Promise<HotelBookingResult> {
    throw new HotelProviderNotConfiguredError(
      "DuffelStaysProvider.cancelBooking is a Phase 3 stub",
    );
  }
}
