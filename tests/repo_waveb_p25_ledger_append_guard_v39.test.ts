import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("historical P25 AUTH append survives future Phase3 integration", () => {
  it("preserves exactly one original ledger section with signed JSON and runtime bindings", () => {
    const ledger=readFileSync("SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md","utf8");
    const auth=JSON.parse(readFileSync("SEPmd/V3.9_PHASE2G_AUTH_20261013_P2G25.json","utf8"));
    const runtime=JSON.parse(readFileSync("artifacts/phase2g-gate2-runtime-P2G-S1-20261013-03.json","utf8"));
    const heading="### AUTH-20261013-P2G25 — approved Phase 2G Stage-1 authorization";
    const occurrences=ledger.split(heading).length-1;
    expect(occurrences,"main-only historical P25 append lost/duplicated").toBe(1);
    const start=ledger.indexOf(heading);
    const next=ledger.indexOf("\n### AUTH-",start+heading.length);
    const section=ledger.slice(start,next<0?undefined:next);
    const lines=[
      "- authorization_id: "+auth.authorizationId,
      "- phase_gate: "+auth.phaseGate,
      "- exact_scope: "+auth.airportFilterWindow,
      "- runtime_file: artifacts/phase2g-gate2-runtime-P2G-S1-20261013-03.json",
      "- auth_file: SEPmd/V3.9_PHASE2G_AUTH_20261013_P2G25.json",
      "- max_alert_credits: "+auth.maxAlertCredits,
      "- start_not_before_utc: "+auth.startNotBeforeUtc,
      "- expires_at_utc: "+auth.expiresAtUtc,
      "- approval_scope: PHASE_2G_STAGE1_ONLY",
      "- AUTH_ARTIFACT_SHA256:4a27a43d26fa2e257ea5ddf92afb2d05efe7213c07c0ec3def41ac4da8ab10e0",
      "- GATE2_RUNTIME_FILE_SHA256:101c9ab8ade5978194fc22c4e2f64660ee74dbe5d0b8efcfab87b798e4df333f",
      "- paid_stage1_execution_authorized_by_this_ledger_edit: false",
      "- provider_calls_or_credit_spend_from_this_edit: 0",
      "- no_automatic_retry_authorized: true"
    ];
    for(const line of lines)
      expect(section.includes(line),"missing original ledger evidence: "+line.slice(0,100)).toBe(true);
    expect(auth.authorizationId).toBe("AUTH-20261013-P2G25");
    expect(runtime.probeBudgetDayId).toBe("P2G-S1-20261013-03");
    expect(auth.airportFilterWindow).toContain("probe_budget_day_id="+runtime.probeBudgetDayId);
    expect(auth.airportFilterWindow).toContain("source_protected_tree_sha256="+runtime.sourceProtectedTreeSha256);
    expect(section).toContain("approval DOES NOT override match requirement");
    console.log("REPO_WAVEB_P25_LEDGER_APPEND_GATE="+JSON.stringify({
      original_P25_AUTH_sections:occurrences,
      original_ledger_JSON_runtime_scope_matched:true,
      historic_non_execution_limits_preserved:true,
      future_paid_execution_authorized:false,
      paid_provider_calls:0
    }));
  });
});
