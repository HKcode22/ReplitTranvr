import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 gate4Next2ScopedStatementsV39,gate4Next2RoleDDLV39
} from "../scripts/v39_gate4_next2_additive_commission_no_provider_v39";
const source=readFileSync(new URL(
 "../scripts/v39_gate4_next2_additive_commission_no_provider_v39.ts",
 import.meta.url),"utf8");
describe("Gate4 NEXT2 additive one-transaction NO-PROVIDER commission",()=>{
 it("has exactly two fresh expiring least-privilege role descriptions",()=>{
  const password="a".repeat(80);
  for(const [role,limit] of [
   ["gate4_receiver_2026_next2",4],
   ["gate4_owner_writer_2026_next2",1]
  ] as const){
   const ddl=gate4Next2RoleDDLV39(
    role,password,"2026-10-24T19:00:00.000Z",limit);
   expect(ddl).toContain("CREATE ROLE "+role+" LOGIN NOINHERIT");
   expect(ddl).toContain("NOBYPASSRLS");
   expect(ddl).toContain("NOSUPERUSER NOCREATEDB NOCREATEROLE");
   expect(ddl).toContain("CONNECTION LIMIT "+limit);
   expect(ddl).toContain("VALID UNTIL '2026-10-24T19:00:00.000Z'");
  }
  expect(()=>gate4Next2RoleDDLV39(
   "gate4_receiver_2026_next1",password,
   "2026-10-24T19:00:00.000Z",4
  )).toThrow();
  expect(()=>gate4Next2RoleDDLV39(
   "gate4_receiver_2026_next2","bad",
   "2026-10-24T19:00:00.000Z",4
  )).toThrow();
 });
 it("adds only four fresh scoped RLS policies without altering old ones",()=>{
  const auth="b".repeat(64);
  const sql=gate4Next2ScopedStatementsV39(auth);
  expect(sql).toHaveLength(10);
  const joined=sql.join("\n");
  const policies=sql.filter(x=>x.startsWith("CREATE POLICY "));
  expect(policies).toHaveLength(4);
  const scopes=policies.map(x=>x.includes(
   "scope_id='16f819c6-7c68-4d5a-82cf-3820e9294dc7'::uuid"));
  expect(scopes).toEqual([true,true,true,true]);
  expect(policies.every(x=>x.includes("authorization_sha256='"+auth+"'"))).toBe(true);
  expect(policies.every(x=>x.includes(
   "source_commit='29d3e0dff8b8863f55f6d73e609e21480b8e46db'"))).toBe(true);
  expect(policies.every(x=>x.includes("airport_icao='WSSS'"))).toBe(true);
  for(const s of ["gate4_next2_receiver_select_v39",
    "gate4_next2_receiver_insert_v39","gate4_next2_writer_select_v39",
    "gate4_next2_writer_insert_v39"])expect(joined).toContain(s);
  expect(policies.filter(x=>x.includes(" FOR SELECT TO "))).toHaveLength(2);
  expect(policies.filter(x=>x.includes(" FOR INSERT TO "))).toHaveLength(2);
  expect(joined).not.toMatch(/\b(DROP|ALTER|REVOKE|TRUNCATE|DELETE|UPDATE)\b/);
  expect(joined).not.toContain("gate4_receiver_2026_next1");
  expect(joined).not.toContain("gate4_owner_writer_2026_next1");
  expect(()=>gate4Next2ScopedStatementsV39("unsafe")).toThrow();
 });
 it("requires private, write-once AUTH and exactly one source reviewed apply",()=>{
  expect(source).toContain('if(existsSync(MANIFEST)||existsSync(INTENT))hold()');
  expect(source).toContain('m.providerCreateAuthorized!==false');
  expect(source).toContain('GATE4_NEXT2_APPLY_CONFIRM');
  expect(source).toContain('if([INTENT,RECEIVER_CREDENTIAL,WRITER_CREDENTIAL]');
  expect(source).toContain('writeOnce(INTENT,');
  expect(source).toContain('if(!await inspect(db,expectedActor,false,false))hold()');
  expect(source).toContain('if(!await inspect(db,expectedActor,false,true))hold()');
  expect(source).toContain('await db.query("COMMIT")');
  expect(source).toContain('await db.query("BEGIN TRANSACTION READ ONLY")');
  expect(source).toContain('GATE4_NEXT2_REVIEWED_COMMISSION_SHA');
  expect(source).not.toContain('AERODATABOX_API_KEY');
  expect(source).not.toContain('createGate4SingleWithRawReceiptV39');
  expect(source).not.toContain('deleteSubscriptionVerifiedStrict');
  expect(source).not.toContain('REFILL');
 });
});
