/**
 * Gate3 callback-health extension uses the SAME effective 6 PRIMARY + 6
 * CONTINGENCY 15-second supervisor state machine as Phase2G, not legacy three.
 *
 * Provider webhook delivery maxDeliveryRetries:0 and AeroDataBox HTTP
 * GET 429 retry policy are INDEPENDENT knobs, never a justification to
 * issue another paid CREATE. Published health proves no notification
 * completeness; source/credit scientific audit remains independently due.
 */
import {createHmac} from "node:crypto";
import {
  advanceStage1WatchdogV39,initialStage1WatchdogStateV39,
  STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39,
  STAGE1_WATCHDOG_POLL_MS_V39,
  STAGE1_SIX_PLUS_SIX_WALL_MS_V39,
  type Stage1WatchdogStateV39,
  type Stage1SanitizedCallbackHealthV39,
} from "../../../scripts/v39_phase2g_stage1_watchdog_6plus6_policy_v39";

export const GATE3_CALLBACK_POLL_MS_V39=STAGE1_WATCHDOG_POLL_MS_V39;
export const GATE3_CALLBACK_MAX_CHECKS_V39=STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39;
export const GATE3_CALLBACK_WALL_MS_V39=STAGE1_SIX_PLUS_SIX_WALL_MS_V39;
export const GATE3_CALLBACK_POLICY_V39="six-plus-six" as const;
export type Gate3CallbackHealthStateV39=Stage1WatchdogStateV39;
export const initialGate3CallbackHealthStateV39=initialStage1WatchdogStateV39;
export function advanceGate3CallbackHealthV39(
 previous:Gate3CallbackHealthStateV39,
 health:Stage1SanitizedCallbackHealthV39,
 nowMonotonicMs:number
){
 return advanceStage1WatchdogV39({
   mode:GATE3_CALLBACK_POLICY_V39,previous,health,nowMonotonicMs,
   evidence:undefined // Never invent sender delivery provenance.
 });
}
const BASE="https://replit-tranvr--hk84164.replit.app";
const HEAD=/^[a-f0-9]{40}$/;
export async function checkGate3PublishedCallbackHealthV39(
  expectedHead:string,
  fetchImpl:typeof fetch=fetch,
):Promise<Stage1SanitizedCallbackHealthV39>{
 const started=Date.now();
 let check="wrong_secret_route";
 const result=(healthy:boolean,reason:string,http_status:number|null=null):
  Stage1SanitizedCallbackHealthV39=>({
    healthy,check:healthy?"all_checks":check,
    reason,http_status,elapsed_ms:Date.now()-started
  });
 if(!HEAD.test(expectedHead))
  return result(false,"invalid_expected_source_head");
 try{
   const wrong="phase2g-healthcheck-intentionally-wrong";
   const sid="00000000-0000-4000-8000-000000000000";
   const denied=await fetchImpl(
     `${BASE}/api/v1/webhooks/aerodatabox/${encodeURIComponent(wrong)}/prepaid/${sid}`,{
       method:"POST",headers:{
         accept:"application/json","content-type":"application/json"
       },body:"{}",signal:AbortSignal.timeout(8000)
     });
   const rejected:any=await denied.json().catch(()=>null);
   if(denied.status!==404||rejected?.error!=="Not found")
      return result(false,"route_contract_mismatch",denied.status);

   check="published_runtime";
   const probe=await fetchImpl(`${BASE}/__v39/workspace-runtime`,{
     headers:{accept:"application/json"},signal:AbortSignal.timeout(8000)
   });
   const runtime:any=await probe.json().catch(()=>null);
   if(probe.status!==200||
      runtime?.schema!=="v39.phase2f-workspace-runtime.v1"||
      runtime?.status!=="PASS"||
      runtime?.git_head!==expectedHead||
      runtime?.prepaid_route_registered!==true||
      runtime?.prepaid_source_custody_ready!==true||
      Number(runtime?.retention_hours)!==168||
      runtime?.provider_mutation!==false||
      runtime?.runtime_owner_mode!=="replit-published-deployment"||
      runtime?.managed_replit_workflow!==false||
      runtime?.published_deployment!==true||
      !["autoscale","reserved-vm"].includes(
        String(runtime?.runtime_durability_class??"").toLowerCase()))
      return result(false,"runtime_contract_or_http_mismatch",probe.status);

   check="webhook_secret_binding";
   const secret=process.env.AERODATABOX_WEBHOOK_SECRET;
   const db=process.env.V39_DATABASE_RUNTIME_URL;
   if(!secret||!db)return result(false,"missing_github_binding_environment");
   const sr=await fetchImpl(`${BASE}/__v39/phase2g/webhook-secret-match`,{
     method:"POST",headers:{
       accept:"application/json","x-v39-phase2g-webhook-secret":secret
     },signal:AbortSignal.timeout(8000)
   });
   const secretBody:any=await sr.json().catch(()=>null);
   if(sr.status!==200||
      secretBody?.schema!=="v39.phase2g-webhook-secret-match.v1"||
      secretBody?.status!=="PASS"||
      secretBody?.provider_call!==false||
      secretBody?.provider_mutation!==false||
      Number(secretBody?.alert_credits_spent)!==0)
     return result(false,"secret_binding_contract_or_http_mismatch",sr.status);

   check="runtime_db_binding";
   const challenge=`gate3-health-${process.pid}-${Date.now()}-${expectedHead}`;
   const proof=createHmac("sha256",db)
     .update(`phase2g-db-binding:${challenge}`).digest("hex");
   const dr=await fetchImpl(`${BASE}/__v39/phase2g/runtime-db-binding`,{
     method:"POST",headers:{
       accept:"application/json",
       "x-v39-phase2g-db-challenge":challenge,
       "x-v39-phase2g-db-proof":proof
     },signal:AbortSignal.timeout(8000)
   });
   const proofBody:any=await dr.json().catch(()=>null);
   if(dr.status!==200||
      proofBody?.schema!=="v39.phase2g-runtime-db-binding.v1"||
      proofBody?.status!=="PASS"||
      proofBody?.provider_call!==false||
      proofBody?.provider_mutation!==false||
      proofBody?.database_mutation!==false||
      Number(proofBody?.alert_credits_spent)!==0)
     return result(false,"database_binding_contract_or_http_mismatch",dr.status);
   return result(true,"ok",200);
 }catch(e){
   const name=e instanceof Error?e.name:"";
   return result(false,
     name==="AbortError"||name==="TimeoutError"
       ?"request_timeout":"network_or_request_error");
 }
}
