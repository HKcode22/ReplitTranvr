import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {assessG5AConditionalOperatingPREV39,stageP4G5ScopedPreV39}
 from "../server/lib/disruption/phase4Gate5ScopedPreStaging_v39";
import {classifyScope,fetchFidsPopulation,type FidsCensusParams}
 from "../server/lib/disruption/fidsCensus_v3";
import {assertG5AOwnerRunContextV39,p4G5G5AReservationSqlArgsV39,
 P4_G5_G5A_PUBLIC_OPENAPI_DOCUMENT_SHA_V39}
 from "../scripts/v39_phase4_gate5_g5a_real_wsss_horizon_owner";

const GH="a".repeat(40);
const FULL="postgresql://g5_scoped_writer:fake@localhost:5432/g5_test";
const base=()=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_SHA:GH,
 GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",
 GITHUB_RUN_ID:"41600000123",GITHUB_JOB:"owner-t6",
 GITHUB_WORKFLOW:"Phase4 Gate5 G5A WSSS Real Prospective GitHub Owner",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-g5a-real-wsss-prospective-owner.yml@refs/heads/main",
 P4_G5_G5A_HORIZON:"T-6h",P4_G5_G5A_CRON:"47 3 5 11 *",
 P4_G5_G5A_PAID_INTENT:"WSSS_NOV05_1400Z_G5A_ONE_PROSPECTIVE_THREE_HORIZON_18_UNIT_MAX",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
 GITHUB_TOKEN:"fake-action-read-token-only",
 AERODATABOX_API_KEY:"fake-not-production-key",
 V39_DATABASE_RUNTIME_URL:FULL,P4_G5_SOURCE_OWNER_DATABASE_URL:FULL
});
describe("G5A true Thursday GitHub-only physical source owner admission",()=>{
 it("never silently upgrades provider filtered UNKNOWN private/charter scope to confirmed commercial",()=>{
  const stable="leg:g5a:"+"a".repeat(64);
  expect(classifyScope({isCargo:false})).toBe("unknown");
  expect(assessG5AConditionalOperatingPREV39(
   "unknown","confirmed_operating_leg",stable,true))
   .toEqual({eligible:true,scopeUnverified:true});
  expect(assessG5AConditionalOperatingPREV39(
   "unknown","confirmed_operating_leg",stable,false))
   .toEqual({eligible:false,scopeUnverified:false});
  expect(assessG5AConditionalOperatingPREV39(
   "confirmed_core","confirmed_operating_leg",stable,true))
   .toEqual({eligible:true,scopeUnverified:false});
  // Existing non-G5A confirmed physical legs keep their former eligibility.
  expect(assessG5AConditionalOperatingPREV39(
   "confirmed_core","confirmed_operating_leg","legacy:leg",false).eligible)
   .toBe(true);
  for(const [scope,identity] of [
   ["auxiliary","confirmed_operating_leg"],
   ["unknown","ambiguous_codeshare"],
   ["unknown","resolved_marketing"]
  ] as const)
   expect(assessG5AConditionalOperatingPREV39(
    scope,identity,stable,true).eligible).toBe(false);
  expect(assessG5AConditionalOperatingPREV39(
   "unknown","confirmed_operating_leg","provisional:abc",true).eligible)
   .toBe(false);
 });
 it("known charter stays auxiliary; ordinary FIDS field absence stays unknown and operating identity positive",async()=>{
  const p:FidsCensusParams={
   airportIcao:"WSSS",fromLocal:"2026-11-05T22:00",
   toLocal:"2026-11-05T23:00",ianaTimezone:"Asia/Singapore",
   serviceWindowStartUtc:new Date("2026-11-05T14:00:00.000Z"),
   serviceWindowEndUtc:new Date("2026-11-05T15:00:00.000Z"),
   cutoffUtc:new Date("2026-11-04T14:20:00.000Z"),
   withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false,
   direction:"Departure",providerApiVersion:"doc",
   fidsProtocolVersion:"G5A-20261103-v1",openapiSha256:"a".repeat(64),
   g5aObservedScheduleProtocol:true
  };
  const first={id:"FIDS-9381",number:"SQ 115",codeshareStatus:"IsOperator",
   isCargo:false,
   departure:{scheduledTime:{utc:"2026-11-05T14:20:00.000Z"}},
   arrival:{airport:{icao:"YSSY"},scheduledTime:{utc:"2026-11-05T20:30:00.000Z"}}
  };
  const rows:any[]=[];
  const result=await fetchFidsPopulation(p,{
   now:()=>new Date("2026-11-04T13:30:00.000Z"),
   fetchAirport:async()=>({departures:[
    first,{...first,id:"FIDS-9382",number:"SQ 116",isCharter:true}
   ],arrivals:[]}),
   persist:async(_q,r)=>{rows.push(...r);return r.length}
  });
  expect(result?.persistedPopulationRows).toBe(2);
  const ordinary=rows.find(x=>x.providerRecordKey==="FIDS-9381");
  const charter=rows.find(x=>x.providerRecordKey==="FIDS-9382");
  expect(ordinary.scopeClassification).toBe("unknown");
  expect(charter.scopeClassification).toBe("auxiliary");
  expect(ordinary.canonicalFlightInstanceId).toMatch(/^leg:g5a:/);
  expect(charter.canonicalFlightInstanceId).toMatch(/^leg:g5a:/);
  expect(assessG5AConditionalOperatingPREV39(
   charter.scopeClassification,charter.codeshareResolutionStatus,
   charter.canonicalFlightInstanceId,true).eligible).toBe(false);
 });
 it("V0077-bound true source with unknown noncommercial scope still builds explicit conditional PRE, not false core",async()=>{
  const id="leg:g5a:"+"f".repeat(64);
  const first=new Date("2026-11-05T14:20:00.000Z");
  const available=new Date("2026-11-04T13:35:00.000Z");
  const h=["T-24h","T-6h","T-90m"] as const;
  const lag=[24*3600000,6*3600000,90*60000] as const;
  const rows=h.map((horizon,i)=>({
   analytic_identity_id:id,first_schedule:first,horizon,
   all_parent_member_provenance_valid:true,
   prediction_cutoff_utc:new Date(first.getTime()-lag[i]),
   canonical_flight_instance_id:id,population_member_id:"test-member",
   population_query_id:"00000000-0000-4000-8000-000000000101",
   response_hash:"b".repeat(64),dep_scheduled_utc:first,
   effective_available:available,member_available:available,
   source_available:available,original_hash:"b".repeat(64),
   population_role:"requested_airport_primary",
   scope_classification:"unknown",
   codeshare_resolution_status:"confirmed_operating_leg"
  }));
  const db={
   query:async(sql:string)=>{
    if(sql.includes("expected_slots"))
     return {rows:[{expected_slots:3,bound_originals:1,
      valid_originals:1,valid_slots:1}],rowCount:1};
    return {rows,rowCount:rows.length};
   }
  };
  const out=await stageP4G5ScopedPreV39(db as any,{
   airportIcao:"WSSS",
   serviceStartUtc:"2026-11-05T14:00:00.000Z",
   serviceEndUtc:"2026-11-05T15:00:00.000Z",
   observedAtUtc:"2026-11-04T13:40:00.000Z",
   reviewedFrozenManifestSha256:"c".repeat(64)
  },{
   horizon:"T-24h",expectedOwnerGithubRunId:"41790000001",
   reviewedRunAuthorizationSha256:"d".repeat(64)
  });
  expect(out.candidateInMemoryRows).toBe(3);
  for(const x of out.staged){
   expect(x.snapshot.features.find(y=>y.featureName===
    "g5a_population_scope_evidence")?.value)
    .toBe("QUERY_FILTERED_SCOPE_UNVERIFIED");
  }
  expect(out.counts.map(c=>c.queryFilteredUnknownScopeOperating))
   .toEqual([1,1,1]);
  expect(out.counts.map(c=>c.provisionalCore)).toEqual([0,0,0]);
  expect(out.status).toBe("REAL_SOURCE_CANDIDATES_ONLY_NATIVE_T_UNVERIFIED");
  expect(out.certifiedSnapshotRowsPersisted).toBe(0);
  expect(out.trueScheduledTIndependentlyVerified).toBe(false);
 });
 const C24=["47 9 4 11 *","17 10 4 11 *","47 10 4 11 *","17 11 4 11 *"];
 const C6=["47 3 5 11 *","17 4 5 11 *","47 4 5 11 *","17 5 5 11 *"];
 const C90=["17 8 5 11 *","47 8 5 11 *","17 9 5 11 *","47 9 5 11 *"];
 it("admits exact twelve prospective GitHub cron backups including true first T24",()=>{
  for(const cron of C24)
   expect(()=>assertG5AOwnerRunContextV39({
    ...base(),GITHUB_JOB:"owner-t24",P4_G5_G5A_HORIZON:"T-24h",
    P4_G5_G5A_CRON:cron
   },GH,"T-24h",Date.parse("2026-11-04T10:50:00.000Z")))
    .not.toThrow();
  for(const cron of C6)
   expect(()=>assertG5AOwnerRunContextV39({
    ...base(),P4_G5_G5A_CRON:cron
   },GH,"T-6h",Date.parse("2026-11-05T05:10:00.000Z")))
    .not.toThrow();
  for(const cron of C90)
   expect(()=>assertG5AOwnerRunContextV39({
    ...base(),GITHUB_JOB:"owner-t90",P4_G5_G5A_HORIZON:"T-90m",
    P4_G5_G5A_CRON:cron
   },GH,"T-90m",Date.parse("2026-11-05T10:10:00.000Z")))
    .not.toThrow();
 });
 it("rejects all missed 02:00Z November 5 cohort cron values, no retroactive T24",()=>{
  for(const oldCron of ["40 22 3 11 *","47 15 4 11 *",
   "17 21 4 11 *","40 17 4 11 *"]){
   expect(()=>assertG5AOwnerRunContextV39({...base(),
    P4_G5_G5A_CRON:oldCron},GH,"T-6h",
    Date.parse("2026-11-05T04:50:00.000Z")))
    .toThrow("P4_G5_G5A_GITHUB_CONTEXT_OR_SECRET_HOLD");
  }
 });
 it("admits explicit one-click GitHub fallback inside future verified prearm only",()=>{
  for(const [h,job] of [["T-24h","owner-t24"],["T-6h","owner-t6"],["T-90m","owner-t90"]] as const)
   expect(()=>assertG5AOwnerRunContextV39({...base(),
    GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_JOB:job,
    P4_G5_G5A_HORIZON:h,P4_G5_G5A_CRON:"manual-reviewed",
    P4_G5_G5A_MANUAL_HORIZON:h
   },GH,h,Date.parse("2026-11-05T08:15:00.000Z"))).not.toThrow();
  expect(()=>assertG5AOwnerRunContextV39({...base(),
   GITHUB_EVENT_NAME:"workflow_dispatch",P4_G5_G5A_CRON:"manual-reviewed",
   P4_G5_G5A_MANUAL_HORIZON:"T-90m"
  },GH,"T-6h",Date.parse("2026-11-05T05:00:00.000Z")))
   .toThrow("P4_G5_G5A_GITHUB_CONTEXT_OR_SECRET_HOLD");
 });
 it("rejects a GitHub push/fork, mismatched cron/job, stolen admin URL, or retry",()=>{
  const edits=[
   {GITHUB_EVENT_NAME:"push"},
   {GITHUB_EVENT_NAME:"pull_request"},
   {GITHUB_REF:"refs/pull/372/merge"},
   {GITHUB_REPOSITORY:"attacker/fork"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_RUN_ID:"0"},
   {GITHUB_JOB:"owner-t90"},
   {GITHUB_WORKFLOW:"synthetic-local"},
   {GITHUB_WORKFLOW_REF:"attacker/workflow"},
   {GITHUB_SHA:"b".repeat(40)},
   {P4_G5_G5A_CRON:"bad"},
   {P4_G5_G5A_HORIZON:"T-90m"},
   {P4_G5_G5A_MANUAL_HORIZON:"T-90m"},
   {P4_G5_G5A_PAID_INTENT:"FREE_TIER"},
   {ADB_AUTO_COLLECT:"1"},
   {V39_PHASE6_PROCESS_ARMED:"1"},
   {DATABASE_URL:FULL},
   {GATE05_AUTOMATION_DATABASE_URL:"audit-secret"},
   {V39_DATABASE_RUNTIME_URL:"postgresql://admin:bad@localhost/db"},
   {AERODATABOX_API_KEY:""},
   {P4_G5_SOURCE_OWNER_DATABASE_URL:""}
  ];
  for(const change of edits)
   expect(()=>assertG5AOwnerRunContextV39({...base(),...change},
    GH,"T-6h",Date.parse("2026-11-05T04:50:00.000Z")))
    .toThrow("P4_G5_G5A_GITHUB_CONTEXT_OR_SECRET_HOLD");
  expect(()=>assertG5AOwnerRunContextV39(base(),GH,"T-6h",
   Date.parse("2027-11-05T04:50:00.000Z")))
   .toThrow("P4_G5_G5A_GITHUB_CONTEXT_OR_SECRET_HOLD");
 });
 it("fails CI if any paid job IF diverges from actual registered cron",()=>{
  const wf=readFileSync(
   ".github/workflows/phase4-gate5-g5a-real-wsss-prospective-owner.yml",
   "utf8");
  const registered=[...wf.matchAll(/^ {4}- cron: "([^"]+)"$/gm)]
   .map(m=>m[1]);
  expect(registered).toEqual([...C24,...C6,...C90]);
  const c24=JSON.stringify(C24),c6=JSON.stringify(C6),c90=JSON.stringify(C90);
  expect(wf).toContain("contains(fromJSON('"+c24+"'), github.event.schedule)");
  expect(wf).toContain("contains(fromJSON('"+c6+"'), github.event.schedule)");
  expect(wf).toContain("contains(fromJSON('"+c90+"'), github.event.schedule)");
  expect(wf).toContain("github.event_name == 'workflow_dispatch'");
  expect(wf).not.toContain("    if: ${{ false }}");
  expect(wf).not.toContain("github.event.schedule == '40 17 4 11 *'");
  expect(wf).not.toContain("github.event.schedule == '10 22 4 11 *'");
 });
 it("uses exact V0076 SQL SECURITY DEFINER argument order, GH run before query",()=>{
  const a="a".repeat(64),b="b".repeat(64),c="c".repeat(64),d="d".repeat(64);
  expect(p4G5G5AReservationSqlArgsV39(a,b,"41600000123",c,1,d))
   .toEqual([a,b,"41600000123",c,1,d]);
  expect(()=>p4G5G5AReservationSqlArgsV39(a,b,c,"41600000123",1,d))
   .toThrow("P4_G5_G5A_RESERVATION_SQL_ARGUMENTS_HOLD");
  expect(()=>p4G5G5AReservationSqlArgsV39(a,b,"41600000123",c,2,d))
   .toThrow("P4_G5_G5A_RESERVATION_SQL_ARGUMENTS_HOLD");
 });
 it("frozen AeroDataBox OpenAPI document SHA comes from Plan f.8, not G5A protocol markdown",()=>{
  expect(P4_G5_G5A_PUBLIC_OPENAPI_DOCUMENT_SHA_V39)
   .toBe("735620f2d2132c5bf51768f50caa767b7f0b25be8b128679641402666696890a");
 });
 it("source-owner module cannot launch paid collection from an offline unit test",()=>{
  expect(typeof assertG5AOwnerRunContextV39).toBe("function");
  expect(()=>assertG5AOwnerRunContextV39(
   {GITHUB_ACTIONS:"false"} as any,GH,"T-24h",Date.now()))
   .toThrow("P4_G5_G5A_GITHUB_CONTEXT_OR_SECRET_HOLD");
 });
});
