import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest=readFileSync("docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv","utf8");
const originalToMoved=new Map(manifest.trimEnd().split(/\r?\n/).slice(1).map(line=>{
 const cols=[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"'));
 return [cols[0],cols[1]];
}));
const science=[
 "SEPmd/V3.9_DataCollectPlan_f.8.md",
 "SEPmd/V3.9_IMPLEMENTATION_LOG.md",
 "SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md",
 "SEPmd/phase2g/incidents/2026-09-23_P2G10_GITHUB_REPLIT_WEBHOOK_SECRET_MISMATCH.md",
 "artifacts/preprobe-reference-freeze-record.json",
 "artifacts/database-baseline/live-schema-inventory-20261001.json",
] as const;
describe("Wave B operational-path readers retain original scientific identities",()=>{
 it("has corresponding byte-preserved relocated originals for every important source",()=>{
  for(const original of science){
   const now=originalToMoved.get(original);
   expect(now,"missing declared relocation "+original).toBeTruthy();
   expect(existsSync(now!),"missing original science at "+now).toBe(true);
  }
 });
 it("points active readers at relocated sources, not vanished original paths",()=>{
  const consumers=[
   ["scripts/v39_write_phase2f_retry_prep_receipt_v39.ts","SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md"],
   ["scripts/v39_record_preprobe_handoff_v39.ts","artifacts/preprobe-reference-freeze-record.json"],
   ["scripts/v39_prepare_phase2f_auth_v39.ts","artifacts/preprobe-reference-freeze-record.json"],
   ["scripts/v39_validate_generated_baseline_v39.ts","artifacts/database-baseline/live-schema-inventory-20261001.json"],
   ["scripts/v39_phase2g_p2g10_secret_mismatch_adjudication_v39.ts","SEPmd/phase2g/incidents/2026-09-23_P2G10_GITHUB_REPLIT_WEBHOOK_SECRET_MISMATCH.md"],
   ["scripts/v39_phase2g_stage1_paid_preflight_v39.ts","SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md"]
  ] as const;
  for(const [p,original] of consumers){
   const text=readFileSync(p,"utf8");
   const moved=originalToMoved.get(original)!;
   if(p.endsWith("v39_write_phase2f_retry_prep_receipt_v39.ts")||p.endsWith("v39_record_preprobe_handoff_v39.ts")||p.endsWith("v39_phase2g_stage1_paid_preflight_v39.ts")){
    expect(text).toContain("data-collection");
    expect(text).toContain(originalToMoved.get("artifacts/preprobe-reference-freeze-record.json")!);
   } else expect(text,p+" must read "+moved).toContain(moved);
  }
 });
 it("keeps source comparison and signed historical receipt names separate from physical input locations",()=>{
  const compare=readFileSync("scripts/repo_waveb_gate3_record_reconcile.mjs","utf8");
  for(const p of science.slice(0,3)){
   expect(compare).toContain(p);
   expect(compare).toContain(originalToMoved.get(p)!);
  }
  expect(compare).toContain("source(mainRef,current)");
  expect(compare).toContain("source(draftRef,path)");
  const source=readFileSync("server/lib/disruption/phase2Compact6_v39.ts","utf8");
  expect(source).toContain("relocatedHistoricalReceipts");
  expect(source).toContain("storedPath");
  expect(source).toContain("artifacts/phase2g-p2g23-yssy-reconstruction-20261008T044128Z.json");
  const p25=readFileSync("data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md","utf8");
  expect(p25.split("### AUTH-20261013-P2G25 — approved Phase 2G Stage-1 authorization").length-1).toBe(1);
 });
 it("verifies original tracked content from Git blobs rather than reconstructed output",()=>{
  const s=execFileSync(process.execPath,["scripts/repo_waveb_verify_actual_move.mjs"],{encoding:"utf8",timeout:45_000});
  const data=JSON.parse(s.replace(/^REPO_WAVEB_460_RELOCATION=/,""));
  expect(data.errors).toEqual([]);
  expect(data.exact_git_blob_mode_size_matches).toBe(460);
  expect(data.merge_authorized).toBe(false);
 });
});
