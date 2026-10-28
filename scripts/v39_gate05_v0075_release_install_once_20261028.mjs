/**
 * One-use production V0075 installer with explicit owner authorization.
 *
 * This tool is deliberately NOT invoked by startup, GitHub PR, the Replit
 * build, or paid workflows. It only installs reviewed, staged DDL when:
 * exact GitHub SHA, verified DB identities, immutable STOPPED old owner,
 * zero nonterminal Gate05 owners, absent V0075 schema, and exact low-privilege
 * runtime role all agree. Original subscription, raw blobs and historic data
 * are NEVER modified. No provider API/Alert/FIDS calls, no refill.
 *
 * Direct trigger execution is revoked from PUBLIC; SECURITY DEFINER is
 * restricted to READ ONLY owner/source verification, and only INSERT is
 * granted on the new table to the real callback runtime DB username.
 *
 * To run (after PR green/merge), fetch pinned main and pipe git show script
 * to node --input-type=module. Requires GATE05_V0075_APPLY confirmation.
 */
import pg from "pg";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";

const action="INSTALL_REVIEWED_V0075_ONE_DB_NO_PROVIDER";
const PIN=process.env.GATE05_V0075_REVIEWED_MAIN_SHA??"";
const sqlPath="migrations/staged/V0075__gate05_logged_delivery_custody_v39.sql";
const uuid="e69ffa34-d8a6-456f-a49c-9dd459e6d294";
const result={
 schema:"v39.gate05.v0075.release-installer.v1",
 action:"STAGED_LOGGED_CUSTODY_SCHEMA_ONLY",
 reviewedMainSha:PIN,
 status:"HOLD_NO_DB_WRITE",
 sqlSha256:null,
 migrationCommitted:false,
 narrowRuntimeInsertGrantVerified:false,
 providerCalls:0,
 providerMutations:0,
 alertCreditsSpent:0,
 fidsUnitsSpent:0,
 oldGate05OwnerModified:false,
 otherTablesModified:false,
 publishedReceiverNotChangedByThisAction:true,
 paidPilotStarted:false,
 next:"PUBLISH_REVIEWED_SOURCE_AND_ENABLE_OPT_IN_AFTER_MIGRATION"
};
function fail(why){throw Error("GATE05_V0075_RELEASE_HOLD_"+why);}
function sha(bytes){return createHash("sha256").update(bytes).digest("hex");}
const HEAD=/^[0-9a-f]{40}$/;
const ROLE=/^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
let db,transaction=false,commitIssued=false;
try{
 if(process.env.GATE05_V0075_APPLY!==action)
   fail("EXPLICIT_ONE_USE_DDL_CONFIRMATION_REQUIRED");
 if(!HEAD.test(PIN))fail("REVIEWED_MAIN_SHA");
 const fetchHead=execFileSync("git",["rev-parse","FETCH_HEAD"],{
   encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000
 }).trim();
 if(fetchHead!==PIN)fail("EXACT_FETCH_PIN");
 const remoteMain=execFileSync("git",["ls-remote","origin","refs/heads/main"],{
   encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:10000
 }).trim().split(/\s+/)[0];
 if(remoteMain!==PIN)fail("GITHUB_MAIN_MOVED");
 const sql=execFileSync("git",["show",PIN+":"+sqlPath],{
   encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000,
   maxBuffer:256_000
 });
 result.sqlSha256=sha(sql);
 if(!sql.includes("SECURITY DEFINER")||
    !sql.includes("REVOKE ALL ON FUNCTION")||
    !sql.includes("gate05_delivery_custody_immutable_v39"))
   fail("UNREVIEWED_MIGRATION_SHAPE");
 const admin=process.env.DATABASE_URL;
 const runtime=process.env.V39_DATABASE_RUNTIME_URL;
 if(!admin||!runtime)fail("DATABASE_CREDENTIALS_ABSENT");
 const a=new URL(admin),u=new URL(runtime);
 if(!["postgres:","postgresql:"].includes(a.protocol)||
    !["postgres:","postgresql:"].includes(u.protocol)||
    a.hostname!==u.hostname||a.port!==u.port||
    a.pathname!=="/neondb"||u.pathname!=="/neondb")
   fail("ADMIN_VS_RECEIVER_HOST_OR_DATABASE_MISMATCH");
 const runtimeRole=decodeURIComponent(u.username);
 if(!ROLE.test(runtimeRole)||runtimeRole==="postgres")
   fail("RUNTIME_ROLE_UNEXPECTED");
 db=new pg.Client({
   connectionString:admin,
   connectionTimeoutMillis:8000,query_timeout:20000,
   statement_timeout:18000,
   application_name:"v39_gate05_v0075_single_release"
 });
 await db.connect();
 await db.query("BEGIN"); transaction=true;
 await db.query("SET LOCAL lock_timeout = '4s'");
 await db.query("SET LOCAL statement_timeout = '18s'");
 const who=(await db.query(
   "SELECT current_database() AS database_name,current_user AS actor,"+
   "pg_is_in_recovery() AS replica"
 )).rows[0];
 if(who.database_name!=="neondb"||who.actor!=="neondb_owner"||
    who.replica!==false)fail("UNREVIEWED_DB_OWNER_OR_REPLICA");
 const role=(await db.query(
   "SELECT rolcanlogin,rolsuper,rolcreatedb,rolcreaterole "+
   "FROM pg_roles WHERE rolname=$1",[runtimeRole])).rows[0];
 if(!role?.rolcanlogin)fail("PUBLISHED_RUNTIME_ROLE_NOT_LOGIN");
 if(runtimeRole!=="neondb_owner"&&
    (role.rolsuper||role.rolcreatedb||role.rolcreaterole))
   fail("RUNTIME_ROLE_TOO_PRIVILEGED");
 const facts=(await db.query(
   "SELECT "+
   "to_regclass('clean.phase3_gate05_science_owner_v39')::text AS owner,"+
   "to_regclass('clean.provider_content_blob_ref')::text AS refs,"+
   "to_regclass('clean.gate05_science_delivery_custody_v39')::text AS custody,"+
   "to_regprocedure('clean.guard_gate05_delivery_custody_v39()')::text AS triggerfn"
 )).rows[0];
 if(!facts.owner||!facts.refs||facts.custody||facts.triggerfn)
   fail("STAGED_PRECONDITION_ALREADY_PRESENT_OR_MISSING");
 const owners=(await db.query(
   "SELECT count(*) FILTER(WHERE state IN ('ACTIVE','PREPARED'))::int AS open,"+
   "count(*) FILTER(WHERE session_id=$1::uuid AND state='STOPPED')::int AS historical "+
   "FROM clean.phase3_gate05_science_owner_v39",[uuid])).rows[0];
 if(owners.open!==0||owners.historical!==1)
   fail("HISTORICAL_OWNER_OR_NEW_SCOPE_NOT_SETTLED");
 // Precise scoped DDL. BEFORE any COMMIT, validate permissions and trigger.
 await db.query(sql);
 // Never grant UPDATE/DELETE or allow public grants. Only an exact runtime
 // login can INSERT a fully source-verified future delivery record.
 await db.query('GRANT USAGE ON SCHEMA clean TO "'+runtimeRole+'"');
 await db.query(
   'GRANT INSERT ON TABLE clean.gate05_science_delivery_custody_v39 TO "'+
   runtimeRole+'"');
 const meta=(await db.query(
   "SELECT c.relpersistence,c.relkind,p.prosecdef,p.proconfig "+
   "FROM pg_class c "+
   "JOIN pg_trigger t ON t.tgrelid=c.oid AND "+
   "t.tgname='gate05_delivery_custody_immutable_v39' "+
   "JOIN pg_proc p ON p.oid=t.tgfoid "+
   "WHERE c.oid='clean.gate05_science_delivery_custody_v39'::regclass"
 )).rows;
 if(meta.length!==1||meta[0].relpersistence!=="p"||
    meta[0].relkind!=="r"||meta[0].prosecdef!==true||
    !(meta[0].proconfig??[]).some(x=>x==="search_path=pg_catalog,clean"))
   fail("TRIGGER_OR_LOGGED_DURABILITY_INCOMPLETE");
 const perms=(await db.query(
   "SELECT "+
   "has_schema_privilege($1,'clean','USAGE') AS schema_use,"+
   "has_table_privilege($1,"+
   "'clean.gate05_science_delivery_custody_v39','INSERT') AS can_insert,"+
   "has_table_privilege($1,"+
   "'clean.gate05_science_delivery_custody_v39','UPDATE') AS can_update,"+
   "has_table_privilege($1,"+
   "'clean.gate05_science_delivery_custody_v39','DELETE') AS can_delete,"+
   "has_table_privilege('public',"+
   "'clean.gate05_science_delivery_custody_v39','INSERT') AS public_insert",
   [runtimeRole])).rows[0];
 if(!perms.schema_use||!perms.can_insert||perms.can_update||
    perms.can_delete||perms.public_insert)
   fail("RUNTIME_MINIMAL_PERMISSION_CHECK");
 result.narrowRuntimeInsertGrantVerified=true;
 commitIssued=true;
 await db.query("COMMIT"); transaction=false;
 result.migrationCommitted=true;
 result.status="V0075_INSTALLED_PRODUCTION_NO_PROVIDER";
 // Schema/release only. No provider calls and no published-process change.
}catch(e){
 const code=String(e?.message??"");
 result.status=commitIssued?
   "COMMIT_OUTCOME_UNCONFIRMED_RECHECK_READONLY_NO_RETRY":
   "HOLD_NO_CONFIRMED_PRODUCTION_DDL";
 result.hold=code.startsWith("GATE05_V0075_RELEASE_HOLD_")?
   code:"DATABASE_OR_GIT_ERROR_REQUIRES_REVIEW";
}finally{
 if(transaction&&db)await db.query("ROLLBACK").catch(()=>undefined);
 if(db)await db.end().catch(()=>undefined);
 console.log(JSON.stringify(result,null,2));
 if(!result.migrationCommitted)process.exitCode=2;
}
