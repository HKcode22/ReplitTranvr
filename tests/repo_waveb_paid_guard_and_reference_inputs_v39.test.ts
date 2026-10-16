import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { approvedArtifactHashesFromLedger } from "../server/lib/disruption/authRecord_v39";
import { loadApprovedArtifactHashes } from "../scripts/v39_paid_guard_v39";

const ledger="data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md";
const plan="data-collection/plans/V3.9_DataCollectPlan_f.8.md";

describe("Wave B exact paid guard/Plan input migration — no live operation",()=>{
  it("reads the original relocated ledger in the shared paid guard without losing its fail-closed AUTH checks",()=>{
    const source=readFileSync("scripts/v39_paid_guard_v39.ts","utf8");
    const actual='join(process.cwd(), "data-collection", "evidence", "ledgers", "V3.9_RUN_REPORTS_AND_EVIDENCE.md")';
    expect(source.split(actual).length-1).toBe(2);
    expect(source).not.toContain('join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md")');
    expect(existsSync(ledger)).toBe(true);
    expect(loadApprovedArtifactHashes()).toEqual(approvedArtifactHashesFromLedger(readFileSync(ledger,"utf8")));
    expect(source).toContain("verifyAuthRecord(record");
    expect(source).toContain("approvedArtifactHashes: loadApprovedArtifactHashes()");
    expect(source).toContain("REFUSE: direct AUTH verification failed");
  });
  it("rebinds Plan SHA readers while keeping raw scientific bytes and gate1 dynamic-output path distinct",()=>{
    expect(existsSync(plan)).toBe(true);
    const expected='join(root, "data-collection", "plans", "V3.9_DataCollectPlan_f.8.md")';
    for(const p of ["scripts/v39_freeze_record_v39.ts","scripts/v39_refresh_gate1_reference_after_drift_v39.ts"]){
      const code=readFileSync(p,"utf8");
      expect(code,p).toContain(expected);
      expect(code,p).not.toContain('join(root, "SEPmd", "V3.9_DataCollectPlan_f.8.md")');
      expect(code,p).toContain("readFileSync(planPath)");
      expect(code,p).toContain('join(root, "artifacts", "gate1-coverage.json")');
    }
  });
  it("continues requiring exact retained historical ledger appendix with no implicit paid GO",()=>{
    const raw=readFileSync(ledger,"utf8");
    expect(raw.split("### AUTH-20261013-P2G25 — approved Phase 2G Stage-1 authorization").length-1).toBe(1);
    const guard=readFileSync("scripts/v39_paid_guard_v39.ts","utf8");
    expect(guard).toContain("if (!auth || !authFile)");
    expect(guard).toContain("if (!checked.verdict.verified)");
    expect(guard).toContain("expectedPhaseGate");
    expect(guard).toContain("approvedArtifactHashesFromLedger");
    console.log("WAVEB_SOURCE_PATH_GUARD="+JSON.stringify({ledgerReaderLocations:2,planReaders:2,providerCalls:0,paidActivation:false}));
  });
});
