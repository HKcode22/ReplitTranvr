import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {unwrapReviewedPgMigration}
 from "../scripts/v39_phase5_cd_v0088_v0089_atomic_owner_install_once.mjs";
const files=[
 "migrations/staged/V0088__phase5_cd_real_v0087_queue_stage14_scoped_admission_v39.sql",
 "migrations/staged/V0089__phase5_cd_v0088_no_login_function_owner_commission_v39.sql"
];
describe("Phase5 owner atomic reviewed SQL wrapper (NO DB or provider)",()=>{
 it("accepts the exact two staged SQL bodies after the one outer wrapper",()=>{
  for(const file of files){
   const sql=readFileSync(file,"utf8");
   const body=unwrapReviewedPgMigration(sql);
   expect(body).toContain("SECURITY DEFINER");
   expect(body).not.toMatch(/^BEGIN;$/m);
   expect(body).not.toMatch(/^COMMIT;$/m);
  }
 });
 it("refuses a second COMMIT or extra statement after the reviewed wrapper",()=>{
  const sql=readFileSync(files[0],"utf8");
  expect(()=>unwrapReviewedPgMigration(sql+
   "\nDROP TABLE clean.flight_snapshots;")).toThrow();
  expect(()=>unwrapReviewedPgMigration(sql+
   "\nCOMMIT;")).toThrow();
 });
 it("refuses an unreviewed SQL statement before BEGIN",()=>{
  const sql=readFileSync(files[1],"utf8");
  const cut=sql.indexOf("\nBEGIN;\n");
  expect(cut).toBeGreaterThan(0);
  expect(()=>unwrapReviewedPgMigration(
   sql.slice(0,cut)+"\nSELECT 1;"+sql.slice(cut)
  )).toThrow();
 });
});
