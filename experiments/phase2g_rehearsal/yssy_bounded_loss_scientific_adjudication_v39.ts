/**
 * P15/P17/P19: counterproposal to the blanket three-GET-strike scientific
 * failure: a PROSPECTIVE, explicitly CENSORED collection interpretation.
 *
 * Pure synthetic policy research. Does NOT modify or authorize paid watchdog,
 * original F.8 scientific acceptance, historical P2G22/P23/P24 labels,
 * AeroDataBox retries or YSSY rerun eligibility.
 *
 * Independently observed provider SEND attempt/credit ledger is necessary
 * to quantify missing items. Database rows cannot expose notifications that
 * never reached a Replit callback. 8 elapsed 15-minute bins, NOT a fixed
 * traffic histogram or invented expected 120 notifications.
 */
export type YssyLossProtocolV39=Readonly<{
  mode:"synthetic_only";
  frozenWindowMinutes:120;
  originalF8RequiresCompleteEvidence:true;
  independentlyAuthenticatedProviderSenderLedger:boolean;
  independentlyAttributedPerAttemptFlightItemCredits:boolean;
  originalRawAndSourceUtcVerified:boolean;
  physicalFlightV2ObservedRowsValid:boolean;
  originalEightBinClockPreserved:boolean;
  exactOwnerCleanupAndBudgetValid:boolean;
  observedMaximumConsecutiveHealthFailures:number;
  observedLongestHealthFailureSeconds:number;
  /** Exact provider-origin billable FLIGHT ITEMS per 15m; null if unknowable. */
  senderFlightItemsByBin:readonly number[]|null;
  /** Exact distinct billable items covered by source-matched persisted rows. */
  storedFlightItemsByBin:readonly number[];
  /** Only limits frozen in a hypothetical NEW amendment; not chosen by data. */
  prospectivelyFrozenMaxMissingFlightItems:number|null;
  prospectivelyFrozenMaxMissingFraction:number|null;
  prospectivelyFrozenMaxMissingFlightItemsPer15m:number|null;
}>;
export type YssyLossVerdictV39=Readonly<{
  status:"UNVERIFIABLE"|"INVALID_INTEGRITY"|"COMPLETE_RECEIPT_CANDIDATE"|
    "BOUNDED_CENSORED_CANDIDATE"|"OUTSIDE_PROPOSED_LOSS_BOUND";
  unknownMissingItems:boolean;
  totalSenderFlightItems:number|null;
  totalStoredFlightItems:number;
  missingFlightItems:number|null;
  missingFraction:number|null;
  missingItemsBy15m:readonly number[]|null;
  missingBins:readonly number[];
  healthOnlyFailure:boolean;
  errors:readonly string[];
  scientificOriginalF8PassAuthorized:false;
  partialScientificPassAuthorized:false;
  paidLaunchAuthorized:false;
  automaticRetryAuthorized:false;
}>;
const nat=(x:unknown):x is number=>
  typeof x==="number"&&Number.isSafeInteger(x)&&x>=0;
const validBins=(x:unknown):x is readonly number[]=>
  Array.isArray(x)&&x.length===8&&x.every(nat);
const zeroTotal=(x:readonly number[])=>x.reduce((a,b)=>a+b,0);
export function evaluateHypotheticalYssyLossV39(p:YssyLossProtocolV39):YssyLossVerdictV39{
  const errors=new Set<string>();
  const add=(x:string)=>errors.add(x);
  const stored=validBins(p.storedFlightItemsByBin)?
    zeroTotal(p.storedFlightItemsByBin):0;
  const hasSource=validBins(p.senderFlightItemsByBin);
  const sent=hasSource?zeroTotal(p.senderFlightItemsByBin!):null;
  let missing:readonly number[]|null=null,negative=false;
  if(hasSource&&validBins(p.storedFlightItemsByBin)){
    missing=p.senderFlightItemsByBin!.map((v,i)=>{
      const n=v-p.storedFlightItemsByBin[i];
      if(n<0)negative=true;
      return n;
    });
  }
  const missingTotal=missing===null?null:zeroTotal(missing);
  const missingFraction=sent!==null&&sent>0&&missingTotal!==null?
    missingTotal/sent:null;
  const missingBins=missing===null?[]:missing
    .flatMap((v,i)=>v>0?[i]:[]);
  if(p.mode!=="synthetic_only"||p.frozenWindowMinutes!==120||
    p.originalF8RequiresCompleteEvidence!==true)
    add("ORIGINAL_FROZEN_PROTOCOL_NOT_PRESERVED");
  if(!validBins(p.storedFlightItemsByBin))add("INVALID_STORED_EIGHT_BINS");
  if(p.senderFlightItemsByBin!==null&&!hasSource)
    add("INVALID_SENDER_EIGHT_BINS");
  if(!nat(p.observedMaximumConsecutiveHealthFailures)||
    !nat(p.observedLongestHealthFailureSeconds))
    add("INVALID_HEALTH_WITNESS");
  if(p.observedMaximumConsecutiveHealthFailures>12||
    p.observedLongestHealthFailureSeconds>180)
    add("EXCEEDS_PROPOSED_SIX_PLUS_SIX_HEALTH_CEILING");
  if(!p.originalEightBinClockPreserved)
    add("ORIGINAL_EIGHT_BIN_UTC_CLOCK_INVALID");
  if(!p.physicalFlightV2ObservedRowsValid)
    add("PHYSICAL_V2_OBSERVED_ROWS_INVALID");
  if(!p.exactOwnerCleanupAndBudgetValid)
    add("OWNER_CLEANUP_OR_BUDGET_INVALID");
  if(negative)
    add("STORED_ITEMS_EXCEED_PROVIDER_SENDER_ITEMS");
  if(!p.independentlyAuthenticatedProviderSenderLedger||
    !p.independentlyAttributedPerAttemptFlightItemCredits||
    !p.originalRawAndSourceUtcVerified||!hasSource)
    add("INDEPENDENT_ATTEMPT_SOURCE_MISSING");
  const bounds=[p.prospectivelyFrozenMaxMissingFlightItems,
    p.prospectivelyFrozenMaxMissingFlightItemsPer15m];
  const frozen= bounds.every(nat)&&
    typeof p.prospectivelyFrozenMaxMissingFraction==="number"&&
    Number.isFinite(p.prospectivelyFrozenMaxMissingFraction)&&
    p.prospectivelyFrozenMaxMissingFraction>=0&&
    p.prospectivelyFrozenMaxMissingFraction<=1;
  if(!frozen)add("PROSPECTIVE_LOSS_BOUND_NOT_FROZEN");
  if(sent===0)add("ZERO_SENT_ITEMS_NO_YSSY_YIELD");
  if(missingTotal!==null&&frozen&&sent!==null&&sent>0&&
    (missingTotal>p.prospectivelyFrozenMaxMissingFlightItems!||
     missingTotal/sent>p.prospectivelyFrozenMaxMissingFraction!||
     missing!.some(n=>n>p.prospectivelyFrozenMaxMissingFlightItemsPer15m!)))
    add("LOSS_EXCEEDS_PRE_FROZEN_MAX_OR_BIN_LIMIT");
  // A strictly COMPLETE sender-vs-receiver match can coexist with failed
  // HTTP GET health. Do not call a GET outage an observed missing flight.
  // Without independent sender truth, "0 missing" is UNKNOWABLE.
  let status:YssyLossVerdictV39["status"];
  if([...errors].some(x=>[
    "ORIGINAL_FROZEN_PROTOCOL_NOT_PRESERVED",
    "INVALID_STORED_EIGHT_BINS","INVALID_SENDER_EIGHT_BINS",
    "INVALID_HEALTH_WITNESS","EXCEEDS_PROPOSED_SIX_PLUS_SIX_HEALTH_CEILING",
    "ORIGINAL_EIGHT_BIN_UTC_CLOCK_INVALID",
    "PHYSICAL_V2_OBSERVED_ROWS_INVALID",
    "OWNER_CLEANUP_OR_BUDGET_INVALID",
    "STORED_ITEMS_EXCEED_PROVIDER_SENDER_ITEMS"
  ].includes(x)))status="INVALID_INTEGRITY";
  else if(errors.has("INDEPENDENT_ATTEMPT_SOURCE_MISSING")||
    errors.has("PROSPECTIVE_LOSS_BOUND_NOT_FROZEN")||
    errors.has("ZERO_SENT_ITEMS_NO_YSSY_YIELD"))
    status="UNVERIFIABLE";
  else if(errors.has("LOSS_EXCEEDS_PRE_FROZEN_MAX_OR_BIN_LIMIT"))
    status="OUTSIDE_PROPOSED_LOSS_BOUND";
  else if(missingTotal===0)status="COMPLETE_RECEIPT_CANDIDATE";
  else status="BOUNDED_CENSORED_CANDIDATE";
  return {
    status,unknownMissingItems:missing===null||!p.independentlyAuthenticatedProviderSenderLedger,
    totalSenderFlightItems:sent,totalStoredFlightItems:stored,
    missingFlightItems:missingTotal,missingFraction,missingItemsBy15m:missing,
    missingBins,healthOnlyFailure:status==="COMPLETE_RECEIPT_CANDIDATE"&&
      p.observedMaximumConsecutiveHealthFailures>0,
    errors:[...errors].sort(),
    scientificOriginalF8PassAuthorized:false,
    partialScientificPassAuthorized:false,
    paidLaunchAuthorized:false,automaticRetryAuthorized:false
  };
}
