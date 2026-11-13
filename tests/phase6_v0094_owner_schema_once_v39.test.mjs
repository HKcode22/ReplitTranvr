import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 V0094_EXPLICIT_OWNER_APPROVAL,V0094_REVIEWED_SQL_BLOB_SHA,
 V0094_MIGRATION_PATH,gitBlobSha1,reviewExactV0094Sql,
 readV0094OwnerInventory,classifyV0094Inventory,installV0094OnceOwner
} from "../scripts/v39_phase6_v0094_owner_schema_readonly_and_once.mjs";

const raw=readFileSync(V0094_MIGRATION_PATH);
const roleNames=["phase6_private_frozen_publisher_v39","phase6_private_frozen_reader_v39"];
const role=(name)=>({rolname:name,rolcanlogin:false,rolinherit:false,
 rolsuper:false,rolcreatedb:false,rolcreaterole:false,
 rolreplication:false,rolbypassrls:false});
const goodAcl=()=>({reader_select:true,reader_insert:false,
 reader_update:false,reader_delete:false,
 publisher_select:true,publisher_insert:true,
 publisher_update:false,publisher_delete:false,
 reader_usage:true,publisher_usage:true,
 reader_create:false,publisher_create:false});
function fixture({installed=false,partial=false,actor="neondb_owner",
 serverVersion=160016,ro="on",replica=false,superuser=false,
 legacy=true,members=0,rows=0,badAcl=false,failDdl=false}={}){
 let live=installed,attempts=0;
 const queries=[];
 const c={async query(q,params=[]){
  queries.push([q,params]);
  if(q==="BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"||
     q==="ROLLBACK"||q.startsWith("SET LOCAL "))
   return {rows:[]};
  if(q===raw.toString("utf8")){
   attempts++;
   if(failDdl)throw Error("TEST_COMMIT_UNKNOWN");
   live=true;
   return {rows:[]};
  }
  if(q.includes("current_database() AS db"))
   return {rows:[{db:"neondb",actor,version:serverVersion,ro,
    replica,superuser,db_bytes:"75415552"}]};
  if(q.includes("to_regnamespace('phase6_private') IS NOT NULL"))
   return {rows:[{schema_present:live,table_present:live&&!partial,
    legacy_auth_present:legacy,legacy_population_present:legacy}]};
  if(q.includes("FROM pg_catalog.pg_roles WHERE rolname=ANY"))
   return {rows:live?roleNames.map(role):[]};
  if(q.includes("FROM pg_catalog.pg_auth_members m"))
   return {rows:[{n:(live?2:0)+members,
    owner_bootstrap:live?2:0,unexpected:members}]};
  if(q.includes("pg_catalog.pg_get_userbyid(c.relowner)"))
   return {rows:[{table_owner:"neondb_owner",
    primary_key:true,immutability_trigger:true,
    public_privileges:false}]};
  if(q.startsWith("SELECT COUNT(*)::integer AS n FROM phase6_private"))
   return {rows:[{n:rows}]};
  if(q.includes("has_table_privilege($1::text"))
   return {rows:[badAcl?{...goodAcl(),publisher_insert:false}:goodAcl()]};
  throw Error("UNEXPECTED_TEST_SQL "+q.slice(0,180));
 }};
 return {c,queries,get attempts(){return attempts;}};
}
test("review exact staged migration blob SHA and never permit changed SQL",()=>{
 assert.equal(V0094_EXPLICIT_OWNER_APPROVAL,
  "INSTALL_ONCE_V0094_EMPTY_PRIVATE_SCHEMA_TWO_NOLOGIN_ROLES_NO_PAID");
 assert.equal(gitBlobSha1(raw),V0094_REVIEWED_SQL_BLOB_SHA);
 assert.match(reviewExactV0094Sql(raw,V0094_REVIEWED_SQL_BLOB_SHA),
  /CREATE SCHEMA phase6_private/);
 const changed=Buffer.from(raw.toString("utf8").replace(
  "NOLOGIN NOINHERIT","LOGIN NOINHERIT"));
 assert.throws(()=>reviewExactV0094Sql(changed,V0094_REVIEWED_SQL_BLOB_SHA),
  /EXACT_REVIEWED_MIGRATION_BLOB_REQUIRED/);
 assert.throws(()=>reviewExactV0094Sql(raw,"f".repeat(40)),
  /EXACT_REVIEWED_MIGRATION_BLOB_REQUIRED/);
});
test("owner-only read-only cold inventory matches supplied Nov13 Replit proof",async()=>{
 const x=fixture(),s=await readV0094OwnerInventory(x.c);
 assert.equal(s.state,"COLD_V0094_NOT_INSTALLED");
 assert.equal(s.databaseBytes,"75415552");
 assert.equal(s.tableRows,null);
 assert.equal(s.roles.length,0);
 assert.equal(s.roleMembers,0);
 assert.equal(s.ownerBootstrapAdminMembers,0);
 assert.equal(s.unexpectedRoleMembers,0);
 assert.equal(s.providerCalls,0);
 assert.equal(s.databaseWrites,0);
 assert.equal(s.paidPhase6Go,false);
 assert(x.queries.every(([q])=>!/^(CREATE|INSERT|ALTER|DELETE|UPDATE|DROP|COMMIT)/.test(q)));
});
test("one exact candidate installation changes only cold schema and readback",async()=>{
 const x=fixture(),s=await installV0094OnceOwner({
  client:x.c,rawMigration:raw,blobSha:V0094_REVIEWED_SQL_BLOB_SHA
 });
 assert.equal(x.attempts,1);
 assert.equal(s.status,"V0094_SCHEMA_ONCE_OWNER_READBACK_PASS_INERT");
 assert.equal(s.rolesCreatedNoLogin,2);
 assert.equal(s.tableRows,0);
 assert.equal(s.paidPhase6Go,false);
 assert.equal(s.separateIndependentReadbackStillRequired,true);
 assert.equal(s.ownerBootstrapAdminMembers,2);
 assert.equal(s.unexpectedRoleMembers,0);
 assert.equal(x.queries.filter(([q])=>q===raw.toString("utf8")).length,1);
});
test("existing empty V0094 rejects all replay and independent inventory reports inert",async()=>{
 const x=fixture({installed:true}),s=await readV0094OwnerInventory(x.c);
 assert.equal(s.state,"INSTALLED_EMPTY_INERT_V0094_NOLOGIN_NO_GO");
 assert.equal(s.roleMembers,2);
 assert.equal(s.ownerBootstrapAdminMembers,2);
 await assert.rejects(installV0094OnceOwner({
  client:x.c,rawMigration:raw,blobSha:V0094_REVIEWED_SQL_BLOB_SHA
 }),/ALREADY_INSTALLED_OR_PARTIAL_NEVER_REPLAY/);
 assert.equal(x.attempts,0);
});
test("wrong actor, PostgreSQL version, replica and read-only state all hold",async()=>{
 for(const bad of [{actor:"travnr_runtime"},{serverVersion:150000},
  {serverVersion:170000},{replica:true},{superuser:true},{ro:"off"}]){
  const x=fixture(bad);
  await assert.rejects(readV0094OwnerInventory(x.c),
   /WRONG_PRIMARY_DB_PG16_OR_OWNER/);
  assert(x.queries.some(([q])=>q==="ROLLBACK"));
  assert.equal(x.attempts,0);
 }
});
test("partial schema, unsafe rights, live members or unexpected rows hold",async()=>{
 for(const bad of [{installed:true,partial:true},
  {installed:true,badAcl:true},{installed:true,members:1},
  {installed:true,rows:1}]){
  const x=fixture(bad);
  await assert.rejects(readV0094OwnerInventory(x.c),
   /EXISTING_OR_PARTIAL_V0094_NEEDS_INDEPENDENT_REVIEW/);
  assert.equal(x.attempts,0);
 }
});
test("missing required old original schema does not permit an owner install",async()=>{
 const x=fixture({legacy:false});
 await assert.rejects(installV0094OnceOwner({
  client:x.c,rawMigration:raw,blobSha:V0094_REVIEWED_SQL_BLOB_SHA
 }),/EXISTING_PHASE5_BASELINE_MISSING_NO_DDL/);
 assert.equal(x.attempts,0);
});
test("ambiguous DDL/COMMIT failure never automatically retries",async()=>{
 const x=fixture({failDdl:true});
 await assert.rejects(installV0094OnceOwner({
  client:x.c,rawMigration:raw,blobSha:V0094_REVIEWED_SQL_BLOB_SHA
 }),/DDL_FAILED_OR_COMMIT_UNKNOWN_NO_RETRY/);
 assert.equal(x.attempts,1);
});
test("CI-only POST check forbids misclassifying active rows as inert",()=>{
 const x={schemaPresent:true,tablePresent:true,
  roles:roleNames.map(role),tableOwner:"neondb_owner",tableRows:4,
  roleMembers:0,publicTablePrivileges:false,
  privateAcl:{readerSelect:true,readerInsert:false,
   readerUpdate:false,readerDelete:false,publisherSelect:true,
   publisherInsert:true,publisherUpdate:false,publisherDelete:false,
   readerUsage:true,publisherUsage:true,
   readerCreate:false,publisherCreate:false},
  immutabilityTrigger:true,primaryKey:true};
 assert.throws(()=>classifyV0094Inventory(x),/INDEPENDENT_REVIEW/);
});
