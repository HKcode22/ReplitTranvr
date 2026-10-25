import {describe,it,expect} from "vitest";
import {strictNext2PolicyAuditV39} from "../scripts/v39_gate4_next2_exact_rls_readonly_v39";
const src="087dc948c29d004f88eca141e1fc8e83c2844e3f";
const scope="16f819c6-7c68-4d5a-82cf-3820e9294dc7";
const auth="b".repeat(64);
const predicate="((((scope_id = '" + scope + "'::uuid) AND "+
 "((authorization_sha256)::text = '" + auth + "'::text)) AND "+
 "((source_commit)::text = '" + src + "'::text)) AND "+
 "((airport_icao)::text = 'WSSS'::text))";
const fixture=()=>{
 const entries=[
  ["gate4_next2_receiver_select_v39","gate4_alert_prebind_original_v39","SELECT","gate4_receiver_2026_next2","qual"],
  ["gate4_next2_receiver_insert_v39","gate4_alert_prebind_original_v39","INSERT","gate4_receiver_2026_next2","with_check"],
  ["gate4_next2_writer_select_v39","gate4_alert_owned_binding_v39","SELECT","gate4_owner_writer_2026_next2","qual"],
  ["gate4_next2_writer_insert_v39","gate4_alert_owned_binding_v39","INSERT","gate4_owner_writer_2026_next2","with_check"]
 ] as const;
 return entries.map(([policyname,tablename,cmd,assigned_role,side])=>({
  policyname,tablename,cmd,assigned_role,role_count:1,permissive:"PERMISSIVE",
  qual:side==="qual"?predicate:null,with_check:side==="with_check"?predicate:null
 }));
};
describe("NEXT2 exact RLS read-only validation",()=>{
 it("accepts four exact scoped policies",()=>{
  expect(strictNext2PolicyAuditV39(fixture(),auth)).toBe(true);
 });
 it("rejects loose/OR predicates, wrong auth/scope/ICAO and missing policies",()=>{
  expect(strictNext2PolicyAuditV39(fixture(),auth.slice(0,-1)+"c")).toBe(false);
  expect(strictNext2PolicyAuditV39(fixture().slice(0,3),auth)).toBe(false);
  expect(strictNext2PolicyAuditV39([...fixture(),fixture()[0]],auth)).toBe(false);
  for(const altered of [
   predicate.replace(scope,"11111111-1111-4111-8111-111111111111"),
   predicate.replace(src,"f".repeat(40)),
   predicate.replace("WSSS","KLAX"),predicate+" OR true"
  ]){const rs=fixture();rs[2].qual=altered;
   expect(strictNext2PolicyAuditV39(rs,auth)).toBe(false);}
 });
 it("rejects wrong role, duplicate grants and wrong policy command",()=>{
  const rs=fixture();rs[3].assigned_role="PUBLIC";
  expect(strictNext2PolicyAuditV39(rs,auth)).toBe(false);
  const p=fixture();p[1].role_count=2;
  expect(strictNext2PolicyAuditV39(p,auth)).toBe(false);
  const x=fixture();x[2].with_check=predicate;
  expect(strictNext2PolicyAuditV39(x,auth)).toBe(false);
  const u=fixture();u[0].permissive="RESTRICTIVE";
  expect(strictNext2PolicyAuditV39(u,auth)).toBe(false);
 });
});
