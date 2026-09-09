/** V3.9 paid wrapper: exact AUTH before Stage-2 owner spawn. */
import { runAuthorizedOwner } from "./v39_wrapper_runtime_v39";
const code=runAuthorizedOwner(
  "v39:probe:stage2",
  "Phase 2 / Gate 2 Stage 2",
  "scripts/v39_probe_stage2_owner_v39.ts",
);
process.exitCode=code;
