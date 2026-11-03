import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 classifyP4G5V0077ProductionCatalogV39,
 parseP4G5V0077CatalogRowV39
} from "../scripts/v39_phase4_gate5_v0077_readonly_failure_diagnosis";

const r=()=>({
 db_name:"PRIVATE_TEST_DATABASE",db_role:"admin_synthetic",
 server_version:160007,uses_clean:true,can_create:true,
 parent_budget:true,parent_owner:true,parent_query:true,
 parent_attempt:true,parent_reserve:true,original_source:true,
 v0077_table:false,v0077_check:false,v0077_immutable:false
});
function roles(){
 const admin=parseP4G5V0077CatalogRowV39(r());
 const worker=parseP4G5V0077CatalogRowV39({
  ...r(),db_role:"restricted_synthetic",can_create:false
 });
 return {admin,worker};
}
describe("Gate5 V0077 safe production read-only failure classifier",()=>{
 it("distinguishes genuinely missing V0077 with correct roles",()=>{
  const {admin,worker}=roles();
  const got=classifyP4G5V0077ProductionCatalogV39(admin,worker);
  expect(got.status).toBe("READY_FOR_ONE_TIME_V0077_PRIVATE_SCHEMA_INSTALL");
  expect(got.providerCalls).toBe(0);
  expect(got.databaseWrites).toBe(0);
  expect(got.scientificGate5Passed).toBe(false);
  expect(JSON.stringify(got)).not.toContain("PRIVATE_TEST_DATABASE");
  expect(JSON.stringify(got)).not.toContain("admin_synthetic");
 });
 it("parent V0076 missing is categorically distinct from wrong DB/roles",()=>{
  const {admin,worker}=roles();
  admin.parent[4]=false;
  expect(classifyP4G5V0077ProductionCatalogV39(admin,worker).status)
   .toBe("PARENT_V0076_OR_SOURCE_NOT_PRESENT");
  const {admin:a,worker:w}=roles();
  w.database="OTHER_DB";
  expect(classifyP4G5V0077ProductionCatalogV39(a,w).status)
   .toBe("ROLE_OR_DATABASE_NOT_SAFE_FOR_PRIVATE_DDL");
  w.database=a.database;w.canCreate=true;
  expect(classifyP4G5V0077ProductionCatalogV39(a,w).status)
   .toBe("ROLE_OR_DATABASE_NOT_SAFE_FOR_PRIVATE_DDL");
 });
 it("already installed and partial installation are never relabeled missing",()=>{
  const {admin,worker}=roles();
  admin.v77=[true,true,true];worker.v77=[true,true,true];
  expect(classifyP4G5V0077ProductionCatalogV39(admin,worker).status)
   .toBe("ALREADY_INSTALLED_PRIVATE_READONLY_VERIFIED");
  worker.hasRuntimeV77Privileges=[true,false,false,false];
  expect(classifyP4G5V0077ProductionCatalogV39(admin,worker).status)
   .toBe("ALREADY_INSTALLED_RUNTIME_PRIVILEGES_REQUIRE_REVIEW");
  worker.hasRuntimeV77Privileges=[false,false,false,false];
  admin.v77=[true,false,false];worker.v77=[true,false,false];
  expect(classifyP4G5V0077ProductionCatalogV39(admin,worker).status)
   .toBe("PARTIAL_V0077_SCHEMA_NEEDS_REVIEW");
 });
 it("malformed catalog is held and cannot be called safe-to-install",()=>{
  const bad=r();const broken={...bad,server_version:"redacted"};
  expect(()=>parseP4G5V0077CatalogRowV39(broken))
   .toThrow("P4_G5_V0077_BAD_DIAGNOSTIC_ROWS_HOLD");
  expect(()=>parseP4G5V0077CatalogRowV39(null))
   .toThrow("P4_G5_V0077_BAD_DIAGNOSTIC_ROWS_HOLD");
 });
 it("GitHub runtime probe uses only restricted DB URL and no paid provider secrets",()=>{
  const w=readFileSync(
   ".github/workflows/phase4-gate5-v0077-production-runtime-readonly.yml",
   "utf8");
  expect(w).toContain("secrets.V39_DATABASE_RUNTIME_URL");
  expect(w).toContain('P4_G5_V0077_RUNTIME_PROBE_ONLY: "1"');
  expect(w).toContain("contents: read");
  expect(w).toContain("persist-credentials: false");
  expect(w).not.toContain("secrets.DATABASE_URL");
  expect(w).not.toContain("secrets.AERODATABOX_API_KEY");
  const src=readFileSync(
   "scripts/v39_phase4_gate5_v0077_readonly_failure_diagnosis.ts",
   "utf8");
  expect(src).toContain("runP4G5V0077RuntimeOnlyReadOnlyDiagnosisV39");
  expect(src).toContain("independentPrivilegedDatabaseScopeVerified:false");
 });
 it("diagnostic never executes DDL, provider API, or retains flight contents",()=>{
  const s=readFileSync(
   "scripts/v39_phase4_gate5_v0077_readonly_failure_diagnosis.ts","utf8");
  expect(s).toContain("REPEATABLE READ READ ONLY");
  expect(s).toContain("ROLLBACK");
  expect(s).not.toContain("await db.query(bytes)");
  expect(s).not.toContain("persistFidsObservation(");
  expect(s).not.toContain("fetchFidsAirport(");
  expect(s).not.toContain("console.log(JSON.stringify(admin))");
  expect(s).not.toContain("console.log(JSON.stringify(worker))");
 });
});
