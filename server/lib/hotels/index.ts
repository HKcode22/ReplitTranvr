import { HotelProvider } from "./types";
import { MockHotelProvider } from "./providers/mock";

// Single factory seam. Every future caller must import `getHotelProvider()`
// from here — never construct an adapter directly. Phase 3 wires real
// providers (Duffel Stays, Expedia Rapid, Hotelbeds, Amadeus, RateHawk)
// behind this same call.

let cachedProvider: HotelProvider | null = null;
let loggedOnce = false;

export function getHotelProvider(): HotelProvider {
  if (cachedProvider) return cachedProvider;

  const requested = (process.env.HOTEL_PROVIDER || "mock").toLowerCase();

  let provider: HotelProvider;
  if (requested === "mock") {
    provider = new MockHotelProvider();
  } else {
    // Phase 1 only knows the mock. Anything else falls back with a warning
    // so future config typos are obvious in the logs.
    console.warn(
      `[hotels] requested provider=${requested} not yet implemented, falling back to mock`,
    );
    provider = new MockHotelProvider();
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

// Test-only seam: clears the singleton so unit tests can re-init with a
// different env. Not used by production code.
export function _resetHotelProviderForTests(): void {
  cachedProvider = null;
  loggedOnce = false;
}

export * from "./types";
