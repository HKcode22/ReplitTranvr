'use strict';
// Review-only release handoff. Run after a coordinated, reviewed main merge.
// Never dispatch APPLY, toggle enabled/approval, change secrets, or access DB.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const REPO='HKcode22/ReplitTranvr';
const OLD='6cb6c28a1508a2aaf3ebe5551bf41444dbb6622e';
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
// Actual primary runtime depends on these unchanged files. In addition,
// reject any executable changes outside the exact reviewed authorization/scheduling paths.
const UNCHANGED=[`.github/workflows/${WF}`,'scripts/v39_phase5_primary_fids_expiry_github_v39.mjs',
 'scripts/v39_phase5_retention_metadata_private_readonly_sentinel_v39.mjs',
 'migrations/staged/V0103__phase5_bounded_primary_fids_expiry_inert_v39.sql','package.json','package-lock.json'];
const RELEASE_CODE=Object.freeze({
 'scripts/v39_phase6_enable_source_owner_v39.ts':'4765e72a5a075f77a4808a19e7c0520f62af5c93',
 'tests/phase5_v0093_cost_only_inert_seven_rest_freeze_pg16_v39.test.ts':'49a74a2bc28519287a8720e844feec8b938c88ae',
 '.github/workflows/phase5-v0093-cost-only-seven-freeze-real-pg16.yml':'af5c7c8e7508a6eca94f63120141e151ba49108e',
 'scripts/v39_phase6_source_enable_approval_ledger_v39.ts':'b584f665bd256d1f301fbc1ba466fcd3fd611282',
 'tests/phase6_source_enable_approval_ledger_v39.test.ts':'702292a0f424b0191548a048180337287c681bd3',
 '.github/workflows/phase5-cd-github-bounded-pre-tick.yml':'a53c70d6bd72f3cb44f9fd9f8c128785781b1590',
 '.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml':'47929163515cdf04d31f198587ff588917f83332',
 '.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml':'646729ecc46cf0e34c65c3b8f817ec2721dd6107',
 '.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml':'4e3b1b0702570443e2936ad2e4ac479f8820073e',
 '.github/workflows/phase6-private-later-enrollment.yml':'d524337b95f05f940ae650d3c5ed73c9f28ae3d3',
 'server/lib/disruption/phase6PrivateSourceDayEpochDueParentReview_v39.ts':'ea6fa93cf3dcfe91c9a3c2f517d24b723df78066',
 'server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs':'a31c78ceac4ed685237a3f10ebe858de2fc41dfb',
 'tests/phase6_private_source_day_epoch_due_parent_review_v39.test.ts':'03b936be86fbc17cf54cfd57e5b4d81e41bb98c2',
 'tests/phase6_stored_source_child_dispatcher_v39.test.mjs':'75d7a7f3ba6b41969279a799ece366368139d587'});
const COUNTERS=['liveOriginals','eligibleOriginals','hardDueOriginals','eligibleNextHour','hardDueNextHour',
 'unboundLiveOriginals','markedExpiredPayloadPresent','unlinkedUnexpiredPopulation','unexpiredPopulationWithoutLiveOriginal'];
const hold=s=>{throw Error('HOLD_P5_ENABLED_EXPIRY_REPIN_'+s);};
const pathOK=p=>typeof p==='string'&&(p.startsWith('data-collection/')||Object.hasOwn(RELEASE_CODE,p));
function validateCompare(c){
 if(!c||c.status!=='ahead'||c.base_commit?.sha!==OLD||c.merge_base_commit?.sha!==OLD||c.behind_by!==0||
    !Number.isSafeInteger(c.ahead_by)||c.ahead_by<1||c.ahead_by!==c.total_commits||
    !Array.isArray(c.files)||c.files.length<1||c.files.length>=300)hold('RELEASE_COMPARE_SCOPE');
 const names=new Set();
 for(const f of c.files){
  if(!pathOK(f.filename)||!['added','modified'].includes(f.status)||f.previous_filename||names.has(f.filename))hold('UNREVIEWED_RELEASE_PATH');
  names.add(f.filename);
 }
 if(Object.keys(RELEASE_CODE).some(p=>!names.has(p)))hold('REVIEWED_RELEASE_CHANGE_MISSING');
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
function execute({gh,confirm,report},mode,sha){
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
 for(const [p,wanted] of Object.entries(RELEASE_CODE)){const f=api(`contents/${p}?ref=${sha}`);
  if(f?.type!=='file'||f.sha!==wanted)hold('REVIEWED_AUTH_FIX_BLOB_CHANGED');}
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
 const confirm=sha=>{const fd=fs.openSync('/dev/tty','r+');try{fs.writeSync(fd,`Type REPIN EXISTING PRIMARY EXPIRY TO ${sha}: `);
  let line='',buf=Buffer.alloc(1);while(line.length<128&&fs.readSync(fd,buf,0,1,null)===1&&buf[0]!==10)line+=buf.toString();
  return line===`REPIN EXISTING PRIMARY EXPIRY TO ${sha}`;}finally{fs.closeSync(fd);}};
 const report=x=>console.log(JSON.stringify(x));report(execute({gh,confirm,report},process.argv[2],process.argv[3]));
}
module.exports={execute,verifyReceipt,validateCompare,OLD,WF,PIN,ENABLE,APPROVAL,ENDPOINT,APPLY,VERIFY,STEP,COUNTERS,UNCHANGED,RELEASE_CODE};
if(require.main===module){try{main();}catch(e){const m=String(e?.message??'');console.error(/^HOLD_P5_ENABLED_EXPIRY_REPIN_[A-Z_]+$/.test(m)?m:'HOLD_P5_ENABLED_EXPIRY_REPIN_REDACTED_INSPECT_NO_REPLAY');process.exitCode=2;}}
