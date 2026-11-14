/**
 * Phase6 SOURCE private packet -> EXISTING Phase5 paid-child admission bridge.
 *
 * After earlier restricted PostgreSQL16 Ed25519 read and signed day-registry
 * routing have completed, cross-bind one SOURCE query, re-run the ORIGINAL
 * Phase5 source child release gate in memory, then use the existing private
 * two-file try/finally callback. No new provider worker, URL, payment gate,
 * GitHub dispatch, database write or autonomous paid activation is added.
 *
 * NOT an alternate proof of provider rights, original flight operation,
 * independent signing, or Phase5 FREEZE. Does not fetch packets itself.
 */
import {
 admitP5SignedDaySourceChild
} from "../server/lib/disruption/phase5SignedDaySourceChildRelease_v39";
import type {
 P5SignedSourceBatchRegistry
} from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import type {
 P5GitHubOneQueryReleaseEnvelope
} from "../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39";
import {
 bindP6OnePrivateSourceQueryFromVerifiedIndex
} from "../server/lib/disruption/phase6PrivateSourceQueryBindingInMemory_v39.mjs";
import {
 withP6VerifiedPrivateSourcePairForExistingChild
} from "../server/lib/disruption/phase6PrivateSourceChildEphemeralPair_v39.mjs";

export const P6_SOURCE_EXISTING_CHILD_ADMISSION_SCHEMA =
 "v39.phase6.private-source-existing-p5-child-double-admission-no-go.v1";
const H=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
function hold(code:string):never{
 throw Error("HOLD_P6_SOURCE_EXISTING_CHILD_ADMISSION_"+code);
}
export interface P6PrivateSourcePaths {
 registryFilePath:string;
 queryPacketFilePath:string;
}
export interface P6ExistingSourcePrivateBridgeArgs {
 indexHandoff:unknown;
 sourcePacketReceipt:unknown;
 expectedRoutingIntentSha256:string;
 expectedQueryDigestSha256:string;
 env:NodeJS.ProcessEnv;
 repoRoot:string;
 // This callback is a separately admitted EXISTING Phase5 child, NOT a
 // caller-supplied command or URL. Production wiring must use the exact
 // existing reviewed child and its real GitHub workflow_run identity.
 runPreviouslyAdmittedExistingChild:(
   paths:P6PrivateSourcePaths,
   redactedReceipt:Record<string,unknown>
 )=>Promise<void>;
}
export async function runP6OneSourceThroughExistingP5ChildAdmission(
 args:P6ExistingSourcePrivateBridgeArgs
){
 if(!args||!args.env||
    typeof args.runPreviouslyAdmittedExistingChild!=="function"||
    args.env.GITHUB_ACTIONS!=="true"||
    args.env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    args.env.GITHUB_REF!=="refs/heads/main"||
    args.env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    args.env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(args.env.GITHUB_SHA??"")||
    args.env.GITHUB_SHA!==args.env.V39_P5_APPROVED_CODE_SHA||
    args.env.ADB_AUTO_COLLECT!=="0"||
    !H.test(args.expectedRoutingIntentSha256??"")||
    !H.test(args.expectedQueryDigestSha256??""))
  hold("NO_REAL_GH_CHILD_IDENTITY_OR_INDEPENDENT_PINS");

 let pair:ReturnType<typeof bindP6OnePrivateSourceQueryFromVerifiedIndex>;
 try{
  pair=bindP6OnePrivateSourceQueryFromVerifiedIndex({
   indexHandoff:args.indexHandoff,
   sourcePacketReceipt:args.sourcePacketReceipt,
   expectedRoutingIntentSha256:args.expectedRoutingIntentSha256,
   expectedQueryDigestSha256:args.expectedQueryDigestSha256
  });
 }catch{hold("PRIVATE_SIGNED_SOURCE_REGISTRY_QUERY_PAIR_REFUSED");}

 const summary=pair.redactedSummary;
 // The existing Phase5 child must see exactly the same externally signed
 // source registry SHA, query digest, day and real reviewed main SHA.
 if(args.env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256!==
      summary.registrySha256||
    args.env.P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST!==
      summary.queryDigestSha256||
    args.env.P5_SOURCE_BATCH_RUN_DAY_INDEX!==String(summary.runDayIndex)||
    args.env.V39_P5_CHILD_CONFIRM!==
      "ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET")
  hold("CHILD_ENV_QUERY_DAY_REGISTRY_OR_GO_DRIFT");

 let registry:P5SignedSourceBatchRegistry;
 let packet:P5GitHubOneQueryReleaseEnvelope;
 try{
  registry=(JSON.parse(pair.privateRegistryBytes.toString("utf8"))
    as P5SignedSourceBatchRegistry);
  packet=(JSON.parse(pair.privateQueryBytes.toString("utf8"))
    as P5GitHubOneQueryReleaseEnvelope);
 }catch{hold("PRIVATE_SOURCE_REGISTRY_OR_QUERY_JSON_INVALID");}

 let admission:ReturnType<typeof admitP5SignedDaySourceChild>;
 try{
  admission=admitP5SignedDaySourceChild(
   args.env,pair.privateRegistryBytes,registry,
   pair.privateQueryBytes,packet,
   pair.privateQueryPath,pair.privateRegistryPath
  );
 }catch{
  // A failed Phase5 paid child release cannot be bypassed by a cryptographic
  // index. Return only a safe HOLD without logging private packet fields.
  hold("EXISTING_PHASE5_SOURCE_CHILD_SIGNED_RELEASE_REJECTED");
 }
 if(admission.selectedPacketSha256!==summary.queryPacketSha256||
    admission.selectedQueryDigestSha256!==summary.queryDigestSha256||
    admission.registryFilePath!==pair.privateRegistryPath||
    admission.frozenPacketPath!==pair.privateQueryPath||
    admission.runDayIndex!==summary.runDayIndex||
    admission.physicalFidsGetLimit!==1||
    admission.physicalUnitLimit!==2||
    admission.phase6PaidGoGrantedByThisCode!==false)
  hold("PHASE5_AND_PRIVATE_PHASE6_ADMISSIONS_NOT_EXACTLY_IDENTICAL");

 // Only the already-reviewed same-process cleanup utility may stage files.
 // This code never executes a new paid provider client or dispatches GitHub.
 let result:Record<string,unknown>;
 try{
  result=await withP6VerifiedPrivateSourcePairForExistingChild(
   pair,args.repoRoot,{
    ephemeralSourceRegistryAndQueryPairApproved:true,
    existingSourceChildIndependentlyAdmitted:true,
    privateReaderOnlySourcePairApproved:true,
    existingChildMustRecheckAllReleaseAndSpendGates:true
   },async(paths:P6PrivateSourcePaths,receipt:Record<string,unknown>)=>{
    // Require a second check inside the existing child's own runnable
    // entrypoint. Never treat our admission as a payment authorization.
    await args.runPreviouslyAdmittedExistingChild(paths,receipt);
   }
  );
 }catch{
  hold("EXISTING_CHILD_FAILED_OR_PRIVATE_FILES_NOT_CLEANED");
 }
 if(result?.privateQueryAndRegistryFilesDeleted!==true||
    result?.phase6PaidGoCertifiedHere!==false||
    result?.existingChildOwnPaidAdmissionStillMandatory!==true)
  hold("UNVERIFIED_EXISTING_CHILD_CLEANUP_RECEIPT");

 return Object.freeze({
  schema:P6_SOURCE_EXISTING_CHILD_ADMISSION_SCHEMA,
  status:"PHASE5_EXISTING_SOURCE_CHILD_ADMITTED_AND_FILES_CLEANED",
  runDayIndex:summary.runDayIndex,
  queryDigestSha256:summary.queryDigestSha256,
  queryPacketSha256:summary.queryPacketSha256,
  routingIntentSha256:summary.routingIntentSha256,
  exactSignedRegistrySha256:summary.registrySha256,
  originalPhase5SignedChildAdmissionRechecked:true,
  originalPhase5PerGetTwoUnitMaximumPreserved:true,
  existingOneGetWorkerExecutedByThisModule:false,
  privateSourceQueryAndRegistryCleaned:true,
  providerCallsDirectlyFromThisBridge:0,
  databaseWritesDirectlyFromThisBridge:0,
  githubDispatchesDirectlyFromThisBridge:0,
  didNotIndependentlyCertifyPaidGo:true,
  phase6PaidGoCertifiedHere:false
 });
}
