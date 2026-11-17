'use strict';
const {handoff}=require('./p6_private_commission_repin_REVIEW_ONLY.cjs');
function mock(mode="configure",state="ABSENT"){
 const old="345f642e0df3266853a1f9d5e3f12fa262ddf1ee",sha="a".repeat(40),candidate="570c2e29784231c6ceffab8d620fbe2fd1887762",tree="ccf9f6665e3a8547476651a17efcf2261d32c53c";
 const R="HKcode22/ReplitTranvr",WF="phase5-primary-fids-expiry-no-provider.yml",PIN="P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA",MODE="P6_PRIVATE_EPOCH_EXPIRY_MODE",AP="P5_PRIMARY_FIDS_EXPIRY_APPROVAL",MAN="P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256";
 const vars={[PIN]:mode==="verify"||mode==="inspect-run"?sha:old,[MODE]:mode==="verify"||mode==="inspect-run"?"COMMISSION_VERIFY_ONLY":"OFF",P5_PRIMARY_FIDS_EXPIRY_ENABLED:"true",[AP]:"APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER",P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256:"b".repeat(64)};
 const z={vars,sha,tree,main:sha,mutations:[],confirm:true,state,ci:true,modeLost:false,pinLost:false,dispatchLost:false,receiptDrift:false,counter:0};
 const J=x=>JSON.stringify(x),common={providerCalls:0,databaseWrites:0,phase6PaidGo:false,backupOrPitrVerified:false,completeRetentionDeploymentVerified:false};
 const gh=(a,input)=>{
  if(a[0]==="variable"&&a[1]==="list")return J(Object.entries(vars).map(([name,value])=>({name,value})));
  if(a[0]==="variable"&&a[1]==="set"){const k=a[2];if(![MODE,PIN].includes(k))throw Error("UNSCOPED");z.mutations.push(k);vars[k]=a[6];if(k===MODE&&z.modeLost||k===PIN&&z.pinLost)throw Error("unknown");return "";}
  if(a[0]==="secret")return J(["P5_PRIMARY_FIDS_SWEEP_DATABASE_URL","P5_RETENTION_READER_DATABASE_URL"].map(name=>({name})));
  if(a[0]==="run"&&a[1]==="watch")return "";
  if(a[0]==="run"&&a[1]==="view")return J({status:"PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES",reviewedMainSha:sha,privateCommissionState:z.receiptDrift?"GRANTED":state,distinctDbActorsVerified:true,objectDeletions:0,...common,before:{schema:"v39.phase5.primary-fids-expiry-status.v1",observedAtUtc:"2026-11-17T14:00:00Z",liveOriginals:z.counter,eligibleOriginals:0,hardDueOriginals:0,eligibleNextHour:0,hardDueNextHour:0,unboundLiveOriginals:0,markedExpiredPayloadPresent:0,unlinkedUnexpiredPopulation:0,unexpiredPopulationWithoutLiveOriginal:0,deletionStopUnresolved:false,...common}});
  if(a[0]==="api"&&a[1]==="--method"){const p=JSON.parse(input);if(p.inputs.confirm!=="VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES"||p.inputs.approved_main_sha!==sha)throw Error("bad dispatch");z.mutations.push("verify");if(z.dispatchLost)throw Error("lost");return J({workflow_run_id:123});}
  const p=a[1].slice(("repos/"+R+"/").length);
  if(p==="git/ref/heads/main")return J({object:{sha:z.main}});
  if(p.startsWith("git/commits/"))return J({tree:{sha:z.tree}});
  if(p.startsWith("compare/"))return J({status:"ahead",base_commit:{sha:old},merge_base_commit:{sha:old},behind_by:0,ahead_by:1});
  if(p===`actions/workflows/${WF}`)return J({path:".github/workflows/"+WF,state:"active",id:23});
  if(p.startsWith("actions/runs/123/jobs"))return J({total_count:1,jobs:[{id:456,run_id:123,name:"primary-fids-expiry",status:"completed",conclusion:"success",steps:[{name:"Verify exact main and execute only bounded primary FIDS expiry",conclusion:"success"}]}]});
  if(p==="actions/runs/123")return J({id:123,workflow_id:23,head_sha:sha,head_branch:"main",event:"workflow_dispatch",run_attempt:1,status:"completed",conclusion:"success"});
  if(p.startsWith("actions/runs/"))return J({id:Number(p.split("/").at(-1)),head_sha:candidate,run_attempt:1,status:"completed",conclusion:z.ci?"success":"failure"});
  throw Error("unexpected "+p);
 };
 z.run=()=>handoff({gh,confirm:()=>z.confirm,report:()=>{}},mode,sha,state,mode==="inspect-run"?"123":undefined);return z;
}
const test=require('node:test'),{deepEqual:eq,ok:assert}=require('node:assert/strict');
(f,pattern,m)=>{let e;try{f.run()}catch(x){e=x}assert(e&&String(e).includes(pattern));eq(f.mutations,m)}
const M="P6_PRIVATE_EPOCH_EXPIRY_MODE",P="P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA";
test("review only",()=>{const f=mock("review");eq(f.run().status,"EXACT_PRIVATE_TRANSITION_REVIEW_ONLY");eq(f.mutations,[])});
test("configure and verify only",()=>{const f=mock();eq(f.run().privateCommissionState,"ABSENT");eq(f.mutations,[M,P,"verify"]);eq(f.vars.P5_PRIMARY_FIDS_EXPIRY_ENABLED,"true")});
test("resume known mode",()=>{const f=mock();f.vars[M]="COMMISSION_VERIFY_ONLY";f.run();eq(f.mutations,[P,"verify"])});
test("granted verify",()=>{const f=mock("verify","GRANTED");eq(f.run().privateCommissionState,"GRANTED");eq(f.mutations,["verify"])});
test("inspect without dispatch",()=>{const f=mock("inspect-run","GRANTED");f.run();eq(f.mutations,[])});
test("wrong tree",()=>{const f=mock();f.tree="x";reject(f,"EXACT_REVIEWED_MAIN_TREE_REQUIRED",[])});
test("failed CI",()=>{const f=mock();f.ci=false;reject(f,"CI_NOT_GREEN",[])});
test("decline",()=>{const f=mock();f.confirm=false;reject(f,"OWNER_DECLINED",[])});
test("manifest drift",()=>{const f=mock();f.vars.P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256="wrong";reject(f,"CONFIG_OR_PRIVATE_APPROVAL_DRIFT",[])});
test("lost mode ACK",()=>{const f=mock();f.modeLost=true;reject(f,"MODE_UPDATE_UNKNOWN",[M])});
test("lost pin ACK",()=>{const f=mock();f.pinLost=true;reject(f,"PIN_UPDATE_UNKNOWN",[M,P])});
test("lost dispatch ACK",()=>{const f=mock();f.dispatchLost=true;reject(f,"DISPATCH_UNKNOWN",[M,P,"verify"])});
test("wrong state",()=>{const f=mock();f.receiptDrift=true;reject(f,"VERIFY_RECEIPT_REVIEW_REQUIRED",[M,P,"verify"])});
test("nonzero counters",()=>{const f=mock();f.counter=1;reject(f,"VERIFY_RECEIPT_REVIEW_REQUIRED",[M,P,"verify"])});
