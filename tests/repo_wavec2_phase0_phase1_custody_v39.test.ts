import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const originals: Readonly<Record<string, string>> = {
  "data-collection/phase0/requests/confused.md": "c611b806199d84e6777807ff9bbe1ab0e24fe332",
  "data-collection/phase0/reviews/gptP0analyze.md": "58e833c491783901a8f9025ed966a83fe5c67c5e",
  "data-collection/phase0/reviews/gptP0analyze2.md": "030ca3722ceeac3c7315a45bbf47046478946e56",
  "data-collection/phase0/reviews/gptP0analyze3.md": "2c65785db085e4a85375821af0419085923592d8",
  "data-collection/phase0/reviews/gptP0analyze4.md": "ed76774bae16866ca58752da6237f3eb19cde5ff",
  "data-collection/phase0/reviews/gptP0analyze5.md": "d7a7ee5ea56ed5ad6e33ed0e1b4d92bf97b4f990",
  "data-collection/phase0/reviews/gptP0analyze6.md": "a825cab9f6186b673f431d71e2e33aec01925356",
  "data-collection/phase0/reviews/gptP0analyze7.md": "72468606ba162abdbdcefb96a56d2b7480df15c3",
  "data-collection/phase1/GATE0_INPUT_CHECKLIST.md": "560bb06eb155e5d24a5b19c0e176afa422c4deba"
};

describe("Wave C2 archived science phase custody (offline)", () => {
  it("retains original nine exact Git blob identities and removes superseded paths", () => {
    for (const [newPath, sha] of Object.entries(originals)) {
      const oldPath = newPath.replace("data-collection/", "docs/history/");
      expect(existsSync(newPath), newPath).toBe(true);
      expect(existsSync(oldPath), oldPath).toBe(false);
      expect(execFileSync("git", ["hash-object", newPath], { encoding: "utf8" }).trim()).toBe(sha);
    }
  });
  it("makes phases 0 through 3 discoverable under data-collection", () => {
    for (const phase of ["phase0", "phase1", "phase2", "phase2g", "phase3"]) {
      expect(existsSync(`data-collection/${phase}/README.md`)).toBe(true);
    }
    const home=readFileSync("data-collection/README.md","utf8");
    expect(home).toContain("phase0/README.md");
    expect(home).toContain("phase1/README.md");
    expect(readFileSync("data-collection/phase0/reviews/README.md","utf8")).toContain("(gptP0analyze4.md)");
  });
});
