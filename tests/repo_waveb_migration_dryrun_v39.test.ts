import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Wave B atomic source-migration plan dry run — no provider", () => {
  it("reconciles all original SHA/size paths and rejects destination collisions across the whole repo", () => {
    const output = execFileSync(process.execPath,
      ["scripts/repo_waveb_migration_dryrun.mjs","--json","--strict"],
      {encoding:"utf8",timeout:45000,maxBuffer:6*1024*1024});
    const x=JSON.parse(output);
    expect(x.status).toBe("PLANNING_ONLY_NO_MOVES_OR_PAID_CALLS");
    expect(x.manifest_entries).toBe(155);
    expect(x.main_source_files).toBe(108);
    expect(x.pr36_only_future_source_files).toBe(47);
    expect(x.original_sha_and_size_matches).toBe(108);
    expect(x.original_drift_count).toBe(0);
    expect(x.destination_conflict_count).toBe(0);
    expect(x.casefold_duplicate_destination_count).toBe(0);
    expect(x.no_destination_for_original_source).toEqual([{
      path:"SEPmd/V3.9_Final_Document_Safety_Audit_2026-09-02.md",
      bytes:0,
      action:"MANUAL_REVIEW_NO_AUTOMATIC_DELETE"
    }]);
    expect(x.operative_literal_line_hits).toBeGreaterThan(10);
    expect(x.operative_files_with_path_literals).toBeGreaterThan(3);
    const ledger=x.binding_path_references.find((y:{path:string}) =>
      y.path==="SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md");
    expect(ledger.operational_files.length).toBeGreaterThan(0);
    expect(x.needs_signed_path_and_dynamic_dependency_review).toBe(true);
    expect(x.branch_reconciliation_pr36_required).toBe(true);
    expect(x.safe_to_bulk_move_now).toBe(false);
    expect(x.network_or_paid_provider_calls).toBe(0);
    console.log("REPO_WAVEB_SOURCE_MIGRATION_GATE="+JSON.stringify({
      main_checked:108,pr36_future:47,
      destination_conflicts:0,proposed_casefold_collisions:0,
      historical_zero_byte_stub_held:1,
      operating_source_reference_lines:x.operative_literal_line_hits,
      dynamic_and_signed_path_review_still_required:true,
      paid_provider_calls:0
    }));
  }, 60000);
});
