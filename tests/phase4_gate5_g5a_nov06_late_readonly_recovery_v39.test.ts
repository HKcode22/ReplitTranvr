import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 requireG5AIndependentAuditContextV39
} from "../scripts/v39_phase4_gate5_g5a_nov06_1400z_independent_real_cohort_readonly_audit";

const SHA="a".repeat(40);
const BASE:NodeJS.ProcessEnv={
 GITHUB_ACTIONS:"true",
 GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",
 GITHUB_SHA:SHA,
 GITHUB_RUN_ATTEMPT:"1",
 GITHUB_EVENT_NAME:"schedule",
 GITHUB_EVENT_SCHEDULE:"12 17 6 11 *",
 GITHUB_WORKFLOW:"Phase4 Gate5 G5A Nov6 14Z Independent Cohort Audit (No Provider)",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-g5a-nov06-1400z-independent-final-audit.yml@refs/heads/main",
 GITHUB_JOB:"audit-independent",
 P4_G5_G5A_NOV07_AUDIT_DATABASE_URL:"postgresql://reader:fixture@localhost/fixture",
 GATE05_AUTOMATION_DATABASE_URL:"",
 ADB_AUTO_COLLECT:"0",
 V39_PHASE6_PROCESS_ARMED:"0",
 G5A_INDEPENDENT_LATE_READONLY_RECOVERY:"0"
};
const manual=():NodeJS.ProcessEnv=>({
 ...BASE,GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_EVENT_SCHEDULE:"",
 G5A_INDEPENDENT_LATE_READONLY_RECOVERY:"1"
});
const attempt=(e:NodeJS.ProcessEnv,at:string)=>
 ()=>requireG5AIndependentAuditContextV39(e,SHA,Date.parse(at));
const HOLD="P4_G5_G5A_INDEPENDENT_GITHUB_READER_DATE_OR_ISOLATION_HOLD";

describe("G5A delayed independent audit recovery cannot replay a paid observation",()=>{
 it("preserves scheduled on-time audit but rejects delayed schedule unconditionally",()=>{
  expect(attempt(BASE,"2026-11-06T17:20:00Z")).not.toThrow();
  for(const at of ["2026-11-06T22:07:00Z","2026-11-07T00:00:00Z"])
   expect(attempt({...BASE,G5A_INDEPENDENT_LATE_READONLY_RECOVERY:"1"},at))
    .toThrow(HOLD);
 });
 it("admits a one-time explicit manual READ ONLY audit after GitHub scheduler delay",()=>{
  expect(attempt(manual(),"2026-11-06T22:30:00Z")).not.toThrow();
  expect(attempt(manual(),"2026-11-08T18:00:00Z")).not.toThrow();
  expect(attempt({...manual(),G5A_INDEPENDENT_LATE_READONLY_RECOVERY:"0"},
   "2026-11-06T22:30:00Z")).toThrow(HOLD);
  expect(attempt(manual(),"2026-11-06T21:59:59Z")).toThrow(HOLD);
  expect(attempt(manual(),"2026-11-09T08:00:00Z")).toThrow(HOLD);
 });
 it("refuses wrong fork, branch, sha, credentials, writer capability or rerun",()=>{
  const bad:NodeJS.ProcessEnv[]=[
   {...manual(),GITHUB_REPOSITORY:"another/repo"},
   {...manual(),GITHUB_REF:"refs/heads/fork"},
   {...manual(),GITHUB_SHA:"b".repeat(40)},
   {...manual(),GITHUB_RUN_ATTEMPT:"2"},
   {...manual(),GITHUB_WORKFLOW_REF:"another/path@refs/heads/main"},
   {...manual(),P4_G5_G5A_NOV07_AUDIT_DATABASE_URL:""},
   {...manual(),DATABASE_URL:"postgresql://admin:fixture@localhost/fixture"},
   {...manual(),V39_DATABASE_RUNTIME_URL:"postgresql://app:fixture@localhost/fixture"},
   {...manual(),P4_G5_SOURCE_OWNER_DATABASE_URL:"postgresql://writer:fixture@localhost/fixture"},
   {...manual(),AERODATABOX_API_KEY:"paid-key"},
   {...manual(),ADB_AUTO_COLLECT:"1"},
   {...manual(),V39_PHASE6_PROCESS_ARMED:"1"}
  ];
  for(const e of bad)
   expect(attempt(e,"2026-11-06T22:30:00Z")).toThrow(HOLD);
 });
 it("labels output as late attestation and retains no-provider least privilege",()=>{
  const wf=readFileSync(
   ".github/workflows/phase4-gate5-g5a-nov06-1400z-independent-final-audit.yml","utf8");
  const code=readFileSync(
   "scripts/v39_phase4_gate5_g5a_nov06_1400z_independent_real_cohort_readonly_audit.ts","utf8");
  expect(wf).toContain("late_readonly_recovery:");
  expect(wf).toContain("inputs.late_readonly_recovery == true");
  expect(wf).toContain("auditTimingClassification");
  expect(code).toContain("LATE_READONLY_METADATA_ATTESTATION_NOT_ORIGINAL_ON_TIME_AUDIT");
  expect(code).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(code).toContain("r.role!==\"p4_g5_g5a_nov07_readonly_20261105\"");
  expect(code).toContain("scientificGate5Passed:false");
  expect(code).not.toContain("raw_payload");
  expect(wf).not.toContain("AERODATABOX_API_KEY: ${{");
 });
});
