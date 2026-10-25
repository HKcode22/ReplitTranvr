import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
const yaml=readFileSync(new URL(
 "../.github/workflows/phase3-gate4-safety-runner-readonly.yml",
 import.meta.url),"utf8");

describe("Gate4 NEXT3 protected no-provider database attestation",()=>{
 it("counts only new NEXT3 V0072 scope, not historical owned trials",()=>{
  expect(yaml).toContain('const next3Scope="15bec7e1-8efc-49e7-9ee8-63521a76d71c"');
  expect(yaml).toContain("WHERE scope_id=$1::uuid");
  expect(yaml).toContain("[next3Scope]");
  expect(yaml).toContain("next3OwnedBindings:Number.isSafeInteger(count)?count:null");
  expect(yaml).toContain("x.prebind_read===false&&count===0");
  expect(yaml).not.toContain('SELECT count(*)::int AS total FROM clean.gate4_alert_owned_binding_v39"');
 });
 it("maintains protected exact main and reviewer, restricted SELECT-only, no provider",()=>{
  expect(yaml).toContain("environment: gate4-safety");
  expect(yaml).toContain("expected_main_sha");
  expect(yaml).toContain("READONLY_GATE4_SAFETY_DB_NO_PROVIDER");
  expect(yaml).toContain("GATE4_SAFETY_READONLY_DATABASE_URL");
  expect(yaml).toContain('options:"-c default_transaction_read_only=on"');
  expect(yaml).toContain('await client.query("BEGIN TRANSACTION READ ONLY")');
  expect(yaml).toContain("x.can_insert===false");
  expect(yaml).toContain("x.can_update===false");
  expect(yaml).toContain("x.can_delete===false");
  expect(yaml).toContain("AERODATABOX_API_KEY: \"\"");
  expect(yaml).toContain("stopArmed:false,paidAuthorization:false");
  expect(yaml).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(yaml).not.toContain("deleteSubscriptionVerifiedStrict");
 });
});
