/** Owner-local, stopped, exact-main V0107 upgrade. No scheduler or paid enablement. */
import pg from 'pg';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const SQL='migrations/staged/V0107__phase5_verified_future_post_primary_expiry_margin_v39.sql';
const PROFILE='V0107_VERIFIED_FUTURE_POST_23H_MARGIN';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('HOLD_V0107_OWNER_'+x)};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',timeout:15000}).trim();
const expectedBody=(sql,tag)=>{
 const matches=[...sql.matchAll(new RegExp('AS \\$'+tag+'\\$([\\s\\S]*?)\\$'+tag+'\\$;', 'g'))];
 if(matches.length!==1)fail('SQL_BODY_SHAPE');
 return matches[0][1];
};
export function expectedV0107Bodies(sql){return {status:expectedBody(sql,'status'),sweep:expectedBody(sql,'sweep')}}
async function snapshot(c){
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  const env=(await c.query(`SELECT current_database() db,current_user actor,session_user login,
   current_setting('server_version_num')::int version,current_setting('transaction_read_only') ro,
   pg_is_in_recovery() replica`)).rows[0];
  if(env.db!=='neondb'||env.actor!=='neondb_owner'||env.login!=='neondb_owner'||
     env.version<160000||env.version>=170000||env.ro!=='on'||env.replica)fail('PG16_OWNER_REQUIRED');
  const stopped=(await c.query(`SELECT
   (SELECT count(*) FROM clean.adb_phase6_authorization WHERE enabled)::int auth,
   (SELECT count(*) FROM clean.adb_collection_batches WHERE status='ACTIVE')::int batches,
   (SELECT count(*) FROM clean.adb_collection_subs WHERE ended_at IS NULL)::int subs,
   (SELECT count(*) FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved)::int stops,
   (SELECT count(*) FROM clean.fids_query_response WHERE raw_payload IS NOT NULL)::int originals`)).rows[0];
  if(Object.values(stopped).some(x=>x!==0))fail('STOPPED_EMPTY_REQUIRED');
  const fn=(await c.query(`SELECT p.proname,p.prosrc,pg_get_userbyid(p.proowner) owner,p.prosecdef,
   p.provolatile FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='clean' AND p.oid=ANY(ARRAY[
    'clean.phase5_primary_fids_expiry_status_v39()'::regprocedure,
    'clean.phase5_primary_fids_expiry_sweep_v39(integer)'::regprocedure])`)).rows;
  if(fn.length!==2||fn.some(x=>x.owner!=='neondb_owner'||!x.prosecdef))fail('FUNCTION_OWNER_DRIFT');
  return {stopped,functions:Object.fromEntries(fn.map(x=>[x.proname.endsWith('status_v39')?'status':'sweep',x.prosrc])),
   volatility:Object.fromEntries(fn.map(x=>[x.proname.endsWith('status_v39')?'status':'sweep',x.provolatile]))};
 }finally{await c.query('ROLLBACK')}
}
async function main(){
 const mode=process.argv[2]??'review',e=process.env;
 if(process.argv.length>3||!['review','commission'].includes(mode)||e.GITHUB_ACTIONS==='true'||
  e.ADB_AUTO_COLLECT!=='0'||e.V39_PHASE6_PROCESS_ARMED!=='0'||e.V39_PHASE6_OWNER_APPROVED!=='0'||
  e.NODE_TLS_REJECT_UNAUTHORIZED==='0'||e.AERODATABOX_API_KEY||e.RAPIDAPI_KEY||e.AERODATABOX_WEBHOOK_SECRET||
  e.V39_DATABASE_RUNTIME_URL)fail('OWNER_DISARMED_ONLY');
 const pin=e.P5_V0107_OWNER_APPROVED_MAIN_SHA??'';
 if(!/^[0-9a-f]{40}$/.test(pin)||git('rev-parse','HEAD')!==pin||
  git('status','--porcelain','--untracked-files=no')||
  git('ls-remote','https://github.com/HKcode22/ReplitTranvr.git','refs/heads/main').split(/\s/)[0]!==pin||
  git('hash-object',SQL)!==git('rev-parse',pin+':'+SQL))fail('EXACT_CLEAN_MAIN_REQUIRED');
 const sql=readFileSync(SQL,'utf8'),expected=expectedV0107Bodies(sql);
 const url=new URL(e.DATABASE_URL??'postgresql://invalid');
 if(!['postgres:','postgresql:'].includes(url.protocol)||decodeURIComponent(url.username)!=='neondb_owner'||
  !url.password||url.pathname!=='/neondb'||!url.hostname.endsWith('.neon.tech')||
  !['require','verify-full'].includes(url.searchParams.get('sslmode')))fail('OWNER_TLS_URL_REQUIRED');
 url.searchParams.set('sslmode','verify-full');
 const c=new pg.Client({connectionString:url.toString(),connectionTimeoutMillis:8000,query_timeout:30000});
 try{
  await c.connect();
  const before=await snapshot(c);
  if(before.functions.status===expected.status&&before.functions.sweep===expected.sweep)
   fail('ALREADY_UPGRADED_DO_NOT_REPLAY');
  if(before.volatility.status!=='s'||before.volatility.sweep!=='v')fail('FUNCTION_VOLATILITY_DRIFT');
  const receipt={reviewedMainSha:pin,sqlSha256:hash(sql),endpointSha256:hash(url.host.toLowerCase()+url.pathname),
   oldStatusSha256:hash(before.functions.status),oldSweepSha256:hash(before.functions.sweep),profile:PROFILE,...before.stopped};
  const reviewSha256=hash(JSON.stringify(receipt));
  if(mode==='review'){
   console.log(JSON.stringify({status:'V0107_OWNER_REVIEW_ONLY_NO_GO',...receipt,reviewSha256,databaseWrites:0,providerCalls:0}));
   return;
  }
  if(e.P5_V0107_OWNER_APPROVAL!=='COMMISSION_EXACT_REVIEWED_V0107_STOPPED_NO_GO'||
   e.P5_V0107_OWNER_REVIEW_SHA256!==reviewSha256)fail('EXACT_REVIEW_APPROVAL_REQUIRED');
  // The staged SQL itself locks authorization and originals, verifies the exact
  // V0103 function bodies, and commits both replacements atomically.
  try{await c.query(sql)}catch{fail('INSTALL_RESULT_UNKNOWN_RECONCILE_NO_REPLAY')}
  const after=await snapshot(c);
  if(after.functions.status!==expected.status||after.functions.sweep!==expected.sweep)
   fail('COMMITTED_FUNCTION_READBACK_MISMATCH');
  console.log(JSON.stringify({status:'V0107_COMMISSIONED_PROFILE_STILL_DISABLED_NO_GO',...receipt,
   reviewSha256,committedFunctionReadback:true,databaseWrites:2,providerCalls:0,phase6PaidGo:false}));
 }finally{await c.end().catch(()=>{})}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main().catch(e=>{console.error(/^HOLD_V0107_OWNER_[A-Z0-9_]+$/.test(e?.message??'')?e.message:'HOLD_V0107_OWNER_REDACTED');process.exitCode=2});
