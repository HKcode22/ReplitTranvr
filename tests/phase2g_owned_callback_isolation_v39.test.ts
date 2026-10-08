import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(p: string): string {
  return fs.readFileSync(path.join(root, p), "utf8");
}

const entry = read("server/phase2gCallbackOnly.ts");
const build = read("scripts/build.ts");
const config = read(".replit");
const fullApp = read("server/index.ts");

describe("Owned Phase2G callback-only isolation", () => {
  it("requires explicit callback-only mode", () => {
    expect(entry).toContain(
      'process.env.V39_CALLBACK_ONLY_RUNTIME !== "1"'
    );

    expect(entry).toContain(
      'process.env.ADB_AUTO_COLLECT !== "false"'
    );

    expect(entry).toContain(
      "SCIENTIFIC_DATABASE_URL_REQUIRED"
    );

    expect(entry).toContain(
      "DEDICATED_BLOB_STORAGE_REQUIRED"
    );
  });

  it("registers the paid ingress and runtime proof", () => {
    expect(entry).toContain("registerV3Routes(app)");

    expect(entry).toContain(
      "registerWorkspaceRuntimeHealthV39(app"
    );

    expect(entry).toContain(
      "prepaidPath.test(req.path)"
    );

    expect(entry).toContain(
      '"/__v39/workspace-runtime"'
    );
  });

  it("installs deny-by-default routing before v3", () => {
    const deny = entry.indexOf(
      "app.use((req, res, next) => {"
    );

    const register = entry.indexOf(
      "registerV3Routes(app)"
    );

    expect(deny).toBeGreaterThan(-1);
    expect(register).toBeGreaterThan(deny);

    expect(entry).toContain(
      'res.status(404).json({ error: "Not found" })'
    );

    expect(entry).toContain(
      'controlRoutes.has(req.path)'
    );
  });

  it("does not boot the full Travnr application", () => {
    expect(entry).not.toContain(
      "applyBootMigrations"
    );

    expect(entry).not.toContain(
      "runMigrations"
    );

    expect(entry).not.toContain(
      "initStripe"
    );

    expect(entry).not.toContain(
      "registerRoutes("
    );

    expect(entry).not.toContain(
      "startMonitoringEngine"
    );

    expect(entry).not.toContain(
      "startTestFlightSeeder"
    );
  });

  it("uses the callback-only server in deployment", () => {
    expect(build).toContain(
      'process.env.V39_CALLBACK_ONLY_BUILD === "1"'
    );

    expect(build).toContain(
      '"server/phase2gCallbackOnly.ts"'
    );

    expect(config).toContain(
      '"V39_CALLBACK_ONLY_RUNTIME=1"'
    );

    expect(config).toContain(
      '"V39_CALLBACK_ONLY_BUILD=1"'
    );

    expect(config).toContain(
      'deploymentTarget = "autoscale"'
    );
  });

  it("prevents wrong-binary full-app startup", () => {
    expect(fullApp).toContain(
      "REFUSED:FULL_APP_BINARY_IN_CALLBACK_ONLY_MODE"
    );
  });

  it("does not inherit original deployment settings", () => {
    expect(config).not.toContain("[postMerge]");
    expect(config).not.toContain("https://travnr.com");

    expect(config).toContain(
      'V39_PROVIDER_BLOB_BUCKET_ID = "replit-objstore-5aa4d2c4-399b-4933-9acf-0292f79d6d59"'
    );

    expect(config).not.toContain(
      'replit-objstore-89d08290-bfed-4ba9-ab3a-517a47e8095f'
    );

    expect(config).not.toContain(
      'WEBHOOK_BASE_URL = '
    );
  });
});
