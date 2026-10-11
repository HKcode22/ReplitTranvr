import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const runtime=readFileSync("server/lib/disruption/workspaceRuntimeHealth_v39.ts","utf8");
const preflight=readFileSync("scripts/v39_phase2g_stage1_paid_preflight_v39.ts","utf8");
const supervisor=readFileSync("scripts/v39_phase2g_stage1_logged_supervisor_v39.ts","utf8");
const verifier=readFileSync("scripts/v39_phase2g_verify_live_callback_v39.ts","utf8");

describe("P25 production callback source-custody feature-gate binding, no provider",()=>{
  it("operator read-only schema diagnostic fails closed when V0064 is missing",()=>{
    const handoff=readFileSync("SEPmd/phase2g/reports/2026-10-11_P25_YSSY_LAST_MILE_READONLY_OPERATOR_HANDOFF.md","utf8");
    expect(handoff).toContain("q.rows[0]?.has_v0064_source_intent===true");
    expect(handoff).toContain("q.rows[0]?.has_v0064_guard_trigger===true");
    expect(handoff).toContain("current_schema_gate_pass:schemaGatePass");
    expect(handoff).toContain("if(!schemaGatePass)process.exitCode=2");
    expect(handoff).not.toContain("!q.rows[0]?.has_logged_blobs||!q.rows[0]?.has_session_runtime||");
  });
  it("advertises readiness ONLY when all four active receiver flags are set, no secret values",()=>{
    const from=runtime.indexOf("prepaid_source_custody_ready:");
    const to=runtime.indexOf("retention_hours: retentionHours",from);
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    const block=runtime.slice(from,to);
    for(const key of [
      "V39_CALLBACK_ONLY_RUNTIME",
      "V39_PREPAID_FAILED_SOURCE_JOURNAL_APPROVED",
      "V39_PREPAID_SOURCE_PENDING_INTENT_APPROVED",
      "V39_PREPAID_SOURCE_OUTSIDE_SESSION_LOCK_APPROVED"
    ])expect(block).toContain(`process.env.${key}==="1"`);
    expect(block).not.toContain("AERODATABOX_WEBHOOK_SECRET");
    expect(block).not.toContain("V39_PROVIDER_BLOB_BUCKET_ID");
  });
  it("historical incident #30 audit is read-only and never promotes a missing UNLOGGED session to cleanup proof",()=>{
    const handoff=readFileSync("SEPmd/phase2g/reports/2026-10-11_P25_YSSY_LAST_MILE_READONLY_OPERATOR_HANDOFF.md","utf8");
    expect(handoff).toContain("runtime_missing_is_not_cleanup_proof:runtime.rowCount===0");
    expect(handoff).toContain("cleanup_journal_table_present:journalExist.rows[0]?.present===true");
    expect(handoff).toContain("incident30_administrative_clearance_authorized:false");
    expect(handoff).toContain("historical_blob_early_deletion_authorized:false");
    expect(handoff).toContain("paid_yssy_go_authorized:false");
    expect(handoff).toContain("allowEarlyDelete:true");
    const recovery=readFileSync("server/lib/disruption/prepaidProbeRuntime_v39.ts","utf8");
    expect(recovery).toContain("allowEarlyDelete: true");
  });
  it("paid preflight also checks actually present LOGGED V0064 schema",()=>{
    expect(preflight).toContain("health.json?.prepaid_source_custody_ready === true");
    expect(preflight).toContain("source_intent_v0064_table");
    expect(preflight).toContain("source_intent_v0064_guard_trigger");
    expect(preflight).toContain("v0064_logged_original_source_immutability_guard_missing_or_disabled");
    expect(preflight).toContain("tg.tgfoid=to_regprocedure('clean.guard_p2g_prepaid_source_intent_v39()')");
    expect(preflight).toContain("tg.tgenabled='O'");
    expect(preflight).toContain("v0064_logged_original_source_pending_intent_migration_missing");
    expect(preflight).toContain("open_incidents=");
  });
  it("continuous paid supervisor and disposable signed POST demand enabled hosted source custody",()=>{
    expect(supervisor).toContain("(publishedMode&&health?.prepaid_source_custody_ready!==true)");
    const gate=verifier.indexOf("REFUSED:PUBLISHED_RUNTIME_GIT_HEAD_OR_CONTRACT_MISMATCH");
    expect(verifier.slice(0,gate)).toContain("j?.prepaid_source_custody_ready!==true");
    expect(verifier.indexOf("const incidents = await pool.query(")).toBeGreaterThan(gate);
    expect(verifier.indexOf("const session = await armPrepaidProbeSessionV39(")).toBeGreaterThan(gate);
  });
});
