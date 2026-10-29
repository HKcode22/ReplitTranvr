import {describe,it,expect} from "vitest";
import {gate05OnePaidLaunchReceiptChecksV39}
  from "../scripts/v39_gate05_science_one_paid_create_newscope_20261028_v39";

const head="a".repeat(40);
const receiver="84b7f1565d0402facc8c3b9aacedc599eb6e2af1";
const scope="12345678-1234-4234-8234-123456789abc";
const m={
  scope,receiver,
  authorizationSha256:"b".repeat(64),
  stopTicketSha256:"c".repeat(64),
  stopUtc:"2026-10-29T04:00:00.000Z"
};
const now="2026-10-29T03:01:00.000Z";
const run={
  status:"in_progress",head_sha:head,head_branch:"main",
  event:"workflow_dispatch",run_attempt:1,
  path:".github/workflows/phase3-gate05-science-exact-owned-stop-retry5.yml",
  display_title:"Gate05 Science STOP "+scope
};
const jobs={jobs:[{
  name:"exact-owned-stop",status:"in_progress",
  steps:[{
    name:"Run independently authorized exact-owned STOP, never CREATE",
    status:"in_progress"
  }]
}]};
const proof={
  created_at:"2026-10-29T03:00:00.000Z",
  user:{login:"github-actions[bot]"},
  body:JSON.stringify({
    schema:"v39.gate05.science-actions-stop-armed.v1",
    status:"LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE",
    scope,runner:head,receiver,stopUtc:m.stopUtc,
    softCreditStop:350,providerHardCap:false
  })
};
const verified=(r:unknown=run,j:unknown=jobs,p:unknown[]=[proof],when=now)=>
  gate05OnePaidLaunchReceiptChecksV39(r,j,p,m,head,when);

describe("Gate05 fresh paid controller independent STOP actual ARMED receipt",()=>{
  it("accepts only exactly matching in-progress independent STOP plus recent bot proof",()=>{
    expect(verified()).toBe(true);
  });
  it("rejects a queued STOP or a job that never reached the actual STOP step",()=>{
    expect(verified({...run,status:"queued"})).toBe(false);
    expect(verified(run,{jobs:[{name:"exact-owned-stop",status:"in_progress",
      steps:[{name:"Run independently authorized exact-owned STOP, never CREATE",
        status:"pending"}]}]})).toBe(false);
  });
  it("rejects forged commenter or stale receipt",()=>{
    expect(verified(run,jobs,[{...proof,user:{login:"HKcode22"}}])).toBe(false);
    expect(verified(run,jobs,[{...proof,created_at:"2026-10-29T02:30:00.000Z"}])).toBe(false);
    expect(verified(run,jobs,[])).toBe(false);
  });
  it("rejects scope/source mismatch and a false provider-hard-cap claim",()=>{
    const x=JSON.parse(proof.body);
    expect(verified(run,jobs,[{...proof,body:JSON.stringify({...x,scope:"00000000-0000-4000-8000-000000000000"})}])).toBe(false);
    expect(verified(run,jobs,[{...proof,body:JSON.stringify({...x,providerHardCap:true})}])).toBe(false);
    expect(verified({...run,head_sha:"d".repeat(40)})).toBe(false);
  });
  it("rejects incorrect retry or wrong GitHub workflow",()=>{
    expect(verified({...run,run_attempt:2})).toBe(false);
    expect(verified({...run,path:".github/workflows/phase3-gate05-github-automated-retry5.yml"})).toBe(false);
  });
});