import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {
 prearmedWsssT90HorizonV39,scheduledWsssHorizonV39
} from "../scripts/v39_phase4_one_prospective_fids_paid_actions";

const wfName="Phase4 WSSS T90 PREARMED GitHub One Paid FIDS GET";
const wfPath=".github/workflows/phase4-gate5-wsss-t90-push-prearm-20261031.yml";
const e={
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"push",
 GITHUB_SHA:"c".repeat(40),GITHUB_RUN_ATTEMPT:"1",
 GITHUB_JOB:"prearmed-one-fids",GITHUB_WORKFLOW:wfName,
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/"+wfPath+"@refs/heads/main",
 P4_FIDS_SCHEDULE_CRON:"37 14 31 10 *",
 P4_ONE_FIDS_EXACT_INTENT:"PHASE4_WSSS_OCT31_T90_PUSH_PREARM_ONE_GET_NO_RETRY"
} as NodeJS.ProcessEnv;
const at=(s:string)=>Date.parse(s);
describe("Github push-prearmed T90 one-shot source rescue after missed T6 schedule",()=>{
 it("strict authorized Github main push and only remaining same-cohort T90 event",()=>{
  const a=prearmedWsssT90HorizonV39(e,at("2026-10-31T14:37:00.000Z"));
  expect(a).toMatchObject({horizon:"T-90m"});
  expect(a.window.start.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  expect(a.window.end.toISOString()).toBe("2026-10-31T18:00:00.000Z");
  expect(a.cutoffUtc.toISOString()).toBe("2026-10-31T15:30:00.000Z");
  for(const bad of [
   {GITHUB_ACTIONS:"false"},{GITHUB_REPOSITORY:"other/repo"},
   {GITHUB_REF:"refs/heads/pr"},{GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_EVENT_NAME:"workflow_dispatch"},
   {GITHUB_RUN_ATTEMPT:"2"},{GITHUB_SHA:"short"},
   {GITHUB_JOB:"one-fids-horizon"},{GITHUB_WORKFLOW:"other-workflow"},
   {GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/other.yml@refs/heads/main"},
   {P4_FIDS_SCHEDULE_CRON:"7 10 31 10 *"},
   {P4_ONE_FIDS_EXACT_INTENT:"PHASE4_WSSS_THREE_HORIZON_SINGLE_GET_PER_CRON_NO_RETRIES"}
  ])expect(()=>prearmedWsssT90HorizonV39({...e,...bad},at("2026-10-31T14:37:00.000Z")))
   .toThrow("P4_FIDS_PUSH_PREARM_T90_CONTEXT_OR_CUTOFF_HOLD");
 });
 it("allows the exact earliest T90 and latest safe start; never late catch-up",()=>{
  const first=at("2026-10-31T14:27:00.000Z");
  const last=at("2026-10-31T15:15:00.000Z");
  expect(()=>prearmedWsssT90HorizonV39(e,first)).not.toThrow();
  expect(()=>prearmedWsssT90HorizonV39(e,last)).not.toThrow();
  expect(()=>prearmedWsssT90HorizonV39(e,first-1)).toThrow();
  expect(()=>prearmedWsssT90HorizonV39(e,last+1)).toThrow();
  expect(()=>prearmedWsssT90HorizonV39(e,at("2026-11-01T14:37:00Z"))).toThrow();
  expect(()=>prearmedWsssT90HorizonV39(e,at("2026-10-31T10:07:00Z"))).toThrow();
 });
 it("original dated T6 cron cannot be replayed or converted into a disguised push",()=>{
  const z={...e,GITHUB_EVENT_NAME:"schedule",
   P4_FIDS_SCHEDULE_CRON:"7 10 31 10 *",
   P4_ONE_FIDS_EXACT_INTENT:"PHASE4_WSSS_THREE_HORIZON_SINGLE_GET_PER_CRON_NO_RETRIES"};
  expect(()=>scheduledWsssHorizonV39(z,at("2026-10-31T12:31:00Z"))).toThrow();
  expect(()=>scheduledWsssHorizonV39(e,at("2026-10-31T14:37:00Z"))).toThrow();
 });
 it("push runner is one one-shot paid workflow, no cron, no dispatch, no provider pre-wait",()=>{
  const wf=readFileSync(wfPath,"utf8");
  const old=readFileSync(".github/workflows/phase4-gate5-three-prospective-wsss-cutoffs.yml","utf8");
  expect(wf).toContain("name: "+wfName);
  expect(wf).toContain("on:\n  push:");
  expect(wf).toContain('2026-10-31T14:37:00Z');
  expect(wf).toContain('2026-10-31T15:15:00Z');
  expect(wf).toContain("timeout-minutes: 195");
  expect(wf).toContain("environment: phase2g-paid");
  expect(wf).toContain("concurrency:\n  group: phase4-wsss-three-horizon-one-get-per-cutoff");
  expect(wf).not.toContain("on:\n  schedule:");
  expect(wf).not.toContain("workflow_dispatch");
  expect(wf).not.toContain("retry");
  expect(wf.split("AERODATABOX_API_KEY:").length).toBe(2);
  expect(wf.indexOf("AERODATABOX_API_KEY:")).toBeGreaterThan(wf.indexOf("P4_T90_START_WINDOW_REACHED"));
  expect(wf).toContain("node --import tsx scripts/v39_phase4_one_prospective_fids_paid_actions.ts");
  expect(old).not.toContain('cron: "37 14 31 10 *"');
  expect(old).toContain('cron: "7 10 31 10 *"');
 });
 it("rechecks protected physical dispatch and duplicate source before spending",()=>{
  const op=readFileSync("scripts/v39_phase4_one_prospective_fids_paid_actions.ts","utf8");
  const paid=op.slice(op.indexOf("const fetchOnce:"),op.indexOf("const params="));
  expect(paid).toContain("prearmedWsssT90HorizonV39(process.env,Date.now())");
  expect(paid).toContain("await refuseExistingT90ReceiptV39(dbUrl)");
  expect(paid.indexOf("await refuseExistingT90ReceiptV39(dbUrl)"))
   .toBeLessThan(paid.indexOf("billableAttempts=1;"));
  expect(paid.indexOf("billableAttempts=1;")).toBeLessThan(paid.indexOf("await fetch(url,"));
  expect(op).toContain("BEGIN TRANSACTION READ ONLY");
  expect(op).toContain("service_window_start_utc='2026-10-31T17:00:00.000Z'");
  expect(op).toContain("available_at>='2026-10-31T14:27:00.000Z'");
  expect(op).toContain("available_at<='2026-10-31T15:15:00.000Z'");
  expect(op).toContain("P4_FIDS_T90_PREARM_DUPLICATE_SOURCE_HOLD");
  expect(paid.match(/billableAttempts=1/g)).toHaveLength(1);
  expect(op).not.toContain("createSubscription");
 });
});