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
import {sameP5ConditionalLaterReviewerScope} from "./phase5ExternalEd25519LaterShardReviewerVerify_v39.ts";
import {assertP5ProofAttachedConditionalPacket} from "./phase5ConditionalPrePermitPreparation_v39.ts";
const TABLE="phase6_private.frozen_native_packet_v39";
const H=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const REG=/^data-collection\/phase5\/frozen\/t24r_[A-Za-z0-9_-]{8,100}\.json$/;
const PACK=/^data-collection\/phase5\/frozen\/t24p_[A-Za-z0-9_-]{8,100}\.json$/;
const SRC=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const ID=/^leg:[a-zA-Z0-9:|._-]{5,196}$/;
const schema="v39.phase6.native-t24-private-registry.v1",reviewSchema="v39.phase6.native-t24-registry-ed25519.v1";
const AUD="HKcode22/ReplitTranvr:PHASE6_T24_NATIVE_PRE_REGISTRY_ONLY";
const conditionalSchema="v39.phase6.conditional-t24-private-registry.v1",
 conditionalReviewSchema="v39.phase6.conditional-t24-registry-ed25519.v1",
 conditionalAudience="HKcode22/ReplitTranvr:PHASE6_T24_CONDITIONAL_PRE_REGISTRY_ONLY";
export function deriveP6ConditionalT24Scope(policy){
 const c=policy?.nativeLaterReview?.conditionalT24Scope;
 if(c===undefined)return undefined;
 const f=policy?.conditionalPreFeatureReview;
 if(!sameP5ConditionalLaterReviewerScope(c,c)||Object.keys(c).length!==2||
    f?.schema!=="v39.phase5.conditional-pre-feature-review-policy.v1"||f.approved!==true||f.rightsSha256!==policy.rightsSha256||
    f.protocolSha256!==c.protocolSha256||f.externalContentUseReviewSha256!==c.externalContentUseReviewSha256)
  hold("CONDITIONAL_T24_SCOPE_NOT_SEPARATELY_APPROVED");
 return Object.freeze({...c});
}
/** Current protected policy digest must be authenticated by caller. Only
 * an exact additive successor may retain the native predecessor digest. */
export function deriveP6NativeT24PolicyTransition(policy){
 const v=policy?.nativeLaterReview,tr=v?.nativeT24PolicyTransition;
 if(tr===undefined)return undefined;
 if(!keys(tr,["schema","previousDailyPolicySha256","firstConditionalRunDayIndex","conditionalEffectiveUtc"])||
    tr.schema!=="v39.phase5b.native-t24-policy-transition.v1"||!H.test(tr.previousDailyPolicySha256??"")||
    !Number.isSafeInteger(tr.firstConditionalRunDayIndex)||tr.firstConditionalRunDayIndex<5||tr.firstConditionalRunDayIndex>31||
    !deriveP6ConditionalT24Scope(policy)||!policy.conditionalT24PermitReview||!policy.conditionalLaterPermitReview||
    !v.conditionalLaterDayAppendPolicy||utc(tr.conditionalEffectiveUtc)!==utc(policy.conditionalT24PermitReview.validFromUtc)||
    tr.conditionalEffectiveUtc!==policy.conditionalLaterPermitReview.validFromUtc||
    tr.conditionalEffectiveUtc!==v.conditionalLaterDayAppendPolicy.validFromUtc)
  hold("INVALID_NATIVE_T24_POLICY_TRANSITION");
 const prior={...policy,nativeLaterReview:{...v}};
 delete prior.conditionalPreFeatureReview;
 delete prior.conditionalT24PermitReview;
 delete prior.conditionalLaterPermitReview;
 delete prior.nativeLaterReview.conditionalT24Scope;
 delete prior.nativeLaterReview.conditionalLaterDayAppendPolicy;
 delete prior.nativeLaterReview.nativeT24PolicyTransition;
 if(hash(bytes(prior))!==tr.previousDailyPolicySha256)hold("NATIVE_T24_PREDECESSOR_BYTES_DRIFT");
 return Object.freeze({...tr});
}
export function matchesP6T24RegistryPolicyDigest(t,r,conditional){
 if(r?.policySha256===t.expectedT24PolicySha256)return true;
 const tr=t.nativeT24PolicyTransition;
 return !conditional&&Boolean(tr)&&H.test(tr.previousDailyPolicySha256??"")&&
  r?.policySha256===tr.previousDailyPolicySha256&&Number.isSafeInteger(r.runDayIndex)&&
  r.runDayIndex>=1&&r.runDayIndex<tr.firstConditionalRunDayIndex;
}
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
export const p6T24RegistryReviewPreimage=r=>Buffer.concat([Buffer.from(r?.schema===conditionalReviewSchema?
 "HKcode22/ReplitTranvr:PHASE6_T24_CONDITIONAL_PRE_REGISTRY:v1\n":"HKcode22/ReplitTranvr:PHASE6_T24_NATIVE_PRE_REGISTRY:v1\n"),bytes(r)]);
const preimage=p6T24RegistryReviewPreimage;
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
 const conditional=reg.schema===conditionalSchema;
 // Metadata-only registry enumeration must enforce the identity tier
 // before it can exclude/route a member, even without packet hydration.
 const conditionalId=id=>typeof id==="string"&&/^leg:g5a:[a-f0-9]{64}$/.test(id);
 if(conditional&&!keys(reg,["schema","runDayIndex","shardIndex","reviewedCodeSha","manifestSha256","rightsSha256","releaseSha256","sourceRegistryPath","sourceRegistrySha256","sourceReviewEvidenceSha256","conditionalT24Scope","sourceExpiresAtUtc","entries"])||
    !conditional&&Object.hasOwn(reg,"sourceExpiresAtUtc"))hold("REGISTRY_TIER_FIELDS");
 if(conditional?(!t.conditionalT24Scope||!sameP5ConditionalLaterReviewerScope(t.conditionalT24Scope,reg.conditionalT24Scope)||
    !sameP5ConditionalLaterReviewerScope(t.conditionalT24Scope,r?.conditionalT24Scope)||Object.keys(t.conditionalT24Scope).length!==2):
    (Object.hasOwn(reg,"conditionalT24Scope")||Object.hasOwn(r??{},"conditionalT24Scope")))
  hold("CONDITIONAL_T24_SCOPE_NOT_SEPARATELY_APPROVED");
 if(!keys(wire,["review","signatureBase64"])||!keys(r,["schema","audience","logicalPath","runDayIndex","shardIndex","registrySha256",
  "reviewedCodeSha","manifestSha256","rightsSha256","releaseSha256","policySha256","reviewedAtUtc","validUntilUtc","retentionNotAfterUtc","reviewerFingerprintSha256",...(conditional?["conditionalT24Scope"]:[])])||
    r.schema!==(conditional?conditionalReviewSchema:reviewSchema)||r.audience!==(conditional?conditionalAudience:AUD)||!REG.test(r.logicalPath??"")||r.registrySha256!==hash(registryBytes)||
    r.reviewedCodeSha!==t.reviewedCodeSha||r.manifestSha256!==t.manifestSha256||r.rightsSha256!==t.rightsSha256||r.releaseSha256!==t.releaseSha256||
    !matchesP6T24RegistryPolicyDigest(t,r,conditional)||r.reviewerFingerprintSha256!==t.expectedT24ReviewerFingerprintSha256||
    !Number.isSafeInteger(r.runDayIndex)||r.runDayIndex<1||r.runDayIndex>31||
    !Number.isSafeInteger(r.shardIndex)||r.shardIndex<1||r.shardIndex>100000||
    reg.schema!==(conditional?conditionalSchema:schema)||reg.runDayIndex!==r.runDayIndex||reg.shardIndex!==r.shardIndex||
    reg.reviewedCodeSha!==r.reviewedCodeSha||reg.manifestSha256!==r.manifestSha256||
    reg.rightsSha256!==r.rightsSha256||reg.releaseSha256!==r.releaseSha256||
    !SRC.test(reg.sourceRegistryPath??"")||!H.test(reg.sourceRegistrySha256??"")||!H.test(reg.sourceReviewEvidenceSha256??"")||
    !Array.isArray(reg.entries)||reg.entries.length<1||reg.entries.length>96)
  hold("REGISTRY_WIRE_OR_STUDY_SCOPE_DRIFT");
 const reviewAt=utc(r.reviewedAtUtc),valid=utc(r.validUntilUtc),expiry=utc(r.retentionNotAfterUtc);
 if(reviewAt<utc(t.policyValidFromUtc)||reviewAt>now||now>=valid||valid>expiry||expiry>utc(t.policyValidUntilUtc)||
    expiry-reviewAt>t.maximumPrivateRetentionHours*3600000||
    (conditional&&(!reg.sourceExpiresAtUtc||expiry>utc(reg.sourceExpiresAtUtc))))
  hold("REGISTRY_SIGNATURE_EXPIRED_OR_FUTURE");
 try{
  const s=Buffer.from(wire.signatureBase64??"","base64");
  if(s.length!==64||s.toString("base64")!==wire.signatureBase64||!verify(null,preimage(r),pub,s))hold("REGISTRY_SIGNATURE_INVALID");
 }catch{hold("REGISTRY_SIGNATURE_INVALID");}
 const source=sourceFromIndex(index,t,reg),seen=new Set(),paths=new Set(),digests=new Set();
 for(const e of reg.entries){
  if(!keys(e,["filePath","packetSha256","flightInstanceId","queryDigestSha256","selectedTNativeUtc","cutoffUtc"])||
     !PACK.test(e.filePath??"")||!H.test(e.packetSha256??"")||!ID.test(e.flightInstanceId??"")||
     (conditional?!conditionalId(e.flightInstanceId):e.flightInstanceId.startsWith("leg:g5a:"))||
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
   manifestSha256:t.manifestSha256,rightsSha256:t.rightsSha256,rosterSha256:hash(raw),...(conditional?{releaseMode:"PHASE6_APPROVED",conditionalPreScope:t.conditionalT24Scope}:{})},"T24_WITH_SEPARATE_WITNESS");
  for(const e of reg.entries){
   const q=verified.get(e.packetSha256),p=q?.permit;
   if(!p||conditional!==(p.identityEvidenceTier==="CONDITIONAL_QUERY_FILTERED_SERVICE")||p.runDayIndex!==r.runDayIndex||p.horizon!=="T-24h"||p.flightInstanceId!==e.flightInstanceId||
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
export function buildP6DelegatedT24PrivateRegistry({handoff,features,authority,current,trust,phase7ProofScope=undefined}){
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
 const done=completeP6PostcommitReviewedPreBatch(handoff,{...phase7ProofScope,expectedDossierSha256:handoff.privateOriginalDossierSha256,observedDbClockUtc:now},reviewItems);
 if(done.completedPacketCount!==reviewItems.length)hold("ORIGINAL_T24_PACKET_COMPLETION_DRIFT");
 if(phase7ProofScope?.phase7ProofPreviewOnly===true)return Object.freeze(Object.defineProperty({status:"PHASE7_T24_EXACT_PROOF_REQUESTS_NO_SIGNATURE",phase7ProofPreviewOnly:true,packetCount:0,proofRequestCount:done.completedPacketCount,providerCalls:0,databaseWrites:0,phase6PaidGo:false},"privateCompletedPackets",{value:done.privateCompletedPackets,enumerable:false}));
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
    expectedPublisherSessionLogin===t.expectedReaderSessionLogin||!["SIGNED_NATIVE_T24_REGISTRY_AWAIT_PRIVATE_PUBLICATION","SIGNED_CONDITIONAL_T24_REGISTRY_AWAIT_PRIVATE_PUBLICATION"].includes(proposal?.status)||
    !seal(proposal,"privateRegistryBytes")||!seal(proposal,"privateWire")||!seal(proposal,"privateFiles"))
  hold("UNAPPROVED_PRIVATE_REGISTRY_PUBLICATION");
 const wire=proposal.privateWire,r=wire.review,regBytes=proposal.privateRegistryBytes,files=proposal.privateFiles;
 if((proposal.status==="SIGNED_CONDITIONAL_T24_REGISTRY_AWAIT_PRIVATE_PUBLICATION")!==(r.schema===conditionalReviewSchema))hold("REGISTRY_PUBLICATION_TIER_DRIFT");
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
  return Object.freeze(Object.defineProperties({status:reg.schema===conditionalSchema?"EXACT_PRIVATE_CONDITIONAL_T24_PACKETS_READONLY_NO_GO":"EXACT_PRIVATE_NATIVE_T24_PACKETS_READONLY_NO_GO",runDayIndex,registrySha256,
   observedDbClockUtc:now,packetCount:files.length,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
   {privateRegistry:{value:reg,enumerable:false},privateFiles:{value:files,enumerable:false}}));
 }finally{if(tx)await client.query("ROLLBACK").catch(()=>{});}
}

/** Genuine attached T24 packets -> separate unsigned registry; existing
 * private table, fresh current index, same prospective cutoff and expiry.
 * Caller must obtain the external review signature before publication. */
export function buildP6ConditionalT24RegistryProposal({trust:t,current,sourceRegistryPath,sourceRegistrySha256,packets,sourceExpiresAtUtc}){
 trustCheck(t);
 if(!t.conditionalT24Scope||!sameP5ConditionalLaterReviewerScope(t.conditionalT24Scope,t.conditionalT24Scope)||
    Object.keys(t.conditionalT24Scope).length!==2||current?.status!=="CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO"||
    !seal(current,"privateIndex")||!seal(current,"privateExistingFlightIds")||
    !Number.isSafeInteger(current.nextShardIndex)||current.nextShardIndex<1||current.nextShardIndex>100000||
    !Array.isArray(packets)||packets.length<1||packets.length>96)hold("NO_EXACT_CONDITIONAL_T24_PROPOSAL_SCOPE");
 const now=utc(current.observedDbClockUtc),until=Math.min(now+t.maximumPrivateRetentionHours*3600000,utc(t.policyValidUntilUtc),utc(sourceExpiresAtUtc));
 const source=current.privateIndex.privateParsedIndex.entries.filter(e=>e.lane==="SOURCE"&&e.filePath===sourceRegistryPath&&e.fileSha256===sourceRegistrySha256);
 if(source.length!==1||now<utc(t.policyValidFromUtc)||until<=now)hold("NO_EXACT_CONDITIONAL_T24_SOURCE");
 const ids=new Set(),digests=new Set(),files=[],entries=[];
 for(const x of packets){
  assertP5ProofAttachedConditionalPacket(x);
  const p=x.packet.prePermit,cutoff=utc(p.selectedTNativeUtc)-86400000;
  if(p.identityEvidenceTier!=="CONDITIONAL_QUERY_FILTERED_SERVICE"||p.horizon!=="T-24h"||
    p.runDayIndex!==current.runDayIndex||cutoff<=now+900000||cutoff>=until||cutoff>now+10800000||
    current.privateExistingFlightIds.has(p.flightInstanceId)||ids.has(p.flightInstanceId)||digests.has(x.packetSha256))
   hold("CONDITIONAL_T24_DUPLICATE_OR_WINDOW");
  const filePath="data-collection/phase5/frozen/t24p_"+x.packetSha256+".json";
  files.push({filePath,packetSha256:x.packetSha256,bytes:Buffer.from(x.packetBytes)});
  entries.push({filePath,packetSha256:x.packetSha256,flightInstanceId:p.flightInstanceId,queryDigestSha256:p.queryDigestSha256,
   selectedTNativeUtc:p.selectedTNativeUtc,cutoffUtc:new Date(cutoff).toISOString()});
  ids.add(p.flightInstanceId);digests.add(x.packetSha256);
 }
 const reg={schema:conditionalSchema,runDayIndex:current.runDayIndex,shardIndex:current.nextShardIndex,reviewedCodeSha:t.reviewedCodeSha,
  manifestSha256:t.manifestSha256,rightsSha256:t.rightsSha256,releaseSha256:t.releaseSha256,sourceRegistryPath,sourceRegistrySha256,
  sourceReviewEvidenceSha256:source[0].reviewEvidenceSha256,conditionalT24Scope:t.conditionalT24Scope,sourceExpiresAtUtc,entries};
 sourceFromIndex(current.privateIndex,t,reg);
 const registryBytes=bytes(reg),registrySha256=hash(registryBytes);
 const review={schema:conditionalReviewSchema,audience:conditionalAudience,logicalPath:"data-collection/phase5/frozen/t24r_"+registrySha256+".json",
  runDayIndex:reg.runDayIndex,shardIndex:reg.shardIndex,registrySha256,reviewedCodeSha:t.reviewedCodeSha,manifestSha256:t.manifestSha256,
  rightsSha256:t.rightsSha256,releaseSha256:t.releaseSha256,policySha256:t.expectedT24PolicySha256,reviewedAtUtc:current.observedDbClockUtc,
  validUntilUtc:new Date(until).toISOString(),retentionNotAfterUtc:new Date(until).toISOString(),reviewerFingerprintSha256:t.expectedT24ReviewerFingerprintSha256,
  conditionalT24Scope:t.conditionalT24Scope};
 return Object.freeze(Object.defineProperties({status:"CONDITIONAL_T24_REGISTRY_AWAIT_INDEPENDENT_SIGNATURE",packetCount:files.length,
  registrySha256,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
  {privateRegistryBytes:{value:registryBytes,enumerable:false},privateReview:{value:review,enumerable:false},privateFiles:{value:files,enumerable:false}}));
}
export function attachP6ConditionalT24RegistrySignature({trust,current,proposal,wire}){
 if(proposal?.status!=="CONDITIONAL_T24_REGISTRY_AWAIT_INDEPENDENT_SIGNATURE"||!seal(proposal,"privateRegistryBytes")||
    !seal(proposal,"privateReview")||!seal(proposal,"privateFiles")||
    !bytes(proposal.privateReview).equals(bytes(wire?.review??null)))hold("CONDITIONAL_T24_EXTERNAL_REVIEW_CHANGED");
 const verified=verifyP6T24PrivateRegistry({trust,index:current.privateIndex,registryBytes:proposal.privateRegistryBytes,
  wire,observedDbClockUtc:current.observedDbClockUtc,files:proposal.privateFiles});
 return Object.freeze(Object.defineProperties({status:"SIGNED_CONDITIONAL_T24_REGISTRY_AWAIT_PRIVATE_PUBLICATION",packetCount:verified.reg.entries.length,
  registrySha256:verified.review.registrySha256,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
  {privateRegistryBytes:{value:proposal.privateRegistryBytes,enumerable:false},privateWire:{value:wire,enumerable:false},privateFiles:{value:proposal.privateFiles,enumerable:false}}));
}

/** The same explicitly protected delegated registry signer as native T24,
 * but a distinct conditional signature domain and policy scope. */
export function signP6DelegatedConditionalT24Registry({trust:t,current,proposal,authority}){
 const b=authority?.policyBytes;
 if(!Buffer.isBuffer(b)||hash(b)!==t.expectedT24PolicySha256||authority.expectedPolicySha256!==t.expectedT24PolicySha256||
  authority.independentDelegatedNativeReviewApproved!==true||authority.noProviderCredentialsInReviewer!==true||
  authority.laterReviewerKey?.type!=="private"||authority.laterReviewerKey.asymmetricKeyType!=="ed25519"||
  hash(createPublicKey(authority.laterReviewerKey).export({format:"der",type:"spki"}))!==t.expectedT24ReviewerFingerprintSha256)
  hold("CONDITIONAL_T24_REGISTRY_DELEGATION");
 const p=JSON.parse(b.toString("utf8")),v=p.nativeLaterReview;
 if(p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
  p.approvedCodeSha!==t.reviewedCodeSha||!["manifestSha256","rightsSha256","releaseSha256","calendarSha256"].every(k=>p[k]===t[k])||
  v?.approved!==true||v.privatePublicationApproved!==true||v.nativeT24ReviewApproved!==true||
  v.laterReviewerFingerprintSha256!==t.expectedT24ReviewerFingerprintSha256||
  !sameP5ConditionalLaterReviewerScope(deriveP6ConditionalT24Scope(p),t.conditionalT24Scope)||
  proposal?.status!=="CONDITIONAL_T24_REGISTRY_AWAIT_INDEPENDENT_SIGNATURE"||!seal(proposal,"privateReview"))
  hold("CONDITIONAL_T24_REGISTRY_DELEGATION");
 const review=proposal.privateReview,wire={review,signatureBase64:sign(null,preimage(review),authority.laterReviewerKey).toString("base64")};
 return attachP6ConditionalT24RegistrySignature({trust:t,current,proposal,wire});
}
