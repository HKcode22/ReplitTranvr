#!/usr/bin/env node
"use strict";

import {
  chmodSync, existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync,
  rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {join, resolve} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";

export const P6_HISTORICAL_STAGE_RECOVERY_V39 = Object.freeze({
  repo: "HKcode22/ReplitTranvr",
  currentMain: "0a7b1a28f243de76d4c83026d15f585265ef6f7b",
  historicalMain: "ae0915d1eb0c37651d280ff3f178efdb640ed509",
  historicalTree: "d08bd85c5c2ba9ca269ff5ffa34bb5fc0165af80",
  prepareHelperBlob: "d8c6983a8a69c14e11598c92035503bc079a121d",
  authorizationId: "AUTH-20261119-P5INERTFREEZE",
  stageInputSha256: "b833c9f52a24a6f953ebf5e2f3df481310b6bedd25a1d41c4f7a5d5833b2e745",
  manifestSha256: "bd14ff3e558b975a889741380da807644ca9d3573a23e2416986ee6f71e1e41f",
  configSha256: "9cb7f3dcb2ee0d857f585fe8433a8dc2b7ac7bb3e3ad384a469c13530856642c",
  calendarRowsSha256: "7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c",
  costEnvelopeSha256: "abc19fc266558940b43fc2bad580178174e7e5877feb6bfff599a49427f50e7a",
});

const NEEDLE = "need(remote===codeSha,'REMOTE_MAIN_CHANGED');";
const REPLACEMENT = "need(codeSha===EXPECTED_MAIN,'HISTORICAL_RECOVERY_PIN');";
const H40=/^[a-f0-9]{40}$/;
const H64=/^[a-f0-9]{64}$/;

function sha256(b){return createHash("sha256").update(b).digest("hex");}
function gitBlobSha(b){
  return createHash("sha1").update(Buffer.from(`blob ${b.length}\\0`)).update(b).digest("hex");
}
function hold(s){throw new Error("HOLD_P6_HISTORICAL_STAGE_RECOVERY_"+s);}
function need(ok,s){if(!ok)hold(s);}
function cmd(c,a,o={}){
  return execFileSync(c,a,{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:120000,maxBuffer:32*1024*1024,...o,
  }).trim();
}

export function patchHistoricalPrepareHelperV39(raw){
  need(Buffer.isBuffer(raw),"HELPER_NOT_BUFFER");
  need(gitBlobSha(raw)===P6_HISTORICAL_STAGE_RECOVERY_V39.prepareHelperBlob,"HELPER_BLOB_MISMATCH");
  const source=raw.toString("utf8");
  const count=source.split(NEEDLE).length-1;
  need(count===1,"REMOTE_MAIN_GUARD_SHAPE_CHANGED");
  const patched=source.replace(NEEDLE,REPLACEMENT);
  need(patched!==source,"PATCH_NOOP");
  need(patched.includes(REPLACEMENT)&&!patched.includes(NEEDLE),"PATCH_FAILED");
  need(!/AERODATABOX_API_KEY|RAPIDAPI_KEY|DATABASE_URL/.test(
    patched.slice(patched.indexOf(REPLACEMENT)-200,patched.indexOf(REPLACEMENT)+300)
  ),"PATCH_SCOPE_UNEXPECTED");
  return Buffer.from(patched,"utf8");
}

export function verifyRecoveredPackageV39(dir){
  const p=P6_HISTORICAL_STAGE_RECOVERY_V39;
  const summaryPath=join(dir,"phase5-closeout-package-summary.json");
  const stagePath=join(dir,"phase5-stage-input.json");
  const manifestPath=join(dir,"phase5-frozen-manifest.json");
  const configPath=join(dir,"phase5-reviewed-config.json");
  for(const f of [summaryPath,stagePath,manifestPath,configPath]){
    need(existsSync(f),"RECOVERED_FILE_MISSING");
    const st=lstatSync(f);
    need(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size>0&&st.size<2*1024*1024,
      "RECOVERED_FILE_SHAPE");
  }
  const summary=JSON.parse(readFileSync(summaryPath,"utf8"));
  const stageRaw=readFileSync(stagePath);
  const manifestRaw=readFileSync(manifestPath);
  const configRaw=readFileSync(configPath);
  need(sha256(stageRaw)===p.stageInputSha256,"STAGE_SHA");
  need(sha256(manifestRaw)===p.manifestSha256,"MANIFEST_SHA");
  need(sha256(configRaw)===p.configSha256,"CONFIG_SHA");
  const stage=JSON.parse(stageRaw.toString("utf8"));
  need(JSON.stringify(stage)===stageRaw.toString("utf8"),"STAGE_NOT_CANONICAL");
  need(stage.phase6AuthorizationId===p.authorizationId,"AUTH_ID");
  need(stage.calendarSha256===p.calendarRowsSha256,"CALENDAR_SHA");
  need(summary.stageInputSha256===p.stageInputSha256&&
       summary.manifestSha256===p.manifestSha256&&
       summary.configSha256===p.configSha256&&
       summary.calendarRowsSha256===p.calendarRowsSha256&&
       summary.costEnvelopeSha256===p.costEnvelopeSha256,"SUMMARY_BINDING");
  need(summary.scientificFreezeApproved===true&&
       summary.sourceRightsApproved===false&&
       summary.authorizationEnabled===false&&
       summary.phase6PaidGo===false,"BOUNDARY_FLAGS");
  return Object.freeze({
    status:"P6_HISTORICAL_PHASE5_STAGE_PACKET_RECOVERED_EXACT_NO_PROVIDER_NO_DB_NO_GO",
    stagePath,
    stageInputSha256:p.stageInputSha256,
    manifestSha256:p.manifestSha256,
    configSha256:p.configSha256,
    calendarRowsSha256:p.calendarRowsSha256,
    costEnvelopeSha256:p.costEnvelopeSha256,
    authorizationId:p.authorizationId,
    providerCalls:0,
    databaseWrites:0,
    phase6PaidGo:false,
  });
}

function fetchBlob(blob){
  need(H40.test(blob),"INVALID_BLOB");
  const raw=cmd("gh",["api",`repos/${P6_HISTORICAL_STAGE_RECOVERY_V39.repo}/git/blobs/${blob}`,"--jq",".content"]);
  const b=Buffer.from(raw.replace(/\s+/g,""),"base64");
  need(gitBlobSha(b)===blob,"FETCHED_BLOB_BYTES");
  return b;
}

function exactCurrentMain(root){
  const p=P6_HISTORICAL_STAGE_RECOVERY_V39;
  need(cmd("git",["-C",root,"rev-parse","HEAD"])===p.currentMain,"LOCAL_MAIN");
  need(cmd("git",["-C",root,"status","--porcelain","--untracked-files=no"])==="","TRACKED_WORKTREE");
  need(cmd("gh",["api",`repos/${p.repo}/git/ref/heads/main`,"--jq",".object.sha"])===p.currentMain,
    "REMOTE_MAIN");
}

function safePrivateOutput(raw){
  const out=resolve(raw);
  const root=realpathSync(cmd("git",["rev-parse","--show-toplevel"]));
  need(out!==root&&!out.startsWith(root+"/"),"OUTPUT_INSIDE_REPOSITORY");
  need(!existsSync(out),"OUTPUT_ALREADY_EXISTS");
  return out;
}

export function buildHistoricalRecoveryCommandReviewV39(){
  return Object.freeze({
    historicalCodeSha:P6_HISTORICAL_STAGE_RECOVERY_V39.historicalMain,
    historicalTreeSha:P6_HISTORICAL_STAGE_RECOVERY_V39.historicalTree,
    sourceHelperBlob:P6_HISTORICAL_STAGE_RECOVERY_V39.prepareHelperBlob,
    modifiedSemanticScope:"only replace historical helper remote-main equality guard; preserve exact old checkout guard",
    expectedRecoveredStageSha256:P6_HISTORICAL_STAGE_RECOVERY_V39.stageInputSha256,
    providerCalls:0,
    databaseWrites:0,
    githubMutations:0,
    phase6PaidGo:false,
  });
}

async function main(){
  const [mode,outArg]=process.argv.slice(2);
  need(mode==="--recover-private"&&outArg,"ARGS");
  need(process.env.GITHUB_ACTIONS!=="true","OWNER_ONLY");
  const root=realpathSync(cmd("git",["rev-parse","--show-toplevel"]));
  need(root===realpathSync(process.cwd()),"NOT_REPO_ROOT");
  exactCurrentMain(root);
  const tsx=join(root,"node_modules",".bin","tsx");
  need(existsSync(tsx),"TSX_MISSING");
  const out=safePrivateOutput(outArg);

  const p=P6_HISTORICAL_STAGE_RECOVERY_V39;
  const temp=mkdtempSync(join(tmpdir(),"p6-historical-stage-recovery-"));
  const checkout=join(temp,"historical");
  const patched=join(temp,"prepare-patched.mjs");
  let worktree=false;
  try{
    const helper=fetchBlob(p.prepareHelperBlob);
    const patchedRaw=patchHistoricalPrepareHelperV39(helper);
    writeFileSync(patched,patchedRaw,{flag:"wx",mode:0o600});

    cmd("git",["-C",root,"fetch","--no-tags","origin",p.historicalMain],{
      env:{...process.env,GIT_TERMINAL_PROMPT:"0",GH_PROMPT_DISABLED:"1"},
    });
    need(cmd("git",["-C",root,"rev-parse","FETCH_HEAD"])===p.historicalMain,"FETCH_PIN");
    cmd("git",["-C",root,"worktree","add","--detach",checkout,p.historicalMain]);
    worktree=true;
    need(cmd("git",["-C",checkout,"rev-parse","HEAD"])===p.historicalMain,"HISTORICAL_HEAD");
    need(cmd("git",["-C",checkout,"rev-parse","HEAD^{tree}"])===p.historicalTree,"HISTORICAL_TREE");
    need(cmd("git",["-C",checkout,"status","--porcelain","--untracked-files=no"])==="","HISTORICAL_DIRTY");
    symlinkSync(join(root,"node_modules"),join(checkout,"node_modules"),"dir");

    const env={
      PATH:process.env.PATH,
      HOME:process.env.HOME,
      TMPDIR:process.env.TMPDIR||tmpdir(),
      GH_TOKEN:process.env.GH_TOKEN,
      GITHUB_TOKEN:process.env.GITHUB_TOKEN,
      ADB_AUTO_COLLECT:"0",
      V39_PHASE6_PROCESS_ARMED:"0",
      V39_PHASE6_OWNER_APPROVED:"0",
    };
    for(const k of ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","DATABASE_URL",
      "V39_DATABASE_RUNTIME_URL","NODE_OPTIONS"]) delete env[k];

    cmd(tsx,[patched,"--write-private",p.historicalMain,out],{
      cwd:checkout,env,timeout:240000,maxBuffer:32*1024*1024,
    });
    need(cmd("git",["-C",checkout,"status","--porcelain","--untracked-files=no"])==="",
      "HISTORICAL_CHANGED");
    exactCurrentMain(root);
    chmodSync(out,0o700);
    const receipt=verifyRecoveredPackageV39(out);
    console.log(JSON.stringify({...receipt,recoveryDirectory:out}));
  }finally{
    if(worktree){
      try{cmd("git",["-C",root,"worktree","remove","--force",checkout]);}catch{}
    }
    rmSync(temp,{recursive:true,force:true});
  }
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(e=>{
    const m=String(e?.message??"");
    console.error(/^HOLD_P6_HISTORICAL_STAGE_RECOVERY_[A-Z0-9_]+$/.test(m)
      ?m:"HOLD_P6_HISTORICAL_STAGE_RECOVERY_REDACTED");
    process.exitCode=2;
  });
}
