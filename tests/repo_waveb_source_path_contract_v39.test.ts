import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Wave B original science path compatibility — no provider", () => {
  it("retains active current-source paths and original P25 freeze until an atomic migration", () => {
    const protectedPaths = [
      "AGENTS.md",
      "data-collection/phase2g/operations/OPERATOR_SHELL_ONLY_GUARDRAIL.md",
      "data-collection/plans/V3.9_DataCollectPlan_f.8.md",
      "data-collection/implementation/V3.9_IMPLEMENTATION_LOG.md",
      "data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md",
      "data-collection/authorizations/V3.9_PHASE2G_AUTH_20261013_P2G25.json",
      "data-collection/evidence/original-artifacts/phase2g/phase2g-gate2-runtime-P2G-S1-20261013-03.json",
      "data-collection/evidence/original-artifacts/other/preprobe-reference-freeze-record.json",
    ];
    for (const p of protectedPaths) expect(existsSync(p), "missing original path: " + p).toBe(true);
    const manifest = readFileSync("server/lib/disruption/manifest_v3.ts", "utf8");
    for (const p of protectedPaths.slice(2, 5))
      expect(manifest.includes(p), "manifest path not atomically migrated: " + p).toBe(true);
    const preflight = readFileSync("scripts/v39_phase2g_stage1_paid_preflight_v39.ts", "utf8");
    expect(preflight.includes('path.resolve("data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md")')).toBe(true);
    expect(preflight.includes("data-collection/evidence/original-artifacts/other/preprobe-reference-freeze-record.json")).toBe(true);
    const hash = (p: string) => execFileSync("git", ["hash-object", "--", p], { encoding: "utf8", timeout: 5000 }).trim();
    expect(hash(protectedPaths[5])).toBe("de9db3bef4efbdfc15e8019f4fc539cfa4887f79");
    expect(hash(protectedPaths[6])).toBe("946e2e48c66d97fe1ef6e8964ad41cf07d200595");
    console.log("REPO_WAVEB_PATH_GATE="+JSON.stringify({
      original_protected_paths:protectedPaths.length, original_signed_P25_AUTH_and_runtime_blob_verified:true,
      source_registry_and_preflight_exact_path_readiness:true, paid_provider_calls:0
    }));
  });
});
