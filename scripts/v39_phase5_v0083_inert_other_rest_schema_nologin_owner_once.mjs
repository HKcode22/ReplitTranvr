/**
 * Phase 5 V0083: INSTALL ONLY the pinned, additive, empty OTHER REST schema
 * and TWO isolated NOLOGIN groups. Does not activate any provider operation,
 * create a LOGIN, or change V0079/V0080/V0081/V0082 source receipts.
 * One-shot, owner-only, reviewed-main-SHA, strict PG16 primary.
 */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {createHash} from "node:crypto";
import pg from "pg";
const {Pool}=pg;

const PURPOSE="INSTALL_EMPTY_V0083_OTHER_REST_NOLOGIN_ROLES_NO_PROVIDER";
const CI_URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const BLOB="a5e1e9df39ec9b436f0576245f375985a69a3b71";
const MIGRATION="V0083__phase5_nonfids_five_category_physical_rest_reservation_v39.sql";
const SHA=/^[0-9a-f]{40}$/;
const GROUPS={
  prepare:"phase5_fids_prepare_prod_20261107",
  source:"phase5_fids_source_prod_20261107",
  pre:"phase5_fids_pre_writer_prod_20261107",
  witness:"phase5_fids_t24_witness_prod_20261107",
  budget:"phase5_fids_budget_freeze_prod_20261108",
  reviewer:"phase5_other_rest_review_prod_20261108",
  spender:"phase5_other_rest_reserve_prod_20261108"
};
const OLD=[GROUPS.prepare,GROUPS.source,GROUPS.pre,GROUPS.witness,GROUPS.budget];
const NEW=[GROUPS.reviewer,GROUPS.spender];
const TABLES=[
  "phase5_other_rest_reviewed_call_v39",
  "phase5_other_rest_physical_reservation_v39"
];
const OLD_TABLES=[
  "phase5_fids_allowed_query_v39",
  "phase5_fids_physical_attempt_v39",
  "phase5_fids_original_binding_v39",
  "phase5_fids_github_prearm_v39",
  "phase5_t24_postcommit_witness_v39",
  "phase5_fids_seven_rest_release_v39",
  "phase5_fids_cycle_rest_category_cap_v39",
  "phase5_fids_utc_rest_category_budget_v39",
  "phase5_fids_exact_query_partition_v39"
];
const NEW_FUNCTIONS=[
  "clean.phase5_other_rest_immutable_v39()",
  "clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)"
];
const OLD_FUNCTION="clean.phase5_fids_v0082_category_immutable_v39()";
const NEW_TRIGGERS=[
  "p5_other_reviewed_immutable",
  "p5_other_reservation_immutable"
];
const hold=(s)=>{throw Error("REFUSED_P5_V0083_OWNER_"+s);};

function admit(e){
  if(e.P5_V0083_EMPTY_INSTALL_ONCE!==PURPOSE||
    !e.DATABASE_URL||!e.V39_DATABASE_RUNTIME_URL||
    e.DATABASE_URL===e.V39_DATABASE_RUNTIME_URL||
    e.ADB_AUTO_COLLECT!=="0"||
    e.V39_PHASE6_PROCESS_ARMED!=="0"||
    e.V39_PHASE6_OWNER_APPROVED!=="0"||
    !SHA.test(e.P5_V0083_REVIEWED_MAIN_SHA??"")||
    !/^[a-z_][a-z_0-9]{2,63}$/.test(e.P5_V0083_EXPECTED_OWNER_ROLE??""))
    hold("MISSING_REVIEWED_MAIN_OWNER_PRIMARY_AND_EXPLICIT_INERT_PURPOSE");
  if(e.GITHUB_ACTIONS==="true"&&(
    e.P5_V0083_CI_DISPOSABLE_ONLY!=="1"||
    e.DATABASE_URL!==CI_URL||
    e.P5_V0083_EXPECTED_OWNER_ROLE!=="postgres"||
    e.P5_V0083_REVIEWED_MAIN_SHA!==e.GITHUB_SHA))
    hold("CI_MUST_USE_ISOLATED_POSTGRES16_WITH_EXACT_GITHUB_SHA");
}

function readMigration(){
  const bytes=readFileSync(resolve(process.cwd(),"migrations/staged",MIGRATION));
  const gitHash=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
  if(gitHash!==BLOB)hold("STAGED_SQL_GIT_BLOB_CHANGED");
  return bytes.toString("utf8");
}
async function catalog(c,installed){
  const rows=(await c.query(
    "SELECT c.relname FROM pg_catalog.pg_class c "+
    "JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace "+
    "WHERE n.nspname='clean' AND c.relkind IN ('r','p') "+
    "AND c.relname=ANY($1::text[])",[TABLES.concat(OLD_TABLES)]
  )).rows.map(x=>x.relname);
  if(OLD_TABLES.some(x=>!rows.includes(x)))hold("MISSING_V0079_TO_V0082_PREREQUISITE_TABLES");
  if(TABLES.some(x=>rows.includes(x)!==installed))hold("PARTIAL_OR_ALREADY_INSTALLED_V0083_TABLES");
  const funcs=(await c.query(
    "SELECT name,to_regprocedure(name) IS NOT NULL AS found "+
    "FROM unnest($1::text[]) AS t(name)",[NEW_FUNCTIONS.concat(OLD_FUNCTION)]
  )).rows;
  if(funcs.some(x=>x.found!==(x.name===OLD_FUNCTION||installed)))
    hold("V0082_TRIGGER_OR_V0083_FUNCTION_SET_UNEXPECTED");
  const trig=(await c.query(
    "SELECT tgname FROM pg_catalog.pg_trigger "+
    "WHERE NOT tgisinternal AND tgname=ANY($1::text[])",[NEW_TRIGGERS]
  )).rows;
  if(trig.length!==(installed?2:0))hold("V0083_TRIGGER_SET_ALREADY_PARTIAL");
  const idx=(await c.query(
    "SELECT to_regclass('clean.p5_other_rest_reviewed_day_v39') IS NOT NULL AS present"
  )).rows[0]?.present;
  if(idx!==installed)hold("V0083_INDEX_SET_PARTIAL");
}

async function zero(c){
  const q=await c.query(
    "SELECT "+
    "(SELECT COUNT(*)::int FROM clean.phase5_fids_allowed_query_v39) q,"+
    "(SELECT COUNT(*)::int FROM clean.phase5_fids_physical_attempt_v39) a,"+
    "(SELECT COUNT(*)::int FROM clean.phase5_fids_original_binding_v39) o,"+
    "(SELECT COUNT(*)::int FROM clean.phase5_fids_github_prearm_v39) p,"+
    "(SELECT COUNT(*)::int FROM clean.phase5_fids_seven_rest_release_v39) r,"+
    "(SELECT COUNT(*)::int FROM clean.phase5_fids_cycle_rest_category_cap_v39) cc,"+
    "(SELECT COUNT(*)::int FROM clean.phase5_fids_utc_rest_category_budget_v39) dc,"+
    "(SELECT COUNT(*)::int FROM clean.phase5_fids_exact_query_partition_v39) part"
  );
  if(!q.rows[0]||Object.values(q.rows[0]).some(x=>x!==0))
    hold("NONEMPTY_SOURCE_OR_BUDGET_CANNOT_INSTALL_INERT");
}
async function baseline(c){
  const q=(await c.query(
    "SELECT current_database() db,current_user actor,"+
    "current_setting('server_version_num') ver,"+
    "current_setting('transaction_read_only') ro,"+
    "pg_is_in_recovery() replica,"+
    "has_schema_privilege(current_user,'clean','CREATE') create_schema,"+
    "(SELECT rolsuper OR rolcreaterole FROM pg_catalog.pg_roles "+
    "WHERE rolname=current_user) create_role"
  )).rows[0];
  if(!q||q.db!=="neondb"||Number(q.ver)<160000||
    q.ro!=="off"||q.replica!==false||q.create_schema!==true||q.create_role!==true)
    hold("NOT_PRIVILEGED_POSTGRES16_PRIMARY_NEONDB");
  await catalog(c,false);
  await zero(c);
  const roles=(await c.query(
    "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,"+
    "rolcreatedb,rolreplication,rolbypassrls "+
    "FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",[Object.values(GROUPS)]
  )).rows;
  if(roles.length!==5||roles.some(x=>!OLD.includes(x.rolname)||
    x.rolcanlogin!==false||x.rolinherit!==false||
    x.rolsuper!==false||x.rolcreaterole!==false||
    x.rolcreatedb!==false||x.rolreplication!==false||x.rolbypassrls!==false))
    hold("EXACT_FIVE_EXISTING_NOLOGIN_GROUPS_REQUIRED_NO_REPLAY");
}

async function postChecks(c){
  await catalog(c,true);
  await zero(c);
  const roles=(await c.query(
    "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,"+
    "rolcreatedb,rolreplication,rolbypassrls "+
    "FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",[NEW]
  )).rows;
  if(roles.length!==2||roles.some(x=>x.rolcanlogin!==false||
    x.rolinherit!==false||x.rolsuper!==false||x.rolcreaterole!==false||
    x.rolcreatedb!==false||x.rolreplication!==false||x.rolbypassrls!==false))
    hold("NEW_ROLE_NOT_ISOLATED_NOLOGIN");
  const memberships=(await c.query(
    "SELECT r.rolname,a.inherit_option,a.set_option,a.admin_option "+
    "FROM pg_catalog.pg_auth_members a JOIN pg_catalog.pg_roles r ON r.oid=a.roleid "+
    "WHERE r.rolname=ANY($1::text[])",[NEW]
  )).rows;
  if(memberships.length>2||memberships.some(x=>
    x.inherit_option!==false||x.set_option!==false||x.admin_option!==true))
    hold("UNEXPECTED_RUNTIME_OR_INHERITED_GROUP_MEMBER");
  const probes=[];
  const add=(role,table,priv,yes)=>probes.push({role,table,priv,yes});
  for(const role of Object.values(GROUPS)){
    for(const table of TABLES){
      for(const privilege of ["SELECT","INSERT","UPDATE","DELETE","TRUNCATE"])
        add(role,"clean."+table,privilege,
          role===GROUPS.reviewer&&table===TABLES[0]&&privilege==="INSERT");
    }
  }
  for(const role of NEW)for(const name of
    ["clean.fids_query_response","clean.flight_population","clean.flight_snapshots"]){
    for(const privilege of ["SELECT","INSERT","UPDATE","DELETE"])
      add(role,name,privilege,false);
  }
  for(let i=0;i<probes.length;i+=100){
    const batch=probes.slice(i,i+100);
    const sql="SELECT "+batch.map((p,j)=>
      "has_table_privilege('"+p.role+"','"+p.table+"','"+p.privilege+"') p"+j).join(",");
    const got=(await c.query(sql)).rows[0];
    if(!got||batch.some((p,j)=>got["p"+j]!==p.yes))
      hold("V0083_EXTRA_OR_MISSING_TABLE_PRIVILEGES");
  }
  const exec=(await c.query(
    "SELECT has_function_privilege($1,$3,'EXECUTE') reviewer,"+
    "has_function_privilege($2,$3,'EXECUTE') spender,"+
    "has_function_privilege($4,$3,'EXECUTE') source,"+
    "has_function_privilege($5,$3,'EXECUTE') prepare",
    [GROUPS.reviewer,GROUPS.spender,NEW_FUNCTIONS[1],GROUPS.source,GROUPS.prepare]
  )).rows[0];
  if(!exec||exec.reviewer!==false||exec.spender!==true||
    exec.source!==false||exec.prepare!==false)
    hold("RESERVATION_FUNCTION_ROLE_EXECUTE_NOT_EXACT");
  const publicTables=(await c.query(
    "SELECT COUNT(*)::int n FROM pg_catalog.pg_class cl "+
    "JOIN pg_catalog.pg_namespace ns ON ns.oid=cl.relnamespace "+
    "CROSS JOIN LATERAL aclexplode(coalesce(cl.relacl,acldefault('r',cl.relowner))) acl "+
    "WHERE ns.nspname='clean' AND cl.relname=ANY($1::text[]) AND acl.grantee=0",
    [TABLES]
  )).rows[0]?.n;
  const publicFunctions=(await c.query(
    "SELECT COUNT(*)::int n FROM pg_catalog.pg_proc p "+
    "JOIN pg_catalog.pg_namespace ns ON ns.oid=p.pronamespace "+
    "CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl "+
    "WHERE ns.nspname='clean' AND p.proname=ANY($1::text[]) AND acl.grantee=0",
    ["phase5_other_rest_immutable_v39","reserve_phase5_other_rest_once_v39",
      "phase5_fids_v0082_category_immutable_v39"]
  )).rows[0]?.n;
  if(publicTables!==0||publicFunctions!==0)
    hold("PUBLIC_TABLE_OR_FUNCTION_PRIVILEGE_EXPOSED");
  const body=(await c.query(
    "SELECT pg_get_functiondef(to_regprocedure($1)) AS sql",[OLD_FUNCTION]
  )).rows[0]?.sql??"";
  if(!body.includes("P5_V0083_OTHER_CATEGORY_REQUIRES_SAME_TRANSACTION_ONE_SHOT_PROOF")||
     !body.includes("P5_V0082_SOURCE_MUST_RESERVE_EXACT_TWO_UNITS"))
    hold("V0082_BASE_SPLIT_AND_V0083_TRIGGER_PROOF_MISSING");
  const tableRows=(await c.query(
    "SELECT "+
    "(SELECT COUNT(*)::int FROM clean.phase5_other_rest_reviewed_call_v39) reviewed,"+
    "(SELECT COUNT(*)::int FROM clean.phase5_other_rest_physical_reservation_v39) physical"
  )).rows[0];
  if(!tableRows||tableRows.reviewed!==0||tableRows.physical!==0)
    hold("V0083_INSTALL_MINTED_REQUEST_OR_SPEND");
}

export async function installPhase5V0083EmptySchemaAndRestRolesOnce(pool,env=process.env){
  admit(env);
  const sql=readMigration();
  const c=await pool.connect();
  let tx=false,commitAttempted=false;
  try{
    await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
    await c.query("SET LOCAL statement_timeout='30000ms'");
    await c.query("SET LOCAL lock_timeout='3500ms'");
    if((await c.query("SELECT current_user who")).rows[0]?.who!==
      env.P5_V0083_EXPECTED_OWNER_ROLE)hold("UNEXPECTED_PRIMARY_SCHEMA_OWNER_ROLE");
    const lock=(await c.query(
      "SELECT pg_try_advisory_xact_lock(hashtext('v39-phase5-v0083'),"+
      "hashtext('empty-other-rest-role-install')) ok"
    )).rows[0]?.ok;
    if(lock!==true)hold("ANOTHER_INSTALLER_RUNNING");
    await baseline(c);
    await c.query(sql);
    if(env.GITHUB_ACTIONS==="true"&&env.P5_V0083_CI_INJECT_ROLLBACK==="1")
      hold("CI_INJECT_ATOMIC_DDL_ROLLBACK");
    for(const role of NEW){
      await c.query("CREATE ROLE "+role+
        " NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB "+
        "NOCREATEROLE NOREPLICATION NOBYPASSRLS");
      await c.query("GRANT USAGE ON SCHEMA clean TO "+role);
    }
    await c.query(
      "GRANT INSERT ON clean.phase5_other_rest_reviewed_call_v39 TO "+GROUPS.reviewer
    );
    await c.query(
      "GRANT EXECUTE ON FUNCTION clean.reserve_phase5_other_rest_once_v39("+
      "text,text,text,text,text,text) TO "+GROUPS.spender
    );
    await postChecks(c);
    commitAttempted=true;
    await c.query("COMMIT");tx=false;
    await postChecks(c);
    return {
      status:"V0083_EMPTY_OTHER_REST_SCHEMA_AND_SPLIT_NOLOGIN_ROLES_INSTALLED_INERT",
      reviewedMainSha:env.P5_V0083_REVIEWED_MAIN_SHA,
      exactStagedSqlGitBlob:BLOB,
      addedTables:2,addedIndex:1,addedFunctions:2,addedTriggers:2,
      v0082ExistingCategoryTriggerReplacedWithSourcePreservingVersion:true,
      newReviewNoLogin:1,newReservationNoLogin:1,newRuntimeLogin:0,
      newRuntimeMembers:0,plannedOtherRestCalls:0,physicalRestReservations:0,
      existingFidsGetRows:0,providerFidsGets:0,providerAlertCreates:0,
      sourceRightsCertified:false,scientificFreeze:false,phase6PaidGo:false
    };
  }catch(err){
    if(tx&&!commitAttempted)await c.query("ROLLBACK").catch(()=>{});
    if(commitAttempted)hold("AMBIGUOUS_DDL_COMMIT_READONLY_RECONCILIATION_REQUIRED");
    throw err;
  }finally{c.release();}
}
async function main(){
  let pool;
  try{
    admit(process.env);
    pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
      connectionTimeoutMillis:12000,idleTimeoutMillis:4000});
    console.log(JSON.stringify(await installPhase5V0083EmptySchemaAndRestRolesOnce(pool)));
  }catch(e){
    const m=typeof e?.message==="string"&&
      /^REFUSED_P5_V0083_OWNER_[A-Z0-9_]+$/.test(e.message)?
      e.message:"REFUSED_P5_V0083_OWNER_UNEXPECTED_DATABASE_HOLD";
    console.error(m);process.exitCode=2;
  }finally{if(pool)await pool.end().catch(()=>{});}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
  await main();
