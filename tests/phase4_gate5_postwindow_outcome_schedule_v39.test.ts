/** Phase 4 fixed after-window audit has zero paid provider activity. */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 requireP4InventoryActionsContext,
 requireP4PostWindowAuditScheduleV39,
 P4_WSSS_POSTWINDOW_AUDIT_SLOTS_V39
} from "../scripts/v39_gate5_source_inventory_readonly_actions";

const base={
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
 P4_GATE5_SOURCE_AIRPORT:"WSSS",
 P4_GATE5_READONLY_APPROVAL:"GATE5_SOURCE_METADATA_NO_PROVIDER"
} as NodeJS.ProcessEnv;
const slots=[
 {cron:"15 19 31 10 *",utc:"2026-10-31T19:15:00.000Z"},
 {cron:"15 22 31 10 *",utc:"2026-10-31T22:15:00.000Z"}
] as const;

describe("Phase 4 bounded GitHub after-flight outcome audit",()=>{
 it("accepts only both same-cohort post-service slots, no paid FIDS cron",()=>{
  expect(Object.keys(P4_WSSS_POSTWINDOW_AUDIT_SLOTS_V39)).toEqual(slots.map(s=>s.cron));
  for(const s of slots){
   const env={...base,P4_GATE5_POSTWINDOW_CRON:s.cron};
   expect(()=>requireP4PostWindowAuditScheduleV39(env,Date.parse(s.utc))).not.toThrow();
   expect(requireP4InventoryActionsContext(env,Date.parse(s.utc)+60_000))
    .toEqual({airport:"WSSS"});
  }
 });
 it("rejects wrong date, unlisted cron, wrong repo, late and ambiguous dual audit/paid scope",()=>{
  const s=slots[0],env={...base,P4_GATE5_POSTWINDOW_CRON:s.cron},n=Date.parse(s.utc);
  for(const bad of [
   {...env,GITHUB_REPOSITORY:"someone/other"},
   {...env,P4_FIDS_SCHEDULE_CRON:"7 10 31 10 *"},
   {...env,P4_GATE5_POSTWINDOW_CRON:"15 19 30 10 *"},
   {...env,GITHUB_EVENT_NAME:"workflow_dispatch"},
  ])expect(()=>requireP4InventoryActionsContext(bad,n)).toThrow();
  for(const t of [n-1,n+4*3_600_000+1,Date.parse("2027-10-31T19:15:00.000Z")])
   expect(()=>requireP4InventoryActionsContext(env,t)).toThrow();
  expect(()=>requireP4InventoryActionsContext({...env,GITHUB_RUN_ATTEMPT:"2"},n)).toThrow();
  expect(()=>requireP4InventoryActionsContext({...env,GITHUB_REF:"refs/heads/other"},n)).toThrow();
 });
 it("workflow is scheduled read-only after the frozen service interval with no provider secrets",()=>{
  const y=readFileSync(".github/workflows/phase4-gate5-wsss-postwindow-outcomes-readonly.yml","utf8");
  const script=readFileSync("scripts/v39_gate5_source_inventory_readonly_actions.ts","utf8");
  for(const s of slots)expect(y).toContain('cron: "'+s.cron+'"');
  expect(y).toContain("github.event.schedule");
  expect(y).toContain("GATE05_AUTOMATION_DATABASE_URL");
  expect(y).not.toContain("workflow_dispatch");
  expect(y).not.toContain("secrets.AERODATABOX_API_KEY");
  expect(y).not.toContain("P4_FIDS_SCHEDULE_CRON:");
  expect(script).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(script).toContain("auditP4LiveCaptureOutcomeV39");
  expect(script).toContain("strictGate5Passed:false");
  expect(script).not.toContain("fetchFidsAirport");
 });
});
