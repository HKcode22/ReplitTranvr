#!/usr/bin/env node
/** I144/T140. Owner-only V0114 inventory / one-time install / reconciliation.
 * No provider, policy, queue-row, role-creation, route or retention mutation.
 * A lost COMMIT acknowledgement is reconciliation-only, never a DDL retry.
 * The exported CI API uses the same catalog and transaction checks as CLI.
 */
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync,openSync,closeSync,writeSync,fsyncSync,lstatSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";

export const PATH="migrations/staged/V0114__phase5b_conditional_witnessed_frozen_t_registration_v39.sql";
export const BLOB="221828ffe43ddcd626f35188e2ba9bc15e98e8b0";
export const READY_STATUS="V0114_ABSENT_PREREQUISITES_VERIFIED";
export const INSTALLED_STATUS="V0114_INSTALLED_EXACT";
// Exact source review complete; the CLI still requires successful native CI,
// the exact merged candidate, paused admissions and protected owner readback.
export const RELEASE_READY=true;
const SELF="scripts/v39_phase5b_v0114_owner_once_v39.mjs";
const OWNER="phase5_cd_source_registration_owner_v39",PREP="phase5_fids_prepare_prod_20261107";
const LOGIN="phase5_p30_prepare_login_20261107";
const TYPES="text,text,text,text,timestamptz,text,text,text,text,integer";
const SIGS=[`clean.phase5_cd_register_source_flight_v39(${TYPES})`,
 `clean.phase5_cd_ensure_exact_source_flight_v39(${TYPES})`,
 "clean.phase5_t24_witness_before_insert_v39()","clean.phase5_t24_witness_immutable_v39()",
 `clean.phase5_cd_register_source_flight_v39(${TYPES},jsonb)`,
 `clean.phase5_cd_ensure_exact_source_flight_v39(${TYPES},jsonb)`];
const OLD_HASHES=["70ad33929da9a97d30a4f88fa0283328c15bd03160bc560ffd3c4937f3de5cd7",
 "6779aba6f887a9137b6e0f1dce048048f98c1454b7f3badf4e1331b94a5e3057",
 "6ca4b9c0939dbbff56ff1a57a1a4a246dd7532dd75323d4c5955f8f0b13dee6c",
 "b085f669a28eff6b35f003c020a5453dc5aa8bde38d9565cbf126bb65de5ef02"];
const COLUMNS=["snapshot_id","flight_instance_id","population_query_id","fids_response_hash",
 "source_query_digest","rights_review_sha256","selected_t_native_utc","selected_t_version",
 "t24_cutoff_utc","frame_hash","config_hash","post_pre_commit_db_observed_at_utc"].sort();
const RELATIONS=["clean.phase5_fids_allowed_query_v39","clean.phase5_fids_physical_attempt_v39",
 "clean.phase5_fids_original_binding_v39","clean.fids_query_response","clean.flight_population",
 "clean.flight_snapshots","clean.phase5_cd_pre_task_v39","clean.phase5_cd_pre_task_v39_task_id_seq",
 "clean.phase5_t24_postcommit_witness_v39"];
const PAUSE="scripts/v39_phase5b_scientific_pause_owner.sh";
const PAUSE_BLOB="53d403000f7f199d1eecbcc6c84e5f1d3ffa7d26";
const RELAY="2d96b22345908aa4334335aa899aec71b2fec2cb";
// Same 29 mandatory workflow paths as the reviewed #981/#982 cutover guard.
// Every returned pull_request run must also succeed at its original attempt.
const CI_PATHS=["v39-phase0-offline.yml","phase5b-source-diagnostics-offline.yml",
 "phase5b-phase7-role-successor.yml","phase5b-runtime-successor-compatibility.yml",
 "phase5-one-signed-future-post-v0083-main-manual.yml","phase6-source-existing-p5-child-admission-offline-no-provider.yml",
 "phase5-source-upcoming-queue-main-scheduled-readonly.yml","phase5-public-frozen-private-flight-packet-leak-guard.yml",
 "phase5-actual-source-native-flight-candidates-readonly-manual.yml","phase2g-yssy-p25-published-identity-readonly.yml",
 "phase2g-yssy-p25-release-no-provider-ci.yml","phase2g-yssy-p25-release-postgres-ci.yml",
 "phase6-private-later-enrollment.yml","phase6-nonpaid-source-day-prepare-publish.yml",
 "phase5-github-fids-source-release-guard-offline.yml","phase5-cd-github-one-queued-t24-witness-main-manual.yml",
 "phase5-source-login-and-manual-owner-disposable-pg16.yml","phase5-v0080-github-runtime-prearm-real-pg16.yml",
 "phase5-amendment-c-segmented-day-stage6-stage8-offline.yml","phase3-gate4-owned-handoff-ci.yml",
 "phase5-v0082-atomic-segmented-day-pg16-no-provider.yml","phase5-stage9-v0079-db-prepare-offline.yml",
 "phase5-stage8-v0079-daily-prepare-proposals-offline.yml","phase5b-conditional-t24-witness-pg16.yml",
 "phase5-v0088-real-queue-stage14-disposable-pg16.yml","phase5-v0091-source-bound-registration-disposable-pg16.yml",
 "phase5-amendment-e-endpoint-evidence-review-offline.yml","phase6-admission-diagnostics-offline.yml",
 "phase5-reviewed-replit-callback-only-build-no-provider.yml"].map(p=>".github/workflows/"+p);
const PRIVATE=Symbol("catalog"),SHA=/^[a-f0-9]{64}$/,GIT=/^[a-f0-9]{40}$/;
const sha=b=>createHash("sha256").update(b).digest("hex");
const blob=b=>createHash("sha1").update(`blob ${b.length}\0`).update(b).digest("hex");
const stable=v=>JSON.stringify(v,(_,x)=>x&&typeof x==="object"&&!Array.isArray(x)
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const hold=code=>{const e=new Error("HOLD_P5B_V0114_"+code);e.v0114Hold=true;throw e;};
const need=(ok,code)=>{if(!ok)hold(code);};
const safeError=(e,fallback)=>e?.v0114Hold===true?e:new Error("HOLD_P5B_V0114_"+fallback);
const eq=(a,b)=>stable(a)===stable(b);
const list=v=>Array.isArray(v);
const object=v=>v!==null&&typeof v==="object"&&!list(v);

function pinned(bytes){
 need(Buffer.isBuffer(bytes)||bytes instanceof Uint8Array,"SQL_BYTES_REQUIRED");
 const b=Buffer.from(bytes),s=b.toString("utf8");
 need(blob(b)===BLOB&&Buffer.from(s,"utf8").equals(b),"SQL_BLOB_MISMATCH");
 need(s.startsWith("-- V0114 STAGED:")&&(s.match(/^BEGIN;$/gm)||[]).length===1
  &&(s.match(/^COMMIT;$/gm)||[]).length===1&&s.trimEnd().endsWith("COMMIT;"),"SQL_TRANSACTION_SHAPE");
 const bodies=["register_witnessed","ensure_witnessed"].map(tag=>{
  const parts=s.split("$"+tag+"$");need(parts.length===3&&parts[1].length>100,"SQL_BODY_TAGS");return parts[1];
 });
 return {body:s.replace(/^BEGIN;$/m,"").replace(/^COMMIT;$/m,""),hashes:[...OLD_HASHES,...bodies.map(sha)]};
}

// Catalog queries deliberately return no provider Contents, source rows or URLs.
const CONTEXT_SQL=`/* V0114_CONTEXT */
 SELECT current_database() database,current_user actor,session_user login,
 current_setting('server_version_num')::int version,pg_is_in_recovery() replica,
 r.rolsuper actor_super,r.rolcreaterole actor_createrole,
 pg_get_userbyid(n.nspowner) schema_owner,pg_get_userbyid(c.relowner) queue_owner,
 pg_has_role(current_user,$1,'SET') owner_set,
 has_schema_privilege($1,'clean','CREATE') owner_create,
 has_table_privilege($1,'clean.phase5_t24_postcommit_witness_v39','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') owner_table_access,
 has_any_column_privilege($1,'clean.phase5_t24_postcommit_witness_v39','INSERT,UPDATE,REFERENCES') owner_column_write,
 has_any_column_privilege($2,'clean.phase5_t24_postcommit_witness_v39','SELECT,INSERT,UPDATE,REFERENCES') prepare_column_access,
 has_any_column_privilege($3,'clean.phase5_t24_postcommit_witness_v39','SELECT,INSERT,UPDATE,REFERENCES') login_column_access,
 (SELECT count(*)::int FROM pg_proc p WHERE p.pronamespace=n.oid AND p.proname IN
  ('phase5_cd_register_source_flight_v39','phase5_cd_ensure_exact_source_flight_v39')) overload_count
 FROM pg_roles r CROSS JOIN pg_namespace n CROSS JOIN pg_class c
 WHERE r.rolname=current_user AND n.nspname='clean' AND c.oid='clean.phase5_cd_pre_task_v39'::regclass`;
const ROUTINES_SQL=`/* V0114_ROUTINES */
 SELECT q.slot::int,p.oid::text,pg_get_userbyid(p.proowner) owner,p.prosecdef definer,
 p.proconfig config,p.prokind kind,l.lanname language,p.proretset returns_set,
 p.prorettype::regtype::text return_type,encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') body_sha256,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
  'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
  ORDER BY a.grantee,a.grantor,a.privilege_type,a.is_grantable)
  FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb) acl
 FROM unnest($1::text[]) WITH ORDINALITY q(signature,slot)
 JOIN pg_proc p ON p.oid=to_regprocedure(q.signature) JOIN pg_language l ON l.oid=p.prolang ORDER BY q.slot`;
const METADATA_SQL=`/* V0114_METADATA */
 SELECT jsonb_build_object(
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'login',rolcanlogin,'inherit',rolinherit,
   'super',rolsuper,'createdb',rolcreatedb,'createrole',rolcreaterole,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
   FROM pg_roles WHERE rolname=ANY(ARRAY[$1,$2,$3,current_user]::text[])),
 'memberships',COALESCE((SELECT jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),
   'grantor',pg_get_userbyid(grantor),'admin',admin_option,'inherit',inherit_option,'set',set_option) ORDER BY roleid,member,grantor)
   FROM pg_auth_members WHERE roleid=$1::regrole OR member=$1::regrole),'[]'::jsonb),
 'schemaAcl',(SELECT COALESCE(jsonb_agg(jsonb_build_object('grantee',a.grantee::text,'grantor',a.grantor::text,
   'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.grantor,a.privilege_type,a.is_grantable),'[]'::jsonb)
   FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='clean'),
 'relations',(SELECT jsonb_agg(jsonb_build_object('name',q.name,'oid',c.oid::text,'owner',pg_get_userbyid(c.relowner),
   'acl',COALESCE((SELECT jsonb_agg(jsonb_build_object('grantee',a.grantee::text,'grantor',a.grantor::text,
    'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.grantor,a.privilege_type,a.is_grantable)
    FROM aclexplode(COALESCE(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,c.relowner))) a),'[]'::jsonb)) ORDER BY q.name)
   FROM unnest($4::text[]) q(name) JOIN pg_class c ON c.oid=to_regclass(q.name)),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('name',t.tgname,'oid',t.oid::text,'function_oid',t.tgfoid::text,
   'enabled',t.tgenabled,'type',t.tgtype::int,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname)
   FROM pg_trigger t WHERE t.tgrelid='clean.phase5_t24_postcommit_witness_v39'::regclass AND NOT t.tgisinternal),
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',t.attname,
   'owner_select',has_column_privilege($1,t.attrelid,t.attnum,'SELECT'),
   'owner_grantable',has_column_privilege($1,t.attrelid,t.attnum,'SELECT WITH GRANT OPTION'),
   'acl',COALESCE((SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
    ORDER BY a.grantee,a.grantor,a.privilege_type,a.is_grantable) FROM aclexplode(t.attacl) a),'[]'::jsonb)) ORDER BY t.attname)
   FROM pg_attribute t WHERE t.attrelid='clean.phase5_t24_postcommit_witness_v39'::regclass AND t.attnum>0 AND NOT t.attisdropped)
 ) metadata`;
const QUEUE_SQL=`/* V0114_QUEUE */
 SELECT count(*)::text rows,count(*) FILTER (WHERE state IS NULL OR state NOT IN ('VERIFIED_ON_TIME','MISSED'))::text unsettled,
 encode(sha256(convert_to(COALESCE(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex'),'' ORDER BY task_id),''),'UTF8')),'hex') fingerprint
 FROM clean.phase5_cd_pre_task_v39 t`;
async function one(client,sql,params=[]){const r=await client.query(sql,params);need(list(r?.rows)&&r.rows.length===1,"CATALOG_ROW_SHAPE");return r.rows[0];}
async function catalog(client){
 const context=await one(client,CONTEXT_SQL,[OWNER,PREP,LOGIN]);
 const routines=(await client.query(ROUTINES_SQL,[SIGS])).rows;
 const {metadata}=await one(client,METADATA_SQL,[OWNER,PREP,LOGIN,RELATIONS]);
 const queue=await one(client,QUEUE_SQL);
 return {context,routines,metadata,queue};
}
function aclExact(r){
 need(list(r.acl)&&r.acl.length===2,"FUNCTION_ACL");
 for(const name of [OWNER,PREP]){
  const a=r.acl.filter(x=>object(x)&&x.grantee===name);
  need(a.length===1&&a[0].grantor===OWNER&&a[0].privilege==="EXECUTE"
   &&typeof a[0].grantable==="boolean"&&(name===OWNER||a[0].grantable===false),"FUNCTION_ACL");
 }
}
function validate(c,contract,ci){
 need(object(c.context)&&list(c.routines)&&object(c.metadata)&&object(c.queue),"CATALOG_SHAPE");
 const x=c.context,m=c.metadata,actor=ci?"phase5_cd_ci_owner":"neondb_owner";
 need(x.database==="neondb"&&x.actor===actor&&x.login===actor&&Number.isInteger(x.version)
  &&x.version>=160000&&x.version<170000&&x.replica===false&&x.actor_super===false
  &&x.schema_owner===actor&&x.queue_owner===actor,"REAL_NON_SUPERUSER_PG16_OWNER_REQUIRED");
 for(const k of ["owner_set","owner_create","owner_table_access","owner_column_write","prepare_column_access","login_column_access"])
  need(x[k]===false,"ROLE_OR_WITNESS_PRIVILEGE_DRIFT");
 need(list(m.roles)&&m.roles.length===4&&list(m.memberships)&&list(m.schemaAcl)&&list(m.relations)
  &&m.relations.length===RELATIONS.length&&list(m.triggers)&&list(m.columns),"METADATA_SHAPE");
 need(eq(m.relations.map(r=>r.name).sort(),[...RELATIONS].sort()),"RELATION_DRIFT");
 const o=m.roles.filter(r=>r.name===OWNER);
 need(o.length===1&&["login","inherit","super","createdb","createrole","replication","bypassrls"].every(k=>o[0][k]===false),"NOLOGIN_OWNER_DRIFT");
 need(m.roles.filter(r=>r.name===PREP&&r.login===false&&r.super===false).length===1
  &&m.roles.filter(r=>r.name===LOGIN&&r.login===true&&r.super===false).length===1,"PREPARE_ROLE_DRIFT");
 need(c.routines.length===4||c.routines.length===6,"PARTIAL_OR_UNKNOWN_FUNCTION_SET");
 const installed=c.routines.length===6;
 need(x.overload_count===(installed?4:2),"UNEXPECTED_OVERLOAD");
 need(eq(c.routines.map(r=>r.slot),installed?[1,2,3,4,5,6]:[1,2,3,4]),"FUNCTION_SET_DRIFT");
 for(const r of c.routines){
  need(typeof r.oid==="string"&&/^[1-9][0-9]*$/.test(r.oid)&&r.body_sha256===contract.hashes[r.slot-1]
   &&r.kind==="f"&&r.language==="plpgsql","FUNCTION_BODY_OR_KIND_DRIFT");
  if([1,2,5,6].includes(r.slot)){
   need(r.owner===OWNER&&r.definer===true&&list(r.config)&&r.config.length===1
    &&r.config[0].replaceAll(" ","")==="search_path=pg_catalog,pg_temp"
    &&r.returns_set===[2,6].includes(r.slot)&&r.return_type===([2,6].includes(r.slot)?"record":"bigint"),"FUNCTION_SECURITY_DRIFT");
   aclExact(r);
  }else need(r.definer===false&&r.returns_set===false&&r.return_type==="trigger"&&list(r.acl),"TRIGGER_FUNCTION_DRIFT");
 }
 for(const [name,slot,type] of [["p5_t24_witness_before_insert_v39",3,7],["p5_t24_witness_no_rewrite_v39",4,27]]){
  const t=m.triggers.filter(t=>t.name===name);
  need(t.length===1&&t[0].enabled==="O"&&t[0].function_oid===c.routines[slot-1].oid&&t[0].type===type,"WITNESS_TRIGGER_DRIFT");
 }
 need(m.columns.every(t=>object(t)&&typeof t.name==="string"&&typeof t.owner_select==="boolean"
  &&t.owner_grantable===false&&list(t.acl)),"WITNESS_COLUMN_METADATA");
 need(eq(m.columns.filter(t=>t.owner_select).map(t=>t.name).sort(),installed?COLUMNS:[]),"WITNESS_COLUMN_SCOPE_DRIFT");
 for(const t of m.columns){
  const a=t.acl.filter(a=>a.grantee===OWNER);
  need(a.length===(installed&&COLUMNS.includes(t.name)?1:0),"WITNESS_COLUMN_ACL_DRIFT");
  if(a.length)need(a[0].privilege==="SELECT"&&a[0].grantable===false,"WITNESS_COLUMN_ACL_DRIFT");
 }
 need(typeof c.queue.rows==="string"&&/^(0|[1-9][0-9]*)$/.test(c.queue.rows)
  &&c.queue.unsettled==="0"&&SHA.test(c.queue.fingerprint),"UNSETTLED_TASKS_OR_QUEUE_UNVERIFIED");
 return installed?INSTALLED_STATUS:READY_STATUS;
}
function preservation(c){
 const m=c.metadata;
 return sha(stable({context:{...c.context,overload_count:0},oldRoutines:c.routines.filter(r=>r.slot<=4),
  metadata:{...m,columns:m.columns.map(t=>({name:t.name,acl:t.acl.filter(a=>a.grantee!==OWNER)}))}}));
}
function receipt(c,state){
 const r={schema:"v39.phase5b.v0114-owner-receipt.v1",state,status:state,sqlBlob:BLOB,
  exactPredecessorBodiesVerified:true,existingOwnerNonSuperuserVerified:true,
  newWitnessOverloadsInstalled:state===INSTALLED_STATUS,unsettledTasksObserved:0,
  witnessReadScope:state===INSTALLED_STATUS?"EXACT_TWELVE_EXISTING_OWNER_COLUMNS":"NONE_FOR_REGISTRATION_OWNER",
  databaseScope:"EXISTING_SUPPLIED_OWNER_DATABASE_CONNECTION",providerCalls:0,policyChanges:0,
  queueRowWrites:0,roleCreations:0,routeChanges:0,phase6PaidGo:false};
 Object.defineProperty(r,PRIVATE,{value:{catalog:c,preservation:preservation(c)}});return r;
}
async function rollback(client){try{await client.query("ROLLBACK");return true;}catch{return false;}}
async function close(client){try{await client?.end();}catch{/* Never reuse a closed/uncertain session. */}}

/** Owns its read-only transaction; caller supplies a connected owner client. */
export async function inspectV0114(client,bytes,{ci=false}={}){
 need(typeof ci==="boolean","EXPLICIT_CI_BOOLEAN_REQUIRED");
 const contract=pinned(bytes);let begun=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");begun=true;
  await client.query("SET LOCAL TIME ZONE 'UTC'; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'");
  const c=await catalog(client),state=validate(c,contract,ci);
  need(await rollback(client),"READONLY_ROLLBACK_UNACKNOWLEDGED");begun=false;
  return receipt(c,state);
 }catch(e){if(begun)await rollback(client);throw safeError(e,"READONLY_INSPECTION_UNAVAILABLE");}
}
function memoryJournal(){let last=null;return {async read(){return last;},async append(x){last=x;}};}
function checkJournal(record){
 need(record===null||(object(record)&&record.schema==="v39.phase5b.v0114-attempt.v1"&&record.sqlBlob===BLOB
  &&["DDL_ATTEMPT_STARTED","COMMIT_ATTEMPTED","COMMIT_ACKNOWLEDGED","READBACK_VERIFIED","ROLLBACK_ACKNOWLEDGED","OUTCOME_UNKNOWN"].includes(record.event)
  &&typeof record.atUtc==="string"&&SHA.test(record.beforeFingerprint)&&SHA.test(record.queueFingerprint)),"JOURNAL_SCOPE_OR_SHAPE");
}
function comparePrior(r,record){
 if(record)need(r[PRIVATE].preservation===record.beforeFingerprint&&r[PRIVATE].catalog.queue.fingerprint===record.queueFingerprint,"PRIOR_ATTEMPT_READBACK_DRIFT");
}
/** open() returns a new connected client on every call. No connection is reused.
 * Non-CI assertPinned must freshly verify exact main + paused runtime/quiet state.
 * Non-CI journal is durable, private, append-only; creation must be exclusive.
 */
export async function installV0114Once({open,bytes,assertPinned,ci=false,journal}={}){
 const contract=pinned(bytes);
 need(typeof open==="function"&&typeof ci==="boolean","OPEN_REQUIRED");
 need(ci||typeof assertPinned==="function","LIVE_PIN_GUARD_REQUIRED");
 if(!journal&&ci)journal=memoryJournal();
 need(typeof journal?.read==="function"&&typeof journal?.append==="function","DURABLE_JOURNAL_REQUIRED");
 const seen=new Set();
 async function fresh(){let c;try{c=await open();}catch{hold("OWNER_CONNECTION_UNAVAILABLE");}
  need(c&&typeof c.query==="function"&&typeof c.end==="function"&&!seen.has(c),"FRESH_CONNECTION_REQUIRED");seen.add(c);return c;}
 async function pins(){try{await assertPinned?.();}catch(e){throw safeError(e,"EXACT_MAIN_OR_PAUSE_GUARD_FAILED");}}
 await pins();
 let record;try{record=await journal.read();}catch{hold("JOURNAL_READ_UNAVAILABLE");}checkJournal(record);
 let first,initial=await fresh();try{first=await inspectV0114(initial,bytes,{ci});}finally{await close(initial);}
 comparePrior(first,record);
 if(first.state===INSTALLED_STATUS)return {...first,alreadyInstalledNoReplay:true,ddlStatementsExecuted:false,
  independentReadback:true,priorAttemptReconciled:record!==null};
 need(record===null,"PRIOR_ATTEMPT_REQUIRES_READONLY_RECONCILIATION_NO_DDL");
 const before=first[PRIVATE],journalBase={schema:"v39.phase5b.v0114-attempt.v1",sqlBlob:BLOB,
  beforeFingerprint:before.preservation,queueFingerprint:before.catalog.queue.fingerprint};
 async function append(event){try{await journal.append({...journalBase,event,atUtc:new Date().toISOString()});}
  catch{hold("JOURNAL_WRITE_UNACKNOWLEDGED");}}
 // GitHub/database observations are necessarily non-atomic. Do the fresh
 // external guard immediately before connection/BEGIN, never under task lock.
 await pins();
 let client=await fresh(),begun=false,attempted=false,commitAttempted=false,commitAcknowledged=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");begun=true;
  await client.query("SET LOCAL TIME ZONE 'UTC'; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'; SET LOCAL idle_in_transaction_session_timeout='90s'");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('phase5-cd-schema-owner'),hashtext('v0114-witnessed-registration'))");
  // SHARE conflicts with ordinary INSERT/UPDATE/DELETE ROW EXCLUSIVE locks.
  // This protects the actual queue, not just cooperating installer processes.
  await client.query("LOCK TABLE clean.phase5_cd_pre_task_v39 IN SHARE MODE");
  const locked=await catalog(client);
  need(validate(locked,contract,ci)===READY_STATUS,"STATE_CHANGED_BEFORE_DDL");
  need(preservation(locked)===before.preservation&&eq(locked.queue,before.catalog.queue),"BASELINE_CHANGED_BEFORE_DDL");
  await append("DDL_ATTEMPT_STARTED");attempted=true;
  await client.query(contract.body);
  const after=await catalog(client);
  need(validate(after,contract,ci)===INSTALLED_STATUS,"TRANSACTION_READBACK_NOT_INSTALLED");
  need(preservation(after)===before.preservation&&eq(after.queue,locked.queue),"TRANSACTION_PRESERVATION_DRIFT");
  await append("COMMIT_ATTEMPTED");commitAttempted=true;
  await client.query("COMMIT");commitAcknowledged=true;begun=false;
  await append("COMMIT_ACKNOWLEDGED");
 }catch(e){
  if(commitAttempted&&!commitAcknowledged){
   try{await append("OUTCOME_UNKNOWN");}catch{/* Prior durable COMMIT marker remains. */}
   throw safeError(null,"COMMIT_OUTCOME_UNKNOWN_RECONCILE_ONLY_NO_RETRY");
  }
  if(commitAcknowledged)throw safeError(null,"COMMITTED_JOURNAL_UNAVAILABLE_RECONCILE_ONLY");
  const rolledBack=begun?await rollback(client):true;begun=false;
  if(attempted)try{await append(rolledBack?"ROLLBACK_ACKNOWLEDGED":"OUTCOME_UNKNOWN");}catch{/* Initial durable marker remains. */}
  if(!rolledBack)hold("ROLLBACK_OUTCOME_UNKNOWN_RECONCILE_ONLY_NO_RETRY");
  throw safeError(e,"INSTALL_ROLLED_BACK_NO_RETRY");
 }finally{await close(client);}
 // Separate connection and transaction: COMMIT ACK alone is never success.
 const independent=await fresh();let verified;
 try{verified=await inspectV0114(independent,bytes,{ci});}catch{hold("POSTCOMMIT_READBACK_UNAVAILABLE_RECONCILE_ONLY");}
 finally{await close(independent);}
 need(verified.state===INSTALLED_STATUS&&verified[PRIVATE].preservation===before.preservation
  &&eq(verified[PRIVATE].catalog.queue,before.catalog.queue),"POSTCOMMIT_READBACK_DRIFT_RECONCILE_ONLY");
 await append("READBACK_VERIFIED");
 return {...verified,alreadyInstalledNoReplay:false,ddlStatementsExecuted:true,independentReadback:true,
  originalFunctionsAndQueuePreserved:true,commitAcknowledged:true,priorAttemptReconciled:false};
}

function command(executable,args,maxBuffer=2*1024*1024){
 try{return execFileSync(executable,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:60000,maxBuffer});}
 catch{hold("LOCAL_OR_GITHUB_READBACK_UNAVAILABLE");}
}
function json(s){try{return JSON.parse(s);}catch{hold("AUTHENTIC_METADATA_UNPARSABLE");}}
function privateJournal(path,main){
 let owned=false;
 function entries(){
  let s;try{const st=lstatSync(path);need(st.isFile()&&!st.isSymbolicLink()&&(st.mode&0o077)===0&&st.size<=65536,"PRIVATE_JOURNAL_FILE_MODE");s=readFileSync(path,"utf8");}
  catch(e){if(e.code==="ENOENT")return [];throw safeError(e,"PRIVATE_JOURNAL_UNAVAILABLE");}
  need(s.endsWith("\n"),"TRUNCATED_JOURNAL_RECONCILE_ONLY");
  const rows=s.trimEnd().split("\n").map(json);need(rows.length>0,"EMPTY_EXISTING_JOURNAL_RECONCILE_ONLY");
  for(const r of rows){checkJournal(r);need(r.reviewedMain===main,"JOURNAL_MAIN_DRIFT");}return rows;
 }
 return {async read(){return entries().at(-1)??null;},async append(record){
  // If another process created the same file since read(), wx fails closed.
  let fd;try{const creating=!owned;fd=openSync(path,owned?"a":"wx",0o600);owned=true;
   const line=Buffer.from(JSON.stringify({...record,reviewedMain:main})+"\n");
   for(let offset=0;offset<line.length;){const written=writeSync(fd,line,offset,line.length-offset);need(written>0,"JOURNAL_SHORT_WRITE");offset+=written;}
   fsyncSync(fd);
   if(creating){const dir=openSync(dirname(path),"r");try{fsyncSync(dir);}finally{closeSync(dir);}}
  }finally{if(fd!==undefined)closeSync(fd);}
 }};
}
async function cli(){
 need(RELEASE_READY,"CLI_NOT_RELEASED_PENDING_EXACT_REVIEW_AND_NATIVE_CI");
 // Private fetched files may live below the existing project so pg resolves
 // from its unchanged dependencies. No checkout movement or local HEAD tie.
 const [mode,main,reviewedHead,sqlPath,pausePath,journalPath,...extra]=process.argv.slice(2);
 need(["INVENTORY_V0114_READONLY","RECONCILE_V0114_READONLY","INSTALL_V0114_ONCE"].includes(mode)
  &&typeof main==="string"&&GIT.test(main)&&typeof reviewedHead==="string"&&GIT.test(reviewedHead)
  &&typeof sqlPath==="string"&&typeof pausePath==="string"&&extra.length===0
  &&(mode==="INVENTORY_V0114_READONLY"?!journalPath:typeof journalPath==="string"),"EXACT_MODE_ARGUMENTS_REQUIRED");
 const bytes=readFileSync(sqlPath);pinned(bytes);
 const selfPath=fileURLToPath(import.meta.url),selfBlob=blob(readFileSync(selfPath));
 need(blob(readFileSync(pausePath))===PAUSE_BLOB,"PAUSE_HELPER_BLOB_DRIFT");
 const repo="repos/HKcode22/ReplitTranvr",get=path=>json(command("gh",["api",path]));
 const guard=async()=>{
  need(get("user").login==="HKcode22","GITHUB_OWNER_REQUIRED");
  need(get(repo+"/git/ref/heads/main").object?.sha===main,"REMOTE_MAIN_DRIFT");
  const pr=get(repo+"/pulls/982");
  need(pr.number===982&&pr.merged===true&&pr.state==="closed"&&pr.merge_commit_sha===main&&pr.head?.sha===reviewedHead
   &&pr.head?.repo?.full_name==="HKcode22/ReplitTranvr"
   &&pr.base?.ref==="main"&&pr.base?.repo?.full_name==="HKcode22/ReplitTranvr","EXACT_MERGED_PR982_REQUIRED");
  const merged=get(repo+"/git/commits/"+main),reviewed=get(repo+"/git/commits/"+reviewedHead);
  need(GIT.test(merged.tree?.sha??"")&&merged.tree.sha===reviewed.tree?.sha,"REVIEWED_MERGED_TREE_DRIFT");
  for(const [path,file,expected] of [[SELF,selfPath,selfBlob],[PATH,sqlPath,BLOB],[PAUSE,pausePath,PAUSE_BLOB]]){
   const remote=get(repo+"/contents/"+path+"?ref="+main);
   need(remote.type==="file"&&remote.path===path&&remote.sha===expected&&blob(readFileSync(file))===expected,"EXECUTED_REVIEWED_BLOB_DRIFT");
  }
  const ci=get(repo+"/actions/runs?head_sha="+reviewedHead+"&event=pull_request&per_page=100");
  need(Number.isInteger(ci.total_count)&&ci.total_count>=CI_PATHS.length&&ci.total_count<=100
   &&list(ci.workflow_runs)&&ci.workflow_runs.length===ci.total_count
   &&ci.workflow_runs.every(r=>r.head_sha===reviewedHead&&r.event==="pull_request"&&r.status==="completed"&&r.conclusion==="success"&&r.run_attempt===1)
   &&CI_PATHS.every(p=>ci.workflow_runs.some(r=>r.path===p))
   &&CI_PATHS.slice(23).every(p=>ci.workflow_runs.filter(r=>r.path===p).length===1),"EXACT_REQUIRED_CI_UNVERIFIED");
  const callback=ci.workflow_runs.find(r=>r.path===CI_PATHS.at(-1));
  need(Number.isSafeInteger(callback.id)&&callback.id>0,"CALLBACK_RUN_METADATA");
  const jobs=get(repo+"/actions/runs/"+callback.id+"/jobs?per_page=100"),j=jobs.jobs?.[0];
  need(jobs.total_count===1&&list(jobs.jobs)&&jobs.jobs.length===1&&j.run_id===callback.id&&j.head_sha===reviewedHead
   &&j.name==="verify-offline-reviewed-receiver-build"&&j.status==="completed"&&j.conclusion==="success"&&list(j.steps)
   &&[["Prove source-equivalent callback-only build and historical constraints","success"],
      ["Explicit worker-only callback admission or exact reviewed source","success"],
      ["Build reviewed callback-only binary without provider or production credentials","skipped"]]
     .every(([name,conclusion])=>{const s=j.steps.filter(s=>s.name===name);return s.length===1&&s[0].status==="completed"&&s[0].conclusion===conclusion;}),"CALLBACK_REFUSAL_UNVERIFIED");
  const r=json(command("bash",[resolve(pausePath),"VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION",main,RELAY]));
  const age=Date.now()-Date.parse(r.observedAtUtc);
  need(r.schema==="v39.phase5b.scientific-pause-receipt.v1"&&r.status==="PAUSED_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_VERIFIED_READONLY"
   &&r.targetMainSha===main&&r.relayMainSha===RELAY&&r.existingProtectedOverridesVerified===true
   &&r.retentionAndRuntimePinsPreserved===true&&r.runtimePinConvergenceCertified===true
   &&r.drainState==="QUIESCENT"&&list(r.activeAfter)&&r.activeAfter.length===0
   &&r.activeSnapshotConsistency==="SEQUENTIAL_NONATOMIC_STATUS_READS"&&r.snapshotOnly===true&&r.drainCompletionGuaranteed===false
   &&r.githubVariableWritesAttempted===0&&r.githubVariableWritesConfirmed===0&&r.githubDispatches===0&&r.cancelledRuns===0
   &&r.providerCalls===0&&r.databaseWrites===0&&r.policyBytesChanged===false&&r.phase6PaidGo===false
   &&Number.isFinite(age)&&age>=0&&age<=60000,"PAUSED_QUIET_RUNTIME_UNVERIFIED");
 };
 need(typeof process.env.DATABASE_URL==="string"&&process.env.DATABASE_URL.length>0,"EXISTING_OWNER_DATABASE_URL_REQUIRED");
 const {default:pg}=await import("pg");
 const open=async()=>{const c=new pg.Client({connectionString:process.env.DATABASE_URL,application_name:"p5b-v0114-owner-once",connectionTimeoutMillis:10000,query_timeout:45000});await c.connect();return c;};
 const journal=journalPath?privateJournal(resolve(journalPath),main):null;
 let result;
 if(mode==="INSTALL_V0114_ONCE")result=await installV0114Once({open,bytes,assertPinned:guard,journal});
 else{
  await guard();
  const c=await open();try{result=await inspectV0114(c,bytes);}finally{await close(c);}
  if(mode==="RECONCILE_V0114_READONLY"){
   const prior=await journal.read();need(prior!==null,"NO_PRIOR_ATTEMPT_TO_RECONCILE");checkJournal(prior);comparePrior(result,prior);
   result={...result,reconciliationOnly:true,priorAttemptEvent:prior.event,
    installedStateObserved:result.state===INSTALLED_STATUS,automaticRetryAllowed:false};
  }
 }
 console.log(JSON.stringify({...result,mode,reviewedMain:main,reviewedPrHead:reviewedHead,githubObservationIsNonAtomic:true},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 cli().catch(e=>{console.error(e?.v0114Hold===true?e.message:/^HOLD_P5B_V0114_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P5B_V0114_OWNER_OPERATION_UNVERIFIED");process.exitCode=2;});
}
