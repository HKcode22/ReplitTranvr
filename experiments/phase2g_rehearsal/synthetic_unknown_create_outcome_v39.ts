/**
 * P13 — SYNTHETIC ONLY third-party CREATE/SQL non-atomicity fault model.
 * An external provider may accept subscription CREATE even if the owner
 * process never receives an ACK or records the resulting ID.
 *
 * Deliberately NO AeroDataBox client, no actual provider subscription,
 * no autonomous CREATE/DELETE, no owner/watchdog changes, and no credentials.
 * Listing observations here are fictional and have no real authority.
 */
export type SyntheticCreateOutcomeV39=
  "never_sent"|"ack_with_subscription"|"timeout_unknown"|
  "process_crash_after_send"|"http_error_unknown";
export type SyntheticInventoryScopeV39="unavailable"|"incomplete"|"complete";
export type SyntheticCreateEvidenceV39={
  mode:"synthetic-only";
  frozenPlanSha256:string;
  preCreateIntentDurable:boolean;
  createAttemptSha256:string|null;
  createOutcome:SyntheticCreateOutcomeV39;
  acknowledgedSubscriptionId:string|null;
  inventoryScope:SyntheticInventoryScopeV39;
  inventoryCorrespondsToFrozenAttempt:boolean;
  reportedActiveOwnedSubscriptions:string[];
  providerSpendReconciledIndependently:boolean;
  ownerJournalBoundSubscriptionId:string|null;
};
export type SyntheticCreateDecisionV39={
  state:"NOT_SENT"|"UNKNOWN_PROVIDER_OUTCOME"|
    "RECONCILIATION_REQUIRED"|"CONFLICTING_SUBSCRIPTIONS"|
    "SINGLE_SUBSCRIPTION_CORROBORATED";
  errors:string[];
  reportedSubscriptions:number;
  possibleUnrecordedProviderSpend:boolean;
  anotherCreateAllowed:false;
  paidLaunchAuthorized:false;
  scientificRunAuthorized:false;
  automaticDeleteAuthorized:false;
};
const sha=(s:unknown)=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
const token=(s:unknown)=>typeof s==="string"&&/^[A-Za-z0-9_.:-]{1,160}$/.test(s);
export function evaluateSyntheticCreateUnknownOutcomeV39(
  x:SyntheticCreateEvidenceV39
):SyntheticCreateDecisionV39{
  if(!x||x.mode!=="synthetic-only"||
     !sha(x.frozenPlanSha256)||
     !["never_sent","ack_with_subscription","timeout_unknown",
       "process_crash_after_send","http_error_unknown"].includes(x.createOutcome)||
     !["unavailable","incomplete","complete"].includes(x.inventoryScope)||
     !Array.isArray(x.reportedActiveOwnedSubscriptions)||
     x.reportedActiveOwnedSubscriptions.length>500||
     !x.reportedActiveOwnedSubscriptions.every(token)||
     !(x.acknowledgedSubscriptionId===null||token(x.acknowledgedSubscriptionId))||
     !(x.ownerJournalBoundSubscriptionId===null||token(x.ownerJournalBoundSubscriptionId))||
     !(x.createAttemptSha256===null||sha(x.createAttemptSha256)))
    throw new Error("SYNTHETIC_CREATE_EVIDENCE_INVALID");
  const errs=new Set<string>();
  const requestSent=x.createOutcome!=="never_sent";
  if(!x.preCreateIntentDurable||!x.createAttemptSha256)
    errs.add("PRECREATE_DURABLE_INTENT_UNPROVEN");
  if(!requestSent&&
     (x.acknowledgedSubscriptionId!==null||
      x.ownerJournalBoundSubscriptionId!==null))
    errs.add("NO_CREATE_SENT_BUT_SUBSCRIPTION_DECLARED");
  if(requestSent&&x.createOutcome==="ack_with_subscription"&&
     !x.acknowledgedSubscriptionId)
    errs.add("SUCCESS_ACK_WITHOUT_SUBSCRIPTION_ID");
  if(x.createOutcome!=="ack_with_subscription"&&
     x.acknowledgedSubscriptionId!==null)
    errs.add("PROVIDER_ACK_NOT_VERIFIED");
  if(x.inventoryScope!=="complete")
    errs.add("AUTHORITATIVE_PROVIDER_INVENTORY_UNAVAILABLE");
  if(!x.inventoryCorrespondsToFrozenAttempt)
    errs.add("INVENTORY_NOT_BOUND_TO_FROZEN_CREATE");
  const all=x.reportedActiveOwnedSubscriptions;
  const unique=new Set(all);
  if(unique.size!==all.length)
    errs.add("DUPLICATED_INVENTORY_ENTRY");
  if(unique.size>1)
    errs.add("MULTIPLE_ACTIVE_SUBSCRIPTIONS_FOR_ONE_PLAN");
  if(requestSent&&unique.size===0)
    errs.add("UNKNOWN_CREATE_OUTCOME_UNRESOLVED");
  if(x.ownerJournalBoundSubscriptionId!==null&&
     !unique.has(x.ownerJournalBoundSubscriptionId))
    errs.add("OWNER_JOURNAL_NOT_IN_PROVIDER_INVENTORY");
  if(x.acknowledgedSubscriptionId!==null&&
     !unique.has(x.acknowledgedSubscriptionId))
    errs.add("ACK_NOT_IN_PROVIDER_INVENTORY");
  if(unique.size===1&&x.ownerJournalBoundSubscriptionId===null)
    errs.add("OWNER_JOURNAL_BINDING_MISSING");
  if(!x.providerSpendReconciledIndependently)
    errs.add("PROVIDER_BILLING_NOT_RECONCILED");
  let state:SyntheticCreateDecisionV39["state"];
  if(unique.size>1)state="CONFLICTING_SUBSCRIPTIONS";
  else if(!requestSent)state="NOT_SENT";
  else if(x.inventoryScope!=="complete"||
       !x.inventoryCorrespondsToFrozenAttempt)state="UNKNOWN_PROVIDER_OUTCOME";
  else if(errs.size>0)state="RECONCILIATION_REQUIRED";
  else state="SINGLE_SUBSCRIPTION_CORROBORATED";
  return {
    state,errors:[...errs].sort(),
    reportedSubscriptions:unique.size,
    possibleUnrecordedProviderSpend:requestSent&&(
      x.createOutcome!=="ack_with_subscription"||
      x.ownerJournalBoundSubscriptionId===null||
      !x.providerSpendReconciledIndependently),
    // No automated retries, even if the synthetic model appears consistent.
    anotherCreateAllowed:false,paidLaunchAuthorized:false,
    scientificRunAuthorized:false,automaticDeleteAuthorized:false
  };
}
