import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

function tracked(prefix:string){
  return execFileSync("git",["ls-files","--cached","-z","--",prefix],{encoding:"utf8",timeout:15000,maxBuffer:8*1024*1024})
    .split("\0").filter(Boolean).sort();
}
function catalog(path:string){
  return readFileSync(path,"utf8").trimEnd().split("\n").slice(1).map(line=>{
    const cells=[...line.matchAll(/"([^"]*)"/g)].map(m=>m[1]);
    expect(cells.length).toBeGreaterThanOrEqual(4);
    return {path:cells[0],sha:cells[1],size:Number(cells[2]),group:cells[3]};
  });
}
function blobIdentities(){
  const rows=execFileSync("git",["ls-tree","-r","-l","HEAD"],{encoding:"utf8",timeout:20000,maxBuffer:8*1024*1024});
  const m=new Map<string,{sha:string,size:number}>();
  for(const line of rows.split("\n")){
    const s=line.match(/^\d+ blob ([0-9a-f]{40})\s+(\d+)\t(.*)$/);
    if(s)m.set(s[3],{sha:s[1],size:Number(s[2])});
  }
  return m;
}
describe("full original evidence and scientific source navigation",()=>{
  it("covers all 108 SEPmd and 352 artifacts with original hash/size identities",()=>{
    const a=catalog("data-collection/sepmd-source-catalog.csv");
    const b=catalog("data-collection/evidence/artifacts-catalog.csv");
    expect(a.length).toBe(108);
    expect(b.length).toBe(352);
    expect(a.map(x=>x.path).sort()).toEqual(tracked("SEPmd"));
    expect(b.map(x=>x.path).sort()).toEqual(tracked("artifacts"));
    const ids=blobIdentities();
    for(const item of [...a,...b]){
      expect(existsSync(item.path),"Missing original: "+item.path).toBe(true);
      expect(ids.get(item.path),"Incorrect original SHA/size: "+item.path).toEqual({sha:item.sha,size:item.size});
    }
    const groups=b.reduce((acc,x)=>(acc[x.group]=(acc[x.group]??0)+1,acc),{} as Record<string,number>);
    expect(groups).toEqual({phase2f:180,phase2g:150,other:22});
    console.log("REPO_CLEANUP_SOURCE_DIRECTORY="+JSON.stringify({
      original_SEPmd:108,original_artifacts:352,checked_original_git_blobs:460,
      artifact_counts:groups,provider_calls:0
    }));
  });
  it("lists every one of the 58 original lower-case Phase2G source documents",()=>{
    const files=tracked("SEPmd/phase2g");
    expect(files.length).toBe(58);
    const page=readFileSync("data-collection/phase2g/ALL_REPORTS.md","utf8");
    for(const path of files){
      expect(page.includes(path),"Missing from original Phase2G source index: "+path).toBe(true);
    }
    for(const page of [
      "data-collection/START_HERE.md","data-collection/ALL_SEPMD_FILES.md",
      "data-collection/evidence/ARTIFACTS_START_HERE.md",
      "data-collection/evidence/artifact-index/phase2f.md",
      "data-collection/evidence/artifact-index/phase2g.md",
      "data-collection/evidence/artifact-index/other.md"
    ])expect(existsSync(page)).toBe(true);
  });
});