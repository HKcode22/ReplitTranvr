/**
 * Phase5 receiver deployment-admission evidence, read-only.
 * Never fetch/pull/reset git, never publish, read secrets, send HTTP POST or
 * call AeroDataBox. Public GET is to the user's own published runtime.
 */
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const REPO='HKcode22/ReplitTranvr';
const PIN='6c187d58e2b1339aace71079e27767523d8ca3ce';
const PUBLIC_URL='https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime';
const SHA=/^[0-9a-f]{40}$/;
const EXPECTED_BUILD='build = ["bash", "scripts/v39_phase5_callback_release_v2_reviewed_build_v39.sh"]';
const PROTECTED=['client','server','shared','package.json','package-lock.json',
 'scripts/build.ts','vite.config.ts','tsconfig.json','postcss.config.js',
 'tailwind.config.ts','components.json','drizzle.config.ts'];
function git(args,opts={}){
 try{return execFileSync('git',args,{encoding:'utf8',timeout:8000,maxBuffer:2*1024*1024,
  stdio:['ignore','pipe','ignore'],...opts}).trim();}
 catch{return null;}
}
function gh(args){
 try{return execFileSync('gh',args,{encoding:'utf8',timeout:12000,maxBuffer:512*1024,
  stdio:['ignore','pipe','ignore']}).trim();}
 catch{return null;}
}
const boolStatus=(args)=>spawnSync('git',args,{timeout:8000,stdio:'ignore'}).status===0;
const lineCount=(x)=>x===null?null:x===''?0:x.split('\n').length;
function publicOnlySnapshot(obj,httpStatus){
 const claimed=String(obj?.git_head??'').toLowerCase();
 return {
  httpStatus,validRuntime: httpStatus===200 &&
   obj?.schema==='v39.phase2f-workspace-runtime.v1' &&
   obj?.status==='PASS' &&
   obj?.published_deployment===true &&
   obj?.prepaid_route_registered===true,
  claimedPublishedGitSha:SHA.test(claimed)?claimed:null,
  publishedDeploymentFlag:obj?.published_deployment===true,
  autoscaleClaim:obj?.runtime_durability_class==='autoscale',
  prepaidSourceCustodyFlag:obj?.prepaid_source_custody_ready===true
 };
}
export function classifyReceiverReadiness(x){
 const reasons=[];
 if(!SHA.test(x.githubMainSha??''))reasons.push('LIVE_GITHUB_MAIN_NOT_VERIFIED');
 if(!SHA.test(x.workspaceHead??''))reasons.push('WORKSPACE_GIT_HEAD_NOT_VERIFIED');
 if(!x.headExistsOnGithub)reasons.push('WORKSPACE_HEAD_NOT_IN_GITHUB_REPO');
 if(x.workspaceHead!==x.githubMainSha)reasons.push('WORKSPACE_NOT_AT_REVIEWED_GITHUB_MAIN');
 if(x.trackedChangesCount!==0||x.untrackedFilesCount!==0)
  reasons.push('LOCAL_WORKTREE_OR_UNTRACKED_FILES_UNREVIEWED');
 if(x.localReviewedPinPresent!==true||x.localReviewedPinIsAncestor!==true)
  reasons.push('REVIEWED_RECEIVER_SOURCE_ANCESTRY_NOT_ESTABLISHED');
 if(x.protectedSourceIdenticalToPin!==true)
  reasons.push('PROTECTED_EXECUTABLES_NOT_IDENTICAL_TO_REVIEWED_PIN');
 if(x.buildConfigurationExact!==true)
  reasons.push('REVIEWED_CALLBACK_BUILD_CONFIGURATION_NOT_PRESENT');
 if(!x.publicRuntime.validRuntime)
  reasons.push('PUBLISHED_RUNTIME_INVALID_OR_UNAVAILABLE');
 if(x.publicRuntime.claimedPublishedGitSha!==PIN)
  reasons.push('PUBLISHED_CALLBACK_SOURCE_STALE_OR_UNKNOWN');
 // Webhook signed-external POST, storage durability and STOP remain beyond
 // what a public GET or filesystem metadata can ever certify.
 reasons.push('SIGNED_EXTERNAL_POST_RAW_FIRST_DURABLE_ACK_NOT_VERIFIED');
 reasons.push('RECEIVER_STOP_AND_PROVIDER_RECONCILIATION_NOT_VERIFIED');
 return {status:reasons.length>2?
  'HOLD_DEPLOYMENT_PROVENANCE_OR_RECEIVER_EVIDENCE':
  'REVIEWED_SOURCE_CANDIDATE_NOT_DEPLOYMENT_OR_SCIENCE_APPROVAL',
  blockers:[...new Set(reasons)],
  publishedReceiverScientificReady:false,
  phase5ScientificFreezePassed:false,phase6PaidGo:false};
}
export async function inspectReceiverReadiness(adapters={}){
 const gitImpl=adapters.git??git,ghImpl=adapters.gh??gh;
 const statusImpl=adapters.boolStatus??boolStatus;
 const filesImpl=adapters.readFileSync??readFileSync;
 const fetchImpl=adapters.fetch??fetch;
 const workspaceHead=gitImpl(['rev-parse','HEAD']);
 const branch=gitImpl(['symbolic-ref','--quiet','--short','HEAD']);
 const liveMain=ghImpl(['api','repos/'+REPO+'/git/ref/heads/main','--jq','.object.sha']);
 const headExistsOnGithub=SHA.test(workspaceHead??'') &&
  ghImpl(['api','repos/'+REPO+'/commits/'+workspaceHead,'--jq','.sha'])===workspaceHead;
 const pinned=gitImpl(['cat-file','-t',PIN])==='commit';
 const localPinAncestor=pinned&&statusImpl(['merge-base','--is-ancestor',PIN,'HEAD']);
 const diffSource= pinned && localPinAncestor ?
  statusImpl(['diff','--quiet',PIN,'HEAD','--',...PROTECTED]):false;
 let cfg=null;
 try{const s=filesImpl('.replit','utf8');cfg=s.split(/\r?\n/).filter(v=>v.trim().startsWith('build ='));}catch{}
 const exactBuild=Array.isArray(cfg)&&cfg.length===1&&cfg[0].trim()===EXPECTED_BUILD;
 const trackedCount=lineCount(gitImpl(['status','--porcelain','--untracked-files=no']));
 const untrackedCount=lineCount(gitImpl(['ls-files','--others','--exclude-standard']));
 let pub=publicOnlySnapshot(null,null);
 try{
  const response=await fetchImpl(PUBLIC_URL,{method:'GET',
    headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
  const raw=await response.text();
  if(raw.length<=16384){
   let parsed=null;try{parsed=JSON.parse(raw);}catch{}
   pub=publicOnlySnapshot(parsed,response.status);
  }else pub=publicOnlySnapshot(null,response.status);
 }catch{}
 const core={
  schema:'v39.phase5.receiver-readonly-deployment-admission.v1',
  reviewedCallbackSourcePin:PIN,
  githubMainSha:SHA.test(liveMain??'')?liveMain:null,
  workspaceHead:SHA.test(workspaceHead??'')?workspaceHead:null,
  workspaceBranch:branch&&/^[a-zA-Z0-9/._-]{1,100}$/.test(branch)?branch:null,
  headExistsOnGithub:Boolean(headExistsOnGithub),
  trackedChangesCount:trackedCount,
  untrackedFilesCount:untrackedCount,
  localReviewedPinPresent:pinned,
  localReviewedPinIsAncestor:Boolean(localPinAncestor),
  protectedSourceIdenticalToPin:Boolean(diffSource),
  buildConfigurationExact:Boolean(exactBuild),
  publicRuntime:pub};
 return {...core,...classifyReceiverReadiness(core),
  noGitCheckoutOrFetchOrReset:true,noPublisherAction:true,noPrivateFilesListed:true,
  noDatabaseReadOrMutation:true,noProviderHttpOrPaidCall:true};
}
if(process.env.P5_RECEIVER_READONLY_CLI==='1'){
 try{const x=await inspectReceiverReadiness();console.log(JSON.stringify(x));
  console.log('PHASE5_RECEIVER_PROVENANCE_READONLY_COMPLETE_NO_PUBLISH_NO_PROVIDER');}
 catch{console.error('HOLD_PHASE5_RECEIVER_PROVENANCE_INSPECTION_FAILED');process.exitCode=2;}
}
