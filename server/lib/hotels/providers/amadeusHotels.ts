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

// Phase 3 STUB. Zero outbound network calls.
// TODO(provider-impl): https://developers.amadeus.com/self-service/category/hotels

const CAPABILITIES: HotelProviderCapabilities = {
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
  name: "Amadeus Hotels",
  slug: "amadeus",
  status: "stub",
  inventoryType: ["hotels"],
  regions: ["global"],
  paymentModel: ["pay_now"],
  currencies: ["USD", "EUR", "GBP", "JPY", "AUD"],
  commissionModel: "agency",
  supportsInstantConfirmation: true,
  certificationRequired: true,
  estimatedTimeToProduction:
    "Self-service test API is open; production requires an Amadeus production agreement (4-8 weeks).",
  monthlyMinimums:
    "Self-service test tier is free with rate limits; production pricing is negotiated, no public minimums.",
  requiredEnv: ["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET"],
  docsUrl: "https://developers.amadeus.com/self-service/category/hotels",
  notes:
    "GDS-backed inventory with strong corporate-travel coverage. OAuth2 client-credentials flow. Test environment is easy to spin up; production requires commercial sign-off.",
};

export class AmadeusHotelsProvider implements HotelProvider {
  readonly name = "amadeus";
  readonly capabilities = CAPABILITIES;

  isConfigured(): boolean {
    return Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
  }

  async searchHotels(_r: HotelSearchRequest): Promise<HotelOption[]> {
    throw new HotelProviderNotConfiguredError(
      "AmadeusHotelsProvider.searchHotels is a Phase 3 stub — see TODO(provider-impl)",
    );
  }
  async getHotelDetails(_id: string): Promise<HotelOption | null> {
    throw new HotelProviderNotConfiguredError("AmadeusHotelsProvider.getHotelDetails is a Phase 3 stub");
  }
  async getRoomRates(_id: string, _r: HotelSearchRequest): Promise<HotelOption[]> {
    throw new HotelProviderNotConfiguredError("AmadeusHotelsProvider.getRoomRates is a Phase 3 stub");
  }
  async priceCheckOrQuote(_o: string): Promise<HotelQuote> {
    throw new HotelProviderNotConfiguredError("AmadeusHotelsProvider.priceCheckOrQuote is a Phase 3 stub");
  }
  async createBooking(_r: HotelBookingRequest): Promise<HotelBookingResult> {
    throw new HotelProviderNotConfiguredError("AmadeusHotelsProvider.createBooking is a Phase 3 stub");
  }
  async getBooking(_id: string): Promise<HotelBookingResult | null> {
    throw new HotelProviderNotConfiguredError("AmadeusHotelsProvider.getBooking is a Phase 3 stub");
  }
  async cancelBooking(_id: string): Promise<HotelBookingResult> {
    throw new HotelProviderNotConfiguredError("AmadeusHotelsProvider.cancelBooking is a Phase 3 stub");
  }
}
