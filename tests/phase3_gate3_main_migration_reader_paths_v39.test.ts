import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
const ledger= "data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md";
const paths=[
 "server/lib/disruption/gate3LedgerBoundSessionPreparation_v39.ts",
 "server/lib/disruption/gate3OwnedPreExposure_v39.ts",
 "scripts/v39_gate3_owner_readonly_v39.ts",
];
describe("Phase3 Gate3 migrated active readers and manual-only source security",()=>{
 it("uses the current immutable original ledger location rather than the removed SEPmd root",()=>{
  const bytes=readFileSync(ledger);
  expect(bytes.byteLength).toBeGreaterThan(0);
  for(const path of paths){
   const source=readFileSync(path,"utf8");
   expect(source,path).toContain('"data-collection","evidence","ledgers","V3.9_RUN_REPORTS_AND_EVIDENCE.md"');
   expect(source,path).not.toContain('"SEPmd","V3.9_RUN_REPORTS_AND_EVIDENCE.md"');
  }
 });
 it("pins a manual readonly Gate3 admission to the current committed AUTH folder",()=>{
  const y=readFileSync(".github/workflows/phase3-gate3-owner-readonly.yml","utf8");
  expect(y).toContain("^data-collection/authorizations/");
  expect(y).not.toContain("^SEPmd/");
  expect(y).toContain("READ_ONLY_GATE3_NO_PROVIDER");
  expect(y).toContain("git ls-files --error-unmatch");
  expect(y).not.toContain("AERODATABOX_API_KEY");
  expect(y).not.toMatch(/^ {2}(?:schedule|push|pull_request|workflow_run):/m);
  expect(y).toContain("environment: phase3-readonly");
  expect(y).toContain("No provider balance or financial source custody was checked.");
 });
});
