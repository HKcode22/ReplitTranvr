import type {SixPlusFourHealthV39} from "./synthetic_watchdog_six_plus_four_v39";

/**
 * Test-only adapter for the *actual* sanitized callbackHealthy result from
 * scripts/v39_phase2g_stage1_logged_supervisor_v39.ts. Never used by the
 * paid owner. Capturing an HTTP status does NOT prove POST persistence.
 *
 * Fail closed on unrecognized stage/reason/status. Only timeout, network
 * and explicit 502/503/504 responses qualify for *potential* grace;
 * verified independent durable source evidence is still REQUIRED separately.
 */
export type ActualSupervisorHealthV39=Readonly<{
  healthy:boolean;
  check:string;
  reason:string;
  http_status:number|null;
  elapsed_ms:number;
}>;
const CHECKS=new Set([
  "wrong_secret_route","published_runtime",
  "webhook_secret_binding","runtime_db_binding"
]);
const ERRORS=new Set([
  "route_contract_mismatch",
  "runtime_contract_or_http_mismatch",
  "secret_binding_contract_or_http_mismatch",
  "database_binding_contract_or_http_mismatch"
]);
const STAGE_REASON:Record<string,string>={
  wrong_secret_route:"route_contract_mismatch",
  published_runtime:"runtime_contract_or_http_mismatch",
  webhook_secret_binding:"secret_binding_contract_or_http_mismatch",
  runtime_db_binding:"database_binding_contract_or_http_mismatch"
};
export function classifyActualSupervisorHealthForSixPlusFourV39(
  h:ActualSupervisorHealthV39
):SixPlusFourHealthV39{
  if(!h||typeof h.healthy!=="boolean"||
     !Number.isFinite(h.elapsed_ms)||h.elapsed_ms<0||
     typeof h.check!=="string"||typeof h.reason!=="string"||
     !(h.http_status===null||
       (Number.isSafeInteger(h.http_status)&&h.http_status>=100&&h.http_status<=599)))
    throw new Error("SUPERVISOR_SANITIZED_HEALTH_SCHEMA_INVALID");
  if(h.healthy){
    if(h.check!=="all_checks"||h.reason!=="ok"||h.http_status!==200)
      return "webhook_contract_violation";
    return "healthy";
  }
  if(!CHECKS.has(h.check))return "webhook_contract_violation";
  if(h.reason==="request_timeout"&&h.http_status===null)
    return "transient_timeout";
  if(h.reason==="network_or_request_error"&&h.http_status===null)
    return "transient_network_error";
  if(h.reason==="missing_github_binding_environment"||
     h.reason==="invalid_callback_mode")
    return "wrong_subscriber_owner";
  if(ERRORS.has(h.reason)&&STAGE_REASON[h.check]===h.reason){
    // 5xx at the gateway does not prove a wrong secret/build; do not
    // automatically stop an evidence-backed outage on HTTP 503.
    if([502,503,504].includes(h.http_status??0))
      return "transient_http_502_503_504";
    // A *200 response with bad schema* is not transient downtime.
    if(h.check==="published_runtime")return "wrong_build";
    if(h.check==="webhook_secret_binding")return "bad_secret";
    if(h.check==="runtime_db_binding")return "db_identity_or_lifecycle_violation";
    return "webhook_contract_violation";
  }
  return "webhook_contract_violation";
}
