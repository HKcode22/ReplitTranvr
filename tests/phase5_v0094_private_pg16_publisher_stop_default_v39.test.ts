import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 publishP5ExternalLaterShardToPrivatePg16Once,
 type P5PrivatePgPublisherClient,
 type P5PrivatePgPublisherScope
} from "../server/lib/disruption/phase5Phase6Pg16PrivateLaterPrePublisher_v39";
import {
 signedP5ExternalLaterReviewBytes,
 digestP5LaterShardPrivatePacketFileManifest,
 type P5ExternalLaterReviewSignerPins,
 type P5Ed25519ReviewWireEnvelope,
 type P5Ed25519ExternalLaterShardReview
} from "../server/lib/disruption/phase5ExternalEd25519LaterShardReviewerVerify_v39";
import type {P5UnsignedLaterRegistryReviewPlan}
 from "../server/lib/disruption/phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39";
import type {P5SignedLaterPreDayRegistry}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";

const H=(s:string)=>s.repeat(64);
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const DB_NOW="2027-02-10T05:00:00.000Z";
const sourcePath="data-collection/phase5/frozen/source_day_0004.json";
const packetPath="data-collection/phase5/frozen/later_packet_0001.json";
const registryPath="data-collection/phase5/frozen/later_day_shard_0001.json";
const LOGIN="phase6_private_publisher_login_ci_abc123";

function fixture(){
 const code="e".repeat(40);
 const packetBytes=Buffer.from(JSON.stringify({
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:code,independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:{
   flightInstanceId:"leg:observed:00001",runDayIndex:4,
   horizon:"T-6h",selectedTNativeUtc:"2027-02-10T12:00:00.000Z",
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
  sourceDayRegistrySha256:H("a"),sourceDayRegistryFilePath:sourcePath,
  runDayIndex:4,shardIndex:1,entries:[{
   filePath:packetPath,expectedPacketSha256:hash(packetBytes),
   expectedQueryDigestSha256:H("2"),
   expectedFlightInstanceId:"leg:observed:00001",
   expectedHorizon:"T-6h",expectedSelectedTNativeUtc:
    "2027-02-10T12:00:00.000Z",
   expectedSourcePopulationQueryId:"a23e4567-e89b-42d3-a456-426614174000",
   expectedT24ReceiptSha256:H("3")
  }]
 };
 const registryBytes=Buffer.from(JSON.stringify(registry));
 const plan:P5UnsignedLaterRegistryReviewPlan={
  schema:"v39.phase5.review-ready-later-pre-unsigned-registry-plan.v1",
  status:"REGISTRY_PACKET_BYTES_FOR_INDEPENDENT_EXTERNAL_SIGNATURE_NOT_PUBLISHED",
  sourceRegistrySha256:H("a"),proposedRegistrySha256:hash(registryBytes),
  proposedRegistryFilePath:registryPath,registryProposal:registry,
  registryProposalBytes:registryBytes,
  proposedPacketFiles:[{
   filePath:packetPath,sha256:hash(packetBytes),bytes:packetBytes
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
 const fingerprint=hash(publicKey.export({type:"spki",format:"der"}));
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
  sourceDayRegistrySha256:H("a"),sourceDayRegistryFilePath:sourcePath,
  proposedRegistrySha256:hash(registryBytes),
  proposedRegistryFilePath:registryPath,
  packetFileManifestSha256:digestP5LaterShardPrivatePacketFileManifest(plan),
  runDayIndex:4,shardIndex:1,
  reviewedAtUtc:"2027-02-10T04:59:00.000Z",
  validUntilUtc:"2027-02-10T08:00:00.000Z",
  independentReviewerEvidenceDigestSha256:H("9")
 };
 const wire:P5Ed25519ReviewWireEnvelope={
  schema:"v39.phase5.external-ed25519-later-shard-envelope.v1",
  review,signatureBase64:sign(null,
   signedP5ExternalLaterReviewBytes(review),privateKey).toString("base64")
 };
 const scope:P5PrivatePgPublisherScope={
  privateStoragePublicationApproved:true,adbAutoCollect:"0",
  phase6ProcessArmed:"0",expectedPublisherSessionLogin:LOGIN,
  expectedSourceReviewEvidenceSha256:H("8"),
  approvedRetentionNotAfterUtc:"2027-02-10T08:00:00.000Z"
 };
 return{plan,wire,pins,publicPem,scope};
}
class FakeRestrictedPG implements P5PrivatePgPublisherClient{
 statements:string[]=[];
 inserts:{path:unknown;kind:unknown;bytes:unknown}[]=[];
 actor="phase6_private_frozen_publisher_v39";
 sourceEvidence=H("8");
 sourceExpiry="2027-02-11T00:00:00.000Z";
 existing=0;
 failInsert=false;
 uncertainCommit=false;
 now=DB_NOW;
 async query(sql:string,params?:unknown[]){
  this.statements.push(sql);
  const row=(r:Record<string,unknown>)=>({rowCount:1,rows:[r]});
  if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||
     sql==="ROLLBACK")return{rowCount:null,rows:[]};
  if(sql==="COMMIT"){
   if(this.uncertainCommit)throw Error("connection lost after sending COMMIT");
   return{rowCount:null,rows:[]};
  }
  if(sql.startsWith("SELECT current_database()"))return row({
   db:"neondb",server_version:160000,ro:"off",
   actor:this.actor,session_login:LOGIN,db_now:new Date(this.now),
   can_read:true,can_insert:true,can_update:false,can_delete:false,
   login_enabled:true,login_superuser:false,login_createrole:false,
   login_bypass_rls:false,group_can_login:false,group_superuser:false,
   group_bypass_rls:false
  });
  if(sql.startsWith("SELECT logical_path,run_day_index,kind"))return row({
   logical_path:sourcePath,run_day_index:4,kind:"SOURCE_DAY_REGISTRY",
   content_sha256:H("a"),reviewed_code_sha:"e".repeat(40),
   manifest_sha256:H("1"),rights_sha256:H("4"),
   external_review_sha256:this.sourceEvidence,
   externally_reviewed_at_utc:new Date("2027-02-10T04:00:00.000Z"),
   retention_not_after_utc:new Date(this.sourceExpiry)
  });
  if(sql.includes("count(*)::integer AS n"))
   return row({n:this.existing});
  if(sql.startsWith("INSERT INTO")){
   if(this.failInsert)throw Error("SQL 23505 duplicate");
   this.inserts.push({path:params?.[0],kind:params?.[3],bytes:params?.[11]});
   return{rowCount:1,rows:[]};
  }
  if(sql==="SELECT clock_timestamp() AS db_now")
   return row({db_now:new Date(this.now)});
  throw Error("UNEXPECTED_TEST_SQL");
 }
}
describe("V0094 signed private PostgreSQL registry-last publisher, default OFF",()=>{
 it("verifies real Ed25519 and existing SOURCE; inserts packets then registry in one transaction, no paid GO",async()=>{
  const f=fixture(),db=new FakeRestrictedPG();
  const result=await publishP5ExternalLaterShardToPrivatePg16Once(
   db,f.plan,f.wire,f.publicPem,f.pins,f.scope);
  expect(result.status).toBe(
   "EXTERNALLY_REVIEWED_PRIVATE_PG16_COMMIT_READBACK_REQUIRED_NO_GO");
  expect(result).toMatchObject({
   insertedPrivatePacketCount:1,insertedPrivateRowCount:2,
   independentPostCommitReadbackRequired:true,providerCalls:0,
   githubDispatches:0,phase6PaidGoGranted:false
  });
  expect(db.inserts.map(x=>x.kind)).toEqual([
   "LATER_PRE_PACKET","LATER_PRE_DAY_REGISTRY"]);
  expect(db.statements[0]).toContain("SERIALIZABLE READ WRITE");
  expect(db.statements.at(-1)).toBe("COMMIT");
  expect(db.statements.filter(x=>x==="COMMIT")).toHaveLength(1);
  expect(JSON.stringify(result)).not.toContain("leg:observed");
 });
 it("refuses missing approval without connecting",async()=>{
  const f=fixture(),db=new FakeRestrictedPG();
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   db,f.plan,f.wire,f.publicPem,f.pins,
   {...f.scope,phase6ProcessArmed:"1" as "0"}))
   .rejects.toThrow("MISSING_PRIVATE_ONLY_APPROVAL_OR_RESTRICTED_LOGIN");
  expect(db.statements).toHaveLength(0);
 });
 it("refuses DB owner/over-privileged identity and commits nothing",async()=>{
  const f=fixture(),db=new FakeRestrictedPG();
  db.actor="neondb_owner";
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   db,f.plan,f.wire,f.publicPem,f.pins,f.scope))
   .rejects.toThrow("PRECOMMIT_ABORT");
  expect(db.inserts).toHaveLength(0);
  expect(db.statements.at(-1)).toBe("ROLLBACK");
 });
 it("refuses wrong precommitted SOURCE reviewer evidence and existing registry",async()=>{
  const f=fixture(),db=new FakeRestrictedPG();
  db.sourceEvidence=H("0");
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   db,f.plan,f.wire,f.publicPem,f.pins,f.scope))
   .rejects.toThrow("PRECOMMIT_ABORT");
  expect(db.inserts).toHaveLength(0);
  const occupied=new FakeRestrictedPG();occupied.existing=1;
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   occupied,f.plan,f.wire,f.publicPem,f.pins,f.scope))
   .rejects.toThrow("PRECOMMIT_ABORT");
  expect(occupied.inserts).toHaveLength(0);
 });
 it("rejects altered signature and expiry before INSERT",async()=>{
  const f=fixture(),db=new FakeRestrictedPG();
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   db,f.plan,{...f.wire,signatureBase64:"x".repeat(88)},
   f.publicPem,f.pins,f.scope))
   .rejects.toThrow("PRECOMMIT_ABORT");
  expect(db.inserts).toHaveLength(0);
  const expired=new FakeRestrictedPG();
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   expired,f.plan,f.wire,f.publicPem,f.pins,{
    ...f.scope,approvedRetentionNotAfterUtc:"2027-02-10T04:30:00.000Z"
   })).rejects.toThrow("PRECOMMIT_ABORT");
  expect(expired.inserts).toHaveLength(0);
 });
 it("on any SQL INSERT failure rolls back without a COMMIT",async()=>{
  const f=fixture(),db=new FakeRestrictedPG();db.failInsert=true;
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   db,f.plan,f.wire,f.publicPem,f.pins,f.scope))
   .rejects.toThrow("PRECOMMIT_ABORT");
  expect(db.statements).not.toContain("COMMIT");
  expect(db.statements.at(-1)).toBe("ROLLBACK");
 });
 it("unknown COMMIT is never retried or subsequently ROLLBACKed",async()=>{
  const f=fixture(),db=new FakeRestrictedPG();db.uncertainCommit=true;
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   db,f.plan,f.wire,f.publicPem,f.pins,f.scope))
   .rejects.toThrow("UNKNOWN_COMMIT_INDEPENDENT_READBACK_NO_RETRY");
  expect(db.statements.filter(x=>x==="COMMIT")).toHaveLength(1);
  expect(db.statements.at(-1)).toBe("COMMIT");
 });
 it("missed native cutoff remains censored, not backfilled",async()=>{
  const f=fixture(),db=new FakeRestrictedPG();
  db.now="2027-02-10T05:55:00.000Z";
  await expect(publishP5ExternalLaterShardToPrivatePg16Once(
   db,f.plan,f.wire,f.publicPem,f.pins,f.scope))
   .rejects.toThrow("PRECOMMIT_ABORT");
  expect(db.inserts).toHaveLength(0);
 });
});
