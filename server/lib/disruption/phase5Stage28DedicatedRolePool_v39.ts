/**
 * Phase5 Stage28 — NONPAID, exact role-bound PostgreSQL session adapter.
 *
 * Stage27 owner installed four NOLOGIN group roles, but NO login members.
 * A later separately reviewed GitHub-only credential must obtain SET=true,
 * INHERIT=false, ADMIN=false membership in exactly one group. Until then
 * every real connection attempts to use this adapter will fail closed.
 *
 * This module NEVER creates users, memberships, passwords, PRE rows, source
 * GETs, Alerts, migration/role grants, or a scheduler. It cannot validate
 * provider Contents rights, actual flight T, or scientific freeze.
 *
 * Every checked-out connection is destroyed on release to prevent role
 * state leaking to a new borrower or application pool.
 */
import type {Pool,PoolClient,QueryResult} from "pg";

export const P5_STAGE28_GROUPS={
 prepare:"phase5_fids_prepare_prod_20261107",
 source:"phase5_fids_source_prod_20261107",
 pre:"phase5_fids_pre_writer_prod_20261107",
 witness:"phase5_fids_t24_witness_prod_20261107"
} as const;
export type P5Stage28Group=keyof typeof P5_STAGE28_GROUPS;

const LOGIN=/^[a-z][a-z0-9_]{5,60}$/;
const deny=(code:string):never=>{throw Error("REFUSED_P5_STAGE28_"+code);};
export interface P5Stage28DedicatedSessionPermit{
 group:P5Stage28Group;
 /** Reviewed expected real login role, not a group or app-runtime login. */
 reviewedDedicatedLogin:string;
 /** Reviewed app login (MUST NOT be used as the dedicated worker). */
 forbiddenApplicationLogin:string;
}

function valid(x:P5Stage28DedicatedSessionPermit){
 if(!x||!Object.prototype.hasOwnProperty.call(P5_STAGE28_GROUPS,x.group)||
   !LOGIN.test(x.reviewedDedicatedLogin??"")||
   !LOGIN.test(x.forbiddenApplicationLogin??"")||
   x.reviewedDedicatedLogin===x.forbiddenApplicationLogin||
   Object.values(P5_STAGE28_GROUPS).includes(
     x.reviewedDedicatedLogin as typeof P5_STAGE28_GROUPS[P5Stage28Group]))
  deny("NO_INDEPENDENT_DEDICATED_LOGIN_SCOPE");
}

const BEFORE=[
 "SELECT current_database() AS db,current_setting('server_version_num') AS ver,",
 "current_user AS effective_role,session_user AS session_login,",
 "auth.rolcanlogin AS login_enabled,auth.rolsuper AS login_superuser,",
 "auth.rolcreaterole AS login_admin,auth.rolbypassrls AS login_bypass_rls,",
 "target.rolcanlogin AS group_login_enabled,",
 "target.rolinherit AS group_inherits,",
 "pg_has_role(session_user,$1::text,'SET') AS can_set_role",
 "FROM pg_catalog.pg_roles auth CROSS JOIN pg_catalog.pg_roles target",
 "WHERE auth.rolname=session_user AND target.rolname=$1"
].join(" ");
const MEMBERS=[
 "SELECT target.rolname AS target_role,a.admin_option,",
 "a.set_option,a.inherit_option",
 "FROM pg_catalog.pg_auth_members a",
 "JOIN pg_catalog.pg_roles target ON target.oid=a.roleid",
 "JOIN pg_catalog.pg_roles login ON login.oid=a.member",
 "WHERE login.rolname=session_user AND",
 "target.rolname=ANY($1::text[])"
].join(" ");
const AFTER=[
 "SELECT current_user AS effective_role,session_user AS session_login,",
 "has_table_privilege(current_user,'clean.flight_snapshots','INSERT') AS can_write_pre,",
 "has_table_privilege(current_user,'clean.phase5_t24_postcommit_witness_v39','INSERT') AS can_write_witness,",
 "has_table_privilege(current_user,'clean.phase5_fids_allowed_query_v39','INSERT') AS can_prepare,",
 "has_table_privilege(current_user,'clean.phase5_fids_original_binding_v39','INSERT') AS can_write_original,",
 "has_table_privilege(current_user,'clean.phase5_fids_physical_attempt_v39','INSERT') AS can_directly_write_paid_attempt",
 "FROM pg_catalog.pg_roles WHERE rolname=current_user"
].join(" ");

async function checkedOut(
 underlying:Pick<Pool,"connect">,permit:P5Stage28DedicatedSessionPermit
):Promise<PoolClient>{
 valid(permit);
 if(!underlying||typeof underlying.connect!=="function")
  deny("MISSING_DEDICATED_DATABASE_CONNECTION");
 const expected=P5_STAGE28_GROUPS[permit.group];
 const client:PoolClient=await underlying.connect();
 const releaseOriginal=client.release.bind(client);
 let released=false;
 try{
  // Require a fresh session, not a role already SET by an earlier borrower.
  const before=await client.query(BEFORE,[expected]);
  const b=before.rows[0];
  if(before.rowCount!==1||b.db!=="neondb"||Number(b.ver)<160000||
     b.session_login!==permit.reviewedDedicatedLogin||
     b.effective_role!==permit.reviewedDedicatedLogin||
     b.login_enabled!==true||b.login_superuser!==false||
     b.login_admin!==false||b.login_bypass_rls!==false||
     b.group_login_enabled!==false||b.group_inherits!==false||
     b.can_set_role!==true)
   deny("UNREVIEWED_ROLE_LOGIN_OR_SET_PRIVILEGE");
  const membership=await client.query(MEMBERS,[Object.values(P5_STAGE28_GROUPS)]);
  const a=membership.rows;
  if(membership.rowCount!==1||a.length!==1||
     a[0].target_role!==expected||
     a[0].set_option!==true||
     a[0].inherit_option!==false||
     a[0].admin_option!==false)
   deny("CROSS_GROUP_OR_ADMIN_RUNTIME_MEMBERSHIP");
  // Direct pg_auth_members rows are not sufficient. PostgreSQL16 SET or
  // INHERIT permissions can be transitive through an intermediate role.
  // Require exactly one reachable group via SET, and no inherited group.
  const reachable=await client.query(
   "SELECT r.rolname,pg_has_role(session_user,r.oid,'SET') AS can_set,"+
   "pg_has_role(session_user,r.oid,'USAGE') AS inherits "+
   "FROM pg_catalog.pg_roles r WHERE r.rolname=ANY($1::text[])",
   [Object.values(P5_STAGE28_GROUPS)]
  );
  if(reachable.rows.length!==4||reachable.rows.some((r:Record<string,unknown>)=>
      r.inherits!==false||
      r.can_set!==(r.rolname===expected)))
   deny("INDIRECT_CROSS_GROUP_OR_INHERITED_RUNTIME_ACCESS");

  // This SQL interpolation is safe ONLY because expected comes from the
  // above immutable four-name source whitelist; never interpolate inputs.
  await client.query("SET ROLE "+expected);
  const after=await client.query(AFTER);
  const v=after.rows[0];
  if(after.rowCount!==1||v.effective_role!==expected||
      v.session_login!==permit.reviewedDedicatedLogin||
      v.can_directly_write_paid_attempt!==false)
   deny("CURRENT_USER_OR_PAID_DIRECT_WRITE_BREACH");
  const match={
   prepare:v.can_prepare===true&&
     v.can_write_original===false&&v.can_write_pre===false&&
     v.can_write_witness===false,
   source:v.can_prepare===false&&
     v.can_write_original===true&&v.can_write_pre===false&&
     v.can_write_witness===false,
   pre:v.can_prepare===false&&
     v.can_write_original===false&&v.can_write_pre===true&&
     v.can_write_witness===false,
   witness:v.can_prepare===false&&
     v.can_write_original===false&&v.can_write_pre===false&&
     v.can_write_witness===true
  };
  if(!match[permit.group])deny("NON_ISOLATED_ROLE_PRIVILEGE_MATRIX");

  // Never return this connection to a shared pool with SET ROLE active.
  // A fatal query error or ambiguous transaction will also destroy it.
  client.release=()=>{if(released)return;released=true;releaseOriginal(true);};
  return client;
 }catch(e){
  if(!released){released=true;releaseOriginal(true);}
  throw e;
 }
}
/**
 * A minimal adapter for existing Stage9, Stage14, Stage17 and source ports.
 * pool.query() is routed through a separately verified SET ROLE connection;
 * each checked out client is destroyed on release rather than pooled again.
 * ONLY connect to a dedicated worker-login pool, NEVER an app runtime pool.
 */
export function makeP5Stage28DedicatedRolePool(
 underlying:Pick<Pool,"connect">,
 permit:P5Stage28DedicatedSessionPermit
):Pick<Pool,"connect"|"query">{
 valid(permit);
 const connect=()=>checkedOut(underlying,permit);
 async function query(sql:string,params?:unknown[]):Promise<QueryResult>{
  const c=await connect();
  try{
   return await c.query(sql,params);
  }finally{
   c.release();
  }
 }
 return {connect,query} as unknown as Pick<Pool,"connect"|"query">;
}
