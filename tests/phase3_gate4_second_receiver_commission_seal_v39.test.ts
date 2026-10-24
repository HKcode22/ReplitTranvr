import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {GATE4_SECOND_RECEIVER_PRODUCTION_APPLY_RELEASED_V39} from
 "../scripts/v39_gate4_second_receiver_commission_v39";
const file=new URL("../scripts/v39_gate4_second_receiver_commission_v39.ts",import.meta.url);
const src=readFileSync(file,"utf8");
describe("Gate4 second receiver V0071 commission — scope-frozen no-provider release",()=>{
 it("requires private manifest BEFORE any production DB connection",()=>{
  expect(GATE4_SECOND_RECEIVER_PRODUCTION_APPLY_RELEASED_V39).toBe(true);
  const seal='if(mode==="--apply"&&!GATE4_SECOND_RECEIVER_PRODUCTION_APPLY_RELEASED_V39)';
  expect(src).toContain(seal);
  expect(src).toContain("readGate4ApprovedManifestV39()");
  expect(src.indexOf("readGate4ApprovedManifestV39()")).toBeLessThan(src.indexOf("const cfg=cfgFromEnvironment()"));
  expect(src.indexOf(seal)).toBeLessThan(src.indexOf("const cfg=cfgFromEnvironment()"));
  expect(src.indexOf("const cfg=cfgFromEnvironment()"))
   .toBeLessThan(src.indexOf("await db.connect()"));
  expect(src).toContain('"--plan","--apply"');
  expect(src).not.toContain("createSubscription(");
  expect(src).not.toContain("deleteSubscription(");
 });
 it("cannot execute --apply without secrets in a genuine spawned process",()=>{
  const cwd=join(dirname(fileURLToPath(import.meta.url)),"..");
  let stderr="";
  try{
   execFileSync(process.execPath,["--import","tsx",fileURLToPath(file),"--apply"],{
    cwd,timeout:6000,env:{
     PATH:process.env.PATH,HOME:process.env.HOME,
     AERODATABOX_API_KEY:"",
     V39_PRODUCTION_DATABASE_OWNER_URL:"",
     GATE4_SECOND_RECEIVER_APPLY_CONFIRM:""
    },stdio:["ignore","pipe","pipe"]
   });
  }catch(error){
   stderr=String((error as {stderr?:Buffer}).stderr??"");
  }
  expect(stderr).toContain(
   "GATE4_SECOND_RECEIVER_PRIVATE_APPROVED_MANIFEST_HOLD"
  );
 });
 it("requires separate exact scope and private distinct receiver credential",()=>{
  for(const pin of [
   "GATE4_SECOND_RECEIVER_REVIEWED_SOURCE_SHA",
   "GATE4_SECOND_RECEIVER_ROLE",
   "GATE4_SECOND_RECEIVER_APPROVED_SCOPE_ID",
   "GATE4_SECOND_RECEIVER_APPROVED_AUTH_SHA256",
   "GATE4_SECOND_RECEIVER_APPROVED_PUBLISHED_SHA",
   "V39_PRODUCTION_DATABASE_OWNER_URL",
   "V39_DATABASE_RUNTIME_URL",
   "AUTHORIZE_SCOPED_V0071_RECEIVER_NO_PROVIDER",
   "gate4_receiver_20261022",
   "GATE4_SECOND_RECEIVER_CREDENTIAL_RETAIN_FOR_MANUAL_RECONCILIATION",
   "NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE",
   "NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4",
   "await inspect(db,cfg,false)",
   "pg_advisory_xact_lock(3904,20261025)",
   'flag:"wx",mode:0o600',
   'BEGIN TRANSACTION READ ONLY',
   "POSTCOMMIT_RECONCILIATION"
  ])expect(src).toContain(pin);
  expect(src).toContain("await preservedOldSha(db)");
  expect(src).not.toContain("DROP POLICY");
  expect(src).not.toContain("DELETE FROM clean.gate4_alert_prebind_original_v39");
  expect(src).not.toContain("UPDATE clean.gate4_alert_prebind_original_v39");
 });
});
