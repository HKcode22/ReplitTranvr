import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {resolveAmbiguousPrepaidCreateV39}
  from "../server/lib/disruption/prepaidAmbiguousCreateResolution_v39";

describe("Shared prepaid runner: thrown CREATE HTTP response may still have billed an active subscription",()=>{
  it("a normal confirmed provider CREATE does not invoke LIST or retry",async()=>{
    const calls:string[]=[];
    const result=await resolveAmbiguousPrepaidCreateV39({
      createOnce:async()=>{calls.push("POST");return {id:"owned-confirmed"};},
      recoverExactUsingStrictList:async()=>{
        calls.push("LIST");return {id:"should-not-run"};
      },
    });
    expect(result).toEqual({subscription:{id:"owned-confirmed"},recoveredAfterAmbiguity:false});
    expect(calls).toEqual(["POST"]);
  });
  it("a thrown CREATE can be recovered by STRICT LIST without a second POST",async()=>{
    const calls:string[]=[];
    const result=await resolveAmbiguousPrepaidCreateV39({
      createOnce:async()=>{calls.push("POST");throw Error("gateway 504 after commit");},
      recoverExactUsingStrictList:async()=>{calls.push("LIST_exact_only");return {id:"owned-after-504"};},
    });
    expect(result).toEqual({subscription:{id:"owned-after-504"},recoveredAfterAmbiguity:true});
    expect(calls).toEqual(["POST","LIST_exact_only"]);
  });
  it("CREATE missing ID also invokes exact strict LIST only once",async()=>{
    let create=0,strictList=0;
    const result=await resolveAmbiguousPrepaidCreateV39({
      createOnce:async()=>{create++;return null;},
      recoverExactUsingStrictList:async()=>{strictList++;return {id:"exact-owned"};},
    });
    expect(result.recoveredAfterAmbiguity).toBe(true);
    expect(create).toBe(1);
    expect(strictList).toBe(1);
  });
  it("only an AUTHORITATIVE successful LIST showing zero matches returns absence",async()=>{
    const result=await resolveAmbiguousPrepaidCreateV39({
      createOnce:async()=>{throw Error("HTTP response lost");},
      recoverExactUsingStrictList:async()=>null,
    });
    expect(result).toEqual({subscription:null,recoveredAfterAmbiguity:false});
  });
  it("strict LIST failure after ambiguous CREATE is an unresolved HOLD, not absent",async()=>{
    const calls:string[]=[];
    await expect(resolveAmbiguousPrepaidCreateV39({
      createOnce:async()=>{calls.push("POST");throw Error("lost POST reply");},
      recoverExactUsingStrictList:async()=>{calls.push("LIST");throw Error("LIST timed out");},
    })).rejects.toThrow("PREPAID_AMBIGUOUS_CREATE_PROVIDER_OUTCOME_UNVERIFIED_HOLD");
    expect(calls).toEqual(["POST","LIST"]);
  });
  it("multiple matching subscriptions or invalid recovered ID are HOLD",async()=>{
    for(const recover of [
      async()=>{throw Error("PREPAID_PROBE_CREATE_AMBIGUOUS_MULTIPLE_EXACT_SUBSCRIPTIONS");},
      async()=>({id:""}),
    ]){
      let create=0;
      await expect(resolveAmbiguousPrepaidCreateV39({
        createOnce:async()=>{create++;return null;},
        recoverExactUsingStrictList:recover,
      })).rejects.toThrow("PREPAID_AMBIGUOUS_CREATE_PROVIDER_OUTCOME_UNVERIFIED_HOLD");
      expect(create).toBe(1);
    }
  });
  it("input validation prevents accidental unmediated CREATE",async()=>{
    await expect(resolveAmbiguousPrepaidCreateV39({
      createOnce:undefined as any,recoverExactUsingStrictList:async()=>null,
    })).rejects.toThrow("PREPAID_AMBIGUOUS_CREATE_HOOKS_INVALID");
  });
  it("actual shared live runner routes a thrown CREATE through strict exact LIST before SQL BIND",()=>{
    const code=readFileSync("server/lib/disruption/prepaidProbeWindow_v39.ts","utf8");
    const create=code.indexOf("const creation = await resolveAmbiguousPrepaidCreateV39({");
    const recovered=code.indexOf("recoverExactUsingStrictList:()=>recoverAmbiguousSubscriptionCreateV39(",create);
    const bound=code.indexOf("await bindOrCompensatePrepaidSubscriptionV39(",create);
    expect(create).toBeGreaterThan(0);
    expect(recovered).toBeGreaterThan(create);
    expect(bound).toBeGreaterThan(recovered);
    const strict=code.indexOf("async function recoverAmbiguousSubscriptionCreateV39(");
    expect(strict).toBeGreaterThan(0);
    expect(code).toContain("PREPAID_PROBE_CREATE_AMBIGUOUS_MULTIPLE_EXACT_SUBSCRIPTIONS");
    expect(code).toContain("subscription.isActive &&");
    expect(code).toContain('String(subscription.subscriber?.id ?? "") === webhookUrl');
    expect(code).not.toContain('if (!sub?.id) {\n    sub = await recoverAmbiguousSubscriptionCreateV39');
    expect(code).toContain("GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY");
  });
});
