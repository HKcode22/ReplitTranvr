import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";

const raw=readFileSync("docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv","utf8");
const rows=raw.trimEnd().split(/\r?\n/).slice(1).map(line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(x=>x[1].replace(/""/g,'"')));
// Keep Wave B's historical first-hop manifest intact. Wave D records exactly one
// later physical path consolidation for an empty (0-byte) historical placeholder.
const supplement=readFileSync("docs/repository-maintenance/manifests/2026-10-16_WAVED_EMPTY_PLACEHOLDER_SECOND_HOP.csv","utf8");
const supplementRows=supplement.trimEnd().split(/\r?\n/).slice(1).map(line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(x=>x[1].replace(/""/g,'"')));
const secondHops=new Map(supplementRows.map(([oldPath,newPath])=>[oldPath,newPath]));
describe("Wave B migrated navigation links (no provider)",()=>{
 it("links all 108 historical science blobs and 352 artifact blobs via their new positions",()=>{
  const science=readFileSync("data-collection/ALL_SEPMD_FILES.md","utf8");
  const groups={
   phase2f:readFileSync("data-collection/evidence/artifact-index/phase2f.md","utf8"),
   phase2g:readFileSync("data-collection/evidence/artifact-index/phase2g.md","utf8"),
   other:readFileSync("data-collection/evidence/artifact-index/other.md","utf8")
  };
  expect(supplementRows).toHaveLength(1);
  expect([...secondHops.entries()]).toEqual([[
   "data-collection/history/zero-byte-audit-stubs/V3.9_Final_Document_Safety_Audit_2026-09-02.md",
   "data-collection/plans/history/V3.9_Final_Document_Safety_Audit_2026-09-02.md"
  ]]);
  let okScience=0,okArt=0;
  for(const [origin,dest,,,,bucket] of rows){
   const index=origin.startsWith("SEPmd/")?"data-collection/ALL_SEPMD_FILES.md":"data-collection/evidence/artifact-index/"+bucket+".md";
   const effective=secondHops.get(dest)??dest;
   const expected="]("+posix.relative(posix.dirname(index),effective)+")";
   const content=origin.startsWith("SEPmd/")?science:groups[bucket as keyof typeof groups];
   expect(content,origin+" must be linked at "+expected).toContain(expected);
   if(origin.startsWith("SEPmd/"))okScience++;
   else okArt++;
  }
  expect(okScience).toBe(108);
  expect(okArt).toBe(352);
  console.log("REPO_WAVEB_ALL_ORIGINAL_NAV_LINKS="+JSON.stringify({science:okScience,artifacts:okArt,broken:0,paid_provider_calls:0}));
 });
});
