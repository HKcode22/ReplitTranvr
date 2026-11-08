#!/usr/bin/env bash
# Independent P25 administrative post-audit, READ ONLY.
# Safe before, during, or after an ambiguous historical admin apply.
set -Eeuo pipefail
set +x
cd "$HOME/workspace" || { echo 'HOLD_P25_ADMIN_POSTAUDIT_WORKSPACE_MISSING'; exit 2; }
command -v node >/dev/null || { echo 'HOLD_P25_ADMIN_POSTAUDIT_NODE_MISSING'; exit 2; }
test -d node_modules/pg || { echo 'HOLD_P25_ADMIN_POSTAUDIT_PG_MISSING'; exit 2; }
[[ -v V39_DATABASE_RUNTIME_URL ]] ||
  { echo 'HOLD_P25_ADMIN_POSTAUDIT_RUNTIME_URL_MISSING'; exit 2; }
[[ -n "$V39_DATABASE_RUNTIME_URL" ]] ||
  { echo 'HOLD_P25_ADMIN_POSTAUDIT_RUNTIME_URL_EMPTY'; exit 2; }

node <<'P25_INDEPENDENT_ADMIN_AUDIT_JS'
const {Pool}=require("pg");
const fs=require("node:fs");
const pool=new Pool({
 connectionString:process.env.V39_DATABASE_RUNTIME_URL,
 max:1,connectionTimeoutMillis:12000,query_timeout:15000
});
const BUDGET="P2G-S1-20261013-03";
const SESSION="b0077437-edc1-459a-9d63-8c6e6e50c4f2";
let client;
(async()=>{
 try{
  client=await pool.connect();
  await client.query("BEGIN TRANSACTION READ ONLY");
  const identity=(await client.query(
   "SELECT current_database() AS db,pg_is_in_recovery() AS replica,clock_timestamp() AS at"
  )).rows[0];
  if(identity.db!=="neondb"||identity.replica!==false)
   throw Error("WRONG_DB");
  const rows=(await client.query([
   "SELECT id::int AS id,cause,resolved,resolved_at_utc,",
   "detail->'postrunAdministrativeResolution'->>'classification' AS classification,",
   "detail->'postrunAdministrativeResolution'->>'historical_status_preserved' AS original_status,",
   "detail->'postrunAdministrativeResolution'->>'historical_reconciliation_preserved' AS original_reconciliation",
   "FROM clean.adb_incident_stop WHERE id=ANY($1::bigint[]) ORDER BY id"
  ].join(" "),[[31,32]])).rows;
  const budget=(await client.query(
   "SELECT probe_budget_day_id,state,cap_credits,closed_at FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$1",
   [BUDGET]
  )).rows[0];
  const p=(await client.query(
   "SELECT status,reconciliation_status,duration_censored,runtime_session_id FROM clean.adb_anchor_probe WHERE probe_id=19 AND probe_budget_day_id=$1",
   [BUDGET]
  )).rows[0];
  const r=(await client.query(
   "SELECT external_spend_credits,internal_received_credits,delivery_gap_credits FROM clean.adb_probe_reconciliation_evidence WHERE probe_id=19"
  )).rows[0];
  const refs=(await client.query([
   "SELECT count(*)::int AS originals,",
   "count(*) FILTER(WHERE deletion_verified_at_utc IS NOT NULL)::int AS tombstoned,",
   "count(*) FILTER(WHERE deletion_verified_at_utc IS NULL)::int AS live,",
   "COALESCE(sum(content_bytes),0)::bigint AS bytes",
   "FROM clean.provider_content_blob_ref",
   "WHERE source_kind='webhook' AND source_record_id LIKE $1"
  ].join(" "),["prepaid:"+SESSION+":%"])).rows[0];
  const counts=(await client.query(
   "SELECT (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) AS open_incidents,"+
   "(SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') AS open_budgets"
  )).rows[0];
  await client.query("ROLLBACK");client.release();client=null;
  const mark=fs.existsSync("artifacts/phase5-p25-exact-31-32-budget-admin-apply-once.lock");
  const recordsExact=rows.length===2&&rows[0].id===31&&rows[1].id===32&&
   rows.every(i=>i.cause==="reconciliation"&&i.resolved===true&&
    i.resolved_at_utc!==null&&
    i.classification==="P25_EXPIRED_ORIGINALS_EXACT_PROVIDER_AND_RUNTIME_STOP_VERIFIED"&&
    i.original_status==="failed"&&i.original_reconciliation==="DELIVERY_GAP");
  const originalExact=p?.status==="failed"&&p?.reconciliation_status==="DELIVERY_GAP"&&
   p?.duration_censored===false&&
   String(p.runtime_session_id).toLowerCase()===SESSION&&
   Number(r?.external_spend_credits)===231&&
   Number(r?.internal_received_credits)===229&&
   Number(r?.delivery_gap_credits)===2;
  const budgetExact=budget?.state==="CLOSED"&&budget?.closed_at!=null&&
   Number(budget?.cap_credits)===500;
  const tombstonesExact=Number(refs.originals)===58&&
   Number(refs.tombstoned)===58&&Number(refs.live)===0&&Number(refs.bytes)===308832;
  const eligible=mark&&recordsExact&&originalExact&&budgetExact&&tombstonesExact&&
   Number(counts.open_incidents)===0&&Number(counts.open_budgets)===0;
  console.log(JSON.stringify({
   schema:"phase5.p25-admin-independent-postaudit.v1",
   status:eligible?"PASS_EXACT_P25_ADMIN_METADATA_APPLIED_HISTORIC_SCIENCE_PRESERVED":
    "HOLD_EXACT_P25_ADMIN_METADATA_NOT_INDEPENDENTLY_VERIFIED",
   observedAtUtc:identity.at instanceof Date?identity.at.toISOString():null,
   exactAdminAttemptMarkerPresent:mark,
   incident31and32:rows.map(v=>({
    id:v.id,resolved:v.resolved===true,
    adminAnnotationExact:v.classification==="P25_EXPIRED_ORIGINALS_EXACT_PROVIDER_AND_RUNTIME_STOP_VERIFIED",
    resolvedAtUtc:v.resolved_at_utc instanceof Date?v.resolved_at_utc.toISOString():null
   })),
   incidentAnnotationsBothExact:recordsExact,
   p25BudgetClosed:budgetExact,
   originalProbeStillFailedGap2:originalExact,
   original58ReferenceTombstonesRemain:tombstonesExact,
   globalOpenIncidents:Number(counts.open_incidents),
   globalOpenBudgets:Number(counts.open_budgets),
   scientificHistoricalResult:"failed/DELIVERY_GAP",
   externalBilledCredits:231,internallyReceivedCredits:229,
   originalProviderBytesReadBackNow:false,
   providerSubscriptionListCalled:false,
   phase5ScientificFreeze:false,phase6PaidGo:false,
   webhookPosts:0,dbMutations:0,providerMutations:0,blobMutations:0,
   syntheticRetryAuthorized:false
  },null,2));
  if(!eligible)process.exitCode=2;
 }catch{
  if(client)await client.query("ROLLBACK").catch(()=>{});
  console.error("HOLD_P25_ADMIN_POSTAUDIT_ACCESS_OR_SCHEMA_UNVERIFIED");
  process.exitCode=2;
 }finally{
  if(client)client.release();
  await pool.end().catch(()=>{});
 }
})().catch(()=>{
 console.error("HOLD_P25_ADMIN_POSTAUDIT_UNHANDLED");
 process.exitCode=2;
});
P25_INDEPENDENT_ADMIN_AUDIT_JS
