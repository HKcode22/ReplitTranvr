import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const receiptPath="docs/repository-maintenance/manifests/2026-10-15_WAVEC3_ASSET_42_BLOB_RELOCATION.csv";
const rows=readFileSync(receiptPath,"utf8").trim().split(/\r?\n/).slice(1).map(line=>{
 const [oldPath,newPath,sha,bytes,classification]=line.split(",");
 return {oldPath,newPath,sha,bytes:Number(bytes),classification};
});
describe("Wave C3 original attachment custody, no provider",()=>{
 it("preserves all 42 exact Git blobs across typed relocation destinations",()=>{
  expect(rows).toHaveLength(42);
  expect(rows.filter(r=>r.classification==="image")).toHaveLength(18);
  expect(rows.filter(r=>r.classification==="historical-pasted-text")).toHaveLength(23);
  expect(rows.filter(r=>r.classification==="unreviewed-archive")).toHaveLength(1);
  for(const row of rows){
   expect(existsSync(row.oldPath),row.oldPath).toBe(false);
   expect(existsSync(row.newPath),row.newPath).toBe(true);
   expect(execFileSync("git",["hash-object","--",row.newPath],{encoding:"utf8",timeout:6000}).trim()).toBe(row.sha);
   expect(Number.isInteger(row.bytes)&&row.bytes>0).toBe(true);
   if(row.classification==="image")expect(row.newPath).toMatch(/^client\/src\/assets\/images\/[^/]+\.png$/);
   if(row.classification==="historical-pasted-text")expect(row.newPath).toMatch(/^docs\/history\/travnr-pasted-prompts\/[^/]+\.txt$/);
   if(row.classification==="unreviewed-archive")expect(row.newPath).toMatch(/^docs\/history\/unreviewed-archives\/[^/]+\.zip$/);
  }
  expect(execFileSync("git",["ls-files","--cached","--","attached_assets"],{encoding:"utf8"}).trim()).toBe("");
 });
 it("Vite alias points at current frontend images and historical attachments stay outside the client",()=>{
  const vite=readFileSync("vite.config.ts","utf8");
  expect(vite).toContain('"@assets": path.resolve(import.meta.dirname, "client", "src", "assets", "images")');
  expect(vite).not.toContain('path.resolve(import.meta.dirname, "attached_assets")');
  expect(existsSync("docs/history/travnr-pasted-prompts/README.md")).toBe(true);
 });
});
