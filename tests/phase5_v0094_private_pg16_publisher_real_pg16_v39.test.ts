import {Client} from "pg";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {describe,it,expect,beforeAll,afterAll} from "vitest";
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

const H=(s:string)=>s.repeat(64);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const code="e".repeat(40);
const table="phase6_private.frozen_native_packet_v39";
const sourcePath="data-collection/phase5/frozen/source_day_publish_ci0004.json";
const publisherLogin="phase6_private_publisher_login_ci_abc123";
const ciPassword="ci-only-disposable-postgres-publisher-not-production";
const sourceEvidence=H("8");
let owner:Client,publisher:Client,sourceRaw:Buffer,clock:number;
const actual=process.env.P5_V0094_PRIVATE_DISPOSABLE_PG_TESTS==="1";

const format=(t:number)=>new Date(t).toISOString();
function reviewedShard(suffix:string){
 const packetPath="data-collection/phase5/frozen/later_packet_pubci_"+suffix+".json";
 const registryPath="data-collection/phase5/frozen/later_day_pubci_"+suffix+".json";
 const native=format(clock+48*3600_000);
 const packetBytes=Buffer.from(JSON.stringify({
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:code,independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:{
   flightInstanceId:"ci:native:leg:"+suffix,runDayIndex:4,
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
  sourceDayRegistryFilePath:sourcePath,runDayIndex:4,shardIndex:1,
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
  redactedSummary:{runDayIndex:4,shardIndex:1,proposedFlightHorizons:1,
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
  runDayIndex:4,shardIndex:1,
  reviewedAtUtc:format(clock-60_000),
  validUntilUtc:format(clock+6*3600_000),
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
  approvedRetentionNotAfterUtc:format(clock+24*3600_000)
 };
 return{plan,wire,pins,publicPem,scope,packetPath,registryPath};
}
beforeAll(async()=>{
 if(!actual)return;
 if(process.env.ADB_AUTO_COLLECT!=="0"||
    process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
    process.env.AERODATABOX_API_KEY||
    process.env.AERODATABOX_WEBHOOK_SECRET||
    !process.env.DATABASE_URL?.includes("localhost:5432/neondb"))
  throw Error("REFUSED_V0094_PUBLISHER_REAL_PG_CI_ONLY");
 owner=new Client({connectionString:process.env.DATABASE_URL});
 await owner.connect();
 const c=await owner.query("SELECT clock_timestamp() AS now");
 clock=new Date(c.rows[0].now).getTime();
 await owner.query("CREATE ROLE "+publisherLogin+
  " LOGIN PASSWORD '"+ciPassword+"' NOINHERIT NOSUPERUSER "+
  "NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
 await owner.query("GRANT phase6_private_frozen_publisher_v39 TO "+
  publisherLogin+" WITH ADMIN FALSE, INHERIT FALSE, SET TRUE");
 const source:P5SignedSourceBatchRegistry={
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:H("1"),runDayIndex:4,entries:[{
   filePath:"data-collection/phase5/frozen/source_query_pubci0001.json",
   expectedPacketSha256:H("b"),expectedQueryDigestSha256:H("2")
  }]
 };
 sourceRaw=Buffer.from(JSON.stringify(source));
 await owner.query("INSERT INTO "+table+" ("+
  "logical_path,run_day_index,shard_index,kind,content_sha256,"+
  "reviewed_code_sha,manifest_sha256,rights_sha256,"+
  "external_review_sha256,externally_reviewed_at_utc,"+
  "retention_not_after_utc,payload_bytes) "+
  "VALUES ($1,4,1,'SOURCE_DAY_REGISTRY',$2,$3,$4,$5,$6,$7,$8,$9)",
  [sourcePath,sha(sourceRaw),code,H("1"),H("4"),sourceEvidence,
   format(clock-2*60_000),format(clock+48*3600_000),sourceRaw]);
 const url=new URL(process.env.DATABASE_URL!);
 url.username=publisherLogin;url.password=ciPassword;
 publisher=new Client({connectionString:url.toString()});
 await publisher.connect();
 await publisher.query("SET ROLE phase6_private_frozen_publisher_v39");
});
afterAll(async()=>{
 if(publisher)await publisher.end().catch(()=>{});
 if(owner)await owner.end().catch(()=>{});
});
describe.skipIf(!actual)("V0094 real disposable PG16 signed restricted write-path",()=>{
 it("commits a verified later PRE packet and registry atomically with genuine PostgreSQL privileges",async()=>{
  const f=reviewedShard("pass001");
  const receipt=await publishP5ExternalLaterShardToPrivatePg16Once(
   publisher,f.plan,f.wire,f.publicPem,f.pins,f.scope);
  expect(receipt).toMatchObject({
   insertedPrivatePacketCount:1,insertedPrivateRowCount:2,
   registryInsertedLast:true,independentPostCommitReadbackRequired:true,
   providerCalls:0,phase6PaidGoGranted:false
  });
  const q=await owner.query(
   "SELECT kind,logical_path,content_sha256 FROM "+table+
   " WHERE logical_path=ANY($1::text[]) ORDER BY kind",
   [[f.packetPath,f.registryPath]]);
  expect(q.rowCount).toBe(2);
  expect(q.rows.map(x=>x.kind).sort())
   .toEqual(["LATER_PRE_DAY_REGISTRY","LATER_PRE_PACKET"]);
  expect(q.rows.find(x=>x.kind==="LATER_PRE_PACKET")?.content_sha256)
   .toBe(f.plan.proposedPacketFiles[0].sha256);
  const a=await publisher.query(
   "SELECT current_user AS actor,session_user AS sess");
  expect(a.rows[0]).toMatchObject({
   actor:"phase6_private_frozen_publisher_v39",sess:publisherLogin
  });
 });
 it("refuses any duplicate signed shard and does not modify existing rows",async()=>{
  const f=reviewedShard("pass001");
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   publisher,f.plan,f.wire,f.publicPem,f.pins,f.scope))
   .rejects.toThrow("PRECOMMIT_ABORT");
  const q=await owner.query("SELECT count(*)::integer AS n FROM "+table+
   " WHERE logical_path=ANY($1::text[])",
   [[f.packetPath,f.registryPath]]);
  expect(q.rows[0].n).toBe(2);
 });
 it("a real SQL failure after the packet INSERT must ROLLBACK the entire registry release",async()=>{
  const f=reviewedShard("abort001");
  const interceptor:P5PrivatePgPublisherClient={
   query:async(sql,params)=>{
    if(sql.startsWith("INSERT INTO")&&params?.[3]==="LATER_PRE_DAY_REGISTRY")
     throw Error("CI simulated registry INSERT lost before COMMIT");
    return publisher.query(sql,params);
   }
  };
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   interceptor,f.plan,f.wire,f.publicPem,f.pins,f.scope))
   .rejects.toThrow("PRECOMMIT_ABORT");
  const q=await owner.query("SELECT count(*)::integer AS n FROM "+table+
   " WHERE logical_path=ANY($1::text[])",
   [[f.packetPath,f.registryPath]]);
  expect(q.rows[0].n).toBe(0);
 });
 it("publisher LOGIN cannot UPDATE or DELETE a signed registry",async()=>{
  const f=reviewedShard("pass001");
  await expect(publisher.query("DELETE FROM "+table+
   " WHERE logical_path=$1",[f.registryPath]))
   .rejects.toMatchObject({code:"42501"});
  await expect(publisher.query("UPDATE "+table+
   " SET content_sha256=$1 WHERE logical_path=$2",
   [H("c"),f.registryPath]))
   .rejects.toMatchObject({code:"42501"});
 });
});
