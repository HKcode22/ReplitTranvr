/** Bounded due-only cleanup and independent aggregate readback. Never
 * operates on AeroDataBox originals or source tables. Direct narrow actors
 * only, no new provider access, no same-run retry on unknown commit. */
import type {Pool,PoolClient} from "pg";
import {performance} from "node:perf_hooks";
import {P7_INERT_ROLES} from "./phase7InertStorageCommission_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_EXPIRY_"+s);};
const statusFns=["phase7_private.pre_link_expiry_status_v39()","phase7_private.research_expiry_status_v39()"];
const sweepFns=["phase7_private.sweep_due_pre_links_v39(integer)","phase7_private.sweep_due_research_outputs_v39(integer)"];
type Mode="VERIFY_ONLY"|"APPLY_DUE_ONLY";
async function actor(c:PoolClient,read:boolean){
 const role=read?P7_INERT_ROLES.expiryReader:P7_INERT_ROLES.expiryWriter;
 const x=(await c.query("SELECT current_user actor,session_user login,current_database() db,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,r.rolcanlogin,r.rolinherit,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolreplication,EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) member,has_schema_privilege(r.oid,'phase7_private','USAGE') can_use,has_schema_privilege(r.oid,'phase7_private','CREATE') can_create,(SELECT count(*)<>4 OR coalesce(bool_or(has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(r.oid,c.oid,'DELETE,TRUNCATE,TRIGGER')),true) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='phase7_private' AND c.relkind='r') direct FROM pg_roles r WHERE r.rolname=current_user")).rows[0];
 if(!x||x.actor!==role||x.login!==role||x.db!=="neondb"||x.ver<160000||x.ver>=170000||x.ro!==(read?"on":"off")||
  x.rolcanlogin!==true||x.can_use!==true||["replica","rolinherit","rolsuper","rolcreatedb","rolcreaterole","rolbypassrls","rolreplication","member","can_create","direct"].some(k=>x[k]!==false))hold("DISTINCT_RESTRICTED_ACTOR");
 for(const f of [...statusFns,...sweepFns]){
  if((await c.query("SELECT has_function_privilege(current_user,$1,'EXECUTE') ok",[f])).rows[0].ok!==(read?statusFns:sweepFns).includes(f))hold("FUNCTION_PRIVILEGE");
 }
}
const count=(x:unknown):x is number=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=0;
export async function readP7ExpiryStatus(reader:Pool){
 const c=await reader.connect();
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='15000ms'");
  await actor(c,true);
  const r=(await c.query("SELECT phase7_private.pre_link_expiry_status_v39() links,phase7_private.research_expiry_status_v39() research")).rows[0],l=r?.links,s=r?.research;
  if(l?.schema!=="v39.phase7.pre-link-expiry-status.v1"||s?.schema!=="v39.phase7.research-expiry-status.v1"||
   ![l.liveLinks,l.dueLinks,l.dueNextHour,s.dueBundles,s.dueFragments,s.dueLinks,s.liveLinksOnDueFragments].every(count)||
   l.providerCalls!==0||l.databaseWrites!==0||l.phase6PaidGo!==false||s.providerCalls!==0||s.databaseWrites!==0||s.phase6PaidGo!==false||
   !Number.isFinite(Date.parse(l.observedAtUtc))||!Number.isFinite(Date.parse(s.observedAtUtc)))hold("AGGREGATE_STATUS");
  await c.query("ROLLBACK");
  return {observedAtUtc:new Date(s.observedAtUtc).toISOString(),liveLinks:l.liveLinks,dueLinks:Math.max(l.dueLinks,s.dueLinks),dueNextHour:l.dueNextHour,dueBundles:s.dueBundles,dueFragments:s.dueFragments,liveLinksOnDueFragments:s.liveLinksOnDueFragments};
 }finally{await c.query("ROLLBACK").catch(()=>{});c.release()}
}
async function oneP7Sweep(writer:Pool,limit:number){
 const c=await writer.connect();let commit=false,ack=false;
 try{
  await c.query("BEGIN");
  await c.query("SET LOCAL statement_timeout='15000ms'; SET LOCAL lock_timeout='1500ms'");
  await actor(c,false);
  const l=(await c.query("SELECT phase7_private.sweep_due_pre_links_v39($1::integer) n",[limit])).rows[0]?.n;
  const out=(await c.query("SELECT * FROM phase7_private.sweep_due_research_outputs_v39($1::integer)",[limit])).rows[0];
  if(!count(l)||l>limit||!count(out?.bundle_rows)||!count(out?.fragment_rows)||out.bundle_rows+out.fragment_rows>limit)hold("BOUNDED_SWEEP_COUNTS");
  commit=true;await c.query("COMMIT");ack=true;
  return {links:l,bundles:out.bundle_rows as number,fragments:out.fragment_rows as number};
 }finally{if(!commit)await c.query("ROLLBACK").catch(()=>{});c.release(commit&&!ack?Error("P7_EXPIRY_UNKNOWN_COMMIT_READBACK_NO_REPLAY"):undefined)}
}
export async function runP7ExpiryOnce(reader:Pool,writer:Pool|undefined,mode:Mode){
 if(!["VERIFY_ONLY","APPLY_DUE_ONLY"].includes(mode)||(mode==="VERIFY_ONLY"&&writer!==undefined)||
  (mode==="APPLY_DUE_ONLY"&&(!writer||writer===reader)))hold("MODE");
 const before=await readP7ExpiryStatus(reader);
 if(mode==="VERIFY_ONLY")return {status:"P7_EXPIRY_VERIFY_ONLY_NO_GO",before,after:before,deletedLinks:0,deletedBundles:0,deletedFragments:0,providerCalls:0,phase6PaidGo:false};
 let after=before,deletedLinks=0,deletedBundles=0,deletedFragments=0;
 // Existing installed SQL admits up to 1000 rows per transaction.
 // A late scheduler can accumulate more than the former 2000-link cap,
 // blocking otherwise valid PRE globally until another expiry wake.
 // Drain multiple independently read-back due-only chunks without raising
 // SQL's limit, changing expiry dates or replaying an uncertain commit.
 const started=performance.now();
 for(let i=0;i<8&&performance.now()-started<180000&&(after.dueLinks+after.dueBundles+after.dueFragments)>0;i++){
  if(after.liveLinksOnDueFragments)hold("UNEXPECTED_LIVE_LINK");
  const q=await oneP7Sweep(writer!,1000);
  deletedLinks+=q.links;deletedBundles+=q.bundles;deletedFragments+=q.fragments;
  after=await readP7ExpiryStatus(reader);
  if(q.links+q.bundles+q.fragments===0)break;
 }
 return {status:after.dueLinks+after.dueBundles+after.dueFragments===0?"P7_EXPIRY_DUE_ONLY_INDEPENDENT_READBACK":"P7_EXPIRY_BACKLOG_HOLD",before,after,deletedLinks,deletedBundles,deletedFragments,providerCalls:0,phase6PaidGo:false};
}
