import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pages = [
  "data-collection/README.md",
  "data-collection/plans/README.md",
  "data-collection/implementation/README.md",
  "data-collection/phase2/README.md",
  "data-collection/phase2g/README.md",
  "data-collection/phase3/README.md",
  "data-collection/authorizations/README.md",
  "data-collection/evidence/README.md",
  "data-collection/operations/README.md"
] as const;

describe("navigation-only data-collection index (no source migration)", () => {
  it("resolves all local Markdown navigation links while keeping original V3.9 source paths", () => {
    let checked = 0;
    for (const file of pages) {
      expect(existsSync(file), "index missing: " + file).toBe(true);
      const content = readFileSync(file, "utf8");
      const links = [...content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)];
      for (const [, url] of links) {
        if (/^(https?:|mailto:|#)/.test(url)) continue;
        const target = resolve(dirname(file), decodeURIComponent(url.split("#")[0]));
        expect(existsSync(target), "broken local link from " + file + " to " + url).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(35);
    const readme = readFileSync("data-collection/README.md", "utf8");
    expect(readme).toContain("navigation");
    expect(existsSync("SEPmd/V3.9_DataCollectPlan_f.8.md")).toBe(true);
    expect(existsSync("SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md")).toBe(true);
    expect(existsSync("SEPmd/PHASE2G/OPERATOR_SHELL_ONLY_GUARDRAIL.md")).toBe(true);
    expect(existsSync("SEPmd/phase2g/README.md")).toBe(true);
    expect(existsSync("SEPmd/PHASE2G/README.md")).toBe(true);
    console.log("REPO_CLEANUP_NAVIGATION_LINKS=" + JSON.stringify({
      pages_checked: pages.length,
      local_targets_checked: checked,
      original_scientific_paths_unchanged: true,
      provider_calls: 0,
    }));
  });
});
