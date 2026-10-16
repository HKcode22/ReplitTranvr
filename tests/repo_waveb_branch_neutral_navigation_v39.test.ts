import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pages=[
"README.md",
"data-collection/README.md",
"data-collection/START_HERE.md",
"data-collection/ALL_SEPMD_FILES.md",
"data-collection/evidence/ARTIFACTS_START_HERE.md",
"data-collection/phase2g/README.md",
"data-collection/phase2g/ALL_REPORTS.md",
"data-collection/evidence/README.md",
"data-collection/operations/README.md",
"data-collection/implementation/README.md",
"data-collection/phase2/README.md",
"data-collection/plans/README.md",
"data-collection/authorizations/README.md",
"data-collection/evidence/artifact-index/phase2f.md",
"data-collection/evidence/artifact-index/phase2g.md",
"data-collection/evidence/artifact-index/other.md",
];
describe("Wave B readable navigation remains accurate after future merge",()=>{
 it("prevents outdated pre-migration HOLD banners or default-main assertions",()=>{
  for(const path of pages){
   const text=readFileSync(path,"utf8");
   expect(text,path).not.toMatch(/DRAFT migration branch only/);
   expect(text,path).not.toMatch(/physically renamed.*on HOLD/i);
   expect(text,path).not.toMatch(/the original (?:108|SEPmd).*(?:remain untouched|at their old paths)/i);
   expect(text,path).not.toContain("On **protected `main`**, the original directories remain");
  }
  expect(readFileSync("README.md","utf8")).toContain("original-to-relocated SHA manifest");
  expect(readFileSync("README.md","utf8")).toContain("new **generated/temporary outputs**");
 });
 it("distinguishes historical source record counts, PR36 future inputs and merge status",()=>{
  const home=readFileSync("data-collection/README.md","utf8");
  expect(home).toContain("108 original `SEPmd/`");
  expect(home).toContain("352 original `artifacts/`");
  expect(home).toContain("47 unmerged PR36-only files");
  const status=readFileSync("docs/repository-maintenance/START_HERE.md","utf8");
  expect(status).toContain("actual 460-row relocation manifest");
  expect(status).toContain("merge status is independent");
  expect(readFileSync("data-collection/operations/WAVE_B_COMPATIBILITY_GATE.md","utf8")).toContain("Historical pre-migration decision");
  const s=readFileSync("data-collection/evidence/README.md","utf8");
  expect(s).toContain("original unchanged Git blobs");
  expect(s).toContain("Never derive formal PASS");
 });
});
