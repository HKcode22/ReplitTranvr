'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {execute,verifyReceipt,validateCompare,OLD,WF,PIN,ENABLE,APPROVAL,ENDPOINT,APPLY,VERIFY,STEP,COUNTERS,UNCHANGED,RELEASE_CODE,SELF_PATH}=require('./p5_primary_expiry_repin_enabled.cjs');
const NEW='a'.repeat(40),END='b'.repeat(64),BLOB='c'.repeat(40),id=12345,wfId=23,jobId=6789;
function fixture(mode='--repin'){
 const vars={[PIN]:mode==='--repin'?OLD:NEW,[ENABLE]:'true',[APPROVAL]:APPLY,[ENDPOINT]:END};
 const run={id,workflow_id:wfId,head_sha:NEW,head_branch:'main',event:'workflow_dispatch',run_attempt:1,status:'completed',conclusion:'success'};
 const jobs={total_count:1,jobs:[{id:jobId,run_id:id,name:'primary-fids-expiry',status:'completed',conclusion:'success',steps:[{name:STEP,conclusion:'success'}]}]};
 const common={providerCalls:0,databaseWrites:0,phase6PaidGo:false,backupOrPitrVerified:false,completeRetentionDeploymentVerified:false};
 const receipt={status:'PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES',reviewedMainSha:NEW,distinctDbActorsVerified:true,objectDeletions:0,...common,
  before:{schema:'v39.phase5.primary-fids-expiry-status.v1',observedAtUtc:'2026-11-17T02:50:00.000Z',...Object.fromEntries(COUNTERS.map(k=>[k,0])),deletionStopUnresolved:false,...common}};
 const compare={status:'ahead',base_commit:{sha:OLD},merge_base_commit:{sha:OLD},behind_by:0,ahead_by:2,total_commits:2,files:[...Object.keys(RELEASE_CODE).map(filename=>({filename,status:'modified'})),{filename:SELF_PATH,status:'modified'}]};
 const f={vars,run,jobs,receipt,compare,mode,main:NEW,mutations:[],reports:[],confirm:true,depDiff:false,fixDiff:false,workflowState:'active',dispatchLost:false,pinLost:false,extraLog:false};
 const js=x=>JSON.stringify(x);
 const gh=(a,input)=>{
  if(a[0]==='variable'&&a[1]==='get')return vars[a[2]];
  if(a[0]==='variable'&&a[1]==='set'){assert.equal(a[2],PIN);f.mutations.push('pin');vars[PIN]=a[6];if(f.pinLost)throw Error('unknown');return '';}
  if(a[0]==='secret')return js(['P5_PRIMARY_FIDS_SWEEP_DATABASE_URL','P5_RETENTION_READER_DATABASE_URL'].map(name=>({name})));
  if(a[0]==='run'&&a[1]==='watch')return '';
  if(a[0]==='run'&&a[1]==='view')return 'job step 2026-11-17T02:50:02Z '+js(receipt)+(f.extraLog?'\n'+js(receipt):'');
  if(a[0]==='api'&&a[1]==='--method'){
   assert.equal(a[2],'POST');assert.equal(a[3],`repos/HKcode22/ReplitTranvr/actions/workflows/${WF}/dispatches`);
   assert.deepEqual(JSON.parse(input),{ref:'main',return_run_details:true,inputs:{confirm:VERIFY,approved_main_sha:NEW}});
   f.mutations.push('verify');if(f.dispatchLost)throw Error('unknown');return js({workflow_run_id:id});}
  const p=a[1].replace('repos/HKcode22/ReplitTranvr/','');
  if(p==='git/ref/heads/main')return js({object:{sha:f.main}});
  if(p.startsWith('compare/'))return js(compare);
  if(p.startsWith('contents/')){const [name,ref]=p.slice(9).split('?ref=');
   if(UNCHANGED.includes(name))return js({type:'file',sha:f.depDiff&&ref===NEW?'d'.repeat(40):BLOB});
   if(Object.hasOwn(RELEASE_CODE,name))return js({type:'file',sha:f.fixDiff?BLOB:RELEASE_CODE[name]});
   if(name===SELF_PATH)return js({type:'file',sha:f.selfDiff?'d'.repeat(40):BLOB});}
  if(p===`actions/workflows/${WF}`)return js({id:wfId,path:`.github/workflows/${WF}`,state:f.workflowState});
  if(p===`actions/runs/${id}`)return js(run);
  if(p.startsWith(`actions/runs/${id}/jobs`))return js(jobs);
  throw Error('unexpected mock request '+a.join(' '));
 };
 f.deps={gh,confirm:()=>f.confirm,report:x=>f.reports.push(x),selfBlobSha:BLOB};f.execute=()=>execute(f.deps,mode,NEW);return f;
}
test('only exact pin mutation and VERIFY dispatch; enabled and approval unchanged',()=>{
 const f=fixture(),r=f.execute();assert.equal(r.status,'EXISTING_PRIMARY_EXPIRY_REPIN_VERIFY_ONLY_NO_GO');
 assert.deepEqual(f.mutations,['pin','verify']);assert.equal(f.vars[PIN],NEW);assert.equal(f.vars[ENABLE],'true');assert.equal(f.vars[APPROVAL],APPLY);
 assert.equal(r.manualApplyDispatched,false);assert.equal(r.retentionDeadlineGuaranteed,false);assert.equal(r.scheduledExecutionVerified,false);
});
test('verify-current mode performs read-only workflow dispatch, no pin write',()=>{const f=fixture('--verify-current');assert.equal(f.execute().pinChanged,false);assert.deepEqual(f.mutations,['verify']);});
test('stale main, wrong pin, disabled, missing approval and declined owner all stop before mutation',()=>{
 for(const mutate of [f=>f.main=OLD,f=>f.vars[PIN]=NEW,f=>f.vars[ENABLE]='false',f=>f.vars[APPROVAL]='',f=>f.confirm=false]){const f=fixture();mutate(f);assert.throws(f.execute,/HOLD_P5_ENABLED_EXPIRY_REPIN_/);assert.deepEqual(f.mutations,[]);}
});
test('unreviewed release paths, missing fix and changed dependency/fix bytes stop',()=>{
 for(const mutate of [f=>f.compare.files.push({filename:'scripts/new.js',status:'added'}),f=>f.compare.files.shift(),f=>f.depDiff=true,f=>f.fixDiff=true,f=>f.workflowState='disabled_manually']){const f=fixture();mutate(f);assert.throws(f.execute,/HOLD_P5_ENABLED_EXPIRY_REPIN_/);assert.deepEqual(f.mutations,[]);}
});
test('ambiguous pin update, ambiguous dispatch are not replayed or rolled back',()=>{
 const a=fixture();a.pinLost=true;assert.throws(a.execute,/PIN_UPDATE_UNKNOWN/);assert.deepEqual(a.mutations,['pin']);assert.equal(a.vars[PIN],NEW);
 const b=fixture();b.dispatchLost=true;assert.throws(b.execute,/VERIFY_DISPATCH_UNKNOWN/);assert.deepEqual(b.mutations,['pin','verify']);assert.equal(b.vars[PIN],NEW);assert.equal(b.vars[ENABLE],'true');
});
test('green skipped job, rerun and malformed or nonzero receipt cannot certify',()=>{
 for(const mutate of [f=>f.jobs.jobs[0].steps[0].conclusion='skipped',f=>f.run.run_attempt=2,f=>f.receipt.before.eligibleOriginals=1,f=>f.receipt.providerCalls=1,f=>f.extraLog=true,f=>f.run.workflow_id=99]){const f=fixture();mutate(f);assert.throws(f.execute,/HOLD_P5_ENABLED_EXPIRY_REPIN_/);assert.deepEqual(f.mutations,['pin','verify']);assert.equal(f.vars[ENABLE],'true');}
});
test('truncation, divergence and rename rejected before use',()=>{
 for(const mutate of [f=>f.compare.files=Array.from({length:300},(_,i)=>({filename:'data-collection/'+i,status:'added'})),f=>f.compare.behind_by=1,f=>f.compare.files[0].previous_filename='x']){const f=fixture();mutate(f);assert.throws(()=>validateCompare(f.compare),/HOLD_/);}
});

test('exact combined review set and self bytes; no unreviewed documentation or executable changes',()=>{
 for(const mutate of [f=>f.compare.files.push({filename:'data-collection/unreviewed.md',status:'added'}),f=>f.compare.files.pop(),f=>f.selfDiff=true,f=>f.deps.selfBlobSha='wrong',f=>f.compare.files[0].status='removed']){
  const f=fixture();mutate(f);assert.throws(f.execute,/HOLD_P5_ENABLED_EXPIRY_REPIN_/);assert.deepEqual(f.mutations,[]);
 }
});
