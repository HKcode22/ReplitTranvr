/**
 * Release boundary: V0065 is source-reviewed but MUST remain outside the
 * normal production boot loader until separate authorized migration release.
 */
import {existsSync,readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {loadMigrationFilesV39,planPendingMigrationsV39}
 from "../server/lib/disruption/schemaMigration_v39";
const filename="V0065__phase3_gate3_prepaid_canary_owner_v39.sql";
describe("Phase3 staged schema release isolation",()=>{
 it("keeps original SQL in staged and absent from auto-applied current/",()=>{
  expect(existsSync("migrations/staged/"+filename)).toBe(true);
  expect(existsSync("migrations/current/"+filename)).toBe(false);
  const raw=readFileSync("migrations/staged/"+filename,"utf8");
  expect(raw).toContain("CREATE TABLE clean.phase3_gate3_canary_owner_v39");
 });
 it("normal baseline-migration plan CANNOT auto-apply Gate3",async()=>{
  const files=await loadMigrationFilesV39();
  expect(files.some(x=>x.kind==="VERSIONED"&&x.version===65)).toBe(false);
  const plan=planPendingMigrationsV39(files,[]);
  expect(plan.map(x=>x.version)).not.toContain(65);
  expect(plan.some(x=>x.file===filename)).toBe(false);
 });
 it("retains explicit disposable-PG SQL fixture without exposing production auto-migrations",()=>{
  const workflow=readFileSync(".github/workflows/v39-phase0-offline.yml","utf8");
  expect(workflow).toContain("Load STAGED Gate3 V0065 to disposable PG16 after boot no-op check");
  expect(workflow).toContain("test ! -e migrations/current/V0065__phase3_gate3_prepaid_canary_owner_v39.sql");
  expect(workflow).toContain('psql "${DATABASE_URL}" -X -v ON_ERROR_STOP=1 -f migrations/staged/V0065__phase3_gate3_prepaid_canary_owner_v39.sql');
  expect(workflow).not.toContain("cp migrations/staged/");
  expect(workflow).not.toContain("npx tsx scripts/v39_schema_migrate_v39.ts --apply");
  expect(workflow).toContain("tests/phase3_gate3_prepaid_owner_disposable_pg_v39.test.ts");
  expect(workflow).toContain('test "${DATABASE_URL}" = "postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable"');
 });
});
