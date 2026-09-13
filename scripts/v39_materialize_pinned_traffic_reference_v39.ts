import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseFrozenTrafficReference } from "../server/lib/disruption/trafficReference_v39";
import {
  loadFrozenTrafficReferenceV39,
  V39_PINNED_TRAFFIC_REFERENCE_SHA256,
  V39_PINNED_TRAFFIC_REFERENCE_WORKFLOW_COMMIT,
  V39_PINNED_TRAFFIC_REFERENCE_WORKFLOW_RUN_ID,
} from "../server/lib/disruption/pinnedTrafficReference_v39";

function main(): void {
  const root = process.cwd();
  if (process.env.V39_TRAFFIC_REFERENCE_FILE) {
    const loaded = loadFrozenTrafficReferenceV39(root);
    console.log(JSON.stringify({
      status: "PASS_EXPLICIT_REFERENCE",
      artifact_sha256: loaded.artifactSha256,
      path: loaded.sourcePath,
      airport_count: loaded.traffic.airports.length,
    }, null, 2));
    return;
  }

  const target = join(root, "artifacts", "traffic-reference-frozen.json");
  const loaded = loadFrozenTrafficReferenceV39(root);
  if (loaded.artifactSha256 !== V39_PINNED_TRAFFIC_REFERENCE_SHA256) {
    throw new Error("BLOCKED:PINNED_TRAFFIC_REFERENCE_HASH_MISMATCH");
  }

  if (existsSync(target)) {
    const existing = readFileSync(target, "utf8");
    // Parsing catches structurally invalid but byte-coincident assumptions;
    // the loader has already cryptographically verified the file itself.
    parseFrozenTrafficReference(existing);
    if (existing !== loaded.raw) {
      throw new Error("BLOCKED:TRAFFIC_REFERENCE_EXISTING_DIFFERS_REFUSE_OVERWRITE");
    }
  } else {
    writeFileSync(target, loaded.raw, { encoding: "utf8", flag: "wx" });
  }

  console.log(JSON.stringify({
    status: "READY_FROZEN_REFERENCE_MATERIALIZED",
    artifact_sha256: loaded.artifactSha256,
    expected_sha256: V39_PINNED_TRAFFIC_REFERENCE_SHA256,
    source_workflow_run_id: V39_PINNED_TRAFFIC_REFERENCE_WORKFLOW_RUN_ID,
    source_workflow_commit: V39_PINNED_TRAFFIC_REFERENCE_WORKFLOW_COMMIT,
    airport_count: loaded.traffic.airports.length,
    target,
  }, null, 2));
}

try { main(); }
catch (error: any) {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
}
