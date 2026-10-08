import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/phase2g-paid-stage1.yml"),
  "utf8",
);

const receiver = "https://replit-tranvr--hk84164.replit.app";

const gate = workflow.slice(
  workflow.indexOf("- name: Require exact published callback runtime"),
  workflow.indexOf("- name: Verify GitHub/Replit runtime DB binding"),
);

describe("Phase2G paid callback origin safety", () => {
  it("defaults to the dedicated hk84164 receiver", () => {
    expect(workflow).toContain(
      `default: '${receiver}'`,
    );
    expect(workflow).not.toContain(
      "default: 'https://travnr.com'",
    );
  });

  it("requires the exact receiver before making HTTP requests", () => {
    expect(gate).toContain(
      `EXPECTED_CALLBACK_ORIGIN="${receiver}"`,
    );
    expect(gate).toContain(
      'if [[ "$BASE" != "$EXPECTED_CALLBACK_ORIGIN" ]]; then',
    );
    expect(gate).toContain(
      "Paid Stage1 requires the dedicated hk84164 callback receiver",
    );

    const check = gate.indexOf(
      'if [[ "$BASE" != "$EXPECTED_CALLBACK_ORIGIN" ]]; then',
    );
    const request = gate.indexOf("curl");

    expect(check).toBeGreaterThan(-1);
    expect(request).toBeGreaterThan(check);
  });

  it("preserves the published-runtime source binding", () => {
    expect(gate).toContain('if [[ "$MODE" != "published" ]]');
    expect(gate).toContain("/__v39/workspace-runtime");
    expect(gate).toContain("health?.git_head");
    expect(gate).toContain("health?.published_deployment !== true");
  });
});
