#!/usr/bin/env node
"use strict";
/**
 * Phase5 calendar-only closeout.
 * Derives the exact B0062 stage input from the already-restored private
 * unsigned candidate and fresh evidence, then (only with explicit owner env)
 * installs ONLY calendar-stage review inputs, dispatches B0062 once, and
 * independently reads back the disabled calendar state.
 *
 * It never installs V0093 cost approval, source-rights approval, paid GO,
 * provider credentials, or Phase6 process/owner arming.
 */
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const {pathToFileURL}=require("node:url");
const REPO="HKcode22/ReplitTranvr";
const MAIN="70580b3749544dfcbeff39da181b2aa42b1b4476";
const EVIDENCE_COMMIT="a4b385907149f5b99ef8f85a11c554c583707916";
const AUTH="AUTH-20261119-F8CYCLE1";
const ACCOUNT_PATH="data-collection/phase5/evidence/2026-11-18_actual_account_compact_budget_reconciled_NOT_APPROVAL.json";
const ACCOUNT_SHA="8b1c5f077dca3c024d73d0a782323d009ea60706bb042c2babbe0d76e522f33b";
const PRICE_PATH="data-collection/phase5/evidence/2026-11-19_current_marketplace_fids_range_cost_NOT_RIGHTS_NO_GO.json";
const PRICE_SHA="f6463a2befcfc4e6b6ea9c7ae78383d05055785b4461da8bc573827b9c8dcbe1";
const SCIENCE_SHA="b7900e4d4c6e1f26c58c4a333c2b2ac480803ab39ece9b972cb657b9b3d29203";
const STOP_SHA="0fe341791b99013146eff5d6fce18dc3ea8c1cd5e5243224d3c9d85b72b7763c";
const OP_SHA="fd0aa7d6b35b69bb657cbfa8cc481b91a855249bb0fea1802ccc69ada6e5a462";
const PINS={
 "manifest-candidate.json":"9f6a12965dcf3eb911da4b13b3d58e5b8ebd0c6544861f499b7ec807cf0dbe25",
 "source-inventory.json":"6cf7dbe2421604fed2909f6539f68021103137eb5d320c40faf28dfb799fd6a0",
 "config-candidate.json":"4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb",
 "external-input-offline-review-NOT-STAGE.json":"a7508acbea9de20ffb3e69771b94f0d6b61f47e77f6bafe38376a9a7c8454fe9"
};
const PRED=[
"RUN-20261116-OWNERREVIEW112557","RUN-20261116-PREARMCLOCK43832469501","RUN-20261116-QUOTA091844",
"RUN-20261116-BTSOVERLAP14198898471","RUN-20261116-SOURCEGAPSENSITIVITY","RUN-20261116-HISTORICALFIDSCLEAR",
"RUN-20261116-V0103VERIFY43987495623","RUN-20261116-HISTORICALPREINVENTORY","RUN-20261116-V0104OWNERINSTALL",
"RUN-20261116-HEARTBEAT43992105353","RUN-20261116-PRIMARYEXPIRY43997742324","RUN-20261116-HISTORICALPRECLASSIFICATION015741",
"RUN-20261119-FRESHACCOUNT033903","RUN-20261119-SCIENTIFICSCOPEREVIEW","RUN-20261119-FRESHBUDGETRECONCILED",
"RUN-20261119-OPERATIONALSCOPEREVIEW","RUN-20261119-EXACTCOMPACTCOST","RUN-20261119-NATIVEPOSTGEOMETRY",
"RUN-20261119-ACTUALSIGNERALIASES","RUN-20261119-ACTUALPOLICYRECOVERY","RUN-20261119-ACTUALOWNERRECOVERY",
"DEC-20261119-OWNERPRESERVEF8","RUN-20261119-EXISTINGSTOPGUARDEVIDENCE","RUN-20261119-FINALOWNERMETADATA",
"RUN-20261119-NATIVECOREPREARMREVIEW","RUN-20261119-CURRENTGITHUBSTOP","RUN-20261119-PUBLISHEDGITHUBSTOPCOMBINED",
"RUN-20261119-CURRENTFIDSPRICE"
];
const TARGETS=["V39_P5_APPROVED_CODE_SHA","V39_P5_MANIFEST_SHA256","P6_INERT_STAGE_INPUT_JSON","P6_INERT_STAGE_INPUT_SHA256","P6_INERT_CALENDAR_REVIEW_APPROVED"];
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const json=x=>JSON.stringify(x);
const hold=s=>{throw Error("HOLD_P5_CALENDAR_CLOSEOUT_"+s)},need=(x,s)=>{if(!x)hold(s)};
const call=(c,a,o={})=>execFileSync(c,a,{cwd:process.cwd(),encoding:"utf8",timeout:60000,maxBuffer:20*1024*1024,stdio:["ignore","pipe","ignore"],...o}).trim();
const gh=(a,o={})=>call("gh",a,o);
const remote=()=>gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
function privateDir(d){const s=fs.lstatSync(d);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIRECTORY");return fs.realpathSync(d)}
function readCanonical(d,n,max=4_000_000){const p=path.join(d,n),s=fs.lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_INPUT_"+n.replace(/[^A-Z0-9]/gi,"_"));const b=fs.readFileSync(p),x=JSON.parse(b.toString("utf8"));need(Buffer.from(json(x)).equals(b),"NONCANONICAL_"+n.replace(/[^A-Z0-9]/gi,"_"));return {p,b,x,sha256:sha(b)}}
function writeOnce(d,n,b){const p=path.join(d,n),raw=Buffer.isBuffer(b)?b:Buffer.from(b);try{fs.writeFileSync(p,raw,{flag:"wx",mode:0o600})}catch(e){if(e.code!=="EEXIST")throw e;need(fs.readFileSync(p).equals(raw),"EXISTING_OUTPUT_DIFFERS_"+n.replace(/[^A-Z0-9]/gi,"_"))}return p}
function findCandidate(){
 const home=fs.realpathSync(os.homedir()),matches=[];
 for(const n of fs.readdirSync(home)){
  if(!/^\.phase5-final-review-[A-Za-z0-9_-]+$/.test(n))continue;
  const parent=path.join(home,n),d=path.join(parent,"nov18-"+MAIN.slice(0,12));
  if(!fs.existsSync(d))continue;
  try{
   privateDir(parent);privateDir(d);
   for(const [name,expected] of Object.entries(PINS))need(readCanonical(d,name).sha256===expected,"CANDIDATE_PIN_"+name.replace(/[^A-Z0-9]/gi,"_"));
   const t=readCanonical(d,"timing-input-offline-review.json",10000);
   need(t.x.timingEvidenceSha256==="88cbedd1ec867a6372f69c2708e180509f849d71a34963d4fb5ac851d6e30be5","TIMING_PIN");
   matches.push(d);
  }catch(e){if(!String(e?.message??"").startsWith("HOLD_P5_CALENDAR_CLOSEOUT_"))throw e}
 }
 need(matches.length===1,"EXACTLY_ONE_PRIVATE_CANDIDATE_REQUIRED");
 return matches[0];
}
function apiFile(ref,p){
 const raw=gh(["api","repos/"+REPO+"/contents/"+p+"?ref="+ref,"--jq",".content"]);
 const b=Buffer.from(raw.replace(/\s+/g,""),"base64");
 need(b.length>0,"EVIDENCE_FETCH_"+path.basename(p).replace(/[^A-Z0-9]/gi,"_"));
 return b;
}
function compareEvidenceOnly(){
 const x=JSON.parse(gh(["api","repos/"+REPO+"/compare/"+MAIN+"..."+EVIDENCE_COMMIT]));
 need(x.status==="ahead"&&Array.isArray(x.files)&&x.files.length>0&&x.files.every(f=>f.filename==="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json"||/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]+\.(json|md)$/.test(f.filename)),"EVIDENCE_COMMIT_NOT_EVIDENCE_ONLY");
}
function review(stageSha){
 return Object.freeze({
  expectedSignedStagePacketSha256:stageSha,
  expectedExactWriterRole:"phase5_b0062_prelaunch_stage_prod20261113",
  independentCalendarTreatmentReviewApproved:true,
  independentProviderAccountAndRestBudgetReviewApproved:true,
  narrowPrelaunchOwnerApproved:true
 });
}
async function prepare(){
 need(process.env.GITHUB_ACTIONS!=="true"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0","OWNER_LOCAL_SCOPE");
 const root=fs.realpathSync(call("git",["rev-parse","--show-toplevel"]));
 need(root===fs.realpathSync(process.cwd())&&call("git",["rev-parse","HEAD"])===MAIN&&remote()===MAIN&&call("git",["status","--porcelain","--untracked-files=no"])==="","EXACT_CLEAN_MAIN");
 compareEvidenceOnly();
 const dir=findCandidate();
 const accountRaw=apiFile(EVIDENCE_COMMIT,ACCOUNT_PATH);need(sha(accountRaw)===ACCOUNT_SHA,"ACCOUNT_EVIDENCE_SHA");
 const priceRaw=apiFile(EVIDENCE_COMMIT,PRICE_PATH);need(sha(priceRaw)===PRICE_SHA,"PRICE_EVIDENCE_SHA");
 const account=JSON.parse(accountRaw),price=JSON.parse(priceRaw);
 need(account?.jointBudgetReview?.apiUnitsRemaining===59968&&account.jointBudgetReview.alertCreditsRemaining===1830&&account.arithmetic?.netRestCeiling===49468&&account.arithmetic.restReserved===37388&&account.arithmetic.unallocatedAfterFloor===11080,"ACCOUNT_BUDGET_REVIEW");
 need(price?.currentMarketplaceFacts?.candidateProviderRangeMinutes===240&&price.currentMarketplaceFacts.candidateApiUnitsPerPhysicalGet===2&&price.currentMarketplaceFacts.ultraFidsPageSizeHours>=4&&price.currentMarketplaceFacts.tier2ApiUnitsPerRequest===2&&price.sourceRightsApproved===false&&price.phase6PaidGo===false,"CURRENT_RANGE_COST_REVIEW");
 const ext=readCanonical(dir,"external-input-offline-review-NOT-STAGE.json",100000).x;
 const timing=readCanonical(dir,"timing-input-offline-review.json",10000).x;
 need(ext.codeSha40===MAIN&&ext.manifestSha256===PINS["manifest-candidate.json"]&&ext.configSha256===PINS["config-candidate.json"]&&ext.calendarSha256==="7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c"&&ext.frameSha256==="02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94","EXTERNAL_IDENTITY");
 const external={...ext,phase6AuthorizationId:AUTH,predecessorEvidenceIds:PRED,asOfUtc:account.jointBudgetReview.observedAtUtc,jointBudgetReview:account.jointBudgetReview};
 const imp=p=>import(pathToFileURL(path.join(root,p)).href);
 const exporter=await imp("scripts/v39_phase6_actual_release_candidate_export_v39.ts");
 const stageMod=await imp("server/lib/disruption/phase5B0062InertCalendarUtcBudgetStage_v39.mjs");
 const eb=Buffer.from(json(external)),tb=Buffer.from(json(timing));
 const result=exporter.compileP6ActualCandidateExport({externalBytes:eb,expectedExternalFileSha256:sha(eb),timingBytes:tb,expectedTimingFileSha256:sha(tb),calendarVariant:"COMPACT_NOV21"});
 const parity=exporter.verifyP6ActualCommittedCheckout(result);
 need(parity.verifiedPlanCount===31&&result.summary.sourceQueries===6144&&result.summary.totalReservedUnits===37388&&result.summary.peakDailyUnits===1280&&result.summary.jointBudget?.netRestCeiling===49468&&result.summary.jointBudget?.restUnallocated===11080&&result.summary.phase6PaidGo===false,"EXACT_COMPACT_PARITY");
 const sf=result.files.find(f=>f.path==="unsigned-stage-input.json");need(sf&&H.test(sf.sha256)&&sha(sf.bytes)===sf.sha256&&sf.bytes.length<=48000,"EXACT_STAGE_BYTES");
 const st=JSON.parse(sf.bytes.toString("utf8"));need(Buffer.from(json(st)).equals(sf.bytes)&&st.codeSha40===MAIN&&st.phase6AuthorizationId===AUTH&&json(st.predecessorEvidenceIds)===json(PRED)&&st.calendarDays?.length===31&&st.calendarDays[0].startUtc==="2026-11-21T00:00:00.000Z","EXACT_STAGE_IDENTITY");
 const rv=review(sf.sha256),packet=stageMod.compileP5InertB0062UtcStagePacket(st,rv);
 need(packet.status==="REVIEWED_INERT_CALENDAR_AUTH_AND_UTC_CYCLE_CANDIDATE_NO_GO"&&packet.authorizationId===AUTH&&packet.calendarDays.length===31&&packet.providerCalls===0&&packet.phase6PaidGo===false,"B0062_COMPILER_REVIEW");
 const out=path.join(dir,"calendar-only-closeout-"+MAIN.slice(0,12));if(!fs.existsSync(out))fs.mkdirSync(out,{mode:0o700});privateDir(out);
 const reviewArtifact={
  schema:"v39.phase5.calendar-only-inert-review.v1",
  status:"CALENDAR_ONLY_INERT_REVIEW_APPROVED_NO_SOURCE_RIGHTS_NO_GO",
  main:MAIN,evidenceCommit:EVIDENCE_COMMIT,authorizationId:AUTH,stageInputSha256:sf.sha256,
  predecessorEvidenceIds:PRED,review:rv,
  evidence:{scientificScopeSha256:SCIENCE_SHA,currentAccountBudgetSha256:ACCOUNT_SHA,currentFidsRangeCostSha256:PRICE_SHA,publishedGithubStopSha256:STOP_SHA,operationalScopeSha256:OP_SHA},
  scope:"Approve preserved COMPACT_NOV21 31-day calendar/treatment geometry and current REST budget basis for disabled B0062 staging only.",
  sourceRightsApproved:false,costStageApproved:false,scientificFreezeApproved:false,phase6PaidGo:false
 };
 const reviewRaw=Buffer.from(json(reviewArtifact));
 writeOnce(out,"calendar-stage-input.json",sf.bytes);
 writeOnce(out,"calendar-stage-review.json",reviewRaw);
 const receipt={status:"EXACT_B0062_CALENDAR_ONLY_PACKET_PREPARED_REVIEWED_NO_SOURCE_RIGHTS_NO_GO",main:MAIN,evidenceCommit:EVIDENCE_COMMIT,authorizationId:AUTH,stageInputSha256:sf.sha256,reviewSha256:sha(reviewRaw),manifestSha256:st.manifestSha256,calendarSha256:st.calendarSha256,calendarRows:31,plannedQueries:6144,reservedRestUnits:37388,peakDailyUnits:1280,providerCalls:0,databaseWrites:0,githubMutations:0,sourceRightsApproved:false,costStageApproved:false,phase6PaidGo:false,out};
 writeOnce(out,"calendar-stage-preparation-receipt.json",Buffer.from(json(receipt)));
 console.log(json(receipt));return {dir,out,stageRaw:sf.bytes.toString("utf8"),stageSha:sf.sha256,reviewRaw,receipt};
}
function secretMeta(){return JSON.parse(gh(["secret","list","-R",REPO,"--json","name,updatedAt"]))}
function runList(wid){return JSON.parse(gh(["api","repos/"+REPO+"/actions/workflows/"+wid+"/runs?event=workflow_dispatch&head_sha="+MAIN+"&per_page=100"]))}
function sleep2(){execFileSync("sleep",["2"],{stdio:"ignore"})}
async function commission(){
 need(process.env.P5_CALENDAR_ONLY_OWNER_APPROVED==="1","EXPLICIT_OWNER_APPROVAL_REQUIRED");
 need(typeof process.env.DATABASE_URL==="string"&&process.env.DATABASE_URL.length>20,"OWNER_DATABASE_URL_REQUIRED");
 need(Date.now()<Date.parse("2026-11-19T23:10:00.000Z"),"STRICT_CALENDAR_STAGE_DEADLINE_PASSED");
 const p=await prepare(),journal=path.join(p.out,"calendar-only-commission-attempt.jsonl");
 need(!fs.existsSync(journal),"EXISTING_COMMISSION_ATTEMPT_RECONCILE_NO_REPLAY");
 const meta=secretMeta(),names=new Set(meta.map(x=>x.name));
 for(const required of ["V39_PHASE6_PROCESS_ARMED","P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL"])need(names.has(required),"EXISTING_REQUIRED_SECRET_MISSING_"+required);
 for(const n of TARGETS)need(!names.has(n),"TARGET_SECRET_ALREADY_PRESENT_RECONCILE_"+n);
 const fd=fs.openSync(journal,"wx",0o600),emit=x=>{fs.writeSync(fd,json(x)+"\n");fs.fsyncSync(fd)};
 try{
  emit({status:"CALENDAR_ONLY_COMMISSION_STARTED_NO_GO",main:MAIN,authorizationId:AUTH,stageSha256:p.stageSha,providerCalls:0,phase6PaidGo:false});
  const values={V39_P5_APPROVED_CODE_SHA:MAIN,V39_P5_MANIFEST_SHA256:PINS["manifest-candidate.json"],P6_INERT_STAGE_INPUT_JSON:p.stageRaw,P6_INERT_STAGE_INPUT_SHA256:p.stageSha,P6_INERT_CALENDAR_REVIEW_APPROVED:"1"};
  for(const n of TARGETS){
   emit({status:"SECRET_WRITE_ATTEMPTED_NO_REPLAY",name:n});
   call("gh",["secret","set",n,"-R",REPO],{input:values[n],stdio:["pipe","pipe","ignore"]});
   const row=secretMeta().find(x=>x.name===n);need(row&&Number.isFinite(Date.parse(row.updatedAt)),"SECRET_METADATA_READBACK_"+n);
   emit({status:"SECRET_METADATA_READBACK",name:n,updatedAt:row.updatedAt});
  }
  need(!secretMeta().some(x=>["P6_INERT_COST_REVIEW_APPROVED","V39_PHASE5_SOURCE_RIGHTS_APPROVED"].includes(x.name)),"COST_OR_RIGHTS_APPROVAL_UNEXPECTEDLY_PRESENT");
  const wf=JSON.parse(gh(["api","repos/"+REPO+"/actions/workflows/phase5-exact-inert-release-stage-manual.yml"]));need(wf.state==="active"&&Number.isSafeInteger(wf.id),"STAGE_WORKFLOW");
  const before=runList(wf.id);need(before.total_count===0,"PRIOR_EXACT_MAIN_STAGE_ATTEMPT_RECONCILIATION");
  emit({status:"CALENDAR_DISPATCH_ATTEMPTED_NO_REPLAY"});
  try{gh(["workflow","run","phase5-exact-inert-release-stage-manual.yml","-R",REPO,"--ref","main","-f","stage=calendar","-f","confirm=STAGE_EXACT_31_DAY_CALENDAR_DISABLED_AUTH_NO_PROVIDER"])}
  catch(e){hold("DISPATCH_ACK_UNKNOWN_RECONCILE_GITHUB")}
  let run=null;
  for(let i=0;i<60;i++){const q=runList(wf.id);if(q.total_count===1&&q.workflow_runs.length===1){run=q.workflow_runs[0];break}if(q.total_count>1)hold("MULTIPLE_STAGE_RUNS");sleep2()}
  need(run&&Number.isSafeInteger(run.id),"DISPATCH_RUN_ID_NOT_OBSERVED");
  emit({status:"CALENDAR_DISPATCH_EXACT_RUN_ID",runId:run.id});
  try{call("gh",["run","watch",String(run.id),"-R",REPO,"--exit-status"],{timeout:720000,stdio:["ignore","pipe","pipe"]})}catch(e){hold("CALENDAR_STAGE_RUN_FAILED_OR_UNKNOWN")}
  const done=JSON.parse(gh(["api","repos/"+REPO+"/actions/runs/"+run.id]));
  need(done.workflow_id===wf.id&&done.head_sha===MAIN&&done.head_branch==="main"&&done.event==="workflow_dispatch"&&done.run_attempt===1&&done.status==="completed"&&done.conclusion==="success","EXACT_STAGE_RUN_SUCCESS");
  emit({status:"CALENDAR_STAGE_RUN_SUCCESS",runId:run.id});
  const env={...process.env,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",V39_P5_APPROVED_CODE_SHA:MAIN};
  for(const k of ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","V39_DATABASE_RUNTIME_URL"])delete env[k];
  const ro=JSON.parse(call(process.execPath,["scripts/v39_phase6_inert_release_stage_manual_v39.mjs","--readback-calendar",path.join(p.out,"calendar-stage-input.json"),p.stageSha],{env,timeout:180000}));
  need(ro.status==="INDEPENDENT_EXACT_B0062_CALENDAR_ONLY_READONLY_MATCH_NO_GO"&&ro.codeSha===MAIN&&ro.independentOwnerReadback===true&&ro.authorizationEnabled===false&&ro.calendarRows===31&&ro.costStageCommitted===false&&ro.categoryCycleCaps===0&&ro.categoryUtcBudgetRows===0&&ro.sourceQueriesAndPhysicalAttemptsZero===true&&ro.providerCalls===0&&ro.databaseWrites===0&&ro.phase5ScientificFreeze===false&&ro.phase6PaidGo===false,"INDEPENDENT_CALENDAR_READBACK");
  emit({status:"INDEPENDENT_CALENDAR_READBACK_MATCH",runId:run.id,receipt:ro});
  const final={status:"B0062_CALENDAR_ONLY_STAGED_AND_INDEPENDENTLY_READBACK_NO_GO",main:MAIN,authorizationId:AUTH,stageSha256:p.stageSha,runId:run.id,calendarRows:31,authorizationEnabled:false,costStageCommitted:false,sourceRightsApproved:false,providerCalls:0,phase6PaidGo:false};
  emit(final);writeOnce(p.out,"calendar-only-final-receipt.json",Buffer.from(json({...final,readback:ro})));console.log(json(final));return final;
 }finally{fs.closeSync(fd)}
}
async function run(){
 const mode=process.argv[2];
 need(process.argv.length===3&&["PREPARE_CALENDAR_ONLY_NO_GO","COMMISSION_CALENDAR_ONLY_NO_GO"].includes(mode),"MODE");
 if(mode==="PREPARE_CALENDAR_ONLY_NO_GO")await prepare();else await commission();
}
module.exports={review,PRED,TARGETS,AUTH,prepare};
if(require.main===module)run().catch(e=>{const s=String(e?.message??"");console.error(/^HOLD_P5_CALENDAR_CLOSEOUT_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_CALENDAR_CLOSEOUT_UNKNOWN_NO_REPLAY");process.exitCode=2});
