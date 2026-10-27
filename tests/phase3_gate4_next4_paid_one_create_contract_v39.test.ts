import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
const operator=readFileSync("scripts/v39_gate4_next4_one_paid_trial_v39.ts","utf8");
const wrapper=readFileSync("scripts/v39_gate4_next4_paid_one_command_v39.sh","utf8");
const observer=readFileSync("scripts/v39_gate4_next4_live_health_observer_v39.ts","utf8");
const watcher=readFileSync(".github/workflows/phase3-gate4-next4-live-health.yml","utf8");
describe("NEXT4 genuine one-shot paid trial: no scope replay",()=>{
 it("requires independently ARMED stop plus in-progress observer before provider CREATE",()=>{
  expect(operator).toContain("next3StopArmedV39(scope,runner,stopId)");
  expect(operator).toContain("healthIsRunning(healthId,runner)");
  expect(operator).toContain('hold("GITHUB_STOP_OR_OBSERVER_NOT_ARMED")');
  expect(operator.indexOf('if(!armed)hold("GITHUB_STOP_OR_OBSERVER_NOT_ARMED")'))
   .toBeLessThan(operator.indexOf("const result=await runGate4OnePositiveOwnerV39"));
  expect(operator).toContain("reserveOneShotImmediatelyBeforeCreate");
  expect(operator).toContain('await putOnce(s,INTENT_KEY');
  expect(operator).toContain("neverSecondCreate:true");
  expect(operator).toContain("createGate4SingleWithRawReceiptV39");
  expect(operator).toContain('maxDeliveryRetries:0');
  expect(operator).toContain('deleteSubscriptionVerifiedStrict');
  expect(operator).toContain("signedTicket(r,signer!,scope)");
  expect(operator).toContain("ONE_AERODATABOX_CREATE_TRANSPORT");
  expect(operator).not.toContain("next3LoadPrivateV39(");
  expect(operator).not.toContain("NEXT3_SCOPE_V39");
 });
 it("pins source, WSSS, soft credit target and financial floor",()=>{
  expect(operator).toContain('SOURCE' .replace('SOURCE','SRC')); // const reviewed SHA pin
  expect(operator).toContain('SRC="1885703c04ba8f24bf8d1183f873eb86d1f83d7c"');
  expect(operator).toContain('airportIcao:"WSSS"');
  expect(operator).toContain('airport_icao:"WSSS"');
  expect(operator).toContain("softCreditTarget:5,protectedCreditFloor:1900");
  expect(operator).toContain("balance<1905");
  expect(operator).toContain('GO="OWNER_APPROVED_ONE_NEXT4_WSSS_TRIAL_SOFT5_FLOOR1900_WITH_BURST_RISK"');
  expect(operator).toContain("protectedPins({");
  expect(operator).toContain("GATE4_SAFETY_APPROVED_SIGNER_SPKI_SHA256:signer.spki");
  expect(operator).toContain('await putOnce(s,PLAN_KEY');
  expect(operator).toContain('await putOnce(s,POSITIVE_KEY');
  expect(operator).toContain("threeBalanceReadingsStable:settled");
  expect(operator).toContain("originalRowsMatchingPositiveProviderId:matched");
 });
 it("keeps monitored published callback-only source unchanged",()=>{
  expect(wrapper).toContain("V39_BUILD_GIT_HEAD");
  expect(wrapper).toContain("--verify-only");
  expect(wrapper).toContain("git merge --ff-only FETCH_HEAD");
  expect(wrapper).toContain("gh auth status");
  expect(observer).toContain("method:\"GET\"");
  expect(observer).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(watcher).toContain("WATCH_NEXT4_NO_PROVIDER_6PLUS6");
  expect(watcher).toContain('AERODATABOX_API_KEY: ""');
  expect(watcher).toContain("environment: gate4-safety");
 });
});
