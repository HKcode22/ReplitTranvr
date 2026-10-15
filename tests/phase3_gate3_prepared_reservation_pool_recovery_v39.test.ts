import {describe,expect,it} from "vitest";
import type {Pool} from "pg";
import {
  prepareGate3CanaryDraftWithPoolV39,
} from "../server/lib/disruption/gate3PrepaidCanaryPreparation_v39";

const base=()=>({
  icao:"YSSY",authorizationEvidenceSha256:"a".repeat(64),
  canaryCreditCeiling:20,fixedExposureSeconds:300,
  nowUtc:new Date("2026-10-14T12:00:00Z"),
});
type Fault="none"|"connect"|"begin"|"advisory"|"owner_exists"|
  "insert_owner"|"insert_session"|"commit"|"rollback";
function fixture(fault:Fault,priorFailure=false){
  const calls:string[]=[];
  const releases:boolean[]=[];
  const client={
    async query(sql:string){
      const name=sql==="BEGIN"?"BEGIN":
        sql==="COMMIT"?"COMMIT":
        sql==="ROLLBACK"?"ROLLBACK":
        sql.startsWith("SELECT pg_advisory_xact_lock")?"ADVISORY":
        sql.startsWith("SELECT session_id FROM clean.phase3")?"EXISTING":
        sql.startsWith("INSERT INTO clean.phase3")?"INSERT_LOGGED":
        sql.startsWith("INSERT INTO clean.prepaid")?"INSERT_RUNTIME":"OTHER";
      calls.push(name);
      if((priorFailure&&name==="ADVISORY")||
         (fault==="begin"&&name==="BEGIN")||
         (fault==="advisory"&&name==="ADVISORY")||
         (fault==="insert_owner"&&name==="INSERT_LOGGED")||
         (fault==="insert_session"&&name==="INSERT_RUNTIME")||
         (fault==="commit"&&name==="COMMIT")||
         (fault==="rollback"&&name==="ROLLBACK"))
        throw Error("SIMULATED_PG_ACK_LOST");
      if(name==="EXISTING")
        return {rowCount:fault==="owner_exists"?1:0,
          rows:fault==="owner_exists"?[{session_id:"existing"}]:[]};
      return {rowCount:1,rows:[]};
    },
    release(discard?:boolean){releases.push(discard===true);},
  };
  const pool={connect:async()=>{
    if(fault==="connect")throw Error("CONNECT_FAILED");
    return client;
  }} as unknown as Pick<Pool,"connect">;
  return {calls,releases,pool};
}
describe("Gate3 pool-owned PREPARED SQL reservation — no provider",()=>{
  it("successful acknowledged COMMIT returns an unapproved session and releases pool normally",async()=>{
    const h=fixture("none");
    const r=await prepareGate3CanaryDraftWithPoolV39(h.pool,base());
    expect(r).toMatchObject({
      icao:"YSSY",state:"PREPARED",runtimeState:"armed",
      approvalVerifiedHere:false,authorizedPaidProviderCalls:false,
      fixedExposureSeconds:300,canaryCreditCeiling:20,
    });
    expect(r.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(h.calls).toEqual(["BEGIN","ADVISORY","EXISTING",
      "INSERT_LOGGED","INSERT_RUNTIME","COMMIT"]);
    expect(h.releases).toEqual([false]);
  });
  it("invalid scope never opens SQL",async()=>{
    const h=fixture("none");
    await expect(prepareGate3CanaryDraftWithPoolV39(h.pool,{
      ...base(),canaryCreditCeiling:1900,
    })).rejects.toThrow("GATE3_PREPARE_SMALL_CANARY_CEILING_1_TO_100_REQUIRED");
    expect(h.calls).toEqual([]);
    expect(h.releases).toEqual([]);
  });
  it("prior durable PREPARED owner refuses a second reservation with acknowledged ROLLBACK",async()=>{
    const h=fixture("owner_exists");
    await expect(prepareGate3CanaryDraftWithPoolV39(h.pool,base()))
      .rejects.toThrow("GATE3_PREPARE_PRIOR_UNSETTLED_OWNER_HOLD");
    expect(h.calls).toEqual(["BEGIN","ADVISORY","EXISTING","ROLLBACK"]);
    expect(h.releases).toEqual([false]);
  });
  it("each pre-COMMIT SQL fault rolls back, no second CREATE attempt",async()=>{
    for(const fault of ["advisory","insert_owner","insert_session"] as const){
      const h=fixture(fault);
      await expect(prepareGate3CanaryDraftWithPoolV39(h.pool,base()))
        .rejects.toThrow("SIMULATED_PG_ACK_LOST");
      expect(h.calls).toContain("ROLLBACK");
      expect(h.calls).not.toContain("COMMIT");
      expect(h.releases).toEqual([false]);
    }
  });
  it("COMMIT lost ACK never reports PREPARED; connection destroyed for independent LOGGED audit",async()=>{
    const h=fixture("commit");
    await expect(prepareGate3CanaryDraftWithPoolV39(h.pool,base()))
      .rejects.toThrow("GATE3_PREPARE_COMMIT_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
    expect(h.calls.filter(c=>c==="COMMIT")).toHaveLength(1);
    expect(h.calls).not.toContain("ROLLBACK");
    expect(h.releases).toEqual([true]);
  });
  it("lost BEGIN ACK and failed ROLLBACK destroy pooled connection",async()=>{
    const begin=fixture("begin");
    await expect(prepareGate3CanaryDraftWithPoolV39(begin.pool,base()))
      .rejects.toThrow("GATE3_PREPARE_BEGIN_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
    expect(begin.calls).toEqual(["BEGIN"]);
    expect(begin.releases).toEqual([true]);
    // Simulate a failed advisory query followed by a lost ROLLBACK ACK.
    const rollback=fixture("rollback",true);
    await expect(prepareGate3CanaryDraftWithPoolV39(rollback.pool,base()))
      .rejects.toThrow("GATE3_PREPARE_ROLLBACK_FAILED_DURABLE_AUDIT_REQUIRED");
    expect(rollback.calls).toContain("ROLLBACK");
    expect(rollback.releases).toEqual([true]);
  });
  it("connection failure is an explicit HOLD, not a new paid AUTH",async()=>{
    const h=fixture("connect");
    await expect(prepareGate3CanaryDraftWithPoolV39(h.pool,base()))
      .rejects.toThrow("GATE3_PREPARE_POOL_CONNECT_FAILED_HOLD");
    expect(h.calls).toEqual([]);
  });
});
