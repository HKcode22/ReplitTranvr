/**
 * Proves a signed frozen packet can be committed AFTER reviewed executable
 * code without requiring an impossible self-referential HEAD SHA.
 * Entirely local throwaway git repo; no GitHub API, DB or provider.
 */
import {describe,it,expect} from "vitest";
import {execFileSync} from "node:child_process";
import {
 mkdtempSync,mkdirSync,writeFileSync,rmSync
} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {
 verifyP5CdGithubFrozenCodeLineage
} from "../server/lib/disruption/phase5CdGithubCodeLineage_v39";
const git=(dir:string,args:string[])=>execFileSync("git",args,{
 cwd:dir,encoding:"utf8",stdio:["ignore","pipe","ignore"],
 timeout:5000
}).trim();
describe("Phase5 GH reviewed code pin versus later frozen data HEAD",()=>{
 it("accepts independently pinned code ancestor with later frozen packet; rejects drift and untracked code",()=>{
  const dir=mkdtempSync(join(tmpdir(),"phase5-code-lineage-"));
  try{
   git(dir,["init","-q","-b","main"]);
   git(dir,["config","user.email","p5-offline-ci@example.invalid"]);
   git(dir,["config","user.name","Phase5 Offline Test"]);
   mkdirSync(join(dir,"scripts"),{recursive:true});
   writeFileSync(join(dir,"scripts","reviewed_worker.ts"),
    "export const reviewed = true;\n");
   git(dir,["add","scripts/reviewed_worker.ts"]);
   git(dir,["commit","-q","-m","reviewed-code"]);
   const pin=git(dir,["rev-parse","HEAD"]);
   mkdirSync(join(dir,"data-collection","phase5","frozen"),
    {recursive:true});
   writeFileSync(join(dir,"data-collection","phase5","frozen","reviewed_roster.json"),
    JSON.stringify({reviewedCodeSha:pin,
      packetSha256:"a".repeat(64)})+"\n");
   git(dir,["add","data-collection/phase5/frozen/reviewed_roster.json"]);
   git(dir,["commit","-q","-m","frozen-source-packet-after-reviewed-code"]);
   const head=git(dir,["rev-parse","HEAD"]);
   expect(head).not.toBe(pin);
   const env:NodeJS.ProcessEnv={
    GITHUB_ACTIONS:"true",
    GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
    GITHUB_REF:"refs/heads/main",
    GITHUB_SHA:head,
    P5_CD_GH_PRE_APPROVED_CODE_SHA:pin
   };
   const r=verifyP5CdGithubFrozenCodeLineage(env,dir);
   expect(r).toEqual({
    head,reviewedCodeCommit:pin,frozenDataMayChange:true
   });
   expect(env.P5_CD_GH_CODE_LINEAGE_VERIFIED).toBe(head+":"+pin);
   // A new untracked executable file is NOT another frozen packet.
   writeFileSync(join(dir,"scripts","unreviewed_worker.ts"),
    "export const unreviewed = true;\n");
   expect(()=>verifyP5CdGithubFrozenCodeLineage({...env},dir))
    .toThrow("UNTRACKED_EXECUTABLE_FILE_AFTER_REVIEW");
   rmSync(join(dir,"scripts","unreviewed_worker.ts"));
   // A committed modification of reviewed runnable code is NOT data.
   writeFileSync(join(dir,"scripts","reviewed_worker.ts"),
    "export const reviewed = false;\n");
   git(dir,["add","scripts/reviewed_worker.ts"]);
   git(dir,["commit","-q","-m","unapproved-code-drift"]);
   const altered=git(dir,["rev-parse","HEAD"]);
   expect(()=>verifyP5CdGithubFrozenCodeLineage({
    ...env,GITHUB_SHA:altered
   },dir)).toThrow("BASELINE_NOT_ANCESTOR_OR_EXECUTABLE_DRIFT");
   // A stale/wrong expected HEAD never lets a packet through.
   expect(()=>verifyP5CdGithubFrozenCodeLineage({...env},dir))
    .toThrow("GITHUB_HEAD_OR_REVIEWED_CODE_OBJECT_CHANGED");
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
});
