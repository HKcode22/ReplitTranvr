import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import type {Pool} from "pg";
import pg from "pg";
import {
  commitGate3CanaryFailureV39,
} from "../server/lib/disruption/gate3CanaryFailureCommit_v39";
import type {
  Gate3FailureReceiptInputV39,
} from "../server/lib/disruption/gate3CanaryFailureReceipt_v39";

const auth="a".repeat(64),evidence="e".repeat(64);
const fixture=():Gate3FailureReceiptInputV39=>({
  sessionId:randomUUID(),icao:"YSSY",
  authorizationEvidenceSha256:auth,safeEvidenceSha256:evidence,
  failureCode:"CREATE_AMBIGUOUS_ACCOUNT_HOLD",
});

function fakePool(input:Gate3FailureReceiptInputV39, options?:{
  alreadyFailed?:boolean;missing?:boolean;
  rejectUpdate?:boolean;rejectCommit?:boolean;rejectBegin?:boolean;
  rejectConnect?:boolean;
}){
  const calls:string[]=[];
  let released=0;
  const client={
    async query(sql:string){
      const op=sql.startsWith("SELECT session_id")?"SELECT":
        sql.startsWith("UPDATE clean.phase3")?"UPDATE":sql;
      calls.push(op);
      if(op==="BEGIN"&&options?.rejectBegin)throw Error("BEGIN_ERROR");
      if(op==="COMMIT"&&options?.rejectCommit)throw Error("COMMIT_CONNECTION_LOST");
      if(op==="UPDATE"&&options?.rejectUpdate)throw Error("SQL_UPDATE_FAILED");
      if(op==="SELECT")return options?.missing?{rowCount:0,rows:[]}:{
        rowCount:1,rows:[{
          icao:input.icao,
          authorization_evidence_sha256:input.authorizationEvidenceSha256,
          state:options?.alreadyFailed?"FAILED":"PREPARED",
          failure_reason:options?.alreadyFailed?input.failureCode:null,
          evidence_sha256:options?.alreadyFailed?input.safeEvidenceSha256:null,
        }],
      };
      return {rowCount:1,rows:[{session_id:input.sessionId}]};
    },
    release(){released++;},
  };
  const pool={
    connect:async()=>{
      if(options?.rejectConnect)throw Error("CONNECT_UNAVAILABLE");
      return client;
    },
  } as unknown as Pick<Pool,"connect">;
  return {pool,calls,get released(){return released;}};
}

describe("Gate3 failure commit owner — one durable attempt, never paid",()=>{
  it("acknowledges COMMIT only after exact scoped receipt UPDATE",async()=>{
    const x=fixture(),h=fakePool(x);
    const r=await commitGate3CanaryFailureV39(h.pool,x);
    expect(h.calls).toEqual(["BEGIN","SELECT","UPDATE","COMMIT"]);
    expect(h.released).toBe(1);
    expect(r).toMatchObject({
      disposition:"DURABLY_FAILED",committed:true,providerCalls:0,
      authorizesAnotherRun:false,
      confirmsProviderSubscriptionDeleted:false,confirmsAccountSettled:false,
    });
  });
  it("unchanged replay only, but still requires an acknowledged COMMIT",async()=>{
    const x=fixture(),h=fakePool(x,{alreadyFailed:true});
    const r=await commitGate3CanaryFailureV39(h.pool,x);
    expect(h.calls).toEqual(["BEGIN","SELECT","COMMIT"]);
    expect(r.disposition).toBe("DURABLY_ALREADY_IDENTICAL_FAILED");
    expect(h.released).toBe(1);
  });
  it("ambiguous COMMIT never returns durable success, retries, or rolls back",async()=>{
    const x=fixture(),h=fakePool(x,{rejectCommit:true});
    await expect(commitGate3CanaryFailureV39(h.pool,x)).rejects
      .toThrow("GATE3_FAILED_COMMIT_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
    expect(h.calls).toEqual(["BEGIN","SELECT","UPDATE","COMMIT"]);
    expect(h.released).toBe(1);
  });
  it("read or UPDATE failure rolls back; no false durability",async()=>{
    for(const settings of [{missing:true},{rejectUpdate:true}]){
      const x=fixture(),h=fakePool(x,settings);
      await expect(commitGate3CanaryFailureV39(h.pool,x)).rejects.toThrow();
      expect(h.calls.at(-1)).toBe("ROLLBACK");
      expect(h.calls).not.toContain("COMMIT");
      expect(h.released).toBe(1);
    }
  });
  it("BEGIN/connect failure never enters provider or falsely commits",async()=>{
    const x=fixture(),begin=fakePool(x,{rejectBegin:true});
    await expect(commitGate3CanaryFailureV39(begin.pool,x)).rejects
      .toThrow("BEGIN_ERROR");
    expect(begin.calls).toEqual(["BEGIN"]);
    expect(begin.released).toBe(1);
    const missing=fakePool(x,{rejectConnect:true});
    await expect(commitGate3CanaryFailureV39(missing.pool,x)).rejects
      .toThrow("GATE3_FAILED_COMMIT_CONNECT_FAILED_HOLD");
    expect(missing.calls).toEqual([]);
  });
  it("rejects invalid provider-free pool before any SQL",async()=>{
    await expect(commitGate3CanaryFailureV39({} as Pick<Pool,"connect">,fixture()))
      .rejects.toThrow("GATE3_FAILED_COMMIT_POOL_REQUIRED");
  });
});

const url=process.env.DATABASE_URL??"";
let local=false;
try{
  const u=new URL(url);
  local=process.env.GITHUB_ACTIONS==="true" &&
    ["localhost","127.0.0.1"].includes(u.hostname) &&
    u.pathname==="/v39_ci"&&!process.env.AERODATABOX_API_KEY;
}catch{}
const postgresSuite=local?describe:describe.skip;
postgresSuite("Gate3 acknowledged failure commit on disposable localhost PG",()=>{
  it("persists across new connections; identical replay; no provider balances",async()=>{
    const pool=new pg.Pool({connectionString:url,connectionTimeoutMillis:8000,max:2});
    const x=fixture();
    try{
      await pool.query(
        `INSERT INTO clean.phase3_gate3_canary_owner_v39
           (session_id,icao,authorization_evidence_sha256,
            canary_credit_ceiling,fixed_exposure_seconds,expires_at_utc)
         VALUES ($1,$2,$3,20,300,now()+interval '60 minutes')`,
        [x.sessionId,x.icao,x.authorizationEvidenceSha256],
      );
      const r=await commitGate3CanaryFailureV39(pool,x);
      expect(r.disposition).toBe("DURABLY_FAILED");
      const persisted=await pool.query(
        `SELECT state,failure_reason,evidence_sha256,terminal_at_utc,
                exact_reconciliation_verified,internal_received_credits,
                stable_read_count,owned_subscription_delete_verified
           FROM clean.phase3_gate3_canary_owner_v39
          WHERE session_id=$1`,[x.sessionId],
      );
      expect(persisted.rows[0]).toMatchObject({
        state:"FAILED",failure_reason:x.failureCode,
        evidence_sha256:x.safeEvidenceSha256,
        exact_reconciliation_verified:null,internal_received_credits:null,
        stable_read_count:null,owned_subscription_delete_verified:null,
      });
      expect(persisted.rows[0].terminal_at_utc).toBeTruthy();
      const replay=await commitGate3CanaryFailureV39(pool,x);
      expect(replay.disposition).toBe("DURABLY_ALREADY_IDENTICAL_FAILED");
      await expect(commitGate3CanaryFailureV39(pool,{
        ...x,failureCode:"OWNED_DELETE_UNVERIFIED",
      })).rejects.toThrow("GATE3_FAILED_RECEIPT_TERMINAL_CONFLICT");
    }finally{await pool.end();}
  },30000);
});
