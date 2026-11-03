import {describe,expect,it} from "vitest";
import {
 measureP4G5G5AScheduleRevisionV39,
 type G5AScheduleTargetInputV39,
 type G5AOriginalScheduleObservationV39
} from "../server/lib/disruption/phase4Gate5G5AScheduleRevisionOutcome_v39";

const SHA="a".repeat(64);
const provider="FIDS-PROVIDER-LEG-9482";
const Q1="11111111-1111-4111-8111-111111111111";
const Q2="22222222-2222-4222-8222-222222222222";
const Q3="33333333-3333-4333-8333-333333333333";
const T="2026-11-05T02:00:00.000Z";
const W="2026-11-05T04:00:00.000Z";
const ORIGINAL="2026-11-04T19:35:00.000Z";
const POST="2026-11-04T23:35:00.000Z";
const expires=(stamp:string)=>new Date(Date.parse(stamp)+86400000).toISOString();
const obs=(queryId:string,at:string,schedule:string,mutate:Partial<G5AOriginalScheduleObservationV39>={})=>({
 queryId,sourceOriginalSha256:SHA,
 availableAtUtc:at,sourceUseExpiresAtUtc:expires(at),
 nativeScheduledDepartureUtc:schedule,
 providerFlightId:provider,operatingRole:"CONFIRMED_OPERATING" as const,
 operatorFlightNumber:"SQ115",originIcao:"WSSS",destinationIcao:"YSSY",
 ...mutate
});
const input=(observations:G5AOriginalScheduleObservationV39[]):G5AScheduleTargetInputV39=>({
 reviewedManifestSha256:SHA,
 horizon:"T-6h",
 firstObservedNativeTAtUtc:T,
 assessmentWatermarkUtc:W,
 reviewedProviderFlightId:provider,
 operatorFlightNumber:"SQ115",
 originIcao:"WSSS",destinationIcao:"YSSY",
 observations
});
describe("G5A prospective flight-schedule revision classifier",()=>{
 it("identifies >=15 min genuine reported retime on same provider flight ID",()=>{
  const x=measureP4G5G5AScheduleRevisionV39(input([
   obs(Q1,ORIGINAL,T),
   obs(Q2,POST,"2026-11-05T02:20:00.000Z")
  ]));
  expect(x.status).toBe("OBSERVED_REVISION_GE_15_MIN");
  expect(x.scheduledRevisionMinutes).toBe(20);
  expect(x.identityLinkKind).toBe("EXPLICIT_PROVIDER_ID_AND_OPERATING_LEG_MATCH");
  expect(x.outcomeIsScheduledRevisionNotActualDelay).toBe(true);
  expect(x.actualDepartureDelayClaimed).toBe(false);
  expect(x.scientificGate5Passed).toBe(false);
  expect(JSON.stringify(x)).not.toContain(provider);
  expect(JSON.stringify(x)).not.toContain(Q1);
 });
 it("observed no large retime is not falsely called actual on-time departure",()=>{
  const x=measureP4G5G5AScheduleRevisionV39(input([
   obs(Q1,ORIGINAL,T),obs(Q2,POST,"2026-11-05T02:08:00.000Z")
  ]));
  expect(x.status).toBe("OBSERVED_REVISION_LT_15_MIN");
  expect(x.scheduledRevisionMinutes).toBe(8);
  expect(x.actualDepartureDelayClaimed).toBe(false);
 });
 it("missing post-cutoff reobservation is UNKNOWN, never negative",()=>{
  const x=measureP4G5G5AScheduleRevisionV39(input([obs(Q1,ORIGINAL,T)]));
  expect(x.status).toBe("UNKNOWN_NO_POSTCUTOFF_REOBSERVATION");
  expect(x).not.toHaveProperty("scheduledRevisionMinutes");
 });
 it("source only arriving after cutoff cannot be retrospective PRE",()=>{
  const x=measureP4G5G5AScheduleRevisionV39(input([
   obs(Q1,POST,T),
   obs(Q2,"2026-11-05T03:00:00.000Z","2026-11-05T02:20:00.000Z")
  ]));
  expect(x.status).toBe("UNKNOWN_NO_ASOF_BASELINE");
 });
 it("later revisions cannot manufacture earlier first-native reference T",()=>{
  const x=measureP4G5G5AScheduleRevisionV39(input([
   obs(Q1,ORIGINAL,"2026-11-05T02:10:00.000Z"),
   obs(Q2,POST,T)
  ]));
  expect(x.status).toBe("UNKNOWN_NATIVE_T_UNAVAILABLE");
 });
 it("no stable provider ID, mismatched ID, or marketing role is not linkable",()=>{
  const base=[obs(Q1,ORIGINAL,T),obs(Q2,POST,"2026-11-05T02:25:00.000Z")];
  expect(measureP4G5G5AScheduleRevisionV39({
   ...input(base),reviewedProviderFlightId:null
  }).status).toBe("UNKNOWN_IDENTITY_UNVERIFIED");
  expect(measureP4G5G5AScheduleRevisionV39(input([
   base[0],{...base[1],providerFlightId:"another-id"}
  ])).status).toBe("UNKNOWN_IDENTITY_UNVERIFIED");
  expect(measureP4G5G5AScheduleRevisionV39(input([
   base[0],{...base[1],operatingRole:"MARKETING"}
  ])).status).toBe("UNKNOWN_IDENTITY_UNVERIFIED");
 });
 it("expired/badly retained source cannot create an observed outcome",()=>{
  const x=measureP4G5G5AScheduleRevisionV39(input([
   obs(Q1,ORIGINAL,T,{sourceUseExpiresAtUtc:ORIGINAL}),
   obs(Q2,POST,T,{sourceUseExpiresAtUtc:POST})
  ]));
  expect(x.status).toBe("UNKNOWN_SOURCE_INVALID_OR_EXPIRED");
 });
 it("no missing initial T or missing quality is relabeled as observed",()=>{
  expect(measureP4G5G5AScheduleRevisionV39({
   ...input([obs(Q1,ORIGINAL,T)]),firstObservedNativeTAtUtc:null
  }).status).toBe("UNKNOWN_NATIVE_T_UNAVAILABLE");
  const x=measureP4G5G5AScheduleRevisionV39(input([
   obs(Q1,ORIGINAL,T,{nativeScheduledDepartureUtc:null}),
   obs(Q2,POST,T,{nativeScheduledDepartureUtc:null})
  ]));
  expect(x.status).toBe("UNKNOWN_SOURCE_INVALID_OR_EXPIRED");
 });
 it("refuses duplicate source request identity and arbitrary outcome watermark",()=>{
  const base=obs(Q1,ORIGINAL,T);
  expect(()=>measureP4G5G5AScheduleRevisionV39(input([
   base,obs(Q1,POST,"2026-11-05T02:20:00.000Z")
  ]))).toThrow("P4_G5_G5A_DUPLICATE_QUERY_HOLD");
  expect(()=>measureP4G5G5AScheduleRevisionV39({
   ...input([base]),assessmentWatermarkUtc:"2026-11-04T19:00:00.000Z"
  })).toThrow("P4_G5_G5A_FROZEN_WATERMARK_HOLD");
 });
 it("negative 15-minute and exactly +/- 15 minute revisions are deterministic",()=>{
  for(const [final,expected] of [
   ["2026-11-05T01:45:00.000Z",-15],
   ["2026-11-05T02:15:00.000Z,15]
  ] as const){
   const x=measureP4G5G5AScheduleRevisionV39(input([
    obs(Q1,ORIGINAL,T),obs(Q2,POST,final)
   ]));
   expect(x.status).toBe("OBSERVED_REVISION_GE_15_MIN");
   expect(x.scheduledRevisionMinutes).toBe(expected);
  }
 });
 it("does not look ahead to observations received after W",()=>{
  const x=measureP4G5G5AScheduleRevisionV39(input([
   obs(Q1,ORIGINAL,T),
   obs(Q2,POST,"2026-11-05T02:05:00.000Z"),
   obs(Q3,"2026-11-05T04:15:00.000Z","2026-11-05T05:00:00.000Z")
  ]));
  expect(x.status).toBe("OBSERVED_REVISION_LT_15_MIN");
  expect(x.scheduledRevisionMinutes).toBe(5);
 });
});
