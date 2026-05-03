import { HotelProvider, HotelProviderInfo } from "./types";
import { MockHotelProvider, providerInfo as mockInfo } from "./providers/mock";
import { DuffelStaysProvider, providerInfo as duffelInfo } from "./providers/duffelStays";
import { ExpediaRapidProvider, providerInfo as expediaInfo } from "./providers/expediaRapid";
import { HotelbedsProvider, providerInfo as hotelbedsInfo } from "./providers/hotelbeds";
import { AmadeusHotelsProvider, providerInfo as amadeusInfo } from "./providers/amadeusHotels";
import { RateHawkProvider, providerInfo as ratehawkInfo } from "./providers/ratehawk";

// Single factory seam. Every future caller must import `getHotelProvider()`
// from here — never construct an adapter directly.
//
// Phase 3: routes HOTEL_PROVIDER to one of six adapters (mock + 5 real
// stubs). Real adapters with missing creds fall back to mock with a
// warning — never throw at startup over missing real-provider creds.

let cachedProvider: HotelProvider | null = null;
let loggedOnce = false;

// Ordered registry: mock first, then real providers alphabetically by slug.
// Each entry pairs a slug with a lazy constructor so we don't instantiate
// adapters we don't need.
const REGISTRY: Array<{
  slug: string;
  info: HotelProviderInfo;
  build: () => HotelProvider;
}> = [
  { slug: "mock", info: mockInfo, build: () => new MockHotelProvider() },
  { slug: "amadeus", info: amadeusInfo, build: () => new AmadeusHotelsProvider() },
  { slug: "duffel-stays", info: duffelInfo, build: () => new DuffelStaysProvider() },
  { slug: "expedia", info: expediaInfo, build: () => new ExpediaRapidProvider() },
  { slug: "hotelbeds", info: hotelbedsInfo, build: () => new HotelbedsProvider() },
  { slug: "ratehawk", info: ratehawkInfo, build: () => new RateHawkProvider() },
];

function findEntry(slug: string) {
  const lower = slug.toLowerCase();
  return REGISTRY.find((e) => e.slug === lower);
}

export function getHotelProvider(): HotelProvider {
  if (cachedProvider) return cachedProvider;

  const requested = (process.env.HOTEL_PROVIDER || "mock").toLowerCase();
  const entry = findEntry(requested);

  let provider: HotelProvider;
  if (!entry) {
    // Unknown slug — fall back to mock with a clear warning.
    console.warn(
      `[hotels] requested provider=${requested} is not registered, falling back to mock`,
    );
    provider = new MockHotelProvider();
  } else {
    const candidate = entry.build();
    // Real-provider safety: if the env vars aren't present, fall back to
    // mock so a typo in production can't break the app. The mock provider
    // always reports configured=true.
    if (!candidate.isConfigured()) {
      console.warn(
        `[hotels] provider=${requested} not configured, falling back to mock`,
      );
      provider = new MockHotelProvider();
    } else {
      provider = candidate;
    }
  }

  if (!loggedOnce) {
    console.log(
      `[hotels] provider=${provider.name} configured=${provider.isConfigured()}`,
    );
    loggedOnce = true;
  }

  cachedProvider = provider;
  return provider;
}

// Phase 3: enumerate provider metadata for the admin comparison endpoint.
// Returns the registry order (mock first, real providers alphabetical).
// Each entry also reports its current `configured` boolean — computed by
// instantiating the adapter just long enough to call `isConfigured()`.
// Adapters do NOT make network calls in their constructor, so this is
// safe to call on every request.
export function getAllProviderInfo(): Array<HotelProviderInfo & { configured: boolean }> {
  return REGISTRY.map((e) => {
    let configured = false;
    try {
      configured = e.build().isConfigured();
    } catch {
      configured = false;
    }
    return { ...e.info, configured };
  });
}

// Test-only seam: clears the singleton so unit tests can re-init with a
// different env. Not used by production code.
export function _resetHotelProviderForTests(): void {
  cachedProvider = null;
  loggedOnce = false;
}

export * from "./types";
