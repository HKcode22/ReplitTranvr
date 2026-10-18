import {describe,it,expect} from "vitest";
import {
  reviewGate3PrecreateContinuityV39,
  readGate3PrecreateContinuityV39,
  GATE3_PRECREATE_CONTINUITY_SQL_V39,
  type Gate3PrecreateSnapshotV39,
} from "../server/lib/disruption/gate3PrecreateContinuity_v39";
import {readFileSync} from "node:fs";

const SID="2eac3fed-2648-44e6-b9b7-79e45ff3b149";
const AT="2026-10-18T04:52:18.000Z";
const EPOCH=Date.parse(AT);
const row=(overrides:Partial<Gate3PrecreateSnapshotV39>={}):
  Gate3PrecreateSnapshotV39=>({
    postgres_started_at_utc:AT,
    owner_session_id:SID,owner_state:"PREPARED",
    runtime_session_id:SID,runtime_state:"armed",
    owner_kind:"phase3_credit_canary",
    provider_subscription_id:null,
    ...overrides,
  });

describe("WSSS Gate3 Neon/UNLOGGED continuity until paid CREATE — NO PROVIDER",()=>{
  it("read-only witness pins one prepared owner and unlogged source identity",()=>{
    expect(reviewGate3PrecreateContinuityV39([row()],SID,null)).toBe(EPOCH);
    expect(reviewGate3PrecreateContinuityV39([row()],SID,EPOCH)).toBe(EPOCH);
    expect(GATE3_PRECREATE_CONTINUITY_SQL_V39).toContain("pg_postmaster_start_time()");
    expect(GATE3_PRECREATE_CONTINUITY_SQL_V39).toContain("clean.prepaid_probe_session_runtime");
    expect(GATE3_PRECREATE_CONTINUITY_SQL_V39).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bTRUNCATE\b/i);
  });
  it("source lost after Neon restart => refuse (not regenerate)",()=>{
    expect(()=>reviewGate3PrecreateContinuityV39([row({
      runtime_session_id:null,runtime_state:null,owner_kind:null,
    })],SID,EPOCH)).toThrow(/RUNTIME_IDENTITY_LOST/);
    expect(()=>reviewGate3PrecreateContinuityV39([row({
      postgres_started_at_utc:"2026-10-18T04:53:01.000Z",
    })],SID,EPOCH)).toThrow(/POSTMASTER_CHANGED/);
  });
  it.each([
    ["owner absent",[],/SOURCE_ABSENT/],
    ["competing owner",[row(),row()],/SOURCE_ABSENT/],
    ["wrong owner id",[row({owner_session_id:"x"})],/RUNTIME_IDENTITY_LOST/],
    ["wrong runtime id",[row({runtime_session_id:"x"})],/RUNTIME_IDENTITY_LOST/],
    ["already terminal",[row({owner_state:"FAILED"})],/RUNTIME_IDENTITY_LOST/],
    ["runtime changed",[row({runtime_state:"settling"})],/RUNTIME_IDENTITY_LOST/],
    ["provider already bound",[row({provider_subscription_id:"external-synthetic"})],/RUNTIME_IDENTITY_LOST/],
    ["not Gate3 source",[row({owner_kind:"anchor_probe"})],/RUNTIME_IDENTITY_LOST/],
    ["unverifiable PG epoch",[row({postgres_started_at_utc:"invalid"})],/POSTMASTER_UNVERIFIED/],
  ] as const)("rejects %s",(_,rows,reason)=>{
    expect(()=>reviewGate3PrecreateContinuityV39(rows,SID,EPOCH)).toThrow(reason);
  });
  it("uses parameterized SELECT and fails closed when live PG read errors",async()=>{
    let called=0;
    const pool={
      query:async(sql:string,args:unknown[])=>{
        called++;
        expect(sql).toBe(GATE3_PRECREATE_CONTINUITY_SQL_V39);
        expect(args).toEqual([SID]);
        return {rows:[row()]};
      }
    };
    expect(await readGate3PrecreateContinuityV39(pool as any,SID,EPOCH)).toBe(EPOCH);
    expect(called).toBe(1);
    await expect(readGate3PrecreateContinuityV39({
      query:async()=>{throw Error("synthetic PG disconnected")}
    } as any,SID,EPOCH)).rejects.toThrow(/POSTGRES_READ_FAILED/);
    expect(called).toBe(1);
  });
  it("actual paid owner monitors source and obtains independent bot lease noninteractively",()=>{
    const code=readFileSync("scripts/v39_gate3_one_wsss_operator_v39.ts","utf8");
    expect(code).not.toContain("const promptAbort=new AbortController()");
    expect(code).not.toContain("rl.question(");
    expect(code).toContain("await autoArmGate3WatchdogV39(");
    expect(code).toContain("setInterval(heartbeat,10_000)");
    expect(code).toContain("await verifyContinuity();");
    const last=code.indexOf("await verifyContinuity();",code.indexOf("beforeProviderCreate:async"));
    expect(last).toBeGreaterThan(code.indexOf("beforeProviderCreate:async"));
    expect(code).toContain("options:\"-c default_transaction_read_only=on -c statement_timeout=6000\"");
  });
});
