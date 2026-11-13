import {createHash,generateKeyPairSync,sign}
 from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 digestP5LaterShardPrivatePacketFileManifest,
 signedP5ExternalLaterReviewBytes,
 verifyP5ExternalEd25519ReviewOfLaterShard,
 type P5Ed25519ExternalLaterShardReview,
 type P5Ed25519ReviewWireEnvelope,
 type P5ExternalLaterReviewSignerPins
} from "../server/lib/disruption/phase5ExternalEd25519LaterShardReviewerVerify_v39";
import type {P5UnsignedLaterRegistryReviewPlan}
 from "../server/lib/disruption/phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39";
import type {P5SignedLaterPreDayRegistry}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
const H=(x:string)=>x.repeat(64);
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const t="2027-02-10T05:00:00.000Z";
function fixture(){
 const code="e".repeat(40);
 const packetPath="data-collection/phase5/frozen/later_packet_0001.json";
 const registryPath="data-collection/phase5/frozen/later_day_shard_0001.json";
 const sourcePath="data-collection/phase5/frozen/source_day_0004.json";
 const packetBytes=Buffer.from(JSON.stringify({
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:code,independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:{
   flightInstanceId:"leg:observed:00001",runDayIndex:4,
   horizon:"T-6h",selectedTNativeUtc:"2027-02-10T12:00:00.000Z",
   manifestSha256:H("1"),queryDigestSha256:H("2"),
   expectedSourceResponseSha256:H("a"),
   expectedSourcePopulationQueryId:
    "a23e4567-e89b-42d3-a456-426614174000",
   expectedGithubSourceRunId:"42899999999",
   expectedProviderContractSha256:H("5"),
   expectedEarlyDrawSha256:H("6"),
   expectedReviewedReleaseSha256:H("3"),
   expectedReviewedSourceRightsSha256:H("4"),
   identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG",
   externalNativeTPhysicalLegAndSourceUseReviewed:true,
   reviewedT24WitnessReceipt:{receiptSha256:H("3")}
  }
 }));
 const packetSha=digest(packetBytes);
 const sourceSha=H("a");
 const registry:P5SignedLaterPreDayRegistry={
  schema:"v39.phase5.signed-later-pre-day-registry.v1",
  manifestSha256:H("1"),reviewedCodeSha:code,
  sourceDayRegistrySha256:sourceSha,
  sourceDayRegistryFilePath:sourcePath,
  runDayIndex:4,shardIndex:1,entries:[{
   filePath:packetPath,expectedPacketSha256:packetSha,
   expectedQueryDigestSha256:H("2"),
   expectedFlightInstanceId:"leg:observed:00001",
   expectedHorizon:"T-6h",
   expectedSelectedTNativeUtc:"2027-02-10T12:00:00.000Z",
   expectedSourcePopulationQueryId:
    "a23e4567-e89b-42d3-a456-426614174000",
   expectedT24ReceiptSha256:H("3")
  }]
 };
 const registryBytes=Buffer.from(JSON.stringify(registry));
 const plan:P5UnsignedLaterRegistryReviewPlan={
  schema:"v39.phase5.review-ready-later-pre-unsigned-registry-plan.v1",
  status:"REGISTRY_PACKET_BYTES_FOR_INDEPENDENT_EXTERNAL_SIGNATURE_NOT_PUBLISHED",
  sourceRegistrySha256:sourceSha,
  proposedRegistrySha256:digest(registryBytes),
  proposedRegistryFilePath:registryPath,
  registryProposal:registry,registryProposalBytes:registryBytes,
  proposedPacketFiles:[{filePath:packetPath,sha256:packetSha,bytes:packetBytes}],
  redactedSummary:{
   runDayIndex:4,shardIndex:1,proposedFlightHorizons:1,T6:1,T90:0,
   reviewedT24Witnesses:1,separatelyReviewedNoT24:0,
   sourceQueryCount:1
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
 const keyFingerprint=digest(publicKey.export({type:"spki",format:"der"}));
 const evidence=H("9");
 const pins:P5ExternalLaterReviewSignerPins={
  expectedReviewerPublicKeyFingerprintSha256:keyFingerprint,
  expectedApprovedMainCodeSha:code,
  expectedReviewedReleaseSha256:H("3"),
  expectedReviewedRightsSha256:H("4"),
  expectedIndependentReviewerEvidenceDigestSha256:evidence
 };
 const review:P5Ed25519ExternalLaterShardReview={
  schema:"v39.phase5.external-ed25519-later-shard-review.v1",
  audience:"HKcode22/ReplitTranvr:PHASE6_LATER_PRE_REVIEW_ONLY",
  reviewerPublicKeyFingerprintSha256:keyFingerprint,
  reviewedMainCodeSha:code,reviewedManifestSha256:H("1"),
  reviewedReleaseSha256:H("3"),reviewedRightsSha256:H("4"),
  sourceDayRegistrySha256:sourceSha,
  sourceDayRegistryFilePath:sourcePath,
  proposedRegistrySha256:digest(registryBytes),
  proposedRegistryFilePath:registryPath,
  packetFileManifestSha256:
   digestP5LaterShardPrivatePacketFileManifest(plan),
  runDayIndex:4,shardIndex:1,
  reviewedAtUtc:"2027-02-10T04:59:00.000Z",
  validUntilUtc:"2027-02-10T08:00:00.000Z",
  independentReviewerEvidenceDigestSha256:evidence
 };
 const envelope=(x=review):P5Ed25519ReviewWireEnvelope=>({
  schema:"v39.phase5.external-ed25519-later-shard-envelope.v1",
  review:x,signatureBase64:sign(null,signedP5ExternalLaterReviewBytes(x),
   privateKey).toString("base64")
 });
 return{plan,pins,review,envelope,publicPem,privateKey};
}
describe("P5 actual externally pinned Ed25519 signature over complete unsigned later PRE shard bytes",()=>{
 it("verifies independently pinned ED25519 PUBLIC key over full exact private manifest, no GO",()=>{
  const f=fixture();
  const x=verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,f.envelope(),f.publicPem,f.pins,t);
  expect(x.signatureCryptographicallyVerified).toBe(true);
  expect(x.reviewerKeyExternallyPinnedFingerprintMatched).toBe(true);
  expect(x.reviewedRegistrySha256).toBe(f.plan.proposedRegistrySha256);
  expect(x.reviewedPacketManifestSha256)
   .toBe(digestP5LaterShardPrivatePacketFileManifest(f.plan));
  expect(x.privatePacketOrRegistryFilesPublished).toBe(0);
  expect(x.existingStage14OrV0091Called).toBe(false);
  expect(x.independentReviewerOrganizationalAuthorityCertifiedHere)
   .toBe(false);
  expect(x.lawfulProviderContentsUseCertifiedHere).toBe(false);
  expect(x.phase5ScientificFreezeGranted).toBe(false);
  expect(x.phase6PaidGoGranted).toBe(false);
  expect(JSON.stringify(x)).not.toContain("leg:observed");
 });
 it("refuses changed source, registry, private flight packet bytes and forged new manifest",()=>{
  const f=fixture(),w=f.envelope();
  const altered=Buffer.concat([
   f.plan.proposedPacketFiles[0].bytes,Buffer.from(" ")
  ]);
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard({
   ...f.plan,proposedPacketFiles:[
    {...f.plan.proposedPacketFiles[0],bytes:altered}
   ]
  },w,f.publicPem,f.pins,t))
   .toThrow("REVIEW_PROPOSAL_PRIVATE_PACKET_BYTES_OR_ORDER_CHANGED");
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard({
   ...f.plan,sourceRegistrySha256:H("b")
  },w,f.publicPem,f.pins,t))
   .toThrow("UNSIGNED_PROPOSAL_CHANGED_OR_SELF_APPROVED");
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard({
   ...f.plan,registryProposal:{
    ...f.plan.registryProposal,runDayIndex:5
   }
  },w,f.publicPem,f.pins,t))
   .toThrow("UNSIGNED_PROPOSAL_CHANGED_OR_SELF_APPROVED");
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,{...w,review:{...w.review,
    packetFileManifestSha256:H("c")}},
   f.publicPem,f.pins,t))
   .toThrow("EXTERNAL_REVIEW_DID_NOT_SIGN_THIS_PRIVATE_SHARD_AND_RIGHTS");
 });
 it("rejects an internally inconsistent rights claim inside a packet even if every candidate digest is rehashed",()=>{
  const f=fixture(),p=JSON.parse(f.plan.proposedPacketFiles[0].bytes.toString("utf8"));
  p.prePermit.expectedReviewedSourceRightsSha256=H("5");
  const bytes=Buffer.from(JSON.stringify(p));
  const registry={...f.plan.registryProposal,entries:[
   {...f.plan.registryProposal.entries[0],expectedPacketSha256:digest(bytes)}
  ]};
  const registryBytes=Buffer.from(JSON.stringify(registry));
  const changedPlan={...f.plan,
   registryProposal:registry,registryProposalBytes:registryBytes,
   proposedRegistrySha256:digest(registryBytes),
   proposedPacketFiles:[{
    ...f.plan.proposedPacketFiles[0],sha256:digest(bytes),bytes
   }]
  };
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   changedPlan,f.envelope(),f.publicPem,f.pins,t))
   .toThrow("REVIEWED_PACKET_NONJSON_OR_RIGHTS_MISMATCH");
 });
 it("rejects wrong public key, missing independent fingerprint or RSA impersonation",()=>{
  const f=fixture();
  const second=generateKeyPairSync("ed25519");
  const secondPem=second.publicKey.export({type:"spki",format:"pem"}).toString();
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,f.envelope(),secondPem,f.pins,t))
   .toThrow("PUBLIC_KEY_FINGERPRINT_NOT_INDEPENDENTLY_PINNED");
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,f.envelope(),f.publicPem,
   {...f.pins,expectedReviewerPublicKeyFingerprintSha256:H("0")},t))
   .toThrow("PUBLIC_KEY_FINGERPRINT_NOT_INDEPENDENTLY_PINNED");
  const rsa=generateKeyPairSync("rsa",{modulusLength:1024});
  const rsaPem=rsa.publicKey.export({type:"spki",format:"pem"}).toString();
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,f.envelope(),rsaPem,f.pins,t))
   .toThrow("NOT_ED25519_PUBLIC_KEY");
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,f.envelope(),
   f.privateKey.export({type:"pkcs8",format:"pem"}).toString(),
   f.pins,t)).toThrow("MISSING_INDEPENDENT_PINNED_PUBLIC_KEY_OR_RIGHTS");
 });
 it("refuses tampered valid-looking review and invalid 64-byte signature",()=>{
  const f=fixture(),wire=f.envelope();
  const wrong={...wire,review:{...wire.review,
   reviewedRightsSha256:H("5")}};
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,wrong,f.publicPem,f.pins,t))
   .toThrow("EXTERNAL_REVIEW_DID_NOT_SIGN_THIS_PRIVATE_SHARD_AND_RIGHTS");
  const altered={
   ...wire,review:{...wire.review,
    independentReviewerEvidenceDigestSha256:H("5")}
  };
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,altered,f.publicPem,f.pins,t))
   .toThrow("EXTERNAL_REVIEW_DID_NOT_SIGN_THIS_PRIVATE_SHARD_AND_RIGHTS");
  const badSig={
   ...wire,signatureBase64:Buffer.alloc(64,7).toString("base64")
  };
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,badSig,f.publicPem,f.pins,t))
   .toThrow("EXTERNAL_REVIEW_SIGNATURE_INVALID");
 });
 it("blocks expired, future-signed and cross-shard replay, even with newly signed bytes",()=>{
  const f=fixture();
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,f.envelope(),f.publicPem,f.pins,
   "2027-02-10T08:00:00.000Z"))
   .toThrow("REVIEW_SIGNATURE_PREMATURE_EXPIRED_OR_REPLAYED");
  const future={...f.review,reviewedAtUtc:"2027-02-10T05:30:00.000Z"};
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,f.envelope(future),f.publicPem,f.pins,t))
   .toThrow("REVIEW_SIGNATURE_PREMATURE_EXPIRED_OR_REPLAYED");
  const day={...f.review,runDayIndex:5};
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,f.envelope(day),f.publicPem,f.pins,t))
   .toThrow("EXTERNAL_REVIEW_DID_NOT_SIGN_THIS_PRIVATE_SHARD_AND_RIGHTS");
  const longer={...f.review,validUntilUtc:"2027-04-15T05:00:00.000Z"};
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   f.plan,f.envelope(longer),f.publicPem,f.pins,t))
   .toThrow("REVIEW_SIGNATURE_PREMATURE_EXPIRED_OR_REPLAYED");
 });
 it("does not permit caller to set GO or fake publication on original proposal",()=>{
  const f=fixture();
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   {...f.plan,phase6PaidGoGranted:true as false},
   f.envelope(),f.publicPem,f.pins,t))
   .toThrow("UNSIGNED_PROPOSAL_CHANGED_OR_SELF_APPROVED");
  expect(()=>verifyP5ExternalEd25519ReviewOfLaterShard(
   {...f.plan,flightFilesPublished:1 as 0},
   f.envelope(),f.publicPem,f.pins,t))
   .toThrow("UNSIGNED_PROPOSAL_CHANGED_OR_SELF_APPROVED");
 });
});
