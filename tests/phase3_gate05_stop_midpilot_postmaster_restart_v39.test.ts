import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const source=readFileSync("scripts/v39_gate05_science_exact_owned_actions_stop_v39.ts","utf8");
describe("Gate05 live exact STOP handles new PostgreSQL crash/reset while subscribed",()=>{
 it("captures original postmaster epoch before ARMED proof, verifies each loop",()=>{
  const baseline=source.indexOf("const initialPostmaster=await client.query");
  const armed=source.indexOf('status:"LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE"');
  const loop=source.indexOf("while(Date.now()<policy.stopMs+4*60000)");
  const check=source.indexOf("const restarted=await client.query");
  expect(baseline).toBeGreaterThan(0);
  expect(baseline).toBeLessThan(armed);
  expect(loop).toBeGreaterThan(armed);
  expect(check).toBeGreaterThan(loop);
 });
 it("stops exact subscribed provider id when restart occurs, never claims science PASS",()=>{
  expect(source).toContain("POSTMASTER_RESET_EXACT_STOP_SCIENCE_INCOMPLETE");
  expect(source).toContain("POSTMASTER_RESET_BEFORE_EXACT_PAID_BIND");
  expect(source).toContain("deleteSubscriptionVerifiedStrict(knownExactId");
  expect(source).toContain("providerHardCap:false");
  expect(source).toContain("fullSciencePassNotYetProven:true");
 });
 it("emergency DELETE uses last authenticated LOGGED ID if database died",()=>{
  expect(source).toContain("let databaseReadbackUnavailable=false");
  expect(source).toContain("let conflict=false");
  expect(source).toContain("if(!conflict)");
  expect(source).toContain("if(knownExactId)");
  expect(source).toContain("o.authorization_sha256!==p.authorization");
  expect(source).toContain("o.reviewed_stop_ticket_sha256!==p.ticket");
  expect(source).toContain("o.source_commit!==p.receiver");
  expect(source).toContain("exactOwnedDeleteVerified:verified");
  expect(source).toContain("databaseReadbackUnavailable,");
 });
 it("still has zero provider CREATE paths and no foreign-id deletion",()=>{
  for(const danger of [
   "createSubscription(", "createGate4SingleWithRawReceiptV39(",
   "refillBalance(", "fetchFidsAirport("
  ])expect(source).not.toContain(danger);
  expect(source).toContain("FOREIGN_ACTIVE_BILLABLE_INCIDENT");
  expect(source).toContain("BILLABLE_ACTIVE_NO_EXACT_OWNED_ID");
 });
});
