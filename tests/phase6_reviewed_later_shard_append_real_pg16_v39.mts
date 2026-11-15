import {Client} from "pg";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import assert from "node:assert/strict";
import {publishP5ExternalLaterShardToPrivatePg16Once,
 type P5PrivatePgPublisherClient}
 from "../server/lib/disruption/phase5Phase6Pg16PrivateLaterPrePublisher_v39";
import {
 signedP5ExternalLaterReviewBytes,
 digestP5LaterShardPrivatePacketFileManifest,
 type P5Ed25519ExternalLaterShardReview,
 type P5ExternalLaterReviewSignerPins,
 type P5Ed25519ReviewWireEnvelope
} from "../server/lib/disruption/phase5ExternalEd25519LaterShardReviewerVerify_v39";
import type {P5UnsignedLaterRegistryReviewPlan}
 from "../server/lib/disruption/phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39";
import type {P5SignedLaterPreDayRegistry}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedSourceBatchRegistry}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";

import {prepareP6ReviewedLaterShardAppend,commitP6ExternallyReviewedLaterAppend,runP6DelegatedReviewedLaterAppend}
 from "../server/lib/disruption/phase6ReviewedLaterShardAppendRuntime_v39";
import {P6_DAY_EPOCH_REVIEW_SCHEMA,P6_DAY_EPOCH_REVIEW_AUDIENCE,
 p6DayEpochReviewPreimage,publishP6DayEpochIndexRevisionOnce}
 from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
const H=(s:string)=>s.repeat(64);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const code="e".repeat(40);
const table="phase6_private.frozen_native_packet_v39";
const sourcePath="data-collection/phase5/frozen/source_day_append_ci0017.json";
const publisherLogin="phase6_private_publisher_login_ci_epoch";
const sourceEvidence=H("8");
let owner:Client,publisher:Client,sourceRaw:Buffer,clock:number;

const format=(t:number)=>new Date(t).toISOString();
function reviewedShard(suffix:string,shardIndex=1){
 const packetPath="data-collection/phase5/frozen/later_packet_appendci_"+suffix+".json";
 const registryPath="data-collection/phase5/frozen/later_day_appendci_"+suffix+".json";
 const native=format(clock+7*3600_000);
 const packetBytes=Buffer.from(JSON.stringify({
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:code,independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:{
   flightInstanceId:"ci:native:leg:"+suffix,runDayIndex:17,
   horizon:"T-6h",selectedTNativeUtc:native,
   manifestSha256:H("1"),queryDigestSha256:H("2"),
   expectedSourceResponseSha256:H("a"),
   expectedSourcePopulationQueryId:"a23e4567-e89b-42d3-a456-426614174000",
   expectedGithubSourceRunId:"42899999999",
   expectedProviderContractSha256:H("5"),expectedEarlyDrawSha256:H("6"),
   expectedReviewedReleaseSha256:H("3"),
   expectedReviewedSourceRightsSha256:H("4"),
   identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG",
   externalNativeTPhysicalLegAndSourceUseReviewed:true,
   reviewedT24WitnessReceipt:{receiptSha256:H("3")}
  }
 }));
 const registry:P5SignedLaterPreDayRegistry={
  schema:"v39.phase5.signed-later-pre-day-registry.v1",
  manifestSha256:H("1"),reviewedCodeSha:code,
  sourceDayRegistrySha256:sha(sourceRaw),
  sourceDayRegistryFilePath:sourcePath,runDayIndex:17,shardIndex,
  entries:[{
   filePath:packetPath,expectedPacketSha256:sha(packetBytes),
   expectedQueryDigestSha256:H("2"),
   expectedFlightInstanceId:"ci:native:leg:"+suffix,
   expectedHorizon:"T-6h",expectedSelectedTNativeUtc:native,
   expectedSourcePopulationQueryId:"a23e4567-e89b-42d3-a456-426614174000",
   expectedT24ReceiptSha256:H("3")
  }]
 };
 const registryBytes=Buffer.from(JSON.stringify(registry));
 const plan:P5UnsignedLaterRegistryReviewPlan={
  schema:"v39.phase5.review-ready-later-pre-unsigned-registry-plan.v1",
  status:"REGISTRY_PACKET_BYTES_FOR_INDEPENDENT_EXTERNAL_SIGNATURE_NOT_PUBLISHED",
  sourceRegistrySha256:sha(sourceRaw),
  proposedRegistrySha256:sha(registryBytes),
  proposedRegistryFilePath:registryPath,registryProposal:registry,
  registryProposalBytes:registryBytes,
  proposedPacketFiles:[{
   filePath:packetPath,sha256:sha(packetBytes),bytes:packetBytes
  }],
  redactedSummary:{runDayIndex:17,shardIndex:1,proposedFlightHorizons:1,
   T6:1,T90:0,reviewedT24Witnesses:1,
   separatelyReviewedNoT24:0,sourceQueryCount:1},
  independentlySignedRegistry:false,existingRegistryVerifierCalled:false,
  flightFilesPublished:0,registeredV0091Tasks:0,
  githubDispatches:0,databaseReads:0,databaseWrites:0,
  providerCalls:0,paidProviderCalls:0,
  phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
 };
 const {publicKey,privateKey}=generateKeyPairSync("ed25519");
 const publicPem=publicKey.export({type:"spki",format:"pem"}).toString();
 const fingerprint=sha(publicKey.export({type:"spki",format:"der"}));
 const pins:P5ExternalLaterReviewSignerPins={
  expectedReviewerPublicKeyFingerprintSha256:fingerprint,
  expectedApprovedMainCodeSha:code,
  expectedReviewedReleaseSha256:H("3"),
  expectedReviewedRightsSha256:H("4"),
  expectedIndependentReviewerEvidenceDigestSha256:H("9")
 };
 const review:P5Ed25519ExternalLaterShardReview={
  schema:"v39.phase5.external-ed25519-later-shard-review.v1",
  audience:"HKcode22/ReplitTranvr:PHASE6_LATER_PRE_REVIEW_ONLY",
  reviewerPublicKeyFingerprintSha256:fingerprint,
  reviewedMainCodeSha:code,reviewedManifestSha256:H("1"),
  reviewedReleaseSha256:H("3"),reviewedRightsSha256:H("4"),
  sourceDayRegistrySha256:sha(sourceRaw),
  sourceDayRegistryFilePath:sourcePath,
  proposedRegistrySha256:sha(registryBytes),
  proposedRegistryFilePath:registryPath,
  packetFileManifestSha256:digestP5LaterShardPrivatePacketFileManifest(plan),
  runDayIndex:17,shardIndex,
  reviewedAtUtc:format(clock-60_000),
  validUntilUtc:format(clock+3*3600_000),
  independentReviewerEvidenceDigestSha256:H("9")
 };
 const wire:P5Ed25519ReviewWireEnvelope={
  schema:"v39.phase5.external-ed25519-later-shard-envelope.v1",
  review,signatureBase64:sign(null,
   signedP5ExternalLaterReviewBytes(review),privateKey).toString("base64")
 };
 const scope={
  privateStoragePublicationApproved:true as const,
  adbAutoCollect:"0" as const,phase6ProcessArmed:"0" as const,
  expectedPublisherSessionLogin:publisherLogin,
  expectedSourceReviewEvidenceSha256:sourceEvidence,
  approvedRetentionNotAfterUtc:format(clock+3*3600_000)
 };
 return{plan,wire,pins,publicPem,scope,packetPath,registryPath};
}

const ownerUrl="postgresql://neondb_owner:ci-only-day-real@127.0.0.1:5432/neondb?sslmode=disable";
if(process.env.CI!=="true"||process.env.P6_DAY_EPOCH_REAL_DISPOSABLE_ONLY!=="1"||
 process.env.P6_REAL_DISPOSABLE_OWNER_URL!==ownerUrl||process.env.DATABASE_URL||
 process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY)
 throw Error("HOLD_DISPOSABLE_ONLY");
const readerLogin="phase6_private_reader_login_ci_epoch";
const reader=new Client({connectionString:"postgresql://"+readerLogin+":ci-only-day-read@127.0.0.1:5432/neondb?sslmode=disable"});
owner=new Client({connectionString:ownerUrl});
publisher=new Client({connectionString:"postgresql://"+publisherLogin+":ci-only-day-pub@127.0.0.1:5432/neondb?sslmode=disable"});
const dayKey=generateKeyPairSync("ed25519"),queryKey=generateKeyPairSync("ed25519");
const publicPem=dayKey.publicKey.export({format:"pem",type:"spki"}).toString();
const fp=sha(dayKey.publicKey.export({format:"der",type:"spki"}));
const calendar=H("7"),manifest=H("1"),release=H("3"),rights=H("4"),dayEvidence=H("6");
const trust={independentStudyTrustPinsApproved:true as const,expectedReaderSessionLogin:readerLogin,
 reviewedCodeSha:code,manifestSha256:manifest,calendarSha256:calendar,releaseSha256:release,rightsSha256:rights,
 dayReviewerFingerprintSha256:fp,dayReviewerPublicKeyPem:publicPem,
 queryReviewerFingerprintSha256:sha(queryKey.publicKey.export({format:"der",type:"spki"})),
 queryReviewerPublicKeyPem:queryKey.publicKey.export({format:"pem",type:"spki"}).toString()};
const at=(ms:number)=>format(clock+ms);
function dayWire(bytes:Buffer,reviewedAtUtc:string,retentionNotAfterUtc:string,validUntilUtc:string){
 const i=JSON.parse(bytes.toString("utf8"));
 const review={schema:P6_DAY_EPOCH_REVIEW_SCHEMA,audience:P6_DAY_EPOCH_REVIEW_AUDIENCE,
  runDayIndex:17,indexRevision:i.revision,indexSha256:sha(bytes),previousIndexSha256:i.previousIndexSha256,
  reviewedCodeSha:code,manifestSha256:manifest,calendarSha256:calendar,releaseSha256:release,rightsSha256:rights,
  externalReviewEvidenceSha256:dayEvidence,reviewedAtUtc,validUntilUtc,retentionNotAfterUtc,reviewerPublicKeyFingerprintSha256:fp};
 return {review,signatureBase64:sign(null,p6DayEpochReviewPreimage(review),dayKey.privateKey).toString("base64")};
}
try{
 await owner.connect();await publisher.connect();await reader.connect();
 await publisher.query("SET ROLE phase6_private_frozen_publisher_v39");
 await reader.query("SET ROLE phase6_private_frozen_reader_v39");
 clock=new Date((await owner.query("SELECT clock_timestamp() AS now")).rows[0].now).getTime();
 const source:P5SignedSourceBatchRegistry={schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:manifest,runDayIndex:17,entries:[{filePath:"data-collection/phase5/frozen/source_query_appendci0017.json",
   expectedPacketSha256:H("b"),expectedQueryDigestSha256:H("2")}]};
 sourceRaw=Buffer.from(JSON.stringify(source));
 await owner.query("INSERT INTO "+table+" (logical_path,run_day_index,shard_index,kind,content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,committed_at_utc,payload_bytes) VALUES ($1,17,1,'SOURCE_DAY_REGISTRY',$2,$3,$4,$5,$6,$7,$8,$9,$10)",
  [sourcePath,sha(sourceRaw),code,manifest,rights,sourceEvidence,at(-60000),at(6*3600000),at(-30000),sourceRaw]);
 const genesis=Buffer.from(JSON.stringify({schema:"v39.phase6.run-day-scoped-append-only-index.v1",runDayIndex:17,revision:1,previousIndexSha256:null,
  manifestSha256:manifest,calendarSha256:calendar,reviewedCodeSha:code,reviewedReleaseSha256:release,reviewedRightsSha256:rights,
  entries:[{lane:"SOURCE",runDayIndex:17,shardIndex:1,filePath:sourcePath,fileSha256:sha(sourceRaw),publishedAtUtc:at(-20000),
   notBeforeUtc:at(-10000),hardLatestUtc:at(2*3600000),reviewEvidenceSha256:sourceEvidence,sourceRegistryFilePath:null,sourceRegistrySha256:null}]}));
 const g=dayWire(genesis,at(-5000),at(4*3600000),at(3*3600000));
 await publishP6DayEpochIndexRevisionOnce({client:publisher,wire:g,publicKeyPem:publicPem,indexBytes:genesis,
  pins:{independentExternalReviewerSignaturePinsApproved:true,privateDayIndexPublicationApproved:true,expectedRunDayIndex:17,expectedIndexRevision:1,
   expectedIndexSha256:sha(genesis),expectedPreviousIndexSha256:null,expectedReviewedCodeSha:code,expectedManifestSha256:manifest,
   expectedCalendarSha256:calendar,expectedReleaseSha256:release,expectedRightsSha256:rights,expectedExternalReviewEvidenceSha256:dayEvidence,
   expectedReviewerPublicKeyFingerprintSha256:fp},
  scope:{privateDayIndexStorageApproved:true,independentProviderContentsReviewApproved:true,existingPaidDispatchApproved:false,adbAutoCollect:"0",
   phase6ProcessArmed:"0",expectedPublisherSessionLogin:publisherLogin,approvedCodeSha:code,approvedCalendarSha256:calendar,
   approvedRightsSha256:rights,approvedRetentionNotAfterUtc:g.review.retentionNotAfterUtc,persistVerifiedReviewWire:true}});
 const f=reviewedShard("real017"),input={readerClient:reader,publisherClient:publisher,trust,plan:f.plan,wire:f.wire,
  reviewerPublicKeyPem:f.publicPem,reviewerPins:f.pins,publisherScope:f.scope,scope:{independentReviewedLaterAppendApproved:true as const,
   existingPaidDispatchApproved:false as const,expectedLaterReviewerFingerprintSha256:f.pins.expectedReviewerPublicKeyFingerprintSha256,mode:"PUBLISH_ONCE" as const}};
 const p=await prepareP6ReviewedLaterShardAppend(input);
 assert.equal(p.status,"PRIVATE_LATER_SHARD_APPEND_PROPOSAL_NEEDS_EXTERNAL_DAY_SIGNATURE");
 assert.equal(p.insertedPrivateRows,2);
 if(!("privateIndexBytes" in p))throw Error("MISSING_PROPOSAL_BYTES");
 assert.equal(Object.keys(p).includes("privateIndexBytes"),false);
 const recovery={...input,scope:{...input.scope,mode:"RECOVER_READONLY" as const}};
 const re=await prepareP6ReviewedLaterShardAppend(recovery);
 assert.equal(re.insertedPrivateRows,0);assert.equal(re.verifiedPacketCount,1);
 const w=dayWire(p.privateIndexBytes,format(new Date((await owner.query("SELECT clock_timestamp() AS now")).rows[0].now).getTime()),
  at(3*3600000),at(2*3600000));
 const approved={indexBytes:p.privateIndexBytes,expectedIndexSha256:p.indexSha256,expectedDayReviewEvidenceSha256:dayEvidence,wire:w};
 await assert.rejects(commitP6ExternallyReviewedLaterAppend(recovery,{...approved,wire:{...w,signatureBase64:Buffer.alloc(64).toString("base64")}}));
 const result=await commitP6ExternallyReviewedLaterAppend(recovery,approved);
 assert.equal(result.status,"REVIEWED_LATER_SHARD_AND_SIGNED_DAY_APPEND_ACTUAL_READBACK_NO_GO");
 assert.equal(result.verifiedPacketCount,1);assert.equal(result.phase6PaidGo,false);
 const replay=await commitP6ExternallyReviewedLaterAppend(recovery,approved);
 assert.equal(replay.status,"EXACT_SIGNED_LATER_APPEND_ALREADY_COMMITTED_NO_REPLAY");
 const q=await owner.query("SELECT count(*)::int AS n FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=17");
 assert.equal(q.rows[0].n,2);
 const packets=await owner.query("SELECT count(*)::int AS n FROM "+table+" WHERE run_day_index=17");
 assert.equal(packets.rows[0].n,3);
 await assert.rejects(publisher.query("DELETE FROM "+table+" WHERE logical_path=$1",[f.registryPath]),(e:any)=>e.code==="42501");

 const next=reviewedShard("auto017",2),auto={...input,plan:next.plan,wire:next.wire,
  reviewerPublicKeyPem:next.publicPem,reviewerPins:next.pins,publisherScope:next.scope,
  scope:{...input.scope,expectedLaterReviewerFingerprintSha256:next.pins.expectedReviewerPublicKeyFingerprintSha256}};
 const policyBytes=Buffer.from(JSON.stringify({
  schema:"v39.phase6.delegated-later-day-append-review-policy.v1",delegatedAutomatedLaterDayAppendApproved:true,
  approvedCodeSha:code,manifestSha256:manifest,calendarSha256:calendar,releaseSha256:release,rightsSha256:rights,
  dayReviewerFingerprintSha256:fp,queryReviewerFingerprintSha256:trust.queryReviewerFingerprintSha256,
  laterReviewerFingerprintSha256:next.pins.expectedReviewerPublicKeyFingerprintSha256,
  maximumIndexRevision:1024,validFromUtc:at(-60000),validUntilUtc:at(6*3600000)
 }));
 const approval={policyBytes,expectedPolicySha256:sha(policyBytes),dayReviewerKey:dayKey.privateKey,
  independentlyApprovedDelegatedDayAppend:true as const,noProviderCredentialsInSigner:true as const};
 await assert.rejects(runP6DelegatedReviewedLaterAppend(auto,{...approval,dayReviewerKey:queryKey.privateKey}),/WRONG_PRIVATE_KEY/);
 await assert.rejects(runP6DelegatedReviewedLaterAppend(auto,{...approval,expectedPolicySha256:H("0")}),/POLICY_NOT_INDEPENDENTLY_PINNED/);
 const got=await runP6DelegatedReviewedLaterAppend(auto,approval);
 assert.equal(got.status,"REVIEWED_LATER_SHARD_AND_SIGNED_DAY_APPEND_ACTUAL_READBACK_NO_GO");
 assert.equal(got.automatedDelegatedDaySignatureIssued,true);
 assert.equal(got.insertedPrivateRows,2);
 assert.equal(got.phase6PaidGo,false);
 const again=await runP6DelegatedReviewedLaterAppend(auto,approval);
 assert.equal(again.status,"EXACT_LATER_SHARD_ALREADY_IN_SIGNED_DAY_NO_REPLAY");
 assert.equal(again.automatedDelegatedDaySignatureIssued,false);
 assert.equal(again.insertedPrivateRows,0);
 const q2=await owner.query("SELECT count(*)::int AS n FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=17");
 assert.equal(q2.rows[0].n,3);
 const rows2=await owner.query("SELECT count(*)::int AS n FROM "+table+" WHERE run_day_index=17");
 assert.equal(rows2.rows[0].n,5);
 console.log("PASS_REAL_PG16_DELEGATED_LATER_APPEND_DISTINCT_SIGNING_KEY_READBACK_NO_REPLAY_SYNTHETIC_ONLY");
 console.log("PASS_REAL_PG16_REVIEWED_LATER_APPEND_READBACK_AND_NO_REPLAY_SYNTHETIC_ONLY");
}finally{await Promise.allSettled([reader.end(),publisher.end(),owner.end()]);}
