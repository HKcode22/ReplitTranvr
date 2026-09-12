/**
 * V3.9 prerequisite-P retention expiry operator.
 *
 * Safe default: DRY_RUN. No provider network calls are made by this command.
 * APPLY remains fail-closed inside retentionExpiry_v39.ts and needs:
 *   V39_RETENTION_APPLY_ARMED=1
 *   verified V39_RETENTION_MATRIX_EVIDENCE
 *   verified V39_RETENTION_DEPLOYMENT_EVIDENCE
 *   configured TTLs matching that deployment evidence
 *
 * The single operator covers primary ingress/latest-state content, temporary
 * provider identity/schedule linkage, and provider-native account/subscription
 * fields embedded in project ledgers. One bounded command prevents an operator
 * from accidentally running only part of the required retention work.
 */
import { pathToFileURL } from "url";
import {
  runRetentionExpiry,
  type RetentionExpiryResult,
} from "../server/lib/disruption/retentionExpiry_v39";
import {
  applyProviderIdentityExpiryCandidates,
  collectProviderIdentityExpiryCandidates,
  type ProviderIdentityExpiryCandidate,
} from "../server/lib/disruption/providerIdentityExpiry_v39";
import {
  applyProviderAccountExpiryCandidates,
  collectProviderAccountExpiryCandidates,
  type ProviderAccountExpiryCandidate,
} from "../server/lib/disruption/providerAccountExpiry_v39";
import { v39Pool } from "../server/lib/disruption/db_v39";

export interface RetentionCliOptions {
  apply: boolean;
  limit: number;
  rawRetentionHours?: number;
  fidsRetentionHours?: number;
}

function positiveBoundedInteger(raw: string, name: string, max: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${name} must be an integer from 1 through ${max}`);
  }
  return value;
}

export function parseRetentionCliArgs(argv: string[]): RetentionCliOptions {
  let apply = false;
  let limit = 100;
  let rawRetentionHours: number | undefined;
  let fidsRetentionHours: number | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") apply = false;
    else if (arg === "--limit") {
      const next = argv[++i];
      if (next === undefined) throw new Error("--limit requires a value");
      limit = positiveBoundedInteger(next, "--limit", 1000);
    } else if (arg === "--raw-hours") {
      const next = argv[++i];
      if (next === undefined) throw new Error("--raw-hours requires a value");
      rawRetentionHours = positiveBoundedInteger(next, "--raw-hours", 168);
    } else if (arg === "--fids-hours") {
      const next = argv[++i];
      if (next === undefined) throw new Error("--fids-hours requires a value");
      fidsRetentionHours = positiveBoundedInteger(next, "--fids-hours", 24);
    } else if (arg === "--help" || arg === "-h") throw new Error("HELP");
    else throw new Error(`unknown argument: ${arg}`);
  }

  return { apply, limit, rawRetentionHours, fidsRetentionHours };
}

function safeBaseCandidate(candidate: RetentionExpiryResult["candidates"][number]): Record<string, unknown> {
  return {
    record_id: candidate.recordId,
    source_table: candidate.sourceTable,
    content_class: candidate.contentClass,
    content_columns: candidate.contentColumns,
    age_timestamp_utc: candidate.ageTimestampUtc,
    expires_at_utc: candidate.expiresAtUtc,
    retention_hours: candidate.retentionHours,
    content_hash: candidate.contentHash,
    payload_hash: candidate.payloadHash ?? null,
  };
}

function safeIdentityCandidate(candidate: ProviderIdentityExpiryCandidate): Record<string, unknown> {
  return {
    record_id: candidate.recordId,
    source_table: candidate.sourceTable,
    content_class: candidate.contentClass,
    content_columns: candidate.contentColumns,
    age_timestamp_utc: candidate.ageTimestampUtc,
    expires_at_utc: candidate.expiresAtUtc,
    retention_hours: candidate.retentionHours,
    content_hash: candidate.contentHash,
    payload_hash: null,
  };
}

function safeAccountCandidate(candidate: ProviderAccountExpiryCandidate): Record<string, unknown> {
  return {
    record_id: candidate.recordId,
    source_table: candidate.sourceTable,
    content_class: candidate.contentClass,
    content_columns: candidate.contentColumns,
    age_timestamp_utc: candidate.ageTimestampUtc,
    expires_at_utc: candidate.expiresAtUtc,
    retention_hours: candidate.retentionHours,
    content_hash: candidate.contentHash,
    payload_hash: null,
  };
}

function safeResult(
  result: RetentionExpiryResult,
  identityCandidates: readonly ProviderIdentityExpiryCandidate[],
  accountCandidates: readonly ProviderAccountExpiryCandidate[],
  identityApply?: { runId: string; expiredCount: number },
  accountApply?: { runId: string; expiredCount: number },
): Record<string, unknown> {
  return {
    mode: result.mode,
    run_id: result.runId,
    provider_identity_run_id: identityApply?.runId ?? null,
    provider_account_run_id: accountApply?.runId ?? null,
    raw_cutoff_utc: result.cutoffUtc,
    fids_cutoff_utc: result.fidsCutoffUtc,
    retention_hours: result.retentionHours,
    candidate_count: result.candidates.length + identityCandidates.length + accountCandidates.length,
    base_candidate_count: result.candidates.length,
    provider_identity_candidate_count: identityCandidates.length,
    provider_account_candidate_count: accountCandidates.length,
    expired_count: result.expiredCount + (identityApply?.expiredCount ?? 0) + (accountApply?.expiredCount ?? 0),
    base_expired_count: result.expiredCount,
    provider_identity_expired_count: identityApply?.expiredCount ?? 0,
    provider_account_expired_count: accountApply?.expiredCount ?? 0,
    evidence_hash: result.evidenceHash,
    candidates: [
      ...result.candidates.map(safeBaseCandidate),
      ...identityCandidates.map(safeIdentityCandidate),
      ...accountCandidates.map(safeAccountCandidate),
    ],
  };
}

function usage(): string {
  return [
    "Usage: tsx scripts/v39_retention_expiry_v39.ts [--dry-run|--apply] [--limit N] [--raw-hours N] [--fids-hours N]",
    "Default mode is --dry-run.",
    "--limit: 1..1000 total candidates; --raw-hours: 1..168; --fids-hours: 1..24.",
    "APPLY is additionally blocked unless prerequisite-P arming/evidence passes.",
  ].join("\n");
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  let options: RetentionCliOptions;
  try {
    options = parseRetentionCliArgs(argv);
  } catch (error: any) {
    if (String(error?.message ?? error) === "HELP") {
      console.log(usage());
      return 0;
    }
    console.error(`REFUSED: ${String(error?.message ?? error)}`);
    console.error(usage());
    return 2;
  }

  try {
    const now = new Date();
    // In APPLY mode this first call validates matrix/deployment/TTL evidence
    // before either of the additional destructive owners can run.
    const result = await runRetentionExpiry({
      apply: options.apply,
      now,
      limit: options.limit,
      rawRetentionHours: options.rawRetentionHours,
      fidsRetentionHours: options.fidsRetentionHours,
    });

    let remaining = Math.max(0, options.limit - result.candidates.length);
    const identityCandidates = remaining > 0
      ? await collectProviderIdentityExpiryCandidates(now, result.retentionHours, remaining)
      : [];
    remaining = Math.max(0, remaining - identityCandidates.length);

    const accountCandidates = remaining > 0
      ? await collectProviderAccountExpiryCandidates(now, result.retentionHours, remaining)
      : [];

    const identityApply = options.apply
      ? await applyProviderIdentityExpiryCandidates(identityCandidates)
      : undefined;
    const accountApply = options.apply
      ? await applyProviderAccountExpiryCandidates(accountCandidates)
      : undefined;

    console.log(JSON.stringify(
      safeResult(result, identityCandidates, accountCandidates, identityApply, accountApply),
      null,
      2,
    ));
    return 0;
  } catch (error: any) {
    console.error(`${options.apply ? "BLOCKED" : "DRY_RUN_FAILED"}: ${String(error?.message ?? error)}`);
    return 1;
  } finally {
    await v39Pool.end().catch(() => undefined);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main().then((code) => { process.exitCode = code; });
}
