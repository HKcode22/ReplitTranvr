import { createHash } from "crypto";

export const RETENTION_SURFACES = ["primary", "replica", "backup", "object", "log"] as const;
export type RetentionSurface = typeof RETENTION_SURFACES[number];

export const PHASE0_RETENTION_PLAN = Object.freeze({
  version: "v39-retention-plan@1.0.0",
  mode: "dry-run-only",
  surfaces: RETENTION_SURFACES,
  expiryAction: "delete-raw-content",
  retainedEvidence: "non-content-sha256-tombstone",
  legalPeriods: "BLOCKED_PENDING_PREREQUISITE_P",
});
export const PHASE0_RETENTION_PLAN_HASH = createHash("sha256").update(JSON.stringify(PHASE0_RETENTION_PLAN)).digest("hex");

export interface RetentionCandidate { id: string; contentHash: string; expiresAt: string; containsRawContent: boolean; }
export interface RetentionAdapter { listExpired(cutoffIso: string): Promise<readonly RetentionCandidate[]>; delete?(id: string): Promise<void>; }
export type RetentionAdapters = Record<RetentionSurface, RetentionAdapter>;
export interface RetentionAction { surface: RetentionSurface; id: string; contentHash: string; action: "would-delete"; }

export async function executeRetentionDryRun(adapters: RetentionAdapters, cutoffIso: string, dryRun: true): Promise<{ cutoffIso: string; planHash: string; actions: RetentionAction[]; evidenceHash: string }>;
export async function executeRetentionDryRun(adapters: RetentionAdapters, cutoffIso: string, dryRun: boolean): Promise<{ cutoffIso: string; planHash: string; actions: RetentionAction[]; evidenceHash: string }> {
  if (!dryRun) throw new Error("REFUSE_LIVE_DELETION_PHASE0");
  if (!Number.isFinite(Date.parse(cutoffIso))) throw new Error("REFUSE_INVALID_RETENTION_CUTOFF");
  const actions: RetentionAction[] = [];
  for (const surface of RETENTION_SURFACES) {
    for (const item of await adapters[surface].listExpired(cutoffIso)) {
      if (!item.id || !/^[a-f0-9]{64}$/i.test(item.contentHash) || Date.parse(item.expiresAt) > Date.parse(cutoffIso)) {
        throw new Error(`REFUSE_INVALID_RETENTION_CANDIDATE:${surface}:${item.id}`);
      }
      actions.push({ surface, id: item.id, contentHash: item.contentHash.toLowerCase(), action: "would-delete" });
    }
  }
  actions.sort((a, b) => `${a.surface}:${a.id}`.localeCompare(`${b.surface}:${b.id}`));
  const evidenceHash = createHash("sha256").update(JSON.stringify({ cutoffIso, planHash: PHASE0_RETENTION_PLAN_HASH, actions })).digest("hex");
  return { cutoffIso, planHash: PHASE0_RETENTION_PLAN_HASH, actions, evidenceHash };
}

export interface DatabaseRoleEvidence { tls: boolean; role: string; grants: readonly string[]; auditLogging: boolean; }
// Runtime least-privilege vocabulary (Phase-0 machinery, verified live):
// - CLEAN_SCHEMA_DML: SELECT/INSERT/UPDATE/DELETE on clean.* tables, no DDL.
// - CLEAN_SEQUENCE_USAGE: USAGE/SELECT on clean sequences (serial IDs).
// Anything else (DDL, superuser-ish, other schemas) is an excess grant.
// Narrower per-table grants were tried and REJECTED: the production runtime
// (controller, FIDS census, snapshots, frame/probe ledgers) needs full clean
// DML to function; least privilege here means no schema change, no roles,
// no superuser, TLS-only, audited — verified against pg grants, not asserted.
const ALLOWED_GRANTS = new Set(["CLEAN_SCHEMA_DML", "CLEAN_SEQUENCE_USAGE"]);
export function checkLeastPrivilege(evidence: DatabaseRoleEvidence): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!evidence.tls) failures.push("database-tls-required");
  if (!evidence.role || /owner|admin|superuser/i.test(evidence.role)) failures.push("dedicated-non-admin-role-required");
  if (!evidence.auditLogging) failures.push("audit-logging-required");
  if (evidence.grants.some((grant) => !ALLOWED_GRANTS.has(grant))) failures.push("excess-database-grant");
  for (const required of ["CLEAN_SCHEMA_DML", "CLEAN_SEQUENCE_USAGE"]) if (!evidence.grants.includes(required)) failures.push(`missing-grant:${required}`);
  return { pass: failures.length === 0, failures };
}

export interface WebhookSecurityEvidence { url: string; providerAuth: "signature" | "token" | "none"; compensatingControlApproved: boolean; replaySafeIdentity: boolean; }
export function checkWebhookSecurity(evidence: WebhookSecurityEvidence): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!evidence.url.startsWith("https://")) failures.push("webhook-tls-required");
  if (evidence.providerAuth === "none" && !evidence.compensatingControlApproved) failures.push("no-auth-compensating-control-unapproved");
  if (!evidence.replaySafeIdentity) failures.push("replay-safe-identity-required");
  return { pass: failures.length === 0, failures };
}

export type IncidentCause = "authentication" | "raw-persistence" | "reconciliation" | "deletion";
export interface IncidentStopState { stopped: boolean; humanReviewRequired: boolean; cause: IncidentCause | null; occurredAt: string | null; }
export const CLEAR_INCIDENT_STATE: IncidentStopState = Object.freeze({ stopped: false, humanReviewRequired: false, cause: null, occurredAt: null });
export function triggerIncidentStop(cause: IncidentCause, occurredAt: string): IncidentStopState {
  if (!Number.isFinite(Date.parse(occurredAt))) throw new Error("REFUSE_INVALID_INCIDENT_TIME");
  return { stopped: true, humanReviewRequired: true, cause, occurredAt };
}
export function assertSubscriptionStartAllowed(state: IncidentStopState): void {
  if (state.stopped || state.humanReviewRequired) throw new Error(`REFUSE_INCIDENT_STOP:${state.cause ?? "review"}`);
}
