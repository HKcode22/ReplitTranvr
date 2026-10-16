import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const before="data-collection/history/zero-byte-audit-stubs/V3.9_Final_Document_Safety_Audit_2026-09-02.md";
const after="data-collection/plans/history/V3.9_Final_Document_Safety_Audit_2026-09-02.md";
const sha="e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
describe("Wave D original zero-byte historical placeholder custody",()=>{
 it("eliminates standalone history folder without deleting one of 108 original science blobs",()=>{
   expect(existsSync(before)).toBe(false);
   expect(existsSync("data-collection/history/zero-byte-audit-stubs")).toBe(false);
   expect(existsSync(after)).toBe(true);
   const id=execFileSync("git",["hash-object","--",after],{encoding:"utf8"}).trim();
   expect(id).toBe(sha);
   expect(readFileSync(after).byteLength).toBe(0);
 });
 it("retains Wave B first-hop evidence and validates Wave D one-row addendum",()=>{
   const oldManifest=readFileSync("docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv","utf8");
   expect(oldManifest).toContain('"SEPmd/V3.9_Final_Document_Safety_Audit_2026-09-02.md","'+before+'","'+sha+'","0","100644","science"');
   const supplement=readFileSync("docs/repository-maintenance/manifests/2026-10-16_WAVED_EMPTY_PLACEHOLDER_SECOND_HOP.csv","utf8");
   expect(supplement.trim().split(/\r?\n/)).toHaveLength(2);
   expect(supplement).toContain('"'+before+'","'+after+'","'+sha+'","0","100644"');
   const catalog=readFileSync("data-collection/sepmd-source-catalog.csv","utf8");
   expect(catalog).toContain('"SEPmd/V3.9_Final_Document_Safety_Audit_2026-09-02.md","'+sha+'","0","root","'+after+'"');
   const directory=readFileSync("data-collection/ALL_SEPMD_FILES.md","utf8");
   expect(directory).toContain("plans/history/V3.9_Final_Document_Safety_Audit_2026-09-02.md");
   const guide=readFileSync("data-collection/FOLDER_GUIDE.md","utf8");
   expect(guide).toContain("not a completed audit");
 });
});
