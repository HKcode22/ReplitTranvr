/**
 * Gate05 owner production credential issuer — exactly THREE non-safety roles.
 *
 * Manual OWNER-approved PostgreSQL role WRITE. No permit, auth, scope,
 * activation, dispatch, STOP, webhook, provider GET or GitHub mutation.
 * Must run in the same supervised operator session as the future auth flow.
 *
 * Writes short-lived restricted URLs only to an already-created 0700 PRIVATE
 * temp directory (0600 file), never prints or commits passwords. The file
 * is needed for later commissioning/activation/dispatch in the SAME session.
 *
 * WARNING: if the transaction COMMIT succeeds but later verification fails,
 * do not rerun blindly; report COMMITTED_PARTIAL and inspect role state.
 */
import "dotenv/config";
import pg from "pg";
import {randomBytes} from "node:crypto";
import {execFileSync,spawnSync} from "node:child_process";
import {statSync,writeFileSync,realpathSync} from "node:fs";
import {join,isAbsolute} from "node:path";

const HEAD=/^[a-f0-9]{40}$/;
const CONFIRM="ISSUE_G05_THREE_RESTRICTED_LOGINS_NO_PROVIDER";
const OWNER="HKcode22";
const REPO="HKcode22/ReplitTranvr";
const GROUPS={
  commission:"gate05_fids_commission_v39",
  activate:"gate05_fids_activate_v39",
  dispatch:"gate05_fids_dispatch_v39"
} as const;
const FUNCTIONS={
  commission:"clean.prepare_gate05_permitted_scope_v39(uuid,text)",
  activate:"clean.activate_gate05_prepared_scope_v39(uuid,text)",
  dispatch:"clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)",
  safety:"clean.stop_gate05_fids_pilot_v39(uuid,text)"
} as const;
type Action=keyof typeof GROUPS;
const actions=Object.keys(GROUPS) as Action[];
const functionalActions=Object.keys(FUNCTIONS) as (keyof typeof FUNCTIONS)[];
const hold=(code:string):never=>{throw Error("GATE05_OPERATOR_ISSUE_HOLD_"+code);};

export function planGate05ThreeLoginIssueV39(
  now:number,startUtc:string,head:string,confirm:string
){
  if(!HEAD.test(head)||confirm!==CONFIRM)hold("EXACT_SOURCE_OR_CONFIRM");
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(startUtc))
    hold("START_FORMAT");
  const start=Date.parse(startUtc);
  if(!Number.isSafeInteger(now)||!Number.isSafeInteger(start)||
     new Date(start).toISOString()!==startUtc||
     start%(15*60000)!==0)hold("START_FORMAT");
  if(start-now<2*3600000||start-now>5*3600000)
    hold("MUST_ISSUE_2_TO_5_HOURS_BEFORE_START");
  const expiresUtc=new Date(now+6*3600000).toISOString();
  if(Date.parse(expiresUtc)<start+3600000)
    hold("EXPIRY_NOT_COVERING_TERMINAL_STOP");
  return {startUtc,head,expiresUtc,
    roles:["commission","activate","dispatch"] as const,
    providerRequests:0 as const,scopeMutations:0 as const,
    automaticActivation:false as const};
}
function gh(args:string[]):any{
  const out=spawnSync("gh",args,{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],
    timeout:15000,maxBuffer:1024*1024
  });
  if(out.status!==0||out.error)hold("GITHUB_METADATA");
  try{return JSON.parse(out.stdout);}catch{return hold("GITHUB_PARSE");}
}
function cli(argv:string[]){
  if(argv.length!==8)hold("CLI");
  const m=new Map<string,string>();
  for(let i=0;i<argv.length;i+=2){
    if(!argv[i]?.startsWith("--")||!argv[i+1]||m.has(argv[i]))
      hold("CLI");
    m.set(argv[i],argv[i+1]);
  }
  if([...m.keys()].sort().join("|")!==
     ["--head","--start-utc","--private-dir","--confirm"].sort().join("|"))
    hold("CLI");
  return {head:m.get("--head")!,start:m.get("--start-utc")!,
    dir:m.get("--private-dir")!,confirm:m.get("--confirm")!};
}
function assertPrivateDir(dir:string){
  if(!isAbsolute(dir)||dir.length>900||dir.includes("\0"))
    hold("PRIVATE_PATH");
  const resolved=realpathSync(dir);
  const st=statSync(resolved);
  if(!st.isDirectory()||(st.mode&0o077)!==0||
     resolved.includes("/workspace/")||
     resolved.endsWith("/workspace")||
     !resolved.startsWith("/tmp/"))
    hold("PRIVATE_DIRECTORY_NOT_TEMP_0700");
  return resolved;
}
async function execute(){
  const input=cli(process.argv.slice(2));
  const plan=planGate05ThreeLoginIssueV39(
    Date.now(),input.start,input.head,input.confirm
  );
  const root=assertPrivateDir(input.dir);
  const output=join(root,"restricted-operator-logins.json");
  // Reject reusing a partially committed role state or credential path.
  try{statSync(output);hold("OUTPUT_ALREADY_EXISTS");}
  catch(e){if(e instanceof Error && e.message.startsWith(
    "GATE05_OPERATOR_ISSUE_HOLD_"))throw e;
    if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;
  }
  const head=execFileSync("git",["rev-parse","HEAD"],{
    encoding:"utf8",stdio:["ignore","pipe","ignore"]
  }).trim();
  if(head!==plan.head)hold("LOCAL_SOURCE");
  const main=gh(["api","repos/"+REPO+"/git/ref/heads/main"]);
  const account=gh(["api","user"]);
  const repo=gh(["api","repos/"+REPO]);
  if(main.object?.sha!==plan.head||account.login!==OWNER||
     repo.permissions?.admin!==true)hold("GITHUB_OWNER_OR_SOURCE");
  const raw=process.env.DATABASE_URL;
  if(!raw)hold("ADMIN_DATABASE_URL");
  const admin=new pg.Client({connectionString:raw,
    connectionTimeoutMillis:7000,statement_timeout:10000,
    query_timeout:13000,lock_timeout:2500,
    application_name:"gate05_issue_three_restricted_logins"});
  const startMoment=new Date();
  const stamp=startMoment.toISOString().replace(/[-:]/g,"");
  const suffix=randomBytes(4).toString("hex");
  const names={} as Record<Action,string>;
  const passwords={} as Record<Action,string>;
  for(const action of actions){
    names[action]="gate05_fids_"+action+"_login_"+
      stamp.slice(0,8)+"_"+stamp.slice(9,15)+"_"+suffix;
    passwords[action]=randomBytes(32).toString("hex");
    if(names[action].length>63)hold("IDENTIFIER_LENGTH");
  }
  const oids={} as Record<keyof typeof FUNCTIONS,string>;
  const saved={
    schema:"v39.gate05.private-three-operator-logins.v1",
    sourceCommit:plan.head,executionStartUtc:plan.startUtc,
    expiresUtc:plan.expiresUtc,
    urls:{} as Record<Action,string>
  };
  const adminUrl=new URL(raw);
  for(const action of actions){
    const u=new URL(adminUrl.toString());
    u.username=names[action];u.password=passwords[action];
    u.searchParams.delete("uselibpqcompat");
    u.searchParams.set("sslmode","verify-full");
    saved.urls[action]=u.toString();
  }
  let connected=false,tx=false,committed=false,fileSaved=false;
  const verified:Action[]=[];
  try{
    await admin.connect();connected=true;
    await admin.query("BEGIN");tx=true;
    const db=(await admin.query(
      "SELECT current_database() AS db,current_user AS who,"+
      "pg_is_in_recovery() AS replica,"+
      "current_setting('transaction_read_only') AS ro"
    )).rows[0];
    if(db?.db!=="neondb"||db?.who!=="neondb_owner"||
       db.replica!==false||db.ro!=="off")hold("WRONG_DATABASE");
    const count=(await admin.query(
      "SELECT "+
      "(SELECT count(*)::int FROM clean.gate05_fids_pilot_scope_v39 "+
      " WHERE state IN ('PREPARED','ACTIVE')) AS open,"+
      "(SELECT count(*)::int FROM clean.gate05_fids_commission_permit_v39 "+
      " WHERE consumed_at_utc IS NULL AND revoked_at_utc IS NULL) AS pending"
    )).rows[0];
    if(count.open!==0||count.pending!==0)hold("OPEN_SCOPE_OR_PERMIT");
    for(const action of functionalActions){
      const oid=(await admin.query(
        "SELECT to_regprocedure($1)::oid::text AS oid",
        [FUNCTIONS[action]])).rows[0]?.oid;
      if(!oid)hold("FUNCTION_"+action);
      oids[action]=oid;
    }
    for(const action of actions){
      const group=GROUPS[action];
      const roles=(await admin.query(
        "SELECT rolcanlogin,rolinherit,rolsuper,rolcreaterole "+
        "FROM pg_roles WHERE rolname=$1",[group])).rows;
      if(roles.length!==1||roles[0].rolcanlogin||
         roles[0].rolinherit||roles[0].rolsuper||
         roles[0].rolcreaterole)hold("NOLOGIN_GROUP_"+action);
      for(const fn of functionalActions){
        const allowed=(await admin.query(
          "SELECT has_function_privilege($1,$2::oid,'EXECUTE') AS x",
          [group,oids[fn]])).rows[0].x;
        if(allowed!==(fn===action))hold("FUNCTION_ACL_"+action+"_"+fn);
      }
      const n=names[action];
      if(!/^gate05_fids_[a-z]+_login_[0-9_]+_[a-f0-9]+$/.test(n))
        hold("LOGIN_IDENTIFIER");
      await admin.query(
        'CREATE ROLE "'+n+'" LOGIN NOINHERIT NOSUPERUSER '+
        'NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS '+
        "PASSWORD '"+passwords[action]+"' VALID UNTIL '"+
        plan.expiresUtc+"'"
      );
      await admin.query('GRANT "'+group+'" TO "'+n+
        '" WITH ADMIN FALSE, INHERIT FALSE, SET TRUE');
      // Explicit, narrowly scoped CONNECT avoids dependence on a
      // deployment-specific PUBLIC CONNECT grant.
      await admin.query('GRANT CONNECT ON DATABASE "neondb" TO "'+n+'"');
    }
    // Write PRIVATE credentials before COMMIT: if file write fails, no roles.
    writeFileSync(output,JSON.stringify(saved)+"\n",{
      flag:"wx",mode:0o600
    });fileSaved=true;
    await admin.query("COMMIT");tx=false;committed=true;
    console.log("GATE05_THREE_LOGIN_GROUPS_COMMITTED",JSON.stringify({
      roleNames:names,expiresAtUtc:plan.expiresUtc,
      providerRequests:0,scopeMutations:0
    }));
    for(const action of actions){
      const client=new pg.Client({connectionString:saved.urls[action],
        connectionTimeoutMillis:7000,statement_timeout:8000,
        query_timeout:10000,lock_timeout:2000});
      let ready=false;
      try{
        await client.connect();ready=true;
        await client.query("BEGIN READ ONLY");
        const identity=(await client.query(
          "SELECT current_database() AS db,session_user AS login,"+
          "current_user AS active"
        )).rows[0];
        if(identity.db!=="neondb"||identity.login!==names[action]||
           identity.active!==names[action])hold("LOGIN_AUTH_"+action);
        await client.query('SET LOCAL ROLE "'+GROUPS[action]+'"');
        const active=(await client.query(
          "SELECT current_user AS role"
        )).rows[0]?.role;
        if(active!==GROUPS[action])hold("SET_ROLE_"+action);
        for(const fn of functionalActions){
          const allowed=(await client.query(
            "SELECT has_function_privilege(current_user,$1::oid,"+
            "'EXECUTE') AS x",[oids[fn]])).rows[0].x;
          if(allowed!==(fn===action))hold("EXCLUSIVE_"+action+"_"+fn);
        }
        verified.push(action);
      }finally{
        if(ready){
          await client.query("ROLLBACK").catch(()=>{});
          await client.end().catch(()=>{});
        }
      }
    }
    console.log("GATE05_THREE_AUTHENTICATED_LOGINS_VERIFIED",JSON.stringify({
      roleNames:names,verified,credentialFile:output,
      expiryUtc:plan.expiresUtc,providerRequests:0,
      permitInserted:false,scopePrepared:false,
      scopeActivated:false,stopArmed:false
    }));
  }catch(error){
    const msg=error instanceof Error?error.message:"";
    console.error("GATE05_THREE_LOGIN_ISSUER_HOLD",JSON.stringify({
      stage:committed?"AFTER_ROLE_COMMIT":"BEFORE_ROLE_COMMIT",
      roleCommit:committed,privateFileCreated:fileSaved,
      rolesVerified:verified,
      credentialPath:fileSaved?output:null,
      reason:msg.startsWith("GATE05_OPERATOR_ISSUE_HOLD_")?
        msg:"MANUAL_OPERATOR_INVESTIGATION_REQUIRED",
      noBlindRetry:true,providerRequests:0
    }));
    process.exitCode=2;
  }finally{
    if(tx)await admin.query("ROLLBACK").catch(()=>{});
    if(connected)await admin.end().catch(()=>{});
  }
}
if(import.meta.url==="file://"+process.argv[1]){
  execute().catch(err=>{
    console.error("GATE05_THREE_LOGIN_PRECHECK_HOLD",JSON.stringify({
      reason:err instanceof Error && err.message.startsWith(
        "GATE05_OPERATOR_ISSUE_HOLD_")?err.message:
        "MANUAL_OPERATOR_INVESTIGATION_REQUIRED",
      providerRequests:0,scopeMutations:0
    }));
    process.exitCode=2;
  });
}
