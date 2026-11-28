#!/usr/bin/env node
/** S010: exact additive V0115 reader only. Reuse the existing production
 * owner and POST scoped login. No roles, passwords, data, policies, expiry
 * changes, provider access or route activation. Reconcile catalog on a
 * fresh connection; never repair a partially installed function blindly. */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
export const V0115_PATH="migrations/staged/V0115__phase5b_conditional_t6_scoped_packet_b_read_v39.sql";
export const NATIVE_PATH="data-collection/phase5/review-tools/p7_pre_fragment_storage_candidate_NOT_FOR_INSTALL.sql";
const SELF="scripts/v39_phase5b_v0115_owner_once_v39.mjs";
const V0115_BLOB="8216a3e3dc4667cfa13739d58bcb4ed1202508fa",NATIVE_BLOB="8d202ec52729100343f721da66a46a761e1a0101";
const OWNER="neondb_owner",READER="phase7_post_scoped_prod20261120";
const NATIVE="phase7_private.read_bound_pre_group_v39(text,bigint,text,text,integer,text,text)";
const CONDITIONAL="phase7_private.read_bound_conditional_t6_group_v39(text,bigint,text,text,integer,text,text,text)";
const RESULT="TABLE(group_id uuid, contract_sha256 text, profile_sha256 text, packet_sha256 text, packet_bytes bytea)";
const repo="HKcode22/ReplitTranvr",relay="2d96b22345908aa4334335aa899aec71b2fec2cb",parent="f441a5e6cde2a6bf8d3ca4be6b5b3219aa1c04fe";
const pauseBlob="c47c4d688d746f3e7c8f3119d3eb9068c3840c30";
const need=(x,code)=>{if(!x)throw Error("HOLD_P5B_V0115_"+code);};
const blob=b=>createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
function pinned(bytes,nativeBytes){
 need(Buffer.isBuffer(bytes)&&Buffer.isBuffer(nativeBytes)&&blob(bytes)===V0115_BLOB&&blob(nativeBytes)===NATIVE_BLOB,"EXACT_SQL_BLOBS");
 const body=b=>{const a=b.toString("utf8").split("$read$");need(a.length===3&&a[1].length>100,"REVIEWED_FUNCTION_BODY");return a[1];};
 return {sql:bytes.toString("utf8"),nativeBody:body(nativeBytes),conditionalBody:body(bytes)};
}
const contextSQL=`SELECT current_database() db,current_user actor,session_user login,
 current_setting('server_version_num')::int version,pg_is_in_recovery() replica,
 current_setting('transaction_read_only') ro,owner.rolsuper owner_super,
 pg_get_userbyid(n.nspowner) schema_owner,r.rolcanlogin reader_login,r.rolsuper,r.rolcreaterole,r.rolcreatedb,
 r.rolreplication,r.rolbypassrls,r.rolinherit,
 EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) reader_member,
 EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles member ON member.oid=m.member JOIN pg_roles grantor ON grantor.oid=m.grantor
 WHERE m.roleid=r.oid AND NOT(member.rolname=$1 AND grantor.rolsuper AND m.admin_option AND NOT m.inherit_option AND NOT m.set_option)) unexpected_member,
 has_schema_privilege(r.oid,n.oid,'USAGE') can_use,has_schema_privilege(r.oid,n.oid,'CREATE') can_create,
 (SELECT count(*)::int FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE (ns.nspname||'.'||c.relname)=ANY(ARRAY['phase7_private.pre_fragment_v39','phase7_private.pre_source_link_v39','phase7_private.pre_preservation_policy_v39','phase7_private.derived_release_bundle_v39','clean.flight_snapshots','clean.flight_population','clean.fids_query_response','clean.phase5_fids_original_binding_v39','clean.phase5_fids_allowed_query_v39'])) relation_count,
 (SELECT count(*)::int FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname IN ('phase7_private','phase6_private','clean','public') AND c.relkind IN ('r','p','v','m','f')
 AND (has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(r.oid,c.oid,'DELETE,TRUNCATE,TRIGGER'))) direct_access
 FROM pg_roles r,pg_roles owner,pg_namespace n
 WHERE r.rolname=$2 AND owner.rolname=current_user AND n.nspname='phase7_private'`;
const functionSQL=`SELECT pg_get_userbyid(p.proowner) owner,p.prosecdef definer,p.provolatile volatility,p.proretset retset,
 l.lanname language,p.proconfig config,p.prosrc body,pg_get_function_result(p.oid) result,
 (SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.grantor)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a) acl,
 has_function_privilege($2,p.oid,'EXECUTE') can_execute
 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=to_regprocedure($1)`;
async function catalog(c,p,ro){
 const a=await c.query(contextSQL,[OWNER,READER]),x=a.rows[0];
 need(a.rowCount===1&&x.db==="neondb"&&x.actor===OWNER&&x.login===OWNER&&x.schema_owner===OWNER&&x.owner_super===false&&x.version>=160000&&x.version<170000&&x.replica===false&&x.ro===ro,"EXACT_NONSUPERUSER_OWNER_PG16");
 need(x.reader_login===true&&x.can_use===true&&x.relation_count===9&&x.direct_access===0&&["rolsuper","rolcreaterole","rolcreatedb","rolreplication","rolbypassrls","rolinherit","reader_member","unexpected_member","can_create"].every(k=>x[k]===false),"EXISTING_SCOPED_READER_BOUNDARY");
 const inspect=async(sig,body,required)=>{
  const q=await c.query(functionSQL,[sig,READER]);
  if(q.rowCount===0&&!required)return null;
  const z=q.rows[0];need(q.rowCount===1&&z.owner===OWNER&&z.definer===true&&z.volatility==="v"&&z.retset===true&&z.language==="plpgsql"&&JSON.stringify(z.config)===JSON.stringify(["search_path=pg_catalog, pg_temp"])&&z.result===RESULT&&z.body===body&&z.can_execute===true,"EXACT_FUNCTION_BODY_OR_ROLE_DRIFT");
  need(Array.isArray(z.acl)&&z.acl.length===2&&[OWNER,READER].every(role=>z.acl.filter(v=>v.grantee===role&&v.grantor===OWNER&&v.privilege==="EXECUTE"&&(role===OWNER||v.grantable===false)).length===1),"EXACT_FUNCTION_ACL");
  return z;
 };
 await inspect(NATIVE,p.nativeBody,true);
 return await inspect(CONDITIONAL,p.conditionalBody,false)?"V0115_INSTALLED_EXACT_NO_GO":"V0115_ABSENT_EXACT_NATIVE_AND_READER_NO_GO";
}
async function close(c){await c.end();}
async function read(open,p){
 const c=await open();let attempted=false;
 try{await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='12000ms'; SET LOCAL lock_timeout='2000ms'");
  const state=await catalog(c,p,"on");attempted=true;await c.query("ROLLBACK");return state;
 }finally{if(!attempted)await c.query("ROLLBACK").catch(()=>{});await close(c);}
}
const receipt=(state,installed)=>({status:state,schemaInstalled:installed,existingNativeReaderPreserved:true,existingScopedReaderOnly:true,
 providerCalls:0,studyDataWrites:0,roleCreations:0,credentialChanges:0,policyChanges:0,phase6PaidGo:false,postIssuerCommissioned:false});
export async function inspectV0115({open,bytes,nativeBytes}){return receipt(await read(open,pinned(bytes,nativeBytes)),false);}
export async function installV0115Once({open,bytes,nativeBytes,assertPinned=async()=>{}}){
 const p=pinned(bytes,nativeBytes);await assertPinned();
 const before=await read(open,p);
 if(before==="V0115_INSTALLED_EXACT_NO_GO")return {...receipt(before,false),alreadyInstalledNoReplay:true};
 const c=await open();let commitAttempted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  await c.query("SET LOCAL statement_timeout='30000ms'; SET LOCAL lock_timeout='2000ms'");
  const lock=await c.query("SELECT pg_try_advisory_xact_lock(hashtext('v39-phase6-provider-mutation')::bigint) ok");
  need(lock.rowCount===1&&lock.rows[0].ok===true,"PROVIDER_MUTATION_FENCE");
  need(await catalog(c,p,"off")==="V0115_ABSENT_EXACT_NATIVE_AND_READER_NO_GO","CATALOG_CHANGED_NO_REPLAY");
  await c.query(p.sql);
  await c.query("GRANT EXECUTE ON FUNCTION "+CONDITIONAL+" TO "+READER);
  need(await catalog(c,p,"off")==="V0115_INSTALLED_EXACT_NO_GO","INSTALL_READBACK");
  await assertPinned();commitAttempted=true;await c.query("COMMIT");
 }catch(e){if(commitAttempted)need(false,"COMMIT_UNKNOWN_READONLY_RECONCILE");await c.query("ROLLBACK").catch(()=>{});throw e;}
 finally{await close(c);}
 need(await read(open,p)==="V0115_INSTALLED_EXACT_NO_GO","FRESH_READBACK_FAILED_NO_REPLAY");
 return {...receipt("V0115_INSTALLED_EXACT_NO_GO",true),alreadyInstalledNoReplay:false};
}
const G=/^[a-f0-9]{40}$/;
function gh(args){return execFileSync("gh",args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:30000,maxBuffer:4*1024*1024}).trim();}
const api=p=>JSON.parse(gh(["api","repos/"+repo+p]));
async function cli(){
 const [mode,main,reviewedHelperHead,pauseFile,...extra]=process.argv.slice(2);
 need(["INVENTORY_V0115_READONLY","INSTALL_V0115_ONCE"].includes(mode)&&G.test(main??"")&&G.test(reviewedHelperHead??"")&&typeof pauseFile==="string"&&extra.length===0&&process.env.GITHUB_ACTIONS!=="true","EXACT_OWNER_MODE");
 need(process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","V39_DATABASE_RUNTIME_URL"].every(k=>!process.env[k]),"STOP_NO_PROVIDER_ENV");
 need(typeof process.env.DATABASE_URL==="string","EXISTING_OWNER_URL");
 const u=new URL(process.env.DATABASE_URL);
 need(["postgres:","postgresql:"].includes(u.protocol)&&decodeURIComponent(u.username)===OWNER&&u.password&&u.hostname.endsWith(".neon.tech")&&u.pathname==="/neondb"&&!u.hash&&["","5432"].includes(u.port)&&u.searchParams.getAll("sslmode").length===1&&["require","verify-full"].includes(u.searchParams.get("sslmode")),"EXISTING_TLS_OWNER");
 u.searchParams.set("sslmode","verify-full");
 const bytes=readFileSync(V0115_PATH),nativeBytes=readFileSync(NATIVE_PATH),self=readFileSync(fileURLToPath(import.meta.url));
 pinned(bytes,nativeBytes);need(blob(readFileSync(pauseFile))===pauseBlob,"PAUSE_BLOB");
 const guard=async()=>{
  need(gh(["api","user","--jq",".login"])==="HKcode22"&&api("/git/ref/heads/main").object.sha===main,"MAIN_OR_OWNER_DRIFT");
  // V0115 must not be installed under #984: its writer-role check
  // would reject the eighth function and strand all new PRE.
  const pr=api("/pulls/985");
  need(pr.merged===true&&pr.merge_commit_sha===main&&pr.head.sha===reviewedHelperHead&&
    api("/compare/"+parent+"..."+main).status==="ahead"&&api("/git/commits/"+main).tree.sha===api("/git/commits/"+reviewedHelperHead).tree.sha,"EXACT_MERGED_985_REQUIRED");
  need(api("/contents/"+V0115_PATH+"?ref="+main).sha===V0115_BLOB&&api("/contents/"+NATIVE_PATH+"?ref="+main).sha===NATIVE_BLOB&&api("/contents/"+SELF+"?ref="+reviewedHelperHead).sha===blob(self),"EXACT_REVIEWED_EXECUTABLE");
  const runs=api("/actions/runs?head_sha="+reviewedHelperHead+"&event=pull_request&per_page=100");
  need(Number.isSafeInteger(runs.total_count)&&runs.total_count>=29&&runs.total_count<=100&&runs.workflow_runs.length===runs.total_count&&runs.workflow_runs.every(r=>r.head_sha===reviewedHelperHead&&r.event==="pull_request"&&r.run_attempt===1&&r.status==="completed"&&r.conclusion==="success")&&["phase5-v0091-source-bound-registration-disposable-pg16.yml","phase5b-source-diagnostics-offline.yml","v39-phase0-offline.yml","phase5-reviewed-replit-callback-only-build-no-provider.yml"].every(f=>runs.workflow_runs.some(r=>r.path===".github/workflows/"+f)),"EXACT_HELPER_CI");
  const v=JSON.parse(execFileSync("bash",[pauseFile,"VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION",main,relay],{encoding:"utf8",timeout:90000,stdio:["ignore","pipe","ignore"]}));
  const age=Date.now()-Date.parse(v.observedAtUtc);
  need(v.status==="PAUSED_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_VERIFIED_READONLY"&&v.targetMainSha===main&&v.relayMainSha===relay&&v.existingProtectedOverridesVerified===true&&v.retentionAndRuntimePinsPreserved===true&&v.runtimePinConvergenceCertified===true&&v.drainState==="QUIESCENT"&&Array.isArray(v.activeAfter)&&v.activeAfter.length===0&&v.phase6PaidGo===false&&v.automaticResume===false&&v.githubVariableWritesAttempted===0&&v.githubVariableWritesConfirmed===0&&v.providerCalls===0&&v.databaseWrites===0&&age>=0&&age<=60000,"PAUSE_READBACK");
 };
 const {Client}=createRequire(resolve(process.cwd(),"package.json"))("pg");
 const open=async()=>{const c=new Client({connectionString:u.toString(),application_name:"p5b-v0115-owner-once",connectionTimeoutMillis:8000,query_timeout:35000});await c.connect();return c;};
 await guard();
 const args={open,bytes,nativeBytes,assertPinned:guard};
 const out=mode==="INSTALL_V0115_ONCE"?await installV0115Once(args):await inspectV0115(args);
 console.log(JSON.stringify({...out,mode,reviewedMain:main,reviewedHelperHead}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(e=>{console.error(/^HOLD_P5B_V0115_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P5B_V0115_OWNER_OPERATION_UNVERIFIED_INSPECT_NO_REPLAY");process.exitCode=2;});
