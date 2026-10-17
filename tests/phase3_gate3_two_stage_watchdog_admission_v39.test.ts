import {describe,it,expect} from "vitest";
import {
  assertGate3TwoStagePreparationTimingV39,
  parseGate3WatchdogRunAndCommentV39,
  awaitGate3LiveWatchdogAndStartV39,
} from "../server/lib/disruption/gate3TwoStageWatchdogAdmission_v39";
import type {Gate3WatchdogLeaseScopeV39,Gate3WatchdogLeaseV39}
  from "../server/lib/disruption/gate3WatchdogLiveLease_v39";

const start="2026-10-20T12:00:00Z";
const scope:Gate3WatchdogLeaseScopeV39={
  githubRunId:39000001111,commentId:6229000000,
  expectedGitHead:"a".repeat(40),authSha256:"b".repeat(64),
  sessionId:"1789c946-f0f1-4b51-a25b-3fb41d7caf97",startUtc:start,
};
const lease:Gate3WatchdogLeaseV39={
  schema:"v39.gate3.wsss-watchdog-lease.v1",
  status:"ACTIVE",githubRunId:scope.githubRunId,
  expectedGitHead:scope.expectedGitHead,authSha256:scope.authSha256,
  sessionId:scope.sessionId,startUtc:scope.startUtc,
  heartbeatUtc:"2026-10-20T12:00:00Z",
  providerCreatesByWatchdog:0,hardCreditLimitGuaranteed:false,
};
const d=(s:string)=>new Date(s);

describe("Gate3 two-stage watchdog owner admission (all offline)",()=>{
  it("allows 3-8 minute cold-start lead with custody through 15m grace",()=>{
    assertGate3TwoStagePreparationTimingV39(
      start,"2026-10-20T12:20:00Z",d("2026-10-20T11:54:00Z"));
    expect(()=>assertGate3TwoStagePreparationTimingV39(
      start,"2026-10-20T12:20:00Z",d("2026-10-20T11:51:00Z")
    )).toThrow("THREE_TO_EIGHT");
    expect(()=>assertGate3TwoStagePreparationTimingV39(
      start,"2026-10-20T12:20:00Z",d("2026-10-20T11:58:00Z")
    )).toThrow("THREE_TO_EIGHT");
    expect(()=>assertGate3TwoStagePreparationTimingV39(
      start,"2026-10-20T12:12:00Z",d("2026-10-20T11:54:00Z")
    )).toThrow("SESSION_EXPIRES");
  });
  it("parses only two exact, safe, untrusted numeric GitHub IDs",()=>{
    expect(parseGate3WatchdogRunAndCommentV39("39000001111 6229000000"))
      .toEqual({githubRunId:39000001111,commentId:6229000000});
    for(const text of ["0 1","1 -2","1 2 3","abc 2",
      "9007199254740992 1","1  ","1\t2",""])
      expect(()=>parseGate3WatchdogRunAndCommentV39(text)).toThrow();
  });
  const fake=(startAt:number,opts?:{
    loseLeaseAt?:number;balance?:number;stop?:boolean
  })=>{
    let ms=startAt,verified=0,providerReads=0;
    const deps={
      now:()=>new Date(ms),
      sleep:async(n:number)=>{ms+=n},
      verifyLease:async(s:Gate3WatchdogLeaseScopeV39,at:Date)=>{
        verified++;
        if(s.sessionId!==scope.sessionId||
           (opts?.loseLeaseAt&&verified>=opts.loseLeaseAt))
          throw Error("GATE3_WATCHDOG_LEASE_STALE_HEARTBEAT");
        expect(at.getTime()).toBe(ms);
        return lease;
      },
      readCleanProviderBalance:async()=>{
        providerReads++;
        return opts?.balance??1600;
      },
      shouldStop:()=>opts?.stop??false,
    };
    return {deps,stats:()=>({ms,verified,providerReads})};
  };
  it("checks live lease throughout staging and again after provider isolation",async()=>{
    const f=fake(Date.parse(start)-12_000);
    await awaitGate3LiveWatchdogAndStartV39(scope,1600,f.deps);
    expect(f.stats()).toMatchObject({
      ms:Date.parse(start),providerReads:1
    });
    expect(f.stats().verified).toBeGreaterThanOrEqual(4);
  });
  it("never reaches provider read when lease goes stale during waiting",async()=>{
    const f=fake(Date.parse(start)-12_000,{loseLeaseAt:3});
    await expect(awaitGate3LiveWatchdogAndStartV39(scope,1600,f.deps))
      .rejects.toThrow("GATE3_WATCHDOG_LEASE_STALE_HEARTBEAT");
    expect(f.stats().providerReads).toBe(0);
  });
  it("HOLD on startup after UTC allowance, no provider read",async()=>{
    const f=fake(Date.parse(start)+16_000);
    await expect(awaitGate3LiveWatchdogAndStartV39(scope,1600,f.deps))
      .rejects.toThrow("ARMED_TOO_LATE");
    expect(f.stats().providerReads).toBe(0);
  });
  it("HOLD when fresh provider credits have drifted",async()=>{
    const f=fake(Date.parse(start),{balance:1599});
    await expect(awaitGate3LiveWatchdogAndStartV39(scope,1600,f.deps))
      .rejects.toThrow("BALANCE_CHANGED");
  });
  it("HOLD on operator abort and never fetch provider",async()=>{
    const f=fake(Date.parse(start)-12_000,{stop:true});
    await expect(awaitGate3LiveWatchdogAndStartV39(scope,1600,f.deps))
      .rejects.toThrow("REQUESTED_STOP");
    expect(f.stats().providerReads).toBe(0);
  });
  it("HOLD if final GitHub lease validation fails just before CREATE",async()=>{
    const f=fake(Date.parse(start),{loseLeaseAt:2});
    await expect(awaitGate3LiveWatchdogAndStartV39(scope,1600,f.deps))
      .rejects.toThrow("GATE3_WATCHDOG_LEASE_STALE_HEARTBEAT");
    expect(f.stats().providerReads).toBe(1);
  });
});
