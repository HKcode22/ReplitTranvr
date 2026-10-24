import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {join,dirname} from "node:path";
import {GATE4_SECOND_WRITER_PRODUCTION_APPLY_RELEASED_V39} from
 "../scripts/v39_gate4_second_writer_commission_v39";

const source=readFileSync(new URL(
 "../scripts/v39_gate4_second_writer_commission_v39.ts",import.meta.url),"utf8");

describe("Gate4 second scoped writer released ONLY for exact no-provider manifest",()=>{
 it("requires exact private approval before production owner DB connection",()=>{
  expect(GATE4_SECOND_WRITER_PRODUCTION_APPLY_RELEASED_V39).toBe(true);
  expect(source).toContain(
   'mode==="--apply"&&!GATE4_SECOND_WRITER_PRODUCTION_APPLY_RELEASED_V39'
  );
  expect(source.indexOf("readGate4ApprovedManifestV39()")).toBeLessThan(source.indexOf("const cfg=config();"));
  expect(source.indexOf('if(mode==="--apply"&&!GATE4_SECOND_WRITER_PRODUCTION_APPLY_RELEASED_V39'))
   .toBeLessThan(source.indexOf("const cfg=config();"));
  expect(source.indexOf("const cfg=config();"))
   .toBeLessThan(source.indexOf("await db.connect();"));
  expect(source).toContain('["--plan","--apply"].includes(mode)');
  expect(source).not.toContain('"--revoke"');
 });
 it("refuses --apply in an actual spawned process without any DB or provider credential",()=>{
  const root=join(dirname(fileURLToPath(import.meta.url)),"..");
  const script=join(root,"scripts/v39_gate4_second_writer_commission_v39.ts");
  let err="";
  try{
   execFileSync(process.execPath,["--import","tsx",script,"--apply"],{
    cwd:root,env:{
     PATH:process.env.PATH,
     HOME:process.env.HOME,
     NODE_ENV:"test",
     AERODATABOX_API_KEY:"",
     V39_PRODUCTION_DATABASE_OWNER_URL:"",
     GATE4_SECOND_WRITER_APPLY_CONFIRM:""
    },timeout:5000,stdio:["ignore","pipe","pipe"]
   });
  }catch(e){
   err=String((e as {stderr?:Buffer}).stderr??"");
  }
  expect(err).toContain("GATE4_SECOND_WRITER_PRIVATE_APPROVED_MANIFEST_HOLD");
 });
 it("uses exact old-custody and PostgreSQL server-side array membership checks",()=>{
  for(const needle of [
   "498dccd7-5da3-4687-a6ea-e0dc03b54398",
   "gate4_owner_writer_20261023",
   "gate4_safety_select_v39",
   "roles[1]::text=$1",
   "cardinality(roles)=1",
   "reviewGate4SecondScopeRlsV39",
   "safety.rolcanlogin!==true",
   "old.rolcanlogin!==false",
   "originals.old_count!==1",
   "originals.other_count!==0",
   "BEGIN TRANSACTION READ ONLY"
  ])expect(source).toContain(needle);
 });
 it("future apply remains explicit, atomic, expiring, least privilege, and not a paid runner",()=>{
  for(const needle of [
   "GATE4_SECOND_WRITER_APPLY_CONFIRM",
   "AUTHORIZE_NEW_WSSS_V0072_ROLE_NO_PROVIDER",
   "GATE4_SECOND_WRITER_APPROVED_SCOPE_ID",
   "GATE4_SECOND_WRITER_APPROVED_AUTH_SHA256",
   "GATE4_SECOND_WRITER_APPROVED_RECEIVER_SHA",
   "GATE4_SECOND_WRITER_REVIEWED_SOURCE_SHA",
   "GATE4_SECOND_WRITER_ROLE",
   "NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE",
   "NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1",
   "pg_advisory_xact_lock(3904,20261024)",
   "const verified=await facts(db,cfg,false)",
   'writeFileSync(file,JSON.stringify({',
   'mode:0o600',
   'flag:"wx"',
   "await db.query(\"COMMIT\")",
   "POSTCOMMIT_RECONCILIATION"
  ])expect(source).toContain(needle);
  expect(source).not.toContain("createSubscription(");
  expect(source).not.toContain("deleteSubscription(");
  expect(source).not.toContain("sendAlert(");
  expect(source).not.toContain("DROP POLICY ");
  expect(source).not.toContain("UPDATE clean.gate4_alert_owned_binding_v39");
  expect(source).not.toContain("DELETE FROM clean.gate4_alert_owned_binding_v39");
 });
});
