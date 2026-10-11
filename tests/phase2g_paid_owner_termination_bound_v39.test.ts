import {readFileSync} from "node:fs";
import {join} from "node:path";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {
  armStage1PaidOwnerTerminationBoundV39,
  STAGE1_PAID_OWNER_SIGTERM_GRACE_MS_V39
} from "../scripts/v39_phase2g_paid_owner_termination_bound_v39";

describe("P16 bounded local paid owner termination escalation, no provider calls",()=>{
  beforeEach(()=>vi.useFakeTimers());
  afterEach(()=>vi.useRealTimers());
  it("never kills before 45 seconds; SIGKILL one unresponsive originally spawned child at deadline",async()=>{
    let alive=true;
    const forced=vi.fn(()=>{alive=false});
    const guard=armStage1PaidOwnerTerminationBoundV39({
      childStillRunning:()=>alive,forceKillChild:forced
    });
    expect(STAGE1_PAID_OWNER_SIGTERM_GRACE_MS_V39).toBe(45_000);
    await vi.advanceTimersByTimeAsync(44_999);
    expect(forced).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(forced).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(forced).toHaveBeenCalledTimes(1);
    guard.cancel();
  });
  it("child exiting after SIGTERM before grace avoids SIGKILL",async()=>{
    let alive=true;const forced=vi.fn();
    armStage1PaidOwnerTerminationBoundV39({
      childStillRunning:()=>alive,forceKillChild:forced
    });
    await vi.advanceTimersByTimeAsync(15_000);
    alive=false;
    await vi.advanceTimersByTimeAsync(45_000);
    expect(forced).not.toHaveBeenCalled();
  });
  it("explicit cancellation on child exit prevents any later SIGKILL",async()=>{
    const forced=vi.fn();
    const guard=armStage1PaidOwnerTerminationBoundV39({
      childStillRunning:()=>true,forceKillChild:forced
    });
    await vi.advanceTimersByTimeAsync(12_000);
    guard.cancel();
    guard.cancel();
    await vi.advanceTimersByTimeAsync(90_000);
    expect(forced).not.toHaveBeenCalled();
  });
  it("rejects absent current-child observer/kill action",()=>{
    expect(()=>armStage1PaidOwnerTerminationBoundV39({
      childStillRunning:null as any,forceKillChild:()=>{}
    })).toThrow("P16_OWNER_TERMINATION_GUARD_INVALID");
  });
  it("actual paid supervisor arms once, uses signalCode/exitCode rather than child.killed and cancels after child exit",()=>{
    const s=readFileSync(join(process.cwd(),
      "scripts/v39_phase2g_stage1_logged_supervisor_v39.ts"),"utf8");
    expect(s).toContain("let forcedOwnerKillDeadline: PaidOwnerTerminationEscalationV39 | null = null");
    expect(s).toContain("if (!forcedOwnerKillDeadline)");
    expect(s).toContain("armStage1PaidOwnerTerminationBoundV39({");
    expect(s).toContain("child.exitCode===null&&child.signalCode===null");
    expect(s).toContain('child.kill("SIGKILL")');
    expect(s).toContain('reason:"paid_child_unresponsive_after_sigterm_grace"');
    expect(s).toContain("forcedOwnerKillDeadline?.cancel()");
    expect(s.indexOf("forcedOwnerKillDeadline?.cancel()"))
      .toBeGreaterThan(s.indexOf("const exit = await new Promise"));
  });
});