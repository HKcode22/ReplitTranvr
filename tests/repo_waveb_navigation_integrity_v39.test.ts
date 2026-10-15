import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";

const raw=readFileSync("docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv","utf8");
const rows=raw.trimEnd().split(/\r?\n/).slice(1).map(line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(x=>x[1].replace(/""/g,'"')));
describe("Wave B migrated navigation links (no provider)",()=>{
 it("links all 108 historical science blobs and 352 artifact blobs via their new positions",()=>{
  const science=readFileSync("data-collection/ALL_SEPMD_FILES.md","utf8");
  const groups={
   phase2f:readFileSync("data-collection/evidence/artifact-index/phase2f.md","utf8"),
   phase2g:readFileSync("data-collection/evidence/artifact-index/phase2g.md","utf8"),
   other:readFileSync("data-collection/evidence/artifact-index/other.md","utf8")
  };
  let okScience=0,okArt=0;
  for(const [origin,dest,,,,bucket] of rows){
   const index=origin.startsWith("SEPmd/")?"data-collection/ALL_SEPMD_FILES.md":"data-collection/evidence/artifact-index/"+bucket+".md";
   const expected="]("+posix.relative(posix.dirname(index),dest)+")";
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
