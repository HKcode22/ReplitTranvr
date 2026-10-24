import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 classifyGate4Next2CatalogV39,gate4Next2PoliciesMatchV39,
 NEXT2_SCOPE,NEXT2_RECEIVER,NEXT2_WRITER,FROZEN_RECEIVER_SOURCE,
 type Gate4Next2CatalogSummaryV39
} from "../scripts/v39_gate4_next2_production_readonly_inventory_v39";

const source=readFileSync(new URL(
 "../scripts/v39_gate4_next2_production_readonly_inventory_v39.ts",
 import.meta.url),"utf8");
const good:Gate4Next2CatalogSummaryV39={
 correctDbOwner:true,transactionReadOnly:true,
 rawRls:true,ownerRls:true,
 rawRows:1,oldOriginals:1,next1Originals:0,otherOriginals:0,
 ownedRows:2,oldOwned:1,next1Owned:1,otherOwned:0,
 allOriginalShaVerified:true,receiverPoliciesExact:true,
 writerPoliciesExact:true,legacyReceiverRolesScoped:true,
 priorWriterRoleObserved:true,next2RolesAbsent:true
};
describe("Gate4 NEXT2 production catalog/read-only snapshot",()=>{
 it("freezes an entirely fresh UUID/roles and reviewed repaired receiver",()=>{
  expect(NEXT2_SCOPE).toMatch(/^[a-f0-9-]{36}$/);
  expect(NEXT2_SCOPE).not.toBe("d6c0fcac-798e-4913-bfd1-a561adb3dd82");
  expect(NEXT2_SCOPE).not.toBe("498dccd7-5da3-4687-a6ea-e0dc03b54398");
  expect(NEXT2_RECEIVER).toBe("gate4_receiver_2026_next2");
  expect(NEXT2_WRITER).toBe("gate4_owner_writer_2026_next2");
  expect(FROZEN_RECEIVER_SOURCE).toBe(
   "29d3e0dff8b8863f55f6d73e609e21480b8e46db"
  );
 });
 it("requires historic and NEXT1 exact custody before NEXT2 commissioning",()=>{
  expect(classifyGate4Next2CatalogV39(good)).toBe(
   "NEXT2_READONLY_CATALOG_READY_FOR_NEW_NO_PROVIDER_COMMISSION");
  const rejects:Partial<Gate4Next2CatalogSummaryV39>[]=[
   {rawRls:false},{ownerRls:false},
   {rawRows:0},{rawRows:2},{oldOriginals:0},
   {next1Originals:1},{otherOriginals:1},
   {ownedRows:1},{ownedRows:3},{oldOwned:0},{next1Owned:0},
   {allOriginalShaVerified:false},
   {receiverPoliciesExact:false},{writerPoliciesExact:false},
   {legacyReceiverRolesScoped:false},{priorWriterRoleObserved:false},
   {next2RolesAbsent:false},{transactionReadOnly:false},
   {correctDbOwner:false}
  ];
  for(const delta of rejects)expect(classifyGate4Next2CatalogV39(
    {...good,...delta}
  )).toBe("NEXT2_READONLY_CATALOG_HOLD");
 });
 it("accepts the seven ACTUAL read-only policy metadata rows",()=>{
  const rows=[
   ["gate4_alert_owned_binding_v39","gate4_next_writer_insert_v39","INSERT","gate4_owner_writer_2026_next1",false,true],
   ["gate4_alert_owned_binding_v39","gate4_next_writer_select_v39","SELECT","gate4_owner_writer_2026_next1",true,false],
   ["gate4_alert_owned_binding_v39","gate4_safety_select_v39","SELECT","gate4_safety_reader_20261022",true,false],
   ["gate4_alert_prebind_original_v39","gate4_legacy_receiver_insert_v39","INSERT","gate4_receiver_20261022",false,true],
   ["gate4_alert_prebind_original_v39","gate4_legacy_receiver_select_v39","SELECT","gate4_receiver_20261022",true,false],
   ["gate4_alert_prebind_original_v39","gate4_next_receiver_insert_v39","INSERT","gate4_receiver_2026_next1",false,true],
   ["gate4_alert_prebind_original_v39","gate4_next_receiver_select_v39","SELECT","gate4_receiver_2026_next1",true,false]
  ].map(([tablename,policyname,cmd,assigned_role,has_using,has_check])=>({
   tablename,policyname,cmd,assigned_role,has_using,has_check,
   role_count:1,permissive:"PERMISSIVE"
  })) as any[];
  for(const table of ["gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"]){
   expect(gate4Next2PoliciesMatchV39(rows,table)).toBe(true);
  }
  const base=rows[0];
  for(const change of [
   {role_count:2},{assigned_role:"public"},{cmd:"UPDATE"},
   {permissive:"RESTRICTIVE"},{has_using:true},{has_check:false},
   {policyname:"not-our-policy"}
  ]){
   const altered=rows.map((r,i)=>i===0?{...base,...change}:r);
   expect(gate4Next2PoliciesMatchV39(
    altered,"gate4_alert_owned_binding_v39")).toBe(false);
  }
  expect(gate4Next2PoliciesMatchV39(
   rows.slice(1),"gate4_alert_owned_binding_v39")).toBe(false);
 });
 it("never connects with write capabilities or provider functions",()=>{
  expect(source).toContain('options:"-c default_transaction_read_only=on"');
  expect(source).toContain('BEGIN TRANSACTION READ ONLY');
  expect(source).toContain('if(process.argv.length!==3||process.argv[2]!=="--read-only")');
  expect(source).toContain('GATE4_NEXT2_READONLY_CONFIRM');
  expect(source).toContain('await client.query("ROLLBACK")');
  expect(source).not.toContain('CREATE ROLE ');
  expect(source).not.toContain('ALTER TABLE ');
  expect(source).not.toContain('CREATE POLICY ');
  expect(source).not.toContain('AERODATABOX_API_KEY');
  expect(source).not.toContain('refillBalance');
  expect(source).not.toContain('createGate4SingleWithRawReceipt');
  expect(source).not.toContain('publish_app');
  expect(source).not.toContain('GATE4_PREBIND_WEBHOOK_SECRET');
 });
});
