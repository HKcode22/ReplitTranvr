import { execFileSync } from "node:child_process";
import type { Express } from "express";
import { resolvePrepaidRawRetentionHoursV39 } from "./prepaidProbeRuntime_v39";
import { normalizeProviderBlobBucketIdV39 } from "./replitProviderBlobStore_v39";

function gitHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().toLowerCase();
  } catch {
    return "unknown";
  }
}

export interface WorkspaceRuntimeHealthRegistrationV39 {
  routeOwner: string;
  startupGitHead?: string;
}

/**
 * Register the Phase-2 workspace health contract on the Replit-managed app.
 *
 * This route performs no provider mutation and no database write. It exists so
 * the normal `npm run dev` process can remain the canonical owner of port 5000;
 * Phase-2 must not kill Replit's managed workflow merely to install a separate
 * callback server.
 */
export function registerWorkspaceRuntimeHealthV39(
  app: Express,
  input: WorkspaceRuntimeHealthRegistrationV39,
): void {
  const startupGitHead = String(input.startupGitHead ?? gitHead()).toLowerCase();

  app.get("/__v39/workspace-runtime", (_req, res) => {
    try {
      if (!/^[a-f0-9]{40}$/.test(startupGitHead)) {
        throw new Error("WORKSPACE_RUNTIME_GIT_HEAD_INVALID");
      }
      const mode = String(process.env.V39_PROVIDER_BLOB_MODE ?? "").trim().toLowerCase();
      if (mode !== "required") throw new Error("WORKSPACE_RUNTIME_BLOB_MODE_NOT_REQUIRED");
      const bucket = normalizeProviderBlobBucketIdV39(
        String(process.env.V39_PROVIDER_BLOB_BUCKET_ID ?? ""),
      );
      const retentionHours = resolvePrepaidRawRetentionHoursV39();

      res.status(200).json({
        schema: "v39.phase2f-workspace-runtime.v1",
        status: "PASS",
        git_head: startupGitHead,
        route_owner: input.routeOwner,
        prepaid_route_registered: true,
        retention_hours: retentionHours,
        bucket_prefix: bucket.split("-").slice(0, 2).join("-"),
        provider_mutation: false,
        managed_replit_workflow: true,
      });
    } catch (error) {
      res.status(503).json({
        schema: "v39.phase2f-workspace-runtime.v1",
        status: "FAIL",
        git_head: /^[a-f0-9]{40}$/.test(startupGitHead) ? startupGitHead : null,
        route_owner: input.routeOwner,
        prepaid_route_registered: true,
        provider_mutation: false,
        managed_replit_workflow: true,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
