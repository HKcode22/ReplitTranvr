import test from "node:test";
import assert from "node:assert/strict";
import {copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

// Execute the actual guard and the byte-identical local production wrapper.
// Only Git metadata is simulated. No repository, provider or deployment is
// touched, and npm is trapped so an accidental callback build cannot run.
const BASE="24df876fc612c0e4fdfb6f69585ed90bcc56f9b8";
const BASE_982="697501b9443837018414082434cbe798ab835f92";
const BASE_POST="9426eda5f749e43b1e798b1c308f5c428f696882";
const PIN="c3c3050e12c4e327f9c82c35c95f856f3c1cbd20";
const HEAD="a".repeat(40);
const MATCHER="server/lib/disruption/phase5ConditionalPostOutcomeMatcher_v39.ts";
const WRAPPER="scripts/v39_phase5_callback_release_v5_reviewed_build_v39.sh";
const GUARD="scripts/v39_phase5b_callback_worker_only_guard.sh";
const priorInputs=[
 "server/lib/disruption/phase5AmendmentEGateOutDelayLabel_v39.ts",
 MATCHER,
 "server/lib/disruption/phase5ConditionalPrePermitPreparation_v39.ts",
 "server/lib/disruption/phase5ConditionalSignedSchedulePair_v39.ts",
 "server/lib/disruption/phase5V0083FuturePostOriginalDb_v39.ts",
 "server/lib/disruption/phase6NativePostSignedPublication_v39.mjs",
 "server/lib/disruption/phase6PostNativePreCandidateReadOnce_v39.mjs",
 "server/lib/disruption/phase7LocalPrivatePreHandoff_v39.ts"
];
const worker982Inputs=[
 MATCHER,
 "server/lib/disruption/phase5ConditionalFidsServiceRecovery_v39.ts",
 "server/lib/disruption/phase5ConditionalBoundSourceReview_v39.ts",
 "server/lib/disruption/phase6LaterT24EvidenceBatchReadOnly_v39.ts",
 "server/lib/disruption/phase5ConditionalPrePermitPreparation_v39.ts",
 "server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs"
];
const fullInputs=[...new Set([...priorInputs,...worker982Inputs])];
const repositoryRoot=fileURLToPath(new URL("../",import.meta.url));
const holdMarker="PHASE5B_WORKER_ONLY_CALLBACK_SCOPE_HOLD";
const passMarker="PHASE5B_WORKER_ONLY_CALLBACK_PUBLICATION_REFUSED_AS_REQUIRED";

const gitMock=String.raw`#!/usr/bin/env node
const fs=require("node:fs");
const args=process.argv.slice(2);
const fixture=JSON.parse(fs.readFileSync(process.env.P5B_CALLBACK_FIXTURE,"utf8"));
fs.appendFileSync(process.env.P5B_CALLBACK_TRACE,JSON.stringify(args)+"\n");
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const finish=(code,text="")=>{if(text)process.stdout.write(text);process.exit(code);};
const unexpected=why=>{
 fs.appendFileSync(process.env.P5B_CALLBACK_UNEXPECTED_GIT,JSON.stringify({why,args})+"\n");
 finish(91,why+"\n");
};
const matches=(path,spec)=>{
 if(path===spec||path.startsWith(spec+"/"))return true;
 const parts=spec.split("*").map(x=>x.replace(/[.*+?^$\x7b\x7d()|[\]\\]/g,"\\$&"));
 return spec.includes("*")&&new RegExp("^"+parts.join(".*")+"$").test(path);
};
const within=(paths,specs)=>paths.filter(path=>specs.some(spec=>matches(path,spec)));
if(same(args,["rev-parse","HEAD"]))finish(0,fixture.head+"\n");
if(same(args,["rev-parse","--show-toplevel"]))finish(0,fixture.root+"\n");
if(args[0]==="merge-base"&&args[1]==="--is-ancestor"&&args[3]==="HEAD"&&args.length===4)
 finish(fixture.missingAncestors.includes(args[2])?1:0);
if(same(args,["cat-file","-e",fixture.pin+"^{commit}"]))finish(0);
if(same(args,["show",fixture.pin+":.replit"]))finish(0,fixture.oldReplit);
const separator=args.indexOf("--"),specs=args.slice(separator+1);
if(args[0]==="diff"&&separator>0){
 const prefix=args.slice(0,separator);
 let changes;
 if(same(prefix,["diff","--quiet","HEAD"]))changes=fixture.unstaged;
 else if(same(prefix,["diff","--cached","--quiet"]))changes=fixture.staged;
 else if(prefix[1]==="--quiet"&&prefix[3]==="HEAD"&&prefix.length===4){
  const base=prefix[2];
  if(!Object.hasOwn(fixture.changes,base))unexpected("UNEXPECTED_GIT_BASE");
  changes=fixture.changes[base];
  // The outer guard sees drift. In this negative case the real wrapper is
  // falsely told source equivalence on its own later read and returns 0.
  // The guard must reject that successful --verify-only result, not publish.
  if(base===fixture.pin&&fixture.wrapperFalseSuccess){
   const calls=fs.readFileSync(process.env.P5B_CALLBACK_TRACE,"utf8").trim().split("\n").map(JSON.parse);
   const pinReads=calls.filter(a=>a[0]==="diff"&&a[1]==="--quiet"&&a[2]===fixture.pin).length;
   if(pinReads>1)changes=[];
  }
 }else if(prefix[1]==="--name-only"&&prefix[2]==="--no-renames"&&prefix[4]==="HEAD"&&prefix.length===5){
  const base=prefix[3];
  if(base===fixture.failNameRead)finish(128);
  if(!Object.hasOwn(fixture.changes,base))unexpected("UNEXPECTED_GIT_BASE");
  const names=within(fixture.changes[base],specs);
  finish(0,names.length?names.join("\n")+"\n":"");
 }
 if(changes)finish(within(changes,specs).length?1:0);
}
if(same(args.slice(0,separator),["ls-files","--others","--exclude-standard"])){ 
 const names=within(fixture.untracked,specs);
 finish(0,names.length?names.join("\n")+"\n":"");
}
unexpected("UNEXPECTED_GIT_COMMAND");
`;

function runGuard(options={}){
 const root=mkdtempSync(join(tmpdir(),"v39-p5b-callback-scope-"));
 try{
  mkdirSync(join(root,"scripts"));mkdirSync(join(root,"bin"));
  copyFileSync(join(repositoryRoot,GUARD),join(root,GUARD));
  copyFileSync(join(repositoryRoot,WRAPPER),join(root,WRAPPER));
  const originalWrapper=readFileSync(join(repositoryRoot,WRAPPER));
  assert.deepEqual(readFileSync(join(root,WRAPPER)),originalWrapper);
  const oldReplit='build = ["bash", "scripts/v39_phase5_callback_release_v4_reviewed_build_v39.sh"]\n';
  writeFileSync(join(root,".replit"),oldReplit.replace("release_v4_","release_v5_"));
  writeFileSync(join(root,"bin","git"),gitMock,{mode:0o700});
  const buildTrace=join(root,"unexpected-build");
  writeFileSync(join(root,"bin","npm"),'#!/usr/bin/env bash\nprintf "BUILD_ATTEMPTED\\n" >> "$P5B_CALLBACK_BUILD_TRACE"\nexit 97\n',{mode:0o700});
  const trace=join(root,"git-trace.jsonl"),fixturePath=join(root,"fixture.json"),unexpectedGit=join(root,"unexpected-git.jsonl");
  const fixture={root,pin:PIN,head:HEAD,oldReplit,missingAncestors:[],
   changes:{[BASE]:fullInputs,[BASE_982]:worker982Inputs,[PIN]:fullInputs},
   unstaged:[],staged:[],untracked:[],wrapperFalseSuccess:false,...options.fixture};
  writeFileSync(fixturePath,JSON.stringify(fixture));
  const result=spawnSync("bash",[join(root,GUARD),options.base??BASE_982,options.head??HEAD],{
   cwd:root,encoding:"utf8",timeout:15000,
   env:{...process.env,PATH:join(root,"bin")+":"+process.env.PATH,V39_BUILD_GIT_HEAD:options.override??"",
    P5B_CALLBACK_FIXTURE:fixturePath,P5B_CALLBACK_TRACE:trace,P5B_CALLBACK_BUILD_TRACE:buildTrace,
    P5B_CALLBACK_UNEXPECTED_GIT:unexpectedGit}
  });
  assert.equal(result.error,undefined,result.error?.message);
  const calls=existsSync(trace)?readFileSync(trace,"utf8").trim().split("\n").filter(Boolean).map(JSON.parse):[];
  assert.equal(existsSync(unexpectedGit),false,existsSync(unexpectedGit)?readFileSync(unexpectedGit,"utf8"):"unexpected Git command");
  assert.equal(existsSync(buildTrace),false,"callback build was attempted");
  assert.equal(existsSync(join(root,"dist")),false,"callback binary artifacts were created");
  assert.deepEqual(readFileSync(join(root,WRAPPER)),originalWrapper,"production wrapper changed");
  assert.doesNotMatch(result.stdout+result.stderr,/UNEXPECTED_GIT_/);
  return {...result,calls};
 }finally{rmSync(root,{recursive:true,force:true});}
}

const wrapperReadCount=result=>result.calls.filter(a=>a[0]==="rev-parse"&&a[1]==="--show-toplevel").length;
function assertHold(result,{wrapperRan=false}={}){
 assert.equal(result.status,2,result.stdout+result.stderr);
 assert.equal(result.stdout,"");
 assert.equal(result.stderr.trim(),holdMarker);
 assert.equal(wrapperReadCount(result),wrapperRan?1:0);
}

test("T136/T139 worker-only #982 requires all six reviewed repairs and the twelve-file historical union while refusing publication",()=>{
 assert.equal(priorInputs.length,8);assert.equal(worker982Inputs.length,6);assert.equal(fullInputs.length,12);
 for(const changes of [
  {[BASE]:fullInputs,[BASE_982]:worker982Inputs,[PIN]:fullInputs},
  {[BASE]:[...fullInputs].reverse(),[BASE_982]:[...worker982Inputs].reverse(),[PIN]:fullInputs}
 ]){
  const result=runGuard({fixture:{changes}});
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.equal(result.stdout.trim(),passMarker);assert.equal(result.stderr,"");
  assert.equal(wrapperReadCount(result),1);
  const pinDiffs=result.calls.filter(a=>a[0]==="diff"&&a[1]==="--quiet"&&a[2]===PIN);
  assert.equal(pinDiffs.length,2,"both guard and real wrapper independently inspect the unchanged runtime PIN");
  assert.ok(result.calls.some(a=>a[0]==="cat-file"&&a[2]===PIN+"^{commit}"));
 }
});

test("T139 #982 refuses every missing repair, the former matcher-only subset and any additional input",()=>{
 const missing=worker982Inputs.map(path=>worker982Inputs.filter(x=>x!==path));
 const historicalExtra="server/lib/disruption/phase5ConditionalSignedSchedulePair_v39.ts";
 for(const changed of [...missing,[MATCHER],[],
  [...worker982Inputs,historicalExtra],[historicalExtra,...worker982Inputs],
  [...worker982Inputs,"server/unreviewed.ts"]])
  assertHold(runGuard({fixture:{changes:{[BASE]:fullInputs,[BASE_982]:changed,[PIN]:fullInputs}}}));
});

test("T139 #982 independently requires every member of the full historical union and refuses extra drift",()=>{
 for(const changed of [...fullInputs.map(path=>fullInputs.filter(x=>x!==path)),[...fullInputs,"server/unreviewed.ts"]])
  assertHold(runGuard({fixture:{changes:{[BASE]:changed,[BASE_982]:worker982Inputs,[PIN]:fullInputs}}}));
});

test("T136 preserves the complete original eight-file scope and the legacy accepted base",()=>{
 const legacy=runGuard({base:BASE,fixture:{changes:{[BASE]:priorInputs,[BASE_982]:[],[PIN]:priorInputs}}});
 assert.equal(legacy.status,0,legacy.stdout+legacy.stderr);assert.equal(legacy.stdout.trim(),passMarker);
 assert.equal(wrapperReadCount(legacy),1);
 // The legacy selector cannot be used to waive the new successor scope.
 assertHold(runGuard({base:BASE}));
 for(const changed of [priorInputs.slice(1),[...priorInputs,"server/unreviewed.ts"]])
  assertHold(runGuard({base:BASE,fixture:{changes:{[BASE]:changed,[BASE_982]:[],[PIN]:priorInputs}}}));
});

test("T136 refuses changed .replit or reviewed callback wrappers without executing the wrapper",()=>{
 for(const path of [".replit",WRAPPER,"scripts/v39_phase5_reviewed_source_build_v39.sh",
  "scripts/v39_phase5_callback_release_v4_reviewed_build_v39.sh"]){
  assertHold(runGuard({fixture:{changes:{[BASE]:[...fullInputs,path],[BASE_982]:[...worker982Inputs,path],[PIN]:fullInputs}}}));
  // A contradictory base read must not let #982's independent protection go missing.
  assertHold(runGuard({fixture:{changes:{[BASE]:fullInputs,[BASE_982]:[...worker982Inputs,path],[PIN]:fullInputs}}}));
 }
});

test("T136 refuses dirty tracked, staged and untracked executable/publication inputs",()=>{
 for(const key of ["unstaged","staged","untracked"])
  for(const path of [MATCHER,worker982Inputs[1],".replit",WRAPPER])assertHold(runGuard({fixture:{[key]:[path]}}));
});

test("T136 requires actual verify-only exit-2 HOLD and rejects a false successful real wrapper",()=>{
 const result=runGuard({fixture:{wrapperFalseSuccess:true}});
 assertHold(result,{wrapperRan:true});
 assert.ok(result.calls.some(a=>a[0]==="show"&&a[1]===PIN+":.replit"),"real wrapper reached its verify-only source-equivalence path");
 assert.equal(result.calls.filter(a=>a[0]==="rev-parse"&&a[1]==="HEAD").length,2,"real wrapper passed its configuration checks and reached its successful verify-only return");
});

test("T136 refuses unknown metadata, wrong head/ancestry, clean runtime PIN and code-identity override",()=>{
 assertHold(runGuard({head:"b".repeat(40)}));
 for(const missing of [BASE,BASE_982,PIN])assertHold(runGuard({fixture:{missingAncestors:[missing]}}));
 for(const base of [BASE,BASE_982])assertHold(runGuard({fixture:{failNameRead:base}}));
 assertHold(runGuard({fixture:{changes:{[BASE]:fullInputs,[BASE_982]:worker982Inputs,[PIN]:[]}}}));
 assertHold(runGuard({override:PIN}));
});

test("T142 exact POST-worker successor refuses callback publication and unreviewed drift",()=>{
 const post=[MATCHER,"server/lib/disruption/phase5ConditionalSignedSchedulePair_v39.ts","server/lib/disruption/phase5ProspectiveProviderScheduleRevisionPrimary_v39.ts","server/lib/disruption/phase5V0083FuturePostOriginalDb_v39.ts","server/lib/disruption/phase6PostNativePreCandidateReadOnce_v39.mjs"];
 const full=[...new Set([...fullInputs,...post])];
 const changes={[BASE]:full,[BASE_982]:worker982Inputs,[BASE_POST]:post,[PIN]:full};
 const result=runGuard({base:BASE_POST,fixture:{changes}});
 assert.equal(result.status,0,result.stdout+result.stderr);
 assert.equal(result.stdout.trim(),passMarker);
 assert.equal(wrapperReadCount(result),1);
 for(const changed of [post.slice(1),[...post,"server/unreviewed.ts"],[...post,WRAPPER]])
  assertHold(runGuard({base:BASE_POST,fixture:{changes:{...changes,[BASE_POST]:changed}}}));
});

test("T146 conditional Packet B worker successor preserves callback publication refusal",()=>{
 const base="a02e3d6eddc378871f030848235746de160b71e5",scoped="server/lib/disruption/phase7PostScopedGroup_v39.ts",union=[...fullInputs,scoped];
 const changes={[BASE]:union,[base]:[scoped],[PIN]:union};
 const result=runGuard({base,fixture:{changes}});
 assert.equal(result.status,0,result.stdout+result.stderr);
 assert.equal(result.stdout.trim(),passMarker);
 assertHold(runGuard({base,fixture:{changes:{...changes,[base]:[]}}}));
 assertHold(runGuard({base,fixture:{changes:{...changes,[base]:[scoped,"server/index.ts"]}}}));
});
