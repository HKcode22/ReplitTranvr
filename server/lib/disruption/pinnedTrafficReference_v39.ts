import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { gunzipSync } from "zlib";
import { join } from "path";
import {
  parseFrozenTrafficReference,
  type FrozenTrafficReferenceV39,
} from "./trafficReference_v39";

/** Exact frozen JSON bytes emitted by successful MrAirspace freeze run 34732924481. */
export const V39_PINNED_TRAFFIC_REFERENCE_SHA256 =
  "e7d043a0bb21ba32a939cc54cf5798bff8eabc19611eb01fc98fabf4fd1a95c1" as const;
/** Historical gzip-envelope hash retained as provenance only; JSON SHA is authoritative. */
export const V39_PINNED_TRAFFIC_REFERENCE_GZIP_SHA256 =
  "63a314cb0d2105da8b76e590499c8b4d1c9602e1bdd11b88c7353dcc56513425" as const;
export const V39_PINNED_TRAFFIC_REFERENCE_WORKFLOW_RUN_ID = "34732924481" as const;
export const V39_PINNED_TRAFFIC_REFERENCE_WORKFLOW_COMMIT =
  "d2f617e4fb51010f4187e732817f05fc06f4ad40" as const;

export interface LoadedTrafficReferenceV39 {
  traffic: FrozenTrafficReferenceV39;
  raw: string;
  artifactSha256: string;
  sourcePath: string;
  pinnedRepositoryArtifact: boolean;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function loadRawFile(path: string, pinnedRepositoryArtifact: boolean): LoadedTrafficReferenceV39 {
  const raw = readFileSync(path, "utf8");
  const artifactSha256 = sha256(raw);
  const traffic = parseFrozenTrafficReference(raw);
  return { traffic, raw, artifactSha256, sourcePath: path, pinnedRepositoryArtifact };
}

/**
 * Load the frozen Phase-2 traffic reference.
 *
 * Priority:
 * 1. explicit operator file (`V39_TRAFFIC_REFERENCE_FILE`), validated normally;
 * 2. historical/plain repository JSON if intentionally materialized;
 * 3. repository-pinned gzip+base64 transport from the successful reference
 *    workflow, reconstructed and accepted only when the decompressed JSON bytes
 *    match the exact validated frozen-artifact SHA-256.
 *
 * The gzip/base64 layer is only a repository transport envelope. Gzip wrapper
 * bytes can differ (for example metadata/header differences) while containing
 * identical JSON. Therefore the decompressed JSON SHA-256, not the gzip wrapper
 * SHA, is the binding integrity authority.
 */
export function loadFrozenTrafficReferenceV39(root = process.cwd()): LoadedTrafficReferenceV39 {
  const explicit = String(process.env.V39_TRAFFIC_REFERENCE_FILE ?? "").trim();
  if (explicit) {
    if (!existsSync(explicit)) throw new Error("BLOCKED:TRAFFIC_REFERENCE_EXPLICIT_FILE_MISSING");
    return loadRawFile(explicit, false);
  }

  const plain = join(root, "artifacts", "traffic-reference-frozen.json");
  if (existsSync(plain)) return loadRawFile(plain, false);

  const encodedPath = join(root, "artifacts", "traffic-reference-frozen.json.gz.b64");
  if (!existsSync(encodedPath)) throw new Error("BLOCKED:TRAFFIC_REFERENCE_FROZEN_FILE_MISSING");

  // Normalize transport-only formatting characters before base64 decoding. This
  // cannot make altered scientific content pass because the decompressed bytes
  // must still equal the exact pinned JSON SHA-256 below.
  const transport = readFileSync(encodedPath, "utf8");
  const encoded = transport.replace(/[^A-Za-z0-9+/=]/g, "");
  if (!encoded || encoded.length % 4 !== 0) {
    throw new Error("BLOCKED:PINNED_TRAFFIC_REFERENCE_BASE64_INVALID");
  }

  let rawBuffer: Buffer;
  try {
    const compressed = Buffer.from(encoded, "base64");
    rawBuffer = gunzipSync(compressed);
  } catch {
    throw new Error("BLOCKED:PINNED_TRAFFIC_REFERENCE_GZIP_INVALID");
  }

  const artifactSha256 = sha256(rawBuffer);
  if (artifactSha256 !== V39_PINNED_TRAFFIC_REFERENCE_SHA256) {
    throw new Error("BLOCKED:PINNED_TRAFFIC_REFERENCE_ORIGINAL_HASH_MISMATCH");
  }
  const raw = rawBuffer.toString("utf8");
  const traffic = parseFrozenTrafficReference(raw);
  return {
    traffic,
    raw,
    artifactSha256,
    sourcePath: encodedPath,
    pinnedRepositoryArtifact: true,
  };
}
