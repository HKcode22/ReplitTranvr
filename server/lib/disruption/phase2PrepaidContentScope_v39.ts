import { createHash } from "crypto";

export type Phase2PersistenceKindV39 =
  | "project_hash_artifact"
  | "replit_app_storage"
  | "postgres_unlogged_runtime"
  | "logged_project_aggregate";

export interface Phase2PrepaidContentClassV39 {
  id: string;
  contentClass: "raw_provider_content" | "non_aerodatabox_metadata" | "project_research_aggregate";
  persistence: Phase2PersistenceKindV39;
  owner: string;
  maximumPlaintextLifetimeHours: number | null;
  reconstructsProviderPlaintext: boolean;
}

/**
 * Prerequisite-P scope is intentionally narrower than Phase-6 retention.
 * It covers every persistent/transient class that Gate 1 or the isolated
 * Phase-2 smoke/probe path can create. The full providerContentInventory_v39
 * remains the separate later-phase audit and is intentionally still BLOCKED.
 */
export const PHASE2_PREPAID_CONTENT_SCOPE_V39: readonly Phase2PrepaidContentClassV39[] = Object.freeze([
  {
    id: "gate1-coverage-hash-artifact",
    contentClass: "non_aerodatabox_metadata",
    persistence: "project_hash_artifact",
    owner: "gate1Coverage_v39",
    maximumPlaintextLifetimeHours: null,
    reconstructsProviderPlaintext: false,
  },
  {
    id: "prepaid-provider-raw-blob",
    contentClass: "raw_provider_content",
    persistence: "replit_app_storage",
    owner: "prepaidProbeRuntime_v39+providerBlobExpiry_v39",
    maximumPlaintextLifetimeHours: 168,
    reconstructsProviderPlaintext: true,
  },
  {
    id: "prepaid-session-runtime",
    contentClass: "raw_provider_content",
    persistence: "postgres_unlogged_runtime",
    owner: "prepaidProbeRuntime_v39+prepaidProbeExpiry_v39",
    maximumPlaintextLifetimeHours: 24,
    reconstructsProviderPlaintext: true,
  },
  {
    id: "prepaid-delivery-runtime",
    contentClass: "raw_provider_content",
    persistence: "postgres_unlogged_runtime",
    owner: "prepaidProbeRuntime_v39+prepaidProbeExpiry_v39",
    maximumPlaintextLifetimeHours: 24,
    reconstructsProviderPlaintext: true,
  },
  {
    id: "prepaid-item-runtime",
    contentClass: "raw_provider_content",
    persistence: "postgres_unlogged_runtime",
    owner: "prepaidProbeRuntime_v39+prepaidProbeExpiry_v39",
    maximumPlaintextLifetimeHours: 24,
    reconstructsProviderPlaintext: true,
  },
  {
    id: "provider-blob-tombstone-metadata",
    contentClass: "non_aerodatabox_metadata",
    persistence: "logged_project_aggregate",
    owner: "providerBlobStore_v39",
    maximumPlaintextLifetimeHours: null,
    reconstructsProviderPlaintext: false,
  },
  {
    id: "safe-anchor-probe-research-aggregates",
    contentClass: "project_research_aggregate",
    persistence: "logged_project_aggregate",
    owner: "probeExecutionPrepaid_v39",
    maximumPlaintextLifetimeHours: null,
    reconstructsProviderPlaintext: false,
  },
]);

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

export const PHASE2_PREPAID_CONTENT_SCOPE_SHA256 = createHash("sha256")
  .update(canonical(PHASE2_PREPAID_CONTENT_SCOPE_V39), "utf8")
  .digest("hex");

export function verifyPhase2PrepaidContentScopeDefinitionV39(
  rows: readonly Phase2PrepaidContentClassV39[] = PHASE2_PREPAID_CONTENT_SCOPE_V39,
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.id || ids.has(row.id)) failures.push(`scope-id-invalid-or-duplicate:${row.id}`);
    ids.add(row.id);
    if (!row.owner?.trim()) failures.push(`scope-owner-missing:${row.id}`);
    if (row.reconstructsProviderPlaintext) {
      if (row.contentClass !== "raw_provider_content") failures.push(`plaintext-class-invalid:${row.id}`);
      if (!Number.isInteger(row.maximumPlaintextLifetimeHours) ||
          row.maximumPlaintextLifetimeHours! < 1 || row.maximumPlaintextLifetimeHours! > 168) {
        failures.push(`plaintext-lifetime-invalid:${row.id}`);
      }
    } else if (row.maximumPlaintextLifetimeHours !== null) {
      failures.push(`nonplaintext-lifetime-should-be-null:${row.id}`);
    }
  }
  for (const required of [
    "gate1-coverage-hash-artifact",
    "prepaid-provider-raw-blob",
    "prepaid-session-runtime",
    "prepaid-delivery-runtime",
    "prepaid-item-runtime",
    "provider-blob-tombstone-metadata",
    "safe-anchor-probe-research-aggregates",
  ]) {
    if (!ids.has(required)) failures.push(`scope-required-class-missing:${required}`);
  }
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}
