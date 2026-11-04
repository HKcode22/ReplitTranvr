import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {verifyG5AT24RecoveryEvidenceV39,
 verifyG5AT24CancelledSuccessorV39}
 from "../server/lib/disruption/phase4Gate5G5AT24FailedOwnerRecovery_v39";
const valid={
 originalRunId:"41810504164",newRunId:"41810900001",
 oldSha:"266ec47814bfb5482902eeb94dd83e4bc0975e3e",
 oldRunName:"Phase4 Gate5 G5A WSSS Real Prospective GitHub Owner",
 oldRunPath:".github/workflows/phase4-gate5-g5a-real-wsss-prospective-owner.yml",
 oldRunEvent:"workflow_dispatch",oldRunAttempt:1,
 oldRunState:"completed",oldRunConclusion:"failure",
 oldJobState:"completed",oldJobConclusion:"failure",
 oldRunStartedAtUtc:"2026-11-04T09:53:04.000Z",
 oldJobStartedAtUtc:"2026-11-04T09:53:09.000Z",
 oldJobCompletedAtUtc:"2026-11-04T09:55:02.000Z",
 newJobStartedAtUtc:"2026-11-04T10:20:00.000Z",
 oldOwnerState:"ACTIVE",
 oldOwnerJobStartUtc:"2026-11-04T09:53:09.000Z",
 oldAuthMatches:true,matchingQueries:3,
 prearmDeadlineUtc:"2026-11-04T12:30:00.000Z",
 attempts:0,reservedUnits:0
};
const cancelled={
 runId:"41813236781",
 headSha:"aba2ece12522728ad4775d1b2ab91959be3f1e05",
 repo:"HKcode22/ReplitTranvr",branch:"main",
 name:"Phase4 Gate5 G5A WSSS Real Prospective GitHub Owner",
 path:".github/workflows/phase4-gate5-g5a-real-wsss-prospective-owner.yml",
 event:"workflow_dispatch",attempt:1,status:"completed",conclusion:"cancelled",
 runStarted:"2026-11-04T10:17:58.000Z",jobRunId:41813236781,
 jobName:"owner-t24",jobStatus:"completed",jobConclusion:"cancelled",
 jobStarted:"2026-11-04T10:18:05.000Z",
 jobCompleted:"2026-11-04T10:40:54.000Z",
 currentRunId:"41814500001",currentJobStarted:"2026-11-04T11:00:00.000Z",
 prearmDeadline:"2026-11-04T12:30:00.000Z"
};
describe("G5A exact Nov4 57P01 recovery without another paid owner",()=>{
 it("continuation requires genuinely completed and cancelled 2nd owner, not a mere cancel request",()=>{
  expect(verifyG5AT24CancelledSuccessorV39(cancelled)).toBe(true);
  for(const change of [
    {runId:"41813236782"},{headSha:"c".repeat(40)},
    {repo:"other/repo"},{branch:"old"},
    {name:"another workflow"},{path:"other.yml"},
    {event:"push"},{attempt:2},
    {status:"in_progress"},{conclusion:null as any},
    {conclusion:"failure"},{jobRunId:41813236780},
    {jobName:"owner-t6"},{jobStatus:"in_progress"},
    {jobConclusion:"failure"},
    {runStarted:"2026-11-04T10:19:00.000Z"},
    {jobStarted:"2026-11-04T10:16:00.000Z"},
    {jobCompleted:"2026-11-04T13:30:01.000Z"},
    {currentJobStarted:"2026-11-04T10:39:00.000Z"},
    {currentJobStarted:"2026-11-04T12:31:00.000Z"},
    {currentRunId:"41813236781"}
  ])expect(()=>verifyG5AT24CancelledSuccessorV39({...cancelled,...change}))
    .toThrow("P4_G5_G5A_57P01_ORIGINAL_OWNER_RECOVERY_HOLD");
 });
 it("live owner uses bounded read-only keepalive before source, does not auto-retry source",()=>{
  const source=readFileSync("scripts/v39_phase4_gate5_g5a_real_wsss_horizon_owner.ts","utf8");
  expect(source).toContain('db.query("SELECT clock_timestamp() AS db_now_utc")');
  expect(source).toContain("readOnlyHealthProbe");
  expect(source).toContain("await readOnlyHealthProbe()");
  expect(source).toContain("await repairIdle()");
  expect(source).toContain("PG_IDLE_RECONNECT_UNAVAILABLE");
  expect(source).toContain("if(attempt<3)await sleep(attempt*900)");
  expect(source).toContain("G5A_SECOND_PHYSICAL_PAID_GET_FORBIDDEN");
 });

 it("accepts only exact already failed genuine owner and zero physical reservations",()=>{
  expect(verifyG5AT24RecoveryEvidenceV39(valid)).toBe(true);
  for(const x of [
   {originalRunId:"41810504165"},{newRunId:"41810504164"},
   {oldSha:"a".repeat(40)},{oldRunName:"foreign"},
   {oldRunPath:".github/workflows/foreign.yml"},
   {oldRunEvent:"schedule"},{oldRunAttempt:2},
   {oldRunState:"in_progress"},{oldRunConclusion:"success"},
   {oldJobState:"in_progress"},{oldJobConclusion:"success"},
   {oldRunStartedAtUtc:"2026-11-04T09:55:00.000Z"},
   {oldJobStartedAtUtc:"2026-11-04T12:31:00.000Z"},
   {oldJobCompletedAtUtc:"2026-11-04T10:21:00.000Z"},
   {newJobStartedAtUtc:"2026-11-04T12:31:00.000Z"},
   {oldOwnerState:"STOPPED"},
   {oldOwnerJobStartUtc:"2026-11-04T09:54:00.000Z"},
   {oldAuthMatches:false},{matchingQueries:2},
   {attempts:1},{reservedUnits:2}
  ])expect(()=>verifyG5AT24RecoveryEvidenceV39({...valid,...x}))
   .toThrow("P4_G5_G5A_57P01_ORIGINAL_OWNER_RECOVERY_HOLD");
 });
 it("handles asynchronous pg error rather than replaying an uncertain paid reservation",()=>{
  const s=readFileSync("scripts/v39_phase4_gate5_g5a_real_wsss_horizon_owner.ts","utf8");
  expect(s).toContain('client.on("error"');
  expect(s).toContain("await repairIdle()");
  expect(s).toContain("proveAndBindFailedG5AT24OwnerV39");
  expect(s).toContain("boundRunId");
  expect(s).toContain("boundAuthSha");
  expect(s).toContain("G5A_BACKUP_OWNER_DUPLICATE_SUPPRESSED_NO_PROVIDER");
  expect(s).not.toContain("forceNewOwnerOnCrash");
 });
});
