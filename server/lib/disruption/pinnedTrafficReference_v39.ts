import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { gunzipSync } from "zlib";
import { join } from "path";
import {
  parseFrozenTrafficReference,
  type FrozenTrafficReferenceV39,
} from "./trafficReference_v39";

/** Exact bytes emitted by successful MrAirspace freeze run 34732924481. */
export const V39_PINNED_TRAFFIC_REFERENCE_SHA256 =
  "e7d043a0bb21ba32a939cc54cf5798bff8eabc19611eb01fc98fabf4fd1a95c1" as const;
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
 * 3. exact repository-pinned gzip+base64 bytes from the successful reference
 *    workflow, reconstructed and checked against the original file SHA.
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

  // The repository pin is a transport envelope, not the authority. Some Git
  // transports/editors can inject non-base64 formatting characters into a text
  // envelope. Normalize those characters before decoding; acceptance still
  // requires BOTH the exact pinned gzip SHA-256 and the exact reconstructed JSON
  // SHA-256 below, so transport normalization cannot make altered content pass.
  const transport = readFileSync(encodedPath, "utf8");
  const encoded = transport.replace(/[^A-Za-z0-9+/=]/g, "");
  if (!encoded || encoded.length % 4 !== 0) {
    throw new Error("BLOCKED:PINNED_TRAFFIC_REFERENCE_BASE64_INVALID");
  }

  let compressed: Buffer;
  let rawBuffer: Buffer;
  try {
    compressed = Buffer.from(encoded, "base64");
    if (sha256(compressed) !== V39_PINNED_TRAFFIC_REFERENCE_GZIP_SHA256) {
      throw new Error("BLOCKED:PINNED_TRAFFIC_REFERENCE_GZIP_HASH_MISMATCH");
    }
    rawBuffer = gunzipSync(compressed);
  } catch (error: any) {
    if (String(error?.message ?? error).startsWith("BLOCKED:")) throw error;
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
