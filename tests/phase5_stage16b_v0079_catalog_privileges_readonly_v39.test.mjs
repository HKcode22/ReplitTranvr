import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {auditP5V0079CatalogReadonly,P5_V0079_CATALOG_SQL}
 from "../scripts/v39_phase5_v0079_production_catalog_privileges_readonly_once.mjs";
const names=[
 "phase5_fids_cycle_budget_v39",
 "phase5_fids_day_budget_v39",
 "phase5_fids_utc_charge_budget_v39",
 "phase5_fids_allowed_query_v39",
 "phase5_fids_physical_attempt_v39",
 "phase5_fids_original_binding_v39"
];
function fake({count=6,schemaUsage=true,selectable=true,errored=false}={}){
 const queries=[];let released=0;
 const top={db:"neondb",ro:"on",schema_usage:schemaUsage,
  at:new Date("2026-11-07T11:34:03.714Z")};
 const rows=names.slice(0,count).map(name=>({
  name,may_select:selectable,may_insert:false,
  may_update:false,may_delete:false,
  resolvable_by_fully_qualified_name:selectable
 }));
 return {
  queries,get releases(){return released;},
  pool:{connect:async()=>({
   release(){released++},
   async query(sql,args){
    queries.push([sql,args??[]]);
    if(errored&&sql===P5_V0079_CATALOG_SQL)
      throw Error("sensitive database URL and role");
    if(sql.startsWith("SELECT current_database"))return {rows:[top]};
    if(sql===P5_V0079_CATALOG_SQL)return {rows};
    return {rows:[]};
   }
  })}
 };
}
describe("Stage16b V0079 production metadata-only catalog audit",()=>{
 it("distinguishes six physically present tables from access rights",async()=>{
  const t=fake();
  const r=await auditP5V0079CatalogReadonly(t.pool);
  assert.equal(r.v0079CatalogTableCount,6);
  assert.equal(r.v0079CatalogAllSixPresent,true);
  assert.equal(r.v0079AllSixResolvableForCurrentRole,true);
  assert.equal(r.productionInstallAuthorized,false);
  assert.equal(r.providerCalls,0);
  assert.equal(r.databaseWrites,0);
  assert.equal(r.phase6PaidGo,false);
  assert.equal(r.transactionReadOnlyVerified,true);
  assert.equal(t.releases,1);
  assert.equal(t.queries[0][0],
    "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  assert.equal(t.queries.at(-1)[0],"COMMIT");
 });
 it("separates complete absence from six existing-but-invisible tables",async()=>{
  const absent=await auditP5V0079CatalogReadonly(fake({count:0}).pool);
  assert.equal(absent.v0079CatalogTableCount,0);
  assert.equal(absent.possibleCause,
    "V0079_SIX_TABLES_PHYSICALLY_ABSENT_IN_THIS_DATABASE");
  const invisible=await auditP5V0079CatalogReadonly(
    fake({count:6,schemaUsage:false,selectable:false}).pool);
  assert.equal(invisible.v0079CatalogAllSixPresent,true);
  assert.equal(invisible.v0079AllSixResolvableForCurrentRole,false);
  assert.equal(invisible.possibleCause,
    "V0079_CATALOG_PRESENT_BUT_ROLE_USAGE_OR_RESOLUTION_LIMITED");
 });
 it("refuses partial schema as a valid completed installation",async()=>{
  const r=await auditP5V0079CatalogReadonly(fake({count:3}).pool);
  assert.equal(r.v0079CatalogAllSixPresent,false);
  assert.equal(r.possibleCause,"V0079_PARTIAL_SCHEMA_OR_ROLLOUT_HOLD");
 });
 it("rolls back on an SQL failure and never accesses provider contents",async()=>{
  const t=fake({errored:true});
  await assert.rejects(auditP5V0079CatalogReadonly(t.pool),
    /sensitive database URL/);
  assert.equal(t.queries.at(-1)[0],"ROLLBACK");
  assert.equal(t.releases,1);
  assert.match(P5_V0079_CATALOG_SQL,/pg_catalog.pg_class/);
  assert.doesNotMatch(P5_V0079_CATALOG_SQL,
    /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i);
  assert.doesNotMatch(P5_V0079_CATALOG_SQL,
    /\bFROM\s+clean\./i);
  assert.doesNotMatch(P5_V0079_CATALOG_SQL,
    /raw_payload|bodyBase64|flight_number|api_key/i);
 });
});
