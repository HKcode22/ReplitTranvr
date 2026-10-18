import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
  autoArmGate3WatchdogV39,type Gate3AutoArmDepsV39
} from "../server/lib/disruption/gate3WatchdogAutoArm_v39";
import {awaitGate3LiveWatchdogAndStartV39,assertGate3BeforeCreateUtcV39}
  from "../server/lib/disruption/gate3TwoStageWatchdogAdmission_v39";
import type {Gate3WatchdogLeaseV39}
  from "../server/lib/disruption/gate3WatchdogLiveLease_v39";

const start="2026-10-21T06:20:00Z";
const req={
  sessionId:"64315edd-6036-40dc-b73b-adee3144c11f",
  authId:"AUTH-20261021-G3WSSS06",
  authFile:"data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261021_WSSS06.json",
  authSha256:"a".repeat(64),startUtc:start,
  expectedGitHead:"b".repeat(40),
};
const reply=(run=39100000000,id=6230000000)=>({
  id,user:{login:"github-actions[bot]",type:"Bot"},
  body:JSON.stringify({
    schema:"v39.gate3.wsss-watchdog-lease.v1",
    status:"ARMED",githubRunId:run,
    sessionId:req.sessionId,authSha256:req.authSha256,
    expectedGitHead:req.expectedGitHead,startUtc:req.startUtc,
    heartbeatUtc:start,providerCreatesByWatchdog:0,
    hardCreditLimitGuaranteed:false
  })
});
const make=(opts?:{
  existing?:boolean;duplicate?:boolean;dispatchError?:boolean;
  neverArmed?:boolean;verifyError?:boolean;readError?:boolean
})=>{
  let ms=Date.parse(start)-240000;
  let dispatched=0,verified=0,listed=0;
  const deps:Gate3AutoArmDepsV39={
    now:()=>new Date(ms),
    sleep:async n=>{ms+=n},
    listComments:async()=>{
      listed++;
      if(opts?.readError)throw Error("synthetic github outage");
      if(opts?.duplicate)return [reply(),reply(39100000001,6230000001)];
      if(opts?.existing)return [reply()];
      if(dispatched&& !opts?.neverArmed)return [reply()];
      return [];
    },
    dispatchOnce:async()=>{dispatched++;if(opts?.dispatchError)
      throw Error("ambiguous workflow ACK lost")},
    verifyLease:async()=>{verified++;if(opts?.verifyError)
      throw Error("synthetic stale/forged lease")},
  };
  return {deps,state:()=>({ms,dispatched,verified,listed})};
};
describe("automatic Gate3 independently verified GH sidecar handoff; no providers",()=>{
  it("discovers pre-existing verified bot lease without a duplicate dispatch",async()=>{
    const f=make({existing:true});
    const l=await autoArmGate3WatchdogV39(req,f.deps);
    expect(l).toMatchObject({sessionId:req.sessionId,githubRunId:39100000000});
    expect(f.state()).toMatchObject({dispatched:0,verified:1});
  });
  it("dispatches exactly once then validates the bot, not a numeric selector alone",async()=>{
    const f=make();
    const l=await autoArmGate3WatchdogV39(req,f.deps);
    expect(l.commentId).toBe(6230000000);
    expect(f.state().dispatched).toBe(1);
    expect(f.state().verified).toBe(1);
  });
  it("ambiguous dispatch is HOLD, never automatically re-dispatch",async()=>{
    const f=make({dispatchError:true});
    await expect(autoArmGate3WatchdogV39(req,f.deps))
      .rejects.toThrow("DISPATCH_AMBIGUOUS_NO_RETRY");
    expect(f.state().dispatched).toBe(1);
  });
  it("fails closed if no authenticated ARMED bot ever appears",async()=>{
    const f=make({neverArmed:true});
    await expect(autoArmGate3WatchdogV39(req,f.deps))
      .rejects.toThrow("INDEPENDENT_BOT_NOT_ARMED");
    expect(f.state().dispatched).toBe(1);
  });
  it("rejects duplicate, stale and unavailable GH proof without dispatching",async()=>{
    for(const scenario of [{duplicate:true},{existing:true,verifyError:true},{readError:true}]){
      const f=make(scenario);
      await expect(autoArmGate3WatchdogV39(req,f.deps)).rejects.toThrow();
      expect(f.state().dispatched).toBe(0);
    }
  });
  it("refuses wrong source scopes and missed admission clock BEFORE dispatch",async()=>{
    for(const override of [
      {sessionId:"wrong"},{expectedGitHead:"wrong"},
      {authSha256:"wrong"},{authFile:"/tmp/auth.json"},
      {startUtc:"2026-10-21T06:30:00Z"},
    ]){
      const f=make();
      await expect(autoArmGate3WatchdogV39({...req,...override},f.deps))
        .rejects.toThrow("REQUEST_OR_CLOCK");
      expect(f.state().dispatched).toBe(0);
    }
  });
  it("an operator STOP before or during sidecar polling cannot dispatch/advance",async()=>{
    const f=make();
    await expect(autoArmGate3WatchdogV39(req,f.deps,()=>true))
      .rejects.toThrow("OWNER_STOP_REQUESTED");
    expect(f.state().dispatched).toBe(0);
    const after=make();
    let stopped=false,reads=0;
    const deps:Gate3AutoArmDepsV39={...after.deps,
      listComments:async()=>{
        const result=await after.deps.listComments();
        reads++;
        if(reads>=2)stopped=true;
        return result;
      }
    };
    await expect(autoArmGate3WatchdogV39(req,deps,()=>stopped))
      .rejects.toThrow("OWNER_STOP_REQUESTED");
    expect(after.state().dispatched).toBe(1);
  });
  it("offline one-process dress rehearsal: dispatch, verified lease, exact UTC start, no provider mutations",async()=>{
    const f=make();
    const bot=await autoArmGate3WatchdogV39(req,f.deps);
    let leaseReads=0,accountReads=0;
    const evidence:Gate3WatchdogLeaseV39={
      schema:"v39.gate3.wsss-watchdog-lease.v1",
      status:"ARMED",githubRunId:bot.githubRunId,
      expectedGitHead:req.expectedGitHead,
      authSha256:req.authSha256,sessionId:req.sessionId,
      startUtc:req.startUtc,heartbeatUtc:start,
      providerCreatesByWatchdog:0,hardCreditLimitGuaranteed:false
    };
    await awaitGate3LiveWatchdogAndStartV39(bot,2056,{
      now:f.deps.now,sleep:f.deps.sleep,
      verifyLease:async(scope)=>{
        leaseReads++;
        expect(scope).toEqual(bot);
        return evidence;
      },
      readCleanProviderBalance:async()=>{accountReads++;return 2056},
      shouldStop:()=>false,
    });
    expect(f.state().dispatched).toBe(1);
    expect(leaseReads).toBeGreaterThan(2);
    expect(accountReads).toBe(1);
    expect(f.state().ms).toBe(Date.parse(start));
    expect(()=>assertGate3BeforeCreateUtcV39(start,new Date(f.state().ms)))
      .not.toThrow();
    // Mock has no SQL connection and no provider CREATE/DELETE code.
  });
  it("offline rehearsal fails closed if account balance changes before CREATE",async()=>{
    const f=make();
    const bot=await autoArmGate3WatchdogV39(req,f.deps);
    let accountReads=0;
    await expect(awaitGate3LiveWatchdogAndStartV39(bot,2056,{
      now:f.deps.now,sleep:f.deps.sleep,
      verifyLease:async()=>({
        schema:"v39.gate3.wsss-watchdog-lease.v1",status:"ACTIVE",
        githubRunId:bot.githubRunId,expectedGitHead:req.expectedGitHead,
        authSha256:req.authSha256,sessionId:req.sessionId,startUtc:req.startUtc,
        heartbeatUtc:start,providerCreatesByWatchdog:0,
        hardCreditLimitGuaranteed:false
      }),
      readCleanProviderBalance:async()=>{accountReads++;return 2055},
      shouldStop:()=>false,
    })).rejects.toThrow("PROVIDER_BALANCE_CHANGED_AFTER_PREPARE");
    expect(accountReads).toBe(1);
  });
  it("paid owner must have no readline or numeric-ID prompt and still verify lease before provider CREATE",()=>{
    const owner=readFileSync("scripts/v39_gate3_one_wsss_operator_v39.ts","utf8");
    expect(owner).toContain("autoArmGate3WatchdogV39");
    expect(owner).not.toContain("rl.question(");
    expect(owner).not.toContain("parseGate3WatchdogRunAndCommentV39");
    expect(owner).toContain("await verifyGate3WatchdogLiveLeaseFromGitHubV39(scope)");
    expect(owner).toContain("await verifyContinuity()");
  });
});
