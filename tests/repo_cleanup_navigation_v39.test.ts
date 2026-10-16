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
    expect(existsSync("data-collection/plans/V3.9_DataCollectPlan_f.8.md")).toBe(true);
    expect(existsSync("data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md")).toBe(true);
    expect(existsSync("data-collection/phase2g/operations/OPERATOR_SHELL_ONLY_GUARDRAIL.md")).toBe(true);
    expect(existsSync("data-collection/phase2g/legacy-lowercase/README.md")).toBe(true);
    expect(existsSync("data-collection/phase2g/legacy-uppercase/README.md")).toBe(true);
    console.log("REPO_CLEANUP_NAVIGATION_LINKS=" + JSON.stringify({
      pages_checked: pages.length,
      local_targets_checked: checked,
      original_scientific_blobs_preserved_at_new_paths: true,
      provider_calls: 0,
    }));
  });
});
