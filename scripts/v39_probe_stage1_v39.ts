/**
 * v39 paid wrapper — AUTH-guarded delegate (§1.5.15 / ChatGPT P0-1).
 * Verifies exact AUTH and refuses before the legacy script can SEND/request.
 * Only after a verified AUTH record exists does it exec the underlying script.
 * Until then: REFUSE (exit 2). Never bypasses the guard.
 */
import { spawnSync } from "child_process";
import { enforcePaidGuard } from "./v39_paid_guard_v39";

const COMMAND = "v39:probe:stage1";
enforcePaidGuard(COMMAND, "Phase 2 / Gate 2 Stage 1");
// If the guard ever passes (verified AUTH on file), delegate with forwarded args:
const extra = process.argv.slice(2).filter((a) => a !== "--auth" && a !== "--evidence-id" && !a.startsWith("AUTH-") && !a.startsWith("GATE-") && !a.startsWith("RUN-"));
const r = spawnSync("npx", ["tsx", "scripts/anchor_probe.ts", "--stage", "1", ...extra], { stdio: "inherit" });
process.exit(r.status ?? 1);
