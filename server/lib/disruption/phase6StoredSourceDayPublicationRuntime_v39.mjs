/**
 * One bounded SOURCE day publication, from a cryptographically verified
 * durable V0099 daily review. Reuses the exact signer, independent
 * restart recovery, registry-last publisher and V0097 index writer.
 * No provider credentials, paid dispatch, or new DDL. This library is
 * not itself the independent production authorization boundary.
 */
import {createHash} from "node:crypto";
import {readP6DailyPrepareReviewOnce} from "./phase6PrivateDailyPrepareReviewTransport_v39.mjs";
import {recoverP6ReviewedPreparedSourceDayFromCommittedPackets,signP6InitialSourceIndexAfterRegistryReadback}
 from "./phase6ReviewedPreparedSourceShardSigner_v39.ts";
import {publishP6StoredSourceShardOnce} from "./phase6StoredSourceShardPublication_v39.mjs";
import {publishP6DayEpochIndexRevisionOnce} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly} from "./phase6DayEpochOriginalSemanticHandoff_v39.mjs";
const SHA=/^[a-f0-9]{64}$/;
const h=b=>createHash("sha256").update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P6_SOURCE_DAY_PUBLICATION_RUNTIME_"+s);};
const shared=["reviewedCodeSha","manifestSha256","calendarSha256","releaseSha256","rightsSha256"];
export async function runP6StoredSourceDayPublication({
 readerClient,publisherClient,prepareReadPool,dailyTrust,sourceTrust,
 signingPolicyBytes,expectedSigningPolicySha256,queryKey,registryKey,scope
}){
 if(scope?.independentlyApprovedSourceDayPublicationRuntime!==true||
    scope.independentlyApprovedReadbackRecovery!==true||
    scope.existingPaidDispatchApproved!==false||scope.adbAutoCollect!=="0"||scope.phase6ProcessArmed!=="0"||
    !readerClient||!publisherClient||readerClient===publisherClient||
    !prepareReadPool||typeof prepareReadPool.connect!=="function"||
    dailyTrust?.independentDailyReviewerTrustApproved!==true||
    sourceTrust?.independentStudyTrustPinsApproved!==true||
    sourceTrust.expectedReaderSessionLogin!==scope.expectedReaderSessionLogin||
    !shared.every(k=>dailyTrust[k]===sourceTrust[k])||
    !Buffer.isBuffer(signingPolicyBytes)||signingPolicyBytes.length>20000||
    !SHA.test(expectedSigningPolicySha256??"")||h(signingPolicyBytes)!==expectedSigningPolicySha256||
    !/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/.test(scope.expectedPublisherSessionLogin??""))
  hold("NO_EXACT_INDEPENDENT_NONPAID_SCOPE");
 let policy;
 try{policy=JSON.parse(signingPolicyBytes.toString("utf8"));}catch{hold("BAD_SIGNING_POLICY");}
 if(policy?.schema!=="v39.phase6.delegated-source-review-policy.v1"||
    policy.delegatedAutomatedSourceSigningApproved!==true||
    policy.approvedCodeSha!==sourceTrust.reviewedCodeSha||
    !["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>policy[k]===sourceTrust[k])||
    !["configSha256","frameSha256","providerContractSha256","reviewed31DaySourceRequestGridSha256","reviewedCategoryBudgetSha256"].every(k=>policy[k]===dailyTrust[k])||
    policy.queryReviewerFingerprintSha256!==sourceTrust.queryReviewerFingerprintSha256||
    policy.registryReviewerFingerprintSha256!==sourceTrust.registryReviewerFingerprintSha256||
    policy.registryReviewerFingerprintSha256!==sourceTrust.dayReviewerFingerprintSha256||
    dailyTrust.reviewerFingerprintSha256===policy.queryReviewerFingerprintSha256||
    dailyTrust.reviewerFingerprintSha256===policy.registryReviewerFingerprintSha256)
  hold("INDEPENDENT_STUDY_POLICY_OR_KEY_SCOPE_DRIFT");
 const day=dailyTrust.runDayIndex;
 const readIndex=async()=>{
  const stored=await readP6StoredPrivateReviewOnce({client:readerClient,trust:sourceTrust,
   scope:{privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false},
   selector:{kind:"CURRENT_DAY",runDayIndex:day}});
  return hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly({client:readerClient,
   pins:stored.pins,wire:stored.wire,publicKeyPem:stored.publicKeyPem,
   scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
 };
 // A verified existing index is a no-write observation, NOT proof of
 // a new publication or complete day's paid acquisition. If expired,
 // invalid or unreadable, hold rather than attempt to replace it.
 try{
  const existing=await readIndex();
  return Object.freeze({status:"EXISTING_SIGNED_DAY_INDEX_VERIFIED_NO_REPLAY",
   runDayIndex:day,indexSha256:existing.redactedSummary.externallySignedDayEpochIndexSha256,
   insertedQueryCount:0,insertedRegistryCount:0,insertedIndexCount:0,
   providerCalls:0,githubDispatches:0,phase6PaidGo:false});
 }catch(e){
  if(e?.message!=="HOLD_P6_STORED_REVIEW_CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED")throw e;
 }
 const daily=await readP6DailyPrepareReviewOnce({client:readerClient,trust:dailyTrust,
  scope:{privateDailyReviewTransportApproved:true,existingPaidDispatchApproved:false,
   adbAutoCollect:"0",phase6ProcessArmed:"0",expectedSessionLogin:scope.expectedReaderSessionLogin}});
 const originalReview=daily.privateWire.review;
 const pins={independentExactPolicyAndDailyReviewApproved:true,
  expectedPolicySha256:expectedSigningPolicySha256,expectedDailyPreparePacketSha256:daily.exactDailyPacketSha256,
  expectedReviewedMainSha:sourceTrust.reviewedCodeSha,existingPaidDispatchApproved:false,
  noProviderCredentialsInSigner:true,independentRegistryRecoveryApproved:true,
  maximumRetentionNotAfterUtc:originalReview.retentionNotAfterUtc};
 // Recovery is also safe with zero existing rows. It reconstructs from
 // actual prepared ledger + original review bytes, validates all existing
 // immutable rows, and creates NEW wires only for missing rows.
 const signed=await recoverP6ReviewedPreparedSourceDayFromCommittedPackets({
  readPool:prepareReadPool,policyBytes:signingPolicyBytes,dailyPreparePacketBytes:daily.privatePacketBytes,
  pins,queryKey,registryKey,readerClient,expectedReaderSessionLogin:scope.expectedReaderSessionLogin});
 let queries=0,registries=0,verified=0;
 for(const shard of signed.privateSignedShards){
  const r=shard.registryReviewWire.review;
  const bound=new Date(Math.max(Date.parse(r.retentionNotAfterUtc),
   ...shard.queryPackets.map(q=>Date.parse(q.wire.review.retentionNotAfterUtc)))).toISOString();
  if(bound>originalReview.retentionNotAfterUtc)hold("SHARD_REVIEW_EXTENDS_DURABLE_APPROVAL");
  const got=await publishP6StoredSourceShardOnce({publisherClient,readerClient,trust:sourceTrust,
   registryBytes:shard.registryBytes,registryReviewWire:shard.registryReviewWire,queryPackets:shard.queryPackets,scope:{
    privateSourceShardPublicationApproved:true,separateProviderContentRightsReviewApproved:true,
    existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
    resumeFromIndependentReadbackApproved:true,
    registryReattestationFromCommittedRowApproved:shard.registryReattestedFromCommittedRow===true,
    expectedPublisherSessionLogin:scope.expectedPublisherSessionLogin,
    expectedProviderContractSha256:dailyTrust.providerContractSha256,
    approvedRetentionNotAfterUtc:bound,expectedRunDayIndex:day,expectedShardIndex:shard.shardIndex,
    expectedRegistryPath:r.logicalPath,expectedRegistrySha256:r.registrySha256}});
  queries+=got.insertedQueryCount;registries+=got.insertedRegistryCount;verified+=got.independentlyReadBackQueryCount;
 }
 if(verified!==signed.queryCount)hold("INCOMPLETE_SOURCE_QUERY_READBACK");
 const idx=await signP6InitialSourceIndexAfterRegistryReadback({readerClient,
  expectedReaderSessionLogin:scope.expectedReaderSessionLogin,policyBytes:signingPolicyBytes,pins,
  signedDay:signed,registryKey,queryPublicKeyPem:sourceTrust.queryReviewerPublicKeyPem});
 const put=await publishP6DayEpochIndexRevisionOnce({client:publisherClient,...idx.privateSignedIndex,
  scope:{privateDayIndexStorageApproved:true,independentProviderContentsReviewApproved:true,
   existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
   expectedPublisherSessionLogin:scope.expectedPublisherSessionLogin,
   approvedCodeSha:sourceTrust.reviewedCodeSha,approvedCalendarSha256:sourceTrust.calendarSha256,
   approvedRightsSha256:sourceTrust.rightsSha256,approvedRetentionNotAfterUtc:signed.retentionNotAfterUtc,
   persistVerifiedReviewWire:true}});
 const observed=await readIndex();
 if(put.indexSha256!==idx.indexSha256||observed.redactedSummary.externallySignedDayEpochIndexSha256!==idx.indexSha256)
  hold("COMMITTED_INDEX_INDEPENDENT_READBACK_DRIFT_NO_REPLAY");
 return Object.freeze({status:"SOURCE_DAY_SIGNED_PUBLISHED_AND_READ_BACK_NO_PAID_GO",runDayIndex:day,
  indexSha256:idx.indexSha256,verifiedQueryCount:verified,insertedQueryCount:queries,
  insertedRegistryCount:registries,insertedIndexCount:1,expiredShardCount:idx.expiredShardCount,
  queryCountTooLateForNormalParentLeadAtRead:idx.queryCountTooLateForNormalParentLeadAtRead,
  providerCalls:0,githubDispatches:0,phase6PaidGo:false});
}
