/**
 * v39 paid wrapper — AUTH-guarded delegate (§1.5.15 / ChatGPT P0-1).
 * Verifies exact AUTH and refuses before the legacy script can SEND/request.
 * Only after a verified AUTH record exists does it exec the underlying script.
 * Until then: REFUSE (exit 2). Never bypasses the guard.
 */
import { spawnSync } from "child_process";
import { enforcePaidGuard } from "./v39_paid_guard_v39";

const COMMAND = "v39:gate3:canary";
enforcePaidGuard(COMMAND, "Phase 3 / Gate 3");
// If the guard ever passes (verified AUTH on file), delegate with forwarded args:
const extra = process.argv.slice(2).filter((a, i, all) => !["--auth", "--auth-file", "--evidence-id"].includes(a) && !["--auth", "--auth-file", "--evidence-id"].includes(all[i - 1]));
const r = spawnSync("npx", ["tsx", "scripts/credit_canary.ts", ...extra], { stdio: "inherit" });
process.exit(r.status ?? 1);
