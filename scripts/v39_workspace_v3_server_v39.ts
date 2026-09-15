import express from "express";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { registerV3Routes } from "../server/routes_v3";
import { resolvePrepaidRawRetentionHoursV39 } from "../server/lib/disruption/prepaidProbeRuntime_v39";

function gitHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function requiredConfig(): { bucketPrefix: string; retentionHours: number } {
  const secret = String(process.env.AERODATABOX_WEBHOOK_SECRET ?? "").trim();
  if (secret.length < 32) throw new Error("WORKSPACE_CALLBACK_WEBHOOK_SECRET_REQUIRED");

  const mode = String(process.env.V39_PROVIDER_BLOB_MODE ?? "").trim().toLowerCase();
  if (mode !== "required") throw new Error("WORKSPACE_CALLBACK_BLOB_MODE_MUST_BE_REQUIRED");

  const bucket = String(process.env.V39_PROVIDER_BLOB_BUCKET_ID ?? "").trim();
  if (!bucket.startsWith("replit-objstore-")) {
    throw new Error("WORKSPACE_CALLBACK_BUCKET_ID_NOT_CORRECTED");
  }

  return {
    bucketPrefix: bucket.split("-").slice(0, 2).join("-"),
    retentionHours: resolvePrepaidRawRetentionHoursV39(),
  };
}

// Capture this once before serving. A later `git pull` must never make a
// long-lived process claim it loaded code that it did not actually import.
const startupGitHead = gitHead();
if (!/^[a-f0-9]{40}$/i.test(startupGitHead)) throw new Error("WORKSPACE_CALLBACK_STARTUP_GIT_HEAD_INVALID");

const config = requiredConfig();
const app = express();
app.set("trust proxy", 1);
app.use(
  express.json({
    limit: "2mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// Register the exact repository V3 routes used by the application. This keeps
// the Phase-2F workspace-live callback path on the same prepaid ingress owner
// without starting unrelated application services such as Stripe/Vite.
registerV3Routes(app);

app.get("/__v39/workspace-runtime", (_req, res) => {
  res.status(200).json({
    schema: "v39.phase2f-workspace-runtime.v1",
    status: "PASS",
    git_head: startupGitHead,
    route_owner: "server/routes_v3.ts",
    prepaid_route_registered: true,
    retention_hours: config.retentionHours,
    bucket_prefix: config.bucketPrefix,
    provider_mutation: false,
  });
});

const port = Number(process.env.PORT ?? 5000);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error("WORKSPACE_CALLBACK_PORT_INVALID");
}

const server = createServer(app);
server.listen({ port, host: "0.0.0.0" }, () => {
  console.log(
    JSON.stringify({
      schema: "v39.phase2f-workspace-runtime-start.v1",
      status: "PASS",
      port,
      git_head: startupGitHead,
      prepaid_route_registered: true,
      retention_hours: config.retentionHours,
      bucket_prefix: config.bucketPrefix,
      provider_mutation: false,
    }),
  );
});

function shutdown(signal: string): void {
  console.log(`WORKSPACE_CALLBACK_SHUTDOWN=${signal}`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
