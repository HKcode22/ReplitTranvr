// Real disposable PostgreSQL16, generated review key only; no provider.
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import pg from "pg";
import {p6DailyPrepareReviewPreimage,P6_DAILY_PREPARE_REVIEW_SCHEMA,
 publishP6DailyPrepareReviewOnce,readP6DailyPrepareReviewOnce}
 from "../server/lib/disruption/phase6PrivateDailyPrepareReviewTransport_v39.mjs";
if(process.env.CI!=="true"||process.env.P6_DAY_EPOCH_REAL_DISPOSABLE_ONLY!=="1"||
 process.env.DATABASE_URL||process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||
 process.env.P6_REAL_DISPOSABLE_OWNER_URL!=="postgresql://neondb_owner:ci-only-day-real@127.0.0.1:5432/neondb?sslmode=disable")
 throw Error("HOLD_NOT_EXPLICITLY_LOCAL_DISPOSABLE_NO_PROVIDER");
const hash=b=>createHash("sha256").update(b).digest("hex"),sha=x=>x.repeat(64);
const key=generateKeyPairSync("ed25519"),fp=hash(key.publicKey.export({format:"der",type:"spki"}));
const now=Date.now(),iso=n=>new Date(now+n).toISOString(),H=3600000,day=2;
const trust={independentDailyReviewerTrustApproved:true,runDayIndex:day,reviewedCodeSha:"f".repeat(40),
 manifestSha256:sha("a"),calendarSha256:sha("b"),configSha256:sha("c"),frameSha256:sha("d"),
 releaseSha256:sha("e"),rightsSha256:sha("f"),providerContractSha256:sha("1"),
 policySha256:sha("2"),dayPlanSha256:sha("3"),reviewed31DaySourceRequestGridSha256:sha("4"),
 reviewedCategoryBudgetSha256:sha("5"),reviewerFingerprintSha256:fp,
 reviewerPublicKeyPem:key.publicKey.export({format:"pem",type:"spki"}).toString(),
 maximumRetentionHours:24,policyValidFromUtc:iso(-H),policyValidUntilUtc:iso(25*H)};
const packet={schema:"v39.phase5.github-signed-one-day-source-preparation.v1",approvedCodeSha:trust.reviewedCodeSha,
 manifestSha256:trust.manifestSha256,runDayIndex:day,independentlyReviewedExactDaySourcePacket:true,
 reviewedPrepareInput:{readScope:{runDayIndex:day,expectedManifestSha256:trust.manifestSha256,
 expectedCalendarSha256:trust.calendarSha256,expectedConfigSha256:trust.configSha256,expectedFrameSha256:trust.frameSha256,
 expectedProviderContractSha256:trust.providerContractSha256,
 templates:Array.from({length:12},(_,i)=>({runDayIndex:day,scheduledRequestUtc:iso(H+i*60000),earliestPlannedCutoffUtc:iso(2*H+i*60000)}))},
 sourceReview:{manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,configSha256:trust.configSha256,
 frameSha256:trust.frameSha256,providerContractSha256:trust.providerContractSha256,reviewedReleaseSha256:trust.releaseSha256,rightsReviewSha256:trust.rightsSha256},
 stage9Review:{expectedManifestSha256:trust.manifestSha256,expectedCalendarSha256:trust.calendarSha256,
 expectedConfigSha256:trust.configSha256,expectedFrameSha256:trust.frameSha256,expectedProviderContractSha256:trust.providerContractSha256,
 expectedReleaseSha256:trust.releaseSha256,expectedRightsReviewSha256:trust.rightsSha256,
 reviewed31DaySourceRequestGridSha256:trust.reviewed31DaySourceRequestGridSha256,reviewedCategoryBudgetSha256:trust.reviewedCategoryBudgetSha256,
 independentFreezeApproved:true,independentRightsReviewApproved:true,githubOnlyProspectiveOwnerApproved:true}}};
const bytes=Buffer.from(JSON.stringify(packet));
const rev={schema:P6_DAILY_PREPARE_REVIEW_SCHEMA,audience:"HKcode22/ReplitTranvr:PHASE6_DAILY_PREPARE_REVIEW_ONLY",
 logicalPath:"data-collection/phase5/frozen/prepare_d"+day+"_"+trust.manifestSha256+".json",runDayIndex:day,
 packetSha256:hash(bytes),reviewedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,
 policySha256:trust.policySha256,dayPlanSha256:trust.dayPlanSha256,reviewedAtUtc:iso(-10000),
 validUntilUtc:iso(4*H),retentionNotAfterUtc:iso(4*H),reviewerPublicKeyFingerprintSha256:fp};
const wire={review:rev,signatureBase64:sign(null,p6DailyPrepareReviewPreimage(rev),key.privateKey).toString("base64")};
const pub=new pg.Client({connectionString:"postgresql://phase6_private_publisher_login_ci_epoch:ci-only-day-pub@127.0.0.1:5432/neondb?sslmode=disable"});
const read=new pg.Client({connectionString:"postgresql://phase6_private_reader_login_ci_epoch:ci-only-day-read@127.0.0.1:5432/neondb?sslmode=disable"});
const owner=new pg.Client({connectionString:process.env.P6_REAL_DISPOSABLE_OWNER_URL});
await pub.connect();await read.connect();await owner.connect();
try{
 await pub.query("SET ROLE phase6_private_frozen_publisher_v39");await read.query("SET ROLE phase6_private_frozen_reader_v39");
 const common={privateDailyReviewTransportApproved:true,existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0"};
 const put={client:pub,trust,wire,packetBytes:bytes,scope:{...common,expectedSessionLogin:"phase6_private_publisher_login_ci_epoch"}};
 const get={client:read,trust,scope:{...common,expectedSessionLogin:"phase6_private_reader_login_ci_epoch"}};
 await assert.rejects(readP6DailyPrepareReviewOnce(get),/EXACT_DAILY_REVIEW_ABSENT/);
 await assert.rejects(publishP6DailyPrepareReviewOnce({...put,client:read}),/PUBLISHER_FAILURE_REDACTED/);
 await assert.rejects(publishP6DailyPrepareReviewOnce({...put,packetBytes:Buffer.from(JSON.stringify({...packet,runDayIndex:3}))}),/UNPINNED_EXACT_DAILY_REVIEW/);
 let lost=false;
 const wrapped={query:async(sql,args)=>{const result=await pub.query(sql,args);if(sql==="COMMIT"&&!lost){lost=true;throw Error("ACK_LOST");}return result;}};
 await assert.rejects(publishP6DailyPrepareReviewOnce({...put,client:wrapped}),/UNKNOWN_COMMIT_READBACK_ONLY_NEVER_REPLAY/);
 assert.equal(lost,true);
 const actual=await readP6DailyPrepareReviewOnce(get);
 assert.equal(actual.exactDailyPacketSha256,hash(bytes));assert.deepEqual(actual.privatePacketBytes,bytes);
 assert.deepEqual(actual.privateWire,wire);assert.equal(JSON.stringify(actual).includes(wire.signatureBase64),false);
 assert.equal(actual.phase6PaidGo,false);
 await assert.rejects(publishP6DailyPrepareReviewOnce(put),/ALREADY_COMMITTED_NEVER_REPLACE/);
 await assert.rejects(readP6DailyPrepareReviewOnce({...get,trust:{...trust,policySha256:sha("0")}}),/UNPINNED_EXACT_DAILY_REVIEW/);
 await assert.rejects(pub.query("UPDATE phase6_private.frozen_native_packet_v39 SET payload_bytes=payload_bytes WHERE logical_path=$1",[rev.logicalPath]),/permission denied/);
 await assert.rejects(read.query("DELETE FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=$1",[rev.logicalPath]),/permission denied/);
 const n=await owner.query("DELETE FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=$1",[rev.logicalPath]);assert.equal(n.rowCount,1);
 await assert.rejects(readP6DailyPrepareReviewOnce(get),/EXACT_DAILY_REVIEW_ABSENT/);
 console.log("P6_DURABLE_DAILY_PREPARE_REVIEW_REAL_PG16_LOST_ACK_NO_PROVIDER_PASS");
}finally{await pub.end();await read.end();await owner.end();}
