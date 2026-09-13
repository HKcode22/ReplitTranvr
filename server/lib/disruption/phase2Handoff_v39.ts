import { createHash } from "crypto";
import { readFileSync } from "fs";
import { verifyPreprobeReferenceFreezeV39, type PreprobeReferenceFreezeV39 } from "./preprobeReferenceFreeze_v39";

const SHA = /^[a-f0-9]{64}$/i;

function sha256(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function assertSha(value: string, label: string): void {
  if (!SHA.test(value)) throw new Error(`PHASE2_HANDOFF_${label.toUpperCase()}_INVALID`);
}

export interface PreprobeHandoffBindingV39 {
  evidenceId: string;
  artifact: PreprobeReferenceFreezeV39;
  artifactSha256: string;
  fileSha256: string;
  bindingSha256: string;
}

export function preprobeBindingEvidenceId(input: {
  frozenAtUtc: string;
  artifactSha256: string;
  fileSha256: string;
}): { evidenceId: string; bindingSha256: string } {
  assertSha(input.artifactSha256, "artifact_sha256");
  assertSha(input.fileSha256, "file_sha256");
  const frozen = new Date(input.frozenAtUtc);
  if (!Number.isFinite(frozen.getTime())) throw new Error("PHASE2_HANDOFF_FROZEN_AT_INVALID");
  const date = frozen.toISOString().slice(0, 10).replaceAll("-", "");
  const bindingSha256 = sha256(
    `v39-phase2-preprobe-handoff-v1:${input.artifactSha256.toLowerCase()}:${input.fileSha256.toLowerCase()}`,
  );
  return {
    evidenceId: `RUN-${date}-${bindingSha256.toUpperCase()}`,
    bindingSha256,
  };
}

export function loadPreprobeHandoffBindingV39(path: string): PreprobeHandoffBindingV39 {
  const raw = readFileSync(path, "utf8");
  const fileSha256 = sha256(raw);
  const parsed: unknown = JSON.parse(raw);
  if (!verifyPreprobeReferenceFreezeV39(parsed)) {
    throw new Error("PHASE2_HANDOFF_PREPROBE_ARTIFACT_INVALID");
  }
  const artifact = parsed as PreprobeReferenceFreezeV39;
  const binding = preprobeBindingEvidenceId({
    frozenAtUtc: artifact.frozen_at_utc,
    artifactSha256: artifact.artifact_sha256,
    fileSha256,
  });
  return {
    ...binding,
    artifact,
    artifactSha256: artifact.artifact_sha256,
    fileSha256,
  };
}
