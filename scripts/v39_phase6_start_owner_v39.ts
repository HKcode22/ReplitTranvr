import { createHash } from "crypto";
import { readFileSync } from "fs";
import { startBatch } from "../server/lib/disruption/adbCollectionController_v3";

export async function runPhase6StartOwner(argv = process.argv.slice(2)): Promise<number> {
  const hashIndex = argv.indexOf("--manifest-sha256");
  const expectedHash = hashIndex >= 0 ? argv[hashIndex + 1] : null;
  const manifestPath = process.env.V39_MANIFEST_PATH;
  if (!expectedHash || !manifestPath) throw new Error("--manifest-sha256 and V39_MANIFEST_PATH are required");
  const actualHash = createHash("sha256").update(readFileSync(manifestPath)).digest("hex");
  if (actualHash !== expectedHash) throw new Error("manifest sha256 mismatch");
  const result = await startBatch();
  console.log(JSON.stringify({ schema: "v39.phase6-start-evidence.v1", status: "PASS", manifestSha256: actualHash, batchId: result.batch.batchId, created: result.created.length, skipped: result.skipped.length }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) runPhase6StartOwner().then((code) => { process.exitCode = code; }).catch((error: any) => {
  console.error(JSON.stringify({ schema: "v39.phase6-start-evidence.v1", status: "FAIL", error: error?.message ?? String(error) }));
  process.exitCode = 1;
});
