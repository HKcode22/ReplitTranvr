/**
 * Gate05 V0075 permission HOLD: safe, read-only live Neon diagnosis.
 * Does NOT create any schema, role, webhook subscription, paid GET, or
 * make GitHub/Replit changes. Prints only boolean privilege classifications;
 * never prints or hashes usernames, passwords, connection strings, hosts.
 */
import pg from "pg";
import {execFileSync} from "node:child_process";

const PIN=process.env.GATE05_ACL_REVIEWED_MAIN_SHA??"";
const HEX=/^[0-9a-f]{40}$/;
const output={
 schema:"v39.gate05.v0075.permission-diagnostic.v1",
 reviewedGitHubMain:HEX.test(PIN)?PIN:null,
 action:"READ_ONLY_ACL_DIAGNOSTIC",
 status:"HOLD",
 databaseIdentityMatches:false,
 adminIsExpectedOwner:false,
 runtimeRoleExists:false,
 runtimeRoleIsAdminOwner:false,
 runtimeInheritsAdminPrivileges:false,
 runtimeHasSchemaUsage:false,
 runtimeLoginEnabled:false,
 runtimeHasSuperuserOrCreaterole:false,
 v0075SchemaPresent:null,
 ownerHistoryStopped:null,
 openGate05Owners:null,
 defaultGrantSource:null,
 defaultAclGrants:null,
 likelyReason:null,
 noWrites:true,
 noProviderRequests:true,
 noFidsGets:true,
 noPaidCreate:true
};
function fail(msg){throw Error("GATE05_PERMISSION_AUDIT_"+msg);}
let db;
try{
 if(!HEX.test(PIN))fail("NO_MAIN_PIN");
 const remote=execFileSync("git",["ls-remote","origin","refs/heads/main"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:10000
 }).trim().split(/\s+/)[0];
 if(remote!==PIN)fail("GITHUB_MAIN_DRIFT");
 const a=process.env.DATABASE_URL,u=process.env.V39_DATABASE_RUNTIME_URL;
 if(!a||!u)fail("DB_ENV_MISSING");
 const admin=new URL(a),runtime=new URL(u);
 const role=decodeURIComponent(runtime.username);
 if(!["postgres:","postgresql:"].includes(admin.protocol)||
    !["postgres:","postgresql:"].includes(runtime.protocol)||
    admin.hostname!==runtime.hostname||
    admin.port!==runtime.port||
    admin.pathname!=="/neondb"||runtime.pathname!=="/neondb"||
    !/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(role))
  fail("DB_IDENTITY_MISMATCH");
 output.databaseIdentityMatches=true;
 db=new pg.Client({
  connectionString:a,
  connectionTimeoutMillis:6500,
  query_timeout:8000,statement_timeout:8000,
  options:"-c default_transaction_read_only=on",
  application_name:"gate05_v0075_acl_proof_read_only"
 });
 await db.connect();
 await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const basics=(await db.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "pg_is_in_recovery() AS replica,"+
  "to_regclass('clean.phase3_gate05_science_owner_v39')::text AS owner,"+
  "to_regclass('clean.gate05_science_delivery_custody_v39')::text AS journal"
 )).rows[0];
 output.adminIsExpectedOwner=basics.db==="neondb"&&
  basics.actor==="neondb_owner"&&basics.replica===false;
 if(!output.adminIsExpectedOwner||!basics.owner)
  fail("UNEXPECTED_ADMIN_OR_V0074_ABSENT");
 output.v0075SchemaPresent=Boolean(basics.journal);
 const roles=(await db.query(
  "SELECT rolcanlogin,rolsuper,rolcreaterole "+
  "FROM pg_roles WHERE rolname=$1",[role])).rows[0];
 output.runtimeRoleExists=Boolean(roles);
 if(!roles)fail("RUNTIME_ROLE_NOT_FOUND");
 output.runtimeLoginEnabled=roles.rolcanlogin===true;
 output.runtimeHasSuperuserOrCreaterole=
   roles.rolsuper===true||roles.rolcreaterole===true;
 output.runtimeRoleIsAdminOwner=role===basics.actor;
 const effective=(await db.query(
  "SELECT pg_has_role($1::name,$2::name,'USAGE') AS admin_usage,"+
  "has_schema_privilege($1::name,'clean','USAGE') AS schema_usage",
  [role,basics.actor]
 )).rows[0];
 output.runtimeInheritsAdminPrivileges=effective.admin_usage===true;
 output.runtimeHasSchemaUsage=effective.schema_usage===true;
 const ownerState=(await db.query(
   "SELECT count(*) FILTER (WHERE state IN ('PREPARED','ACTIVE'))::int AS opens,"+
   "count(*) FILTER (WHERE session_id=$1::uuid "+
   "AND state='STOPPED')::int AS old_stopped "+
   "FROM clean.phase3_gate05_science_owner_v39",
   ["e69ffa34-d8a6-456f-a49c-9dd459e6d294"]
 )).rows[0];
 output.openGate05Owners=ownerState.opens;
 output.ownerHistoryStopped=ownerState.old_stopped===1;
 // Table defaults are inherited from a global and/or schema-local
 // default-ACL policy. The query identifies effective recipients by
 // pg_has_role rather than printing role names/grantee IDs or ACL strings.
 const grants=(await db.query(
   "SELECT d.defaclnamespace=0 AS global_scope,"+
   "a.privilege_type AS privilege,"+
   "(a.grantee=0) AS public_grant,"+
   "CASE WHEN a.grantee=0 THEN false "+
   "ELSE pg_has_role($1::name,grantee_role.rolname,'USAGE') END "+
   "AS runtime_eligible "+
   "FROM pg_default_acl d "+
   "CROSS JOIN LATERAL aclexplode(d.defaclacl) a "+
   "LEFT JOIN pg_roles grantee_role ON grantee_role.oid=a.grantee "+
   "WHERE d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname=$2) "+
   "AND d.defaclobjtype='r' "+
   "AND (d.defaclnamespace=0 OR "+
   "d.defaclnamespace=(SELECT oid FROM pg_namespace WHERE nspname='clean')) "+
   "AND a.privilege_type IN ('INSERT','UPDATE','DELETE')",
   [role,basics.actor]
 )).rows;
 output.defaultGrantSource=grants.length>0?
   "GLOBAL_OR_CLEAN_SCHEMA_DEFAULT_ACL":"NO_SPECIAL_DEFAULT_ACL_FOUND";
 const privs=["INSERT","UPDATE","DELETE"];
 output.defaultAclGrants=Object.fromEntries(privs.map(p=>[p.toLowerCase(),{
  runtime:grants.some(g=>g.privilege===p && g.runtime_eligible===true),
  public:grants.some(g=>g.privilege===p && g.public_grant===true)
 }]));
 if(output.runtimeRoleIsAdminOwner)
   output.likelyReason="RUNTIME_IS_DDL_OWNER_IMPLICIT_FULL_TABLE_RIGHTS";
 else if(output.runtimeInheritsAdminPrivileges)
   output.likelyReason="RUNTIME_INHERITS_DDL_OWNER_TABLE_RIGHTS";
 else if(output.defaultAclGrants.update.runtime||
         output.defaultAclGrants.delete.runtime||
         output.defaultAclGrants.update.public||
         output.defaultAclGrants.delete.public)
   output.likelyReason="EXISTING_DEFAULT_ACL_GRANTS_WRITE_PRIVILEGES";
 else if(!output.runtimeHasSchemaUsage)
   output.likelyReason="RUNTIME_SCHEMA_USAGE_UNAVAILABLE_PRE_MIGRATION";
 else
   output.likelyReason="POST_DDL_PERMISSION_FAILED_OTHER_CONDITION";
 output.status="READONLY_PERMISSION_FACTS_OBSERVED";
 await db.query("ROLLBACK");
}catch(e){
 output.status="HOLD_READONLY_AUDIT";
 const msg=String(e?.message??"");
 output.hold=msg.startsWith("GATE05_PERMISSION_AUDIT_")?
  msg:"DATABASE_READ_OR_GIT_HOLD";
}finally{
 if(db)await db.end().catch(()=>undefined);
 console.log(JSON.stringify(output,null,2));
 if(output.status!=="READONLY_PERMISSION_FACTS_OBSERVED")process.exitCode=2;
}