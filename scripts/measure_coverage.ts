// ============================================================
// Force a fresh airport-coverage measurement and print the
// universe report. V3.3 §6 — run this once on Replit before
// building the catalog-universe frame:
//
//   npm run coverage
//
// Records universeCount + catalogInUniverse (the two numbers we
// must know before trusting any "sampling frame" claim). All calls
// are free (`GET /health/services/feeds/{service}/airports`).
// ============================================================

import { pool } from "../server/db";
import { getAirportCoverage } from "../server/lib/disruption/adbCollectionController_v3";

async function main(): Promise<void> {
  console.log("Measuring AeroDataBox airport coverage (forces a fresh fetch)...\n");
  const cov = await getAirportCoverage(true);
  if (!cov) {
    console.error(
      "Coverage measurement FAILED — check AERODATABOX_API_KEY is set and the API is reachable (npm run logs:last).",
    );
    await pool.end();
    process.exit(1);
  }

  console.log(`fetchedAt                 : ${cov.fetchedAt}`);
  console.log(`universeCount (union)     : ${cov.universeCount}`);
  console.log(`worldScheduledCommercial  : ${cov.worldScheduledCommercial} (ATAG 2023)`);
  console.log(`catalogCount (ours)       : ${cov.catalogCount}`);
  console.log(`catalogInUniverse         : ${cov.catalogInUniverse}`);
  console.log(`catalogMissingFromUniverse: ${cov.catalogMissingFromUniverse.length}`);
  console.log(`universeNotInCatalog      : ${cov.universeNotInCatalog.length}`);
  console.log("byTier (ours, in universe):");
  for (const t of cov.byTier) console.log(`  ${t.tier.padEnd(9)} ${t.total}/${t.inUniverse}`);
  if (cov.error) console.log(`\nnote: ${cov.error}`);

  console.log("\nFrame note: frame = measured universe; directly-collectable = catalog ∩ universe.");
  await pool.end();
}

main().catch(async (err: any) => {
  console.error("coverage measurement failed:", err?.message || err);
  await pool.end();
  process.exit(1);
});
