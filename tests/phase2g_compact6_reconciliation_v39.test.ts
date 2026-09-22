import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { loadFrozenProbeArtifact } from "../server/lib/disruption/anchorPromotion_v39";
import {
  loadPhase2gCompact6AmendmentV39,
  PHASE2G_COMPACT6_ARTIFACT_PATH,
} from "../server/lib/disruption/phase2Compact6_v39";
import {
  classifyProbeReconciliationV39,
  PROBE_DELIVERY_COMPLETENESS_FLOOR_V39,
} from "../server/lib/disruption/prepaidProbeWindow_v39";
import {
  isP2g06PostfixWsssValidationEligibleV39,
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

  it("classifies the reconstructed P2G06-shaped 220/219 accounting as a bounded DELIVERY_GAP prospectively", () => {
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

  it("hard-fails when delivery completeness falls below the prospectively frozen floor", () => {
    const result = classifyProbeReconciliationV39({
      ownerKind: "anchor_probe",
      externalCredits: 220,
      internalSendCredits: 217,
      costItemDisagreementCount: 0,
    });
    expect(result.deliveryCompleteness).toBeLessThan(0.99);
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
    expect(execution).toContain("const deliveryGapCredits = Math.max(0, result.externalCredits - result.internalSendCredits);");
    expect(execution).toContain("const adjustedAmbiguityUpper = result.metrics.confirmedPlusAmbiguousUpper + deliveryGapCredits;");
  });

  it("allows only MATCH or DELIVERY_GAP completed safe-mode evidence", () => {
    expect(migration).toContain("reconciliation_status IN ('MATCH','DELIVERY_GAP')");
    expect(migration).toContain("clean.adb_probe_reconciliation_evidence");
    expect(migration).toContain("Phase-2G reconciliation evidence is append-only");
  });
});
