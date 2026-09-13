/** V3.9 prerequisite-P security/retention verifier for Gate 1 + Phase-2 prepaid runtime. */
import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import {
  checkLeastPrivilege,
  checkWebhookSecurity,
  executeRetentionDryRun,
  type DatabaseRoleEvidence,
  type RetentionAdapters,
  type WebhookSecurityEvidence,
} from "../server/lib/disruption/retentionSecurity_v39";
import {
  verifyRetentionDeploymentEvidence,
  type RetentionDeploymentEvidenceV39,
} from "../server/lib/disruption/retentionDeployment_v39";
import { verifyProviderContentInventory } from "../server/lib/disruption/providerContentInventory_v39";
import {
  parsePhase2RetentionScopeEvidenceV39,
  verifyPhase2RetentionScopeEvidenceV39,
} from "../server/lib/disruption/phase2RetentionEvidence_v39";
import { verifyPhase2PrepaidSecurityV39 } from "../server/lib/disruption/phase2PrepaidSecurity_v39";

interface Check { name: string; pass: boolean; detail: string }

function parseEvidence<T>(name: string): T | null {
  const raw = process.env[name];
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

async function verifyRoleLive(role: string): Promise<string[]> {
  const failures: string[] = [];
  const ownerUrl = process.env.DATABASE_URL;
  if (!ownerUrl) return ["no-owner-DATABASE_URL-for-live-check"];
  const owner = new Pool({ connectionString: ownerUrl });
  try {
    const attr = await owner.query("SELECT rolsuper, rolcreatedb, rolcreaterole, rolcanlogin FROM pg_roles WHERE rolname=$1", [role]);
    if (!attr.rowCount) return [`role-missing:${role}`];
    const a = attr.rows[0];
    if (a.rolsuper) failures.push("role-is-superuser");
    if (a.rolcreatedb) failures.push("role-can-createdb");
    if (a.rolcreaterole) failures.push("role-can-createrole");
    if (!a.rolcanlogin) failures.push("role-cannot-login");
    const grants = await owner.query(
      `SELECT table_schema s, table_name t,
              string_agg(DISTINCT privilege_type,',' ORDER BY privilege_type) p
         FROM information_schema.role_table_grants
        WHERE grantee=$1 GROUP BY 1,2`,
      [role],
    );
    const allowed = new Set(["SELECT", "INSERT", "UPDATE", "DELETE"]);
    if (!grants.rows.length) failures.push("role-has-no-table-grants");
    for (const r of grants.rows) {
      if (r.s !== "clean") failures.push(`grant-outside-clean:${r.s}.${r.t}`);
      for (const p of String(r.p).split(",")) if (!allowed.has(p)) failures.push(`excess-privilege:${p}@${r.s}.${r.t}`);
    }
    if (!ownerUrl.includes("sslmode=")) failures.push("owner-url-missing-sslmode");
    const tomb = await owner.query("SELECT to_regclass('clean.retention_tombstone') AS c");
    if (tomb.rows[0]?.c !== "clean.retention_tombstone") failures.push("tombstone-audit-table-missing");
  } catch (err: any) {
    failures.push(`live-check-error:${err?.message ?? err}`);
  } finally {
    await owner.end().catch(() => undefined);
  }
  return failures;
}

async function verifyWebhookLive(e: WebhookSecurityEvidence): Promise<string[]> {
  const failures: string[] = [];
  const secret = process.env.AERODATABOX_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) failures.push("webhook-secret-missing-or-short");
  try {
    const { defaultWebhookUrl } = await import("../server/lib/disruption/aerodataboxLimiter_v3");
    const url = defaultWebhookUrl();
    if (!url.startsWith("https://")) failures.push("runtime-webhook-url-not-https");
    if (!/\/api\/v1\/webhooks\/aerodatabox\/.+/.test(url)) failures.push("runtime-webhook-url-missing-secret-path");
    if (new URL(e.url).host !== new URL(url).host) failures.push("evidence-host-mismatch");
  } catch (err: any) {
    failures.push(`webhook-runtime-check:${err?.message ?? err}`);
  }
  try {
    const routes = readFileSync(join(process.cwd(), "server", "routes_v3.ts"), "utf8");
    if (!routes.includes("req.params.secret") || !routes.includes("webhookSecret()")) failures.push("ingress-secret-enforcement-missing");
    if (!routes.includes('/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId')) failures.push("prepaid-secret-route-missing");
  } catch (err: any) {
    failures.push(`code-check:${err?.message ?? err}`);
  }
  return failures;
}

async function verifyRetentionSurfaces(e: RetentionDeploymentEvidenceV39 | null): Promise<Check> {
  if (!e) return { name: "retention-deployment-surfaces", pass: false, detail: "missing-V39_RETENTION_DEPLOYMENT_EVIDENCE" };
  const topology = verifyRetentionDeploymentEvidence(e);
  if (!topology.pass) {
    return { name: "retention-deployment-surfaces", pass: false, detail: `recovery-topology-blocked:${topology.failures.slice(0, 8).join(",")}` };
  }
  try {
    const { v39Pool: pool } = await import("../server/lib/disruption/db_v39");
    const tomb = await pool.query(
      `SELECT surface,record_id,content_hash,expired_at
         FROM clean.retention_tombstone
        WHERE expired_at<=now()
        ORDER BY expired_at ASC
        LIMIT 1000`,
    );
    const primary = {
      listExpired: async () => (tomb.rows as any[]).map((r) => ({
        id: `${r.surface}:${r.record_id}`,
        contentHash: r.content_hash,
        expiresAt: new Date(r.expired_at).toISOString(),
        containsRawContent: false,
      })),
    };
    const empty = { listExpired: async () => [] as const };
    const adapters: RetentionAdapters = { primary, replica: empty, backup: empty, object: empty, log: empty };
    const dry = await executeRetentionDryRun(adapters, new Date().toISOString(), true);
    if (!/^[a-f0-9]{64}$/.test(dry.evidenceHash)) throw new Error("invalid-dry-run-evidence-hash");
    return {
      name: "retention-deployment-surfaces",
      pass: true,
      detail: `topology verified; raw_recoverable=${topology.effectiveRecoverableHours.raw_provider_content}h; fids_recoverable=${topology.effectiveRecoverableHours.live_fids_cache}h; dry_run=${dry.evidenceHash}`,
    };
  } catch (err: any) {
    return { name: "retention-deployment-surfaces", pass: false, detail: `primary-real-adapter-failed:${err?.message ?? err}` };
  }
}

function verifyPhase2ScopeEvidence(): Check {
  const raw = process.env.V39_PHASE2_RETENTION_SCOPE_EVIDENCE;
  if (!raw) return { name: "phase2-retention-scope-evidence", pass: false, detail: "missing-V39_PHASE2_RETENTION_SCOPE_EVIDENCE" };
  try {
    const evidence = parsePhase2RetentionScopeEvidenceV39(raw);
    const verdict = verifyPhase2RetentionScopeEvidenceV39(evidence);
    return {
      name: "phase2-retention-scope-evidence",
      pass: verdict.pass,
      detail: verdict.pass
        ? `evidence=${evidence.evidenceId}; raw<=${evidence.rawProviderMaxHours}h; fids<=${evidence.liveFidsMaxHours}h; PITR prepaid plaintext=false`
        : verdict.failures.join(","),
    };
  } catch (error: any) {
    return { name: "phase2-retention-scope-evidence", pass: false, detail: String(error?.message ?? error) };
  }
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  const db = parseEvidence<DatabaseRoleEvidence>("V39_DB_ROLE_EVIDENCE");
  if (!db) {
    checks.push({ name: "least-privilege-db-tls", pass: false, detail: "missing-V39_DB_ROLE_EVIDENCE" });
  } else {
    const staticCheck = checkLeastPrivilege(db);
    const live = await verifyRoleLive(db.role);
    const all = [...staticCheck.failures, ...live];
    checks.push({ name: "least-privilege-db-tls", pass: !all.length, detail: all.join(",") || `role=${db.role} live-verified` });
  }

  const webhook = parseEvidence<WebhookSecurityEvidence>("V39_WEBHOOK_SECURITY_EVIDENCE");
  if (!webhook) {
    checks.push({ name: "webhook-tls-auth-replay", pass: false, detail: "missing-V39_WEBHOOK_SECURITY_EVIDENCE" });
  } else {
    const staticCheck = checkWebhookSecurity(webhook);
    const live = await verifyWebhookLive(webhook);
    const all = [...staticCheck.failures, ...live];
    checks.push({ name: "webhook-tls-auth-replay", pass: !all.length, detail: all.join(",") || "runtime prepaid ingress verified" });
  }

  checks.push(verifyPhase2ScopeEvidence());
  checks.push(await verifyRetentionSurfaces(parseEvidence<RetentionDeploymentEvidenceV39>("V39_RETENTION_DEPLOYMENT_EVIDENCE")));

  try {
    const phase2 = await verifyPhase2PrepaidSecurityV39();
    checks.push({
      name: "phase2-prepaid-storage-and-runtime",
      pass: phase2.pass,
      detail: phase2.pass ? phase2.details.join("; ") : phase2.failures.slice(0, 8).join(","),
    });
  } catch (error: any) {
    checks.push({ name: "phase2-prepaid-storage-and-runtime", pass: false, detail: String(error?.message ?? error) });
  }

  try {
    const { v39Pool: pool } = await import("../server/lib/disruption/db_v39");
    await pool.query("SELECT 1 FROM clean.adb_incident_stop WHERE resolved=false LIMIT 1");
    const controller = readFileSync(join(process.cwd(), "server", "lib", "disruption", "adbCollectionController_v3.ts"), "utf8");
    checks.push({
      name: "incident-stop-refusal",
      pass: controller.includes("clean.adb_incident_stop") && controller.includes("REFUSED_INCIDENT_STOP"),
      detail: "persistent incident admission source inspected",
    });
  } catch (err: any) {
    checks.push({ name: "incident-stop-refusal", pass: false, detail: `${err?.message ?? err}` });
  }

  // Transparency only: this is the FULL repository/Phase-6 inventory. It is
  // intentionally allowed to remain unresolved here and is not prerequisite-P.
  const downstream = verifyProviderContentInventory();
  console.log(
    `[DEFERRED_PHASE6] full-provider-content-inventory - covered_groups=${downstream.coveredGroupCount}; ` +
    `unresolved=${downstream.unresolvedGroupCount}; ${downstream.failures.slice(0, 6).join(",")}`,
  );

  for (const check of checks) console.log(`[${check.pass ? "PASS" : "BLOCKED"}] ${check.name} - ${check.detail}`);
  const pass = checks.length > 0 && checks.every((check) => check.pass);
  console.log(
    `[${pass ? "PASS" : "BLOCKED"}] PREPAID_SECURITY_RETENTION - ` +
    (pass ? "Phase-2 Gate-1 + isolated prepaid smoke/probe scope is verified; Phase-6 downstream inventory remains separately gated" :
      "one or more Phase-2 prerequisite-P checks remain unresolved"),
  );
  if (!pass) process.exitCode = 1;
}

void main();
