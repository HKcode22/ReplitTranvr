/**
 * P16: Bound time between asking the paid local Stage-1 owner to terminate
 * and executing the supervisor's existing recovery path.
 *
 * DOES NOT call the AeroDataBox provider, change any billing setting,
 * determine scientific PASS, or cancel any real subscription.
 *
 * When the owner ignores SIGTERM, the OS-local process must not be left
 * indefinitely alive simply because the callback watchdog completed.
 */
export const STAGE1_PAID_OWNER_SIGTERM_GRACE_MS_V39 = 45_000 as const;

export interface PaidOwnerTerminationEscalationV39 {
  cancel():void;
}

export function armStage1PaidOwnerTerminationBoundV39(input:Readonly<{
  /** Read live ChildProcess state; do not rely on child.killed (SIGTERM
      delivery does NOT imply OS process termination). */
  childStillRunning:()=>boolean;
  /** SIGKILL only the known originally-spawned local paid child PID. */
  forceKillChild:()=>void;
}>):PaidOwnerTerminationEscalationV39 {
  if(typeof input?.childStillRunning!=="function"||
     typeof input.forceKillChild!=="function")
    throw Error("P16_OWNER_TERMINATION_GUARD_INVALID");
  let canceled=false;
  const deadline=setTimeout(()=>{
    if(canceled)return;
    canceled=true;
    // Unexpected child state must not cause a second kill after termination.
    if(input.childStillRunning())input.forceKillChild();
  },STAGE1_PAID_OWNER_SIGTERM_GRACE_MS_V39);
  deadline.unref();
  return {
    cancel(){
      if(canceled)return;
      canceled=true;
      clearTimeout(deadline);
    }
  };
}

/** A clean OS exit is not proof of scientific completion if supervision stopped
 * the paid owner. Treat every explicit shutdown/watchdog stop as failed and
 * enter the existing exact-session recovery/settlement path. */
export function stage1PaidOwnerExitVerdictV39(input: Readonly<{
  code: number | null;
  signal: NodeJS.Signals | null;
  spawnError: string | null;
  terminationRequested: boolean;
  watchdogTriggered: boolean;
}>): { passed: boolean; reason: string } {
  if (input.watchdogTriggered)
    return { passed: false, reason: "WATCHDOG_INTERRUPTED_OWNER" };
  if (input.terminationRequested)
    return { passed: false, reason: "SUPERVISOR_SHUTDOWN_REQUESTED" };
  if (input.spawnError !== null)
    return { passed: false, reason: "OWNER_SPAWN_OR_PROCESS_ERROR" };
  if (input.signal !== null)
    return { passed: false, reason: "OWNER_TERMINATED_BY_SIGNAL" };
  if (input.code !== 0)
    return { passed: false, reason: "OWNER_NOT_CLEAN_ZERO_EXIT" };
  return { passed: true, reason: "CLEAN_ZERO_EXIT_NO_SUPERVISOR_ABORT" };
}
