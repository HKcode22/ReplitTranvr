#!/usr/bin/env node
/**
 * READ-ONLY science-folder rename simulation.
 * Examines current Git tree + Oct 15 main/PR36 migration CSV.
 * Never renames, deletes, writes Git refs or calls paid/external services.
 * node scripts/repo_waveb_migration_dryrun.mjs [--json] [--strict]
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const allowed = new Set(["--json", "--strict"]);
if (process.argv.slice(2).some(arg => !allowed.has(arg))) {
  console.error("Allowed options: --json --strict");
  process.exit(2);
}
const exec = (args, maxBuffer=24*1024*1024) => execFileSync("git", args, {
  encoding: "utf8", timeout: 20000, maxBuffer,
});
const head = exec(["rev-parse", "HEAD"]).trim();
const tracked = exec(["ls-files", "--cached", "-z"]).split("\0").filter(Boolean);
const original = new Map();
for (const line of exec(["ls-tree", "-r", "-l", "-z", "HEAD"]).split("\0").filter(Boolean)) {
  const hit = line.match(/^[0-7]{6} blob ([a-f0-9]{40})\s+(\d+)\t(.*)$/s);
  if (hit) original.set(hit[3], {sha:hit[1], size:Number(hit[2])});
}
const readCsv = input => {
  const rows=[], result=[];
  let cell="", current=[], quoted=false;
  for (let i=0;i<input.length;i++) {
    const ch=input[i];
    if (ch==='"') {
      if (quoted && input[i+1]==='"') {cell+='"';i++;}
      else quoted=!quoted;
    } else if (ch===','&&!quoted) {current.push(cell);cell="";}
    else if ((ch==='\n'||ch==='\r')&&!quoted) {
      if(ch==='\r'&&input[i+1]==='\n')i++;
      current.push(cell);if(current.some(Boolean))rows.push(current);
      current=[];cell="";
    } else cell+=ch;
  }
  if(quoted)throw new Error("Unterminated CSV quoted value");
  current.push(cell);if(current.some(Boolean))rows.push(current);
  const header=rows.shift();
  if (!header || header[0]!=="source_path")throw new Error("Unexpected plan manifest header");
  for(const row of rows){
    if(row.length!==header.length)throw new Error("Malformed CSV row "+JSON.stringify(row));
    result.push(Object.fromEntries(row.map((c,i)=>[header[i],c])));
  }
  return result;
};
const manifestPath="docs/repository-maintenance/manifests/2026-10-15_SEPMD_MAIN_AND_PR36_PATH_MAPPING.csv";
const entries=readCsv(readFileSync(manifestPath,"utf8"));
const errors=[];
if(entries.length!==155)errors.push("Expected 155 legacy/main+PR36 original source paths");
const main = entries.filter(x=>x.main_blob_sha);
const future = entries.filter(x=>!x.main_blob_sha&&x.pr36_blob_sha);
const missing = entries.filter(x=>!x.proposed_path);
if(main.length!==108||future.length!==47)errors.push("Main vs future source counts have changed");
const originalDrift=[];
for (const item of main) {
  const expected={sha:item.main_blob_sha,size:Number(item.main_bytes)};
  const real=original.get(item.source_path);
  if(!real||real.sha!==expected.sha||real.size!==expected.size){
    originalDrift.push({path:item.source_path,expected,found:real??null});
  }
}
const folds=x=>x.normalize("NFC").toLocaleLowerCase("en");
const duplicate = [];
const newTargets = entries.filter(x=>x.proposed_path);
const targetOwners = new Map();
for (const item of newTargets) {
  const fold=folds(item.proposed_path), old=targetOwners.get(fold);
  if(old)duplicate.push({path:item.proposed_path,sources:[old,item.source_path]});
  else targetOwners.set(fold,item.source_path);
}
// Strictly plan against ALL existing non-moved Git files. Never overwrite index pages.
const movedSourcePaths=new Set(main.filter(x=>x.proposed_path).map(x=>x.source_path));
const occupied = new Map();
for(const path of tracked) {
  if(movedSourcePaths.has(path))continue;
  const key=folds(path), sources=occupied.get(key)||[];
  sources.push(path);occupied.set(key,sources);
}
const destinationConflicts=[];
for(const item of newTargets) {
  const occupying=occupied.get(folds(item.proposed_path))||[];
  if(occupying.length)destinationConflicts.push({
    old:item.source_path,dest:item.proposed_path,existing:occupying
  });
}
const casefoldExisting=[...new Map(tracked.map(x=>[folds(x),true])).keys()].length;
const sourceCasefoldCollisions=tracked.length-casefoldExisting;
const requiredZeroStub=missing.map(x=>({
  path:x.source_path,bytes:original.get(x.source_path)?.size??null,
  action:"MANUAL_REVIEW_NO_AUTOMATIC_DELETE"
}));
// Conservative executable-line inventory; NOT proof against constructed/dynamic paths.
// Counts exact-root markers in tracked operational files, including tests and CI.
let grepOutput="";
try {
  grepOutput=exec(["grep","-I","-n","-F","-e","SEPmd/","-e","artifacts/","--",
    "scripts","server","tests","client","shared","migrations",".github"]);
} catch(e) {
  if(e.status!==1)throw e;
}
const consumers=[];
for(const line of grepOutput.split(/\r?\n/).filter(Boolean)) {
  const m=line.match(/^(.+?):(\d+):(.*)$/);
  if(!m)continue;
  const parts=m[3].match(/(?:SEPmd|artifacts)\/[A-Za-z0-9_.\/-]+/g)||[];
  const literals=[...new Set(parts.map(x=>x.replace(/[.\/]+$/,"")))];
  consumers.push({file:m[1],line:Number(m[2]),literals,excerpt:m[3].trim().slice(0,160)});
}
const foundByFile=new Map();
for(const line of consumers)for(const literal of line.literals){
 const n=foundByFile.get(literal)||new Set();
 n.add(line.file);foundByFile.set(literal,n);
}
const bindingExamples=[
  "SEPmd/V3.9_DataCollectPlan_f.8.md",
  "SEPmd/V3.9_IMPLEMENTATION_LOG.md",
  "SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md",
  "artifacts/preprobe-reference-freeze-record.json",
];
const report={
  status:"PLANNING_ONLY_NO_MOVES_OR_PAID_CALLS",
  exact_checkout_sha:head,
  manifest_entries:entries.length,
  main_source_files:main.length,
  pr36_only_future_source_files:future.length,
  original_sha_and_size_matches:main.length-originalDrift.length,
  original_drift_count:originalDrift.length,
  original_drift_examples:originalDrift.slice(0,10),
  destination_conflict_count:destinationConflicts.length,
  destination_conflicts:destinationConflicts.slice(0,30),
  casefold_duplicate_destination_count:duplicate.length,
  casefold_duplicate_destinations:duplicate.slice(0,30),
  present_casefold_collision_count:sourceCasefoldCollisions,
  no_destination_for_original_source:requiredZeroStub,
  operative_literal_line_hits:consumers.length,
  operative_files_with_path_literals:new Set(consumers.map(x=>x.file)).size,
  binding_path_references:bindingExamples.map(p=>({
    path:p,operational_files:[...(foundByFile.get(p)||[])].sort()
  })),
  example_operational_lines:consumers.filter(x=>
    x.literals.some(y=>bindingExamples.includes(y))
  ).slice(0,15),
  needs_signed_path_and_dynamic_dependency_review:true,
  branch_reconciliation_pr36_required:true,
  safe_to_bulk_move_now:false,
  network_or_paid_provider_calls:0,
};
if(originalDrift.length||destinationConflicts.length||duplicate.length)errors.push("Exact SHA/path safety collision found");
if(requiredZeroStub.some(x=>x.bytes!==0))errors.push("Missing destination for nonempty original file");
if(process.argv.includes("--json"))console.log(JSON.stringify(report,null,2));
else console.log("REPO_WAVEB_MIGRATION_SIMULATION="+JSON.stringify(report));
if(process.argv.includes("--strict")&&errors.length)process.exitCode=2;
