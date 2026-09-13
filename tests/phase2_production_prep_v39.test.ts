import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { V39_RUNTIME_CONFIG_REGISTRY } from "../server/lib/disruption/configRegistryRuntime_v39";

const root = process.cwd();

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("V3.9 Phase-2 production preparation boundaries", () => {
  it("refuses to provision the runtime role against an ambiguous development DATABASE_URL", () => {
    const text = source("scripts/provision_runtime_role_v39.ts");
    expect(text).toContain("V39_PRODUCTION_DATABASE_OWNER_URL");
    expect(text).toContain("V39_DATABASE_TARGET_CONFIRM");
    expect(text).toContain("production");
    expect(text).not.toContain("const ownerUrl = process.env.DATABASE_URL");
    expect(text).toContain("refusing ambiguous development/production target");
  });

  it("re-verifies the least-privilege role against the explicit production owner connection, never generic DATABASE_URL", () => {
    const text = source("scripts/v39_security_verify_v39.ts");
    expect(text).toContain("V39_PRODUCTION_DATABASE_OWNER_URL");
    expect(text).toContain("V39_DATABASE_TARGET_CONFIRM");
    expect(text).toContain("production");
    expect(text).not.toContain("const ownerUrl = process.env.DATABASE_URL");
    expect(text).toContain("live-verified against explicit production owner connection");
  });

  it("never reintroduces the historical hard-coded webhook deployment host", () => {
    const text = source("scripts/configure_webhook_evidence_v39.ts");
    expect(text).toContain("V39_PUBLIC_WEBHOOK_BASE_URL");
    expect(text).toContain("REPLIT_DOMAINS");
    expect(text).toContain('url.protocol !== "https:"');
    expect(text).toContain("/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId");
    expect(text).not.toContain("workspace.almabdella.repl.co");
  });

  it("keeps prerequisite P scoped to the isolated prepaid path and defers the full matrix to Phase 6", () => {
    const byKey = new Map(V39_RUNTIME_CONFIG_REGISTRY.map((entry) => [entry.key, entry]));
    for (const key of [
      "V39_DB_ROLE_EVIDENCE",
      "V39_WEBHOOK_SECURITY_EVIDENCE",
      "V39_PROVIDER_BLOB_MODE",
      "V39_PROVIDER_BLOB_BUCKET_ID",
      "V39_PHASE2_RETENTION_SCOPE_EVIDENCE",
      "V39_RETENTION_DEPLOYMENT_EVIDENCE",
    ]) {
      expect(byKey.get(key)?.gate).toBe("P");
      expect(byKey.get(key)?.phase).toBe("Phase 2 prerequisite P");
    }
    expect(byKey.get("V39_RETENTION_MATRIX_EVIDENCE")?.gate).toBe("Phase 6");
    expect(byKey.get("V39_RETENTION_MATRIX_EVIDENCE")?.phase).toBe("Phase 6 retention closure");
  });

  it("requires explicit owner approval before generating Phase-2 entitlement evidence", () => {
    const text = source("scripts/prepare_phase2_p_evidence_v39.ts");
    expect(text).toContain("--owner-approved");
    expect(text).toContain("code cannot self-approve provider-plan/retention evidence");
    expect(text).toContain('V39_PHASE2_RETENTION_APPLY_ARMED", "0"');
    expect(text).toContain("dedicated App Storage bucket");
  });

  it("provides a single fail-closed Phase-2A production closure runner with only local security/retention owners", () => {
    const text = source("scripts/v39_phase2a_close.sh");
    for (const key of [
      "V39_PRODUCTION_DATABASE_OWNER_URL",
      "V39_PROVIDER_BLOB_BUCKET_ID",
      "V39_DATABASE_TARGET_CONFIRM",
      "V39_PUBLIC_WEBHOOK_BASE_URL",
      "V39_PHASE2_OWNER_APPROVED",
    ]) expect(text).toContain(key);
    expect(text).toContain("provision_runtime_role_v39.ts");
    expect(text).toContain("configure_webhook_evidence_v39.ts");
    expect(text).toContain("prepare_phase2_p_evidence_v39.ts --owner-approved");
    expect(text).toContain("v39_security_verify_v39.ts");
    expect(text).toContain("v39_record_p_pass_v39.ts");
    expect(text).toContain("V39_PHASE2_RETENTION_APPLY_ARMED=0");
    expect(text).not.toContain("AERODATABOX_API_KEY");
    expect(text).not.toContain("credit_canary.ts");
    expect(text).not.toContain("anchor_probe.ts");
    expect(text).not.toContain("measure_coverage.ts");
  });
});
