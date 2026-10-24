import {describe,it,expect} from "vitest";
import {
 recoverNext2PredicateV39
} from "../scripts/v39_gate4_next2_lost_private_scope_recovery_v39";

const SCOPE="16f819c6-7c68-4d5a-82cf-3820e9294dc7";
const OLD="29d3e0dff8b8863f55f6d73e609e21480b8e46db";
const NEXT="087dc948c29d004f88eca141e1fc8e83c2844e3f";
const AUTH="e".repeat(64);
const pred=(source=OLD,airport="WSSS")=>
  "((((scope_id = '"+SCOPE+"'::uuid) AND "+
  "(authorization_sha256 = '"+AUTH+"'::text)) AND "+
  "(source_commit = '"+source+"'::text)) AND "+
  "(airport_icao = '"+airport+"'::text))";

describe("NEXT2 original-policy-only recovery",()=>{
 it("extracts the existing SHA without printing or generating a new authorization",()=>{
  expect(recoverNext2PredicateV39(pred())).toBe(AUTH);
 });
 it("accepts PostgreSQL 16 VARCHAR policy deparser with casts on both sides",()=>{
  const sql="((((scope_id = '"+SCOPE+"'::uuid) AND "+
   "((authorization_sha256)::text = '"+AUTH+"'::text)) AND "+
   "((source_commit)::text = '"+OLD+"'::text)) AND "+
   "((airport_icao)::text = 'WSSS'::text))";
  expect(recoverNext2PredicateV39(sql)).toBe(AUTH);
  expect(recoverNext2PredicateV39(
   sql.replace("((airport_icao)::text","(unknown_function(airport_icao)::text")
  )).toBeNull();
  expect(recoverNext2PredicateV39(sql.replace("::text","::bpchar"))).toBeNull();
 });
 it("refuses a source already retargeted or different from frozen commission",()=>{
  expect(recoverNext2PredicateV39(pred(NEXT))).toBeNull();
 });
 it("refuses wrong ICAO, scope, missing fields, widened OR, additional comparison",()=>{
  expect(recoverNext2PredicateV39(pred(OLD,"OMDB"))).toBeNull();
  expect(recoverNext2PredicateV39(pred().replace(SCOPE,"d6c0fcac-798e-4913-bfd1-a561adb3dd82"))).toBeNull();
  expect(recoverNext2PredicateV39(pred().replace("authorization_sha256","authorization_missing"))).toBeNull();
  expect(recoverNext2PredicateV39(pred()+" OR true")).toBeNull();
  expect(recoverNext2PredicateV39(pred()+" AND bypass_flag = '1'")).toBeNull();
 });
 it("does not accept arbitrary non-expression input",()=>{
  expect(recoverNext2PredicateV39(null)).toBeNull();
  expect(recoverNext2PredicateV39("")).toBeNull();
 });
});
