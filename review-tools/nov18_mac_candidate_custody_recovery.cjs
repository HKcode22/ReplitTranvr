'use strict';
// Local candidate custody only. No GitHub/DB/provider writes or approved signatures.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const PIN='ea89308f468494d848f549539200f73f848a4fa7',MANIFEST='e5315b35fb8978d1de823bb1953191d976ccf093594a656890fb16d91f88a3e0';
const OLD_PIN='6f518add10d00567a95fbcaf3650ebf608da8a60',OLD_MANIFEST='fc6b594ec0e458d8810981ac8f170a3a91384be609e3c16a09c25f5a91449041';
const REPO='HKcode22/ReplitTranvr',PUB='b14c6523e12131ea92bd5cd792b439ded77e52da',LEDGER='cddbeb12d27fb0e6b18195950a8f0333c88443aa';
const {execFileSync}=require('node:child_process');
const GROUPS=[['daily','P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64'],['query','P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64'],['registry-index','P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64','P6_PRIVATE_DAY_REVIEWER_KEY_BASE64'],['later-pre-t24-registry','P6_PRIVATE_LATER_REVIEWER_KEY_BASE64'],['post','P6_PRIVATE_POST_REVIEWER_KEY_BASE64'],['t24-independent-custody','P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64']];
const hold=k=>{throw Error('HOLD_P5_SIGNER_CANDIDATES_'+k)};
const check=(b,k)=>{if(!b)hold(k)};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const keyFile=(dir,id)=>path.join(dir,id+'.pkcs8.pem');
const receiptName='public-candidate-receipt.json';
const exists=p=>{try{fs.lstatSync(p);return true}catch(e){if(e.code==='ENOENT')return false;throw e}};
function checked(p,dir){const s=fs.lstatSync(p);check((dir?s.isDirectory():s.isFile())&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o777)===(dir?0o700:0o600),'UNSAFE_LOCAL_CUSTODY');if(!dir)check(s.nlink===1&&s.size<65536,'UNSAFE_PRIVATE_FILE');}
function writeNew(p,b){const fd=fs.openSync(p,'wx',0o600);try{fs.writeFileSync(fd,b);fs.fsyncSync(fd);}finally{fs.closeSync(fd)}}
function inspect(dir,withMarker=true){
 checked(dir,true);
 const expected=[...GROUPS.map(g=>g[0]+'.pkcs8.pem'),...(withMarker?[receiptName]:[])].sort();
 check(JSON.stringify(fs.readdirSync(dir).sort())===JSON.stringify(expected),'PARTIAL_OR_FOREIGN_CUSTODY_NO_REPLAY');
 const signers=GROUPS.map(([id,...secretNames])=>{
  const f=keyFile(dir,id);checked(f,false);const raw=fs.readFileSync(f);
  try{const privateKey=crypto.createPrivateKey(raw),publicKey=crypto.createPublicKey(privateKey);check(privateKey.asymmetricKeyType==='ed25519','WRONG_KEY_TYPE');
   const pem=publicKey.export({type:'spki',format:'pem'}),fingerprintSha256=hash(publicKey.export({type:'spki',format:'der'}));
   const challenge=Buffer.from('travnr owner-local candidate selftest, not a flight or approval');
   check(crypto.verify(null,challenge,publicKey,crypto.sign(null,challenge,privateKey)),'SIGN_VERIFY_FAILED');
   const canonical=Buffer.from(raw.toString('base64'),'base64');try{check(canonical.equals(raw),'BASE64_ROUNDTRIP_FAILED')}finally{canonical.fill(0)}
   return {id,secretNames,publicKeyPem:pem,fingerprintSha256};
  }finally{raw.fill(0)}
 });
 check(new Set(signers.map(s=>s.fingerprintSha256)).size===6,'DUPLICATE_SIGNER');
 return signers;
}
function prepare(home){
 check(typeof process.getuid==='function','OWNER_POSIX_REQUIRED');
 home=fs.realpathSync(home);check(!exists(path.join(home,'.git')),'HOME_IS_GIT_REPOSITORY');
 const dir=path.join(home,'.travnr-phase6-signer-candidates-v2');
 const created=!exists(dir);
 if(created){
  fs.mkdirSync(dir,{mode:0o700});checked(dir,true);
  for(const [id] of GROUPS){const {privateKey}=crypto.generateKeyPairSync('ed25519');const b=Buffer.from(privateKey.export({format:'pem',type:'pkcs8'}));try{writeNew(keyFile(dir,id),b)}finally{b.fill(0)}}
  // Marker written only after all keys exist. It is not an approval artifact.
  writeNew(path.join(dir,receiptName),JSON.stringify({schema:'v39.phase6.local-signer-candidate-custody.v1',originMain:PIN,originManifestCandidateSha256:MANIFEST,signers:inspect(dir,false)}));
 }
 const signers=inspect(dir);const markerPath=path.join(dir,receiptName);checked(markerPath,false);
 const marker=JSON.parse(fs.readFileSync(markerPath,'utf8'));
 check(marker.schema==='v39.phase6.local-signer-candidate-custody.v1'&&marker.originMain===PIN&&marker.originManifestCandidateSha256===MANIFEST,'CUSTODY_ORIGIN_DRIFT');
 check(JSON.stringify(marker.signers)===JSON.stringify(signers),'CUSTODY_PUBLIC_FINGERPRINT_DRIFT_NO_REPLAY');
 return {status:created?'P5_LOCAL_SIX_SIGNER_CANDIDATES_CREATED_NO_GO':'P5_LOCAL_SIX_SIGNER_CANDIDATES_REUSED_NO_GO',originMain:PIN,originManifestCandidateSha256:MANIFEST,signers,distinctKeyCount:6,secretNameCount:7,privateDirectory:dir,independentCustodianApproved:false,delegationPolicyApproved:false,githubSecretWrites:0,databaseWrites:0,providerCalls:0,phase6PaidGo:false};
}
// Replacing lost, never-approved *candidates* is not a production key rotation.
// An owner must run explicitly on their persistent Mac, not another Replit VM.
const blockedNames=new Set([...GROUPS.flatMap(x=>x.slice(1)),
 'P6_NONPAID_DAILY_POLICY_BASE64','P6_NONPAID_DAILY_POLICY_SHA256',
 'P6_NONPAID_SIGNING_POLICY_BASE64','P6_NONPAID_SIGNING_POLICY_SHA256',
 'P6_NONPAID_TRANSPORT_TRUST_BASE64','P6_NONPAID_TRANSPORT_TRUST_SHA256',
 'P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64','P6_PRIVATE_POST_REVIEWER_TRUST_BASE64',
 'P6_PRIVATE_DAY_EPOCH_REVIEWER_PUBLIC_KEY_PEM_BASE64','P6_PRIVATE_SOURCE_QUERY_REVIEWER_PUBLIC_KEY_PEM_BASE64',
 'V39_PHASE5_FREEZE_SIGNED','V39_PHASE5_SOURCE_RIGHTS_APPROVED','V39_P5_SEVEN_REST_BUDGET_SIGNED',
 'V39_P5_MANIFEST_SHA256','V39_P5_RELEASE_SHA256','V39_P5_RIGHTS_SHA256',
 'P6_INERT_CALENDAR_REVIEW_APPROVED','P6_INERT_COST_REVIEW_APPROVED','P6_INERT_STAGE_INPUT_JSON',
 'P6_NONPAID_SOURCE_RUNTIME_APPROVED','P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED',
 'P6_NATIVE_LATER_RUNTIME_APPROVED','P6_NATIVE_POST_PRODUCER_APPROVED','P6_T24_CUSTODY_APPROVED']);
const gh=(endpoint)=>JSON.parse(execFileSync('gh',['api','--hostname','github.com','--method','GET',endpoint],{
 encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe'],
 env:{...process.env,GH_PROMPT_DISABLED:'1'}}));
const root='repos/'+REPO+'/';
const main=api=>api(root+'git/ref/heads/main').object.sha;
function exactBlob(api,digest){
 const v=api(root+'git/blobs/'+digest);
 check(v.sha===digest&&v.encoding==='base64'&&typeof v.content==='string','REMOTE_BLOB_SCOPE');
 const raw=Buffer.from(v.content.replace(/\s+/g,''),'base64');
 check(v.size===raw.length&&crypto.createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex')===digest,'REMOTE_BLOB_HASH');
 return JSON.parse(raw.toString('utf8'));
}
function listAll(api,endpoint,k){
 let total=null,rows=[];
 for(let i=1;i<=10;i++){
  const r=api(endpoint+(endpoint.includes('?')?'&':'?')+'per_page=100&page='+i);
  check(Number.isSafeInteger(r.total_count)&&r.total_count>=0&&r.total_count<=1000&&
   (total===null||total===r.total_count)&&Array.isArray(r[k]),'CONFIG_HISTORY_INCOMPLETE');
  total=r.total_count;
  check(r[k].length===Math.min(100,total-rows.length),'CONFIG_HISTORY_PAGE');
  rows.push(...r[k]);if(rows.length===total)break;
 }
 check(rows.length===total&&rows.every(x=>typeof x?.name==='string'&&x.name.length>0)&&new Set(rows.map(x=>x.name)).size===rows.length,'CONFIG_HISTORY_NAMES');
 return rows.map(x=>x.name);
}
function checkPriorUnreleased(api){
 check(api('user').login==='HKcode22','EXACT_OWNER_REQUIRED');
 const repo=api('repos/'+REPO);
 check(repo.full_name===REPO&&repo.owner?.login==='HKcode22'&&repo.owner?.type==='User','EXACT_PERSONAL_REPOSITORY_REQUIRED');
 check(main(api)===PIN,'CURRENT_MAIN_DRIFT');
 const led=exactBlob(api,LEDGER);
 const actual=api(root+'contents/data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json?ref='+PIN);
 check(actual.sha===LEDGER&&Array.isArray(led.evidence)&&led.evidence.length===12&&Array.isArray(led.approvals)&&led.approvals.length===0,'APPROVAL_LEDGER_CHANGED');
 const secretNames=listAll(api,root+'actions/secrets','secrets');
 const varNames=listAll(api,root+'actions/variables','variables');
 const enames=listAll(api,root+'environments','environments');
 check(enames.length<=32,'ENVIRONMENT_SCOPE');
 const all=[...secretNames,...varNames];
 for(const en of enames){
  const enc=encodeURIComponent(en);
  all.push(...listAll(api,root+'environments/'+enc+'/secrets','secrets'),...listAll(api,root+'environments/'+enc+'/variables','variables'));
 }
 check(!all.some(n=>blockedNames.has(n)),'EXISTING_KEY_POLICY_OR_APPROVAL_NAME_NO_REPLACEMENT');
 check(main(api)===PIN,'MAIN_CHANGED_DURING_PREFLIGHT');
 const old=exactBlob(api,PUB);
 check(old.originMain===OLD_PIN&&old.originManifestCandidateSha256===OLD_MANIFEST&&old.distinctKeyCount===6&&old.secretNameCount===7&&
 old.independentCustodianApproved===false&&old.delegationPolicyApproved===false&&old.githubSecretWrites===0&&old.phase6PaidGo===false&&
 Array.isArray(old.signers)&&old.signers.length===6,'OLD_PUBLIC_RECEIPT_SCOPE');
 return {old,secretNames:secretNames.length,environmentCount:enames.length};
}
function originalMacKeys(home,prior){
 const dir=path.join(home,'.travnr-phase6-signer-candidates-v1');
 if(!exists(dir))return null;
 const signers=inspect(dir);
 const markerPath=path.join(dir,receiptName);checked(markerPath,false);
 const marker=JSON.parse(fs.readFileSync(markerPath,'utf8'));
 check(marker.schema==='v39.phase6.local-signer-candidate-custody.v1'&&marker.originMain===OLD_PIN&&
 marker.originManifestCandidateSha256===OLD_MANIFEST&&JSON.stringify(marker.signers)===JSON.stringify(signers)&&
 JSON.stringify(signers)===JSON.stringify(prior.signers),'ORIGINAL_MAC_KEY_DRIFT_NO_REPLACEMENT');
 return {status:'P5_ORIGINAL_SIX_CANDIDATES_RECOVERED_ON_MAC_NO_GO',originMain:OLD_PIN,
 originManifestCandidateSha256:OLD_MANIFEST,signers,privateDirectory:dir,distinctKeyCount:6,secretNameCount:7,
 independentCustodianApproved:false,delegationPolicyApproved:false,githubSecretWrites:0,databaseWrites:0,providerCalls:0,phase6PaidGo:false};
}
function run(){
 check(process.argv.length===3&&process.argv[2]==='--replace-lost-unapproved-candidates'&&
 process.env.GITHUB_ACTIONS!=='true'&&os.platform()==='darwin','EXPLICIT_OWNER_MAC_ONLY');
 const home=fs.realpathSync(os.homedir());
 check(!exists(path.join(home,'.git')),'HOME_IS_GIT_REPOSITORY');
 const pre=checkPriorUnreleased(gh);
 console.log(JSON.stringify({status:'P5_MAC_CANDIDATE_NO_EXISTING_RELEASE_NAME_PREFLIGHT',main:PIN,
 repositorySecretNamesScanned:pre.secretNames,repositoryEnvironmentsScanned:pre.environmentCount,approvals:0,
 privateSecretValuesRead:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
 // Reuse the old exact keys if they already exist on Mac. Never create new
 // candidates if both cohorts are present; reconcile rather than guessing.
 const prior=originalMacKeys(home,pre.old);
 check(!prior||!exists(path.join(home,'.travnr-phase6-signer-candidates-v2')),'TWO_LOCAL_COHORTS_REVIEW');
 const result=prior??prepare(home);
 const oldSet=new Set(pre.old.signers.map(x=>x.fingerprintSha256));
 check(prior||result.signers.every(x=>!oldSet.has(x.fingerprintSha256)),'UNEXPECTED_OLD_FINGERPRINT');
 check(main(gh)===PIN,'MAIN_CHANGED_AFTER_LOCAL_CUSTODY');
 console.log(JSON.stringify({...result,currentManifestCandidateSha256:MANIFEST,
 oldUnapprovedCandidateFingerprints:pre.old.signers.map(x=>({id:x.id,fingerprintSha256:x.fingerprintSha256})),
 oldCandidatesReused:Boolean(prior),oldUnapprovedCandidatesSuperseded:!prior,
 durableExternalBackupVerified:false,actualIndependentCustodianApproved:false}));
}
module.exports={prepare,listAll,checkPriorUnreleased};
if(require.main===module){try{run()}catch(e){const m=String(e?.message??'');console.error(/^HOLD_P5_SIGNER_CANDIDATES_[A-Z_]+$/.test(m)?m:'HOLD_P5_SIGNER_CANDIDATES_LOCAL_ERROR_NO_REPLAY');process.exitCode=2}}
