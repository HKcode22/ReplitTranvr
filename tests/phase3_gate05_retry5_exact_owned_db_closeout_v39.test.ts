import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {validateRetry5CloseoutEvidenceV39,verifyHistoricalExactDeleteLogV39} from
  "../scripts/v39_gate05_retry5_exact_owned_closeout_once_v39";

const owner=()=>({
  session_id:"e69ffa34-d8a6-456f-a49c-9dd459e6d294",
  state:"ACTIVE",
  source_commit:"1885703c04ba8f24bf8d1183f873eb86d1f83d7c",
  authorization_sha256:"7c3c58076322986b97744c234e25223818f2dcbd73ac525e392f3a0294654061",
  reviewed_stop_ticket_sha256:"aa6d6c9374bcca7af6b6beea7589e42bbb648649ee1d3493bcf75144c5bc6a7f",
  airport_icao:"WSSS",
  provider_subscription_id:"exactOwnedId-12345" as string|null,
  start_at_utc:new Date("2026-10-28T10:15:00.000Z"),
  stop_at_utc:new Date("2026-10-28T11:15:00.000Z"),
  alert_credit_ceiling:500,early_stop_credits:350,
  rest_api_units_ceiling:12,
  exact_owned_delete_verified:null as boolean|null,
  terminal_at_utc:null as Date|null,
  terminal_evidence_sha256:null as string|null
});
const input=()=>({
  owner:owner(),firstBalance:1981,lastBalance:1981,
  firstSubs:[] as Array<{id:string;isActive:boolean}>,
  lastSubs:[] as Array<{id:string;isActive:boolean}>
});
describe("one-use exact retry5 DB-only closeout evidence",()=>{
  it("accepts authenticated old owner, inactive exact ID and stable account counter",()=>{
    expect(validateRetry5CloseoutEvidenceV39(input()))
      .toEqual({providerId:"exactOwnedId-12345",netDebit:0});
  });
  it("can record bounded delayed spending without claiming it belongs to the pilot",()=>{
    const x=input();x.firstBalance=x.lastBalance=1971;
    expect(validateRetry5CloseoutEvidenceV39(x).netDebit).toBe(10);
  });
  it("refuses any live exact or foreign provider subscription on either inventory read",()=>{
    for(const list of ["firstSubs","lastSubs"] as const){
      for(const id of ["exactOwnedId-12345","foreignSubscription99"]){
        const x=input();x[list]=[{id,isActive:true}];
        expect(()=>validateRetry5CloseoutEvidenceV39(x)).toThrow("SOME_PROVIDER_SUBSCRIPTION_STILL_ACTIVE");
      }
    }
  });
  it("refuses changing balance, refill and over-500 debit",()=>{
    for(const [firstBalance,lastBalance] of [
      [1981,1980],[1981,1982],[2000,2000],[1480,1480],
      [-1,-1],[NaN,NaN]
    ]){
      const x=input();x.firstBalance=firstBalance;x.lastBalance=lastBalance;
      expect(()=>validateRetry5CloseoutEvidenceV39(x)).toThrow();
    }
  });
  it("refuses any other owner, stale field, post-terminal or unknown provider ID",()=>{
    const changes=[
      {session_id:"9a2a2958-4c48-431b-a95e-1681f907012d"},
      {state:"STOPPED"},{state:"FAILED"},{state:"PREPARED"},
      {provider_subscription_id:null},
      {source_commit:"0".repeat(40)},{authorization_sha256:"0".repeat(64)},
      {reviewed_stop_ticket_sha256:"0".repeat(64)},
      {airport_icao:"YSSY"},{early_stop_credits:500},
      {rest_api_units_ceiling:200},{alert_credit_ceiling:1000},
      {exact_owned_delete_verified:true},
      {terminal_evidence_sha256:"a".repeat(64)},
      {terminal_at_utc:new Date()}
    ] as Array<Partial<ReturnType<typeof owner>>>;
    for(const change of changes){
      const x=input();x.owner={...owner(),...change};
      expect(()=>validateRetry5CloseoutEvidenceV39(x)).toThrow();
    }
  });
  it("requires the actual original authenticated exact-delete receipt, not just a failed run status",()=>{
    const receipt=JSON.stringify({
      status:"GATE05_EMERGENCY_EXACT_STOP_ATTEMPT",
      exactOwnedIdEstablished:true,exactOwnedDeleteAttempted:true,
      exactOwnedDeleteVerified:true,databaseReadbackUnavailable:false
    });
    const log="2026-10-28T10:19:14.2459145Z "+receipt;
    expect(verifyHistoricalExactDeleteLogV39(log)).toMatch(/^[a-f0-9]{64}$/);
    expect(()=>verifyHistoricalExactDeleteLogV39(log+"\n"+log)).toThrow();
    expect(()=>verifyHistoricalExactDeleteLogV39("failed workflow")).toThrow();
    for(const field of ["exactOwnedIdEstablished",
       "exactOwnedDeleteAttempted","exactOwnedDeleteVerified"]){
      const neg=JSON.stringify({
        ...JSON.parse(receipt),[field]:false
      });
      expect(()=>verifyHistoricalExactDeleteLogV39(neg)).toThrow();
    }
    expect(()=>verifyHistoricalExactDeleteLogV39(
      JSON.stringify({...JSON.parse(receipt),
        databaseReadbackUnavailable:true})
    )).toThrow();
  });
  it("keeps the workflow manually reviewed and the source free of paid provider writes",()=>{
    const workflow=readFileSync(
      ".github/workflows/phase3-gate05-retry5-exact-owned-db-closeout.yml",
      "utf8"
    );
    const script=readFileSync(
      "scripts/v39_gate05_retry5_exact_owned_closeout_once_v39.ts","utf8"
    );
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("environment: phase2g-paid");
    expect(workflow).not.toMatch(/^\s+schedule:/m);
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).not.toMatch(/^\s+pull_request:/m);
    expect(script).not.toContain("createGate4SingleWithRawReceiptV39");
    expect(script).not.toContain("deleteSubscriptionVerifiedStrict");
    expect(script).not.toContain("createSubscriptionStrict");
    expect(script).toContain("WHERE session_id=$1::uuid AND state='ACTIVE'");
    expect(script).toContain("exact_owned_delete_verified=TRUE");
    expect(script).toContain("noProviderCreate:true,noProviderDelete:true");
  });
});
