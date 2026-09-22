import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { loadFrozenProbeArtifact } from "../server/lib/disruption/anchorPromotion_v39";
import {
  loadPhase2gCompact6AmendmentV39,
  PHASE2G_COMPACT6_ARTIFACT_PATH,
  PHASE2G_COMPACT6_P2G09_RECOVERY_ARTIFACT_PATH,
} from "../server/lib/disruption/phase2Compact6_v39";
import {
  classifyProbeReconciliationV39,
  PROBE_DELIVERY_COMPLETENESS_FLOOR_V39,
} from "../server/lib/disruption/prepaidProbeWindow_v39";
import {
  isP2g06PostfixWsssValidationEligibleV39,
  isP2g09HostResetRecoveryEligibleV39,
  type Stage1AttemptEvidence,
} from "../scripts/v39_probe_stage1_owner_v39";

const PREPROBE_PATH = join(process.cwd(), "artifacts", "preprobe-reference-freeze-record.json");
const PREPROBE_SHA = "b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870";
const COMPACT6_PATH = join(process.cwd(), PHASE2G_COMPACT6_ARTIFACT_PATH);
const sha256 = (raw: string) => createHash("sha256").update(raw, "utf8").digest("hex");

function attempt(
  probeId: number,
  icao: string,
  status: string,
  durationCensored: boolean,
  reconciliationStatus: string | null,
  stopReason: string | null,
): Stage1AttemptEvidence {
  return {
    probeId,
    icao,
    status,
    rowsPerHour: status === "completed" ? 100 : null,
    creditsSpent: status === "completed" ? 1 : null,
    uniqueFlightsPerCredit: status === "completed" ? 0.25 : null,
    tailChainLinksPerCredit: status === "completed" ? 0.01 : null,
    stability: status === "completed" ? 0.5 : null,
    confirmedUniqueLower: status === "completed" ? 0.25 : null,
    confirmedPlusAmbiguousUpper: status === "completed" ? 0.25 : null,
    durationCensored,
    reconciliationStatus,
    stopReason,
    recordedAtUtc: new Date(Date.UTC(2026, 8, 15 + probeId)).toISOString(),
  };
}

describe("Phase2G compact-6 amendment", () => {
  it("is hash-bound to the immutable original preprobe and covers all six macro-regions", () => {
    const preprobe = loadFrozenProbeArtifact(PREPROBE_PATH, PREPROBE_SHA);
    const raw = readFileSync(COMPACT6_PATH, "utf8");
    const loaded = loadPhase2gCompact6AmendmentV39({
      expectedSha256: sha256(raw),
      sourcePreprobeFileSha256: PREPROBE_SHA,
      preprobe: preprobe.artifact,
      path: COMPACT6_PATH,
    });
    expect(loaded.effectiveShortlist.map((x) => x.icao)).toEqual([
      "WSSS", "OMAA", "MMUN", "LKPR", "SKBO", "YSSY",
    ]);
    expect(new Set(loaded.effectiveShortlist.map((x) => x.region)).size).toBe(6);
    expect(loaded.amendment.p2g06_excluded_from_final_scoring).toBe(true);
    expect(loaded.amendment.wsss_postfix_validation_rerun.maximum_additional_attempts).toBe(1);
  });

  it("loads the prospective P2G09 host-reset recovery artifact with one bounded GitHub-owner attempt", () => {
    const preprobe = loadFrozenProbeArtifact(PREPROBE_PATH, PREPROBE_SHA);
    const p = join(process.cwd(), PHASE2G_COMPACT6_P2G09_RECOVERY_ARTIFACT_PATH);
    const raw = readFileSync(p, "utf8");
    const loaded = loadPhase2gCompact6AmendmentV39({
      expectedSha256: sha256(raw),
      sourcePreprobeFileSha256: PREPROBE_SHA,
      preprobe: preprobe.artifact,
      path: p,
    });
    const recovery = loaded.amendment.p2g09_hostreset_recovery_rerun;
    expect(recovery?.authorized).toBe(true);
    expect(recovery?.maximum_additional_attempts).toBe(1);
    expect(recovery?.failed_probe_id).toBe(7);
    expect(recovery?.requires_owner_executor).toBe("github-actions");
    expect(recovery?.requires_live_callback_verification).toBe(true);
    expect(recovery?.requires_deferred_cleanup_state_machine).toBe(true);
    expect(recovery?.no_further_automatic_wsss_retry).toBe(true);
    expect(recovery?.outcome_metrics_not_used_to_authorize).toBe(true);
  });

  it("matches the P2G09 recovery only before a sixth WSSS attempt exists", () => {
    const evidence = [
      attempt(1, "WSSS", "failed", true, "UNRESOLVED", "supervisor_child_exit_before_runtime_session"),
      attempt(2, "OMAA", "completed", false, "MATCH", null),
      attempt(3, "MMUN", "failed", true, "UNRESOLVED", "supervisor_child_exit_after_runtime_reset_recovered"),
      attempt(4, "WSSS", "failed", false, "MISMATCH", "external_internal_credit_mismatch"),
      attempt(5, "WSSS", "failed", true, "UNRESOLVED", "subscription_delete_failed"),
      attempt(6, "WSSS", "failed", true, "MATCH", "balance_read_failed_after_retries"),
      attempt(7, "WSSS", "failed", true, "UNRESOLVED", "supervisor_child_exit_recovered"),
    ];
    expect(isP2g09HostResetRecoveryEligibleV39(evidence)).toBe(true);
    expect(isP2g09HostResetRecoveryEligibleV39([
      ...evidence,
      attempt(8, "WSSS", "failed", true, "UNRESOLVED", "supervisor_child_exit_recovered"),
    ])).toBe(false);
  });

  it("loads the prospective compact6 v2 rule without rewriting the historical v1 freeze", () => {
    const preprobe = loadFrozenProbeArtifact(PREPROBE_PATH, PREPROBE_SHA);
    const path = join(process.cwd(), PHASE2G_COMPACT6_RECONCILIATION_V2_ARTIFACT_PATH);
    const raw = readFileSync(path, "utf8");
    const loaded = loadPhase2gCompact6AmendmentV39({
      expectedSha256: sha256(raw),
      sourcePreprobeFileSha256: PREPROBE_SHA,
      preprobe: preprobe.artifact,
      path,
    });
    expect(loaded.amendment.schema_version).toBe("v39-phase2g-compact6-amendment-2");
    expect(loaded.amendment.prospective_reconciliation_policy.max_missing_billed_items).toBe(1);
    expect(loaded.amendment.prospective_reconciliation_policy.delivery_completeness_floor).toBe(0.99);
    expect(loaded.amendment.anti_bias.no_retroactive_P2G06_pass).toBe(true);
  });

  it("authorizes exactly the historical P2G06 pattern for one post-fix WSSS validation", () => {
    const evidence = [
      attempt(1, "WSSS", "failed", true, "UNRESOLVED", "supervisor_child_exit_before_runtime_session"),
      attempt(2, "OMAA", "completed", false, "MATCH", null),
      attempt(3, "MMUN", "failed", true, "UNRESOLVED", "supervisor_child_exit_after_runtime_reset_recovered"),
      attempt(4, "WSSS", "failed", false, "MISMATCH", "external_internal_credit_mismatch"),
    ];
    expect(isP2g06PostfixWsssValidationEligibleV39(evidence)).toBe(true);

    const afterAnotherWsss = [
      ...evidence,
      attempt(5, "WSSS", "failed", false, "MISMATCH", "external_internal_credit_mismatch"),
    ];
    expect(isP2g06PostfixWsssValidationEligibleV39(afterAnotherWsss)).toBe(false);
  });
});

describe("Phase2G prospective reconciliation classification", () => {
  it("keeps exact equality as MATCH", () => {
    expect(classifyProbeReconciliationV39({
      ownerKind: "anchor_probe",
      externalCredits: 220,
      internalSendCredits: 220,
      costItemDisagreementCount: 0,
    }).status).toBe("MATCH");
  });

  it("classifies positive external-minus-received accounting as diagnostic DELIVERY_GAP", () => {
    const result = classifyProbeReconciliationV39({
      ownerKind: "anchor_probe",
      externalCredits: 220,
      internalSendCredits: 219,
      costItemDisagreementCount: 0,
    });
    expect(PROBE_DELIVERY_COMPLETENESS_FLOOR_V39).toBe(0.99);
    expect(result.status).toBe("DELIVERY_GAP");
    expect(result.deliveryGapCredits).toBe(1);
    expect(result.deliveryCompleteness).toBeCloseTo(219 / 220, 12);
  });

  it("does not allow the safety-smoke owner to use the anchor delivery-gap tolerance", () => {
    expect(classifyProbeReconciliationV39({
      ownerKind: "phase2_safety_smoke",
      externalCredits: 220,
      internalSendCredits: 219,
      costItemDisagreementCount: 0,
    }).status).toBe("MISMATCH");
  });

  it("hard-fails contradictory internal-greater-than-external accounting", () => {
    const result = classifyProbeReconciliationV39({
      ownerKind: "anchor_probe",
      externalCredits: 219,
      internalSendCredits: 220,
      costItemDisagreementCount: 0,
    });
    expect(result.status).toBe("MISMATCH");
    expect(result.deliveryGapCredits).toBe(-1);
  });

  it("hard-fails a delivery-cost/item disagreement even at exact total credits", () => {
    expect(classifyProbeReconciliationV39({
      ownerKind: "anchor_probe",
      externalCredits: 220,
      internalSendCredits: 220,
      costItemDisagreementCount: 1,
    }).status).toBe("MISMATCH");
  });

  it("hard-fails a gap larger than one billed item", () => {
    const result = classifyProbeReconciliationV39({
      ownerKind: "anchor_probe",
      externalCredits: 220,
      internalSendCredits: 218,
      costItemDisagreementCount: 0,
    });
    expect(result.deliveryGapCredits).toBe(2);
    expect(result.status).toBe("MISMATCH");
  });

  it("hard-fails a one-item gap when delivery completeness is below the frozen floor", () => {
    const result = classifyProbeReconciliationV39({
      ownerKind: "anchor_probe",
      externalCredits: 10,
      internalSendCredits: 9,
      costItemDisagreementCount: 0,
    });
    expect(result.deliveryCompleteness).toBe(0.9);
    expect(result.status).toBe("MISMATCH");
  });
});

describe("Phase2G execution source contract", () => {
  const execution = readFileSync(
    join(process.cwd(), "server", "lib", "disruption", "probeExecutionPrepaid_v39.ts"),
    "utf8",
  );
  const migration = readFileSync(
    join(process.cwd(), "migrations", "0058_phase2g_reconciliation_evidence.sql"),
    "utf8",
  );

  it("uses authoritative external spend as the Stage1 yield denominator", () => {
    expect(execution).toContain("const denominator = result.externalCredits;");
    expect(execution).toContain('result.reconciliationStatus === "DELIVERY_GAP"');
    expect(execution).toContain("const denominator = result.externalCredits;");
    expect(execution).toContain("const upperIdentityCount =");
    expect(execution).toContain("result.metrics.confirmedPlusAmbiguousUpper + deliveryGapCredits");
  });

  it("allows only evidenced MATCH or bounded DELIVERY_GAP as completed safe-mode reconciliation states", () => {
    expect(migration).toContain("reconciliation_status IN ('MATCH','DELIVERY_GAP')");
    expect(migration).toContain("clean.adb_probe_reconciliation_evidence");
    expect(migration).toContain("Phase-2G reconciliation evidence is append-only");
  });
});

describe("Phase2G callback and cleanup evidence ordering", () => {
  const runtime = readFileSync(
    join(process.cwd(), "server", "lib", "disruption", "prepaidProbeRuntime_v39.ts"),
    "utf8",
  );
  const windowSource = readFileSync(
    join(process.cwd(), "server", "lib", "disruption", "prepaidProbeWindow_v39.ts"),
    "utf8",
  );
  const routes = readFileSync(
    join(process.cwd(), "server", "routes_v3.ts"),
    "utf8",
  );

  it("counts prepaid callback failures at the HTTP boundary", () => {
    expect(runtime).toContain("export async function recordPrepaidProbeCallbackFailureV39");
    expect(routes).toContain("await recordPrepaidProbeCallbackFailureV39(sessionId).catch(()=>undefined);");
  });

  it("writes reconciliation evidence before mismatch cleanup and keeps bounded DELIVERY_GAP scoreable", () => {
    const evidenceIndex = windowSource.indexOf("await persistProbeReconciliationEvidenceV39({");
    const terminalIndex = windowSource.indexOf('if (reconciliationStatus === "MISMATCH")');
    const persistedReasonIndex = windowSource.indexOf("stopReason: reconciliationStopReason", evidenceIndex);
    const deliveryGapReasonIndex = windowSource.indexOf('"external_internal_delivery_gap"');
    expect(evidenceIndex).toBeGreaterThan(-1);
    expect(persistedReasonIndex).toBeGreaterThan(evidenceIndex);
    expect(deliveryGapReasonIndex).toBeGreaterThan(-1);
    expect(windowSource).toContain('stopReason: reconciliationStatus === "DELIVERY_GAP" ? "bounded_delivery_gap" : null');
    expect(terminalIndex).toBeGreaterThan(persistedReasonIndex);
  });

  it("preserves UNRESOLVED aggregate evidence before cleanup", () => {
    const unresolvedIndex = windowSource.indexOf('evidenceStatus: "UNRESOLVED"');
    const unresolvedCleanupIndex = windowSource.indexOf("${input.deletionRunId}:settlement-unresolved");
    expect(unresolvedIndex).toBeGreaterThan(-1);
    expect(unresolvedCleanupIndex).toBeGreaterThan(unresolvedIndex);
  });
});

