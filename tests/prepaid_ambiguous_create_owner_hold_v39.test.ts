import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import pg from "pg";
import {holdPrepaidAmbiguousCreateV39}
  from "../server/lib/disruption/prepaidAmbiguousCreateOwnerHold_v39";
import {resolveAmbiguousPrepaidCreateV39}
  from "../server/lib/disruption/prepaidAmbiguousCreateResolution_v39";
import {classifyGate3FailedWindowV39}
  from "../server/lib/disruption/gate3CanaryFailedWindowCommit_v39";

const sid=()=>randomUUID();
const start=new Date("2026-10-14T18:00:00Z");
const after=()=>new Date("2026-10-14T18:00:03Z");

describe("actual prepaid CREATE owner: strict LIST uncertainty is a HOLD",()=>{
  it("lost CREATE and lost LIST yield one provider POST only, then no-cleanup failed result",async()=>{
    const calls:string[]=[];
    await expect(resolveAmbiguousPrepaidCreateV39({
      createOnce:async()=>{calls.push("CREATE");throw Error("HTTP 504 after commit");},
      recoverExactUsingStrictList:async()=>{
        calls.push("STRICT_LIST");throw Error("provider LIST timeout");
      },
    })).rejects.toThrow("PREPAID_AMBIGUOUS_CREATE_PROVIDER_OUTCOME_UNVERIFIED_HOLD");
    expect(calls).toEqual(["CREATE","STRICT_LIST"]);
    const id=sid();
    const writes:string[]=[];
    const held=await holdPrepaidAmbiguousCreateV39({
      sessionId:id,windowStart:start,
      keepSessionReceiving:async(s)=>{writes.push("SETTLING:"+s);},
      now:after,
    });
    expect(writes).toEqual(["SETTLING:"+id]);
    expect(held).toMatchObject({
      unloggedReceivingStateAcknowledged:true,
      providerSubscriptionAbsenceProved:false,
      sourceCleanupPerformed:false,
      paidRestartAuthorized:false,
      result:{
        status:"failed",runtimeSessionId:id,
        stopReason:"subscription_create_provider_outcome_unverified_hold",
        reconciliationStatus:"UNRESOLVED",
        externalCredits:null,subscriptionDeleted:false,
        cleanupVerifiedAtUtc:null,settlementReads:0,
      },
    });
    expect(held.result.windowEnd).toEqual(after());
    const failure=classifyGate3FailedWindowV39({
      expectedSessionId:id,icao:"YSSY",
      authorizationEvidenceSha256:"f".repeat(64),
      result:held.result,
    });
    expect(failure.failureCode).toBe("CREATE_AMBIGUOUS_ACCOUNT_HOLD");
  });
  it("lost UNLOGGED SQL state cannot be misreported as acknowledged durable failure",async()=>{
    let writes=0;
    const held=await holdPrepaidAmbiguousCreateV39({
      sessionId:sid(),windowStart:start,
      keepSessionReceiving:async()=>{writes++;throw Error("PG session gone");},
      now:after,
    });
    expect(writes).toBe(1);
    expect(held.unloggedReceivingStateAcknowledged).toBe(false);
    expect(held.result.stopReason)
      .toBe("subscription_create_provider_outcome_unverified_hold_runtime_receiving_unverified");
    expect(held.result.subscriptionDeleted).toBe(false);
    expect(held.sourceCleanupPerformed).toBe(false);
    expect(classifyGate3FailedWindowV39({
      expectedSessionId:held.result.runtimeSessionId,icao:"YSSY",
      authorizationEvidenceSha256:"e".repeat(64),result:held.result,
    }).failureCode).toBe("CREATE_AMBIGUOUS_ACCOUNT_HOLD");
  });
  it("malformed input cannot silently perform an SQL callback or return a PASS",async()=>{
    const id=sid(), writes:string[]=[];
    const base={sessionId:id,windowStart:start,keepSessionReceiving:async()=>{writes.push("SETTLING");}};
    for(const patch of [
      {sessionId:"wrong"},{windowStart:new Date(NaN)},
      {keepSessionReceiving:undefined},{now:undefined as any},
    ]){
      // undefined optional now is legal; exercise only actual invalid fields
      if(Object.keys(patch)[0]==="now")continue;
      await expect(holdPrepaidAmbiguousCreateV39({...base,...patch} as any))
        .rejects.toThrow("PREPAID_AMBIGUOUS_CREATE_HOLD_INPUT_INVALID");
    }
    expect(writes).toEqual([]);
  });
  it("clock prior to CREATE clamps end to start; never negative elapsed duration",async()=>{
    const held=await holdPrepaidAmbiguousCreateV39({
      sessionId:sid(),windowStart:start,
      keepSessionReceiving:async()=>{},
      now:()=>new Date(start.getTime()-1000),
    });
    expect(held.result.windowEnd).toEqual(start);
    expect(held.result.durationCensored).toBe(true);
  });
  it("shared real runner catches provider CREATE/LIST unknown and never cleans raw originals",()=>{
    const code=readFileSync("server/lib/disruption/prepaidProbeWindow_v39.ts","utf8");
    const hold=code.indexOf("GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY");
    const creation=code.indexOf("const creation = await resolveAmbiguousPrepaidCreateV39({");
    const failed=code.indexOf("const held=await holdPrepaidAmbiguousCreateV39({");
    const normal=code.indexOf("if (!sub?.id) {",creation);
    expect(hold).toBeGreaterThan(0);
    expect(creation).toBeGreaterThan(hold);
    expect(failed).toBeGreaterThan(creation);
    expect(normal).toBeGreaterThan(failed);
    const catchBlock=code.slice(creation,normal);
    expect(catchBlock).toContain("return held.result;");
    expect(catchBlock).not.toContain("cleanupOrDefer(");
    expect(catchBlock).not.toContain("cleanupPrepaidProbeSessionV39(");
    expect(code.slice(failed,normal)).not.toContain("createSubscription(");
    expect(code).toContain('keepSessionReceiving:(id)=>setPrepaidProbeSessionStateV39(id,"settling")');
    const receiver=readFileSync("server/lib/disruption/prepaidProbeRuntime_v39.ts","utf8");
    expect(receiver).toContain('["armed", "active", "settling"].includes(state)');
    expect(receiver).toContain('state IN (\'armed\',\'active\',\'settling\')');
    expect(code).toContain("GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY");
  });
});

const localUrl=process.env.DATABASE_URL??"";
let isGitHubPg=false;
try{
  const u=new URL(localUrl);
  isGitHubPg=process.env.GITHUB_ACTIONS==="true" &&
    ["localhost","127.0.0.1"].includes(u.hostname) &&
    u.pathname==="/v39_ci"&&!process.env.AERODATABOX_API_KEY;
}catch{}
const pgSuite=isGitHubPg?describe:describe.skip;
pgSuite("Gate3 unknown CREATE preserves a real disposable-PG receiving session",()=>{
  it("LOGGED owner stays PREPARED, UNLOGGED session enters callback-accepting settling, no provider",async()=>{
    const client=new pg.Client({connectionString:localUrl,connectionTimeoutMillis:8000});
    const id=sid();
    await client.connect();
    try{
      await client.query("BEGIN");
      await client.query(`INSERT INTO clean.phase3_gate3_canary_owner_v39
        (session_id,icao,authorization_evidence_sha256,
         canary_credit_ceiling,fixed_exposure_seconds,expires_at_utc)
        VALUES ($1,'YSSY',$2,20,300,now()+interval '1 hour')`,[id,"f".repeat(64)]);
      await client.query(`INSERT INTO clean.prepaid_probe_session_runtime
        (session_id,owner_kind,owner_probe_id,stage,icao,
         state,created_at_utc,expires_at_utc)
        VALUES ($1,'phase3_credit_canary',NULL,NULL,'YSSY','armed',
                now(),now()+interval '30 minutes')`,[id]);
      const held=await holdPrepaidAmbiguousCreateV39({
        sessionId:id,windowStart:start,now:after,
        keepSessionReceiving:async(session)=>{
          const x=await client.query(`UPDATE clean.prepaid_probe_session_runtime
            SET state='settling' WHERE session_id=$1 RETURNING session_id`,[session]);
          if(x.rowCount!==1)throw Error("SQL_UPDATE_NOT_ACKNOWLEDGED");
        },
      });
      expect(held.unloggedReceivingStateAcknowledged).toBe(true);
      expect(held.result).toMatchObject({
        status:"failed",reconciliationStatus:"UNRESOLVED",
        subscriptionDeleted:false,cleanupVerifiedAtUtc:null,
      });
      const row=await client.query(`SELECT s.state AS runtime_state,
        o.state AS logged_owner_state,
        (s.state IN ('armed','active','settling')) AS callback_receiving,
        (s.provider_subscription_id IS NOT NULL) AS provider_bound
        FROM clean.prepaid_probe_session_runtime s
        JOIN clean.phase3_gate3_canary_owner_v39 o USING(session_id)
        WHERE s.session_id=$1`,[id]);
      expect(row.rows[0]).toMatchObject({
        runtime_state:"settling",logged_owner_state:"PREPARED",
        callback_receiving:true,provider_bound:false,
      });
    }finally{
      await client.query("ROLLBACK").catch(()=>undefined);
      await client.end();
    }
  },30000);
});
