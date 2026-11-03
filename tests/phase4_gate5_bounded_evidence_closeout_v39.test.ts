import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 P4_G5_NOV2_VERIFIED_SOURCE_SUMMARIES_V39,
 P4_G5_NOV2_FROZEN_SHA256_V39,
 evaluateP4G5FiniteSourceCloseoutV39,
 classifyP4G5TimeEvidenceV39,
 planP4G5ConservativeRetentionDeadlineV39
} from "../server/lib/disruption/phase4Gate5BoundedEvidenceCloseout_v39";

const input=()=>JSON.parse(JSON.stringify(P4_G5_NOV2_VERIFIED_SOURCE_SUMMARIES_V39));
describe("Phase4 Gate5 bounded real Nov2 closure, NOT science GO",()=>{
 it("matches audited nine slots and 18 units while refusing invented unique legs/PRE/targets",()=>{
  const x=evaluateP4G5FiniteSourceCloseoutV39(input());
  expect(x.status).toBe("SOURCE_ONLY_OPERATIONAL_DIAGNOSTIC_COMPLETE_SCIENTIFIC_HOLD");
  expect(x.manifestSha256).toBe(P4_G5_NOV2_FROZEN_SHA256_V39);
  expect(x.successfulPhysicalFidsGets).toBe(9);
  expect(x.headerMeasuredApiUnits).toBe(18);
  expect(x.missedOrUnknownPaidSlots).toBe(0);
  expect(x.auditProvedGithubLogsConsistent).toBe(true);
  expect(x.independentProviderWireTransportSigned).toBe(false);
  expect(x.byHorizon.map(h=>h.repeatedSnapshotObservationRows))
   .toEqual([69,237,236]);
  expect(x.byHorizon.map(h=>h.sourceOperatorTaggedRows))
   .toEqual([21,69,68]);
  expect(x.byHorizon.map(h=>h.sourceMarketingTaggedRows))
   .toEqual([0,168,168]);
  expect(x.byHorizon.map(h=>h.unresolvedCodeshareRoleRows))
   .toEqual([48,0,0]);
  expect(x.byHorizon.map(h=>h.runwayTimeFieldPresentRows))
   .toEqual([0,0,0]);
  for(const horizon of x.byHorizon){
   for(const key of ["uniquePhysicalOperatingFlights",
    "firstProviderNativeSelectedT","verifiedFlightSpecificPRE",
    "actualOnlyWheelsOffLabels","independentWebhookCapturedFlightCount",
    "outsideFidsPopulationWebhookCount",
    "targetApplicablePopulationCount","exactLabelObservationRate"] as const)
    expect(horizon[key]).toBeNull();
  }
  expect(x.noOriginalSourceContentsRetained).toBe(true);
  expect(x.nativeSelectedTVerified).toBe(false);
  expect(x.perValueActualOnlyWheelsOffVerified).toBe(false);
  expect(x.fullSourceToSnapshotProspectiveCohortVerified).toBe(false);
  expect(x.scientificGate5Passed).toBe(false);
  expect(x.phase5FreezeAuthorized).toBe(false);
  expect(x.phase6Authorized).toBe(false);
  expect(x.paidProviderCallsMadeByThisReport).toBe(0);
  expect(x.databaseWritesMadeByThisReport).toBe(0);
 });
 it("cannot pass with alternate manifest, audit verdict or phantom success",()=>{
  const altered=[
   (v:any)=>v.frozenManifestSha256="0".repeat(64),
   (v:any)=>v.independentGithubAuditRunId=41477141870,
   (v:any)=>v.independentAuditVerdict="ALL_NINE_LOG_RECEIPTS_CONSISTENT_SCIENCE_PASS",
   (v:any)=>v.slots.pop(),
   (v:any)=>v.slots[0].originalGithubRunId=0,
   (v:any)=>v.slots[0].queryIndex=2,
   (v:any)=>v.slots[0].apiUnitsMeasuredFromHeader=0,
   (v:any)=>v.slots[0].providerRequestAttempts=2,
   (v:any)=>v.slots[0].rawBodyPersisted=true,
   (v:any)=>v.slots[0].flightIdsPersisted=true,
   (v:any)=>v.slots[0].observedDepartureRecords=79,
   (v:any)=>v.slots[0].codeshareUnresolvedObservations=0,
   (v:any)=>v.slots[3].providerMarketingTaggedObservations=0,
   (v:any)=>v.slots[8].providerOperatorTaggedObservations=23,
   (v:any)=>v.slots[8].runwayTimeFieldPresent=1
  ];
  for(const change of altered){
   const bad=input();change(bad);
   expect(()=>evaluateP4G5FiniteSourceCloseoutV39(bad)).toThrow(/HOLD/);
  }
 });
 it("does not call observed provider runwayTime a verified actual runway label",()=>{
  for(const kind of ["GENERIC_SCHEDULED_TIME","GENERIC_REVISED_TIME",
    "RUNWAY_TIME_ACTUAL_OR_ESTIMATED",
    "ADSB_LOL_INFERRED_TAKEOFF_WINDOW","MISSING_VALUE"] as const){
   const x=classifyP4G5TimeEvidenceV39(kind);
   expect(x.scientificTargetEligible).toBe(false);
   expect(x.independentScheduledTEquivalenceVerified).toBe(false);
   expect(x.actualOnlyWheelsOffVerified).toBe(false);
   expect(x.exactRunwayDelayMinutes).toBeNull();
   expect(x.missingLabelReason).toBe(kind==="MISSING_VALUE"?
    "NOT_OBSERVED":"SOURCE_MILESTONE_OR_ACTUALITY_NOT_VERIFIED");
  }
  expect(()=>classifyP4G5TimeEvidenceV39("FAKE_ACTUAL" as any)).toThrow();
 });
 it("computes conservative source expiry as min(purpose, cache, 24h project cap, 7-day maximum)",()=>{
  const t="2026-11-04T10:00:00.000Z";
  const base={
   sourceAvailableAtUtc:t,requestedAuditAtUtc:"2026-11-04T10:40:00.000Z",
   purposeEndsAtUtc:"2026-11-08T00:00:00.000Z",
   projectSelfCapHours:24,cacheControlMaxAgeSeconds:null
  };
  const a=planP4G5ConservativeRetentionDeadlineV39(base);
  expect(a.conservativeCandidateDeleteByUtc).toBe("2026-11-05T10:00:00.000Z");
  expect(a.requestedAuditWouldStillBeInsideCandidateLimit).toBe(true);
  expect(a.retentionOrNewPaidCollectionAuthorized).toBe(false);
  expect(a.independentlyVerifiedPurposeAndSubscriptionRights).toBe(false);
  expect(a.independentlyVerifiedPerResponseCacheControl).toBe(false);
  expect(a.automaticProductionPurgeInstalled).toBe(false);
  expect(a.normalizedFlightLevelDataDeclaredDerivedWork).toBe(false);
  const b=planP4G5ConservativeRetentionDeadlineV39({
   ...base,cacheControlMaxAgeSeconds:1200
  });
  expect(b.conservativeCandidateDeleteByUtc).toBe("2026-11-04T10:20:00.000Z");
  expect(b.requestedAuditWouldStillBeInsideCandidateLimit).toBe(false);
  const c=planP4G5ConservativeRetentionDeadlineV39({
   ...base,purposeEndsAtUtc:"2026-11-04T10:10:00.000Z"
  });
  expect(c.conservativeCandidateDeleteByUtc).toBe("2026-11-04T10:10:00.000Z");
 });
 it("refuses zero/invalid retention ceilings and malformed timestamps",()=>{
  const base={
   sourceAvailableAtUtc:"2026-11-04T10:00:00.000Z",
   requestedAuditAtUtc:"2026-11-04T10:05:00.000Z",
   purposeEndsAtUtc:"2026-11-05T10:00:00.000Z",
   projectSelfCapHours:24,cacheControlMaxAgeSeconds:null
  };
  for(const v of [
   {...base,projectSelfCapHours:25},
   {...base,projectSelfCapHours:0},
   {...base,projectSelfCapHours:3.5},
   {...base,cacheControlMaxAgeSeconds:0},
   {...base,cacheControlMaxAgeSeconds:-1},
   {...base,cacheControlMaxAgeSeconds:7*86400+1},
   {...base,sourceAvailableAtUtc:"2026-11-04T10:00Z"},
   {...base,purposeEndsAtUtc:"2026-11-04T09:00:00.000Z"}
  ])expect(()=>planP4G5ConservativeRetentionDeadlineV39(v)).toThrow();
 });
 it("all code remains offline and future production gates stay null",()=>{
  const src=readFileSync(
   "server/lib/disruption/phase4Gate5BoundedEvidenceCloseout_v39.ts","utf8");
  for(const bad of ["fetch(","process.env","INSERT INTO",
   "UPDATE clean.","DELETE FROM","AERODATABOX_API_KEY","ADSB_LOL_API_KEY"])
    expect(src).not.toContain(bad);
  const admission=JSON.parse(readFileSync(
   "data-collection/phase4/GATE5_NEXT_FROZEN_COHORT_READONLY_AUDIT_HOLD.json","utf8"));
  expect(admission.mode).toBe("HOLD_NO_REVIEWED_NEXT_COHORT");
  expect(admission.strictGate5Passed).toBe(false);
  expect(admission.providerCallsAuthorized).toBe(false);
  expect(admission.databaseWritesAuthorized).toBe(false);
 });
});
