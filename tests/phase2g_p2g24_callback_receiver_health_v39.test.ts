import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const receiver = readFileSync(join(root, "server/phase2gCallbackOnly.ts"), "utf8");
const supervisor = readFileSync(
  join(root, "scripts/v39_phase2g_stage1_logged_supervisor_v39.ts"),
  "utf8",
);

describe("P2G24 published callback startup and diagnostics hardening", () => {
  it("responds to Replit's GET / healthcheck before the callback-only allowlist", () => {
    const rootRoute = receiver.indexOf('app.get("/", (_req, res) => {');
    const allowlist = receiver.indexOf("app.use((req, res, next) => {");
    expect(rootRoute).toBeGreaterThan(-1);
    expect(allowlist).toBeGreaterThan(rootRoute);
    expect(receiver).toContain('service: "phase2g-callback-only"');
    expect(receiver).toContain("res.status(200).json({");
  });

  it("does not expose other application routes or provider operations for healthchecking", () => {
    expect(receiver).toContain("const prepaidPath =");
    expect(receiver).toContain("const controlRoutes = new Set([");
    expect(receiver).toContain('res.status(404).json({ error: "Not found" });');
    expect(receiver).toContain("provider_call: false");
    expect(receiver).toContain("provider_mutation: false");
    expect(receiver).toContain("AUTO_COLLECTION_MUST_BE_DISABLED");
  });

  it("records only sanitized names for every independent callback-health gate", () => {
    for (const stage of [
      '"wrong_secret_route"',
      '"published_runtime"',
      '"webhook_secret_binding"',
      '"runtime_db_binding"',
    ]) expect(supervisor).toContain(stage);
    for (const key of [
      "http_status: httpStatus",
      "elapsed_ms: Date.now() - started",
      '"request_timeout"',
      '"network_or_request_error"',
      '"runtime_contract_or_http_mismatch"',
      '"secret_binding_contract_or_http_mismatch"',
      '"database_binding_contract_or_http_mismatch"',
    ]) expect(supervisor).toContain(key);
    expect(supervisor).not.toContain("console.error(error.message)");
    expect(supervisor).not.toContain("JSON.stringify(process.env)");
  });

  it("retains exact published-source/binding checks and fail-closed stop semantics", () => {
    expect(supervisor).toContain('String(health?.git_head ?? "").toLowerCase() !== expectedHead');
    expect(supervisor).toContain('health?.published_deployment !== publishedMode');
    expect(supervisor).toContain('const CALLBACK_POLL_MS = 15_000');
    expect(supervisor).toContain("const CALLBACK_CONSECUTIVE_FAILURE_LIMIT = 3");
    expect(supervisor).toContain(
      'requestTermination("SIGTERM", "workspace_callback_unreachable_threshold")',
    );
    expect(supervisor).toContain(
      "callbackFailureCount = callbackHealth.healthy ? 0 : callbackFailureCount + 1",
    );
  });
});
