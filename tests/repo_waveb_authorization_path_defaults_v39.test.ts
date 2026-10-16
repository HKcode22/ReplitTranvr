import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ledgerPath="data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md";
const preprobePath="data-collection/evidence/original-artifacts/other/preprobe-reference-freeze-record.json";
const ledgerWritersAndReaders=[
  "scripts/v39_approve_phase2f_auth_v39.ts",
  "scripts/v39_approve_phase2g_auth_v39.ts",
  "scripts/v39_approve_phase2h_auth_v39.ts",
  "scripts/v39_build_phase2f_workspace_ingress_binding_v39.ts",
  "scripts/v39_phase2g_stage1_recover_after_exit_v39.ts",
  "scripts/v39_prepare_phase2f_smoke_runtime_v39.ts",
  "scripts/v39_prepare_gate2_runtime_v39.ts",
  "scripts/v39_record_gate2_phase2_pass_v39.ts",
  "scripts/v39_record_phase2_smoke_handoff_v39.ts",
  "scripts/v39_record_stage1_promotion_handoff_v39.ts",
  "scripts/v39_verify_phase2f_deployment_binding_v39.ts"
] as const;

describe("Wave B migrated ledger and preprobe defaults — offline source contract",()=>{
  it("points every listed authorization/receipt/Phase2 runtime ledger reader at the SAME physically moved original",()=>{
    expect(existsSync(ledgerPath)).toBe(true);
    const canonical=readFileSync(ledgerPath,"utf8");
    expect(canonical.split("### AUTH-20261013-P2G25 — approved Phase 2G Stage-1 authorization").length-1).toBe(1);
    const expected=/const LEDGER = (?:path\.)?join\(process\.cwd\(\), "data-collection", "evidence", "ledgers", "V3\.9_RUN_REPORTS_AND_EVIDENCE\.md"\);/;
    for(const p of ledgerWritersAndReaders){
      const code=readFileSync(p,"utf8");
      expect(code,p+": relocated ledger reader must be exact").toMatch(expected);
      expect(code,p+": old SEPmd ledger must not be used").not.toMatch(/const LEDGER = (?:path\.)?join\(process\.cwd\(\), "SEPmd"/);
      expect(code,p+": ledger variable must still be consumed").toMatch(/(?:readFileSync|appendFileSync|existsSync)\(LEDGER/);
    }
    console.log("WAVEB_LEDGER_READERS="+JSON.stringify({verified:ledgerWritersAndReaders.length,p25_append_exactly_once:true,mutations:0,paid_provider_calls:0}));
  });

  it("repairs the Phase2G authorization default input without altering its smoke/output policy",()=>{
    expect(existsSync(preprobePath)).toBe(true);
    const p="scripts/v39_prepare_phase2g_auth_v39.ts";
    const code=readFileSync(p,"utf8");
    expect(code).toContain('const DEFAULT_PREPROBE = "'+preprobePath+'";');
    expect(code).toContain('preprobePath: resolve(optional("--preprobe") ?? DEFAULT_PREPROBE)');
    expect(code).not.toContain('const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";');
    expect(code).toContain('const DEFAULT_SMOKE = "artifacts/v39-phase2-safety-smoke.json";');
    expect(code).toContain('status: "DRAFT_ONLY_NOT_AUTHORIZED"');
  });

  it("does not confuse newly produced runtime outputs with the immutable 460 original files",()=>{
    const csv=readFileSync("docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv","utf8");
    const historical=csv.trimEnd().split(/\r?\n/).slice(1).map(l=>l.match(/^"([^"]+)"/)?.[1]);
    expect(historical).toHaveLength(460);
    expect(historical).toContain("artifacts/preprobe-reference-freeze-record.json");
    expect(historical).not.toContain("artifacts/v39-phase2-safety-smoke.json");
    expect(historical).not.toContain("artifacts/v39-stage1-promotion-handoff.json");
    expect(historical).not.toContain("artifacts/prepaid-security-retention-pass.json");
    expect(historical).not.toContain("artifacts/reference-freeze-record.json");
    expect(readFileSync("scripts/v39_prepare_phase2g_auth_v39.ts","utf8")).not.toContain("RUN_PAID_STAGE1_ONCE");
  });
});
