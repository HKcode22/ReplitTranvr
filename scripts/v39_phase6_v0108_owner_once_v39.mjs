/**
 * Gate 3 V0108 owner-only exact release. No provider, paid dispatch, new grants,
 * row selection, source output, cron mutation, or SOURCE authorization replay.
 * Read-only by default. APPLY is an explicitly pinned single PostgreSQL
 * transaction, followed by an independent NEW SESSION readback.
 *
 * This does not prove punctual source-content deletion or paid GO.
 */
import pg from "pg";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

export const P6_V0108_MIGRATION="migrations/staged/V0108__phase6_private_operational_metadata_expiry_class_v39.sql";
export const P6_V0108_GIT_BLOB="ee626ee1ad90b6c7e281565ade5a79930eeeb74b";
const V0105="migrations/staged/V0105__phase6_bounded_private_epoch_expiry_inert_v39.sql";
export const P6_V0108_APPLY_APPROVAL="INSTALL_EXACT_V0108_EMPTY_CUSTODY_NO_PROVIDER_AND_READBACK";
const STATUS="clean.phase6_private_epoch_expiry_status_v39(text)";
const SWEEP="clean.phase6_private_epoch_expiry_sweep_v39(text,integer)";
const SHA=/^[a-f0-9]{40}$/;
const fail=(code)=>{throw Error("HOLD_P6_V0108_OWNER_"+code);};
const blob=b=>createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
const exactBody=(sql,name)=>{
 const token="AS $"+name+"$",from=sql.indexOf(token);
 if(from<0||sql.indexOf(token,from+token.length)>=0)fail("FUNCTION_BODY_MARKER");
 const start=from+token.length,end=sql.indexOf("$"+name+"$;",start);
 if(end<0)fail("FUNCTION_BODY_END");
 return sql.slice(start,end);
};
export function exactP6V0108Sql(read=(p)=>readFileSync(p)){
 const b=read(P6_V0108_MIGRATION);
 if(!Buffer.isBuffer(b)||blob(b)!==P6_V0108_GIT_BLOB)fail("MIGRATION_GIT_BLOB_DRIFT");
 const migration=b.toString("utf8"),legacy=read(V0105).toString("utf8");
 if(!migration.startsWith("-- Review candidate only.")||
    !migration.trimEnd().endsWith("COMMIT;")||
    (migration.match(/^COMMIT;$/gm)||[]).length!==1||
    (migration.match(/^BEGIN;$/gm)||[]).length!==1||
    !migration.includes("P6_V0108_REQUIRES_EMPTY_PRIVATE_CUSTODY_AND_NO_DELETION_STOP")||
    !migration.includes("P6_V0108_V0106_METADATA_CONSTRAINT_REQUIRED"))
    fail("MIGRATION_WRAPPER");
 return Object.freeze({migration,oldStatus:exactBody(legacy,"status"),
  oldSweep:exactBody(legacy,"sweep"),newStatus:exactBody(migration,"status"),
  newSweep:exactBody(migration,"sweep")});
}
export function classifyP6V0108Bodies(functions,sql){
 if(!Array.isArray(functions)||functions.length!==2||
    !functions.every(f=>f&&f.definer===true&&f.owner==="neondb_owner"&&
      typeof f.acl==="string"||f&&f.acl===null&&f.definer===true&&f.owner==="neondb_owner"))
    fail("CATALOG_SHAPE");
 const a=functions[0],b=functions[1];
 if(a.vol!=="s"||b.vol!=="v"||
    ![a,b].every(f=>f.config==="search_path=pg_catalog, pg_temp"))
    fail("CATALOG_FUNCTION_FLAGS");
 const old=a.body===sql.oldStatus&&b.body===sql.oldSweep,
  installed=a.body===sql.newStatus&&b.body===sql.newSweep;
 if(!old&&!installed)fail("MIXED_OR_UNKNOWN_FUNCTION_BODY_NO_REPLAY");
 return installed?"V0108_EXACT_INSTALLED":"V0105_EXACT_PREDECESSOR";
}
function git(...a){return execFileSync(a[0],a.slice(1),{
 encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:15000,maxBuffer:1048576}).trim();}
function exactMain(){
 const local=git("git","rev-parse","HEAD"),remote=git("gh","api",
  "repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha");
 if(!SHA.test(local)||local!==remote)fail("REPO_MAIN_HEAD_CHANGED");
 if(git("git","hash-object",P6_V0108_MIGRATION)!==P6_V0108_GIT_BLOB||
    git("git","rev-parse","HEAD:"+P6_V0108_MIGRATION)!==P6_V0108_GIT_BLOB)
   fail("LOCAL_V0108_NOT_EXACT_COMMITTED_MAIN");
 return local;
}
function ownerUrl(env){
 if(env.NODE_TLS_REJECT_UNAUTHORIZED==="0")fail("TLS_DISABLED");
 let url;try{url=new URL(env.DATABASE_URL||"");}catch{fail("DATABASE_URL_MISSING");}
 if(url.protocol!=="postgresql:"&&url.protocol!=="postgres:")fail("DB_SCHEME");
 if(!url.hostname.endsWith(".neon.tech")||
    decodeURIComponent(url.username)!=="neondb_owner"||!url.password||
    url.pathname!=="/neondb"||!["require","verify-full"].includes(url.searchParams.get("sslmode"))||
    [...url.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k)))
    fail("EXACT_EXISTING_OWNER_NEON");
 return url.toString();
}
async function readback(connectionString,head,sql){
 const c=new pg.Client({connectionString,connectionTimeoutMillis:8000,query_timeout:16000,
  application_name:"p6_v0108_owner_catalog_verify"});
 await c.connect();let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const identity=(await c.query("SELECT current_database() db,current_user actor,session_user login,pg_is_in_recovery() replica,current_setting('server_version_num')::integer ver,current_setting('transaction_read_only') ro,current_setting('session_replication_role') repl")).rows[0];
  if(identity?.db!=="neondb"||identity.actor!=="neondb_owner"||identity.login!==identity.actor||
     identity.replica!==false||identity.ro!=="on"||identity.repl!=="origin"||
     identity.ver<160000||identity.ver>=170000)fail("REAL_PG16_OWNER_READBACK");
  const auth=(await c.query("SELECT code_sha,manifest_sha256,enabled FROM clean.adb_phase6_authorization WHERE singleton_key")).rows;
  if(auth.length!==1||!SHA.test(auth[0].code_sha)||!/^[a-f0-9]{64}$/.test(auth[0].manifest_sha256))
    fail("EXACT_SINGLETON_AUTH");
  const counts=(await c.query("SELECT (SELECT count(*)::integer FROM phase6_private.frozen_native_packet_v39) packets,(SELECT count(*)::integer FROM phase6_private.signed_run_day_index_revision_v39) indexes,(SELECT count(*)::integer FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved) deletion_stops")).rows[0];
  const funcs=[];
  for(const reg of [STATUS,SWEEP]){
   const f=(await c.query("SELECT p.prosrc body,p.prosecdef definer,pg_get_userbyid(p.proowner) owner,p.provolatile vol,coalesce(array_to_string(p.proconfig,','),'') config,coalesce(p.proacl::text,'') acl FROM pg_proc p WHERE p.oid=$1::regprocedure",[reg])).rows;
   if(f.length!==1)fail("FUNCTION_MISSING");
   funcs.push(f[0]);
  }
  const state=classifyP6V0108Bodies(funcs,sql);
  const res=(await c.query("SELECT clean.phase6_private_epoch_expiry_status_v39($1) v",[auth[0].manifest_sha256])).rows[0]?.v;
  if(res?.schema!==(state==="V0108_EXACT_INSTALLED"?"v39.phase6.private-epoch-expiry-status.v2":"v39.phase6.private-epoch-expiry-status.v1")||
    res.providerCalls!==0||res.databaseWrites!==0||res.phase6PaidGo!==false)
    fail("EXACT_RUNTIME_STATUS_DRIFT");
  return {state,codeBound:auth[0].code_sha===head,sourceEnabled:auth[0].enabled,
   packets:counts.packets,indexes:counts.indexes,deletionStops:counts.deletion_stops,
   functionAcl:funcs.map(x=>x.acl),observedDbClockUtc:res.observedAtUtc};
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});await c.end().catch(()=>{});}
}
export function reviewP6V0108Apply(pre,head,env){
 if(pre.state!=="V0105_EXACT_PREDECESSOR"||pre.codeBound!==true||
    pre.packets!==0||pre.indexes!==0||pre.deletionStops!==0)
   fail("STOPPED_EMPTY_CURRENT_MAIN_PREDECESSOR_REQUIRED");
 if(env.P6_V0108_REVIEWED_MAIN_SHA!==head||
    env.P6_V0108_OWNER_APPROVAL!==P6_V0108_APPLY_APPROVAL||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0")
   fail("EXPLICIT_NONPAID_EXACT_MAIN_APPROVAL");
}
async function main(){
 if(process.argv.length>3||!["review","apply"].includes(process.argv[2]||"review"))
   fail("OWNER_MODE");
 const mode=process.argv[2]||"review",sql=exactP6V0108Sql(),head=exactMain(),
  url=ownerUrl(process.env);
 const pre=await readback(url,head,sql);
 if(mode==="review"||pre.state==="V0108_EXACT_INSTALLED"){
  console.log(JSON.stringify({status:pre.state==="V0108_EXACT_INSTALLED"?
   "V0108_EXACT_CATALOG_ALREADY_INSTALLED_NO_REPLAY":"V0108_OWNER_READONLY_REVIEW_NO_GO",
   mainSha:head,...pre,providerCalls:0,databaseWrites:0,paidGo:false}));return;
 }
 reviewP6V0108Apply(pre,head,process.env);
 const c=new pg.Client({connectionString:url,connectionTimeoutMillis:8000,query_timeout:35000,
  application_name:"p6_v0108_owner_single_atomic_install"});
 let attempted=false;
 try{
  await c.connect();attempted=true;
  // Migration owns BEGIN/COMMIT, atomic DB locks, exact V0105 prosrc,
  // V0106 CHECK constraints, STOP and empty-custody predicates.
  await c.query(sql.migration);
 }catch{fail("MIGRATION_OUTCOME_UNKNOWN_INDEPENDENT_READ_ONLY_RECONCILE_NO_REPLAY");}
 finally{await c.end().catch(()=>{});}
 if(!attempted)fail("NO_COMMISSION");
 const after=await readback(url,head,sql);
 if(after.state!=="V0108_EXACT_INSTALLED"||!after.codeBound||
    after.packets!==0||after.indexes!==0||after.deletionStops!==0||
    JSON.stringify(after.functionAcl)!==JSON.stringify(pre.functionAcl))
    fail("POSTCOMMIT_EXACT_INDEPENDENT_READBACK_HOLD");
 console.log(JSON.stringify({status:"V0108_EXACT_OWNER_FUNCTIONS_COMMITTED_NEW_SESSION_READBACK_NO_PAID_GO",
  mainSha:head,...after,providerCalls:0,paidGo:false,sourceWrites:0,
  operationalRetentionDeploymentFullyCertified:false}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main().catch(e=>{const m=String(e?.message??"");
  console.error(/^HOLD_P6_V0108_OWNER_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_V0108_OWNER_REDACTED_UNKNOWN_OUTCOME_NO_REPLAY");
  process.exitCode=2;
 });
