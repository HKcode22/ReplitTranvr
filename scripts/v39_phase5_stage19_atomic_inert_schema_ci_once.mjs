/**
 * Phase5 Stage19: exact Git-blob pinned, all-or-none, INERT staged schema
 * installer. This entrypoint is HARD-LIMITED to the GitHub Actions disposable
 * PostgreSQL16 localhost CI fixture. It cannot install production schema.
 *
 * It never reads provider flight data, performs HTTP/AeroDataBox calls,
 * provisions production roles, arms FIDS, runs Phase6, or grants rights.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
const {Pool}=pg;

const CI_URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const SOURCES=[
 ["migrations/staged/V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql",
  "fa6f4275f773dfe36f591eb0259063aafe7ecd0c"],
 ["migrations/staged/V0080__phase5_bind_actual_github_run_id_before_fids_get_v39.sql",
  "bcdb0e8d77a0684e495467d20fdd0fb83c686c0e"],
 ["migrations/staged/V0081__phase5_t24_separate_transaction_postcommit_witness_v39.sql",
  "1ee6fa7f1582ec775002c1157f4b815cfe342015"]
];
const NAMES=[
 "phase5_fids_cycle_budget_v39","phase5_fids_day_budget_v39",
 "phase5_fids_utc_charge_budget_v39","phase5_fids_allowed_query_v39",
 "phase5_fids_physical_attempt_v39","phase5_fids_original_binding_v39",
 "phase5_fids_github_prearm_v39","phase5_t24_postcommit_witness_v39"
];
const HELPERS=[
 "phase5_fids_attempt_immutable_v39",
 "reserve_phase5_fids_physical_get_v39",
 "phase5_fids_check_original_v39",
 "phase5_fids_original_immutable_v39",
 "phase5_fids_prearm_immutable_v39",
 "prearm_phase5_fids_github_query_v39",
 "phase5_fids_require_actual_prearm_v39",
 "phase5_t24_witness_before_insert_v39",
 "phase5_t24_witness_immutable_v39"
];
const INDEXES=["p5_allowed_source_day_v39"];
const refuse=(v)=>{throw Error("REFUSED_P5_STAGE19_"+v);};

function exactBlob(path,pin){
 const b=readFileSync(path);
 const gitBlob=createHash("sha1").update(
  Buffer.concat([Buffer.from("blob "+b.length+"\0"),b])
 ).digest("hex");
 if(gitBlob!==pin)refuse("STAGED_MIGRATION_GIT_BLOB_CHANGED");
 return b.toString("utf8");
}
function admission(env){
 if(env.GITHUB_ACTIONS!=="true"||
  env.DATABASE_URL!==CI_URL||
  env.V39_DATABASE_RUNTIME_URL!==CI_URL||
  env.V39_P5_STAGE19_ATOMIC_INSTALL_CI!=="1"||
  env.V39_PHASE6_PROCESS_ARMED!=="0"||
  env.ADB_AUTO_COLLECT!=="0"||
  Boolean(env.AERODATABOX_API_KEY)||
  Boolean(env.AERODATABOX_WEBHOOK_SECRET)||
  Boolean(env.V39_P5_SOURCE_DATABASE_URL))
   refuse("DISPOSABLE_CI_ONLY_NO_PRODUCTION_OR_PROVIDER");
}

const META=[
 "SELECT current_database() AS db,",
 "current_setting('server_version_num') AS version,",
 "current_setting('transaction_read_only') AS read_only,",
 "pg_is_in_recovery() AS replica,",
 "has_schema_privilege(current_user,'clean','CREATE') AS may_create,",
 "has_table_privilege(current_user,'clean.fids_query_response','REFERENCES') AS may_fk_fids,",
 "has_table_privilege(current_user,'clean.flight_snapshots','REFERENCES') AS may_fk_pre,",
 "pg_catalog.format_type(f.atttypid,f.atttypmod) AS fids_key_type,",
 "pg_catalog.format_type(s.atttypid,s.atttypmod) AS snapshot_key_type,",
 "EXISTS(SELECT 1 FROM pg_catalog.pg_constraint c",
 " WHERE c.conrelid='clean.fids_query_response'::regclass",
 " AND c.contype IN ('p','u')",
 " AND c.conkey=ARRAY[f.attnum]::int2[]) AS fids_unique_key,",
 "EXISTS(SELECT 1 FROM pg_catalog.pg_constraint c",
 " WHERE c.conrelid='clean.flight_snapshots'::regclass",
 " AND c.contype IN ('p','u')",
 " AND c.conkey=ARRAY[s.attnum]::int2[]) AS snapshot_unique_key",
 "FROM pg_catalog.pg_attribute f",
 "JOIN pg_catalog.pg_attribute s ON s.attname='id'",
 " AND s.attrelid='clean.flight_snapshots'::regclass",
 "WHERE f.attname='population_query_id'",
 " AND f.attrelid='clean.fids_query_response'::regclass",
 " AND f.attnum>0 AND NOT f.attisdropped",
 " AND s.attnum>0 AND NOT s.attisdropped"
].join(" ");
const OBJECTS=[
 "SELECT (SELECT count(*)::int FROM pg_catalog.pg_class c",
 " JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace",
 " WHERE n.nspname='clean' AND c.relname=ANY($1::text[])) AS staged_relation_count,",
 "(SELECT count(*)::int FROM pg_catalog.pg_proc p",
 " JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace",
 " WHERE n.nspname='clean' AND p.proname=ANY($2::text[])) AS helper_collision_count,",
 "(SELECT count(*)::int FROM pg_catalog.pg_type t",
 " JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace",
 " WHERE n.nspname='clean' AND t.typname=ANY($3::text[])) AS composite_collision_count"
].join(" ");

async function stage19AtomicInstallCIFixture(pool,env=process.env){
 admission(env);
 // Pin local bytes before connecting, so a changed migration cannot partially
 // enter a transaction. No local checkout is trusted without blob verification.
 const files=SOURCES.map(([path,hash])=>exactBlob(path,hash));
 const c=await pool.connect();
 let open=false,attemptedCommit=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
  open=true;
  await c.query("SET LOCAL lock_timeout='2500ms'");
  await c.query("SET LOCAL statement_timeout='20000ms'");
  const r=(await c.query(META)).rows;
  if(r.length!==1)refuse("BASELINE_FK_METADATA_MISSING");
  const x=r[0];
  if(x.db!=="neondb"||Number(x.version)<160000||x.read_only!=="off"||
      x.replica!==false||x.may_create!==true||
      x.may_fk_fids!==true||x.may_fk_pre!==true||
      x.fids_key_type!=="uuid"||x.snapshot_key_type!=="bigint"||
      x.fids_unique_key!==true||x.snapshot_unique_key!==true)
    refuse("BASELINE_FK_TYPE_KEY_OR_PRIVILEGE_NOT_VERIFIED");
  const before=(await c.query(OBJECTS,[NAMES.concat(INDEXES),HELPERS,NAMES])).rows;
  if(before.length!==1||before[0].staged_relation_count!==0||
     before[0].helper_collision_count!==0||
     before[0].composite_collision_count!==0)
    refuse("STAGED_RELATION_TYPE_OR_FUNCTION_ALREADY_EXISTS");
  for(let i=0;i<files.length;i++){
   await c.query(files[i]);
   // Isolated negative fixture: deliberately roll back after V0079; this
   // proves all migrations share one transaction.
   if(i===0&&env.V39_P5_STAGE19_TEST_ABORT_AFTER_V0079==="1")
     refuse("TEST_INJECTED_FAILURE_AFTER_V0079_ROLLBACK");
  }
  const after=(await c.query(OBJECTS,[NAMES.concat(INDEXES),HELPERS,NAMES])).rows;
  if(after.length!==1||after[0].staged_relation_count!==9||
     after[0].helper_collision_count!==9||
     after[0].composite_collision_count!==8)
    refuse("AFTER_DDL_OBJECT_SET_INCOMPLETE");
  attemptedCommit=true;
  await c.query("COMMIT");open=false;
  const readback=await c.query(OBJECTS,[NAMES.concat(INDEXES),HELPERS,NAMES]);
  if(readback.rows.length!==1||
     readback.rows[0].staged_relation_count!==9||
     readback.rows[0].helper_collision_count!==9||
     readback.rows[0].composite_collision_count!==8)
    refuse("POST_COMMIT_SCHEMA_QUARANTINE_NO_BLIND_RETRY");
  return {
   schema:"v39.phase5.stage19.atomic-inert-staged-schema-disposable-ci.v1",
   status:"DISPOSABLE_PG16_ALL_THREE_STAGED_MIGRATIONS_ATOMICALLY_COMMITTED",
   stagedTables:8,stagedIndexRelations:1,stagedHelperFunctions:9,
   originalFlightRowsInserted:0,providerCalls:0,alertCreates:0,
   productionDatabaseWrites:0,productionRolesGranted:0,
   independentSourceRightsVerified:false,
   productionInstallAuthorized:false,phase5FreezePassed:false,
   phase6PaidGo:false
  };
 }catch(e){
  if(open&&!attemptedCommit)
   await c.query("ROLLBACK").catch(()=>{});
  if(attemptedCommit)refuse("COMMIT_OR_READBACK_UNKNOWN_QUARANTINE");
  throw e;
 }finally{c.release();}
}
async function main(){
 let pool;
 try{
  admission(process.env);
  pool=new Pool({connectionString:CI_URL,max:1,
   connectionTimeoutMillis:8000});
  console.log(JSON.stringify(await stage19AtomicInstallCIFixture(pool),null,2));
 }catch(e){
  if(process.env.GITHUB_ACTIONS==="true"&&
     process.env.DATABASE_URL===CI_URL){
   const reason=typeof e?.message==="string"&&
    /^REFUSED_P5_STAGE19_[A-Z0-9_]+$/.test(e.message)?
     e.message:"REFUSED_P5_STAGE19_SQL_OR_UNKNOWN";
   console.error(reason);
  }
  console.log("HOLD_P5_STAGE19_INERT_SCHEMA_CI_ONLY");
  process.exitCode=2;
 }finally{await pool?.end().catch(()=>{});}
}
if(process.env.V39_P5_STAGE19_ATOMIC_INSTALL_CI==="1")await main();
