/**
 * Gate3 actual pre-exposure OWNER STAGE: authentic PUBLIC HOST GET +
 * strict read-only provider account inventory + one ledger-bound source.
 *
 * This is NOT a paid owner. No subscription CREATE/DELETE, no callback POST
 * and no provider credit spend. Calling it against live accounts still
 * requires a separately reviewed operator-approved preflight scope.
 *
 * All trust-bearing observations are collected here from the real network
 * / current checkout, NOT supplied as caller boolean "verified" flags.
 * Injected transports are for no-provider deterministic tests; outputs are
 * NEVER a signed, deployable paid authorization certificate.
 */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import type {Pool} from "pg";
import {
  getBalanceEvidenceStrict,listSubscriptionsStrictWithRetry,
  type StrictBalanceEvidence,type WebhookSubscription,
} from "./aerodataboxLimiter_v3";
import {
  reviewGate3LedgerBoundPreparationV39,
  prepareGate3LedgerBoundSessionV39,
  type Gate3LedgerBoundPreparationInputV39,
  type Gate3LedgerBoundPreparedV39,
} from "./gate3LedgerBoundSessionPreparation_v39";

const PUBLISHED="https://replit-tranvr--hk84164.replit.app";
const GIT_SHA=/^[a-f0-9]{40}$/;
const MIN_GATE3_PREFLIGHT_BALANCE=1500;
const PROTECTED_FLOOR_AFTER_EXPOSURE=1000;

export type Gate3OwnedPreExposureInputV39=Gate3LedgerBoundPreparationInputV39 & Readonly<{
  expectedPublishedGitHead:string;
}>;
export type Gate3OwnedPreExposureEvidenceV39=Gate3LedgerBoundPreparedV39 & Readonly<{
  stage:"REAL_HOST_AND_ACCOUNT_READS_SOURCE_PREPARED_ONLY";
  publicHostGetVerified:true;
  publicReceiverPrepaidRouteVerified:true;
  providerReadOnlyBalanceAndInventoryChecked:true;
  activeBillableSubscriptions:0;
  protectedCreditFloorSatisfied:true;
  liveSignedCallbackShaReadbackVerified:false;
  humanPaidAuthorizationVerified:false;
  paidCanaryCertified:false;
  providerSubscriptionCreatedHere:false;
  /**
   * Sensitive account starting credit balance IN PROCESS MEMORY ONLY.
   * Never serialize this owner result to GitHub logs/durable SQL/Blob.
   * Required by actual prepaid runner to compute exact billed SEND delta.
   */
  balanceBeforeInMemory:number;
}>;
export type Gate3OwnerPreExposureDepsV39=Readonly<{
  fetchImpl?:typeof fetch;
  getBalanceEvidence?:()=>Promise<StrictBalanceEvidence>;
  getSubscriptions?:()=>Promise<WebhookSubscription[]>;
}>;

/** Strictly retrieve the REAL published host runtime status; never POST. */
export async function verifyGate3PublishedPrepaidHostV39(
  expectedPublishedGitHead:string,fetchImpl:typeof fetch=fetch,
):Promise<void>{
  if(!GIT_SHA.test(expectedPublishedGitHead))
    throw Error("GATE3_OWNER_PUBLISHED_HEAD_NOT_PINNED_HOLD");
  let response:Response;
  try {
    response=await fetchImpl(PUBLISHED+"/__v39/workspace-runtime",{
      method:"GET",
      headers:{accept:"application/json"},
      signal:AbortSignal.timeout(8000),
    });
  }catch{
    throw Error("GATE3_OWNER_PUBLISHED_HOST_GET_UNAVAILABLE_HOLD");
  }
  let data:Record<string,unknown>|null=null;
  try {
    const raw:unknown=await response.json();
    if(raw&&typeof raw==="object"&&!Array.isArray(raw))
      data=raw as Record<string,unknown>;
  }catch{}
  if(response.status!==200||!data||
     data.schema!=="v39.phase2f-workspace-runtime.v1"||
     data.status!=="PASS"||data.git_head!==expectedPublishedGitHead||
     data.prepaid_route_registered!==true||
     data.prepaid_source_custody_ready!==true||
     data.retention_hours!==168||
     data.provider_mutation!==false||
     data.runtime_owner_mode!=="replit-published-deployment"||
     data.published_deployment!==true||
     !["autoscale","reserved-vm"].includes(String(data.runtime_durability_class))||
     typeof data.bucket_prefix!=="string"||
     !data.bucket_prefix.startsWith("replit-objstore"))
    throw Error("GATE3_OWNER_PUBLISHED_HOST_CONTRACT_MISMATCH_HOLD");
}

/** Real current strict provider account reads. No CREATE, DELETE or refill. */
export async function reviewGate3CurrentProviderAccountV39(
  canaryCreditCeiling:number,
  getBalance:()=>Promise<StrictBalanceEvidence>=getBalanceEvidenceStrict,
  list:()=>Promise<WebhookSubscription[]>=listSubscriptionsStrictWithRetry,
):Promise<number>{
  if(!Number.isSafeInteger(canaryCreditCeiling)||
     canaryCreditCeiling<1||canaryCreditCeiling>100)
    throw Error("GATE3_OWNER_INVALID_SMALL_BUDGET_HOLD");
  let evidence:StrictBalanceEvidence,subscriptions:WebhookSubscription[];
  try{
    // Do not issue provider LIST if the strict balance proof already fails.
    evidence=await getBalance();
    subscriptions=await list();
  }catch{
    throw Error("GATE3_OWNER_PROVIDER_READONLY_EVIDENCE_UNAVAILABLE_HOLD");
  }
  const remaining=evidence?.balance?.creditsRemaining;
  const quota=evidence?.quota;
  if(typeof remaining!=="number"||
     !Number.isSafeInteger(remaining)||
     remaining<MIN_GATE3_PREFLIGHT_BALANCE||
     remaining-canaryCreditCeiling<PROTECTED_FLOOR_AFTER_EXPOSURE||
     !quota||!Number.isSafeInteger(quota.apiUnitsRemaining)||
     quota.apiUnitsRemaining<1||
     !Array.isArray(subscriptions))
    throw Error("GATE3_OWNER_PROVIDER_CREDIT_OR_QUOTA_FLOOR_HOLD");
  // Any malformed inventory entry is a HOLD; absence of a known record is
  // not proof it belongs to us or is safe to delete.
  if(subscriptions.some(s=>!s||typeof s!=="object"||
       typeof s.isActive!=="boolean"||
       !["CreditBased","LifetimeBased"].includes(s.billingType)))
    throw Error("GATE3_OWNER_PROVIDER_INVENTORY_INVALID_HOLD");
  if(subscriptions.some(s=>s.isActive&&s.billingType==="CreditBased"))
    throw Error("GATE3_OWNER_ACTIVE_BILLABLE_SUBSCRIPTION_PRESENT_HOLD");
  return remaining;
}

/**
 * Ordered real owner stage: (1) independent checkout AUTH, (2) published
 * host GET (3) strict live account balance and inventory (4) one source
 * reservation. Cannot charge or certify paid Gate3; the paid runner's hard
 * pre-provider STOP remains untouched.
 *
 * deps is only for isolated no-provider mock tests and may NEVER serve as a
 * provider/host evidence authentication certificate for the later paid owner.
 */
export async function prepareGate3AfterLiveReadOnlyEvidenceV39(
  pool:Pick<Pool,"connect">,
  input:Gate3OwnedPreExposureInputV39,
  deps:Gate3OwnerPreExposureDepsV39={},
):Promise<Gate3OwnedPreExposureEvidenceV39>{
  if(!input||typeof input.expectedPublishedGitHead!=="string"||
     !GIT_SHA.test(input.expectedPublishedGitHead))
    throw Error("GATE3_OWNER_EXACT_PUBLISHED_SHA_REQUIRED_HOLD");
  // AUTH must be checked BEFORE any provider/host I/O.
  let ledger:string;
  try{
    ledger=readFileSync(join(process.cwd(),
      "SEPmd","V3.9_RUN_REPORTS_AND_EVIDENCE.md"),"utf8");
  }catch{
    throw Error("GATE3_OWNER_CHECKED_IN_LEDGER_MISSING_HOLD");
  }
  reviewGate3LedgerBoundPreparationV39(input,ledger);
  await verifyGate3PublishedPrepaidHostV39(
    input.expectedPublishedGitHead,deps.fetchImpl??fetch);
  const balanceBeforeInMemory=await reviewGate3CurrentProviderAccountV39(
    input.canaryCreditCeiling,
    deps.getBalanceEvidence??getBalanceEvidenceStrict,
    deps.getSubscriptions??listSubscriptionsStrictWithRetry,
  );
  // The final reservation RE-READS the independently checked-in ledger,
  // then generates exactly one LOGGED owner+UNLOGGED callback source UUID.
  const prepared=await prepareGate3LedgerBoundSessionV39(pool,input);
  return {
    ...prepared,
    stage:"REAL_HOST_AND_ACCOUNT_READS_SOURCE_PREPARED_ONLY",
    publicHostGetVerified:true,
    publicReceiverPrepaidRouteVerified:true,
    providerReadOnlyBalanceAndInventoryChecked:true,
    activeBillableSubscriptions:0,
    protectedCreditFloorSatisfied:true,
    liveSignedCallbackShaReadbackVerified:false,
    humanPaidAuthorizationVerified:false,
    paidCanaryCertified:false,
    providerSubscriptionCreatedHere:false,
    balanceBeforeInMemory,
  };
}
