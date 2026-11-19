'use strict';
// Rebind only the three reviewed #876 paths after exact production merge.
// No approval creation, no DB, provider, secret or GitHub mutation.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const R='HKcode22/ReplitTranvr',OLD='ea89308f468494d848f549539200f73f848a4fa7',HEAD='255c029f721d6eec8de199df183ba8e909b31ec8';
const OT='d4d976f2bd67f01137ac46a2d09c74a2c8113780',NT='e84f9e599187bd76792661799fa4ca881314ae4d';
const M='e5315b35fb8978d1de823bb1953191d976ccf093594a656890fb16d91f88a3e0',I='af8122be433b471ef09091f194a9a3d275514fa8240e337ccfec505288ceaa17';
const CFG='4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb',CAL='7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c',DRAFT='db1645f302e7840455938e88738c3b895bea808ea2b3132eaff959551214a46e';
const IDX='6b626c5f34a0891d1322eb150d97456a7ed95d02',LEDGER='data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json',LB='cddbeb12d27fb0e6b18195950a8f0333c88443aa';
const EXPECT=[
 ['scripts/v39_phase6_direct_recovery_tick_v39.mjs','53e0b5e7b3a1b67c8b3c30c56dd702bad132f4fd','d3d97a81a1f541ca47d29fae84085460b8c000c2'],
 ['server/lib/disruption/phase6RollingGithubController_v39.mjs','9e0577b68b471134dcfa64302334491806233cc9','8454fb6ec18df8de3bcf83db0669d3b8505ae932'],
 ['tests/phase6_direct_recovery_tick_v39.test.mjs','1b4b7571ee37498a012c4d4914769de839b47c0b','2e89fe532934b371c766dc6982feed2df7c8a277']
];
const need=(x,k)=>{if(!x)throw Error('HOLD_P5_876_MANIFEST_'+k);},sha=x=>/^[a-f0-9]{40}$/.test(x??''),h=b=>crypto.createHash('sha256').update(b).digest('hex'),bytes=x=>Buffer.from(JSON.stringify(x));
const blobHash=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const scope=p=>/^(?:server|scripts|migrations|tests|shared|client|patches|\.github\/(?:workflows|actions))\//.test(p)||/^(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|tsconfig(?:\.[\w-]+)?\.json|[\w-]+\.config\.[cm]?[jt]s|\.npmrc|\.nvmrc|\.node-version)$/.test(p);
function api(s){return JSON.parse(execFileSync('gh',['api','--hostname','github.com','--method','GET','repos/'+R+'/'+s],{encoding:'utf8',timeout:45000,maxBuffer:24*1024*1024,stdio:['ignore','pipe','pipe'],env:{...process.env,GH_PROMPT_DISABLED:'1'}}));}
function main(){return api('git/ref/heads/main').object.sha}
function blob(s){const a=api('git/blobs/'+s);need(a.sha===s&&a.encoding==='base64','BLOB_METADATA');const b=Buffer.from(a.content,'base64');need(b.length===a.size&&blobHash(b)===s,'BLOB_BYTES');return b}
function tree(s){const a=api('git/trees/'+s+'?recursive=1');need(a.sha===s&&a.truncated===false&&Array.isArray(a.tree)&&new Set(a.tree.map(x=>x.path)).size===a.tree.length,'INCOMPLETE_TREE');return new Map(a.tree.filter(x=>x.type==='blob').map(x=>[x.path,x]));}
function validateTreeDelta(a,b){
 const delta=[...new Set([...a.keys(),...b.keys()])].sort().filter(p=>a.get(p)?.sha!==b.get(p)?.sha||a.get(p)?.mode!==b.get(p)?.mode).map(p=>[p,a.get(p)?.sha??null,b.get(p)?.sha??null]);
 need(JSON.stringify(delta)===JSON.stringify(EXPECT),'OTHER_TREE_DELTA');
 need(EXPECT.every(([p])=>a.get(p).mode===b.get(p).mode&&scope(p)),'MODE_DRIFT');
 const old=[...a].filter(([p])=>scope(p)),next=[...b].filter(([p])=>scope(p));
 need(old.length===2188&&next.length===2188,'INVENTORY_COUNT');
 return new Map(next);
}
function verifyMerge(commit,pr,live){
 need(sha(live)&&live!==OLD&&live!==HEAD&&pr.merged===true&&pr.head?.sha===HEAD&&pr.base?.ref==='main'&&pr.merge_commit_sha===live,'NOT_EXACT_MERGED_PR');
 need(commit.sha===live&&commit.tree?.sha===NT&&commit.parents?.length===2&&commit.parents[0].sha===OLD&&commit.parents[1].sha===HEAD,'MERGE_PARENT_OR_TREE');
}
function readPrivate(dir,name,expected){
 const p=path.join(dir,name),st=fs.lstatSync(p);
 need(st.isFile()&&(st.mode&0o077)===0&&st.size>0&&st.size<2*1024*1024,'PRIVATE_FILE_SCOPE');
 const raw=fs.readFileSync(p);need(h(raw)===expected,'PRIOR_FILE_DIGEST');
 const x=JSON.parse(raw);need(bytes(x).equals(raw),'PRIOR_CANONICAL_BYTES');return x;
}
function isPrivateDir(p){try{const s=fs.lstatSync(p);return s.isDirectory()&&(s.mode&0o077)===0}catch(e){if(e.code==='ENOENT')return false;throw e}}
function findPrior(home){
 const dirs=[];
 for(const e of fs.readdirSync(home,{withFileTypes:true})){
  if(!e.isDirectory()||!/^\.phase5-final-review-[A-Za-z0-9]+$/.test(e.name))continue;
  const d=path.join(home,e.name,'nov18-'+OLD.slice(0,12));if(!isPrivateDir(d))continue;
  try{readPrivate(d,'manifest-candidate.json',M);readPrivate(d,'source-inventory.json',I);readPrivate(d,'config-candidate.json',CFG);readPrivate(d,'external-input-offline-review-NOT-STAGE.json',DRAFT);dirs.push(d)}catch(e){if(e.code!=='ENOENT'&&e.message!=='HOLD_P5_876_MANIFEST_PRIOR_FILE_DIGEST')throw e}
 }
 need(dirs.length>0,'EXACT_PRIOR_PRIVATE_REVIEW_NOT_FOUND');return dirs.sort()[0];
}
function writeExact(dir,n,x){const p=path.join(dir,n),b=bytes(x);if(fs.existsSync(p)){const st=fs.lstatSync(p);need(st.isFile()&&(st.mode&0o077)===0&&fs.readFileSync(p).equals(b),'OUTPUT_CONFLICT');return}fs.writeFileSync(p,b,{flag:'wx',mode:0o600})}
function execute(){
 need(process.env.GITHUB_ACTIONS!=='true'&&process.argv.length===2,'OWNER_LOCAL_ONLY');
 const live=main();verifyMerge(api('git/commits/'+live),api('pulls/876'),live);
 const a=tree(OT),b=tree(NT),next=validateTreeDelta(a,b);
 need(a.get(LEDGER)?.sha===LB&&b.get(LEDGER)?.sha===LB,'APPROVAL_LEDGER_CHANGED');
 const idx=JSON.parse(blob(IDX));need(idx.dayPlanSha256s?.length===31&&idx.calendarSha256===CAL&&idx.dayPlanSha256s.every((x,i)=>{const p='data-collection/phase5/planning/phase6-source-day-'+String(i+1).padStart(2,'0')+'.json';return x.runDayIndex===i+1&&a.get(p)?.sha===x.gitBlob&&b.get(p)?.sha===x.gitBlob&&b.get(p)?.size===x.byteCount}),'DAY_PLAN_DRIFT');
 const dir=findPrior(fs.realpathSync(os.homedir()));
 const m=readPrivate(dir,'manifest-candidate.json',M),inv=readPrivate(dir,'source-inventory.json',I),cfg=readPrivate(dir,'config-candidate.json',CFG),draft=readPrivate(dir,'external-input-offline-review-NOT-STAGE.json',DRAFT);
 need(m.sourceInventorySha256===I&&m.executableFileCount===2188&&m.configCandidateSha256===CFG&&m.calendarRowsSha256===CAL&&m.finalPredecessorsApproved===false&&m.scientificFreezeApproved===false&&m.phase6PaidGo===false,'OLD_MANIFEST_FLAGS');
 need(draft.codeSha40===OLD&&draft.manifestSha256===M&&draft.configSha256===CFG&&draft.calendarSha256===CAL&&draft.phase6AuthorizationId===null&&draft.predecessorEvidenceIds===null,'OLD_DRAFT_FLAGS');
 const oldRows=new Map(inv.map(x=>[x.path,x]));need(inv.length===2188&&oldRows.size===2188&&[...next].every(([p,x])=>oldRows.get(p)?.mode===x.mode&&/^[a-f0-9]{64}$/.test(oldRows.get(p)?.sha256)),'PRIOR_INVENTORY_PATHS');
 for(const [p,old,newSha] of EXPECT){need(h(blob(old))===oldRows.get(p).sha256,'PRIOR_CHANGED_FILE_HASH');oldRows.set(p,{path:p,mode:next.get(p).mode,sha256:h(blob(newSha))});}
 const newInv=[...oldRows.values()].sort((x,y)=>x.path<y.path?-1:x.path>y.path?1:0),newI=h(bytes(newInv)),newM={...m,sourceInventorySha256:newI},newH=h(bytes(newM)),newDraft={...draft,codeSha40:live,manifestSha256:newH};
 need(newI!==I&&newH!==M&&main()===live,'UNEXPECTED_EQUAL_OR_MAIN_DRIFT');
 const out=path.join(path.dirname(dir),'nov18-'+live.slice(0,12));if(!fs.existsSync(out))fs.mkdirSync(out,{mode:0o700});need(isPrivateDir(out),'OUTPUT_DIR');
 const receipt={status:'P5_876_EXACT_MERGE_THREE_FILE_UNSIGNED_REBIND_NO_GO',main:live,tree:NT,oldMain:OLD,manifestCandidateSha256:newH,sourceInventorySha256:newI,configCandidateSha256:CFG,calendarRowsSha256:CAL,externalReviewDraftSha256:h(bytes(newDraft)),executableFiles:2188,changedFiles:3,verifiedUnchangedDayPlans:31,plannedQueries:6144,reservedRestUnits:37388,actualAuthorizationId:null,stagePacketExported:false,scientificFreezeApproved:false,sourceRightsApproved:false,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
 for(const [n,x] of Object.entries({'manifest-candidate.json':newM,'source-inventory.json':newInv,'config-candidate.json':cfg,'external-input-offline-review-NOT-STAGE.json':newDraft,'receipt.json':receipt}))writeExact(out,n,x);
 console.log(JSON.stringify({...receipt,reviewDirectory:out,unchangedTimingDraftInPreviousReviewDirectory:dir}));
}
module.exports={validateTreeDelta,verifyMerge,scope};
if(require.main===module)try{execute()}catch(e){console.error(/^HOLD_P5_876_MANIFEST_[A-Z0-9_]+$/.test(e.message)?e.message:'HOLD_P5_876_MANIFEST_REDACTED_INSPECT');process.exitCode=2}
