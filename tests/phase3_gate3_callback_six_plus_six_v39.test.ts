import {afterEach,describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {
  GATE3_CALLBACK_POLICY_V39,GATE3_CALLBACK_POLL_MS_V39,
  GATE3_CALLBACK_MAX_CHECKS_V39,GATE3_CALLBACK_WALL_MS_V39,
  initialGate3CallbackHealthStateV39,advanceGate3CallbackHealthV39,
  checkGate3PublishedCallbackHealthV39
} from "../server/lib/disruption/gate3CallbackSixPlusSix_v39";
import type {Stage1SanitizedCallbackHealthV39} from
  "../scripts/v39_phase2g_stage1_watchdog_6plus6_policy_v39";
const unhealthy:Stage1SanitizedCallbackHealthV39={
  healthy:false,check:"published_runtime",
  reason:"runtime_contract_or_http_mismatch",http_status:503,elapsed_ms:40
};
const good:Stage1SanitizedCallbackHealthV39={
  healthy:true,check:"all_checks",reason:"ok",http_status:200,elapsed_ms:30
};
const repoHead="a".repeat(40);
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
describe("Gate3 uses Phase2G six primary plus six contingency callback health checks",()=>{
 it("keeps 15s, six plus six and maximum three-minute wall, never 3",()=>{
   expect(GATE3_CALLBACK_POLICY_V39).toBe("six-plus-six");
   expect(GATE3_CALLBACK_POLL_MS_V39).toBe(15000);
   expect(GATE3_CALLBACK_MAX_CHECKS_V39).toBe(12);
   expect(GATE3_CALLBACK_WALL_MS_V39).toBe(180000);
 });
 it("6 transient 503 checks are primary, 7-11 contingency, 12 STOP",()=>{
   let state=initialGate3CallbackHealthStateV39();
   for(let i=0;i<12;i++){
     const res=advanceGate3CallbackHealthV39(state,unhealthy,i*15000);
     expect(res.scientificPassAuthorized).toBe(false);
     expect(res.paidLaunchAuthorized).toBe(false);
     if(i<6){expect(res.phase).toBe("PRIMARY");expect(res.action).toBe("MONITOR");}
     else if(i<11){expect(res.phase).toBe("CONTINGENT");expect(res.action).toBe("MONITOR");}
     else {expect(res.action).toBe("STOP_OWNER");}
     state=res.state;
   }
 });
 it("two successive full healthy checks required after outage; recovered science remains pending",()=>{
   let state=initialGate3CallbackHealthStateV39();
   for(let i=0;i<7;i++)
     state=advanceGate3CallbackHealthV39(state,unhealthy,i*15000).state;
   const first=advanceGate3CallbackHealthV39(state,good,7*15000);
   expect(first.phase).toBe("RECOVERING");
   expect(first.state.recoveryHealthyChecks).toBe(1);
   const second=advanceGate3CallbackHealthV39(first.state,good,8*15000);
   expect(second.phase).toBe("HEALTHY");
   expect(second.state.consecutiveFailures).toBe(0);
   expect(second.state.recoveredHealthAwaitingScienceAudit).toBe(true);
   expect(second.scientificPassAuthorized).toBe(false);
 });
 it("hard callback secret mismatch stops immediately rather than interpreting 6+6 as bypass",()=>{
   const bad:Stage1SanitizedCallbackHealthV39={
     healthy:false,check:"webhook_secret_binding",
     reason:"secret_binding_contract_or_http_mismatch",
     http_status:401,elapsed_ms:25
   };
   const out=advanceGate3CallbackHealthV39(
     initialGate3CallbackHealthStateV39(),bad,0);
   expect(out.action).toBe("STOP_OWNER");
   expect(out.reason).toBe("HARD_CALLBACK_CONTRACT_OR_IDENTITY_VIOLATION");
 });
 it("same four source/callback/auth/db probes without provider mutation",async()=>{
   vi.stubEnv("AERODATABOX_WEBHOOK_SECRET","test-local-secret-never-send");
   vi.stubEnv("V39_DATABASE_RUNTIME_URL","postgresql://dummy.invalid/test");
   const calls:Array<{url:string;method:string}>=[];
   const fetchMock=vi.fn(async(url:string,init:RequestInit)=>{
     calls.push({url,method:String(init?.method??"GET")});
     if(url.includes("intentionally-wrong"))
       return new Response(JSON.stringify({error:"Not found"}),{status:404});
     if(url.endsWith("/__v39/workspace-runtime"))
       return new Response(JSON.stringify({
         schema:"v39.phase2f-workspace-runtime.v1",status:"PASS",
         git_head:repoHead,prepaid_route_registered:true,
         prepaid_source_custody_ready:true,retention_hours:168,
         provider_mutation:false,runtime_owner_mode:"replit-published-deployment",
         managed_replit_workflow:false,published_deployment:true,
         runtime_durability_class:"reserved-vm"
       }),{status:200});
     if(url.endsWith("/__v39/phase2g/webhook-secret-match"))
       return new Response(JSON.stringify({
         schema:"v39.phase2g-webhook-secret-match.v1",status:"PASS",
         provider_call:false,provider_mutation:false,alert_credits_spent:0
       }),{status:200});
     if(url.endsWith("/__v39/phase2g/runtime-db-binding"))
       return new Response(JSON.stringify({
         schema:"v39.phase2g-runtime-db-binding.v1",status:"PASS",
         provider_call:false,provider_mutation:false,
         database_mutation:false,alert_credits_spent:0
       }),{status:200});
     throw Error("unexpected endpoint");
   });
   const result=await checkGate3PublishedCallbackHealthV39(
     repoHead,fetchMock as unknown as typeof fetch);
   expect(result).toMatchObject({
     healthy:true,check:"all_checks",reason:"ok",http_status:200
   });
   expect(calls).toHaveLength(4);
   expect(calls.map(c=>c.method)).toEqual(["POST","GET","POST","POST"]);
   expect(calls.every(c=>c.url.startsWith(
     "https://replit-tranvr--hk84164.replit.app/"))).toBe(true);
   expect(calls.every(c=>!c.url.includes("aerodatabox.p.rapidapi.com"))).toBe(true);
 });
 it("Gate3 owner invokes real health checks, never legacy-three or provider retry 12",()=>{
   const src=readFileSync("scripts/v39_gate3_one_wsss_operator_v39.ts","utf8");
   expect(src).toContain("checkGate3PublishedCallbackHealthV39(args.head)");
   expect(src).toContain("advanceGate3CallbackHealthV39(");
   expect(src).toContain("callbackStop=\"gate3_six_plus_six_callback_watchdog_stop\"");
   expect(src).toContain("callbackWatchdogPolicy:GATE3_CALLBACK_POLICY_V39");
   expect(src).toContain("externalStopCheck,");
   expect(src).not.toContain('"legacy-three"');
 });
});
