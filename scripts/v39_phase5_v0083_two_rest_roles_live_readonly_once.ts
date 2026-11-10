/**
 * Phase5 V0083: manual GitHub-only, nonpaid READ ONLY verification of the
 * two dedicated POST REST credentials and their actual PostgreSQL privileges.
 * No grants, DB data reads, physical reservation, FIDS, Alert, or Phase6 GO.
 */
import {Pool,type PoolClient} from "pg";
import {makeP5V0083RestDedicatedRolePool} from
 "../server/lib/disruption/phase5V0083RestDedicatedRolePool_v39";

const ACK="VERIFY_V0083_TWO_REST_ROLES_READONLY_NO_PROVIDER";
const GROUPS={
 review:"phase5_other_rest_review_prod_20261108",
 reserve:"phase5_other_rest_reserve_prod_20261108"
} as const;
type Group=keyof typeof GROUPS;
type Env=Record<string,string|undefined>;
const ROLES=[
 {group:"review" as const,login:"phase5_p5_other_rest_review_login_20261110",
  key:"P5_V39_OTHER_REST_REVIEW_DATABASE_URL"},
 {group:"reserve" as const,login:"phase5_p5_other_rest_reserve_login_20261110",
  key:"P5_V39_OTHER_REST_RESERVE_DATABASE_URL"}
];
const refuse=(s:string):never=>{
 throw Error("REFUSED_P5_V0083_REST_READONLY_"+s);
};
export function admitP5V0083RestReadonlyEnv(env:Env){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    env.P5_V0083_REST_READONLY_CONFIRM!==ACK||
    env.P5_V0083_REST_READONLY_EXECUTE!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.AERODATABOX_API_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||
    env.V39_DATABASE_RUNTIME_URL)
  refuse("NOT_MANUAL_MAIN_READONLY_NO_PROVIDER");
 const out: Array<{group:Group;login:string;url:string}>=[];
 let host="";
 for(const r of ROLES){
  const value=env[r.key];
  if(!value)refuse("UNCOMMISSIONED_REST_SECRET");
  let parsed:URL;
  try{parsed=new URL(value);}catch{refuse("INVALID_REST_DATABASE_URL");}
  let user="";
  try{user=decodeURIComponent(parsed.username);}
  catch{refuse("INVALID_ENCODED_REST_LOGIN");}
  if(!["postgres:","postgresql:"].includes(parsed.protocol)||
     user!==r.login||!parsed.password||!parsed.hostname||
     parsed.pathname!=="/neondb"||parsed.hash)
   refuse("UNREVIEWED_DEDICATED_REST_LOGIN_OR_DB");
  const target=parsed.hostname+":"+parsed.port+parsed.pathname;
  if(host&&target!==host)refuse("REVIEW_AND_RESERVE_DIFFERENT_DB");
  host=target;
  out.push({group:r.group,login:r.login,url:value});
 }
 if(out[0].url===out[1].url)refuse("REUSED_REST_CREDENTIAL");
 return out;
}

/** Only catalog/ACL queries; never SELECT provider responses or any rows. */
const CATALOG_QUERY=[
 "SELECT current_database() AS db,current_user AS effective_role,",
 "session_user AS actual_login,",
 "current_setting('transaction_read_only') AS tx_readonly,",
 "current_setting('server_version_num')::int AS pg_version,",
 "has_table_privilege(current_user,",
 "'clean.phase5_other_rest_reviewed_call_v39','INSERT') AS review_insert,",
 "has_table_privilege(current_user,",
 "'clean.phase5_other_rest_reviewed_call_v39','SELECT') AS review_select,",
 "has_table_privilege(current_user,",
 "'clean.phase5_other_rest_reviewed_call_v39','UPDATE') AS review_update,",
 "has_table_privilege(current_user,",
 "'clean.phase5_other_rest_reviewed_call_v39','DELETE') AS review_delete,",
 "has_table_privilege(current_user,",
 "'clean.phase5_other_rest_physical_reservation_v39','INSERT') AS reserve_insert,",
 "has_table_privilege(current_user,",
 "'clean.phase5_other_rest_physical_reservation_v39','SELECT') AS reserve_select,",
 "has_table_privilege(current_user,",
 "'clean.phase5_other_rest_physical_reservation_v39','UPDATE') AS reserve_update,",
 "has_table_privilege(current_user,",
 "'clean.phase5_other_rest_physical_reservation_v39','DELETE') AS reserve_delete,",
 "has_function_privilege(current_user,",
 "'clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)',",
 "'EXECUTE') AS reserve_execute"
].join(" ");

export interface P5V0083ReadonlyCatalogRow{
 db:string;effective_role:string;actual_login:string;
 tx_readonly:string;pg_version:number|string;
 review_insert:boolean;review_select:boolean;
 review_update:boolean;review_delete:boolean;
 reserve_insert:boolean;reserve_select:boolean;
 reserve_update:boolean;reserve_delete:boolean;
 reserve_execute:boolean;
}
export function verifyP5V0083RestReadonlyCatalog(
 row:P5V0083ReadonlyCatalogRow|undefined,group:Group,login:string
){
 if(!row||row.db!=="neondb"||
    row.effective_role!==GROUPS[group]||row.actual_login!==login||
    row.tx_readonly!=="on"||Number(row.pg_version)<160000)
  refuse("REAL_SESSION_OR_READONLY_TRANSACTION_MISMATCH");
 if(row.review_insert!==(group==="review")||
    row.reserve_execute!==(group==="reserve")||
    [row.review_select,row.review_update,row.review_delete,
     row.reserve_insert,row.reserve_select,row.reserve_update,
     row.reserve_delete].some(x=>x!==false))
  refuse("REST_REVIEW_RESERVE_PRIVILEGES_TOO_BROAD_OR_MISSING");
 return {group,effectiveRole:GROUPS[group],actualLogin:login,
  readOnlyTransactionVerified:true,limitedRESTPrivilegeVerified:true,
  paidGetReservations:0,flightRowsRead:0,databaseWrites:0};
}
export async function auditP5V0083RestReadOnlySession(
 strict:Pick<Pool,"connect">,group:Group,login:string
){
 const c:PoolClient=await strict.connect();
 let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='7000ms'");
  const q=await c.query(CATALOG_QUERY);
  if(q.rowCount!==1)refuse("CATALOG_RESULT_NOT_ONE");
  const verified=verifyP5V0083RestReadonlyCatalog(q.rows[0],group,login);
  await c.query("ROLLBACK");tx=false;
  return verified;
 }finally{
  if(tx)await c.query("ROLLBACK").catch(()=>{});
  c.release();
 }
}
export async function verifyP5V0083RestLiveReadonly(env:Env){
 const approved=admitP5V0083RestReadonlyEnv(env);
 const results: ReturnType<typeof verifyP5V0083RestReadonlyCatalog>[]=[];
 for(const r of approved){
  const pool=new Pool({
   connectionString:r.url,max:1,connectionTimeoutMillis:7500,
   idleTimeoutMillis:1500,statement_timeout:9000
  });
  try{
   const strict=makeP5V0083RestDedicatedRolePool(pool,{
    group:r.group,reviewedDedicatedLogin:r.login,
    forbiddenApplicationLogin:"phase5_p5_source_login_20261108"
   });
   results.push(await auditP5V0083RestReadOnlySession(
    strict,r.group,r.login));
  }catch{
   refuse("LIVE_RESTRICTED_REST_ROLE_NOT_COMMISSIONED_"+r.group.toUpperCase());
  }finally{await pool.end().catch(()=>{});}
 }
 if(results.length!==2)refuse("TWO_REST_ROLES_NOT_VERIFIED");
 return{
  status:"P5_V0083_TWO_POST_REST_LOGINS_READONLY_VERIFIED",
  ...{results},actualReviewedRoles:2,providerCalls:0,
  alertCreates:0,databaseWrites:0,flightRowsRead:0,
  grantedOrInstalledRoles:0,providerSourceRightsCertified:false,
  providerOutcomeDataCertified:false,phase5FreezeGranted:false,
  phase6PaidGoGranted:false
 };
}
if(process.env.P5_V0083_REST_READONLY_EXECUTE==="1"){
 try{
  const x=await verifyP5V0083RestLiveReadonly(process.env);
  console.log(JSON.stringify(x,null,2));
 }catch(e){
  const m=e instanceof Error&&
   /^REFUSED_P5_V0083_REST_READONLY_[A-Z0-9_]+$/.test(e.message)?
   e.message:"REFUSED_P5_V0083_REST_READONLY_SANITIZED_HOLD";
  console.error(m);process.exitCode=2;
 }
}
