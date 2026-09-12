import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const PREPAID_SECURITY_RETENTION_CONTROL_IDS = Object.freeze([
  "least-privilege-db-tls",
  "webhook-tls-auth-replay",
  "retention-deployment-surfaces",
  "retention-content-matrix",
  "governance-terms-owner-reference-license",
  "credentials-secret-redaction",
  "raw-before-2xx",
  "retention-expiry-propagation",
  "raw-derived-tombstone-distinction",
  "shared-settlement-configuration",
  "retention-dry-run",
  "incident-stop-refusal",
] as const);

export type PrepaidControlId = typeof PREPAID_SECURITY_RETENTION_CONTROL_IDS[number];

export interface PrepaidGovernanceEvidence {
  verifiedDate: string;
  termsPlanSource: string;
  termsPlanRetentionVerified: boolean;
  ownerLegalApprovalRef: string;
  regionReferenceLicenseVerified: boolean;
  trafficReferenceLicenseVerified: boolean;
  trafficReferenceSourceName: string;
  credentialsOutsideLogsVerified: boolean;
  secretRedactionVerified: boolean;
  sharedSettlementConfigurationVerified: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePrepaidGovernanceEvidence(raw: string): PrepaidGovernanceEvidence {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("prepaid-governance-evidence-not-json"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("prepaid-governance-evidence-not-object");
  return parsed as PrepaidGovernanceEvidence;
}

export function verifyPrepaidGovernanceEvidence(value: PrepaidGovernanceEvidence | null): { pass: boolean; failures: string[] } {
  if (!value) return { pass: false, failures: ["missing-V39_PREPAID_GOVERNANCE_EVIDENCE"] };
  const failures: string[] = [];
  if (!ISO_DATE.test(String(value.verifiedDate ?? ""))) failures.push("governance-verified-date");
  if (!String(value.termsPlanSource ?? "").trim()) failures.push("terms-plan-source");
  if (value.termsPlanRetentionVerified !== true) failures.push("terms-plan-retention-unverified");
  if (!String(value.ownerLegalApprovalRef ?? "").trim()) failures.push("owner-legal-approval-missing");
  if (value.regionReferenceLicenseVerified !== true) failures.push("region-reference-license-unverified");
  if (value.trafficReferenceLicenseVerified !== true) failures.push("traffic-reference-license-unverified");
  if (!String(value.trafficReferenceSourceName ?? "").trim()) failures.push("traffic-reference-source-missing");
  if (value.credentialsOutsideLogsVerified !== true) failures.push("credential-storage-unverified");
  if (value.secretRedactionVerified !== true) failures.push("secret-redaction-unverified");
  if (value.sharedSettlementConfigurationVerified !== true) failures.push("shared-settlement-config-unverified");
  return { pass: failures.length === 0, failures };
}

export interface StaticPControlVerdict { pass: boolean; detail: string }

function source(root: string, relativePath: string): string {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

export function verifyRawBefore2xxWiring(root = process.cwd()): StaticPControlVerdict {
  const routes = source(root, "server/routes_v3.ts");
  const raw = source(root, "server/lib/disruption/rawIngress_v3.ts");
  const hasTransactionalOwner = raw.includes("persistRawDeliveryTransaction") && raw.includes('client.query("COMMIT")');
  const routeUsesOwner = routes.includes("persistRawDeliveryTransaction") && routes.includes("rawCommit");
  const hasReplayIdentity = raw.includes("deliveryAttemptSeqNo") && raw.includes("ON CONFLICT (delivery_id) DO NOTHING");
  const pass = hasTransactionalOwner && routeUsesOwner && hasReplayIdentity;
  return { pass, detail: pass ? "transactional raw-before-2xx + retry identity source verified" : "raw-before-2xx/replay production wiring incomplete" };
}

export function verifyRetentionExpiryPropagationSource(root = process.cwd()): StaticPControlVerdict {
  const migration = source(root, "migrations/0048_retention_policy_and_expiry.sql");
  const required = [
    "adb_retention_policy_v39",
    "adb_retention_enforcement_event_v39",
    "retention_policy_hash",
    "retention_expires_at",
    "trg_raw_delivery_retention_v39",
    "trg_raw_delivery_item_retention_v39",
    "trg_raw_airborne_retention_v39",
    "trg_fids_query_retention_v39",
    "trg_flight_population_retention_v39",
    "list_expired_retention_candidates_v39",
  ];
  const pass = required.every((token) => migration.includes(token));
  return { pass, detail: pass ? "database-triggered raw webhook/FIDS/AIRBORNE expiry propagation owner present" : "retention expiry propagation owner/columns not fully implemented" };
}

export function verifyRawDerivedTombstoneDistinction(root = process.cwd()): StaticPControlVerdict {
  const matrix = source(root, "server/lib/disruption/retentionMatrix_v39.ts");
  const tombstone = source(root, "migrations/0031_retention_tombstone.sql");
  const pass = matrix.includes("raw_api_content") && matrix.includes("derived_work") && matrix.includes("non_aerodatabox_metadata") && tombstone.includes("clean.retention_tombstone") && tombstone.includes("content_hash");
  return { pass, detail: pass ? "classification matrix + non-content tombstone owner present" : "raw/derived/tombstone distinction incomplete" };
}

export function verifySharedSettlementOwner(root = process.cwd()): StaticPControlVerdict {
  const settlement = source(root, "server/lib/disruption/settlement_v3.ts");
  const probe = source(root, "server/lib/disruption/probeExecution_v39.ts");
  const phase6 = source(root, "server/lib/disruption/phase6SafetyWatchdog_v39.ts");
  const pass = settlement.includes("runSettlement") && settlement.includes("SETTLEMENT_MIN_STABLE_READS = 3") && probe.includes('from "./settlement_v3"') && phase6.includes('from "./settlement_v3"');
  return { pass, detail: pass ? ">=3-read shared settlement owner reused by probe/Phase6" : "shared settlement owner not proven across paid paths" };
}

export function verifyRetentionDryRunSource(root = process.cwd()): StaticPControlVerdict {
  const security = source(root, "server/lib/disruption/retentionSecurity_v39.ts");
  const verifier = source(root, "scripts/v39_security_verify_v39.ts");
  const expiry = verifyRetentionExpiryPropagationSource(root);
  const actualCandidateQuery = verifier.includes("list_expired_retention_candidates_v39") && !verifier.includes("FROM clean.retention_tombstone WHERE expired_at<=now() ORDER BY expired_at ASC");
  const pass = expiry.pass && security.includes("executeRetentionDryRun") && actualCandidateQuery;
  return { pass, detail: pass ? "dry-run enumerates actual expired retained content without deleting" : "retention dry-run does not yet prove actual raw-content expiry candidates" };
}
