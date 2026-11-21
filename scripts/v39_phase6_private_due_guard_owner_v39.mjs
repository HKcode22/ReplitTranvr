/** Owner-local commission of the EXISTING reviewed additive private due
 * guard, never a new data path or new retention rule. Same primary/expiry
 * actors and same exact main pin. No provider or authorization mutation. */
import pg from "pg";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import legacy from "../data-collection/phase5/review-tools/p5_v0104_owner_install_once.cjs";
import {inspectP6PrivateExpiryOwner,inspectP6PrivateExpiryCatalog,readP6PrivateExpiryOwnerRepoState} from "./v39_phase6_private_epoch_expiry_owner_commission_v39.mjs";
export const P6_DUE_GUARD_SQL="data-collection/phase5/review-tools/p6_private_due_physical_rest_guard_candidate_NOT_FOR_INSTALL.sql";
const OLD_SQL="migrations/staged/V0104__phase5_physical_rest_live_authority_retention_guard_v39.sql";
const NEW_FN="phase6_private_due_physical_rest_guard_v39",OLD_FN="phase5_physical_rest_live_guard_v39";
const NEW_TRIGGERS=["a01_phase6_fids_private_due_guard_v39","a01_phase6_other_private_due_guard_v39"];
const TABLES=legacy.TABLES,OLD_TRIGGERS=legacy.TRIGGERS;
const hold=s=>{throw Error("HOLD_P6_PRIVATE_DUE_GUARD_OWNER_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const git=(...args)=>execFileSync("git",args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:15000,maxBuffer:1024*1024}).trim();
function exactSql(pin){
 if(git("hash-object",P6_DUE_GUARD_SQL)!==git("rev-parse",pin+":"+P6_DUE_GUARD_SQL))hold("REVIEWED_SQL_DRIFT");
 return readFileSync(P6_DUE_GUARD_SQL,"utf8");
}
function parse(sql){
 const m=sql.match(/AS \$guard\$([\s\S]*?)\$guard\$;/);
 if(!m||sql.split("\nBEGIN;\n").length!==2||!sql.trimEnd().endsWith("COMMIT;")||
   (sql.match(/^COMMIT;$/gm)||[]).length!==1||!sql.includes("CREATE FUNCTION clean."+NEW_FN+"()"))hold("SQL_WRAPPER");
 return {prosrc:m[1],body:sql.replace("\nBEGIN;\n","\n").replace(/\nCOMMIT;\s*$/,"\n")};
}
/** Compare all current trigger definitions and the precise old/new function
 * bodies, ACL and SECURITY DEFINER configuration. No private data selected. */
export async function inspectP6PrivateDueGuardCatalog(c,sql=readFileSync(P6_DUE_GUARD_SQL,"utf8")){
 const parsed=parse(sql),original=legacy.parseMigration(readFileSync(OLD_SQL));
 const old=(await c.query(legacy.FN_SQL,[OLD_FN])).rows,newFns=(await c.query(legacy.FN_SQL,[NEW_FN])).rows;
 const triggers=(await c.query(legacy.TRIGGER_SQL,[TABLES,[...OLD_TRIGGERS,...NEW_TRIGGERS]])).rows;
 if(old.length!==1||newFns.length>1||triggers.some(x=>x.owner!=="neondb_owner"))hold("PREDECESSOR_OR_OWNER_DRIFT");
 const oldTriggers=triggers.filter(x=>OLD_TRIGGERS.includes(x.name)||x.fn===old[0].oid);
 legacy.exactGuard(old[0],oldTriggers,original.prosrc);
 const next=triggers.filter(x=>NEW_TRIGGERS.includes(x.name)||newFns.some(f=>f.oid===x.fn));
 if(newFns.length===0&&next.length!==0)hold("PARTIAL_GUARD_NO_REPLAY");
 if(newFns.length===1){
  const f=newFns[0];
  if(f.owner!=="neondb_owner"||f.prosrc!==parsed.prosrc||f.nargs!==0||f.definer!==true||f.vol!=="v"||f.kind!=="f"||
   f.ret_trigger!==true||f.lang!=="plpgsql"||f.owner_only!==true||!Array.isArray(f.config)||f.config.length!==1||
   f.config[0].replace(/\s/g,"")!=="search_path=pg_catalog,pg_temp")hold("EXACT_FUNCTION_OR_ACL");
  if(next.length!==2||NEW_TRIGGERS.some((name,i)=>!next.some(x=>x.name===name&&x.tbl===TABLES[i]&&
   x.owner==="neondb_owner"&&x.enabled==="O"&&x.fn===f.oid&&x.type===7&&x.nargs===0&&x.no_when===true&&x.attrs===""&&
   x.no_constraint===true&&x.deferred===false&&x.initdeferred===false&&x.oldtable===null&&x.newtable===null)))hold("EXACT_TRIGGER_SCOPE");
 }
 return {installed:newFns.length===1,legacy:triggers.filter(x=>!next.includes(x)),oldFunction:old[0],counts:(await c.query(legacy.COUNTS_SQL)).rows[0]};
}
async function lockedState(c,sql,readonly){
 const expiry=await inspectP6PrivateExpiryCatalog(c,readFileSync("migrations/staged/V0105__phase6_bounded_private_epoch_expiry_inert_v39.sql","utf8"),readonly);
 if(expiry.privateState!=="GRANTED")hold("V0105_EXACT_GRANTS_REQUIRED");
 const stop=(await c.query(legacy.STOP_SQL)).rows[0];
 if(!stop||Object.keys(stop).length!==6||Object.values(stop).some(n=>n!==0))hold("COLLECTION_NOT_STOPPED");
 const guard=await inspectP6PrivateDueGuardCatalog(c,sql);
 if(!guard.counts||Object.values(guard.counts).some(n=>!Number.isSafeInteger(n)||n<0))hold("ATTEMPT_COUNT");
 return {expiry,guard};
}
async function review(c,sql){
 const p=await inspectP6PrivateExpiryOwner(c);
 if(p.privateState!=="GRANTED")hold("V0105_EXACT_GRANTS_REQUIRED");
 await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{await c.query("SET LOCAL statement_timeout='12000ms'");return await lockedState(c,sql,true);}
 finally{await c.query("ROLLBACK");}
}
async function apply(c,sql,expected){
 if(expected.guard.installed)hold("ALREADY_INSTALLED_VERIFY_ONLY");
 let began=false,commit=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");began=true;
  await c.query("SET LOCAL lock_timeout='3000ms'; SET LOCAL statement_timeout='30000ms'");
  await c.query("LOCK TABLE clean.adb_phase6_authorization,clean.adb_collection_batches,clean.adb_collection_segments,clean.adb_collection_subs,clean.adb_incident_stop,clean.phase5_fids_allowed_query_v39,clean.phase5_fids_physical_attempt_v39,clean.phase5_other_rest_physical_reservation_v39,phase6_private.frozen_native_packet_v39,phase6_private.signed_run_day_index_revision_v39,phase6_private.signed_run_day_epoch_claim_v39 IN SHARE ROW EXCLUSIVE MODE");
  const lock=(await c.query("SELECT pg_try_advisory_xact_lock(390015,104) ok")).rows[0];
  if(lock?.ok!==true)hold("STOP_LOCK_BUSY");
  const before=await lockedState(c,sql,false);
  if(!same(before,expected))hold("REVIEW_STATE_CHANGED");
  await c.query(parse(sql).body);
  const after=await lockedState(c,sql,false);
  if(!same(after,{...before,guard:{...before.guard,installed:true}}))hold("IN_TRANSACTION_READBACK_DRIFT");
  commit=true;await c.query("COMMIT");began=false;
 }catch(e){if(began&&!commit)await c.query("ROLLBACK").catch(()=>{});if(commit)hold("COMMIT_UNKNOWN_READONLY_RECONCILE_NO_REPLAY");throw e;}
}
async function main(){
 const mode=process.argv[2]??"review",e=process.env;
 if(process.argv.length>3||!["review","commission"].includes(mode)||e.V39_DATABASE_RUNTIME_URL)hold("OWNER_MODE");
 const config=readP6PrivateExpiryOwnerRepoState(),sql=exactSql(config.pin);
 const url=new URL(legacy.safeUrl(e));
 if(hash(url.host.toLowerCase()+url.pathname)!==config.endpoint)hold("OWNER_ENDPOINT");
 const one=async f=>{const c=new pg.Client({connectionString:url.toString(),connectionTimeoutMillis:8000,query_timeout:40000,application_name:"p6_private_due_guard_owner"});try{await c.connect();return await f(c);}finally{await c.end().catch(()=>{});}};
 const before=await one(c=>review(c,sql)),reviewSha256=hash(JSON.stringify({pin:config.pin,sqlSha256:hash(sql),before}));
 const receipt={status:before.guard.installed?"PRIVATE_DUE_GUARD_ALREADY_INSTALLED_READONLY_NO_GO":"PRIVATE_DUE_GUARD_REVIEW_ONLY_NO_GO",main:config.pin,sqlSha256:hash(sql),reviewSha256,installed:before.guard.installed,providerCalls:0,phase6PaidGo:false};
 console.log(JSON.stringify(receipt));
 if(mode==="review"||before.guard.installed)return;
 if(e.P6_PRIVATE_DUE_GUARD_APPROVAL!=="COMMISSION_EXACT_PRIVATE_DUE_GUARD_NO_PROVIDER"||e.P6_PRIVATE_DUE_GUARD_REVIEW_SHA256!==reviewSha256||
   !same(readP6PrivateExpiryOwnerRepoState(),config))hold("EXACT_REVIEW_APPROVAL_REQUIRED");
 await one(c=>apply(c,sql,before));
 const fresh=await one(c=>review(c,sql));
 if(!same(fresh,{...before,guard:{...before.guard,installed:true}})||!same(readP6PrivateExpiryOwnerRepoState(),config))hold("POSTCOMMIT_READBACK_DRIFT_NO_REPLAY");
 console.log(JSON.stringify({...receipt,status:"PRIVATE_DUE_GUARD_INSTALLED_FRESH_READBACK_NO_GO",installed:true,functionsInstalled:1,triggersInstalled:2,oldTriggersPreserved:true,providerCalls:0,phase6PaidGo:false}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_(?:P6_PRIVATE_DUE_GUARD_OWNER|P6_PRIVATE_EXPIRY_OWNER|P5_V0104_OWNER)_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_PRIVATE_DUE_GUARD_OWNER_REDACTED_RECONCILE_NO_REPLAY");process.exitCode=2;});
