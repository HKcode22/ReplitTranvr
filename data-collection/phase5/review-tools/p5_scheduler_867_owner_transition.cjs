'use strict';
// Owner-local exact scheduler deployment; no provider, no DB connection,
// no new migrations, no changes to STOP/enable/approval/secret settings.
// This is a one-time operational handoff, not a new controller.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const REPO='HKcode22/ReplitTranvr';
const OLD='6f518add10d00567a95fbcaf3650ebf608da8a60';
const HEAD='81fa45d245fef9817d4b312948f8fe79a95ea8d0';
const TREE='04cd4ef60eb449b93a3061037401a511d39a73e7';
const PR=867;
const CI=[44235572684,44235572292,44235572165,44235572502,44235572445,44235572207,44235572169,44235572178,44235572247,44235572174,44235572434];
const HELPER='4bb2c19926a0b5adcbb5856514598d3b92990716';
const PIN='P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA', ENABLE='P5_PRIMARY_FIDS_EXPIRY_ENABLED',
 APPROVAL='P5_PRIMARY_FIDS_EXPIRY_APPROVAL', ENDPOINT='P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256',
 APPLY='APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER';
const EXPIRY='phase5-primary-fids-expiry-no-provider.yml', CANARY='phase5-autonomous-clock-canary-no-provider.yml';
const hold=s=>{throw Error('HOLD_P5_SCHEDULER_TRANSITION_'+s);};
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const id=x=>Number.isSafeInteger(x)&&x>0;
const apiRoot='https://api.github.com/repos/'+REPO;
function checkAck(x){
 if(!id(x?.workflow_run_id)||x.run_url!==apiRoot+'/actions/runs/'+x.workflow_run_id||x.html_url!=='https://github.com/'+REPO+'/actions/runs/'+x.workflow_run_id)hold('UNKNOWN_ACK_NO_REPLAY');
 return x.workflow_run_id;
}
function checkPr(p){
 if(p?.number!==PR||p.state!=='open'||p.merged!==false||p.base?.ref!=='main'||p.base?.sha!==OLD||
    p.head?.sha!==HEAD||p.head?.repo?.full_name!==REPO||p.mergeable!==true)hold('EXACT_PR_REVIEW_REQUIRED');
}
function checkCi(r,runId){
 if(r?.id!==runId||r.head_sha!==HEAD||r.event!=='pull_request'||r.status!=='completed'||r.conclusion!=='success'||
    r.repository?.full_name!==REPO)hold('CI_NOT_EXACT_SUCCESS');
}
function checkMainCommit(c,s){
 if(c?.sha!==s||c.commit?.tree?.sha!==TREE||!Array.isArray(c.parents)||c.parents.length!==2||c.parents[0]?.sha!==OLD||c.parents[1]?.sha!==HEAD)
  hold('UNEXPECTED_MERGE_TREE_OR_PARENTS');
}
function makeConfig(get,expected,endpoint){
 if(get(PIN)!==expected||get(ENABLE)!=='true'||get(APPROVAL)!==APPLY||
    get('P6_PRIVATE_EPOCH_EXPIRY_MODE')!=='COMMISSION_VERIFY_ONLY')hold('EXISTING_RETENTION_CONFIG_DRIFT');
 const e=get(ENDPOINT);
 if(!/^[a-f0-9]{64}$/.test(e)||endpoint&&endpoint!==e)hold('ENDPOINT_DRIFT');
 return e;
}
async function execute({gh,record,verifyReceipt,randomChain,now=Date.now}){
 const api=(p,method='GET',body)=>{
  if((method==='GET')!==(body===undefined))hold('API_BODY_METHOD');
  const args=['api','--hostname','github.com','--method',method,'-H','Accept: application/vnd.github+json','-H','X-GitHub-Api-Version: 2022-11-28','repos/'+REPO+'/'+p];
  // gh api ignores piped stdin without --input -. Bind actual JSON to the request.
  if(body!==undefined)args.push('--input','-');
  try{return JSON.parse(gh(args,body===undefined?undefined:JSON.stringify(body)));}
  catch(e){
   const http=/\bHTTP (\d{3})\b/.exec(String(e?.stderr??''))?.[1];
   // Do not print response body, credentials or arbitrary CLI errors.
   hold(http?'API_HTTP_'+http+'_INSPECT_NO_REPLAY':'API_RESPONSE_UNKNOWN_INSPECT_NO_REPLAY');
  }
 };
 const get=k=>gh(['variable','get',k,'-R',REPO]).trim();
 const main=()=>api('git/ref/heads/main')?.object?.sha;
 const stable=(p,e)=>{if(main()!==p)hold('MAIN_MOVED');const v=makeConfig(get,p,e);if(main()!==p)hold('MAIN_MOVED');return v;};
 const backstop=()=>{const xs=JSON.parse(gh(['variable','list','-R',REPO,'--json','name,value','--jq','[.[] | select(.name=="P5_PRIMARY_FIDS_BACKSTOP_ENABLED")]']));const v=xs.filter(x=>x.name==='P5_PRIMARY_FIDS_BACKSTOP_ENABLED');if(v.length>1||v.some(x=>x.value!=='false'))hold('BACKSTOP_NOT_OFF');};
 const workflow=wf=>{const w=api('actions/workflows/'+wf);if(!id(w.id)||w.path!=='.github/workflows/'+wf||w.state!=='active')hold('WORKFLOW_INACTIVE');return w;};
 // Avoid replacing an already-pending cleanup run. Native cron may still race
 // after this read, so the exact acknowledged job must independently complete.
 const noActive=(wf,manualOnly=false)=>{for(const status of ['queued','in_progress','pending','waiting','requested']){
  const a=api('actions/workflows/'+wf+'/runs?branch=main&status='+status+'&per_page=100'+(manualOnly?'&event=workflow_dispatch':''));
  if(a?.total_count!==0||!Array.isArray(a.workflow_runs)||a.workflow_runs.length!==0)hold('ACTIVE_WORKFLOW_REVIEW');
 }};
 const dispatch=(wf,inputs,stage)=>{
  record({stage:stage+'_ATTEMPT_NO_REPLAY'});
  const r=checkAck(api('actions/workflows/'+wf+'/dispatches','POST',{ref:'main',return_run_details:true,inputs}));
  record({stage:stage+'_ACK',runId:r,url:'https://github.com/'+REPO+'/actions/runs/'+r});return r;
 };
 const verify=(p,stage)=>{
  const w=workflow(EXPIRY);noActive(EXPIRY);
  const rid=dispatch(EXPIRY,{confirm:'VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES',approved_main_sha:p},stage);
  gh(['run','watch',String(rid),'-R',REPO,'--interval','10','--exit-status'],undefined,900000);
  const run=api('actions/runs/'+rid),jobs=api('actions/runs/'+rid+'/jobs?filter=latest&per_page=100');
  if(jobs?.total_count!==1||jobs.jobs?.length!==1||!id(jobs.jobs[0].id))hold('VERIFY_JOB');
  const log=gh(['run','view',String(rid),'-R',REPO,'--job',String(jobs.jobs[0].id),'--log']);
  const evidence=verifyReceipt(run,jobs,log,p,rid,w.id);
  record({stage:stage+'_VERIFIED',...evidence});return evidence;
 };
 // The previous journal shows exactly one attempted READ-ONLY VERIFY POST,
 // no merge or repin. Reconcile the bounded actual run history before a new
 // verification; absence is not a proof the server never accepted a request.
 const priorStart='2026-11-18T05:02:06Z';
 if(now()<Date.parse(priorStart)+120000)hold('PRIOR_VERIFY_OBSERVATION_TOO_EARLY');
 const prior=api('actions/runs?branch=main&event=workflow_dispatch&created='+encodeURIComponent('>='+priorStart)+'&per_page=100');
 if(!Number.isSafeInteger(prior?.total_count)||prior.total_count<0||prior.total_count>100||
    !Array.isArray(prior.workflow_runs)||prior.workflow_runs.length!==prior.total_count)hold('PRIOR_HISTORY_INCOMPLETE');
 if(prior.workflow_runs.some(r=>r.path==='.github/workflows/'+EXPIRY))hold('PREVIOUS_VERIFY_MATERIALIZED_INSPECT');
 record({stage:'PRIOR_READONLY_VERIFY_HISTORY_RECONCILED',priorDispatchSinceUtc:priorStart,matchingRuns:0,acceptedButUnobservedNotExcluded:true});
 if(main()!==OLD)hold('OLD_MAIN_REQUIRED');
 checkPr(api('pulls/'+PR));for(const rid of CI)checkCi(api('actions/runs/'+rid),rid);
 if(api('commits/'+HEAD)?.commit?.tree?.sha!==TREE)hold('HEAD_TREE_DRIFT');
 backstop();
 const endpoint=stable(OLD);
 const names=JSON.parse(gh(['secret','list','-R',REPO,'--json','name']));
 for(const n of ['P5_PRIMARY_FIDS_SWEEP_DATABASE_URL','P5_RETENTION_READER_DATABASE_URL'])
  if(names.filter(x=>x.name===n).length!==1)hold('SCOPED_SECRET_NAME_MISSING');
 // The last inspected cleanup is hours old. Obtain current zero-counter
 // evidence BEFORE a production pin transition. Never invoke APPLY manually.
 verify(OLD,'BEFORE_MERGE_VERIFY');stable(OLD,endpoint);backstop();
 const p=api('pulls/'+PR);checkPr(p);
 if(p.draft){record({stage:'MARK_PR_READY'});gh(['pr','ready',String(PR),'-R',REPO]);}
 checkPr(api('pulls/'+PR));stable(OLD,endpoint);
 record({stage:'EXACT_MERGE_ATTEMPT_NO_REPLAY',oldMain:OLD,head:HEAD});
 const m=api('pulls/'+PR+'/merge','PUT',{sha:HEAD,merge_method:'merge'});
 if(m.merged!==true||!sha(m.sha))hold('MERGE_UNKNOWN_INSPECT_IMMEDIATELY');
 const next=m.sha;record({stage:'MERGE_ACK_REPIN_REQUIRED',newMain:next});
 if(main()!==next)hold('POST_MERGE_MAIN_DRIFT');
 checkMainCommit(api('commits/'+next),next);
 // Do not change enable, approval, endpoint, credentials or mode.
 makeConfig(get,OLD,endpoint);if(main()!==next)hold('PRE_REPIN_MAIN_DRIFT');
 record({stage:'REPIN_ATTEMPT_NO_REPLAY',newMain:next});
 gh(['variable','set',PIN,'-R',REPO,'--body',next]);
 stable(next,endpoint);record({stage:'RETENTION_PIN_READBACK',newMain:next});
 verify(next,'AFTER_MERGE_VERIFY');stable(next,endpoint);backstop();
 workflow(CANARY);noActive(CANARY,true);
 // One nonpaid three-hop sustained test; no root auto restart.
 const chain=randomChain();if(!/^[a-f0-9]{32}$/.test(chain))hold('CHAIN');
 const end=new Date(now()+180*60000).toISOString();
 const runId=dispatch(CANARY,{mode:'ROLLING_REHEARSAL',handoff_confirm:'REHEARSE_THREE_SUSTAINED_GITHUB_CLOCK_SESSIONS_NO_PROVIDER_NO_DB',approved_main_sha:next,chain_id:chain,hop:'0',parent_run_id:'0',sent_at_utc:'',deadline_utc:end},'SUSTAINED_TEST');
 const result={stage:'EXACT_REPIN_VERIFIED_AND_SUSTAINED_TEST_ACKNOWLEDGED',newMain:next,chainId:chain,runId,deadlineUtc:end,providerCalls:0,manualApplyDispatched:false,phase6PaidGo:false};
 record(result);return result;
}
async function main(){
 if(process.argv.length!==3||process.env.GITHUB_ACTIONS==='true')hold('OWNER_LOCAL_REQUIRED');
 const helperPath=process.argv[2];const b=fs.readFileSync(helperPath);
 const h=crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');if(h!==HELPER)hold('EXACT_EXISTING_HELPER_BYTES');
 const oldState=path.join(os.homedir(),'.travnr-p5-scheduler-transition-867.jsonl');
 const history=fs.readFileSync(oldState,'utf8').trim().split('\n').map(x=>JSON.parse(x));
 if(history.length!==3||history[0].stage!=='OWNER_TRANSITION_STARTED'||history[0].oldMain!==OLD||history[0].reviewedHead!==HEAD||
    history[1].stage!=='BEFORE_MERGE_VERIFY_ATTEMPT_NO_REPLAY'||history[1].utc!=='2026-11-18T05:02:06.988Z'||
    history[2].stage!=='HOLD_INSPECT_STATE_NO_BLIND_REPLAY'||history[2].reason!=='UNKNOWN_OR_COMMAND_FAILED')hold('PRIOR_JOURNAL_CHANGED_REVIEW_REQUIRED');
 const state=path.join(os.homedir(),'.travnr-p5-scheduler-transition-867-recovery-v2.jsonl');
 const fd=fs.openSync(state,'wx',0o600);
 const record=x=>{const v={utc:new Date().toISOString(),...x};fs.appendFileSync(fd,JSON.stringify(v)+'\n');fs.fsyncSync(fd);console.log(JSON.stringify(v));};
 const gh=(args,input,timeout=30000)=>cp.execFileSync('gh',args,{encoding:'utf8',input,timeout,maxBuffer:20*1024*1024,stdio:['pipe','pipe','pipe']});
 try{
  record({stage:'OWNER_TRANSITION_STARTED',stateFile:state,oldMain:OLD,reviewedHead:HEAD});
  await execute({gh,record,verifyReceipt:require(path.resolve(helperPath)).verifyReceipt,randomChain:()=>crypto.randomBytes(16).toString('hex')});
 }catch(e){record({stage:'HOLD_INSPECT_STATE_NO_BLIND_REPLAY',reason:/^HOLD_[A-Z0-9_]+$/.test(e?.message??'')?e.message:'UNKNOWN_OR_COMMAND_FAILED'});throw e;}
 finally{fs.closeSync(fd);}
}
module.exports={execute,checkAck,checkPr,checkCi,checkMainCommit,makeConfig,OLD,HEAD,TREE,CI,REPO,PR,HELPER,PIN,ENABLE,APPROVAL,ENDPOINT,APPLY,EXPIRY,CANARY};
if(require.main===module)main().catch(e=>{console.error(/^HOLD_[A-Z0-9_]+$/.test(e?.message??'')?e.message:'HOLD_TRANSITION_INSPECT_JOURNAL_NO_REPLAY');process.exitCode=2;});
