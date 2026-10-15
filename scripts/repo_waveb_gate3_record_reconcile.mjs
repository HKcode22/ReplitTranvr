#!/usr/bin/env node
/**
 * Offline source-record integration check. No provider, SQL, network or mutation.
 * Usage: node scripts/repo_waveb_gate3_record_reconcile.mjs [draft-ref]
 * Exit 2 on lost main P25 append, unexpected branch history, or missing sources.
 * This is a comparison gate, not approval to merge PR36 or relocate files.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const mainRef = process.env.WAVEB_BASE_REF || "HEAD";
const draftRef = process.argv[2] || "phase2g-pragmatic-science-and-checkpoints-20261012";
const run=(args)=>execFileSync("git",args,{encoding:"utf8",maxBuffer:16*1024*1024,timeout:30000});
const source=(ref,path)=>run(["show",ref+":"+path]);
const hash=s=>createHash("sha256").update(s).digest("hex");
const files=[
"SEPmd/V3.9_DataCollectPlan_f.8.md",
"SEPmd/V3.9_IMPLEMENTATION_LOG.md",
"SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md"
];
const findings=[],errors=[];
for(const path of files){
  let main,draft;
  try{main=source(mainRef,path);draft=source(draftRef,path)}
  catch(e){errors.push("missing scientific record "+path+" ("+e.message+")");continue}
  const ma=main.split("\n"),da=draft.split("\n");
  let prefix=0;while(prefix<Math.min(ma.length,da.length)&&ma[prefix]===da[prefix])prefix++;
  let suffix=0;while(suffix<Math.min(ma.length,da.length)-prefix&&ma[ma.length-1-suffix]===da[da.length-1-suffix])suffix++;
  const item={path,main_sha256:hash(main),draft_sha256:hash(draft),
    main_lines:ma.length,draft_lines:da.length,common_prefix_lines:prefix,common_suffix_lines:suffix,
    main_unique_span_lines:ma.length-prefix-suffix,draft_unique_span_lines:da.length-prefix-suffix};
  if(path.endsWith("V3.9_RUN_REPORTS_AND_EVIDENCE.md")){
    const marker="### AUTH-20261013-P2G25 — approved Phase 2G Stage-1 authorization";
    const count=s=>s.split(marker).length-1;
    item.main_p25_markers=count(main);
    item.draft_p25_markers=count(draft);
    item.draft_is_exact_main_prefix=main.startsWith(draft);
    item.main_p25_suffix_preserved=main.includes(marker);
    if(count(main)!==1)errors.push("main must have exactly one historical P25 ledger AUTH");
    if(count(draft)>1)errors.push("draft unexpectedly duplicates P25 AUTH");
    if(!main.startsWith(draft))errors.push("ledger divergence is not an append-only main suffix; manual reconciliation needed");
  }
  findings.push(item);
}
const report={status:errors.length?"BLOCKED":"RECONCILIATION_REQUIRED_NO_MIGRATION_AUTHORITY",
  main_ref:mainRef,draft_ref:draftRef,files:findings,errors,
  guardrail:"Never overwrite main ledger with draft version; retain original historical P25 append exactly once; reconcile Plan/Log prospective changes separately; no paid/deployment authorization"};
console.log("REPO_WAVEB_GATE3_RECORD_RECONCILIATION="+JSON.stringify(report));
if(errors.length)process.exitCode=2;
