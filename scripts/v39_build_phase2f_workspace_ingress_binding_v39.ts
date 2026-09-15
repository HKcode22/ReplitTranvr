import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import {
  buildPhase2FWorkspaceIngressBindingV39,
  loadPhase2FWorkspaceIngressBindingV39,
} from "../server/lib/disruption/phase2WorkspaceIngressBinding_v39";

const LEDGER = path.join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
const SOURCE_PATHS = [
  "server/routes_v3.ts",
  "server/lib/disruption/prepaidProbeRuntime_v39.ts",
  "server/lib/disruption/providerBlobStore_v39.ts",
  "server/lib/disruption/replitProviderBlobStore_v39.ts",
  "server/lib/disruption/db_v39.ts",
  "scripts/v39_workspace_v3_server_v39.ts",
] as const;

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function sha256(raw: Buffer | string): string {
  return createHash("sha256").update(raw).digest("hex");
}
function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
function gitFileAt(ref: string, file: string): string {
  return execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}
async function jsonResponse(url: string): Promise<{ status: number; json: any | null }> {
  const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  const text = await response.text().catch(() => "");
  let json: any | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, json };
}

async function main(): Promise<void> {
  const receiptPath = path.resolve(required("--receipt"));
  const out = path.resolve(required("--out"));
  const receiptRaw = fs.readFileSync(receiptPath);
  const receipt = JSON.parse(receiptRaw.toString("utf8"));

  if (receipt?.schema !== "v39.phase2f-workspace-callback-verification.v1" || receipt?.status !== "PASS") {
    throw new Error("BLOCKED:WORKSPACE_CALLBACK_RECEIPT_NOT_PASS");
  }
  if (receipt.executionEnvironment !== "replit-workspace-live" || receipt.deploymentPerformed !== false ||
      receipt.providerCalled !== false || receipt.providerSubscriptionCreated !== false ||
      Number(receipt.alertCreditsSpent) !== 0 || receipt.exactRouteOwner !== "server/routes_v3.ts" ||
      receipt.wrongSecretRejected404 !== true || receipt.exactSecretAccepted200 !== true ||
      receipt.publicHttpsIngress !== true || Number(receipt.retentionHours) !== 168 ||
      receipt.bucketPrefix !== "replit-objstore" || Number(receipt.openIncidentsBefore) !== 0 ||
      Number(receipt.openIncidentsAfter) !== 0) {
    throw new Error("BLOCKED:WORKSPACE_CALLBACK_RECEIPT_CONTROLS_INVALID");
  }
  if (!/^[a-f0-9]{40}$/i.test(String(receipt.gitHead ?? ""))) {
    throw new Error("BLOCKED:WORKSPACE_CALLBACK_RUNTIME_GIT_HEAD_INVALID");
  }
  const generatedMs = Date.parse(String(receipt.generatedAtUtc ?? ""));
  const ageMs = Date.now() - generatedMs;
  if (!Number.isFinite(generatedMs) || ageMs < -60_000 || ageMs > 30 * 60_000) {
    throw new Error(`BLOCKED:WORKSPACE_CALLBACK_RECEIPT_STALE:age_ms=${ageMs}`);
  }

  const callbackOrigin = new URL(String(receipt.callbackOrigin ?? "")).origin;
  if (!callbackOrigin.endsWith(".replit.dev") || callbackOrigin.includes("travnr.com")) {
    throw new Error("BLOCKED:WORKSPACE_CALLBACK_ORIGIN_NOT_REPLIT_DEV");
  }

  const runtimeHead = String(receipt.gitHead).toLowerCase();
  const health = await jsonResponse(`${callbackOrigin}/__v39/workspace-runtime`);
  if (health.status !== 200 || health.json?.status !== "PASS" ||
      String(health.json?.git_head ?? "").toLowerCase() !== runtimeHead ||
      health.json?.route_owner !== "server/routes_v3.ts" ||
      health.json?.prepaid_route_registered !== true || Number(health.json?.retention_hours) !== 168 ||
      health.json?.bucket_prefix !== "replit-objstore") {
    throw new Error(`BLOCKED:WORKSPACE_CALLBACK_RUNTIME_NOT_LIVE_OR_HEAD_CHANGED:http=${health.status}`);
  }

  const incident = await pool.query(`SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE resolved=false`);
  const openIncidents = Number(incident.rows[0]?.n ?? -1);
  if (openIncidents !== 0) throw new Error(`BLOCKED:WORKSPACE_INGRESS_OPEN_INCIDENTS:${openIncidents}`);

  const currentHead = git(["rev-parse", "HEAD"]).toLowerCase();
  const sourceCompatibility = SOURCE_PATHS.map((file) => {
    const runtimeSha = sha256(gitFileAt(runtimeHead, file));
    const currentSha = sha256(fs.readFileSync(path.resolve(file)));
    if (runtimeSha !== currentSha) throw new Error(`BLOCKED:WORKSPACE_CALLBACK_SOURCE_CHANGED:${file}`);
    return { path: file, runtime_sha256: runtimeSha, current_sha256: currentSha, match: true as const };
  });

  const artifact = buildPhase2FWorkspaceIngressBindingV39({
    checked_at_utc: new Date().toISOString(),
    callback_origin: callbackOrigin,
    callback_receipt_sha256: sha256(receiptRaw),
    callback_receipt_generated_at_utc: new Date(generatedMs).toISOString(),
    callback_runtime_git_head: runtimeHead,
    binding_creator_git_head: currentHead,
    exact_route_owner: "server/routes_v3.ts",
    public_https_ingress: true,
    wrong_secret_rejected_404: true,
    exact_secret_accepted_200: true,
    runtime_health_rechecked: true,
    retention_hours: 168,
    bucket_prefix: "replit-objstore",
    open_incidents: 0,
    provider_called_during_verification: false,
    provider_subscription_created_during_verification: false,
    alert_credits_spent_during_verification: 0,
    deployment_performed: false,
    source_compatibility: sourceCompatibility,
  });

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  const loaded = loadPhase2FWorkspaceIngressBindingV39(out);

  if (!fs.existsSync(LEDGER)) throw new Error("BLOCKED:EVIDENCE_LEDGER_MISSING");
  const ledger = fs.readFileSync(LEDGER, "utf8");
  if (!ledger.includes(loaded.evidenceId)) {
    fs.appendFileSync(LEDGER, [
      "",
      `### ${loaded.evidenceId} — Phase 2F workspace-live ingress binding`,
      `- evidence_id: ${loaded.evidenceId}`,
      `- ingress_kind: ${loaded.artifact.ingress_kind}`,
      `- callback_origin: ${loaded.artifact.callback_origin}`,
      `- callback_runtime_git_head: ${loaded.artifact.callback_runtime_git_head}`,
      `- binding_creator_git_head: ${loaded.artifact.binding_creator_git_head}`,
      `- source_compatibility_count: ${loaded.artifact.source_compatibility.length}`,
      `- INGRESS_ARTIFACT_SHA256:${loaded.artifact.artifact_sha256}`,
      `- INGRESS_FILE_SHA256:${loaded.fileSha256}`,
      `- INGRESS_BINDING_SHA256:${loaded.bindingSha256}`,
      `- open_incidents: 0`,
      `- deployment_performed: false`,
      `- provider_paid_or_mutating_action: false`,
      "",
    ].join("\n"), "utf8");
  }

  console.log(JSON.stringify({
    status: "PASS_WORKSPACE_INGRESS_BINDING",
    ingress_kind: loaded.artifact.ingress_kind,
    callback_origin: loaded.artifact.callback_origin,
    runtime_git_head: loaded.artifact.callback_runtime_git_head,
    current_git_head: loaded.artifact.binding_creator_git_head,
    source_compatibility_count: loaded.artifact.source_compatibility.length,
    open_incidents: loaded.artifact.open_incidents,
    deployment_performed: false,
    provider_called: false,
    alert_credits_spent: 0,
    evidence_id: loaded.evidenceId,
    artifact_sha256: loaded.artifact.artifact_sha256,
    file_sha256: loaded.fileSha256,
    binding_sha256: loaded.bindingSha256,
    ledger_recorded: true,
    path: out,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(String(error instanceof Error ? error.message : error));
    process.exitCode = 1;
  })
  .finally(async () => { await pool.end().catch(() => undefined); });
