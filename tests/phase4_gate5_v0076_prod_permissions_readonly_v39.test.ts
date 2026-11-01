import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 P4_G5_V0076_PERMISSION_SQL,assertP4G5V0076PermissionsGitHub,
 assessP4G5V0076PermissionFacts,
 type P4G5V0076PermissionFacts
} from "../scripts/v39_phase4_gate5_v0076_prod_permissions_readonly_actions";
const yes=():P4G5V0076PermissionFacts=>({
 clean_schema_exists:true,schema_usage:true,schema_create:true,
 database_create:false,cohort_budget_exists:false,owner_exists:false,
 query_exists:false,attempt_exists:false,reserve_function_exists:false,
 transaction_is_readonly:true
});
const ctx=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"push",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
 GITHUB_JOB:"v0076-readonly-permission",
 GITHUB_WORKFLOW:"Phase4 Gate5 V0076 Production Permissions READ ONLY",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-v0076-production-permissions-readonly.yml@refs/heads/main",
 P4_G5_V0076_PROBE_INTENT:"METADATA_ONLY_READONLY"
});
describe("Gate5 V0076 live DB installation permission audit READ ONLY",()=>{
 it("informs exact schema CREATE but never certifies production install or paid FIDS",()=>{
  const r=assessP4G5V0076PermissionFacts(yes());
  expect(r.status).toBe("V0076_OBJECTS_ABSENT_RUNTIME_CAN_CREATE_REVIEW_REQUIRED");
  expect(r.canCreateWithinCleanSchema).toBe(true);
  expect(r.v0076ObjectsObserved).toBe(0);
  expect(r.productionV0076InstalledByThisJob).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.strictGate5Passed).toBe(false);
 });
 it("refuses malformed and read/write transactions",()=>{
  expect(()=>assessP4G5V0076PermissionFacts({...yes(),transaction_is_readonly:false}))
   .toThrow("P4_G5_V0076_PROBE_NOT_READ_ONLY_HOLD");
  expect(()=>assessP4G5V0076PermissionFacts({...yes(),schema_create:null as any}))
   .toThrow("P4_G5_V0076_PERMISSION_QUERY_SHAPE_HOLD");
 });
 it("preserves missing DDL privilege and partial/already-installed distinctions",()=>{
  expect(assessP4G5V0076PermissionFacts({...yes(),schema_create:false}).status)
   .toBe("V0076_OBJECTS_ABSENT_RUNTIME_LACKS_SCHEMA_CREATE");
  expect(assessP4G5V0076PermissionFacts({...yes(),cohort_budget_exists:true}).status)
   .toBe("V0076_PARTIAL_OBJECTS_FOUND_HOLD_MANUAL_RECONCILIATION");
  expect(assessP4G5V0076PermissionFacts({...yes(),
   cohort_budget_exists:true,owner_exists:true,query_exists:true,
   attempt_exists:true,reserve_function_exists:true}).status)
   .toBe("V0076_OBJECTS_ALREADY_EXIST_NEEDS_VERSION_AUDIT");
 });
 it("hard checks main push exact checkout and no provider, extra DB secrets or reruns",()=>{
  expect(()=>assertP4G5V0076PermissionsGitHub(ctx(),"a".repeat(40))).not.toThrow();
  for(const x of [
   {GITHUB_EVENT_NAME:"schedule"},{GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_REF:"refs/heads/dev"},{GITHUB_JOB:"paid-run"},
   {GITHUB_WORKFLOW_REF:"other"},{AERODATABOX_API_KEY:"secret"},
   {RAPIDAPI_KEY:"secret"},{DATABASE_URL:"secret"},
   {GATE05_AUTOMATION_DATABASE_URL:"secret"}
  ])expect(()=>assertP4G5V0076PermissionsGitHub({...ctx(),...x},"a".repeat(40)))
   .toThrow("P4_G5_V0076_READONLY_JOB_CONTEXT_HOLD");
  expect(()=>assertP4G5V0076PermissionsGitHub(ctx(),"b".repeat(40)))
   .toThrow("P4_G5_V0076_READONLY_JOB_CONTEXT_HOLD");
 });
 it("queries only schema/role/metadata with PostgreSQL read-only transaction",()=>{
  const w=readFileSync(".github/workflows/phase4-gate5-v0076-production-permissions-readonly.yml","utf8");
  const node=readFileSync("scripts/v39_phase4_gate5_v0076_prod_permissions_readonly_actions.ts","utf8");
  expect(P4_G5_V0076_PERMISSION_SQL).toContain("has_schema_privilege");
  expect(P4_G5_V0076_PERMISSION_SQL).toContain("to_regclass");
  expect(P4_G5_V0076_PERMISSION_SQL).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bALTER\b|\bCREATE TABLE\b/i);
  expect(w).toContain("environment: phase2g-paid");
  expect(w).toContain("secrets.V39_DATABASE_RUNTIME_URL");
  expect(w).not.toContain("secrets.AERODATABOX_API_KEY");
  expect(w).not.toContain("workflow_dispatch:");
  expect(w).not.toContain("schedule:");
  expect(node).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(node).toContain("ROLLBACK");
  expect(node).toContain("default_transaction_read_only=on");
  expect(node).not.toContain("fetch(");
 });
});
