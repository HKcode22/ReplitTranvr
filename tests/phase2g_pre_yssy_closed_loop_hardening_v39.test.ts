import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (path: string) =>
  readFileSync(join(root, path), "utf8");

const windowSource = read(
  "server/lib/disruption/prepaidProbeWindow_v39.ts",
);

const watchdog = read(
  "scripts/v39_phase2g_github_actions_watchdog_v39.ts",
);

const snapshot = read(
  "scripts/v39_phase2g_scientific_health_snapshot_v39.ts",
);

const routes = read(
  "server/routes_v3.ts",
);

describe(
  "Phase2G pre-YSSY closed-loop hardening",
  () => {
    it(
      "does not clamp provider balance increases to zero",
      () => {
        expect(windowSource).not.toContain(
          "Math.max(0, input.balanceBefore - balance.creditsRemaining)",
        );

        expect(windowSource).not.toContain(
          "const externalCredits = Math.max",
        );

        expect(watchdog).not.toContain(
          "Math.max(0, baseline - lastProviderBalance)",
        );

        expect(windowSource).toContain(
          "provider_balance_increased_during_probe",
        );

        expect(windowSource).toContain(
          "provider_balance_increased_during_settlement",
        );
      },
    );

    it(
      "treats account-isolation loss as non-scoreable UNRESOLVED evidence",
      () => {
        expect(windowSource).toContain(
          "accountContaminationReasons",
        );

        expect(windowSource).toContain(
          "provider_subscription_isolation_lost",
        );

        expect(windowSource).toContain(
          "provider_subscription_inventory_read_failed",
        );

        expect(windowSource).toContain(
          'evidenceStatus: "UNRESOLVED"',
        );

        expect(windowSource).toContain(
          'reconciliationStatus: "UNRESOLVED"',
        );
      },
    );

    it(
      "continuously proves the exact owned CreditBased subscription",
      () => {
        expect(windowSource).toContain(
          "listSubscriptionsStrictWithRetry",
        );

        expect(windowSource).toContain(
          'candidate.billingType ===\n                  "CreditBased"',
        );

        expect(watchdog).toContain(
          "provider_subscription_id",
        );

        expect(watchdog).toContain(
          "listSubscriptionsStrictWithRetry",
        );

        expect(watchdog).toContain(
          "provider_subscription_isolation_lost",
        );
      },
    );

    it(
      "bounds watchdog and snapshot health to the experiment window",
      () => {
        expect(watchdog).toContain(
          "windowStartUtc:",
        );

        expect(watchdog).toContain(
          "new Date(probe.window_start)",
        );

        expect(watchdog).toContain(
          "windowEndUtc:",
        );

        expect(watchdog).toContain(
          "new Date(probe.window_end)",
        );

        expect(snapshot).toContain(
          "window_start,window_end",
        );

        expect(snapshot).toContain(
          "windowStartUtc:",
        );

        expect(snapshot).toContain(
          "windowEndUtc:",
        );
      },
    );

    it(
      "blocks manual provider mutations while a probe is probing or settling",
      () => {
        expect(routes).toContain(
          "REFUSED_PROVIDER_MUTATION_DURING_LIVE_PROBE",
        );

        expect(routes).toContain(
          "status IN ('probing','settling')",
        );
      },
    );

    it(
      "never allows a non-null local stop to disappear into deferred cleanup",
      () => {
        const localStop =
          windowSource.indexOf(
            "if (liveStopReason !== null)",
          );

        const deferred =
          windowSource.lastIndexOf(
            "if (input.deferCleanup)",
          );

        expect(localStop).toBeGreaterThan(-1);
        expect(deferred).toBeGreaterThan(localStop);
      },
    );
  },
);
