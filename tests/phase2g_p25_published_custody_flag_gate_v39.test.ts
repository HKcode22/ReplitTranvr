import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const runtime=readFileSync("server/lib/disruption/workspaceRuntimeHealth_v39.ts","utf8");
const preflight=readFileSync("scripts/v39_phase2g_stage1_paid_preflight_v39.ts","utf8");
const supervisor=readFileSync("scripts/v39_phase2g_stage1_logged_supervisor_v39.ts","utf8");
const verifier=readFileSync("scripts/v39_phase2g_verify_live_callback_v39.ts","utf8");

describe("P25 production callback source-custody feature-gate binding, no provider",()=>{
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
  it("paid preflight also checks actually present LOGGED V0064 schema",()=>{
    expect(preflight).toContain("health.json?.prepaid_source_custody_ready === true");
    expect(preflight).toContain("source_intent_v0064_table");
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
