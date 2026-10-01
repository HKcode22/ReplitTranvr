import fs from "node:fs";
import crypto from "node:crypto";

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "") : "";
  if (!value) throw new Error(`Missing required ${name}`);
  return value;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function onlyProjectRows(rows: any[], schemaKeys: string[]): any[] {
  return rows.filter((row) => {
    for (const key of schemaKeys) {
      if (row?.[key] === "clean" || row?.[key] === "public") return true;
    }
    return false;
  });
}

const livePath = arg("--live");
const rebuiltPath = arg("--rebuilt");
const live = JSON.parse(fs.readFileSync(livePath, "utf8"));
const rebuilt = JSON.parse(fs.readFileSync(rebuiltPath, "utf8"));

const errors: string[] = [];
for (const [label, doc] of [["live", live], ["rebuilt", rebuilt]] as const) {
  if (doc.verdict !== "PASS_CORE_V39_SCHEMA_INVENTORY") errors.push(`${label}_inventory_not_pass`);
  if ((doc.missing_required_clean_tables ?? []).length) errors.push(`${label}_missing_tables`);
  if ((doc.missing_critical_columns ?? []).length) errors.push(`${label}_missing_columns`);
}

const sections: Array<{name:string; keys:string[]}> = [
  { name: "relations", keys: ["schema_name"] },
  { name: "columns", keys: ["table_schema"] },
  { name: "constraints", keys: ["schema_name"] },
  { name: "indexes", keys: ["schemaname"] },
  { name: "triggers", keys: ["schema_name"] },
  { name: "functions", keys: ["schema_name"] },
  { name: "sequences", keys: ["sequence_schema"] },
  { name: "user_defined_types", keys: ["schema_name"] },
];

const diffs: Record<string, {live_sha256:string; rebuilt_sha256:string; equal:boolean}> = {};
for (const section of sections) {
  const liveRows = onlyProjectRows(live[section.name] ?? [], section.keys);
  const rebuiltRows = onlyProjectRows(rebuilt[section.name] ?? [], section.keys);
  const a = stable(liveRows);
  const b = stable(rebuiltRows);
  const equal = a === b;
  diffs[section.name] = { live_sha256: sha(a), rebuilt_sha256: sha(b), equal };
  if (!equal) errors.push(`schema_section_mismatch:${section.name}`);
}

const runtimeExpected = {
  prepaid_probe_session_runtime: "UNLOGGED",
  prepaid_probe_delivery_runtime: "UNLOGGED",
  prepaid_probe_item_runtime: "UNLOGGED",
};
for (const [name, persistence] of Object.entries(runtimeExpected)) {
  if (rebuilt.runtime_table_persistence?.[name] !== persistence) errors.push(`rebuilt_runtime_persistence:${name}`);
}

const verdict = errors.length ? "FAIL" : "PASS_EXACT_PROJECT_SCHEMA_MATCH";
console.log(JSON.stringify({
  schema: "v39.schema-baseline-rebuild-compare.v1",
  verdict,
  errors,
  sections: diffs,
}, null, 2));
if (errors.length) process.exit(1);