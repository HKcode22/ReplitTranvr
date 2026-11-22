import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 exactP6V0108Sql,classifyP6V0108Bodies,reviewP6V0108Apply,
 P6_V0108_APPLY_APPROVAL,P6_V0108_MIGRATION
} from "../scripts/v39_phase6_v0108_owner_once_v39.mjs";
const code="a".repeat(40);
const granted="{neondb_owner=X/neondb_owner,phase6_private_expiry_reader_v39=X/neondb_owner}";
const f=(body:string,vol:string)=>({body,vol,owner:"neondb_owner",definer:true,
 config:"search_path=pg_catalog, pg_temp",acl:granted,publicExec:false});
describe("Gate 3 V0108 exact owner migration, NO provider or paid GO",()=>{
 it("pins the reviewed SQL byte-for-byte and distinguishes both function bodies",()=>{
  const sql=exactP6V0108Sql();
  expect(sql.oldStatus).not.toBe(sql.newStatus);
  expect(sql.oldSweep).not.toBe(sql.newSweep);
  expect(sql.migration).toContain("P6_V0108_REQUIRES_EMPTY_PRIVATE_CUSTODY_AND_NO_DELETION_STOP");
  expect(classifyP6V0108Bodies([f(sql.oldStatus,"s"),f(sql.oldSweep,"v")],sql))
   .toBe("V0105_EXACT_PREDECESSOR");
  expect(classifyP6V0108Bodies([f(sql.newStatus,"s"),f(sql.newSweep,"v")],sql))
   .toBe("V0108_EXACT_INSTALLED");
  expect(()=>exactP6V0108Sql(p=>{
   const b=readFileSync(p);
   return p===P6_V0108_MIGRATION?Buffer.concat([b,Buffer.from("\n-- unauthorized drift\n")]):b;
  })).toThrow("MIGRATION_GIT_BLOB_DRIFT");
 });
 it("refuses partial replacement, altered owner, grant, volatility or SECURITY DEFINER",()=>{
  const sql=exactP6V0108Sql();
  const full=[f(sql.newStatus,"s"),f(sql.newSweep,"v")];
  for(const corrupted of [
   [f(sql.newStatus,"s"),f(sql.oldSweep,"v")],
   [f(sql.oldStatus,"s"),f(sql.newSweep,"v")],
   [{...full[0],body:sql.newStatus+" unsafe"},full[1]],
   [{...full[0],publicExec:true},full[1]],
   [{...full[0],acl:""},full[1]],
   [{...full[0],owner:"postgres"},full[1]],
   [full[0],{...full[1],vol:"s"}],
   [full[0],{...full[1],config:"search_path=public"}],
   [full[0],{...full[1],definer:false}]
  ])expect(()=>classifyP6V0108Bodies(corrupted,sql)).toThrow();
 });
 it("allows APPLY for an approved descendant of the already enabled immutable SOURCE stage, but never replays SOURCE",()=>{
  const pre={state:"V0105_EXACT_PREDECESSOR",reviewedCodeAncestor:true,
   sourceEnabled:true,sourceAuthCodeSha:"b".repeat(40),packets:0,indexes:0,deletionStops:0};
  const env={P6_V0108_REVIEWED_MAIN_SHA:code,P6_V0108_OWNER_APPROVAL:P6_V0108_APPLY_APPROVAL,
   ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0"};
  expect(()=>reviewP6V0108Apply(pre,code,env)).not.toThrow();
  for(const corrupted of [
   {...pre,state:"V0108_EXACT_INSTALLED"},{...pre,reviewedCodeAncestor:false},{...pre,sourceEnabled:false},
   {...pre,packets:1},{...pre,indexes:1},{...pre,deletionStops:1}
  ])expect(()=>reviewP6V0108Apply(corrupted,code,env)).toThrow();
  for(const corrupted of [
   {...env,P6_V0108_REVIEWED_MAIN_SHA:"b".repeat(40)},
   {...env,P6_V0108_OWNER_APPROVAL:"YES"},
   {...env,ADB_AUTO_COLLECT:"1"},
   {...env,V39_PHASE6_PROCESS_ARMED:"1"},
   {...env,P6_V0108_OWNER_APPROVAL:undefined},
  ])expect(()=>reviewP6V0108Apply(pre,code,corrupted)).toThrow();
 });
});
