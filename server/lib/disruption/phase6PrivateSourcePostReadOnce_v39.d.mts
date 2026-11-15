/** Type boundary for existing runtime-validated private SOURCE/POST JS verifier. */
export const P6_SOURCE_POST_REVIEW_SCHEMA:"v39.phase6.external-source-post-review-ed25519.v1";
export const P6_SOURCE_POST_REVIEW_AUDIENCE:"HKcode22/ReplitTranvr:PHASE6_PRIVATE_SOURCE_POST_REVIEW";
export function signedP6PrivateSourcePostReviewBytes(review:Record<string,unknown>):Buffer;
export function verifyP6ExternalSourcePostReview(wire:{review:Record<string,unknown>;signatureBase64:string},publicKeyPem:string,pins:Record<string,unknown>):{
 review:Record<string,unknown>;reviewedAtMs:number;retentionNotAfterMs:number;validUntilMs:number;
 ed25519SignatureCryptographicallyVerified:true;legalSourceRightsCertified:false;organizationalIndependenceCertified:false
};

export function readP6PrivateSourcePostOnce(
 client:{query:(sql:string,values?:any[])=>Promise<any>},
 pins:Record<string,unknown>,wire:{review:Record<string,unknown>;signatureBase64:string},publicKeyPem:string
):Promise<{readonly privateBytes:Buffer;readonly privateLogicalPath:string;redactedSummary:{
 schema:string;status:string;kind:"SOURCE_QUERY_PACKET"|"POST_PACKET";runDayIndex:number;shardIndex:number;
 contentSha256:string;observedDatabaseClockUtc:string;verifiedEd25519Review:true;
 independentlyAuthorizedProviderUseCertified:false;reviewerOrganizationalIndependenceCertified:false;
 actualPhase6PaidGoCertified:false;contentsWereCopiedToPublicLogs:false;providerCalls:0;databaseWrites:0;githubDispatches:0
}}>;
