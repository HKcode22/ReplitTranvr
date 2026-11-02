import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {assessP4Nov2SourceReceiptV39,combineP4Nov2SourceReceiptsV39}
 from "../server/lib/disruption/phase4Gate5Nov2EphemeralReceiptsV39";
import type {Nov2HorizonV39} from
 "../server/lib/disruption/phase4Gate5Nov2EphemeralReceiptsV39";
const H:Record<Nov2HorizonV39,{starts:string[];deadline:string}>={
 "T-24h":{starts:[
  "2026-11-01T16:30:00.000Z","2026-11-01T17:00:00.000Z",
  "2026-11-01T17:30:00.000Z"],deadline:"2026-11-01T15:30:00.000Z"},
 "T-6h":{starts:[
  "2026-11-02T10:30:00.000Z","2026-11-02T11:00:00.000Z",
  "2026-11-02T11:30:00.000Z"],deadline:"2026-11-02T09:30:00.000Z"},
 "T-90m":{starts:[
  "2026-11-02T15:00:00.000Z","2026-11-02T15:30:00.000Z",
  "2026-11-02T16:00:00.000Z"],deadline:"2026-11-02T14:00:00.000Z"}
};
const SHA="aa9a9be29cf9778d3fcaef7b7f08a482d6a5307623453515d7022c62da723136";
function fixture(horizon:Nov2HorizonV39){
 const spec=H[horizon],n=horizon==="T-24h"?23:79;
 const prearm={
  status:"P4_G5_REAL_NOV2_HORIZON_GITHUB_PREARM_VERIFIED",
  horizon,githubRunId:"41402736335",jobStartedAtUtc:
   new Date(Date.parse(spec.deadline)-65*60000).toISOString(),
  githubVerifiedAtUtc:new Date(Date.parse(spec.deadline)-60*60000).toISOString(),
  frozenManifestSha256:SHA,plannedQueries:3,maxProviderAttempts:3,
  maxExpectedUnits:6,dbWrites:0,retainedSourceBytes:0,strictGate5Passed:false
 };
 const events:Record<string,unknown>[]=[prearm];
 spec.starts.forEach((planned,i)=>{
  events.push({status:"P4_G5_REAL_NOV2_ONE_ACTUAL_PAID_GET_STARTED",
   horizon,queryIndex:i,plannedUtc:planned,
   actualDispatchUtc:new Date(Date.parse(planned)+300).toISOString(),
   maxAttemptsForThisSlot:1});
  events.push({
   // Real Nov2 producer overwrites intended event status with report.status.
   status:"PROVIDER_FIELDS_OBSERVED_SEMANTICS_UNCERTIFIED",
   horizon,queryIndex:i,
   cutoffUtc:new Date(Date.parse(planned)+30*60000).toISOString(),
   receivedAtUtc:new Date(Date.parse(planned)+500).toISOString(),
   observedDepartureRecords:n,providerOperatorTaggedObservations:
    horizon==="T-24h"?8:23,
   providerMarketingTaggedObservations:horizon==="T-24h"?15:56,
   codeshareUnresolvedObservations:0,
   firstProviderNativeSelectedTCertified:false,
   runwayActualOnlyPerRecordCertified:false,
   confirmedOperatingLegPopulation:false,
   retainedSourceForFutureCohort:false,
   expectedTier2Units:2,headerDeltaMeasured:2,
   providerRequestAttempts:1,rawBodyPersisted:false,
   flightIdsPersisted:false,dbWrites:0,retries:0,
   strictGate5Passed:false
  });
 });
 events.push({
  status:"P4_G5_REAL_NOV2_AGGREGATE_HORIZON_CLOSED_SOURCE_ONLY",
  horizon,planned:3,providerRequestsAttempted:3,
  successfulSourceResponses:3,unknownOrUnobservedSlots:0,
  headerBasedUnitsMeasuredForMatching2UnitResponses:6,
  totalWorstCaseUnitsForThisHorizon:6,
  originalProviderContentPersisted:false,
  physicalUniqueFlightPopulationCertifiable:false,
  certifiedPrePersisted:false,selectedTVerified:false,
  actualOnlyRunwayLabelsVerified:false,strictGate5Passed:false,
  phase5FreezeAuthorized:false,phase6Authorized:false
 });
 const log=events.map(e=>"2026-11-02T11:30:00Z "+JSON.stringify(e)).join("\n");
 return {events,log};
}
const a=(h:Nov2HorizonV39,log:string,conclusion:"success"|"failure"|"in_progress"="success")=>
 assessP4Nov2SourceReceiptV39(h,conclusion,log);
describe("Nov2 source-only independent log-receipt consistency, no paid actions",()=>{
 it("uses the exact frozen manifest hash and rejects promotions to science",()=>{
  const f=readFileSync("data-collection/phase4/GATE5_WSSS_20261102_FROZEN_NONRETAINED_REAL_HORIZONS.json","utf8");
  expect(JSON.parse(f).rawOriginalRetentionAuthorized).toBe(false);
  const rs=(Object.keys(H) as Nov2HorizonV39[]).map(h=>a(h,fixture(h).log));
  for(const r of rs){
   expect(r.verdict).toBe("SOURCE_ONLY_LOGS_CONSISTENT");
   expect(r.observedPaidStarts).toBe(3);
   expect(r.successfulSourceReports).toBe(3);
   expect(r.measuredTwoUnitDeltas).toBe(6);
   expect(r.strictGate5Passed).toBe(false);
   expect(r.rawOriginalSourceAudited).toBe(false);
  }
  const combined=combineP4Nov2SourceReceiptsV39(rs);
  expect(combined.verdict).toBe("ALL_NINE_LOG_RECEIPTS_CONSISTENT_SOURCE_ONLY");
  expect(combined.paidStarts).toBe(9);
  expect(combined.measuredTwoUnitDeltas).toBe(18);
  expect(combined.distinctPhysicalFlights).toBeNull();
  expect(combined.verifiedActualOnlyWheelsOff).toBeNull();
  expect(combined.certifiedPersistedPRE).toBeNull();
  expect(combined.strictGate5Passed).toBe(false);
  expect(combined.providerCallsMadeByAudit).toBe(0);
  expect(combined.databaseWritesMadeByAudit).toBe(0);
  // These are only synthetic fixture numbers, never a claim of T90 billing.
 });
 it("live/inaccessible GitHub logs stay PENDING, not zero or failed",()=>{
  const x=assessP4Nov2SourceReceiptV39("T-90m","in_progress",null);
  expect(x.verdict).toBe("PENDING_UNVERIFIED");
  expect(x.observedPaidStarts).toBeNull();
  expect(x.successfulSourceReports).toBeNull();
  expect(combineP4Nov2SourceReceiptsV39([x]).paidStarts).toBeNull();
 });
 it("rejects duplicate, absent, delayed, corrupted and unsafely promoted receipts",()=>{
  const e=fixture("T-6h").events;
  const mutate=(fn:(xs:Record<string,unknown>[])=>void)=>{
   const cloned=e.map(x=>({...x}));fn(cloned);
   return a("T-6h",cloned.map(x=>JSON.stringify(x)).join("\n"));
  };
  const issues=[
   mutate(x=>{x[1].queryIndex=1;}),
   mutate(x=>{x.splice(3,1);}),
   mutate(x=>{x[0].frozenManifestSha256="0".repeat(64);}),
   mutate(x=>{x[0].githubVerifiedAtUtc="2026-11-02T10:00:00.000Z";}),
   mutate(x=>{x[1].actualDispatchUtc="2026-11-02T11:00:00.000Z";}),
   mutate(x=>{x[2].headerDeltaMeasured=99;}),
   mutate(x=>{x[2].runwayActualOnlyPerRecordCertified=true;}),
   mutate(x=>{x[2].rawBodyPersisted=true;}),
   mutate(x=>{x[2].providerOperatorTaggedObservations=79;}),
   mutate(x=>{x[x.length-1].successfulSourceResponses=4;}),
   mutate(x=>{x.push({status:"P4_G5_REAL_NOV2_QUERY_UNOBSERVED_TIMING",
    horizon:"T-6h",queryIndex:1,providerAttempted:0});})
  ];
  for(const r of issues){
   expect(r.verdict).toBe("HOLD_INCONSISTENT");
   expect(r.issueCodes.length).toBeGreaterThan(0);
   expect(r.measuredTwoUnitDeltas).toBeNull();
  }
  expect(a("T-6h",fixture("T-6h").log,"failure").verdict)
   .toBe("HOLD_INCONSISTENT");
 });
 it("treats missing complete horizons as unknown, not measured zero",()=>{
  const x=a("T-6h",fixture("T-6h").log);
  const missing=combineP4Nov2SourceReceiptsV39([x,x]);
  expect(missing.verdict).toBe("HOLD_INCOMPLETE_SOURCE_ONLY");
  expect(missing.paidStarts).toBeNull();
  expect(missing.measuredTwoUnitDeltas).toBeNull();
 });
 it("only emits anonymous field counts, not provider Content",()=>{
  const r=a("T-6h",fixture("T-6h").log);
  const printed=JSON.stringify(r);
  expect(printed).not.toMatch(/flightId|rawBody|flightNumber|tailNumber|scheduleTime|icao24/);
  expect(r.observationsPerSnapshot).toEqual([79,79,79]);
  expect(r.observedPaidStarts).toBe(3); // NOT 237 unique flights.
 });
});
