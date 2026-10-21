/**
 * Gate05 one-session short-lived SAFETY-ONLY credential replacement.
 *
 * MANUAL OPERATOR / PRODUCTION ROLE WRITE. No provider import/call.
 * Does not create/consume permit, activate, dispatch, STOP or schedule a job.
 * Requires separate protected GitHub environment, released exact main HEAD,
 * empty open pilot ledger and explicit future UTC scope target. A freshly
 * generated password exists only in process memory until encrypted as a GH
 * environment secret. No dependence on Replit HOME JSON files.
 *
 * The script may COMMIT a role before secret upload; its output distinguishes
 * those steps. NEVER rerun blindly on a post-commit HOLD.
 */
import "dotenv/config";
import pg from "pg";
import {randomBytes} from "node:crypto";
import {execFileSync,spawnSync} from "node:child_process";

const HEAD=/^[a-f0-9]{40}$/;
const CONFIRM="PROVISION_G05_STOP_ONLY_NO_PROVIDER";
const TARGET=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/;
const OWNER="HKcode22";
const REPO="HKcode22/ReplitTranvr";
const ENVIRONMENT="gate05-safety";
const GROUP="gate05_fids_safety_v39";
const FN={
  reserve:"clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)",
  stop:"clean.stop_gate05_fids_pilot_v39(uuid,text)",
  prepare:"clean.prepare_gate05_permitted_scope_v39(uuid,text)",
  activate:"clean.activate_gate05_prepared_scope_v39(uuid,text)"
} as const;
function fail(code:string):never{
  throw Error("GATE05_SAFETY_PROVISION_HOLD_"+code);
}
export function planGate05SafetyCredentialRotationV39(
  now:number,startUtc:string,expectedHead:string,confirm:string
){
  if(!HEAD.test(expectedHead)||confirm!==CONFIRM)fail("SOURCE_OR_CONFIRM");
  if(!TARGET.test(startUtc))fail("START_FORMAT");
  const start=Date.parse(startUtc);
  if(!Number.isFinite(start)||new Date(start).toISOString()!==startUtc||
     start%(15*60000)!==0)fail("START_FORMAT");
  // Owner-approved 90-minute lead (2026-10-21), not a full day ahead:
  // 6-hour-login VALID UNTIL must cover 40-minute pilot plus STOP.
  if(!Number.isSafeInteger(now)||start-now<90*60000||
     start-now>5*3600000)fail("ROTATION_TIME_WINDOW_90_MIN_TO_5_HOURS");
  const expiresUtc=new Date(now+6*3600000).toISOString();
  if(Date.parse(expiresUtc)<start+3600000)
    fail("LOGIN_EXPIRES_BEFORE_STOP");
  return {expectedHead,startUtc,expiresUtc,
    maximumProviderRequests:0,automaticActivation:false,
    environment:ENVIRONMENT};
}
function cli(argv:string[]){
  if(argv.length!==6)fail("CLI");
  const m=new Map<string,string>();
  for(let i=0;i<argv.length;i+=2){
    if(!argv[i]?.startsWith("--")||!argv[i+1]||m.has(argv[i]))
      fail("CLI");
    m.set(argv[i],argv[i+1]);
  }
  if([...m.keys()].sort().join("|")!==
     ["--head","--start-utc","--confirm"].sort().join("|"))
    fail("CLI");
  return {head:m.get("--head")!,start:m.get("--start-utc")!,
    confirm:m.get("--confirm")!};
}
function gh(args:string[],stdin?:string){
  const result=spawnSync("gh",args,{encoding:"utf8",input:stdin,
    stdio:["pipe","pipe","pipe"],timeout:20000,maxBuffer:1048576});
  if(result.error||result.status!==0)fail("GITHUB_COMMAND");
  return result.stdout;
}
function assertProtectedEnvironment(){
  const account=JSON.parse(gh(["api","user"]));
  const info=JSON.parse(gh(["api",`repos/${REPO}`]));
  if(account.login!==OWNER||!Number.isSafeInteger(account.id)||
     info.private!==false||info.permissions?.admin!==true)
    fail("GITHUB_OWNER");
  const config=JSON.parse(gh(["api",`repos/${REPO}/environments/${ENVIRONMENT}`]));
  const review=(config.protection_rules??[]).find(
    (x:any)=>x.type==="required_reviewers");
  const reviewerMatch=(review?.reviewers??[]).some((x:any)=>
    x.type==="User"&&x.reviewer?.id===account.id);
  if(!reviewerMatch||config.deployment_branch_policy?.custom_branch_policies!==true)
    fail("GITHUB_PROTECTION");
  const branches=JSON.parse(gh([
    "api",`repos/${REPO}/environments/${ENVIRONMENT}/deployment-branch-policies`
  ])).branch_policies??[];
  if(branches.length!==1||branches[0].name!=="main")
    fail("GITHUB_BRANCH_RESTRICTION");
}
async function main(){
  const args=cli(process.argv.slice(2));
  const plan=planGate05SafetyCredentialRotationV39(
    Date.now(),args.start,args.head,args.confirm
  );
  if(!process.env.DATABASE_URL)fail("ADMIN_DB_MISSING");
  if(execFileSync("git",["rev-parse","HEAD"],{
    encoding:"utf8",stdio:["ignore","pipe","ignore"]
  }).trim()!==plan.expectedHead)fail("RELEASE_SOURCE_MISMATCH");
  const fetched=gh(["api",`repos/${REPO}/git/ref/heads/main`]);
  if(JSON.parse(fetched).object?.sha!==plan.expectedHead)
    fail("MAIN_MOVED");
  assertProtectedEnvironment();

  const admin=new pg.Client({connectionString:process.env.DATABASE_URL,
    connectionTimeoutMillis:7000,statement_timeout:10000,
    query_timeout:13000,lock_timeout:2000,
    application_name:"gate05_safety_only_credential_rotation"});
  const name="gate05_fids_safety_login_"+
    new Date().toISOString().slice(0,10).replaceAll("-","")+"_"+
    randomBytes(5).toString("hex");
  const password=randomBytes(32).toString("hex");
  const expiry=plan.expiresUtc;
  const options:{connected:boolean;tx:boolean;committed:boolean;
    verified:boolean;uploaded:string[]}={
    connected:false,tx:false,committed:false,
    verified:false,uploaded:[]
  };
  try{
    await admin.connect(); options.connected=true;
    await admin.query("BEGIN");options.tx=true;
    const db=(await admin.query(
      "SELECT current_database() AS db,current_user AS who,"+
      "pg_is_in_recovery() AS replica,"+
      "current_setting('transaction_read_only') AS ro"
    )).rows[0];
    if(db?.db!=="neondb"||db?.who!=="neondb_owner"||
       db.replica!==false||db.ro!=="off")fail("ADMIN_DATABASE_IDENTITY");
    const counts=(await admin.query(
      "SELECT "+
      "(SELECT count(*)::int FROM clean.gate05_fids_pilot_scope_v39 "+
      " WHERE state IN ('PREPARED','ACTIVE')) AS open_scopes,"+
      "(SELECT count(*)::int FROM clean.gate05_fids_attempt_v39) AS attempts,"+
      "(SELECT count(*)::int FROM clean.gate05_fids_commission_permit_v39 "+
      " WHERE consumed_at_utc IS NULL AND revoked_at_utc IS NULL) AS unused_permits"
    )).rows[0];
    if(Object.values(counts).some(n=>n!==0))fail("OPEN_PILOT_OR_PERMIT");
    const group=(await admin.query(
      "SELECT rolcanlogin FROM pg_roles WHERE rolname=$1",[GROUP]
    )).rows;
    if(group.length!==1||group[0].rolcanlogin!==false)
      fail("NOLOGIN_GROUP");
    const oids:Record<string,string>={};
    for(const [action,sig] of Object.entries(FN)){
      const q=(await admin.query(
        "SELECT to_regprocedure($1)::oid::text AS oid",[sig]
      )).rows[0];
      if(!q?.oid)fail("FUNCTION_NOT_INSTALLED_"+action);
      oids[action]=q.oid;
    }
    if((await admin.query(
      "SELECT count(*)::int AS n FROM pg_roles WHERE rolname=$1",
      [name]
    )).rows[0].n!==0)fail("LOGIN_NAME_COLLISION");
    // Internally generated restricted ASCII identifiers / hex secret only.
    await admin.query(
      `CREATE ROLE "${name}" LOGIN NOINHERIT NOSUPERUSER `+
      "NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS "+
      `PASSWORD '${password}' VALID UNTIL '${expiry}'`
    );
    await admin.query(
      `GRANT "${GROUP}" TO "${name}" `+
      "WITH ADMIN FALSE, INHERIT FALSE, SET TRUE"
    );
    await admin.query("COMMIT");options.tx=false;options.committed=true;
    console.log("GATE05_SAFETY_ROLE_COMMITTED",JSON.stringify({
      role:name,expiresAtUtc:expiry,providerRequests:0,activated:false
    }));

    const url=new URL(process.env.DATABASE_URL);
    url.username=name; url.password=password;
    url.searchParams.delete("uselibpqcompat");
    url.searchParams.set("sslmode","verify-full");
    const client=new pg.Client({connectionString:url.toString(),
      connectionTimeoutMillis:7000,statement_timeout:8000,
      query_timeout:10000,lock_timeout:2000});
    let connected=false;
    try{
      await client.connect();connected=true;
      await client.query("BEGIN READ ONLY");
      const who=(await client.query(
        "SELECT session_user AS who,current_database() AS db"
      )).rows[0];
      if(who?.who!==name||who.db!=="neondb")
        fail("RESTRICTED_LOGIN_AUTH");
      const before=(await client.query(
        "SELECT has_function_privilege(current_user,$1::oid,'EXECUTE') AS value",
        [oids.stop]
      )).rows[0];
      if(before.value!==false)fail("INHERITED_STOP");
      await client.query(`SET LOCAL ROLE "${GROUP}"`);
      const active=(await client.query(
        "SELECT current_user AS who"
      )).rows[0].who;
      if(active!==GROUP)fail("SAFETY_SET_ROLE");
      for(const [action,oid] of Object.entries(oids)){
        const has=(await client.query(
          "SELECT has_function_privilege(current_user,$1::oid,'EXECUTE') AS value",
          [oid]
        )).rows[0].value;
        if(has!==(action==="stop"))fail("EXCLUSIVE_FUNCTION_RIGHT_"+action);
      }
      for(const table of ["gate05_fids_pilot_scope_v39",
        "gate05_fids_allowed_query_v39",
        "gate05_fids_attempt_v39",
        "gate05_fids_commission_permit_v39"]){
        const q=(await client.query(
          "SELECT has_table_privilege(current_user,c.oid,'UPDATE') AS value "+
          "FROM pg_catalog.pg_class c "+
          "JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace "+
          "WHERE n.nspname='clean' AND c.relname=$1",[table]
        )).rows;
        if(q.length!==1||q[0].value!==false)
          fail("NO_DIRECT_TABLE_UPDATES");
      }
      await client.query("ROLLBACK");
      options.verified=true;
    }finally{
      if(connected){
        await client.query("ROLLBACK").catch(()=>{});
        await client.end().catch(()=>{});
      }
    }
    // Environment was verified before role creation, then checked again.
    assertProtectedEnvironment();
    const upload=(secret:string,value:string)=>{
      gh(["secret","set",secret,"--env",ENVIRONMENT,
        "--repo",REPO],value);
      options.uploaded.push(secret);
    };
    upload("GATE05_SAFETY_DATABASE_URL",url.toString());
    upload("GATE05_EXPECTED_DB_HOST",url.hostname);
    console.log("GATE05_SAFETY_GITHUB_SECRET_ROTATED",JSON.stringify({
      environment:ENVIRONMENT,role:name,expiresAtUtc:expiry,
      restrictedLoginVerified:options.verified,
      secretsUploaded:options.uploaded,
      providerRequests:0,scopeActive:false,
      workflowDispatched:false,alertAttested:false
    }));
  }catch(err){
    const message=err instanceof Error?err.message:"";
    console.error("GATE05_SAFETY_ROTATE_HOLD",JSON.stringify({
      stage:!options.committed?"BEFORE_ROLE_COMMIT":
        !options.verified?"AFTER_ROLE_COMMIT_BEFORE_VERIFICATION":
        "AFTER_VERIFICATION",
      roleCommitted:options.committed,
      restrictedVerified:options.verified,
      secretNamesUploaded:options.uploaded,
      reason:message.startsWith("GATE05_SAFETY_PROVISION_HOLD_")?
        message:"OPERATOR_REVIEW_REQUIRED",
      providerRequests:0,scopeActive:false
    }));
    process.exitCode=2;
  }finally{
    if(options.tx)await admin.query("ROLLBACK").catch(()=>{});
    if(options.connected)await admin.end().catch(()=>{});
  }
}
if(import.meta.url===`file://${process.argv[1]}`){
  main().catch(err=>{
    const message=err instanceof Error?err.message:"";
    console.error("GATE05_SAFETY_PRECHECK_HOLD",JSON.stringify({
      reason:message.startsWith("GATE05_SAFETY_PROVISION_HOLD_")?
        message:"OPERATOR_REVIEW_REQUIRED",providerRequests:0
    }));
    process.exitCode=2;
  });
}
