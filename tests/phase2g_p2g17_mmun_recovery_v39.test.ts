import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { loadFrozenProbeArtifact } from "../server/lib/disruption/anchorPromotion_v39";
import {
  loadPhase2gCompact6AmendmentV39,
  PHASE2G_COMPACT6_P2G17_MMUN_RECOVERY_ARTIFACT_PATH,
} from "../server/lib/disruption/phase2Compact6_v39";

const root = process.cwd();
const preprobePath = join(root, "artifacts", "preprobe-reference-freeze-record.json");
const preprobeSha = "b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870";
const expectedAmendmentSha = "7ace48ceaf4b929189b2d65d97c6de5e6a6d06a7de88470133c197442b9d2568";

const sha256 = (raw: string) =>
  createHash("sha256").update(raw, "utf8").digest("hex");

describe("P2G17 MMUN technical-invalid recovery contract", () => {
  it("loads an immutable exact recovery amendment bound to probe 13 durable evidence", () => {
    const p = join(root, PHASE2G_COMPACT6_P2G17_MMUN_RECOVERY_ARTIFACT_PATH);
    const raw = readFileSync(p, "utf8");
    expect(sha256(raw)).toBe(expectedAmendmentSha);

    const preprobe = loadFrozenProbeArtifact(preprobePath, preprobeSha);
    const loaded = loadPhase2gCompact6AmendmentV39({
      expectedSha256: expectedAmendmentSha,
      sourcePreprobeFileSha256: preprobeSha,
      preprobe: preprobe.artifact,
      path: p,
    });

    const recovery = loaded.amendment.p2g17_mmun_delivery_gap_recovery_rerun;
    expect(recovery?.authorized).toBe(true);
    expect(recovery?.maximum_additional_attempts).toBe(1);
    expect(recovery?.failed_probe_id).toBe(13);
    expect(recovery?.icao).toBe("MMUN");
    expect(recovery?.expected_probe_budget_day_id).toBe("P2G-S1-20260930-16");
    expect(recovery?.expected_runtime_session_id).toBe(
      "5c0064eb-585a-4dfb-af4c-211f3bee3e94",
    );
    expect(recovery?.durable_evidence_status).toBe("DELIVERY_GAP");
    expect(recovery?.durable_external_spend_credits).toBe(65);
    expect(recovery?.durable_internal_received_credits).toBe(60);
    expect(recovery?.durable_delivery_gap_credits).toBe(5);
    expect(recovery?.durable_callback_requests_seen).toBe(41);
    expect(recovery?.durable_callback_success_2xx).toBe(41);
    expect(recovery?.durable_callback_failures).toBe(0);
    expect(recovery?.excluded_from_final_scoring).toBe(true);
    expect(recovery?.outcome_metrics_not_used_to_authorize).toBe(true);
    expect(recovery?.no_automatic_retry_after_recovery_attempt).toBe(true);
  });

  it("uses immutable reconciliation evidence in both preflight and owner selection", () => {
    const owner = readFileSync(
      join(root, "scripts", "v39_probe_stage1_owner_v39.ts"),
      "utf8",
    );
    const preflight = readFileSync(
      join(root, "scripts", "v39_phase2g_stage1_paid_preflight_v39.ts"),
      "utf8",
    );

    expect(owner).toContain("LEFT JOIN clean.adb_probe_reconciliation_evidence");
    expect(owner).toContain("readStage1EvidenceV39");
    expect(owner).toContain("exactP2g17MmunTechnicalInvalidMatchesV39");
    expect(owner).toContain("REFUSED_P2G17_MMUN_RECOVERY_EVIDENCE_MISMATCH");
    expect(preflight).toContain("readStage1EvidenceV39");
    expect(preflight).not.toContain("const stage1Rows = await pool.query");
  });

  it("adjudicates only P2G17 incidents/budget and never rewrites probe or reconciliation evidence", () => {
    const adjudicator = readFileSync(
      join(root, "scripts", "v39_phase2g_p2g17_mmun_adjudication_v39.ts"),
      "utf8",
    );

    expect(adjudicator).toContain("7a1fb4622e4adffbda4ba88a04c2243cf702504414d78c7a1bfd862eafe1fd2e");
    expect(adjudicator).toContain('String(row.evidence_status ?? "") !== "DELIVERY_GAP"');
    expect(adjudicator).toContain("Number(row.external_spend_credits) !== 65");
    expect(adjudicator).toContain("Number(row.internal_received_credits) !== 60");
    expect(adjudicator).toContain("Number(row.delivery_gap_credits) !== 5");
    expect(adjudicator).toContain("Number(row.callback_requests_seen) !== 41");
    expect(adjudicator).toContain("SET resolved=true,resolved_at_utc=now()");
    expect(adjudicator).toContain("SET state='CLOSED',closed_at=now()");
    expect(adjudicator).not.toContain("UPDATE clean.adb_anchor_probe");
    expect(adjudicator).not.toContain("UPDATE clean.adb_probe_reconciliation_evidence");
    expect(adjudicator).not.toContain("createSubscription(");
    expect(adjudicator).not.toContain("deleteSubscription(");
  });

  it("provides a Thursday preparation helper with no paid-launch mode", () => {
    const helper = readFileSync(
      join(
        root,
        "scripts",
        "v39_phase2g_thursday_mmun_p2g17_recovery_prepare_v39.sh",
      ),
      "utf8",
    );

    expect(helper).toContain(`EXPECTED_AMENDMENT_SHA="${expectedAmendmentSha}"`);
    expect(helper).toContain('BUDGET="P2G-S1-20261001-17"');
    expect(helper).toContain('AUTH_ID="AUTH-20261001-P2G18H1"');
    expect(helper).toContain(
      'RUNTIME="artifacts/phase2g-gate2-runtime-P2G-S1-20261001-17-H1.json"',
    );
    expect(helper).toContain('AUTH_START="2026-10-01T11:00:00Z"');
    expect(helper).toContain('AUTH_EXPIRES="2026-10-01T15:10:00Z"');
    expect(helper).toContain("adjudication-dry)");
    expect(helper).toContain("adjudicate)");
    expect(helper).toContain("runtime)");
    expect(helper).toContain("auth-draft)");
    expect(helper).toContain("auth-approve)");
    expect(helper).toContain("zero-credit-binding)");
    expect(helper).toContain("This helper has NO paid-launch mode");
    expect(helper).not.toContain("RUN_PAID_STAGE1_ONCE");
    expect(helper).not.toContain("gh workflow run phase2g-paid-stage1.yml");
  });
});
