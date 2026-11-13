import {createHash,generateKeyPairSync,sign}
 from "node:crypto";
import {
 mkdtempSync,rmSync,chmodSync,writeFileSync,readFileSync,statSync,
 symlinkSync
} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {describe,it,expect,afterEach} from "vitest";
import {
 stageP5ExternallyReviewedLaterShardPrivatelyOnce,
 inspectP5PrivateLaterShardReadback,
 type P5PrivateShardPublishScope
} from "../server/lib/disruption/phase5PrivateWriteOnceLaterShardPublisher_v39";
import {
 digestP5LaterShardPrivatePacketFileManifest,
 signedP5ExternalLaterReviewBytes,
 type P5ExternalLaterReviewSignerPins,
 type P5Ed25519ExternalLaterShardReview,
 type P5Ed25519ReviewWireEnvelope
} from "../server/lib/disruption/phase5ExternalEd25519LaterShardReviewerVerify_v39";
import type {P5UnsignedLaterRegistryReviewPlan}
 from "../server/lib/disruption/phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39";
import type {P5SignedLaterPreDayRegistry}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
const H=(s:string)=>s.repeat(64);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const roots:string[]=[];
afterEach(()=>{for(const p of roots.splice(0))rmSync(p,{force:true,recursive:true});});
function fixture(){
 const root=mkdtempSync(join(tmpdir(),"phase5-private-ci-"));
 roots.push(root);chmodSync(root,0o700);
 const code="e".repeat(40);
 const sourcePath="data-collection/phase5/frozen/source_day_0004.json";
 const flightPath="data-collection/phase5/frozen/later_packet_0001.json";
 const registryPath="data-collection/phase5/frozen/later_day_shard_0001.json";
 const source:Buffer=Buffer.from(JSON.stringify({
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:H("1"),runDayIndex:4,entries:[{
   filePath:"data-collection/phase5/frozen/source_query_0001.json",
   expectedQueryDigestSha256:H("2"),expectedPacketSha256:H("b")
  }]
 }));
 writeFileSync(join(root,"source_day_0004.json"),source,{mode:0o600});
 chmodSync(join(root,"source_day_0004.json"),0o600);
 const packet:Buffer=Buffer.from(JSON.stringify({
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:code,
  independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:{
   flightInstanceId:"leg:test:future:0001",
   runDayIndex:4,manifestSha256:H("1"),
   expectedReviewedReleaseSha256:H("3"),
   expectedReviewedSourceRightsSha256:H("4"),
   queryDigestSha256:H("2"),
   horizon:"T-6h",
   selectedTNativeUtc:"2027-02-10T12:00:00.000Z",
   expectedSourcePopulationQueryId:
    "a23e4567-e89b-42d3-a456-426614174000",
   expectedSourceResponseSha256:H("a"),
   expectedProviderContractSha256:H("5"),
   expectedEarlyDrawSha256:H("6"),
   expectedGithubSourceRunId:"42899999999",
   identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG",
   externalNativeTPhysicalLegAndSourceUseReviewed:true,
   reviewedT24WitnessReceipt:{receiptSha256:H("7")}
  }
 }));
 const registry:P5SignedLaterPreDayRegistry={
  schema:"v39.phase5.signed-later-pre-day-registry.v1",
  manifestSha256:H("1"),reviewedCodeSha:code,
  sourceDayRegistrySha256:sha(source),
  sourceDayRegistryFilePath:sourcePath,runDayIndex:4,
  shardIndex:1,entries:[{
   filePath:flightPath,expectedPacketSha256:sha(packet),
   expectedQueryDigestSha256:H("2"),
   expectedFlightInstanceId:"leg:test:future:0001",
   expectedHorizon:"T-6h",
   expectedSelectedTNativeUtc:"2027-02-10T12:00:00.000Z",
   expectedSourcePopulationQueryId:
    "a23e4567-e89b-42d3-a456-426614174000",
   expectedT24ReceiptSha256:H("7")
  }]
 };
 const registryBytes=Buffer.from(JSON.stringify(registry));
 const plan:P5UnsignedLaterRegistryReviewPlan={
  schema:"v39.phase5.review-ready-later-pre-unsigned-registry-plan.v1",
  status:"REGISTRY_PACKET_BYTES_FOR_INDEPENDENT_EXTERNAL_SIGNATURE_NOT_PUBLISHED",
  sourceRegistrySha256:sha(source),
  proposedRegistrySha256:sha(registryBytes),
  proposedRegistryFilePath:registryPath,
  registryProposal:registry,
  registryProposalBytes:registryBytes,
  proposedPacketFiles:[{
   filePath:flightPath,sha256:sha(packet),bytes:packet
  }],
  redactedSummary:{
   runDayIndex:4,shardIndex:1,
   proposedFlightHorizons:1,T6:1,T90:0,
   reviewedT24Witnesses:1,separatelyReviewedNoT24:0,sourceQueryCount:1
  },
  independentlySignedRegistry:false,
  existingRegistryVerifierCalled:false,
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
  reviewedMainCodeSha:code,
  reviewedManifestSha256:H("1"),
  reviewedReleaseSha256:H("3"),
  reviewedRightsSha256:H("4"),
  sourceDayRegistrySha256:sha(source),
  sourceDayRegistryFilePath:sourcePath,
  proposedRegistrySha256:sha(registryBytes),
  proposedRegistryFilePath:registryPath,
  packetFileManifestSha256:
   digestP5LaterShardPrivatePacketFileManifest(plan),
  runDayIndex:4,shardIndex:1,
  reviewedAtUtc:"2027-02-10T04:59:00.000Z",
  validUntilUtc:"2027-02-10T08:00:00.000Z",
  independentReviewerEvidenceDigestSha256:H("9")
 };
 const wire=(signed=review):P5Ed25519ReviewWireEnvelope=>({
  schema:"v39.phase5.external-ed25519-later-shard-envelope.v1",
  review:signed,
  signatureBase64:sign(null,signedP5ExternalLaterReviewBytes(signed),
   privateKey).toString("base64")
 });
 const clock="2027-02-10T05:00:00.000Z";
 const scope:P5PrivateShardPublishScope={
  privateRootAbsolute:root,
  publicCheckoutAbsolute:process.cwd(),
  exactOwnerPrivateStorageApproved:true,
  adbAutoCollect:"0",phase6ProcessArmed:"0"
 };
 const publish=(scopeOverride=scope)=>{
  return stageP5ExternallyReviewedLaterShardPrivatelyOnce(
   plan,wire(),publicPem,pins,clock,scopeOverride);
 };
 return{
  root,source,packet,registryBytes,plan,scope,pins,
  review,wire,publicPem,clock,publish
 };
}
describe("external Ed25519-verified private 0700 write-once Phase6 later shard publication, never GH",()=>{
 it("writes exact 0600 flight and LAST registry bytes outside public checkout, readback digest only",()=>{
  const f=fixture(),receipt=f.publish();
  expect(receipt).toMatchObject({
   sourceRegistryPreexistedPrivate:true,privatePacketCount:1,
   newPrivateFiles:2,privateRegistryCommittedLast:true,
   privateRootOutsidePublicRepo:true,
   exportedPrivateFlightContentsInPublicRepo:false,
   githubConsumerCanReadPrivateRootHere:false,
   phase6PaidGoGranted:false,providerCalls:0,databaseWrites:0
  });
  const packetPath=join(f.root,"later_packet_0001.json");
  const registryPath=join(f.root,"later_day_shard_0001.json");
  expect(readFileSync(packetPath)).toEqual(f.packet);
  expect(readFileSync(registryPath)).toEqual(f.registryBytes);
  expect(statSync(packetPath).mode&0o777).toBe(0o600);
  expect(statSync(registryPath).mode&0o777).toBe(0o600);
  const x=inspectP5PrivateLaterShardReadback(f.plan,f.scope);
  expect(x.exactFileCount).toBe(2);
  expect(x.missingOrMismatchCount).toBe(0);
  expect(x.registryExact).toBe(true);
  expect(x.safeToBlindlyReplay).toBe(false);
  expect(JSON.stringify(x)).not.toContain("leg:test");
  expect(JSON.stringify(receipt)).not.toContain(f.root);
 });
 it("refuses a duplicate attempt even when identical, requires independent readback not auto replay",()=>{
  const f=fixture();f.publish();
  expect(()=>f.publish()).toThrow(
   "PARTIAL_OR_EXISTING_SHARD_HOLD_FOR_READBACK");
  expect(inspectP5PrivateLaterShardReadback(f.plan,f.scope)).
   toMatchObject({exactFileCount:2,missingOrMismatchCount:0});
 });
 it("refuses partially committed file without writing registry or replacing it",()=>{
  const f=fixture();
  const fpath=join(f.root,"later_packet_0001.json");
  writeFileSync(fpath,f.packet,{mode:0o600});
  expect(()=>f.publish()).toThrow(
   "PARTIAL_OR_EXISTING_SHARD_HOLD_FOR_READBACK");
  expect(inspectP5PrivateLaterShardReadback(f.plan,f.scope)).
   toMatchObject({exactFileCount:1,missingOrMismatchCount:1,
    registryExact:false,safeToBlindlyReplay:false});
 });
 it("refuses private directory in public checkout or permissions other than 0700",()=>{
  const f=fixture();
  expect(()=>f.publish({
   ...f.scope,privateRootAbsolute:process.cwd()
  })).toThrow("PRIVATE_ROOT_NOT_OWNED_0700_OUTSIDE_PUBLIC_CHECKOUT");
  chmodSync(f.root,0o755);
  expect(()=>f.publish()).toThrow(
   "PRIVATE_ROOT_NOT_OWNED_0700_OUTSIDE_PUBLIC_CHECKOUT");
 });
 it("refuses symlink private root, leaving the real storage untouched",()=>{
  const f=fixture();
  const alias=f.root+"_alias";
  roots.push(alias);
  symlinkSync(f.root,alias);
  expect(()=>f.publish({
   ...f.scope,privateRootAbsolute:alias
  })).toThrow("PRIVATE_ROOT_NOT_OWNED_0700_OUTSIDE_PUBLIC_CHECKOUT");
 });
 it("does not publish after source day SHA mismatch, forged signature or missing source",()=>{
  const f=fixture();
  writeFileSync(join(f.root,"source_day_0004.json"),Buffer.from(
   JSON.stringify({schema:"wrong",entries:[]})),{mode:0o600});
  expect(()=>f.publish()).toThrow(
   "SOURCE_DAY_PRIVATE_BYTES_NOT_PREEXISTING_EXTERNALLY_PINNED");
  const g=fixture();
  const forged={
   ...g.wire(),signatureBase64:Buffer.alloc(64,17).toString("base64")
  };
  expect(()=>stageP5ExternallyReviewedLaterShardPrivatelyOnce(
   g.plan,forged,g.publicPem,g.pins,g.clock,g.scope
  )).toThrow("EXTERNAL_REVIEW_SIGNATURE_INVALID");
  expect(inspectP5PrivateLaterShardReadback(g.plan,g.scope)).
   toMatchObject({exactFileCount:0,missingOrMismatchCount:2});
 });
 it("refuses unapproved private storage, changed paid flags, or retrospective cutoff",()=>{
  const f=fixture();
  expect(()=>f.publish({
   ...f.scope,exactOwnerPrivateStorageApproved:false as true
  })).toThrow("LOCAL_PRIVATE_ONLY_APPROVAL_NOT_GIVEN_OR_PAID_GATE_ARMED");
  expect(()=>f.publish({
   ...f.scope,phase6ProcessArmed:"1" as "0"
  })).toThrow("LOCAL_PRIVATE_ONLY_APPROVAL_NOT_GIVEN_OR_PAID_GATE_ARMED");
  const late="2027-02-10T05:46:00.000Z";
  expect(()=>stageP5ExternallyReviewedLaterShardPrivatelyOnce(
   f.plan,f.wire(),f.publicPem,f.pins,late,f.scope
  )).toThrow("LATE_OR_TOO_CLOSE_NATIVE_CUTOFF_NO_BACKFILL");
  expect(inspectP5PrivateLaterShardReadback(f.plan,f.scope)).
   toMatchObject({exactFileCount:0,registryExact:false});
 });
});
