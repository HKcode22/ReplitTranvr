import { appendFileSync, existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { loadPreprobeHandoffBindingV39 } from "../server/lib/disruption/phase2Handoff_v39";

const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";
const LEDGER = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] ?? "").trim() || null : null;
}

function main(): void {
  const path = resolve(argValue("--preprobe") ?? DEFAULT_PREPROBE);
  const binding = loadPreprobeHandoffBindingV39(path);
  const block = [
    "",
    `### ${binding.evidenceId} — Phase 2E preprobe handoff`,
    `- evidence_id: ${binding.evidenceId}`,
    `- PREPROBE_ARTIFACT_SHA256:${binding.artifactSha256}`,
    `- PREPROBE_FILE_SHA256:${binding.fileSha256}`,
    `- PREPROBE_BINDING_SHA256:${binding.bindingSha256}`,
    `- frame_version: ${binding.artifact.frame_version}`,
    `- frame_hash: ${binding.artifact.frame_hash}`,
    `- gate1_artifact_sha256: ${binding.artifact.gate1_artifact_sha256}`,
    `- status: READY_FOR_SEPARATELY_APPROVED_PHASE2F_AUTH`,
    "",
  ].join("\n");

  const existing = existsSync(LEDGER) ? readFileSync(LEDGER, "utf8") : "";
  if (!existing.includes(binding.evidenceId)) appendFileSync(LEDGER, block, "utf8");

  console.log(JSON.stringify({
    status: existing.includes(binding.evidenceId) ? "PASS_ALREADY_RECORDED" : "PASS_RECORDED",
    evidence_id: binding.evidenceId,
    preprobe_artifact_sha256: binding.artifactSha256,
    preprobe_file_sha256: binding.fileSha256,
    preprobe_binding_sha256: binding.bindingSha256,
    frame_version: binding.artifact.frame_version,
    frame_hash: binding.artifact.frame_hash,
    next: "Exact Phase-2F AUTH must name this evidence_id in predecessorEvidenceIds",
  }, null, 2));
}

try {
  main();
} catch (error: any) {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
}
