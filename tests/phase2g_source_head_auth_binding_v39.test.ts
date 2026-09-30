import fs from "node:fs";
import { describe, expect, it } from "vitest";

const runtimeConfig = fs.readFileSync(
  "server/lib/disruption/probeExecution_v39.ts",
  "utf8",
);
const runtimeBuilder = fs.readFileSync(
  "scripts/v39_prepare_gate2_runtime_v39.ts",
  "utf8",
);
const gate2Binding = fs.readFileSync(
  "server/lib/disruption/phase2Gate2Runtime_v39.ts",
  "utf8",
);
const paidPreflight = fs.readFileSync(
  "scripts/v39_phase2g_stage1_paid_preflight_v39.ts",
  "utf8",
);

describe("Phase2G source-head authorization binding", () => {
  it("keeps legacy runtime artifacts readable while requiring a head on new v2 runtimes", () => {
    expect(runtimeConfig).toContain("sourceGitHead?: string | null");
    expect(runtimeConfig).toContain("sourceProtectedTreeSha256?: string | null");
    expect(runtimeConfig).toContain('config.version === "v39-gate2-runtime-2"');
    expect(runtimeConfig).toContain("requires sourceGitHead and sourceProtectedTreeSha256");
  });

  it("generates new runtimes with the exact current Git HEAD", () => {
    expect(runtimeBuilder).toContain('execFileSync("git", ["rev-parse", "HEAD"]');
    expect(runtimeBuilder).toContain('version: "v39-gate2-runtime-2"');
    expect(runtimeBuilder).toContain("sourceGitHead,");
    expect(runtimeBuilder).toContain("sourceProtectedTreeSha256,");
    expect(runtimeBuilder).toContain('"ls-tree", "-r", ref');
    expect(runtimeBuilder).toContain("source_protected_tree_sha256: ${sourceProtectedTreeSha256}");
  });

  it("puts the runtime-bound source HEAD inside the Stage1 authorization scope", () => {
    expect(gate2Binding).toContain("source_git_head=${binding.runtime.sourceGitHead}");
    expect(gate2Binding).toContain("source_protected_tree_sha256=${binding.runtime.sourceProtectedTreeSha256}");
  });

  it("allows evidence-only descendant commits but refuses protected source drift", () => {
    expect(paidPreflight).toContain("runtime_source_git_head_missing");
    expect(paidPreflight).toContain("runtime_source_protected_tree_sha_missing");
    expect(paidPreflight).toContain("runtime_source_git_head_not_ancestor:");
    expect(paidPreflight).toContain("protected_source_drift_since_runtime_freeze:");
    expect(paidPreflight).toContain('"merge-base", "--is-ancestor"');
    expect(paidPreflight).toContain('"ls-tree", "-r", ref');
  });
});
