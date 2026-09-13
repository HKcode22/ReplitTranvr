import "dotenv/config";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { selectStage2Top5, type Stage1ProbeEvidence } from "../server/lib/disruption/anchorPromotion_v39";
import { loadProbeExecutionArtifacts } from "../server/lib/disruption/probeExecution_v39";
import { loadGate2RuntimeBindingV39 } from "../server/lib/disruption/phase2Gate2Runtime_v39";
import {
  buildStage1PromotionHandoffV39,
  loadStage1PromotionHandoffV39,
} from "../server/lib/disruption/phase2Stage1Handoff_v39";

const LEDGER = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";
const DEFAULT_SMOKE = "artifacts/v39-phase2-safety-smoke.json";
const DEFAULT_OUT = "artifacts/v39-stage1-promotion-handoff.json";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!v) throw new Error(`MISSING:${name}`);
  return v;
}
function optional(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? String(process.argv[i + 1] ?? "").trim() || null : null;
}

async function readStage1Evidence(preprobeHash: string): Promise<Stage1ProbeEvidence[]> {
  const r = await pool.query(
    `SELECT icao,status,rows_per_hour,credits_spent,unique_flights_per_credit,
            tail_chain_links_per_credit,stability,confirmed_unique_lower,
            confirmed_plus_ambiguous_upper,provider_content_safe_mode,
            confirmed_unique_lower_per_credit,confirmed_plus_ambiguous_upper_per_credit
       FROM clean.adb_anchor_probe
      WHERE stage=1 AND preprobe_artifact_sha256=$1
      ORDER BY recorded_at ASC`,
    [preprobeHash],
  );
  return r.rows.map((x: any) => {
    const safe = x.provider_content_safe_mode === true;
    const lowerRate = x.confirmed_unique_lower_per_credit == null ? null : Number(x.confirmed_unique_lower_per_credit);
    const upperRate = x.confirmed_plus_ambiguous_upper_per_credit == null ? null : Number(x.confirmed_plus_ambiguous_upper_per_credit);
    const safeRates = safe && lowerRate !== null && upperRate !== null && Number.isFinite(lowerRate) && Number.isFinite(upperRate);
    return {
      icao: String(x.icao).toUpperCase(),
      status: String(x.status),
      rowsPerHour: x.rows_per_hour == null ? null : Number(x.rows_per_hour),
      creditsSpent: safeRates ? 1 : (x.credits_spent == null ? null : Number(x.credits_spent)),
      uniqueFlightsPerCredit: x.unique_flights_per_credit == null ? null : Number(x.unique_flights_per_credit),
      tailChainLinksPerCredit: x.tail_chain_links_per_credit == null ? null : Number(x.tail_chain_links_per_credit),
      stability: x.stability == null ? null : Number(x.stability),
      confirmedUniqueLower: safeRates ? lowerRate : (x.confirmed_unique_lower == null ? null : Number(x.confirmed_unique_lower)),
      confirmedPlusAmbiguousUpper: safeRates ? upperRate : (x.confirmed_plus_ambiguous_upper == null ? null : Number(x.confirmed_plus_ambiguous_upper)),
    };
  });
}

async function main(): Promise<void> {
  if (!existsSync(LEDGER)) throw new Error("BLOCKED:EVIDENCE_LEDGER_MISSING");
  const preprobePath = resolve(optional("--preprobe") ?? DEFAULT_PREPROBE);
  const smokePath = resolve(optional("--smoke") ?? DEFAULT_SMOKE);
  const smokeRuntimePath = resolve(required("--smoke-runtime-file"));
  const smokeRuntimeSha = required("--smoke-runtime-sha").toLowerCase();
  const runtimePath = resolve(required("--runtime-file"));
  const runtimeSha = required("--runtime-sha").toLowerCase();
  const out = resolve(optional("--out") ?? DEFAULT_OUT);

  const gate2 = loadGate2RuntimeBindingV39({
    probeRuntimePath: runtimePath,
    probeRuntimeFileSha256: runtimeSha,
    smokePath,
    smokeRuntimePath,
    smokeRuntimeFileSha256: smokeRuntimeSha,
    preprobePath,
  });
  const artifacts = loadProbeExecutionArtifacts({
    preprobePath,
    preprobeSha256: gate2.smoke.preprobe.fileSha256,
    runtimePath,
    runtimeSha256: runtimeSha,
  });
  const active = await pool.query(`SELECT count(*)::int n FROM clean.adb_anchor_probe WHERE status='probing'`);
  if (Number(active.rows[0]?.n ?? 0) !== 0) throw new Error("REFUSED_STAGE1_HANDOFF_ACTIVE_PROBE");

  const evidence = await readStage1Evidence(artifacts.preprobeSha256);
  const promotion = selectStage2Top5(artifacts.preprobe, evidence);
  const built = buildStage1PromotionHandoffV39({ generatedAtUtc: new Date().toISOString(), gate2, promotion });

  let loaded;
  if (existsSync(out)) {
    loaded = loadStage1PromotionHandoffV39({ path: out, gate2, currentPromotion: promotion });
  } else {
    writeFileSync(out, JSON.stringify(built, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
    loaded = loadStage1PromotionHandoffV39({ path: out, gate2, currentPromotion: promotion });
  }
  const ledger = readFileSync(LEDGER, "utf8");
  if (!ledger.includes(gate2.smoke.evidenceId) || !ledger.includes(gate2.evidenceId)) {
    throw new Error("BLOCKED_STAGE1_HANDOFF_GATE2_PREDECESSOR_NOT_RECORDED");
  }
  if (!ledger.includes("approval_scope: PHASE_2G_STAGE1_ONLY")) {
    throw new Error("BLOCKED_STAGE1_HANDOFF_NO_APPROVED_STAGE1_AUTH_RECORDED");
  }
  if (!ledger.includes(loaded.evidenceId)) {
    appendFileSync(LEDGER, [
      "",
      `### ${loaded.evidenceId} — Gate 2 Stage-1 promotion handoff`,
      `- evidence_id: ${loaded.evidenceId}`,
      `- predecessor_smoke_evidence_id: ${gate2.smoke.evidenceId}`,
      `- predecessor_gate2_runtime_evidence_id: ${gate2.evidenceId}`,
      `- STAGE1_PROMOTION_ARTIFACT_SHA256:${loaded.artifact.artifact_sha256}`,
      `- STAGE1_PROMOTION_FILE_SHA256:${loaded.fileSha256}`,
      `- STAGE1_PROMOTION_BINDING_SHA256:${loaded.bindingSha256}`,
      `- promotion_sha256: ${loaded.artifact.promotion_sha256}`,
      `- selected_final_five: ${loaded.artifact.selected_final_five.join(",")}`,
      `- reference_icao: ${loaded.artifact.reference_icao}`,
      "- phase2g_stage1: PASS_HANDOFF_READY",
      "- stage2_authorized: false",
      "",
    ].join("\n"), "utf8");
  }

  console.log(JSON.stringify({
    status: "PASS_HANDOFF_RECORDED",
    phase2g_stage1: "PASS_HANDOFF_READY",
    evidence_id: loaded.evidenceId,
    artifact_sha256: loaded.artifact.artifact_sha256,
    file_sha256: loaded.fileSha256,
    binding_sha256: loaded.bindingSha256,
    promotion_sha256: loaded.artifact.promotion_sha256,
    selected_final_five: loaded.artifact.selected_final_five,
    reference_icao: loaded.artifact.reference_icao,
    stage2_authorized: false,
    next: "Prepare and human-approve a separate exact Phase-2H Stage-2 AUTH bound to this promotion handoff",
  }, null, 2));
}

main().catch((error: any) => {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
}).finally(async () => { await pool.end().catch(() => undefined); });