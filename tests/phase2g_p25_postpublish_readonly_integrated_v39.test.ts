import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
const s=readFileSync("scripts/v39_p25_postpublish_structural_readonly_v39.ts","utf8");
describe("P25 integrated public deployed release and V0064 read-only audit",()=>{
 it("pins original published PR30 merge SHA and HTTPS actual published endpoint",()=>{
  expect(s).toContain('const RELEASE="89c3b170e56c89dc79df61dfaddbe94116280923"');
  expect(s).toContain('https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime');
  expect(s).toContain('live?.git_head===RELEASE');
  expect(s).toContain('live?.published_deployment===true');
  expect(s).toContain('live?.prepaid_route_registered===true');
  expect(s).toContain('actual_signed_post_proven_by_this_check:false');
 });
 it("audits exact 10 columns including types and nullability plus immutable function/trigger",()=>{
  for(const key of ["session_id","delivery_id","source_sha256","source_bytes","blob_ref_id","object_name","first_node_received_utc","source_retention_until","state","verified_at_utc"]){
    expect(s).toContain(key);
  }
  expect(s).toContain("pg_get_functiondef");
  expect(s).toContain("pg_trigger");
  expect(s).toContain('tgenabled==="O"');
  expect(s).toContain('rel.relpersistence==="p"');
  expect(s).toContain("required_constraints_validated:constraintOk");
  expect(s).toContain("historical_untombstoned_references");
 });
 it("does not mutate SQL, provider or Replit object storage",()=>{
  expect(s).toContain('await client.query("BEGIN TRANSACTION READ ONLY")');
  expect(s).toContain('await client.query("ROLLBACK")');
  expect(s).not.toMatch(/\b(?:INSERT INTO|UPDATE clean\.|DELETE FROM clean\.|CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE)\b/i);
  expect(s).not.toContain("getBalance(");
  expect(s).not.toContain("createRequiredProviderBlobStoreV39");
  expect(s).toContain("provider_calls:0,provider_mutations:0,sql_mutations:0");
  expect(s).toContain("scientific_p25_auth_granted_by_this_check:false");
 });
});
