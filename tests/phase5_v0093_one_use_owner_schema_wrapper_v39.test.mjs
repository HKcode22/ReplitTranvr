import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 V0093_OWNER_CONFIRM,reviewV0093MigrationArtifact,
 gitBlobSha1,readV0093OwnerCatalog,classifyV0093OneUseRelease,
 classifyV0093InstalledReadback,installV0093OneUseOwner
} from "../scripts/v39_phase5_v0093_one_use_owner_inert_schema_install_once.mjs";
const file="migrations/staged/V0093__phase5_v0082_typed_cost_only_upper_bound_inert_v39.sql";
const raw=readFileSync(file),sha=gitBlobSha1(raw);
const TABLES=[
 "clean.adb_phase6_authorization","clean.phase5_fids_seven_rest_release_v39",
 "clean.phase5_fids_allowed_query_v39","clean.phase5_fids_physical_attempt_v39",
 "clean.phase5_fids_exact_query_partition_v39",
 "clean.phase5_fids_cycle_budget_v39",
 "clean.phase5_fids_utc_rest_category_budget_v39"
];
function mock({
 installed=false,source=0,attempts=0,release=0,enabled=0,
 revoked=0,actor="neondb_owner",replica=false,badRole=false,
 injectedSqlFailure=false,auth=0
}={}){
 let after=installed,sourceRows=source,commits=0;
 const queries=[];
 const c={
  async query(sql,params=[]){
   queries.push([sql,params]);
   if(sql==="BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"||
      sql==="ROLLBACK"||sql.startsWith("SET LOCAL"))
    return {rows:[]};
   if(sql.includes("current_database() AS db")){
    return {rows:[{db:"neondb",actor:badRole?"travnr_runtime":actor,
       version:160000,ro:"on",replica,superuser:false}]};
   }
   if(sql.includes("FROM unnest($1::text[])")){
    return {rows:params[0].map(name=>({name,present:TABLES.includes(name)}))};
   }
   if(sql.includes("to_regprocedure('clean.phase5_fids_v0082_enforce_category_get_v39()')")){
    return {rows:[{present:true}]};
   }
   if(sql.includes("FROM pg_catalog.pg_attribute")){
    return {rows:after?[
     {attname:"budget_release_mode",attnotnull:true},
     {attname:"reviewed_cost_envelope_sha256",attnotnull:false},
     {attname:"reviewed_source_request_grid_sha256",attnotnull:false}
    ]:[{attname:"reviewed_source_request_grid_sha256",attnotnull:true}]};
   }
   if(sql.includes("COUNT(*) FILTER (WHERE enabled=true)"))
    return {rows:[{enabled,revoked}]};
   if(sql.includes("SELECT budget_release_mode"))
    return {rows:release?[{budget_release_mode:"COST_UPPER_BOUND",
      grid_null:true,cost_null:false}]:[]};
   if(sql.startsWith("SELECT COUNT(*)::int AS n FROM clean.")){
    const table=sql.slice("SELECT COUNT(*)::int AS n FROM clean.".length);
    const n={
     adb_phase6_authorization:auth,
     phase5_fids_seven_rest_release_v39:release,
     phase5_fids_allowed_query_v39:sourceRows,
     phase5_fids_physical_attempt_v39:attempts,
     phase5_fids_exact_query_partition_v39:0,
     phase5_fids_cycle_budget_v39:0,
     phase5_fids_utc_rest_category_budget_v39:0
    }[table];
    if(n===undefined)throw Error("UNKNOWN_TABLE_"+table);
    return {rows:[{n}]};
   }
   if(sql===raw.toString("utf8")){
    commits++;
    if(injectedSqlFailure)throw Error("INJECTED_AMBIGUOUS_SQL_FAILURE");
    after=true;return {rows:[]};
   }
   throw Error("UNEXPECTED_SQL_"+sql.slice(0,150));
  }
 };
 return {c,queries,get commits(){return commits;}};
}
test("review exact unchanged V0093 Git blob and migration structure",()=>{
 assert.equal(V0093_OWNER_CONFIRM,
  "INSTALL_ONLY_V0093_TYPED_INERT_BUDGET_SCHEMA_LEAVE_AUTH_DISABLED_NO_PAID");
 const r=reviewV0093MigrationArtifact(raw,sha);
 assert.equal(r.gitBlobSha1,sha);
 assert.match(r.sql,/COST_UPPER_BOUND/);
 assert.match(r.sql,/COMMIT;/);
 assert.throws(()=>reviewV0093MigrationArtifact(raw,"f".repeat(40)),/BLOB_SHA_MISMATCH/);
 const altered=Buffer.from(raw.toString("utf8").replace(
  "COST_UPPER_BOUND","UNREVIEWED_COST"));
 assert.throws(()=>reviewV0093MigrationArtifact(altered,sha),/BLOB_SHA_MISMATCH/);
 assert.throws(()=>reviewV0093MigrationArtifact(altered,gitBlobSha1(altered)),
  /NOT_THE_REVIEWED_V0093_INERT_ADDITIVE_SQL/);
});
test("cold start owner RO catalog reports exact absence of typed release and no source",async()=>{
 const x=mock(),s=await readV0093OwnerCatalog(x.c);
 assert.equal(s.actor,"neondb_owner");
 assert.equal(s.v0093TypedSchemaPresent,false);
 assert.equal(s.phase6EnabledRows,0);
 assert.equal(s.phase6AuthorizationRows,0);
 assert.equal(s.releaseRows,0);
 assert.equal(s.allowedQueryRows,0);
 assert.equal(s.physicalAttemptRows,0);
 assert.equal(classifyV0093OneUseRelease(s),
  "EXACT_V0093_ONE_USE_SCHEMA_ONLY_ALLOWED_NO_FLIGHT_OR_GO");
 assert(x.queries.every(([q])=>!/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COMMIT)\b/i.test(q)));
});
test("single exact reviewed migration in CI fake preserves all source and auth counts",async()=>{
 const x=mock({auth:1}),out=await installV0093OneUseOwner({
  client:x.c,sql:raw.toString("utf8"),sha
 });
 assert.equal(x.commits,1);
 assert.equal(out.status,"V0093_SCHEMA_ONLY_OWNER_INSTALL_AND_SAME_CONNECTION_READBACK_PASS");
 assert.equal(out.beforeV0093Installed,false);
 assert.equal(out.afterV0093Installed,true);
 assert.equal(out.existingB0062AuthorizationRowsPreserved,true);
 assert.equal(out.existingCycleBudgetRowsPreserved,true);
 assert.equal(out.verifiedAuthEnabled,false);
 assert.equal(out.phase6PaidGo,false);
 assert.equal(out.providerCalls,0);
 assert.equal(out.databaseSourceOrPREWrites,0);
});
test("existing V0093 typed schema forbids migration replay",async()=>{
 const x=mock({installed:true}),s=await readV0093OwnerCatalog(x.c);
 assert.equal(s.v0093TypedSchemaPresent,true);
 assert.throws(()=>classifyV0093OneUseRelease(s),/V0093_ALREADY_INSTALLED_OR_PARTIAL/);
 assert.equal(x.commits,0);
});
test("source already prepared or exact budget release existing never allows migration",async()=>{
 for(const setup of [
  {source:1},{attempts:1},{release:1},{enabled:1},{revoked:1}
 ]){
  const x=mock(setup),s=await readV0093OwnerCatalog(x.c);
  assert.throws(()=>classifyV0093OneUseRelease(s),
   /EXISTING_PAID_OR_PREPARED_SOURCE_OR_RELEASE_NO_DDL/);
  assert.equal(x.commits,0);
 }
});
test("wrong runtime role and replica refuse read-only owner preflight",async()=>{
 for(const setup of [{badRole:true},{replica:true}]){
  const x=mock(setup);
  await assert.rejects(readV0093OwnerCatalog(x.c),
   /WRONG_PG16_PRIMARY_OR_OWNER_ACTOR/);
  assert.equal(x.commits,0);
  assert(x.queries.some(([q])=>q==="ROLLBACK"));
 }
});
test("ambiguous SQL exception never retries a single DDL",async()=>{
 const x=mock({injectedSqlFailure:true});
 await assert.rejects(installV0093OneUseOwner({
  client:x.c,sql:raw.toString("utf8"),sha
 }),/SQL_FAILED_OR_COMMIT_UNKNOWN_NEVER_AUTO_RETRY/);
 assert.equal(x.commits,1);
});
test("typed installed readback still refuses a source or enabled B0062",async()=>{
 const ok=await readV0093OwnerCatalog(mock({installed:true}).c);
 assert.equal(classifyV0093InstalledReadback(ok),
  "V0093_TYPED_SCHEMA_VERIFIED_LIVE_INERT_NO_RELEASE_NO_GO");
 for(const setup of [{source:1},{enabled:1},{release:1}]){
  const c=await readV0093OwnerCatalog(mock({installed:true,...setup}).c);
  assert.throws(()=>classifyV0093InstalledReadback(c),
   /AFTER_SCHEMA_INSTALL_UNEXPECTED_SOURCE_OR_AUTH_STATE/);
 }
});
