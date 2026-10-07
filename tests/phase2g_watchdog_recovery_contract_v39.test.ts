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

const root = process.cwd();

const read = (path: string) =>
  readFileSync(
    join(root, path),
    "utf8",
  );

const watchdog =
  read(
    "scripts/v39_phase2g_github_actions_watchdog_v39.ts",
  );

const recovery =
  read(
    "scripts/v39_phase2g_stage1_recover_after_exit_v39.ts",
  );

const windowSource =
  read(
    "server/lib/disruption/prepaidProbeWindow_v39.ts",
  );

const expectedProviderSafetyReasons = [
  "provider_balance_invalid_during_probe",
  "provider_balance_increased_during_probe",
  "provider_balance_read_failed_after_retries",
  "provider_subscription_inventory_read_failed",
  "provider_subscription_isolation_lost",
];

describe(
  "Phase2G watchdog/recovery cross-owner contract",
  () => {
    it(
      "recovery explicitly accepts every provider-safety durable reason emitted by the watchdog",
      () => {
        const emittedProviderReasons =
          [
            ...watchdog.matchAll(
              /durableStopReason:\s*"([^"]+)"/g,
            ),
          ]
            .map((match) => match[1])
            .filter((reason) =>
              reason.startsWith("provider_"),
            );

        expect(
          new Set(emittedProviderReasons),
        ).toEqual(
          new Set(
            expectedProviderSafetyReasons,
          ),
        );

        for (
          const reason
          of expectedProviderSafetyReasons
        ) {
          expect(recovery).toContain(
            `"${reason}"`,
          );
        }

        expect(recovery).toContain(
          "allowedProviderSafetyStopReason",
        );

        expect(recovery).toContain(
          "RECOVERY_REFUSED:STOP_REASON_NOT_ALLOWED",
        );
      },
    );

    it(
      "fails closed after three consecutive independent provider balance read failures",
      () => {
        expect(watchdog).toContain(
          "const PROVIDER_READ_FAILURE_LIMIT = 3",
        );

        expect(watchdog).toContain(
          "providerReadFailures >=",
        );

        expect(watchdog).toContain(
          "PROVIDER_READ_FAILURE_LIMIT",
        );

        expect(watchdog).toContain(
          "provider_balance_read_failed_after_retries",
        );

        expect(recovery).toContain(
          '"provider_balance_read_failed_after_retries"',
        );
      },
    );

    it(
      "does not close callback intake immediately after an external watchdog stop",
      () => {
        expect(windowSource).not.toContain(
          'externalStopRequested ? "failed" : "settling"',
        );

        const deletion =
          windowSource.indexOf(
            "subscriptionDeleted = await deleteOwnedSubscriptionVerifiedV39",
          );

        const settling =
          windowSource.indexOf(
            `await setPrepaidProbeSessionStateV39(
    session.sessionId,
    "settling",
  );`,
            deletion,
          );

        const externalFailure =
          windowSource.indexOf(
            "if (externalStopRequested)",
            settling,
          );

        expect(deletion).toBeGreaterThan(-1);
        expect(settling).toBeGreaterThan(
          deletion,
        );
        expect(externalFailure).toBeGreaterThan(
          settling,
        );
      },
    );

    it(
      "keeps the recovered runtime callback-accepting after verified provider deletion",
      () => {
        const verifiedDeletion =
          recovery.indexOf(
            "Exact provider deletion is now verified",
          );

        const settling =
          recovery.indexOf(
            "SET state='settling'",
            verifiedDeletion,
          );

        expect(
          verifiedDeletion,
        ).toBeGreaterThan(-1);

        expect(settling).toBeGreaterThan(
          verifiedDeletion,
        );

        const block =
          recovery.slice(
            verifiedDeletion,
            settling + 120,
          );

        expect(block).not.toContain(
          "SET state='failed'",
        );
      },
    );
  },
);
