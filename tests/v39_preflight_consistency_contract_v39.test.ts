import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const scanner =
  readFileSync(
    join(
      process.cwd(),
      "scripts/v39_preflight_consistency.ts",
    ),
    "utf8",
  );

describe(
  "V3.9 lexical scanner authority contract",
  () => {
    it(
      "uses the current Plan and active Implementation Log as scanner inputs",
      () => {
        expect(scanner).toContain(
          "'V3.9_DataCollectPlan_f.8.md'",
        );

        expect(scanner).toContain(
          "'V3.9_IMPLEMENTATION_LOG.md'",
        );

        expect(scanner).not.toContain(
          "'V39_CANONICAL_RULE_REGISTRY.yaml',",
        );

        expect(scanner).not.toContain(
          "'V39_CANONICAL_RULE_REGISTRY.yaml':",
        );

        expect(scanner).not.toContain(
          "archiveOld/AugMDnotes",
        );
      },
    );

    it(
      "fails closed when a declared current normative input is missing",
      () => {
        expect(scanner).toContain(
          "SCANNER_REFUSED:MISSING_NORMATIVE_FILE",
        );
      },
    );

    it(
      "labels itself as lexical diagnostic evidence rather than semantic closure proof",
      () => {
        expect(scanner).toContain(
          "SCANNER_MODE=LEXICAL_DIAGNOSTIC_ONLY",
        );

        expect(scanner).toContain(
          "SCANNER_CLOSURE=NOT_PROVEN_BY_THIS_TOOL",
        );

        expect(scanner).not.toContain(
          "CURRENT_CONTRADICTIONS = 0 — PASS",
        );
      },
    );
  },
);
