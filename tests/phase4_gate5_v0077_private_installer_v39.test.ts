import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {
 P4_G5_V0077_FILE_V39,
 P4_G5_V0077_REVIEWED_BLOB_V39,
 P4_G5_V0077_OPERATOR_INTENT_V39,
 assertP4G5V0077ReviewedSqlV39,
 assertP4G5V0077InstallerIntentV39,
 assessP4G5V0077CatalogV39,
 safeP4G5V0077InstallFailureReasonV39,
 quoteP4G5V0077CatalogRoleV39,
 v0077ScopedRevokeSqlV39,
 verifyP4G5V0077NoRuntimePrivilegesV39
} from "../scripts/v39_phase4_gate5_v0077_metadata_only_installer";

const parent={
 db_name:"v39_ci",db_role:"postgres",server_version:160007,
 read_only:true,clean_schema:true,can_use:true,can_create:true,
 v0076_budget:true,v0076_owner:true,v0076_query:true,
 v0076_attempt:true,v0076_reserve:true,original_source:true,
 v0077_table:false,v0077_trigger_check:false,v0077_immutable:false
};
const worker={...parent,db_role:"gate5_reader",can_create:false};

describe("Gate5 V0077 empty metadata production installation, no provider",()=>{
 it("pins exact staged SQL Git blob and rejects unreviewed GRANT or drop",()=>{
  const sql=readFileSync(P4_G5_V0077_FILE_V39,"utf8");
  const blob=execFileSync("git",["rev-parse","HEAD:"+P4_G5_V0077_FILE_V39],{
   encoding:"utf8"}).trim();
  expect(blob).toBe(P4_G5_V0077_REVIEWED_BLOB_V39);
  expect(()=>assertP4G5V0077ReviewedSqlV39(sql,blob)).not.toThrow();
  expect(()=>assertP4G5V0077ReviewedSqlV39(sql,blob.replace(/^./,"a")))
   .toThrow("P4_G5_V0077_UNREVIEWED_SQL_SOURCE_HOLD");
  expect(()=>assertP4G5V0077ReviewedSqlV39(sql+"\nGRANT ALL ON clean.x TO PUBLIC;\n",blob))
   .toThrow("P4_G5_V0077_UNREVIEWED_SQL_SOURCE_HOLD");
 });
 it("insists on explicit metadata-only operator approval without Phase6 activation",()=>{
  const e={
   V39_GATE5_V0077_INSTALL_INTENT:P4_G5_V0077_OPERATOR_INTENT_V39,
   V39_GATE5_V0077_EXPECTED_BLOB:P4_G5_V0077_REVIEWED_BLOB_V39,
   ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0"
  };
  expect(()=>assertP4G5V0077InstallerIntentV39(e)).not.toThrow();
  expect(()=>assertP4G5V0077InstallerIntentV39({
   ...e,V39_PHASE6_PROCESS_ARMED:"1"
  })).toThrow("P4_G5_V0077_OPERATOR_INTENT_OR_LIVE_COLLECTION_HOLD");
  expect(()=>assertP4G5V0077InstallerIntentV39({
   ...e,V39_GATE5_V0077_EXPECTED_BLOB:"bad"
  })).toThrow("P4_G5_V0077_OPERATOR_INTENT_OR_LIVE_COLLECTION_HOLD");
 });
 it("V0076 installed and distinct privileged and restricted role required",()=>{
  const admitted=assessP4G5V0077CatalogV39(parent,worker);
  expect(admitted.providerCalls).toBe(0);
  expect(admitted.sourceContentWrites).toBe(0);
  expect(()=>assessP4G5V0077CatalogV39({...parent,v0076_reserve:false},worker))
   .toThrow("P4_G5_V0077_PG16_PARENT_V0076_SCHEMA_HOLD");
  expect(()=>assessP4G5V0077CatalogV39(parent,{...worker,db_role:"postgres"}))
   .toThrow("P4_G5_V0077_DISTINCT_PRIVILEGED_RESTRICTED_ROLES_HOLD");
  expect(()=>assessP4G5V0077CatalogV39(parent,{...worker,can_create:true}))
   .toThrow("P4_G5_V0077_DISTINCT_PRIVILEGED_RESTRICTED_ROLES_HOLD");
 });
 it("partial preexisting V0077 installation always holds rather than overwrites",()=>{
  expect(()=>assessP4G5V0077CatalogV39({
   ...parent,v0077_table:true},worker))
   .toThrow("P4_G5_V0077_ALREADY_OR_PARTIALLY_INSTALLED_HOLD");
  expect(()=>assessP4G5V0077CatalogV39(
   parent,{...worker,v0077_immutable:true}))
   .toThrow("P4_G5_V0077_ALREADY_OR_PARTIALLY_INSTALLED_HOLD");
 });
 it("the new installer never exposes provider or billing or PRE write methods",()=>{
  const s=readFileSync(
   "scripts/v39_phase4_gate5_v0077_metadata_only_installer.ts","utf8");
  expect(s).not.toContain("fetchFidsAirport(");
  expect(s).not.toContain("createSubscription(");
  expect(s).not.toContain("persistPreSnapshot(");
  expect(s).toContain("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  expect(s).toContain("V0077_PRIVATE_EMPTY_METADATA_ONLY_INSTALLED");
  expect(s).toContain("worker_insert!==false");
  expect(s).toContain("worker_select!==false");
 });
 it("revokes only new V0077 objects, safely quotes untrusted PG role identifiers",()=>{
  expect(v0077ScopedRevokeSqlV39("gate5_reader")).toEqual([
   'REVOKE ALL PRIVILEGES ON TABLE clean.phase4_g5_fids_original_binding_v39 FROM "gate5_reader"',
   'REVOKE ALL PRIVILEGES ON FUNCTION clean.phase4_g5_check_original_binding_v39() FROM "gate5_reader"',
   'REVOKE ALL PRIVILEGES ON FUNCTION clean.phase4_g5_original_binding_immutable_update_v39() FROM "gate5_reader"'
  ]);
  expect(quoteP4G5V0077CatalogRoleV39('role";DROP TABLE t;--'))
   .toBe('"role"";DROP TABLE t;--"');
  expect(()=>quoteP4G5V0077CatalogRoleV39("a\u0000b"))
   .toThrow("P4_G5_V0077_BAD_CATALOG_ROLE_HOLD");
  for(const sql of v0077ScopedRevokeSqlV39("gate5_reader")){
   expect(sql).not.toMatch(/\b(GRANT|UPDATE|INSERT|DELETE|DROP|ALTER)\b/i);
   expect(sql).toContain("clean.phase4_g5_");
  }
 });
 it("refuses inherited-role permissions that scoped direct revokes cannot remove",()=>{
  const fine={
   row_count:0,worker_insert:false,worker_update:false,
   worker_delete:false,worker_select:false,
   worker_check_execute:false,worker_update_execute:false
  };
  expect(()=>verifyP4G5V0077NoRuntimePrivilegesV39(fine)).not.toThrow();
  expect(()=>verifyP4G5V0077NoRuntimePrivilegesV39({
   ...fine,worker_check_execute:true
  })).toThrow("P4_G5_V0077_RUNTIME_ACL_WORKER_CHECK_EXECUTE_HOLD");
  expect(()=>verifyP4G5V0077NoRuntimePrivilegesV39({
   ...fine,worker_select:true
  })).toThrow("P4_G5_V0077_RUNTIME_ACL_WORKER_SELECT_HOLD");
  expect(()=>verifyP4G5V0077NoRuntimePrivilegesV39({
   ...fine,worker_insert:undefined
  })).toThrow("P4_G5_V0077_RUNTIME_ACL_WORKER_INSERT_HOLD");
  expect(()=>verifyP4G5V0077NoRuntimePrivilegesV39({
   ...fine,row_count:1
  })).toThrow("P4_G5_V0077_NONEMPTY_METADATA_BINDING_HOLD");
 });
 it("a production refusal records a fixed lifecycle stage, not raw database details",()=>{
  const source=readFileSync(
   "scripts/v39_phase4_gate5_v0077_metadata_only_installer.ts","utf8");
  for(const label of [
   "CONNECT_RESTRICTED_RUNTIME",
   "CONNECT_PRIVILEGED",
   "READ_RUNTIME_PARENT_CATALOG",
   "READ_PRIVILEGED_PARENT_CATALOG",
   "REVIEW_PRIVILEGED_RESTRICTED_ROLES",
   "BEGIN_SERIALIZABLE_PRIVATE_DDL",
   "LOCK_METADATA_SCHEMA",
   "RECHECK_V0077_NOT_PRESENT",
   "APPLY_EXACT_PINNED_V0077_METADATA_DDL",
   "REVOKE_V0077_ONLY_INHERITED_DEFAULT_GRANTS",
   "VERIFY_NO_RUNTIME_V0077_GRANTS",
   "COMMIT_PRIVATE_METADATA_DDL"
  ])expect(source).toContain('stage="'+label+'"');
  expect(source).toContain(
   'console.error("P4_G5_V0077_INSTALL_STAGE_"+stage+"_HOLD")');
  expect(source).not.toContain("console.error(e.message)");
  expect(source).not.toContain("console.error(adminUrl)");
 });
 it("exposes only fixed internal refusal category, no connection strings or raw messages",()=>{
  expect(safeP4G5V0077InstallFailureReasonV39(
   Error("P4_G5_V0077_PG16_PARENT_V0076_SCHEMA_HOLD")))
   .toBe("P4_G5_V0077_PG16_PARENT_V0076_SCHEMA_HOLD");
  expect(safeP4G5V0077InstallFailureReasonV39(
   Object.assign(Error("secret password exposed"),{code:"42501"})))
   .toBe("P4_G5_V0077_INSTALL_HOLD_SQLSTATE_42501");
  expect(safeP4G5V0077InstallFailureReasonV39(
   Error("postgresql://user:password@hostname")))
   .toBe("P4_G5_V0077_INSTALL_UNCLASSIFIED_HOLD");
 });

});
