import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {assessPostInstall,assertGitHub,POSTINSTALL_SQL,RIGHTS_PROVENANCE_SQL,type PostInstallFacts}
 from "../scripts/v39_phase4_gate5_v0076_postinstall_readonly_actions";
const good=():PostInstallFacts=>({
 ro:true,usage:true,schema_create:false,tables:4,logged:4,tables_granted:0,
 funcs:1,security_definer:true,safe_path:true,public_execute:false,
 worker_execute:false,triggers:1
});
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_EVENT_NAME:"push",GITHUB_REF:"refs/heads/main",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
 GITHUB_JOB:"v0076-postinstall-readonly",
 GITHUB_WORKFLOW:"Phase4 Gate5 V0076 Production Postinstall READ ONLY",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-v0076-postinstall-readonly.yml@refs/heads/main",
 P4_G5_V0076_POSTINSTALL_INTENT:"CATALOG_ONLY_READONLY"
});
describe("protected V0076 production post-install no-paid catalog audit",()=>{
 it("reports installed, private and LOGGED without declaring science pass",()=>{
  const x=assessPostInstall(good());
  expect(x.status).toBe("V0076_LIVE_LOGGED_PRIVATE_RUNTIME_NOT_GRANTED");
  expect(x.verifiedRecordCounts).toBe(false);
  expect(x.providerCalls).toBe(0);
  expect(x.productionWrites).toBe(0);
  expect(x.strictGate5Passed).toBe(false);
 });
 it("refuses unauthorized worker grants, missing objects or weakened triggers",()=>{
  for(const x of [{ro:false},{usage:false},{schema_create:true},
   {tables:3},{logged:3},{tables_granted:1},{funcs:0},
   {security_definer:false},{safe_path:false},{public_execute:true},
   {worker_execute:true},{triggers:0}]){
   expect(()=>assessPostInstall({...good(),...x}))
    .toThrow("P4_G5_V0076_POSTINSTALL_ISOLATION_HOLD");
  }
 });
 it("rejects malformed catalog, nonmain/push, and provider/admin secrets",()=>{
  expect(()=>assessPostInstall({...good(),logged:null as any}))
   .toThrow("P4_G5_V0076_BAD_CATALOG_HOLD");
  expect(()=>assertGitHub(env(),"a".repeat(40))).not.toThrow();
  for(const x of [{GITHUB_EVENT_NAME:"schedule"},{GITHUB_RUN_ATTEMPT:"2"},
   {DATABASE_URL:"secret"},{RAPIDAPI_KEY:"secret"},
   {AERODATABOX_API_KEY:"secret"},{GITHUB_REF:"refs/heads/dev"}]){
   expect(()=>assertGitHub({...env(),...x},"a".repeat(40)))
    .toThrow("P4_G5_V0076_POSTINSTALL_CONTEXT_HOLD");
  }
 });
 it("keeps PG query catalog-only and workflow no source/provider privileges",()=>{
  const w=readFileSync(".github/workflows/phase4-gate5-v0076-postinstall-readonly.yml","utf8");
  const s=readFileSync("scripts/v39_phase4_gate5_v0076_postinstall_readonly_actions.ts","utf8");
  expect(POSTINSTALL_SQL).toContain("pg_catalog.pg_trigger");
  expect(POSTINSTALL_SQL).toContain("pg_catalog.pg_proc");
  expect(RIGHTS_PROVENANCE_SQL).toContain("pg_catalog.aclexplode");
  expect(RIGHTS_PROVENANCE_SQL).toContain("pg_has_role");
  expect(RIGHTS_PROVENANCE_SQL).not.toMatch(/\bINSERT INTO\b|\bDELETE FROM\b|\bGRANT\s+\w+\s+ON\b/);
  expect(POSTINSTALL_SQL).not.toMatch(/\bINSERT INTO\b|\bDELETE FROM\b|\bCREATE TABLE\b/);
  expect(w).toContain("environment: phase2g-paid");
  expect(w).not.toContain("secrets.DATABASE_URL");
  expect(w).not.toContain("secrets.AERODATABOX_API_KEY");
  expect(s).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(s).toContain("ROLLBACK");
  expect(s).not.toContain("fetch(");
 });
});
