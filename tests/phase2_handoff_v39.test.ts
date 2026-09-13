import { describe, expect, it } from "vitest";
import { preprobeBindingEvidenceId } from "../server/lib/disruption/phase2Handoff_v39";

describe("Phase 2 hash-bound handoffs", () => {
  it("derives a deterministic ledger-compatible predecessor ID from both preprobe hashes", () => {
    const a = preprobeBindingEvidenceId({
      frozenAtUtc: "2026-09-13T07:40:00Z",
      artifactSha256: "a".repeat(64),
      fileSha256: "b".repeat(64),
    });
    const b = preprobeBindingEvidenceId({
      frozenAtUtc: "2026-09-13T07:40:00Z",
      artifactSha256: "a".repeat(64),
      fileSha256: "b".repeat(64),
    });
    expect(b).toEqual(a);
    expect(a.evidenceId).toMatch(/^RUN-20260913-[A-F0-9]{64}$/);
    expect(a.bindingSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes the predecessor ID when either exact artifact identity changes", () => {
    const base = preprobeBindingEvidenceId({
      frozenAtUtc: "2026-09-13T07:40:00Z",
      artifactSha256: "a".repeat(64),
      fileSha256: "b".repeat(64),
    });
    const selfChanged = preprobeBindingEvidenceId({
      frozenAtUtc: "2026-09-13T07:40:00Z",
      artifactSha256: "c".repeat(64),
      fileSha256: "b".repeat(64),
    });
    const bytesChanged = preprobeBindingEvidenceId({
      frozenAtUtc: "2026-09-13T07:40:00Z",
      artifactSha256: "a".repeat(64),
      fileSha256: "d".repeat(64),
    });
    expect(selfChanged.evidenceId).not.toBe(base.evidenceId);
    expect(bytesChanged.evidenceId).not.toBe(base.evidenceId);
  });

  it("rejects malformed SHA inputs instead of creating a weak binding", () => {
    expect(() => preprobeBindingEvidenceId({
      frozenAtUtc: "2026-09-13T07:40:00Z",
      artifactSha256: "bad",
      fileSha256: "b".repeat(64),
    })).toThrow(/ARTIFACT_SHA256_INVALID/);
  });
});
