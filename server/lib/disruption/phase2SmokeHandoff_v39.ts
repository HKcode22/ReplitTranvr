import { createHash } from "crypto";
import { readFileSync } from "fs";
import { loadPreprobeHandoffBindingV39, type PreprobeHandoffBindingV39 } from "./phase2Handoff_v39";

const SMOKE_SCHEMA = "v39.phase2-safety-smoke.v1";

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

export function loadPhase2SmokeHandoffV39(input: {
  smokePath: string;
  preprobePath: string;
}): Phase2SmokeHandoffBindingV39 {
  const preprobe = loadPreprobeHandoffBindingV39(input.preprobePath);
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
  nonnegativeInteger(x.settlementInitialWaitSeconds, "settlement_initial_wait_seconds");
  positiveInteger(x.settlementPollIntervalSeconds, "settlement_poll_interval_seconds");
  positiveInteger(x.settlementTimeoutSeconds, "settlement_timeout_seconds");
  positiveInteger(x.watchdogPollMs, "watchdog_poll_ms");
  const preMargin = nonnegativeInteger(x.preSmokeUnsettledBurstMarginCredits, "pre_smoke_margin");
  const measuredGap = nonnegativeInteger(x.measuredMaxUnsettledCreditGap, "measured_gap");
  const margin = nonnegativeInteger(x.unsettledBurstMarginCredits, "unsettled_margin");
  if (margin < preMargin || margin < measuredGap) throw new Error("SMOKE_HANDOFF_UNSETTLED_MARGIN_NOT_CONSERVATIVE");
  const generated = new Date(String(x.generatedAtUtc ?? ""));
  if (!Number.isFinite(generated.getTime())) throw new Error("SMOKE_HANDOFF_GENERATED_AT_INVALID");

  const smoke = x as unknown as Phase2SmokeEvidenceV39;
  const smokeBindingSha256 = sha256(
    `v39-phase2-smoke-handoff-v1:${preprobe.bindingSha256}:${smokeFileSha256}`,
  );
  const date = generated.toISOString().slice(0, 10).replaceAll("-", "");
  const evidenceId = `RUN-${date}-${smokeBindingSha256.toUpperCase()}`;
  return { evidenceId, smoke, smokeFileSha256, smokeBindingSha256, preprobe };
}
