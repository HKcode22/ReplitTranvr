/** T24 comparator transport in the already staged V0101 private table.
 * The T24 registry has its own reviewed wire; no additional day-index
 * revision or queue schema needed. Its SOURCE provenance is the EXISTING
 * independently signed current day. The T24 PRE/witness writer remains the
 * original Stage14/V0081 queue worker. No provider, physical outcome or GO. */
import {createHash,createPublicKey,sign,verify} from "node:crypto";
import {readP6DayEpochRestrictedReaderClock,readP6DayEpochRestrictedPublisherClock} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateP6DayEpochFullRegistriesReadOnly} from "./phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {inspectP6DayEpochExistingShardSemanticsNoGo} from "./phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {verifyP5CdFrozenRoster} from "./phase5CdGithubBoundedPreTick_v39.ts";
import {preflightP5Stage14ReviewedPermitV39} from "./phase5V0079SingleBoundFlightPreWriter_v39.ts";
import {completeP6PostcommitReviewedPreBatch} from "./phase6StoredSourceNativeCandidateAudit_v39.mjs";
const TABLE="phase6_private.frozen_native_packet_v39";
const H=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const REG=/^data-collection\/phase5\/frozen\/t24r_[A-Za-z0-9_-]{8,100}\.json$/;
const PACK=/^data-collection\/phase5\/frozen\/t24p_[A-Za-z0-9_-]{8,100}\.json$/;
const SRC=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const ID=/^leg:[a-zA-Z0-9:|._-]{5,196}$/;
const schema="v39.phase6.native-t24-private-registry.v1",reviewSchema="v39.phase6.native-t24-registry-ed25519.v1";
const AUD="HKcode22/ReplitTranvr:PHASE6_T24_NATIVE_PRE_REGISTRY_ONLY";
const hold=s=>{throw Error("HOLD_P6_PRIVATE_T24_REGISTRY_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const bytes=o=>Buffer.from(JSON.stringify(o),"utf8");
const utc=s=>{if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)hold("NONEXACT_CLOCK");return Date.parse(s);};
const dbAt=s=>{const d=new Date(s instanceof Date?s.getTime():String(s));if(!Number.isFinite(d.getTime()))hold("INVALID_DB_CLOCK");return d.toISOString();};
const keys=(x,a)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join("|")===a.slice().sort().join("|");
const ro={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
const seal=(x,k)=>{const d=Object.getOwnPropertyDescriptor(x??{},k);return Boolean(d&&!d.enumerable&&!d.writable);};
function parse(b,max){
 if(!Buffer.isBuffer(b)||b.length<100||b.length>max)hold("PRIVATE_BYTES_SIZE");
 let x;try{x=JSON.parse(b.toString("utf8"));}catch{hold("PRIVATE_JSON");}
 if(!bytes(x).equals(b))hold("PRIVATE_JSON_NONCANONICAL");return x;
}
function trustCheck(t){
 if(t?.independentStudyTrustPinsApproved!==true||t.independentNativeT24RegistryApproved!==true||
    !CODE.test(t.reviewedCodeSha??"")||![t.manifestSha256,t.calendarSha256,t.rightsSha256,t.releaseSha256,
     t.expectedT24ReviewerFingerprintSha256,t.expectedT24PolicySha256,t.expectedFrameSha256,t.expectedConfigSha256].every(x=>H.test(x??""))||
    !Number.isSafeInteger(t.maximumPrivateRetentionHours)||t.maximumPrivateRetentionHours<1||t.maximumPrivateRetentionHours>168||
    utc(t.policyValidFromUtc)>=utc(t.policyValidUntilUtc)||
    typeof t.expectedSelectedTVersion!=="string"||!t.expectedSelectedTVersion.length||
    [t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256].includes(t.expectedT24ReviewerFingerprintSha256))
  hold("NO_PINNED_T24_REGISTRY_POLICY");
 let pub;try{pub=createPublicKey(t.t24ReviewerPublicKeyPem);}catch{hold("BAD_T24_REVIEWER_PUBLIC_KEY");}
 if(pub.asymmetricKeyType!=="ed25519"||hash(pub.export({format:"der",type:"spki"}))!==t.expectedT24ReviewerFingerprintSha256)
  hold("BAD_T24_REVIEWER_PUBLIC_KEY");
 return pub;
}
const preimage=r=>Buffer.concat([Buffer.from("HKcode22/ReplitTranvr:PHASE6_T24_NATIVE_PRE_REGISTRY:v1\n"),bytes(r)]);
/** The source is never an arbitrary passed file. Require exact verified
 * current index bytes and its SOURCE registry entry/byte digest. */
function sourceFromIndex(index,t,registry){
 const z=index?.redactedSummary,h=index?.privateParsedIndex;
 if(z?.status!=="SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH"||z.externalEd25519ReviewerVerified!==true||
    z.restrictedPrivatePg16ReaderVerified!==true||z.providerCalls!==0||z.databaseWrites!==0||z.phase6PaidGo!==false||
    z.runDayIndex!==registry.runDayIndex||h?.runDayIndex!==registry.runDayIndex||h.manifestSha256!==t.manifestSha256||
    h.reviewedCodeSha!==t.reviewedCodeSha||h.reviewedRightsSha256!==t.rightsSha256||h.reviewedReleaseSha256!==t.releaseSha256||
    h.calendarSha256!==t.calendarSha256||!seal(index,"privateCurrentIndexBytes")||
    !Buffer.isBuffer(index.privateCurrentIndexBytes)||hash(index.privateCurrentIndexBytes)!==z.indexSha256||
    !seal(index,"privateParsedIndex")||!bytes(h).equals(index.privateCurrentIndexBytes)||!seal(index,"getFrozen"))hold("NO_ACTUAL_SIGNED_SOURCE_DAY");
 const found=h.entries.filter(e=>e.lane==="SOURCE"&&e.filePath===registry.sourceRegistryPath&&e.fileSha256===registry.sourceRegistrySha256&&
  e.reviewEvidenceSha256===registry.sourceReviewEvidenceSha256);
 if(found.length!==1)hold("SOURCE_REGISTRY_NOT_CURRENTLY_AUTHENTICATED");
 const raw=index.getFrozen(found[0].filePath),source=parse(raw,100000);
 if(hash(raw)!==registry.sourceRegistrySha256||source.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
    source.manifestSha256!==t.manifestSha256||source.runDayIndex!==registry.runDayIndex||
    !Array.isArray(source.entries)||source.entries.length<1||source.entries.length>96)
  hold("ORIGINAL_SOURCE_REGISTRY_DRIFT");
 return new Set(source.entries.map(e=>e.expectedQueryDigestSha256));
}
export function verifyP6T24PrivateRegistry({trust:t,index,registryBytes,wire,observedDbClockUtc,files}){
 const pub=trustCheck(t),r=wire?.review,reg=parse(registryBytes,250000),now=utc(observedDbClockUtc);
 if(!keys(wire,["review","signatureBase64"])||!keys(r,["schema","audience","logicalPath","runDayIndex","shardIndex","registrySha256",
  "reviewedCodeSha","manifestSha256","rightsSha256","releaseSha256","policySha256","reviewedAtUtc","validUntilUtc","retentionNotAfterUtc","reviewerFingerprintSha256"])||
    r.schema!==reviewSchema||r.audience!==AUD||!REG.test(r.logicalPath??"")||r.registrySha256!==hash(registryBytes)||
    r.reviewedCodeSha!==t.reviewedCodeSha||r.manifestSha256!==t.manifestSha256||r.rightsSha256!==t.rightsSha256||r.releaseSha256!==t.releaseSha256||
    r.policySha256!==t.expectedT24PolicySha256||r.reviewerFingerprintSha256!==t.expectedT24ReviewerFingerprintSha256||
    !Number.isSafeInteger(r.runDayIndex)||r.runDayIndex<1||r.runDayIndex>31||
    !Number.isSafeInteger(r.shardIndex)||r.shardIndex<1||r.shardIndex>100000||
    reg.schema!==schema||reg.runDayIndex!==r.runDayIndex||reg.shardIndex!==r.shardIndex||
    reg.reviewedCodeSha!==r.reviewedCodeSha||reg.manifestSha256!==r.manifestSha256||
    reg.rightsSha256!==r.rightsSha256||reg.releaseSha256!==r.releaseSha256||
    !SRC.test(reg.sourceRegistryPath??"")||!H.test(reg.sourceRegistrySha256??"")||!H.test(reg.sourceReviewEvidenceSha256??"")||
    !Array.isArray(reg.entries)||reg.entries.length<1||reg.entries.length>96)
  hold("REGISTRY_WIRE_OR_STUDY_SCOPE_DRIFT");
 const reviewAt=utc(r.reviewedAtUtc),valid=utc(r.validUntilUtc),expiry=utc(r.retentionNotAfterUtc);
 if(reviewAt<utc(t.policyValidFromUtc)||reviewAt>now||now>=valid||valid>expiry||expiry>utc(t.policyValidUntilUtc)||
    expiry-reviewAt>t.maximumPrivateRetentionHours*3600000)
  hold("REGISTRY_SIGNATURE_EXPIRED_OR_FUTURE");
 try{
  const s=Buffer.from(wire.signatureBase64??"","base64");
  if(s.length!==64||s.toString("base64")!==wire.signatureBase64||!verify(null,preimage(r),pub,s))hold("REGISTRY_SIGNATURE_INVALID");
 }catch{hold("REGISTRY_SIGNATURE_INVALID");}
 const source=sourceFromIndex(index,t,reg),seen=new Set(),paths=new Set(),digests=new Set();
 for(const e of reg.entries){
  if(!keys(e,["filePath","packetSha256","flightInstanceId","queryDigestSha256","selectedTNativeUtc","cutoffUtc"])||
     !PACK.test(e.filePath??"")||!H.test(e.packetSha256??"")||!ID.test(e.flightInstanceId??"")||
     !source.has(e.queryDigestSha256)||seen.has(e.flightInstanceId)||paths.has(e.filePath)||digests.has(e.packetSha256)||
     utc(e.selectedTNativeUtc)-utc(e.cutoffUtc)!==86400000||utc(e.cutoffUtc)<=reviewAt+900000||utc(e.cutoffUtc)>=valid)
   hold("CROSS_SOURCE_DUPLICATE_OR_UNSAFE_T24_ENTRY");
  seen.add(e.flightInstanceId);paths.add(e.filePath);digests.add(e.packetSha256);
 }
 if(files!==undefined){
  if(!Array.isArray(files)||files.length!==reg.entries.length)hold("T24_PACKET_SET_MISSING");
  const roster={schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1",reviewedCodeSha:t.reviewedCodeSha,
   manifestSha256:t.manifestSha256,rightsSha256:t.rightsSha256,entries:reg.entries.map(e=>({filePath:e.filePath,packetSha256:e.packetSha256}))};
  const raw=bytes(roster),verified=verifyP5CdFrozenRoster(raw,roster,files,{approvedCodeSha:t.reviewedCodeSha,
   manifestSha256:t.manifestSha256,rightsSha256:t.rightsSha256,rosterSha256:hash(raw)},"T24_WITH_SEPARATE_WITNESS");
  for(const e of reg.entries){
   const q=verified.get(e.packetSha256),p=q?.permit;
   if(!p||p.runDayIndex!==r.runDayIndex||p.horizon!=="T-24h"||p.flightInstanceId!==e.flightInstanceId||
      p.queryDigestSha256!==e.queryDigestSha256||p.selectedTNativeUtc!==e.selectedTNativeUtc||p.expectedReviewedReleaseSha256!==t.releaseSha256||
      p.reviewedFrameSha256!==t.expectedFrameSha256||p.reviewedConfigSha256!==t.expectedConfigSha256||
      q.witnessReview?.expectedSelectedTVersion!==t.expectedSelectedTVersion||
      preflightP5Stage14ReviewedPermitV39(p)!==e.selectedTNativeUtc)
    hold("T24_ORIGINAL_PERMIT_OR_WITNESS_DRIFT");
  }
 }
 return {reg,review:r};
}
async function currentIndex(client,trust,day){
 const x=await readP6StoredPrivateReviewOnce({client,trust,scope:ro,selector:{kind:"CURRENT_DAY",runDayIndex:day}});
 const index=await hydrateP6DayEpochFullRegistriesReadOnly({client,pins:x.pins,wire:x.wire,publicKeyPem:x.publicKeyPem,
  scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
 inspectP6DayEpochExistingShardSemanticsNoGo(index);
 return index;
}
const columns="logical_path,run_day_index,shard_index,kind,content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,committed_at_utc,payload_bytes,review_wire_bytes";
function readRow(row,t,index,now){
 const wire=parse(row.review_wire_bytes,4096),v=verifyP6T24PrivateRegistry({trust:t,index,registryBytes:row.payload_bytes,wire,observedDbClockUtc:now}),r=v.review;
 if(row.kind!=="T24_PRE_DAY_REGISTRY"||row.logical_path!==r.logicalPath||row.run_day_index!==r.runDayIndex||row.shard_index!==r.shardIndex||
    row.content_sha256!==r.registrySha256||row.reviewed_code_sha!==r.reviewedCodeSha||row.manifest_sha256!==r.manifestSha256||row.rights_sha256!==r.rightsSha256||
    row.external_review_sha256!==hash(row.review_wire_bytes)||dbAt(row.externally_reviewed_at_utc)!==r.reviewedAtUtc||
    dbAt(row.retention_not_after_utc)!==r.retentionNotAfterUtc||dbAt(row.committed_at_utc)<r.reviewedAtUtc||dbAt(row.committed_at_utc)>now)
  hold("IMMUTABLE_T24_REGISTRY_ROW_DRIFT");
 return {...v,wire,registryBytes:row.payload_bytes};
}
async function activeRows(client,t,index,day,now){
 // Do not read expired provider-derived bytes. The catalog-only max shard
 // number preserves monotonic allocation without revisiting old contents.
 const q=await client.query("SELECT max(shard_index)::int AS max FROM "+TABLE+" WHERE kind='T24_PRE_DAY_REGISTRY' AND run_day_index=$1 AND manifest_sha256=$2",[day,t.manifestSha256]);
 if(q.rowCount!==1)hold("T24_SHARD_CATALOG_UNKNOWN");
 const next=Number(q.rows[0].max??0)+1;
 if(!Number.isSafeInteger(next)||next<1||next>100000)hold("T24_SHARD_BOUND");
 const budget=await client.query("SELECT count(*)::int AS n,coalesce(sum(octet_length(payload_bytes)+octet_length(review_wire_bytes)),0)::bigint AS bytes FROM "+TABLE+" WHERE kind='T24_PRE_DAY_REGISTRY' AND run_day_index=$1 AND manifest_sha256=$2 AND retention_not_after_utc>$3::timestamptz",[day,t.manifestSha256,now]);
 if(budget.rowCount!==1||Number(budget.rows[0].n)>1024||Number(budget.rows[0].bytes)>33554432)hold("T24_ACTIVE_REGISTRY_BYTE_BOUND");
 const result=await client.query("SELECT "+columns+" FROM "+TABLE+" WHERE kind='T24_PRE_DAY_REGISTRY' AND run_day_index=$1 AND manifest_sha256=$2 AND retention_not_after_utc>$3::timestamptz ORDER BY shard_index LIMIT 1025",[day,t.manifestSha256,now]);
 if(result.rowCount!==Number(budget.rows[0].n)||result.rowCount>1024||result.rows.length!==result.rowCount)hold("T24_ACTIVE_REGISTRIES_UNBOUNDED");
 const found=[],seen=new Set();
 for(const row of result.rows){
  const v=readRow(row,t,index,now);
  for(const e of v.reg.entries){if(seen.has(e.flightInstanceId))hold("CROSS_REGISTRY_DUPLICATE_T24");seen.add(e.flightInstanceId);}
  found.push(v);
 }
 return {next,found,seen};
}
export async function readP6T24CurrentRegistrySet({client,trust,runDayIndex}){
 trustCheck(trust);
 const index=await currentIndex(client,trust,runDayIndex);
 let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  const now=await readP6DayEpochRestrictedReaderClock(client,trust.expectedReaderSessionLogin);
  if(utc(now)<utc(index.redactedSummary.observedDbClockUtc)||utc(now)-utc(index.redactedSummary.observedDbClockUtc)>120000)hold("T24_REGISTRY_CLOCK_DRIFT");
  const list=await activeRows(client,trust,index,runDayIndex,now);
  await client.query("ROLLBACK");tx=false;
  return Object.freeze(Object.defineProperties({status:"CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO",runDayIndex,observedDbClockUtc:now,
   registryCount:list.found.length,alreadyIndexedCount:list.seen.size,nextShardIndex:list.next,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
   {privateIndex:{value:index,enumerable:false},privateRegistries:{value:list.found,enumerable:false},privateExistingFlightIds:{value:list.seen,enumerable:false}}));
 }finally{if(tx)await client.query("ROLLBACK").catch(()=>{});}
}
/** Same protected review policy as later PRE, explicitly includes T24
 * native packet / separate witness protocol authorization. Build from exact
 * actual original feature matches and original packet completer; no
 * fabricated receipt and no independent physical-outcome claim. */
export function buildP6DelegatedT24PrivateRegistry({handoff,features,authority,current,trust}){
 const d=handoff?.privateOriginalDossier,t=trust,pb=authority?.policyBytes;
 trustCheck(t);const now=current?.observedDbClockUtc;
 if(!Buffer.isBuffer(pb)||hash(pb)!==t.expectedT24PolicySha256||
    authority.expectedPolicySha256!==t.expectedT24PolicySha256||authority.independentDelegatedNativeReviewApproved!==true||
    authority.noProviderCredentialsInReviewer!==true||authority.laterReviewerKey?.type!=="private"||
    hash(createPublicKey(authority.laterReviewerKey).export({format:"der",type:"spki"}))!==t.expectedT24ReviewerFingerprintSha256||
    !d||d.horizon!=="T-24h"||d.manifestSha256!==t.manifestSha256||d.reviewedMainCodeSha!==t.reviewedCodeSha||
    !seal(handoff,"privateOriginalDossier")||!seal(handoff,"privateReviewEntries")||!seal(current,"privateIndex")||!seal(current,"privateExistingFlightIds")||
    current.runDayIndex!==d.runDayIndex||current.status!=="CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO"||
    features?.status!=="EXACT_BOUND_ORIGINAL_NATIVE_FEATURE_BATCH_NOT_SIGNED"||features.horizon!=="T-24h"||
    features.runDayIndex!==d.runDayIndex||!seal(features,"privateDecisions")||!Array.isArray(features.privateDecisions)||features.providerCalls!==0||features.dbWrites!==0||features.phase6PaidGo!==false||
    utc(now)<utc(features.observedDbClockUtc))hold("NO_ACTUAL_NATIVE_T24_DELEGATION_HANDOFF");
 const p=JSON.parse(pb.toString("utf8")),v=p.nativeLaterReview,f=p.nativePreFeatureReview,cfg=v?.selectedTConfig;
 if(p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
    p.approvedCodeSha!==t.reviewedCodeSha||!["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>p[k]===t[k])||
    v?.nativeT24ReviewApproved!==true||v.independentT24WitnessProtocolReviewed!==true||
    v.reviewedWitnessOnlyRole!=="phase5_fids_t24_witness_prod_20261107"||v.laterReviewerFingerprintSha256!==t.expectedT24ReviewerFingerprintSha256||
    f?.approved!==true||f.rightsSha256!==t.rightsSha256||!H.test(f.externalContentUseReviewSha256??"")||
    v.frameSha256!==t.expectedFrameSha256||v.configSha256!==t.expectedConfigSha256||
    cfg?.verifiedProviderNativeSchedule!==true||cfg.milestone+":"+cfg.version+":"+cfg.artifactHash!==t.expectedSelectedTVersion)
  hold("T24_NATIVE_WITNESS_PROTOCOL_NOT_IN_PROTECTED_POLICY");
 const when=utc(now),until=Math.min(when+t.maximumPrivateRetentionHours*3600000,utc(t.policyValidUntilUtc));
 const source=current.privateIndex.privateParsedIndex.entries.filter(e=>e.lane==="SOURCE"&&e.fileSha256===d.sourceDayRegistrySha256&&e.filePath===handoff.privateSourceRegistryPath);
 if(source.length!==1)hold("T24_SOURCE_NOT_IN_SIGNED_CURRENT_DAY");
 const by=new Map(features.privateDecisions.filter(x=>x.status==="MATCHED_NATIVE_ORIGINAL").map(x=>[x.flightInstanceId,x.compiled]));
 if(by.size!==features.matchedCount)hold("T24_NATIVE_FEATURE_COUNT_DRIFT");
 const remaining=handoff.privateReviewEntries.filter(e=>!current.privateExistingFlightIds.has(e.source.flightInstanceId));
 const reviewItems=[];let censored=0,deferredCount=0;
 for(const e of remaining){
  const s=e.source,compiled=by.get(s.flightInstanceId),bundle=compiled?.bundle,cutoff=utc(s.ownPreCutoffUtc);
  if(reviewItems.length>=96){deferredCount++;continue;}
  if(cutoff<=when+900000||cutoff>=until||cutoff>when+10800000||!bundle||
     compiled.sourceBodyAndCanonicalEnvelopeIntegrityVerified!==true||compiled.sameOriginalNativeOperatingLegBoundOnly!==true||
     compiled.physicalGateOutCertified!==false||compiled.sourceRightsIndependentlyCertifiedByThisFunction!==false||
     bundle.flightInstanceId!==s.flightInstanceId||bundle.originalResponseSha256!==s.expectedSourceResponseSha256||
     bundle.populationQueryId!==s.expectedSourcePopulationQueryId||bundle.externalSourceAndContentsReviewReceiptSha256!==f.externalContentUseReviewSha256){
   censored++;continue;
  }
  const featureSha=hash(bytes(bundle)),evidence=hash(bytes({schema:"v39.phase6.delegated-native-t24-original-evidence.v1",
   policySha256:t.expectedT24PolicySha256,sourceAuditSha256:d.sourceAuditSha256,source:s,featureSha,observedDbClockUtc:features.observedDbClockUtc}));
  const artifact={schema:"v39.phase5.external-native-t24-pre-packet-review.v1",reviewedCodeSha:t.reviewedCodeSha,
   reviewedSourceDossierSha256:handoff.privateOriginalDossierSha256,reviewedSourceAuditSha256:d.sourceAuditSha256,
   reviewedSourceDayRegistrySha256:d.sourceDayRegistrySha256,reviewedFlightInstanceId:s.flightInstanceId,reviewedQueryDigestSha256:s.queryDigestSha256,
   reviewedSourcePopulationQueryId:s.expectedSourcePopulationQueryId,reviewedSourceOriginalResponseSha256:s.expectedSourceResponseSha256,
   reviewedSourceGithubRunId:s.expectedGithubSourceRunId,reviewedRunDayIndex:s.runDayIndex,reviewedHorizon:"T-24h",
   reviewedNativeScheduledTUtc:s.selectedTNativeUtc,reviewedOwnCutoffUtc:s.ownPreCutoffUtc,reviewedAtUtc:now,
   independentlyReviewedOperatingLegEvidenceSha256:evidence,independentlyReviewedNativeTEvidenceSha256:cfg.semanticsEvidenceSha256,
   independentlyReviewedRunAndRetentionEvidenceSha256:v.runAndRetentionEvidenceSha256,reviewedFrameSha256:v.frameSha256,
   reviewedConfigSha256:v.configSha256,frozenBuilderSha256:v.builderSha256,builderFrozenAtUtc:v.builderFrozenAtUtc,
   selectedTConfig:cfg,maxPopulationStalenessSeconds:handoff.privateMaximumSourceAgeSeconds,reviewedSupplementalFeatureBundle:bundle,
   externalNativeTPhysicalLegAndSourceUseReviewed:true,independentT24WitnessProtocolReviewed:true,reviewedWitnessOnlyRole:v.reviewedWitnessOnlyRole};
  const reviewBytes=bytes(artifact),sha=hash(reviewBytes);
  reviewItems.push({reviewBytes,proposedFilePath:"data-collection/phase5/frozen/t24p_"+sha+".json",
   pins:{expectedDossierSha256:handoff.privateOriginalDossierSha256,expectedReviewArtifactSha256:sha,expectedApprovedMainCodeSha:t.reviewedCodeSha,
    expectedReviewedReleaseSha256:t.releaseSha256,expectedReviewedSourceRightsSha256:t.rightsSha256,expectedSourceDayRegistrySha256:d.sourceDayRegistrySha256,
    expectedReviewedSupplementalFeatureBundleSha256:featureSha,expectedExternalSupplementalContentUseReviewSha256:f.externalContentUseReviewSha256}});
 }
 if(!reviewItems.length)return {status:"NO_ELIGIBLE_NEW_NATIVE_T24_PACKET",candidateCount:remaining.length,censored,deferredCount,providerCalls:0,phase6PaidGo:false};
 const done=completeP6PostcommitReviewedPreBatch(handoff,{expectedDossierSha256:handoff.privateOriginalDossierSha256,observedDbClockUtc:now},reviewItems);
 if(done.completedPacketCount!==reviewItems.length)hold("ORIGINAL_T24_PACKET_COMPLETION_DRIFT");
 const files=done.privateCompletedPackets.map(x=>({filePath:x.proposedFilePath,packetSha256:x.completed.packetSha256,bytes:x.completed.packetBytes}));
 const entries=done.privateCompletedPackets.map(x=>{const s=x.completed.packet.prePermit;return {filePath:x.proposedFilePath,
  packetSha256:x.completed.packetSha256,flightInstanceId:s.flightInstanceId,queryDigestSha256:s.queryDigestSha256,
  selectedTNativeUtc:s.selectedTNativeUtc,cutoffUtc:new Date(utc(s.selectedTNativeUtc)-86400000).toISOString()};});
 const reg={schema,runDayIndex:d.runDayIndex,shardIndex:current.nextShardIndex,reviewedCodeSha:t.reviewedCodeSha,manifestSha256:t.manifestSha256,
  rightsSha256:t.rightsSha256,releaseSha256:t.releaseSha256,sourceRegistryPath:source[0].filePath,sourceRegistrySha256:source[0].fileSha256,
  sourceReviewEvidenceSha256:source[0].reviewEvidenceSha256,entries};
 const registryBytes=bytes(reg),registrySha256=hash(registryBytes);
 const r={schema:reviewSchema,audience:AUD,logicalPath:"data-collection/phase5/frozen/t24r_"+registrySha256+".json",
  runDayIndex:reg.runDayIndex,shardIndex:reg.shardIndex,registrySha256,reviewedCodeSha:t.reviewedCodeSha,manifestSha256:t.manifestSha256,
  rightsSha256:t.rightsSha256,releaseSha256:t.releaseSha256,policySha256:t.expectedT24PolicySha256,reviewedAtUtc:now,
  validUntilUtc:new Date(until).toISOString(),retentionNotAfterUtc:new Date(until).toISOString(),reviewerFingerprintSha256:t.expectedT24ReviewerFingerprintSha256};
 const wire={review:r,signatureBase64:sign(null,preimage(r),authority.laterReviewerKey).toString("base64")};
 verifyP6T24PrivateRegistry({trust:t,index:current.privateIndex,registryBytes,wire,observedDbClockUtc:now,files});
 return Object.freeze(Object.defineProperties({status:"SIGNED_NATIVE_T24_REGISTRY_AWAIT_PRIVATE_PUBLICATION",candidateCount:remaining.length,
  packetCount:files.length,censored,deferredCount,registrySha256,providerCalls:0,phase6PaidGo:false},
  {privateRegistryBytes:{value:registryBytes,enumerable:false},privateWire:{value:wire,enumerable:false},privateFiles:{value:files,enumerable:false}}));
}
/** Registry-last atomic publish. Recheck current SOURCE and all active
 * T24 registries under restricted reader and publisher; no blindly
 * retried write. The original V0091 queue still owns registration. */
export async function publishP6T24PrivateRegistryOnce({readerClient,publisherClient,trust:t,proposal,expectedPublisherSessionLogin}){
 if(readerClient===publisherClient||!/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/.test(expectedPublisherSessionLogin??"")||
    expectedPublisherSessionLogin===t.expectedReaderSessionLogin||proposal?.status!=="SIGNED_NATIVE_T24_REGISTRY_AWAIT_PRIVATE_PUBLICATION"||
    !seal(proposal,"privateRegistryBytes")||!seal(proposal,"privateWire")||!seal(proposal,"privateFiles"))
  hold("UNAPPROVED_PRIVATE_REGISTRY_PUBLICATION");
 const wire=proposal.privateWire,r=wire.review,regBytes=proposal.privateRegistryBytes,files=proposal.privateFiles;
 const current=await readP6T24CurrentRegistrySet({client:readerClient,trust:t,runDayIndex:r.runDayIndex});
 let tx=false,attempt=false;
 try{
  await publisherClient.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await publisherClient.query("SET LOCAL lock_timeout='2000ms'");await publisherClient.query("SET LOCAL statement_timeout='25000ms'");
  const now=await readP6DayEpochRestrictedPublisherClock(publisherClient,expectedPublisherSessionLogin);
  if(utc(now)<utc(current.observedDbClockUtc)||utc(now)-utc(current.observedDbClockUtc)>120000)hold("T24_PUBLISHER_CLOCK_DRIFT");
  const v=verifyP6T24PrivateRegistry({trust:t,index:current.privateIndex,registryBytes:regBytes,wire,observedDbClockUtc:now,files});
  const list=await activeRows(publisherClient,t,current.privateIndex,r.runDayIndex,now);
  if(list.next!==r.shardIndex||v.reg.entries.some(e=>list.seen.has(e.flightInstanceId)||utc(e.cutoffUtc)<=utc(now)+900000))
   hold("T24_DUPLICATE_OR_WINDOW_CHANGED_NO_REPLAY");
  const wb=bytes(wire);if(wb.length>4096)hold("T24_REGISTRY_WIRE_OVERSIZE");
  const write=async(kind,path,digest,payload,reviewBytes)=>{
   const q=await publisherClient.query("INSERT INTO "+TABLE+" (logical_path,run_day_index,shard_index,kind,content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,payload_bytes,review_wire_bytes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
    [path,r.runDayIndex,r.shardIndex,kind,digest,r.reviewedCodeSha,r.manifestSha256,r.rightsSha256,hash(wb),r.reviewedAtUtc,r.retentionNotAfterUtc,payload,reviewBytes]);
   if(q.rowCount!==1)hold("T24_INSERT_ACK_UNKNOWN");
  };
  for(const f of files)await write("T24_PRE_PACKET",f.filePath,f.packetSha256,f.bytes,null);
  await write("T24_PRE_DAY_REGISTRY",r.logicalPath,r.registrySha256,regBytes,wb);
  const end=await publisherClient.query("SELECT clock_timestamp() AS now");
  if(end.rowCount!==1||v.reg.entries.some(e=>utc(e.cutoffUtc)<=utc(dbAt(end.rows[0].now))+900000))hold("T24_WINDOW_MISSED_BEFORE_COMMIT");
  attempt=true;await publisherClient.query("COMMIT");tx=false;
  const got=await readP6T24PrivateRegistryPackets({client:readerClient,trust:t,runDayIndex:r.runDayIndex,registrySha256:r.registrySha256});
  if(got.packetCount!==files.length)hold("T24_POSTCOMMIT_REGISTRY_UNKNOWN_NO_REPLAY");
  return {status:"PRIVATE_T24_REGISTRY_COMMITTED_AND_READBACK_NO_GO",runDayIndex:r.runDayIndex,packetCount:files.length,
   registrySha256:r.registrySha256,insertedPrivateRows:files.length+1,providerCalls:0,phase6PaidGo:false};
 }catch(e){if(attempt)hold("T24_COMMIT_OR_READBACK_UNKNOWN_NO_REPLAY");if(tx)await publisherClient.query("ROLLBACK").catch(()=>{});throw e;}
}

/** Fresh signed SOURCE and registry plus independently read exact packet bytes.
 * This is read-only transport, never a queue admission or runtime GO. */
export async function readP6T24PrivateRegistryPackets({client,trust:t,runDayIndex,registrySha256}){
 if(!H.test(registrySha256??""))hold("T24_REGISTRY_SHA_REQUIRED");
 const current=await readP6T24CurrentRegistrySet({client,trust:t,runDayIndex});
 const found=current.privateRegistries.filter(v=>v.review.registrySha256===registrySha256);
 if(found.length!==1)hold("T24_REGISTRY_NOT_UNIQUELY_ACTIVE");
 const {reg,review:r,wire,registryBytes}=found[0],paths=reg.entries.map(e=>e.filePath);
 let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  const now=await readP6DayEpochRestrictedReaderClock(client,t.expectedReaderSessionLogin);
  if(utc(now)<utc(current.observedDbClockUtc)||utc(now)-utc(current.observedDbClockUtc)>120000)hold("T24_PACKET_CLOCK_DRIFT");
  const rows=await client.query("SELECT "+columns+" FROM "+TABLE+" WHERE logical_path=ANY($1::text[]) AND retention_not_after_utc>$2::timestamptz",[paths,now]);
  if(rows.rowCount!==paths.length||rows.rows.length!==paths.length)hold("T24_PACKET_ROWS_MISSING");
  const files=reg.entries.map(e=>{
   const matches=rows.rows.filter(row=>row.logical_path===e.filePath),row=matches[0];
   if(matches.length!==1||row.kind!=="T24_PRE_PACKET"||row.run_day_index!==runDayIndex||row.shard_index!==r.shardIndex||
    row.content_sha256!==e.packetSha256||row.reviewed_code_sha!==r.reviewedCodeSha||row.manifest_sha256!==r.manifestSha256||row.rights_sha256!==r.rightsSha256||
    row.external_review_sha256!==hash(bytes(wire))||row.review_wire_bytes!==null||dbAt(row.externally_reviewed_at_utc)!==r.reviewedAtUtc||
    dbAt(row.retention_not_after_utc)!==r.retentionNotAfterUtc||dbAt(row.committed_at_utc)<r.reviewedAtUtc||dbAt(row.committed_at_utc)>now||
    !Buffer.isBuffer(row.payload_bytes)||hash(row.payload_bytes)!==e.packetSha256)hold("T24_PACKET_ROW_DRIFT");
   return {filePath:e.filePath,packetSha256:e.packetSha256,bytes:row.payload_bytes};
  });
  verifyP6T24PrivateRegistry({trust:t,index:current.privateIndex,registryBytes,wire,observedDbClockUtc:now,files});
  await client.query("ROLLBACK");tx=false;
  return Object.freeze(Object.defineProperties({status:"EXACT_PRIVATE_NATIVE_T24_PACKETS_READONLY_NO_GO",runDayIndex,registrySha256,
   observedDbClockUtc:now,packetCount:files.length,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
   {privateRegistry:{value:reg,enumerable:false},privateFiles:{value:files,enumerable:false}}));
 }finally{if(tx)await client.query("ROLLBACK").catch(()=>{});}
}


/** Read-only workers consume the SAME protected policy bytes and a public
 * verification key, never the private registry signing key. */
export function readP6StableT24RegistryTrust(env,t){
 const raw=env.P6_NONPAID_DAILY_POLICY_BASE64??"",digest=env.P6_NONPAID_DAILY_POLICY_SHA256;
 if(env.P6_PRIVATE_T24_REGISTRY_READ_APPROVED!=="1"||!H.test(digest??"")||
    typeof raw!=="string"||raw.length<100||raw.length>46668||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))
  hold("NO_PROTECTED_T24_READER_POLICY");
 const b=Buffer.from(raw,"base64");
 if(b.toString("base64")!==raw||hash(b)!==digest||b.length>35000)hold("T24_READER_POLICY_HASH_DRIFT");
 const p=JSON.parse(b.toString("utf8")),v=p.nativeLaterReview,cfg=v?.selectedTConfig;
 if(p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
    p.approvedCodeSha!==t.reviewedCodeSha||!["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>p[k]===t[k])||
    v?.nativeT24ReviewApproved!==true||v.independentT24WitnessProtocolReviewed!==true||
    v.reviewedWitnessOnlyRole!=="phase5_fids_t24_witness_prod_20261107"||
    cfg?.verifiedProviderNativeSchedule!==true||cfg.milestone!=="departure.scheduledTime.utc"||!H.test(cfg.artifactHash??"")||
    typeof cfg.version!=="string"||!cfg.version.length||typeof v.laterReviewerPublicKeyPem!=="string"||
    !v.laterReviewerPublicKeyPem.startsWith("-----BEGIN PUBLIC KEY-----"))hold("T24_READER_POLICY_SCOPE_DRIFT");
 const trust={...t,independentNativeT24RegistryApproved:true,
  expectedT24ReviewerFingerprintSha256:v.laterReviewerFingerprintSha256,expectedT24PolicySha256:digest,
  expectedFrameSha256:v.frameSha256,expectedConfigSha256:v.configSha256,
  expectedSelectedTVersion:cfg.milestone+":"+cfg.version+":"+cfg.artifactHash,
  maximumPrivateRetentionHours:v.maximumPrivateRetentionHours,policyValidFromUtc:v.validFromUtc,
  policyValidUntilUtc:v.validUntilUtc,t24ReviewerPublicKeyPem:v.laterReviewerPublicKeyPem};
 trustCheck(trust);return Object.freeze(trust);
}
/** Earliest eligible cutoff per registry. Use all currently authenticated
 * entries, not publication time, and hydrate at most four existing shards.
 * Enrollment and execution use different lookaheads; neither makes a claim.
 */
export function chooseP6T24RegistrySelectors(sets,observedDbClockUtc,purpose){
 if(!["ENROLLMENT","PRE_EXECUTION"].includes(purpose)||!Array.isArray(sets)||sets.length>2)
  hold("T24_SELECTION_SCOPE");
 const now=utc(observedDbClockUtc),seenDays=new Set(),seenFlights=new Set(),ranked=[];
 let expired=0,notYetDue=0;
 for(const current of sets){
  if(current?.status!=="CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO"||
     current.providerCalls!==0||current.databaseWrites!==0||current.phase6PaidGo!==false||
     seenDays.has(current.runDayIndex)||!seal(current,"privateRegistries")||
     !Array.isArray(current.privateRegistries)||current.privateRegistries.length!==current.registryCount||
     utc(current.observedDbClockUtc)>now||now-utc(current.observedDbClockUtc)>120000)
   hold("T24_SELECTION_UNAUTHENTICATED_SET");
  seenDays.add(current.runDayIndex);
  for(const {reg,review} of current.privateRegistries){
   if(reg.runDayIndex!==current.runDayIndex||!H.test(review.registrySha256??"")||
      !Array.isArray(reg.entries)||reg.entries.length<1||reg.entries.length>96)hold("T24_SELECTION_REGISTRY_DRIFT");
   const cutoffs=[];
   for(const e of reg.entries){
    if(seenFlights.has(e.flightInstanceId))hold("T24_DUPLICATE_ACROSS_DAYS");
    seenFlights.add(e.flightInstanceId);
    const at=utc(e.cutoffUtc);
    if(at<=now+2000)expired++;
    else if(at>now+(purpose==="ENROLLMENT"?10800000:660000))notYetDue++;
    else cutoffs.push(at);
   }
   if(cutoffs.length)ranked.push({runDayIndex:reg.runDayIndex,registrySha256:review.registrySha256,
    earliestCutoff:Math.min(...cutoffs)});
  }
 }
 ranked.sort((a,b)=>a.earliestCutoff-b.earliestCutoff||a.runDayIndex-b.runDayIndex||a.registrySha256.localeCompare(b.registrySha256));
 const out={status:"BOUNDED_NATIVE_T24_REGISTRY_SELECTION_NO_GO",dueShardCount:ranked.length,
  deferredShardCount:Math.max(0,ranked.length-4),expired,notYetDue,providerCalls:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperty(out,"privateSelectors",{value:Object.freeze(ranked.slice(0,4)),enumerable:false}));
}
export async function readP6SelectedT24RegistryPackets({client,trust,runDayIndices,purpose}){
 if(!Array.isArray(runDayIndices)||runDayIndices.length<1||runDayIndices.length>2||
    new Set(runDayIndices).size!==runDayIndices.length||runDayIndices.some(d=>!Number.isSafeInteger(d)||d<1||d>31))
  hold("T24_BOUNDED_DAY_SELECTION");
 const sets=[];let unavailableDayCount=0;
 for(const runDayIndex of runDayIndices){
  try{sets.push(await readP6T24CurrentRegistrySet({client,trust,runDayIndex}));}
  catch(e){if(e?.message!=="HOLD_P6_STORED_REVIEW_CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED")throw e;unavailableDayCount++;}
 }
 if(!sets.length)return Object.freeze(Object.defineProperty({status:"CURRENT_NATIVE_T24_PACKETS_READONLY_NO_GO",
  unavailableDayCount,dueShardCount:0,deferredShardCount:0,packetCount:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
  "privateRosters",{value:Object.freeze([]),enumerable:false}));
 const now=sets.reduce((a,b)=>utc(a.observedDbClockUtc)>utc(b.observedDbClockUtc)?a:b).observedDbClockUtc;
 const plan=chooseP6T24RegistrySelectors(sets,now,purpose),rosters=[];
 for(const s of plan.privateSelectors){
  rosters.push(await readP6T24PrivateRegistryPackets({client,trust,runDayIndex:s.runDayIndex,registrySha256:s.registrySha256}));
 }
 return Object.freeze(Object.defineProperty({status:"CURRENT_NATIVE_T24_PACKETS_READONLY_NO_GO",unavailableDayCount,
  dueShardCount:plan.dueShardCount,deferredShardCount:plan.deferredShardCount,packetCount:rosters.reduce((n,r)=>n+r.packetCount,0),
  providerCalls:0,databaseWrites:0,phase6PaidGo:false},"privateRosters",{value:Object.freeze(rosters),enumerable:false}));
}
