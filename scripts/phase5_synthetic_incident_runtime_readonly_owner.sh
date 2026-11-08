#!/usr/bin/env bash
# Phase5 incident-only, read-only evidence for a synthetic receiver refusal.
# No webhook, provider call, database write, mutation of once marker or Git.
set -Eeuo pipefail
set +x
cd "$HOME/workspace" || { echo 'HOLD_INCIDENT_READONLY_WORKSPACE_MISSING'; exit 2; }
command -v node >/dev/null || { echo 'HOLD_INCIDENT_READONLY_NODE_MISSING'; exit 2; }
test -d node_modules/pg || { echo 'HOLD_INCIDENT_READONLY_PG_PACKAGE_MISSING'; exit 2; }
test -n "$(printenv V39_DATABASE_RUNTIME_URL 2>/dev/null)" ||
  { echo 'HOLD_INCIDENT_READONLY_RUNTIME_DB_URL_MISSING'; exit 2; }

node <<'READ_ONLY_JS'
const {Pool}=require('pg');
const fs=require('node:fs');
const url=process.env.V39_DATABASE_RUNTIME_URL;
const pool=new Pool({connectionString:url,max:1,connectionTimeoutMillis:12000});
let client;
const safeEnum = value => {
  if(value===null||value===undefined)return null;
  const s=String(value);
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(s)?s:'OTHER_OR_REDACTED';
};
const safeHistoricalError = value => {
  if(value==='V39_PREPAID_RAW_RETENTION_HOURS_MUST_BE_INTEGER_1_TO_168')
    return 'KNOWN_RAW_RETENTION_VALIDATOR';
  if(value==='column "session_id" is of type uuid but expression is of type integer')
    return 'KNOWN_SESSION_ID_TYPE_MISMATCH';
  return value==null?null:'REDACTED_ERROR';
};
(async()=>{
  try {
    client=await pool.connect();
    await client.query('BEGIN READ ONLY');
    const identity=(await client.query(
      "SELECT current_database() AS db, pg_is_in_recovery() AS replica, (clock_timestamp() AT TIME ZONE 'UTC')::text AS observed_utc"
    )).rows[0];
    if(identity?.db!=='neondb'||identity?.replica!==false)throw Error('WRONG_DATABASE_OR_REPLICA');
    const counts=(await client.query(
      "SELECT (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) AS unresolved, (SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')) AS active_probes"
    )).rows[0];
    const res=await client.query([
      'SELECT id::int AS id, cause::text AS cause, occurred_at_utc,',
      "detail->>'kind' AS kind, detail->>'reason' AS reason,",
      "detail->>'mode' AS mode, detail->>'error' AS error,",
      "detail->>'providerDeleteVerified' AS provider_delete,",
      "detail->>'runtimeCleanupVerified' AS runtime_cleanup",
      'FROM clean.adb_incident_stop',
      'WHERE resolved=false ORDER BY id ASC LIMIT 26'
    ].join(' '));
    await client.query('ROLLBACK');
    client.release(); client=null;
    const incidents=res.rows.slice(0,25).map(r=>({
      id:Number(r.id),
      cause:safeEnum(r.cause),
      occurredAtUtc:r.occurred_at_utc instanceof Date?r.occurred_at_utc.toISOString():null,
      kind:safeEnum(r.kind),reason:safeEnum(r.reason),mode:safeEnum(r.mode),
      historicErrorClass:safeHistoricalError(r.error),
      providerDeleteVerified:safeEnum(r.provider_delete),
      runtimeCleanupVerified:safeEnum(r.runtime_cleanup)
    }));
    console.log(JSON.stringify({
      schema:'phase5.synthetic-incident-readonly-audit.v1',
      status:'INCIDENT_IDENTITY_READONLY_NOT_SCIENTIFIC_CLEARANCE',
      observedUtc:identity.observed_utc,
      unresolvedIncidentCount:Number(counts.unresolved),
      activeOrSettlingProbeCount:Number(counts.active_probes),
      incidentRowsShown:incidents.length,
      truncated:Number(counts.unresolved)>25,
      incidents,
      originalOnceMarkerPreserved:fs.existsSync('artifacts/phase5-synthetic-signed-post-a2d75104-once.lock'),
      syntheticPostExecutedByThisDiagnostic:false,
      dbWrites:0,providerCalls:0,
      syntheticRetryAuthorized:false,
      phase5ScientificFreeze:false,phase6PaidGo:false
    },null,2));
    console.log('PHASE5_INCIDENT_READONLY_COMPLETE; PRESERVE_ONCE_MARKER_NO_POST_NO_DB_WRITES_NO_PROVIDER');
  } catch(e) {
    if(client)await client.query('ROLLBACK').catch(()=>{});
    console.error('HOLD_PHASE5_INCIDENT_READONLY_DATABASE_OR_PERMISSION_FAILURE');
    process.exitCode=2;
  } finally {
    if(client)client.release();
    await pool.end().catch(()=>{});
  }
})().catch(()=>{console.error('HOLD_PHASE5_INCIDENT_READONLY_UNHANDLED');process.exitCode=2;});
READ_ONLY_JS
