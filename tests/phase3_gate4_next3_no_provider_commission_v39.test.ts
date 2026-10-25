import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 gate4Next3RoleSQLV39,gate4Next3PolicySQLV39,
 NEXT3_WRITER_ROLE
} from "../scripts/v39_gate4_next3_no_provider_commission_v39";
import {
 NEXT3_ID,NEXT3_RECEIVER_ROLE
} from "../server/lib/disruption/gate4Next3SealedBootstrap_v39";
const sha="a".repeat(40),auth="b".repeat(64);
const pwd="c".repeat(80),end="2026-10-25T06:59:45.123Z";
describe("Gate4 NEXT3 no-provider additive commissioning",()=>{
 it("creates exactly two expiring nonprivileged roles with no old role mutation",()=>{
  const receiver=gate4Next3RoleSQLV39(
   NEXT3_RECEIVER_ROLE,pwd,end,4);
  const writer=gate4Next3RoleSQLV39(
   NEXT3_WRITER_ROLE,pwd,end,1);
  for(const sql of [receiver,writer]){
   expect(sql).toContain("NOINHERIT NOSUPERUSER");
   expect(sql).toContain("NOCREATEROLE");
   expect(sql).toContain("NOBYPASSRLS");
   expect(sql).toContain("VALID UNTIL");
   expect(sql).not.toMatch(/ALTER ROLE|DROP ROLE|SUPERUSER\b/);
  }
  expect(receiver).toContain("CONNECTION LIMIT 4");
  expect(writer).toContain("CONNECTION LIMIT 1");
  expect(()=>gate4Next3RoleSQLV39(
   "gate4_receiver_2026_next2",pwd,end,4)).toThrow();
  expect(()=>gate4Next3RoleSQLV39(
   NEXT3_RECEIVER_ROLE,pwd,end,1)).toThrow();
  expect(()=>gate4Next3RoleSQLV39(
   NEXT3_WRITER_ROLE,pwd,end,4)).toThrow();
  expect(()=>gate4Next3RoleSQLV39(
   NEXT3_WRITER_ROLE,"wrong",end,1)).toThrow();
 });
 it("adds exactly four RLS policies with source, auth, airport and scope",()=>{
  const sql=gate4Next3PolicySQLV39(sha,auth);
  expect(sql).toHaveLength(10);
  const policies=sql.filter(x=>x.startsWith("CREATE POLICY"));
  expect(policies).toHaveLength(4);
  expect(sql.filter(x=>x.startsWith("GRANT SELECT,INSERT")))
   .toHaveLength(2);
  expect(policies.every(x=>
   x.includes("scope_id='"+NEXT3_ID+"'::uuid")&&
   x.includes("authorization_sha256='"+auth+"'")&&
   x.includes("source_commit='"+sha+"'")&&
   x.includes("airport_icao='WSSS'"))).toBe(true);
  expect(policies.filter(x=>x.includes("FOR SELECT"))).toHaveLength(2);
  expect(policies.filter(x=>x.includes("FOR INSERT"))).toHaveLength(2);
  expect(sql.join(" ")).not.toMatch(
   /ALTER TABLE|ALTER ROLE|DROP|TRUNCATE|UPDATE|DELETE|BYPASSRLS/);
  expect(sql.join(" ")).not.toContain("gate4_receiver_2026_next2");
  expect(sql.join(" ")).not.toContain("d6c0fcac-798e-4913-bfd1-a561adb3dd82");
  expect(()=>gate4Next3PolicySQLV39("INVALID",auth)).toThrow();
  expect(()=>gate4Next3PolicySQLV39(sha,"INVALID")).toThrow();
 });
 it("does not depend on historical hardcoded row counts",()=>{
  const src=readFileSync(
   "scripts/v39_gate4_next3_no_provider_commission_v39.ts","utf8");
  // NEXT2 prior commissioner pinned exact row counts: that is NOT the new rule.
  expect(src).toContain("originals.every");
  expect(src).toContain("scope===NEXT3_ID");
  expect(src).toContain("newRolesProposed:2");
  expect(src).not.toContain("raw.length!==1");
  expect(src).not.toContain("bindings.length!==2");
  expect(src).not.toContain("originalRowsPreserved:1");
  expect(src).toContain("current.signature!==before.signature");
  expect(src).toContain("POLICY_NAMES");
  expect(src).toContain("phase===\"after\"");
 });
 it("cannot apply without reviewed exact main pin and explicit approval",()=>{
  const src=readFileSync(
   "scripts/v39_gate4_next3_no_provider_commission_v39.ts","utf8");
  expect(src).toContain("GATE4_NEXT3_REVIEWED_MAIN_SHA");
  expect(src).toContain("GATE4_NEXT3_RECEIVER_SOURCE_SHA");
  expect(src).toContain("source!==reviewed");
  expect(src).toContain("GATE4_NEXT3_APPLY_CONFIRM");
  expect(src).toContain("AUTHORIZE_EXACT_NEXT3_DB_ROLES_NO_PROVIDER");
  expect(src).toContain("openSync(path,\"wx\",0o600)");
  expect(src).toContain("noAutomaticRetry:true");
  expect(src).toContain("BEGIN READ ONLY");
  expect(src).toContain("BEGIN ISOLATION LEVEL SERIALIZABLE");
  expect(src).toContain("pg_advisory_xact_lock");
  expect(src).toContain("providerCalls:0");
  expect(src).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(src).not.toContain("deleteSubscriptionVerifiedStrict");
  expect(src).not.toContain("refillBalance(");
  expect(src).not.toContain("gh workflow run");
 });
});