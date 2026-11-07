/**
 * Stage27: READ ONLY follow-up after PostgreSQL16 CREATEROLE ADMIN refusal.
 * This prints sanitized catalog counts and nothing from flight/source data.
 * No source, flight or budget table is read or modified.
 */
import pg from "pg";
const {Pool}=pg;
const EXPECTED=[
 "phase5_fids_prepare_prod_20261107",
 "phase5_fids_source_prod_20261107",
 "phase5_fids_pre_writer_prod_20261107",
 "phase5_fids_t24_witness_prod_20261107"
];
const refuse=s=>{throw Error("REFUSED_P5_STAGE27_READONLY_"+s);};
async function main(){
 let pool;
 try{
  if(process.env.P5_STAGE27_ROLE_RECONCILIATION_READONLY!=="1"||
     !process.env.DATABASE_URL)refuse("EXPLICIT_READ_ONLY_PERMISSION_OR_URL_MISSING");
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
   connectionTimeoutMillis:10000,idleTimeoutMillis:2000});
  const c=await pool.connect();
  let begun=false;
  try{
   await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
   begun=true;
   await c.query("SET LOCAL statement_timeout='8000ms'");
   const meta=await c.query(
    "SELECT current_database() AS db,"+
    "current_setting('server_version_num') AS ver,"+
    "current_setting('transaction_read_only') AS ro,"+
    "(SELECT rolsuper FROM pg_catalog.pg_roles "+
    " WHERE rolname=current_user) AS superuser,"+
    "(SELECT rolcreaterole FROM pg_catalog.pg_roles "+
    " WHERE rolname=current_user) AS can_create_role");
   const m=meta.rows[0];
   if(meta.rowCount!==1||m.db!=="neondb"||
      Number(m.ver)<160000||m.ro!=="on")refuse("DB_OR_READONLY_NOT_VERIFIED");
   const roles=await c.query(
    "SELECT r.rolname,r.rolcanlogin,r.rolinherit,r.rolsuper,"+
    "r.rolcreaterole FROM pg_catalog.pg_roles r "+
    "WHERE r.rolname=ANY($1::text[])",[EXPECTED]);
   const member=await c.query(
    "SELECT t.rolname AS target,creator.rolname=current_user AS creator_member,"+
    "a.admin_option,a.set_option,a.inherit_option "+
    "FROM pg_catalog.pg_auth_members a "+
    "JOIN pg_catalog.pg_roles t ON t.oid=a.roleid "+
    "JOIN pg_catalog.pg_roles creator ON creator.oid=a.member "+
    "WHERE t.rolname=ANY($1::text[])",[EXPECTED]);
   const formed=roles.rows.length;
   const memberships=member.rows.length;
   const danger=member.rows.filter(x=>x.creator_member!==true||
    x.set_option!==false||x.inherit_option!==false||
    x.admin_option!==true).length;
   const noLogin=roles.rows.every(r=>r.rolcanlogin===false&&
     r.rolinherit===false&&r.rolsuper===false&&r.rolcreaterole===false);
   const status=formed===0&&memberships===0?
      "STAGE27_PRIOR_REFUSAL_ROLLBACK_CONFIRMED_READONLY":
      formed===4&&noLogin&&danger===0?
      "HOLD_STAGE27_FOUR_EXISTING_ROLES_NO_BLIND_RETRY":
      "HOLD_STAGE27_PARTIAL_OR_UNEXPECTED_ROLE_STATE";
   await c.query("COMMIT");begun=false;
   console.log(JSON.stringify({
    schema:"v39.phase5.stage27.pg16-role-creator-recovery-readonly.v1",
    status,expectedPrimaryDatabaseVerified:true,
    transactionReadOnlyVerified:true,
    creatorIsSuperuser:m.superuser===true,
    creatorHasCreateRolePrivilege:m.can_create_role===true,
    matchedStage26Roles:formed,
    rolesAllNoLoginNoInherit:noLogin,
    matchingRoleMembershipRecords:memberships,
    unexpectedMemberOrRuntimeAccessRecords:danger,
    priorSuccessfulRoleInstallCertified:false,
    databaseWrites:0,productionRoleMutations:0,
    providerFidsGets:0,alertCreates:0,
    phase5FreezePassed:false,phase6PaidGo:false
   },null,2));
  }catch(e){
   if(begun)await c.query("ROLLBACK").catch(()=>{});
   throw e;
  }finally{c.release();}
 }catch(e){
  const msg=typeof e?.message==="string"&&
   /^REFUSED_P5_STAGE27_READONLY_[A-Z0-9_]+$/.test(e.message)?
   e.message:"REFUSED_P5_STAGE27_READONLY_DB_OR_UNEXPECTED_HOLD";
  console.error(msg);process.exitCode=2;
 }finally{await pool?.end().catch(()=>{});}
}
if(process.env.P5_STAGE27_ROLE_RECONCILIATION_READONLY)await main();
