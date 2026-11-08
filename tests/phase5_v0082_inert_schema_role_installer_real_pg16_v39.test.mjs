/**
 * Real disposable PG16: immutable V0082 DDL + new NOLOGIN role/ACL all in
 * one SQL transaction. No user DB credentials, provider calls, PRE, or GO.
 */
import {describe,it,before,after} from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {
 installPhase5V0082EmptySchemaAndNoLoginRolesOnce
} from "../scripts/v39_phase5_v0082_inert_schema_and_nologin_roles_owner_once.mjs";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const ROLE="phase5_fids_budget_freeze_prod_20261108";
const OLD=[
 "phase5_fids_prepare_prod_20261107",
 "phase5_fids_source_prod_20261107",
 "phase5_fids_pre_writer_prod_20261107",
 "phase5_fids_t24_witness_prod_20261107"
];
const TABLES=[
 "phase5_fids_seven_rest_release_v39",
 "phase5_fids_cycle_rest_category_cap_v39",
 "phase5_fids_utc_rest_category_budget_v39",
 "phase5_fids_exact_query_partition_v39"
];
const enabled=process.env.V39_P5_V0082_INSTALL_PG16==="1";
const testSuite=enabled?describe:describe.skip;
testSuite("V0082 additive inert schema + separate NOLOGIN budget freezer",()=>{
 let admin;
 const review=()=>({
  ...process.env,
  P5_V0082_INERT_SCHEMA_ONCE:
   "INSTALL_EMPTY_V0082_ONLY_AND_BUDGET_NOLOGIN_ROLES_NO_PROVIDER",
  P5_V0082_REVIEWED_MAIN_SHA:process.env.GITHUB_SHA,
  P5_V0082_EXPECTED_OWNER_ROLE:"postgres",
  P5_V0082_CI_DISPOSABLE_ONLY:"1",
  DATABASE_URL:URL,
  V39_DATABASE_RUNTIME_URL:
   "postgresql://not-connected:ci-only@localhost:5432/neondb?sslmode=disable",
  ADB_AUTO_COLLECT:"0",
  V39_PHASE6_PROCESS_ARMED:"0",
  V39_PHASE6_OWNER_APPROVED:"0"
 });
 async function snapshot(){
  const v=(await admin.query(
   "SELECT "+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_allowed_query_v39) queries,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_physical_attempt_v39) attempts,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_original_binding_v39) originals,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_github_prearm_v39) prearm"
  )).rows[0];
  const relations=(await admin.query(
   "SELECT relname FROM pg_catalog.pg_class c "+
   "JOIN pg_catalog.pg_namespace n ON c.relnamespace=n.oid "+
   "WHERE n.nspname='clean' AND c.relname=ANY($1::text[]) "+
   "AND c.relkind IN ('r','p') ORDER BY relname",[TABLES]
  )).rows.map(x=>x.relname);
  const role=(await admin.query(
   "SELECT rolname,rolcanlogin FROM pg_catalog.pg_roles WHERE rolname=$1",
   [ROLE]
  )).rows;
  return {data:v,relations,role};
 }
 before(async()=>{
  if(!enabled||process.env.GITHUB_ACTIONS!=="true"||
     process.env.DATABASE_URL!==URL||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
     process.env.V39_PHASE6_OWNER_APPROVED!=="0"||
     !/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA??""))
    throw Error("REFUSED_P5_V0082_ROLE_TEST_NONDISPOSABLE");
  admin=new pg.Pool({connectionString:URL,max:2});
  for(const role of OLD){
   await admin.query(
    "CREATE ROLE "+role+" NOLOGIN NOINHERIT NOSUPERUSER "+
    "NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"
   );
  }
 });
 after(async()=>{if(admin)await admin.end();});
 it("refuses nonlocal CI target and absent signed owner permit before DDL",async()=>{
  await assert.rejects(
   installPhase5V0082EmptySchemaAndNoLoginRolesOnce(admin,{
    ...review(),P5_V0082_INERT_SCHEMA_ONCE:""
   }),/MISSING_EXACT_OWNER_MAIN_SHA/);
  await assert.rejects(
   installPhase5V0082EmptySchemaAndNoLoginRolesOnce(admin,{
    ...review(),DATABASE_URL:"postgresql://example.invalid/neondb"
   }),/CI_LOCAL_DISPOSABLE_MAIN_SHA_ONLY/);
  const s=await snapshot();
  assert.deepEqual(s.data,{queries:0,attempts:0,originals:0,prearm:0});
  assert.equal(s.relations.length,0);
  assert.equal(s.role.length,0);
 });
 it("rolls back all 4 V0082 tables and functions on injected mid-install failure",async()=>{
  await assert.rejects(
   installPhase5V0082EmptySchemaAndNoLoginRolesOnce(admin,{
    ...review(),P5_V0082_CI_INJECT_ROLLBACK:"1"
   }),/CI_INJECTED_ATOMIC_V0082_INSTALL_ROLLBACK/);
  const s=await snapshot();
  assert.equal(s.relations.length,0);
  assert.equal(s.role.length,0);
  assert.deepEqual(s.data,{queries:0,attempts:0,originals:0,prearm:0});
  const funcs=(await admin.query(
   "SELECT to_regprocedure("+
   "'clean.phase5_fids_v0082_enforce_category_get_v39()') AS f"
  )).rows[0];
  assert.equal(funcs.f,null);
 });
 it("installs only exact V0082 inert DDL and NOLOGIN budget + revised prepare grants",async()=>{
  const r=await installPhase5V0082EmptySchemaAndNoLoginRolesOnce(admin,review());
  assert.equal(r.status,
   "V0082_EMPTY_FROZEN_CATEGORY_SCHEMA_AND_NOLOGIN_ACL_INSTALLED_INERT");
  assert.equal(r.stagedExactGitBlobSha1,
   "49b0954c25eeff6c496dfb03cf8b6d735e26badb");
  assert.equal(r.newTables,4);
  assert.equal(r.newFunctions,3);
  assert.equal(r.newTriggers,5);
  assert.equal(r.newRuntimeLoginRoles,0);
  assert.equal(r.categoryBudgetRows,0);
  assert.equal(r.actualProviderFidsGets,0);
  assert.equal(r.phase6PaidGo,false);
  const s=await snapshot();
  assert.equal(s.relations.length,4);
  assert.equal(s.role.length,1);
  assert.equal(s.role[0].rolcanlogin,false);
  assert.deepEqual(s.data,{queries:0,attempts:0,originals:0,prearm:0});
  const grants=(await admin.query(
   "SELECT "+
   "has_table_privilege($1,'clean.phase5_fids_exact_query_partition_v39',"+
    "'INSERT') prep_can_partition,"+
   "has_table_privilege($2,'clean.phase5_fids_exact_query_partition_v39',"+
    "'INSERT') source_can_partition,"+
   "has_table_privilege($3,'clean.phase5_fids_seven_rest_release_v39',"+
    "'INSERT') freeze_can_release,"+
   "has_table_privilege($3,'clean.phase5_fids_allowed_query_v39',"+
    "'INSERT') freeze_can_source,"+
   "has_table_privilege($3,'clean.fids_query_response',"+
    "'SELECT') freeze_can_read_original",
   [OLD[0],OLD[1],ROLE]
  )).rows[0];
  assert.deepEqual(grants,{
   prep_can_partition:true,source_can_partition:false,
   freeze_can_release:true,freeze_can_source:false,
   freeze_can_read_original:false
  });
 });
 it("rejects repeat DDL/grants without altering four older roles",async()=>{
  await assert.rejects(
   installPhase5V0082EmptySchemaAndNoLoginRolesOnce(admin,review()),
   /EXISTING_FOUR_SCOPED_NOLOGIN_ROLES_OR_NEW_BUDGET_ROLE_UNEXPECTED/);
  const s=await snapshot();
  assert.equal(s.relations.length,4);
  assert.equal(s.role.length,1);
  assert.deepEqual(s.data,{queries:0,attempts:0,originals:0,prearm:0});
  const old=(await admin.query(
   "SELECT rolname,rolcanlogin FROM pg_catalog.pg_roles "+
   "WHERE rolname=ANY($1::text[]) ORDER BY rolname",[OLD]
  )).rows;
  assert.equal(old.length,4);
  assert.equal(old.every(x=>x.rolcanlogin===false),true);
 });
});
