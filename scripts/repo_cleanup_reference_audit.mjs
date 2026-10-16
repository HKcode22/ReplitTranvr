#!/usr/bin/env node
/**
 * READ-ONLY repository reorganization reference audit.
 * No provider/SQL/Blob/network calls, Git writes, or source mutations.
 * Run: node scripts/repo_cleanup_reference_audit.mjs [--json | --summary-json] [--strict]
 * --strict exits nonzero on suspected missing operational literal references.
 * All findings are candidates to REVIEW, never permission to delete.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, existsSync } from "node:fs";
import { resolve, extname, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = new Set(process.argv.slice(2));
if (args.has("--help")) {
  console.log("node scripts/repo_cleanup_reference_audit.mjs [--json] [--strict]");
  process.exit(0);
}
if ([...args].some((arg) => !["--json", "--strict", "--summary-json"].includes(arg))) {
  console.error("Unknown option. Use --help.");
  process.exit(2);
}
const tracked = execFileSync("git", ["ls-files", "--cached", "-z"], {
  cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024
}).split("\0").filter(Boolean).sort();
const fileSet = new Set(tracked);
const textExt = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".md", ".json", ".jsonc",
  ".yaml", ".yml", ".sh", ".bash", ".sql", ".html", ".css", ".scss",
  ".py", ".toml", ".txt", ".ini", ".ipynb", ".xml", ".csv", ".svg"
]);
const textNames = new Set([
  ".replit", ".gitignore", ".npmrc", "Dockerfile", "LICENSE", "README",
  "Makefile", "Procfile"
]);
const protectedRoots = [
  "data-collection/plans/", "data-collection/implementation/", "data-collection/evidence/", "data-collection/phase2g/", "client/src/assets/images/legacy-attachments/", "docs/history/legacy-replit-attachments/", "data-collection/research-papers/",
  "migrations/", ".github/workflows/"
];
const protectedFileNames = new Set(["AGENTS.md", "replit.md"]);
const tokenPattern = /(?:SEPmd|artifacts|attached_assets|researchPapers|migrations|\.github\/workflows)\/[A-Za-z0-9_.\/-]+|(?:AGENTS|replit)\.md/g;
const operationalPath = /^(?:scripts\/|server\/|tests\/|\.github\/|migrations\/|shared\/|client\/)/;
const references = [];
const skipped = [];
let scanned = 0;

for (const path of tracked) {
  const ext = extname(path).toLowerCase();
  const name = path.slice(path.lastIndexOf("/") + 1);
  if (!textExt.has(ext) && !textNames.has(name)) continue;
  const full = resolve(root, path);
  if (!full.startsWith(root + "/") || !existsSync(full)) {
    skipped.push({ path, reason: "file missing or unsafe path" });
    continue;
  }
  let bytes;
  try {
    const size = statSync(full).size;
    if (size > 3_000_000) {
      skipped.push({ path, reason: "oversized text file" });
      continue;
    }
    bytes = readFileSync(full, "utf8");
  } catch {
    skipped.push({ path, reason: "unreadable" });
    continue;
  }
  if (bytes.includes("\0")) {
    skipped.push({ path, reason: "binary-looking" });
    continue;
  }
  scanned++;
  const lines = bytes.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    tokenPattern.lastIndex = 0;
    for (const match of lines[i].matchAll(tokenPattern)) {
      const token = match[0].replace(/[./]+$/, "");
      const existsTracked = fileSet.has(token) ||
        tracked.some((candidate) => candidate.startsWith(token + "/"));
      references.push({
        from: path, line: i + 1, target_literal: token,
        source_role: operationalPath.test(path) ? "OPERATIONAL_OR_TEST" : "DOCUMENTATION_OR_RECORD",
        present_as_tracked_path: existsTracked,
        raw_excerpt: lines[i].trim().slice(0, 220)
      });
    }
  }
}
const unexpectedRemovals = protectedRoots.filter((rootPath) =>
  !tracked.some((path) => path.startsWith(rootPath))
);
const missingOperational = references.filter((item) =>
  item.source_role === "OPERATIONAL_OR_TEST" &&
  !item.present_as_tracked_path
);
const counts = Object.fromEntries(protectedRoots.map(prefix => [
  prefix, tracked.filter(path => path.startsWith(prefix)).length
]));
const report = {
  status: "INVENTORY_ONLY_NOT_DELETE_OR_RENAME_APPROVAL",
  branch: execFileSync("git", ["branch", "--show-current"], {
    cwd: root, encoding: "utf8"
  }).trim(),
  git_head: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root, encoding: "utf8"
  }).trim(),
  tracked_files: tracked.length,
  files_scanned_text: scanned,
  skipped_text_candidates: skipped,
  tracked_counts_by_protected_root: counts,
  protected_operator_guardrails: Object.fromEntries(
    [...protectedFileNames].map(p => [p, fileSet.has(p)])
  ),
  absent_protected_roots: unexpectedRemovals,
  total_literal_references: references.length,
  missing_operational_literal_count: missingOperational.length,
  // Literal regex scan cannot validate dynamic path joins, Git history,
  // referenced ref/branch URLs, symlinks, binary/payload integrity, or live DB.
  limitations: [
    "Unresolved references may intentionally identify historical/renamed files.",
    "Literal search does not prove complete runtime path or provenance dependency coverage.",
    "Case-insensitive filesystem collision and dynamic path expressions require independent review."
  ],
  references
};
if (args.has("--summary-json")) {
  const summary = { ...report };
  delete summary.references;
  process.stdout.write(JSON.stringify(summary) + "\n");
} else if (args.has("--json")) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else {
  const summary = { ...report };
  delete summary.references;
  console.log(JSON.stringify(summary, null, 2));
  console.log("\nSample references (first 25; run --json for complete inventory):");
  for (const hit of references.slice(0, 25)) {
    console.log(hit.from + ":" + hit.line + " -> " + hit.target_literal);
  }
  console.log("\nMissing operational literal examples:");
  for (const hit of missingOperational.slice(0, 25)) {
    console.log(hit.from + ":" + hit.line + " -> " + hit.target_literal);
  }
}
if (args.has("--strict") && (missingOperational.length ||
  !fileSet.has("AGENTS.md") || unexpectedRemovals.length)) {
  process.exitCode = 2;
}
