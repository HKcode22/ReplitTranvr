/**
 * November 7 G5A provider-quota READ ONLY preflight, operator dispatched.
 * May GET the documented free /subscriptions/balance endpoint only.
 * No FIDS GET, subscription writes, alerts, DB writes, flight content,
 * automatic paid follow-up, workflow schedule or changes to frozen cohort.
 */
import {execFileSync} from "node:child_process";
import {getBalanceEvidenceStrict} from "../server/lib/disruption/aerodataboxLimiter_v3";

const REPO="HKcode22/ReplitTranvr";
const WORKFLOW=".github/workflows/phase4-gate5-g5a-nov07-free-balance-readiness-no-provider.yml";
const NAME="Phase4 Gate5 G5A Nov7 Free Provider Balance Preflight (No Paid)";
export const G5A_NOV07_INTERNAL_PROJECT_CAP_V39=24 as const;
function hold(code:string):never{throw Error("G5A_NOV07_FREE_BALANCE_"+code+"_HOLD")}
export function assessG5ANov07ProviderQuotaV39(q:{
 apiUnitsRemaining:number;requestsRemaining:number;observedAtUtc:string
},now:number){
 if(!q||![q.apiUnitsRemaining,q.requestsRemaining].every(
  x=>Number.isSafeInteger(x)&&x>=0)
  ||!Number.isFinite(Date.parse(q.observedAtUtc))||!Number.isFinite(now))
  hold("QUOTA_METADATA_INVALID");
 const observed=Date.parse(q.observedAtUtc);
 if(Math.abs(now-observed)>30_000)hold("QUOTA_STALE");
 return {
  quotaMetadataFresh:true,
  twentyFourUnitInternalBudgetCanFitProviderQuota:
   q.apiUnitsRemaining>=G5A_NOV07_INTERNAL_PROJECT_CAP_V39,
  sourceAndPostRequestAllowanceAdequate:q.requestsRemaining>=12
 };
}
export async function main(){
 const e=process.env;
 const git=execFileSync("git",["rev-parse","HEAD"],
  {encoding:"utf8",timeout:4000}).trim();
 if(e.GITHUB_ACTIONS!=="true"||
    e.GITHUB_REPOSITORY!==REPO||
    e.GITHUB_REF!=="refs/heads/main"||
    e.GITHUB_SHA!==git||
    e.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    e.GITHUB_WORKFLOW!==NAME||
    e.GITHUB_WORKFLOW_REF!==REPO+"/"+WORKFLOW+"@refs/heads/main"||
    e.GITHUB_JOB!=="quota-readonly"||
    !e.AERODATABOX_API_KEY||
    !!e.RAPIDAPI_KEY||
    !!e.DATABASE_URL||!!e.V39_DATABASE_RUNTIME_URL||
    !!e.P4_G5_SOURCE_OWNER_DATABASE_URL||
    !!e.GATE05_AUTOMATION_DATABASE_URL||
    !!e.P4_G5_G5A_NOV07_AUDIT_DATABASE_URL||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"
 )hold("PROTECTED_MANUAL_MAIN_CONTEXT");
 const evidence=await getBalanceEvidenceStrict();
 const {apiUnitsRemaining,requestsRemaining,observedAtUtc,
 apiUnitsResetAtUtc}=evidence.quota;
 const flags=assessG5ANov07ProviderQuotaV39(
  {apiUnitsRemaining,requestsRemaining,observedAtUtc},Date.now());
 const result={
  status:flags.twentyFourUnitInternalBudgetCanFitProviderQuota&&
   flags.sourceAndPostRequestAllowanceAdequate?
   "G5A_NOV07_FREE_PROVIDER_QUOTA_CURRENTLY_SUFFICIENT":
   "G5A_NOV07_FREE_PROVIDER_QUOTA_INSUFFICIENT_HOLD",
  ...flags,internalProjectUnitCeiling:G5A_NOV07_INTERNAL_PROJECT_CAP_V39,
  providerReportedApiUnitsRemaining:apiUnitsRemaining,
  providerReportedRequestsRemaining:requestsRemaining,
  providerReportedUnitsResetAtUtc:apiUnitsResetAtUtc,
  observedAtUtc,
  providerPaidFidsRequests:0,productionDatabaseWrites:0,
  originalResponseEvidenceVerified:false,scientificGate5Passed:false,
  futureQuotaOrProviderRequestGuaranteed:false
 };
 console.log(JSON.stringify(result));
 if(result.status!=="G5A_NOV07_FREE_PROVIDER_QUOTA_CURRENTLY_SUFFICIENT")
  process.exitCode=2;
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_nov07_free_balance_readiness_no_provider.ts"))
 void main().catch(err=>{
  const msg=err instanceof Error?err.message:"";
  console.error(JSON.stringify({
   status:/^G5A_NOV07_FREE_BALANCE_[A-Z0-9_]+_HOLD$/.test(msg)?
    msg:"G5A_NOV07_FREE_BALANCE_UNVERIFIED_PROVIDER_RESPONSE_HOLD",
   paidProviderFidsRequests:0,productionDatabaseWrites:0,
   providerReportedUnitsRemaining:"UNKNOWN",scientificGate5Passed:false
  }));
  process.exitCode=2;
 });
