import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync} from "node:crypto";
import {admitP6CommittedT24Custody,buildP6ActualT24CustodyWire} from "../scripts/v39_phase6_committed_t24_witness_custody_v39.mjs";
import {digestP5Stage24ReviewedReceipt} from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39.ts";
import {verifyP6T24WitnessCustody} from "../server/lib/disruption/phase6PrivateT24WitnessReceiptTransport_v39.mjs";
const h=s=>String(s).repeat(64),sha=b=>createHash("sha256").update(b).digest("hex");
function fixture(){
 const day=generateKeyPairSync("ed25519"),query=generateKeyPairSync("ed25519"),custody=generateKeyPairSync("ed25519");
 const fp=k=>sha(k.publicKey.export({format:"der",type:"spki"})),pem=k=>k.publicKey.export({format:"pem",type:"spki"}).toString();
 const code="b".repeat(40),reader="phase6_private_reader_login_ci_native",publisher="phase6_private_publisher_login_ci_native";
 const trust={independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:reader,reviewedCodeSha:code,
  manifestSha256:h("a"),rightsSha256:h("c"),releaseSha256:h("d"),calendarSha256:h("e"),
  dayReviewerFingerprintSha256:fp(day),dayReviewerPublicKeyPem:pem(day),queryReviewerFingerprintSha256:fp(query),queryReviewerPublicKeyPem:pem(query)};
 const cfg={verifiedProviderNativeSchedule:true,milestone:"departure.scheduledTime.utc",version:"v1",artifactHash:h("1"),semanticsEvidenceSha256:h("2")};
 const pre={horizon:"T-24h",identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG",externalNativeTPhysicalLegAndSourceUseReviewed:true,
  manifestSha256:trust.manifestSha256,expectedReviewedReleaseSha256:trust.releaseSha256,expectedReviewedSourceRightsSha256:trust.rightsSha256,
  expectedProviderContractSha256:h("3"),reviewedFrameSha256:h("4"),reviewedConfigSha256:h("5"),runDayIndex:1,flightInstanceId:"leg:ci:t24:unaltered",
  expectedSourcePopulationQueryId:"c23e4567-e89b-42d3-a456-426614174013",expectedSourceResponseSha256:h("6"),queryDigestSha256:h("7"),
  expectedRestrictedPreWriterRole:"phase5_fids_pre_writer_prod_20261107",selectedTNativeUtc:"2026-11-23T12:00:00.000Z",selectedTConfig:cfg};
 const witness={flightInstanceId:pre.flightInstanceId,sourcePopulationQueryId:pre.expectedSourcePopulationQueryId,expectedSourceResponseSha256:pre.expectedSourceResponseSha256,
  expectedSourceQueryDigestSha256:pre.queryDigestSha256,expectedFrameSha256:pre.reviewedFrameSha256,expectedConfigSha256:pre.reviewedConfigSha256,selectedTNativeUtc:pre.selectedTNativeUtc,
  expectedT24CutoffUtc:"2026-11-22T12:00:00.000Z",expectedSelectedTVersion:cfg.milestone+":"+cfg.version+":"+cfg.artifactHash,expectedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107"};
 const policy={schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,approvedCodeSha:code,
  manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,releaseSha256:trust.releaseSha256,calendarSha256:trust.calendarSha256,
  frameSha256:pre.reviewedFrameSha256,configSha256:pre.reviewedConfigSha256,providerContractSha256:pre.expectedProviderContractSha256,
  nativeLaterReview:{frameSha256:pre.reviewedFrameSha256,configSha256:pre.reviewedConfigSha256,selectedTConfig:cfg,expectedPublisherSessionLogin:publisher,
   t24Custody:{independentT24CustodyTrustApproved:true,policySha256:h("8"),reviewerFingerprintSha256:fp(custody),reviewerPublicKeyPem:pem(custody),
    maximumRetentionHours:48,policyValidFromUtc:"2026-11-20T00:00:00.000Z",policyValidUntilUtc:"2026-11-24T12:01:00.000Z"}}};
 const b=Buffer.from(JSON.stringify(policy));
 const env={P6_T24_CUSTODY_ENABLED:"1",P6_T24_CUSTODY_APPROVED:"1",GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  ADB_AUTO_COLLECT:"0",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",P5_CD_GH_T24_WITNESS_APPROVED:"1",P5_CD_GH_PRE_APPROVED_CODE_SHA:code,
  P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:Buffer.from(JSON.stringify(trust)).toString("base64"),
  V39_P5_MANIFEST_SHA256:trust.manifestSha256,V39_P5_RIGHTS_SHA256:trust.rightsSha256,V39_P5_RELEASE_SHA256:trust.releaseSha256,
  P6_NONPAID_DAILY_POLICY_BASE64:b.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:sha(b),
  P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64:Buffer.from(custody.privateKey.export({format:"pem",type:"pkcs8"})).toString("base64"),
  P5_V39_PRE_DATABASE_URL:"postgresql://phase5_p30_pre_login_20261107:a@ep-a-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
  P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+reader+":a@ep-a.us-east-2.aws.neon.tech/neondb?sslmode=require",
  P6_PRIVATE_PUBLISHER_DATABASE_URL:"postgresql://"+publisher+":a@ep-a.us-east-2.aws.neon.tech/neondb?sslmode=require"};
 const w={schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1",snapshotId:"123",flightInstanceId:pre.flightInstanceId,selectedTNativeUtc:pre.selectedTNativeUtc,
  frozenT24CutoffUtc:witness.expectedT24CutoffUtc,expectedSelectedTVersion:witness.expectedSelectedTVersion,t24OriginalFidsSha256:pre.expectedSourceResponseSha256,
  t24SourceQueryDigestSha256:pre.queryDigestSha256,t24FrameSha256:pre.reviewedFrameSha256,t24ConfigSha256:pre.reviewedConfigSha256,
  witnessDbObservedAtUtc:"2026-11-22T11:59:00.000Z",stage17PostCommitReadbackAtUtc:"2026-11-22T11:59:30.000Z"};
 const result={schema:"v39.phase5.queued-t24-pre-independent-v0081-witness.v1",status:"T24_PRE_V0081_WITNESS_AND_QUEUE_VERIFIED_NOT_SCIENTIFIC_FREEZE",
  taskId:"1",committedSnapshotId:w.snapshotId,registeredTaskWasSourceBound:true,stage17WitnessCommittedAndReadBack:true,
  unsignedStage24ReceiptCandidate:{schema:"v39.phase5.unsigned-t24-stage24-handoff.v1",status:"DURABLE_T24_RECEIPT_CANDIDATE_AWAITING_INDEPENDENT_REVIEW",
   receipt:{...w,receiptSha256:digestP5Stage24ReviewedReceipt(w)},reviewedByIndependentAuthority:false,mayLaunchLaterPreAutomatically:false,providerCalls:0},
  providerCalls:0,paidProviderCalls:0,queuedTasksInserted:0,phase5ScientificFreezePassed:false,phase6PaidGo:false};
 return {env,pre,witness,result,policy,now:"2026-11-22T12:01:00.000Z"};
}
test("disabled witness custody does not require new credentials; approved exact study and restricted roles do",()=>{
 const f=fixture();
 assert.equal(admitP6CommittedT24Custody({},null,null),null);
 assert.ok(admitP6CommittedT24Custody(f.env,f.pre,f.witness));
 for(const d of [{P6_T24_CUSTODY_APPROVED:"0"},{RAPIDAPI_KEY:"no"},{P6_NONPAID_DAILY_POLICY_SHA256:h("0")},
  {P6_PRIVATE_PUBLISHER_DATABASE_URL:f.env.P6_PRIVATE_PUBLISHER_DATABASE_URL.replace("ep-a.","ep-other.")},
  {P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64:f.env.P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64}])
  assert.throws(()=>admitP6CommittedT24Custody({...f.env,...d},f.pre,f.witness));
});
test("same actual queued T24 result signs custody using original receipt and actual later reader clock",()=>{
 const f=fixture(),ctx=admitP6CommittedT24Custody(f.env,f.pre,f.witness),b=buildP6ActualT24CustodyWire(ctx,f.result,f.now);
 const v=verifyP6T24WitnessCustody({trust:ctx.trust,wire:b.wire,packetBytes:b.packetBytes,observedDbClockUtc:f.now});
 assert.deepEqual(v.receipt,f.result.unsignedStage24ReceiptCandidate.receipt);
 assert.equal(v.review.reviewedAtUtc,f.now);
 assert.equal(v.review.retentionNotAfterUtc,"2026-11-24T12:01:00.000Z");
 assert.equal(JSON.parse(b.packetBytes.toString()).candidate.reviewedByIndependentAuthority,false);
 for(const d of [{status:"HOLD_T24_UNKNOWN_NO_AUTORETRY"},{stage17WitnessCommittedAndReadBack:false},{committedSnapshotId:"456"}])
  assert.throws(()=>buildP6ActualT24CustodyWire(ctx,{...f.result,...d},f.now),/NOT_ACTUAL_QUEUED_T24_RECEIPT/);
 assert.throws(()=>buildP6ActualT24CustodyWire(ctx,f.result,"2026-11-22T11:59:10.000Z"),/NOT_ORIGINAL_PRECUTOFF_READBACK/);
});
