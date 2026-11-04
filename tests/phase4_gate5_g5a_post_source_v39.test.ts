import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {fetchFidsPopulation,type FidsCensusParams,
 type PopulationRow,type FidsQueryObservation}
 from "../server/lib/disruption/fidsCensus_v3";
import {
 postReservationUuidV39,assertG5APostRunnerContextV39,
 G5A_POST_CRONS_V39,isG5APostReviewedEventV39,
 canG5APostSkipExpiredBackupV39,G5A_POST_AGGREGATE_AUDIT_SQL_V39
} from "../scripts/v39_phase4_gate5_g5a_prospective_post_schedule_observation";

const sha="a".repeat(64);
const git="b".repeat(40);
const id=postReservationUuidV39(sha,0);
const base=():FidsCensusParams=>({
 airportIcao:"WSSS",fromLocal:"2026-11-05T10:00",
 toLocal:"2026-11-05T11:00",ianaTimezone:"Asia/Singapore",
 serviceWindowStartUtc:new Date("2026-11-05T02:00:00.000Z"),
 serviceWindowEndUtc:new Date("2026-11-05T03:00:00.000Z"),
 cutoffUtc:new Date("2026-11-04T02:00:00.000Z"),
 withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false,
 direction:"Departure",restCategory:"fids_base",
 providerApiVersion:"RapidAPI-v1.15.4",fidsProtocolVersion:"G5A-20261103-v1",
 openapiSha256:sha,g5aObservedScheduleProtocol:true
});
const flight=(time:string)=>({
 id:"G5A-OPERATING-9381",number:"SQ 115",codeshareStatus:"IsOperator",
 departure:{scheduledTime:{utc:time}},
 arrival:{airport:{icao:"YSSY"},scheduledTime:{utc:"2026-11-05T08:00:00.000Z"}}
});
async function readOne(p:FidsCensusParams,utc:string){
 let rows:PopulationRow[]=[];let query:FidsQueryObservation|null=null;
 const result=await fetchFidsPopulation(p,{
  fetchAirport:async()=>({departures:[flight(utc)],arrivals:[]}),
  persist:async(q,rr)=>{query=q;rows=rr;return rr.length},
  now:()=>new Date("2026-11-04T01:30:00.000Z")
 });
 expect(result?.persistedPopulationRows).toBe(1);
 return {result:result!,query:query!,row:rows[0]};
}
const env=()=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_SHA:git,
 GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",
 GITHUB_RUN_ID:"41600012345",GITHUB_JOB:"post-source",
 GITHUB_WORKFLOW:"Phase4 Gate5 G5A WSSS Real Prospective POST",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-g5a-wsss-real-post.yml@refs/heads/main",
 G5A_POST_SCHEDULE:"10 2 5 11 *",
 G5A_POST_PAID_INTENT:"G5A_NOV05_POST_THREE_2_UNIT_REQUESTS_MAX",
 GITHUB_TOKEN:"test-not-real-github-token",
 AERODATABOX_API_KEY:"test-not-real-provider-key",
 P4_G5_SOURCE_OWNER_DATABASE_URL:"postgresql://writer:fake@localhost/test",
 V39_DATABASE_RUNTIME_URL:"postgresql://writer:fake@localhost/test",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0"
});
describe("G5A prospective POST provider source, time and budget admission",()=>{
 it("makes deterministic, distinct UUID v4 slots from exact manifest",()=>{
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(postReservationUuidV39(sha,0)).toBe(id);
  expect(new Set([0,1,2].map(i=>postReservationUuidV39(sha,i))).size).toBe(3);
  expect(()=>postReservationUuidV39("fake",0)).toThrow("P4_G5_G5A_POST_RESERVATION_DIGEST_HOLD");
  expect(()=>postReservationUuidV39(sha,3)).toThrow("P4_G5_G5A_POST_RESERVATION_DIGEST_HOLD");
 });
 it("retimed physical flight has same positive identity across PRE/POST query windows",async()=>{
  const before=await readOne(base(),"2026-11-05T02:20:00.000Z");
  const later=base();
  later.serviceWindowStartUtc=new Date("2026-11-05T01:00:00.000Z");
  later.serviceWindowEndUtc=new Date("2026-11-05T05:00:00.000Z");
  later.fromLocal="2026-11-05T09:00";
  later.toLocal="2026-11-05T13:00";
  later.fidsProtocolVersion="G5A-POST-20261103-v1";
  later.g5aPostReservationId=id;
  later.batchId=id;
  const post=await readOne(later,"2026-11-05T02:40:00.000Z");
  expect(before.row.analyticIdentityId).toBe(post.row.analyticIdentityId);
  expect(before.row.canonicalFlightInstanceId).toBe(post.row.canonicalFlightInstanceId);
  expect(before.row.analyticIdentityId).toMatch(/^leg:g5a:[a-f0-9]{64}$/);
  expect(post.row.batchId).toBe(id);
  const envelope=post.query.rawPayload as Record<string,unknown>;
  expect(envelope.g5aPostReservationId).toBe(id);
  expect(envelope.g5aPostPurpose)
   .toBe("PROVIDER_REPORTED_SCHEDULE_REVISION_NOT_ACTUAL_DELAY");
  expect(post.query.responseHash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(before.query.rawPayload)).not.toContain(id);
 });
 it("does not permit treating an arbitrary source or PRE observation as POST",async()=>{
  const p=base();p.g5aPostReservationId=id;
  await expect(readOne(p,"2026-11-05T02:20:00.000Z"))
   .rejects.toThrow("G5A_POST_RESERVATION_SCOPE_INVALID_HOLD");
  p.fidsProtocolVersion="G5A-POST-20261103-v1";
  p.g5aObservedScheduleProtocol=false;
  await expect(readOne(p,"2026-11-05T02:20:00.000Z"))
   .rejects.toThrow("G5A_POST_RESERVATION_SCOPE_INVALID_HOLD");
 });
 it("refuses PR/push/fork/retry, unknown owner role, date replay",()=>{
  const at=Date.parse("2026-11-05T02:12:00.000Z");
  expect(()=>assertG5APostRunnerContextV39(env(),git,at)).not.toThrow();
  for(const edit of [
   {GITHUB_EVENT_NAME:"workflow_dispatch"},
   {GITHUB_EVENT_NAME:"push"},
   {GITHUB_REPOSITORY:"someone/fork"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_SHA:"c".repeat(40)},
   {GITHUB_JOB:"offline-post"},
   {G5A_POST_SCHEDULE:"bad"},
   {G5A_POST_PAID_INTENT:"UNLIMITED"},
   {GITHUB_TOKEN:""},
   {AERODATABOX_API_KEY:""},
   {V39_DATABASE_RUNTIME_URL:"postgresql://admin:fake@localhost/test"},
   {DATABASE_URL:"postgresql://admin:fake@localhost/test"},
   {GATE05_AUTOMATION_DATABASE_URL:"audit-secret-should-not-be-here"}
  ]){
   expect(()=>assertG5APostRunnerContextV39({...env(),...edit},git,at))
    .toThrow("P4_G5_G5A_POST_GITHUB_CONTEXT_OR_SECRETS_HOLD");
  }
  expect(()=>assertG5APostRunnerContextV39(env(),git,
   Date.parse("2027-11-05T02:12:00.000Z")))
   .toThrow("P4_G5_G5A_POST_GITHUB_CONTEXT_OR_SECRETS_HOLD");
 });
 it("keeps every production POST cron aligned with the TypeScript admission",()=>{
  const wf=readFileSync(
   ".github/workflows/phase4-gate5-g5a-wsss-real-post.yml","utf8");
  const actual=[...wf.matchAll(/^\s*- cron: "([^"]+)"$/gm)]
   .map(x=>x[1]);
  expect(actual).toEqual([...G5A_POST_CRONS_V39]);
  expect(wf).toContain("workflow_dispatch:");
  expect(wf).toContain("github.event_name == 'workflow_dispatch'");
  expect(wf).toContain("G5A_POST_SCHEDULE: ${{ github.event.schedule || 'manual-reviewed' }}");
  for(const cron of G5A_POST_CRONS_V39){
   const e={...env(),G5A_POST_SCHEDULE:cron};
   expect(isG5APostReviewedEventV39(e)).toBe(true);
   expect(()=>assertG5APostRunnerContextV39(e,git,
    Date.parse("2026-11-05T02:55:00.000Z"))).not.toThrow();
  }
  const fallback={...env(),GITHUB_EVENT_NAME:"workflow_dispatch",
   G5A_POST_SCHEDULE:"manual-reviewed"};
  expect(isG5APostReviewedEventV39(fallback)).toBe(true);
  expect(()=>assertG5APostRunnerContextV39(fallback,git,
   Date.parse("2026-11-05T02:55:00.000Z"))).not.toThrow();
  for(const bad of ["40 2 5 11 *","10 2 6 11 *","manual-reviewed"]){
   expect(isG5APostReviewedEventV39({...env(),G5A_POST_SCHEDULE:bad}))
    .toBe(false);
  }
 });
 it("safely skips expired queued backups without pretending to observe POST",()=>{
  const after=Date.parse("2026-11-05T05:04:00.000Z");
  expect(canG5APostSkipExpiredBackupV39(env(),git,after)).toBe(true);
  expect(canG5APostSkipExpiredBackupV39(env(),git,
   Date.parse("2026-11-05T02:15:00.000Z"))).toBe(false);
  expect(canG5APostSkipExpiredBackupV39({...env(),GITHUB_REF:"refs/heads/other"},
   git,after)).toBe(false);
  expect(canG5APostSkipExpiredBackupV39({...env(),GITHUB_EVENT_NAME:"push"},
   git,after)).toBe(false);
  expect(canG5APostSkipExpiredBackupV39(env(),git,
   Date.parse("2027-11-05T05:04:00.000Z"))).toBe(false);
 });
 it("calculates observed only with source before W=T+2h and true PRE baseline",()=>{
  const q=G5A_POST_AGGREGATE_AUDIT_SQL_V39;
  for(const must of [
   "frame_hash=$1","p.population_query_id::text=pre.population_query_id",
   "p.available_at<=pre.prediction_cutoff_utc",
   "p.fids_protocol_version='G5A-POST-20261103-v1'",
   "q.raw_payload->>'g5aPostReservationId'=p.batch_id",
   "p.batch_id=ANY($2::text[])",
   "p.available_at<=pre.selected_t_milestone_utc+INTERVAL '2 hours'",
   "p.available_at>pre.prediction_cutoff_utc",
   "GROUP BY pre.horizon",">=15","<15"
  ])expect(q).toContain(must);
  expect(q).not.toContain("actual_wheels_off");
 });
});
