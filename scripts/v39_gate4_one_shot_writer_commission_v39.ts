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
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";
import pg from "pg";

const ROLE="gate4_owner_writer_20261023";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const DIR=join(homedir(),".config","replittranvr","gate4-owner-20261022");
const FILE=join(DIR,"writer-20261023.json");
const SHA=/^[a-f0-9]{40}$/;
const CONFIRM="COMMISSION_ONE_SHOT_V0072_WRITER_NO_PROVIDER";
const err=(code:string):never=>{throw Error("GATE4_WRITER_"+code+"_HOLD");};
type Facts={
 db:string;owner:string;canCreateRole:boolean;schemaCreate:boolean;
 superuser:boolean;tableExists:boolean;ownedRows:number;writerExists:boolean;
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
 let count=-1;
 if(z.has_table)count=(await c.query(
  "SELECT count(*)::int AS n FROM clean.gate4_alert_owned_binding_v39"
 )).rows[0].n;
 return {db:z.db,owner:z.owner,canCreateRole:z.can_role,
  schemaCreate:z.can_ddl,superuser:z.superuser,
  tableExists:z.has_table,ownedRows:count,writerExists:z.num_roles!==0};
}
function approvedOwner(x:Facts,ownerUrl:string,receiverUrl:string):boolean{
 try{
  const a=new URL(ownerUrl),b=new URL(receiverUrl);
  const target=(u:URL)=>u.hostname.replace("-pooler.",".")+
    ":"+(u.port||"5432")+u.pathname;
  return target(a)===target(b)&&x.db==="neondb"&&
    x.canCreateRole===true&&x.superuser===false&&
    x.tableExists===true&&x.ownedRows===0&&!x.writerExists&&
    x.owner===decodeURIComponent(a.username)&&
    x.owner!==decodeURIComponent(b.username);
 }catch{return false;}
}
async function run(){
 const mode=process.argv[2];
 if(process.argv.length!==3||!["--plan","--apply"].includes(mode))
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
  if(existsSync(FILE))err("PRIVATE_CREDENTIAL_ALREADY_EXISTS");
  const parent=statSync(DIR);
  if((parent.mode&0o077)!==0)err("PRIVATE_DIR_PERMISSIONS");
  const password=randomBytes(40).toString("hex");
  const expiry=new Date(Date.now()+24*60*60*1000).toISOString();
  const owner=new URL(ownerUrl);
  const scoped=new URL(ownerUrl);
  scoped.username=ROLE;scoped.password=password;
  scoped.searchParams.set("sslmode","verify-full");
  // Existing private credential is created before transactional commit:
  // an uncertain COMMIT must be reconciled, not automatically retried.
  writeFileSync(FILE,JSON.stringify({
   schema:"v39.gate4.one-shot-writer-credential.v1",
   reviewedSource:head,role:ROLE,expiresUtc:expiry,
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
  await c.query(
   "GRANT SELECT,INSERT ON TABLE clean.gate4_alert_owned_binding_v39 TO "+ROLE
  );
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
void run().catch(e=>{
 const code=e instanceof Error?e.message:"";
 console.error(/^GATE4_WRITER_[A-Z0-9_]+_HOLD$/.test(code)?
  code:"GATE4_WRITER_UNVERIFIED_HOLD");
 process.exitCode=2;
});
