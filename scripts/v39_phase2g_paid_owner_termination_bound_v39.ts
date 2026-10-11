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
