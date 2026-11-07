/**
 * Stage26: one-shot, NOLOGIN-only four-role production ACL commissioner.
 *
 * Atomic, no password or membership creation; no schedule/flight rows, no
 * provider call, no Phase6 activation. This installs empty role infrastructure
 * AFTER the owner's successful Stage23 eight-table schema commission.
 *
 * The two SECURITY DEFINER paid-intent functions are granted only to a
 * brand-new unassigned NOLOGIN source group. They cannot be invoked by any
 * new production source identity until a SEPARATE reviewed identity/membership
 * commissioning step. A CREATE ROLE preflight failure is an expected HOLD.
 */
import pg from "pg";
const {Pool}=pg;
const PERMIT="INSTALL_FOUR_NOLOGIN_P5_ROLES_WITH_NO_RUNTIME_MEMBERS";
const TEST_URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const ROLES={
 plan:"phase5_fids_prepare_prod_20261107",
 source:"phase5_fids_source_prod_20261107",
 pre:"phase5_fids_pre_writer_prod_20261107",
 witness:"phase5_fids_t24_witness_prod_20261107"
};
const NAMES=Object.values(ROLES);
const TABLES=[
 "phase5_fids_cycle_budget_v39","phase5_fids_day_budget_v39",
 "phase5_fids_utc_charge_budget_v39","phase5_fids_allowed_query_v39",
 "phase5_fids_physical_attempt_v39","phase5_fids_original_binding_v39",
 "phase5_fids_github_prearm_v39","phase5_t24_postcommit_witness_v39"
];
const hold=(msg)=>{throw Error("REFUSED_P5_STAGE26_"+msg);};
const S=(list)=>list.join(",");
function admitted(env){
 if(env.P5_STAGE26_FOUR_NOLOGIN_ROLES_ONCE!==PERMIT||
    !env.DATABASE_URL||
    !env.V39_DATABASE_RUNTIME_URL||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.DATABASE_URL===env.V39_DATABASE_RUNTIME_URL)
   hold("NO_EXPLICIT_SCHEMA_ONLY_OWNER_APPROVAL_OR_DISTINCT_ROLE_URL");
 if(env.GITHUB_ACTIONS==="true"&&
    (env.DATABASE_URL!==TEST_URL||
     env.V39_DATABASE_RUNTIME_URL===TEST_URL))
   hold("CI_MUST_USE_ONLY_DISPOSABLE_LOCAL_DB");
}
async function structure(c){
 const q=await c.query(
  "SELECT current_database() AS db, "+
  "current_setting('server_version_num') AS ver, "+
  "current_setting('transaction_read_only') AS ro, "+
  "pg_is_in_recovery() AS replica, "+
  "has_schema_privilege(current_user,'clean','USAGE') AS schema_usage, "+
  "(SELECT rolcreaterole OR rolsuper FROM pg_catalog.pg_roles "+
  " WHERE rolname=current_user) AS create_role"
 );
 const v=q.rows[0];
 if(q.rowCount!==1||v.db!=="neondb"||Number(v.ver)<160000||
    v.ro!=="off"||v.replica!==false||v.schema_usage!==true||
    v.create_role!==true)
  hold("NOT_AUTHORIZED_POSTGRES16_PRIMARY_ROLE_CREATOR");
 const f=await c.query(
  "SELECT count(*)::int AS n FROM pg_catalog.pg_class cl "+
  "JOIN pg_catalog.pg_namespace ns ON ns.oid=cl.relnamespace "+
  "WHERE ns.nspname='clean' AND cl.relkind IN ('r','p') "+
  "AND cl.relname=ANY($1::text[])",[TABLES]
 );
 if(f.rows[0]?.n!==8)hold("STAGE23_EIGHT_RELATIONS_NOT_PRESENT");
 const funcs=await c.query(
  "SELECT to_regprocedure("+
    "'clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text)')"+
    " IS NOT NULL AS reserve_present, "+
    "to_regprocedure("+
    "'clean.prearm_phase5_fids_github_query_v39(text,text,text,text,text,text)')"+
    " IS NOT NULL AS prearm_present"
 );
 if(funcs.rows[0]?.reserve_present!==true||
    funcs.rows[0]?.prearm_present!==true)
  hold("GUARDED_SPEND_AND_GITHUB_PREARM_FUNCTION_MISSING");
 const seq=await c.query(
  "SELECT to_regclass('clean.flight_snapshots_id_seq') IS NOT NULL AS seq_ok");
 if(seq.rows[0]?.seq_ok!==true)hold("PRE_SNAPSHOT_SEQUENCE_MISSING");
}
async function inspectRoles(c,expected){
 const q=await c.query(
  "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole, "+
  "rolcreatedb,rolreplication,rolbypassrls "+
  "FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",
  [NAMES]);
 if(q.rows.length!==expected)hold("EXISTING_OR_PARTIAL_PHASE5_SCOPED_ROLES");
 if(expected===4){
  for(const r of q.rows)if(!NAMES.includes(r.rolname)||
   r.rolcanlogin!==false||r.rolinherit!==false||r.rolsuper!==false||
   r.rolcreaterole!==false||r.rolcreatedb!==false||
   r.rolreplication!==false||r.rolbypassrls!==false)
    hold("SCOPED_ROLE_LOGIN_ADMIN_OR_SUPERUSER_DETECTED");
  const members=await c.query(
   "SELECT count(*)::int AS n FROM pg_catalog.pg_auth_members a "+
   "JOIN pg_catalog.pg_roles r ON r.oid=a.roleid "+
   "WHERE r.rolname=ANY($1::text[])",[NAMES]);
  if(members.rows[0]?.n!==0)
    hold("SCOPED_ROLE_ALREADY_HAS_RUNTIME_MEMBER");
 }
}
async function scope(c){
 const [p,s,pre,w]=NAMES;
 const table=(role,rel,priv)=>c.query(
  "SELECT has_table_privilege($1,$2,$3) AS yes",[role,"clean."+rel,priv]);
 const fn=(role,signature)=>c.query(
  "SELECT has_function_privilege($1,$2,'EXECUTE') AS yes",[role,signature]);
 async function expect(role,rel,priv,yes){
  const r=await table(role,rel,priv);
  if(r.rows[0]?.yes!==yes)hold("ROLE_TABLE_GRANT_MATRIX_INVALID");
 }
 // Independent planned day publisher.
 await expect(p,"phase5_fids_allowed_query_v39","INSERT",true);
 await expect(p,"phase5_fids_allowed_query_v39","UPDATE",false);
 await expect(p,"fids_query_response","INSERT",false);
 await expect(p,"flight_snapshots","INSERT",false);
 const auth=await c.query(
  "SELECT has_table_privilege($1,'clean.adb_phase6_authorization','SELECT') AS yes",
  [p]);
 if(auth.rows[0]?.yes!==true)hold("PREPARE_WRITER_AUTHORIZATION_SELECT_MISSING");

 // Actual source worker can write originals, not direct paid ledger.
 await expect(s,"fids_query_response","INSERT",true);
 await expect(s,"flight_population","INSERT",true);
 await expect(s,"phase5_fids_original_binding_v39","INSERT",true);
 await expect(s,"phase5_fids_physical_attempt_v39","INSERT",false);
 await expect(s,"phase5_fids_github_prearm_v39","INSERT",false);
 await expect(s,"phase5_fids_allowed_query_v39","UPDATE",false);
 await expect(s,"flight_snapshots","INSERT",false);
 await expect(s,"phase5_t24_postcommit_witness_v39","INSERT",false);
 for(const sig of [
  "clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text)",
  "clean.prearm_phase5_fids_github_query_v39(text,text,text,text,text,text)"
 ]){
  const f=await fn(s,sig);
  if(f.rows[0]?.yes!==true)hold("GUARDED_SOURCE_FUNCTION_EXECUTE_MISSING");
 }

 // PRE-only role: cannot mutate historical PRE/source/witness.
 await expect(pre,"flight_snapshots","INSERT",true);
 await expect(pre,"flight_snapshots","UPDATE",false);
 await expect(pre,"flight_snapshots","DELETE",false);
 await expect(pre,"phase5_t24_postcommit_witness_v39","SELECT",true);
 await expect(pre,"phase5_t24_postcommit_witness_v39","INSERT",false);
 await expect(pre,"phase5_fids_allowed_query_v39","INSERT",false);
 const seq=await c.query(
  "SELECT has_sequence_privilege($1,'clean.flight_snapshots_id_seq','USAGE') AS yes",
  [pre]);
 if(seq.rows[0]?.yes!==true)hold("PRE_ONLY_SEQUENCE_USE_MISSING");

 // Independent T24 witness role never INSERTs PRE or edits witness.
 await expect(w,"flight_snapshots","SELECT",true);
 await expect(w,"flight_snapshots","INSERT",false);
 await expect(w,"phase5_t24_postcommit_witness_v39","SELECT",true);
 await expect(w,"phase5_t24_postcommit_witness_v39","INSERT",true);
 await expect(w,"phase5_t24_postcommit_witness_v39","UPDATE",false);
 await expect(w,"phase5_t24_postcommit_witness_v39","DELETE",false);
 await expect(w,"phase5_fids_allowed_query_v39","INSERT",false);

 // Check raw/witness PUBLIC ACL via catalog; do not grant broad access.
 const open=await c.query(
  "SELECT count(*)::int AS n FROM pg_catalog.pg_class t "+
  "JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace "+
  "CROSS JOIN LATERAL pg_catalog.aclexplode("+
  " COALESCE(t.relacl,pg_catalog.acldefault('r',t.relowner))) a "+
  "WHERE ns.nspname='clean' AND "+
  " t.relname IN ('phase5_fids_original_binding_v39',"+
  "'phase5_t24_postcommit_witness_v39') AND a.grantee=0");
 if(open.rows[0]?.n!==0)hold("STAGED_ORIGINAL_OR_WITNESS_PUBLIC_ACCESS");
}
export async function commissionP5Stage26FourNoLoginRoles(pool,env=process.env){
 admitted(env);
 const c=await pool.connect();let open=false,commitStarted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");open=true;
  await c.query("SET LOCAL lock_timeout='2500ms'");
  await c.query("SET LOCAL statement_timeout='25000ms'");
  const lock=await c.query(
   "SELECT pg_try_advisory_xact_lock(hashtext('p5-stage26-nologin'),"+
   "hashtext('four-dedicated-roles')) AS got");
  if(lock.rows[0]?.got!==true)hold("ANOTHER_ROLE_INSTALLER_RUNNING");
  await structure(c);
  await inspectRoles(c,0);
  for(const name of NAMES)
   await c.query("CREATE ROLE "+name+
    " NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE"+
    " NOREPLICATION NOBYPASSRLS");
  await c.query("GRANT USAGE ON SCHEMA clean TO "+S(NAMES));
  await c.query("GRANT SELECT ON clean.adb_phase6_authorization,"+
   "clean.adb_phase6_calendar_day,clean.adb_sampling_draw TO "+ROLES.plan);
  await c.query("GRANT SELECT,INSERT ON "+
   ["phase5_fids_cycle_budget_v39","phase5_fids_day_budget_v39",
    "phase5_fids_utc_charge_budget_v39","phase5_fids_allowed_query_v39"]
    .map(x=>"clean."+x).join(",")+" TO "+ROLES.plan);

  await c.query("GRANT SELECT ON "+
   ["phase5_fids_cycle_budget_v39","phase5_fids_day_budget_v39",
    "phase5_fids_utc_charge_budget_v39","phase5_fids_allowed_query_v39",
    "phase5_fids_physical_attempt_v39","phase5_fids_original_binding_v39",
    "phase5_fids_github_prearm_v39","adb_phase6_calendar_day",
    "adb_sampling_draw","fids_query_response","flight_population"]
    .map(x=>"clean."+x).join(",")+" TO "+ROLES.source);
  await c.query("GRANT INSERT ON clean.fids_query_response,"+
    "clean.flight_population,clean.phase5_fids_original_binding_v39 "+
    "TO "+ROLES.source);
  await c.query("GRANT EXECUTE ON FUNCTION "+
    "clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text),"+
    "clean.prearm_phase5_fids_github_query_v39(text,text,text,text,text,text) "+
    "TO "+ROLES.source);

  const readers=["phase5_fids_allowed_query_v39",
   "phase5_fids_physical_attempt_v39",
   "phase5_fids_original_binding_v39","fids_query_response",
   "flight_population","flight_snapshots",
   "phase5_t24_postcommit_witness_v39"].map(x=>"clean."+x).join(",");
  await c.query("GRANT SELECT ON "+readers+" TO "+ROLES.pre+","+ROLES.witness);
  await c.query("GRANT INSERT ON clean.flight_snapshots TO "+ROLES.pre);
  await c.query("GRANT USAGE ON SEQUENCE clean.flight_snapshots_id_seq TO "+ROLES.pre);
  await c.query("GRANT INSERT ON clean.phase5_t24_postcommit_witness_v39 TO "+ROLES.witness);

  await inspectRoles(c,4);
  await scope(c);
  if(env.GITHUB_ACTIONS==="true"&&env.P5_STAGE26_FORCE_CI_ROLLBACK==="1")
   hold("CI_INJECTED_BEFORE_COMMIT_ROLLBACK");
  commitStarted=true;
  await c.query("COMMIT");open=false;
  // Independently visible new transaction, not in-transaction check alone.
  await inspectRoles(c,4);
  await scope(c);
  return {
   status:"P5_STAGE26_FOUR_NOLOGIN_ROLES_INSTALLED_NO_RUNTIME_ACTIVATION",
   roles:NAMES,rolesCreated:4,
   passwordOrRuntimeMembershipCreated:false,
   loginEnabled:false,
   strictPreWriterWitnessSeparationChecked:true,
   noPublicRawWitnessAccess:true,
   liveProductionRoleChanges:env.GITHUB_ACTIONS!=="true",
   providerCalls:0,paidFidsGets:0,alertCreates:0,flightRowsWritten:0,
   actualSourceUseRightsCertified:false,
   prospectiveFlightPRECertified:false,
   phase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(open&&!commitStarted)await c.query("ROLLBACK").catch(()=>{});
  if(commitStarted)hold("AMBIGUOUS_COMMIT_QUARANTINE_NO_RETRY");
  throw e;
 }finally{c.release();}
}
async function main(){
 let pool;
 try{
  admitted(process.env);
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
   connectionTimeoutMillis:10000,idleTimeoutMillis:2000});
  const result=await commissionP5Stage26FourNoLoginRoles(pool);
  console.log(JSON.stringify(result,null,2));
 }catch(e){
  const msg=typeof e?.message==="string"&&
    /^REFUSED_P5_STAGE26_[A-Z0-9_]+$/.test(e.message)?
    e.message:"REFUSED_P5_STAGE26_DB_AUTH_OR_UNEXPECTED_HOLD";
  console.error(msg);process.exitCode=2;
 }finally{await pool?.end().catch(()=>{});}
}
if(process.env.P5_STAGE26_FOUR_NOLOGIN_ROLES_ONCE)await main();
