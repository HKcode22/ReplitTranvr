import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {auditP4ProviderNativeLineageV39,
 type P4ProviderNativeObservationV39,
 type P4NativeSemanticAuditScopeV39}
 from "../server/lib/disruption/phase4Gate5ProviderNativeLineage_v39";
const digest="a".repeat(64);
const scope=():P4NativeSemanticAuditScopeV39=>({
 airportIcao:"WSSS",
 serviceWindowStartUtc:"2026-11-04T17:00:00.000Z",
 serviceWindowEndUtc:"2026-11-04T18:00:00.000Z",
 auditUtc:"2026-11-04T19:00:00.000Z"
});
const row=(patch:Partial<P4ProviderNativeObservationV39>={}):P4ProviderNativeObservationV39=>({
 analyticIdentityId:"provisional-a",
 populationQueryId:"query-1",
 sourceAirportIcao:"WSSS",
 populationRole:"requested_airport_primary",
 codeshareStatus:"IsOperator",
 scopeClassification:"unknown",
 responseSha256:digest,memberResponseSha256:digest,
 sourceReceiptAvailableUtc:"2026-11-03T16:00:00.000Z",
 memberAvailableUtc:"2026-11-03T16:00:00.000Z",
 departureScheduledUtc:"2026-11-04T17:30:00.000Z",
 departureRevisedUtc:null,
 departureRunwayUtc:null,
 departureQuality:["Basic"],
 explicitDepartureAirportIcao:null,
 providerFlightId:null,
 originalRawRetained:true,
 ...patch
});
describe("Gate5 actual AeroDataBox contract: strict provisional clock, identity, label semantics",()=>{
 it("captures first observed generic T and retimes without changing the historical cutoff",()=>{
  const rows=[
   row({departureQuality:["Live"],departureRunwayUtc:"2026-11-04T17:42:00.000Z",
     departureRevisedUtc:"2026-11-04T17:39:00.000Z"}),
   row({populationQueryId:"query-2",
    sourceReceiptAvailableUtc:"2026-11-04T10:00:00.000Z",
    memberAvailableUtc:"2026-11-04T10:00:00.000Z",
    departureScheduledUtc:"2026-11-04T17:45:00.000Z",
    departureRevisedUtc:"2026-11-04T17:50:00.000Z"})
  ];
  const a=auditP4ProviderNativeLineageV39(rows,scope());
  expect(a.earliestScheduleVersionRetimedIdentities).toBe(1);
  expect(a.distinctProvisionalAnalyticsIdentities).toBe(1);
  expect(a.sourceAsOfByNominalHorizon.map(x=>x.observedSourceAtNominalCutoff))
   .toEqual([1,1,1]);
  expect(a.primaryWithLiveQuality).toBe(1);
  expect(a.primaryWithRunwayTime).toBe(1);
  expect(a.independentlyActualWheelsOffCount).toBeNull();
  expect(a.independentlyCertifiedFirstSelectedTCount).toBeNull();
  expect(a.confirmedPhysicalOperatingFlightCount).toBeNull();
  expect(a.scientificGate5Passed).toBe(false);
 });
 it("does not let a later FIDS source populate an earlier T−24h or T−6h horizon",()=>{
  const s=row({
    sourceReceiptAvailableUtc:"2026-11-04T12:00:00.000Z",
    memberAvailableUtc:"2026-11-04T12:00:00.000Z",
    codeshareStatus:"IsCodeshared",
    analyticIdentityId:"marketing-1"
  });
  const r=auditP4ProviderNativeLineageV39([s],scope());
  expect(r.primaryMarketingTagged).toBe(1);
  expect(r.sourceAsOfByNominalHorizon.map(x=>x.observedSourceAtNominalCutoff))
    .toEqual([0,0,1]);
  expect(r.sourceAsOfByNominalHorizon.map(x=>x.unobservedSourceAtNominalCutoff))
    .toEqual([1,1,0]);
  expect(r.confirmedPhysicalOperatingFlightCount).toBeNull();
 });
 it("opposite-movement context and missing explicit origin are not certified WSSS members",()=>{
  const r=auditP4ProviderNativeLineageV39([
    row({populationRole:"opposite_movement_context",analyticIdentityId:"context"}),
    row({populationQueryId:"query-2",analyticIdentityId:"primary",
      explicitDepartureAirportIcao:"WSSS",codeshareStatus:"Unknown"}),
    row({populationQueryId:"query-3",analyticIdentityId:"conflict",
      explicitDepartureAirportIcao:"YSSY",codeshareStatus:"IsCodeshared"})
  ],scope());
  expect(r.oppositeOrUnknownContextObservations).toBe(1);
  expect(r.primaryDepartureObservations).toBe(2);
  expect(r.primaryExplicitOriginAgreements).toBe(1);
  expect(r.primaryOriginConflicts).toBe(1);
  expect(r.primaryUnknownCodeshare).toBe(1);
  expect(r.primaryMarketingTagged).toBe(1);
  expect(r.providerOriginProvenanceAuthenticityVerified).toBe(false);
  expect(r.fullSourceDenominatorCertified).toBe(false);
 });
 it("rejects integrity mismatches and premature child availability instead of erasing source clocks",()=>{
  const a=auditP4ProviderNativeLineageV39([
    row({memberResponseSha256:"b".repeat(64)}),
    row({populationQueryId:"query-2",memberAvailableUtc:"2026-11-03T15:59:59.999Z"}),
    row({populationQueryId:"query-3",originalRawRetained:false}),
    row({populationQueryId:"query-4",sourceReceiptAvailableUtc:"2026-11-04T19:05:00.000Z",
     memberAvailableUtc:"2026-11-04T19:05:00.000Z"})
  ],scope());
  expect(a.rejectedMissingRawOrHashOrClock).toBe(3);
  expect(a.rejectedFutureAtAudit).toBe(1);
  expect(a.distinctProvisionalAnalyticsIdentities).toBe(0);
  expect(a.primaryDepartureObservations).toBe(0);
  expect(a.independentlyActualWheelsOffCount).toBeNull();
 });
 it("hard rejects ambiguous duplicates, malformed times, unknown qualities and false scopes",()=>{
  const a=row();
  expect(()=>auditP4ProviderNativeLineageV39([a,a],scope()))
    .toThrow("P4_NATIVE_DUPLICATE_QUERY_IDENTITY_ROLE");
  expect(()=>auditP4ProviderNativeLineageV39([row({
   departureScheduledUtc:"2026-11-04T17:30Z"
  })],scope())).toThrow("P4_NATIVE_INVALID_UTC:scheduled");
  expect(()=>auditP4ProviderNativeLineageV39([row({
   departureQuality:["High"] as any
  })],scope())).toThrow("P4_NATIVE_INVALID_SOURCE_RECORD");
  expect(()=>auditP4ProviderNativeLineageV39([row({
   sourceAirportIcao:"YSSY"
  })],scope())).toThrow("P4_NATIVE_INVALID_SOURCE_RECORD");
 });
 it("missing schedule or retrospective source are never silently valid population at cutoffs",()=>{
  const z=auditP4ProviderNativeLineageV39([
   row({departureScheduledUtc:null}),
   row({analyticIdentityId:"late",populationQueryId:"query-2",
     departureScheduledUtc:"2026-11-04T17:40:00.000Z",
     sourceReceiptAvailableUtc:"2026-11-04T16:50:00.000Z",
     memberAvailableUtc:"2026-11-04T16:50:00.000Z"})
  ],scope());
  expect(z.distinctProvisionalAnalyticsIdentities).toBe(2);
  expect(z.sourceAsOfByNominalHorizon.map(x=>x.candidateProvisionalIdentities))
   .toEqual([1,1,1]);
  expect(z.sourceAsOfByNominalHorizon.map(x=>x.unobservedSourceAtNominalCutoff))
   .toEqual([1,1,1]);
 });
 it("no real provider call, writes or downstream phase authorization",()=>{
  const r=auditP4ProviderNativeLineageV39([row()],scope());
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.certifiedPreSnapshotsWritten).toBe(false);
  expect(r.phase5FreezeAuthorized).toBe(false);
  expect(r.phase6Authorized).toBe(false);
  expect(r.actualDepartureLabelCaptureRate).toBeNull();
  const src=readFileSync("server/lib/disruption/phase4Gate5ProviderNativeLineage_v39.ts","utf8");
  expect(src).not.toContain("fetch(");
  expect(src).not.toContain("AERODATABOX_API_KEY");
  expect(src).not.toContain("INSERT INTO");
  expect(src).not.toContain("process.env");
 });
});