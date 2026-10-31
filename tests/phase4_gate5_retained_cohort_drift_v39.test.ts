import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {
 auditP4WsssRetainedAsOfDriftV39,
 P4_WSSS_RETAINED_DRIFT_SQL,
 P4_WSSS_DRIFT_SCHEMA
} from "../server/lib/disruption/phase4Gate5RetainedCohortDrift_v39";

const Q0="11111111-1111-4111-8111-111111111111";
const Q1="22222222-2222-4222-8222-222222222222";
const Q2="33333333-3333-4333-8333-333333333333";
const SHA="a".repeat(64);
const DAY={
 airport:"WSSS",windowStartUtc:"2026-10-31T17:00:00.000Z",
 windowEndUtc:"2026-10-31T18:00:00.000Z",
 auditUtc:"2026-10-31T19:15:00.000Z"
} as const;
const q=(id:string, at:string, analytic:string|null, sched:string|null=null,
 overwrite:Record<string,unknown>={})=>({
 query_id:id,query_available:at,query_hash:SHA,
 analytic_id:analytic,member_available:at,
 member_hash:SHA,role:"requested_airport_primary",
 scope_class:"unknown",codeshare:"ambiguous_unknown",
 canonical_id:null,observed_schedule:sched,...overwrite
});
// Hypothetical on-time T24 receipt (real 13:49Z source expires before T90).
const a="2026-10-30T16:07:00.000Z";
const b="2026-10-31T10:07:00.000Z";
const c="2026-10-31T14:37:00.000Z";
type Scope={airport:"WSSS";windowStartUtc:string;windowEndUtc:string;auditUtc:string};
const run=async(rows:unknown[],scope:Scope=DAY)=>{
 const query=vi.fn(async()=>({rows}));
 const result=await auditP4WsssRetainedAsOfDriftV39({query},scope);
 expect(query).toHaveBeenCalledWith(P4_WSSS_RETAINED_DRIFT_SQL,
   ["WSSS",DAY.windowStartUtc,DAY.windowEndUtc,scope.auditUtc]);
 return result;
};
describe("Phase4 WSSS retained as-of same-cohort FIDS candidate turnover",()=>{
 it("measures 3 distinct horizon receipts, candidate appearances/disappearances and schedule changes",async()=>{
  const r=await run([
   q(Q0,a,"one","2026-10-31T17:10:00Z"),
   q(Q0,a,"two","2026-10-31T17:20:00Z"),
   q(Q1,b,"one","2026-10-31T17:11:00Z"),
   q(Q1,b,"three","2026-10-31T17:22:00Z"),
   q(Q2,c,"three","2026-10-31T17:22:00Z"),
   q(Q2,c,"four","2026-10-31T17:40:00Z")
  ],{...DAY,auditUtc:"2026-10-31T15:40:00.000Z"});
  expect(r.schema).toBe(P4_WSSS_DRIFT_SCHEMA);
  expect(r.retainedSourceReceipts).toBe(3);
  expect(r.asOf["T-24h"].primaryProvisionalIdentities).toBe(2);
  expect(r.asOf["T-6h"].primaryProvisionalIdentities).toBe(2);
  expect(r.asOf["T-90m"].primaryProvisionalIdentities).toBe(2);
  expect(r.transitions.T24_to_T6).toMatchObject({
   reappearingCandidateIds:1,appearingCandidateIds:1,
   absentFromLaterSourceCandidateIds:1,observedScheduleRevisionCandidates:1
  });
  expect(r.transitions.T6_to_T90).toMatchObject({
   reappearingCandidateIds:1,appearingCandidateIds:1,
   absentFromLaterSourceCandidateIds:1,observedScheduleRevisionCandidates:0
  });
  expect(r.strictGate5Passed).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
 });
 it("forbids members that became durable after the cutoff even if parent receipt predates it",async()=>{
  const late="2026-10-30T17:00:00.001Z";
  const r=await run([
   q(Q0,a,"late-member",null,{member_available:late}),
   q(Q0,a,"early-member"),
  ],{...DAY,auditUtc:"2026-10-31T11:10:00.000Z"});
  expect(r.asOf["T-24h"].primaryProvisionalIdentities).toBe(1);
  expect(r.asOf["T-6h"].primaryProvisionalIdentities).toBe(2);
  expect(r.transitions.T24_to_T6).toMatchObject({
   appearingCandidateIds:1,reappearingCandidateIds:1,
   absentFromLaterSourceCandidateIds:0
  });
 });
 it("expired T24 is UNKNOWN, not zero, and its transition cannot be computed",async()=>{
  // Database query already excludes source content outside project 24h ceiling;
  // no historical backfill from today's newer source is permitted.
  const r=await run([
   q(Q1,b,"one"),
   q(Q1,b,"two"),
   q(Q2,c,"one"),
   q(Q2,c,"three")
  ]);
  expect(r.retainedSourceReceipts).toBe(2);
  expect(r.asOf["T-24h"]).toMatchObject({
   status:"NO_RETAINED_SOURCE_AVAILABLE_AT_FIXED_EARLIEST_CUTOFF",
   primaryProvisionalIdentities:null
  });
  expect(r.transitions.T24_to_T6).toMatchObject({
   status:"UNOBSERVED_RETAINED_RECEIPT_MISSING",
   appearingCandidateIds:null,absentFromLaterSourceCandidateIds:null
  });
  expect(r.transitions.T6_to_T90).toMatchObject({
   reappearingCandidateIds:1,appearingCandidateIds:1,absentFromLaterSourceCandidateIds:1
  });
  expect(r.noRetainedReceiptMeansUnobservedNotZeroFlights).toBe(true);
 });
 it("not-yet-collected future receipts do not appear retroactively",async()=>{
  const r=await run([q(Q0,a,"one"),q(Q1,b,"one")],
    {...DAY,auditUtc:"2026-10-31T11:05:00.000Z"});
  expect(r.asOf["T-24h"].sourceReceiptAvailableUtc).toBe(a);
  expect(r.asOf["T-90m"]).toMatchObject({
   status:"FIXED_EARLIEST_CUTOFF_NOT_YET_REACHED",
   primaryProvisionalIdentities:null,sourceReceiptAvailableUtc:null
  });
  expect(r.transitions.T6_to_T90.status).toBe("UNOBSERVED_RETAINED_RECEIPT_MISSING");
 });
 it("one empty returned source list is a recorded receipt, not proof of zero flights",async()=>{
  const r=await run([q(Q1,b,null)]);
  expect(r.asOf["T-6h"].primaryProvisionalIdentities).toBe(0);
  expect(r.noRetainedReceiptMeansUnobservedNotZeroFlights).toBe(true);
  expect(r.identitySetsAreProvisionalNotDistinctPhysicalFlights).toBe(true);
 });
 it("rejects hash mismatch, expired source clocks and unwanted population roles",async()=>{
  const r=await run([
   q(Q1,b,"one"),
   q(Q1,b,"two",null,{member_hash:"b".repeat(64)}),
   q(Q1,b,"three",null,{role:"opposite_movement_context"}),
   q(Q1,b,"four",null,{member_available:"2026-10-31T10:06:00Z"}),
  ]);
  expect(r.rejectedSourceLineageRows).toBe(3);
  expect(r.asOf["T-6h"].primaryProvisionalIdentities).toBe(1);
 });
 it("never treats marketing/candidate identities as confirmed operating legs",async()=>{
  const r=await run([
   q(Q1,b,"one",null,{scope_class:"confirmed_core",codeshare:"confirmed_operating_leg",canonical_id:null}),
   q(Q1,b,"two",null,{scope_class:"confirmed_core",codeshare:"confirmed_operating_leg",canonical_id:"two"}),
  ]);
  expect(r.asOf["T-6h"].confirmedCoreTaggedIdentities).toBe(1);
  expect(r.fixedEarliestCutoffNotVerifiedPerFlightSelectedT).toBe(true);
  expect(r.actualWheelsOffLabelsVerified).toBe(false);
 });
 it("rejects malformed scopes, duplicate conflicting receipt clocks and over-bound rows",async()=>{
  await expect(auditP4WsssRetainedAsOfDriftV39({query:async()=>({rows:[]})},{
   ...DAY,airport:"OTHER" as "WSSS"
  })).rejects.toThrow("P4_DRIFT_SCOPE_HOLD");
  await expect(run([
   q(Q1,b,"one"),q(Q1,"2026-10-31T10:08:00Z","two")
  ])).rejects.toThrow("P4_DRIFT_QUERY_CLOCK_CONFLICT");
  await expect(run([q(Q1,b,"one",null,{query_hash:"bad"})]))
   .rejects.toThrow("P4_DRIFT_RECEIPT_INVALID");
  await expect(run(Array.from({length:12001},()=>q(Q1,b,"one"))))
   .rejects.toThrow("P4_DRIFT_ROWS_OVER_BOUND");
 });
 it("retention/cutoff SQL and invoked operator are strictly READ ONLY",()=>{
  const script=readFileSync("scripts/v39_gate5_source_inventory_readonly_actions.ts","utf8");
  expect(P4_WSSS_RETAINED_DRIFT_SQL).toContain("raw_persisted_at_utc >= $4::timestamptz - interval '24 hours'");
  expect(P4_WSSS_RETAINED_DRIFT_SQL).toContain("raw_expired_at_utc IS NULL");
  expect(P4_WSSS_RETAINED_DRIFT_SQL).toContain("provider_content_expired_at_utc IS NULL");
  expect(P4_WSSS_RETAINED_DRIFT_SQL).toContain("LIMIT 12001");
  expect(P4_WSSS_RETAINED_DRIFT_SQL).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|TRUNCATE)\b/i);
  expect(script).toContain("auditP4WsssRetainedAsOfDriftV39");
  expect(script).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(script).not.toContain("fetchFidsAirport");
 });
});
