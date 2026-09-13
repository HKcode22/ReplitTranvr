import "dotenv/config";
import { randomBytes } from "crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import {
  buildPhase2FDeploymentBindingV39,
  loadPhase2FDeploymentBindingV39,
} from "../server/lib/disruption/phase2DeploymentBinding_v39";

const LEDGER = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
const DEFAULT_OUT = "artifacts/phase2f-deployment-binding.json";

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? String(process.argv[i + 1] ?? "").trim() || null : null;
}
function resolveOrigin(): string {
  const raw = String(process.env.V39_PUBLIC_WEBHOOK_BASE_URL ?? process.env.WEBHOOK_BASE_URL ?? "").trim();
  if (!raw) throw new Error("BLOCKED:PHASE2F_PUBLIC_WEBHOOK_BASE_URL_REQUIRED");
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("BLOCKED:PHASE2F_DEPLOYMENT_MUST_BE_HTTPS");
  return url.origin;
}
async function getStatus(url: string, secret: string): Promise<{ status: number; json: any | null }> {
  const response = await fetch(url, {
    method: "GET",
    headers: { "x-webhook-secret": secret, "accept": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text().catch(() => "");
  let json: any | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, json };
}

async function main(): Promise<void> {
  const secret = String(process.env.AERODATABOX_WEBHOOK_SECRET ?? "").trim();
  if (secret.length < 32) throw new Error("BLOCKED:PHASE2F_LOCAL_WEBHOOK_SECRET_REQUIRED");
  const origin = resolveOrigin();
  const diagnosticsUrl = `${origin}/api/v1/collection/diagnostics`;

  const wrong = `phase2f-wrong-${randomBytes(16).toString("hex")}`;
  const rejected = await getStatus(diagnosticsUrl, wrong);
  if (rejected.status !== 403) {
    throw new Error(`BLOCKED:PHASE2F_DEPLOYMENT_SECRET_NOT_ENFORCED:wrong_secret_http=${rejected.status}`);
  }

  const accepted = await getStatus(diagnosticsUrl, secret);
  if (accepted.status !== 200 || !accepted.json || typeof accepted.json !== "object") {
    throw new Error(`BLOCKED:PHASE2F_DEPLOYMENT_EXACT_SECRET_OR_RUNTIME_DB_FAILED:http=${accepted.status}`);
  }
  for (const key of ["batches", "rawDeliveries", "openIncidents", "samplingDraws"]) {
    if (!Number.isInteger(Number(accepted.json[key])) || Number(accepted.json[key]) < 0) {
      throw new Error(`BLOCKED:PHASE2F_DEPLOYMENT_DIAGNOSTICS_INVALID:${key}`);
    }
  }
  const openIncidents = Number(accepted.json.openIncidents);
  if (openIncidents !== 0) throw new Error(`BLOCKED:PHASE2F_DEPLOYMENT_OPEN_INCIDENTS:${openIncidents}`);

  const artifact = buildPhase2FDeploymentBindingV39({
    checkedAtUtc: new Date().toISOString(),
    deploymentOrigin: origin,
    openIncidents,
  });
  const raw = JSON.stringify(artifact, null, 2) + "\n";
  const out = resolve(arg("--out") ?? DEFAULT_OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, raw, { encoding: "utf8", flag: "wx" });
  const loaded = loadPhase2FDeploymentBindingV39(out);

  const ledger = existsSync(LEDGER) ? readFileSync(LEDGER, "utf8") : "";
  if (!ledger.includes(loaded.evidenceId)) {
    appendFileSync(LEDGER, [
      "",
      `### ${loaded.evidenceId} — Phase 2F production deployment binding`,
      `- evidence_id: ${loaded.evidenceId}`,
      `- deployment_origin: ${loaded.artifact.deployment_origin}`,
      `- DEPLOYMENT_BINDING_ARTIFACT_SHA256:${loaded.artifact.artifact_sha256}`,
      `- DEPLOYMENT_BINDING_FILE_SHA256:${loaded.fileSha256}`,
      `- DEPLOYMENT_BINDING_SHA256:${loaded.bindingSha256}`,
      `- wrong_secret_rejected_403: true`,
      `- exact_secret_accepted_200: true`,
      `- deployed_v39_runtime_db_read: true`,
      `- open_incidents: 0`,
      `- paid_or_mutating_provider_action: false`,
      "",
    ].join("\n"), "utf8");
  }

  console.log(JSON.stringify({
    status: "PASS",
    deployment_origin: loaded.artifact.deployment_origin,
    wrong_secret_rejected_403: true,
    exact_secret_accepted_200: true,
    deployed_v39_runtime_db_read: true,
    open_incidents: 0,
    evidence_id: loaded.evidenceId,
    artifact_sha256: loaded.artifact.artifact_sha256,
    file_sha256: loaded.fileSha256,
    binding_sha256: loaded.bindingSha256,
    freshness_minutes: 30,
    provider_subscription_created: false,
    provider_paid_action: false,
    next: "Freeze Phase-2F smoke runtime and prepare exact draft AUTH before this receipt expires",
  }, null, 2));
}

main().catch((error: any) => {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
});
