/**
 * v39 — paid/mutating wrapper (§1.5.15).
 * Prints the resolved plan, verifies exact AUTH, refuses before SEND/request
 * on any mismatch. Shared guard owner: v39_paid_guard_v39.ts.
 */
import { runAuthorizedOwner } from "./v39_wrapper_runtime_v39";

process.exitCode = runAuthorizedOwner("v39:smoke:safety", "Phase 2 / safety smoke", "scripts/credit_canary.ts");
