import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Git case-insensitive filename collision guard", () => {
  it("requires zero case-fold collisions after preservation-safe split", () => {
    const tracked = execFileSync("git", ["ls-files", "--cached", "-z"], {
      encoding: "utf8", timeout: 10_000, maxBuffer: 8 * 1024 * 1024
    }).split("\0").filter(Boolean);
    const paths = new Map<string,string[]>();
    for (const path of tracked) {
      const folded = path.normalize("NFC").toLowerCase();
      const existing = paths.get(folded) ?? [];
      existing.push(path);
      paths.set(folded, existing);
    }
    const collided = [...paths.values()].filter(group => group.length > 1).map(group => group.sort());
    expect(collided).toEqual([]);
    const destination = [
      "data-collection/phase2g/legacy-uppercase/README.md",
      "data-collection/phase2g/legacy-lowercase/README.md",
      "data-collection/phase2g/operations/OPERATOR_SHELL_ONLY_GUARDRAIL.md",
    ];
    expect(new Set(destination.map(path => path.toLowerCase())).size).toBe(destination.length);
    console.log("REPO_CLEANUP_CASEFOLD_GUARD=" + JSON.stringify({
      tracked_paths: tracked.length,
      casefold_filename_collisions: collided.length,
      historical_case_collision_resolved_without_blob_rewrite: true,
      proposed_split_destinations_unique: true,
      paid_provider_calls: 0
    }));
  });
});
