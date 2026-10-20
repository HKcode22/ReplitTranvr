/**
 * Gate05 reviewed production SCHEMA-ONLY transaction (operator-run).
 * Intentionally NO provider client imports, no API key reads, no pilot seeds,
 * no login/role grants to app runtime, no app deployment.
 *
 * --dry-run (default): read-only identity + no-existing-object inventory.
 * --approve-schema-only-with-acl-revoke: opt-in 2 migrations and a per-object
 * REVOKE of legacy app-runtime default ACLs on 3 NEW tables ONLY.
 * Does not alter pg_default_acl or permissions on any existing object.
 */
import "dotenv/config";
import pg from "pg";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";

const APPROVED_SOURCE="c1d407c3f8658e67472843ebb8f2c8b8fecd40d8";
const SOURCE=[
  ["migrations/staged/V0066__gate05_scoped_fids_budget_v39.sql","f3832e495daf99b63b6b1bf2d218ec71bfe9428e"],
  ["migrations/staged/V0067__gate05_fids_function_only_roles_v39.sql","2ffdba1ce05c83facea38ede5339245c670608b3"]
];
const TABLES=[
 "clean.gate05_fids_pilot_scope_v39",
 "clean.gate05_fids_allowed_query_v39",
 "clean.gate05_fids_attempt_v39"
];
const FUNCS=[
 "clean.guard_gate05_fids_pilot_scope_v39()",
 "clean.guard_gate05_fids_allowed_query_v39()",
 "clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)",
 "clean.stop_gate05_fids_pilot_v39(uuid,text)"
];
const ROLES=[
 "gate05_fids_dispatch_v39",
 "gate05_fids_safety_v39",
 "gate05_fids_commission_v39"
];
const rights=["SELECT","INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"];
const commitArg="--approve-schema-only-with-acl-revoke";
const argv=process.argv.slice(2);
if(argv.length!==1 || !["--dry-run",commitArg].includes(argv[0]))
  throw Error("GATE05_EXACT_RELEASE_MODE_REQUIRED");
const installing=argv[0]===commitArg;
const fail=(why)=>{throw Error("GATE05_"+why+"_HOLD");};
const assert=(ok,why)=>{if(!ok)fail(why);};
function quoteIdent(v){
  assert(typeof v==="string"&&v.length>0&&v.length<100,"RUNTIME_ROLE_NAME");
  return '"'+v.replaceAll('"','""')+'"';
}
function files(){
  return SOURCE.map(([path,want])=>{
    const ref=APPROVED_SOURCE+":"+path;
    const actual=execFileSync("git",["rev-parse",ref],{encoding:"utf8",timeout:5000}).trim();
    assert(actual===want,"GIT_SOURCE_SHA");
    return execFileSync("git",["show",ref],{encoding:"utf8",maxBuffer:3_000_000,timeout:5000});
  });
}
async function sourceIdentity(db){
  await db.query("BEGIN READ ONLY");
  try{
    const row=(await db.query(
      "SELECT current_database() AS db,"+
      "(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS db_oid,"+
      "(SELECT oid::text FROM pg_namespace WHERE nspname='clean') AS clean_oid,"+
      "(SELECT oid::text FROM pg_class WHERE oid=to_regclass('clean.provider_content_blob_ref')) AS ref_oid,"+
      "current_user AS db_role"
    )).rows[0];
    const refs=(await db.query(
      "SELECT source_record_id,content_sha256 FROM clean.provider_content_blob_ref "+
      "WHERE source_record_id LIKE $1 ORDER BY source_record_id LIMIT 25",
      ["prepaid:386efd78-9155-4264-9533-7939d814d521:%"]
    )).rows;
    return {...row,count:refs.length,digest:createHash("sha256").update(JSON.stringify(refs)).digest("hex")};
  }finally{await db.query("ROLLBACK");}
}
async function mustNotExist(db){
  const roles=await db.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname=ANY($1::text[])",[ROLES]);
  assert(roles.rows[0].n===0,"PREEXISTING_ROLES");
  for(const v of TABLES){
    assert((await db.query("SELECT to_regclass($1) AS o",[v])).rows[0].o===null,"PREEXISTING_TABLE");
  }
  for(const v of FUNCS){
    assert((await db.query("SELECT to_regprocedure($1) AS o",[v])).rows[0].o===null,"PREEXISTING_FUNCTION");
  }
}
async function audit(db,runtimeRole){
  const grants=(await db.query(
    "SELECT "+
    "has_function_privilege('gate05_fids_dispatch_v39',"+
    "'clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)','EXECUTE') AS dispatch_reserve,"+
    "has_function_privilege('gate05_fids_dispatch_v39','clean.stop_gate05_fids_pilot_v39(uuid,text)','EXECUTE') AS dispatch_stop,"+
    "has_function_privilege('gate05_fids_safety_v39','clean.stop_gate05_fids_pilot_v39(uuid,text)','EXECUTE') AS safety_stop,"+
    "has_function_privilege('gate05_fids_safety_v39',"+
    "'clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)','EXECUTE') AS safety_reserve,"+
    "has_function_privilege($1,'clean.stop_gate05_fids_pilot_v39(uuid,text)','EXECUTE') AS runtime_stop,"+
    "has_function_privilege($1,"+
    "'clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)','EXECUTE') AS runtime_reserve",
    [runtimeRole]
  )).rows[0];
  assert(grants.dispatch_reserve===true&&grants.dispatch_stop===false&&
    grants.safety_stop===true&&grants.safety_reserve===false&&
    grants.runtime_stop===false&&grants.runtime_reserve===false,"FUNCTION_GRANTS");

  for(const name of TABLES){
    for(const role of [runtimeRole,...ROLES]){
      for(const right of rights){
        const r=await db.query("SELECT has_table_privilege($1,$2,$3) AS p",[role,name,right]);
        assert(r.rows[0].p===false,"EXCESS_TABLE_PRIVILEGE");
      }
    }
  }
  const membership=await db.query(
    "SELECT count(*)::int AS n FROM pg_auth_members a "+
    "JOIN pg_roles member ON member.oid=a.member "+
    "JOIN pg_roles ro ON ro.oid=a.roleid "+
    "WHERE member.rolname=$1 AND ro.rolname=ANY($2::text[])",
    [runtimeRole,ROLES]
  );
  assert(membership.rows[0].n===0,"RUNTIME_ROLE_MEMBERSHIP");

  const roleStatus=await db.query(
    "SELECT count(*)::int AS n FROM pg_roles WHERE rolname=ANY($1::text[]) "+
    "AND rolcanlogin=false AND rolsuper=false AND rolcreaterole=false AND "+
    "rolcreatedb=false AND rolreplication=false AND rolbypassrls=false",
    [ROLES]
  );
  assert(roleStatus.rows[0].n===3,"ROLE_SHAPE");

  const objs=await db.query(
    "SELECT (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "+
    "WHERE n.nspname='clean' AND c.relname=ANY($1::text[])) AS tables, "+
    "(SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace "+
    "WHERE n.nspname='clean' AND p.proname=ANY($2::text[])) AS functions",
    [TABLES.map(s=>s.split(".")[1]),FUNCS.map(s=>s.split(".")[1].split("(")[0])]
  );
  assert(objs.rows[0].tables===3&&objs.rows[0].functions===4,"OBJECT_INVENTORY");

  const empty=await db.query(
    "SELECT (SELECT count(*)::int FROM clean.gate05_fids_pilot_scope_v39) AS scopes,"+
    "(SELECT count(*)::int FROM clean.gate05_fids_allowed_query_v39) AS queries,"+
    "(SELECT count(*)::int FROM clean.gate05_fids_attempt_v39) AS attempts"
  );
  assert(Object.values(empty.rows[0]).every(n=>n===0),"PILOT_NOT_EMPTY");

  const pub=await db.query(
    "SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace "+
    "CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl "+
    "WHERE n.nspname='clean' AND p.proname IN "+
    "('reserve_gate05_fids_attempt_v39','stop_gate05_fids_pilot_v39') "+
    "AND acl.grantee=0 AND acl.privilege_type='EXECUTE'"
  );
  assert(pub.rows[0].n===0,"PUBLIC_EXECUTE");

  const triggers=await db.query(
    "SELECT count(*)::int AS n FROM pg_trigger t "+
    "JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace "+
    "WHERE n.nspname='clean' AND t.tgname IN "+
    "('trg_guard_gate05_fids_pilot_scope_v39','trg_guard_gate05_fids_allowed_query_v39') "+
    "AND NOT t.tgisinternal"
  );
  assert(triggers.rows[0].n===2,"GUARD_TRIGGER_INVENTORY");
}
const env=process.env;
assert(env.V39_DATABASE_TARGET_CONFIRM==="production","DATABASE_TARGET");
const runtimeUrl=env.V39_DATABASE_RUNTIME_URL;
const adminUrl=env.DATABASE_URL;
assert(runtimeUrl&&adminUrl&&runtimeUrl!==adminUrl,"CREDENTIAL_SEPARATION");
const sql=files();
let runtime,admin,transactionOpen=false,commitAttempted=false,stage="CONNECT";
try{
  runtime=new pg.Client({
    connectionString:runtimeUrl,connectionTimeoutMillis:5000,query_timeout:12000,
    options:"-c default_transaction_read_only=on -c statement_timeout=10000"
  });
  admin=new pg.Client({
    connectionString:adminUrl,connectionTimeoutMillis:5000,query_timeout:30000
  });
  await runtime.connect();await admin.connect();
  stage="TARGET_EVIDENCE";
  const [r,a]=await Promise.all([sourceIdentity(runtime),sourceIdentity(admin)]);
  for(const field of ["db","db_oid","clean_oid","ref_oid","digest"])
    assert(r[field]&&r[field]===a[field],"DATABASE_IDENTITY");
  assert(r.count===7&&a.count===7&&r.db_role!==a.db_role,"DATABASE_EVIDENCE");
  stage="PREFLIGHT";
  await admin.query(installing?"BEGIN READ WRITE":"BEGIN READ ONLY");transactionOpen=true;
  await admin.query("SET LOCAL lock_timeout='3000ms'");
  await admin.query("SET LOCAL statement_timeout='20000ms'");
  if(installing){
    const lock=await admin.query(
      "SELECT pg_try_advisory_xact_lock(hashtext('gate05_v0066_v0067_schema_only')) AS ok");
    assert(lock.rows[0].ok===true,"MIGRATION_BUSY");
  }
  const priv=(await admin.query(
    "SELECT rolcreaterole,rolsuper,has_schema_privilege(current_user,'clean','CREATE') AS can_create "+
    "FROM pg_roles WHERE rolname=current_user"
  )).rows[0];
  assert(priv?.rolcreaterole===true&&priv?.rolsuper===false&&priv?.can_create===true,
    "ADMIN_PRIVILEGES");
  await mustNotExist(admin);

  if(!installing){
    await admin.query("ROLLBACK");transactionOpen=false;
    console.log(JSON.stringify({
      status:"GATE05_SCHEMA_RELEASE_READONLY_PREFLIGHT_PASS",
      approvedSourceCommit:APPROVED_SOURCE,
      targetStrongMatch:true,
      legacyRuntimeAccessNotElevated:true,
      liveObjectsInstalled:false,
      providerRequests:0,databaseWrites:0
    },null,2));
  }else{
    stage="CREATE_V0066";await admin.query(sql[0]);
    stage="CREATE_V0067";await admin.query(sql[1]);
    stage="REVOKE_EXISTING_RUNTIME_DEFAULT_ACL_ON_THREE_NEW_TABLES";
    await admin.query(
      "REVOKE ALL PRIVILEGES ON TABLE "+TABLES.join(",")+
      " FROM "+quoteIdent(r.db_role)
    );
    stage="POST_INSTALL_SECURITY_AUDIT";
    await audit(admin,r.db_role);
    stage="COMMIT";commitAttempted=true;
    await admin.query("COMMIT");transactionOpen=false;
    console.log(JSON.stringify({
      status:"GATE05_SCHEMA_ONLY_COMMITTED_WITH_SCOPED_RUNTIME_ACL_REVOKE",
      migrationSourceCommit:APPROVED_SOURCE,
      migrated:["V0066","V0067"],
      newTables:3,newGuardFunctions:2,newOtherFunctions:2,newTriggers:2,
      nonloginGroupRoles:3,retainedPilotScopes:0,retainedPilotAttempts:0,
      defaultAclUnchanged:true,
      runtimeCanReserve:false,runtimeCanStop:false,
      runtimeCanUpdatePilotTables:false,
      providerRequests:0,providerUnitsByInstaller:0,appDeployment:false
    },null,2));
  }
}catch(error){
  let rolledBack=false;
  if(transactionOpen&&!commitAttempted){
    try{await admin.query("ROLLBACK");rolledBack=true;}catch{}
  }
  const code=typeof error?.message==="string"&&error.message.startsWith("GATE05_")
    ? error.message:"SQL_OR_NETWORK_ERROR_REDACTED";
  console.error(JSON.stringify({
    status:commitAttempted?"GATE05_COMMIT_OUTCOME_UNKNOWN_DO_NOT_RETRY":
      rolledBack?"GATE05_SCHEMA_INSTALL_ROLLED_BACK":
      "GATE05_SCHEMA_INSTALL_HOLD_VERIFY_DB_STATE",
    failedStage:stage,reason:code,sqlstate:error?.code??null,
    providerRequests:0
  },null,2));
  process.exitCode=1;
}finally{
  await runtime?.end().catch(()=>{});
  await admin?.end().catch(()=>{});
}
