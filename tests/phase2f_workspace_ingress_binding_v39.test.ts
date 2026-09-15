import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  buildPhase2FWorkspaceIngressBindingV39,
  loadPhase2FWorkspaceIngressBindingV39,
  type Phase2FWorkspaceIngressArtifactV39,
} from "../server/lib/disruption/phase2WorkspaceIngressBinding_v39";

type WorkspaceIngressInput = Omit<
  Phase2FWorkspaceIngressArtifactV39,
  "schema_version" | "status" | "ingress_kind" | "artifact_sha256"
>;

const sourceCompatibility = Array.from({ length: 6 }, (_, i) => {
  const digit = String(i + 1);
  const hash = digit.repeat(64).slice(0, 64);
  return {
    path: `source-${i}.ts`,
    runtime_sha256: hash,
    current_sha256: hash,
    match: true as const,
  };
});

function validInput(checkedAtUtc = "2026-09-15T09:40:00.000Z"): WorkspaceIngressInput {
  return {
    checked_at_utc: checkedAtUtc,
    callback_origin: "https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-example.kirk.replit.dev",
    callback_receipt_sha256: "a".repeat(64),
    callback_receipt_generated_at_utc: checkedAtUtc,
    callback_runtime_git_head: "b".repeat(40),
    binding_creator_git_head: "c".repeat(40),
    exact_route_owner: "server/routes_v3.ts",
    public_https_ingress: true,
    wrong_secret_rejected_404: true,
    exact_secret_accepted_200: true,
    runtime_health_rechecked: true,
    retention_hours: 168,
    bucket_prefix: "replit-objstore",
    open_incidents: 0,
    provider_called_during_verification: false,
    provider_subscription_created_during_verification: false,
    alert_credits_spent_during_verification: 0,
    deployment_performed: false,
    source_compatibility: sourceCompatibility,
  };
}

function fixture(checkedAtUtc = "2026-09-15T09:40:00.000Z") {
  return buildPhase2FWorkspaceIngressBindingV39(validInput(checkedAtUtc));
}

describe("Phase 2F no-redeploy workspace ingress binding", () => {
  it("loads a fresh hash-bound workspace ingress receipt without calling it a deployment", () => {
    const artifact = fixture();
    const dir = mkdtempSync(join(tmpdir(), "v39-workspace-ingress-"));
    const file = join(dir, "binding.json");
    writeFileSync(file, JSON.stringify(artifact, null, 2) + "\n", "utf8");
    const loaded = loadPhase2FWorkspaceIngressBindingV39(file, new Date("2026-09-15T09:41:00.000Z"));
    expect(loaded.artifact.ingress_kind).toBe("replit-workspace-live");
    expect(loaded.artifact.deployment_performed).toBe(false);
    expect(loaded.artifact.provider_called_during_verification).toBe(false);
    expect(loaded.artifact.source_compatibility.every((x) => x.match)).toBe(true);
    expect(loaded.evidenceId).toMatch(/^RUN-20260915-[A-F0-9]{64}$/);
  });

  it("rejects stale bindings and stale callback receipts", () => {
    const artifact = fixture();
    const dir = mkdtempSync(join(tmpdir(), "v39-workspace-ingress-"));
    const file = join(dir, "binding.json");
    writeFileSync(file, JSON.stringify(artifact, null, 2) + "\n", "utf8");
    expect(() => loadPhase2FWorkspaceIngressBindingV39(file, new Date("2026-09-15T10:11:00.000Z")))
      .toThrow(/PHASE2F_WORKSPACE_INGRESS_STALE|PHASE2F_WORKSPACE_INGRESS_RECEIPT_STALE/);
  });

  it("rejects production origins", () => {
    expect(() => buildPhase2FWorkspaceIngressBindingV39({
      ...validInput(),
      callback_origin: "https://travnr.com",
    })).toThrow(/ORIGIN_NOT_WORKSPACE|ORIGIN_INVALID/);
  });

  it("rejects source mismatches", () => {
    const mismatch = sourceCompatibility.map((x) => ({ ...x }));
    mismatch[0] = { ...mismatch[0], current_sha256: "f".repeat(64) };
    expect(() => buildPhase2FWorkspaceIngressBindingV39({
      ...validInput(),
      callback_origin: "https://x.replit.dev",
      source_compatibility: mismatch,
    })).toThrow(/SOURCE_MISMATCH/);
  });
});
