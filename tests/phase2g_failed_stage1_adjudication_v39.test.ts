import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const prepare = readFileSync(join(root, "scripts", "v39_phase2g_failed_stage1_adjudication_prepare_v39.ts"), "utf8");
const apply = readFileSync(join(root, "scripts", "v39_phase2g_failed_stage1_adjudication_apply_v39.ts"), "utf8");

describe("Phase-2G failed Stage-1 adjudication contract", () => {
  it("prepares an immutable exact plan without database/provider mutation", () => {
    expect(prepare).toContain('status: "READY_FOR_EXACT_ADJUDICATION_NOT_APPLIED"');
    expect(prepare).toContain("EXACT_OWNED_SUBSCRIPTION_DELETED_VERIFIED");
    expect(prepare).toContain("ACTIVE_BILLABLE_SUBSCRIPTIONS");
    expect(prepare).toContain("NO_DURABLE_RAW_EVIDENCE");
    expect(prepare).toContain("UNRELATED_OPEN_INCIDENTS");
    expect(prepare).toContain('provider_mutation: false');
    expect(prepare).toContain('deployment: false');
    expect(prepare).toContain('flag: "wx"');
    expect(prepare).not.toContain("deleteSubscription(");
    expect(prepare).not.toContain("UPDATE clean.");
    expect(prepare).not.toContain("DELETE FROM clean.");
  });

  it("binds the plan to exact failed probe, cleanup evidence, incidents, and zero live exposure", () => {
    expect(prepare).toContain('String(probe.status) !== "failed"');
    expect(prepare).toContain('String(probe.reconciliation_status) !== "UNRESOLVED"');
    expect(prepare).toContain("probe.duration_censored !== true");
    expect(prepare).toContain("reserved_credits");
    expect(prepare).toContain("cleanup_evidence_sha256");
    expect(prepare).toContain("incident_fingerprints");
    expect(prepare).toContain("plan_binding_sha256");
    expect(prepare).toContain("activeBillable.length !== 0");
    expect(prepare).toContain("runtimeRows.rows[0]?.n");
  });

  it("resolves only exact planned incidents and closes only the exact failed budget day", () => {
    expect(apply).toContain("PLAN_FILE_SHA_MISMATCH");
    expect(apply).toContain("PLAN_BINDING_MISMATCH");
    expect(apply).toContain("OPEN_INCIDENT_SET_CHANGED");
    expect(apply).toContain("INCIDENT_FINGERPRINT_CHANGED");
    expect(apply).toContain("INCIDENT_SCOPE_CHANGED");
    expect(apply).toContain("id = ANY($1::bigint[])");
    expect(apply).toContain("SET resolved=true,resolved_at_utc=now()");
    expect(apply).toContain("SET state='CLOSED',closed_at=now()");
    expect(apply).toContain("pg_advisory_xact_lock");
  });

  it("preserves failed/censored/UNRESOLVED scientific evidence and performs no provider mutation", () => {
    expect(apply).toContain('String(probe.rows[0].status) !== "failed"');
    expect(apply).toContain('String(probe.rows[0].reconciliation_status) !== "UNRESOLVED"');
    expect(apply).toContain("probe.rows[0].duration_censored !== true");
    expect(apply).toContain('failed_probe_preserved: true');
    expect(apply).toContain('reconciliation_status_preserved: "UNRESOLVED"');
    expect(apply).toContain('provider_mutation_performed: false');
    expect(apply).toContain('deployment_performed: false');
    expect(apply).not.toContain("deleteSubscription(");
    expect(apply).not.toContain("createSubscription(");
    expect(apply).not.toContain("refillBalance(");
  });
});
