import type {P5Stage24ReviewedT24Receipt} from "./phase5T24WitnessedLaterHorizonGuard_v39";
export const P6_T24_CUSTODY_SCHEMA:"v39.phase6.t24-witness-custody-ed25519.v1";
export interface P6T24CustodyTrust {
 independentT24CustodyTrustApproved:boolean;runDayIndex:number;flightInstanceId:string;reviewedCodeSha:string;
 manifestSha256:string;rightsSha256:string;releaseSha256:string;policySha256:string;
 reviewerFingerprintSha256:string;reviewerPublicKeyPem:string;expectedFrameSha256:string;
 expectedConfigSha256:string;expectedSelectedTVersion:string;maximumRetentionHours:number;
 policyValidFromUtc:string;policyValidUntilUtc:string;
}
export interface P6T24CustodyScope {
 privateT24CustodyApproved:boolean;existingPaidDispatchApproved:boolean;adbAutoCollect:string;
 phase6ProcessArmed:string;expectedSessionLogin:string;
}
type Client={query:(sql:string,args?:any[])=>Promise<any>};
type Review={schema:string;audience:string;logicalPath:string;runDayIndex:number;packetSha256:string;receiptSha256:string;
 reviewedCodeSha:string;manifestSha256:string;rightsSha256:string;releaseSha256:string;policySha256:string;
 reviewedAtUtc:string;validUntilUtc:string;retentionNotAfterUtc:string;reviewerPublicKeyFingerprintSha256:string};
type Wire={review:Review;signatureBase64:string};
type Base={runDayIndex:number;scientificReviewCompleted:false;providerCalls:0;phase6PaidGo:false};
export function p6T24WitnessCustodyPath(trust:P6T24CustodyTrust):string;
export function p6T24WitnessCustodyPreimage(review:Review):Buffer;
export function verifyP6T24WitnessCustody(args:{trust:P6T24CustodyTrust;wire:Wire;packetBytes:Buffer;observedDbClockUtc:string}):
 {review:Review;receipt:P5Stage24ReviewedT24Receipt};
export function publishP6T24WitnessCustodyOnce(args:{client:Client;trust:P6T24CustodyTrust;wire:Wire;packetBytes:Buffer;scope:P6T24CustodyScope}):
 Promise<Base&{receiptSha256:string;independentReadbackRequired:true}>;
export function readP6T24WitnessCustodyOnce(args:{client:Client;trust:P6T24CustodyTrust;scope:P6T24CustodyScope}):
 Promise<Base&{receiptSha256:string;exactCustodyWireVerified:true;mayLaunchLaterPreAutomatically:false;databaseWrites:0;readonly privateReceipt:P5Stage24ReviewedT24Receipt}>;
export type P6T24CustodyDecision=
 | {flightInstanceId:string;status:"EXACT_CUSTODY_RECEIPT_AWAIT_SCIENTIFIC_REVIEW";receipt:P5Stage24ReviewedT24Receipt}
 | {flightInstanceId:string;status:"CUSTODY_ABSENT_NOT_NEGATIVE_T24_EVIDENCE"}
 | {flightInstanceId:string;status:"CUSTODY_INVALID_OR_EXPIRED_UNRESOLVED";reason:string};
export function readP6T24WitnessCustodyBatch(args:{client:Client;trusts:readonly P6T24CustodyTrust[];scope:P6T24CustodyScope}):
 Promise<Base&{status:"BOUNDED_T24_PRIVATE_CUSTODY_READ_ONLY_NOT_SCIENTIFIC_REVIEW";observedDbClockUtc:string;
 requestedCount:number;verifiedCount:number;absentCount:number;unresolvedCount:number;mayLaunchLaterPreAutomatically:false;
 databaseWrites:0;readonly privateDecisions:readonly P6T24CustodyDecision[]}>;
