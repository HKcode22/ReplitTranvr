/**
 * Phase 3 Gate-3 source-contract review — pure OFFLINE READ-ONLY inspection.
 *
 * No provider account, database, published host, credentials or mutable
 * runtime state are queried. This gate reports source incompatibilities,
 * not live readiness. A clean source review can NEVER authorize a canary.
 */
export type Gate3SourceSnapshotV39 = Readonly<{
  callbackOnly: string;
  registeredRoutes: string;
  prepaidRuntime: string;
  legacyCanary: string;
  legacyWrapper: string;
  legacyReadiness: string;
}>;
export type Gate3SourceReviewV39 = Readonly<{
  schema: "v39.gate3.source-compatibility-review.v1";
  status: "BLOCKED_SOURCE_CONTRACT" | "REVIEWED_SOURCE_SHAPE_ONLY";
  blockers: string[];
  livePublishedVerified: false;
  prepaidGate3SessionArmed: false;
  authorizedPaidCanary: false;
  providerCalls: 0;
  databaseMutations: 0;
}>;

/**
 * Independent reviewer should still inspect source and runtime/SQL. No
 * string-based source audit is an authority to remove the legacy paid guard.
 */
export function reviewGate3SourceCompatibilityV39(
  snapshot: Gate3SourceSnapshotV39,
): Gate3SourceReviewV39 {
  const blockers: string[] = [];
  const reject = (why: string) => blockers.push(why);
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) ||
    (["callbackOnly","registeredRoutes","prepaidRuntime","legacyCanary","legacyWrapper","legacyReadiness"] as const).some(k => typeof snapshot[k] !== "string")) {
    reject("SOURCE_SNAPSHOT_INVALID");
  } else {
    const {
      callbackOnly, registeredRoutes, prepaidRuntime,
      legacyCanary, legacyWrapper, legacyReadiness,
    } = snapshot;
    if (!callbackOnly.includes("prepaidPath.test(req.path)") ||
        !callbackOnly.includes("registerV3Routes(app)"))
      reject("PUBLISHED_PREPAID_ALLOWLIST_NOT_SOURCE_VERIFIED");
    if (!registeredRoutes.includes('"/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId"'))
      reject("PREPAID_SESSION_POST_ROUTE_MISSING");
    const ownerType = prepaidRuntime.match(/export type PrepaidProbeOwnerKindV39\s*=\s*([^;]+);/);
    if (!ownerType || !ownerType[1].includes('"phase3_credit_canary"'))
      reject("DEDICATED_GATE3_SESSION_OWNER_KIND_NOT_IMPLEMENTED");
    if (!prepaidRuntime.includes("armPrepaidProbeSessionV39") ||
        !prepaidRuntime.includes("provider_subscription_id"))
      reject("DURABLE_PREPAID_SESSION_CONTRACT_NOT_FOUND");

    const guard = legacyCanary.indexOf("refuseLegacyGate3CanaryReceiverV39();");
    const firstProvider = legacyCanary.indexOf("await getBalance()");
    const firstCreate = legacyCanary.indexOf('await createSubscription(');
    if (guard < 0 || firstProvider < 0 || firstCreate < 0 ||
        guard >= firstProvider || guard >= firstCreate)
      reject("UNSAFE_LEGACY_CANARY_OWNER_GUARD_NOT_VERIFIED");
    if (!legacyCanary.includes("clean.adb_ingest_events"))
      reject("LEGACY_CANARY_LEDGER_CHANGED_REVIEW_REQUIRED");
    else reject("LEGACY_CANARY_STILL_USES_NONPREPAID_LEDGER");
    if (!legacyWrapper.includes('scripts/credit_canary.ts'))
      reject("GATE3_WRAPPER_TARGET_CHANGED_REVIEW_REQUIRED");
    else reject("GATE3_WRAPPER_STILL_DELEGATES_LEGACY_CANARY");
    if (!legacyReadiness.includes("GATE3_LEGACY_CANARY_RECEIVER_INCOMPATIBLE"))
      reject("LEGACY_PAID_FAIL_CLOSED_SENTINEL_MISSING");
  }
  return {
    schema: "v39.gate3.source-compatibility-review.v1",
    status: blockers.length ? "BLOCKED_SOURCE_CONTRACT" : "REVIEWED_SOURCE_SHAPE_ONLY",
    blockers,
    livePublishedVerified: false,
    prepaidGate3SessionArmed: false,
    authorizedPaidCanary: false,
    providerCalls: 0, databaseMutations: 0,
  };
}
