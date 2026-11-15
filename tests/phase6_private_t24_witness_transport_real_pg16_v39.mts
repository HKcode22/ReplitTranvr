import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import pg from "pg";
import {digestP5Stage24ReviewedReceipt} from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39.ts";
import {P6_T24_CUSTODY_SCHEMA,p6T24WitnessCustodyPath,p6T24WitnessCustodyPreimage,publishP6T24WitnessCustodyOnce,readP6T24WitnessCustodyOnce,verifyP6T24WitnessCustody} from "../server/lib/disruption/phase6PrivateT24WitnessReceiptTransport_v39.mjs";
assert.equal(process.env.CI,"true");
assert.equal(process.env.P6_DAY_EPOCH_REAL_DISPOSABLE_ONLY,"1");
assert.equal(process.env.P6_REAL_DISPOSABLE_OWNER_URL,"postgresql://neondb_owner:ci-only-day-real@127.0.0.1:5432/neondb?sslmode=disable");
for(const k of ["DATABASE_URL","V39_P5_SOURCE_DATABASE_URL","AERODATABOX_API_KEY","RAPIDAPI_KEY"])assert.equal(process.env[k]??"","");
assert.equal(process.env.ADB_AUTO_COLLECT,"0");assert.equal(process.env.V39_PHASE6_PROCESS_ARMED,"0");
const owners=new pg.Client({connectionString:process.env.P6_REAL_DISPOSABLE_OWNER_URL});
const pub=new pg.Client({connectionString:"postgresql://phase6_private_publisher_login_ci_epoch:ci-only-day-pub@127.0.0.1:5432/neondb?sslmode=disable"});
const reader=new pg.Client({connectionString:"postgresql://phase6_private_reader_login_ci_epoch:ci-only-day-read@127.0.0.1:5432/neondb?sslmode=disable"});
const h=(x:string|Buffer)=>createHash("sha256").update(x).digest("hex");
const key=generateKeyPairSync("ed25519"),iso=(v:number)=>new Date(v).toISOString();
try{
 await owners.connect();await pub.connect();await reader.connect();
 await pub.query("SET ROLE phase6_private_frozen_publisher_v39");await reader.query("SET ROLE phase6_private_frozen_reader_v39");
 const now=new Date((await owners.query("SELECT clock_timestamp() AS now")).rows[0].now).getTime();
 const cutoff=now-60000;
 const trust={independentT24CustodyTrustApproved:true,runDayIndex:19,flightInstanceId:"synthetic-custody-ci-only",reviewedCodeSha:"a".repeat(40),
  manifestSha256:h("manifest"),rightsSha256:h("rights"),releaseSha256:h("release"),policySha256:h("policy"),expectedFrameSha256:h("frame"),expectedConfigSha256:h("config"),
  expectedSelectedTVersion:"gate-out:test:synthetic",reviewerPublicKeyPem:key.publicKey.export({format:"pem",type:"spki"}).toString(),
  reviewerFingerprintSha256:h(key.publicKey.export({format:"der",type:"spki"})),maximumRetentionHours:48,
  policyValidFromUtc:iso(now-3600000),policyValidUntilUtc:iso(now+48*3600000)};
 const fields={schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1" as const,snapshotId:"123",
  flightInstanceId:trust.flightInstanceId,selectedTNativeUtc:iso(cutoff+86400000),frozenT24CutoffUtc:iso(cutoff),
  expectedSelectedTVersion:trust.expectedSelectedTVersion,t24OriginalFidsSha256:h("source"),t24SourceQueryDigestSha256:h("query"),
  t24FrameSha256:trust.expectedFrameSha256,t24ConfigSha256:trust.expectedConfigSha256,witnessDbObservedAtUtc:iso(cutoff-20000),
  stage17PostCommitReadbackAtUtc:iso(cutoff-10000)};
 const receipt={...fields,receiptSha256:digestP5Stage24ReviewedReceipt(fields)};
 const packet={schema:"v39.phase6.private-t24-witness-candidate.v1",runDayIndex:19,manifestSha256:trust.manifestSha256,
  candidate:{schema:"v39.phase5.unsigned-t24-stage24-handoff.v1",status:"DURABLE_T24_RECEIPT_CANDIDATE_AWAITING_INDEPENDENT_REVIEW",
   receipt,reviewedByIndependentAuthority:false,mayLaunchLaterPreAutomatically:false,providerCalls:0}};
 const packetBytes=Buffer.from(JSON.stringify(packet));
 const review={schema:P6_T24_CUSTODY_SCHEMA,audience:"HKcode22/ReplitTranvr:PHASE6_T24_WITNESS_CUSTODY_ONLY",logicalPath:p6T24WitnessCustodyPath(trust),
  runDayIndex:19,packetSha256:h(packetBytes),receiptSha256:receipt.receiptSha256,reviewedCodeSha:trust.reviewedCodeSha,
  manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,releaseSha256:trust.releaseSha256,policySha256:trust.policySha256,
  reviewedAtUtc:iso(now),validUntilUtc:iso(now+24*3600000),retentionNotAfterUtc:iso(now+48*3600000),reviewerPublicKeyFingerprintSha256:trust.reviewerFingerprintSha256};
 const wire={review,signatureBase64:sign(null,p6T24WitnessCustodyPreimage(review),key.privateKey).toString("base64")};
 const scope={privateT24CustodyApproved:true,existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0"};
 const ps={...scope,expectedSessionLogin:"phase6_private_publisher_login_ci_epoch"},rs={...scope,expectedSessionLogin:"phase6_private_reader_login_ci_epoch"};
 await assert.rejects(readP6T24WitnessCustodyOnce({client:reader,trust,scope:rs}),/ABSENT_NOT_NEGATIVE/);
 assert.throws(()=>verifyP6T24WitnessCustody({trust,wire:{...wire,signatureBase64:Buffer.alloc(64).toString("base64")},packetBytes,observedDbClockUtc:iso(now)}),/BAD_SIGNATURE/);
 assert.throws(()=>verifyP6T24WitnessCustody({trust,wire,packetBytes:Buffer.concat([packetBytes,Buffer.from(" ")]),observedDbClockUtc:iso(now)}),/WIRE/);
 assert.throws(()=>verifyP6T24WitnessCustody({trust,wire,packetBytes,observedDbClockUtc:iso(now+24*3600000)}),/EXPIRED/);
 const result=await publishP6T24WitnessCustodyOnce({client:pub,trust,wire,packetBytes,scope:ps});
 assert.equal(result.scientificReviewCompleted,false);assert.equal(result.phase6PaidGo,false);
 await assert.rejects(publishP6T24WitnessCustodyOnce({client:pub,trust,wire,packetBytes,scope:ps}),/ALREADY_COMMITTED/);
 const got=await readP6T24WitnessCustodyOnce({client:reader,trust,scope:rs});
 assert.deepEqual(got.privateReceipt,receipt);assert.equal(got.scientificReviewCompleted,false);
 assert(!JSON.stringify(got).includes(trust.flightInstanceId));assert(!JSON.stringify(got).includes("snapshotId"));
 await assert.rejects(pub.query("DELETE FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=$1",[review.logicalPath]),/permission denied/);
 await assert.rejects(reader.query("UPDATE phase6_private.frozen_native_packet_v39 SET kind=kind WHERE logical_path=$1",[review.logicalPath]),/permission denied/);
 // Owner may delete the synthetic test fixture; document lifecycle, no actual rights claim.
 await owners.query("DELETE FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=$1",[review.logicalPath]);
 console.log("PASS_REAL_PG16_PRIVATE_T24_CUSTODY_SIGNATURE_RESTRICTED_READBACK_NO_REPLAY_SYNTHETIC_ONLY");
}finally{await Promise.allSettled([reader.end(),pub.end(),owners.end()]);}
