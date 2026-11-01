/**
 * Owner-triggered, never scheduled: ONE AeroDataBox provider-documented
 * free /subscriptions/balance GET (strict quota headers) on the historically
 * attested Replit credential. No billable FIDS, Alerts, writes, refill,
 * subscriptions, source data, or secret printing.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {
 assessP4LegacyUltraAccountRecallV39,
 P4_GATE0_HISTORICAL_PATH_V39,
 P4_P2_RETENTION_HISTORICAL_PATH_V39
} from "../server/lib/disruption/phase4Gate5LegacyUltraAccountRecall_v39";
import {getBalanceEvidenceStrict}
 from "../server/lib/disruption/aerodataboxLimiter_v3";

export async function mainP4AccountFreeAuditV39(){
 const original=JSON.parse(readFileSync(P4_GATE0_HISTORICAL_PATH_V39,"utf8"));
 const retention=JSON.parse(readFileSync(P4_P2_RETENTION_HISTORICAL_PATH_V39,"utf8"));
 // First verify documented identity/rights. An unchecked past reference may
 // not silently become a current exact entitlement or legal exception.
 assessP4LegacyUltraAccountRecallV39(original,retention);
 if(typeof process.env.AERODATABOX_API_KEY!=="string"||
    process.env.AERODATABOX_API_KEY.length<8)
  throw Error("P4_FREE_ACCOUNT_AUDIT_KEY_UNAVAILABLE_ON_REPLIT");
 const evidence=await getBalanceEvidenceStrict();
 const result=assessP4LegacyUltraAccountRecallV39(original,retention,{
  observedAtUtc:evidence.quota.observedAtUtc,
  apiUnitsLimit:evidence.quota.apiUnitsLimit,
  apiUnitsRemaining:evidence.quota.apiUnitsRemaining,
  apiUnitsResetAtUtc:evidence.quota.apiUnitsResetAtUtc,
  requestsLimit:evidence.quota.requestsLimit,
  requestsRemaining:evidence.quota.requestsRemaining,
  alertCreditsRemaining:evidence.balance.creditsRemaining
 });
 console.log(JSON.stringify(result,null,2));
 console.log("P4_ACCOUNT_FREE_QUOTA_CHECK_COMPLETE_NO_BILLABLE_PROVIDER_NO_WRITES");
}
if(process.argv[1]?.endsWith("v39_phase4_account_quota_readonly_once.ts")){
 void mainP4AccountFreeAuditV39().catch(error=>{
  // The text of an HTTP/DB/provider error may reveal request/session metadata.
  // Print only a stable class, never the API key or raw provider body.
  const msg=error instanceof Error?error.message:"";
  console.error(msg.startsWith("P4_ACCOUNT_RECALL_")||
                msg==="P4_FREE_ACCOUNT_AUDIT_KEY_UNAVAILABLE_ON_REPLIT"
    ?msg:"P4_ACCOUNT_FREE_READONLY_CHECK_HELD_NO_PROVIDER_CHARGE_INFERRED");
  process.exitCode=2;
 });
}
