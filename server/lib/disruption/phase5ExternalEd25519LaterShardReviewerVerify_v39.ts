/**
 * Phase5/6 offline EXTERNAL review-signature verification, never signing.
 *
 * The reviewer's Ed25519 PUBLIC key fingerprint must already be independently
 * pinned outside this function. This module never accepts a private key,
 * issues a signature, uploads provider Contents, approves legal rights,
 * publishes files, registers V0091, or grants Phase6 GO.
 *
 * A SHA alone is not an external signature. A valid signature only proves
 * that the holder of the matched key signed these exact byte digests;
 * organizational independence, authority and lawful Contents/ML use remain
 * separate reviews. Caller must obtain observedDbClockUtc from real PG16.
 */
import {createHash,createPublicKey,verify}
 from "node:crypto";
import type {P5UnsignedLaterRegistryReviewPlan}
 from "./phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39";

const SHA=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const DOMAIN="HKcode22/ReplitTranvr:PHASE6_NATIVE_LATER_PRE_SHARD_EXTERNAL_REVIEW:v1\n";
const AUDIENCE="HKcode22/ReplitTranvr:PHASE6_LATER_PRE_REVIEW_ONLY";
const SOURCE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const D=86_400_000;
const fail=(msg:string):never=>{
 throw Error("REFUSED_P5_EXTERNAL_LATER_ED25519_REVIEW_"+msg);
};
const hash=(buf:Buffer)=>createHash("sha256").update(buf).digest("hex");
const utf=(value:unknown)=>Buffer.from(JSON.stringify(value),"utf8");
function at(x:unknown):number{
 if(typeof x!=="string"||!UTC.test(x)||
    !Number.isFinite(Date.parse(x))||
    new Date(x).toISOString()!==x)
  fail("INVALID_REAL_DB_OR_EXTERNAL_REVIEW_UTC");
 return Date.parse(x as string);
}
/** A canonical SHA of the SOURCE-linked exact order of private packet bytes. */
export function digestP5LaterShardPrivatePacketFileManifest(
 plan:P5UnsignedLaterRegistryReviewPlan
):string{
 if(!plan||!Array.isArray(plan.proposedPacketFiles)||
    plan.proposedPacketFiles.length<1||
    plan.proposedPacketFiles.length>96)
  fail("UNVERIFIED_OR_UNBOUNDED_PACKET_MANIFEST");
 return hash(utf(plan.proposedPacketFiles.map(f=>({
  filePath:f.filePath,sha256:f.sha256
 }))));
}
export interface P5Ed25519ExternalLaterShardReview {
 schema:"v39.phase5.external-ed25519-later-shard-review.v1";
 audience:"HKcode22/ReplitTranvr:PHASE6_LATER_PRE_REVIEW_ONLY";
 reviewerPublicKeyFingerprintSha256:string;
 reviewedMainCodeSha:string;
 reviewedManifestSha256:string;
 reviewedReleaseSha256:string;
 reviewedRightsSha256:string;
 sourceDayRegistrySha256:string;
 sourceDayRegistryFilePath:string;
 proposedRegistrySha256:string;
 proposedRegistryFilePath:string;
 packetFileManifestSha256:string;
 runDayIndex:number;
 shardIndex:number;
 reviewedAtUtc:string;
 validUntilUtc:string;
 /** External evidence reference only; this does not check Contents rights. */
 independentReviewerEvidenceDigestSha256:string;
}
export interface P5Ed25519ReviewWireEnvelope{
 schema:"v39.phase5.external-ed25519-later-shard-envelope.v1";
 review:P5Ed25519ExternalLaterShardReview;
 signatureBase64:string;
}
export interface P5ExternalLaterReviewSignerPins{
 expectedReviewerPublicKeyFingerprintSha256:string;
 expectedApprovedMainCodeSha:string;
 expectedReviewedReleaseSha256:string;
 expectedReviewedRightsSha256:string;
 expectedIndependentReviewerEvidenceDigestSha256:string;
}
export function signedP5ExternalLaterReviewBytes(
 review:P5Ed25519ExternalLaterShardReview
):Buffer{
 // An exportable, deterministic signing preimage for an INDEPENDENT
 // signer. No sign() or private-key operation is used by this module.
 return Buffer.concat([Buffer.from(DOMAIN,"utf8"),utf(review)]);
}
export interface P5VerifiedEd25519ExternalLaterReviewReceipt{
 schema:"v39.phase5.external-ed25519-later-shard-verified.v1";
 status:"EXTERNAL_REVIEW_SIGNATURE_MATCHES_PROPOSED_PRIVATE_SHARD_NOT_PUBLISHED";
 reviewerKeyFingerprintSha256:string;
 reviewedRegistrySha256:string;
 reviewedSourceDayRegistrySha256:string;
 reviewedPacketManifestSha256:string;
 reviewerEvidenceDigestSha256:string;
 reviewedMainCodeSha:string;
 runDayIndex:number;
 shardIndex:number;
 observedDbClockUtc:string;
 signatureCryptographicallyVerified:true;
 reviewerKeyExternallyPinnedFingerprintMatched:true;
 independentReviewerOrganizationalAuthorityCertifiedHere:false;
 lawfulProviderContentsUseCertifiedHere:false;
 privatePacketOrRegistryFilesPublished:0;
 existingStage14OrV0091Called:false;
 githubDispatches:0;databaseReads:0;databaseWrites:0;
 providerCalls:0;paidProviderCalls:0;
 phase5ScientificFreezeGranted:false;phase6PaidGoGranted:false;
}
/**
 * Verify only after independent SHA-pinned external public key is available.
 * Pass real external PG16 clock; this pure function cannot authenticate
 * clock provenance. Production still needs independently reviewed runtime
 * identity/clock/rights and separate safe private publisher.
 */
export function verifyP5ExternalEd25519ReviewOfLaterShard(
 plan:P5UnsignedLaterRegistryReviewPlan,
 wire:P5Ed25519ReviewWireEnvelope,
 reviewerPublicKeyPem:string,
 pins:P5ExternalLaterReviewSignerPins,
 observedDbClockUtc:string
):P5VerifiedEd25519ExternalLaterReviewReceipt{
 let parsedRegistry:unknown;
 try{parsedRegistry=JSON.parse(plan?.registryProposalBytes?.toString("utf8")??"");}
 catch{return fail("UNSIGNED_PROPOSAL_CHANGED_OR_SELF_APPROVED");}
 if(!plan||
    plan.schema!=="v39.phase5.review-ready-later-pre-unsigned-registry-plan.v1"||
    plan.status!==
      "REGISTRY_PACKET_BYTES_FOR_INDEPENDENT_EXTERNAL_SIGNATURE_NOT_PUBLISHED"||
    plan.independentlySignedRegistry!==false||
    plan.existingRegistryVerifierCalled!==false||
    plan.flightFilesPublished!==0||
    plan.registeredV0091Tasks!==0||
    plan.githubDispatches!==0||plan.databaseWrites!==0||
    plan.providerCalls!==0||plan.phase6PaidGoGranted!==false||
    !Buffer.isBuffer(plan.registryProposalBytes)||
    plan.registryProposalBytes.length<100||
    plan.registryProposalBytes.length>250_000||
    !Array.isArray(plan.proposedPacketFiles)||
    plan.proposedPacketFiles.length<1||
    plan.proposedPacketFiles.length>96||
    plan.proposedRegistrySha256!==hash(plan.registryProposalBytes)||
    JSON.stringify(parsedRegistry)!==
      JSON.stringify(plan.registryProposal)||
    !SOURCE.test(plan.registryProposal?.sourceDayRegistryFilePath??"")||
    !FILE.test(plan.proposedRegistryFilePath??"")||
    plan.registryProposal.sourceDayRegistrySha256!==
      plan.sourceRegistrySha256||
    plan.registryProposal.runDayIndex<1||
    plan.registryProposal.runDayIndex>31||
    !Number.isSafeInteger(plan.registryProposal.shardIndex)||
    plan.registryProposal.shardIndex<1||
    plan.registryProposal.shardIndex>100_000||
    !Array.isArray(plan.registryProposal.entries)||
    plan.registryProposal.entries.length!==plan.proposedPacketFiles.length)
  fail("UNSIGNED_PROPOSAL_CHANGED_OR_SELF_APPROVED");
 const files=new Set<string>();
 for(let i=0;i<plan.proposedPacketFiles.length;i++){
  const file=plan.proposedPacketFiles[i];
  const entry=plan.registryProposal.entries[i];
  if(!file||!entry||!FILE.test(file.filePath)||
     files.has(file.filePath)||
     entry.filePath!==file.filePath||
     !Buffer.isBuffer(file.bytes)||file.bytes.length<100||
     file.bytes.length>200_000||
     file.sha256!==hash(file.bytes)||
     entry.expectedPacketSha256!==file.sha256)
   fail("REVIEW_PROPOSAL_PRIVATE_PACKET_BYTES_OR_ORDER_CHANGED");
  files.add(file.filePath);
 }
 if(!pins||!
    [pins.expectedReviewerPublicKeyFingerprintSha256,
     pins.expectedReviewedReleaseSha256,
     pins.expectedReviewedRightsSha256,
     pins.expectedIndependentReviewerEvidenceDigestSha256].every(x=>
       typeof x==="string"&&SHA.test(x))||
    !CODE.test(pins.expectedApprovedMainCodeSha??"")||
    typeof reviewerPublicKeyPem!=="string"||
    reviewerPublicKeyPem.length<100||
    reviewerPublicKeyPem.length>5000||
    !reviewerPublicKeyPem.includes("-----BEGIN PUBLIC KEY-----")||
    reviewerPublicKeyPem.includes("PRIVATE KEY"))
  fail("MISSING_INDEPENDENT_PINNED_PUBLIC_KEY_OR_RIGHTS");
 let key:ReturnType<typeof createPublicKey>;
 try{key=createPublicKey(reviewerPublicKeyPem);}
 catch{return fail("NOT_ED25519_PUBLIC_KEY");}
 if(key.asymmetricKeyType!=="ed25519")
  fail("NOT_ED25519_PUBLIC_KEY");
 const fingerprint=hash(key.export({format:"der",type:"spki"}) as Buffer);
 if(fingerprint!==pins.expectedReviewerPublicKeyFingerprintSha256)
  fail("PUBLIC_KEY_FINGERPRINT_NOT_INDEPENDENTLY_PINNED");
 const review=wire?.review;
 if(!review||Object.keys(wire).length!==3||wire.schema!==
      "v39.phase5.external-ed25519-later-shard-envelope.v1"||
    review.schema!=="v39.phase5.external-ed25519-later-shard-review.v1"||
    review.audience!==AUDIENCE||
    Object.keys(review).length!==17||
    review.reviewerPublicKeyFingerprintSha256!==fingerprint||
    review.reviewedMainCodeSha!==pins.expectedApprovedMainCodeSha||
    review.reviewedMainCodeSha!==plan.registryProposal.reviewedCodeSha||
    review.reviewedManifestSha256!==plan.registryProposal.manifestSha256||
    review.reviewedReleaseSha256!==
      pins.expectedReviewedReleaseSha256||
    review.reviewedRightsSha256!==pins.expectedReviewedRightsSha256||
    review.sourceDayRegistrySha256!==plan.sourceRegistrySha256||
    review.sourceDayRegistryFilePath!==
      plan.registryProposal.sourceDayRegistryFilePath||
    review.proposedRegistrySha256!==plan.proposedRegistrySha256||
    review.proposedRegistryFilePath!==plan.proposedRegistryFilePath||
    review.packetFileManifestSha256!==
      digestP5LaterShardPrivatePacketFileManifest(plan)||
    review.runDayIndex!==plan.registryProposal.runDayIndex||
    review.shardIndex!==plan.registryProposal.shardIndex||
    review.independentReviewerEvidenceDigestSha256!==
      pins.expectedIndependentReviewerEvidenceDigestSha256)
  fail("EXTERNAL_REVIEW_DID_NOT_SIGN_THIS_PRIVATE_SHARD_AND_RIGHTS");
 const now=at(observedDbClockUtc),signedAt=at(review.reviewedAtUtc),
   expire=at(review.validUntilUtc);
 if(signedAt>now||expire<=now||expire<=signedAt||
    expire-signedAt>31*D)
  fail("REVIEW_SIGNATURE_PREMATURE_EXPIRED_OR_REPLAYED");
 const b64=wire.signatureBase64;
 if(typeof b64!=="string"||!/^[A-Za-z0-9+/]{86}==$/.test(b64))
  fail("MALFORMED_ED25519_SIGNATURE");
 const signature=Buffer.from(b64,"base64");
 if(signature.length!==64||signature.toString("base64")!==b64)
  fail("NONCANONICAL_ED25519_SIGNATURE");
 if(!verify(null,signedP5ExternalLaterReviewBytes(review),key,signature))
  fail("EXTERNAL_REVIEW_SIGNATURE_INVALID");
 return{
  schema:"v39.phase5.external-ed25519-later-shard-verified.v1",
  status:"EXTERNAL_REVIEW_SIGNATURE_MATCHES_PROPOSED_PRIVATE_SHARD_NOT_PUBLISHED",
  reviewerKeyFingerprintSha256:fingerprint,
  reviewedRegistrySha256:plan.proposedRegistrySha256,
  reviewedSourceDayRegistrySha256:plan.sourceRegistrySha256,
  reviewedPacketManifestSha256:review.packetFileManifestSha256,
  reviewerEvidenceDigestSha256:review.independentReviewerEvidenceDigestSha256,
  reviewedMainCodeSha:review.reviewedMainCodeSha,
  runDayIndex:review.runDayIndex,shardIndex:review.shardIndex,
  observedDbClockUtc,
  signatureCryptographicallyVerified:true,
  reviewerKeyExternallyPinnedFingerprintMatched:true,
  independentReviewerOrganizationalAuthorityCertifiedHere:false,
  lawfulProviderContentsUseCertifiedHere:false,
  privatePacketOrRegistryFilesPublished:0,
  existingStage14OrV0091Called:false,
  githubDispatches:0,databaseReads:0,databaseWrites:0,
  providerCalls:0,paidProviderCalls:0,
  phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
 };
}
