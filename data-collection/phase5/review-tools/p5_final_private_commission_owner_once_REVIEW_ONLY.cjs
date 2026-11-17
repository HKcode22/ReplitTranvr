'use strict';
// Owner-local review-only by default. No provider/collection/staging activation.
// Requires exact candidate, clean temporary worktree, existing owner DB and gh.
// One explicit engineering-only confirmation; errors halt without replay.
const {finishPrivateCommission}=require('./p5_final_private_commission_core_REVIEW_ONLY.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const R='HKcode22/ReplitTranvr',BASE='345f642e0df3266853a1f9d5e3f12fa262ddf1ee',HEAD='570c2e29784231c6ceffab8d620fbe2fd1887762',TREE='ccf9f6665e3a8547476651a17efcf2261d32c53c';
const SQL='migrations/staged/V0105__phase6_bounded_private_epoch_expiry_inert_v39.sql';
const OWNER='scripts/v39_phase6_private_epoch_expiry_owner_commission_v39.mjs';
const PIN='P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA',MODE='P6_PRIVATE_EPOCH_EXPIRY_MODE';
const H=/^[a-f0-9]{40}$/,D=/^[a-f0-9]{64}$/;
const hold=x=>{throw Error('HOLD_P5_FINAL_PRIVATE_'+x)};
const env={...process.env,ADB_AUTO_COLLECT:'0',V39_PHASE6_PROCESS_ARMED:'0',V39_PHASE6_OWNER_APPROVED:'0'};
for(const k of ['AERODATABOX_API_KEY','RAPIDAPI_KEY','AERODATABOX_WEBHOOK_SECRET','V39_DATABASE_RUNTIME_URL','P6_PRIVATE_EXPIRY_OWNER_APPROVAL','P6_PRIVATE_EXPIRY_OWNER_REVIEW_SHA256'])delete env[k];
const hash=(b,alg='sha256')=>createHash(alg).update(b).digest('hex');
const blob=b=>hash(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b]),'sha1');
const print=x=>process.stdout.write(JSON.stringify(x)+'\n');
let root=null,temp=null,work=null,added=false,stage='PREFLIGHT',helper=null;
function cmd(program,args,{cwd=root,input,timeout=30000,e=env}={}){
 try{return execFileSync(program,args,{cwd,encoding:'utf8',env:e,input,timeout,maxBuffer:24*1024*1024,stdio:['pipe','pipe','pipe']}).trim();}
 catch{hold(stage+'_COMMAND_FAILED_INSPECT_NO_REPLAY');}
}
const gh=(args,input,timeout)=>cmd('gh',args,{input,timeout:timeout??30000});
const api=p=>JSON.parse(gh(['api','repos/'+R+'/'+p]));
const remote=()=>api('git/ref/heads/main').object.sha;
function exactPr(draft){
 const p=api('pulls/864');
 if(p.number!==864||p.state!=='open'||p.merged!==false||p.draft!==draft||p.base?.ref!=='main'||p.base?.sha!==BASE||p.head?.sha!==HEAD||p.head?.repo?.full_name!==R||remote()!==BASE||api('git/commits/'+HEAD).tree?.sha!==TREE)hold('EXACT_PR_OR_MAIN_CHANGED');
 return p;
}
function config(){
 const a=JSON.parse(gh(['variable','list','-R',R,'--json','name,value','--limit','1000']));
 if(!Array.isArray(a)||new Set(a.map(x=>x.name)).size!==a.length)hold('VARIABLE_LIST_SHAPE');
 const v=new Map(a.map(x=>[x.name,x.value]));
 const s=JSON.parse(gh(['secret','list','-R',R,'--json','name']));
 if(!['P5_PRIMARY_FIDS_SWEEP_DATABASE_URL','P5_RETENTION_READER_DATABASE_URL'].every(k=>s.filter(x=>x.name===k).length===1))hold('EXISTING_RESTRICTED_SECRETS_MISSING');
 if(v.get('P5_PRIMARY_FIDS_EXPIRY_ENABLED')!=='true'||v.get('P5_PRIMARY_FIDS_EXPIRY_APPROVAL')!=='APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER'||!D.test(v.get('P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256')??''))hold('PRIMARY_CONFIG_DRIFT');
 return {pin:v.get(PIN),primaryEnabled:true,mode:v.get(MODE)||'OFF',privateApprovalPresent:Boolean(v.get('P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256')||v.get('P6_PRIVATE_EPOCH_EXPIRY_APPROVAL')),endpoint:v.get('P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256')};
}
function state(){
 const p=exactPr(true);
 const ci=[44104067148,44104066978,44104066897,44104066919,44104066916,44104066931,44104066923];
 const allCi=ci.every(id=>{const x=api('actions/runs/'+id);return x.id===id&&x.head_sha===HEAD&&x.run_attempt===1&&x.status==='completed'&&x.conclusion==='success'});
 return {main:remote(),head:p.head.sha,base:p.base.sha,tree:TREE,open:true,draft:p.draft,allCi,...config()};
}
function getBlob(id,file){
 const x=api('git/blobs/'+id);
 if(x.sha!==id||x.encoding!=='base64'||typeof x.content!=='string')hold('BLOB_RESPONSE');
 const b=Buffer.from(x.content,'base64');
 if(blob(b)!==id)hold('BLOB_HASH');
 fs.writeFileSync(file,b,{mode:0o600,flag:'wx'});return b;
}
function git(args,cwd=root){return cmd('git',args,{cwd,timeout:180000});}
function fetchRef(ref){git(['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','fetch','--no-tags','https://github.com/'+R+'.git',ref]);}
function exactCheckout(sha,tree){
 if(git(['rev-parse','HEAD'],work)!==sha||git(['rev-parse','HEAD^{tree}'],work)!==tree||git(['status','--porcelain','--untracked-files=no'],work))hold('TEMP_CHECKOUT_NOT_EXACT');
}
const preflightSource=String.raw`
import pg from 'pg';
import {createHash} from 'node:crypto';
import {inspectP5PrimaryExpiryOwner} from './scripts/v39_phase5_primary_fids_expiry_owner_commission_v39.mjs';
const h=b=>createHash('sha256').update(b).digest('hex');
const u=new URL(process.env.DATABASE_URL);
if(!['postgres:','postgresql:'].includes(u.protocol)||decodeURIComponent(u.username)!=='neondb_owner'||!u.password||u.pathname!=='/neondb'||!u.hostname.endsWith('.neon.tech')||u.hash||!['require','verify-full'].includes(u.searchParams.get('sslmode'))||[...u.searchParams.keys()].some(k=>!['sslmode','channel_binding'].includes(k)))throw Error('OWNER_SCOPE');
const endpointSha256=h(u.host.toLowerCase()+u.pathname);
if(endpointSha256!==process.env.FINAL_PRIVATE_ENDPOINT)throw Error('ENDPOINT_DRIFT');
u.searchParams.set('sslmode','verify-full');
const c=new pg.Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:30000,options:'-c default_transaction_read_only=on'});
try{
 await c.connect();
 const primary=await inspectP5PrimaryExpiryOwner(c);
 if(primary.existingFunctions!==4||primary.writerExists!==true||primary.stopped!==true)throw Error('PRIMARY_NOT_READY');
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  const a=(await c.query("SELECT current_setting('transaction_read_only') ro,current_user actor,session_user login,current_database() db,pg_is_in_recovery() replica")).rows[0];
  if(a.ro!=='on'||a.actor!=='neondb_owner'||a.login!==a.actor||a.db!=='neondb'||a.replica!==false)throw Error('NOT_OWNER_RO');
  const x=(await c.query("SELECT (SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled) enabled,(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE') batches,(SELECT count(*)::int FROM clean.adb_collection_segments WHERE status='ACTIVE') segments,(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subscriptions,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved) deletionstops,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) allincidents,(SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39) packets,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39) indexes,(SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39) claims,(SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='clean' AND p.proname LIKE 'phase6_private_epoch_expiry_%') privatefunctions,(SELECT count(*)::int FROM pg_constraint WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass AND conname LIKE 'p6_v0101_%' AND convalidated) bound")).rows[0];
  if(x.bound!==4)throw Error('EXISTING_V0101_REQUIRED');
  const owners=(await c.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='phase6_private' AND c.relname IN ('frozen_native_packet_v39','signed_run_day_index_revision_v39','signed_run_day_epoch_claim_v39') AND pg_get_userbyid(c.relowner)=current_user")).rows[0];
  if(owners.n!==3)throw Error('PRIVATE_TABLE_OWNER_DRIFT');
  console.log(JSON.stringify({privateState:x.privatefunctions===0?'ABSENT':'PRESENT',allIncidentCount:x.allincidents,enabled:x.enabled,batches:x.batches,segments:x.segments,subscriptions:x.subscriptions,deletionstops:x.deletionstops,packets:x.packets,indexes:x.indexes,claims:x.claims,endpointSha256,sqlSha256:process.env.FINAL_PRIVATE_SQL_SHA}));
 }finally{await c.query('ROLLBACK');}
}finally{await c.end();}
`;
function preflight(endpoint){
 stage='OWNER_PREFLIGHT';
 // Fetch both exact objects; only current approved main code runs against DB.
 fetchRef('refs/heads/main');fetchRef('refs/pull/864/head');
 if(remote()!==BASE||git(['rev-parse',HEAD+'^{tree}'])!==TREE||git(['rev-parse',BASE])!==BASE)hold('FETCHED_SCOPE_DRIFT');
 const sql=git(['rev-parse',HEAD+':'+SQL]);
 if(sql!=='861229c4c264ed9a47d005f2a96c25cf1c800615')hold('V0105_BLOB_DRIFT');
 const bytes=getBlob(sql,path.join(temp,'v0105.sql'));
 work=path.join(temp,'checkout');
 git(['-c','core.hooksPath=/dev/null','worktree','add','--detach',work,BASE]);added=true;
 fs.symlinkSync(path.join(root,'node_modules'),path.join(work,'node_modules'),'dir');
 exactCheckout(BASE,git(['rev-parse',BASE+'^{tree}']));
 return JSON.parse(cmd(process.execPath,['--input-type=module','-e',preflightSource],{cwd:work,timeout:70000,e:{...env,FINAL_PRIVATE_ENDPOINT:endpoint,FINAL_PRIVATE_SQL_SHA:hash(bytes)}}));
}
function confirm(message){
 const fd=fs.openSync('/dev/tty','r+');
 try{fs.writeSync(fd,'Type '+message+' to proceed with inert function commissioning only: ');let a='',b=Buffer.alloc(1);while(a.length<200&&fs.readSync(fd,b,0,1,null)===1&&b[0]!==10)a+=b.toString();return a===message;}finally{fs.closeSync(fd);}
}
function owner(mode,sha,review){
 stage=mode==='review'?'OWNER_REVIEW':'OWNER_COMMISSION';
 exactCheckout(sha,TREE);
 if(remote()!==sha)hold('REMOTE_MAIN_DRIFT');
 const e={...env,P6_PRIVATE_EXPIRY_OWNER_APPROVED_MAIN_SHA:sha};
 if(mode==='commission'){e.P6_PRIVATE_EXPIRY_OWNER_APPROVAL='COMMISSION_REVIEWED_V0105_EXISTING_FUNCTION_ACTORS_VERIFY_ONLY_NO_GO';e.P6_PRIVATE_EXPIRY_OWNER_REVIEW_SHA256=review;}
 return JSON.parse(cmd(process.execPath,[OWNER,mode],{cwd:work,timeout:90000,e}));
}
function main(){
 if(process.env.GITHUB_ACTIONS==='true'||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||!process.env.DATABASE_URL||!['review','commission'].includes(process.argv[2]??'review')||process.argv.length>3)hold('OWNER_LOCAL_NONPAID_ONLY');
 root=fs.realpathSync(cmd('git',['rev-parse','--show-toplevel'],{cwd:process.cwd()}));
 if(!fs.existsSync(path.join(root,'node_modules','pg')))hold('EXISTING_DEPENDENCIES_REQUIRED');
 gh(['auth','status','--hostname','github.com']);
 temp=fs.mkdtempSync(path.join(os.tmpdir(),'p5-final-private-'));fs.chmodSync(temp,0o700);
 const helperPath=path.join(temp,'p6_private_commission_repin_REVIEW_ONLY.cjs');
 const helperTest=path.join(temp,'p6_private_commission_repin_REVIEW_ONLY.test.cjs');
 const corePath=path.join(temp,'p5_final_private_commission_core_REVIEW_ONLY.cjs');
 const coreTest=path.join(temp,'p5_final_private_commission_core_REVIEW_ONLY.test.cjs');
 getBlob('98b8261ccaed84a380f1367fc8bf2382f0069ba6',helperPath);getBlob('a67fae1751981e83ec47d6dafe3e3243a92a31a1',helperTest);
 getBlob('2cc4fc17e3fd51309a4fb6d3af425205389532f9',corePath);getBlob('7db03ff46774c4c2e828e5b14c54640648823662',coreTest);
 if(!fs.readFileSync(corePath).equals(fs.readFileSync(require.resolve('./p5_final_private_commission_core_REVIEW_ONLY.cjs'))))hold('EXECUTING_CORE_BLOB_DRIFT');
 helper=require(helperPath).handoff;
 const invoke=(mode,sha,state)=>helper({gh,confirm:()=>true,report:print},mode,sha,state);
 const io={state,testHelper:()=>{stage='NATIVE_TEST';cmd(process.execPath,['--test',coreTest,helperTest],{cwd:temp,timeout:90000});print({status:'P5_FINAL_PRIVATE_NATIVE_CORE_AND_HELPER_TESTS_PASSED',providerCalls:0,phase6PaidGo:false})},
 ownerPreflight:preflight,confirm,report:print,
 merge:initial=>{
  stage='READY_EXACT_DRAFT';exactPr(true);
  if(JSON.stringify(config())!==JSON.stringify({pin:initial.pin,primaryEnabled:initial.primaryEnabled,mode:initial.mode,privateApprovalPresent:initial.privateApprovalPresent,endpoint:initial.endpoint}))hold('PREMERGE_CONFIG_DRIFT');
  gh(['pr','ready','864','-R',R]);exactPr(false);
  stage='MERGE_EXACT_HEAD';const m=JSON.parse(gh(['api','--method','PUT','repos/'+R+'/pulls/864/merge','--input','-'],JSON.stringify({sha:HEAD,merge_method:'squash',commit_title:'Phase6 V0105 bounded private retention and inert commissioning (#864)'})));
  if(m.merged!==true||!H.test(m.sha??'')||remote()!==m.sha||api('git/commits/'+m.sha).tree.sha!==TREE)hold('MERGED_TREE_OR_MAIN_DRIFT_NO_REPLAY');
  return m.sha;
 },
 repin:sha=>{stage='REPIN_AND_VERIFY_ABSENT';return invoke('configure',sha,'ABSENT')},
 checkout:sha=>{stage='CHECKOUT_EXACT_MERGED';fetchRef('refs/heads/main');git(['-c','core.hooksPath=/dev/null','switch','--detach',sha],work);exactCheckout(sha,TREE)},
 ownerReview:sha=>owner('review',sha),
 commission:(sha,digest)=>owner('commission',sha,digest),
 verifyGranted:sha=>{stage='VERIFY_GRANTED';return invoke('verify',sha,'GRANTED')}
 };
 return finishPrivateCommission(io,process.argv[2]??'review');
}
try{print(main());}catch(e){const m=String(e?.message??'');console.error(JSON.stringify({status:/^HOLD_(?:P5_FINAL_PRIVATE|P6_PRIVATE_REPIN)_[A-Z0-9_]+$/.test(m)?m:'HOLD_P5_FINAL_PRIVATE_REDACTED_INSPECT_NO_REPLAY',stage,noAutomaticRetry:true,providerCalls:0,phase6PaidGo:false}));process.exitCode=2;}
finally{
 if(added)try{git(['-c','core.hooksPath=/dev/null','worktree','remove','--force',work]);added=false;}catch{console.error('HOLD_P5_FINAL_PRIVATE_TEMP_WORKTREE_CLEANUP_REVIEW');}
 if(temp&&!added)fs.rmSync(temp,{recursive:true,force:true});
}
