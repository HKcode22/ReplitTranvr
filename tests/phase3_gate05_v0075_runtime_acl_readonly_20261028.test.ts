import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const p="scripts/v39_gate05_v0075_runtime_acl_readonly_20261028.mjs";
const src=readFileSync(p,"utf8");
describe("Gate05 production V0075 permission HOLD readonly diagnostic",()=>{
 it("is executable native Node ESM after pinned git-show without extra deps",()=>{
  const x=spawnSync(process.execPath,["--check",p],{encoding:"utf8",timeout:10000});
  expect(x.error).toBeUndefined();
  expect(x.status).toBe(0);
 });
 it("never mutates the provider, GitHub or production schema",()=>{
  expect(src).toContain("default_transaction_read_only=on");
  expect(src).toContain("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(src).toContain('await db.query("ROLLBACK")');
  expect(src).not.toMatch(/\b(?:CREATE\s+ROLE|ALTER\s+TABLE|CREATE\s+TABLE|INSERT\s+INTO|DELETE\s+FROM|GRANT\s+INSERT|UPDATE\s+clean)\b/i);
  expect(src).not.toContain("AERODATABOX_API_KEY");
  expect(src).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(src).not.toContain("fetchFidsAirport");
  expect(src).not.toContain("gh workflow run");
  expect(src).not.toContain("gh api");
  expect(src).not.toContain("publish_app");
 });
 it("provides discriminating least-privilege evidence without secrets or role names",()=>{
  for(const fragment of [
   "RUNTIME_IS_DDL_OWNER_IMPLICIT_FULL_TABLE_RIGHTS",
   "RUNTIME_INHERITS_DDL_OWNER_TABLE_RIGHTS",
   "EXISTING_DEFAULT_ACL_GRANTS_WRITE_PRIVILEGES",
   "RUNTIME_SCHEMA_USAGE_UNAVAILABLE_PRE_MIGRATION",
   "POST_DDL_PERMISSION_FAILED_OTHER_CONDITION",
   "runtimeRoleIsAdminOwner",
   "runtimeInheritsAdminPrivileges",
   "defaultAclGrants",
   "defaclobjtype='r'",
   "pg_has_role",
   "openGate05Owners",
   "ownerHistoryStopped",
   "databaseIdentityMatches",
   "GITHUB_MAIN_DRIFT",
   "READONLY_PERMISSION_FACTS_OBSERVED"
  ])expect(src).toContain(fragment);
  expect(src).not.toContain("console.log(admin");
  expect(src).not.toContain("console.log(role");
  expect(src).not.toContain("JSON.stringify(role");
  expect(src).not.toContain("JSON.stringify(admin");
 });
});
