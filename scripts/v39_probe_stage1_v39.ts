/** V3.9 paid wrapper: exact AUTH before the frozen Stage-1 owner. */
import { runAuthorizedOwner } from "./v39_wrapper_runtime_v39";

const code = runAuthorizedOwner(
  "v39:probe:stage1",
  "Phase 2 / Gate 2 Stage 1",
  "scripts/v39_probe_stage1_owner_v39.ts",
);
process.exitCode = code;
