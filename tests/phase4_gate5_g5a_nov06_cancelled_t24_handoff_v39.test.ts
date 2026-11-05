import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {assertCancelledNov06T24HandoffV39,
 type CancelledT24Evidence}
 from "../server/lib/disruption/phase4Gate5G5ANov06CancelledT24Handoff_v39";

const valid:CancelledT24Evidence={
 originalRunId:"41972339194",originalJobId:127063231967,
 originalSha:"a509e336d50afd69e497595c6820c5b053693a5e",
 originalEvent:"workflow_dispatch",originalAttempt:1,
 originalStatus:"completed",originalConclusion:"cancelled",
 originalJobStatus:"completed",originalJobConclusion:"cancelled",
 originalRunStarted:"2026-11-05T05:10:42.000Z",
 originalJobStarted:"2026-11-05T05:10:46.000Z",
 originalJobCompleted:"2026-11-05T05:39:46.000Z",
 originalName:"Phase4 Gate5 G5A Nov6 WSSS Real Prospective GitHub Owner",
 originalPathAccepted:true,originalBranch:"main",
 currentRunId:"41980000000",currentJobStarted:"2026-11-05T06:00:00.000Z",
 prearmDeadline:"2026-11-05T07:30:00.000Z",
 firstPaidStart:"2026-11-05T08:30:00.000Z",
 existingOwnerState:"ACTIVE",existingOwnerRunId:"41972339194",
 ownerAuthorizationMatched:true,allowedQueriesMatched:3,
 totalPaidReservations:0,reservedProjectUnits:0,projectUnitCeiling:24
};
describe("Nov6 09Z T24 cancellation: immutable, zero-spend handoff only",()=>{
 it("accepts only exact completed, cancelled before any source call",()=>{
  expect(assertCancelledNov06T24HandoffV39(valid)).toBe(true);
 });
 it("rejects changed GitHub owner, branch, event, status or chronology",()=>{
  const mutations:Partial<CancelledT24Evidence>[]=[
   {originalRunId:"41972339195"},{originalJobId:127063231968},
   {originalSha:"f".repeat(40)},{originalEvent:"schedule"},
   {originalAttempt:2},{originalStatus:"in_progress"},
   {originalConclusion:"failure"},{originalConclusion:"success"},
   {originalJobStatus:"in_progress"},{originalJobConclusion:"failure"},
   {originalRunStarted:"2026-11-05T05:11:00.000Z"},
   {originalJobStarted:"2026-11-05T05:10:20.000Z"},
   {originalJobCompleted:"2026-11-05T08:30:01.000Z"},
   {originalJobCompleted:"2026-11-05T06:01:00.000Z"},
   {originalPathAccepted:false},{originalBranch:"other"},
   {originalName:"another workflow"},
   {currentRunId:"41972339194"},
   {currentJobStarted:"2026-11-05T05:39:00.000Z"},
   {currentJobStarted:"2026-11-05T07:31:00.000Z"},
   {firstPaidStart:"2026-11-05T07:30:00.000Z"},
   {prearmDeadline:"2026-11-05T08:40:00.000Z"}
  ];
  for(const change of mutations)
   expect(()=>assertCancelledNov06T24HandoffV39({...valid,...change}))
    .toThrow("P4_G5_G5A_NOV06_CANCELLED_OWNER_ZERO_SPEND_HANDOFF_HOLD");
 });
 it("rejects any paid attempt, drift or unverified original binding",()=>{
  const mutations:Partial<CancelledT24Evidence>[]=[
   {existingOwnerState:"STOPPED"},{existingOwnerRunId:"41980000000"},
   {ownerAuthorizationMatched:false},{allowedQueriesMatched:2},
   {totalPaidReservations:1},{reservedProjectUnits:2},
   {projectUnitCeiling:18}
  ];
  for(const change of mutations)
   expect(()=>assertCancelledNov06T24HandoffV39({...valid,...change}))
    .toThrow("P4_G5_G5A_NOV06_CANCELLED_OWNER_ZERO_SPEND_HANDOFF_HOLD");
 });
 it("production path preserves physical reservation-first/cutoffs and uses exclusive delegate lock",()=>{
  const path="scripts/v39_phase4_gate5_g5a_nov06_real_wsss_horizon_owner.ts";
  const s=readFileSync(path,"utf8");
  const handoff=readFileSync(
   "server/lib/disruption/phase4Gate5G5ANov06CancelledT24Handoff_v39.ts","utf8");
  expect(s).toContain("proveCancelledNov06T24ZeroSpendV39");
  expect(s).toContain("pg_try_advisory_lock(76,60906)");
  expect(s).toContain("delegatedRecoverySessionLock");
  expect(s).toContain("CANCELLED_T24_RECOVERY_SESSION_LOCK_LOST");
  expect(s).toContain("G5A_NOV06_BACKUP_OWNER_DUPLICATE_SUPPRESSED_NO_PROVIDER");
  expect(s).toContain("SELECT clean.reserve_phase4_g5_fids_physical_attempt_v39");
  expect(s).toContain("G5A_SECOND_PHYSICAL_PAID_GET_FORBIDDEN");
  expect(s).toContain("lateNoBackfill");
  expect(handoff).toContain('WHERE owner_digest=$1');
  expect(handoff).toContain("last_reserved_attempt");
  expect(handoff).toContain('originalConclusion!=="cancelled"');
  expect(s).toContain("originalProviderReservationsBeforeHandoff")
 });
});