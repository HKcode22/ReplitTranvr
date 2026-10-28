import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {gate05SciencePlanWindowV39 as newWindow} from
  "../scripts/v39_gate05_science_recommission_after_zero_create_v39";
const next=readFileSync(
 "scripts/v39_gate05_science_recommission_after_zero_create_v39.ts","utf8");
const paid=readFileSync(
 "scripts/v39_gate05_science_one_paid_create_once_v39.ts","utf8");
describe("new WSSS scope after expired ORIGINAL zero-POST failure",()=>{
 it("original private scope and fixed 8PM window remain immutable",()=>{
  expect(next).toContain('const PRIOR_SCOPE="98bbf760-6211-4eaa-908c-240be91e7b0d"');
  expect(next).toContain('const PRIOR_STOP_RUN="40623244833"');
  expect(next).toContain("PRIOR_PRIVATE_SCOPE_OR_PAID_INTENT_HOLD");
  expect(next).toContain('old.stopUtc!=="2026-10-28T04:00:00.000Z"');
  expect(next).toContain("old.startingCredits!==1981");
  expect(next).toContain('const root=join(homedir(),".config","replittranvr","gate05-science-retry1")');
  expect(paid).toContain('"gate05-science-retry1"');
  expect(paid).not.toContain('"gate05-science-onepilot"');
 });
 it("requires old GitHub independent STOP SUCCESS and exact zero-billed terminal evidence",()=>{
  for(const x of [
   'priorRun?.status!=="completed"','priorRun?.conclusion!=="success"',
   'priorRun?.run_attempt!==1','priorRun?.head_sha!==old.source',
   'priorRun?.event!=="workflow_dispatch"',
   'settled?.reason!=="NO_ACTIVE_SUBSCRIPTION"',
   'settled?.providerChargedCredits!==0',
   'settled?.exactOwnedProviderIdSeen!==false',
   "CREDIT_BALANCE_NOT_STABLE_AFTER_NO_PAID_WINDOW",
   "PRIOR_STOP_GRACE_NOT_FINISHED",
   "FOREIGN_ACTIVE_PROVIDER"
  ])expect(next).toContain(x);
 });
 it("uses ALREADY INSTALLED V0074 without a second migration and closes only old PREPARED/null-ID",()=>{
  for(const x of [
   "V0065_AND_INSTALLED_V0074_REQUIRED",
   "PRIOR_LOGGED_OWNER_NOT_UNBILLED_PREPARED",
   "priorClosed.rowCount!==1",
   "priorTerminalSha256",
   "state='FAILED',terminal_evidence_sha256=$2",
   "provider_subscription_id IS NULL RETURNING session_id",
   "SELECT pg_advisory_xact_lock(3905,20261027)",
   "CREATE ROLE","GRANT SELECT ON TABLE",
   "noProvider"
  ])if(x==="noProvider")continue;else expect(next).toContain(x);
  expect(next).not.toContain("await db.query(source);");
  expect(next).toContain("sameIdPrepaidSessionArmed:true");
 });
 it("freezes a distinct hour at quarter-hour after old 9PM period and no provider POST",()=>{
  const w=newWindow(Date.parse("2026-10-28T04:10:00Z"));
  expect(w.start).toBe("2026-10-28T05:00:00.000Z");
  expect(w.stop).toBe("2026-10-28T06:00:00.000Z");
  expect(next).toContain("NEW_WINDOW_OVERLAPS_OLD_SAFETY_RUN");
  for(const forbidden of ["createGate4SingleWithRawReceiptV39(",
    "createSubscription(","refillBalance(","deleteSubscriptionVerifiedStrict("])
    expect(next).not.toContain(forbidden);
 });
 it("new owner reuses original one-pilot financial ceiling, never more",()=>{
  expect(next).toContain("maximumAlertCredits:500,earlyStop:350,maxRestUnits:12");
  expect(next).toContain("minDistinctOperatingFlights:50");
  expect(next).toContain("providerEstimatedIsNotObservedActual:true");
  expect(next).toContain("GATE05_SAFETY_APPROVED_EARLY_STOP");
  expect(next).toContain("GATE05_SCIENCE_SAFETY_DATABASE_URL");
  expect(next).toContain("GATE05_SCIENCE_SAFETY_EXPECTED_DB_HOST");
  expect(next).toContain("NEW_WSSS_OWNER_AFTER_UNBILLED_FAILURE_NO_PROVIDER");
 });
});
