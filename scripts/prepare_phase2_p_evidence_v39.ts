/**
 * Prepare machine-readable prerequisite-P evidence from the already-reviewed
 * Phase-2 storage design. No provider calls and no destructive actions.
 *
 * This deliberately requires --owner-approved before writing evidence because
 * provider-plan/legal retention facts must never be self-approved by code.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ENV_PATH = join(process.cwd(), ".env");

function upsertEnvVar(src: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(src)) return src.replace(re, () => line);
  return src.endsWith("\n") || src.length === 0 ? `${src}${line}\n` : `${src}\n${line}\n`;
}
function has(argv: string[], flag: string): boolean { return argv.includes(flag); }

function main(argv = process.argv.slice(2)): void {
  if (!has(argv, "--owner-approved")) {
    throw new Error("REFUSED: --owner-approved is required; code cannot self-approve provider-plan/retention evidence");
  }
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const verifiedAtUtc = new Date().toISOString();

  const phase2Scope = {
    schemaVersion: "v3.9-phase2-retention-scope-evidence-1",
    evidenceId: `RETENTION-PHASE2-${today}-001`,
    verifiedAtUtc,
    providerTermsSource: "Owner-supplied active AeroDataBox/RapidAPI Ultra entitlement: raw API/webhook content <=168h; live FIDS cache <=24h; cross-checked against AeroDataBox Terms updated 2026-08-21",
    rawProviderMaxHours: 168,
    liveFidsMaxHours: 24,
    gate1SourceListsTransient: true,
    prepaidRawStorage: "replit_app_storage",
    prepaidRuntimeStorage: "postgres_unlogged",
    postgresPitrContainsPrepaidProviderPlaintext: false,
    dedicatedProviderBucketRequired: true,
    providerBlobDeletionOwner: "providerBlobExpiry_v39",
    prepaidSessionDeletionOwner: "prepaidProbeExpiry_v39",
    ownerApproved: true,
    note: "Production PostgreSQL PITR remains enabled; safety comes from storage separation, not disabling recovery. App Storage delete semantics are documented as irreversible/delete-forever at https://docs.replit.com/features/data-and-storage/object-storage.",
  };

  const deployment = {
    schemaVersion: "v3.9-retention-deployment-evidence-1",
    evidenceId: `RETENTION-DEPLOYMENT-${today}-P2`,
    verifiedAtUtc,
    primaryExpiryHours: {
      raw_provider_content: 168,
      live_fids_cache: 24,
    },
    surfaces: {
      primary: {
        state: "DEPLOYED",
        plaintextProviderContentRecoverable: false,
        recoveryWindowHours: 168,
        source: "Replit production PostgreSQL with owner-verified 7-day PITR; Phase-2 provider plaintext is excluded from logged PostgreSQL by migrations 0055/0056",
        note: "Logged DB retains only project-owned hashes/tombstones/safe aggregates for the isolated Phase-2 path.",
      },
      replica: {
        state: "DEPLOYED",
        plaintextProviderContentRecoverable: false,
        recoveryWindowHours: 168,
        source: "Conservative managed-PostgreSQL HA/replica surface; prepaid provider working tables are PostgreSQL UNLOGGED and raw bytes are outside PostgreSQL",
        note: "Treat possible managed HA replication as deployed rather than assuming it absent; it cannot reconstruct the isolated prepaid plaintext path.",
      },
      backup: {
        state: "DEPLOYED",
        plaintextProviderContentRecoverable: false,
        recoveryWindowHours: 168,
        source: "Owner-verified Replit production database PITR: On, last 7 days / 7 Days",
        note: "PITR remains enabled. It cannot restore App-Storage raw objects or WAL-excluded UNLOGGED prepaid runtime contents.",
      },
      object: {
        state: "DEPLOYED",
        plaintextProviderContentRecoverable: true,
        recoveryWindowHours: 0,
        source: "Dedicated Replit App Storage bucket; Replit App Storage docs state object deletion is irreversible/delete forever; live P verifier also requires synthetic write/read/delete/absence",
        note: "https://docs.replit.com/features/data-and-storage/object-storage",
      },
      log: {
        state: "DEPLOYED",
        plaintextProviderContentRecoverable: false,
        recoveryWindowHours: 0,
        source: "V3.9 provider-log redaction regression tests + prepaid webhook logs emit only session/item-count/duplicate status",
        note: "Provider response bodies, subscription IDs and balance payloads are not intentionally logged by the isolated Phase-2 path.",
      },
    },
  };

  let env = "";
  try { env = readFileSync(ENV_PATH, "utf8"); } catch { env = ""; }
  env = upsertEnvVar(env, "V39_PROVIDER_BLOB_MODE", "required");
  env = upsertEnvVar(env, "V39_PREPAID_RAW_RETENTION_HOURS", "168");
  env = upsertEnvVar(env, "V39_PHASE2_RETENTION_APPLY_ARMED", "0");
  env = upsertEnvVar(env, "V39_PHASE2_RETENTION_SCOPE_EVIDENCE", `'${JSON.stringify(phase2Scope)}'`);
  env = upsertEnvVar(env, "V39_RETENTION_DEPLOYMENT_EVIDENCE", `'${JSON.stringify(deployment)}'`);
  writeFileSync(ENV_PATH, env, { mode: 0o600 });

  console.log(JSON.stringify({
    status: "PREPARED",
    ownerApproved: true,
    phase2RetentionScopeEvidence: phase2Scope,
    retentionDeploymentEvidence: deployment,
    providerBlobMode: "required",
    prepaidRawRetentionHours: 168,
    destructiveRetentionArmed: false,
    stillRequiredBeforeP: [
      "V39_PROVIDER_BLOB_BUCKET_ID for a dedicated App Storage bucket",
      "V39_DATABASE_RUNTIME_URL + V39_DB_ROLE_EVIDENCE from provision_runtime_role_v39.ts",
      "V39_WEBHOOK_SECURITY_EVIDENCE from configure_webhook_evidence_v39.ts",
      "live v39:security:verify synthetic storage/runtime checks",
    ],
  }, null, 2));
}

try { main(); }
catch (error: any) {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
}
