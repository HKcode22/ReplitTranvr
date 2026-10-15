import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
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
      markSessionFailed:async(s)=>{writes.push("FAILED:"+s);},
      now:after,
    });
    expect(writes).toEqual(["FAILED:"+id]);
    expect(held).toMatchObject({
      unloggedFailureStateAcknowledged:true,
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
      markSessionFailed:async()=>{writes++;throw Error("PG session gone");},
      now:after,
    });
    expect(writes).toBe(1);
    expect(held.unloggedFailureStateAcknowledged).toBe(false);
    expect(held.result.stopReason)
      .toBe("subscription_create_provider_outcome_unverified_hold_runtime_write_unverified");
    expect(held.result.subscriptionDeleted).toBe(false);
    expect(held.sourceCleanupPerformed).toBe(false);
    expect(classifyGate3FailedWindowV39({
      expectedSessionId:held.result.runtimeSessionId,icao:"YSSY",
      authorizationEvidenceSha256:"e".repeat(64),result:held.result,
    }).failureCode).toBe("CREATE_AMBIGUOUS_ACCOUNT_HOLD");
  });
  it("malformed input cannot silently perform an SQL callback or return a PASS",async()=>{
    const id=sid(), writes:string[]=[];
    const base={sessionId:id,windowStart:start,markSessionFailed:async()=>{writes.push("FAILED");}};
    for(const patch of [
      {sessionId:"wrong"},{windowStart:new Date(NaN)},
      {markSessionFailed:undefined},{now:undefined as any},
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
      markSessionFailed:async()=>{},
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
    expect(catchBlock).not.toContain("createSubscription(",);
    expect(code).toContain("GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY");
  });
});
