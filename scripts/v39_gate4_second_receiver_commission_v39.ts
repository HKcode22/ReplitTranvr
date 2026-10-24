/**
 * Gate4 second-scope V0071 receiver role & RLS commissioning — SOURCE-SEALED.
 * --plan: production owner READ-ONLY exact V0071 metadata review.
 * --apply: released ONLY for the private owner-approved frozen setup; rollout
 * authorization, exact fresh UUID/AUTH/compiled published source and a
 * separately reviewed release PR. NO provider/GitHub/Replit calls in any mode.
 *
 * Retains old V0071 original and old published receiver's historical UUID.
 * Avoiding receiver interruptions and revoking temporary credentials are
 * separate operator-reviewed follow-up steps, not automatic side effects.
 */
import "dotenv/config";
import pg from "pg";
import {randomBytes,createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync,statSync,writeFileSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath,pathToFileURL} from "node:url";
import {reviewGate4SecondReceiverRlsV39} from
 "../server/lib/disruption/gate4SecondReceiverRlsPlan_v39";
import {readGate4ApprovedManifestV39} from
 "./v39_gate4_approved_no_provider_scope_v39";

export const GATE4_SECOND_RECEIVER_PRODUCTION_APPLY_RELEASED_V39=true;
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const OLD_SCOPE="498dccd7-5da3-4687-a6ea-e0dc03b54398";
const OLD_ROLE="gate4_receiver_20261022";
const TABLE="clean.gate4_alert_prebind_original_v39";
const DIR=join(homedir(),".config","replittranvr","gate4-owner-20261022");
const SHA=/^[a-f0-9]{40}$/;
const stop=(reason:string):never=>{
 throw Error("GATE4_SECOND_RECEIVER_"+reason+"_HOLD");
};
type Scope=Readonly<{
 source:string;ownerUrl:string;runtimeUrl:string;
 role:string;uuid:string;auth:string;publishedSource:string;
}>;
const sameNeon=(a:URL,b:URL)=>
 a.hostname.replace("-pooler.",".")+":"+(a.port||"5432")+a.pathname===
 b.hostname.replace("-pooler.",".")+":"+(b.port||"5432")+b.pathname;
function cfgFromEnvironment():Scope{
 const source=String(process.env.GATE4_SECOND_RECEIVER_REVIEWED_SOURCE_SHA??"");
 const head=execFileSync("git",["-C",ROOT,"rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 if(!SHA.test(source)||source!==head)stop("REVIEWED_SOURCE_MISMATCH");
 const ownerUrl=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
 const runtimeUrl=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 try{
  const a=new URL(ownerUrl),b=new URL(runtimeUrl);
  if(!["postgres:","postgresql:"].includes(a.protocol)||
    a.pathname!=="/neondb"||b.pathname!=="/neondb"||
    !a.password||!b.password||!sameNeon(a,b)||
    decodeURIComponent(a.username)===decodeURIComponent(b.username))
   stop("OWNER_RUNTIME_ISOLATION");
 }catch{stop("OWNER_RUNTIME_ISOLATION");}
 return {
  source,ownerUrl,runtimeUrl,
  role:String(process.env.GATE4_SECOND_RECEIVER_ROLE??""),
  uuid:String(process.env.GATE4_SECOND_RECEIVER_APPROVED_SCOPE_ID??""),
  auth:String(process.env.GATE4_SECOND_RECEIVER_APPROVED_AUTH_SHA256??""),
  publishedSource:String(process.env.GATE4_SECOND_RECEIVER_APPROVED_PUBLISHED_SHA??"")
 };
}
async function inspect(db:pg.Client,cfg:Scope,ro:boolean){
 const owner=new URL(cfg.ownerUrl);
 const who=(await db.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "current_setting('transaction_read_only') AS ro,"+
  "(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS su,"+
  "(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS cr,"+
  "has_schema_privilege(current_user,'clean','CREATE') AS ddl"
 )).rows[0];
 if(who?.db!=="neondb"||who.actor!==decodeURIComponent(owner.username)||
  who.ro!==(ro?"on":"off")||who.su!==false||
  who.cr!==true||who.ddl!==true)stop("PRODUCTION_OWNER_IDENTITY");
 const count=(await db.query(
  "SELECT count(*) FILTER(WHERE scope_id=$1::uuid)::int AS old,"+
  "count(*) FILTER(WHERE scope_id<>$1::uuid)::int AS other "+
  "FROM "+TABLE,[OLD_SCOPE]
 )).rows[0];
 const roles=(await db.query(
  "SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,"+
  "rolcreaterole,rolcreatedb FROM pg_roles "+
  "WHERE rolname=ANY($1::text[])",[[OLD_ROLE,cfg.role]]
 )).rows;
 const old=roles.find(r=>r.rolname===OLD_ROLE);
 const fresh=roles.find(r=>r.rolname===cfg.role);
 if(!old||old.rolcanlogin!==true||old.rolsuper||
    old.rolbypassrls||old.rolcreaterole||old.rolcreatedb)
   stop("LEGACY_RECEIVER_ROLE");
 const rights=(await db.query(
  "SELECT has_table_privilege($1,'clean.gate4_alert_prebind_original_v39','SELECT') AS r,"+
  "has_table_privilege($1,'clean.gate4_alert_prebind_original_v39','INSERT') AS w,"+
  "has_table_privilege($1,'clean.gate4_alert_prebind_original_v39','UPDATE') AS u,"+
  "has_table_privilege($1,'clean.gate4_alert_prebind_original_v39','DELETE') AS d,"+
  "has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','SELECT') AS owner_r",
  [OLD_ROLE]
 )).rows[0];
 if(rights.r!==true||rights.w!==true||rights.u!==false||
    rights.d!==false||rights.owner_r!==false)
   stop("LEGACY_RECEIVER_GRANTS");
 const rls=(await db.query(
  "SELECT relrowsecurity AS enabled FROM pg_class WHERE oid=$1::regclass",
  [TABLE]
 )).rows[0];
 const policies=(await db.query(
  "SELECT policyname FROM pg_policies WHERE schemaname='clean' "+
  "AND tablename='gate4_alert_prebind_original_v39'"
 )).rows.map(r=>r.policyname);
 const result=reviewGate4SecondReceiverRlsV39({
  oldScopeId:OLD_SCOPE,nextScopeId:cfg.uuid,
  nextAuthSha256:cfg.auth,nextPublishedSourceSha:cfg.publishedSource,
  nextReceiverRole:cfg.role,oldOriginalCount:count.old,
  otherOriginalCount:count.other,oldReceiverExists:true,
  oldReceiverLoginEnabled:old.rolcanlogin,
  newReceiverAlreadyExists:!!fresh,
  rlsCurrentlyEnabled:rls?.enabled===true,
  existingPolicies:policies
 });
 if(result.status!=="REVIEW_ONLY_READY"||result.statements.length!==8)
   stop("RLS_SCOPE_OR_CUSTODY");
 return result;
}
async function preservedOldSha(db:pg.Client):Promise<string>{
 const rows=(await db.query(
  "SELECT original_wire,original_sha256 FROM "+TABLE+
  " WHERE scope_id=$1::uuid",[OLD_SCOPE]
 )).rows;
 if(rows.length!==1||!Buffer.isBuffer(rows[0].original_wire))
   stop("HISTORIC_ORIGINAL_UNAVAILABLE");
 const hash=createHash("sha256").update(rows[0].original_wire)
  .digest("hex");
 if(hash!==rows[0].original_sha256)stop("HISTORIC_ORIGINAL_SHA_MISMATCH");
 return hash;
}
async function run(){
 const mode=process.argv[2];
 if(process.argv.length!==3||!["--plan","--apply"].includes(mode))
  stop("USAGE");
 // Immutable release seal must reject --apply BEFORE environment read,
 // secret creation, DB connection or provider interactions.
 if(mode==="--apply"&&!GATE4_SECOND_RECEIVER_PRODUCTION_APPLY_RELEASED_V39)
  stop("PRODUCTION_APPLY_SOURCE_SEALED");
 // A released DB apply remains limited to the owner's fresh PRIVATE, 0600
 // exact-scope setup authorization. Check before DB/config connections.
 if(mode==="--apply"){
  const approved=readGate4ApprovedManifestV39();
  if(process.env.GATE4_SECOND_RECEIVER_ROLE!==approved.receiverRole||
     process.env.GATE4_SECOND_RECEIVER_APPROVED_SCOPE_ID!==approved.scopeId||
     process.env.GATE4_SECOND_RECEIVER_APPROVED_AUTH_SHA256!==approved.authorizationSha256||
     process.env.GATE4_SECOND_RECEIVER_APPROVED_PUBLISHED_SHA!==approved.proposedPublishedSourceSha)
   stop("PRIVATE_APPROVED_SCOPE_MISMATCH");
 }
 const cfg=cfgFromEnvironment();
 const db=new pg.Client({
  connectionString:cfg.ownerUrl,connectionTimeoutMillis:6000,
  query_timeout:8000,application_name:"gate4_second_receiver_commission"
 });
 let tx=false,privatePrepared=false;
 try{
  await db.connect();
  await db.query("BEGIN TRANSACTION READ ONLY");tx=true;
  await db.query("SET LOCAL statement_timeout='7000ms'");
  const plan=await inspect(db,cfg,true);
  await preservedOldSha(db);
  await db.query("ROLLBACK");tx=false;
  if(mode==="--plan"){
   console.log(JSON.stringify({
    status:"GATE4_SECOND_RECEIVER_PLAN_REVIEW_ONLY_READY",
    reviewedSource:cfg.source,proposedStatements:plan.statements.length,
    historicOriginalVerified:true,releaseSealed:!GATE4_SECOND_RECEIVER_PRODUCTION_APPLY_RELEASED_V39,providerRequests:0,
    databaseWrites:0,newRoleCommissioned:false,paidAuthorized:false
   }));
   return;
  }
  // One-time owner-approved no-provider DB setup, NEVER provider CREATE.
  if(process.env.GATE4_SECOND_RECEIVER_APPLY_CONFIRM!==
     "AUTHORIZE_SCOPED_V0071_RECEIVER_NO_PROVIDER")
   stop("EXPLICIT_PRODUCTION_DDL_APPROVAL");
  if(!existsSync(DIR)||(statSync(DIR).mode&0o077)!==0)
   stop("PRIVATE_CREDENTIAL_DIRECTORY");
  const file=join(DIR,"receiver-"+cfg.role+".json");
  if(existsSync(file))stop("PRIVATE_CREDENTIAL_ALREADY_PRESENT");
  const password=randomBytes(40).toString("hex");
  const expires=new Date(Date.now()+6*3600000).toISOString();
  const receiverUrl=new URL(cfg.ownerUrl);
  receiverUrl.username=cfg.role;receiverUrl.password=password;
  receiverUrl.searchParams.set("sslmode","verify-full");
  writeFileSync(file,JSON.stringify({
   schema:"v39.gate4.second-receiver-credential.v1",
   reviewedSource:cfg.source,role:cfg.role,scope:cfg.uuid,
   approvedAuth:cfg.auth,approvedPublishedSource:cfg.publishedSource,
   expiresUtc:expires,receiverUrl:receiverUrl.toString(),
   warning:"PRIVATE: never commit, print, publish or send credentials."
  },null,2)+"\n",{flag:"wx",mode:0o600});
  privatePrepared=true;
  await db.query("BEGIN");tx=true;
  await db.query("SET LOCAL lock_timeout='2000ms'");
  await db.query("SET LOCAL statement_timeout='7000ms'");
  await db.query("SELECT pg_advisory_xact_lock(3904,20261025)");
  const before=await inspect(db,cfg,false);
  const digest=await preservedOldSha(db);
  if(before.statements.length!==8||
     !/^[a-f0-9]{80}$/.test(password))stop("RECHECK_CHANGED");
  await db.query("CREATE ROLE "+cfg.role+
    " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
    "NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4 PASSWORD '"+password+
    "' VALID UNTIL '"+expires+"'");
  for(const sql of before.statements)await db.query(sql);
  const after=(await db.query(
   "SELECT relrowsecurity AS enabled FROM pg_class WHERE oid=$1::regclass",
   [TABLE]
  )).rows[0];
  const rights=(await db.query(
   "SELECT has_table_privilege($1,'clean.gate4_alert_prebind_original_v39','SELECT') AS r,"+
   "has_table_privilege($1,'clean.gate4_alert_prebind_original_v39','INSERT') AS w,"+
   "has_table_privilege($1,'clean.gate4_alert_prebind_original_v39','UPDATE') AS u,"+
   "has_table_privilege($1,'clean.gate4_alert_prebind_original_v39','DELETE') AS d,"+
   "has_table_privilege($1,'clean.gate4_alert_owned_binding_v39','SELECT') AS owner_r,"+
   "(SELECT rolcanlogin AND rolinherit=false AND rolbypassrls=false AND "+
   "rolsuper=false AND rolcreatedb=false AND rolcreaterole=false "+
   "FROM pg_roles WHERE rolname=$1) AS scoped",
   [cfg.role]
  )).rows[0];
  const pol=(await db.query(
   "SELECT policyname,cmd,roles[1]::text AS role,"+
   "cardinality(roles) AS assigned,permissive "+
   "FROM pg_policies WHERE schemaname='clean' "+
   "AND tablename='gate4_alert_prebind_original_v39'"
  )).rows;
  const expected=new Map([
   ["gate4_legacy_receiver_select_v39",["SELECT",OLD_ROLE]],
   ["gate4_legacy_receiver_insert_v39",["INSERT",OLD_ROLE]],
   ["gate4_next_receiver_select_v39",["SELECT",cfg.role]],
   ["gate4_next_receiver_insert_v39",["INSERT",cfg.role]]
  ]);
  if(after?.enabled!==true||rights.r!==true||rights.w!==true||
     rights.u!==false||rights.d!==false||rights.owner_r!==false||
     rights.scoped!==true||pol.length!==4||
     pol.some(p=>!expected.has(p.policyname)||
       expected.get(p.policyname)?.[0]!==p.cmd||
       expected.get(p.policyname)?.[1]!==p.role||
       p.assigned!==1||p.permissive!=="PERMISSIVE"))
   stop("ATOMIC_SCOPE_OR_GRANTS_UNSAFE");
  const counts=(await db.query(
   "SELECT count(*) FILTER(WHERE scope_id=$1::uuid)::int AS old,"+
   "count(*) FILTER(WHERE scope_id<>$1::uuid)::int AS other "+
   "FROM "+TABLE,[OLD_SCOPE]
  )).rows[0];
  if(counts.old!==1||counts.other!==0||
     (await preservedOldSha(db))!==digest)stop("ORIGINAL_CUSTODY_CHANGED");
  await db.query("COMMIT");tx=false;
  // Post-commit SELECT is not permission to CREATE another role on failure.
  await db.query("BEGIN TRANSACTION READ ONLY");tx=true;
  const check=(await db.query(
   "SELECT relrowsecurity AS enabled FROM pg_class WHERE oid=$1::regclass",
   [TABLE]
  )).rows[0];
  const pcount=(await db.query(
   "SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='clean' "+
   "AND tablename='gate4_alert_prebind_original_v39'"
  )).rows[0];
  if(check?.enabled!==true||pcount.n!==4||
     (await preservedOldSha(db))!==digest)
   stop("POSTCOMMIT_RECONCILIATION");
  await db.query("ROLLBACK");tx=false;
  console.log(JSON.stringify({
   status:"GATE4_SECOND_RECEIVER_COMMISSIONED_NO_PROVIDER",
   role:cfg.role,reviewedSource:cfg.source,expiresUtc:expires,
   credentialStoredPrivate:true,historicalOriginalRetained:true,
   paidAuthorized:false,receiverDeployed:false,stopArmed:false,
   providerRequests:0
  }));
 }catch(e){
  if(tx)await db.query("ROLLBACK").catch(()=>{});
  if(privatePrepared)
   console.error("GATE4_SECOND_RECEIVER_CREDENTIAL_RETAIN_FOR_MANUAL_RECONCILIATION");
  throw e;
 }finally{await db.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 run().catch(e=>{
  const m=e instanceof Error?e.message:"";
  console.error(/^GATE4_SECOND_RECEIVER_[A-Z0-9_]+_HOLD$/.test(m)?
   m:"GATE4_SECOND_RECEIVER_UNVERIFIED_HOLD");
  process.exitCode=2;
 });
