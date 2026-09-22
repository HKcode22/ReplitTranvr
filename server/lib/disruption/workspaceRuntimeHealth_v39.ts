import { execFileSync } from "node:child_process";
import type { Express } from "express";
import { resolvePrepaidRawRetentionHoursV39 } from "./prepaidProbeRuntime_v39";
import { normalizeProviderBlobBucketIdV39 } from "./replitProviderBlobStore_v39";

function gitHead(): string {
  const deployed = String(process.env.V39_DEPLOYED_GIT_HEAD ?? "").trim().toLowerCase();
  if (/^[a-f0-9]{40}$/.test(deployed)) return deployed;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().toLowerCase();
  } catch {
    return "unknown";
  }
}

export type WorkspaceRuntimeOwnerModeV39 =
  | "replit-managed-project"
  | "phase2g-detached-npm-run-dev"
  | "replit-published-deployment";

function runtimeOwnerMode(): WorkspaceRuntimeOwnerModeV39 {
  const raw = String(process.env.V39_WORKSPACE_RUNTIME_OWNER_MODE ?? "").trim();
  if (raw === "replit-managed-project" ||
      raw === "phase2g-detached-npm-run-dev" ||
      raw === "replit-published-deployment") return raw;
  throw new Error("WORKSPACE_RUNTIME_OWNER_MODE_INVALID_OR_MISSING");
}

export interface WorkspaceRuntimeHealthRegistrationV39 {
  routeOwner: string;
  startupGitHead?: string;
}

/**
 * Register the Phase-2 workspace health contract on the canonical port-5000 app.
 *
 * The owner lifecycle is explicit rather than inferred. Normal Replit Project
 * runs set V39_WORKSPACE_RUNTIME_OWNER_MODE=replit-managed-project in .replit.
 * When the Run UI is unavailable, the guarded Tuesday helper may start the same
 * npm run dev command in a detached OS session and labels that mode
 * phase2g-detached-npm-run-dev. Published deployments use
 * replit-published-deployment and must also declare their durability class.
 * Every mode remains subject to exact Git/callback health checks; an
 * unlabeled/manual process fails closed.
 */
export function registerWorkspaceRuntimeHealthV39(
  app: Express,
  input: WorkspaceRuntimeHealthRegistrationV39,
): void {
  const startupGitHead = String(input.startupGitHead ?? gitHead()).toLowerCase();

  app.get("/__v39/workspace-runtime", (_req, res) => {
    let ownerMode: WorkspaceRuntimeOwnerModeV39 | null = null;
    try {
      if (!/^[a-f0-9]{40}$/.test(startupGitHead)) {
        throw new Error("WORKSPACE_RUNTIME_GIT_HEAD_INVALID");
      }
      ownerMode = runtimeOwnerMode();
      const mode = String(process.env.V39_PROVIDER_BLOB_MODE ?? "").trim().toLowerCase();
      if (mode !== "required") throw new Error("WORKSPACE_RUNTIME_BLOB_MODE_NOT_REQUIRED");
      const bucket = normalizeProviderBlobBucketIdV39(
        String(process.env.V39_PROVIDER_BLOB_BUCKET_ID ?? ""),
      );
      const retentionHours = resolvePrepaidRawRetentionHoursV39();
      const managed = ownerMode === "replit-managed-project";
      const detached = ownerMode === "phase2g-detached-npm-run-dev";
      const published = ownerMode === "replit-published-deployment";
      const durabilityClass = String(process.env.V39_RUNTIME_DURABILITY_CLASS ?? "").trim().toLowerCase();
      if (published && durabilityClass !== "reserved-vm" && durabilityClass !== "autoscale") {
        throw new Error("PUBLISHED_RUNTIME_DURABILITY_CLASS_INVALID_OR_MISSING");
      }

      res.status(200).json({
        schema: "v39.phase2f-workspace-runtime.v1",
        status: "PASS",
        git_head: startupGitHead,
        route_owner: input.routeOwner,
        prepaid_route_registered: true,
        retention_hours: retentionHours,
        bucket_prefix: bucket.split("-").slice(0, 2).join("-"),
        provider_mutation: false,
        runtime_owner_mode: ownerMode,
        managed_replit_workflow: managed,
        detached_workspace_server: detached,
        published_deployment: published,
        runtime_durability_class: published ? durabilityClass : null,
      });
    } catch (error) {
      res.status(503).json({
        schema: "v39.phase2f-workspace-runtime.v1",
        status: "FAIL",
        git_head: /^[a-f0-9]{40}$/.test(startupGitHead) ? startupGitHead : null,
        route_owner: input.routeOwner,
        prepaid_route_registered: true,
        provider_mutation: false,
        runtime_owner_mode: ownerMode,
        managed_replit_workflow: ownerMode === "replit-managed-project",
        detached_workspace_server: ownerMode === "phase2g-detached-npm-run-dev",
        published_deployment: ownerMode === "replit-published-deployment",
        runtime_durability_class: ownerMode === "replit-published-deployment"
          ? String(process.env.V39_RUNTIME_DURABILITY_CLASS ?? "").trim().toLowerCase() || null
          : null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
