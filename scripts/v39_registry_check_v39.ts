/**
 * v39:registry:check — configuration registry completeness (§1.5.15).
 *
 * Checks both the legacy Phase-6 registry and the dedicated V3.9 runtime/P
 * registry extension. Secrets are counted present/absent but never printed.
 */
import {
  PHASE6_CONFIG_REGISTRY,
} from "../server/lib/disruption/configRegistry_v3";
import {
  V39_RUNTIME_CONFIG_REGISTRY,
} from "../server/lib/disruption/configRegistryRuntime_v39";
import type { ConfigEntry } from "../server/lib/disruption/configRegistry_v3";

const CURRENT_SCOPE_GATES = new Set(["all", "", "Phase 0", "PREP", "Phase-0"]);

function unresolvedValue(v: unknown): boolean {
  return v === null || v === undefined || v === "" ||
    v === "VERIFY_AT_GATE_0" || String(v).startsWith("TBD");
}

function main(): void {
  const registry: ConfigEntry[] = [...PHASE6_CONFIG_REGISTRY, ...V39_RUNTIME_CONFIG_REGISTRY];
  const duplicateKeys = registry
    .map((entry) => entry.key)
    .filter((key, index, all) => all.indexOf(key) !== index);
  if (duplicateKeys.length) {
    console.log(`RESULT: BLOCKED — duplicate config keys: ${[...new Set(duplicateKeys)].join(",")}`);
    process.exit(1);
  }

  const required = registry.filter((entry) => entry.required);
  const secrets = registry.filter((entry) => entry.secret);
  const missingNow: string[] = [];
  const pendingByDesign: string[] = [];

  for (const c of required) {
    const key = `${c.key} (${c.phase}/${c.gate})`;
    const currentScope = CURRENT_SCOPE_GATES.has(String(c.gate));
    if (c.secret) {
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

  const expectedV39Keys = [
    "V39_DATABASE_RUNTIME_URL",
    "V39_RAW_PROVIDER_RETENTION_HOURS",
    "V39_FIDS_RETENTION_HOURS",
    "V39_RETENTION_APPLY_ARMED",
    "V39_RETENTION_DEPLOYMENT_EVIDENCE",
    "V39_RETENTION_MATRIX_EVIDENCE",
  ];
  const registered = new Set(registry.map((entry) => entry.key));
  for (const key of expectedV39Keys) if (!registered.has(key)) missingNow.push(`${key} [runtime key missing from registry]`);

  console.log("REGISTRY-CHECK");
  console.log(`  registry_entries=${registry.length} legacy_entries=${PHASE6_CONFIG_REGISTRY.length} v39_runtime_entries=${V39_RUNTIME_CONFIG_REGISTRY.length}`);
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
