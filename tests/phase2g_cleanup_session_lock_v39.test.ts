import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const runtime = readFileSync(
  "server/lib/disruption/prepaidProbeRuntime_v39.ts",
  "utf8",
);

const routes = readFileSync(
  "server/routes_v3.ts",
  "utf8",
);

const callback = runtime.slice(
  runtime.indexOf("export async function persistPrepaidProbeWebhookV39("),
  runtime.indexOf("export async function prepaidProbeInternalCreditsV39("),
);

const cleanup = runtime.slice(
  runtime.indexOf("export async function cleanupPrepaidProbeSessionLocalV39("),
  runtime.indexOf("export async function cleanupPrepaidProbeSessionV39("),
);

const signedRoute = routes.slice(
  routes.indexOf('app.post("/__v39/phase2g/runtime-cleanup"'),
  routes.indexOf('app.post("/api/v1/webhooks/aerodatabox",webhookIngress);'),
);

describe("Phase2G session cleanup coordination contract", () => {
  it("callback locks session before object-storage persistence", () => {
    expect(callback).toContain("FOR UPDATE");
    expect(callback.indexOf("FOR UPDATE")).toBeLessThan(
      callback.indexOf("persistProviderBlobBeforeAckV39("),
    );
  });

  it("cleanup establishes session ownership before deleting blobs", () => {
    expect(cleanup).toContain("FOR UPDATE");

    const lock = cleanup.indexOf("FOR UPDATE");
    const deletion = cleanup.indexOf("deleteProviderBlobAtExpiryV39(");

    expect(lock).toBeGreaterThan(-1);
    expect(deletion).toBeGreaterThan(lock);
  });

  it("the signed route coordinates cleanup with a DB lock", () => {
    expect(signedRoute).toContain("phase2gCleanupProofGuard");

    // Route-level or delegated cleanup locking is required.
    // This test alone does not prove transaction-wide exclusivity.
    expect(
      signedRoute.includes("FOR UPDATE") ||
      signedRoute.includes("pg_advisory") ||
      signedRoute.includes("acquirePhase2gCleanup")
    ).toBe(true);
  });
});
