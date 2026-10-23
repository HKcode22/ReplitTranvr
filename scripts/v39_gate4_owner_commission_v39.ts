/**
 * GATE4 OWNER-COMMISSIONING ONLY. DRAFT source pending source-pinned CI.
 * Does NOT contact AeroDataBox, dispatch CREATE/DELETE, publish Replit,
 * merge GitHub, or start Phase6.
 *
 * --plan: READ-ONLY catalog checks.
 * --apply: one transaction creates two restricted login roles and staged
 *         V0071/V0072/V0073; verifies access and no prior rows.
 *         Requires owner-approved exact pin and explicit command flag.
 *
 * Secrets are saved outside the repository to $HOME/.config/replittranvr/
 * gate4-owner-20261022/credentials.json (mode 0600); NO URL/password
 * printed. Do NOT commit/share this file. Separate operator must install
 * the narrowly scoped resulting URLs as Replit/GitHub environment secrets.
 */
import "dotenv/config";
import {randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync,writeFileSync,mkdirSync,existsSync}
 from "node:fs";
import {dirname,join,resolve} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";
import pg from "pg";

const EXPECTED_CONFIRM="APPLY_GATE4_TABLES_AND_TWO_ROLES_NO_PROVIDER";
const RROLE="gate4_receiver_20261022";
const SROLE="gate4_safety_reader_20261022";
const names=[RROLE,SROLE];
const outdir=join(homedir(),".config","replittranvr","gate4-owner-20261022");
const outfile=join(outdir,"credentials.json");
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pin=/^[a-f0-9]{40}$/;
const fileNames=[
 "V0071__gate4_alert_prebind_quarantine_v39.sql",
 "V0072__gate4_owned_binding_v39.sql",
 "V0073__gate4_existing_neon_role_grants_v39.sql"
];
function fail(code:string):never{
 throw Error("GATE4_OWNER_COMMISSION_"+code+"_HOLD");
}
function normalized(s:string):string{
 const u=new URL(s);
 return u.hostname.replace("-pooler.",".")+":"+(u.port||"5432")+
   u.pathname;
}
function quotedPasswordForSql(pass:string):string{
 if(!/^[a-f0-9]{80}$/.test(pass))fail("PASSWORD_FORMAT");
 return "'"+pass+"'";
}
function strippedMigration(name:string):string{
 const source=readFileSync(join(root,"migrations","staged",name),"utf8");
 if(!source.includes("STAGED")||
    !/^\s*(?:--[^\n]*\n)*BEGIN;\s*/.test(source)||
    !/\bCOMMIT;\s*$/.test(source))
    fail("MIGRATION_FORMAT");
 const sql=source.replace(
   /^(\s*(?:--[^\n]*\n)*)BEGIN;\s*/,
   "$1"
 ).replace(/\bCOMMIT;\s*$/,"");
 if(/^\s*COMMIT;\s*$/m.test(sql)||/^\s*BEGIN;\s*$/m.test(sql))
   fail("NESTED_TRANSACTION");
 return sql;
}
function makeUrl(owner:string,role:string,password:string):string{
 const u=new URL(owner);u.username=role;u.password=password;
 u.searchParams.delete("uselibpqcompat");
 u.searchParams.set("sslmode","verify-full");
 return u.toString();
}
type Facts={db:string;admin:string;create:boolean;createRole:boolean;
 isSuper:boolean;beforeTables:number;existingRoles:number};
async function facts(db:pg.Client):Promise<Facts>{
 const x=(await db.query(
   "SELECT current_database() AS db,current_user AS admin,"+
   "has_schema_privilege(current_user,'clean','CREATE') AS allow_clean_create,"+
   "(SELECT rolcreaterole FROM pg_roles "+
   "WHERE rolname=current_user) AS create_role,"+
   "(SELECT rolsuper FROM pg_roles "+
   "WHERE rolname=current_user) AS super_user,"+
   "(SELECT count(*)::int FROM pg_roles "+
   "WHERE rolname=ANY($1::text[])) AS existing_roles,"+
   "(SELECT count(*)::int FROM (VALUES "+
   "(to_regclass('clean.gate4_alert_prebind_original_v39')),"+
   "(to_regclass('clean.gate4_alert_owned_binding_v39'))) v(obj) "+
   "WHERE obj IS NOT NULL) AS before_tables",
   [names]
 )).rows[0];
 return {db:x.db,admin:x.admin,create:x.allow_clean_create,
  createRole:x.create_role,isSuper:x.super_user,
  beforeTables:x.before_tables,existingRoles:x.existing_roles};
}
async function verifyGrants(db:pg.Client):Promise<void>{
 const x=(await db.query(
  "SELECT "+
  "has_table_privilege($1,"+
    "'clean.gate4_alert_prebind_original_v39','SELECT') AS rr,"+
  "has_table_privilege($1,"+
    "'clean.gate4_alert_prebind_original_v39','INSERT') AS rw,"+
  "has_table_privilege($1,"+
    "'clean.gate4_alert_prebind_original_v39','UPDATE') AS ru,"+
  "has_table_privilege($1,"+
    "'clean.gate4_alert_prebind_original_v39','DELETE') AS rd,"+
  "has_table_privilege($1,"+
    "'clean.gate4_alert_owned_binding_v39','SELECT') AS ro,"+
  "has_table_privilege($2,"+
    "'clean.gate4_alert_owned_binding_v39','SELECT') AS so,"+
  "has_table_privilege($2,"+
    "'clean.gate4_alert_owned_binding_v39','INSERT') AS sw,"+
  "has_table_privilege($2,"+
    "'clean.gate4_alert_prebind_original_v39','SELECT') AS sr,"+
  "(SELECT COUNT(*)::int FROM clean.gate4_alert_prebind_original_v39) AS raws,"+
  "(SELECT COUNT(*)::int FROM clean.gate4_alert_owned_binding_v39) AS owners",
  names
 )).rows[0];
 if(x.rr!==true||x.rw!==true||x.ru!==false||x.rd!==false||
    x.ro!==false||x.so!==true||x.sw!==false||x.sr!==false||
    x.raws!==0||x.owners!==0)
    fail("TABLE_ACCESS_SHAPE_OR_EXISTING_ROWS");
 const old=(await db.query(
   "SELECT rolname FROM pg_roles "+
   "WHERE rolname ~ '^travnr_v39_runtime(_recovery[0-9]+)?$'"
 )).rows as {rolname:string}[];
 for(const entry of old){
  const v=(await db.query(
   "SELECT "+
   "has_table_privilege($1,"+
      "'clean.gate4_alert_prebind_original_v39','SELECT') AS r,"+
   "has_table_privilege($1,"+
      "'clean.gate4_alert_prebind_original_v39','INSERT') AS w,"+
   "has_table_privilege($1,"+
      "'clean.gate4_alert_owned_binding_v39','SELECT') AS o",
   [entry.rolname]
  )).rows[0];
  if(v.r!==false||v.w!==false||v.o!==false)
    fail("OLD_RUNTIME_INHERITED_NEW_TABLE_ACCESS");
 }
}
async function main(){
 const args=process.argv.slice(2);
 if(args.length!==1||!["--plan","--apply"].includes(args[0]))
   fail("CLI");
 const applying=args[0]==="--apply";
 const expected=String(process.env.GATE4_OWNER_REVIEWED_SOURCE_SHA??"");
 if(!pin.test(expected))fail("PIN_REQUIRED");
 const actual=execFileSync("git",["-C",root,"rev-parse","HEAD"],
  {encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 if(actual!==expected)fail("WRONG_SOURCE");
 const owner=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
 const runtime=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 if(!owner||!runtime)fail("OWNER_OR_RUNTIME_ENV_MISSING");
 try{if(normalized(owner)!==normalized(runtime))fail("DATABASE_TARGET_MISMATCH");}
 catch{fail("DATABASE_URI_INVALID");}
 const db=new pg.Client({
  connectionString:owner,connectionTimeoutMillis:6000,
  query_timeout:20000,statement_timeout:20000,
  application_name:"gate4_owner_provision_scoped"
 });
 await db.connect();
 let transaction=false;
 let wroteCredentialFile=false;
 try{
  await db.query("BEGIN TRANSACTION READ ONLY");
  transaction=true;
  const f=await facts(db);
  if(f.db!=="neondb"||!f.create||!f.createRole||f.isSuper||
    f.beforeTables!==0||f.existingRoles!==0||
    f.admin===decodeURIComponent(new URL(runtime).username))
    fail("PRECONDITIONS_NOT_MET");
  await db.query("ROLLBACK");transaction=false;
  console.log(JSON.stringify({
    status:"GATE4_OWNER_SCOPE_AND_TARGET_PASS",
    sourceCommit:actual,databaseExpected:true,
    ownerCreateTables:true,ownerCreateRoles:true,
    candidateTablesAbsent:true,candidateRolesAbsent:true,
    providerCalls:0,phase6Starts:0,productionWrites:applying
  }));
  if(!applying)return;
  if(process.env.GATE4_OWNER_COMMISSION_CONFIRM!==EXPECTED_CONFIRM)
    fail("EXPLICIT_AUTH_MISSING");
  if(existsSync(outfile))fail("CREDENTIAL_FILE_ALREADY_EXISTS");
  // Validate all reviewed SQL before generating credentials or acquiring
  // a write transaction.
  const sql=fileNames.map(strippedMigration);
  const rp=randomBytes(40).toString("hex");
  const sp=randomBytes(40).toString("hex");
  const credential={
   schema:"v39.gate4.two-restricted-login-secrets.v1",
   commissionedSource:actual,
   receiverRole:RROLE,safetyRole:SROLE,
   receiverUrl:makeUrl(owner,RROLE,rp),
   safetyReaderUrl:makeUrl(owner,SROLE,sp),
   warnings:"DO NOT COPY INTO GIT, CHAT, APP LOGS OR PR COMMENTS"
  };
  mkdirSync(outdir,{recursive:true,mode:0o700});
  writeFileSync(outfile,JSON.stringify(credential,null,2)+"\n",{
    encoding:"utf8",mode:0o600,flag:"wx"
  });
  wroteCredentialFile=true;
  await db.query("BEGIN");transaction=true;
  // Protect against races between separate invocations/owner work.
  await db.query("SELECT pg_advisory_xact_lock(3900073,20261022)");
  const current=await facts(db);
  if(current.beforeTables!==0||current.existingRoles!==0)
    fail("ALREADY_INSTALLED_RACE");
  await db.query(
   "CREATE ROLE "+RROLE+" LOGIN NOINHERIT NOSUPERUSER "+
   "NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS "+
   "PASSWORD "+quotedPasswordForSql(rp)
  );
  await db.query(
   "CREATE ROLE "+SROLE+" LOGIN NOINHERIT NOSUPERUSER "+
   "NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS "+
   "PASSWORD "+quotedPasswordForSql(sp)
  );
  for(const item of sql)await db.query(item);
  await verifyGrants(db);
  await db.query("COMMIT");transaction=false;
  console.log(JSON.stringify({
   status:"GATE4_V0071_V0072_V0073_COMMITTED_RESTRICTED_ROLES_VERIFIED",
   sourceCommit:actual,existingPrepaidTablesAltered:false,
   newRoles:2,newTables:2,ownerRowCount:0,
   credentialFileWrittenOutsideRepository:true,
   providerCalls:0,deployments:0,phase6Starts:0
  }));
 }catch(e){
  if(transaction)await db.query("ROLLBACK").catch(()=>undefined);
  if(wroteCredentialFile){
   // If commit response is ambiguous preserve credentials for operator
   // recovery; otherwise do not create a second role credential blindly.
   console.error("GATE4_OWNER_CREDENTIALS_RETAINED_FOR_MANUAL_RECONCILIATION");
  }
  const msg=e instanceof Error?e.message:"";
  if(msg.startsWith("GATE4_OWNER_COMMISSION_"))throw e;
  fail("SQL_OR_COMMIT_UNCERTAIN");
 }finally{
  await db.end().catch(()=>undefined);
 }
}
void main().catch(e=>{
 const raw=e instanceof Error?e.message:"";
 console.error(/^GATE4_OWNER_COMMISSION_[A-Z0-9_]+_HOLD$/.test(raw)?
  raw:"GATE4_OWNER_COMMISSION_UNEXPECTED_HOLD");
 process.exitCode=2;
});
