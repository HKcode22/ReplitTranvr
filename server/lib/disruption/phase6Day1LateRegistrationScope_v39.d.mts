import type { P5DynamicDayGridInput } from "./phase5DynamicDaySourceGrid_v39";
import type { P5Slot,P5FidsHorizon } from "./phase5FidsFreezeGridAdmission_v39";
export interface P6Day1LatePins {
 policySha256:string;reviewerFingerprintSha256:string;originalDayPlanSha256:string;
 manifestSha256:string;calendarSha256:string;configSha256:string;frameSha256:string;reviewedCodeSha:string;
}
export interface P6Day1LateScopeArgs {
 policyBytes:Buffer;signatureBase64:string;reviewerPublicKeyPem:string;pins:P6Day1LatePins;dayPlanBytes:Buffer;
 observedDbUtc:string;
 calendarDay:{runDayIndex:number;scheduledStartUtc:string;drawType:string;
 calendarHash:string;configHash:string;frameHash:string;
 slotRegions:Record<P5Slot,string>;pairAirportSet:Record<P5Slot,{icao:string;region:string}>|null};
 futureCommittedDraws:{runDayIndex:number;icao:string}[];
 existingDrawRows:unknown[];sourceAttempts:number;otherRestReservations:number;unresolvedStops:number;
}
type Counts=Record<P5FidsHorizon,{planned:number;prospectiveCandidates:number;excluded:number}>;
export interface P6Day1LateScope {
 readonly schema:"v39.phase6.day1-late-registration-verified-scope.v1";readonly runDayIndex:1;
 readonly observedDbUtc:string;readonly policySha256:string;readonly manifestSha256:string;
 readonly calendarSha256:string;readonly configSha256:string;readonly frameSha256:string;
 readonly originalDayPlanSha256:string;readonly reviewedCodeSha:string;
 readonly fixedAirports:Readonly<Record<P5Slot,string>>;
 readonly candidateQueryCount:number;readonly excludedQueryCount:number;
 readonly remainingPreparationProjectionSha256:string;readonly byHorizon:Counts;
 readonly providerCalls:0;readonly databaseWrites:0;readonly authorizesPaidGet:false;readonly requiresRestrictedAtomicRegistration:true;
}
export interface P6Day1RemainingProjection {
 schema:"v39.phase6.day1-remaining-preparation-projection.v1";runDayIndex:1;
 originalDayPlanSha256:string;observedDbUtc:string;minimumPreparationLeadMinutes:number;
 pairedIcaos:Record<P5Slot,string>;expectedServiceStartUtc:string;
 reviewedSegmentedSource:NonNullable<P5DynamicDayGridInput["reviewedSegmentedSource"]>;
 reviewedRefreshTiming:NonNullable<P5DynamicDayGridInput["reviewedRefreshTiming"]>;
 plannedQueryDenominator:number;byHorizon:Counts;templates:P5DynamicDayGridInput["templates"];
 excluded:{queryKey:string;slot:P5Slot;horizon:P5FidsHorizon;scheduledRequestUtc:string;earliestPlannedCutoffUtc:string;reason:string}[];
 actualChargeDayUtcCounts:{physicalChargeDayUtc:string;plannedPhysicalGets:number;maximumCandidateApiUnits:number}[];
 maximumCandidateApiUnits:number;projectionSha256:string;authorizesPaidGet:false;databaseWrites:0;providerCalls:0;
}
export function verifyP6Day1LateRegistrationScope(args:P6Day1LateScopeArgs):P6Day1LateScope;
export function isVerifiedP6Day1LateScope(scope:unknown):scope is P6Day1LateScope;
export function readVerifiedP6Day1Projection(scope:unknown):P6Day1RemainingProjection;

export function verifyP6Day1CommittedLateScope(args:P6Day1LateScopeArgs):P6Day1LateScope;
