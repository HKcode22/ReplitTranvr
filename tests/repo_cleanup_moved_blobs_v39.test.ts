import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const moved = [
  [
    "confused.md",
    "docs/history/phase0/requests/confused.md",
    "c611b806199d84e6777807ff9bbe1ab0e24fe332"
  ],
  [
    "gptP0analyze.md",
    "docs/history/phase0/reviews/gptP0analyze.md",
    "58e833c491783901a8f9025ed966a83fe5c67c5e"
  ],
  [
    "gptP0analyze2.md",
    "docs/history/phase0/reviews/gptP0analyze2.md",
    "030ca3722ceeac3c7315a45bbf47046478946e56"
  ],
  [
    "gptP0analyze3.md",
    "docs/history/phase0/reviews/gptP0analyze3.md",
    "2c65785db085e4a85375821af0419085923592d8"
  ],
  [
    "gptP0analyze5.md",
    "docs/history/phase0/reviews/gptP0analyze5.md",
    "d7a7ee5ea56ed5ad6e33ed0e1b4d92bf97b4f990"
  ],
  [
    "gptP0analyze6.md",
    "docs/history/phase0/reviews/gptP0analyze6.md",
    "a825cab9f6186b673f431d71e2e33aec01925356"
  ],
  [
    "gptP0analyze7.md",
    "docs/history/phase0/reviews/gptP0analyze7.md",
    "72468606ba162abdbdcefb96a56d2b7480df15c3"
  ],
  [
    "analyze_csv.py",
    "docs/history/v2-diagnostics/analyze_csv.py",
    "9bf974ea6f9a0f218f568ba4ae1beedde4bb0474"
  ],
  [
    "REPLIT_DIAGNOSTIC_2026-08-02.md",
    "docs/history/v2-diagnostics/REPLIT_DIAGNOSTIC_2026-08-02.md",
    "9eedcc42326802193b5e3762c155dbd218e50340"
  ],
  [
    "T3.ipynb",
    "docs/history/v2-diagnostics/notebooks/T3.ipynb",
    "df60b3241f6e459fba6fe3ce79efff01fa090c37"
  ],
  [
    "GATE0_INPUT_CHECKLIST.md",
    "docs/history/phase1/GATE0_INPUT_CHECKLIST.md",
    "560bb06eb155e5d24a5b19c0e176afa422c4deba"
  ],
  ["gptP0analyze4.md", "docs/history/phase0/reviews/gptP0analyze4.md", "ed76774bae16866ca58752da6237f3eb19cde5ff"],
  ["V3.9_DataCollectPlanCurrent.pdf", "data-collection/plans/reference-pdfs/V3.9_DataCollectPlanCurrent.pdf", "b81436b4509b4dc1fa86f60755feb6de15c1befd"],
  ["zipFile.zip", "docs/history/unreviewed-archives/zipFile.zip", "114bdc2df7b78ffa36d4d4ad310b9b870075183d"]
] as const;
const preserved = [
  "AGENTS.md",
  "data-collection/plans/V3.9_DataCollectPlan_f.8.md",
  "data-collection/implementation/V3.9_IMPLEMENTATION_LOG.md",
  "data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md",
  "data-collection/phase2g/operations/OPERATOR_SHELL_ONLY_GUARDRAIL.md",
  "data-collection/phase2g/legacy-lowercase/README.md",
  "data-collection/phase2g/legacy-uppercase/README.md",
  "data-collection/evidence/original-artifacts/phase2g/phase2g-gate2-runtime-P2G-S1-20261013-03.json",
] as const;

describe("Wave A original bytes, historical links and guardrail invariants", () => {
  it("preserves the exact original Git blobs for fourteen archival renames", () => {
    for (const [before, after, expectedBlob] of moved) {
      expect(existsSync(before), "old tracked path retained: " + before).toBe(false);
      expect(existsSync(after), "missing relocated path: " + after).toBe(true);
      const actual = execFileSync("git", ["hash-object", "--", after], {
        encoding: "utf8", timeout: 5000
      }).trim();
      expect(actual, "data changed while archiving " + after).toBe(expectedBlob);
    }
    for (const path of preserved) {
      expect(existsSync(path), "protected required source must stay available: " + path).toBe(true);
    }
    console.log("REPO_CLEANUP_MOVED_BLOB_IDENTITY=" + JSON.stringify({
      moved_exact_unchanged_blobs: moved.length,
      protected_paths_present: preserved.length,
      all_original_blobs_retained: true,
      paid_provider_calls: 0,
    }));
  });

  it("checks the primary historical navigation links without network or filesystem changes", () => {
    const links = [
      "docs/history/README.md",
      "docs/history/phase0/reviews/README.md",
      "docs/history/phase1/README.md",
      "docs/history/v2-diagnostics/README.md",
      "docs/history/v2-diagnostics/notebooks/README.md",
      "docs/repository-maintenance/manifests/2026-10-15_WAVEA_ROOT_HISTORY_MOVES.csv",
    ];
    for (const page of links) expect(readFileSync(page, "utf8").length).toBeGreaterThan(20);
    const nav = readFileSync("docs/history/v2-diagnostics/README.md", "utf8");
    expect(nav.includes("(notebooks/README.md)")).toBe(true);
    expect(existsSync("docs/history/v2-diagnostics/notebooks/T3.ipynb")).toBe(true);
  });
});
