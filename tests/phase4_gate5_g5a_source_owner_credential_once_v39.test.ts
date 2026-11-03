import {describe,it,expect} from "vitest";
import {P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39,
 verifyG5AOwnerGrantPlanV39}
 from "../scripts/v39_phase4_gate5_g5a_source_owner_credential_once";

describe("G5A GitHub-only source writer credential least-privilege bootstrap",()=>{
 it("permits exactly eight known source/PRE/owner relations, no blanket grants",()=>{
  expect(verifyG5AOwnerGrantPlanV39()).toBe(true);
  expect(P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39.map(x=>x.relation)).toEqual([
   "clean.fids_query_response",
   "clean.flight_population",
   "clean.phase4_g5_fids_original_binding_v39",
   "clean.phase4_g5_fids_cohort_budget_v39",
   "clean.phase4_g5_fids_physical_owner_v39",
   "clean.phase4_g5_fids_allowed_query_v39",
   "clean.phase4_g5_fids_physical_attempt_v39",
   "clean.flight_snapshots"
  ]);
  for(const grant of P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39){
   expect(grant.privileges).toContain("SELECT");
   expect(grant.privileges).toContain("INSERT");
   expect(grant.privileges).not.toContain("DELETE");
   expect(grant.privileges).not.toContain("TRUNCATE");
   expect(grant.privileges).not.toContain("CREATE");
  }
 });
 it("only V0076 owner, grid and budget tables require UPDATE",()=>{
  const canUpdate=P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39
   .filter(x=>x.privileges.includes("UPDATE")).map(x=>x.relation);
  expect(canUpdate).toEqual([
   "clean.phase4_g5_fids_cohort_budget_v39",
   "clean.phase4_g5_fids_physical_owner_v39",
   "clean.phase4_g5_fids_allowed_query_v39"
  ]);
 });
 it("does not expose credentials or authorize provider/Phase6 by importing",()=>{
  expect(process.env.P4_G5_SOURCE_OWNER_DATABASE_URL).toBeUndefined();
 });
});
