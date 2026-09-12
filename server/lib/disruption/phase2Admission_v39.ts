import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  verifyPrepaidSecurityPassArtifact,
  type PrepaidSecurityPassArtifactV39,
} from "./prepaidSecurityPass_v39";

/**
 * Shared Phase-2 prerequisite-P admission owner.
 *
 * Every command that can advance Phase 2 after prerequisite P must call this
 * before provider access, frame mutation, or freeze mutation. The verifier is
 * bound to the current Plan hash, retention-matrix definition and provider-
 * content inventory hash, so a stale copied PASS artifact fails closed.
 */
export function loadVerifiedPrerequisitePPass(
  root = process.cwd(),
): PrepaidSecurityPassArtifactV39 {
  const file = join(root, "artifacts", "prepaid-security-retention-pass.json");
  if (!existsSync(file)) throw new Error("BLOCKED:PREREQUISITE_P_PASS_MISSING");
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error("BLOCKED:PREREQUISITE_P_PASS_INVALID_JSON");
  }
  if (!verifyPrepaidSecurityPassArtifact(parsed, root)) {
    throw new Error("BLOCKED:PREREQUISITE_P_PASS_STALE_TAMPERED_OR_INCOMPATIBLE");
  }
  return parsed;
}
