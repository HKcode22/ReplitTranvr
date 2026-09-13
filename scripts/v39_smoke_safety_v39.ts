/** V3.9 paid wrapper: exact AUTH before the isolated Phase-2 safety smoke owner. */
import { runAuthorizedOwner } from "./v39_wrapper_runtime_v39";

process.exitCode = runAuthorizedOwner(
  "v39:smoke:safety",
  "Phase 2 / safety smoke",
  "scripts/v39_smoke_safety_owner_v39.ts",
);
