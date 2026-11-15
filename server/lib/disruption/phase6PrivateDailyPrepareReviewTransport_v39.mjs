/**
 * Durable, exact daily preparation review bytes in existing V0094/V0099
 * private transport. Independent Ed25519 reviewer pinned separately from
 * publisher/reader. No provider Contents, PRE or paid permission.
 * Never generate a replacement packet on unknown commit. Read exact row.
 */
import {createHash,createPublicKey,verify} from "node:crypto";
import {readP6DayEpochRestrictedReaderClock,readP6DayEpochRestrictedPublisherClock}
 from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import {normalizeP5TypedSourceBudgetBinding,sameP5TypedSourceBudgetBinding} from "./phase5TypedSourceBudgetBinding_v39.mjs";
export const P6_DAILY_PREPARE_REVIEW_SCHEMA="v39.phase6.external-daily-prepare-review-ed25519.v1";
const AUD="HKcode22/ReplitTranvr:PHASE6_DAILY_PREPARE_REVIEW_ONLY";
const DOMAIN="HKcode22/ReplitTranvr:PHASE6_DAILY_PREPARE_REVIEW:v1\n";
const TABLE="phase6_private.frozen_native_packet_v39",KIND="SOURCE_DAY_PREPARE_REVIEW";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const fail=s=>{throw Error("HOLD_P6_DAILY_PREPARE_TRANSPORT_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const keys=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join("|")===k.slice().sort().join("|");
const at=v=>{const n=new Date(v instanceof Date?v.getTime():String(v));if(!Number.isFinite(n.getTime()))fail("INVALID_UTC");return n.toISOString();};
const utc=v=>{if(typeof v!=="string"||at(v)!==v)fail("NONEXACT_UTC");return Date.parse(v);};
const path=(day,manifest)=>"data-collection/phase5/frozen/prepare_d"+day+"_"+manifest+".json";
export function p6DailyPrepareReviewPreimage(review){return Buffer.concat([Buffer.from(DOMAIN),Buffer.from(JSON.stringify(review),"utf8")]);}
function exactJson(bytes,max){
 if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>max)fail("BAD_PRIVATE_BYTES");
 try{const obj=JSON.parse(bytes.toString("utf8"));if(!Buffer.from(JSON.stringify(obj),"utf8").equals(bytes))fail("NONCANONICAL_REVIEW_OR_PACKET");return obj;}
 catch{fail("BAD_PRIVATE_JSON");}
}
function validateTrust(t){
 if(t?.independentDailyReviewerTrustApproved!==true||
  !Number.isSafeInteger(t.runDayIndex)||t.runDayIndex<1||t.runDayIndex>31||
  !CODE.test(t.reviewedCodeSha??"")||
  ![t.manifestSha256,t.calendarSha256,t.configSha256,t.frameSha256,t.releaseSha256,t.rightsSha256,
    t.providerContractSha256,t.policySha256,t.dayPlanSha256,t.reviewerFingerprintSha256,
    t.reviewedCategoryBudgetSha256].every(x=>SHA.test(x??""))||
  !normalizeP5TypedSourceBudgetBinding(t)||
  typeof t.reviewerPublicKeyPem!=="string"||t.reviewerPublicKeyPem.length>4096||
  !Number.isSafeInteger(t.maximumRetentionHours)||t.maximumRetentionHours<1||t.maximumRetentionHours>168||
  utc(t.policyValidUntilUtc)<=utc(t.policyValidFromUtc))
  fail("NO_INDEPENDENT_STABLE_REVIEW_TRUST");
}
export function verifyP6DailyPrepareReview({trust,wire,packetBytes,observedDbClockUtc}){
 validateTrust(trust);const r=wire?.review;
 if(!keys(wire,["review","signatureBase64"])||
  !keys(r,["schema","audience","logicalPath","runDayIndex","packetSha256","reviewedCodeSha","manifestSha256",
   "policySha256","dayPlanSha256","reviewedAtUtc","validUntilUtc","retentionNotAfterUtc","reviewerPublicKeyFingerprintSha256"])||
  r.schema!==P6_DAILY_PREPARE_REVIEW_SCHEMA||r.audience!==AUD||
  r.logicalPath!==path(trust.runDayIndex,trust.manifestSha256)||r.runDayIndex!==trust.runDayIndex||
  r.reviewedCodeSha!==trust.reviewedCodeSha||r.manifestSha256!==trust.manifestSha256||
  r.policySha256!==trust.policySha256||r.dayPlanSha256!==trust.dayPlanSha256||
  r.reviewerPublicKeyFingerprintSha256!==trust.reviewerFingerprintSha256||
  !SHA.test(r.packetSha256??"")||!Buffer.isBuffer(packetBytes)||hash(packetBytes)!==r.packetSha256)
  fail("UNPINNED_EXACT_DAILY_REVIEW");
 const t=utc(r.reviewedAtUtc),valid=utc(r.validUntilUtc),expiry=utc(r.retentionNotAfterUtc),now=utc(observedDbClockUtc);
 if(t<utc(trust.policyValidFromUtc)||t>now||now>=valid||valid>expiry||
  expiry>utc(trust.policyValidUntilUtc)||expiry-t>trust.maximumRetentionHours*3600000)
  fail("EXPIRED_OR_FUTURE_REVIEW");
 try{
  const pub=createPublicKey(trust.reviewerPublicKeyPem),sig=Buffer.from(wire.signatureBase64??"","base64");
  if(pub.asymmetricKeyType!=="ed25519"||hash(pub.export({format:"der",type:"spki"}))!==trust.reviewerFingerprintSha256||
   sig.length!==64||sig.toString("base64")!==wire.signatureBase64||!verify(null,p6DailyPrepareReviewPreimage(r),pub,sig))
   fail("INVALID_INDEPENDENT_DAILY_SIGNATURE");
 }catch{fail("INVALID_INDEPENDENT_DAILY_SIGNATURE");}
 const packet=exactJson(packetBytes,500000),a=packet.reviewedPrepareInput,z=a?.stage9Review,s=a?.sourceReview,g=a?.readScope;
 if(packet.schema!=="v39.phase5.github-signed-one-day-source-preparation.v1"||
  packet.independentlyReviewedExactDaySourcePacket!==true||packet.approvedCodeSha!==trust.reviewedCodeSha||
  packet.manifestSha256!==trust.manifestSha256||packet.runDayIndex!==trust.runDayIndex||!g||!s||!z||
  g.runDayIndex!==trust.runDayIndex||g.expectedManifestSha256!==trust.manifestSha256||
  g.expectedCalendarSha256!==trust.calendarSha256||g.expectedConfigSha256!==trust.configSha256||
  g.expectedFrameSha256!==trust.frameSha256||g.expectedProviderContractSha256!==trust.providerContractSha256||
  s.manifestSha256!==trust.manifestSha256||s.calendarSha256!==trust.calendarSha256||s.configSha256!==trust.configSha256||
  s.frameSha256!==trust.frameSha256||s.providerContractSha256!==trust.providerContractSha256||
  s.reviewedReleaseSha256!==trust.releaseSha256||s.rightsReviewSha256!==trust.rightsSha256||
  z.expectedManifestSha256!==trust.manifestSha256||z.expectedCalendarSha256!==trust.calendarSha256||
  z.expectedConfigSha256!==trust.configSha256||z.expectedFrameSha256!==trust.frameSha256||
  z.expectedReleaseSha256!==trust.releaseSha256||z.expectedRightsReviewSha256!==trust.rightsSha256||
  z.expectedProviderContractSha256!==trust.providerContractSha256||
  !sameP5TypedSourceBudgetBinding(z,trust)||
  z.reviewedCategoryBudgetSha256!==trust.reviewedCategoryBudgetSha256||
  z.independentFreezeApproved!==true||z.independentRightsReviewApproved!==true||
  z.githubOnlyProspectiveOwnerApproved!==true||!Array.isArray(g.templates)||
  g.templates.length<12||g.templates.length>384||g.templates.some(x=>x.runDayIndex!==trust.runDayIndex||
   utc(x.scheduledRequestUtc)<=t||utc(x.earliestPlannedCutoffUtc)>=expiry))
  fail("PACKET_STUDY_SCOPE_OR_PROSPECTIVE_CLOCK_DRIFT");
 return{review:r,packet,now,expiry};
}
function checkScope(scope,kind){
 if(scope?.privateDailyReviewTransportApproved!==true||scope.existingPaidDispatchApproved!==false||
  scope.adbAutoCollect!=="0"||scope.phase6ProcessArmed!=="0"||
  !(kind==="publisher"?/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/:/^phase6_private_reader_login_[a-z0-9_]{6,50}$/).test(scope.expectedSessionLogin??""))
  fail("NO_SEPARATE_RESTRICTED_STORAGE_APPROVAL");
}
export async function publishP6DailyPrepareReviewOnce({client,trust,wire,packetBytes,scope}){
 checkScope(scope,"publisher");let tx=false,attempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const now=await readP6DayEpochRestrictedPublisherClock(client,scope.expectedSessionLogin);
  const {review:r,packet}=verifyP6DailyPrepareReview({trust,wire,packetBytes,observedDbClockUtc:now});
  // Publication itself must precede earliest planned GET. A recovery read
  // can occur later but original Stage7/9 still refuse late preparation.
  if(packet.reviewedPrepareInput.readScope.templates.some(x=>utc(x.scheduledRequestUtc)<=utc(now)))
   fail("DAILY_REVIEW_PUBLICATION_TOO_LATE");
  const existing=await client.query("SELECT count(*)::int AS n FROM "+TABLE+" WHERE logical_path=$1",[r.logicalPath]);
  if(existing.rowCount!==1||existing.rows[0]?.n!==0)fail("DAILY_REVIEW_ALREADY_COMMITTED_NEVER_REPLACE");
  const wireBytes=Buffer.from(JSON.stringify(wire),"utf8");
  if(wireBytes.length>4096)fail("REVIEW_WIRE_OVERSIZE");
  const out=await client.query("INSERT INTO "+TABLE+" (logical_path,run_day_index,shard_index,kind,content_sha256,"+
   "reviewed_code_sha,manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,payload_bytes,review_wire_bytes) "+
   "VALUES($1,$2,1,'SOURCE_DAY_PREPARE_REVIEW',$3,$4,$5,$6,$7,$8,$9,$10,$11)",
   [r.logicalPath,r.runDayIndex,r.packetSha256,r.reviewedCodeSha,r.manifestSha256,trust.rightsSha256,
    hash(wireBytes),r.reviewedAtUtc,r.retentionNotAfterUtc,packetBytes,wireBytes]);
  if(out.rowCount!==1)fail("DAILY_REVIEW_INSERT_NOT_CONFIRMED");
  const end=await client.query("SELECT clock_timestamp() AS now");
  if(end.rowCount!==1||utc(at(end.rows[0].now))>=utc(r.validUntilUtc)||
     packet.reviewedPrepareInput.readScope.templates.some(x=>utc(x.scheduledRequestUtc)<=utc(at(end.rows[0].now))))
   fail("DAILY_REVIEW_EXPIRED_BEFORE_COMMIT");
  attempted=true;await client.query("COMMIT");tx=false;
  return Object.freeze({runDayIndex:r.runDayIndex,exactDailyPacketSha256:r.packetSha256,independentReadbackRequired:true,
   providerCalls:0,phase6PaidGo:false});
 }catch(e){if(attempted)fail("UNKNOWN_COMMIT_READBACK_ONLY_NEVER_REPLAY");if(tx)await client.query("ROLLBACK").catch(()=>{});
  if(/^HOLD_P6_DAILY_PREPARE_TRANSPORT_[A-Z0-9_]+$/.test(e?.message??""))throw e;fail("PUBLISHER_FAILURE_REDACTED");}
}
export async function readP6DailyPrepareReviewOnce({client,trust,scope}){
 checkScope(scope,"reader");validateTrust(trust);let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const now=await readP6DayEpochRestrictedReaderClock(client,scope.expectedSessionLogin);
  const out=await client.query("SELECT logical_path,run_day_index,shard_index,kind,content_sha256,reviewed_code_sha,"+
   "manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,"+
   "committed_at_utc,payload_bytes,review_wire_bytes FROM "+TABLE+" WHERE logical_path=$1",
   [path(trust.runDayIndex,trust.manifestSha256)]);
  if(out.rowCount===0&&out.rows.length===0)fail("EXACT_DAILY_REVIEW_ABSENT");
  if(out.rowCount!==1||out.rows.length!==1)fail("EXACT_DAILY_REVIEW_NOT_UNIQUE");
  const x=out.rows[0],wire=exactJson(x.review_wire_bytes,4096),bytes=x.payload_bytes;
  const {review:r,packet}=verifyP6DailyPrepareReview({trust,wire,packetBytes:bytes,observedDbClockUtc:now});
  if(x.kind!==KIND||x.logical_path!==r.logicalPath||x.run_day_index!==r.runDayIndex||x.shard_index!==1||
   x.content_sha256!==r.packetSha256||x.reviewed_code_sha!==r.reviewedCodeSha||x.manifest_sha256!==r.manifestSha256||
   x.rights_sha256!==trust.rightsSha256||x.external_review_sha256!==hash(x.review_wire_bytes)||
   at(x.externally_reviewed_at_utc)!==r.reviewedAtUtc||at(x.retention_not_after_utc)!==r.retentionNotAfterUtc||
   at(x.committed_at_utc)<r.reviewedAtUtc||at(x.committed_at_utc)>now)
   fail("IMMUTABLE_REVIEW_ROW_DRIFT");
  await client.query("ROLLBACK");tx=false;
  const summary={runDayIndex:r.runDayIndex,exactDailyPacketSha256:r.packetSha256,
   verifiedOriginalReviewWire:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
  return Object.freeze(Object.defineProperties(summary,{privatePacketBytes:{value:Buffer.from(bytes),enumerable:false},
   privatePacket:{value:packet,enumerable:false},privateWire:{value:wire,enumerable:false}}));
 }catch(e){if(tx)await client.query("ROLLBACK").catch(()=>{});
  if(/^HOLD_P6_DAILY_PREPARE_TRANSPORT_[A-Z0-9_]+$/.test(e?.message??""))throw e;fail("READER_FAILURE_REDACTED");}
}
