/**
 * P09/P18: pure fail-closed published DEPLOYMENT parity assessment.
 * All evidence must come from independently verified published runtime +
 * an operator-signed binding attestation; a green publish status or newer
 * checkout is insufficient. No access to secrets or backend networks.
 * This does not automatically authorize paid callbacks.
 */
export type PublishedBackupEvidenceV39=Readonly<{
  role:"primary"|"backup";
  deploymentStatus:"success"|"failed"|"suspended"|"unknown";
  deployedRevision:string|null;
  currentCheckoutRevision:string|null;
  publishedRevisionVerifiedByRuntime:boolean;
  publishedPhysicalFlightInstanceV2:boolean|null;
  publishedPrepaidCallbackRoute:boolean|null;
  originalWireByteArchive:"literal_wire"|"parsed_canonical_json"|"unknown";
  originalBlobRoundtripBeforeAck:boolean|null;
  originalStorageRetentionHours:number|null;
  independentlyReachableWithoutOtherReceiver:boolean|null;
}>;
export type CrossDeploymentBindingWitnessV39=Readonly<{
  operatorAttestedBothPublishedRevisions:boolean;
  signedAndIndependentlyVerified:boolean;
  exactSameScientificPostgresBinding:boolean|null;
  exactSameOriginalDedicatedBlobBucket:boolean|null;
  exactSameCallbackSecretBinding:boolean|null;
  oneOriginalSubscriptionOwnerAndDedup:boolean|null;
  exactPhysicalFlightV2AndEightUtcBins:boolean|null;
  oneFixedIndependentDurableHttpsIngress:boolean|null;
  actualOriginalProviderSenderAttemptLedger:boolean|null;
  realHosted120MinNoCreditReplayPassed:boolean|null;
}>;
export type BackupGateResultV39=Readonly<{
  schema:"v39.phase2g-published-backup-parity.v1";
  failedChecks:readonly string[];
  readyForIsolatedNoProviderCreditHostedRehearsal:boolean;
  publishedBackupVerified:boolean;
  realSixPlusSixEnabled:false;
  paidYssyLaunchAuthorized:false;
  independentSourceItemContinuityProven:false;
  originalF8ScienceComplete:false;
}>;
const SHA=/^[0-9a-f]{40}$/;
const acceptable=(v:PublishedBackupEvidenceV39):boolean=>
  v.deploymentStatus==="success"&&
  !!v.deployedRevision&&SHA.test(v.deployedRevision)&&
  v.publishedRevisionVerifiedByRuntime===true&&
  v.publishedPrepaidCallbackRoute===true&&
  v.publishedPhysicalFlightInstanceV2===true&&
  v.originalBlobRoundtripBeforeAck===true&&
  v.originalWireByteArchive==="literal_wire"&&
  v.originalStorageRetentionHours===168&&
  v.independentlyReachableWithoutOtherReceiver===true;
export function evaluatePublishedBackupParityV39(input:{
  mode:"offline-evidence-only";
  primary:PublishedBackupEvidenceV39;
  backup:PublishedBackupEvidenceV39;
  shared:CrossDeploymentBindingWitnessV39;
}):BackupGateResultV39{
  if(input.mode!=="offline-evidence-only"||
    input.primary.role!=="primary"||input.backup.role!=="backup")
    throw Error("BACKUP_PUBLISHED_EVIDENCE_MODE_OR_ROLE_INVALID");
  const fail:string[]=[];
  for(const v of [input.primary,input.backup]){
    const label=v.role.toUpperCase();
    if(v.deploymentStatus!=="success")fail.push(label+"_PUBLISHED_NOT_SUCCESS");
    if(!v.deployedRevision||!SHA.test(v.deployedRevision)||
       !v.publishedRevisionVerifiedByRuntime)fail.push(label+"_EXACT_LIVE_CODE_REVISION_NOT_ATTESTED");
    if(v.publishedPrepaidCallbackRoute!==true)fail.push(label+"_PUBLISHED_PREPAID_ROUTE_NOT_PROVEN");
    if(v.publishedPhysicalFlightInstanceV2!==true)fail.push(label+"_PUBLISHED_PHYSICAL_FLIGHT_V2_NOT_PROVEN");
    if(v.originalBlobRoundtripBeforeAck!==true)fail.push(label+"_ORIGINAL_BLOB_READBACK_NOT_PROVEN");
    if(v.originalStorageRetentionHours!==168)fail.push(label+"_168H_RETENTION_UNPROVEN");
    if(v.independentlyReachableWithoutOtherReceiver!==true)
      fail.push(label+"_INDEPENDENT_BACKEND_REACHABILITY_UNPROVEN");
    // Original source wire bytes cannot be substituted silently with
    // canonicalized parsed JSON while claiming byte-exact source custody.
    if(v.originalWireByteArchive!=="literal_wire")fail.push(label+"_LITERAL_ORIGINAL_WIRE_NOT_ARCHIVED");
  }
  const w=input.shared;
  if(w.operatorAttestedBothPublishedRevisions!==true||
     w.signedAndIndependentlyVerified!==true)
    fail.push("DEPLOYMENT_PAIR_ATTESTATION_NOT_VERIFIED");
  for(const [name,value]of [
    ["CROSS_DEPLOYMENT_DB_BINDING_UNVERIFIED",w.exactSameScientificPostgresBinding],
    ["CROSS_DEPLOYMENT_DEDICATED_BUCKET_UNVERIFIED",w.exactSameOriginalDedicatedBlobBucket],
    ["CROSS_DEPLOYMENT_CALLBACK_SECRET_UNVERIFIED",w.exactSameCallbackSecretBinding],
    ["SINGLE_OWNER_AND_SOURCE_DEDUP_UNVERIFIED",w.oneOriginalSubscriptionOwnerAndDedup],
    ["PHYSICAL_V2_EIGHT_BIN_PARITY_UNVERIFIED",w.exactPhysicalFlightV2AndEightUtcBins]
  ] as const)if(value!==true)fail.push(name);
  // A single public Replit app or multiple Replit URLs is NOT sufficient.
  if(w.oneFixedIndependentDurableHttpsIngress!==true)
    fail.push("INDEPENDENT_FIRST_HOP_NOT_VERIFIED");
  if(w.actualOriginalProviderSenderAttemptLedger!==true)
    fail.push("ORIGINAL_PROVIDER_ATTEMPT_LEDGER_UNVERIFIED");
  if(w.realHosted120MinNoCreditReplayPassed!==true)
    fail.push("REAL_HOSTED_120MIN_REHEARSAL_NOT_COMPLETE");
  return{
    schema:"v39.phase2g-published-backup-parity.v1",
    failedChecks:fail,
    readyForIsolatedNoProviderCreditHostedRehearsal:
      acceptable(input.primary)&&acceptable(input.backup)&&
      w.operatorAttestedBothPublishedRevisions===true&&
      w.signedAndIndependentlyVerified===true&&
      w.exactSameScientificPostgresBinding===true&&
      w.exactSameOriginalDedicatedBlobBucket===true&&
      w.exactSameCallbackSecretBinding===true&&
      w.oneOriginalSubscriptionOwnerAndDedup===true&&
      w.exactPhysicalFlightV2AndEightUtcBins===true,
    publishedBackupVerified:fail.length===0,
    realSixPlusSixEnabled:false,
    paidYssyLaunchAuthorized:false,
    independentSourceItemContinuityProven:false,
    originalF8ScienceComplete:false
  };
}
