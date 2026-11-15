/** Existing queued T24 executor's optional in-memory follow-on. Retain
 * the exact Stage17 receipt, not reconstructed clocks. Independent custody
 * policy and key authenticate preservation only, not native/scientific
 * review or a new PRE/paid release. Reuse V0101 (staged until owner install),
 * the existing direct reader/publisher logins and original custody functions. */
import pg from "pg";
import {createHash,createPrivateKey,createPublicKey,sign} from "node:crypto";
import {readP6StableSourceTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39.ts";
import {readP6DayEpochRestrictedReaderClock,readP6DayEpochRestrictedPublisherClock} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {P6_T24_CUSTODY_SCHEMA,p6T24WitnessCustodyPath,p6T24WitnessCustodyPreimage,verifyP6T24WitnessCustody,publishP6T24WitnessCustodyOnce,readP6T24WitnessCustodyOnce} from "../server/lib/disruption/phase6PrivateT24WitnessReceiptTransport_v39.mjs";
import {verifyP5T24PreWitnessCrossReview} from "../server/lib/disruption/phase5T24PreIndependentWitnessChain_v39.ts";
const H=/^[a-f0-9]{64}$/,LOGIN=/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/;
const hash=x=>createHash("sha256").update(x).digest("hex");
const hold=s=>{throw Error("HOLD_P6_COMMITTED_T24_CUSTODY_"+s);};
const utc=s=>{if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)hold("INVALID_CLOCK");return Date.parse(s);};
const iso=n=>new Date(n).toISOString();
function decode(s,max){
 if(typeof s!=="string"||s.length<100||s.length>Math.ceil(max/3)*4)hold("MISSING_PROTECTED_BYTES");
 const b=Buffer.from(s,"base64");
 if(b.length>max||b.toString("base64")!==s)hold("NONCANONICAL_PROTECTED_BYTES");
 return b;
}
function url(raw,login,base){
 let u;try{u=new URL(raw);}catch{hold("MISSING_RESTRICTED_CUSTODY_URL");}
 if(!sameP6NeonDatabaseEndpoint(u,base)||decodeURIComponent(u.username)!==login||!u.password||
    u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="require"||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))
  hold("CUSTODY_WRONG_RESTRICTED_ENDPOINT");
 return raw;
}
export function admitP6CommittedT24Custody(env,pre,witness){
 if(env.P6_T24_CUSTODY_ENABLED!=="1")return null;
 if(env.P6_T24_CUSTODY_APPROVED!=="1"||env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||env.GITHUB_REF!=="refs/heads/main"||
    !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME)||env.GITHUB_RUN_ATTEMPT!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||env.P5_V39_PREPARE_DATABASE_URL||env.V39_P5_SOURCE_DATABASE_URL||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.P5_CD_GH_T24_WITNESS_APPROVED!=="1"||env.P5_CD_GH_PRE_APPROVED_CODE_SHA!==env.GITHUB_SHA)
  hold("NOT_APPROVED_NONPAID_T24_CUSTODY");
 verifyP5T24PreWitnessCrossReview(pre,witness);
 const t=readP6StableSourceTrust(env),b=decode(env.P6_NONPAID_DAILY_POLICY_BASE64,35000);
 if(!H.test(env.P6_NONPAID_DAILY_POLICY_SHA256??"")||hash(b)!==env.P6_NONPAID_DAILY_POLICY_SHA256)hold("POLICY_SHA_DRIFT");
 let p;try{p=JSON.parse(b.toString("utf8"));}catch{hold("POLICY_JSON_INVALID");}
 const v=p?.nativeLaterReview,c=v?.t24Custody,cfg=pre.selectedTConfig;
 if(p?.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
    p.approvedCodeSha!==t.reviewedCodeSha||!["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>p[k]===t[k])||
    pre.manifestSha256!==t.manifestSha256||pre.expectedReviewedReleaseSha256!==t.releaseSha256||pre.expectedReviewedSourceRightsSha256!==t.rightsSha256||
    pre.reviewedFrameSha256!==p.frameSha256||pre.reviewedConfigSha256!==p.configSha256||
    pre.expectedProviderContractSha256!==p.providerContractSha256||v?.frameSha256!==p.frameSha256||v.configSha256!==p.configSha256||
    JSON.stringify(v.selectedTConfig)!==JSON.stringify(cfg)||
    c?.independentT24CustodyTrustApproved!==true||!H.test(c.policySha256??"")||!H.test(c.reviewerFingerprintSha256??"")||
    !Number.isSafeInteger(c.maximumRetentionHours)||c.maximumRetentionHours<1||c.maximumRetentionHours>168||
    utc(c.policyValidFromUtc)>=utc(c.policyValidUntilUtc)||!LOGIN.test(v.expectedPublisherSessionLogin??""))
  hold("EXACT_T24_STUDY_POLICY_OR_FRAME_DRIFT");
 let privateKey;
 try{
  const pem=decode(env.P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64,9000);
  privateKey=createPrivateKey(pem);pem.fill(0);
  const publicKey=createPublicKey(c.reviewerPublicKeyPem);
  if(privateKey.asymmetricKeyType!=="ed25519"||publicKey.asymmetricKeyType!=="ed25519"||
     hash(createPublicKey(privateKey).export({type:"spki",format:"der"}))!==c.reviewerFingerprintSha256||
     hash(publicKey.export({type:"spki",format:"der"}))!==c.reviewerFingerprintSha256)hold("WRONG_CUSTODY_SIGNER");
 }catch{hold("WRONG_CUSTODY_SIGNER");}
 let base;try{base=new URL(env.P5_V39_PRE_DATABASE_URL);}catch{hold("EXISTING_PRE_ENDPOINT_MISSING");}
 const readerUrl=url(env.P6_PRIVATE_READER_DATABASE_URL,t.expectedReaderSessionLogin,base),
  publisherUrl=url(env.P6_PRIVATE_PUBLISHER_DATABASE_URL,v.expectedPublisherSessionLogin,base);
 if(new Set([t.expectedReaderSessionLogin,v.expectedPublisherSessionLogin,decodeURIComponent(base.username),"phase5_p30_witness_login_20261107"]).size!==4)
  hold("DISTINCT_ROLES_REQUIRED");
 const trust={...c,runDayIndex:pre.runDayIndex,flightInstanceId:pre.flightInstanceId,
  reviewedCodeSha:t.reviewedCodeSha,manifestSha256:t.manifestSha256,rightsSha256:t.rightsSha256,releaseSha256:t.releaseSha256,
  expectedFrameSha256:pre.reviewedFrameSha256,expectedConfigSha256:pre.reviewedConfigSha256,
  expectedSelectedTVersion:witness.expectedSelectedTVersion};
 const scope={privateT24CustodyApproved:true,existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0"};
 return {trust,privateKey,readerUrl,publisherUrl,pre,witness,
  readerScope:{...scope,expectedSessionLogin:t.expectedReaderSessionLogin},
  publisherScope:{...scope,expectedSessionLogin:v.expectedPublisherSessionLogin}};
}
/** Requires the actual original queued worker success, not merely an
 * arbitrary source row or today's witness timestamp. The custody signer
 * verifies the original pre/witness scope and never invents receipt data. */
export function buildP6ActualT24CustodyWire(ctx,result,observedDbClockUtc){
 const c=result?.unsignedStage24ReceiptCandidate,w=c?.receipt,t=ctx?.trust,p=ctx?.pre;
 if(!ctx||result.schema!=="v39.phase5.queued-t24-pre-independent-v0081-witness.v1"||
    result.status!=="T24_PRE_V0081_WITNESS_AND_QUEUE_VERIFIED_NOT_SCIENTIFIC_FREEZE"||
    result.registeredTaskWasSourceBound!==true||result.stage17WitnessCommittedAndReadBack!==true||
    result.providerCalls!==0||result.paidProviderCalls!==0||result.queuedTasksInserted!==0||
    result.phase5ScientificFreezePassed!==false||result.phase6PaidGo!==false||
    !w||w.snapshotId!==result.committedSnapshotId||w.flightInstanceId!==p.flightInstanceId||
    w.selectedTNativeUtc!==p.selectedTNativeUtc||w.t24OriginalFidsSha256!==p.expectedSourceResponseSha256||
    w.t24SourceQueryDigestSha256!==p.queryDigestSha256)
  hold("NOT_ACTUAL_QUEUED_T24_RECEIPT");
 const now=utc(observedDbClockUtc),expiry=Math.min(now+t.maximumRetentionHours*3600000,utc(t.policyValidUntilUtc));
 const packetBytes=Buffer.from(JSON.stringify({schema:"v39.phase6.private-t24-witness-candidate.v1",
  runDayIndex:t.runDayIndex,manifestSha256:t.manifestSha256,candidate:c}));
 const review={schema:P6_T24_CUSTODY_SCHEMA,audience:"HKcode22/ReplitTranvr:PHASE6_T24_WITNESS_CUSTODY_ONLY",
  logicalPath:p6T24WitnessCustodyPath(t),runDayIndex:t.runDayIndex,packetSha256:hash(packetBytes),receiptSha256:w.receiptSha256,
  reviewedCodeSha:t.reviewedCodeSha,manifestSha256:t.manifestSha256,rightsSha256:t.rightsSha256,releaseSha256:t.releaseSha256,
  policySha256:t.policySha256,reviewedAtUtc:observedDbClockUtc,validUntilUtc:iso(expiry),retentionNotAfterUtc:iso(expiry),
  reviewerPublicKeyFingerprintSha256:t.reviewerFingerprintSha256};
 const wire={review,signatureBase64:sign(null,p6T24WitnessCustodyPreimage(review),ctx.privateKey).toString("base64")};
 verifyP6T24WitnessCustody({trust:t,wire,packetBytes,observedDbClockUtc});
 return {wire,packetBytes};
}
async function clock(client,login,publisher,verifySchema=false){
 let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ "+(publisher?"READ WRITE":"READ ONLY"));tx=true;
  const now=await (publisher?readP6DayEpochRestrictedPublisherClock:readP6DayEpochRestrictedReaderClock)(client,login);
  if(verifySchema){
   const c=await client.query("SELECT count(*)::int AS n FROM pg_catalog.pg_constraint WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass AND conname IN ('p6_v0101_kind_allowed','p6_v0101_kind_path_guard','p6_v0101_bytes_guard','p6_v0101_packet_wire_scope')");
   if(c.rowCount!==1||c.rows[0]?.n!==4)hold("V0101_NOT_ACTUALLY_INSTALLED");
  }
  await client.query("ROLLBACK");tx=false;return now;
 }finally{if(tx)await client.query("ROLLBACK").catch(()=>{});}
}
/** Preflight only when explicit custody mode is enabled. Do not consume a
 * real PRE when the optional-but-requested custody port is uncommissioned.
 * After the actual two commits, publish the original receipt once and
 * independently read it back. A failed/unknown custody COMMIT never
 * retries PRE or invents replacement witness clocks. */
export async function openP6CommittedT24Custody(ctx){
 if(!ctx)return null;
 const reader=new pg.Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,query_timeout:15000,application_name:"p6_t24_receipt_private_readback"});
 const publisher=new pg.Client({connectionString:ctx.publisherUrl,connectionTimeoutMillis:8000,query_timeout:15000,application_name:"p6_t24_receipt_private_custody"});
 let used=false;
 const close=async()=>{await Promise.allSettled([reader.end(),publisher.end()]);};
 try{
  await reader.connect();await reader.query("SET ROLE phase6_private_frozen_reader_v39");
  await publisher.connect();await publisher.query("SET ROLE phase6_private_frozen_publisher_v39");
  const before=await clock(reader,ctx.readerScope.expectedSessionLogin,false,true),pub=await clock(publisher,ctx.publisherScope.expectedSessionLogin,true);
  if(utc(pub)<utc(before)||utc(pub)<utc(ctx.trust.policyValidFromUtc)||utc(pub)>=utc(ctx.trust.policyValidUntilUtc))
   hold("CUSTODY_PREFLIGHT_CLOCK_OR_POLICY_DRIFT");
  return {close,async publish(result){
   if(used)hold("ONE_CUSTODY_ATTEMPT_NO_REPLAY");used=true;
   const now=await clock(reader,ctx.readerScope.expectedSessionLogin,false);
   const {wire,packetBytes}=buildP6ActualT24CustodyWire(ctx,result,now);
   const saved=await publishP6T24WitnessCustodyOnce({client:publisher,trust:ctx.trust,wire,packetBytes,scope:ctx.publisherScope});
   const read=await readP6T24WitnessCustodyOnce({client:reader,trust:ctx.trust,scope:ctx.readerScope});
   if(saved.receiptSha256!==read.receiptSha256||read.receiptSha256!==result.unsignedStage24ReceiptCandidate.receipt.receiptSha256)
    hold("CUSTODY_POSTCOMMIT_READBACK_DRIFT_NO_REPLAY");
   return {privateT24CustodyCommittedAndReadBack:true,receiptSha256:read.receiptSha256,
    independentScientificReviewCompleted:false,providerCalls:0,phase6PaidGo:false};
  }};
 }catch(e){await close();throw e;}
}
