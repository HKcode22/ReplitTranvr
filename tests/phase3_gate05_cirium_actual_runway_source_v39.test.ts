import {describe,it,expect} from "vitest";
import {inspectGate05CiriumRunwayShapeV39}
  from "../server/lib/disruption/gate05CiriumRunwaySourceAdmission_v39";
const utc=(v:string)=>({dateUtc:v});
describe("Gate05 true runway-source shape review remains cautious and missingness-aware",()=>{
 it("distinguishes exact named runway pair from estimate and gate-only data",()=>{
   const result=inspectGate05CiriumRunwayShapeV39([
     {flightId:1001,carrierFsCode:"SQ",operationalTimes:{
       scheduledRunwayDeparture:utc("2026-10-28T18:10:00.000Z"),
       actualRunwayDeparture:utc("2026-10-28T18:13:00.000Z"),
       estimatedRunwayDeparture:utc("2026-10-28T18:12:00.000Z")}},
     {flightId:1002,operationalTimes:{
       scheduledGateDeparture:utc("2026-10-28T18:10:00.000Z"),
       actualGateDeparture:utc("2026-10-28T18:25:00.000Z"),
       estimatedRunwayDeparture:utc("2026-10-28T18:35:00.000Z")}},
     {flightId:1003,operationalTimes:{
       scheduledRunwayDeparture:utc("2026-10-28T18:10:00.000Z"),
       actualRunwayDeparture:utc("2026-10-28T18:06:00.000Z")}},
     {flightId:1003,operationalTimes:{
       scheduledRunwayDeparture:utc("2026-02-30T18:10:00.000Z"),
       actualRunwayDeparture:utc("2026-10-28T18:06:00+05:00")}}
   ]);
   expect(result.sampleRows).toBe(4);
   expect(result.scheduledRunwayUtcValid).toBe(2);
   expect(result.actualRunwayUtcValid).toBe(2);
   expect(result.estimatedRunwayUtcValid).toBe(2);
   expect(result.independentlyNamedRunwayPairPresent).toBe(2);
   expect(result.estimatedOnlyInsteadOfActual).toBe(1);
   expect(result.noRunwayActualAndSchedulePair).toBe(2);
   expect(result.invalidNonemptyUtc).toBe(2);
   expect(result.provisionalDistinctProviderIds).toBe(3);
   expect(result.crossProviderOperatingLegJoinProven).toBe(false);
   expect(result.providerSourceAuthenticityProven).toBe(false);
   expect(result.prospectiveFeatureAsOfTProven).toBe(false);
   expect(result.actualPrimaryLabelApproved).toBe(false);
   expect(result.providerCalls).toBe(0);
   expect(result.databaseWrites).toBe(0);
 });
 it("missing true actual time is a nullable target, not a zero-minute delay",()=>{
  const r=inspectGate05CiriumRunwayShapeV39([{
    flightId:12,operationalTimes:{
      scheduledRunwayDeparture:utc("2026-10-28T08:00:00.000Z"),
      estimatedRunwayDeparture:utc("2026-10-28T08:07:00.000Z")
    }
  }]);
  expect(r.independentlyNamedRunwayPairPresent).toBe(0);
  expect(r.noRunwayActualAndSchedulePair).toBe(1);
  expect(r.nullableMissingTargetsAreAllowed).toBe(true);
 });
 it("never leaks identifiers, raw source, or dates in aggregate output",()=>{
  const r=inspectGate05CiriumRunwayShapeV39([{
    flightId:"PRIVATE_PROVIDER_ID",
    operationalTimes:{
      scheduledRunwayDeparture:utc("2026-10-28T08:00:00.000Z"),
      actualRunwayDeparture:utc("2026-10-28T07:51:00.000Z")
    }
  }]);
  expect(JSON.stringify(r)).not.toContain("PRIVATE_PROVIDER_ID");
  expect(JSON.stringify(r)).not.toContain("2026-10-28");
  expect(r.provisionalDistinctProviderIds).toBe(1);
 });
 it("rejects unbounded or non-array input without provider calls",()=>{
   expect(()=>inspectGate05CiriumRunwayShapeV39({flightStatuses:[]})).toThrow("GATE05_CIRIUM_SOURCE_ARRAY_INVALID");
   expect(()=>inspectGate05CiriumRunwayShapeV39(Array(2001).fill(null))).toThrow();
 });
});
