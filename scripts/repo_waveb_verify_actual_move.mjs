#!/usr/bin/env node
/**
 * Offline Wave B physical relocation identity checker.
 * No provider calls, no database, no writes, no Replit network calls.
 * Verifies all original 108 SEPmd and 352 artifacts have *identical* Git blobs
 * at distinct destinations while preserving old paths in provenance manifest.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const run=(args)=>execFileSync("git",args,{encoding:"utf8",maxBuffer:32*1024*1024,timeout:30000});
const tracked=new Map();
for(const line of run(["ls-tree","-r","-l","HEAD"]).split("\n")){
 const m=line.match(/^(\d{6}) blob ([0-9a-f]{40})\s+(\d+)\t(.*)$/);
 if(m)tracked.set(m[4],{mode:m[1],sha:m[2],bytes:Number(m[3])});
}
const csv=readFileSync("docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv","utf8");
const rows=csv.trimEnd().split(/\r?\n/);
const header=rows.shift();
const parse=line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"'));
const errors=[],destinations=new Set();
if(header!=="original_path,candidate_path,original_git_blob,bytes,mode,bucket")errors.push("wrong manifest schema");
let countScience=0,countArtifacts=0,unchanged=0;
for(const line of rows){
 const [from,to,sha,rawBytes,mode]=parse(line);
 if(!from||!to||!sha||!mode){errors.push("incomplete row "+line.slice(0,90));continue}
 if(from.startsWith("SEPmd/"))countScience++;
 else if(from.startsWith("artifacts/"))countArtifacts++;
 else errors.push("unexpected origin "+from);
 if(tracked.has(from))errors.push("original root still tracked "+from);
 const real=tracked.get(to);
 if(!real)errors.push("missing destination "+to);
 else if(real.sha!==sha||real.bytes!==Number(rawBytes)||real.mode!==mode)errors.push("blob/mode/size changed "+to);
 else unchanged++;
 const key=to.normalize("NFC").toLowerCase();
 if(destinations.has(key))errors.push("duplicate casefold target "+to);
 destinations.add(key);
}
if(rows.length!==460||countScience!==108||countArtifacts!==352)errors.push("unexpected original source counts");
if([...tracked.keys()].some(p=>p.startsWith("SEPmd/")||p.startsWith("artifacts/")))errors.push("original root dirs still contain tracked blobs");
const report={status:errors.length?"BLOCKED":"SOURCE_IDENTITY_VERIFIED_RUNTIME_COMPATIBILITY_NOT_YET_VERIFIED",head:run(["rev-parse","HEAD"]).trim(),expected_files:460,science:countScience,artifacts:countArtifacts,exact_git_blob_mode_size_matches:unchanged,casefold_targets_unique:destinations.size===rows.length,old_roots_empty:true,signed_runtime_paths_not_certified:true,merge_authorized:false,provider_calls:0,errors:errors.slice(0,25)};
console.log("REPO_WAVEB_460_RELOCATION="+JSON.stringify(report));
if(errors.length)process.exitCode=2;
