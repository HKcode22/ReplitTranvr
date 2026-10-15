import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("repository cleanup reference scanner (offline, read-only)", () => {
  it("scans the exact tracked checkout and retains protected experiment provenance", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/repo_cleanup_reference_audit.mjs", "--json"],
      { cwd: process.cwd(), encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 45_000 },
    );
    const audit = JSON.parse(output);
    expect(audit.status).toBe("INVENTORY_ONLY_NOT_DELETE_OR_RENAME_APPROVAL");
    expect(audit.tracked_files).toBeGreaterThan(1_000);
    expect(audit.files_scanned_text).toBeGreaterThan(400);
    expect(audit.protected_operator_guardrails["AGENTS.md"]).toBe(true);
    expect(audit.protected_operator_guardrails["replit.md"]).toBe(true);
    expect(audit.absent_protected_roots).toEqual([]);
    expect(audit.tracked_counts_by_protected_root["SEPmd/"]).toBeGreaterThan(0);
    expect(audit.tracked_counts_by_protected_root["artifacts/"]).toBeGreaterThan(0);
    expect(typeof audit.git_head).toBe("string");
    expect(audit.git_head).toMatch(/^[a-f0-9]{40}$/);
    const missing = audit.references.filter((r) => r.source_role === "OPERATIONAL_OR_TEST" && !r.present_as_tracked_path);
    expect(missing.length).toBe(audit.missing_operational_literal_count);
    const byLiteral = [...new Set(missing.map((r) => r.target_literal))].sort();
    const candidateRefs = audit.references.filter((r) => r.source_role === "OPERATIONAL_OR_TEST" && /gptP0analyze|confused\\.md|zipFile\\.zip|T3\\.ipynb|V3\\.9_Final_Document_Safety_Audit/.test(r.target_literal));
    console.log("REPO_CLEANUP_UNRESOLVED_OPERATIONAL=" + JSON.stringify({
      exact_checkout_sha: audit.git_head,
      missing_references: missing.map((r) => ({ from: r.from, line: r.line, target: r.target_literal })).slice(0, 90),
      unique_missing_literals: byLiteral.length,
      root_clutter_source_references: candidateRefs.slice(0, 30).map((r) => ({ from: r.from, target: r.target_literal })),
      requires_manual_review: true
    }));

    // Read-only exact literal/name reference inventory for potential root clutter.
    // Git grep status=1 means no matching tracked text; never use absence alone
    // to approve deletion (dynamic file names and binary assets are out of scope).
    const rootCandidates = [
      "gptP0analyze", "confused.md", "analyze_csv.py", "zipFile.zip",
      "T3.ipynb", "REPLIT_DIAGNOSTIC_2026-08-02.md",
      "V3.9_DataCollectPlanCurrent.pdf",
      "V3.9_Final_Document_Safety_Audit_2026-09-02.md",
    ];
    const candidateMatches = rootCandidates.map((needle) => {
      let files: string[] = [];
      try {
        files = execFileSync("git", ["grep", "-I", "-l", "-F", "-e", needle, "--"], {
          cwd: process.cwd(), encoding: "utf8", timeout: 15_000,
          maxBuffer: 2 * 1024 * 1024,
        }).trim().split("\n").filter(Boolean);
      } catch (e) {
        if ((e as { status?: number }).status !== 1) throw e;
      }
      const operational = files.filter((path) =>
        /^(scripts|server|tests|shared|client|migrations|\.github)\//.test(path) &&
        !path.startsWith("tests/repo_cleanup_reference_audit_")
      );
      return {
        candidate: needle,
        tracked_text_reference_files: files.length,
        operational_reference_paths: operational.slice(0, 40),
        note: "Review only; zero literal references would not certify no runtime usage",
      };
    });
    console.log("REPO_CLEANUP_ROOT_CANDIDATE_REFERENCES=" + JSON.stringify({
      exact_checkout_sha: audit.git_head,
      candidateMatches,
      changes_to_live_files: 0,
      provider_calls: 0
    }));

    console.log("REPO_CLEANUP_INVENTORY_READONLY=" + JSON.stringify({
      git_head: audit.git_head,
      tracked_files: audit.tracked_files,
      files_scanned_text: audit.files_scanned_text,
      total_literal_references: audit.total_literal_references,
      missing_operational_literal_count: audit.missing_operational_literal_count,
      skipped_text_candidates: audit.skipped_text_candidates.length,
      guardrails_preserved: true,
      deletions_or_moves: 0,
      provider_calls: 0,
    }));
  }, 60_000);
});
