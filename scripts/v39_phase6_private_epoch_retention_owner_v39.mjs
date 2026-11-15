/** Owner-only private transport expiry. No provider, migration, or claim reset.
 * Review a redacted exact scope, then separately authorize the same scope.
 * Expired head closes its entire index chain so cleanup cannot resurrect an
 * older live revision. This explicitly includes earlier still-unexpired index
 * bytes (NOT still-live packet bytes). No physical backup/PITR certification.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const P="phase6_private.frozen_native_packet_v39",I="phase6_private.signed_run_day_index_revision_v39",C="phase6_private.signed_run_day_epoch_claim_v39";
export const APPROVAL="DELETE_EXACT_REVIEWED_EXPIRED_PRIVATE_PACKETS_AND_CLOSE_EXPIRED_HEAD_INDEX_CHAINS_NO_PROVIDER";
const hold=s=>{throw Error("HOLD_P6_PRIVATE_EXPIRY_"+s);};
const date=x=>{const d=new Date(x);if(!Number.isFinite(d.getTime()))hold("INVALID_CLOCK");return d.toISOString();};
const maxPackets=25000,maxRevisions=31*1024;
async function identity(c){
 const r=(await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,rolsuper,clock_timestamp() now FROM pg_roles WHERE rolname=current_user")).rows[0];
 if(!r||r.db!=="neondb"||r.actor!=="neondb_owner"||r.login!==r.actor||r.ver<160000||r.ver>=170000||r.replica!==false||r.rolsuper!==false)hold("EXACT_PG16_OWNER");
 const schema=(await c.query("SELECT count(*)::int n FROM pg_class WHERE oid=ANY(ARRAY[to_regclass($1),to_regclass($2),to_regclass($3)]) AND pg_get_userbyid(relowner)=current_user",[P,I,C])).rows[0];
 if(schema?.n!==3)hold("PRIVATE_SCHEMA_OR_OWNER_DRIFT");
 const guard=(await c.query("SELECT count(*)::int n FROM pg_constraint WHERE conrelid=$1::regclass AND conname LIKE 'p6_v0101_%' AND convalidated",[P])).rows[0];
 if(guard?.n!==4)hold("EXISTING_V0101_REQUIRED");
 return date(r.now);
}
async function scope(c,cutoff){
 const packets=(await c.query("SELECT logical_path,run_day_index,content_sha256,retention_not_after_utc FROM "+P+" WHERE retention_not_after_utc <= $1::timestamptz ORDER BY logical_path LIMIT "+(maxPackets+1),[cutoff])).rows;
 const indexes=(await c.query("SELECT run_day_index,revision,content_sha256,retention_not_after_utc FROM "+I+" ORDER BY run_day_index,revision LIMIT "+(maxRevisions+1))).rows;
 const claims=(await c.query("SELECT run_day_index FROM "+C+" ORDER BY run_day_index")).rows.map(x=>x.run_day_index);
 if(packets.length>maxPackets||indexes.length>maxRevisions||claims.length>31)hold("SCOPE_TOO_LARGE");
 const byDay=new Map();
 for(const row of indexes){
  if(!claims.includes(row.run_day_index))hold("MISSING_IMMUTABLE_CLAIM");
  const rows=byDay.get(row.run_day_index)??[];
  if(row.revision!==rows.length+1)hold("NONCONTIGUOUS_REVISIONS");
  rows.push(row);byDay.set(row.run_day_index,rows);
 }
 const closing=[],remove=[];
 for(const [day,rows] of byDay){
  const expired=x=>date(x.retention_not_after_utc)<=cutoff;
  if(expired(rows.at(-1))){closing.push(day);remove.push(...rows);}
  else if(rows.some(expired))hold("LIVE_HEAD_WITH_EXPIRED_ANCESTOR");
 }
 const early=remove.filter(x=>date(x.retention_not_after_utc)>cutoff).length;
 const fingerprint=createHash("sha256").update(JSON.stringify({cutoff,packets,indexes:remove,claims})).digest("hex");
 return {cutoff,scopeSha256:fingerprint,expiredPackets:packets.length,closedDays:closing.length,indexRevisions:remove.length,earlierLiveIndexRevisionsRetired:early,claimsPreserved:claims.length};
}
export async function reviewPrivateExpiry(c,{cutoff,expectedScopeSha256,apply=false,approval}={}){
 let tx=false;
 try{
  if(apply&&(approval!==APPROVAL||!cutoff||!/^[a-f0-9]{64}$/.test(expectedScopeSha256??"")))hold("EXPLICIT_SCOPE_APPROVAL");
  await c.query(apply?"BEGIN":"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='20000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  if(apply)await c.query("LOCK TABLE "+P+", "+I+", "+C+" IN SHARE ROW EXCLUSIVE MODE");
  const now=await identity(c);
  const at=cutoff===undefined?now:date(cutoff);
  if(at>now)hold("FUTURE_CUTOFF");
  const plan=await scope(c,at);
  if(apply){
   if(plan.scopeSha256!==expectedScopeSha256)hold("REVIEWED_SCOPE_DRIFT");
   // Every expired-head day closes atomically, including older index bytes.
   // No deletion of an unexpired private packet or any epoch claim.
   const i=await c.query("DELETE FROM "+I+" WHERE run_day_index IN (SELECT DISTINCT ON (run_day_index) run_day_index FROM "+I+" x WHERE NOT EXISTS(SELECT 1 FROM "+I+" y WHERE y.run_day_index=x.run_day_index AND y.revision>x.revision) AND retention_not_after_utc <= $1::timestamptz)",[at]);
   const p=await c.query("DELETE FROM "+P+" WHERE retention_not_after_utc <= $1::timestamptz",[at]);
   if(i.rowCount!==plan.indexRevisions||p.rowCount!==plan.expiredPackets)hold("DELETE_COUNT_DRIFT");
   const after=await scope(c,at);
   if(after.indexRevisions!==0||after.expiredPackets!==0||after.claimsPreserved!==plan.claimsPreserved)hold("TRANSACTION_READBACK_DRIFT");
   try{await c.query("COMMIT");tx=false;}catch{hold("COMMIT_UNKNOWN_NO_RETRY");}
  }else{await c.query("ROLLBACK");tx=false;}
  return {status:apply?"PRIVATE_EXPIRY_COMMITTED_PRIMARY_ONLY_NO_GO":"PRIVATE_EXPIRY_REVIEW_ONLY_NO_GO",...plan,applied:apply,providerCalls:0,claimDeletes:0,backupOrPitrCertified:false,phase6PaidGo:false};
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});}
}
async function main(){
 const e=process.env,mode=process.argv[2]??"inventory";
 if(!["inventory","apply"].includes(mode)||e.GITHUB_ACTIONS==="true"||!e.DATABASE_URL||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
    e.AERODATABOX_API_KEY||e.RAPIDAPI_KEY||e.AERODATABOX_WEBHOOK_SECRET||e.NODE_TLS_REJECT_UNAUTHORIZED==="0")hold("STOP_OWNER_ONLY");
 const u=new URL(e.DATABASE_URL);
 if(!["postgres:","postgresql:"].includes(u.protocol)||decodeURIComponent(u.username)!=="neondb_owner"||u.pathname!=="/neondb"||
    !u.password||!u.hostname.endsWith(".neon.tech")||!["require","verify-full"].includes(u.searchParams.get("sslmode")??""))hold("EXISTING_NEON_OWNER_URL_REQUIRED");
 const cmd=(s,a)=>execFileSync(s,a,{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 const head=cmd("git",["rev-parse","HEAD"]);
 if(!/^[a-f0-9]{40}$/.test(head)||head!==e.P6_PRIVATE_EXPIRY_REVIEWED_MAIN||head!==cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]))hold("EXACT_MAIN_PIN");
 const c=new pg.Client({connectionString:e.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:40000,application_name:"p6_private_expiry_owner"});
 await c.connect();try{
  console.log(JSON.stringify(await reviewPrivateExpiry(c,mode==="apply"?{apply:true,cutoff:e.P6_PRIVATE_EXPIRY_CUTOFF,expectedScopeSha256:e.P6_PRIVATE_EXPIRY_SCOPE_SHA256,approval:e.P6_PRIVATE_EXPIRY_OWNER_APPROVAL}:{})));
 }finally{await c.end();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(JSON.stringify({status:/^HOLD_P6_PRIVATE_EXPIRY_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P6_PRIVATE_EXPIRY_REDACTED_NO_RETRY"}));process.exitCode=2;});
