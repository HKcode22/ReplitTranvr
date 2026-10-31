import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {scheduledWsssHorizonV39}
 from "../scripts/v39_phase4_one_prospective_fids_paid_actions";

const env={
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
 P4_ONE_FIDS_EXACT_INTENT:"PHASE4_WSSS_THREE_HORIZON_SINGLE_GET_PER_CRON_NO_RETRIES"
} as NodeJS.ProcessEnv;
const slots=[
 {cron:"7 16 30 10 *",t:"2026-10-30T16:07:00Z",
  cutoff:"2026-10-30T17:00:00.000Z",h:"T-24h"},
 {cron:"7 10 31 10 *",t:"2026-10-31T10:07:00Z",
  cutoff:"2026-10-31T11:00:00.000Z",h:"T-6h"},
 {cron:"37 14 31 10 *",t:"2026-10-31T14:37:00Z",
  cutoff:"2026-10-31T15:30:00.000Z",h:"T-90m"}
] as const;
describe("Three automated source cutoff observation opportunities",()=>{
 it("uses the exact same WSSS service interval and preserves each cutoff",()=>{
  const seen=new Set<string>();
  for(const v of slots){
   const r=scheduledWsssHorizonV39({...env,P4_FIDS_SCHEDULE_CRON:v.cron},
      Date.parse(v.t)+2*60_000);
   expect(r.window.start.toISOString()).toBe("2026-10-31T17:00:00.000Z");
   expect(r.window.end.toISOString()).toBe("2026-10-31T18:00:00.000Z");
   expect(r.cutoffUtc.toISOString()).toBe(v.cutoff);
   expect(r.horizon).toBe(v.h);
   expect(r.cutoffUtc.getTime()-Date.parse(v.t)).toBe(53*60_000);
   seen.add(r.horizon);
  }
  expect(seen.size).toBe(3);
 });
 it("never spends after cutoff, on another date, wrong PR, cron or manual trigger",()=>{
  const v=slots[0],legit={...env,P4_FIDS_SCHEDULE_CRON:v.cron};
  for(const invalid of [
   {...legit,GITHUB_RUN_ATTEMPT:"2"},
   {...legit,GITHUB_REF:"refs/heads/old"},
   {...legit,GITHUB_EVENT_NAME:"push"},
   {...legit,P4_FIDS_SCHEDULE_CRON:"* * * * *"},
   {...legit,GITHUB_REPOSITORY:"different/repo"},
   {...legit,P4_ONE_FIDS_EXACT_INTENT:"UNKNOWN"}
  ])expect(()=>scheduledWsssHorizonV39(invalid,Date.parse(v.t)))
    .toThrow("P4_FIDS_SCHEDULED_HORIZON_WINDOW_HOLD");
  expect(()=>scheduledWsssHorizonV39(legit,Date.parse(v.t)-12*60_000))
   .toThrow("P4_FIDS_SCHEDULED_HORIZON_WINDOW_HOLD");
  expect(()=>scheduledWsssHorizonV39(legit,Date.parse(v.cutoff)-10*60_000))
   .toThrow("P4_FIDS_SCHEDULED_HORIZON_WINDOW_HOLD");
  expect(()=>scheduledWsssHorizonV39(legit,Date.parse("2027-10-30T16:00:00Z")))
   .toThrow("P4_FIDS_SCHEDULED_HORIZON_WINDOW_HOLD");
 });
 it("GitHub-only dated cron never runs on push, has no provider retries or Alert",()=>{
  const wf=readFileSync(".github/workflows/phase4-gate5-three-prospective-wsss-cutoffs.yml","utf8");
  const op=readFileSync("scripts/v39_phase4_one_prospective_fids_paid_actions.ts","utf8");
  expect(wf).toContain("environment: phase2g-paid");
  expect(wf).toContain("github.event.schedule");
  expect(wf).not.toContain("workflow_dispatch");
  expect(wf).not.toContain("branches: [main]");
  for(const x of slots.slice(0,2))expect(wf).toContain('cron: "'+x.cron+'"');
  expect(wf).not.toContain('cron: "37 14 31 10 *"');
  const prearm=readFileSync(
    ".github/workflows/phase4-gate5-wsss-t90-push-prearm-20261031.yml","utf8"
  );
  expect(prearm).toContain("branches: [main]");
  expect(prearm).toContain("2026-10-31T14:37:00Z");
  expect(prearm).toContain("2026-10-31T15:15:00Z");
  expect(prearm).toContain("PHASE4_WSSS_OCT31_T90_PUSH_PREARM_ONE_GET_NO_RETRY");
  expect(prearm).not.toContain("on:\n  schedule:");
  expect(wf).not.toContain("on:\n  push:");
  expect(op).toContain("billableAttempts=1;");
  expect(op).toContain("providerRetries:0");
  expect(op).toContain("strictGate5Passed:false");
  expect(op).toContain("phase6Authorized:false");
  expect(op).not.toContain("createSubscription");
 });
});
