/** Real PG16 POST publication/recovery over synthetic, already admitted PRE.
 * Only invoked inside the existing guarded disposable PG16 test.
 * Seed SOURCE/LATER_PRE registry bytes as fixtures; no live provider or dispatch. */
import {Client} from "pg";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {expect} from "vitest";
import {P6_DAY_EPOCH_REVIEW_SCHEMA,P6_DAY_EPOCH_REVIEW_AUDIENCE,p6DayEpochReviewPreimage,publishP6DayEpochIndexRevisionOnce} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {P6_SOURCE_POST_REVIEW_SCHEMA,P6_SOURCE_POST_REVIEW_AUDIENCE,signedP6PrivateSourcePostReviewBytes} from "../server/lib/disruption/phase6PrivateSourcePostReadOnce_v39.mjs";
import {publishP6PrivateSourcePostOnce} from "../server/lib/disruption/phase6PrivateSourcePostPublisherOnce_v39.mjs";
import {runP6NativePostPublication} from "../server/lib/disruption/phase6NativePostSignedPublication_v39.mjs";
import type {P5ReviewedFuturePostOneGet} from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex"),H=(s:string)=>s.repeat(64),bytes=(o:unknown)=>Buffer.from(JSON.stringify(o));
export async function exerciseNativePostPublication(p:P5ReviewedFuturePostOneGet,sourcePool:any,digest:string){
 if(process.env.GITHUB_ACTIONS!=="true"||process.env.P6_POST_OUTCOME_DISPOSABLE_PG16!=="1"||process.env.DATABASE_URL!=="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable"||process.env.AERODATABOX_API_KEY||process.env.V39_PHASE6_PROCESS_ARMED!=="0")throw Error("HOLD_DISPOSABLE_ONLY");
 const publisherLogin="phase6_private_publisher_login_ci_epoch",readerLogin="phase6_private_reader_login_ci_epoch";
 const owner=new Client({connectionString:"postgresql://neondb_owner:ci-only-day-real@127.0.0.1:5432/neondb?sslmode=disable"});
 const pub=new Client({connectionString:"postgresql://"+publisherLogin+":ci-only-day-pub@127.0.0.1:5432/neondb?sslmode=disable"});
 const read=new Client({connectionString:"postgresql://"+readerLogin+":ci-only-day-read@127.0.0.1:5432/neondb?sslmode=disable"});
 try{
  await owner.connect();await pub.connect();await read.connect();
  await pub.query("SET ROLE phase6_private_frozen_publisher_v39");await read.query("SET ROLE phase6_private_frozen_reader_v39");
  const n=new Date((await owner.query("SELECT clock_timestamp() AS t")).rows[0].t).getTime(),t=(d:number)=>new Date(n+d).toISOString();
  const reviewed=t(-10000),expire=t(14400000),valid=t(10800000);
  const day=generateKeyPairSync("ed25519"),query=generateKeyPairSync("ed25519"),post=generateKeyPairSync("ed25519");
  const fp=(k:typeof day)=>hash(k.publicKey.export({type:"spki",format:"der"})),pem=(k:typeof day)=>k.publicKey.export({type:"spki",format:"pem"}).toString();
  const trust={independentStudyTrustPinsApproved:true,independentPostReviewerPinsApproved:true,expectedReaderSessionLogin:readerLogin,
   reviewedCodeSha:"f".repeat(40),manifestSha256:p.manifestSha256,calendarSha256:H("3"),releaseSha256:H("6"),rightsSha256:p.reviewedSourceRightsSha256,
   dayReviewerFingerprintSha256:fp(day),dayReviewerPublicKeyPem:pem(day),queryReviewerFingerprintSha256:fp(query),queryReviewerPublicKeyPem:pem(query),
   postReviewerFingerprintSha256:fp(post),postReviewerPublicKeyPem:pem(post)};
  const qPath="data-collection/phase5/frozen/sourceq_ci_post_chain_query.json",sPath="data-collection/phase5/frozen/source_ci_post_chain_registry.json",lPath="data-collection/phase5/frozen/later_ci_post_chain_registry.json",evidence=H("7");
  const qBytes=bytes({schema:"v39.phase5.github-source-one-query-template.v2",manifestSha256:p.manifestSha256,queryDigestSha256:digest,
   plan:{independentlyApprovedSourceAndRetention:true,githubOnlyOwnerApproved:true,reviewedProviderRightsSha256:trust.rightsSha256,reviewedReleaseSha256:trust.releaseSha256,
    openapiSha256:p.reviewedProviderContractSha256,expectedEarlyDrawSha256:H("5"),day:{scheduledStartUtc:p.plannedSourceFromUtc},
    sourcePartition:{schema:"v39.phase5.amendment-c.source-segment-partition.v1",windowShape:"4h",segmentIndex:1,partitionIndex:1,verifiedProviderMaxRangeMinutes:120,reviewedProviderRangeEvidenceSha256:H("2")},
    acquisition:{runDayIndex:1,slot:"HUB",horizon:"T-6h",icao:p.airportIcao,providerQueryDirection:"Departure",apiUnitsPerAttempt:2,maxAttempts:1,serviceWindowStartUtc:p.plannedSourceFromUtc,serviceWindowEndUtc:p.plannedSourceToUtc},
    localFrom:p.fromLocal,localTo:p.toLocal,ianaTimezone:p.airportIanaTimezone}});
  const review={schema:P6_SOURCE_POST_REVIEW_SCHEMA,audience:P6_SOURCE_POST_REVIEW_AUDIENCE,kind:"SOURCE_QUERY_PACKET",logicalPath:qPath,contentSha256:hash(qBytes),reviewedCodeSha:trust.reviewedCodeSha,
   manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,runDayIndex:1,shardIndex:1,externalReviewEvidenceSha256:evidence,reviewedAtUtc:reviewed,retentionNotAfterUtc:expire,validUntilUtc:valid,reviewerPublicKeyFingerprintSha256:fp(query)};
  await publishP6PrivateSourcePostOnce({client:pub,pins:{independentExternalReviewerSignaturePinsApproved:true,privateSourcePostPublishApproved:true,expectedKind:"SOURCE_QUERY_PACKET",expectedLogicalPath:qPath,
   expectedContentSha256:hash(qBytes),expectedReviewedMainSha:trust.reviewedCodeSha,expectedManifestSha256:trust.manifestSha256,expectedRightsSha256:trust.rightsSha256,expectedExternalReviewEvidenceSha256:evidence,
   expectedReviewerPublicKeyFingerprintSha256:fp(query),expectedRunDayIndex:1,expectedShardIndex:1},wire:{review,signatureBase64:sign(null,signedP6PrivateSourcePostReviewBytes(review),query.privateKey).toString("base64")},
   reviewerPublicKeyPem:pem(query),packetBytes:qBytes,scope:{privateStoragePublicationApproved:true,separateProviderContentRightsReviewApproved:true,existingChildOrPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
   approvedMainCodeSha:trust.reviewedCodeSha,expectedPublisherSessionLogin:publisherLogin,approvedRetentionNotAfterUtc:expire,reviewedRightsSha256:trust.rightsSha256,externalReviewEvidenceSha256:evidence,expectedSourceDayRegistryLogicalPath:null,expectedSourceDayRegistrySha256:null,persistVerifiedReviewWire:true}});
  const s=bytes({schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",manifestSha256:trust.manifestSha256,runDayIndex:1,entries:[{filePath:qPath,expectedPacketSha256:hash(qBytes),expectedQueryDigestSha256:digest}]});
  const l=bytes({schema:"v39.phase5.signed-later-pre-day-registry.v1",manifestSha256:trust.manifestSha256,reviewedCodeSha:trust.reviewedCodeSha,sourceDayRegistryFilePath:sPath,sourceDayRegistrySha256:hash(s),runDayIndex:1,shardIndex:1,
   entries:[{filePath:"data-collection/phase5/frozen/later_packet_ci_post_chain_one.json",expectedPacketSha256:H("8"),expectedQueryDigestSha256:digest,expectedFlightInstanceId:p.flightInstanceId,expectedHorizon:"T-6h",expectedSelectedTNativeUtc:p.expectedSelectedTNativeUtc}]});
  for(const [path,kind,b] of [[sPath,"SOURCE_DAY_REGISTRY",s],[lPath,"LATER_PRE_DAY_REGISTRY",l]] as const){
   const out=await owner.query("INSERT INTO phase6_private.frozen_native_packet_v39(logical_path,run_day_index,shard_index,kind,content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,committed_at_utc,payload_bytes) VALUES($1,1,1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",[path,kind,hash(b),trust.reviewedCodeSha,trust.manifestSha256,trust.rightsSha256,evidence,t(-30000),expire,t(-20000),b]);expect(out.rowCount).toBe(1);
  }
  const sourceEntry={lane:"SOURCE",runDayIndex:1,shardIndex:1,filePath:sPath,fileSha256:hash(s),publishedAtUtc:t(-15000),notBeforeUtc:t(-14000),hardLatestUtc:t(-12000),reviewEvidenceSha256:evidence,sourceRegistryFilePath:null,sourceRegistrySha256:null};
  const laterEntry={...sourceEntry,lane:"LATER_PRE",filePath:lPath,fileSha256:hash(l),sourceRegistryFilePath:sPath,sourceRegistrySha256:hash(s)};
  let previous:string|null=null;
  for(const revision of [1,2]){
   const indexBytes=bytes({schema:"v39.phase6.run-day-scoped-append-only-index.v1",runDayIndex:1,revision,previousIndexSha256:previous,manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,reviewedCodeSha:trust.reviewedCodeSha,reviewedReleaseSha256:trust.releaseSha256,reviewedRightsSha256:trust.rightsSha256,entries:revision===1?[sourceEntry]:[sourceEntry,laterEntry]});
   const indexSha256=hash(indexBytes),r={schema:P6_DAY_EPOCH_REVIEW_SCHEMA,audience:P6_DAY_EPOCH_REVIEW_AUDIENCE,runDayIndex:1,indexRevision:revision,indexSha256,previousIndexSha256:previous,reviewedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,releaseSha256:trust.releaseSha256,rightsSha256:trust.rightsSha256,externalReviewEvidenceSha256:evidence,reviewedAtUtc:reviewed,validUntilUtc:valid,retentionNotAfterUtc:expire,reviewerPublicKeyFingerprintSha256:fp(day)};
   await publishP6DayEpochIndexRevisionOnce({client:pub,indexBytes,wire:{review:r,signatureBase64:sign(null,p6DayEpochReviewPreimage(r),day.privateKey).toString("base64")},publicKeyPem:pem(day),pins:{independentExternalReviewerSignaturePinsApproved:true,privateDayIndexPublicationApproved:true,privateDayIndexReadOnlyApproved:true,expectedRunDayIndex:1,expectedIndexRevision:revision,expectedIndexSha256:indexSha256,expectedPreviousIndexSha256:previous,expectedReviewedCodeSha:trust.reviewedCodeSha,expectedManifestSha256:trust.manifestSha256,expectedCalendarSha256:trust.calendarSha256,expectedReleaseSha256:trust.releaseSha256,expectedRightsSha256:trust.rightsSha256,expectedExternalReviewEvidenceSha256:evidence,expectedReviewerPublicKeyFingerprintSha256:fp(day),expectedReaderSessionLogin:readerLogin},scope:{privateDayIndexStorageApproved:true,independentProviderContentsReviewApproved:true,existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",expectedPublisherSessionLogin:publisherLogin,approvedCodeSha:trust.reviewedCodeSha,approvedCalendarSha256:trust.calendarSha256,approvedRightsSha256:trust.rightsSha256,approvedRetentionNotAfterUtc:expire,persistVerifiedReviewWire:true}});
   previous=indexSha256;
  }
  let start=Math.ceil((n+900000)/60000)*60000;
  const endOfDay=Date.parse(new Date(start).toISOString().slice(0,10)+"T00:00:00.000Z")+86400000;
  if(start+600000>=endOfDay)start=endOfDay+600000;
  const policyBytes=bytes({schema:"v39.phase6.native-post-physical-window-policy.v1",independentPostRequestGeometryApproved:true,delegatedPostPacketAndDayAppendApproved:true,independentSourceContentsUseAndRESTReleaseAttested:true,independentProviderContentRetentionApproved:true,
   manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,releaseSha256:trust.releaseSha256,rightsSha256:trust.rightsSha256,reviewedCodeSha:trust.reviewedCodeSha,reviewedFrameSha256:p.reviewedFrameSha256,reviewedProviderPriceSha256:p.reviewedProviderPriceSha256,reviewedCategoryBudgetSha256:p.reviewedCategoryBudgetSha256,reviewedProviderContractSha256:p.reviewedProviderContractSha256,externalPostContentsAndBudgetEvidenceSha256:evidence,expectedPublisherSessionLogin:publisherLogin,dayReviewerFingerprintSha256:fp(day),queryReviewerFingerprintSha256:fp(query),postReviewerFingerprintSha256:fp(post),maximumPrivateRetentionHours:72,maximumIndexRevision:1024,maximumPopulationStalenessSeconds:2400,followupAfterPartitionEndSeconds:(start-Date.parse(p.plannedSourceToUtc))/1000,dispatchWindowSeconds:600,expectedApiUnitsPerGet:2,validFromUtc:t(-3600000),validUntilUtc:t(18000000)});
  const args={readerClient:read,publisherClient:pub,sourcePool,trust,authority:{policyBytes,expectedPolicySha256:hash(policyBytes),postReviewerKey:post.privateKey,dayReviewerKey:day.privateKey,independentDelegatedPostAndDayAppendApproved:true,noProviderCredentialsInReviewer:true},selector:{runDayIndex:1,horizon:"T-6h",queryDigestSha256:digest,airportIcao:p.airportIcao,fromUtc:p.plannedSourceFromUtc,toUtc:p.plannedSourceToUtc},t24Trust:undefined,githubRunId:"1234567890"};
  let injected=false;
  const fault={query:async(sql:string,...params:any[])=>{if(sql.startsWith("INSERT INTO phase6_private.signed_run_day_index_revision_v39")&&!injected){injected=true;throw Error("SYNTHETIC_BEFORE_INDEX_INSERT");}return (pub.query as any).call(pub,sql,...params);}};
  await expect(runP6NativePostPublication({...args,publisherClient:fault})).rejects.toThrow();
  expect(injected).toBe(true);
  const stored=async()=>(await owner.query("SELECT logical_path,content_sha256,review_wire_bytes FROM phase6_private.frozen_native_packet_v39 WHERE kind='POST_PACKET'")).rows;
  const before=await stored();expect(before).toHaveLength(1);
  const rev=async()=>(await owner.query("SELECT max(revision)::int AS r FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=1")).rows[0].r;
  expect(await rev()).toBe(2);
  expect(await runP6NativePostPublication(args)).toMatchObject({status:"NATIVE_POST_PACKET_AND_DAY_APPEND_VERIFIED_NO_GO",revision:3,existingPacketRecoveredWithoutReinsert:true,providerCalls:0,phase6PaidGo:false});
  expect(await stored()).toEqual(before);expect(await rev()).toBe(3);
  expect(await runP6NativePostPublication(args)).toMatchObject({status:"POST_PHYSICAL_REQUEST_ALREADY_INDEXED_NO_REPLAY",providerCalls:0,phase6PaidGo:false});
  expect(await stored()).toEqual(before);expect(await rev()).toBe(3);
  console.log("P6_NATIVE_POST_REAL_PG16_ORPHAN_RECOVERY_NO_REINSERT_NO_PROVIDER_PASS");
 }finally{await Promise.allSettled([owner.end(),pub.end(),read.end()]);}
}
