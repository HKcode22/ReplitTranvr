import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {verifyG5AT24RecoveryEvidenceV39}
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
describe("G5A exact Nov4 57P01 recovery without another paid owner",()=>{
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
