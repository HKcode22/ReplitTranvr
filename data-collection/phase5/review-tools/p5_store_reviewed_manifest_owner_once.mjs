/** Phase5 final manifest persistence: existing metadata table, no new schema.
 * CLI is owner-local and runs with existing tsx. No provider or workflow dispatch.
 * Never creates an approval or derives a reviewed hash from the DB.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const H=/^[a-f0-9]{64}$/;
const hold=s=>{throw Error('HOLD_P5_MANIFEST_'+s)};
const hash=b=>createHash('sha256').update(b).digest('hex');
export function exactManifest(raw,stage){
 if(!Buffer.isBuffer(raw)||raw.length<100||raw.length>2*1024*1024||!H.test(stage?.manifestSha256??'')||hash(raw)!==stage.manifestSha256)hold('EXACT_REVIEWED_BYTES_REQUIRED');
 const value=raw.toString('utf8');if(!Buffer.from(value).equals(raw))hold('INVALID_UTF8');
 let m;try{m=JSON.parse(value)}catch{hold('INVALID_JSON')}
 if(!m||typeof m!=='object'||Array.isArray(m)||typeof m.schema!=='string'||!m.schema.startsWith('v39.')||m.scientificFreezeApproved!==true||m.sourceRightsApproved!==true||m.phase6PaidGo!==false||m.calendarRowsSha256!==stage.calendarSha256||m.configSha256!==stage.configSha256)hold('NOT_FINAL_REVIEWED_MANIFEST');
 return {key:'phase5_frozen_manifest:'+stage.manifestSha256,value,sha256:stage.manifestSha256};
}
function exactDisabled(a,p){return a?.authorization_id===p.phase6AuthorizationId&&a.manifest_sha256===p.manifestSha256&&a.calendar_hash===p.calendarSha256&&a.config_hash===p.configSha256&&a.code_sha===p.codeSha40&&a.schema_version==='v39'&&a.enabled===false&&a.revoked_at_utc===null;}
const selectAuth="SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,schema_version,enabled,revoked_at_utc FROM clean.adb_phase6_authorization WHERE singleton_key=true";
const meta="SELECT value FROM clean.adb_collection_meta WHERE key=$1";
async function checkSession(c,ctx,readonly){
 const who=(await c.query("SELECT current_database() db,current_user actor,session_user session_actor,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica")).rows[0];
 if(who?.db!=='neondb'||who.actor!==who.session_actor||who.ver<160000||who.ver>=170000||who.replica!==false||who.ro!==(readonly?'on':'off')||[ctx.review.expectedExactWriterRole,ctx.freezeReview.expectedExactBudgetWriterRole].includes(who.actor))hold('OWNER_SESSION_SCOPE');
}
export async function storeExactManifest(pool,ctx,raw,verifyApproved,checkCurrentMain){
 const m=exactManifest(raw,ctx.input);const c=await pool.connect();let begun=false,attempted=false;
 try{
  await c.query('BEGIN');begun=true;await c.query("SET LOCAL statement_timeout='12000ms'");await c.query("SET LOCAL lock_timeout='2000ms'");await checkSession(c,ctx,false);
  const lock=(await c.query("SELECT pg_try_advisory_xact_lock(hashtext('v39-phase6-provider-mutation')::bigint) ok")).rows[0];if(lock?.ok!==true)hold('OWNER_LOCK_BUSY');
  await c.query('LOCK TABLE clean.adb_phase6_authorization,clean.adb_collection_meta IN SHARE ROW EXCLUSIVE MODE');
  const a=(await c.query(selectAuth)).rows;if(a.length!==1||!exactDisabled(a[0],ctx.input))hold('DISABLED_STAGE_DRIFT');
  const prior=(await c.query(meta,[m.key])).rows;if(prior.length!==0)hold('MANIFEST_EXISTS_READBACK_ONLY');
  // Reuse the existing AUTH verifier and live DB clock, not new approval flags.
  await verifyApproved(new Date((await c.query('SELECT clock_timestamp() t')).rows[0].t));
  await checkCurrentMain();
  const insert=await c.query('INSERT INTO clean.adb_collection_meta(key,value) VALUES($1,$2)',[m.key,m.value]);if(insert.rowCount!==1)hold('INSERT_COUNT');
  attempted=true;await c.query('COMMIT');begun=false;
  return {status:'P5_REVIEWED_MANIFEST_STORED_NO_GO',manifestSha256:m.sha256,manifestBytes:raw.length,databaseWrites:1,providerCalls:0,phase6PaidGo:false};
 }catch(e){if(begun&&!attempted)await c.query('ROLLBACK').catch(()=>{});if(attempted&&begun)hold('UNKNOWN_COMMIT_READBACK_ONLY');throw e;}
 finally{c.release(attempted&&begun?new Error('P5_MANIFEST_UNKNOWN_COMMIT'):undefined);}
}
export async function readbackExactManifest(pool,ctx,raw){
 const m=exactManifest(raw,ctx.input),c=await pool.connect();let begun=false;
 try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');begun=true;await c.query("SET LOCAL statement_timeout='12000ms'");await checkSession(c,ctx,true);
 const a=(await c.query(selectAuth)).rows;if(a.length!==1||!exactDisabled(a[0],ctx.input))hold('DISABLED_STAGE_DRIFT');
 const rows=(await c.query(meta,[m.key])).rows;if(rows.length!==1||rows[0].value!==m.value||hash(Buffer.from(rows[0].value))!==m.sha256)hold('STORED_MANIFEST_MISSING_OR_DIFFERENT');
 await c.query('ROLLBACK');begun=false;return {status:'P5_EXACT_FROZEN_MANIFEST_READBACK_NO_GO',manifestSha256:m.sha256,manifestBytes:raw.length,verifiedReadOnly:true,databaseWrites:0,providerCalls:0,phase6PaidGo:false};
 }finally{if(begun)await c.query('ROLLBACK').catch(()=>{});c.release();}
}
async function main(){
 const [mode,manifestPath,stagePath,stageSha,costSha,authPath,authSha]=process.argv.slice(2);
 if(!['--store','--readback'].includes(mode)||process.argv.length!==(mode==='--store'?9:7))hold('OWNER_ARGUMENTS');
 const cmd=(c,a)=>execFileSync(c,a,{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:15000}).trim();
 const root=cmd('git',['rev-parse','--show-toplevel']);if(root!==process.cwd())hold('RUN_FROM_EXACT_CHECKOUT');
 const head=cmd('git',['rev-parse','HEAD']);const check=()=>{if(head!==cmd('gh',['api','repos/HKcode22/ReplitTranvr/git/ref/heads/main','--jq','.object.sha'])||cmd('git',['status','--porcelain','--untracked-files=no'])!=='')hold('EXACT_CURRENT_CLEAN_MAIN_REQUIRED')};check();
 const imp=p=>import(pathToFileURL(join(root,p)).href);
 const {admitP6InertOwnerReadback}=await imp('scripts/v39_phase6_inert_release_stage_manual_v39.mjs');
 const ctx=admitP6InertOwnerReadback(process.env,readFileSync(stagePath,'utf8'),stageSha,costSha,head);
 if(process.env.V39_DATABASE_RUNTIME_URL&&process.env.V39_DATABASE_RUNTIME_URL===ctx.url)hold('OWNER_NOT_RUNTIME');
 const raw=readFileSync(manifestPath);exactManifest(raw,ctx.input);
 let approved;
 if(mode==='--store'){
 const {verifyP6SourceEnableAuthFile}=await imp('scripts/v39_phase6_source_enable_approval_ledger_v39.ts');
 const {verifyP6SourceActivationReview}=await imp('scripts/v39_phase6_enable_source_owner_v39.ts');
 approved=now=>{const a=verifyP6SourceEnableAuthFile(authPath,head,now);if(a.verdict.verified!==true||a.artifactHash!==authSha)hold('ACTUAL_APPROVED_AUTH_REQUIRED');verifyP6SourceActivationReview(ctx,a,now);};
 approved(new Date());
 }
 const {Pool}=createRequire(join(root,'package.json'))('pg');const pool=new Pool({connectionString:ctx.url,max:2,connectionTimeoutMillis:8000,query_timeout:20000,application_name:'p5_reviewed_manifest_owner_once'});
 try{
 if(mode==='--store'){
  const {inspectP5V0093IndependentExactPostStage}=await imp('server/lib/disruption/phase5V0093IndependentPostStageReadback_v39.mjs');
  const r=await inspectP5V0093IndependentExactPostStage(pool,ctx.input,ctx.review,ctx.freezeReview);
  if(r.status!=='INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO'||r.authorizationEnabled!==false||r.exactReviewedStagePacketSha256!==stageSha||r.exactReviewedCostEnvelopeSha256!==costSha)hold('EXACT_INERT_STAGE_READBACK_REQUIRED');
  console.log(JSON.stringify(await storeExactManifest(pool,ctx,raw,approved,check)));
 }
 console.log(JSON.stringify(await readbackExactManifest(pool,ctx,raw)));check();
 }finally{await pool.end()}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{const s=String(e?.message??'');console.error(/^HOLD_P5_MANIFEST_[A-Z0-9_]+$/.test(s)?s:'HOLD_P5_MANIFEST_REDACTED_REVIEW_BEFORE_RETRY');process.exitCode=2});
