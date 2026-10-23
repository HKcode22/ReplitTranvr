/**
 * Gate4 one-time ownership-binding writer commissioning, NOT a trial runner.
 * DRAFT ONLY. Defaults to --plan (READ ONLY). --apply requires separate
 * owner approval for production DB role CREATE/GRANT and exact sealed source.
 * NEVER contacts AeroDataBox, the callback receiver, or GitHub Actions.
 *
 * Role is a temporary INSERT+SELECT V0072 ONLY credential, not ownership
 * proof. It does not authorize provider CREATE/DELETE or make STOP armed.
 * Future exact trial writer adapter MUST validate the independent signed
 * receipt + trusted anchor before using it; revoke after custody handoff.
 */
import {randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {writeFileSync,existsSync,statSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath,pathToFileURL} from "node:url";
import pg from "pg";

const ROLE="gate4_owner_writer_20261023";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const DIR=join(homedir(),".config","replittranvr","gate4-owner-20261022");
const FILE=join(DIR,"writer-20261023.json");
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const ICAO=/^[A-Z]{4}$/;
const TABLE="clean.gate4_alert_owned_binding_v39";
const CONFIRM="COMMISSION_ONE_SHOT_V0072_WRITER_NO_PROVIDER";
const REVOKE_CONFIRM="DISABLE_ONE_SHOT_V0072_WRITER_NO_PROVIDER";
const err=(code:string):never=>{throw Error("GATE4_WRITER_"+code+"_HOLD");};
type Facts={
 db:string;owner:string;canCreateRole:boolean;schemaCreate:boolean;
 superuser:boolean;tableExists:boolean;ownedRows:number;writerExists:boolean;
 rlsEnabled:boolean;policyCount:number;
};
async function facts(c:pg.Client):Promise<Facts>{
 const z=(await c.query(
  "SELECT current_database() AS db,current_user AS owner,"+
  "(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS can_role,"+
  "(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser,"+
  "has_schema_privilege(current_user,'clean','CREATE') AS can_ddl,"+
  "(to_regclass('clean.gate4_alert_owned_binding_v39') IS NOT NULL) AS has_table,"+
  "(SELECT count(*)::int FROM pg_roles WHERE rolname=$1) AS num_roles",
  [ROLE]
 )).rows[0];
 let count=-1,rlsEnabled=false,policyCount=-1;
 if(z.has_table){
  count=(await c.query(
   "SELECT count(*)::int AS n FROM clean.gate4_alert_owned_binding_v39"
  )).rows[0].n;
  rlsEnabled=(await c.query(
   "SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass",
   [TABLE]
  )).rows[0].relrowsecurity;
  policyCount=(await c.query(
   "SELECT count(*)::int AS n FROM pg_policies "+
   "WHERE schemaname='clean' AND tablename='gate4_alert_owned_binding_v39'"
  )).rows[0].n;
 }
 return {db:z.db,owner:z.owner,canCreateRole:z.can_role,
  schemaCreate:z.can_ddl,superuser:z.superuser,
  tableExists:z.has_table,ownedRows:count,writerExists:z.num_roles!==0,
  rlsEnabled,policyCount};
}
function approvedOwner(x:Facts,ownerUrl:string,receiverUrl:string):boolean{
 try{
  const a=new URL(ownerUrl),b=new URL(receiverUrl);
  const target=(u:URL)=>u.hostname.replace("-pooler.",".")+
    ":"+(u.port||"5432")+u.pathname;
  return target(a)===target(b)&&x.db==="neondb"&&
    x.canCreateRole===true&&x.superuser===false&&
    x.tableExists===true&&x.ownedRows===0&&!x.writerExists&&
    x.rlsEnabled===false&&x.policyCount===0&&
    x.owner===decodeURIComponent(a.username)&&
    x.owner!==decodeURIComponent(b.username);
 }catch{return false;}
}
async function run(){
 const mode=process.argv[2];
 if(process.argv.length!==3||!["--plan","--apply","--revoke"].includes(mode))
   err("USAGE");
 const expected=process.env.GATE4_WRITER_REVIEWED_SOURCE_SHA??"";
 if(!SHA.test(expected))err("REVIEWED_SHA_MISSING");
 const head=execFileSync("git",["-C",ROOT,"rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]
 }).trim();
 if(head!==expected)err("WRONG_SOURCE");
 const ownerUrl=process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"";
 const receiverUrl=process.env.V39_DATABASE_RUNTIME_URL??"";
 if(!ownerUrl||!receiverUrl)err("OWNER_OR_RUNTIME_URL_MISSING");
 const c=new pg.Client({
  connectionString:ownerUrl,
  connectionTimeoutMillis:6000,query_timeout:12000,
  statement_timeout:12000,application_name:"gate4_one_shot_writer_commission"
 });
 let tx=false;
 let credentialPrepared=false;
 try{
  await c.connect();
  await c.query("BEGIN TRANSACTION READ ONLY");
  tx=true;
  const initial=await facts(c);
  // Revocation is independently authorized and does not require zero rows:
  // it must remain available AFTER actual provider CREATE/STOP settlement.
  if(mode==="--revoke"){
    const u=new URL(ownerUrl),v=new URL(receiverUrl);
    const same=(x:URL)=>x.hostname.replace("-pooler.",".")+
      ":"+(x.port||"5432")+x.pathname;
    if(initial.db!=="neondb"||initial.superuser!==false||
       initial.owner!==decodeURIComponent(u.username)||
       initial.owner===decodeURIComponent(v.username)||
       same(u)!==same(v)||!initial.writerExists)
      err("REVOKE_PRODUCTION_IDENTITY_OR_ROLE_HOLD");
    await c.query("ROLLBACK");tx=false;
    if(process.env.GATE4_WRITER_REVOKE_CONFIRM!==REVOKE_CONFIRM)
      err("REVOKE_EXPLICIT_CONFIRM_MISSING");
    await c.query("BEGIN");tx=true;
    await c.query("SELECT pg_advisory_xact_lock(3904,20261023)");
    // Removing writer policies does NOT remove reader SELECT policy.
    await c.query("DROP POLICY IF EXISTS gate4_writer_select_20261023 ON "+TABLE);
    await c.query("DROP POLICY IF EXISTS gate4_writer_insert_20261023 ON "+TABLE);
    await c.query("REVOKE SELECT,INSERT ON TABLE "+
      "clean.gate4_alert_owned_binding_v39 FROM "+ROLE);
    await c.query("REVOKE USAGE ON SCHEMA clean FROM "+ROLE);
    await c.query("REVOKE CONNECT ON DATABASE neondb FROM "+ROLE);
    await c.query("ALTER ROLE "+ROLE+" NOLOGIN");
    const check=(await c.query(
      "SELECT has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','SELECT') AS r,"+
      "has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','INSERT') AS w,"+
      "(SELECT rolcanlogin FROM pg_roles WHERE rolname=$1) AS login",
      [ROLE]
    )).rows[0];
    if(check.r!==false||check.w!==false||check.login!==false)
      err("REVOKE_INCOMPLETE");
    await c.query("COMMIT");tx=false;
    console.log(JSON.stringify({
      status:"GATE4_WRITER_DISABLED_AND_GRANTS_REVOKED",
      role:ROLE,providerRequests:0,dbOwnerMutationOnly:true
    }));
    return;
  }
  if(!approvedOwner(initial,ownerUrl,receiverUrl))
    err("PRODUCTION_OWNER_OR_EMPTY_BINDINGS_NOT_VERIFIED");
  await c.query("ROLLBACK");tx=false;
  console.log(JSON.stringify({
   status:"GATE4_WRITER_OWNER_PLAN_PASS",reviewedHead:head,
   existingOwnedRows:0,newRoleNeeded:true,
   providerRequests:0,productionWrites:mode==="--apply",
   stopArmed:false
  }));
  if(mode!=="--apply")return;
  if(process.env.GATE4_WRITER_APPLY_CONFIRM!==CONFIRM)
    err("EXPLICIT_APPLY_CONFIRMATION_MISSING");
  // This writer MUST be database-scoped to one independent approved trial.
  // No broad INSERT grant is permitted without exact source/AUTH/ICAO/UUID.
  const scope=process.env.GATE4_WRITER_APPROVED_SCOPE_ID??"";
  const auth=process.env.GATE4_WRITER_APPROVED_AUTH_SHA256??"";
  const source=process.env.GATE4_WRITER_APPROVED_MAIN_SHA??"";
  const icao=process.env.GATE4_WRITER_APPROVED_AIRPORT_ICAO??"";
  if(!UUID.test(scope)||!HASH.test(auth)||!SHA.test(source)||
     !ICAO.test(icao))
    err("INDEPENDENT_APPROVED_TRIAL_SCOPE_REQUIRED");
  // These pins must originate in a separately reviewed Gate4 trial
  // authorization, not in a webhook or CREATE payload.
  if(existsSync(FILE))err("PRIVATE_CREDENTIAL_ALREADY_EXISTS");
  const parent=statSync(DIR);
  if((parent.mode&0o077)!==0)err("PRIVATE_DIR_PERMISSIONS");
  const password=randomBytes(40).toString("hex");
  const expiry=new Date(Date.now()+24*60*60*1000).toISOString();
  const scoped=new URL(ownerUrl);
  scoped.username=ROLE;scoped.password=password;
  scoped.searchParams.set("sslmode","verify-full");
  // Existing private credential is created before transactional commit:
  // an uncertain COMMIT must be reconciled, not automatically retried.
  writeFileSync(FILE,JSON.stringify({
   schema:"v39.gate4.one-shot-writer-credential.v1",
   reviewedSource:head,role:ROLE,expiresUtc:expiry,
   approvedMain:source,approvedScope:scope,approvedAuth:auth,approvedIcao:icao,
   writerUrl:scoped.toString(),
   warning:"PRIVATE. No repo/chat/CI. Revoke after one exact scope."
  },null,2)+"\n",{flag:"wx",mode:0o600});
  credentialPrepared=true;
  await c.query("BEGIN");tx=true;
  await c.query("SELECT pg_advisory_xact_lock(3904,20261023)");
  const recheck=await facts(c);
  if(!approvedOwner(recheck,ownerUrl,receiverUrl))
    err("RACE_OR_SCOPE_CHANGED");
  // Only static, code-reviewed identifier. Password is 80 lower-case hex.
  if(!/^[a-f0-9]{80}$/.test(password))err("INTERNAL_SECRET_FORMAT");
  await c.query("CREATE ROLE "+ROLE+
   " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
   "NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1 PASSWORD '"+password+
   "' VALID UNTIL '"+expiry+"'");
  await c.query("GRANT CONNECT ON DATABASE neondb TO "+ROLE);
  await c.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  // Enable one-table RLS atomically with these three narrow policies.
  // The already-restricted GitHub safety reader must retain SELECT,
  // while this writer can only see/INSERT the ONE approved UUID/AUTH/source.
  const predicate="scope_id='"+scope+"'::uuid"+
    " AND authorization_sha256='"+auth+"'"+
    " AND source_commit='"+source+"'"+
    " AND airport_icao='"+icao+"'";
  await c.query("ALTER TABLE "+TABLE+" ENABLE ROW LEVEL SECURITY");
  await c.query(
    "CREATE POLICY gate4_safety_select_v39 ON "+TABLE+
    " FOR SELECT TO gate4_safety_reader_20261022 USING (true)"
  );
  await c.query(
    "CREATE POLICY gate4_writer_select_20261023 ON "+TABLE+
    " FOR SELECT TO "+ROLE+" USING ("+predicate+")"
  );
  await c.query(
    "CREATE POLICY gate4_writer_insert_20261023 ON "+TABLE+
    " FOR INSERT TO "+ROLE+" WITH CHECK ("+predicate+")"
  );
  await c.query(
   "GRANT SELECT,INSERT ON TABLE "+TABLE+" TO "+ROLE
  );
  const rowPolicy=(await c.query(
    "SELECT c.relrowsecurity AS enabled,"+
    "(SELECT count(*)::int FROM pg_policies WHERE schemaname='clean' "+
      "AND tablename='gate4_alert_owned_binding_v39') AS policy_count "+
    "FROM pg_class c WHERE c.oid=$1::regclass",[TABLE]
  )).rows[0];
  if(rowPolicy?.enabled!==true||rowPolicy.policy_count!==3)
    err("SCOPED_RLS_NOT_INSTALLED");
  const p=(await c.query(
   "SELECT has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','SELECT') AS r,"+
   "has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','INSERT') AS w,"+
   "has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','UPDATE') AS u,"+
   "has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','DELETE') AS d,"+
   "has_table_privilege($1,'clean.gate4_alert_prebind_original_v39','SELECT') AS raw,"+
   "(SELECT rolcreaterole OR rolsuper OR rolcreatedb OR rolbypassrls "+
   "FROM pg_roles WHERE rolname=$1) AS privilege_escalation",
   [ROLE]
  )).rows[0];
  if(p.r!==true||p.w!==true||p.u!==false||p.d!==false||
     p.raw!==false||p.privilege_escalation!==false)
    err("SCOPED_GRANTS_UNVERIFIED");
  await c.query("COMMIT");tx=false;
  console.log(JSON.stringify({
   status:"GATE4_WRITER_ROLE_TEMPORARY_COMMISSIONED",
   role:ROLE,credentialStoredPrivate:true,
   writerRoleExpiryUtc:expiry,existingOwnedRows:0,
   providerRequests:0,providerMutations:0,paidAuthorization:false,
   independentlyArmedStop:false
  }));
 }catch(e){
  if(tx)await c.query("ROLLBACK").catch(()=>{});
  if(credentialPrepared)
   console.error("GATE4_WRITER_CREDENTIAL_RETAINED_FOR_MANUAL_RECONCILIATION");
  throw e;
 }finally{await c.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 void run().catch(e=>{
 const code=e instanceof Error?e.message:"";
 console.error(/^GATE4_WRITER_[A-Z0-9_]+_HOLD$/.test(code)?
  code:"GATE4_WRITER_UNVERIFIED_HOLD");
 process.exitCode=2;
 });
}
