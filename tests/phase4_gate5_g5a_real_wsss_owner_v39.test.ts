import {describe,it,expect} from "vitest";
import {assertG5AOwnerRunContextV39,p4G5G5AReservationSqlArgsV39}
 from "../scripts/v39_phase4_gate5_g5a_real_wsss_horizon_owner";

const GH="a".repeat(40);
const FULL="postgresql://g5_scoped_writer:fake@localhost:5432/g5_test";
const base=()=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_SHA:GH,
 GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",
 GITHUB_RUN_ID:"41600000123",GITHUB_JOB:"owner-t24",
 GITHUB_WORKFLOW:"Phase4 Gate5 G5A WSSS Real Prospective GitHub Owner",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-g5a-real-wsss-prospective-owner.yml@refs/heads/main",
 P4_G5_G5A_HORIZON:"T-24h",P4_G5_G5A_CRON:"40 23 3 11 *",
 P4_G5_G5A_PAID_INTENT:"WSSS_NOV05_G5A_ONE_PROSPECTIVE_THREE_HORIZON_18_UNIT_MAX",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
 GITHUB_TOKEN:"fake-action-read-token-only",
 AERODATABOX_API_KEY:"fake-not-production-key",
 V39_DATABASE_RUNTIME_URL:FULL,P4_G5_SOURCE_OWNER_DATABASE_URL:FULL
});
describe("G5A true future GitHub-only physical source owner admission",()=>{
 it("accepts only exact scheduled job on reviewed main with dedicated URL",()=>{
  expect(()=>assertG5AOwnerRunContextV39(base(),GH,"T-24h",
   Date.parse("2026-11-03T23:40:00.000Z"))).not.toThrow();
  expect(()=>assertG5AOwnerRunContextV39({...base(),
   GITHUB_JOB:"owner-t6",P4_G5_G5A_HORIZON:"T-6h",
   P4_G5_G5A_CRON:"40 17 4 11 *"},GH,"T-6h",
   Date.parse("2026-11-04T17:40:00.000Z"))).not.toThrow();
  expect(()=>assertG5AOwnerRunContextV39({...base(),
   GITHUB_JOB:"owner-t90",P4_G5_G5A_HORIZON:"T-90m",
   P4_G5_G5A_CRON:"10 22 4 11 *"},GH,"T-90m",
   Date.parse("2026-11-04T22:10:00.000Z"))).not.toThrow();
 });
 it("refuses all untrusted or misdirected job event/sha/role contexts",()=>{
  const edits=[
   {GITHUB_EVENT_NAME:"push"},
   {GITHUB_REF:"refs/pull/372/merge"},
   {GITHUB_REPOSITORY:"attacker/fork"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_RUN_ID:"0"},
   {GITHUB_JOB:"owner-t6"},
   {GITHUB_WORKFLOW:"synthetic-local"},
   {GITHUB_WORKFLOW_REF:"attacker/workflow"},
   {GITHUB_SHA:"b".repeat(40)},
   {P4_G5_G5A_CRON:"bad"},
   {P4_G5_G5A_HORIZON:"T-6h"},
   {P4_G5_G5A_PAID_INTENT:"FREE_TIER"},
   {ADB_AUTO_COLLECT:"1"},
   {V39_PHASE6_PROCESS_ARMED:"1"},
   {DATABASE_URL:FULL},
   {GATE05_AUTOMATION_DATABASE_URL:"should-not-be-here"},
   {V39_DATABASE_RUNTIME_URL:"postgresql://admin:bad@localhost/db"},
   {AERODATABOX_API_KEY:""},
   {P4_G5_SOURCE_OWNER_DATABASE_URL:""}
  ];
  for(const change of edits){
   expect(()=>assertG5AOwnerRunContextV39({...base(),...change},GH,
    "T-24h",Date.parse("2026-11-03T23:40:00.000Z")))
    .toThrow("P4_G5_G5A_GITHUB_CONTEXT_OR_SECRET_HOLD");
  }
 });
 it("stops after the one future period, never reactivates in 2027",()=>{
  expect(()=>assertG5AOwnerRunContextV39(base(),GH,"T-24h",
   Date.parse("2027-11-03T23:40:00.000Z")))
   .toThrow("P4_G5_G5A_GITHUB_CONTEXT_OR_SECRET_HOLD");
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
 it("source-owner module cannot launch paid collection from an offline unit test",()=>{
  expect(typeof assertG5AOwnerRunContextV39).toBe("function");
  expect(()=>assertG5AOwnerRunContextV39(
   {GITHUB_ACTIONS:"false"} as any,GH,"T-24h",Date.now()))
   .toThrow("P4_G5_G5A_GITHUB_CONTEXT_OR_SECRET_HOLD");
 });
});
