'use strict';
// One exact staged V0104 install (no provider, role, grant, data row or
// authorization changes). Default verify-only; explicit owner apply once.
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const FN='phase5_physical_rest_live_guard_v39';
const EXPECTED_BLOB='578c76e025bf761f61803e3d70af40ae4a8136e8';
const PR_HEAD='c7d41ad2a94084432a8a2bf3c157bd0a316f052d';
const SQL_PATH='migrations/staged/V0104__phase5_physical_rest_live_authority_retention_guard_v39.sql';
const TABLES=['phase5_fids_physical_attempt_v39','phase5_other_rest_physical_reservation_v39'];
const TRIGGERS=['a00_phase5_fids_physical_rest_live_guard_v39','a00_phase5_other_physical_rest_live_guard_v39'];
const hold=s=>{throw Error('HOLD_P5_V0104_OWNER_'+s);};
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
function parseMigration(b){
 if(!Buffer.isBuffer(b)||gitBlob(b)!==EXPECTED_BLOB)hold('EXACT_SQL_BLOB_REQUIRED');
 const sql=b.toString('utf8');
 const m=sql.match(/AS \$guard\$([\s\S]*?)\$guard\$;/);
 if(!m||sql.split('\nBEGIN;\n').length!==2||!sql.trimEnd().endsWith('COMMIT;')||
    (sql.match(/^COMMIT;$/gm)||[]).length!==1)hold('SQL_WRAPPER_DRIFT');
 return {body:sql.replace('\nBEGIN;\n','\n').replace(/\nCOMMIT;\s*$/,'\n'),prosrc:m[1]};
}
const WHO_SQL="SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,current_setting('session_replication_role') repl,pg_is_in_recovery() replica,pg_get_userbyid(nspowner) schema_owner FROM pg_namespace WHERE nspname='clean'";
const STOP_SQL=`SELECT
 (SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled) enabled,
 (SELECT count(*)::int FROM clean.adb_collection_batches WHERE status IN ('STARTING','ACTIVE')) batches,
 (SELECT count(*)::int FROM clean.adb_collection_segments WHERE status IN ('STARTING','ACTIVE')) segments,
 (SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subscriptions,
 (SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents,
 (SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39 WHERE state='ACTIVE' AND last_reserved_attempt=0) active_unreserved`;
const EXISTING_SQL=`SELECT count(*)::int n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='clean' AND p.oid IN (
 to_regprocedure('clean.phase5_primary_fids_expiry_status_v39()'),
 to_regprocedure('clean.phase5_primary_fids_expiry_receipt_v39(text)'),
 to_regprocedure('clean.phase5_primary_fids_expiry_sweep_v39(integer)'),
 to_regprocedure('clean.phase5_primary_fids_expiry_stop_v39(text)'),
 to_regprocedure('clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text)'),
 to_regprocedure('clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)'))`;
const FN_SQL=`SELECT p.oid::text oid,pg_get_userbyid(p.proowner) owner,p.prosrc,
 p.pronargs::int nargs,p.prosecdef definer,p.provolatile vol,p.prokind kind,
 p.prorettype='trigger'::regtype ret_trigger,l.lanname lang,p.proconfig config,
 NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  WHERE a.grantee<>p.proowner OR a.privilege_type<>'EXECUTE') owner_only
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='clean' AND p.proname=$1`;
const TRIGGER_SQL=`SELECT t.tgname name,c.relname tbl,pg_get_userbyid(c.relowner) owner,
 t.tgenabled enabled,t.tgfoid::text fn,t.tgtype::int type,t.tgnargs::int nargs,
 t.tgqual IS NULL no_when,t.tgattr::text attrs,t.tgconstraint=0 no_constraint,
 t.tgdeferrable deferred,t.tginitdeferred initdeferred,t.tgoldtable oldtable,t.tgnewtable newtable
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='clean' AND NOT t.tgisinternal AND (c.relname=ANY($1::text[]) OR t.tgname=ANY($2::text[]))
 ORDER BY c.relname,t.tgname`;
const COUNTS_SQL=`SELECT
 (SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39) source_attempts,
 (SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39) other_attempts`;
const REQUIRED=['phase5_fids_require_actual_prearm_v39','phase5_fids_v0082_seven_rest_before_physical'];
const one=(r,label)=>{if(r?.rows?.length!==1)hold(label);return r.rows[0];};
const zeros=(obj,keys)=>!!obj&&Object.keys(obj).sort().join('|')===[...keys].sort().join('|')&&keys.every(k=>obj[k]===0);
function exactGuard(f,t,prosrc){
 if(!f||f.owner!=='neondb_owner'||f.prosrc!==prosrc||f.nargs!==0||f.definer!==true||
    f.vol!=='v'||f.kind!=='f'||f.ret_trigger!==true||f.lang!=='plpgsql'||f.owner_only!==true||
    !Array.isArray(f.config)||f.config.length!==1||f.config[0].replace(/\s/g,'')!=='search_path=pg_catalog,pg_temp')
   hold('FUNCTION_DEFINITION_OR_ACL_MISMATCH_NO_REPLAY');
 if(t.length!==2||TRIGGERS.some((name,i)=>!t.some(x=>x.name===name&&x.tbl===TABLES[i]&&
    x.owner==='neondb_owner'&&x.enabled==='O'&&x.fn===f.oid&&x.type===7&&x.nargs===0&&
    x.no_when===true&&x.attrs===''&&x.no_constraint===true&&x.deferred===false&&
    x.initdeferred===false&&x.oldtable===null&&x.newtable===null)))
   hold('TRIGGER_DEFINITION_MISMATCH_NO_REPLAY');
}
async function inspect(c,prosrc,readonly){
 const who=one(await c.query(WHO_SQL),'IDENTITY');
 if(who.db!=='neondb'||who.actor!=='neondb_owner'||who.login!==who.actor||
    who.schema_owner!==who.actor||!Number.isInteger(who.ver)||who.ver<160000||who.ver>=170000||
    who.ro!==(readonly?'on':'off')||who.replica!==false||who.repl!=='origin')hold('EXISTING_PG16_OWNER_REQUIRED');
 if(!zeros(one(await c.query(STOP_SQL),'STOP_QUERY'),['enabled','batches','segments','subscriptions','incidents','active_unreserved']))
    hold('COLLECTION_OR_INCIDENT_NOT_STOPPED');
 if(one(await c.query(EXISTING_SQL),'MISSING_PREDECESSORS').n!==6)hold('EXISTING_V0079_V0083_V0103_REQUIRED');
 const f=(await c.query(FN_SQL,[FN])).rows;
 const ts=(await c.query(TRIGGER_SQL,[TABLES,TRIGGERS])).rows;
 if(ts.some(t=>t.owner!=='neondb_owner')||REQUIRED.some(n=>!ts.some(t=>t.tbl===TABLES[0]&&t.name===n&&t.enabled==='O')))
    hold('EXISTING_SOURCE_TRIGGER_OR_OWNER_DRIFT');
 const t=ts.filter(x=>TRIGGERS.includes(x.name)||f.some(y=>y.oid===x.fn));
 const legacy=ts.filter(x=>!t.includes(x));
 if(f.length===0&&t.length===0){}else if(f.length===1)exactGuard(f[0],t,prosrc);else hold('PARTIAL_OR_DUPLICATE_FUNCTION_NO_REPLAY');
 const counts=one(await c.query(COUNTS_SQL),'ATTEMPT_COUNT');
 if(Object.keys(counts).length!==2||!['source_attempts','other_attempts'].every(k=>Number.isSafeInteger(counts[k])&&counts[k]>=0))hold('ATTEMPT_COUNT_INVALID');
 return {installed:f.length===1,legacy,counts};
}
async function readonly(c,prosrc){
 let begun=false;
 try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');begun=true;
  await c.query("SET LOCAL statement_timeout='15000ms'");
  return await inspect(c,prosrc,true);
 }finally{if(begun)await c.query('ROLLBACK');}
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function apply(c,parsed,expected){
 let open=false,commit=false;
 try{
  await c.query('BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE');open=true;
  await c.query("SET LOCAL lock_timeout='5000ms'; SET LOCAL statement_timeout='30000ms'");
  // Fence all existing stopped-state writers and both reservation ledgers.
  // No long-lived work; owner DDL is one indivisible transaction.
  await c.query('LOCK TABLE clean.adb_phase6_authorization,clean.adb_collection_batches,clean.adb_collection_segments,clean.adb_collection_subs,clean.adb_incident_stop,clean.phase5_fids_allowed_query_v39,clean.phase5_fids_physical_attempt_v39,clean.phase5_other_rest_physical_reservation_v39 IN SHARE ROW EXCLUSIVE MODE');
  const before=await inspect(c,parsed.prosrc,false);
  if(before.installed)hold('ALREADY_INSTALLED_VERIFY_ONLY');
  if(!same(before,expected))hold('REVIEW_STATE_CHANGED');
  await c.query(parsed.body);
  const after=await inspect(c,parsed.prosrc,false);
  if(!after.installed||!same(after.legacy,before.legacy)||!same(after.counts,before.counts))hold('IN_TRANSACTION_READBACK_DRIFT');
  commit=true;await c.query('COMMIT');open=false;
 }catch(e){
  if(open&&!commit){if(!await c.query('ROLLBACK').then(()=>true).catch(()=>false))hold('ROLLBACK_UNKNOWN_NO_REPLAY');}
  if(commit)hold('COMMIT_UNKNOWN_READONLY_RECONCILE_NO_REPLAY');
  throw e;
 }
}
function safeUrl(env){
 if(env.GITHUB_ACTIONS==='true'||env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||
  env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||
  env.ADB_AUTO_COLLECT!=='0'||env.V39_PHASE6_PROCESS_ARMED!=='0'||env.V39_PHASE6_OWNER_APPROVED!=='0')
  hold('OWNER_LOCAL_NO_PROVIDER_ONLY');
 let u;try{u=new URL(env.DATABASE_URL);}catch{hold('EXISTING_OWNER_TLS_URL_REQUIRED');}
 if(!['postgres:','postgresql:'].includes(u.protocol)||decodeURIComponent(u.username)!=='neondb_owner'||
  !u.password||!u.hostname.endsWith('.neon.tech')||u.pathname!=='/neondb'||u.hash||
  !['require','verify-full'].includes(u.searchParams.get('sslmode'))||
  [...u.searchParams.keys()].some(k=>!['sslmode','channel_binding'].includes(k))||
  u.searchParams.getAll('sslmode').length!==1||env.V39_DATABASE_RUNTIME_URL===env.DATABASE_URL)
  hold('EXISTING_DISTINCT_OWNER_TLS_URL_REQUIRED');
 u.searchParams.set('sslmode','verify-full');return u.toString();
}
const gh=args=>execFileSync('gh',['api',...args],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:20000,maxBuffer:1024*1024}).trim();
function pinMain(){
 const repo='repos/HKcode22/ReplitTranvr';
 const p=JSON.parse(gh([repo+'/pulls/857']));
 const main=gh([repo+'/git/ref/heads/main','--jq','.object.sha']);
 if(p.merged!==true||p.head?.sha!==PR_HEAD||p.merge_commit_sha!==main||
    !/^[0-9a-f]{40}$/.test(main))hold('REVIEWED_PR_NOT_EXACT_CURRENT_MAIN');
 const reviewedTree=gh([repo+'/git/commits/'+PR_HEAD,'--jq','.tree.sha']);
 const mainTree=gh([repo+'/git/commits/'+main,'--jq','.tree.sha']);
 if(reviewedTree!==mainTree||gh([repo+'/contents/'+SQL_PATH+'?ref='+main,'--jq','.sha'])!==EXPECTED_BLOB)
  hold('MERGED_TREE_OR_SQL_DRIFT');
 for(const id of [43992868067,43992868038,43992868175,43992868129,43992868105,43992868106,43992868028]){
  const r=JSON.parse(gh([repo+'/actions/runs/'+id]));
  if(r.head_sha!==PR_HEAD||r.status!=='completed'||r.conclusion!=='success'||r.run_attempt!==1)
   hold('EXACT_REVIEWED_CI_REQUIRED');
 }
 return main;
}
function view(state,main){
 return {status:state.installed?'V0104_EXACTLY_INSTALLED_READONLY_NO_GO':'V0104_ABSENT_REVIEW_ONLY_NO_GO',
   reviewedMainSha:main,sqlBlob:EXPECTED_BLOB,existingFunctions:state.installed?1:0,
   existingNewTriggers:state.installed?2:0,legacyTriggers:state.legacy.length,
   sourceAttempts:state.counts.source_attempts,otherAttempts:state.counts.other_attempts,
   authorizationEnabled:false,providerCalls:0,dataRowWrites:0,newRoles:0,phase6PaidGo:false};
}
async function main(){
 const [mode,file]=process.argv.slice(2);
 if(process.argv.length!==4||!['--verify','--apply'].includes(mode))hold('EXACT_MODE_SQL_ARGUMENTS');
 const parsed=parseMigration(readFileSync(file));
 const url=safeUrl(process.env),reviewedMain=pinMain();
 const pg=require(require.resolve('pg',{paths:[process.cwd()]}));
 const newClient=()=>new pg.Client({connectionString:url,connectionTimeoutMillis:8000,query_timeout:40000,application_name:'p5_v0104_owner_once'});
 async function withClient(fn){const c=newClient();try{await c.connect();return await fn(c);}finally{await c.end().catch(()=>{});}}
 const review=await withClient(c=>readonly(c,parsed.prosrc));
 console.log(JSON.stringify(view(review,reviewedMain)));
 if(mode==='--verify'||review.installed)return;
 if(!process.stdin.isTTY||!process.stderr.isTTY)hold('INTERACTIVE_OWNER_CONFIRM_REQUIRED');
 const readline=require('node:readline/promises');
 const l=readline.createInterface({input:process.stdin,output:process.stderr});
 let approval;try{approval=await l.question('Install one restricted function and two triggers, no provider or data changes. Type INSTALL V0104: ');}finally{l.close();}
 if(approval!=='INSTALL V0104')hold('OWNER_DECLINED');
 if(pinMain()!==reviewedMain)hold('MAIN_CHANGED');
 await withClient(c=>apply(c,parsed,review));
 // Fresh connection; failure after commit is not permission to replay.
 let verified;try{verified=await withClient(c=>readonly(c,parsed.prosrc));
  if(!verified.installed||!same(verified.legacy,review.legacy)||!same(verified.counts,review.counts)||pinMain()!==reviewedMain)
   hold('FRESH_READBACK_DRIFT');
 }catch{hold('POSTCOMMIT_UNKNOWN_VERIFY_ONLY_NO_REPLAY');}
 console.log(JSON.stringify({...view(verified,reviewedMain),status:'V0104_INSTALLED_FRESH_READBACK_NO_GO',functionsInstalled:1,triggersInstalled:2,oldTriggersPreserved:true,newTables:0,freshConnectionReadback:true}));
}
module.exports={parseMigration,exactGuard,inspect,readonly,apply,safeUrl,view,WHO_SQL,STOP_SQL,EXISTING_SQL,FN_SQL,TRIGGER_SQL,COUNTS_SQL,TABLES,TRIGGERS};
if(require.main===module)main().catch(e=>{const m=String(e?.message??'');console.error(/^HOLD_P5_V0104_OWNER_[A-Z0-9_]+$/.test(m)?m:'HOLD_P5_V0104_OWNER_REDACTED_REVIEW_NO_REPLAY');process.exitCode=2;});
