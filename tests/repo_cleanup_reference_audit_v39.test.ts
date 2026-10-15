import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("repository cleanup reference scanner (offline, read-only)", () => {
  it("scans the exact tracked checkout and retains protected experiment provenance", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/repo_cleanup_reference_audit.mjs", "--summary-json"],
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
