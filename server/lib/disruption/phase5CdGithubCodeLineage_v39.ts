/**
 * Resolve frozen signed packet self-reference correctly.
 *
 * The reviewed executable code commit must exist BEFORE committing new
 * frozen roster/packet data. GitHub HEAD may advance by DATA/DOC-only
 * commits, never executable code drift. This performs actual git checks
 * BEFORE allowing any Stage28 DB connection or V0087 claim.
 *
 * This is NOT a legal/ML Contents license, not a paid API approval, and
 * does not grant independent Phase5 freeze/Phase6 GO.
 */
import {execFileSync} from "node:child_process";
const SHA=/^[0-9a-f]{40}$/;
const CODE_PATHS=[
 ".github/workflows","server","scripts","migrations",
 "package.json","package-lock.json","tsconfig.json"
];
function hold(reason:string):never{
 throw Error("REFUSED_P5_CD_GH_CODE_LINEAGE_"+reason);
}
function git(args:string[],max=100):string{
 try{
  return execFileSync("git",args,{
   encoding:"utf8",stdio:["ignore","pipe","ignore"],
   timeout:4000,maxBuffer:Math.max(max,256)
  }).trim();
 }catch{return hold("BASELINE_NOT_ANCESTOR_OR_EXECUTABLE_DRIFT");}
}
/** Set the verified pair only after inspecting the REAL Git checkout.
 * The pair is an internal continuity marker, NOT a signature or a
 * caller-controlled authorization. The source-control hash is checked
 * against every executable path, not against mutable frozen packet files.
 */
export function verifyP5CdGithubFrozenCodeLineage(
 env:NodeJS.ProcessEnv
):{head:string;reviewedCodeCommit:string;frozenDataMayChange:true}{
 const head=env.GITHUB_SHA??"",pin=env.P5_CD_GH_PRE_APPROVED_CODE_SHA??"";
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    !SHA.test(head)||!SHA.test(pin))
  hold("REVIEWED_MAIN_CODE_PIN_MISSING");
 if(git(["rev-parse","HEAD"])!==head||
    git(["rev-parse",pin+"^{commit}"])!==pin)
  hold("GITHUB_HEAD_OR_REVIEWED_CODE_OBJECT_CHANGED");
 git(["merge-base","--is-ancestor",pin,head]);
 git(["diff","--quiet",pin,head,"--",...CODE_PATHS]);
 git(["diff","--quiet","--",...CODE_PATHS]);
 git(["diff","--cached","--quiet","--",...CODE_PATHS]);
 // Process.env is mutable only in the already reviewed GitHub runtime.
 // This signal is used for *subsequent* fail-closed Stage14 checks inside
 // this same process; no independently validated git proof can be inferred
 // from a caller-supplied marker alone.
 env.P5_CD_GH_CODE_LINEAGE_VERIFIED=head+":"+pin;
 return{head,reviewedCodeCommit:pin,frozenDataMayChange:true};
}
