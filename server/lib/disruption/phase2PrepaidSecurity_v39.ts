import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { v39Pool as pool } from "./db_v39";
import {
  createRequiredProviderBlobStoreV39,
  providerBlobStorageRequiredV39,
  V39_PROVIDER_BLOB_BUCKET_ENV,
} from "./replitProviderBlobStore_v39";
import { verifyPhase2PrepaidContentScopeDefinitionV39 } from "./phase2PrepaidContentScope_v39";

export interface Phase2PrepaidSecurityVerdictV39 {
  pass: boolean;
  failures: string[];
  details: string[];
}

function source(root: string, relative: string): string {
  return readFileSync(join(root, relative), "utf8");
}

async function verifyDatabaseSurfaces(failures: string[], details: string[]): Promise<void> {
  const names = [
    "prepaid_probe_session_runtime",
    "prepaid_probe_delivery_runtime",
    "prepaid_probe_item_runtime",
  ];
  const persistence = await pool.query(
    `SELECT c.relname,c.relpersistence
       FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='clean' AND c.relname=ANY($1::text[])`,
    [names],
  );
  const by = new Map(persistence.rows.map((row: any) => [String(row.relname), String(row.relpersistence)]));
  for (const name of names) {
    if (by.get(name) !== "u") failures.push(`runtime-table-not-unlogged:${name}:${by.get(name) ?? "missing"}`);
  }
  const blob = await pool.query("SELECT to_regclass('clean.provider_content_blob_ref') AS c");
  if (blob.rows[0]?.c !== "clean.provider_content_blob_ref") failures.push("provider-blob-ref-table-missing");
  const constraints = await pool.query(
    `SELECT conname FROM pg_constraint
      WHERE conrelid='clean.adb_anchor_probe'::regclass
        AND conname=ANY($1::text[])`,
    [[
      "adb_anchor_probe_safe_provider_fields_null",
      "adb_anchor_probe_safe_bound_rates",
      "adb_anchor_probe_safe_completed_shape",
    ]],
  );
  const have = new Set(constraints.rows.map((row: any) => String(row.conname)));
  for (const required of [
    "adb_anchor_probe_safe_provider_fields_null",
    "adb_anchor_probe_safe_bound_rates",
    "adb_anchor_probe_safe_completed_shape",
  ]) if (!have.has(required)) failures.push(`safe-probe-constraint-missing:${required}`);
  if (!failures.some((x) => x.startsWith("runtime-table-") || x.includes("constraint") || x.includes("blob-ref"))) {
    details.push("postgres-prepaid-runtime=UNLOGGED; safe logged probe constraints present");
  }
}

function verifyCodeWiring(root: string, failures: string[], details: string[]): void {
  const runtime = source(root, "server/lib/disruption/prepaidProbeRuntime_v39.ts");
  const rawPersist = runtime.indexOf("persistProviderBlobBeforeAckV39");
  const normalizedPersist = runtime.indexOf("INSERT INTO clean.prepaid_probe_delivery_runtime");
  if (rawPersist < 0 || normalizedPersist < 0 || rawPersist >= normalizedPersist) {
    failures.push("raw-before-normalized-persistence-order-unproven");
  }

  const routes = source(root, "server/routes_v3.ts");
  if (!routes.includes("persistPrepaidProbeWebhookV39") ||
      !routes.includes('/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId')) {
    failures.push("prepaid-webhook-production-route-not-wired");
  }

  const smoke = source(root, "scripts/v39_smoke_safety_v39.ts");
  if (!smoke.includes("v39_smoke_safety_owner_v39.ts") || smoke.includes("credit_canary.ts")) {
    failures.push("phase2-smoke-not-isolated-owner");
  }
  for (const owner of ["scripts/v39_probe_stage1_owner_v39.ts", "scripts/v39_probe_stage2_owner_v39.ts"]) {
    const text = source(root, owner);
    if (!text.includes("executePrepaidProbe")) failures.push(`probe-owner-not-prepaid:${owner}`);
    if (text.includes("executeProbe,")) failures.push(`probe-owner-imports-legacy-executor:${owner}`);
  }
  const prepaidExecutor = source(root, "server/lib/disruption/probeExecutionPrepaid_v39.ts");
  if (prepaidExecutor.includes("clean.raw_delivery") || prepaidExecutor.includes("clean.flight_data_pre_post")) {
    failures.push("prepaid-executor-reads-legacy-provider-tables");
  }
  const expiry = source(root, "scripts/v39_phase2_retention_v39.ts");
  if (!expiry.includes("applyExpiredPrepaidProbeSessionsV39") || !expiry.includes("applyExpiredProviderBlobsV39")) {
    failures.push("phase2-retention-owners-not-complete");
  }
  if (!failures.some((x) => x.includes("wired") || x.includes("owner") || x.includes("executor") || x.includes("persistence-order"))) {
    details.push("isolated webhook/smoke/stage1/stage2/expiry owners production-wired");
  }
}

async function verifyObjectStorage(failures: string[], details: string[]): Promise<void> {
  if (!providerBlobStorageRequiredV39()) {
    failures.push("provider-blob-mode-not-required");
    return;
  }
  const bucket = String(process.env[V39_PROVIDER_BLOB_BUCKET_ENV] ?? "").trim();
  if (!bucket) {
    failures.push("provider-blob-bucket-id-missing");
    return;
  }
  const store = createRequiredProviderBlobStoreV39();
  const objectName = `v39/p-health/${randomUUID()}.txt`;
  const bytes = Buffer.from(`v39-phase2-storage-health:${randomUUID()}`, "utf8");
  let uploaded = false;
  try {
    await store.uploadBytes(objectName, bytes);
    uploaded = true;
    if (!(await store.exists(objectName))) throw new Error("synthetic-object-not-visible-after-upload");
    const downloaded = Buffer.from(await store.downloadBytes(objectName));
    if (!downloaded.equals(bytes)) throw new Error("synthetic-object-roundtrip-mismatch");
    await store.delete(objectName);
    uploaded = false;
    if (await store.exists(objectName)) throw new Error("synthetic-object-still-visible-after-delete");
    details.push("dedicated App Storage synthetic write/read/delete/absence verified");
  } catch (error: any) {
    failures.push(`provider-blob-live-test:${error?.message ?? error}`);
  } finally {
    if (uploaded) await store.delete(objectName).catch(() => undefined);
  }
}

export async function verifyPhase2PrepaidSecurityV39(
  root = process.cwd(),
): Promise<Phase2PrepaidSecurityVerdictV39> {
  const failures: string[] = [];
  const details: string[] = [];
  const scope = verifyPhase2PrepaidContentScopeDefinitionV39();
  failures.push(...scope.failures);
  if (scope.pass) details.push("Phase2 prepaid content-scope definition verified");
  try { verifyCodeWiring(root, failures, details); }
  catch (error: any) { failures.push(`phase2-code-wiring-check:${error?.message ?? error}`); }
  try { await verifyDatabaseSurfaces(failures, details); }
  catch (error: any) { failures.push(`phase2-database-surface-check:${error?.message ?? error}`); }
  await verifyObjectStorage(failures, details);
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort(), details };
}
