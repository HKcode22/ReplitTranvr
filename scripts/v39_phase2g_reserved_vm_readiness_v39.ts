import process from "node:process";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}

async function main(): Promise<void> {
  const base = required("--base").replace(/\/+$/, "");
  const expectedHead = required("--expected-head").toLowerCase();

  if (!/^https:\/\/[^/]+$/i.test(base)) {
    throw new Error("BLOCKED:BASE_MUST_BE_HTTPS_ORIGIN");
  }
  if (/\.replit\.dev$/i.test(new URL(base).hostname)) {
    throw new Error("BLOCKED:INTERACTIVE_REPLIT_DEV_NOT_ALLOWED");
  }
  if (!/^[a-f0-9]{40}$/.test(expectedHead)) {
    throw new Error("BLOCKED:EXPECTED_HEAD_INVALID");
  }

  const response = await fetch(`${base}/__v39/workspace-runtime`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}

  const blockers: string[] = [];
  if (response.status !== 200) blockers.push(`http_status=${response.status}`);
  if (json?.schema !== "v39.phase2f-workspace-runtime.v1") blockers.push("schema_mismatch");
  if (json?.status !== "PASS") blockers.push(`runtime_status=${String(json?.status ?? "missing")}`);
  if (String(json?.git_head ?? "").toLowerCase() !== expectedHead) {
    blockers.push(`git_head_mismatch:${String(json?.git_head ?? "missing")}`);
  }
  if (json?.prepaid_route_registered !== true) blockers.push("prepaid_route_not_registered");
  if (json?.provider_mutation !== false) blockers.push("health_contract_provider_mutation_not_false");
  if (json?.runtime_owner_mode !== "replit-published-deployment") {
    blockers.push(`runtime_owner_mode=${String(json?.runtime_owner_mode ?? "missing")}`);
  }
  if (json?.published_deployment !== true) blockers.push("published_deployment_not_true");
  if (json?.runtime_durability_class !== "reserved-vm") {
    blockers.push(`runtime_durability_class=${String(json?.runtime_durability_class ?? "missing")}`);
  }
  if (!Number.isInteger(Number(json?.retention_hours)) || Number(json?.retention_hours) <= 0) {
    blockers.push("retention_hours_invalid");
  }
  if (String(json?.bucket_prefix ?? "") !== "replit-objstore") {
    blockers.push(`bucket_prefix=${String(json?.bucket_prefix ?? "missing")}`);
  }

  const result = {
    schema: "v39.phase2g-reserved-vm-readiness.v1",
    status: blockers.length === 0 ? "PASS_RESERVED_VM_RUNTIME_READY" : "BLOCKED",
    mutation_performed: false,
    provider_call_performed: false,
    provider_paid_action_performed: false,
    base,
    expected_git_head: expectedHead,
    observed: json ?? text.slice(0, 300),
    blockers,
    next: blockers.length === 0
      ? "Use this exact published base in the hash-bound paid preflight. Do not use a replit.dev workspace URL."
      : "Fix deployment binding before any provider preflight or paid action.",
  };
  console.log(JSON.stringify(result, null, 2));
  if (blockers.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-reserved-vm-readiness.v1",
    status: "BLOCKED",
    mutation_performed: false,
    provider_call_performed: false,
    provider_paid_action_performed: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
