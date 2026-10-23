import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL(
 "../scripts/v39_gate4_one_shot_writer_commission_v39.ts",
 import.meta.url),"utf8");

describe("Gate4 writer production commissioning source guard — NO PROVIDER",()=>{
 it("source is explicit plan/apply only, not auto-running on import",()=>{
  expect(src).toContain('["--plan","--apply","--revoke"].includes(mode)');
  expect(src).toContain(
   'import.meta.url===pathToFileURL(process.argv[1]).href');
  expect(src).toContain('if(mode!=="--apply")return;');
  expect(src.indexOf('if(mode!=="--apply")return;'))
   .toBeLessThan(src.indexOf("writeFileSync(FILE,"));
  expect(src.indexOf('if(mode!=="--apply")return;'))
   .toBeLessThan(src.indexOf('"CREATE ROLE "+ROLE+'));
 });
 it("refuses without separate production owner and exact source pin",()=>{
  expect(src).toContain("GATE4_WRITER_REVIEWED_SOURCE_SHA");
  expect(src).toContain("V39_PRODUCTION_DATABASE_OWNER_URL");
  expect(src).toContain("V39_DATABASE_RUNTIME_URL");
  expect(src).toContain("GATE4_WRITER_APPLY_CONFIRM");
  expect(src).toContain("COMMISSION_ONE_SHOT_V0072_WRITER_NO_PROVIDER");
  expect(src).toContain("if(head!==expected)err");
  expect(src).toContain("x.ownedRows===0");
 });
 it("role cannot CREATE/schema mutate, read raw V0071 or edit V0072",()=>{
  expect(src).toContain("gate4_owner_writer_20261023");
  expect(src).toContain("NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE");
  expect(src).toContain("NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1");
  expect(src).toContain(
   "GRANT SELECT,INSERT ON TABLE clean.gate4_alert_owned_binding_v39");
  expect(src).not.toContain(
   "GRANT UPDATE ON TABLE clean.gate4_alert_owned_binding_v39");
  expect(src).not.toContain(
   "GRANT DELETE ON TABLE clean.gate4_alert_owned_binding_v39");
  expect(src).toContain("p.u!==false||p.d!==false||");
  expect(src).toContain("p.raw!==false||p.privilege_escalation!==false");
 });
 it("has separately confirmed writer NOLOGIN and privilege-revoke path",()=>{
  expect(src).toContain('mode==="--revoke"');
  expect(src).toContain("GATE4_WRITER_REVOKE_CONFIRM");
  expect(src).toContain("DISABLE_ONE_SHOT_V0072_WRITER_NO_PROVIDER");
  expect(src).toContain('"REVOKE SELECT,INSERT ON TABLE "');
  expect(src).toContain('"ALTER ROLE "+ROLE+" NOLOGIN"');
  expect(src).toContain('if(check.r!==false||check.w!==false||check.login!==false)');
 });
 it("writes credential only outside repo in private file; 24h expiry",()=>{
  expect(src).toContain('"writer-20261023.json"');
  expect(src).toContain("statSync(DIR)");
  expect(src).toContain("mode:0o600");
  expect(src).toContain('const expiry=new Date(Date.now()+24*60*60*1000)');
  expect(src).toContain("if(existsSync(FILE))err");
  expect(src).not.toContain("createSubscription(");
  expect(src).not.toContain("deleteSubscription(");
 });
});
