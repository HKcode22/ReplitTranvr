/** Review-only by default. Candidate owner-local FUNCTION-ONLY V0105
 * commission, no new credentials, role, table, scheduler or paid action.
 * The existing primary runner must already be pinned to approved main in
 * COMMISSION_VERIFY_ONLY. Never run on draft/review branch in production.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {P5_PRIMARY_WRITER as W,P5_PRIMARY_READER as R,P5_PRIMARY_SQL,P5_PRIMARY_APPLY,
 P6_PRIVATE_EXPIRY_SQL} from "./v39_phase5_primary_fids_expiry_github_v39.mjs";
import {inspectP5PrimaryExpiryOwner} from "./v39_phase5_primary_fids_expiry_owner_commission_v39.mjs";
const REPO="HKcode22/ReplitTranvr";
const F="clean.phase6_private_epoch_expiry_";
const roles=[R,R,W,W];
const names=["status","receipt","sweep","stop"];
const args=["text","text, text","text, integer","text"];
const signatures=names.map((x,i)=>F+x+"_v39("+args[i]+")");
const HOLD=x=>{throw Error("HOLD_P6_PRIVATE_EXPIRY_OWNER_"+x);};
const digest=x=>createHash("sha256").update(x).digest("hex");
const approval="COMMISSION_REVIEWED_V0105_EXISTING_FUNCTION_ACTORS_VERIFY_ONLY_NO_GO";
async function catalog(c,sql,readonly){
 const a=(await c.query(`SELECT current_database() db,current_user actor,session_user login,
  current_setting('server_version_num')::int version,current_setting('transaction_read_only') ro,
  current_setting('session_replication_role') origin,pg_is_in_recovery() replica`)).rows[0];
 if(a?.db!=="neondb"||a.actor!=="neondb_owner"||a.login!==a.actor||a.version<160000||a.version>=170000||
    a.ro!==(readonly?"on":"off")||a.origin!=="origin"||a.replica!==false)HOLD("EXACT_OWNER_PG16_SCOPE");
 const state=(await c.query(`SELECT
  (SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled) enabled,
  (SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE') batches,
  (SELECT count(*)::int FROM clean.adb_collection_segments WHERE status='ACTIVE') segments,
  (SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subscriptions,
  (SELECT count(*)::int FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved) deletionStops,
  (SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39) packets,
  (SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39) indexes,
  (SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39) claims`)).rows[0];
 if(!state||Object.keys(state).length!==8||Object.values(state).some(x=>!Number.isSafeInteger(x)||x<0)||
    ["enabled","batches","segments","subscriptions","deletionstops"].some(k=>state[k]!==0))
   HOLD("ACTIVE_COLLECTION_OR_DELETION_STOP");
 const tables=(await c.query(`SELECT c.relname,pg_get_userbyid(c.relowner) owner
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE c.relkind='r' AND ((n.nspname='clean' AND c.relname IN ('adb_phase6_authorization','adb_collection_meta','adb_incident_stop'))
    OR(n.nspname='phase6_private' AND c.relname IN ('frozen_native_packet_v39','signed_run_day_index_revision_v39','signed_run_day_epoch_claim_v39')))`)).rows;
 if(tables.length!==6||tables.some(v=>v.owner!==a.actor))HOLD("EXACT_TABLE_OWNER_REQUIRED");
 const v=(await c.query(`SELECT count(*)::int n FROM pg_constraint WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass
   AND conname LIKE 'p6_v0101_%' AND convalidated`)).rows[0];
 if(v?.n!==4)HOLD("V0101_REQUIRED");
 // Check all existing primary functions and exact roles, not just names.
 const group=[{prefix:"phase5_primary_fids_expiry_",src:readFileSync(P5_PRIMARY_SQL,"utf8"),args:["","text","integer","text"],private:false},
   {prefix:"phase6_private_epoch_expiry_",src:sql,args,private:true}];
 let privateState="ABSENT";
 for(const g of group){
  const fns=names.map(x=>g.prefix+x+"_v39");
  const rows=(await c.query(`SELECT p.proname name,oidvectortypes(p.proargtypes) args,
   pg_get_function_result(p.oid) result,p.provolatile vol,p.prosecdef definer,p.prosrc body,p.proconfig config,
   p.prokind kind,l.lanname lang,pg_get_userbyid(p.proowner) owner,
   has_function_privilege($2,p.oid,'EXECUTE') w,has_function_privilege($3,p.oid,'EXECUTE') r,
   coalesce((SELECT jsonb_agg(jsonb_build_object('role',coalesce(pg_get_userbyid(x.grantee),'PUBLIC'),
     'grantable',x.is_grantable,'privilege',x.privilege_type) ORDER BY x.grantee)
     FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee<>p.proowner),'[]'::jsonb) delegated
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
   WHERE n.nspname='clean' AND p.proname=ANY($1::text[])`,[fns,W,R])).rows;
  if(g.private&&rows.length===0)continue;
  if(rows.length!==4)HOLD("PARTIAL_FUNCTIONS_NO_REPLAY");
  const inert=g.private&&rows.every(q=>q.delegated.length===0);
  if(g.private)privateState=inert?"INERT":"GRANTED";
  for(let i=0;i<4;i++){
   const q=rows.find(x=>x.name===fns[i]);
   const marker="AS $"+names[i]+"$";const end="$"+names[i]+"$;";
   const sep=g.src.split(marker);
   const body=sep.length===2?sep[1].split(end)[0]:null;
   const config=["search_path=pg_catalog, pg_temp",...(i>=2?["lock_timeout=3s"]:[])].sort();
   const expected=inert?[]:[{role:roles[i],grantable:false,privilege:"EXECUTE"}];
   if(!q||body===null||q.body!==body||q.args!==g.args[i]||q.result!==(i===3?"boolean":"jsonb")||
      q.vol!==(i>=2?"v":"s")||q.definer!==true||q.kind!=="f"||q.lang!==(i===0&&!g.private?"sql":"plpgsql")||
      q.owner!==a.actor||JSON.stringify([...q.config??[]].sort())!==JSON.stringify(config)||
      JSON.stringify(q.delegated)!==JSON.stringify(expected)||q.w!==(!inert&&i>=2)||q.r!==(!inert&&i<2))
    HOLD("EXACT_FUNCTION_BODY_OR_GRANTS");
  }
 }
 return {privateState,...state};
}
export async function inspectP6PrivateExpiryOwner(c,sql=readFileSync(P6_PRIVATE_EXPIRY_SQL,"utf8")){
 // Existing V0103 owner verifier independently checks original role/STOP boundary.
 const primary=await inspectP5PrimaryExpiryOwner(c);
 if(primary.existingFunctions!==4||!primary.writerExists)HOLD("PRIMARY_NOT_COMMISSIONED");
 await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{await c.query("SET LOCAL statement_timeout='12000ms'");return await catalog(c,sql,true);}
 finally{await c.query("ROLLBACK");}
}
function body(sql){
 if(typeof sql!=="string"||sql.split("\nBEGIN;\n").length!==2||
    (sql.match(/\nCOMMIT;\s*$/g)||[]).length!==1||
    !sql.includes("CREATE FUNCTION "+F+"status_v39(p_manifest text)"))
  HOLD("EXACT_SQL_WRAPPER");
 return sql.replace("\nBEGIN;\n","\n").replace(/\nCOMMIT;\s*$/,"\n");
}
export async function commissionP6PrivateExpiryDb(c,sql,expected){
 if(sql!==readFileSync(P6_PRIVATE_EXPIRY_SQL,"utf8"))HOLD("EXACT_REVIEWED_SQL_REQUIRED");
 const before=await inspectP6PrivateExpiryOwner(c,sql);
 if(JSON.stringify(before)!==JSON.stringify(expected)||before.privateState==="GRANTED")HOLD("REVIEW_DRIFT_OR_ALREADY_GRANTED");
 let active=false,commitAttempted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");active=true;
  await c.query("SET LOCAL statement_timeout='20000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  // Stop collection/publication transition; no locks on raw FIDS or reader.
  await c.query("LOCK TABLE clean.adb_phase6_authorization,clean.adb_collection_batches,clean.adb_collection_segments,clean.adb_collection_subs,clean.adb_incident_stop,phase6_private.frozen_native_packet_v39,phase6_private.signed_run_day_index_revision_v39,phase6_private.signed_run_day_epoch_claim_v39 IN SHARE ROW EXCLUSIVE MODE");
  await c.query("SELECT pg_advisory_xact_lock(390015,106)");
  const locked=await catalog(c,sql,false);
  if(JSON.stringify(locked)!==JSON.stringify(before))HOLD("LOCKED_SCOPE_CHANGED");
  if(before.privateState==="ABSENT")await c.query(body(sql));
  const inert=await catalog(c,sql,false);
  if(inert.privateState!=="INERT")HOLD("INERT_STATE_REQUIRED");
  await c.query("GRANT EXECUTE ON FUNCTION "+signatures.slice(0,2).join(",")+" TO "+R);
  await c.query("GRANT EXECUTE ON FUNCTION "+signatures.slice(2).join(",")+" TO "+W);
  const after=await catalog(c,sql,false);
  if(JSON.stringify(after)!==JSON.stringify({...before,privateState:"GRANTED"}))HOLD("IN_TRANSACTION_SCOPE_DRIFT");
  commitAttempted=true;await c.query("COMMIT");active=false;
  return {status:"PRIVATE_EXPIRY_FUNCTIONS_GRANTED_COMMIT_ACKNOWLEDGED",functionsInstalled:before.privateState==="ABSENT"?4:0,
   functionGrants:4,newRoles:0,newTables:0,privateContentWrites:0,providerCalls:0,phase6PaidGo:false};
 }catch(e){
  if(active&&!commitAttempted)await c.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)HOLD("COMMIT_UNKNOWN_INDEPENDENT_INSPECTION_NO_REPLAY");
  throw e;
 }
}
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:"utf8",timeout:15000,stdio:["ignore","pipe","ignore"],maxBuffer:2*1024*1024}).trim();
function repoState(){
 const pin=process.env.P6_PRIVATE_EXPIRY_OWNER_APPROVED_MAIN_SHA??"";
 if(!/^[a-f0-9]{40}$/.test(pin)||run("git",["rev-parse","HEAD"])!==pin||
    run("git",["status","--porcelain","--untracked-files=no"])||
    run("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])!==pin||
    run("git",["hash-object",P6_PRIVATE_EXPIRY_SQL])!==run("git",["rev-parse",pin+":"+P6_PRIVATE_EXPIRY_SQL]))
  HOLD("EXACT_CLEAN_MAIN_REQUIRED");
 const vars=new Map(JSON.parse(run("gh",["variable","list","-R",REPO,"--json","name,value"])).map(x=>[x.name,x.value]));
 if(vars.get("P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA")!==pin||
    vars.get("P5_PRIMARY_FIDS_EXPIRY_ENABLED")!=="true"||vars.get("P5_PRIMARY_FIDS_EXPIRY_APPROVAL")!==P5_PRIMARY_APPLY||
    vars.get("P6_PRIVATE_EPOCH_EXPIRY_MODE")!=="COMMISSION_VERIFY_ONLY"||
    vars.get("P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256")||vars.get("P6_PRIVATE_EPOCH_EXPIRY_APPROVAL"))
  HOLD("EXISTING_PRIMARY_AND_TRANSITION_FLAGS_REQUIRED");
 const secrets=JSON.parse(run("gh",["secret","list","-R",REPO,"--json","name"]));
 if(!["P5_PRIMARY_FIDS_SWEEP_DATABASE_URL","P5_RETENTION_READER_DATABASE_URL"].every(k=>secrets.some(s=>s.name===k)))HOLD("EXISTING_SECRETS_REQUIRED");
 return {pin,endpoint:vars.get("P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256")};
}
async function main(){
 const mode=process.argv[2]??"review",e=process.env;
 if(process.argv.length>3||!["review","commission"].includes(mode)||e.GITHUB_ACTIONS==="true"||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
    e.NODE_TLS_REJECT_UNAUTHORIZED==="0"||e.AERODATABOX_API_KEY||e.RAPIDAPI_KEY||e.AERODATABOX_WEBHOOK_SECRET||
    !e.DATABASE_URL||e.V39_DATABASE_RUNTIME_URL)HOLD("OWNER_LOCAL_NONPAID_ONLY");
 const config=repoState(),u=new URL(e.DATABASE_URL);
 if(!["postgres:","postgresql:"].includes(u.protocol)||decodeURIComponent(u.username)!=="neondb_owner"||
    !u.password||u.pathname!=="/neondb"||!u.hostname.endsWith(".neon.tech")||u.hash||
    !["require","verify-full"].includes(u.searchParams.get("sslmode"))||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    digest(u.host.toLowerCase()+u.pathname)!==config.endpoint)HOLD("EXACT_EXISTING_OWNER_ENDPOINT");
 u.searchParams.set("sslmode","verify-full");
 const sql=readFileSync(P6_PRIVATE_EXPIRY_SQL,"utf8"),c=new pg.Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:30000});
 try{
  await c.connect();
  const before=await inspectP6PrivateExpiryOwner(c,sql);
  const review={reviewedMainSha:config.pin,sqlSha256:digest(sql),endpointSha256:config.endpoint,...before};
  const reviewSha256=digest(JSON.stringify(review));
  if(mode==="review"){
   console.log(JSON.stringify({status:"PRIVATE_EXPIRY_OWNER_REVIEW_ONLY_NO_GO",...review,reviewSha256,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
   return;
  }
  if(e.P6_PRIVATE_EXPIRY_OWNER_APPROVAL!==approval||e.P6_PRIVATE_EXPIRY_OWNER_REVIEW_SHA256!==reviewSha256||
    JSON.stringify(repoState())!==JSON.stringify(config))HOLD("EXACT_EXPLICIT_REVIEW_REQUIRED");
  const result=await commissionP6PrivateExpiryDb(c,sql,before);
  const after=await inspectP6PrivateExpiryOwner(c,sql);
  if(after.privateState!=="GRANTED")HOLD("COMMITTED_OWNER_READBACK_DRIFT_NO_REPLAY");
  if(JSON.stringify(repoState())!==JSON.stringify(config))HOLD("CONFIG_CHANGED_AFTER_COMMIT_NO_REPLAY");
  console.log(JSON.stringify({...result,reviewedMainSha:config.pin,reviewSha256,ownerReadback:after.privateState,
   independentRestrictedGithubVerifyStillRequired:true,privateApplyEnabled:false}));
 }finally{await c.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_P6_PRIVATE_EXPIRY_OWNER_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_PRIVATE_EXPIRY_OWNER_REDACTED_RECONCILE_NO_REPLAY");process.exitCode=2;});
