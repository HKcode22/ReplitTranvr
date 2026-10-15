import { execFileSync } from "node:child_process";
import { describe, it } from "vitest";
describe("Wave B original-path consumer inventory (offline)",()=>{
 it("prints literal legacy operational references still requiring manual live-reader review",()=>{
  let output="";
  try{output=execFileSync("git",["grep","-I","-n","-F","-e","SEPmd/","-e","artifacts/","--","scripts","server",".github/workflows"],{encoding:"utf8",timeout:30000,maxBuffer:3*1024*1024})}catch(e:any){if(e.status!==1)throw e}
  const lines=output.trim().split(/\r?\n/).filter(Boolean);
  const byFile=Object.fromEntries([...new Set(lines.map(x=>x.split(":")[0]))].map(f=>[f,lines.filter(y=>y.startsWith(f+":")).length]));
  console.log("REPO_WAVEB_UNRECONCILED_OPERATIONAL_REFERENCES="+JSON.stringify({line_count:lines.length,files:byFile,examples:lines.slice(0,90).map(x=>x.slice(0,245)),review_required:true,paid_provider_calls:0}));
 },45000);
});
