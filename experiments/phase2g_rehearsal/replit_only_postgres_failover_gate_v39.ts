/**
 * P09/P15/P18/P20: Replit-only + direct PostgreSQL READ-ONLY observer.
 * Fully detached pure decision support; cannot receive provider POSTs,
 * create a provider subscription, deploy Replit, or approve paid collection.
 *
 * A second temporary .replit.dev URL is NOT the frozen provider callback
 * target; when the pinned primary fails, it does not receive unseen sends.
 */
export type ReplitOnlyBackupInputV39 = Readonly<{
  mode:"zero-provider-synthetic-only";
  operatorApprovedNoCreditHostedRehearsal:boolean;
  noCloudflareAndNoNewPaidSubscription:boolean;
  originalProviderCallbackPinnedToPrimary:boolean;
  primaryWebhooksCannotRerouteAutomatically:boolean;
  standbyDevelopmentUrlGetReachable:boolean;
  standbyIsolatedSyntheticPostRoutePresent:boolean;
  standbySyntheticStorageSeparatedFromLiveScientificDbAndBlob:boolean;
  standbyTestSecretsSeparatedFromLiveProviderSecrets:boolean;
  standbyExactRunningCodeRevisionVerified:boolean;
  standbyPhysicalFlightInstanceV2Verified:boolean;
  temporaryStandbyIndependentOfPrimaryRuntime:boolean;
  independentSqlObserverCanReadCommittedRows:boolean;
  independentSqlObserverReadOnlyVerified:boolean;
  originalBeforeAckSourceIsDurableOutsidePrimaryFailureDomain:boolean;
  originalRawWireReadbackVerified:boolean;
  originalSourceRetentionHours:number|null;
  authenticatedProviderSentItemCreditLedgerAvailable:boolean;
  independentFirstHopReceivesNewProviderPostsDuringPrimaryOutage:boolean;
  hostedFullPostWallclock120MinutesPassed:boolean;
}>;
export type ReplitOnlyBackupResultV39 = Readonly<{
  schema:"v39.replit-only-pg-observer-readiness.v1";
  failedHostedRehearsalChecks:readonly string[];
  failedPaidContinuityChecks:readonly string[];
  readyToAttemptIsolatedNoCreditHostedRehearsal:boolean;
  postgresObserverCanProvideIndependentCommittedRowEvidence:boolean;
  postgresObserverCanReceiveProviderPosts:false;
  temporaryReplitUrlAutomaticallyReceivesOriginalProviderPosts:false;
  directPgObserverGuaranteesOriginalSourceCompleteness:false;
  liveSixPlusSixEnabled:false;
  paidYssyAuthorized:false;
}>;
export function assessReplitOnlyBackupV39(
  x:ReplitOnlyBackupInputV39
):ReplitOnlyBackupResultV39{
  if(x.mode!=="zero-provider-synthetic-only")
    throw Error("P20_REPLIT_BACKUP_SYNTHETIC_ONLY_MODE_REQUIRED");
  const rehearsal:string[]=[];
  const checkRehearsal=(ok:boolean,reason:string)=>{if(!ok)rehearsal.push(reason);};
  checkRehearsal(x.operatorApprovedNoCreditHostedRehearsal===true,"HOSTED_NO_CREDIT_REHEARSAL_NOT_APPROVED");
  checkRehearsal(x.noCloudflareAndNoNewPaidSubscription===true,"NO_NEW_PROVIDER_BILLING_BOUNDARY_UNVERIFIED");
  checkRehearsal(x.standbyDevelopmentUrlGetReachable===true,"STANDBY_DEVELOPMENT_URL_NOT_SERVING");
  checkRehearsal(x.standbyIsolatedSyntheticPostRoutePresent===true,"ISOLATED_SYNTHETIC_POST_HANDLER_MISSING");
  checkRehearsal(x.standbySyntheticStorageSeparatedFromLiveScientificDbAndBlob===true,"DISPOSABLE_STORAGE_ISOLATION_UNPROVEN");
  checkRehearsal(x.standbyTestSecretsSeparatedFromLiveProviderSecrets===true,"SYNTHETIC_TEST_SECRET_ISOLATION_UNPROVEN");
  checkRehearsal(x.standbyExactRunningCodeRevisionVerified===true,"CURRENT_STANDBY_DEVELOPMENT_BUILD_SHA_UNVERIFIED");
  checkRehearsal(x.standbyPhysicalFlightInstanceV2Verified===true,"STANDBY_RUNTIME_PHYSICAL_V2_UNVERIFIED");
  const paidContinuity:string[]=[];
  const checkPaid=(ok:boolean,reason:string)=>{if(!ok)paidContinuity.push(reason);};
  checkPaid(x.originalProviderCallbackPinnedToPrimary===true,"FROZEN_SINGLE_PROVIDER_CALLBACK_NOT_ATTESTED");
  checkPaid(x.primaryWebhooksCannotRerouteAutomatically===true,"UNKNOWN_UPSTREAM_REROUTE_ASSUMPTION");
  checkPaid(x.temporaryStandbyIndependentOfPrimaryRuntime===true,"STANDBY_RUNTIME_INDEPENDENCE_UNPROVEN");
  checkPaid(x.independentSqlObserverCanReadCommittedRows===true&&
    x.independentSqlObserverReadOnlyVerified===true,"GITHUB_DIRECT_READONLY_POSTGRES_OBSERVER_NOT_VERIFIED");
  checkPaid(x.originalBeforeAckSourceIsDurableOutsidePrimaryFailureDomain===true,
    "INDEPENDENT_ORIGINAL_BEFORE_ACK_CUSTODY_MISSING");
  checkPaid(x.originalRawWireReadbackVerified===true,
    "ORIGINAL_LITERAL_WIRE_READBACK_UNVERIFIED");
  checkPaid(x.originalSourceRetentionHours!==null&&
    Number.isSafeInteger(x.originalSourceRetentionHours)&&
    x.originalSourceRetentionHours>=168,"ORIGINAL_SOURCE_168H_RETENTION_UNVERIFIED");
  checkPaid(x.authenticatedProviderSentItemCreditLedgerAvailable===true,
    "PROVIDER_SENT_FLIGHT_ITEM_LEDGER_NOT_AUTHENTICATED");
  checkPaid(x.independentFirstHopReceivesNewProviderPostsDuringPrimaryOutage===true,
    "NO_FIRST_HOP_FOR_NEW_POSTS_WHEN_PRIMARY_IS_DOWN");
  checkPaid(x.hostedFullPostWallclock120MinutesPassed===true,
    "HOSTED_120MIN_END_TO_END_POST_REHEARSAL_NOT_PASSED");
  return {
    schema:"v39.replit-only-pg-observer-readiness.v1",
    failedHostedRehearsalChecks:rehearsal,
    failedPaidContinuityChecks:paidContinuity,
    readyToAttemptIsolatedNoCreditHostedRehearsal:rehearsal.length===0,
    postgresObserverCanProvideIndependentCommittedRowEvidence:
      x.independentSqlObserverCanReadCommittedRows===true&&
      x.independentSqlObserverReadOnlyVerified===true,
    postgresObserverCanReceiveProviderPosts:false,
    temporaryReplitUrlAutomaticallyReceivesOriginalProviderPosts:false,
    directPgObserverGuaranteesOriginalSourceCompleteness:false,
    liveSixPlusSixEnabled:false,
    paidYssyAuthorized:false
  };
}
/**
 * A genuine independent provider-sent ledger is needed to prove missing
 * sources. DB-only counters cannot infer "zero missed" from a zero row delta.
 * Credits count FLIGHT ITEMS, not simply webhook requests.
 */
export function adjudicateDbOnlyGapV39(input:Readonly<{
  localCommittedFlightItems:number;
  independentlyAuthenticatedProviderSentFlightItems:number|null;
}>):Readonly<{
  exactItemGap:number|null;
  sourceComplete:boolean;
  scientificPassAuthorized:false;
  sourceUncertainty:"UNKNOWN_PROVIDER_SENDS"|"MISMATCH"|"EXACT_COUNT_ONLY_IDENTITY_STILL_UNVERIFIED";
}>{
  if(!Number.isSafeInteger(input.localCommittedFlightItems)||
    input.localCommittedFlightItems<0||
    !(input.independentlyAuthenticatedProviderSentFlightItems===null||
      (Number.isSafeInteger(input.independentlyAuthenticatedProviderSentFlightItems)&&
       input.independentlyAuthenticatedProviderSentFlightItems>=0)))
    throw Error("P14_SOURCE_LOCAL_ITEM_COUNT_INVALID");
  const sent=input.independentlyAuthenticatedProviderSentFlightItems;
  const gap=sent===null?null:sent-input.localCommittedFlightItems;
  return {
    exactItemGap:gap,
    sourceComplete:false,
    scientificPassAuthorized:false,
    sourceUncertainty:sent===null?"UNKNOWN_PROVIDER_SENDS":
      gap===0?"EXACT_COUNT_ONLY_IDENTITY_STILL_UNVERIFIED":"MISMATCH"
  };
}
