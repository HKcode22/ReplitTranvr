import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {
 gate05MayCreateInTimeV39,gate05OnePaidLaunchReceiptChecksV39
} from "../scripts/v39_gate05_science_one_paid_create_once_v39";
const code=readFileSync("scripts/v39_gate05_science_one_paid_create_once_v39.ts","utf8");
const m={
  scope:"dfac0bd1-e68a-41b6-9540-4a1ceaa23a16",
  authorizationSha256:"a".repeat(64),
  stopTicketSha256:"b".repeat(64),
  receiver:"c".repeat(40),
  startUtc:"2026-10-28T03:00:00.000Z",
  stopUtc:"2026-10-28T04:00:00.000Z"
};
const head="d".repeat(40);
const now="2026-10-28T02:59:59.000Z";
const valid=()=>({
  run:{
    status:"in_progress",head_sha:head,head_branch:"main",
    event:"workflow_dispatch",run_attempt:1,
    path:".github/workflows/phase3-gate05-science-exact-owned-stop.yml",
    display_title:"Gate05 Science STOP "+m.scope
  },
  jobs:{jobs:[{
    name:"exact-owned-stop",status:"in_progress",
    steps:[{name:"Run independently authorized exact-owned STOP, never CREATE",
      status:"in_progress"}]
  }]},
  proof:[{
    created_at:"2026-10-28T02:57:00.000Z",
    user:{login:"github-actions[bot]"},
    body:JSON.stringify({
      schema:"v39.gate05.science-actions-stop-armed.v1",
      status:"LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE",
      scope:m.scope,runner:head,receiver:m.receiver,
      stopUtc:m.stopUtc,softCreditStop:350,providerHardCap:false
    })
  }]
});
describe("one WSSS paid CREATE only after real exact-owned independent Actions STOP",()=>{
  it("accepts real active stop step and recent same-scope bot ARMED proof",()=>{
    const x=valid();
    expect(gate05OnePaidLaunchReceiptChecksV39(
      x.run,x.jobs,x.proof,m,head,now)).toBe(true);
  });
  it("rejects queued stop, changed run SHA, wrong provider scope and stale proof",()=>{
    const x=valid();x.run.status="queued";
    expect(gate05OnePaidLaunchReceiptChecksV39(
      x.run,x.jobs,x.proof,m,head,now)).toBe(false);
    x.run.status="in_progress";x.run.head_sha="f".repeat(40);
    expect(gate05OnePaidLaunchReceiptChecksV39(
      x.run,x.jobs,x.proof,m,head,now)).toBe(false);
    x.run.head_sha=head;
    x.jobs.jobs[0].steps[0].status="completed";
    expect(gate05OnePaidLaunchReceiptChecksV39(
      x.run,x.jobs,x.proof,m,head,now)).toBe(false);
    x.jobs.jobs[0].steps[0].status="in_progress";
    x.proof[0].user.login="random-user";
    expect(gate05OnePaidLaunchReceiptChecksV39(
      x.run,x.jobs,x.proof,m,head,now)).toBe(false);
    x.proof[0].user.login="github-actions[bot]";
    x.proof[0].created_at="2026-10-28T02:40:00.000Z";
    expect(gate05OnePaidLaunchReceiptChecksV39(
      x.run,x.jobs,x.proof,m,head,now)).toBe(false);
  });
  it("permits only the actual 60m start window",()=>{
    const t=Date.parse("2026-10-28T03:00:00.000Z");
    expect(gate05MayCreateInTimeV39(t-90000,t,t+3600000)).toBe(true);
    expect(gate05MayCreateInTimeV39(t,t,t+3600000)).toBe(true);
    expect(gate05MayCreateInTimeV39(t+16000,t,t+3600000)).toBe(false);
    expect(gate05MayCreateInTimeV39(t,t,t+40*60000)).toBe(false);
  });
  it("writes no-retry intent BEFORE exact one provider CREATE and binds same logged owner",()=>{
    const atIntent=code.indexOf("privateOnce(INTENT");
    const atPost=code.indexOf("const response=await createGate4SingleWithRawReceiptV39");
    expect(atIntent).toBeGreaterThan(0);
    expect(atPost).toBeGreaterThan(atIntent);
    expect(code).toContain("providerCreateAttemptsAllowed:1");
    expect(code).toContain('maxDeliveryRetries:0');
    expect(code).toContain("/prepaid/"+'"+m.scope'); 
    expect(code).toContain("phase3_gate05_science_owner_v39");
    expect(code).toContain("prepaid_probe_session_runtime");
    expect(code).toContain("deleteSubscriptionVerifiedStrict(created");
    expect(code).toContain("noBlindCreateRetry:true");
    expect(code).not.toContain("refillBalance(");
    expect(code).not.toContain("fetchFidsAirport(");
  });
  it("never declares scientific PASS from a single paid provider CREATE",()=>{
    expect(code).toContain("strictSciencePassed:false");
    expect(code).toContain("providerSubscriptionIdBound:true");
    expect(code).toContain("independentStopJobPreviouslyVerified:true");
    expect(code).toContain("creditCeiling:500");
  });
});
