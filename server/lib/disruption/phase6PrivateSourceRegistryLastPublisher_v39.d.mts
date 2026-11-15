/** Type boundary for existing runtime-validated private SOURCE registry verifier. */
export const P6_PRIVATE_SOURCE_REGISTRY_REVIEW_SCHEMA:"v39.phase6.external-source-day-registry-review-ed25519.v1";
export function sourceDayRegistryReviewPreimage(review:Record<string,unknown>):Buffer;
export function verifyP6ExternalSourceRegistryLastReview(wire:{review:Record<string,unknown>;signatureBase64:string},pem:string,pins:Record<string,unknown>):{
 review:Record<string,unknown>;reviewedAtMs:number;validUntilMs:number;expiresMs:number
};
