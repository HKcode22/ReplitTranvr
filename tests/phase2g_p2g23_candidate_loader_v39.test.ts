import {
  createHash,
} from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  loadFrozenProbeArtifact,
} from "../server/lib/disruption/anchorPromotion_v39";

import {
  loadPhase2gCompact6AmendmentV39,
  PHASE2G_P2G23_YSSY_CANDIDATE_PATH,
  PHASE2G_COMPACT6_P2G22_YSSY_RECOVERY_ARTIFACT_PATH,
} from "../server/lib/disruption/phase2Compact6_v39";

const PREPROBE_SHA =
  "b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870";

const CANDIDATE_SHA =
  "d5f99c4206df8a0124b3ebd13438a9067172ebeb74880814b93c3186168bea8d";

const preprobe = loadFrozenProbeArtifact(
  "artifacts/preprobe-reference-freeze-record.json",
  PREPROBE_SHA,
);

function digest(raw: string) {
  return createHash("sha256")
    .update(raw, "utf8")
    .digest("hex");
}

function load(path: string, raw = readFileSync(path, "utf8")) {
  return loadPhase2gCompact6AmendmentV39({
    expectedSha256: digest(raw),
    sourcePreprobeFileSha256: PREPROBE_SHA,
    preprobe: preprobe.artifact,
    path,
  });
}

describe("P2G23 candidate loader — never paid enabled", () => {
  it("verifies the unchanged P2G22 freeze", () => {
    const original = load(
      PHASE2G_COMPACT6_P2G22_YSSY_RECOVERY_ARTIFACT_PATH,
    );
    expect(original.amendment
      .p2g23_yssy_infrastructure_recovery_rerun
    ).toBeUndefined();
  });

  it("accepts only the hash-bound candidate for review", () => {
    const raw = readFileSync(
      PHASE2G_P2G23_YSSY_CANDIDATE_PATH,
      "utf8",
    );
    expect(digest(raw)).toBe(CANDIDATE_SHA);

    const loaded = load(
      PHASE2G_P2G23_YSSY_CANDIDATE_PATH,
    );

    const recovery = loaded.amendment
      .p2g23_yssy_infrastructure_recovery_rerun;

    expect(recovery?.authorized).toBe(true);
    expect(recovery?.maximum_additional_attempts).toBe(1);
    expect(recovery?.failed_probe_id).toBe(17);
    expect(recovery?.expected_durable_reconciliation_absent)
      .toBe(true);
    expect(recovery?.paid_launch_authorized_now)
      .toBe(false);
  });

  it("rejects an altered candidate even with recalculated file SHA", () => {
    const original = JSON.parse(readFileSync(
      PHASE2G_P2G23_YSSY_CANDIDATE_PATH,
      "utf8",
    ));

    const folder = mkdtempSync(join(tmpdir(), "p2g-c42-"));
    const path = join(folder, "tampered.json");

    try {
      original.p2g23_yssy_infrastructure_recovery_rerun
        .historical_external_spend_credits = 220;

      const raw = JSON.stringify(original) + "\n";
      writeFileSync(path, raw);
      expect(() => load(path, raw)).toThrow(
        "REFUSED_COMPACT6_P2G23_RECOVERY_CONTRACT",
      );
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("keeps the paid owner and paid preflight blocked", () => {
    const owner = readFileSync(
      "scripts/v39_probe_stage1_owner_v39.ts",
      "utf8",
    );
    const preflight = readFileSync(
      "scripts/v39_phase2g_stage1_paid_preflight_v39.ts",
      "utf8",
    );

    expect(owner).toContain(
      "REFUSED_P2G23_CANDIDATE_NOT_FINAL_FROZEN",
    );
    expect(preflight).toContain(
      "p2g23_candidate_not_final_frozen",
    );
  });
});
