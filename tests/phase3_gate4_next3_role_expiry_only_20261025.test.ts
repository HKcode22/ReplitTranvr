import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 NEXT3_EXPIRY_SOURCE_V39,NEXT3_EXPIRY_WRITER_ROLE_V39,
 NEXT3_EXPIRY_OLD_UTC_V39,NEXT3_EXPIRY_NEW_UTC_V39,
 NEXT3_EXPIRY_GO_V39,next3RoleExpiryStateV39,
 next3RoleExpiryISO
} from "../scripts/v39_gate4_next3_role_expiry_only_20261025";
import {NEXT3_RECEIVER_ROLE} from
 "../server/lib/disruption/gate4Next3SealedBootstrap_v39";
const renewal=readFileSync(new URL(
 "../scripts/v39_gate4_next3_role_expiry_only_20261025.ts",
 import.meta.url),"utf8");
const paid=readFileSync(new URL(
 "../scripts/v39_gate4_next3_paid_trial_custody_v39.ts",
 import.meta.url),"utf8");
const custody=readFileSync(new URL(
 "../scripts/v39_gate4_next3_no_provider_writer_signer_seal_v39.ts",
 import.meta.url),"utf8");
const rows=(expiry:string)=>[
 NEXT3_RECEIVER_ROLE,NEXT3_EXPIRY_WRITER_ROLE_V39
].map(rolname=>({rolname,rolvaliduntil:expiry,
 rolcanlogin:true,rolsuper:false,rolbypassrls:false,rolinherit:false,
 rolcreaterole:false,rolcreatedb:false,rolreplication:false}));
describe("Gate4 NEXT3 expiry-only 9 PM Pacific 2026-10-25",()=>{
 it("scopes source, named roles and exact new UTC expiry",()=>{
  expect(NEXT3_EXPIRY_SOURCE_V39).toBe(
   "5878b90eed04b2edfe2b226735ff0f02d9be25f3");
  expect(NEXT3_EXPIRY_OLD_UTC_V39).toBe("2026-10-25T13:20:25.382Z");
  expect(NEXT3_EXPIRY_NEW_UTC_V39).toBe("2026-10-26T04:00:00.000Z");
  expect(NEXT3_EXPIRY_GO_V39).toContain("ONLY_NEXT3_TWO_ROLE_VALID_UNTIL");
  expect(next3RoleExpiryISO(new Date(NEXT3_EXPIRY_NEW_UTC_V39)))
   .toBe(NEXT3_EXPIRY_NEW_UTC_V39);
 });
 it("requires two matching roles, old or new pair, denies mixed identities",()=>{
  expect(next3RoleExpiryStateV39(rows(NEXT3_EXPIRY_OLD_UTC_V39)))
   .toBe("old");
  expect(next3RoleExpiryStateV39(rows(NEXT3_EXPIRY_NEW_UTC_V39)))
   .toBe("new");
  expect(()=>next3RoleExpiryStateV39([
   rows(NEXT3_EXPIRY_OLD_UTC_V39)[0],
   rows(NEXT3_EXPIRY_NEW_UTC_V39)[1]
  ])).toThrow();
  expect(()=>next3RoleExpiryStateV39(
   rows(NEXT3_EXPIRY_NEW_UTC_V39).slice(0,1)
  )).toThrow();
  expect(()=>next3RoleExpiryStateV39(
   rows(NEXT3_EXPIRY_NEW_UTC_V39).map(x=>({...x,rolsuper:true}))
  )).toThrow();
 });
 it("has only transactional ALTER VALID UNTIL of existing named roles",()=>{
  expect(renewal).toContain('BEGIN ISOLATION LEVEL SERIALIZABLE');
  expect(renewal).toContain("ALTER ROLE gate4_receiver_2026_next3 ");
  expect(renewal).toContain("ALTER ROLE gate4_owner_writer_2026_next3 ");
  expect(renewal).toContain("VALID UNTIL '2026-10-26 04:00:00+00'");
  expect(renewal).toContain('if(mode==="--extend-once"&&before.state==="old")');
  expect(renewal).toContain('if(mode==="--extend-once"&&verified.state!=="new")hold();');
  expect(renewal).toContain("originalRowsPreserved:verified.originals");
  expect(renewal).not.toContain("ALTER POLICY ");
  expect(renewal).not.toContain("ALTER ROLE gate4_receiver_2026_next3 PASSWORD");
  expect(renewal).not.toContain("CREATE ROLE ");
  expect(renewal).not.toContain("GRANT ");
  expect(renewal).not.toContain("CREATE POLICY ");
  expect(renewal).not.toContain("DELETE FROM ");
  expect(renewal).not.toContain("INSERT INTO ");
  expect(renewal).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(renewal).not.toContain("deleteSubscriptionVerifiedStrict");
  expect(renewal).toContain("providerCalls:0,appStorageWrites:0");
 });
 it("NEXT3 paid and escrow verify rely on live PostgreSQL expiry, not sealed 6AM metadata",()=>{
  expect(paid).toContain("next3EffectiveWriterExpiryV39(custody.writerUrl)");
  expect(paid).toContain("writerExpiresUtc:effectiveExpiry");
  expect(custody).toContain("next3EffectiveWriterExpiryV39(data.writerUrl)");
  expect(custody).toContain("writerExpiresUtc:effectiveExpiry");
  expect(paid).not.toContain('if(Date.parse(custody.writerExpiresUtc)');
  expect(custody).not.toContain('if(Date.parse(data.writerExpiresUtc)');
  expect(renewal).toContain("options:\"-c default_transaction_read_only=on\"");
 });
});
