import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {validateNov07ReadOnlyAuditorFlagsV39} from
 "../scripts/v39_phase4_gate5_g5a_nov07_audit_reader_readiness_no_provider";
type Flags=Parameters<typeof validateNov07ReadOnlyAuditorFlagsV39>[0];
const valid=():Flags=>({
 separateReader:true,dbReadOnly:true,noRoleAdmin:true,
 noSchemaCreate:true,noDatabaseCreate:true,
 exactTableReadAndNoWrite:true,providerCalls:0,databaseWrites:0
});
describe("Gate5 Nov7 independent auditor no-provider release discipline",()=>{
 it("accepts only all true distinct, readonly and non-DDL reader",()=>{
  expect(validateNov07ReadOnlyAuditorFlagsV39(valid())).toBe(true);
  for(const key of ["separateReader","dbReadOnly","noRoleAdmin",
   "noSchemaCreate","noDatabaseCreate","exactTableReadAndNoWrite"] as const){
   const x=valid();x[key]=false;
   expect(validateNov07ReadOnlyAuditorFlagsV39(x)).toBe(false);
  }
 });
 it("one-time installer creates distinct new reader secret without broad grants",()=>{
  const s=readFileSync(
   "scripts/v39_phase4_gate5_g5a_nov07_independent_reader_once.ts","utf8");
  expect(s).toContain('const SECRET="P4_G5_G5A_NOV07_AUDIT_DATABASE_URL"');
  expect(s).toContain("LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE");
  expect(s).toContain("GRANT SELECT ON TABLE ");
  expect(s).toContain("has_schema_privilege(current_user,'clean','CREATE')");
  expect(s).toContain("has_database_privilege(current_user,current_database(),'CREATE')");
  expect(s).toContain('ONE_NOV07_INDEPENDENT_AUDITOR_NO_PROVIDER_NEW_SECRET');
  expect(s).not.toMatch(/GRANT\s+(?:ALL|INSERT|UPDATE|DELETE|TRUNCATE)\s+ON\s+TABLE/i);
  expect(s).not.toContain("fetchFidsAirport");
  expect(s).not.toContain("AERODATABOX_API_KEY");
  expect(s).toContain("ROLE_ALREADY_EXISTS_DO_NOT_ROTATE");
  expect(s).toContain("COMMIT_AMBIGUOUS_READONLY_INSPECT_BEFORE_RETRY");
 });
 it("protected audit readiness has no paid schedule, no production writes",()=>{
  const w=readFileSync(
   ".github/workflows/phase4-gate5-g5a-nov07-audit-reader-readiness-no-provider.yml","utf8");
  expect(w).toContain("  workflow_dispatch:");
  expect(w).not.toContain("  schedule:");
  expect(w).toContain("environment: phase2g-paid");
  expect(w).toContain("P4_G5_G5A_NOV07_AUDIT_DATABASE_URL");
  expect(w).toContain('V39_PHASE6_PROCESS_ARMED: "0"');
  expect(w).toContain("providerCalls");
 });
});
