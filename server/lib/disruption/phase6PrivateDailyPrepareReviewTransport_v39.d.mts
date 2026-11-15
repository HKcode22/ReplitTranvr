import type {P5SignedOneDayPreparePacket} from "../../../scripts/v39_phase5_one_signed_day_source_prepare_github_owner_v39";
type Client={query:(sql:string,values?:any[])=>Promise<any>};
import type {P5TypedSourceBudgetBinding} from "./phase5TypedSourceBudgetBinding_v39.mjs";
type Trust=P5TypedSourceBudgetBinding&{
 independentDailyReviewerTrustApproved:true;runDayIndex:number;reviewedCodeSha:string;
 manifestSha256:string;calendarSha256:string;configSha256:string;frameSha256:string;
 releaseSha256:string;rightsSha256:string;providerContractSha256:string;
 policySha256:string;dayPlanSha256:string;reviewerFingerprintSha256:string;
 reviewedCategoryBudgetSha256:string;
 reviewerPublicKeyPem:string;maximumRetentionHours:number;policyValidFromUtc:string;policyValidUntilUtc:string
};
type Scope={privateDailyReviewTransportApproved:boolean;existingPaidDispatchApproved:boolean;
 adbAutoCollect:string;phase6ProcessArmed:string;expectedSessionLogin:string};
type Wire={review:Record<string,unknown>;signatureBase64:string};
export const P6_DAILY_PREPARE_REVIEW_SCHEMA:"v39.phase6.external-daily-prepare-review-ed25519.v1";
export function p6DailyPrepareReviewPreimage(review:Record<string,unknown>):Buffer;
export function publishP6DailyPrepareReviewOnce(args:{client:Client;trust:Trust;wire:Wire;packetBytes:Buffer;scope:Scope}):Promise<{
 runDayIndex:number;exactDailyPacketSha256:string;independentReadbackRequired:true;providerCalls:0;phase6PaidGo:false
}>;
export function readP6DailyPrepareReviewOnce(args:{client:Client;trust:Trust;scope:Scope}):Promise<{
 runDayIndex:number;exactDailyPacketSha256:string;verifiedOriginalReviewWire:true;providerCalls:0;databaseWrites:0;phase6PaidGo:false;
 readonly privatePacketBytes:Buffer;readonly privatePacket:P5SignedOneDayPreparePacket;readonly privateWire:Wire
}>;
