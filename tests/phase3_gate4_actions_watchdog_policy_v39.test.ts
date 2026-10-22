import {describe,it,expect} from "vitest";
import {decideGate4ActionsTickV39,reviewGate4ActionsWatchScopeV39} from
 "../server/lib/disruption/gate4ActionsWatchdogPolicy_v39";
import type {WebhookSubscription} from "../server/lib/disruption/aerodataboxLimiter_v3";
const scope={
 scopeId:"11111111-2222-3333-4444-555555555555",
 sourceCommit:"a".repeat(40),authorizationSha256:"b".repeat(64),
 airportIcao:"WSSS",
 startUtc:"2026-10-22T20:00:00.000Z",
 stopUtc:"2026-10-22T20:10:00.000Z",
 observedStartingCredits:2037,softCreditTarget:20,
 protectedCreditFloor:1000
};
const owner:WebhookSubscription={
 id:"exactID99",isActive:true,billingType:"CreditBased",
 subject:{type:"FlightByAirportIcao",id:"WSSS"}
};
const tick=(now="2026-10-22T20:05:00.000Z",
 credits:number|null=2037,
 active:WebhookSubscription[]|null=[owner],
 id:string|null="exactID99")=>
 decideGate4ActionsTickV39(scope,now,credits,active,id);
describe("Gate4 GitHub Actions continuous runner supervision policy (offline)",()=>{
 it("valid small scope has explicit no-hard-cap status",()=>{
  expect(reviewGate4ActionsWatchScopeV39(scope)).toBe(true);
  expect(tick()).toMatchObject({
    action:"WATCH",hardProviderCreditCap:false,
    providerCreates:0,phase6Starts:0
  });
 });
 it("one known exact ID goes STOP on deadline",()=>{
  expect(tick("2026-10-22T20:10:00.000Z")).toMatchObject({
   action:"STOP_EXACT_OWNED",reason:"HARD_TIME_DEADLINE",exactOwnedId:"exactID99"
  });
 });
 it("20 consumed credits request early STOP, not guaranteed provider cap",()=>{
  expect(tick("2026-10-22T20:03:00.000Z",2017)).toMatchObject({
   action:"STOP_EXACT_OWNED",trialCreditsConsumed:20,
   hardProviderCreditCap:false
  });
 });
 it("protected floor triggers STOP even if soft target not reached",()=>{
  const unsafe={...scope,observedStartingCredits:1021,softCreditTarget:20};
  const v=decideGate4ActionsTickV39(unsafe,
   "2026-10-22T20:02:00.000Z",1000,[owner],"exactID99");
  expect(v.action).toBe("STOP_EXACT_OWNED");
 });
 it("unexpected billable owner cannot be inferred from airport",()=>{
  expect(tick("2026-10-22T20:02:00.000Z",2037,[owner],null)).toMatchObject({
    action:"HOLD_UNOWNED_ACTIVE",exactOwnedId:null
  });
 });
 it("no owner precreate stays WATCH, but expired window HOLDs",()=>{
  expect(tick("2026-10-22T20:02:00.000Z",2037,[],null).action).toBe("WATCH");
  expect(tick("2026-10-22T20:11:00.000Z",2037,[],null).action).toBe("HOLD");
 });
 it("foreign active billable is never deleted or mistaken for owner",()=>{
  const foreign={...owner,id:"foreignID"};
  expect(tick("2026-10-22T20:11:00.000Z",1999,[foreign])).toMatchObject({
    action:"HOLD",exactOwnedId:null
  });
 });
 it("changed airport, malformed inventory and duplicate provider ID HOLD",()=>{
  expect(tick("2026-10-22T20:11:00.000Z",2037,
    [{...owner,subject:{type:"FlightByAirportIcao",id:"KLAX"}}]).action
  ).toBe("HOLD");
  expect(tick("2026-10-22T20:11:00.000Z",2037,null).action).toBe("HOLD");
  expect(tick("2026-10-22T20:11:00.000Z",2037,
   [owner,owner]).action).toBe("HOLD");
 });
 it("unexpected balance data does not become successful zero",()=>{
   expect(tick("2026-10-22T20:11:00.000Z",null).action).toBe("HOLD");
 });
 it("stops exact owner early when another unrelated billable is active",()=>{
  const foreign={...owner,id:"foreignID"};
  const v=tick("2026-10-22T20:04:00.000Z",2037,[owner,foreign]);
  expect(v).toMatchObject({
    action:"STOP_EXACT_OWNED",
    reason:"UNRELATED_ACTIVE_BILLABLE_STOP_OWNED",
    exactOwnedId:"exactID99"
  });
  expect(v.exactOwnedId).not.toBe("foreignID");
 });
 it("premature active subscription is stopped before approved UTC start",()=>{
  expect(tick("2026-10-22T19:59:00.000Z")).toMatchObject({
    action:"STOP_EXACT_OWNED",
    reason:"ACTIVE_OWNED_BEFORE_APPROVED_START"
  });
 });
 it("same owner no longer active is a settlement HOLD, not a success state",()=>{
  expect(tick("2026-10-22T20:11:00.000Z",2030,[])).toMatchObject({
    action:"HOLD",
    reason:"OWNED_ID_NOT_ACTIVE_SETTLEMENT_UNPROVEN",
    hardProviderCreditCap:false
  });
 });
 it("unexplained account credit increase refuses to rebase the budget",()=>{
  expect(tick("2026-10-22T20:03:00.000Z",2038)).toMatchObject({
    action:"HOLD",
    reason:"UNEXPECTED_ACCOUNT_CREDIT_INCREASE",
    trialCreditsConsumed:null
  });
 });
 it("a malformed strict LIST row is not silently treated as inactive",()=>{
  expect(tick("2026-10-22T20:03:00.000Z",2037,
    [null] as unknown as WebhookSubscription[])).toMatchObject({
      action:"HOLD",reason:"STRICT_INVENTORY_ROW_MALFORMED"
    });
 });
 it("credits spent before positively recorded provider ID require immediate HOLD",()=>{
  expect(tick("2026-10-22T20:03:00.000Z",2030,[],null)).toMatchObject({
    action:"HOLD",reason:"SPEND_WITHOUT_OWNED_ID",
    exactOwnedId:null
  });
 });
 it("window longer than two hours is rejected",()=>{
  expect(reviewGate4ActionsWatchScopeV39({
    ...scope,stopUtc:"2026-10-22T22:01:00.000Z"
  })).toBe(false);
 });
});
