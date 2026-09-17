import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { normalizeProviderBlobBucketIdV39 } from "../server/lib/disruption/replitProviderBlobStore_v39";
import { registerWorkspaceRuntimeHealthV39 } from "../server/lib/disruption/workspaceRuntimeHealth_v39";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function captureWorkspaceHealthHandler(startupGitHead = "a".repeat(40)) {
  let registeredPath: string | null = null;
  let handler: ((req: unknown, res: any) => void) | null = null;
  const app = {
    get(route: string, routeHandler: (req: unknown, res: any) => void) {
      registeredPath = route;
      handler = routeHandler;
    },
  } as any;

  registerWorkspaceRuntimeHealthV39(app, {
    routeOwner: "server/index.ts:registerV3Routes",
    startupGitHead,
  });

  return { registeredPath, handler: handler! };
}

function invokeJsonRoute(handler: (req: unknown, res: any) => void) {
  let statusCode = 200;
  let body: any = null;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(value: unknown) {
      body = value;
      return res;
    },
  };
  handler({}, res);
  return { statusCode, body };
}

describe("Phase2G managed runtime survival guards", () => {
  it("normalizes only the known historical Replit bucket typo", () => {
    expect(normalizeProviderBlobBucketIdV39("replit-objstore-abc")).toBe("replit-objstore-abc");
    expect(normalizeProviderBlobBucketIdV39("eplit-objstore-abc")).toBe("replit-objstore-abc");
    expect(() => normalizeProviderBlobBucketIdV39("")).toThrow("V39_PROVIDER_BLOB_BUCKET_ID_REQUIRED");
    expect(() => normalizeProviderBlobBucketIdV39("other-bucket")).toThrow("V39_PROVIDER_BLOB_BUCKET_ID_UNEXPECTED");
  });

  it("serves the exact managed workspace health contract", () => {
    process.env.V39_PROVIDER_BLOB_MODE = "required";
    process.env.V39_PROVIDER_BLOB_BUCKET_ID = "eplit-objstore-test";
    process.env.V39_PREPAID_RAW_RETENTION_HOURS = "168";

    const { registeredPath, handler } = captureWorkspaceHealthHandler();
    expect(registeredPath).toBe("/__v39/workspace-runtime");

    const result = invokeJsonRoute(handler);
    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      schema: "v39.phase2f-workspace-runtime.v1",
      status: "PASS",
      git_head: "a".repeat(40),
      prepaid_route_registered: true,
      provider_mutation: false,
      managed_replit_workflow: true,
      retention_hours: 168,
    });
  });

  it("fails the health contract closed for an unknown bucket", () => {
    process.env.V39_PROVIDER_BLOB_MODE = "required";
    process.env.V39_PROVIDER_BLOB_BUCKET_ID = "wrong-bucket";

    const { handler } = captureWorkspaceHealthHandler();
    const result = invokeJsonRoute(handler);
    expect(result.statusCode).toBe(503);
    expect(result.body).toMatchObject({
      schema: "v39.phase2f-workspace-runtime.v1",
      status: "FAIL",
      provider_mutation: false,
      managed_replit_workflow: true,
      error: "V39_PROVIDER_BLOB_BUCKET_ID_UNEXPECTED",
    });
  });

  it("callback prep never takes over port 5000 or spawns a competing server", () => {
    const script = fs.readFileSync(
      path.resolve("scripts/v39_prepare_phase2f_workspace_callback_v39.sh"),
      "utf8",
    );
    expect(script).not.toContain("v39_safe_takeover_port5000_v39.ts");
    expect(script).not.toContain("v39_workspace_v3_server_v39.ts");
    expect(script).not.toContain("nohup env");
    expect(script).toContain("REPLIT_MANAGED_PORT_5000_NOT_LISTENING");
    expect(script).toContain('json?.schema === "v39.phase2f-workspace-runtime.v1"');
    expect(script).toContain("PORT_TAKEOVER_PERFORMED=false");
  });

  it("paid launch rejects an HTML 200 by requiring the exact JSON contract", () => {
    const script = fs.readFileSync(
      path.resolve("scripts/v39_phase2g_stage1_launch_logged_v39.sh"),
      "utf8",
    );
    expect(script).toContain("WORKSPACE_CALLBACK_HEALTH_CONTRACT_FAILED_AT_LAUNCH");
    expect(script).toContain("json?.schema === 'v39.phase2f-workspace-runtime.v1'");
    expect(script).toContain("json?.managed_replit_workflow === true");
    expect(script).toContain("String(json?.git_head || '').toLowerCase() === expectedHead");
    expect(script).not.toContain('curl -fsS --max-time 5 "$BASE/__v39/workspace-runtime" >/dev/null');
  });
});
