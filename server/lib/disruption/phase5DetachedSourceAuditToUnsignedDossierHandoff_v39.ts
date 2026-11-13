/**
 * Phase5/6: DETACHED, externally pinned actual post-COMMIT SOURCE audit
 * bytes -> EXISTING unsigned PRE review dossier and 96-entry review pages.
 *
 * Input audit must have been captured in a SEPARATE earlier restricted SOURCE
 * read-only operation and externally approved by exact SHA. Never compute
 * or self-approve the expected audit SHA from the current raw bytes.
 *
 * In-memory only: no file IO/provider/PG/GitHub, no signed packet or PRE
 * task. Caller must arrange lawful private external review, custody,
 * independent physical leg/T and source rights before real packet signing.
 */
import {createHash} from "node:crypto";
import {
 digestP5ActualSourceCandidateAudit,
 type P5ActualSourceCandidateAudit
} from "./phase5ActualSourceNativeFlightCandidateAudit_v39";
import {
 buildP5UnsignedNativePreReviewDossier,
 digestP5UnsignedNativePreDossier,
 pageP5UnsignedNativePreReviewDossier,
 type P5UnsignedSourceDossierPins,
 type P5UnsignedNativePreDossier,
 type P5UnsignedNativePreReviewPage
} from "./phase5SourceBoundUnsignedPreDossier_v39";

const H=/^[a-f0-9]{64}$/;
const MAX_SOURCE_AUDIT_BYTES=4_000_000;
const fail=(reason:string):never=>{
 throw Error("REFUSED_P5_DETACHED_SOURCE_AUDIT_DOSSIER_"+reason);
};
const sha=(raw:Buffer)=>
 createHash("sha256").update(raw).digest("hex");

export interface P5DetachedActualSourceAuditPins
 extends P5UnsignedSourceDossierPins{
 /**
  * Signed *detached* audit readback receipt, NOT computed locally.
  * A hex SHA by itself is not a signature or lawful Contents permission.
  */
 independentlyReviewedExactAuditBytesSha256:string;
}
export interface P5DetachedSourceAuditDossierBundle{
 schema:"v39.phase5.detached-source-audit-to-unsigned-dossier.v1";
 status:"SOURCE_AUDIT_PINNED_BUT_PRE_PACKET_NOT_SIGNED";
 sourceAuditSha256:string;
 unsignedDossierSha256:string;
 unsignedDossier:P5UnsignedNativePreDossier;
 unsignedPages:P5UnsignedNativePreReviewPage[];
 redactedSummary:{
  runDayIndex:number;
  horizon:"T-24h"|"T-6h"|"T-90m";
  sourceObservedDbClockUtc:string;
  eligibleCandidateCount:number;
  censoredCandidateCount:number;
  unsignedPageCount:number;
  perFlightSourceMissingness:P5UnsignedNativePreDossier["perFlightSourceMissingness"];
 };
 externallyPinnedAuditHashVerified:true;
 independentlyReviewedPhysicalOperatingLegCertifiedHere:false;
 legallyPermittedProviderContentsUseCertifiedHere:false;
 existingStage14PermitCreated:false;
 signedPrePacketsIssued:0;githubChildDispatches:0;
 databaseReads:0;databaseWrites:0;providerCalls:0;
 phase5ScientificFreezeGranted:false;phase6PaidGoGranted:false;
}
/** Only safe-to-log aggregate and hashes. Do NOT JSON.stringify(bundle). */
export function summarizeP5DetachedSourceAuditDossier(
 bundle:P5DetachedSourceAuditDossierBundle
){
 if(!bundle||
    bundle.schema!=="v39.phase5.detached-source-audit-to-unsigned-dossier.v1"||
    bundle.existingStage14PermitCreated!==false||
    bundle.signedPrePacketsIssued!==0||
    bundle.phase6PaidGoGranted!==false||
    bundle.databaseWrites!==0)
  fail("UNVERIFIED_REDACTED_SOURCE_REVIEW_REPORT");
 return {
  status:bundle.status,
  sourceAuditSha256:bundle.sourceAuditSha256,
  unsignedDossierSha256:bundle.unsignedDossierSha256,
  ...bundle.redactedSummary,
  reviewedOperatingFlightIdentityCertified:false as const,
  providerRightsCertified:false as const,
  fullFlightIdsOrContentsEmitted:false as const,
  signedPrePacketsIssued:0 as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  phase5ScientificFreezeGranted:false as const,
  phase6PaidGoGranted:false as const
 };
}
export function projectP5DetachedActualSourceAuditToUnsignedReview(
 auditBytes:Buffer,pins:P5DetachedActualSourceAuditPins
):P5DetachedSourceAuditDossierBundle{
 if(!Buffer.isBuffer(auditBytes)||
    auditBytes.length<100||auditBytes.length>MAX_SOURCE_AUDIT_BYTES||
    !pins||
    !H.test(pins.expectedActualCandidateAuditSha256??"")||
    !H.test(pins.independentlyReviewedExactAuditBytesSha256??"")||
    pins.independentlyReviewedExactAuditBytesSha256!==
     pins.expectedActualCandidateAuditSha256||
    sha(auditBytes)!==pins.independentlyReviewedExactAuditBytesSha256)
  fail("SOURCE_AUDIT_BYTES_NOT_DISTINCTLY_SHA_PINNED");
 let audit:P5ActualSourceCandidateAudit;
 try{audit=JSON.parse(auditBytes.toString("utf8")) as P5ActualSourceCandidateAudit;}
 catch{return fail("NONJSON_DETACHED_SOURCE_AUDIT");}
 // Binary SHA protects the exact file; canonical serialization must also
 // match existing dossier's digest function, which uses JSON.stringify.
 // A pretty-printed or reordered audit needs a NEW external review of the
 // original canonical bytes, not an internal silent rewrite.
 if(JSON.stringify(audit)!==auditBytes.toString("utf8")||
    digestP5ActualSourceCandidateAudit(audit)!==
     pins.independentlyReviewedExactAuditBytesSha256)
  fail("NONCANONICAL_OR_UNREVIEWED_SOURCE_AUDIT_BYTES");
 const dossier=buildP5UnsignedNativePreReviewDossier(audit,pins);
 const pages=pageP5UnsignedNativePreReviewDossier(dossier);
 const dossierSha=digestP5UnsignedNativePreDossier(dossier);
 if(pages.some((p,i)=>
    p.sourceDossierSha256!==dossierSha||
    p.originalSourceAuditSha256!==
     pins.independentlyReviewedExactAuditBytesSha256||
    p.pageIndex!==i+1||p.totalPages!==pages.length||
    p.candidateCountInPage<1||p.candidateCountInPage>96||
    p.signedPacketsIssued!==0||p.paidPhase6GoGranted!==false)||
    pages.reduce((n,p)=>n+p.candidateCountInPage,0)!==
     dossier.candidateCount)
  fail("INCONSISTENT_UNSIGNED_REVIEW_PAGINATION");
 return {
  schema:"v39.phase5.detached-source-audit-to-unsigned-dossier.v1",
  status:"SOURCE_AUDIT_PINNED_BUT_PRE_PACKET_NOT_SIGNED",
  sourceAuditSha256:pins.independentlyReviewedExactAuditBytesSha256,
  unsignedDossierSha256:dossierSha,
  unsignedDossier:dossier,unsignedPages:pages,
  redactedSummary:{
   runDayIndex:dossier.runDayIndex,
   horizon:dossier.horizon,
   sourceObservedDbClockUtc:dossier.sourceObservedDbClockUtc,
   eligibleCandidateCount:dossier.candidateCount,
   censoredCandidateCount:dossier.censoredCount,
   unsignedPageCount:pages.length,
   perFlightSourceMissingness:dossier.perFlightSourceMissingness
  },
  externallyPinnedAuditHashVerified:true,
  independentlyReviewedPhysicalOperatingLegCertifiedHere:false,
  legallyPermittedProviderContentsUseCertifiedHere:false,
  existingStage14PermitCreated:false,
  signedPrePacketsIssued:0,githubChildDispatches:0,
  databaseReads:0,databaseWrites:0,providerCalls:0,
  phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
 };
}
