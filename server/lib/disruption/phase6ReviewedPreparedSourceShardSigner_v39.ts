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
import {
 P6_DAY_EPOCH_REVIEW_SCHEMA,P6_DAY_EPOCH_REVIEW_AUDIENCE,p6DayEpochReviewPreimage,
 verifyP6DayEpochExternalReview,validateP6DayEpochIndexBytes,readP6DayEpochRestrictedReaderClock
} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
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
 independentRegistryRecoveryApproved?:true;
 /** When called from durable daily review, never extend that approval. */
 maximumRetentionNotAfterUtc?:string;
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
 const day=parse<P5SignedOneDayPreparePacket>(dailyPreparePacketBytes,500000,
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
 const expiry=Math.min(until,now+p.maximumReviewRetentionHours*3600000,
  pins.maximumRetentionNotAfterUtc===undefined?Infinity:utc(pins.maximumRetentionNotAfterUtc));
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
   registryReattestedFromCommittedRow:false as boolean,
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


/** Restart recovery before the first physical request and before index genesis.
 * Persisted query wires are reused byte-for-byte. A historical registry has
 * no stored wire in V0098: independently re-attest its exact immutable row at
 * the NEW database clock, never pretend to reproduce a historical signature.
 * No inserts or dispatch. Missing rows alone may receive NEW reviews.
 */
export async function recoverP6ReviewedPreparedSourceDayFromCommittedPackets(args:
 Parameters<typeof signP6ReviewedPreparedSourceDay>[0]&{
 readerClient:{query:(sql:string,values?:any[])=>Promise<any>};
 expectedReaderSessionLogin:string;
 }){
 if(args?.pins?.independentRegistryRecoveryApproved!==true)
  hold("RESTART_RECOVERY_NOT_INDEPENDENTLY_APPROVED");
 if(!args.readerClient||typeof args.readerClient.query!=="function"||
    !/^phase6_private_reader_login_[a-z0-9_]{6,50}$/.test(args.expectedReaderSessionLogin??""))
  hold("RESTART_SEPARATE_PRIVATE_READER_REQUIRED");
 const fresh=await signP6ReviewedPreparedSourceDay(args);
 const p=parse<Policy>(args.policyBytes,20000,args.pins.expectedPolicySha256);
 const qPem=keyInfo(args.queryKey,p.queryReviewerFingerprintSha256);
 const rPem=keyInfo(args.registryKey,p.registryReviewerFingerprintSha256);
 const client=args.readerClient;
 const expected=new Map<string,{kind:string;bytes:Buffer;review:any}>();
 for(const sh of fresh.privateSignedShards){
  const r=sh.registryReviewWire.review;
  expected.set(r.logicalPath,{kind:"SOURCE_DAY_REGISTRY",bytes:sh.registryBytes,review:r});
  for(const q of sh.queryPackets)
   expected.set(q.wire.review.logicalPath,{kind:"SOURCE_QUERY_PACKET",bytes:q.bytes,review:q.wire.review});
 }
 if(expected.size!==fresh.queryCount+fresh.shardCount||
    [...expected.values()].reduce((n,x)=>n+x.bytes.length,0)>16*1024*1024)
  hold("RESTART_EXPECTED_SET_BOUND");
 let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const observed=await readP6DayEpochRestrictedReaderClock(client,args.expectedReaderSessionLogin);
  const now=utc(observed);
  if(now<utc(fresh.observedDatabaseClockUtc)||now>=utc(fresh.retentionNotAfterUtc)||
     fresh.privateSignedShards.some(sh=>sh.queryPackets.some(q=>
      utc(JSON.parse(q.bytes.toString("utf8")).plan.acquisition.scheduledRequestUtc)<=now)))
   hold("RESTART_NO_BACKFILL_OR_EXPIRED");
  const state=await client.query("SELECT (SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39 WHERE run_day_index=$1) AS claims,"+
   "(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=$1) AS revisions",[fresh.runDayIndex]);
  if(state.rowCount!==1||state.rows[0]?.claims!==0||state.rows[0]?.revisions!==0)
   hold("RESTART_INDEX_ALREADY_CLAIMED");
  const selected=await client.query("SELECT logical_path,kind,run_day_index,shard_index,content_sha256,reviewed_code_sha,"+
   "manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,"+
   "committed_at_utc,payload_bytes,review_wire_bytes FROM phase6_private.frozen_native_packet_v39 "+
   "WHERE logical_path=ANY($1::text[]) OR (manifest_sha256=$2 AND run_day_index=$3 AND kind IN ('SOURCE_QUERY_PACKET','SOURCE_DAY_REGISTRY')) LIMIT 769",
   [[...expected.keys()],p.manifestSha256,fresh.runDayIndex]);
  if(selected.rowCount!==selected.rows.length||selected.rows.length>expected.size)hold("RESTART_EXTRA_ROWS");
  const at=(v:any)=>new Date(v instanceof Date?v.getTime():String(v)).toISOString();
  const rows=new Map<string,any>();
  let minExpiry=utc(fresh.retentionNotAfterUtc),reused=0,reattested=0;
  for(const row of selected.rows){
   const x=expected.get(row.logical_path),v=x?.review;
   if(!x||rows.has(row.logical_path)||row.kind!==x.kind||
      row.run_day_index!==fresh.runDayIndex||row.shard_index!==v.shardIndex||
      row.content_sha256!==hash(x.bytes)||row.reviewed_code_sha!==p.approvedCodeSha||
      row.manifest_sha256!==p.manifestSha256||row.rights_sha256!==p.rightsSha256||
      row.external_review_sha256!==v.externalReviewEvidenceSha256||
      !Buffer.isBuffer(row.payload_bytes)||!row.payload_bytes.equals(x.bytes))
    hold("RESTART_IMMUTABLE_PACKET_DRIFT");
   const old=utc(at(row.externally_reviewed_at_utc)),commit=utc(at(row.committed_at_utc)),expiry=utc(at(row.retention_not_after_utc));
   if(old<utc(p.validFromUtc)||old>commit||commit>now||expiry<=now||
      expiry>utc(p.validUntilUtc)||expiry-old>p.maximumReviewRetentionHours*3600000||
      (args.pins.maximumRetentionNotAfterUtc!==undefined&&expiry>utc(args.pins.maximumRetentionNotAfterUtc)))
    hold("RESTART_OLD_ROW_CLOCK_OR_EXPIRY");
   minExpiry=Math.min(minExpiry,expiry);
   if(row.kind==="SOURCE_QUERY_PACKET"){
    if(!Buffer.isBuffer(row.review_wire_bytes)||row.review_wire_bytes.length<100||row.review_wire_bytes.length>4096)
     hold("RESTART_ORIGINAL_QUERY_WIRE_MISSING");
    const wire=JSON.parse(row.review_wire_bytes.toString("utf8"));
    if(!Buffer.from(JSON.stringify(wire),"utf8").equals(row.review_wire_bytes))
     hold("RESTART_ORIGINAL_QUERY_WIRE_NOT_EXACT");
    verifyP6ExternalSourcePostReview(wire,qPem,{
     independentExternalReviewerSignaturePinsApproved:true,expectedKind:v.kind,
     expectedLogicalPath:v.logicalPath,expectedContentSha256:v.contentSha256,
     expectedReviewedMainSha:p.approvedCodeSha,expectedManifestSha256:p.manifestSha256,
     expectedRightsSha256:p.rightsSha256,expectedExternalReviewEvidenceSha256:v.externalReviewEvidenceSha256,
     expectedReviewerPublicKeyFingerprintSha256:p.queryReviewerFingerprintSha256,
     expectedRunDayIndex:fresh.runDayIndex,expectedShardIndex:v.shardIndex});
    if(wire.review.reviewedAtUtc!==at(row.externally_reviewed_at_utc)||
       wire.review.retentionNotAfterUtc!==at(row.retention_not_after_utc)||
       utc(wire.review.validUntilUtc)<=now)
     hold("RESTART_ORIGINAL_QUERY_WIRE_CLOCK_DRIFT");
    minExpiry=Math.min(minExpiry,utc(wire.review.validUntilUtc));
    row.verifiedOriginalWire=wire;reused++;
   }else if(row.review_wire_bytes!==null)
    hold("RESTART_UNEXPECTED_REGISTRY_WIRE");
   rows.set(row.logical_path,row);
  }
  if(fresh.privateSignedShards.some(sh=>utc(sh.hardLatestUtc)>=minExpiry))
   hold("RESTART_EXISTING_EXPIRY_TOO_SHORT_NO_EXTENSION");
  const expiry=new Date(minExpiry).toISOString();
  const bundles=fresh.privateSignedShards.map(sh=>{
   const r=sh.registryReviewWire.review,existing=rows.get(r.logicalPath);
   const queryPackets=sh.queryPackets.map(q=>{
    const original=rows.get(q.wire.review.logicalPath);
    if(original)return {bytes:q.bytes,wire:original.verifiedOriginalWire as typeof q.wire};
    const review={...q.wire.review,reviewedAtUtc:observed,validUntilUtc:expiry,retentionNotAfterUtc:expiry};
    return {bytes:q.bytes,wire:{review,signatureBase64:sign(null,signedP6PrivateSourcePostReviewBytes(review),args.queryKey).toString("base64")}};
   });
   if(existing){
    if(sh.queryPackets.some(q=>!rows.has(q.wire.review.logicalPath)||
        utc(at(rows.get(q.wire.review.logicalPath).committed_at_utc))>utc(at(existing.committed_at_utc))))
     hold("RESTART_COMMITTED_REGISTRY_MISSING_PRIOR_QUERY");
    reattested++;
   }
   const registryExpiry=existing?at(existing.retention_not_after_utc):expiry;
   const validUntilUtc=new Date(Math.min(utc(registryExpiry),...queryPackets.map(q=>utc(q.wire.review.validUntilUtc)))).toISOString();
   if(queryPackets.some(q=>utc(q.wire.review.retentionNotAfterUtc)<utc(registryExpiry)))
    hold("RESTART_REGISTRY_OUTLIVES_QUERY");
   const review={...r,reviewedAtUtc:observed,retentionNotAfterUtc:registryExpiry,validUntilUtc};
   const registryReviewWire={review,signatureBase64:sign(null,sourceDayRegistryReviewPreimage(review),args.registryKey).toString("base64")};
   verifyP6ExternalSourceRegistryLastReview(registryReviewWire,rPem,{
    independentExternalReviewerSignaturePinsApproved:true,expectedRegistryPath:r.logicalPath,
    expectedRegistrySha256:r.registrySha256,expectedManifestSha256:p.manifestSha256,
    expectedCalendarSha256:p.calendarSha256,expectedReleaseSha256:p.releaseSha256,
    expectedRightsSha256:p.rightsSha256,expectedReviewedMainSha:p.approvedCodeSha,
    expectedReviewEvidenceSha256:r.externalReviewEvidenceSha256,expectedEntriesDigestSha256:r.entriesDigestSha256,
    expectedReviewerPublicKeyFingerprintSha256:p.registryReviewerFingerprintSha256,
    expectedRunDayIndex:fresh.runDayIndex,expectedShardIndex:r.shardIndex});
   return {...sh,queryPackets,registryReviewWire,registryReattestedFromCommittedRow:Boolean(existing)};
  });
  await client.query("ROLLBACK");tx=false;
  const result={...fresh,observedDatabaseClockUtc:observed,retentionNotAfterUtc:expiry,
   exactOriginalQueryWiresReused:reused,existingRegistriesFreshlyReattested:reattested,
   historicalRegistrySignatureRecreated:false as const};
  return Object.defineProperty(result,"privateSignedShards",{value:bundles,enumerable:false,writable:false,configurable:false}) as typeof result;
 }finally{if(tx)await client.query("ROLLBACK").catch(()=>{});}
}

/**
 * Initial same-day SOURCE index only, after all actual registry commits.
 * Never fabricates publication timestamps or moves physical GET cutoffs.
 * No publisher credential, INSERT or provider. Existing V0097 publisher
 * and V0098 stored wire persist the independently signed output separately.
 * Later PRE/POST revisions must use their existing append-only path.
 */
export async function signP6InitialSourceIndexAfterRegistryReadback({
 readerClient,expectedReaderSessionLogin,policyBytes,pins,signedDay,registryKey,
 queryPublicKeyPem
}:{
 readerClient:{query:(sql:string,values?:any[])=>Promise<any>};
 expectedReaderSessionLogin:string;policyBytes:Buffer;pins:Pins;
 signedDay:Awaited<ReturnType<typeof signP6ReviewedPreparedSourceDay>>;
 registryKey:KeyObject;queryPublicKeyPem:string
}){
 if(!pins||pins.independentExactPolicyAndDailyReviewApproved!==true||
    pins.existingPaidDispatchApproved!==false||pins.noProviderCredentialsInSigner!==true||
    !/^phase6_private_reader_login_[a-z0-9_]{6,50}$/.test(expectedReaderSessionLogin)||
    !readerClient||typeof readerClient.query!=="function")
  hold("INDEX_NO_SEPARATE_PRIVATE_READER_OR_REVIEW_SCOPE");
 const p=parse<Policy>(policyBytes,20000,pins.expectedPolicySha256);
 const d=signedDay;
 if(p?.schema!=="v39.phase6.delegated-source-review-policy.v1"||
    p.delegatedAutomatedSourceSigningApproved!==true||
    p.approvedCodeSha!==pins.expectedReviewedMainSha||
    p.queryReviewerFingerprintSha256===p.registryReviewerFingerprintSha256||
    d?.schema!=="v39.phase6.delegated-source-day-signed-private-shards.v1"||
    d.approvedPolicySha256!==pins.expectedPolicySha256||
    d.exactDailyReviewSha256!==pins.expectedDailyPreparePacketSha256||
    d.actualPreparedLedgerVerified!==true||d.automatedDelegatedSignatureNotHumanReview!==true||
    d.phase6PaidGo!==false||d.providerCalls!==0||d.databaseWrites!==0||
    !Number.isSafeInteger(d.runDayIndex)||d.runDayIndex<1||d.runDayIndex>31||
    !Number.isSafeInteger(d.queryCount)||d.queryCount<12||d.queryCount>384||
    d.queryCount>p.maxQueriesPerDay||
    !Array.isArray(d.privateSignedShards)||d.privateSignedShards.length!==d.shardCount||
    d.shardCount<1||d.shardCount>384)
  hold("INDEX_UNAPPROVED_SIGNED_DAY_OR_POLICY");
 const rPem=keyInfo(registryKey,p.registryReviewerFingerprintSha256);
 const paths=new Set<string>(),queries=new Set<string>();
 const allExpected=new Map<string,{bytes:Buffer;review:any;kind:string;wireBytes?:Buffer;reattested?:boolean}>();
 const routeDrafts=d.privateSignedShards.map((sh,i)=>{
  const r=sh.registryReviewWire?.review;
  if(sh.shardIndex!==i+1||!r||r.runDayIndex!==d.runDayIndex||
     r.shardIndex!==sh.shardIndex||!Buffer.isBuffer(sh.registryBytes)||
     sh.registryBytes.length>100000||hash(sh.registryBytes)!==r.registrySha256||
     paths.has(r.logicalPath)||!Array.isArray(sh.queryPackets)||
     sh.queryPackets.length<1||sh.queryPackets.length>96)
   hold("INDEX_BAD_REGISTRY_BUNDLE");
  const reg=JSON.parse(sh.registryBytes.toString("utf8"));
  if(reg?.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
     reg.manifestSha256!==p.manifestSha256||reg.runDayIndex!==d.runDayIndex||
     !Array.isArray(reg.entries)||reg.entries.length!==sh.queryPackets.length)
   hold("INDEX_INVALID_SIGNED_REGISTRY");
  verifyP6ExternalSourceRegistryLastReview(sh.registryReviewWire,rPem,{
   independentExternalReviewerSignaturePinsApproved:true,expectedRegistryPath:r.logicalPath,
   expectedRegistrySha256:r.registrySha256,expectedManifestSha256:p.manifestSha256,
   expectedCalendarSha256:p.calendarSha256,expectedReleaseSha256:p.releaseSha256,
   expectedRightsSha256:p.rightsSha256,expectedReviewedMainSha:p.approvedCodeSha,
   expectedReviewEvidenceSha256:r.externalReviewEvidenceSha256,
   expectedEntriesDigestSha256:hash(JSON.stringify(reg.entries)),
   expectedReviewerPublicKeyFingerprintSha256:p.registryReviewerFingerprintSha256,
   expectedRunDayIndex:d.runDayIndex,expectedShardIndex:sh.shardIndex
  });
  if(sh.registryReattestedFromCommittedRow&&pins.independentRegistryRecoveryApproved!==true)
   hold("INDEX_REATTESTATION_NOT_APPROVED");
  paths.add(r.logicalPath);allExpected.set(r.logicalPath,{bytes:sh.registryBytes,review:r,kind:"SOURCE_DAY_REGISTRY",reattested:sh.registryReattestedFromCommittedRow});
  const starts:number[]=[],ends:number[]=[],queryPaths:string[]=[];
  for(let n=0;n<reg.entries.length;n++){
   const e=reg.entries[n],q=sh.queryPackets[n],v=q?.wire?.review;
   if(!v||!Buffer.isBuffer(q.bytes)||q.bytes.length>200000||
      hash(q.bytes)!==e.expectedPacketSha256||v.logicalPath!==e.filePath||
      v.contentSha256!==e.expectedPacketSha256||paths.has(e.filePath)||
      queries.has(e.expectedQueryDigestSha256))
    hold("INDEX_DUPLICATE_OR_CHANGED_SIGNED_QUERY");
   verifyP6ExternalSourcePostReview(q.wire,queryPublicKeyPem,{
    independentExternalReviewerSignaturePinsApproved:true,expectedKind:"SOURCE_QUERY_PACKET",
    expectedLogicalPath:e.filePath,expectedContentSha256:e.expectedPacketSha256,
    expectedReviewedMainSha:p.approvedCodeSha,expectedManifestSha256:p.manifestSha256,
    expectedRightsSha256:p.rightsSha256,expectedExternalReviewEvidenceSha256:v.externalReviewEvidenceSha256,
    expectedReviewerPublicKeyFingerprintSha256:p.queryReviewerFingerprintSha256,
    expectedRunDayIndex:d.runDayIndex,expectedShardIndex:sh.shardIndex
   });
   const packet=JSON.parse(q.bytes.toString("utf8")),a=packet?.plan?.acquisition;
   if(packet?.schema!=="v39.phase5.github-source-one-query-template.v2"||
      packet.manifestSha256!==p.manifestSha256||packet.queryDigestSha256!==e.expectedQueryDigestSha256||
      a?.runDayIndex!==d.runDayIndex||packet.plan.openapiSha256!==p.providerContractSha256||
      packet.plan.reviewedReleaseSha256!==p.releaseSha256||
      packet.plan.reviewedProviderRightsSha256!==p.rightsSha256||
      packet.plan.independentlyApprovedSourceAndRetention!==true||
      packet.plan.githubOnlyOwnerApproved!==true||
      !Number.isSafeInteger(a.maxResponseAndPersistSeconds)||a.maxResponseAndPersistSeconds<1||
      a.maxResponseAndPersistSeconds>3600)
    hold("INDEX_SOURCE_ENVELOPE_OR_PLAN_DRIFT");
   const planned=utc(a.scheduledRequestUtc);
   const latest=Math.min(planned+60000,utc(a.earliestPlannedCutoffUtc)-a.maxResponseAndPersistSeconds*1000-120000);
   if(latest<=planned)hold("INDEX_INVALID_NATIVE_SOURCE_CUTOFF");
   starts.push(planned);ends.push(latest);
   paths.add(e.filePath);queries.add(e.expectedQueryDigestSha256);
   queryPaths.push(e.filePath);
   allExpected.set(e.filePath,{bytes:q.bytes,review:v,kind:"SOURCE_QUERY_PACKET",
    wireBytes:Buffer.from(JSON.stringify(q.wire),"utf8")});
  }
  const first=Math.min(...starts),last=Math.max(...ends);
  return {r,first,last,starts,queryPaths};
 });
 if(queries.size!==d.queryCount||[...allExpected.values()].reduce((n,v)=>n+v.bytes.length,0)>16*1024*1024)
  hold("INDEX_DAY_QUERY_DENOMINATOR_OR_PRIVATE_BYTES_BOUND");
 let tx=false;
 try{
  await readerClient.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await readerClient.query("SET LOCAL statement_timeout='12000ms'");
  await readerClient.query("SET LOCAL lock_timeout='2000ms'");
  const observed=await readP6DayEpochRestrictedReaderClock(readerClient,expectedReaderSessionLogin);
  const now=utc(observed),expiry=utc(d.retentionNotAfterUtc);
  if(now<utc(p.validFromUtc)||now>=utc(p.validUntilUtc)||expiry<=now||
     expiry>utc(p.validUntilUtc)||expiry-now>7*86400000)
   hold("INDEX_POLICY_OR_PACKET_EXPIRY");
  const existing=await readerClient.query(
   "SELECT (SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39 WHERE run_day_index=$1) AS claims,"+
   "(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=$1) AS revisions",
   [d.runDayIndex]);
  if(existing.rowCount!==1||existing.rows[0]?.claims!==0||existing.rows[0]?.revisions!==0)
   hold("INDEX_GENESIS_ALREADY_CLAIMED_NO_REPLAY");
  const res=await readerClient.query(
   "SELECT logical_path,kind,run_day_index,shard_index,content_sha256,reviewed_code_sha,"+
   "manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc,committed_at_utc,payload_bytes,review_wire_bytes "+
   "FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=ANY($1::text[])",
   [[...paths]]);
  if(res.rowCount!==paths.size||res.rows.length!==paths.size)
   hold("INDEX_REGISTRY_OR_QUERY_NOT_FULLY_COMMITTED");
  const committed=new Map<string,number>();
  const at=(v:unknown)=>new Date(v instanceof Date?v.getTime():String(v)).toISOString();
  for(const row of res.rows){
   const x=allExpected.get(row.logical_path),v=x?.review;
   if(!x||committed.has(row.logical_path)||row.kind!==x.kind||
      row.run_day_index!==d.runDayIndex||row.shard_index!==v.shardIndex||
      row.content_sha256!==(v.contentSha256??v.registrySha256)||
      row.reviewed_code_sha!==p.approvedCodeSha||row.manifest_sha256!==p.manifestSha256||
      row.rights_sha256!==p.rightsSha256||row.external_review_sha256!==v.externalReviewEvidenceSha256||
      (!x.reattested&&at(row.externally_reviewed_at_utc)!==v.reviewedAtUtc)||
      at(row.retention_not_after_utc)!==v.retentionNotAfterUtc||
      utc(v.retentionNotAfterUtc)<expiry||utc(v.validUntilUtc)<=now||
      !Buffer.isBuffer(row.payload_bytes)||!row.payload_bytes.equals(x.bytes)||
      (x.wireBytes&&(!Buffer.isBuffer(row.review_wire_bytes)||!row.review_wire_bytes.equals(x.wireBytes))))
    hold("INDEX_ACTUAL_COMMITTED_PACKET_DRIFT");
   const when=utc(at(row.committed_at_utc));
   if(when>now||utc(v.reviewedAtUtc)>now||
      (x!.reattested?(utc(at(row.externally_reviewed_at_utc))>when||when>utc(v.reviewedAtUtc)):
       when<utc(v.reviewedAtUtc)))hold("INDEX_UNTRUSTED_COMMIT_CLOCK");
   committed.set(row.logical_path,when);
  }
  const entries=routeDrafts.map(({r,first,last,starts,queryPaths})=>{
   const published=committed.get(r.logicalPath)??hold("INDEX_MISSING_REGISTRY_COMMIT_CLOCK");
   if(queryPaths.some(path=>!committed.has(path)||committed.get(path)!>published))
    hold("INDEX_REGISTRY_WAS_NOT_COMMITTED_LAST");
   // Do not change actual query clocks. The routing window is derived
   // solely from signed query times and the observed real registry commit.
   const open=Math.max(published,now,first-105*60000);
   if(open>=last)return {entry:null,late:starts.length};
   if(last-open>180*60000)hold("INDEX_OVERLONG_SIGNED_ROUTE");
   return {entry:{lane:"SOURCE",runDayIndex:d.runDayIndex,shardIndex:r.shardIndex,
    filePath:r.logicalPath,fileSha256:r.registrySha256,
    publishedAtUtc:new Date(published).toISOString(),notBeforeUtc:new Date(open).toISOString(),
    hardLatestUtc:new Date(last).toISOString(),reviewEvidenceSha256:r.externalReviewEvidenceSha256,
    sourceRegistryFilePath:null,sourceRegistrySha256:null},
    late:starts.filter(t=>open>t-15*60000).length};
  });
  const usable=entries.flatMap(x=>x.entry?[x.entry]:[]).sort((a,b)=>
   a.publishedAtUtc.localeCompare(b.publishedAtUtc)||a.shardIndex-b.shardIndex);
  if(!usable.length)hold("INDEX_ALL_SOURCE_SHARDS_EXPIRED_NO_BACKFILL");
  const indexBytes=Buffer.from(JSON.stringify({
   schema:"v39.phase6.run-day-scoped-append-only-index.v1",runDayIndex:d.runDayIndex,
   revision:1,previousIndexSha256:null,manifestSha256:p.manifestSha256,calendarSha256:p.calendarSha256,
   reviewedCodeSha:p.approvedCodeSha,reviewedReleaseSha256:p.releaseSha256,
   reviewedRightsSha256:p.rightsSha256,entries:usable
  }),"utf8");
  const review={
   schema:P6_DAY_EPOCH_REVIEW_SCHEMA,audience:P6_DAY_EPOCH_REVIEW_AUDIENCE,
   runDayIndex:d.runDayIndex,indexRevision:1,indexSha256:hash(indexBytes),previousIndexSha256:null,
   reviewedCodeSha:p.approvedCodeSha,manifestSha256:p.manifestSha256,calendarSha256:p.calendarSha256,
   releaseSha256:p.releaseSha256,rightsSha256:p.rightsSha256,
   externalReviewEvidenceSha256:hash(JSON.stringify({policy:pins.expectedPolicySha256,
    day:pins.expectedDailyPreparePacketSha256,registryReadback:usable.map(e=>[
     e.fileSha256,e.publishedAtUtc]),lateQueries:entries.reduce((n,e)=>n+e.late,0)})),
   reviewedAtUtc:observed,validUntilUtc:d.retentionNotAfterUtc,
   retentionNotAfterUtc:d.retentionNotAfterUtc,reviewerPublicKeyFingerprintSha256:p.registryReviewerFingerprintSha256
  };
  const wire={review,signatureBase64:sign(null,p6DayEpochReviewPreimage(review),registryKey).toString("base64")};
  const indexPins={independentExternalReviewerSignaturePinsApproved:true,
   privateDayIndexPublicationApproved:true,expectedRunDayIndex:d.runDayIndex,expectedIndexRevision:1,
   expectedIndexSha256:review.indexSha256,expectedPreviousIndexSha256:null,
   expectedReviewedCodeSha:p.approvedCodeSha,expectedManifestSha256:p.manifestSha256,
   expectedCalendarSha256:p.calendarSha256,expectedReleaseSha256:p.releaseSha256,
   expectedRightsSha256:p.rightsSha256,expectedExternalReviewEvidenceSha256:review.externalReviewEvidenceSha256,
   expectedReviewerPublicKeyFingerprintSha256:p.registryReviewerFingerprintSha256};
  verifyP6DayEpochExternalReview({wire,publicKeyPem:rPem,pins:indexPins});
  validateP6DayEpochIndexBytes(indexBytes,review);
  await readerClient.query("ROLLBACK");tx=false;
  const result={schema:"v39.phase6.initial-source-index-signed-after-real-commit-readback.v1" as const,
   runDayIndex:d.runDayIndex,queryCount:d.queryCount,registryCount:usable.length,
   expiredShardCount:entries.length-usable.length,
   queryCountTooLateForNormalParentLeadAtRead:entries.reduce((n,e)=>n+e.late,0),
   indexSha256:review.indexSha256,observedDatabaseClockUtc:observed,
   automatedDelegatedSignatureNotHumanReview:true as const,actualIndexPublicationVerified:false as const,
   providerCalls:0 as const,databaseWrites:0 as const,githubDispatches:0 as const,phase6PaidGo:false as const};
  return Object.defineProperty(result,"privateSignedIndex",{
   value:{wire,indexBytes,pins:indexPins,publicKeyPem:rPem},enumerable:false,writable:false,configurable:false
  }) as typeof result & {readonly privateSignedIndex:{wire:typeof wire;indexBytes:Buffer;pins:typeof indexPins;publicKeyPem:string}};
 }finally{if(tx)await readerClient.query("ROLLBACK").catch(()=>{});}
}
