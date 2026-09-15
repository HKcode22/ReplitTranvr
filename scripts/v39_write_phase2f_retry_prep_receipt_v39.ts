import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { loadPhase2FWorkspaceIngressBindingV39 } from "../server/lib/disruption/phase2WorkspaceIngressBinding_v39";
import { loadPhase2FSmokeRuntimeV39 } from "../server/lib/disruption/phase2SmokeRuntime_v39";
import type { AuthRecord } from "../server/lib/disruption/authRecord_v39";

const LEDGER = path.join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
const PREPROBE = path.resolve("artifacts/preprobe-reference-freeze-record.json");

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function sha256(raw: Buffer | string): string {
  return createHash("sha256").update(raw).digest("hex");
}
function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main(): void {
  const callbackPath = path.resolve(required("--callback"));
  const ingressPath = path.resolve(required("--ingress"));
  const runtimePath = path.resolve(required("--runtime"));
  const runtimeSha = required("--runtime-sha").toLowerCase();
  const authPath = path.resolve(required("--auth"));
  const out = path.resolve(required("--out"));

  if (!/^[a-f0-9]{64}$/.test(runtimeSha)) throw new Error("BLOCKED:PREP_RUNTIME_SHA_INVALID");
  if (!fs.existsSync(LEDGER)) throw new Error("BLOCKED:PREP_LEDGER_MISSING");

  const callbackRaw = fs.readFileSync(callbackPath);
  const callback = JSON.parse(callbackRaw.toString("utf8"));
  if (callback?.schema !== "v39.phase2f-workspace-callback-verification.v1" || callback?.status !== "PASS" ||
      callback?.deploymentPerformed !== false || callback?.providerCalled !== false ||
      callback?.providerSubscriptionCreated !== false || Number(callback?.alertCreditsSpent) !== 0) {
    throw new Error("BLOCKED:PREP_CALLBACK_NOT_SAFE_PASS");
  }

  const ingress = loadPhase2FWorkspaceIngressBindingV39(ingressPath);
  if (ingress.artifact.callback_receipt_sha256 !== sha256(callbackRaw)) {
    throw new Error("BLOCKED:PREP_INGRESS_CALLBACK_SHA_MISMATCH");
  }
  if (ingress.artifact.callback_origin !== callback.callbackOrigin ||
      ingress.artifact.callback_runtime_git_head.toLowerCase() !== String(callback.gitHead).toLowerCase()) {
    throw new Error("BLOCKED:PREP_INGRESS_CALLBACK_IDENTITY_MISMATCH");
  }

  const runtime = loadPhase2FSmokeRuntimeV39({
    runtimePath,
    expectedFileSha256: runtimeSha,
    preprobePath: PREPROBE,
  });

  const authRaw = fs.readFileSync(authPath, "utf8");
  const authSha = sha256(authRaw);
  const auth = JSON.parse(authRaw) as AuthRecord;
  if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(String(auth.authorizationId ?? ""))) throw new Error("BLOCKED:PREP_AUTH_ID_INVALID");
  if (auth.phaseGate !== "Phase 2 / safety smoke") throw new Error("BLOCKED:PREP_AUTH_PHASE_INVALID");
  if (auth.airportFilterWindow !== "FlightByAirportIcao:WSSS;window_minutes=5") throw new Error("BLOCKED:PREP_AUTH_SCOPE_INVALID");
  if (Number(auth.maxAlertCredits) !== 100) throw new Error("BLOCKED:PREP_AUTH_ALERT_CEILING_INVALID");
  if (auth.maxRestUnitsByCategory !== null && Object.values(auth.maxRestUnitsByCategory ?? {}).some((v) => Number(v) !== 0)) {
    throw new Error("BLOCKED:PREP_AUTH_REST_NOT_ZERO");
  }
  if (!String(auth.cleanupOwner ?? "").trim()) throw new Error("BLOCKED:PREP_AUTH_CLEANUP_OWNER_MISSING");
  const expectedPredecessors = [runtime.preprobe.evidenceId, runtime.evidenceId];
  if (!Array.isArray(auth.predecessorEvidenceIds) || auth.predecessorEvidenceIds.length !== 2 ||
      auth.predecessorEvidenceIds.some((id, i) => id !== expectedPredecessors[i])) {
    throw new Error("BLOCKED:PREP_AUTH_PREDECESSORS_INVALID");
  }
  const starts = Date.parse(String(auth.startNotBeforeUtc ?? ""));
  const expires = Date.parse(String(auth.expiresAtUtc ?? ""));
  if (!Number.isFinite(starts) || !Number.isFinite(expires) || expires <= starts || expires <= Date.now()) {
    throw new Error("BLOCKED:PREP_AUTH_TIME_WINDOW_INVALID");
  }

  const ledger = fs.readFileSync(LEDGER, "utf8");
  if (ledger.includes(`AUTH_ARTIFACT_SHA256:${authSha}`)) {
    throw new Error("BLOCKED:PREP_AUTH_ALREADY_APPROVED");
  }
  for (const token of [
    runtime.preprobe.evidenceId,
    runtime.evidenceId,
    ingress.evidenceId,
    `INGRESS_BINDING_SHA256:${ingress.bindingSha256}`,
  ]) {
    if (!ledger.includes(token)) throw new Error(`BLOCKED:PREP_EVIDENCE_NOT_RECORDED:${token}`);
  }

  const gitHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().toLowerCase();
  if (gitHead !== ingress.artifact.binding_creator_git_head.toLowerCase()) {
    throw new Error("BLOCKED:PREP_GIT_HEAD_CHANGED_AFTER_INGRESS_BINDING");
  }

  const receipt = {
    schema: "v39.phase2f-retry-prep.v1",
    status: "PASS_DRAFT_ONLY_NOT_AUTHORIZED",
    preparedAtUtc: new Date().toISOString(),
    gitHead,
    phase: "Phase 2F mandatory safety smoke retry",
    executionEnvironment: "replit-workspace-live",
    deploymentPerformed: false,
    providerPaidOrMutatingActionPerformed: false,
    alertCreditsSpentDuringPrep: 0,
    authorizationStatus: "DRAFT_ONLY_NOT_AUTHORIZED",
    workspaceCallback: {
      path: path.relative(process.cwd(), callbackPath),
      sha256: sha256(callbackRaw),
      origin: callback.callbackOrigin,
      runtimeGitHead: callback.gitHead,
    },
    workspaceIngress: {
      path: path.relative(process.cwd(), ingressPath),
      evidenceId: ingress.evidenceId,
      artifactSha256: ingress.artifact.artifact_sha256,
      fileSha256: ingress.fileSha256,
      bindingSha256: ingress.bindingSha256,
    },
    smokeRuntime: {
      path: path.relative(process.cwd(), runtimePath),
      evidenceId: runtime.evidenceId,
      artifactSha256: runtime.runtime.artifact_sha256,
      fileSha256: runtime.fileSha256,
      bindingSha256: runtime.bindingSha256,
      preSmokeMarginCredits: runtime.runtime.pre_smoke_unsettled_burst_margin_credits,
      settlementInitialWaitSeconds: runtime.runtime.settlement_initial_wait_seconds,
      settlementPollIntervalSeconds: runtime.runtime.settlement_poll_interval_seconds,
      settlementStableReadCount: runtime.runtime.settlement_stable_read_count,
      settlementTimeoutSeconds: runtime.runtime.settlement_timeout_seconds,
      watchdogPollMs: runtime.runtime.watchdog_poll_ms,
    },
    draftAuthorization: {
      path: path.relative(process.cwd(), authPath),
      authorizationId: auth.authorizationId,
      sha256: authSha,
      airportFilterWindow: auth.airportFilterWindow,
      maxAlertCredits: auth.maxAlertCredits,
      maxRestUnitsByCategory: auth.maxRestUnitsByCategory,
      startNotBeforeUtc: auth.startNotBeforeUtc,
      expiresAtUtc: auth.expiresAtUtc,
      cleanupOwner: auth.cleanupOwner,
      predecessorEvidenceIds: auth.predecessorEvidenceIds,
    },
    nextPermittedAction: "HUMAN_REVIEW_AND_EXPLICIT_APPROVAL_OF_EXACT_DRAFT_AUTH_ONLY",
    paidSmokeMayRunNow: false,
  };

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  const outRaw = fs.readFileSync(out);

  console.log(JSON.stringify({
    status: receipt.status,
    prep_receipt: path.relative(process.cwd(), out),
    prep_receipt_sha256: sha256(outRaw),
    authorization_status: receipt.authorizationStatus,
    authorization_id: auth.authorizationId,
    auth_file: path.relative(process.cwd(), authPath),
    auth_artifact_sha256: authSha,
    airport_filter_window: auth.airportFilterWindow,
    max_alert_credits: auth.maxAlertCredits,
    start_not_before_utc: auth.startNotBeforeUtc,
    expires_at_utc: auth.expiresAtUtc,
    workspace_callback_origin: callback.callbackOrigin,
    workspace_ingress_evidence_id: ingress.evidenceId,
    workspace_ingress_binding_sha256: ingress.bindingSha256,
    smoke_runtime_evidence_id: runtime.evidenceId,
    smoke_runtime_file_sha256: runtime.fileSha256,
    deployment_performed: false,
    provider_paid_or_mutating_action_performed: false,
    alert_credits_spent_during_prep: 0,
    paid_smoke_may_run_now: false,
    next: receipt.nextPermittedAction,
  }, null, 2));
}

try { main(); }
catch (error: any) { console.error(String(error?.message ?? error)); process.exitCode = 1; }
