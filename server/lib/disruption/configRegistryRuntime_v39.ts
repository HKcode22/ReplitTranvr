import type { ConfigEntry } from "./configRegistry_v3";

/**
 * V3.9 runtime/security registry extension.
 *
 * Kept separate from the older Phase-6 registry owner so prerequisite-P and
 * dedicated-runtime-role settings cannot remain hidden implementation details.
 */
export const V39_RUNTIME_CONFIG_REGISTRY: ConfigEntry[] = [
  {
    key: "DATABASE_RUNTIME_URL",
    type: "env",
    value: process.env.DATABASE_RUNTIME_URL ?? null,
    defaultValue: null,
    safeDefault: null,
    required: false,
    secret: true,
    producer: "environment",
    consumer: "server/db.ts",
    phase: "all",
    gate: "Phase 0",
    failureBehavior: "SAFE FALLBACK — general app pool falls back to DATABASE_URL; dedicated V3.9 pool does not use this fallback",
    description: "Optional least-privilege runtime URL for the general application pool",
  },
  {
    key: "V39_DATABASE_RUNTIME_URL",
    type: "env",
    value: process.env.V39_DATABASE_RUNTIME_URL ?? null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: true,
    producer: "environment",
    consumer: "server/lib/disruption/db_v39.ts",
    phase: "all",
    gate: "Phase 0",
    failureBehavior: "BLOCKED — every V3.9 DB operation fails closed when the clean-schema runtime role URL is absent",
    description: "Dedicated least-privilege V3.9 clean-schema runtime database URL",
  },
  {
    key: "V39_RAW_PROVIDER_RETENTION_HOURS",
    type: "env",
    value: Number(process.env.V39_RAW_PROVIDER_RETENTION_HOURS ?? 168),
    defaultValue: 168,
    safeDefault: 168,
    required: false,
    secret: false,
    producer: "prerequisite-P retention policy",
    consumer: "retentionExpiry_v39.ts",
    phase: "Phase 2 prerequisite P",
    gate: "P",
    failureBehavior: "BLOCKED if outside 1..168h or inconsistent with deployment evidence",
    description: "Primary-row raw-provider retention clock; must leave room for any plaintext-recoverable recovery surface",
  },
  {
    key: "V39_FIDS_RETENTION_HOURS",
    type: "env",
    value: Number(process.env.V39_FIDS_RETENTION_HOURS ?? 24),
    defaultValue: 24,
    safeDefault: 24,
    required: false,
    secret: false,
    producer: "prerequisite-P retention policy",
    consumer: "retentionExpiry_v39.ts",
    phase: "Phase 2 prerequisite P",
    gate: "P",
    failureBehavior: "BLOCKED if outside 1..24h or inconsistent with deployment evidence",
    description: "Independent live-FIDS primary-row retention clock",
  },
  {
    key: "V39_RETENTION_APPLY_ARMED",
    type: "env",
    value: process.env.V39_RETENTION_APPLY_ARMED ?? "0",
    defaultValue: "0",
    safeDefault: "0",
    required: true,
    secret: false,
    producer: "operator",
    consumer: "retentionExpiry_v39.ts",
    phase: "Phase 2 prerequisite P",
    gate: "P",
    failureBehavior: "SAFE — destructive expiry APPLY is refused unless exactly 1",
    description: "Explicit destructive-retention arming flag",
  },
  {
    key: "V39_RETENTION_DEPLOYMENT_EVIDENCE",
    type: "env",
    value: process.env.V39_RETENTION_DEPLOYMENT_EVIDENCE ?? null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "prerequisite-P storage/recovery verification",
    consumer: "v39_security_verify_v39.ts; retentionExpiry_v39.ts",
    phase: "Phase 2 prerequisite P",
    gate: "P",
    failureBehavior: "BLOCKED — P/APPLY cannot pass without complete recovery-topology evidence",
    description: "Structured primary/replica/backup/object/log recoverability evidence",
  },
  {
    key: "V39_RETENTION_MATRIX_EVIDENCE",
    type: "env",
    value: process.env.V39_RETENTION_MATRIX_EVIDENCE ?? null,
    defaultValue: null,
    safeDefault: null,
    required: true,
    secret: false,
    producer: "prerequisite-P provider terms/content review",
    consumer: "v39_security_verify_v39.ts; retentionExpiry_v39.ts",
    phase: "Phase 2 prerequisite P",
    gate: "P",
    failureBehavior: "BLOCKED — P/APPLY cannot pass with unverified content-class evidence",
    description: "Per-content-class legal/retention evidence overlay",
  },
];

export function getV39RuntimeRequiredConfigs(): ConfigEntry[] {
  return V39_RUNTIME_CONFIG_REGISTRY.filter((entry) => entry.required);
}

export function getV39RuntimeSecretConfigs(): ConfigEntry[] {
  return V39_RUNTIME_CONFIG_REGISTRY.filter((entry) => entry.secret);
}
