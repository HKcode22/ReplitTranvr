import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

// Regression contract: supplemental free sources/engineering candidate adapters
// cannot silently replace original normative Gate5 Plan + locked Log. This
// protects required scope while allowing separately reviewed amendments.
const plan=readFileSync("data-collection/plans/V3.9_DataCollectPlan_f.8.md","utf8");
const log=readFileSync("data-collection/implementation/V3.9_IMPLEMENTATION_LOG.md","utf8");
const phase=readFileSync("data-collection/phase4/2026-11-02_GATE5_SCIENTIFIC_RESTORATION_AND_EXACT_WORK_LEFT.md","utf8");
describe("Gate5 original Plan f.8 + hash-locked Log §1.9 scientific scope preserved",()=>{
 it("the normative §§5–7/16 original population, T and historical cutoff rules remain present",()=>{
  for(const clause of [
   "## 5. The provider-observable prediction population (S1)",
   "### 5.1 Complete FIDS protocol (binding)",
   "### 6.0 Exact T milestone (binding; BLOCKED pending Gate-0.5 verification)",
   "### 6.1 Dual prediction-state data contract (PRE + AIRBORNE)",
   "### 7.2 Codeshare deduplication (binding)",
   "### 7.3 Target-specific label observability (binding)",
   "## 10. Weather (LOCKED)",
   "## 13. Evaluation suite",
   "## 16. The GO gates",
   "population_member_at_cutoff",
   "selected_t_milestone",
   "captured_outside_population",
   "airborne_eligible",
   "Phase 6"
  ])expect(plan).toContain(clause);
  expect(plan).toContain("webhook capture is");
  expect(plan).toContain("A zero");
 });
 it("the binding master log still demands all original independent Gate5 dimensions",()=>{
  const a=log.indexOf("### 1.9 Phase 4 — Gate 5 population-observability validation");
  const b=log.indexOf("### 1.10 Phase 5",a);
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(a);
  const section=log.slice(a,b);
  for(const phrase of [
   "population;",
   "horizon eligibility;",
   "expected snapshots;",
   "created snapshots;",
   "webhook captured;",
   "feature completeness/missingness;",
   "captured inside population;",
   "captured outside population;",
   "target-applicable rows;",
   "observed outcomes;",
   "AIRBORNE nested funnel",
   "zero denominator",
   "tier/region",
   "webhook capture is parallel"
  ])expect(section.toLowerCase()).toContain(phrase.toLowerCase());
  expect(log).toContain("### 2.22 Phase 4 — Gate 5");
 });
 it("the scientific restoration matrix disallows replacing real gate with free references",()=>{
  for(const key of [
    "Mandatory f.8 §1.9 measurement matrix",
    "real end-to-end Gate5",
    "scientific Gate 5",
    "PRE",
    "POST",
    "AIRBORNE",
    "in-frame/outside/unresolved",
    "provider-native",
    "retention",
    "zero"
  ])expect(phase.toLowerCase()).toContain(key.toLowerCase());
 });
});
