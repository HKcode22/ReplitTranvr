'use strict';
// Review-only release handoff. Run after a coordinated, reviewed main merge.
// Never dispatch APPLY, toggle enabled/approval, change secrets, or access DB.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const REPO='HKcode22/ReplitTranvr';
const OLD='f53a36a787351b9859ff7910d7f5cab41c1d77a2';
const SELF_PATH='data-collection/phase5/review-tools/p5_primary_expiry_repin_enabled.cjs';
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
 "scripts/v39_phase5_actual_source_native_flight_candidate_readonly_owner_v39.ts": "58d3227d7251a286df4081ea91942b9e5eb1f5cb",
 "scripts/v39_phase6_stored_source_postcommit_native_audit_v39.mjs": "d26de09950ed7fdb202a453b072e5d079ee5aad0",
 "server/lib/disruption/fidsCensus_v3.ts": "db82195639d3d1bdda101c343ba6b1ec27ef0267",
 "server/lib/disruption/flightInstanceCanonical_v3.ts": "5d718d8172187a9c99b9fd58519e0b51a1846bb1",
 "server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39.ts": "10040597d1b9f50cc2df8407aae2d07b0058b7f0",
 "server/lib/disruption/phase5ScopedFidsSourceBridge_v39.ts": "23570f525ca433ae3438c129b639eb8caf60ae81",
 "server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs": "5e64aad5f50d1e98db5079ff3ccd5fe4dcdff493",
 "tests/phase5_actual_source_native_flight_candidate_readonly_owner_v39.test.ts": "62303ef6c2c017f111a3cf843b440007eacc3dad",
 "tests/phase5_prospective_fids_identity_custody_v39.test.ts": "4c559131b08b72d12c9d329959384e968a5623f1",
 "tests/phase5_stage4_scoped_v0079_real_pg_v39.test.ts": "3d561817ae283b1105653a9307b4a55c1032225e",
 "data-collection/phase5/2026-11-17_PROSPECTIVE_POST_CROSS_KEY_AMBIGUITY_NO_GO.md": "86e901465a12b5becfa0e98d4cbb1deec768ca13",
 "server/lib/disruption/phase6ActualPostOutcomeObservability_v39.ts": "979c2b58ca5d7def456f3f125a8e9a9696beb7c4",
 "tests/phase6_actual_post_outcome_observability_v39.test.ts": "a451c6520cf84e66acc7e55322b00196f996f3c5",
 "data-collection/phase5/review-tools/p5_primary_expiry_repin_enabled.test.cjs": "0e67cb5f47feed8547407babd1abbfee6448bcc0",
 "data-collection/phase5/2026-11-17_COMBINED_IDENTITY_RELEASE_AND_RETENTION_REPIN.md": "d65e592be6f04e11ad5147ff1fb78141e7733076",
 "server/lib/disruption/evaluationEngines_v39.ts": "08fc2ed2bab767e8f1c198ac7753e882d81d835c",
 "tests/evaluation_engines_v39.test.ts": "6c09685e6aae5d6c657f11a9e51dd90715ba71b3"
});
const COUNTERS=['liveOriginals','eligibleOriginals','hardDueOriginals','eligibleNextHour','hardDueNextHour',
 'unboundLiveOriginals','markedExpiredPayloadPresent','unlinkedUnexpiredPopulation','unexpiredPopulationWithoutLiveOriginal'];
const hold=s=>{throw Error('HOLD_P5_ENABLED_EXPIRY_REPIN_'+s);};
const pathOK=p=>typeof p==='string'&&(p===SELF_PATH||Object.hasOwn(RELEASE_CODE,p));
function validateCompare(c){
 if(!c||c.status!=='ahead'||c.base_commit?.sha!==OLD||c.merge_base_commit?.sha!==OLD||c.behind_by!==0||
    !Number.isSafeInteger(c.ahead_by)||c.ahead_by<1||c.ahead_by!==c.total_commits||
    !Array.isArray(c.files)||c.files.length<1||c.files.length>=300)hold('RELEASE_COMPARE_SCOPE');
 const names=new Set();
 for(const f of c.files){
  if(!pathOK(f.filename)||!['added','modified'].includes(f.status)||f.previous_filename||names.has(f.filename))hold('UNREVIEWED_RELEASE_PATH');
  names.add(f.filename);
 }
 if(!names.has(SELF_PATH)||Object.keys(RELEASE_CODE).some(p=>!names.has(p)))hold('REVIEWED_RELEASE_CHANGE_MISSING');
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
 for(const [p,wanted] of Object.entries(RELEASE_CODE)){const f=api(`contents/${p}?ref=${sha}`);
  if(f?.type!=='file'||f.sha!==wanted)hold('REVIEWED_RELEASE_BLOB_CHANGED');}
 const self=api(`contents/${SELF_PATH}?ref=${sha}`);
 if(self?.type!=='file'||self.sha!==selfBlobSha)hold('REVIEWED_HELPER_BYTES_CHANGED');
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
 const bytes=fs.readFileSync(__filename);
 const selfBlobSha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const report=x=>console.log(JSON.stringify(x));report(execute({gh,confirm,report,selfBlobSha},process.argv[2],process.argv[3]));
}
module.exports={execute,verifyReceipt,validateCompare,OLD,WF,PIN,ENABLE,APPROVAL,ENDPOINT,APPLY,VERIFY,STEP,COUNTERS,UNCHANGED,RELEASE_CODE,SELF_PATH};
if(require.main===module){try{main();}catch(e){const m=String(e?.message??'');console.error(/^HOLD_P5_ENABLED_EXPIRY_REPIN_[A-Z_]+$/.test(m)?m:'HOLD_P5_ENABLED_EXPIRY_REPIN_REDACTED_INSPECT_NO_REPLAY');process.exitCode=2;}}
