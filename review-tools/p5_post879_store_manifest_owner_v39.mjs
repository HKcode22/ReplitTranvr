#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import pg from 'pg';
const {Pool}=pg;

const REPO='HKcode22/ReplitTranvr';
const EXPECTED_MAIN='f63ec7572aefbe805489317b54882e97f77a1989';
const H=/^[a-f0-9]{64}$/;
const sha=x=>createHash('sha256').update(x).digest('hex');
const hold=s=>{throw new Error('HOLD_P5_POST879_MANIFEST_'+s);};
const need=(x,s)=>{if(!x)hold(s);};
const cmd=(c,a)=>execFileSync(c,a,{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:30000,maxBuffer:4*1024*1024}).trim();

export function validateRightsDeferredManifestRaw(raw,expectedSha){
 need(typeof raw==='string'&&Buffer.byteLength(raw)>=100&&Buffer.byteLength(raw)<=2*1024*1024&&H.test(expectedSha),'INPUT');
 need(sha(raw)===expectedSha,'DIGEST');
 let m;try{m=JSON.parse(raw);}catch{hold('INVALID_JSON');}
 need(JSON.stringify(m)===raw,'NONCANONICAL_JSON');
 need(typeof m.schema==='string'&&m.schema.startsWith('v39.')&&
  m.status==='PHASE5_SCIENTIFIC_FREEZE_RIGHTS_DEFERRED_NO_GO'&&
  m.scientificFreezeApproved===true&&m.finalPredecessorsApproved===true&&
  m.sourceRightsApproved===false&&m.sourceUseDeferredToPhase6Activation===true&&
  Array.isArray(m.phase5PredecessorEvidenceIds)&&m.phase5PredecessorEvidenceIds.length===28&&
  new Set(m.phase5PredecessorEvidenceIds).size===28&&
  m.sourceRightsEvidenceIdReserved==='GATE-20261119-SOURCERIGHTSACTIVATION'&&
  !m.phase5PredecessorEvidenceIds.includes(m.sourceRightsEvidenceIdReserved)&&
  m.phase6PaidGo===false&&H.test(m.calendarRowsSha256??'')&&H.test(m.configSha256??''),
  'BOUNDARY_FIELDS');
 return m;
}

function privateFile(p){
 const s=lstatSync(p);
 need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=2*1024*1024,'PRIVATE_FILE');
 return readFileSync(p,'utf8');
}

async function store(pool,manifestRaw,manifestSha){
 const m=validateRightsDeferredManifestRaw(manifestRaw,manifestSha);
 const key='phase5_frozen_manifest:'+manifestSha;
 const c=await pool.connect();let open=false,commitAttempted=false,wrote=0;
 try{
  await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');open=true;
  await c.query("SET LOCAL statement_timeout='20000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const who=(await c.query("SELECT current_database() db,current_user actor,session_user session_actor,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica")).rows[0];
  need(who?.db==='neondb'&&who.actor===who.session_actor&&who.actor==='neondb_owner'&&who.ver>=160000&&who.ver<170000&&who.ro==='off'&&who.replica===false,'OWNER_DB_SCOPE');
  need((await c.query("SELECT pg_try_advisory_xact_lock(hashtext('v39-phase6-provider-mutation')::bigint) ok")).rows[0]?.ok===true,'OWNER_LOCK_BUSY');
  await c.query('LOCK TABLE clean.adb_collection_meta,clean.adb_phase6_authorization,clean.adb_phase6_calendar_day,clean.phase5_fids_cycle_budget_v39,clean.phase5_fids_utc_charge_budget_v39,clean.phase5_fids_seven_rest_release_v39,clean.phase5_fids_cycle_rest_category_cap_v39,clean.phase5_fids_utc_rest_category_budget_v39,clean.adb_incident_stop,clean.adb_probe_budget_day,clean.adb_collection_batches,clean.adb_collection_subs IN SHARE ROW EXCLUSIVE MODE');
  const state=(await c.query("SELECT (SELECT count(*)::int FROM clean.adb_phase6_authorization) auth,(SELECT count(*)::int FROM clean.adb_phase6_calendar_day) calendar,(SELECT count(*)::int FROM clean.phase5_fids_cycle_budget_v39) cycle,(SELECT count(*)::int FROM clean.phase5_fids_utc_charge_budget_v39) charge,(SELECT count(*)::int FROM clean.phase5_fids_seven_rest_release_v39) release,(SELECT count(*)::int FROM clean.phase5_fids_cycle_rest_category_cap_v39) caps,(SELECT count(*)::int FROM clean.phase5_fids_utc_rest_category_budget_v39) categories,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents,(SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') open_budget,(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE' OR run_day_index IS NOT NULL) batches,(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subscriptions")).rows[0];
  need(state&&['auth','calendar','cycle','charge','release','caps','categories','incidents','open_budget','batches','subscriptions'].every(k=>state[k]===0),'NOT_CLEAN_PRECOMMISSION_STATE');
  const rows=(await c.query('SELECT value FROM clean.adb_collection_meta WHERE key=$1',[key])).rows;
  if(rows.length===0){
   const q=await c.query('INSERT INTO clean.adb_collection_meta(key,value) VALUES($1,$2)',[key,manifestRaw]);
   need(q.rowCount===1,'INSERT');wrote=1;
  }else{
   need(rows.length===1&&rows[0].value===manifestRaw&&sha(rows[0].value)===manifestSha,'EXISTING_VALUE_DIFFERS');
  }
  commitAttempted=true;await c.query('COMMIT');open=false;
 }catch(e){
  if(open&&!commitAttempted)await c.query('ROLLBACK').catch(()=>{});
  if(commitAttempted)hold('UNKNOWN_COMMIT_READBACK_ONLY_NO_REPLAY');
  throw e;
 }finally{
  c.release(commitAttempted&&open?new Error('UNKNOWN_MANIFEST_COMMIT'):undefined);
 }
 const r=await pool.connect();let ro=false;
 try{
  await r.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');ro=true;
  const who=(await r.query("SELECT current_database() db,current_user actor,session_user session_actor,current_setting('transaction_read_only') ro")).rows[0];
  need(who?.db==='neondb'&&who.actor===who.session_actor&&who.actor==='neondb_owner'&&who.ro==='on','READBACK_SCOPE');
  const rows=(await r.query('SELECT value FROM clean.adb_collection_meta WHERE key=$1',[key])).rows;
  need(rows.length===1&&rows[0].value===manifestRaw&&sha(rows[0].value)===manifestSha,'READBACK_BYTES');
  const auth=(await r.query('SELECT count(*)::int n FROM clean.adb_phase6_authorization')).rows[0]?.n;
  need(auth===0,'AUTH_CREATED_DURING_MANIFEST_STORE');
  await r.query('ROLLBACK');ro=false;
  return {status:'PHASE5_RIGHTS_DEFERRED_MANIFEST_STORED_EXACT_NO_GO',manifestSha256:manifestSha,calendarRowsSha256:m.calendarRowsSha256,configSha256:m.configSha256,manifestRowsWritten:wrote,independentReadOnlyBytesMatch:true,authorizationRows:0,providerCalls:0,databaseWrites:wrote,phase6PaidGo:false};
 }finally{
  if(ro)await r.query('ROLLBACK').catch(()=>{});
  r.release();
 }
}

async function main(){
 const [mode,path,expectedSha]=process.argv.slice(2);
 need(['--validate-only','--store-exact'].includes(mode)&&path&&H.test(expectedSha??''),'ARGS');
 const raw=privateFile(resolve(path));
 const m=validateRightsDeferredManifestRaw(raw,expectedSha);
 if(mode==='--validate-only'){
  console.log(JSON.stringify({status:'PHASE5_RIGHTS_DEFERRED_MANIFEST_VALID_NO_GO',manifestSha256:expectedSha,calendarRowsSha256:m.calendarRowsSha256,configSha256:m.configSha256,sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,phase6PaidGo:false}));
  return;
 }
 need(process.env.GITHUB_ACTIONS!=='true'&&process.env.ADB_AUTO_COLLECT==='0'&&process.env.V39_PHASE6_PROCESS_ARMED==='0'&&process.env.V39_PHASE6_OWNER_APPROVED==='0'&&!process.env.AERODATABOX_API_KEY&&!process.env.AERODATABOX_WEBHOOK_SECRET&&!process.env.RAPIDAPI_KEY,'OWNER_STOP_SCOPE');
 need(cmd('gh',['api',`repos/${REPO}/git/ref/heads/main`,'--jq','.object.sha'])===EXPECTED_MAIN,'MAIN_CHANGED');
 need(process.env.DATABASE_URL&&(!process.env.V39_DATABASE_RUNTIME_URL||process.env.DATABASE_URL!==process.env.V39_DATABASE_RUNTIME_URL),'OWNER_DB_URL');
 const u=new URL(process.env.DATABASE_URL);u.searchParams.set('sslmode','verify-full');
 const pool=new Pool({connectionString:u.toString(),max:1,connectionTimeoutMillis:8000,query_timeout:20000,application_name:'p5_post879_manifest_store'});
 try{console.log(JSON.stringify(await store(pool,raw,expectedSha)));}finally{await pool.end();}
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{const m=String(e?.message??'');console.error(/^HOLD_P5_POST879_MANIFEST_[A-Z0-9_]+$/.test(m)?m:'HOLD_P5_POST879_MANIFEST_REDACTED');process.exitCode=2;});
}
