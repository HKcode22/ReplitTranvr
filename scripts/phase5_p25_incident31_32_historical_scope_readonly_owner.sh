#!/usr/bin/env bash
# Phase 5 / Phase 2G historical P25 audit: NO provider requests, NO POST,
# NO db writes, NO blob access, NO local Git changes, NO incident resolution.
set -Eeuo pipefail
set +x
cd "$HOME/workspace" || { echo "HOLD_P25_RUNTIME_AUDIT_WORKSPACE_MISSING"; exit 2; }
command -v node >/dev/null || { echo "HOLD_P25_RUNTIME_AUDIT_NODE_MISSING"; exit 2; }
test -d node_modules/pg || { echo "HOLD_P25_RUNTIME_AUDIT_PG_PACKAGE_MISSING"; exit 2; }
test -n "$(printenv V39_DATABASE_RUNTIME_URL 2>/dev/null)" ||
  { echo "HOLD_P25_RUNTIME_AUDIT_DB_URL_MISSING"; exit 2; }

node <<'P25_READONLY_JAVASCRIPT'
const {Pool}=require("pg");
const fs=require("node:fs");
const pool=new Pool({
  connectionString:process.env.V39_DATABASE_RUNTIME_URL,
  max:1,connectionTimeoutMillis:12000,query_timeout:15000
});
const SESSION="b0077437-edc1-459a-9d63-8c6e6e50c4f2";
const BUDGET="P2G-S1-20261013-03";
let client;
const utc = value=>value instanceof Date?value.toISOString():null;
const enumSafe = value=>{
  if(value===null || value===undefined) return null;
  const s=String(value);
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(s)?s:"OTHER_OR_REDACTED";
};
const exactBoolean=(r,key,val)=>r?.[key]===val;
async function sql(q,p=[]){return (await client.query(q,p)).rows;}
(async()=>{
 try{
   client=await pool.connect();
   await client.query("BEGIN TRANSACTION READ ONLY");
   const ident=(await sql(
    "SELECT current_database() AS db, pg_is_in_recovery() AS replica, clock_timestamp() AS observed_utc"
   ))[0];
   if(ident.db!=="neondb"||ident.replica!==false)
     throw Error("WRONG_DATABASE_OR_REPLICA");
   const incidents=await sql([
    "SELECT id::int AS id, cause, occurred_at_utc, resolved,",
    "detail->>'kind' AS kind, detail->>'reason' AS reason,",
    "detail->>'providerDeleteVerified' AS provider_delete,",
    "detail->>'runtimeCleanupVerified' AS runtime_cleanup,",
    "detail ? 'probeId' AS probe_link_present,",
    "(detail->>'probeId'='19') AS linked_probe19,",
    "detail ? 'budgetDayId' AS budget_link_present,",
    "(detail->>'budgetDayId'=$1::text) AS linked_budget,",
    "detail ? 'sessionId' AS session_link_present,",
    "(lower(detail->>'sessionId')=$2::text) AS linked_session",
    "FROM clean.adb_incident_stop WHERE id IN (31,32) ORDER BY id"
   ].join(" "),[BUDGET,SESSION]);
   const probe=(await sql([
    "SELECT probe_id, icao, status, reconciliation_status, stop_reason,",
    "duration_censored, runtime_cleanup_verified_at_utc,",
    "(runtime_session_id=$1::uuid) AS exact_session_bound",
    "FROM clean.adb_anchor_probe",
    "WHERE probe_id=19 AND probe_budget_day_id=$2"
   ].join(" "),[SESSION,BUDGET]))[0]||null;
   const recon=(await sql(
    "SELECT external_spend_credits,internal_received_credits,delivery_gap_credits FROM clean.adb_probe_reconciliation_evidence WHERE probe_id=19"
   ))[0]||null;
   const budget=(await sql(
    "SELECT state,closed_at FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1",
    [BUDGET]
   ))[0]||null;
   const counts=(await sql([
    "SELECT",
    "(SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) AS all_unresolved,",
    "(SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')) AS active_probes,",
    "(SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') AS open_budget_days,",
    "(SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid) AS sessions,",
    "(SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid) AS deliveries,",
    "(SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid) AS items,",
    "(SELECT count(*)::int FROM clean.phase2g_cleanup_journal_v39 WHERE session_id=$1::uuid) AS cleanup_journal"
   ].join(" "),[SESSION]))[0];
   const originals=(await sql([
    "SELECT count(*)::int AS total,",
    "count(content_sha256)::int AS hashed,",
    "COALESCE(sum(content_bytes),0)::text AS metadata_bytes,",
    "count(*) FILTER (WHERE deletion_verified_at_utc IS NOT NULL)::int AS tombstoned,",
    "count(*) FILTER (WHERE deletion_verified_at_utc IS NULL)::int AS untombstoned,",
    "count(*) FILTER (WHERE expires_at_utc <= clock_timestamp()",
    "AND deletion_verified_at_utc IS NULL)::int AS past_expiry_untombstoned,",
    "max(expires_at_utc) AS latest_expiry",
    "FROM clean.provider_content_blob_ref",
    "WHERE source_kind='webhook' AND source_record_id LIKE $1"
   ].join(" "),["prepaid:"+SESSION+":%"]))[0];
   await client.query("ROLLBACK");
   client.release(); client=null;
   const incidentRows=incidents.map(r=>({
    id:Number(r.id),cause:enumSafe(r.cause),resolved:r.resolved===true,
    occurredAtUtc:utc(r.occurred_at_utc),
    kind:enumSafe(r.kind),reason:enumSafe(r.reason),
    historicalProviderDeleteVerified:enumSafe(r.provider_delete),
    historicalRuntimeCleanupVerified:enumSafe(r.runtime_cleanup),
    probeLinkPresent:r.probe_link_present===true,
    linkedToProbe19:r.linked_probe19===true,
    budgetLinkPresent:r.budget_link_present===true,
    linkedToP25Budget:r.linked_budget===true,
    sessionLinkPresent:r.session_link_present===true,
    linkedToP25Session:r.linked_session===true
   }));
   const fingerprint={
    probe19Exact:probe?.icao==="YSSY"&&probe.status==="failed"&&
      probe.reconciliation_status==="DELIVERY_GAP"&&
      probe.duration_censored===false&&probe.exact_session_bound===true,
    external231:Number(recon?.external_spend_credits)===231,
    received229:Number(recon?.internal_received_credits)===229,
    gap2:Number(recon?.delivery_gap_credits)===2,
    savedOriginal58:Number(originals.total)===58,
    savedOriginalMetadata308832:Number(originals.metadata_bytes)===308832
   };
   const result={
    schema:"phase5.p25-incidents31-32-forensic-readonly.v1",
    status:"HISTORICAL_SCOPE_READONLY_NOT_RECEIVER_ADMISSION",
    observedUtc:utc(ident.observed_utc),
    allUnresolvedIncidents:Number(counts.all_unresolved),
    incident31and32:incidentRows,
    p25HistoricalFingerprintMatches:fingerprint,
    probe19:probe?{
      status:enumSafe(probe.status),
      reconciliationStatus:enumSafe(probe.reconciliation_status),
      stopReason:enumSafe(probe.stop_reason),
      durationCensored:probe.duration_censored===true,
      exactHistoricalSessionBound:probe.exact_session_bound===true,
      runtimeCleanupVerifiedAtUtc:utc(probe.runtime_cleanup_verified_at_utc)
    }:null,
    reconciledCreditUnits:recon?{
      external:Number(recon.external_spend_credits),
      received:Number(recon.internal_received_credits),
      gap:Number(recon.delivery_gap_credits)
    }:null,
    budget:{
      state:enumSafe(budget?.state),
      closedAtUtc:utc(budget?.closed_at)
    },
    historicalRuntime:{
      sessions:Number(counts.sessions),
      deliveries:Number(counts.deliveries),
      items:Number(counts.items),
      cleanupJournalRows:Number(counts.cleanup_journal),
      activeOrSettlingProbes:Number(counts.active_probes),
      globallyOpenBudgetDays:Number(counts.open_budget_days)
    },
    originalReferenceMetadata:{
      references:Number(originals.total),
      shaMetadataCount:Number(originals.hashed),
      claimedBytes:Number(originals.metadata_bytes),
      tombstoned:Number(originals.tombstoned),
      untombstoned:Number(originals.untombstoned),
      expiredButUntombstoned:Number(originals.past_expiry_untombstoned),
      latestExpiryUtc:utc(originals.latest_expiry),
      actualStoredObjectBytesReadbackPerformed:false
    },
    previousOnceMarkerPreserved:
      fs.existsSync("artifacts/phase5-synthetic-signed-post-a2d75104-once.lock"),
    providerCurrentSubscriptionInventoryVerified:false,
    historicalIncidentClearanceAuthorized:false,
    newSignedSyntheticPostAuthorized:false,
    phase5ScientificFreeze:false,
    phase6PaidGo:false,
    dbWrites:0,providerCalls:0,webhookPosts:0,blobReads:0,blobDeletes:0
   };
   console.log(JSON.stringify(result,null,2));
   console.log("PHASE5_P25_INCIDENT31_32_FORENSIC_READONLY_COMPLETE_NO_POST_NO_DB_WRITES_NO_PROVIDER");
 }catch(e){
   if(client)await client.query("ROLLBACK").catch(()=>{});
   console.error("HOLD_P25_HISTORICAL_FORENSIC_READONLY_SCHEMA_OR_ACCESS");
   process.exitCode=2;
 }finally{
   if(client)client.release();
   await pool.end().catch(()=>{});
 }
})().catch(()=>{
 console.error("HOLD_P25_HISTORICAL_FORENSIC_READONLY_UNHANDLED");
 process.exitCode=2;
});
P25_READONLY_JAVASCRIPT
