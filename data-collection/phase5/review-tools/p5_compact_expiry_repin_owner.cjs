'use strict';
// Review-only release handoff. Run after a coordinated, reviewed main merge.
// Never dispatch APPLY, toggle enabled/approval, change secrets, or access DB.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const REPO='HKcode22/ReplitTranvr';
const OLD='de15816bccb867dc17dcd396f8bedec66960e115';
const EXPECTED_HEAD='cfce6e3693eab1244f8d7fec65d6da676d4471c4';
const EXPECTED_TREE='b8b8224f07dd1b0bf5696a93e7a170bbd8631e51';
const SELF_PATH='data-collection/phase5/review-tools/p5_compact_expiry_repin_owner.cjs';
const {createHash}=require('node:crypto');
const WF='phase5-primary-fids-expiry-no-provider.yml';
const PIN='P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA';
const ENABLE='P5_PRIMARY_FIDS_EXPIRY_ENABLED';
const APPROVAL='P5_PRIMARY_FIDS_EXPIRY_APPROVAL';
const ENDPOINT='P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256';
const APPLY='APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER';
const VERIFY='VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES';
const STEP='Verify exact main and execute only bounded primary FIDS expiry';
const SHA=/^[a-f0-9]{40}$/;
const EXPECTED_SECRETS=['P5_PRIMARY_FIDS_SWEEP_DATABASE_URL','P5_RETENTION_READER_DATABASE_URL'];
// Current identity integration only. Exact known files and unchanged cleanup dependencies;
// not a general-purpose approval for later releases.
const UNCHANGED=[`.github/workflows/${WF}`,'scripts/v39_phase5_primary_fids_expiry_github_v39.mjs',
 'scripts/v39_phase5_retention_metadata_private_readonly_sentinel_v39.mjs',
 'migrations/staged/V0103__phase5_bounded_primary_fids_expiry_inert_v39.sql',
 'migrations/staged/V0104__phase5_physical_rest_live_authority_retention_guard_v39.sql','package.json','package-lock.json'];
const RELEASE_CODE=Object.freeze({
 ".github/workflows/phase5-actual-nov22-budget-proposal-no-provider.yml": "c6fbf51a01b0d684d0685a99e5c8bd6cf5a7f48f",
 ".github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml": "5467733d8fb2fc69e261ebae3415325f1057a1dc",
 "data-collection/phase5/evidence/2026-11-17_compact_actual_shape_calendar_REVIEW_ONLY.json": "ee17a694594356e2b0c772545c490c198db11b42",
 "data-collection/phase5/planning/phase6-source-day-01.json": "56d02053b3d31c613035752954c19815da14c293",
 "data-collection/phase5/planning/phase6-source-day-02.json": "3214e9ed569a1be4aaf5f81776f6bd17cc53e540",
 "data-collection/phase5/planning/phase6-source-day-03.json": "ad3b938319d44f0ff39bdc8447a720d01d75442b",
 "data-collection/phase5/planning/phase6-source-day-04.json": "34816f36bf6f5c20b794a1ad0b3fe85cbe1119dc",
 "data-collection/phase5/planning/phase6-source-day-05.json": "ba973a5c73166025b96c41581ecf60adaea83c7e",
 "data-collection/phase5/planning/phase6-source-day-06.json": "c5a352f42b1570b7484e94a87fc509a1752d1a5e",
 "data-collection/phase5/planning/phase6-source-day-07.json": "e436c8e43d8cf2e79cefd284b5ae40173f8618fb",
 "data-collection/phase5/planning/phase6-source-day-08.json": "3be35b2b2ed099422f3dac68d081ffe86ae3afef",
 "data-collection/phase5/planning/phase6-source-day-09.json": "a227bc76409da6503ed50a0011c1bf7647eebe8b",
 "data-collection/phase5/planning/phase6-source-day-10.json": "2394b55d898c3d9804a2d69af8c7ce9f45bfe38a",
 "data-collection/phase5/planning/phase6-source-day-11.json": "8f45bba22c5b4d0330437d617a3804c9aec6eb15",
 "data-collection/phase5/planning/phase6-source-day-12.json": "0842c838bb607c939afa1fbe659224930f8d2514",
 "data-collection/phase5/planning/phase6-source-day-13.json": "714e764e0aca191dbcfafcf5f60ab9f186dc5783",
 "data-collection/phase5/planning/phase6-source-day-14.json": "10f5e1cef9f562345c47c6b44e2f6fa4876785b4",
 "data-collection/phase5/planning/phase6-source-day-15.json": "b3571ce7c134b516c9860c9f264d49da7669f8f5",
 "data-collection/phase5/planning/phase6-source-day-16.json": "90ea55e738c85dd138d7acb82ca8164cc64a9bb0",
 "data-collection/phase5/planning/phase6-source-day-17.json": "d49e7bab2395ee57e8610e9da60a6c6240459a93",
 "data-collection/phase5/planning/phase6-source-day-18.json": "9529b73825e1b0889c09764c7bafdc36d93793be",
 "data-collection/phase5/planning/phase6-source-day-19.json": "a7666d4a012d7fc7bb89638a0e11f5e882b33319",
 "data-collection/phase5/planning/phase6-source-day-20.json": "e2ffd815a8a2cccb25598dab2a0c8521d77adaa7",
 "data-collection/phase5/planning/phase6-source-day-21.json": "39976c96cda775063e56b7c0a4d878e1d8dc12af",
 "data-collection/phase5/planning/phase6-source-day-22.json": "41ed1bea6a980511ea57a85c6cd8503eb7f4bd88",
 "data-collection/phase5/planning/phase6-source-day-23.json": "aa9a3b5f3b0cc6ccd4efc33aaf61a5ce6e0f5184",
 "data-collection/phase5/planning/phase6-source-day-24.json": "cff0a4356a2ac54c5639a3199ea1e32d03f298aa",
 "data-collection/phase5/planning/phase6-source-day-25.json": "c7dc19600dcd8bc2df6a28b97b3e93f06bce82d5",
 "data-collection/phase5/planning/phase6-source-day-26.json": "de5eaf3f34b6c45fe6fd8a813504b1e7725f16ef",
 "data-collection/phase5/planning/phase6-source-day-27.json": "9b9d473bf92171c02fb33ff4d2d3d6359142e5c1",
 "data-collection/phase5/planning/phase6-source-day-28.json": "030be839c192e56d9b3b30b46034503aa98f00c0",
 "data-collection/phase5/planning/phase6-source-day-29.json": "bcbc713482a44dafad78a28be9cfbcd1e0242d08",
 "data-collection/phase5/planning/phase6-source-day-30.json": "565ce5668e3bc49921107b385641552c7727b142",
 "data-collection/phase5/planning/phase6-source-day-31.json": "86cedeb0875ecbd49caa9599f8d5047c25b1ea32",
 "scripts/v39_phase6_actual_release_candidate_export_v39.ts": "79fa5f919e74433a69f9d50afbaecba030aabfa6",
 "scripts/v39_phase6_github_controller_heartbeat_v39.mjs": "9c83cf683bde69d1f61e0462e62e90397ebdf33a",
 "scripts/v39_phase6_nonpaid_source_day_github_runtime_v39.mjs": "1b33f7c1161d7f10ebabfb0dbf1c70596d493a7d",
 "server/lib/disruption/phase5ActualNov22BudgetProposal_v39.ts": "a6fa6839f1876590a215358b4dd128f27106894c",
 "server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39.ts": "496a2e8308ad5d051b422d61c4dcc4beceeaf93f",
 "server/lib/disruption/phase6AutonomousGithubControllerHeartbeat_v39.mjs": "1fefe9ea9cae5709189f92a3c4fccc78864cb2da",
 "server/lib/disruption/phase6SamplingDecision_v39.ts": "f2d1f65db65e9cc28643fb5aa1d95cbc0ea8cea9",
 "tests/phase5_actual_nov22_budget_proposal_v39.test.ts": "5f6c7a657ff8bec1451799e37c910b590baa1089",
 "tests/phase5_early_adaptive_draw_owner_v39.test.ts": "ed385a30e4639f7fe70125617947bffd8223446a",
 "tests/phase5_early_adaptive_draw_real_pg_v39.test.ts": "fa3f3875cd12bf27a179ce88f64ddeb08bf1970c",
 "tests/phase6_autonomous_github_controller_heartbeat_v39.test.mjs": "707ebdabd40f3e1b03c870eac0022cb491fd3871",
 "tests/phase6_nonpaid_source_day_github_runtime_v39.test.mjs": "714e0d25f272a77b591a00793a47f117fb41139c"
});
const COUNTERS=['liveOriginals','eligibleOriginals','hardDueOriginals','eligibleNextHour','hardDueNextHour',
 'unboundLiveOriginals','markedExpiredPayloadPresent','unlinkedUnexpiredPopulation','unexpiredPopulationWithoutLiveOriginal'];
const hold=s=>{throw Error('HOLD_P5_ENABLED_EXPIRY_REPIN_'+s);};
const pathOK=p=>typeof p==='string'&&Object.hasOwn(RELEASE_CODE,p);
function validateCompare(c){
 if(!c||c.status!=='ahead'||c.base_commit?.sha!==OLD||c.merge_base_commit?.sha!==OLD||c.behind_by!==0||
    !Number.isSafeInteger(c.ahead_by)||c.ahead_by<1||c.ahead_by!==c.total_commits||
    !Array.isArray(c.files)||c.files.length<1||c.files.length>=300)hold('RELEASE_COMPARE_SCOPE');
 const names=new Set();
 for(const f of c.files){
  if(!pathOK(f.filename)||!['added','modified'].includes(f.status)||f.previous_filename||names.has(f.filename)||f.sha!==RELEASE_CODE[f.filename])hold('UNREVIEWED_RELEASE_PATH');
  names.add(f.filename);
 }
 if(names.size!==Object.keys(RELEASE_CODE).length||Object.keys(RELEASE_CODE).some(p=>!names.has(p)))hold('REVIEWED_RELEASE_CHANGE_MISSING');
 return names.size;
}
function verifyReceipt(run,jobs,log,sha,id,wfId){
 if(run?.id!==id||run.workflow_id!==wfId||run.head_sha!==sha||run.head_branch!=='main'||run.event!=='workflow_dispatch'||
    run.run_attempt!==1||run.status!=='completed'||run.conclusion!=='success')hold('EXACT_VERIFY_RUN_REQUIRED');
 if(jobs?.total_count!==1||jobs.jobs?.length!==1)hold('EXACT_VERIFY_JOB_REQUIRED');
 const job=jobs.jobs[0];
 if(job.name!=='primary-fids-expiry'||job.run_id!==id||job.conclusion!=='success'||job.status!=='completed'||
    job.steps?.filter(s=>s.name===STEP&&s.conclusion==='success').length!==1)hold('ACTUAL_VERIFY_STEP_REQUIRED');
 const hits=log.split('\n').filter(s=>s.includes('"status":"PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES"'));
 if(hits.length!==1||!hits[0].includes('{'))hold('UNIQUE_VERIFY_RECEIPT_REQUIRED');
 let r;try{r=JSON.parse(hits[0].slice(hits[0].indexOf('{')).trim());}catch{hold('INVALID_VERIFY_RECEIPT');}
 const b=r.before;
 if(r.status!=='PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES'||r.reviewedMainSha!==sha||r.distinctDbActorsVerified!==true||
    r.providerCalls!==0||r.databaseWrites!==0||r.objectDeletions!==0||r.phase6PaidGo!==false||
    r.backupOrPitrVerified!==false||r.completeRetentionDeploymentVerified!==false||
    !b||b.schema!=='v39.phase5.primary-fids-expiry-status.v1'||COUNTERS.some(k=>b[k]!==0)||
    b.deletionStopUnresolved!==false||b.providerCalls!==0||b.databaseWrites!==0||b.phase6PaidGo!==false||
    b.backupOrPitrVerified!==false||b.completeRetentionDeploymentVerified!==false||
    !Number.isFinite(Date.parse(b.observedAtUtc)))hold('VERIFY_RECEIPT_REQUIRES_REVIEW');
 return {runId:id,jobId:job.id,observedAtUtc:b.observedAtUtc,distinctDbActorsVerified:true,allPrimaryCountersZero:true};
}
function execute({gh,confirm,report,selfBlobSha},mode,sha){
 if(!SHA.test(selfBlobSha??''))hold('EXACT_SELF_BLOB_REQUIRED');
 if(!['--repin','--verify-current'].includes(mode)||!SHA.test(sha??'')||sha===OLD)hold('EXACT_NEW_REVIEWED_MAIN_REQUIRED');
 const api=p=>JSON.parse(gh(['api',`repos/${REPO}/${p}`]));
 const get=k=>gh(['variable','get',k,'-R',REPO]).trim();
 const main=()=>{if(api('git/ref/heads/main')?.object?.sha!==sha)hold('MAIN_CHANGED');};
 const config=expected=>{
  if(get(PIN)!==expected||get(ENABLE)!=='true'||get(APPROVAL)!==APPLY)hold('EXISTING_CONFIG_DRIFT');
  const value=get(ENDPOINT);if(!/^[a-f0-9]{64}$/.test(value))hold('EXISTING_ENDPOINT_PIN_REQUIRED');return value;
 };
 const stable=(expected,endpoint)=>{main();if(config(expected)!==endpoint)hold('ENDPOINT_PIN_CHANGED');main();};
 main();const expected=mode==='--repin'?OLD:sha, endpoint=config(expected);
 const names=JSON.parse(gh(['secret','list','-R',REPO,'--json','name']));
 if(!Array.isArray(names)||EXPECTED_SECRETS.some(k=>names.filter(n=>n.name===k).length!==1))hold('EXISTING_SCOPED_SECRET_MISSING');
 const changedPaths=validateCompare(api(`compare/${OLD}...${sha}`));
 for(const p of UNCHANGED){const a=api(`contents/${p}?ref=${OLD}`),b=api(`contents/${p}?ref=${sha}`);
  if(a?.type!=='file'||b?.type!=='file'||!SHA.test(a.sha??'')||a.sha!==b.sha)hold('CLEANUP_DEPENDENCY_CHANGED');}
 const merged=api(`git/commits/${sha}`);
 if(merged?.tree?.sha!==EXPECTED_TREE||JSON.stringify(merged?.parents?.map(p=>p.sha))!==JSON.stringify([OLD,EXPECTED_HEAD]))
  hold('REVIEWED_MERGE_TREE_CHANGED');
 const workflow=api(`actions/workflows/${WF}`);
 if(!Number.isSafeInteger(workflow?.id)||workflow.id<1||workflow.path!==`.github/workflows/${WF}`||workflow.state!=='active')hold('EXISTING_WORKFLOW_NOT_ACTIVE');
 stable(expected,endpoint);
 if(mode==='--repin'){
  if(!confirm(sha))hold('OWNER_DECLINED');stable(OLD,endpoint);
  // Do not retry on lost acknowledgement: only inspect actual variable.
  try{gh(['variable','set',PIN,'-R',REPO,'--body',sha]);}catch{hold('PIN_UPDATE_UNKNOWN_INSPECT_NO_REPLAY');}
 }
 stable(sha,endpoint);
 report({status:'EXISTING_PRIMARY_EXPIRY_PIN_READ_BACK',reviewedMainSha:sha,changedPaths,scheduledApplyEnabled:true,
  approvalUnchanged:true,endpointPinUnchanged:true,providerCalls:0,phase6PaidGo:false});
 const payload=JSON.stringify({ref:'main',return_run_details:true,inputs:{confirm:VERIFY,approved_main_sha:sha}});
 let runId;
 try{const out=JSON.parse(gh(['api','--method','POST',`repos/${REPO}/actions/workflows/${WF}/dispatches`,'--input','-'],payload));runId=out.workflow_run_id;}catch{hold('VERIFY_DISPATCH_UNKNOWN_INSPECT_NO_REPLAY');}
 if(!Number.isSafeInteger(runId)||runId<1)hold('VERIFY_RUN_ID_UNKNOWN_INSPECT_NO_REPLAY');
 report({status:'VERIFY_ONLY_DISPATCHED',runId,reviewedMainSha:sha,providerCalls:0,phase6PaidGo:false});
 try{gh(['run','watch',String(runId),'-R',REPO,'--interval','10','--exit-status'],undefined,900000);}catch{hold('VERIFY_RUN_NOT_CONFIRMED_INSPECT_NO_REPLAY');}
 const run=api(`actions/runs/${runId}`),jobs=api(`actions/runs/${runId}/jobs?per_page=100`);
 if(jobs?.total_count!==1||jobs.jobs?.length!==1||!Number.isSafeInteger(jobs.jobs[0].id))hold('EXACT_VERIFY_JOB_REQUIRED');
 const log=gh(['run','view',String(runId),'-R',REPO,'--job',String(jobs.jobs[0].id),'--log']);
 const verified=verifyReceipt(run,jobs,log,sha,runId,workflow.id);
 stable(sha,endpoint);
 return {status:'EXISTING_PRIMARY_EXPIRY_REPIN_VERIFY_ONLY_NO_GO',reviewedMainSha:sha,...verified,
  pinChanged:mode==='--repin',scheduledApplyEnabled:true,approvalUnchanged:true,endpointPinUnchanged:true,
  manualApplyDispatched:false,scheduledExecutionVerified:false,retentionDeadlineGuaranteed:false,
  providerCalls:0,databaseWrites:0,objectDeletions:0,phase6PaidGo:false};
}
function main(){
 if(process.env.GITHUB_ACTIONS==='true'||process.argv.length!==4)hold('OWNER_LOCAL_EXACT_ARGUMENTS');
 const gh=(args,input,timeout=30000)=>execFileSync('gh',args,{encoding:'utf8',input,timeout,maxBuffer:20*1024*1024,stdio:['pipe','pipe','ignore']});
 // The single hash-pinned owner wrapper is the explicit invocation; no second typed prompt.
 const confirm=()=>process.env.P5_COMPACT_OWNER_WRAPPER_EXECUTED==='1';
 const bytes=fs.readFileSync(__filename);
 const selfBlobSha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const report=x=>console.log(JSON.stringify(x));report(execute({gh,confirm,report,selfBlobSha},process.argv[2],process.argv[3]));
}
module.exports={execute,verifyReceipt,validateCompare,OLD,WF,PIN,ENABLE,APPROVAL,ENDPOINT,APPLY,VERIFY,STEP,COUNTERS,UNCHANGED,RELEASE_CODE,SELF_PATH,EXPECTED_TREE,EXPECTED_HEAD};
if(require.main===module){try{main();}catch(e){const m=String(e?.message??'');console.error(/^HOLD_P5_ENABLED_EXPIRY_REPIN_[A-Z_]+$/.test(m)?m:'HOLD_P5_ENABLED_EXPIRY_REPIN_REDACTED_INSPECT_NO_REPLAY');process.exitCode=2;}}
