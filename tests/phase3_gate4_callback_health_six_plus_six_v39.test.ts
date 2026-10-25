import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 advanceGate4CallbackObservationV39,
 initialGate4CallbackObservationStateV39,
 GATE4_CALLBACK_PRIMARY_CHECKS_V39,
 GATE4_CALLBACK_BACKUP_CHECKS_V39,
 GATE4_CALLBACK_MAX_CHECKS_V39,
 GATE4_CALLBACK_POLL_MS_V39,
 GATE4_CALLBACK_MAX_WALL_MS_V39,
 GATE4_PROVIDER_PAID_REDELIVERY_RETRIES_V39
} from "../server/lib/disruption/gate4CallbackHealthSixPlusSix_v39";

const transient={
 healthy:false,check:"published_runtime",
 reason:"runtime_contract_or_http_mismatch",
 http_status:503,elapsed_ms:65
} as const;
const good={
 healthy:true,check:"all_checks",reason:"ok",http_status:200,elapsed_ms:90
} as const;

describe("Gate4 proposed 6+6 hosted callback observer — NOT paid provider retries",()=>{
 it("inherits 6+6 at 15 sec with a 180s upper wall boundary",()=>{
  expect(GATE4_CALLBACK_PRIMARY_CHECKS_V39).toBe(6);
  expect(GATE4_CALLBACK_BACKUP_CHECKS_V39).toBe(6);
  expect(GATE4_CALLBACK_MAX_CHECKS_V39).toBe(12);
  expect(GATE4_CALLBACK_POLL_MS_V39).toBe(15_000);
  expect(GATE4_CALLBACK_MAX_WALL_MS_V39).toBe(180_000);
  // Provider's independently billed maxDeliveryRetries=0 (API permits 0..2);
  // 6+6 has NEVER meant 12 provider POST attempts.
  expect(GATE4_PROVIDER_PAID_REDELIVERY_RETRIES_V39).toBe(0);
 });
 it("does not stop after 3 transient 503s; 6 primary then 6 backup",()=>{
  let state=initialGate4CallbackObservationStateV39();
  let last;
  for(let i=0;i<12;i++){
   last=advanceGate4CallbackObservationV39(state,transient,i*15_000);
   state=last.state;
   if(i<11) expect(last.action).toBe("MONITOR");
   if(i<6)expect(last.phase).toBe("PRIMARY");
   else if(i<11)expect(last.phase).toBe("CONTINGENT");
   expect(last.paidLaunchAuthorized).toBe(false);
   expect(last.scientificPassAuthorized).toBe(false);
  }
  expect(last).toMatchObject({
   action:"STOP_OWNER",phase:"TERMINATED",
   reason:"TWELVE_CONSECUTIVE_HEALTH_FAILURES"
  });
 });
 it("hard source/contract error does not get 12 checks of grace",()=>{
  const result=advanceGate4CallbackObservationV39(
   initialGate4CallbackObservationStateV39(),
   {...transient,http_status:200},0
  );
  expect(result).toMatchObject({
   action:"STOP_OWNER",reason:"HARD_CALLBACK_CONTRACT_OR_IDENTITY_VIOLATION"
  });
 });
 it("recovery after a transient outage needs two healthy polls; still no science PASS",()=>{
  let state=initialGate4CallbackObservationStateV39();
  for(let i=0;i<5;i++){
   const d=advanceGate4CallbackObservationV39(state,transient,i*15_000);
   state=d.state;
  }
  const first=advanceGate4CallbackObservationV39(state,good,75_000);
  expect(first).toMatchObject({
   action:"MONITOR",phase:"RECOVERING",
   reason:"FIRST_HEALTHY_POLL_CONFIRMATION_PENDING",
   state:{consecutiveFailures:5,recoveredHealthAwaitingScienceAudit:true}
  });
  const second=advanceGate4CallbackObservationV39(first.state,good,90_000);
  expect(second).toMatchObject({
   action:"MONITOR",phase:"HEALTHY",
   state:{consecutiveFailures:0,recoveredHealthAwaitingScienceAudit:true},
   paidLaunchAuthorized:false,scientificPassAuthorized:false
  });
 });
 it("independent 5 second exact STOP still uses amount/time triggers",async()=>{
  const {decideGate4ActionsTickV39}=await import(
   "../server/lib/disruption/gate4ActionsWatchdogPolicy_v39");
  const now="2026-10-25T02:00:00.000Z";
  const scope={
   scopeId:"16f819c6-7c68-4d5a-82cf-3820e9294dc7",
   sourceCommit:"087dc948c29d004f88eca141e1fc8e83c2844e3f",
   authorizationSha256:"b".repeat(64),airportIcao:"WSSS",
   startUtc:"2026-10-25T01:59:00.000Z",
   stopUtc:"2026-10-25T02:10:00.000Z",
   observedStartingCredits:1991,softCreditTarget:5,protectedCreditFloor:1900
  };
  const id="test_provider_id";
  const list=[{id,isActive:true,billingType:"CreditBased" as const,
   subject:{type:"FlightByAirportIcao",id:"WSSS"}}];
  const result=decideGate4ActionsTickV39(
    scope,now,1986,list,id);
  expect(result).toMatchObject({
   action:"STOP_EXACT_OWNED",reason:"SOFT_BALANCE_LIMIT_REACHED"
  });
  const wrong=decideGate4ActionsTickV39(
   scope,now,1990,list,null);
  expect(wrong).toMatchObject({action:"HOLD_UNOWNED_ACTIVE"});
 });
 it("observer is PURE and does not touch provider retry, STOP worker or deployment",()=>{
  const src=readFileSync(new URL(
   "../server/lib/disruption/gate4CallbackHealthSixPlusSix_v39.ts",
   import.meta.url),"utf8");
  expect(src).toContain('mode:GATE4_CALLBACK_POLICY_V39');
  expect(src).toContain('evidence:undefined');
  expect(src).not.toContain('createGate4SingleWithRawReceiptV39');
  expect(src).not.toContain('deleteSubscriptionVerifiedStrict(');
  expect(src).not.toContain('refillBalance(');
 });
});
