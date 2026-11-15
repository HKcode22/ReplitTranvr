/** Existing SOURCE child's nonpaid follow-on. No new provider request,
 * no PRE writer or queue enrollment in this process. Read confirmed
 * SOURCE once; privately review/publish later shards via existing ports.
 * Never run both the audit-only and this follow-on for a single child.
 * All publication uses independently approved protected policies and
 * existing restricted logins; STOP default. */
import pg from "pg";
import {readP6T24RegistryRoutingTrust} from "../server/lib/disruption/phase6CurrentPrivateT24Routing_v39.mjs";
import {readP6T24CurrentRegistrySet,buildP6DelegatedT24PrivateRegistry,publishP6T24PrivateRegistryOnce} from "../server/lib/disruption/phase6PrivateT24RegistryTransport_v39.mjs";
import {createHash,createPrivateKey,createPublicKey} from "node:crypto";
import {pathToFileURL} from "node:url";
import {admitP6PostcommitNativeAudit,runP6PostcommitNativeAudit} from "./v39_phase6_stored_source_postcommit_native_audit_v39.mjs";
import {readP6PendingLaterT24EvidencePage} from "../server/lib/disruption/phase6LaterT24EvidenceBatchReadOnly_v39.ts";
import {pageP5UnsignedNativePreReviewDossier} from "../server/lib/disruption/phase5SourceBoundUnsignedPreDossier_v39.ts";
import {signP6DelegatedNativeLaterReviewPage} from "../server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs";
import {runP6DelegatedReviewedLaterAppend} from "../server/lib/disruption/phase6ReviewedLaterShardAppendRuntime_v39.ts";
import {readP6StoredPrivateReviewOnce} from "../server/lib/disruption/phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateP6DayEpochFullRegistriesReadOnly} from "../server/lib/disruption/phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {inspectP6DayEpochExistingShardSemanticsNoGo} from "../server/lib/disruption/phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39.ts";
const H=/^[a-f0-9]{64}$/,LOGIN=/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/;
const hold=s=>{throw Error("HOLD_P6_NATIVE_LATER_RUNTIME_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const iso=x=>typeof x==="string"&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const preLogin="phase5_p30_pre_login_20261107";
const ro={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
const ports=["P5_V39_PRE_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL","P6_PRIVATE_LATER_REVIEWER_KEY_BASE64","P6_PRIVATE_DAY_REVIEWER_KEY_BASE64"];
function key(raw,fp){
 try{
  if(typeof raw!=="string"||raw.length>12000||raw.length<100||!H.test(fp??""))hold("REVIEWER_KEY_MISSING");
  const b=Buffer.from(raw,"base64");
  if(b.toString("base64")!==raw)hold("NONCANONICAL_KEY");
  const k=createPrivateKey(b);b.fill(0);
  if(k.asymmetricKeyType!=="ed25519"||hash(createPublicKey(k).export({format:"der",type:"spki"}))!==fp)hold("REVIEWER_KEY_DRIFT");
  return k;
 }catch{hold("REVIEWER_KEY_DRIFT");}
}
function endpoint(raw,login,source,direct){
 let u;try{u=new URL(raw);}catch{hold("MISSING_RESTRICTED_URL");}
 if(!sameP6NeonDatabaseEndpoint(u,source)||decodeURIComponent(u.username)!==login||!u.password||
    u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="require"||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require"))||
    (direct&&u.hostname.split(".")[0].endsWith("-pooler")))hold("RESTRICTED_TLS_ENDPOINT_OR_LOGIN_DRIFT");
 return raw;
}
/** Existing exact source audit checks retained. The extra ROLE/key
 * credentials are limited to this follow-on step, never passed to the
 * original audit's admission or the paid SOURCE child. */
export function admitP6NativeLaterRuntime(env,read){
 if(env.P6_NATIVE_LATER_RUNTIME_ENABLED!=="1"||env.P6_NATIVE_LATER_RUNTIME_APPROVED!=="1"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.ADB_AUTO_COLLECT!=="0"||env.NODE_TLS_REJECT_UNAUTHORIZED==="0")hold("NOT_APPROVED_NONPAID_RUNTIME");
 const auditEnv={...env};for(const k of ports)delete auditEnv[k];
 const c=admitP6PostcommitNativeAudit(auditEnv,read);
 const policyBytes=Buffer.from(env.P6_NONPAID_DAILY_POLICY_BASE64,"base64"),p=JSON.parse(policyBytes.toString("utf8")),v=p.nativeLaterReview;
 const t=c.trust,day=v?.dayAppendPolicy,custody=v?.t24Custody;
 if(v?.approved!==true||v.privatePublicationApproved!==true||
    !LOGIN.test(v.expectedPublisherSessionLogin??"")||
    new Set([v.expectedPublisherSessionLogin,t.expectedReaderSessionLogin,preLogin,"phase5_p5_source_login_20261108"]).size!==4||
    ![v.laterReviewerFingerprintSha256,v.frameSha256,v.configSha256,v.builderSha256,v.runAndRetentionEvidenceSha256,
       custody?.policySha256,custody?.reviewerFingerprintSha256].every(x=>H.test(x??""))||
    v.frameSha256!==p.frameSha256||v.configSha256!==p.configSha256||
    !iso(v.validFromUtc)||!iso(v.validUntilUtc)||v.validFromUtc>=v.validUntilUtc||
    !Number.isSafeInteger(v.maximumPrivateRetentionHours)||v.maximumPrivateRetentionHours<1||v.maximumPrivateRetentionHours>168||
    !c.nativePreFeatureReview||!custody||custody.independentT24CustodyTrustApproved!==true||
    !Number.isSafeInteger(custody.maximumRetentionHours)||custody.maximumRetentionHours<1||custody.maximumRetentionHours>168||
    !iso(custody.policyValidFromUtc)||!iso(custody.policyValidUntilUtc)||custody.policyValidFromUtc>=custody.policyValidUntilUtc||
    v.selectedTConfig?.verifiedProviderNativeSchedule!==true||v.selectedTConfig.milestone!=="departure.scheduledTime.utc"||
    typeof v.selectedTConfig.version!=="string"||!v.selectedTConfig.version.trim()||!H.test(v.selectedTConfig.artifactHash??"")||
    day?.schema!=="v39.phase6.delegated-later-day-append-review-policy.v1"||day.delegatedAutomatedLaterDayAppendApproved!==true||
    day.approvedCodeSha!==t.reviewedCodeSha||!["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>day[k]===t[k])||
    day.laterReviewerFingerprintSha256!==v.laterReviewerFingerprintSha256||
    day.dayReviewerFingerprintSha256!==t.dayReviewerFingerprintSha256||day.queryReviewerFingerprintSha256!==t.queryReviewerFingerprintSha256||
    new Set([day.dayReviewerFingerprintSha256,day.queryReviewerFingerprintSha256,day.laterReviewerFingerprintSha256]).size!==3||
    !Number.isSafeInteger(day.maximumIndexRevision)||day.maximumIndexRevision<2||day.maximumIndexRevision>1024||
    !iso(day.validFromUtc)||!iso(day.validUntilUtc)||day.validFromUtc>=day.validUntilUtc)
  hold("PINNED_DELEGATION_CUSTODY_OR_PUBLICATION_POLICY_DRIFT");
 try{
  const pub=createPublicKey(custody.reviewerPublicKeyPem);
  if(pub.asymmetricKeyType!=="ed25519"||hash(pub.export({format:"der",type:"spki"}))!==custody.reviewerFingerprintSha256)hold("CUSTODY_KEY_DRIFT");
 }catch{hold("CUSTODY_KEY_DRIFT");}
 const source=new URL(c.sourceUrl);
 const publisherUrl=endpoint(env.P6_PRIVATE_PUBLISHER_DATABASE_URL,v.expectedPublisherSessionLogin,source,true);
 const preUrl=endpoint(env.P5_V39_PRE_DATABASE_URL,preLogin,source,false);
 const laterReviewerKey=key(env.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64,v.laterReviewerFingerprintSha256);
 const dayReviewerKey=key(env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64,t.dayReviewerFingerprintSha256);
 const dayPolicyBytes=Buffer.from(JSON.stringify(day));
 return {auditEnv,c,v,custody,policyBytes,publisherUrl,preUrl,
  authority:{trust:t,policyBytes,expectedPolicySha256:env.P6_NONPAID_DAILY_POLICY_SHA256,
   independentDelegatedNativeReviewApproved:true,noProviderCredentialsInReviewer:true,laterReviewerKey},
  appendApproval:{policyBytes:dayPolicyBytes,expectedPolicySha256:hash(dayPolicyBytes),dayReviewerKey,
   independentlyApprovedDelegatedDayAppend:true,noProviderCredentialsInSigner:true}};
}
async function readCurrent(reader,trust,runDayIndex){
 const day=await readP6StoredPrivateReviewOnce({client:reader,trust,scope:ro,selector:{kind:"CURRENT_DAY",runDayIndex}});
 const index=await hydrateP6DayEpochFullRegistriesReadOnly({client:reader,pins:day.pins,wire:day.wire,publicKeyPem:day.publicKeyPem,
  scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
 inspectP6DayEpochExistingShardSemanticsNoGo(index);
 return {day,index};
}
/** Scope one append from the real signed current head. Allocate no new
 * physical query and no private rows until the existing publisher passes.
 * No artificial retention extension to satisfy a later packet. */
export function planP6NativeLaterAppendScope(handoff,current,policy,pageIndex){
 const d=handoff.privateOriginalDossier,z=current.index.redactedSummary,h=current.index.privateParsedIndex,wire=current.day.wire.review,v=policy.v;
 const now=Date.parse(z.observedDbClockUtc);
 if(z.runDayIndex!==d.runDayIndex||h.runDayIndex!==d.runDayIndex||h.manifestSha256!==d.manifestSha256||
    !iso(z.observedDbClockUtc)||!iso(wire.retentionNotAfterUtc)||!iso(wire.validUntilUtc)||
    !Number.isSafeInteger(pageIndex)||pageIndex<1||h.revision>=v.dayAppendPolicy.maximumIndexRevision||
    now<Date.parse(v.validFromUtc)||now>=Date.parse(v.validUntilUtc)||
    now<Date.parse(v.dayAppendPolicy.validFromUtc)||now>=Date.parse(v.dayAppendPolicy.validUntilUtc))
  hold("CURRENT_SIGNED_DAY_OR_POLICY_DRIFT");
 const src=h.entries.filter(e=>e.lane==="SOURCE"&&e.fileSha256===d.sourceDayRegistrySha256&&e.filePath===handoff.privateSourceRegistryPath);
 if(src.length!==1||!H.test(src[0].reviewEvidenceSha256??""))hold("ORIGINAL_SOURCE_NOT_CURRENTLY_INDEXED");
 const retention=Math.min(Date.parse(wire.retentionNotAfterUtc),Date.parse(v.validUntilUtc),Date.parse(v.dayAppendPolicy.validUntilUtc),
  now+v.maximumPrivateRetentionHours*3600000);
 const valid=Math.min(retention,Date.parse(wire.validUntilUtc));
 if(valid<=now||h.entries.some(e=>Date.parse(e.hardLatestUtc)>valid))return null;
 const shardIndex=1+Math.max(0,...h.entries.filter(e=>e.lane==="LATER_PRE").map(e=>e.shardIndex));
 if(shardIndex>1024||h.entries.length>=1024)return null;
 const path="data-collection/phase5/frozen/later_"+hash(JSON.stringify([d.sourceAuditSha256,pageIndex,shardIndex]))+".json";
 return {scope:{expectedDossierSha256:handoff.privateOriginalDossierSha256,observedDbClockUtc:z.observedDbClockUtc,
  reviewValidUntilUtc:new Date(valid).toISOString(),retentionNotAfterUtc:new Date(retention).toISOString(),
  expectedReviewedReleaseSha256:d.entries[0].source.expectedReviewedReleaseSha256,
  expectedReviewedSourceRightsSha256:d.entries[0].source.expectedReviewedSourceRightsSha256,
  proposedLaterRegistryFilePath:path,shardIndex},
  expectedSourceReviewEvidenceSha256:src[0].reviewEvidenceSha256};
}
export async function runP6NativeLaterRuntime(env){
 const x=admitP6NativeLaterRuntime(env),t=x.c.trust,v=x.v;
 const publisher=new pg.Client({connectionString:x.publisherUrl,connectionTimeoutMillis:8000,query_timeout:35000,
  application_name:"p6_native_later_registry_publication"});
 const reader=new pg.Client({connectionString:x.c.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000,
  application_name:"p6_native_later_evidence_reader"});
 const pre=new pg.Pool({connectionString:x.preUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,
  application_name:"p6_native_later_pre_evidence"});
 try{
  await publisher.connect();await publisher.query("SET ROLE phase6_private_frozen_publisher_v39");
  // Session-scoped lock on the direct connection, not a transaction-pooler
  // connection. Serialize concurrent SOURCE follow-ons per study/day,
  // keeping the original publisher's own atomic DB/revision checks.
  const lockId=hash("P6_NATIVE_LATER:"+t.manifestSha256+":"+x.c.selector.runDayIndex).slice(0,16);
  await publisher.query("SET lock_timeout='20s'");
  await publisher.query("SELECT pg_advisory_lock(('x'||$1)::bit(64)::bigint)",[lockId]);
  await publisher.query("RESET lock_timeout");
  const actual=await runP6PostcommitNativeAudit(x.auditEnv);
  const handoff=actual.privateUnsignedPreReview,features=actual.privateNativeFeatureReview;
  if(!handoff||handoff.runDayIndex!==x.c.selector.runDayIndex)hold("SOURCE_HANDOFF_MISSING");
  const report={status:"ACTUAL_SOURCE_TO_LATER_REVIEW_RUNTIME_NO_PAID_GO",runDayIndex:handoff.runDayIndex,horizon:handoff.horizon,
   candidateCount:handoff.reviewEntryCount,reviewedCount:0,committedShardCount:0,insertedPrivateRows:0,
   missingNativeOriginal:0,unresolvedT24:0,lateOrRetention:0,heldPages:0,providerCalls:0,phase6PaidGo:false};
  if(!handoff.reviewEntryCount||!features?.matchedCount||(handoff.horizon==="T-24h"&&v.nativeT24ReviewApproved!==true))
   return {...report,sourceAuditOnly:true};
  await reader.connect();await reader.query("SET ROLE phase6_private_frozen_reader_v39");
  if(handoff.horizon==="T-24h"){
   if(v.independentT24WitnessProtocolReviewed!==true||v.reviewedWitnessOnlyRole!=="phase5_fids_t24_witness_prod_20261107")hold("T24_WITNESS_PROTOCOL_NOT_APPROVED");
   const trust=readP6T24RegistryRoutingTrust(env);
   const maxPages=Math.ceil(handoff.reviewEntryCount/96);
   for(let i=0;i<maxPages;i++){
    const current=await readP6T24CurrentRegistrySet({client:reader,trust,runDayIndex:handoff.runDayIndex});
    const proposal=buildP6DelegatedT24PrivateRegistry({handoff,features,authority:x.authority,current,trust});
    if(!proposal.packetCount){
     report.heldPages+=Number(proposal.censored>0);break;
    }
    const committed=await publishP6T24PrivateRegistryOnce({readerClient:reader,publisherClient:publisher,trust,proposal,
     expectedPublisherSessionLogin:v.expectedPublisherSessionLogin});
    report.reviewedCount+=committed.packetCount;
    report.committedShardCount++;
    report.insertedPrivateRows+=committed.insertedPrivateRows;
    if(!proposal.deferredCount)break;
   }
   return {...report,status:"ACTUAL_SOURCE_TO_NATIVE_T24_REGISTRY_NO_PAID_GO"};
  }
  const pool=makeP5Stage28DedicatedRolePool(pre,{group:"pre",reviewedDedicatedLogin:preLogin,forbiddenApplicationLogin:"phase5_runtime_application_login"});
  const selected=new Set(handoff.privateReviewEntries.map(e=>e.source.flightInstanceId));
  const pages=pageP5UnsignedNativePreReviewDossier(handoff.privateOriginalDossier).filter(p=>p.entries.some(e=>selected.has(e.source.flightInstanceId)));
  const expectedSelectedTVersion=v.selectedTConfig.milestone+":"+v.selectedTConfig.version+":"+v.selectedTConfig.artifactHash;
  for(const page of pages){
   const d=handoff.privateOriginalDossier;
   const evidence=await readP6PendingLaterT24EvidencePage(pool,handoff,{
    independentDossierReviewPinned:true,independentT24EvidenceReadApproved:true,existingPaidDispatchApproved:false,
    expectedDossierSha256:handoff.privateOriginalDossierSha256,expectedManifestSha256:t.manifestSha256,
    expectedRightsSha256:t.rightsSha256,expectedReleaseSha256:t.releaseSha256,expectedFrameSha256:v.frameSha256,
    expectedConfigSha256:v.configSha256,expectedSelectedTVersion,pageIndex:page.pageIndex,reviewedReceipts:[]},
    {readerClient:reader,trust:{...x.custody,runDayIndex:d.runDayIndex,reviewedCodeSha:t.reviewedCodeSha,
     manifestSha256:t.manifestSha256,rightsSha256:t.rightsSha256,releaseSha256:t.releaseSha256,
     expectedFrameSha256:v.frameSha256,expectedConfigSha256:v.configSha256,expectedSelectedTVersion},
     scope:{privateT24CustodyApproved:true,existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",expectedSessionLogin:t.expectedReaderSessionLogin}});
   if(!evidence.candidateCount)continue;
   const current=await readCurrent(reader,t,d.runDayIndex);
   const planned=planP6NativeLaterAppendScope(handoff,current,x,page.pageIndex);
   if(!planned){report.heldPages++;continue;}
   const signed=signP6DelegatedNativeLaterReviewPage({handoff,featureReview:features,evidence,authority:x.authority,scope:planned.scope});
   report.reviewedCount+=signed.reviewedCount;
   report.missingNativeOriginal+=signed.missingNativeOriginal;
   report.unresolvedT24+=signed.unresolvedT24;
   report.lateOrRetention+=signed.lateOrRetention;
   if(!signed.signatureIssued)continue;
   const committed=await runP6DelegatedReviewedLaterAppend({
    readerClient:reader,publisherClient:publisher,trust:t,plan:signed.privatePlan,wire:signed.privateWire,
    reviewerPublicKeyPem:signed.privateReviewerPublicKeyPem,reviewerPins:signed.privateReviewerPins,
    publisherScope:{privateStoragePublicationApproved:true,adbAutoCollect:"0",phase6ProcessArmed:"0",
     expectedPublisherSessionLogin:v.expectedPublisherSessionLogin,expectedSourceReviewEvidenceSha256:planned.expectedSourceReviewEvidenceSha256,
     approvedRetentionNotAfterUtc:planned.scope.retentionNotAfterUtc},
    scope:{independentReviewedLaterAppendApproved:true,existingPaidDispatchApproved:false,
     expectedLaterReviewerFingerprintSha256:v.laterReviewerFingerprintSha256,mode:"PUBLISH_ONCE"}},x.appendApproval);
   report.insertedPrivateRows+=committed.insertedPrivateRows??0;
   if(committed.automatedDelegatedDaySignatureIssued===true)report.committedShardCount++;
  }
  return report;
 }finally{
  // Disconnect releases the session lock (including uncertain COMMIT). No
  // retry of an uncertain private write, no provider replay.
  await Promise.allSettled([publisher.end(),reader.end(),pre.end()]);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(await runP6NativeLaterRuntime(process.env)));}
 catch(e){const s=String(e?.message??"");console.error(/^HOLD_(?:P6|P5)_[A-Z0-9_]+$/.test(s)?s:"HOLD_P6_NATIVE_LATER_RUNTIME_REDACTED_NO_REPLAY");process.exitCode=2;}
}
