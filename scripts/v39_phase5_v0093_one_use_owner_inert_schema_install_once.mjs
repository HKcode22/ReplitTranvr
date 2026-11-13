/**
 * V0093 staged additive typed seven-REST cost-upper-bound SCHEMA ONLY.
 * One-use, hash-pinned, STOP-default PG16 neondb OWNER path. Never install
 * V0079–V0092 again. Never create/enable B0062 auth, commission roles,
 * source data, spend AeroDataBox credits or POST/queue anything.
 *
 * Source migration itself has an atomic SERIALIZABLE BEGIN ... COMMIT
 * and independently verified disposable PG16 checks from PR #607/#608.
 * This wrapper preflights an ACTUAL read-only Neon owner catalog and
 * then re-reads all migration metadata/cold-source counts after DDL.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

const {Client}=pg;
export const V0093_OWNER_CONFIRM=
 "INSTALL_ONLY_V0093_TYPED_INERT_BUDGET_SCHEMA_LEAVE_AUTH_DISABLED_NO_PAID";
const MIGRATION="V0093__phase5_v0082_typed_cost_only_upper_bound_inert_v39.sql";
const TARGET=[
 "budget_release_mode","reviewed_cost_envelope_sha256",
 "reviewed_source_request_grid_sha256"
];
const SQL_ROLE="neondb_owner";
const BUDGET="clean.phase5_fids_seven_rest_release_v39";
const FIXED=[
 "clean.adb_phase6_authorization",
 "clean.phase5_fids_seven_rest_release_v39",
 "clean.phase5_fids_allowed_query_v39",
 "clean.phase5_fids_physical_attempt_v39",
 "clean.phase5_fids_exact_query_partition_v39",
 "clean.phase5_fids_cycle_budget_v39",
 "clean.phase5_fids_utc_rest_category_budget_v39"
];
const err=code=>{throw Error("HOLD_V0093_ONLY_INERT_SCHEMA_"+code);};
export function gitBlobSha1(bytes){
 if(!Buffer.isBuffer(bytes))err("INVALID_BYTES");
 return createHash("sha1").update(Buffer.from(
  "blob "+bytes.length+"\0")).update(bytes).digest("hex");
}
/** The exact reviewed SQL MUST be the sole already-tested V0093 additive. */
export function reviewV0093MigrationArtifact(bytes,expectedGitBlob){
 if(!Buffer.isBuffer(bytes)||bytes.length<6000||bytes.length>20000||
    !/^[0-9a-f]{40}$/.test(expectedGitBlob??"")||
    gitBlobSha1(bytes)!==expectedGitBlob)
  err("REVIEWED_GIT_BLOB_SHA_MISMATCH");
 const s=bytes.toString("utf8");
 if(!s.startsWith("-- V0093 STAGED, NOT INSTALLED:")||
    (s.match(/^BEGIN ISOLATION LEVEL SERIALIZABLE;$/gm)||[]).length!==1||
    (s.match(/^COMMIT;$/gm)||[]).length!==1||
    !s.trimEnd().endsWith("COMMIT;")||
    !s.includes("ADD COLUMN budget_release_mode text NOT NULL DEFAULT 'EXACT_SOURCE_GRID'")||
    !s.includes("ADD COLUMN reviewed_cost_envelope_sha256 text")||
    !s.includes("ALTER COLUMN reviewed_source_request_grid_sha256 DROP NOT NULL")||
    !s.includes("CREATE OR REPLACE FUNCTION clean.phase5_fids_v0082_enforce_category_get_v39()")||
    !s.includes("p5_v0093_release_provenance_disjoint")||
    !s.includes("IF EXISTS(SELECT 1 FROM clean.phase5_fids_seven_rest_release_v39)")||
    !s.includes("UPDATE clean.phase5_fids_utc_rest_category_budget_v39")||
    /\b(CREATE\s+ROLE|GRANT\s+|DROP\s+TABLE|TRUNCATE\s+|DELETE\s+FROM\s+clean\.flight_|INSERT\s+INTO\s+clean\.flight_)/i.test(s))
  err("NOT_THE_REVIEWED_V0093_INERT_ADDITIVE_SQL");
 return {gitBlobSha1:expectedGitBlob,sql:s};
}
function requiredVersionColumns(rows){
 if(!Array.isArray(rows)||rows.some(x=>!TARGET.includes(x.attname)))err("BAD_CATALOG_COLUMNS");
 const names=new Set(rows.map(x=>x.attname));
 if(names.size!==rows.length)err("REPEATED_CATALOG_COLUMN");
 return {
  hasBudgetMode:names.has(TARGET[0]),
  hasCostEnvelope:names.has(TARGET[1]),
  originalGridNullable:
   rows.find(x=>x.attname===TARGET[2])?.attnotnull===false,
  originalGridPresent:names.has(TARGET[2])
 };
}
/** One database transaction, metadata/count-only; no source bodies. */
export async function readV0093OwnerCatalog(c){
 if(!c||typeof c.query!=="function")err("MISSING_CONNECTED_OWNER_CLIENT");
 let started=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  started=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  await c.query("SET LOCAL lock_timeout='1500ms'");
  const d=(await c.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('server_version_num')::integer AS version,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,"+
   "(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) AS superuser"
  )).rows[0];
  if(!d||d.db!=="neondb"||d.actor!==SQL_ROLE||d.version<160000||
     d.ro!=="on"||d.replica!==false||d.superuser!==false)
   err("WRONG_PG16_PRIMARY_OR_OWNER_ACTOR");
  const required=await c.query(
   "SELECT x.name, to_regclass(x.name) IS NOT NULL AS present"+
   " FROM unnest($1::text[]) AS x(name)",[FIXED]);
  if(required.rows.length!==FIXED.length||
     required.rows.some(x=>!FIXED.includes(x.name)||x.present!==true))
   err("PREREQUISITE_V0082_SCHEMA_MISSING_NEVER_REINSTALL");
  const f=(await c.query(
   "SELECT to_regprocedure('clean.phase5_fids_v0082_enforce_category_get_v39()') IS NOT NULL AS present"
  )).rows[0]?.present;
  if(f!==true)err("V0082_TRIGGER_FUNCTION_MISSING");
  const atts=(await c.query(
   "SELECT attname,attnotnull FROM pg_catalog.pg_attribute"+
   " WHERE attrelid=to_regclass($1) AND attname=ANY($2::text[])"+
   " AND attnum>0 AND NOT attisdropped",
   [BUDGET,TARGET])).rows;
  const cols=requiredVersionColumns(atts);
  if(!cols.originalGridPresent)err("EXISTING_V0082_SOURCE_COLUMN_MISSING");
  const counts={};
  for(const p of FIXED){
   if(!/^clean\.[a-z0-9_]+$/.test(p))err("UNSAFE_RELATION");
   const q=(await c.query("SELECT COUNT(*)::int AS n FROM "+p)).rows[0]?.n;
   if(!Number.isSafeInteger(q)||q<0)err("INVALID_TABLE_COUNT");
   counts[p.slice(6)]=q;
  }
  const auth=(await c.query(
   "SELECT COUNT(*) FILTER (WHERE enabled=true)::int AS enabled,"+
   "COUNT(*) FILTER (WHERE revoked_at_utc IS NOT NULL)::int AS revoked"+
   " FROM clean.adb_phase6_authorization"
  )).rows[0];
  if(!auth||!Number.isSafeInteger(auth.enabled)||
     !Number.isSafeInteger(auth.revoked))err("INVALID_B0062_AUTH_METADATA");
  const mode=cols.hasBudgetMode&&cols.hasCostEnvelope?
   (await c.query(
    "SELECT budget_release_mode,"+
    "reviewed_source_request_grid_sha256 IS NULL AS grid_null,"+
    "reviewed_cost_envelope_sha256 IS NULL AS cost_null"+
    " FROM clean.phase5_fids_seven_rest_release_v39 LIMIT 2"
   )).rows:null;
  await c.query("ROLLBACK");started=false;
  return {
   actor:d.actor,version:d.version,
   versionColumns:cols,
   v0093TypedSchemaPresent:cols.hasBudgetMode&&cols.hasCostEnvelope&&
    cols.originalGridNullable,
   tableRowCounts:counts,
   phase6AuthorizationRows:counts.adb_phase6_authorization,
   phase6EnabledRows:auth.enabled,phase6RevokedRows:auth.revoked,
   releaseRows:counts.phase5_fids_seven_rest_release_v39,
   allowedQueryRows:counts.phase5_fids_allowed_query_v39,
   physicalAttemptRows:counts.phase5_fids_physical_attempt_v39,
   exactPartitionRows:counts.phase5_fids_exact_query_partition_v39,
   releaseModes:mode,
   noProviderHttpRequests:true,noDatabaseWrites:true,
   phase6PaidGo:false
  };
 }catch(e){
  if(started)await c.query("ROLLBACK").catch(()=>{});
  throw e;
 }
}
export function classifyV0093OneUseRelease(x){
 if(!x)err("MISSING_SOURCE_CATALOG");
 if(x.phase6EnabledRows!==0||
    x.phase6RevokedRows!==0||
    x.allowedQueryRows!==0||
    x.physicalAttemptRows!==0||
    x.exactPartitionRows!==0||
    x.releaseRows!==0)
  err("EXISTING_PAID_OR_PREPARED_SOURCE_OR_RELEASE_NO_DDL");
 if(x.versionColumns.hasBudgetMode||x.versionColumns.hasCostEnvelope||
    x.versionColumns.originalGridNullable)
  err("V0093_ALREADY_INSTALLED_OR_PARTIAL_NEVER_REAPPLY");
 if(x.phase6AuthorizationRows!==0&&x.phase6AuthorizationRows!==1)
  err("MULTIPLE_OR_INVALID_B0062_AUTH");
 return "EXACT_V0093_ONE_USE_SCHEMA_ONLY_ALLOWED_NO_FLIGHT_OR_GO";
}
export function classifyV0093InstalledReadback(x){
 if(!x?.v0093TypedSchemaPresent||
    x.phase6EnabledRows!==0||x.phase6RevokedRows!==0||
    x.releaseRows!==0||x.allowedQueryRows!==0||
    x.physicalAttemptRows!==0||x.exactPartitionRows!==0)
  err("AFTER_SCHEMA_INSTALL_UNEXPECTED_SOURCE_OR_AUTH_STATE");
 return "V0093_TYPED_SCHEMA_VERIFIED_LIVE_INERT_NO_RELEASE_NO_GO";
}
export async function installV0093OneUseOwner({client,sql,sha}){
 const before=await readV0093OwnerCatalog(client);
 classifyV0093OneUseRelease(before);
 let attempted=false;
 try{
  attempted=true;
  // ONE simple-query protocol request; SQL itself is atomic SERIALIZABLE.
  await client.query(sql);
 }catch(e){
  // Never retry a COMMIT-uncertain migration. Independent readonly catalog
  // must determine if it committed; refuse any automatic second attempt.
  err("SQL_FAILED_OR_COMMIT_UNKNOWN_NEVER_AUTO_RETRY_INDEPENDENT_AUDIT");
 }
 if(!attempted)err("INTERNAL_NOT_ATTEMPTED");
 const after=await readV0093OwnerCatalog(client);
 classifyV0093InstalledReadback(after);
 if(JSON.stringify(before.tableRowCounts)!==JSON.stringify(after.tableRowCounts))
  err("SOURCE_OR_BUDGET_ROWS_CHANGED_DURING_INERT_DDL_INDEPENDENT_AUDIT");
 return {
  status:"V0093_SCHEMA_ONLY_OWNER_INSTALL_AND_SAME_CONNECTION_READBACK_PASS",
  reviewedMigrationGitBlobSha1:sha,
  beforeV0093Installed:before.v0093TypedSchemaPresent,
  afterV0093Installed:after.v0093TypedSchemaPresent,
  existingB0062AuthorizationRowsPreserved:
   before.phase6AuthorizationRows===after.phase6AuthorizationRows,
  existingCycleBudgetRowsPreserved:
   before.tableRowCounts.phase5_fids_cycle_budget_v39===
   after.tableRowCounts.phase5_fids_cycle_budget_v39,
  existingFidsSourceAndAttemptRowsZero:true,
  verifiedAuthEnabled:false,noRolesOrCredentialsCreated:true,
  providerCalls:0,databaseSourceOrPREWrites:0,paidAlerts:0,
  phase5ScientificFreeze:false,phase6PaidGo:false
 };
}
async function main(){
 const env=process.env;
 let c;
 try{
  if(env.GITHUB_ACTIONS==="true"||
     env.P5_V0093_OWNER_SCHEMA_APPROVAL!==V0093_OWNER_CONFIRM||
     env.ADB_AUTO_COLLECT!=="0"||
     env.V39_PHASE6_PROCESS_ARMED!=="0"||
     env.V39_PHASE6_OWNER_APPROVED==="1"||
     env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||
     env.AERODATABOX_WEBHOOK_SECRET||
     !env.DATABASE_URL||
     env.DATABASE_URL===env.V39_DATABASE_RUNTIME_URL)
    err("OWNER_APPROVAL_OR_STOPPED_NO_PROVIDER_ENVELOPE_MISSING");
  const path=env.P5_V0093_REVIEWED_MIGRATION_FILE;
  if(typeof path!=="string"||
     !/^\/tmp\/p5-v0093-owner-[A-Za-z0-9]{6,16}\/V0093__phase5_v0082_typed_cost_only_upper_bound_inert_v39\.sql$/.test(path))
    err("REVIEWED_PRIVATE_MIGRATION_PATH_REQUIRED");
  const pin=env.P5_V0093_REVIEWED_MIGRATION_BLOB_SHA;
  const reviewed=reviewV0093MigrationArtifact(readFileSync(path),pin);
  c=new Client({connectionString:env.DATABASE_URL,
   connectionTimeoutMillis:8000,
   application_name:"v39_phase5_v0093_owner_inert_schema_once"});
  await c.connect();
  const receipt=await installV0093OneUseOwner({
   client:c,sql:reviewed.sql,sha:reviewed.gitBlobSha1
  });
  console.log(JSON.stringify(receipt));
  console.log("PHASE5_V0093_SCHEMA_ONLY_SUCCESS_NO_PROVIDER_NO_GO");
 }catch(e){
  console.error("HOLD_PHASE5_V0093_SCHEMA_ONLY_NO_AUTOMATIC_RETRY");
  process.exitCode=2;
 }finally{if(c)await c.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
