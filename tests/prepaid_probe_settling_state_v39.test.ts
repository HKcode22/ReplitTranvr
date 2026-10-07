import {
  describe,
  expect,
  it,
} from "vitest";

import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

const runtime = readFileSync(
  join(
    process.cwd(),
    "server/lib/disruption/prepaidProbeRuntime_v39.ts",
  ),
  "utf8",
);

describe(
  "Phase2G prepaid settling-state contract",
  () => {
    it(
      "accepts callbacks during settling",
      () => {
        expect(runtime).toContain(
          "state IN ('armed','active','settling')",
        );

        expect(runtime).toContain(
          '["armed", "active", "settling"].includes(state)',
        );
      },
    );

    it(
      "never reactivates a settling session when a late callback arrives",
      () => {
        expect(runtime).toContain(
          "WHEN state='armed' THEN 'active'",
        );

        expect(runtime).toContain(
          "ELSE state",
        );

        expect(runtime).not.toContain(
          "provider_subscription_id=COALESCE(provider_subscription_id,$2),state='active',last_delivery_at_utc=$3",
        );
      },
    );

    it(
      "still allows an armed session to become active",
      () => {
        expect(runtime).toMatch(
          /state=CASE\s+WHEN state='armed' THEN 'active'\s+ELSE state\s+END/,
        );
      },
    );
  },
);
