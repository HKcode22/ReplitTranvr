import test from "node:test";
import assert from "node:assert/strict";
import {independentReadV0093InstalledOwnerCatalog} from
 "../scripts/v39_phase5_v0093_independent_owner_readonly_once.mjs";

const TABLES=[
 "adb_phase6_calendar_day","adb_phase6_authorization",
 "phase5_fids_cycle_budget_v39","phase5_fids_utc_charge_budget_v39",
 "phase5_fids_seven_rest_release_v39",
 "phase5_fids_cycle_rest_category_cap_v39",
 "phase5_fids_utc_rest_category_budget_v39",
 "phase5_fids_allowed_query_v39",
 "phase5_fids_exact_query_partition_v39",
 "phase5_fids_physical_attempt_v39"
];
function factory({actor="neondb_owner",replica=false,typed=true,
 badDefault=false,weakConstraint=false,badFunction=false,
 disabledTrigger=false,missingTable=false,enabled=0,revoked=0,
 countOverrides={}}={}){
 const queries=[];let releases=0,rollbacks=0;
 const c={
  async query(sql,params=[]){
   queries.push([sql,params]);
   if(sql.startsWith("BEGIN TRANSACTION"))return {rows:[]};
   if(sql.startsWith("SET LOCAL"))return {rows:[]};
   if(sql==="ROLLBACK"){rollbacks++;return {rows:[]};}
   if(sql.includes("current_database() AS db"))return {rows:[{
    db:"neondb",actor,server_version:160000,read_only:"on",
    replica,superuser:false,observed_at_utc:"2026-11-13T04:22:00.000Z"
   }]};
   if(sql.includes("FROM unnest($1::text[])"))return {rows:params[0].map(
    (relation,i)=>({relation,present:!(missingTable&&i===2)})
   )};
   if(sql.includes("FROM pg_catalog.pg_attribute"))return {rows:typed?[
    {attname:"budget_release_mode",attnotnull:true,
     default_expression:badDefault?"'UNREVIEWED'::text":"'EXACT_SOURCE_GRID'::text"},
    {attname:"reviewed_cost_envelope_sha256",attnotnull:false,default_expression:null},
    {attname:"reviewed_source_request_grid_sha256",attnotnull:false,default_expression:null}
   ]:[
    {attname:"reviewed_source_request_grid_sha256",attnotnull:true,default_expression:null}
   ]};
   if(sql.includes("FROM pg_catalog.pg_constraint"))return {rows:[{
    conname:"p5_v0093_release_provenance_disjoint",
    contype:"c",convalidated:!weakConstraint,
    definition:"CHECK ((budget_release_mode = 'EXACT_SOURCE_GRID' AND reviewed_source_request_grid_sha256 IS NOT NULL AND reviewed_cost_envelope_sha256 IS NULL) OR (budget_release_mode = 'COST_UPPER_BOUND' AND reviewed_source_request_grid_sha256 IS NULL AND reviewed_cost_envelope_sha256 IS NOT NULL))"
   }]};
   if(sql.includes("FROM pg_catalog.pg_trigger"))return {rows:[{
    tgname:"phase5_fids_v0082_seven_rest_before_physical",
    tgenabled:disabledTrigger?"D":"O",tgtype:7,
    matches_original_function:true
   }]};
   if(sql.includes("SELECT pg_get_functiondef"))return {rows:[{
    definition:badFunction?"CREATE FUNCTION broken":
      "CREATE FUNCTION budget_release_mode COST_UPPER_BOUND EXACT_SOURCE_GRID P5_V0093_SIGNED_SOURCE_QUERY_MISSING_PARTITION_OR_OVER_COST_CAP P5_V0082_CATEGORY_ALREADY_EXHAUSTED phase5_fids_utc_rest_category_budget_v39 reviewed_provider_range_sha256"
   }]};
   if(sql.startsWith("SELECT COUNT(*)::int AS n FROM clean.")){
    const table=sql.slice("SELECT COUNT(*)::int AS n FROM clean.".length);
    const n=countOverrides[table]??0;
    return {rows:[{n}]};
   }
   if(sql.includes("COUNT(*) FILTER (WHERE enabled)"))return {rows:[{enabled,revoked}]};
   throw Error("UNEXPECTED_SQL_"+sql.slice(0,180));
  },
  release(){releases++;}
 };
 return {pool:{async connect(){return c;}},queries,
  get releaseCount(){return releases;},get rollbackCount(){return rollbacks}};
}
test("fresh independent owner-only PG16 READ ONLY audit is schema evidence, not GO",async()=>{
 const x=factory();
 const y=await independentReadV0093InstalledOwnerCatalog(x.pool);
 assert.equal(y.status,
 "INDEPENDENT_NEW_CONNECTION_REAL_PG16_V0093_TYPED_INERT_SCHEMA_READBACK_PASS");
 assert.equal(y.existingV0082BeforePhysicalAttemptTriggerEnabled,true);
 assert.equal(y.installedV0093CostUpperBoundModeAndNullGrid,true);
 assert.equal(y.releaseProvenanceMutualExclusionCheckValidated,true);
 assert.equal(y.phase6AuthorizationRows,0);
 assert.equal(y.sourceRequestsAndPhysicalAttemptsZero,true);
 assert.equal(y.databaseWrites,0);
 assert.equal(y.providerCalls,0);
 assert.equal(y.phase6PaidGo,false);
 assert.equal(y.realSignedFutureCalendarProven,false);
 assert.equal(Object.keys(y.counts).length,TABLES.length);
 assert.equal(x.rollbackCount,1);
 assert.equal(x.releaseCount,1);
 assert(x.queries.every(([q])=>
   !/^\s*(INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|COMMIT)\b/i.test(q)));
 assert(x.queries.some(([q])=>q.startsWith("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")));
});
test("reject original V0082-only installation: need actual typed V0093 columns",async()=>{
 const x=factory({typed:false});
 await assert.rejects(independentReadV0093InstalledOwnerCatalog(x.pool),
  /EXACT_THREE_COLUMNS_MISSING/);
 assert.equal(x.rollbackCount,1);
});
test("reject changed cost default or unvalidated provenance mutual-exclusion check",async()=>{
 for(const setup of [{badDefault:true},{weakConstraint:true}]){
  const x=factory(setup);
  await assert.rejects(independentReadV0093InstalledOwnerCatalog(x.pool),
    /V0093_TYPED_COST_MODE_OR_ORIGINAL_GRID_NULLABILITY_WRONG|V0093_PROVENANCE_DISJOINT_CHECK_NOT_ENFORCED/);
  assert.equal(x.rollbackCount,1);
 }
});
test("v0082 physical GET trigger must still be enabled, bound, and V0093 charge guard must exist",async()=>{
 for(const setup of [{disabledTrigger:true},{badFunction:true}]){
  const x=factory(setup);
  await assert.rejects(independentReadV0093InstalledOwnerCatalog(x.pool),
    /ORIGINAL_V0082_BEFORE_INSERT_TRIGGER_NOT_BOUND_TO_V0093_FUNCTION|V0093_FUNCTION_NOT_TYPED_OR_CHARGE_GUARD_INCOMPLETE/);
  assert.equal(x.rollbackCount,1);
 }
});
test("no source, budget release, physical attempt, active auth permitted before signed Phase6 start",async()=>{
 for(const setup of [
  {enabled:1},{revoked:1},
  {countOverrides:{phase5_fids_seven_rest_release_v39:1}},
  {countOverrides:{phase5_fids_cycle_rest_category_cap_v39:7}},
  {countOverrides:{phase5_fids_utc_rest_category_budget_v39:7}},
  {countOverrides:{phase5_fids_allowed_query_v39:1}},
  {countOverrides:{phase5_fids_physical_attempt_v39:1}},
  {countOverrides:{phase5_fids_exact_query_partition_v39:1}}
 ]){
  const x=factory(setup);
  await assert.rejects(independentReadV0093InstalledOwnerCatalog(x.pool),
    /SOURCE_OR_COST_RELEASE_ALREADY_PRESENT_OR_PHASE6_AUTH_ACTIVE/);
  assert.equal(x.rollbackCount,1);
 }
});
test("refuse wrong user/replica, no table, untrusted connection; always rollback",async()=>{
 for(const setup of [
  {actor:"travnr_runtime"},{replica:true},{missingTable:true}
 ]){
  const x=factory(setup);
  await assert.rejects(independentReadV0093InstalledOwnerCatalog(x.pool),
    /NOT_INDEPENDENT_REAL_OWNER_PG16_READONLY_PRIMARY|MISSING_ALREADY_INSTALLED_B0062_V0079_V0082_TABLE/);
  assert.equal(x.rollbackCount,1);
  assert.equal(x.releaseCount,1);
 }
});
