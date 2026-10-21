/**
 * DRAFT / OFFLINE ONLY. Derive a prospective independent STOP supervisor's
 * immutable scope/expiry inputs from the SAME detached signed Gate05 AUTH.
 *
 * No caller-supplied scopeId/expiresAt override is allowed. The crypto check
 * authenticates the supplied signer key only against an EXTERNALLY reviewed
 * fingerprint; it DOES NOT prove the signer belongs to the owner, constitute
 * human approval, attest provider terms, commission a role, or deploy a
 * continuously running STOP supervisor.
 */
import {
  verifyGate05DetachedApprovalSignatureV39,
  type Gate05Ed25519ReviewPinsV39
} from "./gate05DetachedEd25519Approval_v39";
import {inspectGate05ExactAuthArtifactV39} from "./gate05AuthorizationArtifact_v39";

export function previewGate05SignedExpiryGuardPlanV39(args:{
  authorizationBytes:Buffer;
  detachedSignatureBase64:string;
  signerPublicKeySpkiDerBase64:string;
  independentPins:Gate05Ed25519ReviewPinsV39;
}){
  // Verify the detached signature before exposing any operational inputs.
  const signed=verifyGate05DetachedApprovalSignatureV39(args);
  const reviewed=inspectGate05ExactAuthArtifactV39(
    args.authorizationBytes,args.independentPins
  );
  if(signed.scopeId!==reviewed.scopeId||
     signed.verifiedAuthorizationBytesSha256!==reviewed.reviewedByteSha256||
     signed.authorizationId!==reviewed.authorizationId)
    throw Error("GATE05_SIGNED_EXPIRY_INPUT_DIVERGENCE_HOLD");
  return {
    schema:"v39.gate05.signed-expiry-guard-plan.v1" as const,
    status:"SIGNED_EXPIRY_INPUT_PREVIEW_ONLY_NO_SUPERVISOR" as const,
    scopeId:reviewed.scopeId,
    expiresAtUtc:reviewed.expiresAtUtc,
    authorizationId:reviewed.authorizationId,
    reviewedAuthorizationSha256:reviewed.reviewedByteSha256,
    reviewedSignerSpkiSha256:signed.verifiedSignerSpkiSha256,
    sourceCommit:reviewed.sourceCommit,
    cryptographicSignatureVerified:true as const,
    ownerSignerIndependentlyAttested:false as const,
    humanPaidApprovalVerified:false as const,
    providerTariffAndRetentionVerified:false as const,
    productionSafetyLoginAuthenticated:false as const,
    continuousSupervisorLivenessVerified:false as const,
    independentlyDeployed:false as const,
    activationAuthorized:false as const,
    paidPilotAuthorized:false as const,
    databaseWrites:0 as const,
    providerRequests:0 as const
  };
}
