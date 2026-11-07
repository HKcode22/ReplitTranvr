import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {
 auditPhase5InstallDependenciesReadonly,P5_STAGE18_CATALOG_SQL
} from "../scripts/v39_phase5_v0079_v0081_install_dependencies_readonly_once.mjs";

const base={
 adb_phase6_calendar_day:["run_day_index","scheduled_start_utc",
   "calendar_hash","config_hash","frame_hash"],
 adb_sampling_draw:["run_day_index","slot_id","selected_icao","selected_at_utc"],
 fids_query_response:["population_query_id","source_airport_icao",
   "query_direction","service_window_start_utc","service_window_end_utc",
   "from_local","to_local","airport_iana_timezone","provider_api_version",
   "fids_protocol_version","openapi_sha256","fids_retrieval_utc",
   "raw_persisted_at_utc","available_at","response_hash","raw_payload",
   "raw_expired_at_utc"],
 flight_population:["population_query_id","source_airport_icao",
   "dep_airport_icao","source_type","available_at","population_member_id",
   "analytic_identity_id","canonical_flight_instance_id","population_role",
   "scope_classification","codeshare_resolution_status",
   "provider_content_expired_at_utc","dep_scheduled_utc"],
 flight_snapshots:["id","flight_instance_id","horizon","prediction_state",
   "population_member_id","selected_t_milestone_utc","selected_t_version",
   "population_query_id","fids_response_hash","frame_hash","config_hash",
   "prediction_cutoff_utc","created_at"]
};
const stages=[
 "phase5_fids_cycle_budget_v39","phase5_fids_day_budget_v39",
 "phase5_fids_utc_charge_budget_v39","phase5_fids_allowed_query_v39",
 "phase5_fids_physical_attempt_v39","phase5_fids_original_binding_v39",
 "phase5_fids_github_prearm_v39","phase5_t24_postcommit_witness_v39"
];
function fake({presentStage=0,missingBase=null,failSql=false,
 wrongDb=false,readonly=true}={}){
 const queries=[];
 let releases=0;
 const rows=Object.entries(base).map(([table_name,column_names])=>({
  table_name,column_names:table_name===missingBase?
   column_names.filter(x=>x!=="population_query_id"):column_names
 }));
 for(const s of stages.slice(0,presentStage))
  rows.push({table_name:s,column_names:["id"]});
 return {
  queries,get releases(){return releases;},
  pool:{connect:async()=>({
   release(){releases++},
   async query(sql,params){
    queries.push({sql,params});
    if(failSql&&sql===P5_STAGE18_CATALOG_SQL)
     throw Error("sensitive password/database URL");
    if(sql.startsWith("SELECT current_database()"))return {rows:[{
     db:wrongDb?"postgres":"neondb",
     ro:readonly?"on":"off",pg_version:"160010",
     replica:false,at:new Date("2026-11-07T12:18:48.521Z"),
     usage:true,can_create:false
    }]};
    if(sql===P5_STAGE18_CATALOG_SQL)return {rows};
    return {rows:[]};
   }
  })}
 };
}
describe("P5 Stage18 zero-write production dependency catalog",()=>{
 it("correctly classifies actual six-V0079 absent and all B0062 ready",async()=>{
  const t=fake();
  const a=await auditPhase5InstallDependenciesReadonly(t.pool);
  assert.equal(a.baselineRequiredColumnsPresent,true);
  assert.equal(a.stageTableSetAllAbsent,true);
  assert.equal(a.v0079.presentRelations,0);
  assert.equal(a.v0080.presentRelations,0);
  assert.equal(a.v0081.presentRelations,0);
  assert.equal(a.classification,"BASELINE_PRESENT_ALL_STAGED_ABSENT_NOT_INSTALLED");
  assert.equal(a.productionInstallAuthorized,false);
  assert.equal(a.databaseWrites,0);
  assert.equal(a.paidProviderRequests,0);
  assert.equal(a.phase6PaidGo,false);
  assert.equal(t.queries[0].sql,
   "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  assert.equal(t.queries.at(-1).sql,"COMMIT");
  assert.equal(t.releases,1);
 });
 it("blocks missing base column as a reviewed installation prerequisite",async()=>{
  const t=fake({missingBase:"fids_query_response"});
  const a=await auditPhase5InstallDependenciesReadonly(t.pool);
  assert.equal(a.baselineRequiredColumnsPresent,false);
  assert.equal(a.classification,"BASELINE_COLUMNS_MISSING_OR_TABLE_ABSENT_HOLD");
  const missing=a.baseline.find(x=>x.table==="fids_query_response");
  assert.deepEqual(missing.missingRequiredColumns,["population_query_id"]);
 });
 it("distinguishes partial install and full staged table presence",async()=>{
  const partial=await auditPhase5InstallDependenciesReadonly(
   fake({presentStage:6}).pool);
  assert.equal(partial.stagedSchemaPartialOrOutOfOrder,true);
  assert.equal(partial.classification,"STAGED_SCHEMA_PARTIAL_OR_OUT_OF_ORDER_HOLD");
  const all=await auditPhase5InstallDependenciesReadonly(
   fake({presentStage:8}).pool);
  assert.equal(all.stageTableSetAllPresent,true);
  assert.equal(all.classification,"STAGED_TABLES_PRESENT_ACL_AND_FUNCTIONS_UNVERIFIED");
  assert.equal(all.SQLFunctionTriggerAndRoleGrantsVerified,false);
  assert.equal(all.productionInstallAuthorized,false);
 });
 it("fails closed on wrong database / unverified read-only transaction",async()=>{
  const wrong=fake({wrongDb:true});
  await assert.rejects(auditPhase5InstallDependenciesReadonly(wrong.pool),
   /EXPECTED_PRIMARY_PG16_DB/);
  assert.equal(wrong.queries.at(-1).sql,"ROLLBACK");
  assert.equal(wrong.releases,1);
  await assert.rejects(auditPhase5InstallDependenciesReadonly(
   fake({readonly:false}).pool),/EXPECTED_PRIMARY_PG16_DB/);
 });
 it("uses only PostgreSQL catalog, never production flight rows or paid calls",async()=>{
  const t=fake({failSql:true});
  await assert.rejects(auditPhase5InstallDependenciesReadonly(t.pool),
   /sensitive password/);
  assert.equal(t.queries.at(-1).sql,"ROLLBACK");
  assert.equal(t.releases,1);
  assert.match(P5_STAGE18_CATALOG_SQL,/pg_catalog\.pg_class/);
  assert.match(P5_STAGE18_CATALOG_SQL,/pg_catalog\.pg_attribute/);
  assert.doesNotMatch(P5_STAGE18_CATALOG_SQL,/\bFROM\s+clean\./i);
  assert.doesNotMatch(P5_STAGE18_CATALOG_SQL,
   /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i);
  assert.doesNotMatch(P5_STAGE18_CATALOG_SQL,
   /raw_payload\s*(?:->|#>>)|bodyBase64|api_key|flight_number/i);
 });
});
