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
// TODO(provider-impl): https://www.ratehawk.com/lp/b2b/api

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
  name: "RateHawk",
  slug: "ratehawk",
  status: "stub",
  inventoryType: ["hotels", "apartments"],
  regions: ["global"],
  paymentModel: ["pay_now", "deposit"],
  currencies: ["USD", "EUR", "GBP", "RUB", "AUD"],
  commissionModel: "wholesale",
  supportsInstantConfirmation: true,
  certificationRequired: true,
  estimatedTimeToProduction: "3-5 weeks (contract + integration review)",
  monthlyMinimums: null,
  requiredEnv: ["RATEHAWK_API_KEY"],
  docsUrl: "https://www.ratehawk.com/lp/b2b/api",
  notes:
    "Strong inventory in EMEA/APAC and competitive on apartments. Single-key auth simplifies the integration vs Hotelbeds/Expedia. B2B partner program; commercial terms negotiated per partner, no public minimums.",
};

export class RateHawkProvider implements HotelProvider {
  readonly name = "ratehawk";
  readonly capabilities = CAPABILITIES;

  isConfigured(): boolean {
    return Boolean(process.env.RATEHAWK_API_KEY);
  }

  async searchHotels(_r: HotelSearchRequest): Promise<HotelOption[]> {
    throw new HotelProviderNotConfiguredError(
      "RateHawkProvider.searchHotels is a Phase 3 stub — see TODO(provider-impl)",
    );
  }
  async getHotelDetails(_id: string): Promise<HotelOption | null> {
    throw new HotelProviderNotConfiguredError("RateHawkProvider.getHotelDetails is a Phase 3 stub");
  }
  async getRoomRates(_id: string, _r: HotelSearchRequest): Promise<HotelOption[]> {
    throw new HotelProviderNotConfiguredError("RateHawkProvider.getRoomRates is a Phase 3 stub");
  }
  async priceCheckOrQuote(_o: string): Promise<HotelQuote> {
    throw new HotelProviderNotConfiguredError("RateHawkProvider.priceCheckOrQuote is a Phase 3 stub");
  }
  async createBooking(_r: HotelBookingRequest): Promise<HotelBookingResult> {
    throw new HotelProviderNotConfiguredError("RateHawkProvider.createBooking is a Phase 3 stub");
  }
  async getBooking(_id: string): Promise<HotelBookingResult | null> {
    throw new HotelProviderNotConfiguredError("RateHawkProvider.getBooking is a Phase 3 stub");
  }
  async cancelBooking(_id: string): Promise<HotelBookingResult> {
    throw new HotelProviderNotConfiguredError("RateHawkProvider.cancelBooking is a Phase 3 stub");
  }
}
