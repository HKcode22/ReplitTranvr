import {before,after,it} from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {installPhase5V0083EmptySchemaAndRestRolesOnce} from
  "../scripts/v39_phase5_v0083_inert_other_rest_schema_nologin_owner_once.mjs";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const OLD=[
 "phase5_fids_prepare_prod_20261107",
 "phase5_fids_source_prod_20261107",
 "phase5_fids_pre_writer_prod_20261107",
 "phase5_fids_t24_witness_prod_20261107",
 "phase5_fids_budget_freeze_prod_20261108"
];
const NEW=[
 "phase5_other_rest_review_prod_20261108",
 "phase5_other_rest_reserve_prod_20261108"
];
const TABLES=[
 "phase5_other_rest_reviewed_call_v39",
 "phase5_other_rest_physical_reservation_v39"
];
let pool;
const eligible=process.env.V39_P5_V0083_INERT_INSTALL_PG16==="1";
function signed(){
 return {
  DATABASE_URL:URL,
  V39_DATABASE_RUNTIME_URL:"postgresql://ignored:ci@localhost:5432/neondb?sslmode=disable",
  ADB_AUTO_COLLECT:"0",
  V39_PHASE6_PROCESS_ARMED:"0",
  V39_PHASE6_OWNER_APPROVED:"0",
  GITHUB_ACTIONS:"true",
  GITHUB_SHA:process.env.GITHUB_SHA,
  P5_V0083_CI_DISPOSABLE_ONLY:"1",
  P5_V0083_REVIEWED_MAIN_SHA:process.env.GITHUB_SHA,
  P5_V0083_EXPECTED_OWNER_ROLE:"postgres",
  P5_V0083_EMPTY_INSTALL_ONCE:
   "INSTALL_EMPTY_V0083_OTHER_REST_NOLOGIN_ROLES_NO_PROVIDER"
 };
}
async function snapshot(){
 const rel=(await pool.query(
  "SELECT relname FROM pg_catalog.pg_class c "+
  "JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace "+
  "WHERE n.nspname='clean' AND c.relkind IN ('r','p') "+
  "AND relname=ANY($1::text[]) ORDER BY relname",[TABLES]
 )).rows.map(x=>x.relname);
 const roles=(await pool.query(
  "SELECT rolname,rolcanlogin FROM pg_catalog.pg_roles "+
  "WHERE rolname=ANY($1::text[]) ORDER BY rolname",[NEW]
 )).rows;
 const func=(await pool.query(
  "SELECT pg_get_functiondef(to_regprocedure("+
  "'clean.phase5_fids_v0082_category_immutable_v39()')) sql"
 )).rows[0].sql;
 const receipts=(await pool.query(
  "SELECT COUNT(*)::int n FROM clean.phase5_fids_physical_attempt_v39"
 )).rows[0].n;
 return {rel,roles,func,receipts};
}
before(async()=>{
 if(!eligible||process.env.GITHUB_ACTIONS!=="true"||
    process.env.DATABASE_URL!==URL||
    !/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA??"")||
    process.env.AERODATABOX_API_KEY||
    process.env.V39_PHASE6_PROCESS_ARMED!=="0")
   throw Error("REFUSED_P5_V0083_TEST_NOT_DISPOSABLE_POSTGRES");
 pool=new pg.Pool({connectionString:URL,max:2});
 for(const x of OLD)
  await pool.query("CREATE ROLE "+x+
    " NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB "+
    "NOCREATEROLE NOREPLICATION NOBYPASSRLS");
});
after(async()=>{if(pool)await pool.end();});

it("rejects absent owner purpose or nonlocal database before DDL",async()=>{
 await assert.rejects(
   installPhase5V0083EmptySchemaAndRestRolesOnce(pool,{
    ...signed(),P5_V0083_EMPTY_INSTALL_ONCE:""
   }),/MISSING_REVIEWED_MAIN_OWNER/);
 await assert.rejects(
   installPhase5V0083EmptySchemaAndRestRolesOnce(pool,{
    ...signed(),DATABASE_URL:"postgresql://example.invalid/neondb"
   }),/CI_MUST_USE_ISOLATED_POSTGRES16/);
 const s=await snapshot();
 assert.deepEqual(s.rel,[]);
 assert.equal(s.roles.length,0);
 assert.equal(s.receipts,0);
 assert.equal(s.func.includes("P5_V0083_OTHER_CATEGORY_REQUIRES_SAME_TRANSACTION"),false);
});

it("rolls back staged DDL including replacement of the older V0082 trigger body",async()=>{
 const old=await snapshot();
 await assert.rejects(
   installPhase5V0083EmptySchemaAndRestRolesOnce(pool,{
    ...signed(),P5_V0083_CI_INJECT_ROLLBACK:"1"
   }),/CI_INJECT_ATOMIC_DDL_ROLLBACK/);
 const s=await snapshot();
 assert.deepEqual(s.rel,[]);
 assert.equal(s.roles.length,0);
 assert.equal(s.receipts,0);
 assert.equal(s.func,old.func);
});

it("atomically installs only inert schema and two isolated groups with exact read/write/EXECUTE ACL",async()=>{
 const result=await installPhase5V0083EmptySchemaAndRestRolesOnce(pool,signed());
 assert.equal(result.status,
  "V0083_EMPTY_OTHER_REST_SCHEMA_AND_SPLIT_NOLOGIN_ROLES_INSTALLED_INERT");
 assert.equal(result.exactStagedSqlGitBlob,
  "a5e1e9df39ec9b436f0576245f375985a69a3b71");
 assert.equal(result.addedTables,2);
 assert.equal(result.newRuntimeLogin,0);
 assert.equal(result.physicalRestReservations,0);
 assert.equal(result.providerFidsGets,0);
 assert.equal(result.scientificFreeze,false);
 const s=await snapshot();
 assert.deepEqual(s.rel,[...TABLES].sort());
 assert.equal(s.roles.length,2);
 assert.equal(s.roles.every(x=>x.rolcanlogin===false),true);
 assert.equal(s.receipts,0);
 assert.equal(s.func.includes("P5_V0083_OTHER_CATEGORY_REQUIRES_SAME_TRANSACTION"),true);
 assert.equal(s.func.includes("P5_V0082_SOURCE_MUST_RESERVE_EXACT_TWO_UNITS"),true);
 const perms=(await pool.query(
  "SELECT has_table_privilege($1,"+
  "'clean.phase5_other_rest_reviewed_call_v39','INSERT') reviewer_insert,"+
  "has_table_privilege($2,"+
  "'clean.phase5_other_rest_physical_reservation_v39','INSERT') spender_insert,"+
  "has_function_privilege($2,$3,'EXECUTE') spender_exec,"+
  "has_function_privilege($1,$3,'EXECUTE') reviewer_exec,"+
  "has_function_privilege($4,$3,'EXECUTE') source_exec",
  [NEW[0],NEW[1],
  "clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)",
  OLD[1]]
 )).rows[0];
 assert.deepEqual(perms,{
  reviewer_insert:true,spender_insert:false,spender_exec:true,
  reviewer_exec:false,source_exec:false
 });
});

it("refuses replay with both groups and empty data intact",async()=>{
 await assert.rejects(
  installPhase5V0083EmptySchemaAndRestRolesOnce(pool,signed()),
  /EXACT_FIVE_EXISTING_NOLOGIN_GROUPS_REQUIRED_NO_REPLAY/);
 const s=await snapshot();
 assert.equal(s.rel.length,2);
 assert.equal(s.roles.length,2);
 assert.equal(s.receipts,0);
});
