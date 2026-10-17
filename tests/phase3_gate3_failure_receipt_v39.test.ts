import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import pg from "pg";
import {
  recordGate3CanaryFailureV39,
  type Gate3FailureReceiptInputV39,
} from "../server/lib/disruption/gate3CanaryFailureReceipt_v39";

const sha="a".repeat(64),evidence="c".repeat(64);
const fixture=():Gate3FailureReceiptInputV39=>({
  sessionId:randomUUID(),icao:"YSSY",
  authorizationEvidenceSha256:sha,
  safeEvidenceSha256:evidence,
  failureCode:"CREATE_AMBIGUOUS_ACCOUNT_HOLD",
});
describe("Gate3 durable FAILED receipt: no provider and no successful certification",()=>{
  it("invalid session, auth SHA, evidence SHA, reason fail before SQL",async()=>{
    let calls=0;
    const client={query:async()=>{calls++;throw Error("SQL_NOT_ALLOWED");}};
    for(const patch of [
      {sessionId:"invalid"},{icao:"YSS"},
      {authorizationEvidenceSha256:"bad"},
      {safeEvidenceSha256:"bad"},
      {failureCode:"SETTLED_AND_PAID"},
    ]){
      await expect(recordGate3CanaryFailureV39(client as any,{
        ...fixture(),...patch,
      } as Gate3FailureReceiptInputV39)).rejects.toThrow(
        "GATE3_FAILED_RECEIPT_INPUT_INVALID",
      );
    }
    expect(calls).toBe(0);
  });
  it("missing LOGGED owner is HOLD, never creates/rearms one",async()=>{
    let calls=0;
    const client={query:async()=>{
      calls++;return {rowCount:0,rows:[]};
    }};
    await expect(recordGate3CanaryFailureV39(client as any,fixture()))
      .rejects.toThrow("GATE3_FAILED_RECEIPT_OWNER_NOT_FOUND");
    expect(calls).toBe(1);
  });
  it("wrong source scope is rejected before any SQL mutation",async()=>{
    const x=fixture();
    let calls=0;
    const client={query:async()=>{
      calls++;
      return {rowCount:1,rows:[{
        icao:"SKBO",authorization_evidence_sha256:sha,
        state:"PREPARED",
      }]};
    }};
    await expect(recordGate3CanaryFailureV39(client as any,x))
      .rejects.toThrow("GATE3_FAILED_RECEIPT_OWNER_SCOPE_MISMATCH");
    expect(calls).toBe(1);
  });
  it("identical failed receipt is replay-safe, conflicting failure is HOLD",async()=>{
    const x=fixture();let calls=0;
    const client={query:async()=>{
      calls++;return {rowCount:1,rows:[{
        icao:x.icao,authorization_evidence_sha256:x.authorizationEvidenceSha256,
        state:"FAILED",failure_reason:x.failureCode,
        evidence_sha256:x.safeEvidenceSha256,
      }]};
    }};
    const already=await recordGate3CanaryFailureV39(client as any,x);
    expect(already).toMatchObject({
      disposition:"ALREADY_IDENTICALLY_FAILED",authorizesAnotherRun:false,
      confirmsProviderSubscriptionDeleted:false,confirmsAccountSettled:false,
      providerCalls:0,
    });
    expect(calls).toBe(1);
    await expect(recordGate3CanaryFailureV39(client as any,{
      ...x,failureCode:"OWNED_DELETE_UNVERIFIED",
    })).rejects.toThrow("GATE3_FAILED_RECEIPT_TERMINAL_CONFLICT");
    expect(calls).toBe(2);
  });
  it("cannot overwrite a SETTLED owner into FAILED",async()=>{
    const x=fixture();
    const client={query:async()=>({rowCount:1,rows:[{
      icao:x.icao,authorization_evidence_sha256:x.authorizationEvidenceSha256,
      state:"SETTLED",failure_reason:null,evidence_sha256:evidence,
    }]})};
    await expect(recordGate3CanaryFailureV39(client as any,x))
      .rejects.toThrow("GATE3_FAILED_RECEIPT_TERMINAL_CONFLICT");
  });
});
const url=process.env.DATABASE_URL??"";
let local=false;
try{
  const u=new URL(url);
  local=process.env.GITHUB_ACTIONS==="true" &&
    ["localhost","127.0.0.1"].includes(u.hostname)&&
    u.pathname==="/v39_ci"&&!process.env.AERODATABOX_API_KEY;
}catch{}
const pgSuite=local?describe:describe.skip;
pgSuite("Gate3 FAILED receipt on disposable PostgreSQL only",()=>{
  it("one immutable FAILED row and exact replay; no persisted provider balances",async()=>{
    const client=new pg.Client({connectionString:url,connectionTimeoutMillis:8000});
    await client.connect();
    const x=fixture();
    try{
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO clean.phase3_gate3_canary_owner_v39
          (session_id,icao,authorization_evidence_sha256,
           canary_credit_ceiling,fixed_exposure_seconds,expires_at_utc)
        VALUES ($1,$2,$3,20,300,now()+interval '60 minutes')`,
        [x.sessionId,x.icao,x.authorizationEvidenceSha256],
      );
      const first=await recordGate3CanaryFailureV39(client,x);
      expect(first).toMatchObject({
        disposition:"FAILED_RECORDED",providerCalls:0,
        confirmsProviderSubscriptionDeleted:false,confirmsAccountSettled:false,
        authorizesAnotherRun:false,
      });
      const replay=await recordGate3CanaryFailureV39(client,x);
      expect(replay.disposition).toBe("ALREADY_IDENTICALLY_FAILED");
      const r=await client.query(
        `SELECT state,failure_reason,evidence_sha256,
                internal_received_credits,exact_reconciliation_verified,
                owned_subscription_delete_verified,foreign_billable_count,
                stable_read_count,terminal_at_utc
         FROM clean.phase3_gate3_canary_owner_v39 WHERE session_id=$1`,
        [x.sessionId],
      );
      expect(r.rows[0]).toMatchObject({
        state:"FAILED",failure_reason:x.failureCode,
        evidence_sha256:x.safeEvidenceSha256,
        internal_received_credits:null,exact_reconciliation_verified:null,
        owned_subscription_delete_verified:null,
        foreign_billable_count:null,stable_read_count:null,
      });
      expect(r.rows[0].terminal_at_utc).toBeTruthy();
      await client.query("SAVEPOINT terminal_conflict");
      await expect(client.query(
        `UPDATE clean.phase3_gate3_canary_owner_v39
            SET state='SETTLED', exact_reconciliation_verified=true,
                internal_received_credits=3,stable_read_count=3,
                owned_subscription_delete_verified=true,foreign_billable_count=0
          WHERE session_id=$1`,[x.sessionId],
      )).rejects.toThrow(/terminal receipt immutable/);
      await client.query("ROLLBACK TO SAVEPOINT terminal_conflict");
      await expect(recordGate3CanaryFailureV39(client,{
        ...x,failureCode:"CREDIT_DIFFERENCE",
      })).rejects.toThrow("GATE3_FAILED_RECEIPT_TERMINAL_CONFLICT");
    }finally{
      await client.query("ROLLBACK").catch(()=>undefined);
      await client.end();
    }
  },30000);
});
