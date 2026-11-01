import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {
 V0076_INSTALL_FILE_V39,V0076_REVIEWED_BLOB_SHA_V39,
 V0076_INSTALL_INTENT_V39,assertV0076ExactSourceV39,
 assertV0076InstallerIntentV39,assessV0076InstallerCatalogV39,
 type V0076CatalogV39
} from "../scripts/v39_phase4_gate5_v0076_metadata_only_installer";
const input=():V0076CatalogV39=>({
 database_name:"same-study-db",role_name:"v0076-privileged",
 server_version:160000,readonly:true,
 clean_exists:true,can_use:true,can_create:true,
 original_exists:true,population_exists:true,
 blobref_exists:true,gate05_exists:true,
 cohort_exists:false,owner_exists:false,query_exists:false,
 attempt_exists:false,reserve_exists:false
});
const runtime=():V0076CatalogV39=>({...input(),
 role_name:"fids-runtime",can_create:false});
describe("Gate5 privileged metadata-only V0076 installer source guard",()=>{
 it("uses pinned immutable existing V0076 Git blob; never a modified staged file",()=>{
  const data=readFileSync(V0076_INSTALL_FILE_V39,"utf8");
  const blob=execFileSync("git",["rev-parse","HEAD:"+V0076_INSTALL_FILE_V39],{
   encoding:"utf8"
  }).trim();
  expect(blob).toBe(V0076_REVIEWED_BLOB_SHA_V39);
  expect(()=>assertV0076ExactSourceV39(data,blob)).not.toThrow();
  expect(()=>assertV0076ExactSourceV39(data+" -- changed",blob+"0"))
   .toThrow("P4_G5_V0076_SOURCE_NOT_REVIEWED_HOLD");
  expect(()=>assertV0076ExactSourceV39(
   data+"\nGRANT EXECUTE ON FUNCTION x TO PUBLIC;",blob
  )).toThrow("P4_G5_V0076_SOURCE_NOT_REVIEWED_HOLD");
 });
 it("default invocation has no DDL permission unless exact explicit release intent and blob are both set",()=>{
  expect(()=>assertV0076InstallerIntentV39({}))
   .toThrow("P4_G5_V0076_INSTALL_INTENT_OR_SOURCE_HOLD");
  expect(()=>assertV0076InstallerIntentV39({
   V39_GATE5_V0076_INSTALL_INTENT:V0076_INSTALL_INTENT_V39
  })).toThrow("P4_G5_V0076_INSTALL_INTENT_OR_SOURCE_HOLD");
  expect(()=>assertV0076InstallerIntentV39({
   V39_GATE5_V0076_INSTALL_INTENT:V0076_INSTALL_INTENT_V39,
   V39_GATE5_V0076_EXPECTED_BLOB:V0076_REVIEWED_BLOB_SHA_V39
  })).not.toThrow();
 });
 it("requires exact distinct privileged CREATE and runtime restricted role",()=>{
  expect(assessV0076InstallerCatalogV39(input(),runtime()).status)
   .toBe("EXACT_METADATA_SOURCE_READY_FOR_SEPARATE_INSTALL");
  expect(()=>assessV0076InstallerCatalogV39({...input(),can_create:false},runtime()))
   .toThrow("P4_G5_V0076_DISTINCT_PRIVILEGED_RUNTIME_ROLE_HOLD");
  expect(()=>assessV0076InstallerCatalogV39(input(),{...runtime(),can_create:true}))
   .toThrow("P4_G5_V0076_DISTINCT_PRIVILEGED_RUNTIME_ROLE_HOLD");
  expect(()=>assessV0076InstallerCatalogV39(input(),{...runtime(),
   role_name:"v0076-privileged"}))
   .toThrow("P4_G5_V0076_DISTINCT_PRIVILEGED_RUNTIME_ROLE_HOLD");
  expect(()=>assessV0076InstallerCatalogV39(input(),{...runtime(),
   database_name:"foreign-db"}))
   .toThrow("P4_G5_V0076_DISTINCT_PRIVILEGED_RUNTIME_ROLE_HOLD");
 });
 it("prevents accidental import into earlier or incomplete actual study schema",()=>{
  expect(()=>assessV0076InstallerCatalogV39({...input(),
   original_exists:false},runtime()))
   .toThrow("P4_G5_V0076_EXISTING_SCIENCE_SCHEMA_OR_PG16_HOLD");
  expect(()=>assessV0076InstallerCatalogV39({...input(),
   server_version:150000},runtime()))
   .toThrow("P4_G5_V0076_EXISTING_SCIENCE_SCHEMA_OR_PG16_HOLD");
  expect(()=>assessV0076InstallerCatalogV39(input(),{...runtime(),
   readonly:false}))
   .toThrow("P4_G5_V0076_EXISTING_SCIENCE_SCHEMA_OR_PG16_HOLD");
 });
 it("rejects partial, already-installed, or concurrent V0076 instead of overwriting",()=>{
  for(const key of ["cohort_exists","owner_exists","query_exists",
    "attempt_exists","reserve_exists"] as const){
   expect(()=>assessV0076InstallerCatalogV39({...input(),[key]:true},runtime()))
    .toThrow("P4_G5_V0076_OBJECTS_ALREADY_OR_PARTIALLY_INSTALLED_HOLD");
  }
 });
 it("script DDL is a distinct uncalled one-use operation, not provider/network or GRANT",()=>{
  const s=readFileSync("scripts/v39_phase4_gate5_v0076_metadata_only_installer.ts","utf8");
  expect(s).toContain("SERIALIZABLE READ WRITE");
  expect(s).toContain("pg_advisory_xact_lock(76,39)");
  expect(s).toContain("COMMIT");
  expect(s).toContain("ROLLBACK");
  expect(s).toContain("public_execute");
  expect(s).toContain("METADATA_ONLY");
  expect(s).not.toContain("fetch(");
  expect(s).not.toContain("fetchFidsAirport");
  expect(s).not.toContain("GRANT EXECUTE ON");
  expect(s).not.toContain("INSERT INTO clean.flight_population");
 });
});
