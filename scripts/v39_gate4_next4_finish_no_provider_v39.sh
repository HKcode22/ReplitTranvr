#!/usr/bin/env bash
# ReplitTranvr Gate 4 NEXT4: state-aware, no AeroDataBox calls.
# Run once via: bash ~/workspace/next4_finish_no_provider.sh
# If HOLD occurs, do not rerun automatically.
set -Eeuo pipefail
set +x
cd ~/workspace
node --import tsx --input-type=module <<'NEXT4_STATE_AWARE'
import 'dotenv/config';
import pg from 'pg';
import {hkdfSync,createDecipheriv,createHash,timingSafeEqual} from 'node:crypto';
import {existsSync,mkdirSync,lstatSync,readFileSync,openSync,writeSync,fsyncSync,closeSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {
  next4RoleSQLV39,next4PolicySQLV39,NEXT4_WRITER_ROLE_V39
} from './scripts/v39_gate4_next4_receiver_commission_v39.ts';
import {
  NEXT4_RECEIVER_ROLE_V39,gate4Next4ConfigStorageKeyV39,
  gate4Next4OpenSealedValuesV39,gate4Next4SealValuesV39,
  gate4Next4ValidateValuesV39
} from './server/lib/disruption/gate4Next4SealedBootstrap_v39.ts';
import {ReplitProviderBlobStoreV39} from './server/lib/disruption/replitProviderBlobStore_v39.ts';
import {gate4CheckAdditivePgRoleV39} from './server/lib/disruption/gate4PrebindAdditiveRoute_v39.ts';

const SRC='1885703c04ba8f24bf8d1183f873eb86d1f83d7c';
const HEAD='f857fad235b27ab5f0863040d1e7780dfa0d83e6';
const SCRIPT='scripts/v39_gate4_next4_receiver_commission_v39.ts';
const R=NEXT4_RECEIVER_ROLE_V39,W=NEXT4_WRITER_ROLE_V39;
const policies=[
 ['gate4_next4_receiver_select_v39','gate4_alert_prebind_original_v39','SELECT',R],
 ['gate4_next4_receiver_insert_v39','gate4_alert_prebind_original_v39','INSERT',R],
 ['gate4_next4_writer_select_v39','gate4_alert_owned_binding_v39','SELECT',W],
 ['gate4_next4_writer_insert_v39','gate4_alert_owned_binding_v39','INSERT',W]
];
const dir=join(homedir(),'.config','replittranvr','gate4-next4');
const paths={manifest:join(dir,'commission.json'),apply:join(dir,'apply-once-intent.json'),
 recover:join(dir,'recover-once-intent.json'),seal:join(dir,'seal-once-intent.json'),
 escalation:join(dir,'recovery-escalation-once-intent.json'),
 sealEscalation:join(dir,'seal-escalation-once-intent.json')};
let stage='PREFLIGHT',m,blob,store;
const hold=(reason)=>{throw Error('HOLD_'+reason);};
function secureFile(p){if(!existsSync(p))return false;const s=lstatSync(p);if(!s.isFile()||(s.mode&0o077)!==0)hold('PRIVATE_FILE_PERMISSIONS');return true;}
function createOnce(p,data){const fd=openSync(p,'wx',0o600);try{writeSync(fd,JSON.stringify(data)+'\n');fsyncSync(fd);}finally{closeSync(fd);}}
function ensureDirectory(p){if(!existsSync(p))mkdirSync(p,{mode:0o700});const x=lstatSync(p);if(!x.isDirectory()||(x.mode&0o077)!==0)hold('PRIVATE_DIRECTORY');}
function readIntent(p,flag){if(!secureFile(p))return null;const x=JSON.parse(readFileSync(p,'utf8'));if(x.source!==SRC||x.scope!==m.scope||x[flag]!==true)hold('INTENT_MISMATCH');return x;}
function hash(x){return createHash('sha256').update(JSON.stringify(x)).digest('hex');}
function requireRepo(){
 const b=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
 const h=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const clean=execFileSync('git',['status','--porcelain=v1','--untracked-files=normal'],{encoding:'utf8'}).split('\n').filter(x=>x&&x!=='?? next4_finish_no_provider.sh');
 const build=JSON.parse(readFileSync('dist/v39-build-meta.json','utf8'));
 const provenance=JSON.parse(readFileSync('dist/v39-snapshot-provenance.json','utf8'));
 if(b!=='release/gate4-rawfirst-20261026'||h!==HEAD||clean.length>0||build.git_head!==SRC||
  provenance.reviewed_runtime_source_commit!==SRC||
  provenance.actual_replit_snapshot_git_head!==HEAD||
  provenance.runtime_inputs_identical_to_reviewed!==true)hold('REVIEWED_BUILD');
 process.env.GATE4_NEXT4_REVIEWED_SOURCE_SHA=SRC;
 process.env.GATE4_NEXT4_OPERATOR_SHA=HEAD;
}
function validateManifest(x){
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
 if(x.schema!=='v39.gate4.next4.commission.v1'||x.source!==SRC||x.paidAuthorized!==false||
  !uuid.test(x.scope)||!['receiverPassword','writerPassword','webhookSecret'].every(k=>/^[a-f0-9]{80}$/.test(x[k]))||
  !/^[a-f0-9]{64}$/.test(x.nonce)||x.roleReceiver!==R||x.roleWriter!==W||
  x.authorizationSha256!==hash({scope:x.scope,source:x.source,nonce:x.nonce,receiver:R,writer:W}))
  hold('RECOVERY_MANIFEST_INVALID');
}
async function restoreManifest(){
 stage='ENCRYPTED_BACKUP_AUTH';
 store=new ReplitProviderBlobStoreV39(String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??''));
 const key=`internal/gate4/next4/recovery/${SRC}/commission-v1.aes256gcm.json`;
 if(!await store.exists(key))hold('BACKUP_ABSENT');
 const e=JSON.parse(Buffer.from(await store.downloadBytes(key)).toString('utf8'));
 if(e.schema!=='v39.gate4.next4.commission-recovery.v1'||e.source!==SRC)hold('BACKUP_SCHEMA');
 const url=String(process.env.V39_DATABASE_RUNTIME_URL??'');
 const secret=String(process.env.AERODATABOX_WEBHOOK_SECRET??'');
 if(!url||secret.length<32)hold('KEY_MATERIAL');
 const ikm=Buffer.from(url+'\0'+secret);
 const keybuf=Buffer.from(hkdfSync('sha256',ikm,Buffer.from(e.salt,'base64'),
  Buffer.from('replittranvr:gate4:next4:commission-recovery:v1'),32));
 let plain;
 try{
  const decipher=createDecipheriv('aes-256-gcm',keybuf,Buffer.from(e.iv,'base64'));
  decipher.setAAD(Buffer.from('next4-recovery:'+SRC));
  decipher.setAuthTag(Buffer.from(e.tag,'base64'));
  plain=Buffer.concat([decipher.update(Buffer.from(e.ciphertext,'base64')),decipher.final()]);
  m=JSON.parse(plain.toString('utf8'));
  validateManifest(m);
  stage='PRIVATE_MANIFEST_RESTORE';
  const parent=join(homedir(),'.config','replittranvr');
  if(!existsSync(join(homedir(),'.config')))ensureDirectory(join(homedir(),'.config'));
  ensureDirectory(parent);ensureDirectory(dir);
  if(secureFile(paths.manifest)){
   const old=readFileSync(paths.manifest);
   if(old.length!==plain.length||!timingSafeEqual(old,plain))hold('MANIFEST_MISMATCH');
  }else{
   const fd=openSync(paths.manifest,'wx',0o600);
   try{writeSync(fd,plain);fsyncSync(fd);}finally{closeSync(fd);}
  }
 }finally{keybuf.fill(0);ikm.fill(0);plain?.fill(0);}
 const sealedKey=gate4Next4ConfigStorageKeyV39(SRC);
 blob=await store.exists(sealedKey);
 console.log('NEXT4_ENCRYPTED_MANIFEST_AUTHENTICATED');
}
function roleURL(){
 const owner=new URL(String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??''));
 const runtime=new URL(String(process.env.V39_DATABASE_RUNTIME_URL??''));
 const norm=u=>u.hostname.replace('-pooler.','.')+':'+(u.port||'5432')+u.pathname;
 if(owner.pathname!=='/neondb'||norm(owner)!==norm(runtime)||
    owner.username===runtime.username||!owner.password)hold('OWNER_DATABASE_MISMATCH');
 const u=new URL(owner.toString());u.username=R;u.password=m.receiverPassword;
 u.searchParams.set('sslmode','verify-full');
 return {owner:owner.toString(),receiver:u.toString(),host:owner.hostname};
}
async function state(){
 stage='DB_READ_ONLY_STATE';
 const cs=roleURL();
 const client=new pg.Client({connectionString:cs.owner,connectionTimeoutMillis:6000,query_timeout:8000});
 let begun=false;
 try{
  await client.connect();await client.query('BEGIN READ ONLY');begun=true;
  const tables=(await client.query(`SELECT c.relname,c.relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='clean'
    AND c.relname=ANY($1::text[])`,[['gate4_alert_prebind_original_v39','gate4_alert_owned_binding_v39']])).rows;
  if(tables.length!==2||tables.some(t=>t.relrowsecurity!==true))hold('TABLE_RLS_DISABLED');
  const roles=(await client.query(`SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolinherit,
    rolcreaterole,rolcreatedb,rolreplication FROM pg_roles WHERE rolname=ANY($1::text[])`,[[R,W]])).rows;
  const ps=(await client.query(`SELECT policyname,tablename,cmd,permissive,roles::text[] AS roles,qual,with_check
    FROM pg_policies WHERE schemaname='clean' AND policyname=ANY($1::text[])`,[policies.map(x=>x[0])])).rows;
  const originals=(await client.query(`SELECT original_sha256 AS sha,original_wire AS wire
    FROM clean.gate4_alert_prebind_original_v39`)).rows;
  if(originals.length!==3||originals.some(x=>
    !Buffer.isBuffer(x.wire)||createHash('sha256').update(x.wire).digest('hex')!==x.sha))
    hold('HISTORICAL_ORIGINAL_SHA');
  const evidence=(await client.query(`SELECT
    (SELECT count(*)::int FROM clean.gate4_alert_prebind_original_v39) AS originals,
    (SELECT count(*)::int FROM clean.gate4_alert_owned_binding_v39) AS bindings,
    (SELECT count(*)::int FROM clean.gate4_alert_prebind_original_v39 WHERE scope_id=$1::uuid) AS scope_originals,
    (SELECT count(*)::int FROM clean.gate4_alert_owned_binding_v39 WHERE scope_id=$1::uuid) AS scope_bindings`,[m.scope])).rows[0];
  if(evidence.originals!==3||evidence.bindings!==3||
    evidence.scope_originals!==0||evidence.scope_bindings!==0)hold('HISTORICAL_EVIDENCE');
  if(roles.length===0&&ps.length===0)return 'EMPTY';
  if(roles.length!==2||ps.length!==4)hold('PARTIAL_SQL_STATE');
  if(roles.some(r=>r.rolcanlogin!==true||r.rolsuper!==false||r.rolbypassrls!==false||
    r.rolinherit!==false||r.rolcreaterole!==false||r.rolcreatedb!==false||r.rolreplication!==false))hold('ROLE_PRIVILEGES');
  for(const [name,table,cmd,role] of policies){
   const p=ps.find(x=>x.policyname===name);
   const guard=String(cmd==='SELECT'?p?.qual:p?.with_check);
   if(!p||p.tablename!==table||p.cmd!==cmd||p.permissive!=='PERMISSIVE'||
      !Array.isArray(p.roles)||p.roles.length!==1||p.roles[0]!==role||
      ![m.scope,SRC,m.authorizationSha256,'WSSS'].every(x=>guard.includes(x)))hold('POLICY_SCOPE');
  }
  for(const [role,table,other] of [[R,'gate4_alert_prebind_original_v39','gate4_alert_owned_binding_v39'],
  [W,'gate4_alert_owned_binding_v39','gate4_alert_prebind_original_v39']]){
   const p=(await client.query(`SELECT
     has_schema_privilege($1,'clean','USAGE') AS schema_use,
     has_schema_privilege($1,'clean','CREATE') AS ddl,
     has_table_privilege($1,'clean.'||$2,'SELECT') AS rd,
     has_table_privilege($1,'clean.'||$2,'INSERT') AS ins,
     has_table_privilege($1,'clean.'||$2,'UPDATE') AS upd,
     has_table_privilege($1,'clean.'||$2,'DELETE') AS del,
     has_table_privilege($1,'clean.'||$3,'SELECT') AS cross`,[role,table,other])).rows[0];
   if(!p.schema_use||p.ddl||!p.rd||!p.ins||p.upd||p.del||p.cross)hold('ROLE_GRANTS');
  }
  return 'INSTALLED';
 }finally{
  if(begun)await client.query('ROLLBACK').catch(()=>{});
  await client.end().catch(()=>{});
 }
}
function runCommission(mode,flag,token){
 stage=mode.toUpperCase();
 const cp=spawnSync(process.execPath,['--import','tsx',SCRIPT,mode],{
  env:{...process.env,...(flag?{[flag]:token}:{})},stdio:'inherit'
 });
 if(cp.error||cp.status!==0)hold(mode.toUpperCase()+'_FAILED_NO_RETRY');
}
async function escalation(cs){
 stage='RECOVERY_ESCALATION';
 if(secureFile(paths.escalation))hold('PREVIOUS_ESCALATION_INTENT');
 createOnce(paths.escalation,{schema:'gate4.next4.recovery-escalation.v1',scope:m.scope,source:SRC,
  createdAt:new Date().toISOString(),neverRetry:true,existingRecoveryIntentPreserved:true});
 console.log('NEXT4_INDEPENDENT_RECOVERY_ESCALATION_RECORDED');
 let step='BEGIN';
 const client=new pg.Client({connectionString:cs.owner,connectionTimeoutMillis:6000,query_timeout:8000});
 let tx=false;
 try{
  await client.connect();await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');tx=true;
  step='LOCK';
  await client.query("SET LOCAL lock_timeout='2500ms'");
  await client.query("SET LOCAL statement_timeout='8000ms'");
  await client.query('SELECT pg_advisory_xact_lock(3904,20261026)');
  step='RECHECK';
  const r=await client.query('SELECT count(*)::int AS n FROM pg_roles WHERE rolname=ANY($1::text[])',[[R,W]]);
  const p=await client.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='clean' AND policyname=ANY($1::text[])",[policies.map(x=>x[0])]);
  const n=await client.query(`SELECT
   (SELECT count(*)::int FROM clean.gate4_alert_prebind_original_v39) AS originals,
   (SELECT count(*)::int FROM clean.gate4_alert_owned_binding_v39) AS bindings`);
  if(r.rows[0].n!==0||p.rows[0].n!==0||n.rows[0].originals!==3||n.rows[0].bindings!==3)hold('ESCALATION_BASELINE');
  const originals=(await client.query(`SELECT original_sha256 AS sha,original_wire AS wire
    FROM clean.gate4_alert_prebind_original_v39`)).rows;
  if(originals.length!==3||originals.some(x=>!Buffer.isBuffer(x.wire)||
    createHash('sha256').update(x.wire).digest('hex')!==x.sha))hold('ESCALATION_OLD_SHA');
  step='CREATE_RECEIVER';await client.query(next4RoleSQLV39(R,m.receiverPassword,4));
  step='CREATE_WRITER';await client.query(next4RoleSQLV39(W,m.writerPassword,1));
  const cmds=next4PolicySQLV39(m);
  for(let i=0;i<cmds.length;i++){step='POLICY_OR_GRANT_'+(i+1);await client.query(cmds[i]);}
  step='VERIFY_TRANSACTION';
  const got=await client.query(`SELECT policyname,tablename,cmd,permissive,roles::text[] AS roles,qual,with_check
    FROM pg_policies WHERE schemaname='clean' AND policyname=ANY($1::text[])`,[policies.map(x=>x[0])]);
  if(got.rows.length!==4)hold('ESCALATION_COUNT');
  for(const [name,table,cmd,role] of policies){
   const p=got.rows.find(x=>x.policyname===name),guard=String(cmd==='SELECT'?p?.qual:p?.with_check);
   if(!p||p.tablename!==table||p.cmd!==cmd||!Array.isArray(p.roles)||p.roles[0]!==role||
       p.roles.length!==1||![m.scope,SRC,m.authorizationSha256,'WSSS'].every(s=>guard.includes(s)))hold('ESCALATION_POLICY');
  }
  step='VERIFY_RESTRICTED_ROLES';
  const r2=(await client.query(`SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolinherit,
    rolcreaterole,rolcreatedb,rolreplication FROM pg_roles WHERE rolname=ANY($1::text[])`,[[R,W]])).rows;
  if(r2.length!==2||r2.some(x=>!x.rolcanlogin||x.rolsuper||x.rolbypassrls||
    x.rolinherit||x.rolcreaterole||x.rolcreatedb||x.rolreplication))hold('ESCALATION_ROLE_FLAGS');
  step='VERIFY_RESTRICTED_GRANTS';
  for(const [role,table,other] of [[R,'gate4_alert_prebind_original_v39','gate4_alert_owned_binding_v39'],
    [W,'gate4_alert_owned_binding_v39','gate4_alert_prebind_original_v39']]){
    const x=(await client.query(`SELECT
      has_schema_privilege($1,'clean','USAGE') AS use,
      has_schema_privilege($1,'clean','CREATE') AS ddl,
      has_table_privilege($1,'clean.'||$2,'SELECT') AS rd,
      has_table_privilege($1,'clean.'||$2,'INSERT') AS ins,
      has_table_privilege($1,'clean.'||$2,'UPDATE') AS upd,
      has_table_privilege($1,'clean.'||$2,'DELETE') AS del,
      has_table_privilege($1,'clean.'||$3,'SELECT') AS cross`,[role,table,other])).rows[0];
    if(!x.use||x.ddl||!x.rd||!x.ins||x.upd||x.del||x.cross)hold('ESCALATION_GRANTS');
  }
  step='COMMIT';await client.query('COMMIT');tx=false;
  console.log('NEXT4_ESCALATED_SQL_TRANSACTION_COMMITTED');
 }catch(e){
  const code=String(e?.code??'');console.log(JSON.stringify({stage:'ESCALATION_'+step,sqlstate:/^[A-Z0-9]{5}$/.test(code)?code:'NONE'}));throw e;
 }finally{if(tx)await client.query('ROLLBACK').catch(()=>{});await client.end().catch(()=>{});}
}
async function verifiedConfig(cs){
 stage='ENCRYPTED_RECEIVER_READBACK';
 const key=gate4Next4ConfigStorageKeyV39(SRC);
 if(!await store.exists(key))return false;
 const v=gate4Next4OpenSealedValuesV39(await store.downloadBytes(key),SRC,process.env);
 if(v.GATE4_PREBIND_SCOPE_ID!==m.scope||v.GATE4_PREBIND_AUTH_SHA256!==m.authorizationSha256||
    v.GATE4_PREBIND_DATABASE_URL!==cs.receiver||v.GATE4_PREBIND_APPROVED_DB_HOST!==cs.host||
    v.GATE4_PREBIND_WEBHOOK_SECRET!==m.webhookSecret)hold('SEALED_CONTENT_MISMATCH');
 return true;
}
async function sealRecovery(cs){
 stage='SEAL_RECOVERY';
 const rc=new pg.Client({connectionString:cs.receiver,connectionTimeoutMillis:6000,query_timeout:8000});
 try{await rc.connect();await gate4CheckAdditivePgRoleV39(rc,R);}finally{await rc.end().catch(()=>{});}
 if(secureFile(paths.sealEscalation))hold('PREVIOUS_SEAL_RECOVERY_INTENT');
 const v={
  V39_GATE4_PREBIND_ADD_ON_PREPAID:'1',ADB_AUTO_COLLECT:'false',
  GATE4_PREBIND_RELEASE_REVIEW:'EXPLICIT_NO_PROVIDER_RECEIVER',
  GATE4_PREBIND_APPROVED_SOURCE_COMMIT:SRC,
  GATE4_PREBIND_SCOPE_ID:m.scope,GATE4_PREBIND_AUTH_SHA256:m.authorizationSha256,
  GATE4_PREBIND_AIRPORT_ICAO:'WSSS',GATE4_PREBIND_DATABASE_URL:cs.receiver,
  GATE4_PREBIND_APPROVED_DB_HOST:cs.host,GATE4_PREBIND_WEBHOOK_SECRET:m.webhookSecret
 };
 gate4Next4ValidateValuesV39(v,SRC);
 createOnce(paths.sealEscalation,{schema:'gate4.next4.seal-escalation.v1',scope:m.scope,source:SRC,
  neverRetry:true,createdAt:new Date().toISOString()});
 const key=gate4Next4ConfigStorageKeyV39(SRC);
 if(await store.exists(key))hold('RACE_SEAL_EXISTING');
 await store.uploadBytes(key,gate4Next4SealValuesV39(v,SRC,process.env));
 console.log('NEXT4_SEAL_ESCALATION_WRITTEN');
}
try{
 requireRepo();
 await restoreManifest();
 const cs=roleURL();
 let apply=readIntent(paths.apply,'neverReapply');
 const recover=readIntent(paths.recover,'neverRetry');
 const seal=readIntent(paths.seal,'neverRewrite');
 readIntent(paths.escalation,'neverRetry');
 readIntent(paths.sealEscalation,'neverRetry');
 let s=await state();
 console.log(JSON.stringify({checkpoint:'NEXT4_STATE_ASSESSED',database:s,applyIntent:!!apply,
  recoveryIntent:!!recover,sealIntent:!!seal,sealedBlob:blob}));
 if(s==='EMPTY'){
  if(blob||seal)hold('EMPTY_DB_BUT_SEAL_PRESENT');
  if(!apply){
    // Preserve that this evidence was reconstructed after documented failed apply.
    createOnce(paths.apply,{scope:m.scope,source:SRC,createdAt:new Date().toISOString(),
      neverReapply:true,reconstructedAfterLocalStateLoss:true,
      evidence:'Gate4 issue 38: two original apply HOLDs, independent zero SQL roles/policies'});
    apply=true;
  }
  if(!recover){
    try{
      runCommission('--recover-once','GATE4_NEXT4_RECOVERY_GO',
        'AUTHORIZE_NEXT4_RECOVER_ROLLED_BACK_SQL_NO_PROVIDER');
    }catch(e){
      if(await state()!=='INSTALLED')throw e;
      console.log('NEXT4_SQL_COMMITTED_DESPITE_COMMISSIONER_HOLD');
    }
  }else{
    await escalation(cs);
  }
  s=await state();
  if(s!=='INSTALLED')hold('SQL_INSTALL_INDEPENDENT_CHECK');
 }
 console.log('NEXT4_SQL_INSTALLED_INDEPENDENTLY_VERIFIED');
 if(!apply){
   // SQL already installed and scope verified; recover missing local intent for --verify.
   createOnce(paths.apply,{scope:m.scope,source:SRC,createdAt:new Date().toISOString(),
     neverReapply:true,reconstructedAfterSqlVerification:true});
 }
 let sealed=await verifiedConfig(cs);
 if(!sealed){
   if(!seal){
    try{
      runCommission('--seal-once','GATE4_NEXT4_SEAL_GO',
        'AUTHORIZE_NEXT4_ENCRYPTED_CONFIG_STORAGE_NO_PROVIDER');
    }catch(e){
      if(!await verifiedConfig(cs))throw e;
      console.log('NEXT4_SEAL_OBJECT_VERIFIED_AFTER_COMMAND_HOLD');
    }
   }else{
    await sealRecovery(cs);
   }
   sealed=await verifiedConfig(cs);
   if(!sealed)hold('SEALED_OBJECT_ABSENT');
 }
 console.log('NEXT4_RECEIVER_ENCRYPTED_CONFIG_VERIFIED');
 runCommission('--verify');
 console.log('NEXT4_RECEIVER_SQL_AND_ENCRYPTED_CONFIG_VERIFIED');
 console.log('NEXT4_READY_TO_PUBLISH_NO_PROVIDER');
} catch(e){
 const code=String(e?.code??'');
 console.log(JSON.stringify({status:'NEXT4_STATE_AWARE_HOLD',failedStage:stage,
  reason:String(e?.message??'ERROR').startsWith('HOLD_')?e.message:'NONCATEGORICAL',
  sqlstate:/^[A-Z0-9]{5}$/.test(code)?code:'NONE',
  noAutomaticRetry:true,providerCalls:0}));
 process.exitCode=2;
}
NEXT4_STATE_AWARE
