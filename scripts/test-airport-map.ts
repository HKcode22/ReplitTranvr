// Lightweight assertions for the curated airport map. Run with:
//   tsx scripts/test-airport-map.ts
//
// Exits with code 0 on success, 1 on first failure. Kept dependency-free so
// it runs with the existing `tsx` binary already in devDependencies.
import {
  resolveCityToPrimaryIata,
  isSingleAirportCity,
  isAmbiguousCityName,
  guardAgainstSecondaryAirport,
  normalizeCity,
} from "../server/lib/airportMap";

let failed = 0;
function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ok  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}\n       expected: ${JSON.stringify(expected)}\n       actual:   ${JSON.stringify(actual)}`);
  }
}

console.log("normalizeCity:");
expect("trims and lowercases", normalizeCity("  Boston  "), "boston");
expect("strips trailing punctuation", normalizeCity("Boston, "), "boston");
expect("collapses 'Saint Louis' -> 'st louis'", normalizeCity("Saint Louis"), "st louis");
expect("collapses 'St. Louis' -> 'st louis'", normalizeCity("St. Louis"), "st louis");
expect("strips diacritics", normalizeCity("São Paulo"), "sao paulo");
expect("strips trailing 'USA'", normalizeCity("Boston USA"), "boston");

console.log("\nresolveCityToPrimaryIata — single-airport cities (the bug fix):");
expect("Boston -> BOS (never MHT)", resolveCityToPrimaryIata("Boston")?.iata, "BOS");
expect("boston (lc) -> BOS", resolveCityToPrimaryIata("boston")?.iata, "BOS");
expect("'Boston, MA' -> BOS", resolveCityToPrimaryIata("Boston, MA")?.iata, "BOS");
expect("Denver -> DEN", resolveCityToPrimaryIata("Denver")?.iata, "DEN");
expect("Seattle -> SEA", resolveCityToPrimaryIata("Seattle")?.iata, "SEA");
expect("source flag = single_airport", resolveCityToPrimaryIata("Boston")?.source, "single_airport");
expect("alternatives empty for single-airport", resolveCityToPrimaryIata("Boston")?.alternatives, []);

console.log("\nresolveCityToPrimaryIata — multi-airport metros default to primary:");
expect("NYC -> JFK", resolveCityToPrimaryIata("NYC")?.iata, "JFK");
expect("New York -> JFK", resolveCityToPrimaryIata("New York")?.iata, "JFK");
expect("San Francisco -> SFO (not OAK/SJC)", resolveCityToPrimaryIata("San Francisco")?.iata, "SFO");
expect("LA -> LAX", resolveCityToPrimaryIata("LA")?.iata, "LAX");
expect("Los Angeles -> LAX", resolveCityToPrimaryIata("Los Angeles")?.iata, "LAX");
expect("DC -> DCA", resolveCityToPrimaryIata("DC")?.iata, "DCA");
expect("Washington DC -> DCA", resolveCityToPrimaryIata("Washington DC")?.iata, "DCA");
expect("Chicago -> ORD (not MDW)", resolveCityToPrimaryIata("Chicago")?.iata, "ORD");
expect("Houston -> IAH (not HOU)", resolveCityToPrimaryIata("Houston")?.iata, "IAH");
expect("source flag = multi_airport_primary", resolveCityToPrimaryIata("NYC")?.source, "multi_airport_primary");
expect("NYC alternatives include LGA/EWR", resolveCityToPrimaryIata("NYC")?.alternatives.sort(), ["EWR", "LGA"]);

console.log("\nresolveCityToPrimaryIata — ambiguous names return null:");
expect("Springfield -> null", resolveCityToPrimaryIata("Springfield"), null);
expect("Cambridge -> null", resolveCityToPrimaryIata("Cambridge"), null);
expect("Birmingham -> null", resolveCityToPrimaryIata("Birmingham"), null);
expect("San Jose -> null", resolveCityToPrimaryIata("San Jose"), null);
expect("empty string -> null", resolveCityToPrimaryIata(""), null);
expect("null input -> null", resolveCityToPrimaryIata(null), null);
expect("unknown city -> null", resolveCityToPrimaryIata("Smallville"), null);

console.log("\nisSingleAirportCity — used by prompt builder:");
expect("Boston -> true", isSingleAirportCity("Boston"), true);
expect("Denver -> true", isSingleAirportCity("Denver"), true);
expect("NYC -> false (multi-airport)", isSingleAirportCity("NYC"), false);
expect("Springfield -> false (ambiguous)", isSingleAirportCity("Springfield"), false);

console.log("\nisAmbiguousCityName — used by post-call ambiguity logging:");
expect("NYC -> ambiguous", isAmbiguousCityName("NYC").ambiguous, true);
expect("Springfield -> ambiguous (multi-geography)", isAmbiguousCityName("Springfield").ambiguous, true);
expect("Boston -> not ambiguous", isAmbiguousCityName("Boston").ambiguous, false);
expect("Denver -> not ambiguous", isAmbiguousCityName("Denver").ambiguous, false);

console.log("\nresolveCityToPrimaryIata — overrides for cities that are technically multi-name (regression for code review):");
expect("Athens -> ATH (overridden, not flagged ambiguous)", resolveCityToPrimaryIata("Athens")?.iata, "ATH");
expect("Rochester -> ROC (NY override)", resolveCityToPrimaryIata("Rochester")?.iata, "ROC");

console.log("\nguardAgainstSecondaryAirport — Duffel correction:");
expect("Boston + MHT from Duffel -> forced to BOS", guardAgainstSecondaryAirport("Boston", "MHT"),
  { iata: "BOS", substituted: true, expected: "BOS" });
expect("Boston + BOS -> no change", guardAgainstSecondaryAirport("Boston", "BOS"),
  { iata: "BOS", substituted: false, expected: "BOS" });
expect("San Francisco + OAK -> forced to SFO", guardAgainstSecondaryAirport("San Francisco", "OAK"),
  { iata: "SFO", substituted: true, expected: "SFO" });
expect("Chicago + MDW -> forced to ORD", guardAgainstSecondaryAirport("Chicago", "MDW"),
  { iata: "ORD", substituted: true, expected: "ORD" });
expect("explicit 'MHT' query -> respect caller", guardAgainstSecondaryAirport("MHT", "MHT"),
  { iata: "MHT", substituted: false, expected: null });
expect("unknown city + any IATA -> pass through", guardAgainstSecondaryAirport("Smallville", "ABC"),
  { iata: "ABC", substituted: false, expected: null });

console.log(`\n${failed === 0 ? "PASS" : "FAIL"} — ${failed} failure(s)`);
process.exit(failed === 0 ? 0 : 1);
