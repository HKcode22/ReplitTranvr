/**
 * Delegated automated SOURCE signing from an EXACT independently approved
 * per-day preparation packet and a separately approved study signing policy.
 * Reads the actual saved draw and exact initial V0079/V0082 committed ledger
 * in fresh read-only snapshots. No provider, storage publication or dispatch.
 *
 * The stable policy and daily packet SHA must come from protected independent
 * approval, not from this module. This is NOT a human review, a legal rights
 * verdict, or the still-missing prospective daily approval-packet producer.
 */
import {createHash,createPublicKey,sign,type KeyObject} from "node:crypto";
import type {Pool} from "pg";
import type {P5SignedOneDayPreparePacket} from "../../../scripts/v39_phase5_one_signed_day_source_prepare_github_owner_v39";
import {readCommittedP5DayCandidateGrid} from "./phase5CommittedDayGridReadonly_v39";
import {planP5Stage8FromCommittedDayReadback} from "./phase5V0079DailyPreparedQueryProposals_v39";
import {readBackP5Stage9PreparedDayOnce} from "./phase5Stage9V0082AtomicSegmentedDayPrepare_v39";
import {planP6StoredSourceDraftShards} from "./phase6StoredSourceDraftShardPlanner_v39";
import {
 P6_SOURCE_POST_REVIEW_SCHEMA,P6_SOURCE_POST_REVIEW_AUDIENCE,
 signedP6PrivateSourcePostReviewBytes,verifyP6ExternalSourcePostReview
} from "./phase6PrivateSourcePostReadOnce_v39.mjs";
import {
 P6_PRIVATE_SOURCE_REGISTRY_REVIEW_SCHEMA,sourceDayRegistryReviewPreimage,
 verifyP6ExternalSourceRegistryLastReview
} from "./phase6PrivateSourceRegistryLastPublisher_v39.mjs";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const ROLE=/^phase5_fids_prepare_[a-z0-9_]{6,42}$/;
const hold=(s:string):never=>{throw Error("HOLD_P6_REVIEWED_SOURCE_SIGNER_"+s);};
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const utc=(s:string)=>{
 const n=Date.parse(s);
 if(!Number.isFinite(n)||new Date(n).toISOString()!==s)hold("INVALID_POLICY_CLOCK");
 return n;
};
type Policy={
 schema:"v39.phase6.delegated-source-review-policy.v1";
 approvedCodeSha:string;manifestSha256:string;calendarSha256:string;configSha256:string;
 frameSha256:string;releaseSha256:string;rightsSha256:string;providerContractSha256:string;
 reviewed31DaySourceRequestGridSha256:string;reviewedCategoryBudgetSha256:string;
 expectedPrepareRole:string;validFromUtc:string;validUntilUtc:string;
 maximumReviewRetentionHours:number;maxQueriesPerDay:number;
 queryReviewerFingerprintSha256:string;registryReviewerFingerprintSha256:string;
 delegatedAutomatedSourceSigningApproved:true;
};
type Pins={
 independentExactPolicyAndDailyReviewApproved:true;
 expectedPolicySha256:string;expectedDailyPreparePacketSha256:string;
 expectedReviewedMainSha:string;existingPaidDispatchApproved:false;
 noProviderCredentialsInSigner:true;
};
function parse<T>(bytes:Buffer,max:number,digest:string):T{
 if(!SHA.test(digest??"")||!Buffer.isBuffer(bytes)||bytes.length<100||
    bytes.length>max||hash(bytes)!==digest)hold("UNPINNED_EXACT_APPROVAL_BYTES");
 try{return JSON.parse(bytes.toString("utf8")) as T;}
 catch{return hold("APPROVAL_NOT_JSON");}
}
function keyInfo(key:KeyObject,fp:string){
 try{
  if(key?.type!=="private"||key.asymmetricKeyType!=="ed25519")hold("WRONG_KEY_TYPE");
  const pub=createPublicKey(key);
  if(!SHA.test(fp)||hash(pub.export({format:"der",type:"spki"}))!==fp)
   hold("SIGNER_KEY_NOT_APPROVED_BY_POLICY");
  return pub.export({format:"pem",type:"spki"}).toString();
 }catch{return hold("SIGNER_KEY_NOT_APPROVED_BY_POLICY");}
}
export async function signP6ReviewedPreparedSourceDay({
 readPool,policyBytes,dailyPreparePacketBytes,pins,queryKey,registryKey
}:{
 readPool:Pick<Pool,"connect">;policyBytes:Buffer;dailyPreparePacketBytes:Buffer;
 pins:Pins;queryKey:KeyObject;registryKey:KeyObject
}){
 if(!pins||pins.independentExactPolicyAndDailyReviewApproved!==true||
    pins.existingPaidDispatchApproved!==false||pins.noProviderCredentialsInSigner!==true||
    !CODE.test(pins.expectedReviewedMainSha??""))hold("NO_SEPARATE_SIGNER_AUTHORITY");
 const p=parse<Policy>(policyBytes,20000,pins.expectedPolicySha256);
 const day=parse<P5SignedOneDayPreparePacket>(dailyPreparePacketBytes,36000,
  pins.expectedDailyPreparePacketSha256);
 const input=day?.reviewedPrepareInput,r=input?.readScope,z=input?.stage9Review,
  s=input?.sourceReview;
 if(p?.schema!=="v39.phase6.delegated-source-review-policy.v1"||
    p.delegatedAutomatedSourceSigningApproved!==true||
    p.approvedCodeSha!==pins.expectedReviewedMainSha||
    ![p.manifestSha256,p.calendarSha256,p.configSha256,p.frameSha256,p.releaseSha256,
      p.rightsSha256,p.providerContractSha256,p.reviewed31DaySourceRequestGridSha256,
      p.reviewedCategoryBudgetSha256,p.queryReviewerFingerprintSha256,
      p.registryReviewerFingerprintSha256].every(x=>SHA.test(x??""))||
    !ROLE.test(p.expectedPrepareRole??"")||
    p.queryReviewerFingerprintSha256===p.registryReviewerFingerprintSha256||
    !Number.isSafeInteger(p.maximumReviewRetentionHours)||p.maximumReviewRetentionHours<1||
    p.maximumReviewRetentionHours>168||
    !Number.isSafeInteger(p.maxQueriesPerDay)||p.maxQueriesPerDay<12||p.maxQueriesPerDay>384||
    day?.schema!=="v39.phase5.github-signed-one-day-source-preparation.v1"||
    day.independentlyReviewedExactDaySourcePacket!==true||
    day.approvedCodeSha!==p.approvedCodeSha||day.manifestSha256!==p.manifestSha256||
    !r||!s||!z||r.runDayIndex!==day.runDayIndex||
    !Number.isSafeInteger(day.runDayIndex)||day.runDayIndex<1||day.runDayIndex>31||
    z.independentFreezeApproved!==true||z.independentRightsReviewApproved!==true||
    z.githubOnlyProspectiveOwnerApproved!==true||
    r.expectedRestrictedReaderRole!==p.expectedPrepareRole||
    z.expectedRestrictedWriterRole!==p.expectedPrepareRole||
    r.expectedManifestSha256!==p.manifestSha256||z.expectedManifestSha256!==p.manifestSha256||
    s.manifestSha256!==p.manifestSha256||
    r.expectedCalendarSha256!==p.calendarSha256||z.expectedCalendarSha256!==p.calendarSha256||
    s.calendarSha256!==p.calendarSha256||
    r.expectedConfigSha256!==p.configSha256||z.expectedConfigSha256!==p.configSha256||
    s.configSha256!==p.configSha256||
    r.expectedFrameSha256!==p.frameSha256||z.expectedFrameSha256!==p.frameSha256||
    s.frameSha256!==p.frameSha256||
    r.expectedProviderContractSha256!==p.providerContractSha256||
    z.expectedProviderContractSha256!==p.providerContractSha256||
    s.providerContractSha256!==p.providerContractSha256||
    z.expectedReleaseSha256!==p.releaseSha256||s.reviewedReleaseSha256!==p.releaseSha256||
    z.expectedRightsReviewSha256!==p.rightsSha256||s.rightsReviewSha256!==p.rightsSha256||
    z.reviewed31DaySourceRequestGridSha256!==p.reviewed31DaySourceRequestGridSha256||
    z.reviewedCategoryBudgetSha256!==p.reviewedCategoryBudgetSha256)
  hold("APPROVED_STUDY_OR_DAILY_REVIEW_DRIFT");
 const qPem=keyInfo(queryKey,p.queryReviewerFingerprintSha256);
 const rPem=keyInfo(registryKey,p.registryReviewerFingerprintSha256);
 const from=utc(p.validFromUtc),until=utc(p.validUntilUtc);
 if(until<=from)hold("INVALID_POLICY_VALIDITY");
 // Reconstruct from REAL DB, never caller-supplied stage7/8/drafts.
 const stage7=await readCommittedP5DayCandidateGrid(readPool,r);
 const stage8=planP5Stage8FromCommittedDayReadback(stage7,s);
 if(stage8.sourceQueryCount>p.maxQueriesPerDay||
    stage8.dayProposalSha256!==z.expectedProposalSha256||
    stage7.selectedDayCandidateGrid.sourceCandidateDigestSha256!==z.expectedSourceCandidateDigestSha256)
  hold("ACTUAL_DYNAMIC_DAY_NOT_IN_EXACT_REVIEW");
 const drafts=planP6StoredSourceDraftShards(stage7,stage8,{
  expectedDayProposalSha256:z.expectedProposalSha256,
  expectedCandidateGridSha256:z.expectedSourceCandidateDigestSha256,
  expectedManifestSha256:p.manifestSha256
 });
 const proof=await readBackP5Stage9PreparedDayOnce(readPool,{...z,proposal:stage8});
 const now=utc(proof.observedDatabaseClockUtc);
 const expiry=Math.min(until,now+p.maximumReviewRetentionHours*3600000);
 if(now<from||now>=until||expiry<=now||
    drafts.privateDraftShards.some(sh=>utc(sh.hardLatestUtc)>=expiry))
  hold("POLICY_OR_REVIEW_RETENTION_DOES_NOT_COVER_ACTUAL_DAY");
 const reviewedAtUtc=proof.observedDatabaseClockUtc,retentionNotAfterUtc=new Date(expiry).toISOString();
 const evidence=(lane:string,scope:string)=>hash(JSON.stringify({
  schema:"v39.phase6.delegated-source-policy-evidence.v1",
  signingPolicySha256:pins.expectedPolicySha256,
  reviewedDailyPreparePacketSha256:pins.expectedDailyPreparePacketSha256,
  exactSourceProposalSha256:proof.sourceProposalSha256,
  savedDrawSha256:stage8.earlyDrawSha256,lane,scope
 }));
 const bundles=drafts.privateDraftShards.map(sh=>{
  const queryPackets=sh.entries.map(e=>{
   const unsigned=e.unsignedDraft.unsignedQueryEnvelope;
   if(unsigned.plan.independentlyApprovedSourceAndRetention!==false||
      unsigned.plan.githubOnlyOwnerApproved!==false||
      unsigned.queryDigestSha256!==e.queryDigestSha256)
    hold("DRAFT_NOT_UNSIGNED_OR_QUERY_DRIFT");
   // The existing two positive booleans are materialized ONLY after
   // independently approved policy/day bytes and actual DB readback.
   const bytes=Buffer.from(JSON.stringify({...unsigned,plan:{...unsigned.plan,
    independentlyApprovedSourceAndRetention:true,githubOnlyOwnerApproved:true}}),"utf8");
   if(bytes.length>200000)hold("SOURCE_PACKET_OVERSIZE");
   const logicalPath="data-collection/phase5/frozen/sourceq_d"+
    day.runDayIndex+"_"+e.queryDigestSha256+".json";
   const review={
    schema:P6_SOURCE_POST_REVIEW_SCHEMA,audience:P6_SOURCE_POST_REVIEW_AUDIENCE,
    kind:"SOURCE_QUERY_PACKET",logicalPath,contentSha256:hash(bytes),
    reviewedCodeSha:p.approvedCodeSha,manifestSha256:p.manifestSha256,rightsSha256:p.rightsSha256,
    runDayIndex:day.runDayIndex,shardIndex:sh.shardIndex,
    externalReviewEvidenceSha256:evidence("SOURCE_QUERY",e.queryDigestSha256),
    reviewedAtUtc,retentionNotAfterUtc,validUntilUtc:retentionNotAfterUtc,
    reviewerPublicKeyFingerprintSha256:p.queryReviewerFingerprintSha256
   };
   const wire={review,signatureBase64:sign(null,signedP6PrivateSourcePostReviewBytes(review),queryKey).toString("base64")};
   verifyP6ExternalSourcePostReview(wire,qPem,{
    independentExternalReviewerSignaturePinsApproved:true,expectedKind:review.kind,
    expectedLogicalPath:logicalPath,expectedContentSha256:review.contentSha256,
    expectedReviewedMainSha:p.approvedCodeSha,expectedManifestSha256:p.manifestSha256,
    expectedRightsSha256:p.rightsSha256,expectedExternalReviewEvidenceSha256:review.externalReviewEvidenceSha256,
    expectedReviewerPublicKeyFingerprintSha256:p.queryReviewerFingerprintSha256,
    expectedRunDayIndex:day.runDayIndex,expectedShardIndex:sh.shardIndex
   });
   return {entry:{filePath:logicalPath,expectedPacketSha256:review.contentSha256,
    expectedQueryDigestSha256:e.queryDigestSha256},packet:{bytes,wire}};
  });
  const entries=queryPackets.map(q=>q.entry);
  const registryBytes=Buffer.from(JSON.stringify({
   schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
   manifestSha256:p.manifestSha256,runDayIndex:day.runDayIndex,entries
  }),"utf8");
  const logicalPath="data-collection/phase5/frozen/source_d"+day.runDayIndex+"_s"+
   sh.shardIndex+"_"+stage8.dayProposalSha256+".json";
  const review={
   schema:P6_PRIVATE_SOURCE_REGISTRY_REVIEW_SCHEMA,
   audience:"HKcode22/ReplitTranvr:PHASE6_SOURCE_DAY_REGISTRY_REVIEW_ONLY",
   logicalPath,registrySha256:hash(registryBytes),manifestSha256:p.manifestSha256,
   calendarSha256:p.calendarSha256,releaseSha256:p.releaseSha256,rightsSha256:p.rightsSha256,
   reviewedCodeSha:p.approvedCodeSha,externalReviewEvidenceSha256:evidence("SOURCE_REGISTRY",String(sh.shardIndex)),
   entriesDigestSha256:hash(JSON.stringify(entries)),runDayIndex:day.runDayIndex,shardIndex:sh.shardIndex,
   reviewedAtUtc,validUntilUtc:retentionNotAfterUtc,retentionNotAfterUtc,
   reviewerPublicKeyFingerprintSha256:p.registryReviewerFingerprintSha256
  };
  const registryReviewWire={review,signatureBase64:sign(null,sourceDayRegistryReviewPreimage(review),registryKey).toString("base64")};
  verifyP6ExternalSourceRegistryLastReview(registryReviewWire,rPem,{
   independentExternalReviewerSignaturePinsApproved:true,expectedRegistryPath:logicalPath,
   expectedRegistrySha256:review.registrySha256,expectedManifestSha256:p.manifestSha256,
   expectedCalendarSha256:p.calendarSha256,expectedReleaseSha256:p.releaseSha256,expectedRightsSha256:p.rightsSha256,
   expectedReviewedMainSha:p.approvedCodeSha,expectedReviewEvidenceSha256:review.externalReviewEvidenceSha256,
   expectedEntriesDigestSha256:review.entriesDigestSha256,
   expectedReviewerPublicKeyFingerprintSha256:p.registryReviewerFingerprintSha256,
   expectedRunDayIndex:day.runDayIndex,expectedShardIndex:sh.shardIndex
  });
  return {shardIndex:sh.shardIndex,registryBytes,registryReviewWire,
   queryPackets:queryPackets.map(q=>q.packet),
   earliestProposedNotBeforeUtc:sh.earliestProposedNotBeforeUtc,
   latestFirstQueryParentReviewUtc:sh.latestFirstQueryParentReviewUtc,hardLatestUtc:sh.hardLatestUtc};
 });
 const result={schema:"v39.phase6.delegated-source-day-signed-private-shards.v1" as const,
  runDayIndex:day.runDayIndex,queryCount:proof.verifiedQueryCount,shardCount:bundles.length,
  actualPreparedLedgerVerified:true as const,approvedPolicySha256:pins.expectedPolicySha256,
  exactDailyReviewSha256:pins.expectedDailyPreparePacketSha256,
  observedDatabaseClockUtc:reviewedAtUtc,retentionNotAfterUtc,
  automatedDelegatedSignatureNotHumanReview:true as const,
  actualPublicationVerified:false as const,providerCalls:0 as const,
  databaseWrites:0 as const,githubDispatches:0 as const,phase6PaidGo:false as const};
 return Object.defineProperty(result,"privateSignedShards",{
  value:bundles,enumerable:false,writable:false,configurable:false
 }) as typeof result & {readonly privateSignedShards:readonly typeof bundles[number][]};
}
