import { createHash } from "crypto";
import { readFileSync } from "fs";
import type { PromotionResult, PromotionRow } from "./anchorPromotion_v39";
import type { Gate2RuntimeBindingV39 } from "./phase2Gate2Runtime_v39";

export const STAGE1_PROMOTION_HANDOFF_SCHEMA_V39 = "v3.9-stage1-promotion-handoff-1" as const;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const x = value as Record<string, unknown>;
  return `{${Object.keys(x).sort().map((key) => `${JSON.stringify(key)}:${canonical(x[key])}`).join(",")}}`;
}
function sha256(raw: string): string { return createHash("sha256").update(raw, "utf8").digest("hex"); }
function hashObject(value: unknown): string { return sha256(canonical(value)); }

function promotionCore(promotion: PromotionResult) {
  return {
    selected: promotion.selected,
    ranked: promotion.ranked.map((row: PromotionRow) => ({
      icao: row.icao,
      anchorScore: row.anchorScore,
      anchorScoreLower: row.anchorScoreLower,
      anchorScoreUpper: row.anchorScoreUpper,
      yieldScore: row.yieldScore,
      yieldScoreLower: row.yieldScoreLower,
      yieldScoreUpper: row.yieldScoreUpper,
      capacityPass: row.capacityPass,
      ambiguityInvariant: row.ambiguityInvariant,
      source: row.source,
    })),
    referenceIcao: promotion.referenceIcao,
    primaryStage1Complete: promotion.primaryStage1Complete,
    replacementsNeeded: promotion.replacementsNeeded,
    nextReplacement: promotion.nextReplacement,
    ambiguityMembershipInvariant: promotion.ambiguityMembershipInvariant,
  };
}

export function stage1PromotionDigestV39(promotion: PromotionResult): string {
  return hashObject(promotionCore(promotion));
}

export interface Stage1PromotionHandoffArtifactV39 {
  schema_version: typeof STAGE1_PROMOTION_HANDOFF_SCHEMA_V39;
  status: "READY_STAGE2_PROMOTION";
  generated_at_utc: string;
  smoke_evidence_id: string;
  gate2_runtime_evidence_id: string;
  gate2_runtime_binding_sha256: string;
  gate2_runtime_file_sha256: string;
  preprobe_file_sha256: string;
  probe_budget_day_id: string;
  promotion_sha256: string;
  selected_final_five: string[];
  reference_icao: "WSSS" | "OMAA";
  ranked_candidate_count: number;
  artifact_sha256: string;
}

export function buildStage1PromotionHandoffV39(input: {
  generatedAtUtc: string;
  gate2: Gate2RuntimeBindingV39;
  promotion: PromotionResult;
}): Stage1PromotionHandoffArtifactV39 {
  const generated = new Date(input.generatedAtUtc);
  if (!Number.isFinite(generated.getTime())) throw new Error("STAGE1_HANDOFF_GENERATED_AT_INVALID");
  const p = input.promotion;
  if (!p.primaryStage1Complete) throw new Error("STAGE1_HANDOFF_PRIMARY_NOT_COMPLETE");
  if (p.replacementsNeeded !== 0 || p.selected.length !== 5 || p.ranked.length < 5) {
    throw new Error("STAGE1_HANDOFF_PROMOTION_NOT_READY");
  }
  if (!p.ambiguityMembershipInvariant) throw new Error("STAGE1_HANDOFF_MEMBERSHIP_NOT_INVARIANT");
  const unsigned = {
    schema_version: STAGE1_PROMOTION_HANDOFF_SCHEMA_V39,
    status: "READY_STAGE2_PROMOTION" as const,
    generated_at_utc: generated.toISOString(),
    smoke_evidence_id: input.gate2.smoke.evidenceId,
    gate2_runtime_evidence_id: input.gate2.evidenceId,
    gate2_runtime_binding_sha256: input.gate2.bindingSha256,
    gate2_runtime_file_sha256: input.gate2.runtimeFileSha256,
    preprobe_file_sha256: input.gate2.smoke.preprobe.fileSha256,
    probe_budget_day_id: input.gate2.runtime.probeBudgetDayId,
    promotion_sha256: stage1PromotionDigestV39(p),
    selected_final_five: [...p.selected],
    reference_icao: p.referenceIcao,
    ranked_candidate_count: p.ranked.length,
  };
  return { ...unsigned, artifact_sha256: hashObject(unsigned) };
}

export interface LoadedStage1PromotionHandoffV39 {
  artifact: Stage1PromotionHandoffArtifactV39;
  fileSha256: string;
  bindingSha256: string;
  evidenceId: string;
}

export function loadStage1PromotionHandoffV39(input: {
  path: string;
  expectedFileSha256?: string | null;
  gate2: Gate2RuntimeBindingV39;
  currentPromotion?: PromotionResult | null;
}): LoadedStage1PromotionHandoffV39 {
  const raw = readFileSync(input.path, "utf8");
  const fileSha256 = sha256(raw);
  if (input.expectedFileSha256 && fileSha256 !== input.expectedFileSha256.toLowerCase()) {
    throw new Error(`STAGE1_HANDOFF_FILE_SHA_MISMATCH:expected=${input.expectedFileSha256}:actual=${fileSha256}`);
  }
  const x = JSON.parse(raw) as Stage1PromotionHandoffArtifactV39;
  if (x.schema_version !== STAGE1_PROMOTION_HANDOFF_SCHEMA_V39 || x.status !== "READY_STAGE2_PROMOTION") {
    throw new Error("STAGE1_HANDOFF_SCHEMA_STATUS_INVALID");
  }
  const { artifact_sha256, ...unsigned } = x;
  if (!/^[a-f0-9]{64}$/i.test(String(artifact_sha256 ?? "")) || hashObject(unsigned) !== artifact_sha256) {
    throw new Error("STAGE1_HANDOFF_ARTIFACT_HASH_INVALID");
  }
  if (x.smoke_evidence_id !== input.gate2.smoke.evidenceId ||
      x.gate2_runtime_evidence_id !== input.gate2.evidenceId ||
      x.gate2_runtime_binding_sha256 !== input.gate2.bindingSha256 ||
      x.gate2_runtime_file_sha256 !== input.gate2.runtimeFileSha256 ||
      x.preprobe_file_sha256 !== input.gate2.smoke.preprobe.fileSha256 ||
      x.probe_budget_day_id !== input.gate2.runtime.probeBudgetDayId) {
    throw new Error("STAGE1_HANDOFF_GATE2_BINDING_MISMATCH");
  }
  if (x.selected_final_five.length !== 5 || new Set(x.selected_final_five).size !== 5) {
    throw new Error("STAGE1_HANDOFF_FINAL_FIVE_INVALID");
  }
  if (input.currentPromotion && x.promotion_sha256 !== stage1PromotionDigestV39(input.currentPromotion)) {
    throw new Error("STAGE1_HANDOFF_CURRENT_PROMOTION_DRIFT");
  }
  const bindingSha256 = sha256(
    `v39-stage1-promotion-binding-v1:${input.gate2.bindingSha256}:${artifact_sha256}:${fileSha256}`,
  );
  const date = new Date(x.generated_at_utc).toISOString().slice(0, 10).replaceAll("-", "");
  return {
    artifact: x,
    fileSha256,
    bindingSha256,
    evidenceId: `RUN-${date}-${bindingSha256.toUpperCase()}`,
  };
}