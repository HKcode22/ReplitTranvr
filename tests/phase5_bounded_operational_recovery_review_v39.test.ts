import {describe,it,expect} from "vitest";
import {
 P5_BOUNDED_RECOVERY_REVIEW_SCHEMA,
 digestP5PrelistedFallbackCandidates,
 reviewP5PrelistedCalendarRecovery
} from "../server/lib/disruption/phase5BoundedOperationalRecoveryReview_v39.mjs";
const sha=(c:string)=>c.repeat(64);
const DAY=86400000,HOUR=3600000;
const start=(index:number)=>new Date(Date.UTC(2027,1,1)+(index-1)*4*DAY+
  12*HOUR).toISOString();
const plus=(iso:string,ms:number)=>new Date(Date.parse(iso)+ms).toISOString();
function day(i:number){
 const pair=i<=5?i:i>=7&&i<=11?i-6:null;
 const name=pair?"pair-"+pair:null;
 const sites=pair?["WSSS","OMAA","SKBO","YSSY"]:[];
 return {
  runDayIndex:i,startUtc:start(i),endUtc:plus(start(i),4*HOUR),
  utcSlot:"12",windowShape:"4h",
  partition:i<=20?"train":i<=25?"validation":"test",
  pairId:name,selectedAirports:sites
 };
}
function input(index=16){
 const d=day(index);
 const candidates=[{rank:1,startUtc:plus(d.startUtc,DAY),
   endUtc:plus(d.endUtc,DAY)}];
 const incident={
  cause:"GITHUB_FAILURE_BEFORE_SOURCE",
  detectedAtUtc:plus(d.startUtc,-2*DAY),
  sourcePhysicalReservations:0,sourceOriginalBindings:0,preRows:0,
  callbackReceipts:0,postOriginalBindings:0,savedEarlyDrawRows:0
 };
 return{
  schema:P5_BOUNDED_RECOVERY_REVIEW_SCHEMA,
  manifestSha256:sha("a"),reviewedCalendarSha256:sha("b"),
  protectedTestOutcomeValuesInspected:false,
  plannedDay:d,
  otherPlannedDays:Array.from({length:31},(_,k)=>day(k+1))
   .filter(x=>x.runDayIndex!==index),
  incident,prelistedAtUtc:plus(d.startUtc,-3*DAY),candidates,
  externallyReviewedFallbackSetSha256:
   digestP5PrelistedFallbackCandidates(sha("b"),index,candidates)
 };
}
function pin(x:ReturnType<typeof input>){
 x.externallyReviewedFallbackSetSha256=
  digestP5PrelistedFallbackCandidates(
   x.reviewedCalendarSha256,x.plannedDay.runDayIndex,x.candidates);
 return x;
}
describe("Phase5 bounded prospective calendar recovery triage without paid GO",()=>{
 it("screens first prelisted future date and returns only unsigned review",()=>{
  const r=reviewP5PrelistedCalendarRecovery(input());
  expect(r.status).toBe(
   "FIRST_PRELISTED_BACKUP_STRUCTURALLY_ELIGIBLE_FOR_INDEPENDENT_REVIEW");
  expect(r.backupRank).toBe(1);
  expect(r.needsExactNewCalendarManifestSha256).toBe(true);
  expect(r.needsIndependentUpdatedRESTAndAlertBudgets).toBe(true);
  expect(r.originalFailureAndAnyMissingnessMustRemainAppendOnly).toBe(true);
  expect(r.futureUnknownOrdinaryAirportWashoutRequiresLiveReadback).toBe(true);
  expect(r.automaticRetiming).toBe(false);
  expect(r.actualDbCalendarOrSourceCustodyIndependentlyRead).toBe(false);
  expect(r.scientificPhase5FreezePassed).toBe(false);
  expect(r.paidPhase6GoGranted).toBe(false);
  expect(r.paidProviderCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.githubDispatches).toBe(0);
 });
 it("continues eligible source work with missing optional weather or ADSB",()=>{
  const x=input();x.incident.cause="OPTIONAL_WEATHER_OR_ADSB_MISSING";
  expect(reviewP5PrelistedCalendarRecovery(x).status)
   .toBe("CONTINUE_ORIGINAL_WINDOW_RECORD_OPTIONAL_MISSINGNESS");
 });
 it("holds budget, security, source-use rights and retention",()=>{
  for(const cause of ["BUDGET_OR_SECURITY_HOLD","SOURCE_RIGHTS_OR_RETENTION_HOLD"]){
   const x=input();x.incident.cause=cause;
   expect(reviewP5PrelistedCalendarRecovery(x).status)
    .toBe("HOLD_RIGHTS_OR_PHYSICAL_BUDGET_NO_RESCHEDULE");
  }
 });
 it("never erases partially reserved, observed PRE, webhook, or POST evidence",()=>{
  for(const k of [
   "sourcePhysicalReservations","sourceOriginalBindings","preRows",
   "callbackReceipts","postOriginalBindings"
  ] as const){
   const x=input();x.incident[k]=1;
   expect(reviewP5PrelistedCalendarRecovery(x).status)
    .toBe("PRESERVE_PARTIAL_DAY_AND_CENSOR_NO_ERASE_OR_REPLACE");
  }
  const y=input();y.incident.cause="POST_OR_CALLBACK_PARTIAL";
  expect(reviewP5PrelistedCalendarRecovery(y).status)
   .toBe("PRESERVE_PARTIAL_DAY_AND_CENSOR_NO_ERASE_OR_REPLACE");
 });
 it("preserves missed cutoff and rejects silent reuse of existing early four-site draw",()=>{
  const a=input();a.incident.cause="PAID_QUERY_CUTOFF_MISSED";
  expect(reviewP5PrelistedCalendarRecovery(a).status)
   .toBe("RECORD_MISSED_QUERY_CUTOFF_NO_BACKFILL");
  const b=input();b.incident.savedEarlyDrawRows=4;
  expect(reviewP5PrelistedCalendarRecovery(b).status)
   .toBe("SAVED_EARLY_DRAW_SEPARATE_REPLAN_REQUIRED");
 });
 it("refuses hindsight-only invented fallback, incident after window, and missing prelist",()=>{
  const a=input();a.externallyReviewedFallbackSetSha256=sha("f");
  expect(()=>reviewP5PrelistedCalendarRecovery(a))
   .toThrow("CANDIDATE_POOL_WAS_NOT_PRELISTED_BEFORE_INCIDENT");
  const b=input();b.prelistedAtUtc=plus(b.incident.detectedAtUtc,1);
  expect(()=>reviewP5PrelistedCalendarRecovery(b))
   .toThrow("CANDIDATE_POOL_WAS_NOT_PRELISTED_BEFORE_INCIDENT");
  const c=input();c.incident.detectedAtUtc=c.plannedDay.startUtc;
  expect(reviewP5PrelistedCalendarRecovery(c).status)
   .toBe("INCIDENT_NOT_BEFORE_ORIGINAL_WINDOW_NO_AUTO_RETIME");
  const d=input();d.candidates=[];pin(d);
  expect(reviewP5PrelistedCalendarRecovery(d).status)
   .toBe("NO_PRELISTED_FALLBACK_PRESERVE_MISSED_DAY");
 });
 it("no backfill when early T24 lead is lost or UTC slot/treatment changed",()=>{
  const x=input();
  x.incident.detectedAtUtc=plus(x.plannedDay.startUtc,-2*HOUR);
  expect(reviewP5PrelistedCalendarRecovery(x).candidateRefusals[0].code)
   .toBe("INSUFFICIENT_NEW_T24_EARLY_DRAW_LEAD");
  const y=input();
  y.candidates[0].startUtc=plus(y.candidates[0].startUtc,HOUR);
  y.candidates[0].endUtc=plus(y.candidates[0].endUtc,HOUR);pin(y);
  expect(reviewP5PrelistedCalendarRecovery(y).candidateRefusals[0].code)
   .toBe("CHANGED_TREATMENT_DURATION_OR_UTC_SLOT");
  const z=input();z.candidates[0].endUtc=plus(z.candidates[0].endUtc,-HOUR);
  pin(z);
  expect(reviewP5PrelistedCalendarRecovery(z).candidateRefusals[0].code)
   .toBe("CHANGED_TREATMENT_DURATION_OR_UTC_SLOT");
 });
 it("does not overtake a future parent or accept incomplete/duplicate 31-day reference",()=>{
  const x=input();x.candidates[0].startUtc=plus(x.plannedDay.startUtc,5*DAY);
  x.candidates[0].endUtc=plus(x.plannedDay.endUtc,5*DAY);pin(x);
  expect(reviewP5PrelistedCalendarRecovery(x).candidateRefusals[0].code)
   .toBe("CANNOT_PASS_NEXT_PARENT");
  const y=input();y.otherPlannedDays.pop();
  expect(()=>reviewP5PrelistedCalendarRecovery(y))
   .toThrow("INCOMPLETE_REVIEWED_CALENDAR_OR_OUTCOME_BLINDNESS");
  const z=input();z.otherPlannedDays[0].runDayIndex=16;
  expect(()=>reviewP5PrelistedCalendarRecovery(z))
   .toThrow("INCOMPLETE_OTHER_THIRTY_OR_CHANGED_DAY_NUMBERING");
 });
 it("refuses a delayed replacement violating known next-airport 24h washout",()=>{
  const x=input();
  x.plannedDay.selectedAirports=["WSSS","OMAA","SKBO","YSSY"];
  const future=x.otherPlannedDays.find(y=>y.runDayIndex===17)!;
  future.selectedAirports=["WSSS","OMAA","SKBO","YSSY"];
  x.candidates=[{rank:1,startUtc:plus(x.plannedDay.startUtc,3*DAY),
   endUtc:plus(x.plannedDay.endUtc,3*DAY)}];pin(x);
  expect(reviewP5PrelistedCalendarRecovery(x).candidateRefusals[0].code)
   .toBe("FUTURE_REUSED_AIRPORT_BEFORE_24H_WASHOUT");
 });
 it("keeps both paired-day weekday class, partition and exact four airport identities",()=>{
  const x=input(2);
  expect(reviewP5PrelistedCalendarRecovery(x).candidateRefusals[0].code)
   .toBe("PAIRED_WEEKDAY_CLASS_CHANGED");
  const y=input(2);
  y.otherPlannedDays.find(d=>d.runDayIndex===8)!.selectedAirports=
   ["WSSS","OMAA","SKBO","KBUF"];
  expect(()=>reviewP5PrelistedCalendarRecovery(y))
   .toThrow("ALTERED_PAIRED_AIRPORT_OR_PARTITION_OR_UTC_SLOT");
  const z=input(2);
  z.otherPlannedDays.find(d=>d.runDayIndex===8)!.partition="validation";
  expect(()=>reviewP5PrelistedCalendarRecovery(z))
   .toThrow("ALTERED_PAIRED_AIRPORT_OR_PARTITION_OR_UTC_SLOT");
 });
 it("skips only a rejected prelisted alternative, never invents a third after incident",()=>{
  const x=input();
  x.candidates=[
   {rank:1,startUtc:plus(x.plannedDay.startUtc,5*DAY),
    endUtc:plus(x.plannedDay.endUtc,5*DAY)},
   {rank:2,startUtc:plus(x.plannedDay.startUtc,DAY),
    endUtc:plus(x.plannedDay.endUtc,DAY)}
  ];pin(x);
  const r=reviewP5PrelistedCalendarRecovery(x);
  expect(r.backupRank).toBe(2);
 });
 it("holds fake protected test, invalid clock, missing custody, duplicate dates",()=>{
  const a=input();a.protectedTestOutcomeValuesInspected=true;
  expect(()=>reviewP5PrelistedCalendarRecovery(a))
   .toThrow("INCOMPLETE_REVIEWED_CALENDAR_OR_OUTCOME_BLINDNESS");
  const b=input();b.incident.preRows=-1;
  expect(()=>reviewP5PrelistedCalendarRecovery(b))
   .toThrow("MISSING_INCIDENT_CUSTODY_preRows");
  const c=input();c.incident.detectedAtUtc="2027-04-02T12:00:00Z";
  expect(()=>reviewP5PrelistedCalendarRecovery(c))
   .toThrow("INVALID_CANONICAL_UTC_TIMESTAMP");
  const d=input();d.candidates.push({...d.candidates[0],rank:2});pin(d);
  expect(()=>reviewP5PrelistedCalendarRecovery(d))
   .toThrow("DUPLICATE_FALLBACK_START");
 });
});
