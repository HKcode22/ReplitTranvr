import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 classifyGate4PublicRuntimeV39,fetchGate4PublicHealthV39
} from "../scripts/v39_gate4_next3_live_6plus6_observer_v39";
import {
 advanceGate4CallbackObservationV39,
 initialGate4CallbackObservationStateV39
} from "../server/lib/disruption/gate4CallbackHealthSixPlusSix_v39";

const runtime={
 status:"PASS",git_head:"5878b90eed04b2edfe2b226735ff0f02d9be25f3",
 published_deployment:true,prepaid_route_registered:true,
 gate4_alert_ingress_registered:true
};
describe("Gate4 NEXT3 live 6+6 public observer no provider",()=>{
 it("accepts exact current public runtime/source and preserved routes",()=>{
  const h=classifyGate4PublicRuntimeV39(200,runtime,34,"ok");
  expect(h).toMatchObject({
   healthy:true,check:"all_checks",reason:"ok",http_status:200
  });
 });
 it("missing Gate4 source or prepaid route is a hard failure, not 180s grace",()=>{
  for(const invalid of [
   {...runtime,git_head:"a".repeat(40)},
   {...runtime,prepaid_route_registered:false},
   {...runtime,gate4_alert_ingress_registered:false}
  ]){
   const h=classifyGate4PublicRuntimeV39(200,invalid,12,"ok");
   const r=advanceGate4CallbackObservationV39(
    initialGate4CallbackObservationStateV39(),h,0);
   expect(r).toMatchObject({
    action:"STOP_OWNER",reason:"HARD_CALLBACK_CONTRACT_OR_IDENTITY_VIOLATION",
    scientificPassAuthorized:false,paidLaunchAuthorized:false
   });
  }
 });
 it("three ordinary transient 503 observations do NOT stop; six plus six",()=>{
  let state=initialGate4CallbackObservationStateV39();
  for(let i=0;i<12;i++){
   const h=classifyGate4PublicRuntimeV39(503,null,50,"ok");
   const r=advanceGate4CallbackObservationV39(state,h,i*15_000);
   state=r.state;
   if(i<11)expect(r.action).toBe("MONITOR");
   if(i>=6&&i<11)expect(r.phase).toBe("CONTINGENT");
   if(i===11)expect(r).toMatchObject({
    action:"STOP_OWNER",reason:"TWELVE_CONSECUTIVE_HEALTH_FAILURES"
   });
  }
 });
 it("timeout and network error stay transient; HTTP404 is hard",()=>{
  expect(classifyGate4PublicRuntimeV39(null,null,8000,"timeout"))
   .toMatchObject({healthy:false,reason:"request_timeout",http_status:null});
  expect(classifyGate4PublicRuntimeV39(null,null,125,"network"))
   .toMatchObject({healthy:false,reason:"network_or_request_error"});
  const r=advanceGate4CallbackObservationV39(
   initialGate4CallbackObservationStateV39(),
   classifyGate4PublicRuntimeV39(404,null,30,"ok"),0);
  expect(r.action).toBe("STOP_OWNER");
 });
 it("real GET function requests ONLY static known health path",async()=>{
  let n=0;let reqUrl="",opts:any;
  const fake=async(url:string,config:any)=>{
   n++;reqUrl=url;opts=config;
   return {status:200,json:async()=>runtime};
  };
  const r=await fetchGate4PublicHealthV39(fake as any);
  expect(n).toBe(1);
  expect(reqUrl).toBe("https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime");
  expect(opts.method).toBe("GET");
  expect(opts.redirect).toBe("error");
  expect(r.healthy).toBe(true);
 });
 it("operational source cannot query AeroDataBox, credit balances or mutate provider",()=>{
  const source=readFileSync(new URL(
   "../scripts/v39_gate4_next3_live_6plus6_observer_v39.ts",
   import.meta.url),"utf8");
  expect(source).toContain("advanceGate4CallbackObservationV39");
  expect(source).toContain("GATE4_CALLBACK_POLL_MS_V39");
  expect(source).toContain("actualProviderStopExecuted:false");
  expect(source).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(source).not.toContain("deleteSubscriptionVerifiedStrict");
  expect(source).not.toContain("AERODATABOX_API_KEY");
  expect(source).not.toContain("refillBalance(");
  expect(source).not.toContain("postgresql://");
 });
});
