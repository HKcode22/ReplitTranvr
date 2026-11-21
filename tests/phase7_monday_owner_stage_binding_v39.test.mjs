import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {P7_MONDAY_OWNER_STAGE,assertP7MondayDisabledAuthorization}
  from "../scripts/v39_phase7_monday_owner_stage_binding_v39.mjs";

const exact={
  code_sha:"781140cde71af3b72376c2db9f0fdb84204a2b7c",
  manifest_sha256:"b2a691cb411af61c2bfdc42c55506e0ee86e45bfa3e22b420bbd738dc98ee4e4",
  calendar_hash:"55ea0dd4b50d43af11af65a1e2910928e98a731ffa5efdeda7eee98ac451077b",
  config_hash:"ee4ec9f6ca3e0f123512c8aa463cadd07a8892a3fedc4c316fe0c1b64731457c",
  enabled:false,revoked_at_utc:null
};

test("matches only the actual owner-committed 2026-11-21 Monday stage receipt",()=>{
  assert.equal(P7_MONDAY_OWNER_STAGE.codeSha,exact.code_sha);
  assert.equal(P7_MONDAY_OWNER_STAGE.manifestSha256,exact.manifest_sha256);
  assert.equal(P7_MONDAY_OWNER_STAGE.calendarSha256,exact.calendar_hash);
  assert.equal(P7_MONDAY_OWNER_STAGE.configSha256,exact.config_hash);
  assert.ok(Object.isFrozen(P7_MONDAY_OWNER_STAGE));
  assert.equal(assertP7MondayDisabledAuthorization(exact),true);
});
test("fails CLOSED on stale Nov22 stage, old manifest, partial code transition or enabled authority",()=>{
  for(const changes of [
    {code_sha:"0a7b1a28f243de76d4c83026d15f585265ef6f7b"},
    {manifest_sha256:"3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7"},
    {calendar_hash:"0".repeat(64)},
    {config_hash:"0".repeat(64)},
    {enabled:true},
    {revoked_at_utc:"2026-11-21T12:00:00.000Z"}
  ])assert.throws(()=>assertP7MondayDisabledAuthorization({...exact,...changes}),/HOLD_P7_MONDAY_DISABLED_STAGE_BOUNDARY/);
  for(const invalid of [null,{},[],undefined])assert.throws(
    ()=>assertP7MondayDisabledAuthorization(invalid),
    /HOLD_P7_MONDAY_DISABLED_STAGE_BOUNDARY/
  );
});
test("both owner apply paths bind the SAME exact Monday authority without old hardcoded bypass",()=>{
  const paths=[
    "scripts/v39_phase7_inert_storage_owner_v39.ts",
    "scripts/v39_phase7_preservation_logins_owner_v39.mjs"
  ];
  for(const p of paths){
    const source=readFileSync(p,"utf8");
    assert.match(source,/assertP7MondayDisabledAuthorization\(a\[0\]\)/);
    assert.match(source,/v39_phase7_monday_owner_stage_binding_v39\.mjs/);
    assert.doesNotMatch(source,/0a7b1a28f243de76d4c83026d15f585265ef6f7b/);
    assert.doesNotMatch(source,/3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7/);
    assert.match(source,/provider|PROVIDER|DATABASE_URL/);
  }
});
