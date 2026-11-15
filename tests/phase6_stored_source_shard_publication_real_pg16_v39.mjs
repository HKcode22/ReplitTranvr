import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import pg from "pg";
import {publishP6StoredSourceShardOnce} from "../server/lib/disruption/phase6StoredSourceShardPublication_v39.mjs";
import {P6_SOURCE_POST_REVIEW_SCHEMA,P6_SOURCE_POST_REVIEW_AUDIENCE,signedP6PrivateSourcePostReviewBytes}
 from "../server/lib/disruption/phase6PrivateSourcePostReadOnce_v39.mjs";
import {P6_PRIVATE_SOURCE_REGISTRY_REVIEW_SCHEMA,sourceDayRegistryReviewPreimage}
 from "../server/lib/disruption/phase6PrivateSourceRegistryLastPublisher_v39.mjs";
const P="postgresql://phase6_private_publisher_login_ci_checks:ci-only-publisher-not-production@127.0.0.1:5432/neondb?sslmode=disable";
const R="postgresql://phase6_private_reader_login_ci_checks:ci-only-reader-not-production@127.0.0.1:5432/neondb?sslmode=disable";
if(process.env.CI!=="true"||process.env.P6_STORED_SOURCE_SHARD_DISPOSABLE_ONLY!=="1"||
   process.env.DATABASE_URL!==P||process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||
   process.env.V39_P5_SOURCE_DATABASE_URL||process.env.ADB_AUTO_COLLECT!=="0"||
   process.env.V39_PHASE6_PROCESS_ARMED!=="0")throw Error("DISPOSABLE_ONLY");
const h=x=>createHash("sha256").update(x).digest("hex");
const H=c=>c.repeat(64),code="7".repeat(40);
const qk=generateKeyPairSync("ed25519"),rk=generateKeyPairSync("ed25519");
const pem=k=>k.publicKey.export({type:"spki",format:"pem"}).toString();
const fp=k=>h(k.publicKey.export({type:"spki",format:"der"}));
const trust={independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:"phase6_private_reader_login_ci_checks",
 reviewedCodeSha:code,manifestSha256:H("b"),calendarSha256:H("c"),releaseSha256:H("d"),rightsSha256:H("a"),
 dayReviewerFingerprintSha256:fp(rk),queryReviewerFingerprintSha256:fp(qk),queryReviewerPublicKeyPem:pem(qk),
 registryReviewerFingerprintSha256:fp(rk),registryReviewerPublicKeyPem:pem(rk)};
function fixture(day){
 const now=Date.now(),iso=(add)=>new Date(now+add).toISOString(),
  reviewedAtUtc=iso(-60000),validUntilUtc=iso(4*3600000),retentionNotAfterUtc=iso(86400000);
 const pairs=["a","b"].map((x,i)=>{
  const filePath="data-collection/phase5/frozen/sourceq_synthetic_day"+day+"_"+x+".json";
  const queryDigestSha256=h("SYNTHETIC-TEST-"+day+x);
  // Synthetic TRANSPORT test, not actual Stage7/8/9 evidence or a
  // production paid-admissible complete flight plan.
  const bytes=Buffer.from(JSON.stringify({
   schema:"v39.phase5.github-source-one-query-template.v2",manifestSha256:trust.manifestSha256,
   queryDigestSha256,plan:{day:{runDayIndex:day},reviewedReleaseSha256:trust.releaseSha256,
    reviewedProviderRightsSha256:trust.rightsSha256,openapiSha256:H("e"),
    expectedEarlyDrawSha256:H("f"),independentlyApprovedSourceAndRetention:true,githubOnlyOwnerApproved:true,
    acquisition:{runDayIndex:day,providerQueryDirection:"Departure",maxAttempts:1,apiUnitsPerAttempt:2,
     slot:"HUB",horizon:"T-24h",icao:"WSSS",scheduledRequestUtc:iso(2*3600000+i*60000),
     earliestPlannedCutoffUtc:iso(2*3600000+(i+10)*60000)}}}));
  const review={schema:P6_SOURCE_POST_REVIEW_SCHEMA,audience:P6_SOURCE_POST_REVIEW_AUDIENCE,
   kind:"SOURCE_QUERY_PACKET",logicalPath:filePath,contentSha256:h(bytes),reviewedCodeSha:code,
   manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,runDayIndex:day,shardIndex:1,
   externalReviewEvidenceSha256:h("SYNTHETIC_QUERY_REVIEW"+day+x),reviewedAtUtc,retentionNotAfterUtc,
   validUntilUtc,reviewerPublicKeyFingerprintSha256:fp(qk)};
  return {entry:{filePath,expectedPacketSha256:h(bytes),expectedQueryDigestSha256:queryDigestSha256},
   packet:{bytes,wire:{review,signatureBase64:sign(null,signedP6PrivateSourcePostReviewBytes(review),qk.privateKey).toString("base64")}}};
 });
 const entries=pairs.map(x=>x.entry);
 const registryBytes=Buffer.from(JSON.stringify({schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:trust.manifestSha256,runDayIndex:day,entries}));
 const registryPath="data-collection/phase5/frozen/source_synthetic_day"+day+".json";
 const review={schema:P6_PRIVATE_SOURCE_REGISTRY_REVIEW_SCHEMA,
  audience:"HKcode22/ReplitTranvr:PHASE6_SOURCE_DAY_REGISTRY_REVIEW_ONLY",
  logicalPath:registryPath,registrySha256:h(registryBytes),manifestSha256:trust.manifestSha256,
  calendarSha256:trust.calendarSha256,releaseSha256:trust.releaseSha256,rightsSha256:trust.rightsSha256,
  reviewedCodeSha:code,externalReviewEvidenceSha256:h("SYNTHETIC_REGISTRY_REVIEW"+day),
  entriesDigestSha256:h(Buffer.from(JSON.stringify(entries))),runDayIndex:day,shardIndex:1,
  reviewedAtUtc,validUntilUtc,retentionNotAfterUtc,reviewerPublicKeyFingerprintSha256:fp(rk)};
 return {trust,registryBytes,queryPackets:pairs.map(x=>x.packet),
  registryReviewWire:{review,signatureBase64:sign(null,sourceDayRegistryReviewPreimage(review),rk.privateKey).toString("base64")},
  scope:{privateSourceShardPublicationApproved:true,separateProviderContentRightsReviewApproved:true,
   existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
   resumeFromIndependentReadbackApproved:false,expectedPublisherSessionLogin:"phase6_private_publisher_login_ci_checks",
   expectedProviderContractSha256:H("e"),approvedRetentionNotAfterUtc:retentionNotAfterUtc,
   expectedRunDayIndex:day,expectedShardIndex:1,expectedRegistryPath:registryPath,expectedRegistrySha256:h(registryBytes)}};
}
async function run(f,opts={}){
 const pub=new pg.Client({connectionString:P}),reader=new pg.Client({connectionString:R});
 await pub.connect();await reader.connect();
 try{
  await pub.query("SET ROLE phase6_private_frozen_publisher_v39");
  await reader.query("SET ROLE phase6_private_frozen_reader_v39");
  const publisherClient=opts.unknownCommit?{async query(sql,params){
   const out=await pub.query(sql,params);
   if(sql==="COMMIT")throw Error("synthetic connection lost after real commit");
   return out;
  }}:pub;
  return await publishP6StoredSourceShardOnce({...f,publisherClient,readerClient:reader,
   scope:{...f.scope,resumeFromIndependentReadbackApproved:opts.resume===true}});
 }finally{await reader.end();await pub.end();}
}
async function counts(day){
 const r=new pg.Client({connectionString:R});await r.connect();
 try{await r.query("SET ROLE phase6_private_frozen_reader_v39");
  const z=await r.query("SELECT kind,count(*)::int AS n FROM phase6_private.frozen_native_packet_v39 WHERE run_day_index=$1 GROUP BY kind",[day]);
  return Object.fromEntries(z.rows.map(x=>[x.kind,x.n]));
 }finally{await r.end();}
}
const initial=fixture(2),bad={...initial,queryPackets:[initial.queryPackets[0],
 {...initial.queryPackets[1],wire:{...initial.queryPackets[1].wire,signatureBase64:Buffer.alloc(64).toString("base64")}}]};
await assert.rejects(run(bad),/AUTHENTICATED_PUBLICATION_PREFLIGHT_HOLD_REDACTED/);
assert.deepEqual(await counts(2),{});
const ok=await run(initial);
assert.equal(ok.insertedQueryCount,2);assert.equal(ok.insertedRegistryCount,1);
assert.equal(ok.independentlyReadBackQueryCount,2);assert.equal(ok.paidPhase6Go,false);
assert.equal(ok.separateSignedDayIndexPublicationStillRequired,true);
assert(Date.parse(ok.registryCommittedAtUtc)<=Date.parse(ok.registryReadbackDbClockUtc));
assert(!JSON.stringify(ok).includes("sourceq_synthetic"));
assert.deepEqual(await counts(2),{SOURCE_QUERY_PACKET:2,SOURCE_DAY_REGISTRY:1});
await assert.rejects(run(initial),/PRIOR_PUBLICATION_REQUIRES_SEPARATE_READBACK_RECOVERY_APPROVAL/);
const readback=await run(initial,{resume:true});
assert.equal(readback.insertedRegistryCount,0);assert.equal(readback.insertedQueryCount,0);
assert.equal(readback.existingQueryCount,2);
const partial=fixture(3);
await assert.rejects(run(partial,{unknownCommit:true}),/PARTIAL_OR_UNKNOWN_PUBLICATION_READBACK_REQUIRED_NO_REPLAY/);
assert.deepEqual(await counts(3),{SOURCE_QUERY_PACKET:1});
await assert.rejects(run(partial),/PRIOR_PUBLICATION_REQUIRES_SEPARATE_READBACK_RECOVERY_APPROVAL/);
const resumed=await run(partial,{resume:true});
assert.equal(resumed.existingQueryCount,1);assert.equal(resumed.insertedQueryCount,1);
assert.equal(resumed.insertedRegistryCount,1);
assert.deepEqual(await counts(3),{SOURCE_QUERY_PACKET:2,SOURCE_DAY_REGISTRY:1});
console.log("DISPOSABLE_PG16_SOURCE_SHARD_PUBLICATION_RECOVERY_READBACK_PASS_NO_PROVIDER_NO_GO");
