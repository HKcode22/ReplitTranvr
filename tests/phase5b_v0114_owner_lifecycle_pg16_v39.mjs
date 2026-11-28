/** I144/T140: actual nonsuperuser V0114 lifecycle on disposable PG16.
 * The superuser connection only observes the independently installed fixture.
 * Every migration/rollback/install uses the existing restricted schema owner.
 * No provider, production database, workflow dispatch or policy activation.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
import {PATH,BLOB,READY_STATUS,INSTALLED_STATUS,inspectV0114,installV0114Once}
 from "../scripts/v39_phase5b_v0114_owner_once_v39.mjs";

const ADMIN="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const OWNER="postgresql://phase5_cd_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
const PREPARE="postgresql://phase5_p30_prepare_login_20261107:ci-only@localhost:5432/neondb?sslmode=disable";
const e=process.env;
assert.equal(e.GITHUB_ACTIONS,"true");assert.equal(e.DATABASE_URL,ADMIN);
assert.equal(e.V39_P5B_CONDITIONAL_QUEUE_CI,"1");
assert.equal(e.V39_PHASE6_PROCESS_ARMED,"0");assert.equal(e.ADB_AUTO_COLLECT,"0");
for(const key of ["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","P5_V39_PRE_DATABASE_URL","P5_V39_OTHER_REST_RESERVE_DATABASE_URL"])
 assert.ok(!e[key],"Disposable fixture must have no paid/provider role: "+key);

const ROLE="phase5_cd_source_registration_owner_v39",PREP="phase5_fids_prepare_prod_20261107";
const TYPES="text,text,text,text,timestamptz,text,text,text,text,integer";
const oldSigs=["clean.phase5_cd_register_source_flight_v39("+TYPES+")",
 "clean.phase5_cd_ensure_exact_source_flight_v39("+TYPES+")",
 "clean.phase5_t24_witness_before_insert_v39()",
 "clean.phase5_t24_witness_immutable_v39()"];
const newSigs=oldSigs.slice(0,2).map(s=>s.slice(0,-1)+",jsonb)");
const columns=["snapshot_id","flight_instance_id","population_query_id","fids_response_hash",
 "source_query_digest","rights_review_sha256","selected_t_native_utc","selected_t_version",
 "t24_cutoff_utc","frame_hash","config_hash","post_pre_commit_db_observed_at_utc"].sort();
const bytes=readFileSync(PATH),sql=bytes.toString("utf8");
assert.equal(createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex"),BLOB);
assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
const body=sql.replace(/^BEGIN;$/m,"").replace(/^COMMIT;$/m,"");
let opened=0;
async function open(){const c=new pg.Client({connectionString:OWNER});await c.connect();opened++;return c;}
async function owner(fn){const c=await open();try{return await fn(c);}finally{await c.end();}}
const admin=new pg.Client({connectionString:ADMIN});await admin.connect();
async function unchangedState(){
 const routines=(await admin.query("SELECT p.oid::text,pg_get_userbyid(p.proowner) owner,p.prosrc,p.prosecdef,p.proconfig,p.proacl::text acl FROM pg_proc p WHERE p.oid=ANY(ARRAY(SELECT to_regprocedure(s) FROM unnest($1::text[]) s)) ORDER BY p.oid",[oldSigs])).rows;
 assert.equal(routines.length,4,"All four exact predecessor routines must exist");
 const counts=(await admin.query("SELECT (SELECT count(*)::int FROM clean.phase5_cd_pre_task_v39) tasks,(SELECT count(*)::int FROM clean.flight_snapshots) snapshots,(SELECT count(*)::int FROM clean.phase5_t24_postcommit_witness_v39) witnesses,(SELECT count(*)::int FROM clean.phase5_fids_original_binding_v39) originals")).rows[0];
 const roles=(await admin.query("SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls FROM pg_roles ORDER BY rolname")).rows;
 const memberships=(await admin.query("SELECT roleid::text,member::text,grantor::text,admin_option,inherit_option,set_option FROM pg_auth_members ORDER BY roleid,member,grantor")).rows;
 const schemaAcl=(await admin.query("SELECT a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='clean' ORDER BY a.grantee,a.grantor,a.privilege_type,a.is_grantable")).rows;
 return {routines,counts,roles,memberships,schemaAcl};
}
async function acl(){
 const readable=(await admin.query("SELECT attname,has_column_privilege($1,attrelid,attnum,'SELECT WITH GRANT OPTION') grantable FROM pg_attribute WHERE attrelid='clean.phase5_t24_postcommit_witness_v39'::regclass AND attnum>0 AND NOT attisdropped AND has_column_privilege($1,attrelid,attnum,'SELECT') ORDER BY attname",[ROLE])).rows;
 const scope=(await admin.query("SELECT pg_has_role('phase5_cd_ci_owner',$1,'SET') owner_can_set,has_schema_privilege($1,'clean','CREATE') owner_can_create,has_table_privilege($1,'clean.phase5_t24_postcommit_witness_v39','SELECT') full_read,has_table_privilege($1,'clean.phase5_t24_postcommit_witness_v39','INSERT,UPDATE,DELETE,TRUNCATE') witness_write,has_any_column_privilege($2,'clean.phase5_t24_postcommit_witness_v39','SELECT') prepare_read,has_table_privilege($2,'clean.phase5_cd_pre_task_v39','INSERT,UPDATE,DELETE,TRUNCATE') prepare_write",[ROLE,PREP])).rows[0];
 return {readable,scope};
}
try{
 const baseline=await unchangedState(),beforeAcl=await acl();
 assert.equal((await owner(c=>inspectV0114(c,bytes,{ci:true}))).state,READY_STATUS);
 assert.deepEqual(beforeAcl.readable,[]);
 assert.ok(Object.values(beforeAcl.scope).every(v=>v===false));

 // Execute the COMPLETE new SQL body, including all final grants/revokes,
 // then deliberately roll it back. An early refusal is not rollback proof.
 await owner(async c=>{
  const who=(await c.query("SELECT current_user actor,session_user login,rolsuper,rolcreaterole FROM pg_roles WHERE rolname=current_user")).rows[0];
  assert.deepEqual(who,{actor:"phase5_cd_ci_owner",login:"phase5_cd_ci_owner",rolsuper:false,rolcreaterole:true});
  await c.query("BEGIN");
  try{
   await c.query(body);
   const installed=(await c.query("SELECT count(*)::int n FROM pg_proc WHERE oid=ANY(ARRAY(SELECT to_regprocedure(s) FROM unnest($1::text[]) s))",[newSigs])).rows[0].n;
   assert.equal(installed,2,"Both full successor bodies must execute before forced rollback");
  }finally{await c.query("ROLLBACK");}
 });
 assert.equal((await owner(c=>inspectV0114(c,bytes,{ci:true}))).state,READY_STATUS);
 assert.deepEqual(await unchangedState(),baseline);
 assert.deepEqual(await acl(),beforeAcl);
 console.log("T140_V0114_COMPLETE_NON_SUPERUSER_MIGRATION_ROLLBACK_PASS");

 const beforeInstallOpened=opened;
 const installed=await installV0114Once({open,bytes,ci:true});
 assert.equal(installed.state,INSTALLED_STATUS);assert.equal(installed.alreadyInstalledNoReplay,false);
 assert.ok(opened-beforeInstallOpened>=3,"Initial inspection, mutation and independent readback require separate connections");
 assert.equal((await owner(c=>inspectV0114(c,bytes,{ci:true}))).state,INSTALLED_STATUS);
 assert.deepEqual(await unchangedState(),baseline,"Original bodies/OIDs/ACLs, all old data and roles remain unchanged");
 const afterAcl=await acl();
 assert.deepEqual(afterAcl.readable,columns.map(attname=>({attname,grantable:false})));
 assert.ok(Object.values(afterAcl.scope).every(v=>v===false));
 const prep=new pg.Client({connectionString:PREPARE});await prep.connect();
 try{
  await prep.query("SET ROLE "+PREP);
  await assert.rejects(prep.query("SELECT snapshot_id FROM clean.phase5_t24_postcommit_witness_v39 LIMIT 1"),error=>error.code==="42501");
 }finally{await prep.end();}
 console.log("T140_V0114_REAL_OWNER_COMMIT_INDEPENDENT_READBACK_MINIMUM_COLUMN_ACL_PASS");

 const again=await installV0114Once({open,bytes,ci:true});
 assert.equal(again.state,INSTALLED_STATUS);assert.equal(again.alreadyInstalledNoReplay,true);
 await owner(async c=>{
  try{await assert.rejects(c.query(sql),error=>error.code==="P0001"&&error.message==="P5B_V0114_OWNER_OR_ALREADY_INSTALLED_HOLD");}
  finally{await c.query("ROLLBACK");}
 });
 assert.equal((await owner(c=>inspectV0114(c,bytes,{ci:true}))).state,INSTALLED_STATUS);
 assert.deepEqual(await unchangedState(),baseline);
 assert.deepEqual(await acl(),afterAcl);
 console.log("T140_V0114_EXACT_INSTALLED_INSPECTION_NO_DDL_AND_RAW_REPLAY_HOLD_PASS");
}finally{await admin.end();}
