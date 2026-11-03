import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {
 P4_G5_V0077_FILE_V39,
 P4_G5_V0077_REVIEWED_BLOB_V39,
 P4_G5_V0077_OPERATOR_INTENT_V39,
 assertP4G5V0077ReviewedSqlV39,
 assertP4G5V0077InstallerIntentV39,
 assessP4G5V0077CatalogV39
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
});
