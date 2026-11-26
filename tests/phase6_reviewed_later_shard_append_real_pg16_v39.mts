import {readP6PrivateLaterQueueRoster} from "../server/lib/disruption/phase6PrivateLaterQueueRosterReadOnce_v39.mjs";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import {verifyPhase7SignedPreFieldProof} from "../server/lib/disruption/phase7SignedPreFieldProof_v39";
import type {P5Stage14SingleFlightPrePermit} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
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

// Synthetic conditional packet, with separate test-only approvals and
// actual cryptographic proof. No physical-leg or production approval.
function conditionalShard(){
 const f=reviewedShard("conditional017",3),native=format(clock+7*3600_000),stable=H("c"),protocol=H("d"),content=H("e"),standalone=H("f");
 const p:P5Stage14SingleFlightPrePermit={manifestSha256:H("1"),queryDigestSha256:H("2"),
  expectedSourcePopulationQueryId:"a23e4567-e89b-42d3-a456-426614174000",expectedSourceResponseSha256:H("a"),
  runDayIndex:17,slot:"HUB",horizon:"T-6h",airportIcao:"WSSS",flightInstanceId:"leg:g5a:"+stable,
  expectedGithubSourceRunId:"42899999999",expectedReviewedReleaseSha256:H("3"),expectedReviewedSourceRightsSha256:H("4"),
  expectedProviderContractSha256:H("5"),expectedEarlyDrawSha256:H("6"),reviewedFrameSha256:H("7"),reviewedConfigSha256:H("8"),
  independentlyReviewedOperatingLegEvidenceSha256:H("9"),independentlyReviewedNativeTEvidenceSha256:H("b"),
  independentlyReviewedRunAndRetentionEvidenceSha256:H("9"),frozenBuilderSha256:H("a"),builderFrozenAtUtc:format(clock-3600000),
  selectedTConfig:{milestone:"departure.scheduledTime.utc",version:"ci-conditional-T",artifactHash:H("b"),verifiedProviderNativeSchedule:true,semanticsEvidenceSha256:H("b")},
  selectedTNativeUtc:native,maxPopulationStalenessSeconds:3600,expectedRestrictedPreWriterRole:"phase5_fids_pre_writer_prod_20261107",
  identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",externalConditionalScheduleSourceAndUseReviewed:true,reviewedProtocolAmendmentSha256:protocol,
  reviewedStableServiceKeySha256:stable,expectedOperatorFlightNumber:"CI300",expectedDestinationIcao:"YSSY",requireProspectiveConditionalSourceMarker:true,
  reviewedStandaloneLaterNoT24:{schema:"v39.phase5.standalone-later-asof-no-t24.v1",reviewedProtocolSha256:standalone,reviewedOriginalResponseSha256:H("a"),
   reviewedNativeTSemanticsSha256:H("b"),missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",independentLaterAsOfAndMissingnessReviewAttested:true},
  reviewedSupplementalFeatureBundle:{schema:"v39.phase5.e-signed-source-supplement.v1",flightInstanceId:"leg:g5a:"+stable,populationQueryId:"a23e4567-e89b-42d3-a456-426614174000",
   originalResponseSha256:H("a"),observationsSha256:sha(Buffer.from("[]")),externalSourceAndContentsReviewReceiptSha256:content,fields:[],observations:[]}};
 const proof=generateKeyPairSync("ed25519"),policy=H("9"),proofRaw=Buffer.from(JSON.stringify({schema:"v39.phase7.separate-pre-field-proof.v1",manifestSha256:p.manifestSha256,rightsSha256:p.expectedReviewedSourceRightsSha256,policySha256:policy,permitSha256:hashPhase7DurableCandidate(p),issuedAtUtc:format(clock-60000),validUntilUtc:format(clock+3600000),fields:[]}));
 const proofWire={payloadBase64:proofRaw.toString("base64"),signatureBase64:sign(null,proofRaw,proof.privateKey).toString("base64")};
 const proofEnv={P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:policy,P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:sha(proof.publicKey.export({type:"spki",format:"der"})),P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(proof.publicKey.export({type:"spki",format:"pem"})).toString("base64")};
 verifyPhase7SignedPreFieldProof(proofEnv,p,policy,[],proofWire);
 const bytes=Buffer.from(JSON.stringify({schema:"v39.phase5.github-conditional-standalone-later-pre-asof-reviewed.v1",reviewedCodeSha:code,
  reviewArtifactSha256:H("a"),independentlyReviewedConditionalScheduleServiceAndSourceAttested:true,reviewedConditionalProtocolSha256:protocol,prePermit:p,phase7FieldProof:proofWire}));
 const packetSha=sha(bytes),{expectedT24ReceiptSha256:unused,...old}=f.plan.registryProposal.entries[0];
 const reg={...f.plan.registryProposal,entries:[{...old,expectedPacketSha256:packetSha,expectedFlightInstanceId:p.flightInstanceId}]};
 const raw=Buffer.from(JSON.stringify(reg));
 const plan:P5UnsignedLaterRegistryReviewPlan={...f.plan,registryProposal:reg,registryProposalBytes:raw,proposedRegistrySha256:sha(raw),proposedPacketFiles:[{filePath:f.packetPath,sha256:packetSha,bytes}],redactedSummary:{...f.plan.redactedSummary,shardIndex:3,reviewedT24Witnesses:0,separatelyReviewedNoT24:1}};
 const k=generateKeyPairSync("ed25519"),keyFp=sha(k.publicKey.export({type:"spki",format:"der"}));
 const conditionalPreScope={protocolSha256:protocol,externalContentUseReviewSha256:content,independentlyApprovedStandaloneProtocolSha256:standalone};
 const pins={...f.pins,expectedReviewerPublicKeyFingerprintSha256:keyFp,conditionalPreScope};
 const review:P5Ed25519ExternalLaterShardReview={...f.wire.review,reviewerPublicKeyFingerprintSha256:keyFp,proposedRegistrySha256:sha(raw),packetFileManifestSha256:digestP5LaterShardPrivatePacketFileManifest(plan),conditionalPreScope};
 const wire:P5Ed25519ReviewWireEnvelope={...f.wire,review,signatureBase64:sign(null,signedP5ExternalLaterReviewBytes(review),k.privateKey).toString("base64")};
 return {...f,plan,pins,wire,publicPem:k.publicKey.export({type:"spki",format:"pem"}).toString(),permit:p,packetSha,bytes,conditionalPreScope,proofEnv,proofWire,policy};
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
 // T071: real private conditional publication -> current signed day ->
 // independent restricted reader -> original queue consumer. The actual
 // Stage14 final 3-minute write window is separately tested by T070; no
 // fabricated clock or reduced 15-minute publication lead here.
 const cf=conditionalShard(),conditionalInput={...input,plan:cf.plan,wire:cf.wire,
  reviewerPublicKeyPem:cf.publicPem,reviewerPins:cf.pins,publisherScope:cf.scope,
  scope:{...input.scope,expectedLaterReviewerFingerprintSha256:cf.pins.expectedReviewerPublicKeyFingerprintSha256}};
 const cb=Buffer.from(JSON.stringify({...JSON.parse(policyBytes.toString("utf8")),laterReviewerFingerprintSha256:cf.pins.expectedReviewerPublicKeyFingerprintSha256,
  conditionalLaterPreScope:cf.conditionalPreScope}));
 const ca={...approval,policyBytes:cb,expectedPolicySha256:sha(cb)};
 await assert.rejects(runP6DelegatedReviewedLaterAppend(conditionalInput,approval),/POLICY_STUDY_OR_DISTINCT_KEYS_DRIFT/);
 const cp=await runP6DelegatedReviewedLaterAppend(conditionalInput,ca);
 assert.equal(cp.status,"REVIEWED_LATER_SHARD_AND_SIGNED_DAY_APPEND_ACTUAL_READBACK_NO_GO");
 assert.equal(cp.insertedPrivateRows,2);
 assert.equal(cp.automatedDelegatedDaySignatureIssued,true);
 assert.equal(cp.phase6PaidGo,false);
 const againConditional=await runP6DelegatedReviewedLaterAppend(conditionalInput,ca);
 assert.equal(againConditional.insertedPrivateRows,0);
 const selector={runDayIndex:17,indexRevision:4,indexSha256:cp.indexSha256,shardIndex:3,laterRegistrySha256:cf.plan.proposedRegistrySha256};
 const queuePolicy={independentLaterQueueTransportProjectionApproved:true,existingPaidDispatchApproved:false,
  conditionalPreScope:{protocolSha256:cf.conditionalPreScope.protocolSha256,externalContentUseReviewSha256:cf.conditionalPreScope.externalContentUseReviewSha256},
  independentlyApprovedStandaloneProtocolSha256:cf.conditionalPreScope.independentlyApprovedStandaloneProtocolSha256};
 const roster=await readP6PrivateLaterQueueRoster({client:reader,trust,selector,policy:queuePolicy});
 assert.equal(roster.packetCount,1);assert.equal(roster.standaloneCount,1);assert.equal(roster.phase6PaidGo,false);
 assert.equal(roster.privateEntries[0].packetSha256,cf.packetSha);
 assert.ok(roster.privateEntries[0].bytes.equals(cf.bytes));
 assert.ok(!JSON.stringify(roster).includes(cf.permit.flightInstanceId));
 verifyPhase7SignedPreFieldProof(cf.proofEnv,cf.permit,cf.policy,[],JSON.parse(roster.privateEntries[0].bytes.toString("utf8")).phase7FieldProof);
 await assert.rejects(readP6PrivateLaterQueueRoster({client:reader,trust,selector,policy:{...queuePolicy,conditionalPreScope:undefined}}),/CONDITIONAL/);
 await assert.rejects(readP6PrivateLaterQueueRoster({client:reader,trust,selector,policy:{...queuePolicy,independentlyApprovedStandaloneProtocolSha256:undefined}}),/MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW/);
 assert.equal((await owner.query("SELECT count(*)::int n FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=17")).rows[0].n,4);
 assert.equal((await owner.query("SELECT count(*)::int n FROM "+table+" WHERE run_day_index=17")).rows[0].n,7);
 console.log("T071_REAL_PG16_CONDITIONAL_PRIVATE_APPEND_CURRENT_SIGNED_DAY_QUEUE_CONSUMER_NO_REPLAY_CI_ONLY");
 console.log("PASS_REAL_PG16_DELEGATED_LATER_APPEND_DISTINCT_SIGNING_KEY_READBACK_NO_REPLAY_SYNTHETIC_ONLY");
 console.log("PASS_REAL_PG16_REVIEWED_LATER_APPEND_READBACK_AND_NO_REPLAY_SYNTHETIC_ONLY");
}finally{await Promise.allSettled([reader.end(),publisher.end(),owner.end()]);}
