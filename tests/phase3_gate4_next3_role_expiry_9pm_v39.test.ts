import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 NEXT3_EXTENDED_EXPIRES_V39,NEXT3_EXPIRY_INTENT_V39,
 NEXT3_EXPIRY_BLOB_V39,next3ExpirySqlV39
} from "../scripts/v39_gate4_next3_extend_role_validity_to_9pm_v39";
const code=readFileSync(new URL(
 "../scripts/v39_gate4_next3_extend_role_validity_to_9pm_v39.ts",
 import.meta.url),"utf8");
const owner=readFileSync(new URL(
 "../scripts/v39_gate4_next3_paid_trial_custody_v39.ts",
 import.meta.url),"utf8");

describe("Gate4 NEXT3 scoped role expiry renewal with no provider",()=>{
 it("fixes exact 9pm Pacific expiry, no PASSWORD or privileges altered",()=>{
  expect(NEXT3_EXTENDED_EXPIRES_V39).toBe("2026-10-26T04:00:00.000Z");
  const receiver=next3ExpirySqlV39("gate4_receiver_2026_next3");
  const writer=next3ExpirySqlV39("gate4_owner_writer_2026_next3");
  for(const sql of [receiver,writer]){
   expect(sql).toContain("ALTER ROLE");
   expect(sql).toContain("VALID UNTIL");
   expect(sql).toContain("2026-10-26T04:00:00.000Z");
   expect(sql).not.toContain("PASSWORD");
  }
  expect(()=>next3ExpirySqlV39("gate4_owner_writer_2026_next2")).toThrow();
  expect(()=>next3ExpirySqlV39("postgres")).toThrow();
 });
 it("requires old exact expiry and full four-policies source/auth scope readback",()=>{
  expect(code).toContain('const BEFORE="2026-10-25T13:20:25.382Z"');
  expect(code).toContain('if(original.writerExpiresUtc!==BEFORE)');
  expect(code).toContain('if(policies.length!==4');
  expect(code).toContain('x.expiry!==expected');
  expect(code).toContain('String(cmd==="SELECT"?p.qual:p.with_check).includes(NEXT3_ID)');
  expect(code).toContain('String(cmd==="SELECT"?p.qual:p.with_check).includes(auth)');
  expect(code).toContain('String(cmd==="SELECT"?p.qual:p.with_check).includes("WSSS")');
  expect(code).toContain('if(orig!==1||owner!==0)');
 });
 it("one-shot App Storage intent precedes two ALTER roles and v2 custody",()=>{
  expect(NEXT3_EXPIRY_INTENT_V39).toContain("internal/gate4/next3/");
  expect(NEXT3_EXPIRY_BLOB_V39).toContain("internal/gate4/next3/");
  const intent=code.indexOf('await storage.uploadBytes(NEXT3_EXPIRY_INTENT_V39,intent)');
  const change=code.indexOf("await db.query(next3ExpirySqlV39(role))");
  const blob=code.indexOf("await storage.uploadBytes(NEXT3_EXPIRY_BLOB_V39,sealed)");
  expect(intent).toBeGreaterThan(0);
  expect(change).toBeGreaterThan(intent);
  expect(blob).toBeGreaterThan(change);
  expect(code).toContain("noAutomaticRetry:true");
  expect(code).toContain('["--check","--extend-once","--verify"]');
  expect(code).toContain("GATE4_NEXT3_EXPIRY_GO");
  expect(code).toContain("GATE4_NEXT3_EXPIRY_OPERATOR_SHA");
  expect(code).not.toContain("CREATE ROLE");
  expect(code).not.toContain("CREATE POLICY");
  expect(code).not.toContain("ALTER ROLE PASSWORD");
  expect(code).not.toContain("refillBalance(");
  expect(code).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(code).not.toContain("deleteSubscriptionVerifiedStrict");
 });
 it("paid owner verifies extended AES custody same private writer and signer",()=>{
  expect(owner).toContain("NEXT3_EXPIRY_BLOB_V39");
  expect(owner).toContain("NEXT3_EXPIRY_INTENT_V39");
  expect(owner).toContain("if(hasIntent!==hasExtended)");
  expect(owner).toContain("custody.writerExpiresUtc!==NEXT3_EXTENDED_EXPIRES_V39");
  expect(owner).toContain("custody.writerUrl!==original.writerUrl");
  expect(owner).toContain("custody.signerPrivatePkcs8Base64!==original.signerPrivatePkcs8Base64");
  expect(owner).toContain('hold("EXTENSION_UNTRUSTED_OR_DRIFT")');
 });
});
