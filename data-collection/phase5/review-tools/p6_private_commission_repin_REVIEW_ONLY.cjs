'use strict';
// REVIEW ONLY. Exact #864 candidate; no production execution on draft.
function handoff({gh,confirm,report},mode,sha,expectedState="ABSENT",inspectRunId){
 const R="HKcode22/ReplitTranvr",OLD="345f642e0df3266853a1f9d5e3f12fa262ddf1ee",CANDIDATE="570c2e29784231c6ceffab8d620fbe2fd1887762",TREE="ccf9f6665e3a8547476651a17efcf2261d32c53c";
 const WF="phase5-primary-fids-expiry-no-provider.yml",PIN="P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA",EN="P5_PRIMARY_FIDS_EXPIRY_ENABLED",AP="P5_PRIMARY_FIDS_EXPIRY_APPROVAL",EP="P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256",MODE="P6_PRIVATE_EPOCH_EXPIRY_MODE",MAN="P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256",PAP="P6_PRIVATE_EPOCH_EXPIRY_APPROVAL";
 const HOLD=x=>{throw Error("HOLD_P6_PRIVATE_REPIN_"+x);};
 const H=/^[a-f0-9]{40}$/,D=/^[a-f0-9]{64}$/,N=/^[1-9][0-9]*$/;
 if(!["review","configure","verify","inspect-run"].includes(mode)||!H.test(sha??"")||sha===OLD||!["ABSENT","INERT","GRANTED"].includes(expectedState)||(mode==="inspect-run"?!N.test(String(inspectRunId)):inspectRunId!==undefined)||(mode==="configure"&&expectedState!=="ABSENT"))HOLD("EXACT_ARGUMENTS");
 const api=p=>JSON.parse(gh(["api",`repos/${R}/${p}`]));
 const main=()=>{
  if(api("git/ref/heads/main")?.object?.sha!==sha||api(`git/commits/${sha}`)?.tree?.sha!==TREE)HOLD("EXACT_REVIEWED_MAIN_TREE_REQUIRED");
 };
 main();
 const comparison=api(`compare/${OLD}...${sha}`);
 if(comparison.status!=="ahead"||comparison.base_commit?.sha!==OLD||comparison.merge_base_commit?.sha!==OLD||comparison.behind_by!==0||comparison.ahead_by<1)HOLD("BASELINE_ANCESTRY");
 // Exact candidate tree equality gives full content identity even for squash merge.
 const runIds=[44104067148,44104066978,44104066897,44104066919,44104066916,44104066931,44104066923];
 for(const id of runIds){const x=api(`actions/runs/${id}`);if(x.id!==id||x.head_sha!==CANDIDATE||x.run_attempt!==1||x.status!=="completed"||x.conclusion!=="success")HOLD("EXACT_CANDIDATE_CI_NOT_GREEN");}
 const workflow=api(`actions/workflows/${WF}`);
 if(workflow.path!==`.github/workflows/${WF}`||workflow.state!=="active"||!Number.isSafeInteger(workflow.id))HOLD("WORKFLOW_NOT_ACTIVE");
 const secrets=JSON.parse(gh(["secret","list","-R",R,"--json","name"]));
 if(!["P5_PRIMARY_FIDS_SWEEP_DATABASE_URL","P5_RETENTION_READER_DATABASE_URL"].every(k=>secrets.filter(x=>x.name===k).length===1))HOLD("EXISTING_SECRETS");
 const config=()=>{
  const values=JSON.parse(gh(["variable","list","-R",R,"--json","name,value"]));
  if(new Set(values.map(x=>x.name)).size!==values.length)HOLD("DUPLICATE_CONFIG");
  const v=new Map(values.map(x=>[x.name,x.value]));
  if(v.get(EN)!=="true"||v.get(AP)!=="APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER"||!D.test(v.get(EP)??"")||v.get(MAN)||v.get(PAP))HOLD("EXISTING_PRIMARY_CONFIG_OR_PRIVATE_APPROVAL_DRIFT");
  const pin=v.get(PIN),m=v.get(MODE)||"OFF";
  if(![OLD,sha].includes(pin)||!["OFF","COMMISSION_VERIFY_ONLY"].includes(m)||pin===sha&&m!=="COMMISSION_VERIFY_ONLY")HOLD("CONFIG_TRANSITION_DRIFT");
  return {pin,mode:m,endpoint:v.get(EP)};
 };
 const before=config();
 const check=(pin,m)=>{main();const x=config();if(x.pin!==pin||x.mode!==m||x.endpoint!==before.endpoint)HOLD("CONFIG_READBACK_MISMATCH");main();};
 if(mode==="review")return {status:"EXACT_PRIVATE_TRANSITION_REVIEW_ONLY",reviewedMainSha:sha,candidate:CANDIDATE,tree:TREE,pinAlreadyCurrent:before.pin===sha,transitionMode:before.mode,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 if(mode==="configure"){
  if(before.pin!==OLD)HOLD("PIN_ALREADY_UPDATED_INSPECT_OR_VERIFY_NO_REPLAY");
  if(!confirm("REPIN EXISTING PRIMARY TO "+sha+" AND COMMISSION VERIFY ONLY"))HOLD("OWNER_DECLINED");
  check(OLD,before.mode);
  if(before.mode==="OFF"){
   try{gh(["variable","set",MODE,"-R",R,"--body","COMMISSION_VERIFY_ONLY"]);}catch{HOLD("MODE_UPDATE_UNKNOWN_INSPECT_NO_REPLAY");}
  }
  check(OLD,"COMMISSION_VERIFY_ONLY");
  try{gh(["variable","set",PIN,"-R",R,"--body",sha]);}catch{HOLD("PIN_UPDATE_UNKNOWN_INSPECT_NO_REPLAY");}
 }
 check(sha,"COMMISSION_VERIFY_ONLY");
 report({status:"EXISTING_PRIMARY_PIN_TRANSITION_READ_BACK",reviewedMainSha:sha,privateMutationEnabled:false,providerCalls:0,phase6PaidGo:false});
 let id=Number(inspectRunId);
 if(mode!=="inspect-run"){
  if(mode==="verify"&&!confirm("DISPATCH VERIFY ONLY "+sha+" EXPECT "+expectedState))HOLD("OWNER_DECLINED");
  check(sha,"COMMISSION_VERIFY_ONLY");
  try{id=JSON.parse(gh(["api","--method","POST",`repos/${R}/actions/workflows/${WF}/dispatches`,"--input","-"],JSON.stringify({ref:"main",return_run_details:true,inputs:{confirm:"VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES",approved_main_sha:sha}}))).workflow_run_id;}catch{HOLD("DISPATCH_UNKNOWN_INSPECT_NO_REPLAY");}
  if(!Number.isSafeInteger(id)||id<1)HOLD("RUN_ID_UNKNOWN_INSPECT_NO_REPLAY");
  report({status:"VERIFY_ONLY_DISPATCHED",runId:id,reviewedMainSha:sha,expectedState,phase6PaidGo:false});
  try{gh(["run","watch",String(id),"-R",R,"--interval","10","--exit-status"],undefined,900000);}catch{HOLD("VERIFY_NOT_CONFIRMED_INSPECT_EXISTING_RUN");}
 }
 const run=api(`actions/runs/${id}`),jobs=api(`actions/runs/${id}/jobs?per_page=100`);
 if(run.id!==id||run.workflow_id!==workflow.id||run.head_sha!==sha||run.head_branch!=="main"||run.event!=="workflow_dispatch"||run.run_attempt!==1||run.status!=="completed"||run.conclusion!=="success"||jobs.total_count!==1||jobs.jobs?.length!==1)HOLD("EXACT_VERIFY_RUN");
 const job=jobs.jobs[0];
 if(job.run_id!==id||job.name!=="primary-fids-expiry"||job.conclusion!=="success"||job.status!=="completed"||job.steps?.filter(s=>s.name==="Verify exact main and execute only bounded primary FIDS expiry"&&s.conclusion==="success").length!==1)HOLD("EXACT_VERIFY_JOB");
 const log=gh(["run","view",String(id),"-R",R,"--job",String(job.id),"--log"]);
 const hits=log.split("\n").filter(s=>s.includes('"status":"PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES"'));
 if(hits.length!==1)HOLD("UNIQUE_VERIFY_RECEIPT");
 let v;try{v=JSON.parse(hits[0].slice(hits[0].indexOf("{")));}catch{HOLD("INVALID_VERIFY_RECEIPT");}
 const counters=["liveOriginals","eligibleOriginals","hardDueOriginals","eligibleNextHour","hardDueNextHour","unboundLiveOriginals","markedExpiredPayloadPresent","unlinkedUnexpiredPopulation","unexpiredPopulationWithoutLiveOriginal"];
 const b=v.before;
 if(v.reviewedMainSha!==sha||v.privateCommissionState!==expectedState||v.distinctDbActorsVerified!==true||v.providerCalls!==0||v.databaseWrites!==0||v.objectDeletions!==0||v.phase6PaidGo!==false||v.backupOrPitrVerified!==false||v.completeRetentionDeploymentVerified!==false||!b||b.schema!=="v39.phase5.primary-fids-expiry-status.v1"||counters.some(k=>b[k]!==0)||b.deletionStopUnresolved!==false||b.providerCalls!==0||b.databaseWrites!==0||b.phase6PaidGo!==false||b.backupOrPitrVerified!==false||b.completeRetentionDeploymentVerified!==false||!Number.isFinite(Date.parse(b.observedAtUtc)))HOLD("VERIFY_RECEIPT_REVIEW_REQUIRED");
 check(sha,"COMMISSION_VERIFY_ONLY");
 return {status:"PRIVATE_COMMISSION_TRANSITION_PRIMARY_VERIFY_NO_GO",runId:id,jobId:job.id,reviewedMainSha:sha,privateCommissionState:expectedState,observedAtUtc:b.observedAtUtc,allPrimaryCountersZero:true,scheduledApplyEnabled:true,manualApplyDispatched:false,privateApplyEnabled:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
module.exports={handoff};
if(require.main===module){try{
 if(process.env.GITHUB_ACTIONS==='true'||process.argv.length<4||process.argv.length>6)throw Error('HOLD_P6_PRIVATE_REPIN_OWNER_LOCAL_ARGUMENTS');
 const {execFileSync}=require('node:child_process'),fs=require('node:fs');
 const gh=(args,input,timeout=30000)=>execFileSync('gh',args,{encoding:'utf8',input,timeout,maxBuffer:20*1024*1024,stdio:['pipe','pipe','ignore']});
 const confirm=message=>{const fd=fs.openSync('/dev/tty','r+');try{fs.writeSync(fd,'Type '+message+': ');let line='',b=Buffer.alloc(1);while(line.length<200&&fs.readSync(fd,b,0,1,null)===1&&b[0]!==10)line+=b.toString();return line===message;}finally{fs.closeSync(fd);}};
 const report=x=>console.log(JSON.stringify(x));report(handoff({gh,confirm,report},...process.argv.slice(2)));
}catch(e){const m=String(e?.message??'');console.error(/^HOLD_P6_PRIVATE_REPIN_[A-Z_]+$/.test(m)?m:'HOLD_P6_PRIVATE_REPIN_REDACTED_INSPECT_NO_REPLAY');process.exitCode=2;}}
