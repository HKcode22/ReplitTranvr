/**
 * Phase-2-only retention operator for the isolated prepaid runtime.
 *
 * This command never touches legacy Phase-6 provider-bearing tables. It owns
 * only expired prepaid UNLOGGED sessions and dedicated App-Storage provider
 * blobs, so prerequisite P does not depend on later Phase-6 classifications.
 */
import { pathToFileURL } from "url";
import {
  applyExpiredPrepaidProbeSessionsV39,
  collectExpiredPrepaidProbeSessionsV39,
} from "../server/lib/disruption/prepaidProbeExpiry_v39";
import {
  applyExpiredProviderBlobsV39,
  collectExpiredProviderBlobsV39,
} from "../server/lib/disruption/providerBlobExpiry_v39";
import {
  parsePhase2RetentionScopeEvidenceV39,
  verifyPhase2RetentionScopeEvidenceV39,
} from "../server/lib/disruption/phase2RetentionEvidence_v39";
import {
  V39_PROVIDER_BLOB_BUCKET_ENV,
  V39_PROVIDER_BLOB_MODE_ENV,
  V39_PROVIDER_BLOB_REQUIRED_MODE,
} from "../server/lib/disruption/replitProviderBlobStore_v39";
import { v39Pool } from "../server/lib/disruption/db_v39";

interface Options { apply: boolean; limit: number }
function parse(argv: string[]): Options {
  let apply = false;
  let limit = 100;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--apply") apply = true;
    else if (argv[i] === "--dry-run") apply = false;
    else if (argv[i] === "--limit") {
      limit = Number(argv[++i]);
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("--limit must be 1..1000");
    } else throw new Error(`unknown argument:${argv[i]}`);
  }
  return { apply, limit };
}

function requireScopeEvidence(): { rawProviderMaxHours: number } {
  const raw = process.env.V39_PHASE2_RETENTION_SCOPE_EVIDENCE;
  if (!raw) throw new Error("V39_PHASE2_RETENTION_SCOPE_EVIDENCE_REQUIRED");
  const evidence = parsePhase2RetentionScopeEvidenceV39(raw);
  const verdict = verifyPhase2RetentionScopeEvidenceV39(evidence);
  if (!verdict.pass) throw new Error(`PHASE2_RETENTION_SCOPE_EVIDENCE_INVALID:${verdict.failures.join(",")}`);
  return { rawProviderMaxHours: evidence.rawProviderMaxHours };
}

function requireApplySafety(evidence: { rawProviderMaxHours: number }): void {
  if (process.env.V39_PHASE2_RETENTION_APPLY_ARMED !== "1") throw new Error("V39_PHASE2_RETENTION_APPLY_ARMED_REQUIRED");
  if (String(process.env[V39_PROVIDER_BLOB_MODE_ENV] ?? "").trim().toLowerCase() !== V39_PROVIDER_BLOB_REQUIRED_MODE) {
    throw new Error("V39_PROVIDER_BLOB_MODE_MUST_BE_REQUIRED");
  }
  if (!String(process.env[V39_PROVIDER_BLOB_BUCKET_ENV] ?? "").trim()) throw new Error("V39_PROVIDER_BLOB_BUCKET_ID_REQUIRED");
  const rawHours = Number(process.env.V39_PREPAID_RAW_RETENTION_HOURS);
  if (!Number.isInteger(rawHours) || rawHours < 1 || rawHours > evidence.rawProviderMaxHours || rawHours > 168) {
    throw new Error("V39_PREPAID_RAW_RETENTION_HOURS_INVALID");
  }
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const options = parse(argv);
    const evidence = requireScopeEvidence();
    if (options.apply) requireApplySafety(evidence);
    const now = new Date();

    const sessions = await collectExpiredPrepaidProbeSessionsV39(now, options.limit);
    let remaining = Math.max(0, options.limit - sessions.length);
    let sessionApply: { runId: string; expiredCount: number } | undefined;
    let blobs = options.apply ? [] : (remaining > 0 ? await collectExpiredProviderBlobsV39(now, remaining) : []);
    let blobApply: { runId: string; expiredCount: number } | undefined;

    if (options.apply) {
      sessionApply = await applyExpiredPrepaidProbeSessionsV39(sessions);
      // Session cleanup can early-delete/tombstone its blobs. Always re-query
      // after it completes so the blob owner never consumes a stale list.
      remaining = Math.max(0, options.limit - sessions.length);
      blobs = remaining > 0 ? await collectExpiredProviderBlobsV39(now, remaining) : [];
      blobApply = await applyExpiredProviderBlobsV39(blobs);
    }

    console.log(JSON.stringify({
      schema: "v39.phase2-retention-run.v1",
      mode: options.apply ? "APPLY" : "DRY_RUN",
      expiredSessionCandidates: sessions.map((x) => ({ sessionId: x.sessionId, ownerKind: x.ownerKind, expiresAtUtc: x.expiresAtUtc })),
      expiredBlobCandidates: blobs.map((x) => ({ blobRefId: x.blobRefId, contentClass: x.contentClass, expiresAtUtc: x.expiresAtUtc, contentSha256: x.contentSha256 })),
      sessionRunId: sessionApply?.runId ?? null,
      sessionExpiredCount: sessionApply?.expiredCount ?? 0,
      blobRunId: blobApply?.runId ?? null,
      blobExpiredCount: blobApply?.expiredCount ?? 0,
    }, null, 2));
    return 0;
  } catch (error: any) {
    console.error(`${String(error?.message ?? error)}`);
    return 1;
  } finally {
    await v39Pool.end().catch(() => undefined);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main().then((code) => { process.exitCode = code; });
}
