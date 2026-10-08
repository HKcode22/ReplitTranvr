import {
  readFileSync
} from "node:fs";
import {
  join
} from "node:path";
import {
  describe,
  expect,
  it
} from "vitest";

const root = process.cwd();

const paid = readFileSync(
  join(
    root,
    ".github",
    "workflows",
    "phase2g-paid-stage1.yml",
  ),
  "utf8",
);

const zero = readFileSync(
  join(
    root,
    ".github",
    "workflows",
    "phase2g-zero-credit-callback-binding.yml",
  ),
  "utf8",
);

const supervisor = readFileSync(
  join(
    root,
    "scripts",
    "v39_phase2g_stage1_logged_supervisor_v39.ts",
  ),
  "utf8",
);

const preflight = readFileSync(
  join(
    root,
    "scripts",
    "v39_phase2g_stage1_paid_preflight_v39.ts",
  ),
  "utf8",
);

describe(
  "Phase2G paid callback durability regression",
  () => {
    it(
      "allows only published callback mode in the paid workflow UI",
      () => {
        const inputBlock = paid.slice(
          paid.indexOf("callback_mode:"),
          paid.indexOf(
            "callback_contingency_file:",
          ),
        );

        expect(inputBlock).toContain(
          "- published",
        );

        expect(inputBlock).not.toContain(
          "- same-app-development-contingency",
        );
      },
    );

    it(
      "refuses replit.dev before any paid owner can start",
      () => {
        const gate = paid.slice(
          paid.indexOf("  gate:"),
          paid.indexOf("  owner:"),
        );

        expect(gate).toContain(
          "Require exact published callback runtime",
        );

        expect(gate).toContain(
          ".replit.dev is forbidden for paid Stage1",
        );

        expect(gate).toContain(
          "replit-published-deployment",
        );

        expect(gate).toContain(
          "PUBLISHED_RUNTIME_BINDING=PASS",
        );
      },
    );

    it(
      "binds zero-credit proof to the published deployment",
      () => {
        expect(zero).toContain(
          'health?.runtime_owner_mode !== "replit-published-deployment"',
        );

        expect(zero).toContain(
          'health?.published_deployment !== true',
        );

        expect(zero).toContain(
          '"autoscale", "reserved-vm"',
        );
      },
    );

    it(
      "continuously rechecks published runtime identity during the paid window",
      () => {
        expect(supervisor).toContain(
          'const publishedMode = callbackMode === "published"',
        );

        expect(supervisor).toContain(
          '"replit-published-deployment"',
        );

        expect(supervisor).toContain(
          '"autoscale", "reserved-vm"',
        );

        expect(supervisor).toContain(
          "/__v39/phase2g/webhook-secret-match",
        );

        expect(supervisor).toContain(
          "/__v39/phase2g/runtime-db-binding",
        );

        expect(supervisor).toContain(
          "const CALLBACK_POLL_MS = 15_000",
        );
      },
    );

    it(
      "blocks a stale published deployment in final preflight",
      () => {
        expect(preflight).toContain(
          "published_callback_runtime_health_not_exact",
        );

        expect(preflight).toContain(
          "replit-published-deployment",
        );

        expect(preflight).toContain(
          '"autoscale", "reserved-vm"',
        );
      },
    );
  },
);
