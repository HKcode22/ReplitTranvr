/**
 * Gate4 post-run EVIDENCE VERDICT (pure / offline; no provider/DB/file I/O).
 *
 * Evaluates verified summary facts supplied by a separately reviewed,
 * read-only exact-scope auditor. This helper does NOT obtain or authenticate
 * those facts, approve provider spend, authenticate the caller or prove the
 * original author's identity. A path-secret callback is NOT provider HMAC.
 *
 * Scientific discipline:
 * - A paid CREATE + independent STOP is an operational safety result.
 * - A synthetic commissioning POST is NEVER a positive paid observation.
 * - Zero received and zero spent after a short window is INCONCLUSIVE,
 *   not a failed-delivery rate nor a "100% delivery" rate.
 * - Provider notification count, delivery attempts and billable credits are
 *   different quantities and must not be interchanged as denominators.
 * - One genuine receiver original can support QUALIFIED delivery feasibility,
 *   not an accuracy/reliability estimate for a month-long campaign.
 */
export type Gate4LiveEvidenceV39=Readonly<{
  /** Exact positive TLS provider CREATE ID, verified independently of LIST. */
  positiveCreateVerified:boolean;
  /** Exact one-scope V0072 binding and signed STOP handoff readback. */
  ownedBindingVerified:boolean;
  /** Independently authenticated exact-ID DELETE + strict inactive LIST. */
  independentExactStopVerified:boolean;
  /** Strict stable balance/LIST samples collected after the STOP. */
  stableSettlementReads:number;
  /** Null = not measured, NOT zero. */
  activeBillableAfterStop:number|null;
  /** Null = external charged-credit delta is unknown; credits ≠ SEND count. */
  settledExternalCreditDelta:number|null;
  /** Distinct V0071 original rows within this paid scope (not historical). */
  paidWindowOriginalRows:number;
  /** Rows with independently recomputed preserved-original SHA. */
  paidWindowShaVerifiedRows:number;
  /** SHA-valid rows claiming exactly the private positive provider ID.
   * These claims are NOT cryptographic provider-origin signatures. */
  positivePaidIdClaimRows:number;
  /** Exact former-source synthetic originals, excluded from paid counts. */
  historicalSyntheticRows:number;
  /** Null = unavailable. Count of actual provider SEND attempts only when
   * independently known, NOT inferred from balance or local originals. */
  providerSendAttempts:number|null;
}>;

export type Gate4LiveVerdictV39=Readonly<{
  schema:"v39.gate4.exact-scope-live-evidence-verdict.v1";
  status:"EVIDENCE_INCONSISTENT_HOLD"|"SAFETY_HOLD"|
    "SAFETY_PASS_DELIVERY_NOT_OBSERVED"|
    "SAFETY_PASS_DELIVERY_GAP_SUSPECTED"|
    "SAFETY_PASS_POSITIVE_ORIGINAL_ACCOUNT_UNSETTLED"|
    "QUALIFIED_LIVE_ALERT_FEASIBILITY_OBSERVED";
  safetyPassed:boolean;
  genuinePaidReceiverOriginalsObserved:number;
  reliabilityPercent:number|null;
  independentProviderHmacAuthenticated:false;
  originalFullGate4RubricCertified:false;
  authorizesProviderRequest:false;
  authorizesPhase4Paid:false;
  providerCalls:0;
  databaseWrites:0;
}>;

function nonnegative(x:unknown):x is number{
  return typeof x==="number"&&Number.isSafeInteger(x)&&x>=0;
}
export function assessGate4LiveDeliveryV39(
  e:Gate4LiveEvidenceV39
):Gate4LiveVerdictV39{
  const base=(status:Gate4LiveVerdictV39["status"],
    safetyPassed:boolean):Gate4LiveVerdictV39=>({
    schema:"v39.gate4.exact-scope-live-evidence-verdict.v1",
    status,safetyPassed,
    genuinePaidReceiverOriginalsObserved:
      nonnegative(e?.positivePaidIdClaimRows)?e.positivePaidIdClaimRows:0,
    // A source-backed provider notification denominator is essential.
    // SEND attempts are not distinct notifications; billable credits aren't
    // an observation denominator. Never guess a delivery percentage here.
    reliabilityPercent:null,
    independentProviderHmacAuthenticated:false,
    originalFullGate4RubricCertified:false,
    authorizesProviderRequest:false,authorizesPhase4Paid:false,
    providerCalls:0,databaseWrites:0
  });
  if(!e||typeof e!=="object"||
     !nonnegative(e.stableSettlementReads)||
     !nonnegative(e.paidWindowOriginalRows)||
     !nonnegative(e.paidWindowShaVerifiedRows)||
     !nonnegative(e.positivePaidIdClaimRows)||
     !nonnegative(e.historicalSyntheticRows)||
     (e.activeBillableAfterStop!==null&&
       !nonnegative(e.activeBillableAfterStop))||
     (e.settledExternalCreditDelta!==null&&
       !nonnegative(e.settledExternalCreditDelta))||
     (e.providerSendAttempts!==null&&
       !nonnegative(e.providerSendAttempts))||
     e.paidWindowShaVerifiedRows>e.paidWindowOriginalRows||
     e.positivePaidIdClaimRows>e.paidWindowShaVerifiedRows)
    return base("EVIDENCE_INCONSISTENT_HOLD",false);
  const safe=e.positiveCreateVerified===true&&
    e.ownedBindingVerified===true&&
    e.independentExactStopVerified===true&&
    e.stableSettlementReads>=3&&e.activeBillableAfterStop===0;
  if(!safe)return base("SAFETY_HOLD",false);
  if(e.positivePaidIdClaimRows===0){
    if((e.providerSendAttempts!==null&&e.providerSendAttempts>0)||
       (e.settledExternalCreditDelta!==null&&
        e.settledExternalCreditDelta>0))
      return base("SAFETY_PASS_DELIVERY_GAP_SUSPECTED",true);
    return base("SAFETY_PASS_DELIVERY_NOT_OBSERVED",true);
  }
  // Positive ORIGINAL and owned-ID CLAIM are necessary, but a settled
  // positive provider account delta is required before calling the
  // short test a *qualified* paid delivery feasibility observation.
  if(e.settledExternalCreditDelta===null||
     e.settledExternalCreditDelta===0)
    return base("SAFETY_PASS_POSITIVE_ORIGINAL_ACCOUNT_UNSETTLED",true);
  // A strictly confirmed zero SENDs is inconsistent with paid originals.
  // Do not silently pretend an unknown provider SEND count is zero.
  if(e.providerSendAttempts===0)
    return base("EVIDENCE_INCONSISTENT_HOLD",true);
  return base("QUALIFIED_LIVE_ALERT_FEASIBILITY_OBSERVED",true);
}
