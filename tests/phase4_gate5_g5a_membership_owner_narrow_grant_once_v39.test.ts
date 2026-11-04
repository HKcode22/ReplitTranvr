import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 assertG5AMembershipGrantBeforeV39,
 assertG5AMembershipGrantAfterV39,
 type AclFacts
} from "../scripts/v39_phase4_gate5_membership_owner_narrow_grant_once";

const before=():AclFacts=>({
 roleExists:true,roleRestricted:true,roleNotExpired:true,
 memberTableExists:true,memberTriggerEnabled:true,
 triggerRunsAsInvoker:true,memberKeyExists:true,
 sourceCanInsertPopulation:true,
 sourceCanInsertMembership:false,
 sourceCanSelectMembershipTable:false,
 sourceCanSelectMembershipKey:false,
 sourceCanUpdateMembership:false,sourceCanDeleteMembership:false
});
describe("G5A one-time operator grant is narrow and single use",()=>{
 it("accepts only exact missing membership trigger permissions",()=>{
  expect(assertG5AMembershipGrantBeforeV39(before())).toBe(true);
  for(const key of [
   "roleExists","roleRestricted","roleNotExpired","memberTableExists",
   "memberTriggerEnabled","triggerRunsAsInvoker","memberKeyExists",
   "sourceCanInsertPopulation"
  ] as const){
   const a=before();a[key]=false;
   expect(()=>assertG5AMembershipGrantBeforeV39(a)).toThrow();
  }
  for(const key of [
   "sourceCanInsertMembership","sourceCanSelectMembershipTable",
   "sourceCanSelectMembershipKey","sourceCanUpdateMembership",
   "sourceCanDeleteMembership"
  ] as const){
   const a=before();a[key]=true;
   expect(()=>assertG5AMembershipGrantBeforeV39(a)).toThrow();
  }
 });
 it("postcommit allows key-column SELECT and INSERT, not full table read or mutations",()=>{
  const a=before();a.sourceCanInsertMembership=true;
  a.sourceCanSelectMembershipKey=true;
  expect(assertG5AMembershipGrantAfterV39(a)).toBe(true);
  for(const key of ["sourceCanInsertMembership","sourceCanSelectMembershipKey"] as const){
   const b={...a};b[key]=false;
   expect(()=>assertG5AMembershipGrantAfterV39(b)).toThrow();
  }
  for(const key of ["sourceCanSelectMembershipTable","sourceCanUpdateMembership",
   "sourceCanDeleteMembership"] as const){
   const b={...a};b[key]=true;
   expect(()=>assertG5AMembershipGrantAfterV39(b)).toThrow();
  }
 });
 it("can never launch from GitHub paid owner, nor grant broad member role permissions",()=>{
  const code=readFileSync(
   "scripts/v39_phase4_gate5_membership_owner_narrow_grant_once.ts","utf8");
  expect(code).toContain("env.GITHUB_ACTIONS===\"true\"");
  expect(code).toContain("P4_G5_REVIEWED_MAIN_SHA");
  expect(code).toContain("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  expect(code).toContain("pg_try_advisory_xact_lock");
  expect(code).toContain("GRANT INSERT ON TABLE clean.population_research_membership");
  expect(code).toContain("GRANT SELECT (population_member_id) ON TABLE clean.population_research_membership");
  expect(code).not.toMatch(/GRANT\s+(?:ALL|DELETE|UPDATE|TRUNCATE)\s+ON\s+TABLE/i);
  expect(code).not.toMatch(/fetchFidsAirport|fetchFidsPopulation|AERODATABOX_API_KEY/);
 });
});
