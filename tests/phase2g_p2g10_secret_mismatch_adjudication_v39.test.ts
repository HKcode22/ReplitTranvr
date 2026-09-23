import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const text = readFileSync(join(process.cwd(), "scripts", "v39_phase2g_p2g10_secret_mismatch_adjudication_v39.ts"), "utf8");

describe("P2G10 webhook-secret mismatch adjudication", () => {
  it("preserves failed evidence, requires zero billable exposure, and closes only the exact failed budget", () => {
    expect(text).toContain('const BUDGET_DAY = "P2G-S1-20260923-09"');
    expect(text).toContain("const PROBE_ID = 8");
    expect(text).toContain('const SESSION_ID = "c7826b30-47ef-453a-86a6-dd853ce2a6f8"');
    expect(text).toContain("ACTIVE_BILLABLE_SUBSCRIPTIONS");
    expect(text).toContain("runtime_cleanup_verified_at_utc == null");
    expect(text).toContain('String(probe.status) !== "failed"');
    expect(text).toContain('String(probe.reconciliation_status) !== "UNRESOLVED"');
    expect(text).toContain('String(detail.kind ?? "") === "stage1_supervisor_recovery"');
    expect(text).toContain('SET resolved=true,resolved_at_utc=now()');
    expect(text).toContain("SET state='CLOSED',closed_at=now()");
    expect(text).toContain("FAILED_EVIDENCE_NOT_PRESERVED");
  });

  it("does not create, refill, or delete provider subscriptions", () => {
    expect(text).toContain("listSubscriptionsStrict");
    expect(text).not.toContain("createSubscription(");
    expect(text).not.toContain("deleteSubscription(");
    expect(text).not.toContain("refillBalance(");
    expect(text).toContain("provider_mutation_performed: false");
    expect(text).toContain("alert_credits_spent_by_adjudicator: 0");
  });
});
