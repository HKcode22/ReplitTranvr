import { createHash } from "crypto";
import { readFileSync } from "fs";
import { loadPreprobeHandoffBindingV39, type PreprobeHandoffBindingV39 } from "./phase2Handoff_v39";
import { loadPhase2FSmokeRuntimeV39, type LoadedPhase2FSmokeRuntimeV39 } from "./phase2SmokeRuntime_v39";

const SMOKE_SCHEMA = "v39.phase2-safety-smoke.v1";
export type Phase2FIngressKindV39 = "production-deployment" | "replit-workspace-live";

function sha256(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export interface Phase2SmokeEvidenceV39 {
  schema: typeof SMOKE_SCHEMA;
  status: "PASS";
  authorizationId: string;
  authorizationArtifactSha256: string;
  preprobeEvidenceId: string;
  preprobeArtifactSha256: string;
  preprobeFileSha256: string;
  preprobeBindingSha256: string;
  smokeRuntimeEvidenceId: string;
  smokeRuntimeArtifactSha256: string;
  smokeRuntimeFileSha256: string;
  smokeRuntimeBindingSha256: string;
  ingressBindingKind: Phase2FIngressKindV39;
  ingressBindingEvidenceId: string;
  ingressBindingArtifactSha256: string;
  ingressBindingFileSha256: string;
  ingressBindingSha256: string;
  ingressOrigin: string;
  icao: string;
  filter: "FlightByAirportIcao";
  windowMinutes: number;
  alertCeiling: number;
  restUnitsAuthorized: 0;
  protectedAlertFloor: number;
  preSmokeUnsettledBurstMarginCredits: number;
  measuredMaxUnsettledCreditGap: number;
  unsettledBurstMarginCredits: number;
  rowsDelivered: number;
  uniqueFlights: number;
  tailChainLinks: number;
  confirmedUniqueLower: number;
  confirmedPlusAmbiguousUpper: number;
  ambiguousUnknown: number;
  settlementReads: number;
  settlementInitialWaitSeconds: number;
  settlementPollIntervalSeconds: number;
  settlementStableReadCount: number;
  settlementTimeoutSeconds: number;
  watchdogPollMs: number;
  exactExternalInternalReconciliation: true;
  rawBefore2xxPathVerified: true;
  providerContentCleanupVerified: true;
  ownedSubscriptionDeleted: true;
  foreignActiveBillableBefore: 0;
  foreignActiveBillableAfter: 0;
  generatedAtUtc: string;
}

export interface Phase2SmokeHandoffBindingV39 {
  evidenceId: string;
  smoke: Phase2SmokeEvidenceV39;
  smokeFileSha256: string;
  smokeBindingSha256: string;
  preprobe: PreprobeHandoffBindingV39;
  runtime: LoadedPhase2FSmokeRuntimeV39;
}

function nonnegativeInteger(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`SMOKE_HANDOFF_${label.toUpperCase()}_INVALID`);
  return n;
}
function positiveInteger(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`SMOKE_HANDOFF_${label.toUpperCase()}_INVALID`);
  return n;
}
function requireSha(value: unknown, label: string): string {
  const text = String(value ?? "");
  if (!/^[a-f0-9]{64}$/i.test(text)) throw new Error(`SMOKE_HANDOFF_${label.toUpperCase()}_INVALID`);
  return text.toLowerCase();
}

function normalizeIngress(x: Record<string, unknown>): {
  kind: Phase2FIngressKindV39;
  evidenceId: string;
  artifactSha256: string;
  fileSha256: string;
  bindingSha256: string;
  origin: string;
} {
  // New generic ingress evidence. Workspace-live evidence is never represented
  // as a deployment. Production-deployment remains an allowed explicit kind.
  if (x.ingressBindingKind !== undefined) {
    const kind = String(x.ingressBindingKind) as Phase2FIngressKindV39;
    if (!(["production-deployment", "replit-workspace-live"] as string[]).includes(kind)) {
      throw new Error("SMOKE_HANDOFF_INGRESS_KIND_INVALID");
    }
    const evidenceId = String(x.ingressBindingEvidenceId ?? "");
    if (!/^RUN-\d{8}-[A-F0-9]{64}$/.test(evidenceId)) throw new Error("SMOKE_HANDOFF_INGRESS_EVIDENCE_ID_INVALID");
    const artifactSha256 = requireSha(x.ingressBindingArtifactSha256, "ingress_artifact_sha256");
    const fileSha256 = requireSha(x.ingressBindingFileSha256, "ingress_file_sha256");
    const bindingSha256 = requireSha(x.ingressBindingSha256, "ingress_binding_sha256");
    const rawOrigin = String(x.ingressOrigin ?? "");
    let origin: URL;
    try { origin = new URL(rawOrigin); } catch { throw new Error("SMOKE_HANDOFF_INGRESS_ORIGIN_INVALID"); }
    if (origin.protocol !== "https:" || origin.origin !== rawOrigin) throw new Error("SMOKE_HANDOFF_INGRESS_ORIGIN_INVALID");
    if (kind === "replit-workspace-live" && (!origin.hostname.endsWith(".replit.dev") || origin.hostname.includes("travnr.com"))) {
      throw new Error("SMOKE_HANDOFF_WORKSPACE_INGRESS_ORIGIN_INVALID");
    }
    return { kind, evidenceId, artifactSha256, fileSha256, bindingSha256, origin: origin.origin };
  }

  // Backward-compatible loader for historical production smoke artifacts.
  const evidenceId = String(x.deploymentBindingEvidenceId ?? "");
  if (!/^RUN-\d{8}-[A-F0-9]{64}$/.test(evidenceId)) throw new Error("SMOKE_HANDOFF_DEPLOYMENT_EVIDENCE_ID_INVALID");
  const artifactSha256 = requireSha(x.deploymentBindingArtifactSha256, "deployment_artifact_sha256");
  const fileSha256 = requireSha(x.deploymentBindingFileSha256, "deployment_file_sha256");
  const bindingSha256 = requireSha(x.deploymentBindingSha256, "deployment_binding_sha256");
  return { kind: "production-deployment", evidenceId, artifactSha256, fileSha256, bindingSha256, origin: "https://travnr.com" };
}

export function loadPhase2SmokeHandoffV39(input: {
  smokePath: string;
  preprobePath: string;
  runtimePath: string;
  expectedRuntimeFileSha256?: string | null;
}): Phase2SmokeHandoffBindingV39 {
  const preprobe = loadPreprobeHandoffBindingV39(input.preprobePath);
  const runtime = loadPhase2FSmokeRuntimeV39({
    runtimePath: input.runtimePath,
    expectedFileSha256: input.expectedRuntimeFileSha256,
    preprobePath: input.preprobePath,
  });
  if (runtime.preprobe.bindingSha256 !== preprobe.bindingSha256) {
    throw new Error("SMOKE_HANDOFF_RUNTIME_PREPROBE_BINDING_MISMATCH");
  }

  const raw = readFileSync(input.smokePath, "utf8");
  const smokeFileSha256 = sha256(raw);
  const x = JSON.parse(raw) as Record<string, unknown>;
  if (x.schema !== SMOKE_SCHEMA || x.status !== "PASS") throw new Error("SMOKE_HANDOFF_ARTIFACT_NOT_PASS");
  if (x.preprobeEvidenceId !== preprobe.evidenceId ||
      x.preprobeArtifactSha256 !== preprobe.artifactSha256 ||
      x.preprobeFileSha256 !== preprobe.fileSha256 ||
      x.preprobeBindingSha256 !== preprobe.bindingSha256) {
    throw new Error("SMOKE_HANDOFF_PREPROBE_BINDING_MISMATCH");
  }
  if (x.smokeRuntimeEvidenceId !== runtime.evidenceId ||
      x.smokeRuntimeArtifactSha256 !== runtime.runtime.artifact_sha256 ||
      x.smokeRuntimeFileSha256 !== runtime.fileSha256 ||
      x.smokeRuntimeBindingSha256 !== runtime.bindingSha256) {
    throw new Error("SMOKE_HANDOFF_RUNTIME_BINDING_MISMATCH");
  }
  const ingress = normalizeIngress(x);
  if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(String(x.authorizationId ?? ""))) throw new Error("SMOKE_HANDOFF_AUTH_ID_INVALID");
  if (!/^[a-f0-9]{64}$/i.test(String(x.authorizationArtifactSha256 ?? ""))) throw new Error("SMOKE_HANDOFF_AUTH_SHA_INVALID");
  if (!/^[A-Z0-9]{4}$/.test(String(x.icao ?? "")) || x.filter !== "FlightByAirportIcao") throw new Error("SMOKE_HANDOFF_SCOPE_INVALID");
  const windowMinutes = positiveInteger(x.windowMinutes, "window_minutes");
  if (windowMinutes > 15) throw new Error("SMOKE_HANDOFF_WINDOW_TOO_LONG");
  positiveInteger(x.alertCeiling, "alert_ceiling");
  if (Number(x.restUnitsAuthorized) !== 0) throw new Error("SMOKE_HANDOFF_REST_UNITS_NOT_ZERO");
  if (Number(x.foreignActiveBillableBefore) !== 0 || Number(x.foreignActiveBillableAfter) !== 0) {
    throw new Error("SMOKE_HANDOFF_FOREIGN_SUBSCRIPTION_PRESENT");
  }
  for (const field of [
    "exactExternalInternalReconciliation",
    "rawBefore2xxPathVerified",
    "providerContentCleanupVerified",
    "ownedSubscriptionDeleted",
  ]) {
    if (x[field] !== true) throw new Error(`SMOKE_HANDOFF_${field.toUpperCase()}_NOT_TRUE`);
  }
  positiveInteger(x.rowsDelivered, "rows_delivered");
  positiveInteger(x.settlementReads, "settlement_reads");
  const stableReads = positiveInteger(x.settlementStableReadCount, "settlement_stable_read_count");
  if (stableReads < 3 || Number(x.settlementReads) < stableReads) throw new Error("SMOKE_HANDOFF_SETTLEMENT_STABILITY_INVALID");
  const initialWait = nonnegativeInteger(x.settlementInitialWaitSeconds, "settlement_initial_wait_seconds");
  const poll = positiveInteger(x.settlementPollIntervalSeconds, "settlement_poll_interval_seconds");
  const timeout = positiveInteger(x.settlementTimeoutSeconds, "settlement_timeout_seconds");
  const watchdog = positiveInteger(x.watchdogPollMs, "watchdog_poll_ms");
  if (initialWait !== runtime.runtime.settlement_initial_wait_seconds ||
      poll !== runtime.runtime.settlement_poll_interval_seconds ||
      stableReads !== runtime.runtime.settlement_stable_read_count ||
      timeout !== runtime.runtime.settlement_timeout_seconds ||
      watchdog !== runtime.runtime.watchdog_poll_ms) {
    throw new Error("SMOKE_HANDOFF_FROZEN_CONTROL_MISMATCH");
  }
  const preMargin = nonnegativeInteger(x.preSmokeUnsettledBurstMarginCredits, "pre_smoke_margin");
  if (preMargin !== runtime.runtime.pre_smoke_unsettled_burst_margin_credits) {
    throw new Error("SMOKE_HANDOFF_PRE_SMOKE_MARGIN_MISMATCH");
  }
  const measuredGap = nonnegativeInteger(x.measuredMaxUnsettledCreditGap, "measured_gap");
  const margin = nonnegativeInteger(x.unsettledBurstMarginCredits, "unsettled_margin");
  if (margin < preMargin || margin < measuredGap) throw new Error("SMOKE_HANDOFF_UNSETTLED_MARGIN_NOT_CONSERVATIVE");
  const generated = new Date(String(x.generatedAtUtc ?? ""));
  if (!Number.isFinite(generated.getTime())) throw new Error("SMOKE_HANDOFF_GENERATED_AT_INVALID");

  const normalized = {
    ...x,
    ingressBindingKind: ingress.kind,
    ingressBindingEvidenceId: ingress.evidenceId,
    ingressBindingArtifactSha256: ingress.artifactSha256,
    ingressBindingFileSha256: ingress.fileSha256,
    ingressBindingSha256: ingress.bindingSha256,
    ingressOrigin: ingress.origin,
  };
  const smoke = normalized as unknown as Phase2SmokeEvidenceV39;
  const smokeBindingSha256 = sha256(
    `v39-phase2-smoke-handoff-v3:${preprobe.bindingSha256}:${runtime.bindingSha256}:${ingress.bindingSha256}:${smokeFileSha256}`,
  );
  const date = generated.toISOString().slice(0, 10).replaceAll("-", "");
  const evidenceId = `RUN-${date}-${smokeBindingSha256.toUpperCase()}`;
  return { evidenceId, smoke, smokeFileSha256, smokeBindingSha256, preprobe, runtime };
}
