/**
 * Gate4 second-scope temporary V0072 writer — FROZEN APPROVED SETUP ONLY.
 * --plan is an owner READ ONLY metadata/policy/role review. --apply is source-
 * released ONLY when exact owner private manifest + permission verified.
 * NEVER invokes AeroDataBox, Actions STOP, callbacks, or republish.
 *
 * This MUST NOT recycle the Oct23 role, paid intent, historical binding or
 * credential. On uncertain commit, preserve private credential for manual
 * reconciliation and NEVER retry blindly. Do not execute --apply now.
 */
import "dotenv/config";
import pg from "pg";
import {randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync,statSync,writeFileSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath,pathToFileURL} from "node:url";
import {reviewGate4SecondScopeRlsV39} from
 "../server/lib/disruption/gate4SecondScopeRlsPlan_v39";
import {readGate4ApprovedManifestV39} from
 "./v39_gate4_approved_no_provider_scope_v39";

export const GATE4_SECOND_WRITER_PRODUCTION_APPLY_RELEASED_V39=true;
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const OLD_SCOPE="498dccd7-5da3-4687-a6ea-e0dc03b54398";
const OLD_ROLE="gate4_owner_writer_20261023";
const SAFETY_ROLE="gate4_safety_reader_20261022";
const OWNER_TABLE="clean.gate4_alert_owned_binding_v39";
const DIR=join(homedir(),".config","replittranvr","gate4-owner-20261022");
const SHA=/^[a-f0-9]{40}$/;
const hold=(code:string):never=>{throw Error("GATE4_SECOND_WRITER_"+code+"_HOLD");};
type Cfg={head:string;ownerUrl:string;runtimeUrl:string;role:string;
 scope:string;auth:string;receiverSource:string;icao:"WSSS"};
const sameHost=(a:URL,b:URL):boolean=>
 a.hostname.replace("-pooler.",".")+":"+(a.port||"5432")+a.pathname===
 b.hostname.replace("-pooler.",".")+":"+(b.port||"5432")+b.pathname;
function config():Cfg{
 const head=String(process.env.GATE4_SECOND_WRITER_REVIEWED_SOURCE_SHA??"");
 const local=execFileSync("git",["-C",ROOT,"rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 if(!SHA.test(head)||head!==local)hold("SOURCE_PIN");
 const ownerUrl=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
 const runtimeUrl=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 let a:URL,b:URL;
 try{
  a=new URL(ownerUrl);b=new URL(runtimeUrl);
  if(!["postgres:","postgresql:"].includes(a.protocol)||!a.password||
    a.pathname!=="/neondb"||b.pathname!=="/neondb"||!sameHost(a,b)||
    decodeURIComponent(a.username)===decodeURIComponent(b.username))
   hold("DB_IDENTITY");
 }catch{hold("DB_IDENTITY");}
 return {head,ownerUrl,runtimeUrl,
  role:String(process.env.GATE4_SECOND_WRITER_ROLE??""),
  scope:String(process.env.GATE4_SECOND_WRITER_APPROVED_SCOPE_ID??""),
  auth:String(process.env.GATE4_SECOND_WRITER_APPROVED_AUTH_SHA256??""),
  receiverSource:String(process.env.GATE4_SECOND_WRITER_APPROVED_RECEIVER_SHA??""),
  icao:"WSSS"};
}
async function facts(c:pg.Client,cfg:Cfg,expectedReadOnly:boolean){
 const owner=new URL(cfg.ownerUrl);
 const m=(await c.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "current_setting('transaction_read_only') AS ro,"+
  "(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS may_create_role,"+
  "(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser,"+
  "has_schema_privilege(current_user,'clean','CREATE') AS may_ddl"
 )).rows[0];
 if(m?.db!=="neondb"||m.actor!==decodeURIComponent(owner.username)||
    m.ro!==(expectedReadOnly?"on":"off")||m.superuser!==false||m.may_create_role!==true||
    m.may_ddl!==true)hold("PRODUCTION_OWNER");
 const counts=(await c.query(
  "SELECT count(*) FILTER(WHERE scope_id=$1::uuid)::int AS old_count,"+
  "count(*) FILTER(WHERE scope_id<>$1::uuid)::int AS other_count "+
  "FROM clean.gate4_alert_owned_binding_v39",[OLD_SCOPE]
 )).rows[0];
 const originals=(await c.query(
  "SELECT count(*) FILTER(WHERE scope_id=$1::uuid)::int AS old_count,"+
  "count(*) FILTER(WHERE scope_id<>$1::uuid)::int AS other_count "+
  "FROM clean.gate4_alert_prebind_original_v39",[OLD_SCOPE]
 )).rows[0];
 const roles=(await c.query(
  "SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,"+
  "rolcreatedb,rolcreaterole "+
  "FROM pg_roles WHERE rolname=ANY($1::text[])",
  [[OLD_ROLE,SAFETY_ROLE,cfg.role]]
 )).rows;
 const old=roles.find(r=>r.rolname===OLD_ROLE);
 const safety=roles.find(r=>r.rolname===SAFETY_ROLE);
 const next=roles.find(r=>r.rolname===cfg.role);
 if(!old||old.rolcanlogin!==false||old.rolsuper||
    old.rolbypassrls||old.rolcreatedb||old.rolcreaterole||
    !safety||safety.rolcanlogin!==true||safety.rolsuper||
    safety.rolbypassrls||safety.rolcreatedb||safety.rolcreaterole)
   hold("HISTORICAL_ROLES");
 const rls=(await c.query(
  "SELECT relrowsecurity AS enabled FROM pg_class "+
  "WHERE oid=$1::regclass",[OWNER_TABLE]
 )).rows[0];
 const policies=(await c.query(
  "SELECT policyname,cmd,permissive,"+
  "cardinality(roles)=1 AS role_count_ok,"+
  "roles[1]::text=$1 AS role_ok,"+
  "btrim(qual,' ()')='true' AS qual_ok,"+
  "with_check IS NULL AS no_check "+
  "FROM pg_policies WHERE schemaname='clean' AND "+
  "tablename='gate4_alert_owned_binding_v39'",[SAFETY_ROLE]
 )).rows;
 if(policies.length!==1||policies[0].policyname!=="gate4_safety_select_v39"||
   policies[0].cmd!=="SELECT"||policies[0].permissive!=="PERMISSIVE"||
   policies[0].role_count_ok!==true||policies[0].role_ok!==true||
   policies[0].qual_ok!==true||policies[0].no_check!==true)
   hold("EXACT_SAFETY_POLICY");
 const grants=(await c.query(
  "SELECT has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','SELECT') AS sr,"+
  "has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','INSERT') AS sw,"+
  "has_table_privilege($2,'clean.gate4_alert_owned_binding_v39','SELECT') AS or_,"+
  "has_table_privilege($2,'clean.gate4_alert_owned_binding_v39','INSERT') AS ow",
  [SAFETY_ROLE,OLD_ROLE]
 )).rows[0];
 if(grants.sr!==true||grants.sw!==false||
    grants.or_!==false||grants.ow!==false)
   hold("PRESERVED_ROLE_GRANTS");
 const review=reviewGate4SecondScopeRlsV39({
  previousScopeId:OLD_SCOPE,nextScopeId:cfg.scope,
  nextAuthorizationSha256:cfg.auth,
  nextReceiverSourceSha:cfg.receiverSource,airportIcao:cfg.icao,
  nextWriterRole:cfg.role,legacyOwnedBindings:counts.old_count,
  otherOwnedBindings:counts.other_count,
  previousOriginalRows:originals.old_count,
  previousWriterExists:!!old,previousWriterLoginEnabled:old.rolcanlogin,
  nextWriterRoleExists:!!next,rlsEnabled:rls?.enabled===true,
  existingPolicyNames:policies.map(x=>x.policyname)
 });
 if(review.status!=="REVIEW_ONLY_READY"||
    originals.old_count!==1||originals.other_count!==0||
    review.statements.length!==5)
   hold("SCOPE_OR_CUSTODY");
 return review;
}
async function main():Promise<void>{
 const mode=process.argv[2];
 if(process.argv.length!==3||!["--plan","--apply"].includes(mode))
   hold("CLI_USAGE");
 // Immutable source seal BEFORE DB IO, secret creation, GRANT or any DDL.
 if(mode==="--apply"&&!GATE4_SECOND_WRITER_PRODUCTION_APPLY_RELEASED_V39)
   hold("PRODUCTION_APPLY_SOURCE_SEALED");
 // A released DB apply remains limited to the owner's fresh PRIVATE, 0600
 // exact-scope setup authorization. Check before DB/config connections.
 if(mode==="--apply"){
  const approved=readGate4ApprovedManifestV39();
  if(process.env.GATE4_SECOND_WRITER_ROLE!==approved.writerRole||
     process.env.GATE4_SECOND_WRITER_APPROVED_SCOPE_ID!==approved.scopeId||
     process.env.GATE4_SECOND_WRITER_APPROVED_AUTH_SHA256!==approved.authorizationSha256||
     process.env.GATE4_SECOND_WRITER_APPROVED_RECEIVER_SHA!==approved.proposedPublishedSourceSha)
   hold("PRIVATE_APPROVED_SCOPE_MISMATCH");
 }
 const cfg=config();
 const db=new pg.Client({connectionString:cfg.ownerUrl,
  connectionTimeoutMillis:6000,query_timeout:8000,
  application_name:"gate4_second_writer_review"});
 let tx=false,privateFileMade=false;
 try{
  await db.connect();
  await db.query("BEGIN TRANSACTION READ ONLY");
  tx=true;
  await db.query("SET LOCAL statement_timeout='7000ms'");
  const review=await facts(db,cfg,true);
  await db.query("ROLLBACK");tx=false;
  if(mode==="--plan"){
   console.log(JSON.stringify({status:"GATE4_SECOND_WRITER_REVIEW_ONLY_READY",
    reviewedHead:cfg.head,proposedStatements:review.statements.length,
    productionApplySealed:!GATE4_SECOND_WRITER_PRODUCTION_APPLY_RELEASED_V39,providerRequests:0,databaseWrites:0,
    newRoleCommissioned:false,paidAuthorized:false}));
   return;
  }
  // Future execution needs an independent explicit GO for exactly the
  // authorized UUID/AUTH/published receiver, DDL, expiring credential.
  if(process.env.GATE4_SECOND_WRITER_APPLY_CONFIRM!==
    "AUTHORIZE_NEW_WSSS_V0072_ROLE_NO_PROVIDER")
   hold("EXPLICIT_DDL_AUTHORIZATION");
  if(!existsSync(DIR)||(statSync(DIR).mode&0o077)!==0)
   hold("PRIVATE_DIRECTORY");
  const file=join(DIR,"writer-"+cfg.role+".json");
  if(existsSync(file))hold("PRIVATE_CREDENTIAL_EXISTS");
  const password=randomBytes(40).toString("hex");
  const expires=new Date(Date.now()+6*3600000).toISOString();
  const scoped=new URL(cfg.ownerUrl);
  scoped.username=cfg.role;scoped.password=password;
  scoped.searchParams.set("sslmode","verify-full");
  // A failed or ambiguous COMMIT requires reconciliation, not recreation.
  writeFileSync(file,JSON.stringify({
   schema:"v39.gate4.second-writer-private.v1",
   role:cfg.role,reviewedHead:cfg.head,scope:cfg.scope,
   authorizationSha256:cfg.auth,receiverSource:cfg.receiverSource,
   expiresUtc:expires,writerUrl:scoped.toString(),
   warning:"PRIVATE; do not print, upload, commit, or share."
  },null,2)+"\n",{flag:"wx",mode:0o600});
  privateFileMade=true;
  await db.query("BEGIN");tx=true;
  await db.query("SET LOCAL lock_timeout='2000ms'");
  await db.query("SET LOCAL statement_timeout='7000ms'");
  await db.query("SELECT pg_advisory_xact_lock(3904,20261024)");
  // Recheck the mutable catalog state in the SAME transaction that
  // commissions the role and policies. Abort atomically on any drift.
  const verified=await facts(db,cfg,false);
  if(verified.statements.length!==5)hold("PLAN_CHANGED");
  if(!/^[a-f0-9]{80}$/.test(password))hold("SECRET_FORMAT");
  // cfg.role is whitelisted by reviewGate4SecondScopeRlsV39 above.
  await db.query("CREATE ROLE "+cfg.role+
   " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
   "NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1 PASSWORD '"+password+
   "' VALID UNTIL '"+expires+"'");
  for(const sql of verified.statements)await db.query(sql);
  const granted=(await db.query(
   "SELECT has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','SELECT') AS r,"+
   "has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','INSERT') AS w,"+
   "has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','UPDATE') AS u,"+
   "has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','DELETE') AS d,"+
   "has_table_privilege($1,'clean.gate4_alert_prebind_original_v39','SELECT') AS raw,"+
   "has_schema_privilege($1,'clean','CREATE') AS ddl,"+
   "(SELECT rolcanlogin AND rolinherit=false AND rolbypassrls=false "+
   "AND rolsuper=false AND rolcreatedb=false AND rolcreaterole=false "+
   "AND rolreplication=false FROM pg_roles WHERE rolname=$1) AS locked",
   [cfg.role]
  )).rows[0];
  const policies=(await db.query(
   "SELECT policyname,cmd,roles[1]::text=$1 AS role_ok,"+
   "cardinality(roles)=1 AS one_role,"+
   "permissive,with_check IS NULL AS no_check "+
   "FROM pg_policies WHERE schemaname='clean' "+
   "AND tablename='gate4_alert_owned_binding_v39' ORDER BY policyname",
   [cfg.role]
  )).rows;
  const created=policies.filter(p=>
   ["gate4_next_writer_select_v39","gate4_next_writer_insert_v39"]
   .includes(p.policyname));
  if(granted.r!==true||granted.w!==true||granted.u!==false||
     granted.d!==false||granted.raw!==false||granted.ddl!==false||
     granted.locked!==true||policies.length!==3||created.length!==2||
     created.some(p=>p.role_ok!==true||p.one_role!==true||
       p.permissive!=="PERMISSIVE")||
     created.find(p=>p.policyname==="gate4_next_writer_select_v39")?.cmd!=="SELECT"||
     created.find(p=>p.policyname==="gate4_next_writer_insert_v39")?.cmd!=="INSERT"||
     created.find(p=>p.policyname==="gate4_next_writer_select_v39")?.no_check!==true||
     created.find(p=>p.policyname==="gate4_next_writer_insert_v39")?.no_check!==false)
   hold("TRANSACTIONAL_GRANTS_OR_POLICY");
  const preserved=(await db.query(
   "SELECT count(*) FILTER(WHERE scope_id=$1::uuid)::int AS old,"+
   "count(*) FILTER(WHERE scope_id<>$1::uuid)::int AS other "+
   "FROM clean.gate4_alert_owned_binding_v39",[OLD_SCOPE]
  )).rows[0];
  if(preserved.old!==1||preserved.other!==0)
   hold("HISTORICAL_CUSTODY_CHANGED");
  await db.query("COMMIT");tx=false;
  // A committed but unreadable state is HOLD, never a second CREATE ROLE.
  await db.query("BEGIN TRANSACTION READ ONLY");tx=true;
  const final=(await db.query(
   "SELECT (SELECT count(*)::int FROM pg_roles WHERE rolname=$1) AS role_count,"+
   "(SELECT count(*)::int FROM pg_policies WHERE schemaname='clean' "+
   "AND tablename='gate4_alert_owned_binding_v39') AS policy_count,"+
   "(SELECT count(*)::int FROM clean.gate4_alert_owned_binding_v39) AS rows",
   [cfg.role]
  )).rows[0];
  if(final.role_count!==1||final.policy_count!==3||final.rows!==1)
   hold("POSTCOMMIT_RECONCILIATION");
  await db.query("ROLLBACK");tx=false;
  console.log(JSON.stringify({
   status:"GATE4_SECOND_WRITER_COMMISSIONED_NO_PROVIDER",
   role:cfg.role,reviewedSource:cfg.head,
   expiresUtc:expires,privateCredentialStored:true,
   oldOwnerReceiptPreserved:true,providerRequests:0,paidAuthorized:false,
   stopArmed:false,receiverPublished:false
  }));
 }catch(e){
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  if(privateFileMade)
   console.error("GATE4_SECOND_WRITER_PRIVATE_CREDENTIAL_RETAIN_FOR_RECONCILIATION");
  throw e;
 }finally{await db.end().catch(()=>undefined);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{
  const code=e instanceof Error?e.message:"";
  console.error(/^GATE4_SECOND_WRITER_[A-Z0-9_]+_HOLD$/.test(code)?
    code:"GATE4_SECOND_WRITER_UNVERIFIED_HOLD");
  process.exitCode=2;
 });
}
