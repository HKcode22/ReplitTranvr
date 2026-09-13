import { createHash } from "crypto";
import { loadPhase2SmokeHandoffV39, type Phase2SmokeHandoffBindingV39 } from "./phase2SmokeHandoff_v39";
import { loadProbeRuntimeConfig, type ProbeRuntimeConfig } from "./probeExecution_v39";

function sha256(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export interface Gate2RuntimeBindingV39 {
  evidenceId: string;
  bindingSha256: string;
  runtimeFileSha256: string;
  runtime: ProbeRuntimeConfig;
  smoke: Phase2SmokeHandoffBindingV39;
}

export function loadGate2RuntimeBindingV39(input: {
  probeRuntimePath: string;
  probeRuntimeFileSha256: string;
  smokePath: string;
  smokeRuntimePath: string;
  smokeRuntimeFileSha256: string;
  preprobePath: string;
}): Gate2RuntimeBindingV39 {
  const smoke = loadPhase2SmokeHandoffV39({
    smokePath: input.smokePath,
    preprobePath: input.preprobePath,
    runtimePath: input.smokeRuntimePath,
    expectedRuntimeFileSha256: input.smokeRuntimeFileSha256,
  });
  const loaded = loadProbeRuntimeConfig(input.probeRuntimePath, input.probeRuntimeFileSha256);
  const runtime = loaded.config;

  if (runtime.watchdogPollMs !== smoke.smoke.watchdogPollMs ||
      runtime.settlementInitialWaitSeconds !== smoke.smoke.settlementInitialWaitSeconds ||
      runtime.settlementPollIntervalSeconds !== smoke.smoke.settlementPollIntervalSeconds ||
      runtime.settlementStableReadCount !== smoke.smoke.settlementStableReadCount ||
      runtime.settlementTimeoutSeconds !== smoke.smoke.settlementTimeoutSeconds ||
      runtime.unsettledBurstMarginCredits !== smoke.smoke.unsettledBurstMarginCredits) {
    throw new Error("GATE2_RUNTIME_SMOKE_CONTROL_MISMATCH");
  }

  const bindingSha256 = sha256(
    `v39-gate2-runtime-handoff-v1:${smoke.smokeBindingSha256}:${loaded.sha256}:${runtime.probeBudgetDayId}`,
  );
  const date = new Date(smoke.smoke.generatedAtUtc).toISOString().slice(0, 10).replaceAll("-", "");
  return {
    evidenceId: `RUN-${date}-${bindingSha256.toUpperCase()}`,
    bindingSha256,
    runtimeFileSha256: loaded.sha256,
    runtime,
    smoke,
  };
}

export function stage1AuthorizationScopeV39(binding: Gate2RuntimeBindingV39): string {
  return [
    "Gate2Stage1",
    `preprobe_file_sha256=${binding.smoke.preprobe.fileSha256}`,
    `runtime_file_sha256=${binding.runtimeFileSha256}`,
    `probe_budget_day_id=${binding.runtime.probeBudgetDayId}`,
    "target_minutes=120",
  ].join(";");
}

export function stage2AuthorizationScopeV39(binding: Gate2RuntimeBindingV39, promotionBindingSha256: string): string {
  if (!/^[a-f0-9]{64}$/i.test(promotionBindingSha256)) throw new Error("GATE2_STAGE2_PROMOTION_BINDING_SHA_INVALID");
  return [
    "Gate2Stage2",
    `preprobe_file_sha256=${binding.smoke.preprobe.fileSha256}`,
    `runtime_file_sha256=${binding.runtimeFileSha256}`,
    `probe_budget_day_id=${binding.runtime.probeBudgetDayId}`,
    `promotion_binding_sha256=${promotionBindingSha256.toLowerCase()}`,
    "target_minutes=240",
  ].join(";");
}