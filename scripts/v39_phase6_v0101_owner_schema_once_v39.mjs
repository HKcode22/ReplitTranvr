/** Existing private transport only. No new role, login, table, or flight.
 * Actual V0099 commissioned memberships are preserved, not reinstalled.
 * This wrapper is owner-only and does not start a collection process. */
import pg from "pg";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
export const PATH="migrations/staged/V0101__phase6_private_t24_packet_and_witness_transport_inert_v39.sql";
export const BLOB="6c837cdeb6bf761287fee789f3389924b1a82f53";
export const APPROVAL="INSTALL_ONLY_V0101_EXISTING_EMPTY_TRANSPORT_NO_PROVIDER";
const P="phase6_private.frozen_native_packet_v39", I="phase6_private.signed_run_day_index_revision_v39", C="phase6_private.signed_run_day_epoch_claim_v39";
const hold=s=>{throw Error("HOLD_P6_V0101_OWNER_"+s);};
const suffix=["kind_allowed","kind_path_guard","bytes_guard","packet_wire_scope"];
const state99="V0099_READY_V0101_ABSENT_EMPTY_NO_GO",state101="V0101_INSTALLED_EMPTY_T24_TRANSPORT_NO_GO";
export function reviewV0101Sql(bytes){
 if(!Buffer.isBuffer(bytes)||createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0")).update(bytes).digest("hex")!==BLOB)
  hold("EXACT_SQL_BLOB");
 return bytes.toString("utf8");
}
export async function inspectV0101(c){
 let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  const id=(await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,rolsuper FROM pg_roles WHERE rolname=current_user")).rows[0];
  if(!id||id.db!=="neondb"||id.actor!=="neondb_owner"||id.login!==id.actor||id.ver<160000||id.ver>=170000||id.ro!=="on"||id.replica!==false||id.rolsuper!==false)hold("EXISTING_PRIMARY_OWNER_REQUIRED");
  const tables=(await c.query("SELECT n.nspname||'.'||c.relname name,pg_get_userbyid(c.relowner) owner,"+
   "has_table_privilege('phase6_private_frozen_reader_v39',c.oid,'SELECT') rs,"+
   "has_table_privilege('phase6_private_frozen_reader_v39',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') rw,"+
   "has_table_privilege('phase6_private_frozen_publisher_v39',c.oid,'SELECT') ps,"+
   "has_table_privilege('phase6_private_frozen_publisher_v39',c.oid,'INSERT') pi,"+
   "has_table_privilege('phase6_private_frozen_publisher_v39',c.oid,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') pw,"+
   "EXISTS(SELECT 1 FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE a.grantee=0) pub,"+
   "(SELECT count(*)::int FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND t.tgenabled='O') triggers "+
   "FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=ANY(ARRAY[to_regclass($1),to_regclass($2),to_regclass($3)]) ORDER BY name",[P,I,C])).rows;
  if(tables.length!==3||tables.some(t=>t.owner!==id.actor||t.rs!==true||t.rw!==false||t.ps!==true||t.pi!==(t.name!==C)||t.pw!==false||t.pub!==false||t.triggers!==(t.name===I?2:1)))hold("EXISTING_TABLE_ACL_OR_TRIGGER_DRIFT");
  if((await c.query("SELECT to_regclass('phase6_private.signed_day_shard_index_revision_v39') IS NULL AS no_old")).rows[0]?.no_old!==true)hold("OBSOLETE_GLOBAL_INDEX_PRESENT");
  const roles=(await c.query("SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname",[["phase6_private_frozen_reader_v39","phase6_private_frozen_publisher_v39"]])).rows;
  if(roles.length!==2||roles.some(({rolname,...flags})=>!rolname||Object.values(flags).some(v=>v!==false)))hold("EXISTING_GROUP_ROLE_DRIFT");
  const wires=(await c.query("SELECT count(*)::int n FROM pg_attribute WHERE attrelid=ANY(ARRAY[$1::regclass,$2::regclass]) AND attname='review_wire_bytes' AND atttypid='bytea'::regtype AND NOT attisdropped AND NOT attnotnull AND NOT atthasdef",[P,I])).rows[0]?.n;
  if(wires!==2)hold("V0098_WIRE_COLUMNS_MISSING");
  const counts=(await c.query("SELECT (SELECT count(*)::int FROM "+P+") packets,(SELECT count(*)::int FROM "+I+") revisions,(SELECT count(*)::int FROM "+C+") claims")).rows[0];
  if(!counts||Object.values(counts).some(n=>n!==0))hold("NONEMPTY_TRANSPORT_NEVER_REPLAY");
  const guards=(await c.query("SELECT conname,convalidated,pg_get_constraintdef(oid) def FROM pg_constraint WHERE conrelid=$1::regclass AND (conname LIKE 'p6_v0099_%' OR conname LIKE 'p6_v0101_%') ORDER BY conname",[P])).rows;
  const exact=v=>guards.length===4&&suffix.every(s=>guards.some(g=>g.conname==="p6_v"+v+"_"+s&&g.convalidated===true));
  const v=exact("0099")?"0099":exact("0101")?"0101":null;
  if(!v)hold("PARTIAL_OR_UNRECOGNIZED_GUARDS");
  const defs=Object.fromEntries(guards.map(g=>[g.conname,g.def]));
  const get=s=>defs["p6_v"+v+"_"+s]??"";
  const kinds=["SOURCE_DAY_REGISTRY","SOURCE_QUERY_PACKET","LATER_PRE_PACKET","LATER_PRE_DAY_REGISTRY","POST_PACKET","SOURCE_DAY_PREPARE_REVIEW",...(v==="0101"?["T24_PRE_PACKET","T24_PRE_DAY_REGISTRY","T24_WITNESS_RECEIPT_CANDIDATE"]:[])];
  if(!kinds.every(k=>get("kind_allowed").includes("'"+k+"'"))||
    !["sourceq_","post_","prepare_d",...(v==="0101"?["t24p_","t24r_","t24w_"]:[])].every(k=>get("kind_path_guard").includes(k))||
    !["sha256","500000","250000",...(v==="0101"?["20000"]:[])].every(k=>get("bytes_guard").includes(k))||
    !["review_wire_bytes","4096","7 days",...(v==="0101"?["T24_PRE_DAY_REGISTRY","T24_WITNESS_RECEIPT_CANDIDATE"]:[])].every(k=>get("packet_wire_scope").includes(k)))hold("GUARD_DEFINITION_DRIFT");
  // Memberships include the already commissioned production logins; do not
  // run V0094's older pre-commission membership-count checker.
  const members=(await c.query("SELECT g.rolname grp,m.member::text member,m.grantor::text grantor,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles g ON g.oid=m.roleid WHERE g.rolname=ANY($1::text[]) ORDER BY grp,member,grantor",[roles.map(x=>x.rolname)])).rows;
  const aclFingerprint=createHash("sha256").update(JSON.stringify({tables,roles,members})).digest("hex");
  await c.query("ROLLBACK");tx=false;
  return {status:v==="0101"?state101:state99,db:id.db,actor:id.actor,version:id.ver,counts,wireColumns:wires,guardCount:4,aclFingerprint,providerCalls:0,flightWrites:0,newLogins:0,phase6PaidGo:false};
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});}
}
export async function installV0101Once({open,bytes,assertPinned=()=>{}}){
 const sql=reviewV0101Sql(bytes);
 const session=async f=>{const c=await open();try{return await f(c);}finally{await c.end();}};
 const before=await session(inspectV0101);
 if(before.status===state101)return {...before,alreadyInstalledNoReplay:true,schemaInstallPerformed:false};
 if(before.status!==state99)hold("V0099_REQUIRED");
 assertPinned();
 try{await session(c=>c.query(sql));}catch{hold("DDL_OR_COMMIT_UNKNOWN_NO_RETRY");}
 const after=await session(inspectV0101);
 if(after.status!==state101||before.aclFingerprint!==after.aclFingerprint)hold("FRESH_READBACK_OR_ACL_DRIFT");
 return {...after,alreadyInstalledNoReplay:false,schemaInstallPerformed:true,sqlBlob:BLOB};
}
async function main(){
 const e=process.env,mode=process.argv[2]??"inventory";
 if(!["inventory","install"].includes(mode)||e.GITHUB_ACTIONS==="true"||!e.DATABASE_URL||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
    e.AERODATABOX_API_KEY||e.RAPIDAPI_KEY||e.AERODATABOX_WEBHOOK_SECRET||e.NODE_TLS_REJECT_UNAUTHORIZED==="0")hold("STOP_OWNER_ONLY");
 const u=new URL(e.DATABASE_URL);
 if(!["postgres:","postgresql:"].includes(u.protocol)||decodeURIComponent(u.username)!=="neondb_owner"||u.pathname!=="/neondb"||
    !u.password||!u.hostname.endsWith(".neon.tech")||!["require","verify-full"].includes(u.searchParams.get("sslmode")??""))hold("EXISTING_NEON_OWNER_URL_REQUIRED");
 const cmd=(s,a)=>execFileSync(s,a,{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 const pin=()=>{const head=cmd("git",["rev-parse","HEAD"]);if(!/^[a-f0-9]{40}$/.test(head)||head!==e.P6_V0101_REVIEWED_MAIN||head!==cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]))hold("EXACT_MAIN_PIN");};
 pin();
 const bytes=readFileSync(PATH);reviewV0101Sql(bytes);
 const open=async()=>{const c=new pg.Client({connectionString:e.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:40000,application_name:"p6_v0101_empty_owner"});await c.connect();return c;};
 if(mode==="install"){
  if(e.P6_V0101_OWNER_APPROVAL!==APPROVAL)hold("EXACT_INSTALL_APPROVAL_REQUIRED");
  console.log(JSON.stringify(await installV0101Once({open,bytes,assertPinned:pin})));
 }else{const c=await open();try{console.log(JSON.stringify(await inspectV0101(c)));}finally{await c.end();}}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(JSON.stringify({status:/^HOLD_P6_V0101_OWNER_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P6_V0101_OWNER_REDACTED_NO_RETRY"}));process.exitCode=2;});
