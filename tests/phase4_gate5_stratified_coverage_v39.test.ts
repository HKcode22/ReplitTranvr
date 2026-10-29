import {describe,it,expect} from "vitest";
import {assessP4Gate5StrataCandidates,type P4StrataInput,type P4StrataFidsFact}
 from "../server/lib/disruption/phase4Gate5StratifiedCoverage_v39";
const t="2026-10-29T12:00:00.000Z";
const scope={airport:"WSSS",tier:"HUB",region:"AS",
 serviceStartUtc:"2026-10-29T11:00:00.000Z",
 serviceEndUtc:"2026-10-29T15:00:00.000Z",
 receivedStartUtc:"2026-10-29T11:00:00.000Z",
 receivedEndUtc:"2026-10-29T15:00:00.000Z",
 auditAsOfUtc:"2026-10-29T16:00:00.000Z"};
const row=(id:string,at="2026-10-29T04:00:00.000Z",
 options:Partial<P4StrataFidsFact>={}):P4StrataFidsFact=>({
 flightId:id,queryId:id+"-"+at,airport:"WSSS",
 role:"requested_airport_primary",scope:"confirmed_core",
 codeshare:"confirmed_operating_leg",firstSelectedTUtc:t,
 movementScheduledUtc:t,availableAtUtc:at,
 departureCountry:"SG",arrivalCountry:"AU",
 carrierIata:"SQ",originIcao:"WSSS",destinationIcao:"YSSY",
 airportTimezone:"Asia/Singapore",
 sourceDepartureCountry:"SG",sourceArrivalCountry:"AU",...options
});
const web=(id:string)=>({flightId:id,airport:"WSSS",receivedAtUtc:"2026-10-29T13:00:00.000Z"});
const snap=(r:P4StrataFidsFact)=>({flightId:r.flightId,populationQueryId:r.queryId,
 horizon:"T-6h" as const,cutoffUtc:"2026-10-29T06:00:00.000Z",
 requiredComplete:false,optionalMissing:true,
 targetApplicable:false,targetObserved:false,targetSourceVerified:false});
const base:P4StrataInput={scope,fids:[],webhookResolved:[],snapshots:[],
 webhookItemsWithoutProvenIdentity:0};
const check=(x:Partial<P4StrataInput>)=>assessP4Gate5StrataCandidates({...base,...x});
describe("Phase4 Gate5 stratified candidate coverage, no fabricated PASS",()=>{
 it("zero source rows is UNMEASURABLE and ratios null",()=>{
  const x=check({});
  expect(x.publicCandidateCells).toEqual([]);
  expect(x.horizons[1].captureRate.candidateValue).toBeNull();
  expect(x.FidsReceiptCompletenessCertified).toBe(false);
  expect(x.populationRepresentativenessCertified).toBe(false);
  expect(x.strictGate5Passed).toBe(false);
 });
 it("three distinct primary flights grouped by route/carrier/country/local hour",()=>{
  const fids=[row("1"),row("2"),row("3")];
  const x=check({fids,webhookResolved:[web("1"),web("2")],
   snapshots:[snap(fids[0])],webhookItemsWithoutProvenIdentity:1});
  const g=x.publicCandidateCells.find(g=>g.horizon==="T-6h")!;
  expect(g.expected).toBe(3);expect(g.captured).toBe(2);
  expect(g.created).toBe(1);expect(g.operationalCountryType).toBe("INTERNATIONAL");
  expect(g.route).toBe("WSSS-YSSY");expect(g.operatingAirline).toBe("SQ");
  expect(g.airportLocalServiceHour).toBe("20");
  expect(x.unresolvedWebhookItems).toBe(1);
  expect(x.horizons[1].captureRate.candidateValue).toBeCloseTo(2/3);
  expect(x.horizons[1].snapshotRate.candidateValue).toBeCloseTo(1/3);
 });
 it("small cells suppressed, but parent eligible denominator retained",()=>{
  const x=check({fids:[row("one"),row("two")],webhookResolved:[web("one")]});
  expect(x.publicCandidateCells).toHaveLength(0);
  expect(x.horizons[1].candidateAsOfEligible).toBe(2);
  expect(x.horizons[1].suppressedSmallCellEligibleFlights).toBe(2);
 });
 it("unknown geography remains UNKNOWN, never derived by ICAO prefix",()=>{
  const x=check({fids:[row("1","2026-10-29T04:00:00.000Z",{
   sourceArrivalCountry:null}),row("2","2026-10-29T04:00:00.000Z",{
   sourceArrivalCountry:null}),row("3","2026-10-29T04:00:00.000Z",{
   sourceArrivalCountry:null})]});
  expect(x.publicCandidateCells.find(g=>g.horizon==="T-6h")?.operationalCountryType)
   .toBe("UNKNOWN");
 });
 it("known primary after cutoff differs from truly outside FIDS capture",()=>{
  const fids=[row("late","2026-10-29T11:00:00.000Z")];
  const x=check({fids,webhookResolved:[web("late"),web("outside")],
   webhookItemsWithoutProvenIdentity:3});
  const r=x.horizons[1];
  expect(r.capturedOutsideCandidatePrimary).toBe(1);
  expect(r.capturedKnownPrimaryButNotCutoffEligible).toBe(1);
  expect(r.noPopulationBeforeCutoff).toBe(1);
  expect(r.captureRate.candidateValue).toBeNull();
  expect(x.unresolvedWebhookItems).toBe(3);
 });
 it("post-cutoff FIDS cannot authorize an earlier snapshot",()=>{
  const fids=[row("1","2026-10-29T04:00:00.000Z"),
   row("1","2026-10-29T09:00:00.000Z")];
  const x=check({fids,snapshots:[snap(fids[1])]});
  expect(x.horizons[1].snapshotNotAsOfOrMismatched).toBe(1);
  expect(x.horizons[1].snapshotRate.candidateValue).toBe(0);
 });
 it("ambiguous marketing FIDS cannot make operated population",()=>{
  const x=check({fids:[row("1",undefined,{codeshare:"resolved_marketing"})],
   webhookResolved:[web("1")]});
  expect(x.horizons[1].candidateAsOfEligible).toBe(0);
  expect(x.horizons[1].capturedOutsideCandidatePrimary).toBe(1);
 });
 it("no initial T is separately counted, not a zero-coverage measurement",()=>{
  const x=check({fids:[row("1",undefined,{firstSelectedTUtc:null})]});
  expect(x.horizons[1].noInitialScheduleT).toBe(1);
  expect(x.horizons[1].captureRate.candidateValue).toBeNull();
 });
 it("invalid timezone and duplicate source identity fail",()=>{
  expect(()=>check({fids:[row("1",undefined,{airportTimezone:"Mars/Olympus"})]}))
   .toThrow("P4_STRATA_BAD_AIRPORT_TIMEZONE");
  const a=row("a");expect(()=>check({fids:[a,a]}))
   .toThrow("P4_STRATA_DUPLICATE_SOURCE_ROW");
 });
 it("missing webhook or optional features never removes snapshot expectation",()=>{
  const fids=[row("1"),row("2"),row("3")];
  const x=check({fids,snapshots:[snap(fids[0])]});
  expect(x.horizons[1].candidateAsOfEligible).toBe(3);
  expect(x.horizons[1].snapshotRate.candidateValue).toBeCloseTo(1/3);
  expect(x.horizons[1].captureRate.candidateValue).toBe(0);
 });
});
