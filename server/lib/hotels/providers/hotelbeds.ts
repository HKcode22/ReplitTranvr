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
// TODO(provider-impl): https://developer.hotelbeds.com/documentation/hotels/

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
  name: "Hotelbeds",
  slug: "hotelbeds",
  status: "stub",
  inventoryType: ["hotels"],
  regions: ["global"],
  paymentModel: ["pay_now"],
  currencies: ["USD", "EUR", "GBP", "AUD", "JPY"],
  commissionModel: "wholesale",
  supportsInstantConfirmation: true,
  certificationRequired: true,
  estimatedTimeToProduction: "3-6 weeks (contract + cert env + production switch)",
  monthlyMinimums: null,
  requiredEnv: ["HOTELBEDS_API_KEY", "HOTELBEDS_SECRET"],
  docsUrl: "https://developer.hotelbeds.com/documentation/hotels/",
  notes:
    "Bedbank-style wholesale inventory with strong margins. Authentication uses API key + SHA-256 signature of (key + secret + timestamp). Wholesale rates require a credit/contract agreement; specific minimums are negotiated and not published.",
};

export class HotelbedsProvider implements HotelProvider {
  readonly name = "hotelbeds";
  readonly capabilities = CAPABILITIES;

  isConfigured(): boolean {
    return Boolean(process.env.HOTELBEDS_API_KEY && process.env.HOTELBEDS_SECRET);
  }

  async searchHotels(_r: HotelSearchRequest): Promise<HotelOption[]> {
    throw new HotelProviderNotConfiguredError(
      "HotelbedsProvider.searchHotels is a Phase 3 stub — see TODO(provider-impl)",
    );
  }
  async getHotelDetails(_id: string): Promise<HotelOption | null> {
    throw new HotelProviderNotConfiguredError("HotelbedsProvider.getHotelDetails is a Phase 3 stub");
  }
  async getRoomRates(_id: string, _r: HotelSearchRequest): Promise<HotelOption[]> {
    throw new HotelProviderNotConfiguredError("HotelbedsProvider.getRoomRates is a Phase 3 stub");
  }
  async priceCheckOrQuote(_o: string): Promise<HotelQuote> {
    throw new HotelProviderNotConfiguredError("HotelbedsProvider.priceCheckOrQuote is a Phase 3 stub");
  }
  async createBooking(_r: HotelBookingRequest): Promise<HotelBookingResult> {
    throw new HotelProviderNotConfiguredError("HotelbedsProvider.createBooking is a Phase 3 stub");
  }
  async getBooking(_id: string): Promise<HotelBookingResult | null> {
    throw new HotelProviderNotConfiguredError("HotelbedsProvider.getBooking is a Phase 3 stub");
  }
  async cancelBooking(_id: string): Promise<HotelBookingResult> {
    throw new HotelProviderNotConfiguredError("HotelbedsProvider.cancelBooking is a Phase 3 stub");
  }
}
