/**
 * DRAFT / UNDEPLOYED. Composition of a crypto-verified Gate05 AUTH and the
 * exact PREPARED-only SQL plan. This is a REVIEW artifact, not an executor.
 *
 * A valid Ed25519 signature and key-fingerprint match establish only that
 * the artifact was signed by the holder of the supplied independently pinned
 * key. Human identity, spending consent, tariff/retention entitlements and
 * production commissioning permission are separate external trust decisions.
 */
import {
  verifyGate05DetachedApprovalSignatureV39,
  type Gate05Ed25519ReviewPinsV39
} from "./gate05DetachedEd25519Approval_v39";
import {
  planGate05PreparedOnlySqlV39,
  gate05PreparedCommissionInventorySqlV39
} from "./gate05AuthorizationArtifact_v39";

export function reviewGate05SignedPreparedCommissionV39(args:{
  authorizationBytes:Buffer;
  detachedSignatureBase64:string;
  signerPublicKeySpkiDerBase64:string;
  independentPins:Gate05Ed25519ReviewPinsV39;
}){
  const signed=verifyGate05DetachedApprovalSignatureV39(args);
  // Producing the SQL plan is downstream of successful cryptographic
  // verification; a changed raw artifact or substituted signer fails first.
  const plan=planGate05PreparedOnlySqlV39(
    args.authorizationBytes,args.independentPins
  );
  if(signed.verifiedAuthorizationBytesSha256!==plan.reviewedAuthorizationSha256||
     signed.scopeId!==plan.scopeId)
    throw Error("GATE05_SIGNED_COMMISSION_ARTIFACT_DIVERGENCE_HOLD");
  const inventory=gate05PreparedCommissionInventorySqlV39(plan.scopeId);
  return {
    schema:"v39.gate05.signed-prepared-commission-review.v1" as const,
    status:"VALID_SIGNATURE_PREPARED_SQL_REVIEW_ONLY_NO_LIVE_AUTH" as const,
    scopeId:plan.scopeId,
    authorizationId:signed.authorizationId,
    reviewedAuthorizationSha256:plan.reviewedAuthorizationSha256,
    reviewedSignerSpkiSha256:signed.verifiedSignerSpkiSha256,
    exactRowsSha256:plan.exactRowsSha256,
    plannedCommands:plan.commands,
    inventoryQuery:inventory,
    cryptographicSignatureVerified:true as const,
    independentlyAttestedOwnerIdentity:false as const,
    explicitHumanPaidAuthorizationVerified:false as const,
    providerTariffAndRetentionEntitlementsVerified:false as const,
    productionCommissioningAuthorized:false as const,
    productionActivationAuthorized:false as const,
    paidPilotAuthorized:false as const,
    productionDatabaseWrites:0 as const,
    providerRequests:0 as const
  };
}
