import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { describe, expect, it } from "vitest";

const shaTree=()=>{
 const content=execFileSync("git",["ls-tree","-r","-l","HEAD"],{encoding:"utf8",maxBuffer:16*1024*1024});
 const m=new Map<string,{sha:string,size:number}>();
 for(const line of content.split("\n")){
  const hit=line.match(/^\d+ blob ([a-f0-9]{40})\s+(\d+)\t(.*)$/);
  if(hit)m.set(hit[3],{sha:hit[1],size:Number(hit[2])});
 }
 return m;
};
const catalog=(path:string)=>{
 return readFileSync(path,"utf8").trimEnd().split("\n").slice(1).map(line=>{
  const cells=[...line.matchAll(/"((?:[^"]|"")*)"/g)].map(x=>x[1].replace(/""/g,'"'));
  expect(cells.length).toBeGreaterThanOrEqual(5);
  return {historic:cells[0],sha:cells[1],size:Number(cells[2]),group:cells[3],relocated:cells.at(-1)!};
 });
};
describe("Wave B complete original source identity and index navigation",()=>{
 it("verifies all 108 original science records and 352 evidence files after physical relocation",()=>{
  const science=catalog("data-collection/sepmd-source-catalog.csv");
  const evidence=catalog("data-collection/evidence/artifacts-catalog.csv");
  expect(science).toHaveLength(108);
  expect(evidence).toHaveLength(352);
  const tracked=shaTree();
  expect([...tracked.keys()].filter(x=>x.startsWith("SEPmd/")||x.startsWith("artifacts/"))).toEqual([]);
  expect(new Set([...science,...evidence].map(x=>x.relocated.toLowerCase())).size).toBe(460);
  for(const record of [...science,...evidence]){
   expect(record.historic.startsWith("SEPmd/")||record.historic.startsWith("artifacts/")).toBe(true);
   expect(existsSync(record.relocated),"missing relocated original: "+record.historic).toBe(true);
   expect(tracked.get(record.relocated),"blob identity drift: "+record.historic).toEqual({sha:record.sha,size:record.size});
  }
  const group=evidence.reduce((a,x)=>(a[x.group]=(a[x.group]??0)+1,a),{} as Record<string,number>);
  expect(group).toEqual({phase2f:180,phase2g:150,other:22});
  console.log("REPO_CLEANUP_SOURCE_DIRECTORY="+JSON.stringify({source_science:science.length,artifacts:evidence.length,blob_sha_size_pass:460,groups:group,provider_calls:0}));
 });
 it("links all 58 historical lowercase Phase2G originals without overlapping the new homepage",()=>{
  const science=catalog("data-collection/sepmd-source-catalog.csv");
  const subset=science.filter(x=>x.historic.startsWith("SEPmd/phase2g/"));
  expect(subset).toHaveLength(58);
  const page="data-collection/phase2g/ALL_REPORTS.md";
  const md=readFileSync(page,"utf8");
  for(const s of subset){
   const href=relative(dirname(page),s.relocated).split("\\").join("/");
   expect(md,"missing link to "+s.historic).toContain("]("+href+")");
  }
  expect(existsSync("data-collection/phase2g/README.md")).toBe(true);
  expect(existsSync("data-collection/phase2g/legacy-uppercase/README.md")).toBe(true);
  expect(existsSync("data-collection/phase2g/legacy-lowercase/README.md")).toBe(true);
 });
 it("resolves scientific and evidence Markdown navigation links without touching external services",()=>{
  const pages=["data-collection/START_HERE.md","data-collection/ALL_SEPMD_FILES.md","data-collection/phase2g/ALL_REPORTS.md","data-collection/evidence/ARTIFACTS_START_HERE.md",
   "data-collection/evidence/artifact-index/phase2f.md","data-collection/evidence/artifact-index/phase2g.md","data-collection/evidence/artifact-index/other.md"];
  let checked=0;
  for(const page of pages)for(const m of readFileSync(page,"utf8").matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){
   const href=m[1];
   if(/^(https?:|mailto:|#)/.test(href))continue;
   const target=resolve(dirname(page),decodeURIComponent(href.split("#")[0]));
   expect(target.startsWith(process.cwd()+"/")).toBe(true);
   expect(existsSync(target),"broken "+page+" -> "+href).toBe(true);
   checked++;
  }
  expect(checked).toBeGreaterThan(500);
  console.log("REPO_CLEANUP_SOURCE_LINKS="+JSON.stringify({checked,broken:0,provider_calls:0}));
 });
});
