import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
  terminateUnpaidGate3PrecreateV39,
  assertUnpaidPrecreateUnusedSourceV39,
  type UnpaidPrecreateAbortScopeV39,
  type UnpaidPrecreateSourceV39,
  GATE3_PRECREATE_ABORT_SOURCE_SQL_V39,
} from "../server/lib/disruption/gate3UnpaidPrecreateAbort_v39";

const sessionId="64315edd-6036-40dc-b73b-adee3144c11f";
const startUtc="2026-10-21T06:20:00Z";
const scope:UnpaidPrecreateAbortScopeV39={
  sessionId,icao:"WSSS",authSha256:"a".repeat(64),
  credits:50,seconds:600,startUtc,baselineCredits:2056
};
const time=new Date("2026-10-21T06:19:00Z");
function row(extra:Partial<UnpaidPrecreateSourceV39>={}):
 UnpaidPrecreateSourceV39{
 return {
   session_id:sessionId,icao:"WSSS",
   authorization_evidence_sha256:scope.authSha256,
   canary_credit_ceiling:50,fixed_exposure_seconds:600,
   state:"PREPARED",failure_reason:null,
   expires_at_utc:"2026-10-21T07:00:00Z",
   runtime_session_id:sessionId,owner_kind:"phase3_credit_canary",
   runtime_state:"armed",provider_subscription_id:null,
   callback_requests_seen:0,callback_success_2xx:0,
   callback_failures:0,...extra
 };
}
const unsettled=[{session_id:sessionId,state:"PREPARED"}];
const create=(opts:{
  rows?:UnpaidPrecreateSourceV39[];
  credits?:number[];
  commitError?:boolean;
  badReadback?:boolean;
}={})=>{
  let reads=0,balances=0,commits=0,store:
    {state:string;failure_reason:string;evidence_sha256:string}|undefined;
  const deps={
    now:()=>time,
    readSource:async()=>{
      const r=opts.rows?.[Math.min(reads,opts.rows.length-1)]??row();
      reads++;
      return {row:r,unsettled};
    },
    readStrictCleanBalance:async()=>{
      const amount=opts.credits?.[Math.min(balances,opts.credits.length-1)]??2056;
      balances++;
      return amount;
    },
    delay:async(ms:number)=>{expect(ms).toBe(1500)},
    commitFailure:async(sha:string)=>{
      commits++;
      if(opts.commitError)throw Error("synthetic ambiguous COMMIT");
      store={state:"FAILED",failure_reason:"OPERATOR_ABORTED",
        evidence_sha256:sha};
    },
    readFailure:async()=>{
      if(opts.badReadback)return {state:"PREPARED",failure_reason:"",
        evidence_sha256:""};
      return store;
    },
  };
  return {deps,stats:()=>({reads,balances,commits})};
};
describe("unpaid gate3 BEFORE provider CREATE self-closure — no provider",()=>{
 it("accepts exact pristine source and rejects any SQL mutation in witness SELECT",()=>{
   expect(()=>assertUnpaidPrecreateUnusedSourceV39(
     scope,row(),unsettled,time)).not.toThrow();
   expect(GATE3_PRECREATE_ABORT_SOURCE_SQL_V39)
     .not.toMatch(/\b(?:UPDATE|DELETE|TRUNCATE|INSERT)\b/i);
 });
 it("accepts a truly missing UNLOGGED source after Neon restart",()=>{
   expect(()=>assertUnpaidPrecreateUnusedSourceV39(scope,row({
     runtime_session_id:null,owner_kind:null,runtime_state:null,
     callback_requests_seen:null,callback_success_2xx:null,
     callback_failures:null
   }),unsettled,time)).not.toThrow();
 });
 it("records exactly one immutable FAILED receipt only after two stable clean reads",async()=>{
   const f=create();
   const digest=await terminateUnpaidGate3PrecreateV39(scope,f.deps);
   expect(digest).toMatch(/^[a-f0-9]{64}$/);
   expect(f.stats()).toEqual({reads:2,balances:2,commits:1});
 });
 it.each([
   ["bound external subscription",{provider_subscription_id:"synthetic-owned"}],
   ["active runtime",{runtime_state:"active"}],
   ["nonzero callback",{callback_requests_seen:1}],
   ["malformed ownership",{owner_kind:"anchor_probe"}],
   ["wrong ICAO",{icao:"KLAX"}],
   ["wrong exact authorization",{authorization_evidence_sha256:"b".repeat(64)}],
   ["terminal row",{state:"SETTLED"}],
   ["invalid expiry",{expires_at_utc:"2026-10-21T06:22:00Z"}],
   ["wrong runtime UUID",{runtime_session_id:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"}],
 ] as const)("rejects %s before any provider/account read",async(_,change)=>{
   const f=create({rows:[row(change)]});
   await expect(terminateUnpaidGate3PrecreateV39(scope,f.deps))
     .rejects.toThrow(/GATE3_PRECREATE_ABORT_/);
   expect(f.stats()).toEqual({reads:1,balances:0,commits:0});
 });
 it("never commits on provider balance drift, unstable inventory, or reused source",async()=>{
   for(const opts of [
     {credits:[2055]},
     {credits:[2056,2055]},
     {rows:[row(),row({callback_failures:1})]},
   ]){
     const f=create(opts);
     await expect(terminateUnpaidGate3PrecreateV39(scope,f.deps))
       .rejects.toThrow();
     expect(f.stats().commits).toBe(0);
   }
 });
 it("rejects a foreign unsettled owner and invalid rescue-time clock",()=>{
   expect(()=>assertUnpaidPrecreateUnusedSourceV39(scope,row(),
     [...unsettled,{session_id:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
       state:"PREPARED"}],time)).toThrow(/OTHER_UNSETTLED/);
   expect(()=>assertUnpaidPrecreateUnusedSourceV39(scope,row(),
     unsettled,new Date("2026-10-21T06:35:00Z")))
     .toThrow(/SCOPE_OR_CLOCK/);
 });
 it("an ambiguous COMMIT or incorrect readback never claims closed",async()=>{
   const first=create({commitError:true});
   await expect(terminateUnpaidGate3PrecreateV39(scope,first.deps))
     .rejects.toThrow(/ambiguous COMMIT/);
   const second=create({badReadback:true});
   await expect(terminateUnpaidGate3PrecreateV39(scope,second.deps))
     .rejects.toThrow(/DURABLE_READBACK/);
 });
 it("owner records terminal ONLY inside pre-execution watchdog guard",()=>{
   const script=readFileSync("scripts/v39_gate3_one_wsss_operator_v39.ts","utf8");
   expect(script).toContain("terminateUnpaidGate3PrecreateRealV39");
   const position=script.indexOf("terminateUnpaidGate3PrecreateRealV39(v39Pool");
   const provider=script.indexOf("executeGate3ActualWindowV39(v39Pool");
   expect(position).toBeGreaterThan(0);
   expect(provider).toBeGreaterThan(position);
   expect(script).toContain("GATE3_UNPAID_PRECREATE_DURABLY_ABORTED");
   expect(script).toContain("GATE3_OPERATOR_PRECREATE_ABORT_UNRECONCILED_HOLD");
 });
});
