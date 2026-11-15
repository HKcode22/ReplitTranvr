/** Private custody of an exact, originally observed Stage17 receipt candidate.
 * A custody signature is NOT the scientific/native-source reviewer signature.
 * No provider calls, PRE or witness writes, retrospective readback timestamps,
 * dispatch, or Phase6 GO. Reuse existing separately restricted roles. */
import {createHash,createPublicKey,verify} from "node:crypto";
import {readP6DayEpochRestrictedReaderClock,readP6DayEpochRestrictedPublisherClock} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import {digestP5Stage24ReviewedReceipt} from "./phase5T24WitnessedLaterHorizonGuard_v39.ts";
export const P6_T24_CUSTODY_SCHEMA="v39.phase6.t24-witness-custody-ed25519.v1";
const AUD="HKcode22/ReplitTranvr:PHASE6_T24_WITNESS_CUSTODY_ONLY";
const DOMAIN="HKcode22/ReplitTranvr:PHASE6_T24_WITNESS_CUSTODY:v1\n";
const TABLE="phase6_private.frozen_native_packet_v39",KIND="T24_WITNESS_RECEIPT_CANDIDATE";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/,ID=/^[A-Za-z0-9_.:|-]{5,200}$/;
const fail=s=>{throw Error("HOLD_P6_T24_CUSTODY_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const keys=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join("|")===k.slice().sort().join("|");
const at=v=>{const n=new Date(v instanceof Date?v.getTime():String(v));if(!Number.isFinite(n.getTime()))fail("INVALID_UTC");return n.toISOString();};
const utc=v=>{if(typeof v!=="string"||at(v)!==v)fail("NONEXACT_UTC");return Date.parse(v);};
function trustCheck(t){
 if(t?.independentT24CustodyTrustApproved!==true||!Number.isSafeInteger(t.runDayIndex)||t.runDayIndex<1||t.runDayIndex>31||
  !ID.test(t.flightInstanceId??"")||!CODE.test(t.reviewedCodeSha??"")||
  ![t.manifestSha256,t.rightsSha256,t.releaseSha256,t.policySha256,t.reviewerFingerprintSha256,t.expectedFrameSha256,t.expectedConfigSha256].every(x=>SHA.test(x??""))||
  typeof t.expectedSelectedTVersion!=="string"||t.expectedSelectedTVersion.length<1||t.expectedSelectedTVersion.length>512||
  typeof t.reviewerPublicKeyPem!=="string"||t.reviewerPublicKeyPem.length>4096||
  !Number.isSafeInteger(t.maximumRetentionHours)||t.maximumRetentionHours<1||t.maximumRetentionHours>168||
  utc(t.policyValidUntilUtc)<=utc(t.policyValidFromUtc))fail("NO_PINNED_CUSTODY_TRUST");
}
export function p6T24WitnessCustodyPath(trust){
 trustCheck(trust);
 return "data-collection/phase5/frozen/t24w_"+hash(JSON.stringify([trust.manifestSha256,trust.runDayIndex,trust.flightInstanceId]))+".json";
}
export function p6T24WitnessCustodyPreimage(review){return Buffer.concat([Buffer.from(DOMAIN),Buffer.from(JSON.stringify(review),"utf8")]);}
function json(bytes,max){
 if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>max)fail("BAD_BYTES");
 try{const obj=JSON.parse(bytes.toString("utf8"));if(!Buffer.from(JSON.stringify(obj)).equals(bytes))fail("NONEXACT_JSON");return obj;}
 catch{fail("BAD_PRIVATE_JSON");}
}
export function verifyP6T24WitnessCustody({trust,wire,packetBytes,observedDbClockUtc}){
 trustCheck(trust);
 const r=wire?.review;
 if(!keys(wire,["review","signatureBase64"])||
  !keys(r,["schema","audience","logicalPath","runDayIndex","packetSha256","receiptSha256","reviewedCodeSha","manifestSha256","rightsSha256","releaseSha256","policySha256","reviewedAtUtc","validUntilUtc","retentionNotAfterUtc","reviewerPublicKeyFingerprintSha256"])||
  r.schema!==P6_T24_CUSTODY_SCHEMA||r.audience!==AUD||r.logicalPath!==p6T24WitnessCustodyPath(trust)||
  r.runDayIndex!==trust.runDayIndex||r.reviewedCodeSha!==trust.reviewedCodeSha||r.manifestSha256!==trust.manifestSha256||
  r.rightsSha256!==trust.rightsSha256||r.releaseSha256!==trust.releaseSha256||r.policySha256!==trust.policySha256||
  r.reviewerPublicKeyFingerprintSha256!==trust.reviewerFingerprintSha256||
  !SHA.test(r.receiptSha256??"")||!SHA.test(r.packetSha256??"")||!Buffer.isBuffer(packetBytes)||hash(packetBytes)!==r.packetSha256)
  fail("UNPINNED_EXACT_RECEIPT_WIRE");
 const reviewed=utc(r.reviewedAtUtc),valid=utc(r.validUntilUtc),expiry=utc(r.retentionNotAfterUtc),now=utc(observedDbClockUtc);
 if(reviewed<utc(trust.policyValidFromUtc)||reviewed>now||valid<=reviewed||now>=valid||valid>expiry||
  expiry>utc(trust.policyValidUntilUtc)||expiry-reviewed>trust.maximumRetentionHours*3600000)fail("EXPIRED_OR_FUTURE_CUSTODY");
 try{
  const key=createPublicKey(trust.reviewerPublicKeyPem),sig=Buffer.from(wire.signatureBase64??"","base64");
  if(key.asymmetricKeyType!=="ed25519"||hash(key.export({format:"der",type:"spki"}))!==trust.reviewerFingerprintSha256||
   sig.length!==64||sig.toString("base64")!==wire.signatureBase64||!verify(null,p6T24WitnessCustodyPreimage(r),key,sig))fail("BAD_SIGNATURE");
 }catch{fail("BAD_SIGNATURE");}
 const p=json(packetBytes,20000),c=p.candidate,w=c?.receipt;
 if(!keys(p,["schema","runDayIndex","manifestSha256","candidate"])||p.schema!=="v39.phase6.private-t24-witness-candidate.v1"||
  p.runDayIndex!==trust.runDayIndex||p.manifestSha256!==trust.manifestSha256||
  !keys(c,["schema","status","receipt","reviewedByIndependentAuthority","mayLaunchLaterPreAutomatically","providerCalls"])||
  c.schema!=="v39.phase5.unsigned-t24-stage24-handoff.v1"||c.status!=="DURABLE_T24_RECEIPT_CANDIDATE_AWAITING_INDEPENDENT_REVIEW"||
  c.reviewedByIndependentAuthority!==false||c.mayLaunchLaterPreAutomatically!==false||c.providerCalls!==0||
  !keys(w,["schema","snapshotId","flightInstanceId","selectedTNativeUtc","frozenT24CutoffUtc","expectedSelectedTVersion","t24OriginalFidsSha256","t24SourceQueryDigestSha256","t24FrameSha256","t24ConfigSha256","witnessDbObservedAtUtc","stage17PostCommitReadbackAtUtc","receiptSha256"])||
  w.schema!=="v39.phase5.stage24.externally-reviewed-stage17-receipt.v1"||w.flightInstanceId!==trust.flightInstanceId||
  typeof w.snapshotId!=="string"||!/^[1-9][0-9]{0,17}$/.test(w.snapshotId)||
  w.expectedSelectedTVersion!==trust.expectedSelectedTVersion||w.t24FrameSha256!==trust.expectedFrameSha256||w.t24ConfigSha256!==trust.expectedConfigSha256||
  ![w.t24OriginalFidsSha256,w.t24SourceQueryDigestSha256,w.receiptSha256].every(x=>SHA.test(x??""))||
  w.receiptSha256!==r.receiptSha256||digestP5Stage24ReviewedReceipt(w)!==w.receiptSha256)fail("CANDIDATE_SCOPE_OR_DIGEST_DRIFT");
 const cutoff=utc(w.frozenT24CutoffUtc),observed=utc(w.witnessDbObservedAtUtc),readback=utc(w.stage17PostCommitReadbackAtUtc);
 if(utc(w.selectedTNativeUtc)-cutoff!==86400000||observed<cutoff-180000||observed>=cutoff-2000||
  readback<observed||readback>=cutoff||readback>reviewed)fail("NOT_ORIGINAL_PRECUTOFF_READBACK");
 return {review:r,receipt:w};
}
function scopeCheck(scope,kind){
 if(scope?.privateT24CustodyApproved!==true||scope.existingPaidDispatchApproved!==false||scope.adbAutoCollect!=="0"||scope.phase6ProcessArmed!=="0"||
 !(kind==="publisher"?/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/:/^phase6_private_reader_login_[a-z0-9_]{6,50}$/).test(scope.expectedSessionLogin??""))
 fail("NO_RESTRICTED_CUSTODY_SCOPE");
}
export async function publishP6T24WitnessCustodyOnce({client,trust,wire,packetBytes,scope}){
 scopeCheck(scope,"publisher");let tx=false,attempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");await client.query("SET LOCAL lock_timeout='2000ms'");
  const now=await readP6DayEpochRestrictedPublisherClock(client,scope.expectedSessionLogin);
  const {review:r}=verifyP6T24WitnessCustody({trust,wire,packetBytes,observedDbClockUtc:now});
  const old=await client.query("SELECT count(*)::int AS n FROM "+TABLE+" WHERE logical_path=$1",[r.logicalPath]);
  if(old.rowCount!==1||old.rows[0]?.n!==0)fail("ALREADY_COMMITTED_NEVER_REPLACE");
  const wb=Buffer.from(JSON.stringify(wire));if(wb.length>4096)fail("WIRE_OVERSIZE");
  const out=await client.query("INSERT INTO "+TABLE+" (logical_path,run_day_index,shard_index,kind,content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,payload_bytes,review_wire_bytes) VALUES($1,$2,1,'T24_WITNESS_RECEIPT_CANDIDATE',$3,$4,$5,$6,$7,$8,$9,$10,$11)",
   [r.logicalPath,r.runDayIndex,r.packetSha256,r.reviewedCodeSha,r.manifestSha256,r.rightsSha256,hash(wb),r.reviewedAtUtc,r.retentionNotAfterUtc,packetBytes,wb]);
  if(out.rowCount!==1)fail("INSERT_NOT_CONFIRMED");
  const end=await client.query("SELECT clock_timestamp() AS now");
  if(end.rowCount!==1||utc(at(end.rows[0].now))>=utc(r.validUntilUtc))fail("EXPIRED_BEFORE_COMMIT");
  attempted=true;await client.query("COMMIT");tx=false;
  return Object.freeze({runDayIndex:r.runDayIndex,receiptSha256:r.receiptSha256,independentReadbackRequired:true,scientificReviewCompleted:false,providerCalls:0,phase6PaidGo:false});
 }catch(e){if(attempted)fail("UNKNOWN_COMMIT_READBACK_ONLY_NEVER_REPLAY");if(tx)await client.query("ROLLBACK").catch(()=>{});
  if(/^HOLD_P6_T24_CUSTODY_[A-Z0-9_]+$/.test(e?.message??""))throw e;fail("PUBLISHER_FAILURE_REDACTED");}
}
export async function readP6T24WitnessCustodyOnce({client,trust,scope}){
 scopeCheck(scope,"reader");trustCheck(trust);let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");await client.query("SET LOCAL lock_timeout='2000ms'");
  const now=await readP6DayEpochRestrictedReaderClock(client,scope.expectedSessionLogin);
  const out=await client.query("SELECT logical_path,run_day_index,shard_index,kind,content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,committed_at_utc,payload_bytes,review_wire_bytes FROM "+TABLE+" WHERE logical_path=$1",[p6T24WitnessCustodyPath(trust)]);
  if(out.rowCount===0)fail("EXACT_RECEIPT_ABSENT_NOT_NEGATIVE_T24_EVIDENCE");
  if(out.rowCount!==1||out.rows.length!==1)fail("NOT_UNIQUE");
  const x=out.rows[0],wire=json(x.review_wire_bytes,4096);
  const {review:r,receipt}=verifyP6T24WitnessCustody({trust,wire,packetBytes:x.payload_bytes,observedDbClockUtc:now});
  if(x.kind!==KIND||x.logical_path!==r.logicalPath||x.run_day_index!==r.runDayIndex||x.shard_index!==1||
   x.content_sha256!==r.packetSha256||x.reviewed_code_sha!==r.reviewedCodeSha||x.manifest_sha256!==r.manifestSha256||
   x.rights_sha256!==r.rightsSha256||x.external_review_sha256!==hash(x.review_wire_bytes)||
   at(x.externally_reviewed_at_utc)!==r.reviewedAtUtc||at(x.retention_not_after_utc)!==r.retentionNotAfterUtc||
   at(x.committed_at_utc)<r.reviewedAtUtc||at(x.committed_at_utc)>now)fail("IMMUTABLE_ROW_DRIFT");
  await client.query("ROLLBACK");tx=false;
  const result={runDayIndex:r.runDayIndex,receiptSha256:r.receiptSha256,exactCustodyWireVerified:true,scientificReviewCompleted:false,
   mayLaunchLaterPreAutomatically:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
  return Object.freeze(Object.defineProperty(result,"privateReceipt",{value:Object.freeze(receipt),enumerable:false}));
 }catch(e){if(tx)await client.query("ROLLBACK").catch(()=>{});
  if(/^HOLD_P6_T24_CUSTODY_[A-Z0-9_]+$/.test(e?.message??""))throw e;fail("READER_FAILURE_REDACTED");}
}
