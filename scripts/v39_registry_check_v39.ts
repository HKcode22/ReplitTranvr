/**
 * v39:registry:check — configuration registry completeness (§1.5.15).
 * Thin wrapper over configRegistry_v3.ts (the production owner).
 *
 * Phase-0 semantics: FAIL only on required entries in current-or-past scope
 * (gate "all"/"Phase 0"/"PREP"/empty) that are unresolved. Entries gated on
 * future gates (Gate 0/0.5/3, FREEZE, Phase 6) are reported as
 * pending_by_design — they cannot be frozen in Phase 0 by construction.
 * Secrets are counted present/absent, never printed. A future-gate secret such
 * as AERODATABOX_API_KEY must be declared/secret-typed now, but its actual
 * value is verified at its owning gate rather than injected into offline CI.
 */
import {
  PHASE6_CONFIG_REGISTRY,
  getRequiredConfigs,
  getSecretConfigs,
} from "../server/lib/disruption/configRegistry_v3";

const CURRENT_SCOPE_GATES = new Set(["all", "", "Phase 0", "PREP", "Phase-0"]);

function unresolvedValue(v: unknown): boolean {
  return v === null || v === undefined || v === "" ||
    v === "VERIFY_AT_GATE_0" || String(v).startsWith("TBD");
}

function main(): void {
  const required = getRequiredConfigs();
  const secrets = getSecretConfigs();
  const missingNow: string[] = [];
  const pendingByDesign: string[] = [];
  for (const c of required) {
    const key = `${c.key} (${c.phase}/${c.gate})`;
    const currentScope = CURRENT_SCOPE_GATES.has(String(c.gate));
    if (c.secret) {
      // Presence only, never values. Only current-scope secrets must be set in
      // Phase-0 execution; future-gate secrets are deliberately deferred.
      if (c.value === null || c.value === undefined || c.value === "") {
        if (currentScope) missingNow.push(`${key} [secret unset in current env]`);
        else pendingByDesign.push(`${key} [secret value deferred to owning gate]`);
      }
      continue;
    }
    if (!unresolvedValue(c.value)) continue;
    if (currentScope) missingNow.push(key);
    else pendingByDesign.push(key);
  }
  console.log("REGISTRY-CHECK");
  console.log(`  registry_entries=${PHASE6_CONFIG_REGISTRY.length}`);
  console.log(`  required=${required.length} secret_entries=${secrets.length}`);
  console.log(`  missing_now=${missingNow.length}`);
  for (const m of missingNow.slice(0, 20)) console.log(`    - ${m}`);
  console.log(`  pending_by_design=${pendingByDesign.length} (future gates; informational)`);
  for (const m of pendingByDesign.slice(0, 10)) console.log(`    - ${m}`);
  if (missingNow.length > 0) {
    console.log("RESULT: BLOCKED — required current-scope binding config unresolved");
    process.exit(1);
  }
  console.log("RESULT: PASS — no missing current-scope binding config");
}

main();
