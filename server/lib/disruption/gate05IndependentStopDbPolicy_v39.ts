/**
 * DRAFT / UNDEPLOYED Gate05 safety-only PostgreSQL connection timeout policy.
 *
 * Pure data. Does not create a Client, accept/issue credentials, connect to DB,
 * deploy an agent, trigger STOP, or authorize a paid provider call.
 *
 * The future independent STOP process MUST use its own proven least-privilege
 * LOGIN, trusted TLS configuration, separate lifecycle and monitored alerts.
 * A timeout is NOT confirmation that a database statement rolled back: the
 * operator still needs authoritative post-failure reconciliation.
 *
 * node-postgres Config docs: https://node-postgres.com/apis/client
 * PostgreSQL 16: https://www.postgresql.org/docs/16/runtime-config-client.html
 */
export function previewGate05IndependentStopDbTimeoutPolicyV39(){
  const settings={
    application_name:"gate05_fids_independent_safety_v39",
    connectionTimeoutMillis:3000,
    // PostgreSQL server-side execution and lock admission limits, milliseconds.
    statement_timeout:4000,
    lock_timeout:1500,
    // node-postgres client-side query wait; must EXCEED the server limit.
    query_timeout:6000,
    idle_in_transaction_session_timeout:5000
  } as const;
  return {
    schema:"v39.gate05.independent-stop-db-timeout-preview.v1" as const,
    status:"BOUNDED_CONNECTION_OPTIONS_DRAFT_NOT_DEPLOYED" as const,
    settings,
    requiresIndependentRestrictedSafetyLogin:true as const,
    requiresTrustedTlsAndSecretProvisioning:true as const,
    requiresIndependentLivenessAndAlertDelivery:true as const,
    requiresPostTimeoutStopReconciliation:true as const,
    productionDbIdentityAttested:false as const,
    authenticatedStopRoleVerified:false as const,
    activeSupervisorVerified:false as const,
    productionConnectionCreated:false as const,
    databaseWrites:0 as const,
    providerRequests:0 as const,
    paidPilotAuthorized:false as const
  };
}
