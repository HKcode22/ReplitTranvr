import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectReceiverReadiness,classifyReceiverReadiness
} from '../scripts/v39_phase5_replit_receiver_deployment_readonly_once.mjs';
const PIN='1ca938bece03b90ab952f1bb762f25aedb5ede18';
const MAIN='329490356422d5af01594fb49ef05949168ee60f';
function fake({oldPub=false,localOnly=false,dirty=false,fetchFail=false}={}){
 const commands=[];
 const git=(args)=>{
  commands.push(['git',...args]);
  if(args[0]==='rev-parse')return localOnly?'b'.repeat(40):MAIN;
  if(args[0]==='symbolic-ref')return 'main';
  if(args[0]==='cat-file')return 'commit';
  if(args[0]==='status')return dirty?' M server/index.ts':'';
  if(args[0]==='ls-files')return '';
  throw Error('UNEXPECTED_GIT_SUBPROCESS');
 };
 const gh=(args)=>{
  commands.push(['gh',...args]);
  if(args[1]==='repos/HKcode22/ReplitTranvr/git/ref/heads/main')return MAIN;
  if(args[1]?.startsWith('repos/HKcode22/ReplitTranvr/commits/'))
    return localOnly?'':MAIN;
  throw Error('UNEXPECTED_GH_SUBPROCESS');
 };
 const boolStatus=(args)=>{
  commands.push(['git',...args]);
  return true;
 };
 const readFileSync=(p)=>{
  assert.equal(p,'.replit');
  return '[deployment]\nbuild = ["bash", "scripts/v39_phase5_reviewed_source_build_v39.sh"]\n';
 };
 const fetch=async(u,opt)=>{
  assert.equal(u,'https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime');
  assert.equal(opt.method,'GET');
  if(fetchFail)throw Error('HOST_OFFLINE');
  return {status:200,text:async()=>JSON.stringify({
   schema:'v39.phase2f-workspace-runtime.v1',status:'PASS',
   published_deployment:true,prepaid_route_registered:true,
   runtime_durability_class:'autoscale',prepaid_source_custody_ready:true,
   git_head:oldPub?'84b7f1565d0402facc8c3b9aacedc599eb6e2af1':PIN,
   hypothetical_secret:'DO_NOT_EMIT'
  })};
 };
 return {adapters:{git,gh,boolStatus,readFileSync,fetch},commands};
}
test('clean equivalent checkout with reviewed public pin remains not scientific RELEASE',async()=>{
 const m=fake();
 const a=await inspectReceiverReadiness(m.adapters);
 assert.equal(a.status,'REVIEWED_SOURCE_CANDIDATE_NOT_DEPLOYMENT_OR_SCIENCE_APPROVAL');
 assert.equal(a.reviewedCallbackSourcePin,PIN);
 assert.equal(a.publicRuntime.claimedPublishedGitSha,PIN);
 assert.equal(a.phase6PaidGo,false);
 assert.equal(a.publishedReceiverScientificReady,false);
 assert.equal(a.noPublisherAction,true);
 assert(!JSON.stringify(a).includes('DO_NOT_EMIT'));
 assert.deepEqual(a.blockers,['SIGNED_EXTERNAL_POST_RAW_FIRST_DURABLE_ACK_NOT_VERIFIED',
 'RECEIVER_STOP_AND_PROVIDER_RECONCILIATION_NOT_VERIFIED']);
 assert(m.commands.every(parts=>!/\b(fetch|pull|reset|checkout|clean|push|publish|secret)\b/i.test(parts.join(' '))));
});
test('old published source is real HOLD even if Replit published successfully',async()=>{
 const m=fake({oldPub:true});
 const a=await inspectReceiverReadiness(m.adapters);
 assert.equal(a.publicRuntime.validRuntime,true);
 assert(a.blockers.includes('PUBLISHED_CALLBACK_SOURCE_STALE_OR_UNKNOWN'));
 assert.equal(a.status,'HOLD_DEPLOYMENT_PROVENANCE_OR_RECEIVER_EVIDENCE');
});
test('local-only commit is a retention/custody blocker; no reset',async()=>{
 const m=fake({localOnly:true});
 const a=await inspectReceiverReadiness(m.adapters);
 assert.equal(a.headExistsOnGithub,false);
 assert(a.blockers.includes('WORKSPACE_HEAD_NOT_IN_GITHUB_REPO'));
 assert(a.blockers.includes('WORKSPACE_NOT_AT_REVIEWED_GITHUB_MAIN'));
 assert.equal(a.noGitCheckoutOrFetchOrReset,true);
 assert(m.commands.every(parts=>!['reset','pull','fetch','checkout','clean'].includes(parts[1])));
});
test('dirty executable and unreviewed local workspace cannot publish',async()=>{
 const a=await inspectReceiverReadiness(fake({dirty:true}).adapters);
 assert.equal(a.trackedChangesCount,1);
 assert(a.blockers.includes('LOCAL_WORKTREE_OR_UNTRACKED_FILES_UNREVIEWED'));
});
test('public network unavailable is HOLD not proof that service is gone',async()=>{
 const a=await inspectReceiverReadiness(fake({fetchFail:true}).adapters);
 assert.equal(a.publicRuntime.validRuntime,false);
 assert(a.blockers.includes('PUBLISHED_RUNTIME_INVALID_OR_UNAVAILABLE'));
});
test('host response alone does not convert signed POST flags into proof',()=>{
 const x=classifyReceiverReadiness({
  githubMainSha:MAIN,workspaceHead:MAIN,headExistsOnGithub:true,
  trackedChangesCount:0,untrackedFilesCount:0,localReviewedPinPresent:true,
  localReviewedPinIsAncestor:true,protectedSourceIdenticalToPin:true,
  buildConfigurationExact:true,
  publicRuntime:{validRuntime:true,claimedPublishedGitSha:PIN}
 });
 assert.equal(x.status,'REVIEWED_SOURCE_CANDIDATE_NOT_DEPLOYMENT_OR_SCIENCE_APPROVAL');
 assert.equal(x.phase5ScientificFreezePassed,false);
});
