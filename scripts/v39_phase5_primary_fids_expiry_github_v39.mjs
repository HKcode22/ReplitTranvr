/** STOP-default, GitHub-only primary FIDS expiry candidate.
 * Uses the existing five-column metadata reader and a proposed function-only
 * distinct writer. No owner URL, provider credentials, object SDK, or direct
 * table grants. V0103 must separately be installed and exact ACLs approved.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {TLSSocket,checkServerIdentity} from "node:tls";
import {runP6PrivateEpochExpiryCore} from "./v39_phase6_private_epoch_expiry_runtime_v39.mjs";
import {RETENTION_READER_REQUIRED_COLUMNS} from "./v39_phase5_retention_metadata_private_readonly_sentinel_v39.mjs";

export const P5_PRIMARY_WRITER="phase5_primary_fids_expiry_prod20261116";
export const P5_PRIMARY_READER="phase5_retention_reader_prod20261114";
export const P5_PRIMARY_APPLY="APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER";
export const P5_PRIMARY_SQL="migrations/staged/V0103__phase5_bounded_primary_fids_expiry_inert_v39.sql";
const F="phase5_primary_fids_expiry_";
const PREFIX="P5-PRIMARY-FIDS-SWEEP-";
const RUN=new RegExp("^"+PREFIX+"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$");
const BATCH=32, MAX_BATCHES=8;
const REPO="HKcode22/ReplitTranvr", BLOB="clean.provider_content_blob_ref";
const HOLD=x=>{throw Error("HOLD_P5_PRIMARY_FIDS_EXPIRY_"+x);};
const n=x=>Number.isSafeInteger(x)&&x>=0;
const hash=x=>createHash("sha256").update(x).digest("hex");
const defs=Object.freeze([
 {name:"status",args:"",result:"jsonb",vol:"s",lock:false,actor:"reader"},
 {name:"receipt",args:"text",result:"jsonb",vol:"s",lock:false,actor:"reader"},
 {name:"sweep",args:"integer",result:"jsonb",vol:"v",lock:true,actor:"writer"},
 {name:"stop",args:"text",result:"boolean",vol:"v",lock:true,actor:"writer"}
]);
const PRIVATE_F="phase6_private_epoch_expiry_";
export const P6_PRIVATE_EXPIRY_SQL="migrations/staged/V0105__phase6_bounded_private_epoch_expiry_inert_v39.sql";
export const P6_PRIVATE_EXPIRY_APPLY="APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER";
const privateDefs=Object.freeze([
 {name:"status",args:"text",result:"jsonb",vol:"s",lock:false,actor:"reader",privateExpiry:true},
 {name:"receipt",args:"text, text",result:"jsonb",vol:"s",lock:false,actor:"reader",privateExpiry:true},
 {name:"sweep",args:"text, integer",result:"jsonb",vol:"v",lock:true,actor:"writer",privateExpiry:true},
 {name:"stop",args:"text",result:"boolean",vol:"v",lock:true,actor:"writer",privateExpiry:true}
]);
const fn=d=>(d.privateExpiry?PRIVATE_F:F)+d.name+"_v39";
export function admitP6PrivateExpiryExtension(env,primaryApply){
 const mode=env.P6_PRIVATE_EPOCH_EXPIRY_MODE||"OFF";
 const manifest=env.P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256||"";
 const approval=env.P6_PRIVATE_EPOCH_EXPIRY_APPROVAL||"";
 if(mode==="OFF"){
  if(manifest||approval)HOLD("PRIVATE_EXTENSION_OFF_CONFIG_DRIFT");
  return {enabled:false,apply:false};
 }
 if(!["VERIFY_ONLY","APPLY_DUE_ONLY"].includes(mode)||!/^[a-f0-9]{64}$/.test(manifest)||
    (approval&&approval!==P6_PRIVATE_EXPIRY_APPLY)||
    (mode==="APPLY_DUE_ONLY"&&approval!==P6_PRIVATE_EXPIRY_APPLY))
  HOLD("PRIVATE_EXTENSION_EXACT_SCOPE_REQUIRED");
 return {enabled:true,apply:primaryApply===true&&mode==="APPLY_DUE_ONLY",manifest};
}
const disposable=()=>process.env.GITHUB_ACTIONS==="true"&&
 process.env.V39_P5_PRIMARY_FIDS_DISPOSABLE_PG16==="1"&&
 process.env.DATABASE_URL==="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
function scopedUrl(raw,role){
 try{
  const u=new URL(raw??"");
  if(!["postgres:","postgresql:"].includes(u.protocol)||decodeURIComponent(u.username)!==role||
     !u.password||u.pathname!=="/neondb"||!u.hostname.endsWith(".neon.tech")||u.hash||
     !["require","verify-full"].includes(u.searchParams.get("sslmode"))||
     [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k)))
   HOLD("SCOPED_TLS_CONNECTION_REQUIRED");
  u.searchParams.set("sslmode","verify-full");
  return {url:u.toString(),endpoint:u.host.toLowerCase()+u.pathname};
 }catch{HOLD("SCOPED_TLS_CONNECTION_REQUIRED");}
}
export function admitP5PrimaryExpiryGithub(env){
 const mode=env.P5_PRIMARY_FIDS_EXPIRY_MODE,sha=env.GITHUB_SHA??"";
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
   !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME)||env.GITHUB_RUN_ATTEMPT!=="1"||
   !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID??"")||!/^[a-f0-9]{40}$/.test(sha)||
   env.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA!==sha||!["VERIFY_ONLY","APPLY_DUE_ONLY"].includes(mode)||
   env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
   env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
   ["DATABASE_URL","V39_DATABASE_RUNTIME_URL","AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET",
    "V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL",
    "P5_RECURRING_EXPIRY_WRITER_URL"].some(k=>env[k]))HOLD("EXACT_NONPAID_MAIN_SCOPE_REQUIRED");
 if(mode==="APPLY_DUE_ONLY"&&(env.P5_PRIMARY_FIDS_EXPIRY_APPROVAL!==P5_PRIMARY_APPLY||
   env.P5_PRIMARY_FIDS_EXPIRY_ENABLED!=="true"))HOLD("SEPARATE_APPLY_APPROVAL_REQUIRED");
 const w=scopedUrl(env.P5_PRIMARY_FIDS_SWEEP_DATABASE_URL,P5_PRIMARY_WRITER);
 const r=scopedUrl(env.P5_RETENTION_READER_DATABASE_URL,P5_PRIMARY_READER);
 if(w.endpoint!==r.endpoint||hash(w.endpoint)!==env.P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256)
   HOLD("EXACT_SAME_EXISTING_ENDPOINT_REQUIRED");
 return {apply:mode==="APPLY_DUE_ONLY",writerUrl:w.url,readerUrl:r.url,sha,
  privateExpiry:admitP6PrivateExpiryExtension(env,mode==="APPLY_DUE_ONLY")};
}
function verifyTls(c){
 const stream=c.connection?.stream,host=c.connectionParameters?.host;
 if(!(stream instanceof TLSSocket)||stream.authorized!==true||stream.encrypted!==true||
    !["TLSv1.2","TLSv1.3"].includes(stream.getProtocol()??"")||
    !host||!stream.getPeerCertificate()||checkServerIdentity(host,stream.getPeerCertificate())!==undefined)
   HOLD("ACTUAL_TLS_VERIFICATION_FAILED");
}
/** Review actual production function definitions and all granted authority.
 * Disposable bypass of TLS/role names strictly gated on test-only URL.
 */
export async function verifyP5PrimaryExpiryActor(c,actor,{test=false,role,owner="neondb_owner",writerRole=P5_PRIMARY_WRITER,readerRole=P5_PRIMARY_READER,privateExpiry=false}={}){
 if(!["writer","reader"].includes(actor)||typeof privateExpiry!=="boolean"||test&&!disposable())HOLD("ACTOR_TEST_SCOPE");
 const expected=test?role:actor==="writer"?P5_PRIMARY_WRITER:P5_PRIMARY_READER;
 if(!test){owner="neondb_owner";writerRole=P5_PRIMARY_WRITER;readerRole=P5_PRIMARY_READER;verifyTls(c);}
 await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const a=(await c.query(`SELECT current_database() db,current_user actor,session_user login,
    current_setting('server_version_num')::int version,current_setting('transaction_read_only') ro,
    pg_is_in_recovery() replica,r.rolcanlogin,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,
    r.rolbypassrls,r.rolinherit,EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) member,
    has_schema_privilege(current_user,'clean','USAGE') usage,
    has_schema_privilege(current_user,'clean','CREATE') schema_create,
    has_database_privilege(current_user,current_database(),'CREATE') db_create
    FROM pg_roles r WHERE r.rolname=current_user`)).rows[0];
  if(!a||a.db!=="neondb"||a.actor!==expected||a.login!==expected||a.version<160000||a.version>=170000||
    a.ro!=="on"||a.replica!==false||a.rolcanlogin!==true||a.usage!==true||
    [a.rolsuper,a.rolcreatedb,a.rolcreaterole,a.rolreplication,a.rolbypassrls,a.rolinherit,a.member,a.schema_create,a.db_create].some(v=>v!==false))
    HOLD("UNEXPECTED_ACTOR_OR_DB");
  const src=readFileSync(P5_PRIMARY_SQL,"utf8");
  const extensionSrc=privateExpiry?readFileSync(P6_PRIVATE_EXPIRY_SQL,"utf8"):"";
  const activeDefs=privateExpiry?[...defs,...privateDefs]:defs;
  const rows=(await c.query(`SELECT p.proname name,oidvectortypes(p.proargtypes) args,
    pg_get_function_result(p.oid) result,p.provolatile vol,p.prosecdef definer,p.prosrc body,p.proconfig config,
    pg_get_userbyid(p.proowner) owner,has_function_privilege(current_user,p.oid,'EXECUTE') allowed,
    EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      WHERE a.grantee=0 AND a.privilege_type='EXECUTE') public_exec,
    coalesce((SELECT jsonb_agg(jsonb_build_object('role',pg_get_userbyid(a.grantee),'grantable',a.is_grantable)
       ORDER BY pg_get_userbyid(a.grantee))
      FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      WHERE a.grantee<>p.proowner AND a.privilege_type='EXECUTE'),'[]'::jsonb) delegated
    FROM pg_proc p JOIN pg_namespace s ON s.oid=p.pronamespace
    WHERE s.nspname='clean' AND p.proname=ANY($1::text[])`,[activeDefs.map(fn)])).rows;
  if(rows.length!==activeDefs.length)HOLD("EXACT_FUNCTION_SET_MISSING");
  for(const d of activeDefs){
   const q=rows.find(q=>q.name===fn(d));
   const m=(d.privateExpiry?extensionSrc:src).match(new RegExp("AS \\$"+d.name+"\\$([\\s\\S]*?)\\$"+d.name+"\\$;"));
   const config=["search_path=pg_catalog, pg_temp",...(d.lock?["lock_timeout=3s"]:[])].sort();
   if(!m||!q||q.args!==d.args||q.result!==d.result||q.vol!==d.vol||q.definer!==true||
     q.owner!==owner||q.body!==m[1]||!Array.isArray(q.config)||
     JSON.stringify([...q.config].sort())!==JSON.stringify(config)||q.public_exec!==false||
     q.allowed!==(actor===d.actor)||JSON.stringify(q.delegated)!==JSON.stringify([{role:d.actor==="writer"?writerRole:readerRole,grantable:false}]))HOLD("EXACT_FUNCTION_BODY_OR_GRANT_DRIFT");
  }
  // No extra application table/column/sequence privileges. Reader keeps
  // precisely its already commissioned five blob metadata columns.
  const broad=(await c.query(`SELECT count(*)::int n FROM pg_class t JOIN pg_namespace s ON s.oid=t.relnamespace
    WHERE s.nspname IN ('clean','phase6_private','public') AND t.relkind IN ('r','p','v','m','f')
    AND (has_table_privilege(current_user,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     OR ((NOT $1::boolean OR t.oid<>'clean.provider_content_blob_ref'::regclass)
      AND has_any_column_privilege(current_user,t.oid,'SELECT,INSERT,UPDATE,REFERENCES')))`,[actor==="reader"])).rows[0];
  if(broad?.n!==0)HOLD("UNRELATED_TABLE_OR_COLUMN_GRANT");
  if(actor==="reader"){
   const cols=(await c.query(`SELECT a.attname name,has_column_privilege(current_user,a.attrelid,a.attnum,'SELECT') sel,
     has_column_privilege(current_user,a.attrelid,a.attnum,'INSERT,UPDATE,REFERENCES') other
     FROM pg_attribute a WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped`,[BLOB])).rows;
   if(cols.filter(q=>q.sel).length!==5||cols.some(q=>q.sel!==RETENTION_READER_REQUIRED_COLUMNS.includes(q.name)||q.other!==false))
    HOLD("EXISTING_FIVE_COLUMN_READER_DRIFT");
  }
  const extra=(await c.query(`SELECT count(*)::int n FROM pg_proc p JOIN pg_namespace s ON s.oid=p.pronamespace
    WHERE s.nspname IN ('clean','phase6_private','public') AND p.prosecdef
     AND p.prorettype<>'trigger'::regtype AND has_function_privilege(current_user,p.oid,'EXECUTE')
     AND NOT(s.nspname='clean' AND p.proname=ANY($1::text[]))`,[activeDefs.filter(d=>d.actor===actor).map(fn)])).rows[0];
  const seq=(await c.query(`SELECT count(*)::int n FROM pg_class t JOIN pg_namespace s ON s.oid=t.relnamespace
    WHERE t.relkind='S' AND s.nspname IN ('clean','phase6_private','public')
     AND has_sequence_privilege(current_user,t.oid,'USAGE,SELECT,UPDATE')`)).rows[0];
  if(extra?.n!==0||seq?.n!==0)HOLD("EXCESS_DEFINER_OR_SEQUENCE_AUTHORITY");
  return true;
 }finally{await c.query("ROLLBACK").catch(()=>{});}
}
const STATUS_KEYS=["liveOriginals","eligibleOriginals","hardDueOriginals","eligibleNextHour","hardDueNextHour","unboundLiveOriginals","markedExpiredPayloadPresent","unlinkedUnexpiredPopulation","unexpiredPopulationWithoutLiveOriginal"];
function checkStatus(v){
 if(!v||v.schema!=="v39.phase5.primary-fids-expiry-status.v1"||STATUS_KEYS.some(k=>!n(v[k]))||
    v.hardDueOriginals>v.eligibleOriginals||v.eligibleOriginals>v.liveOriginals||
    v.unboundLiveOriginals>v.liveOriginals||typeof v.deletionStopUnresolved!=="boolean"||
    v.providerCalls!==0||v.databaseWrites!==0||v.phase6PaidGo!==false||
    v.completeRetentionDeploymentVerified!==false||v.backupOrPitrVerified!==false||
    !Number.isFinite(Date.parse(v.observedAtUtc)))HOLD("INVALID_PRIMARY_STATUS");
 return {schema:v.schema,observedAtUtc:new Date(v.observedAtUtc).toISOString(),...Object.fromEntries(STATUS_KEYS.map(k=>[k,v[k]])),deletionStopUnresolved:v.deletionStopUnresolved,providerCalls:0,databaseWrites:0,backupOrPitrVerified:false,completeRetentionDeploymentVerified:false,phase6PaidGo:false};
}
const bad=s=>s.markedExpiredPayloadPresent||s.unlinkedUnexpiredPopulation||s.unexpiredPopulationWithoutLiveOriginal;
async function readOnly(pool,sql,args=[]){
 const c=await pool.connect();let poison=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const result=await c.query(sql,args);
  if(result.rows.length!==1)HOLD("NO_UNIQUE_READBACK");
  return result.rows[0].v;
 }finally{
  try{await c.query("ROLLBACK");}catch{poison=true;}
  c.release(poison?new Error("READONLY_ROLLBACK_UNKNOWN"):undefined);
  if(poison)HOLD("READONLY_ROLLBACK_UNKNOWN");
 }
}
const status=p=>readOnly(p,"SELECT clean."+F+"status_v39() v").then(checkStatus);
function checkSweep(v,limit){
 if(!v||v.schema!=="v39.phase5.primary-fids-expiry-sweep.v1"||v.status!=="PRIMARY_FIDS_SWEEP_IN_TRANSACTION_NOT_COMMIT_PROOF"||
    !RUN.test(v.runId??"")||!["originalsCleared","populationCleared","tombstones","remainingEligibleAtCutoff","remainingHardDueAtCutoff"].every(k=>n(v[k]))||
    v.originalsCleared>limit||v.tombstones!==v.originalsCleared+v.populationCleared||
    v.remainingHardDueAtCutoff>v.remainingEligibleAtCutoff||v.providerCalls!==0||v.objectDeletions!==0||
    v.phase6PaidGo!==false||v.completeRetentionDeploymentVerified!==false||v.backupOrPitrVerified!==false)
  HOLD("INVALID_SWEEP_RECEIPT");
 return {runId:v.runId,originalsCleared:v.originalsCleared,populationCleared:v.populationCleared,tombstones:v.tombstones,remainingEligibleAtCutoff:v.remainingEligibleAtCutoff,remainingHardDueAtCutoff:v.remainingHardDueAtCutoff};
}
async function verifyReceipt(reader,r){
 const v=await readOnly(reader,"SELECT clean."+F+"receipt_v39($1) v",[r.runId]);
 if(!v||v.schema!=="v39.phase5.primary-fids-expiry-receipt.v1"||v.runId!==r.runId||
    v.originalsCleared!==r.originalsCleared||v.populationCleared!==r.populationCleared||v.tombstones!==r.tombstones||
    v.nonemptyPrimaryReceiptVerified!==(r.tombstones>0)||v.providerCalls!==0||v.databaseWrites!==0||v.phase6PaidGo!==false)
   HOLD("INDEPENDENT_COMMITTED_RECEIPT_MISMATCH");
}
async function uncertainStop(writer,reader,runId){
 try{
  if((await writer.query("SELECT clean."+F+"stop_v39($1) v",[runId])).rows[0]?.v!==true||
    (await status(reader)).deletionStopUnresolved!==true)HOLD("UNCERTAINTY_STOP_UNVERIFIED");
 }catch{HOLD("UNCERTAINTY_STOP_UNVERIFIED_NO_REPLAY");}
 HOLD("UNCERTAINTY_STOP_RECORDED_NO_REPLAY");
}
async function oneSweep(writer,reader,limit){
 const c=await writer.connect();let batch,attempted=false,ack=false,poison=false;
 try{
  await c.query("BEGIN");
  await c.query("SET LOCAL statement_timeout='20000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  const z=await c.query("SELECT clean."+F+"sweep_v39($1) v",[limit]);
  batch=checkSweep(z.rows[0]?.v,limit);
  attempted=true;await c.query("COMMIT");ack=true;
 }catch(e){
  if(!attempted){try{await c.query("ROLLBACK");}catch{poison=true;}throw e;}
 }finally{c.release(poison||attempted&&!ack?new Error("PRIMARY_SWEEP_CONNECTION_OUTCOME_UNKNOWN"):undefined);}
 if(!batch)HOLD("MISSING_BATCH_RECEIPT");
 // Reconcile a lost COMMIT ACK by independent exact nonempty evidence,
 // not by calling the sweep again. A zero-work batch has no tombstones.
 try{
  if(!ack&&batch.tombstones===0)HOLD("ZERO_WORK_COMMIT_UNCERTAIN");
  await verifyReceipt(reader,batch);
 }catch{await uncertainStop(writer,reader,batch.runId);}
 return {...batch,commitAck:ack,independentReadback:true};
}
export async function runP5PrimaryExpiry({writer,reader,apply=false,verify=verifyP5PrimaryExpiryActor,verifyOptions={},limit=BATCH,maxBatches=MAX_BATCHES}){
 if(writer===reader||typeof apply!=="boolean"||!n(limit)||limit<1||limit>BATCH||
    !n(maxBatches)||maxBatches<1||maxBatches>MAX_BATCHES)HOLD("RUNTIME_SCOPE");
 for(const [pool,actor] of [[writer,"writer"],[reader,"reader"]]){
  const c=await pool.connect();try{await verify(c,actor,verifyOptions[actor]);}finally{c.release();}
 }
 const before=await status(reader);
 const base={providerCalls:0,objectDeletions:0,backupOrPitrVerified:false,completeRetentionDeploymentVerified:false,phase6PaidGo:false,distinctDbActorsVerified:true};
 if(!apply)return {status:"PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES",before,...base,databaseWrites:0};
 if(before.deletionStopUnresolved||bad(before))HOLD("PRIMARY_STATUS_OR_DELETION_STOP_REVIEW_REQUIRED");
 const receipts=[];let current=before;
 for(let i=0;i<maxBatches&&current.eligibleOriginals>0;i++){
  const r=await oneSweep(writer,reader,limit);receipts.push(r);
  current=await status(reader);
  if(bad(current)||current.deletionStopUnresolved)HOLD("PRIMARY_STATUS_AFTER_SWEEP_REVIEW_REQUIRED");
  if(r.originalsCleared===0)break;
 }
 return {...base,status:current.eligibleOriginals===0?"PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED":"PRIMARY_FIDS_ELIGIBLE_BACKLOG_REMAINS",
  before,after:current,receipts,databaseWritesPossible:receipts.some(x=>x.originalsCleared>0)};
}
async function main(){
 const a=admitP5PrimaryExpiryGithub(process.env);
 const config={max:1,connectionTimeoutMillis:8000,query_timeout:30000};
 const writer=new pg.Pool({...config,connectionString:a.writerUrl,application_name:"p5_fids_expiry_writer"});
 const reader=new pg.Pool({...config,connectionString:a.readerUrl,options:"-c default_transaction_read_only=on",application_name:"p5_fids_expiry_reader"});
 try{
  const extension=a.privateExpiry;
  const verifyOptions=extension.enabled?{writer:{privateExpiry:true},reader:{privateExpiry:true}}:{};
  const result=await runP5PrimaryExpiry({writer,reader,apply:a.apply,verifyOptions});
  console.log(JSON.stringify({...result,reviewedMainSha:a.sha}));
  const primaryHold=result.status==="PRIMARY_FIDS_ELIGIBLE_BACKLOG_REMAINS"||
    result.before.deletionStopUnresolved||bad(result.before)||result.before.hardDueOriginals>0;
  if(primaryHold)process.exitCode=2;
  // Primary cleanup executes first. A private failure cannot undo its
  // acknowledged commit or convert its independent receipt into a failure.
  // Never start private mutation after a primary HOLD or during VERIFY.
  if(extension.enabled){
   if(primaryHold){console.log(JSON.stringify({status:"PRIVATE_EXPIRY_SKIPPED_PRIMARY_HOLD",providerCalls:0,phase6PaidGo:false}));}
   else{
    const p=await runP6PrivateEpochExpiryCore({writer,reader,manifest:extension.manifest,apply:extension.apply});
    console.log(JSON.stringify({...p,reviewedMainSha:a.sha}));
    if(p.status==="PRIVATE_EXPIRY_BACKLOG_REMAINS"||p.before.deletionStopUnresolved||
       p.deadlineDueObservedAtInitialRead)process.exitCode=2;
   }
  }
 }finally{await Promise.all([writer.end().catch(()=>{}),reader.end().catch(()=>{})]);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main().catch(e=>{
  const m=String(e?.message??"");
  console.error(/^HOLD_(?:P5_PRIMARY_FIDS_EXPIRY|P6_PRIVATE_EXPIRY_RUNTIME)_[A-Z0-9_]+$/.test(m)?m:"HOLD_P5_PRIMARY_FIDS_EXPIRY_REDACTED_NO_REPLAY");
  process.exitCode=2;
 });
