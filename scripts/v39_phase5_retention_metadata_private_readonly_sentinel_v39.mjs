/**
 * Phase5/Phase6 provider blob expiry sentinel — METADATA READ ONLY.
 * Separate, least-privilege monitored lane; not part of the GitHub-only
 * controller heartbeat and NEVER an automatic deletion owner.
 *
 * A future approved scheduled run must supply a restricted LOGIN able to
 * SELECT only clean.provider_content_blob_ref. No owner DATABASE_URL, raw
 * provider contents, object keys, SDK download, paid HTTP or migrations.
 */
import pg from "pg";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {appendFileSync} from "node:fs";

const EXPECTED_DB="neondb";
const TABLE="clean.provider_content_blob_ref";
export const RETENTION_READER_REQUIRED_COLUMNS=Object.freeze([
 "expires_at_utc","deletion_verified_at_utc",
 "content_class","storage_kind","retention_hours"
]);
export const RETENTION_READER_DENIED_COLUMNS=Object.freeze([
 "blob_ref_id","object_name","content_sha256","source_record_id",
 "source_kind","contract_version","content_bytes",
 "persisted_at_utc","deleted_at_utc","deletion_run_id","created_at_utc"
]);
const HOLD=(name)=>{throw Error("HOLD_P5_RETENTION_SENTINEL_"+name)};
const whole=(x)=>Number.isSafeInteger(x)&&x>=0;
const iso=(x)=>{
 if(x===null||x===undefined)return null;
 const d=new Date(x);
 return Number.isFinite(d.getTime())?d.toISOString():HOLD("INVALID_DELETE_CLOCK");
};
const numberField=(row,key)=>{
 const value=row?.[key];
 if(value===null||value===undefined||value==="")
  HOLD("INVALID_AGGREGATE");
 const n=Number(value);
 if(!whole(n))HOLD("INVALID_AGGREGATE");
 return n;
};

/** Metadata-only counting: no content hash, flight ID or object name. */
export function classifyP5RetentionReadOnlyCounts(row){
 const keys=[
  "total_refs","verified_refs","unverified_refs",
  "expired_unverified","expired_over_24h","expired_over_7d",
  "due_next_24h","unexpected_class_or_ttl"
 ];
 const n=Object.fromEntries(keys.map(k=>[k,numberField(row,k)]));
 if(n.verified_refs+n.unverified_refs!==n.total_refs||
    n.expired_unverified>n.unverified_refs||
    n.expired_over_24h>n.expired_unverified||
    n.expired_over_7d>n.expired_over_24h||
    n.due_next_24h>n.unverified_refs-n.expired_unverified||
    n.unexpected_class_or_ttl>n.total_refs)
   HOLD("INCONSISTENT_COUNTS");
 const state=n.unexpected_class_or_ttl>0
   ?"HOLD_UNEXPECTED_RETENTION_METADATA"
   :n.expired_unverified>0?"OVERDUE_REFERENCES_HOLD"
   :"NO_OVERDUE_REFERENCES";
 return Object.freeze({
  status:state, ...n,
  lastVerifiedDeletionUtc:iso(row.last_verified_deletion_utc),
  primaryObjectPresenceChecked:false,
  backupOrPitrRetentionVerified:false,
  providerCalls:0, databaseWrites:0,
  objectDownloads:0,objectDeletions:0,
  phase5ScientificFreeze:false,phase6PaidGo:false
 });
}

export function assertP5RetentionSentinelGate(env){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
    env.P5_RETENTION_MONITOR_EXECUTE!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.AERODATABOX_API_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    env.RAPIDAPI_KEY||
    env.DATABASE_URL||
    env.V39_DATABASE_RUNTIME_URL||
    !env.P5_RETENTION_READER_DATABASE_URL||
    !/^[a-z][a-z0-9_]{2,62}$/.test(env.P5_RETENTION_EXPECTED_READER_ROLE??"")||
    env.P5_RETENTION_EXPECTED_READER_ROLE==="neondb_owner"||
    env.P5_RETENTION_APPROVED_MAIN_SHA!==env.GITHUB_SHA)
  HOLD("UNAPPROVED_MAIN_OR_PRIVILEGED_SECRET_SCOPE");
 return Object.freeze({
  expectedRole:env.P5_RETENTION_EXPECTED_READER_ROLE,
  url:env.P5_RETENTION_READER_DATABASE_URL
 });
}

/**
 * Restricted reader with DB-enforced READ ONLY transaction, bounded time,
 * no object-store API. This helper can be tested on disposable PG16 only.
 */
export async function readP5RetentionMetadataReadOnly({url,expectedRole}){
 if(typeof url!=="string"||!url||
    typeof expectedRole!=="string"||
    !/^[a-z][a-z0-9_]{2,62}$/.test(expectedRole)||
    expectedRole==="neondb_owner")
   HOLD("NO_DEDICATED_RESTRICTED_READER");
 const client=new pg.Client({
  connectionString:url,
  options:"-c default_transaction_read_only=on",
  connectionTimeoutMillis:7000,
  query_timeout:12000,
  application_name:"p5_retention_metadata_sentinel_readonly"
 });
 let active=false;
 try{
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  active=true;
  await client.query("SET LOCAL statement_timeout='9000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const identity=(await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   " session_user AS login_actor,"+
   " current_setting('transaction_read_only') AS readonly,"+
   " current_setting('server_version_num')::int AS pg_version,"+
   " pg_is_in_recovery() AS replica,"+
   " clock_timestamp() AS db_now,"+
   " r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,"+
   " r.rolbypassrls,r.rolinherit,"+
   " has_schema_privilege(current_user,'clean','USAGE') AS schema_usage,"+
   " has_schema_privilege(current_user,'clean','CREATE') AS schema_create,"+
   " has_database_privilege(current_user,'neondb','CREATE') AS db_create,"+
   " EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS is_member,"+
   " has_table_privilege(current_user, '"+TABLE+"','SELECT') AS table_level_select,"+
   " has_table_privilege(current_user, '"+TABLE+"','INSERT') AS can_insert,"+
   " has_table_privilege(current_user, '"+TABLE+"','UPDATE') AS can_update,"+
   " has_table_privilege(current_user, '"+TABLE+"','DELETE') AS can_delete,"+
   " has_table_privilege(current_user, '"+TABLE+"','TRUNCATE') AS can_truncate"+
   " FROM pg_roles r WHERE r.rolname=current_user"
  )).rows[0];
  if(!identity||identity.db!==EXPECTED_DB||
     identity.actor!==expectedRole||
     identity.login_actor!==expectedRole||
     identity.readonly!=="on"||
     identity.replica!==false||
     identity.pg_version<160000||identity.pg_version>=170000||
     identity.rolsuper||identity.rolcreatedb||
     identity.rolcreaterole||identity.rolreplication||
     identity.rolbypassrls||identity.rolinherit||
     identity.schema_usage!==true||identity.schema_create||
     identity.db_create||identity.is_member||
     identity.table_level_select||
     identity.can_insert||identity.can_update||
     identity.can_delete||identity.can_truncate)
   HOLD("ACTOR_PRIVILEGE_DB_VERSION_OR_RO_MISMATCH");
  const permissions=(await client.query(
   "SELECT a.attname AS column_name,"+
   " has_column_privilege(current_user,"+
   " '"+TABLE+"',a.attname,'SELECT') AS allowed"+
   " FROM pg_attribute a WHERE a.attrelid=$1::regclass"+
   " AND a.attnum>0 AND NOT a.attisdropped"+
   " ORDER BY a.attname",
   [TABLE]
  )).rows;
  if(permissions.length!==
     RETENTION_READER_REQUIRED_COLUMNS.length+
     RETENTION_READER_DENIED_COLUMNS.length||
     new Set(permissions.map(x=>x.column_name)).size!==permissions.length||
     permissions.some(x=>{
      if(RETENTION_READER_REQUIRED_COLUMNS.includes(x.column_name))
       return x.allowed!==true;
      return !RETENTION_READER_DENIED_COLUMNS.includes(x.column_name)||
       x.allowed!==false;
     }))
    HOLD("READER_MUST_HAVE_EXACT_FIVE_COLUMN_SELECT_NO_OBJECT_IDENTITIES");
  const result=await client.query(
   "SELECT count(*)::int AS total_refs,"+
   " count(*) FILTER (WHERE deletion_verified_at_utc IS NOT NULL)::int AS verified_refs,"+
   " count(*) FILTER (WHERE deletion_verified_at_utc IS NULL)::int AS unverified_refs,"+
   " count(*) FILTER (WHERE deletion_verified_at_utc IS NULL AND expires_at_utc <= $1)::int AS expired_unverified,"+
   " count(*) FILTER (WHERE deletion_verified_at_utc IS NULL AND expires_at_utc <= $1::timestamptz - INTERVAL '24 hours')::int AS expired_over_24h,"+
   " count(*) FILTER (WHERE deletion_verified_at_utc IS NULL AND expires_at_utc <= $1::timestamptz - INTERVAL '7 days')::int AS expired_over_7d,"+
   " count(*) FILTER (WHERE deletion_verified_at_utc IS NULL AND expires_at_utc > $1 AND expires_at_utc <= $1::timestamptz + INTERVAL '24 hours')::int AS due_next_24h,"+
   " count(*) FILTER (WHERE NOT ("+
   " (content_class='raw_provider_content' AND storage_kind='replit_app_storage' AND retention_hours>0 AND retention_hours<=168)"+
   " OR (content_class='live_fids_cache' AND storage_kind='replit_app_storage' AND retention_hours>0 AND retention_hours<=24)))::int AS unexpected_class_or_ttl,"+
   " max(deletion_verified_at_utc) AS last_verified_deletion_utc"+
   " FROM "+TABLE,
   [identity.db_now]
  );
  if(result.rowCount!==1)HOLD("NO_UNIQUE_AGGREGATE");
  const summary=classifyP5RetentionReadOnlyCounts(result.rows[0]);
  await client.query("ROLLBACK");
  active=false;
  return Object.freeze({
   ...summary,
   dbTimeUtc:iso(identity.db_now),
   restrictedReaderVerified:true
  });
 }finally{
  if(active)await client.query("ROLLBACK").catch(()=>{});
  await client.end().catch(()=>{});
 }
}

export function formatP5RetentionSentinelSummary(s){
 if(!s||typeof s.status!=="string")HOLD("BAD_SUMMARY");
 return [
  "### Phase5 provider raw blob retention — PRIVATE READ ONLY metadata sentinel",
  "",
  "**"+s.status+"**",
  "",
  "| Metadata | Count |","|---|---:|",
  "| Total references | "+s.total_refs+" |",
  "| Verified-deletion markers | "+s.verified_refs+" |",
  "| Expired unverified references | "+s.expired_unverified+" |",
  "| Unverified >24h overdue | "+s.expired_over_24h+" |",
  "| Unverified >7d overdue | "+s.expired_over_7d+" |",
  "| Future expirations within 24h | "+s.due_next_24h+" |",
  "| Unexpected class or hard TTL | "+s.unexpected_class_or_ttl+" |",
  "",
  "No provider Content/flight identities/objects fetched; no primary object-existence check.",
  "No DB writes, delete, provider call, Phase5 FREEZE PASS or Phase6 paid GO.",
  "A failed job may be viewed in GitHub Actions; this is not proof of an external alert delivery.",
  "Backup/PITR and rights remain separate.",
  ""
 ].join("\n");
}
async function main(){
 try{
  const gate=assertP5RetentionSentinelGate(process.env);
  const summary=await readP5RetentionMetadataReadOnly(gate);
  console.log(JSON.stringify(summary));
  if(process.env.GITHUB_STEP_SUMMARY)
   appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    formatP5RetentionSentinelSummary(summary)+"\n","utf8");
  if(summary.status!=="NO_OVERDUE_REFERENCES")process.exitCode=2;
 }catch(e){
  // Error messages may contain database connection details; never print them.
  const code=typeof e?.message==="string"&&
    /^HOLD_P5_RETENTION_SENTINEL_[A-Z0-9_]+$/.test(e.message)
   ?e.message:"HOLD_P5_RETENTION_SENTINEL_UNKNOWN_READONLY_NO_GO";
  console.error(code);
  process.exitCode=2;
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
