import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 NEXT4_WRITER_ROLE_V39,
 next4RoleSQLV39,next4PolicySQLV39
} from "../scripts/v39_gate4_next4_receiver_commission_v39";
import {NEXT4_RECEIVER_ROLE_V39} from
 "../server/lib/disruption/gate4Next4SealedBootstrap_v39";

const m={
 scope:"45dcf5c2-2cf4-469e-9a51-30b58a48f1e5",
 source:"5".repeat(40),
 authorizationSha256:"a".repeat(64)
};
const password="b".repeat(80);

describe("NEXT4 prospective receiver and restricted writer SQL (no provider)",()=>{
 it("creates only narrow nonprivileged source-owned roles without TTL regression",()=>{
  const receiver=next4RoleSQLV39(NEXT4_RECEIVER_ROLE_V39,password,4);
  const writer=next4RoleSQLV39(NEXT4_WRITER_ROLE_V39,password,1);
  expect(receiver).toContain("CONNECTION LIMIT 4");
  expect(writer).toContain("CONNECTION LIMIT 1");
  for(const sql of [receiver,writer]){
   expect(sql).toContain("LOGIN NOINHERIT NOSUPERUSER");
   expect(sql).toContain("NOBYPASSRLS");
   expect(sql).toContain("NOCREATEDB NOCREATEROLE");
   expect(sql).toContain("VALID UNTIL 'infinity'");
   expect(sql).not.toMatch(/\bALTER ROLE\b|\bDROP ROLE\b/);
  }
  for(const [role,limit] of [
   [NEXT4_RECEIVER_ROLE_V39,1],
   [NEXT4_WRITER_ROLE_V39,4]
  ] as const){
   expect(()=>next4RoleSQLV39(role,password,limit)).toThrow();
  }
  expect(()=>next4RoleSQLV39("gate4_receiver_2026_next3",password,4))
   .toThrow();
  expect(()=>next4RoleSQLV39(NEXT4_RECEIVER_ROLE_V39,"bad",4))
   .toThrow();
 });
 it("adds four new UUID/source/auth-locked RLS policies and no historical changes",()=>{
  const cmds=next4PolicySQLV39(m);
  expect(cmds).toHaveLength(10);
  const policy=cmds.filter(x=>x.startsWith("CREATE POLICY"));
  expect(policy).toHaveLength(4);
  expect(policy.filter(x=>x.includes("FOR SELECT"))).toHaveLength(2);
  expect(policy.filter(x=>x.includes("FOR INSERT"))).toHaveLength(2);
  for(const s of policy){
   expect(s).toContain("scope_id='"+m.scope+"'::uuid");
   expect(s).toContain("authorization_sha256='"+m.authorizationSha256+"'");
   expect(s).toContain("source_commit='"+m.source+"'");
   expect(s).toContain("airport_icao='WSSS'");
  }
  expect(cmds.filter(x=>x.includes("GRANT SELECT,INSERT")))
   .toHaveLength(2);
  expect(cmds.join(" ")).not.toMatch(/\bDROP\b|\bALTER\b|\bTRUNCATE\b|\bUPDATE\b|\bDELETE\b/);
  for(const k of ["not-a-uuid","15bec7e1-8efc-49e7-9ee8-63521a76d71c"]){
   expect(()=>next4PolicySQLV39({...m,scope:k})).toThrow();
  }
  expect(()=>next4PolicySQLV39({...m,source:"no"})).toThrow();
  expect(()=>next4PolicySQLV39({...m,authorizationSha256:"no"})).toThrow();
 });
 it("requires exact reviewed packaged SHA, one-shot intent, read-only plan and no paid permission",()=>{
  const src=readFileSync(
   "scripts/v39_gate4_next4_receiver_commission_v39.ts","utf8");
  for(const witness of [
   "GATE4_NEXT4_OPERATOR_SHA","GATE4_NEXT4_REVIEWED_SOURCE_SHA",
   "GATE4_NEXT4_COMMISSION_GO","GATE4_NEXT4_SEAL_GO",
   "BEGIN READ ONLY","BEGIN ISOLATION LEVEL SERIALIZABLE",
   "pg_advisory_xact_lock","privateWrite(APPLY",
   "privateWrite(SEAL","gate4CheckAdditivePgRoleV39",
   "gate4Next4SealValuesV39","gate4Next4OpenSealedValuesV39",
   "oneShotIntentMayExist","noAutomaticRetry:true",
   "paidAuthorized:false"
  ]) expect(src).toContain(witness);
  for(const forbidden of [
   "createGate4SingleWithRawReceiptV39","refillBalance(",
   "deleteSubscriptionVerifiedStrict","gh workflow run",
   "GATE4_NEXT3_APPLY_CONFIRM","DUMMY_PROVIDER_CREATE"
  ]) expect(src).not.toContain(forbidden);
 });
});
