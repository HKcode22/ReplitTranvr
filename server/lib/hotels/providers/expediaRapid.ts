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
// TODO(provider-impl): https://developers.expediagroup.com/docs/rapid

const CAPABILITIES: HotelProviderCapabilities = {
  supportsSearch: true,
  supportsRoomRates: true,
  supportsPriceCheck: true,
  supportsBooking: true,
  supportsCancellation: true,
  supportsLoyalty: false,
  supportsPayAtProperty: true,
  supportsSpecialRequests: true,
};

export const providerInfo: HotelProviderInfo = {
  name: "Expedia Rapid",
  slug: "expedia",
  status: "stub",
  inventoryType: ["hotels", "vacation_rentals"],
  regions: ["global"],
  paymentModel: ["pay_now", "pay_at_property"],
  currencies: ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"],
  commissionModel: "merchant",
  supportsInstantConfirmation: true,
  certificationRequired: true,
  estimatedTimeToProduction: "4-8 weeks (contract + commercial review + cert tests)",
  monthlyMinimums:
    "Public docs do not state hard monthly minimums; commercial terms are negotiated per partner — confirm during contract.",
  requiredEnv: ["EXPEDIA_API_KEY", "EXPEDIA_SECRET"],
  docsUrl: "https://developers.expediagroup.com/docs/rapid",
  notes:
    "Largest global inventory of the candidates and includes vacation rentals. Requires an Expedia Partner Solutions agreement and certification before going live.",
};

export class ExpediaRapidProvider implements HotelProvider {
  readonly name = "expedia";
  readonly capabilities = CAPABILITIES;

  isConfigured(): boolean {
    return Boolean(process.env.EXPEDIA_API_KEY && process.env.EXPEDIA_SECRET);
  }

  async searchHotels(_r: HotelSearchRequest): Promise<HotelOption[]> {
    throw new HotelProviderNotConfiguredError(
      "ExpediaRapidProvider.searchHotels is a Phase 3 stub — see TODO(provider-impl)",
    );
  }
  async getHotelDetails(_id: string): Promise<HotelOption | null> {
    throw new HotelProviderNotConfiguredError("ExpediaRapidProvider.getHotelDetails is a Phase 3 stub");
  }
  async getRoomRates(_id: string, _r: HotelSearchRequest): Promise<HotelOption[]> {
    throw new HotelProviderNotConfiguredError("ExpediaRapidProvider.getRoomRates is a Phase 3 stub");
  }
  async priceCheckOrQuote(_o: string): Promise<HotelQuote> {
    throw new HotelProviderNotConfiguredError("ExpediaRapidProvider.priceCheckOrQuote is a Phase 3 stub");
  }
  async createBooking(_r: HotelBookingRequest): Promise<HotelBookingResult> {
    throw new HotelProviderNotConfiguredError("ExpediaRapidProvider.createBooking is a Phase 3 stub");
  }
  async getBooking(_id: string): Promise<HotelBookingResult | null> {
    throw new HotelProviderNotConfiguredError("ExpediaRapidProvider.getBooking is a Phase 3 stub");
  }
  async cancelBooking(_id: string): Promise<HotelBookingResult> {
    throw new HotelProviderNotConfiguredError("ExpediaRapidProvider.cancelBooking is a Phase 3 stub");
  }
}
