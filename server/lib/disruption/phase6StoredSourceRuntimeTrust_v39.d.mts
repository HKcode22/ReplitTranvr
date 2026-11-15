/** Typed stable trust surface for the existing JavaScript exact reviewer verifier. */
export function readP6StableSourceTrust(env:NodeJS.ProcessEnv):Readonly<{
 independentStudyTrustPinsApproved:true;
 expectedReaderSessionLogin:string;
 reviewedCodeSha:string;
 manifestSha256:string;
 calendarSha256:string;
 releaseSha256:string;
 rightsSha256:string;
 dayReviewerFingerprintSha256:string;
 dayReviewerPublicKeyPem:string;
 queryReviewerFingerprintSha256:string;
 queryReviewerPublicKeyPem:string;
}>;
