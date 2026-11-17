'use strict';
// Local candidate custody only. No GitHub/DB/provider writes or approved signatures.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const PIN='6f518add10d00567a95fbcaf3650ebf608da8a60',MANIFEST='fc6b594ec0e458d8810981ac8f170a3a91384be609e3c16a09c25f5a91449041';
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
 const dir=path.join(home,'.travnr-phase6-signer-candidates-v1');
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
module.exports={prepare};
if(require.main===module){try{check(process.argv.length===2&&process.env.GITHUB_ACTIONS!=='true','OWNER_LOCAL_ONLY');console.log(JSON.stringify(prepare(os.homedir())))}catch(e){const m=String(e?.message??'');console.error(/^HOLD_P5_SIGNER_CANDIDATES_[A-Z_]+$/.test(m)?m:'HOLD_P5_SIGNER_CANDIDATES_LOCAL_ERROR_NO_REPLAY');process.exitCode=2}}
