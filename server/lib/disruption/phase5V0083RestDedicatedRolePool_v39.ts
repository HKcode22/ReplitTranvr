/**
 * Future Phase5 POST V0083 two-role PostgreSQL session adapter.
 * Separate NOLOGIN groups were installed in the 2026-11-08 V0083 owner run;
 * new dedicated LOGINS/memberships are NOT currently certified/commissioned.
 * Never use the ordinary app pool or reuse the prior SOURCE worker login.
 */
import type {Pool,PoolClient,QueryResult} from "pg";
const REVIEW="phase5_other_rest_review_prod_20261108";
const RESERVE="phase5_other_rest_reserve_prod_20261108";
const GROUPS={review:REVIEW,reserve:RESERVE} as const;
const ALL_GROUPS=[
 "phase5_fids_prepare_prod_20261107",
 "phase5_fids_source_prod_20261107",
 "phase5_fids_pre_writer_prod_20261107",
 "phase5_fids_t24_witness_prod_20261107",
 "phase5_fids_budget_freeze_prod_20261108",REVIEW,RESERVE
];
const L=/^[a-z][a-z0-9_]{8,60}$/;
const refuse=(s:string):never=>{throw Error("REFUSED_P5_V0083_REST_ROLE_"+s);};
export interface P5V0083RestRolePermit{
 group:"review"|"reserve";
 reviewedDedicatedLogin:string;
 forbiddenApplicationLogin:string;
}
function verify(p:P5V0083RestRolePermit){
 if(!p||!Object.hasOwn(GROUPS,p.group)||
    !L.test(p.reviewedDedicatedLogin??"")||
    !L.test(p.forbiddenApplicationLogin??"")||
    p.reviewedDedicatedLogin===p.forbiddenApplicationLogin||
    ALL_GROUPS.includes(p.reviewedDedicatedLogin))
  refuse("NO_SEPARATE_REVIEWED_LOGIN_OR_GROUP");
}
async function connect(
 pool:Pick<Pool,"connect">,p:P5V0083RestRolePermit
):Promise<PoolClient>{
 verify(p);
 const raw=await pool.connect();
 const end=raw.release.bind(raw);let released=false;
 const release=()=>{if(!released){released=true;end(true);}};
 try{
  const q=await raw.query(
   "SELECT current_database() AS db,"+
   "current_setting('server_version_num')::int AS ver,"+
   "current_user AS role,session_user AS login,"+
   "a.rolcanlogin,a.rolsuper,a.rolcreaterole,a.rolbypassrls,"+
   "g.rolcanlogin AS group_login,g.rolinherit AS group_inherits,"+
   "pg_has_role(session_user,$1::text,'SET') AS can_set"+
   " FROM pg_catalog.pg_roles a CROSS JOIN pg_catalog.pg_roles g"+
   " WHERE a.rolname=session_user AND g.rolname=$1",
   [GROUPS[p.group]]);
  const a=q.rows[0];
  if(q.rowCount!==1||a.db!=="neondb"||Number(a.ver)<160000||
     a.role!==p.reviewedDedicatedLogin||
     a.login!==p.reviewedDedicatedLogin||
     a.rolcanlogin!==true||a.rolsuper!==false||
     a.rolcreaterole!==false||a.rolbypassrls!==false||
     a.group_login!==false||a.group_inherits!==false||
     a.can_set!==true)
   refuse("UNREVIEWED_REST_SESSION_LOGIN");
  const m=await raw.query(
   "SELECT g.rolname,m.set_option,m.inherit_option,m.admin_option"+
   " FROM pg_catalog.pg_auth_members m"+
   " JOIN pg_catalog.pg_roles g ON g.oid=m.roleid"+
   " JOIN pg_catalog.pg_roles u ON u.oid=m.member"+
   " WHERE u.rolname=session_user AND g.rolname=ANY($1::text[])",
   [ALL_GROUPS]);
  if(m.rowCount!==1||m.rows[0].rolname!==GROUPS[p.group]||
     m.rows[0].set_option!==true||
     m.rows[0].inherit_option!==false||
     m.rows[0].admin_option!==false)
   refuse("CROSS_GROUP_PRIVILEGES_OR_ADMIN");
  const t=await raw.query(
   "SELECT g.rolname,"+
   " pg_has_role(session_user,g.oid,'SET') AS can_set,"+
   " pg_has_role(session_user,g.oid,'USAGE') AS inherits"+
   " FROM pg_catalog.pg_roles g WHERE g.rolname=ANY($1::text[])",
   [ALL_GROUPS]);
  if(t.rowCount!==7||t.rows.some(x=>
      x.can_set!==(x.rolname===GROUPS[p.group])||
      x.inherits!==false))
   refuse("TRANSITIVE_OR_INHERITED_OTHER_GROUP");
  // Two strictly constant groups: no user SQL identifier interpolation.
  await raw.query("SET ROLE "+GROUPS[p.group]);
  const rights=await raw.query(
   "SELECT current_user AS role,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_other_rest_reviewed_call_v39','INSERT') AS can_review,"+
   "has_function_privilege(current_user,"+
   "'clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)',"+
   "'EXECUTE') AS can_reserve,"+
   "has_table_privilege(current_user,'clean.flight_snapshots','INSERT') AS can_pre,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_original_binding_v39','INSERT') AS can_source,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_physical_attempt_v39','INSERT') AS can_paid_source");
  const v=rights.rows[0];
  if(rights.rowCount!==1||v.role!==GROUPS[p.group]||
     v.can_pre!==false||v.can_source!==false||
     v.can_paid_source!==false||
     (p.group==="review"?!(v.can_review===true&&v.can_reserve===false):
      !(v.can_review===false&&v.can_reserve===true)))
   refuse("REVIEW_AND_RESERVE_NOT_INDEPENDENT");
  raw.release=release;
  return raw;
 }catch(e){release();throw e;}
}
export function makeP5V0083RestDedicatedRolePool(
 pool:Pick<Pool,"connect">,permit:P5V0083RestRolePermit
):Pick<Pool,"connect"|"query">{
 verify(permit);
 const get=()=>connect(pool,permit);
 const query=async(sql:string,args?:unknown[]):Promise<QueryResult>=>{
  const client=await get();
  try{return await client.query(sql,args);}finally{client.release();}
 };
 return {connect:get,query} as Pick<Pool,"connect"|"query">;
}
