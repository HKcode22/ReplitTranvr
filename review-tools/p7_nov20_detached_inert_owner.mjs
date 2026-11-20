/** Detached OWNER inert DDL only. Reuses the exact 36/36-green candidate
 * storage implementation; leaves main, paid flags, existing data and the
 * disabled stage alone. Do not use as a runtime deployment mechanism. */
import {createHash,randomBytes} from "node:crypto";
import {execFileSync,spawnSync} from "node:child_process";
import {realpathSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {homedir} from "node:os";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {pathToFileURL,fileURLToPath} from "node:url";
const REPO="HKcode22/ReplitTranvr", BASE="0a7b1a28f243de76d4c83026d15f585265ef6f7b", HEAD="e91536badf97fdf6302fc3db52c1e9e864dfb6c0";
const EXPIRY_REVIEW_HEAD="ba892cd3036cf06e8e103635bbcf2a38670ee067";
const RUN_IDS=[44687814263,44687814276,44687814277,44687814278,44687814280,44687814352,44687814361,44687814362,44687814363,44687814396,44687814407,44687814446,44687814447,44687814463,44687814483,44687814484,44687814486,44687814488,44687814498,44687814504,44687814511,44687814513,44687814530,44687814558,44687814562,44687814567,44687814570,44687814576,44687814579,44687814585,44687814594,44687814599,44687814620,44687814674,44687814717,44687814732];
const S={auth:"AUTH-20261119-P5INERTFREEZE",manifest:"3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7",calendar:"9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6",config:"001a3f0634cc41b8d1327be36404efa74feaaea21fe4ef6eead7e993acaf4c88"};
const STOP_AT=Date.parse("2026-11-20T02:23:21.671Z");
const STOP=["V39_PHASE6_PROCESS_ARMED","P5_CD_GH_PRE_STOP","P5_CD_GH_PRE_ARMED","P5_CD_GH_PREPARE_ARMED"];
const MODES=["P6_NONPAID_SOURCE_SCHEDULE_ENABLED","P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED","P6_PRIVATE_POST_PARENT_ENABLED","P6_NATIVE_LATER_RUNTIME_ENABLED","P6_NATIVE_POST_PRODUCER_ENABLED","P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED","P6_PRIVATE_T24_EXECUTION_ENABLED","P6_PRIVATE_LATER_ENROLL_ENABLED","P6_PRIVATE_T24_ENROLL_ENABLED","P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED","P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED","P5_CD_GH_PRE_SCHEDULE_ENABLED","P5_CD_GH_T24_SCHEDULE_ENABLED","P6_ROLLING_CONTROLLER_ENABLED","P5_AUTO_SOURCE_DISPATCH_ENABLED","P5_POST_AUTO_DISPATCH_ENABLED","P5_T24_AUTO_DISPATCH_ENABLED","P5_LATER_PRE_AUTO_DISPATCH_ENABLED","P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED","P6_T24_CUSTODY_ENABLED","P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED"];
const need=(ok,s)=>{if(!ok)throw Error("HOLD_P7_DETACHED_INERT_"+s)};
const sha=x=>createHash("sha256").update(x).digest("hex");
const cmd=(c,a)=>execFileSync(c,a,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:20000,maxBuffer:8*1024*1024}).trim();
const api=p=>JSON.parse(cmd("gh",["api","--method","GET","repos/"+REPO+"/"+p]));
function pages(path,key){
 const rows=JSON.parse(cmd("gh",["api","--paginate","--slurp","repos/"+REPO+"/"+path+"?per_page=100"]));
 need(Array.isArray(rows)&&rows.length>0&&rows.length<=10&&rows.every(x=>Array.isArray(x[key])&&x.total_count===rows[0].total_count),"METADATA_PAGES");
 const all=rows.flatMap(x=>x[key]);need(all.length===rows[0].total_count&&new Set(all.map(x=>x.name)).size===all.length,"METADATA_ROWS");return all;
}
export function checkExactCandidate(main,pr,runs){
 need(main===BASE&&pr?.number===925&&pr.state==="open"&&pr.merged===false&&pr.base?.sha===BASE&&pr.head?.sha===HEAD&&pr.head?.repo?.full_name===REPO&&pr.mergeable===true,"MAIN_OR_CANDIDATE_DRIFT");
 need(Array.isArray(runs)&&runs.length===RUN_IDS.length&&new Set(runs.map(x=>x.id)).size===RUN_IDS.length&&RUN_IDS.every(id=>runs.some(x=>x.id===id&&x.head_sha===HEAD&&x.event==="pull_request"&&x.run_attempt===1&&x.status==="completed"&&x.conclusion==="success")),"EXACT_36_CI");
}
export function checkStop(secrets,vars){
 for(const n of STOP){const a=secrets.filter(x=>x.name===n),t=Date.parse(a[0]?.updated_at);need(a.length===1&&Number.isFinite(t)&&t<=STOP_AT,"STOP_SECRET_DRIFT")}
 need(MODES.every(n=>!vars.some(x=>x.name===n))&&!vars.some(x=>x.name==="P7_EXPIRY_ENABLED"&&x.value==="true"),"COLLECTION_OR_EXPIRY_ARMED");
 const p=vars.find(x=>x.name==="P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256")?.value;
 need(/^[a-f0-9]{64}$/.test(p??""),"EXISTING_ENDPOINT_PIN");return p;
}
function verifyOwnerScope(expiry=false){
 const e=process.env;
 need(e.GITHUB_ACTIONS!=="true"&&e.ADB_AUTO_COLLECT==="0"&&e.V39_PHASE6_PROCESS_ARMED==="0"&&e.V39_PHASE6_OWNER_APPROVED==="0"&&e.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","V39_DATABASE_RUNTIME_URL"].every(k=>!e[k]),"NO_PROVIDER_OWNER_ONLY");
 need(cmd("git",["rev-parse","HEAD"])===HEAD&&cmd("git",["status","--porcelain","--untracked-files=no"])==="","EXACT_CLEAN_DETACHED_CHECKOUT");
 const p=api("pulls/925"),m=api("git/ref/heads/main").object.sha;
 const result=api("actions/runs?head_sha="+HEAD+"&event=pull_request&per_page=100");
 need(result.total_count===RUN_IDS.length,"NO_UNREVIEWED_RERUNS");
 if(expiry){
  // Only the already installed schema, no changed runtime files or API calls.
  // Old immutable candidate is green; current draft adds only scientific
  // POST accounting improvements and cannot alter this maintenance step.
  need(p.head.sha===EXPIRY_REVIEW_HEAD,"EXPIRY_REVIEW_HEAD_DRIFT");
  const cmp=api("compare/"+HEAD+"..."+EXPIRY_REVIEW_HEAD);
  const expected=["server/lib/disruption/phase6ActualPostOutcomeObservability_v39.ts","server/lib/disruption/phase7PostPreservationBridge_v39.ts","server/lib/disruption/phase7SignedPostConsumer_v39.ts","tests/phase6_actual_post_outcome_observability_v39.test.ts","tests/phase7_post_preservation_bridge_v39.test.ts"].sort();
  need(cmp.status==="ahead"&&cmp.ahead_by===1&&cmp.behind_by===0&&JSON.stringify(cmp.files.map(x=>x.filename).sort())===JSON.stringify(expected),"INSTALLED_EXPIRY_IMPLEMENTATION_CHANGED");
  checkExactCandidate(m,{...p,head:{...p.head,sha:HEAD}},result.workflow_runs);
 }else checkExactCandidate(m,p,result.workflow_runs);
 const endpoint=checkStop(pages("actions/secrets","secrets"),pages("actions/variables","variables"));
 const u=new URL(e.DATABASE_URL??"");
 need(["postgres:","postgresql:"].includes(u.protocol)&&decodeURIComponent(u.username)==="neondb_owner"&&u.password&&u.pathname==="/neondb"&&u.hostname.endsWith(".neon.tech")&&(u.port===""||u.port==="5432")&&!u.hash&&u.searchParams.getAll("sslmode").length===1&&["require","verify-full"].includes(u.searchParams.get("sslmode"))&&[...u.searchParams.keys()].every(k=>["sslmode","channel_binding"].includes(k))&&sha(u.host.toLowerCase()+u.pathname)===endpoint,"EXACT_EXISTING_OWNER_ENDPOINT");
 u.searchParams.set("sslmode","verify-full");return u.toString();
}
const LOCKS=["adb_phase6_authorization","adb_phase6_calendar_day","adb_collection_subs","adb_collection_batches","adb_incident_stop","adb_sampling_draw","phase5_fids_allowed_query_v39","phase5_fids_exact_query_partition_v39","phase5_fids_physical_attempt_v39","phase5_other_rest_physical_reservation_v39"];
async function inspectDisabled(c,write){
 const q=(await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid='clean.adb_phase6_authorization'::regclass)) auth_owner")).rows[0];
 need(q?.db==="neondb"&&q.actor==="neondb_owner"&&q.login===q.actor&&q.auth_owner===q.actor&&q.ver>=160000&&q.ver<170000&&q.replica===false&&q.ro===(write?"off":"on"),"EXACT_EXISTING_OWNER_PG16");
 if(write){
  need((await c.query("SELECT pg_try_advisory_xact_lock(hashtext('v39-phase6-provider-mutation')::bigint) ok")).rows[0].ok===true,"MUTATION_LOCK_BUSY");
  await c.query("LOCK TABLE "+LOCKS.map(x=>"clean."+x).join(",")+" IN SHARE ROW EXCLUSIVE MODE");
 }
 const s=(await c.query(`SELECT
 (SELECT count(*)::int FROM clean.adb_phase6_authorization) auth_rows,
 (SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE singleton_key AND NOT enabled AND revoked_at_utc IS NULL AND authorization_id=$1 AND code_sha=$2 AND manifest_sha256=$3 AND calendar_hash=$4 AND config_hash=$5) exact_disabled,
 (SELECT count(*)::int FROM clean.adb_phase6_calendar_day) calendar_rows,
 (SELECT count(*)::int FROM clean.adb_phase6_calendar_day WHERE calendar_hash=$4 AND config_hash=$5) exact_calendar,
 (SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents,
 (SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subs,
 (SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE' OR run_day_index IS NOT NULL) batches,
 (SELECT count(*)::int FROM clean.adb_sampling_draw) draws,
 (SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=$3) queries,
 (SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$3) attempts,
 (SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$3) other_attempts,
 (SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39) packets,
 (SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39) indexes,
 (SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39) claims`,[S.auth,BASE,S.manifest,S.calendar,S.config])).rows[0];
 need(s?.auth_rows===1&&s.exact_disabled===1&&s.calendar_rows===31&&s.exact_calendar===31&&["incidents","subs","batches","draws","queries","attempts","other_attempts","packets","indexes","claims"].every(k=>s[k]===0),"DISABLED_STAGE_NOT_EMPTY_EXACT");
 return {authDisabled:true,calendarRows:31,physicalAttempts:0,activeSubscriptions:0,unresolvedIncidents:0};
}
/** Exercise exactly this loader in no-provider CI using the pinned candidate
 * checkout and its dependency lock. No connection or DB mutation here. */
export async function loadExactInertImplementation(root){
 const {Pool}=createRequire(resolve(root,"package.json"))("pg");
 const m=await import(pathToFileURL(resolve(root,"server/lib/disruption/phase7InertStorageCommission_v39.ts")).href);
 need(typeof Pool==="function"&&typeof m.installP7InertStorage==="function"&&typeof m.inspectP7InertStorage==="function"&&m.compileP7InertStorageSql().length===3,"CANDIDATE_LOADER");
 return {Pool,installP7InertStorage:m.installP7InertStorage,inspectP7InertStorage:m.inspectP7InertStorage};
}
const EXPIRY_ROLES=["phase7_expiry_reader_prod20261120","phase7_expiry_writer_prod20261120"];
const EXPIRY_SECRETS=["P7_EXPIRY_READER_DATABASE_URL","P7_EXPIRY_WRITER_DATABASE_URL"];
const EXPIRY_FUNCTIONS=["phase7_private.pre_link_expiry_status_v39()","phase7_private.research_expiry_status_v39()","phase7_private.sweep_due_pre_links_v39(integer)","phase7_private.sweep_due_research_outputs_v39(integer)"];
export function verifyExpiryLoginCatalog(rows,login){
 need(rows.length===2&&EXPIRY_ROLES.every((role,i)=>{
  const x=rows.find(y=>y.rolname===role);
  return x&&x.canlogin===login&&x.canuse===true&&x.excess===false&&x.cancreate===false&&x.dbcreate===false&&
   Array.isArray(x.exec)&&JSON.stringify(x.exec)==JSON.stringify(EXPIRY_FUNCTIONS.map((_,j)=>i===0?j<2:j>=2))&&
   ["super","createdb","createrole","replication","bypassrls","inherit","member"].every(k=>x[k]===false);
 }),"EXPIRY_ACTOR_PRIVILEGE_DRIFT");
}
async function expiryCatalog(c,login){
 const rows=(await c.query(`SELECT r.rolname,rolcanlogin canlogin,rolsuper super,rolcreatedb createdb,rolcreaterole createrole,rolreplication replication,rolbypassrls bypassrls,rolinherit inherit,
 EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) member,
 has_schema_privilege(r.oid,'phase7_private','USAGE') canuse,has_schema_privilege(r.oid,'phase7_private','CREATE') cancreate,
 has_database_privilege(r.oid,'neondb','CREATE') dbcreate,
 ARRAY(SELECT has_function_privilege(r.oid,f,'EXECUTE') FROM unnest($2::text[]) WITH ORDINALITY u(f,n) ORDER BY n) exec,
 EXISTS(SELECT 1 FROM pg_class t JOIN pg_namespace ns ON ns.oid=t.relnamespace WHERE ns.nspname NOT IN ('pg_catalog','information_schema') AND ns.nspname NOT LIKE 'pg_toast%' AND ns.nspname NOT LIKE 'pg_temp%' AND t.relkind IN ('r','p','v','m','f') AND (has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) excess
 FROM pg_roles r WHERE r.rolname=ANY($1::text[])`,[EXPIRY_ROLES,EXPIRY_FUNCTIONS])).rows;
 verifyExpiryLoginCatalog(rows,login);
}
function expiryUnconfigured(){
 const names=pages("actions/secrets","secrets"),vars=pages("actions/variables","variables");
 need(EXPIRY_SECRETS.every(n=>!names.some(x=>x.name===n))&&vars.every(x=>!["P7_EXPIRY_ENABLED","P7_EXPIRY_APPROVAL","P7_EXPIRY_APPROVED_MAIN_SHA"].includes(x.name)),"EXPIRY_ALREADY_OR_PARTIALLY_CONFIGURED_NO_REPLAY");
}
async function commissionExpiryOnly(pool,ownerUrl,inspectP7InertStorage){
 // No runtime grant, PRE policy, source permission, deletion or scheduling.
 expiryUnconfigured();
 await inspectP7InertStorage(pool);
 const passwords=EXPIRY_ROLES.map(()=>randomBytes(36).toString("base64url"));
 const urls=EXPIRY_ROLES.map((role,i)=>{const u=new URL(ownerUrl);u.username=role;u.password=passwords[i];return u.toString()});
 const dir=mkdtempSync(resolve(homedir(),".travnr-p7-expiry-"));
 const file=resolve(dir,"expiry-recovery-PRIVATE.json");
 writeFileSync(file,JSON.stringify({roles:EXPIRY_ROLES,urls,base:BASE,installedCandidate:HEAD}),{mode:0o600,flag:"wx"});
 let commit=false,ack=false;
 try{
  const c=await pool.connect();
  try{
   await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
   await c.query("SET LOCAL statement_timeout='20000ms'; SET LOCAL lock_timeout='2000ms'");
   await inspectDisabled(c,true);await expiryCatalog(c,false);
   for(let i=0;i<2;i++){
    const lit=(await c.query("SELECT quote_literal($1) lit",[passwords[i]])).rows[0].lit;
    need(/^'[A-Za-z0-9_-]{48}'$/.test(lit),"CREDENTIAL_QUOTE");
    await c.query("ALTER ROLE "+EXPIRY_ROLES[i]+" LOGIN PASSWORD "+lit);
    await c.query("GRANT CONNECT ON DATABASE neondb TO "+EXPIRY_ROLES[i]);
   }
   await expiryCatalog(c,true);await inspectDisabled(c,true);
   need(api("git/ref/heads/main").object.sha===BASE&&api("pulls/925").head.sha===EXPIRY_REVIEW_HEAD,"PRECOMMIT_DRIFT");
   checkStop(pages("actions/secrets","secrets"),pages("actions/variables","variables"));
   expiryUnconfigured();commit=true;await c.query("COMMIT");ack=true;
  }finally{if(!commit)await c.query("ROLLBACK").catch(()=>{});c.release(commit&&!ack?Error("P7_EXPIRY_LOGIN_COMMIT_UNKNOWN"):undefined)}
  const {Pool}=createRequire(resolve(realpathSync(process.cwd()),"package.json"))("pg");
  const reader=new Pool({connectionString:urls[0],max:1,connectionTimeoutMillis:8000,query_timeout:20000});
  const writer=new Pool({connectionString:urls[1],max:1,connectionTimeoutMillis:8000,query_timeout:20000});
  try{
   const runner=await import(pathToFileURL(resolve(realpathSync(process.cwd()),"server/lib/disruption/phase7ExpiryRunner_v39.ts")).href);
   const v=await runner.readP7ExpiryStatus(reader);
   need(v.liveLinks===0&&v.dueLinks===0&&v.dueBundles===0&&v.dueFragments===0&&v.liveLinksOnDueFragments===0,"UNEXPECTED_RESEARCH_ROWS");
   const w=await writer.connect();try{
    await w.query("BEGIN");const x=(await w.query("SELECT current_user actor,session_user login, current_setting('transaction_read_only') ro")).rows[0];
    need(x.actor===EXPIRY_ROLES[1]&&x.login===x.actor&&x.ro==="off","WRITER_AUTHENTICATION");
    await w.query("ROLLBACK");
   }finally{await w.query("ROLLBACK").catch(()=>{});w.release()}
   const oc=await pool.connect();try{await oc.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await inspectDisabled(oc,false);await expiryCatalog(oc,true);await oc.query("ROLLBACK");}finally{await oc.query("ROLLBACK").catch(()=>{});oc.release()}
  }finally{await Promise.allSettled([reader.end(),writer.end()])}
  need(api("git/ref/heads/main").object.sha===BASE&&api("pulls/925").head.sha===EXPIRY_REVIEW_HEAD,"POSTCOMMIT_DRIFT");
  expiryUnconfigured();
  // Secrets are uploaded through stdin to the existing authorized repo;
  // no credentials in argv, Git, logs, output or chat.
  for(let i=0;i<2;i++){
   const result=spawnSync("gh",["secret","set",EXPIRY_SECRETS[i],"-R",REPO],{input:urls[i],stdio:["pipe","pipe","pipe"],timeout:30000});
   need(!result.error&&result.status===0,"SECRET_UPLOAD_UNKNOWN_NO_REPLAY");
  }
  const names=pages("actions/secrets","secrets"),vars=pages("actions/variables","variables");
  need(EXPIRY_SECRETS.every(n=>names.filter(x=>x.name===n).length===1)&&vars.every(x=>!["P7_EXPIRY_ENABLED","P7_EXPIRY_APPROVAL","P7_EXPIRY_APPROVED_MAIN_SHA"].includes(x.name)),"SECRET_METADATA_OR_STOP_DRIFT");
  checkStop(names,vars);
  rmSync(dir,{recursive:true,force:true});
  console.log(JSON.stringify({status:"P7_TWO_FUNCTION_ONLY_EXPIRY_LOGINS_AND_SECRETS_COMMISSIONED_NO_GO",loginRolesActivated:2,readerAuthenticated:true,writerAuthenticated:true,secretMetadataReadback:2,scopeVerified:true,scheduledApplyEnabled:false,providerCalls:0,phase6PaidGo:false}));
 }catch(e){
  console.error(JSON.stringify({status:"P7_EXPIRY_COMMISSION_PARTIAL_INSPECT_NO_REPLAY",databaseCommitAttempted:commit,databaseCommitAcknowledged:ack,recoveryDirectory:dir,providerCalls:0,phase6PaidGo:false}));throw e;
 }
}
async function main(){
 const [mode]=process.argv.slice(2);
 need(process.argv.length===3&&["--inspect","--install-inert","--commission-expiry"].includes(mode),"MODE");
 need(mode!=="--commission-expiry"||process.env.P7_OWNER_EXPIRY_APPROVAL==="COMMISSION_TWO_EXISTING_EXPIRY_ACTORS_NO_PAID_NO_SCHEDULE","OWNER_EXPLICIT_EXPIRY_APPROVAL");
 need(mode!=="--install-inert"||process.env.P7_OWNER_INERT_SCHEMA_APPROVAL==="INSTALL_EXACT_INERT_SCHEMA_AND_NOLOGIN_ROLES_NO_PAID","OWNER_EXPLICIT_INERT_APPROVAL");
 const u=verifyOwnerScope(mode==="--commission-expiry"),root=realpathSync(process.cwd());
 const {Pool,installP7InertStorage,inspectP7InertStorage}=await loadExactInertImplementation(root);
 const pool=new Pool({connectionString:u,max:2,connectionTimeoutMillis:8000,query_timeout:35000,application_name:"phase7_detached_inert_only"});
 try{
  if(mode==="--commission-expiry"){await commissionExpiryOnly(pool,u,inspectP7InertStorage);return;}
  const probe=await pool.connect();let state,present;
  try{await probe.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");state=await inspectDisabled(probe,false);present=(await probe.query("SELECT to_regnamespace('phase7_private') IS NOT NULL present")).rows[0].present;await probe.query("ROLLBACK");}finally{await probe.query("ROLLBACK").catch(()=>{});probe.release()}
  if(present){
   const v=await inspectP7InertStorage(pool);
   console.log(JSON.stringify({...state,...v,status:"P7_EXISTING_INERT_STORAGE_MATCH_NO_REPLAY"}));return;
  }
  if(mode==="--inspect"){console.log(JSON.stringify({...state,status:"P7_SCHEMA_ABSENT_EXACT_STOP_PRECHECK_NO_GO",providerCalls:0,databaseWrites:0,phase6PaidGo:false}));return;}
  const before=await installP7InertStorage(pool,async c=>{
   // Recheck the immutable head and STOP before both the first DDL and commit.
   need(api("git/ref/heads/main").object.sha===BASE&&api("pulls/925").head.sha===HEAD,"CHECKOUT_SCOPE_CHANGED");
   checkStop(pages("actions/secrets","secrets"),pages("actions/variables","variables"));
   await inspectDisabled(c,true);
  });
  console.log(JSON.stringify(before));
  console.log(JSON.stringify(await inspectP7InertStorage(pool)));
 }finally{await pool.end();}
}
export const P7_DETACHED_PINS=Object.freeze({REPO,BASE,HEAD,RUN_IDS,STOP_AT,STOP,MODES});
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_[A-Z0-9_]+$/.test(m)?m:"HOLD_P7_DETACHED_INERT_REDACTED_INSPECT_NO_REPLAY");process.exitCode=2;});
