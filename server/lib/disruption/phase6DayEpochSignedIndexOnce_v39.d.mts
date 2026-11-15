/** Type boundary for existing runtime-validated day-epoch JS verifier. */
export const P6_DAY_EPOCH_REVIEW_SCHEMA:"v39.phase6.day-epoch-index-external-review-ed25519.v1";
export const P6_DAY_EPOCH_REVIEW_AUDIENCE:"HKcode22/ReplitTranvr:PHASE6_DAY_EPOCH_INDEX_EXTERNAL_REVIEW";
export function p6DayEpochReviewPreimage(review:Record<string,unknown>):Buffer;
export function verifyP6DayEpochExternalReview(input:{
 wire:{review:Record<string,unknown>;signatureBase64:string};publicKeyPem:string;pins:Record<string,unknown>
}):{review:Record<string,unknown>;reviewedAtMs:number;validUntilMs:number;retentionNotAfterMs:number;signatureVerified:true;
 organizationalIndependenceCertifiedHere:false;providerContentsOrDerivedWorksRightsCertifiedHere:false};
export function validateP6DayEpochIndexBytes(bytes:Buffer,review:Record<string,unknown>):Record<string,unknown>;
export function readP6DayEpochRestrictedReaderClock(client:{query:(sql:string,values?:any[])=>Promise<any>},login:string):Promise<string>;
