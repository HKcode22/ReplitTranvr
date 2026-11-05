/**
 * Real PG16 no-provider, disposable proof for Nov7 independent 9-table reader.
 * Validates the exact five final audit SQL templates under a non-admin role,
 * including the immutable frozen Nov7 grid, not merely mocked privileges.
 */
import pg from "pg";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {
 G5A_SOURCE_AUDIT_SQL_V39,
 G5A_PRE_AUDIT_SQL_V39,
 G5A_POPULATION_AUDIT_SQL_V39
} from "./v39_phase4_gate5_g5a_nov07_independent_real_cohort_readonly_audit";
import {
 G5A_POST_AGGREGATE_AUDIT_SQL_V39,
 postReservationUuidV39
} from "./v39_phase4_gate5_g5a_nov07_prospective_post_schedule_observation";

const ADMIN="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const READER_NAME="p4_g5_g5a_nov07_readonly_20261105";
const READER="postgresql://"+READER_NAME+
 ":g5a_offline_pg16_only@localhost:5432/v39_ci?sslmode=disable";
const TABLES=[
 "clean.phase4_g5_fids_physical_owner_v39",
 "clean.phase4_g5_fids_allowed_query_v39",
 "clean.phase4_g5_fids_physical_attempt_v39",
 "clean.phase4_g5_fids_original_binding_v39",
 "clean.fids_query_response","clean.flight_population",
 "clean.flight_snapshots","clean.phase4_g5_fids_cohort_budget_v39",
 "clean.adb_rest_attempt_ledger"
] as const;
function hold(code:string):never{
 throw Error("G5A_NOV07_DISPOSABLE_READER_"+code+"_HOLD");
}
function context(){
 const e=process.env;
 if(e.GITHUB_ACTIONS!=="true"||
    e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    !["pull_request","push"].includes(e.GITHUB_EVENT_NAME??"")||
    e.GITHUB_WORKFLOW!=="Phase4 Gate5 G5A Nov7 Audit Reader Real SQL Disposable PG16"||
    e.GITHUB_JOB!=="reader-sql-disposable-pg16"||
    e.DATABASE_URL!==ADMIN||e.V39_DATABASE_RUNTIME_URL!==ADMIN||
    !!e.P4_G5_G5A_NOV07_AUDIT_DATABASE_URL||
    !!e.GATE05_AUTOMATION_DATABASE_URL||
    !!e.P4_G5_SOURCE_OWNER_DATABASE_URL||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY)
  hold("CI_CONTEXT");
}
function connection(uri:string){
 return new pg.Client({connectionString:uri,connectionTimeoutMillis:8000,
  query_timeout:13000,application_name:"g5a_nov07_disposable_audit_sql"});
}
export async function main(){
 context();
 const admin=connection(ADMIN),reader=connection(READER);
 let stage="BOOT",tx=false,readerConnected=false;
 await admin.connect();
 try{
  stage="EXACT_REAL_B0062_STAGED_V0076_V0077_V0078";
  const liveTables=await admin.query(
   "SELECT to_regclass('clean.fids_query_response') AS originals,"+
   "to_regclass('clean.phase4_g5_fids_original_binding_v39') AS bindings,"+
   "to_regclass('clean.phase4_g5_fids_physical_attempt_v39') AS attempts,"+
   "to_regclass('clean.adb_rest_attempt_ledger') AS post");
  if(liveTables.rows.length!==1||
     Object.values(liveTables.rows[0]).some(x=>x===null))
   hold("MIGRATION_TABLES_MISSING");

  stage="CREATE_DISPOSABLE_NO_ADMIN_READER";
  await admin.query('CREATE ROLE "'+READER_NAME+'" LOGIN NOINHERIT '+
   "NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS "+
   "PASSWORD 'g5a_offline_pg16_only'");
  await admin.query('GRANT CONNECT ON DATABASE v39_ci TO "'+READER_NAME+'"');
  await admin.query('GRANT USAGE ON SCHEMA clean TO "'+READER_NAME+'"');
  for(const table of TABLES)
   await admin.query('GRANT SELECT ON TABLE '+table+' TO "'+READER_NAME+'"');

  await reader.connect();readerConnected=true;
  stage="RESTRICTED_ROLE_LEAST_PRIVILEGE_READ_ONLY_CATALOG";
  await reader.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  const scope=await reader.query(
   "SELECT current_user AS who,"+
   "current_setting('transaction_read_only')='on' AS readonly,"+
   "(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls "+
   "FROM pg_roles WHERE rolname=current_user) AS elevated,"+
   "has_schema_privilege(current_user,'clean','CREATE') AS schema_create,"+
   "has_database_privilege(current_user,current_database(),'CREATE') AS database_create");
  const a=scope.rows[0];
  if(scope.rows.length!==1||a.who!==READER_NAME||a.readonly!==true||
     a.elevated!==false||a.schema_create!==false||
     a.database_create!==false)
   hold("ROLE_NOT_INDEPENDENT");
  for(const table of TABLES){
   const t=await reader.query(
    "SELECT has_table_privilege(current_user,$1,'SELECT') AS sel,"+
    "has_table_privilege(current_user,$1,'INSERT') AS ins,"+
    "has_table_privilege(current_user,$1,'UPDATE') AS upd,"+
    "has_table_privilege(current_user,$1,'DELETE') AS del,"+
    "has_table_privilege(current_user,$1,'TRUNCATE') AS trunc",[table]);
   const r=t.rows[0];
   if(t.rows.length!==1||r.sel!==true||r.ins!==false||
      r.upd!==false||r.del!==false||r.trunc!==false)
    hold("READER_TABLE_PERMISSIONS");
  }
  stage="ACTUAL_FROZEN_NOV07_FIVE_AUDIT_QUERIES";
  const file=readFileSync(
   "data-collection/phase4/GATE5_G5A_WSSS_20261107_FROZEN_SOURCE_GRID.json",
   "utf8");
  const grid=JSON.parse(file);
  if(grid.cohortId!=="WSSS_G5A_20261107_0200Z"||
     file!==JSON.stringify(grid,null,2)+"\n")
   hold("INVALID_FROZEN_MANIFEST");
  const hash=createHash("sha256").update(file).digest("hex");
  const ids=[0,1,2].map(i=>postReservationUuidV39(hash,i));
  // Execute the *actual* final cohort queries under a genuine restricted
  // login; no mocked PostgreSQL clients or privileged schema owner.
  const results=[
   await reader.query(G5A_SOURCE_AUDIT_SQL_V39,[hash]),
   await reader.query(G5A_PRE_AUDIT_SQL_V39,[hash]),
   await reader.query(G5A_POPULATION_AUDIT_SQL_V39,[hash]),
   await reader.query(G5A_POST_AGGREGATE_AUDIT_SQL_V39,[hash,ids]),
   await reader.query(
    "SELECT cohort_id,reserved_units,project_unit_ceiling "+
    "FROM clean.phase4_g5_fids_cohort_budget_v39 "+
    "WHERE manifest_sha256=$1",[hash])
  ];
  if(results.length!==5||results.some(x=>!Array.isArray(x.rows)))
   hold("FINAL_AUDIT_SQL_ERROR");
  const count=results.map(x=>x.rows.length);
  if(count[0]!==0||count[1]!==1||count[2]!==1||
     count[3]!==1||count[4]!==0)
   hold("FUTURE_EMPTY_COHORT_RESULT_SHAPE_CHANGED");
  await reader.query("ROLLBACK");tx=false;
  // Independent reader has no DML rights even OUTSIDE read-only mode.
  stage="RESTRICTED_ROLE_DML_DENIAL";
  const prohibited=await reader.query(
   "SELECT has_table_privilege(current_user,'clean.flight_population','INSERT') AS ins,"+
   "has_database_privilege(current_user,current_database(),'CREATE') AS ddl");
  if(prohibited.rows[0]?.ins!==false||prohibited.rows[0]?.ddl!==false)
   hold("READ_ONLY_SCOPE_INSUFFICIENT");
  console.log(JSON.stringify({
   status:"G5A_NOV07_DISPOSABLE_READER_ALL_FIVE_REAL_AUDIT_SQL_PASS",
   actualRestrictedPostgres16Login:true,exactTablesReadOnly:TABLES.length,
   actualAuditQueriesExecuted:5,expectedUnobservedFutureCohort:true,
   syntheticOnly:true,providerCalls:0,productionDatabaseWrites:0,
   scientificGate5Passed:false
  }));
 }catch(e){
  const code=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
  console.error(JSON.stringify({
   status:"G5A_NOV07_DISPOSABLE_READER_HOLD",stage,
   sqlstate:typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code)?code:null,
   providerCalls:0,productionDatabaseWrites:0
  }));
  throw Error("G5A_NOV07_DISPOSABLE_READER_FAILED_REDACTED");
 }finally{
  if(tx)await reader.query("ROLLBACK").catch(()=>undefined);
  if(readerConnected)await reader.end().catch(()=>undefined);
  await admin.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_nov07_reader_sql_disposable_pg16.ts"))
 void main().catch(()=>{process.exitCode=2});
