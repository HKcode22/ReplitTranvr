/**
 * Stage31: one-shot GitHub Actions connection smoke for the THREE nonpaid
 * Stage30 production LOGIN/secret identities. Absolutely no provider,
 * flight/payload SELECTs, DB writes, role grants, or scheduled collection.
 *
 * The three DB connection URLs live ONLY in encrypted Actions secrets;
 * never print them or include them in thrown error messages.
 *
 * Production path: exact main-only workflow_dispatch.
 * CI path: disposable localhost PG16, PR-only, synthetic credentials.
 */
import {Pool,type PoolClient} from "pg";
import {
 makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS,
 type P5Stage28Group
} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";

const ACK="VERIFY_THREE_NONPAID_WORKERS_READONLY_NO_PROVIDER";
const deny=(msg:string):never=>{throw Error("REFUSED_P5_STAGE31_"+msg);};
const ROLES=[
 {group:"prepare" as const,login:"phase5_p30_prepare_login_20261107",
  env:"P5_V39_PREPARE_DATABASE_URL"},
 {group:"pre" as const,login:"phase5_p30_pre_login_20261107",
  env:"P5_V39_PRE_DATABASE_URL"},
 {group:"witness" as const,login:"phase5_p30_witness_login_20261107",
  env:"P5_V39_T24_WITNESS_DATABASE_URL"}
];
type Env=Record<string,string|undefined>;

function preflight(env:Env){
 if(env.GITHUB_ACTIONS!=="true"||
    env.P5_STAGE31_READONLY_ONCE!==ACK||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.AERODATABOX_API_KEY)deny("NOT_NO_PROVIDER_GITHUB_ONLY_MODE");
 const mainOnly=env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
    env.GITHUB_REF==="refs/heads/main"&&
    env.P5_STAGE31_CI_DISPOSABLE!=="1";
 const disposable=env.GITHUB_EVENT_NAME==="pull_request"&&
    env.P5_STAGE31_CI_DISPOSABLE==="1"&&
    /^refs\/pull\/[0-9]+\/merge$/.test(env.GITHUB_REF??"");
 if(!mainOnly&&!disposable)
  deny("ONLY_MANUAL_MAIN_OR_DISPOSABLE_PR_TEST");
 const parsed:{group:P5Stage28Group,login:string,url:string}[]=[];
 const seen=new Set<string>();
 for(const e of ROLES){
  const value=env[e.env];
  if(!value)deny("MISSING_REVIEWED_WORKER_SECRET");
  let url:URL;
  try{url=new URL(value);}
  catch{deny("INVALID_PRIVATE_DATABASE_URL");}
  if(!["postgres:","postgresql:"].includes(url.protocol)||
      decodeURIComponent(url.username)!==e.login||!url.password||
      url.pathname!=="/neondb"||url.hash)
   deny("UNREVIEWED_DB_LOGIN_OR_DATABASE");
  if(disposable&&(url.hostname!=="localhost"||
                  url.port!=="5432"||
                  url.password!=="ci-only"))
   deny("CI_MUST_BE_DISPOSABLE_LOCALHOST");
  if(seen.has(value))deny("WORKER_DATABASE_URL_REUSED");
  seen.add(value);
  parsed.push({group:e.group,login:e.login,url:value});
 }
 return {mode:mainOnly?"PRODUCTION_MANUAL_MAIN":"DISPOSABLE_PR_TEST",parsed};
}

export async function verifyP5Stage31WorkerReadOnlyConnections(env:Env){
 const {mode,parsed}=preflight(env);
 const reports:{group:string,expectedEffectiveRole:string,roleSessionVerified:boolean,
    readOnlyTransactionVerified:boolean,dbWrites:number}[]=[];
 for(const item of parsed){
  const pool=new Pool({connectionString:item.url,max:1,
     connectionTimeoutMillis:7500,idleTimeoutMillis:2000,
     statement_timeout:9000});
  let client:PoolClient|undefined;
  let tx=false;
  try{
   const strict=makeP5Stage28DedicatedRolePool(pool,{
     group:item.group,reviewedDedicatedLogin:item.login,
     forbiddenApplicationLogin:"phase5_runtime_application_login"
   });
   client=await strict.connect();
   await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
   await client.query("SET LOCAL statement_timeout='7000ms'");
   const q=await client.query(
     "SELECT current_database() AS db,current_user AS effective_role,"+
     "session_user AS actual_login,"+
     "current_setting('transaction_read_only') AS tx_readonly,"+
     "pg_is_in_recovery() AS replica");
   const x=q.rows[0];
   if(q.rowCount!==1||x.db!=="neondb"||
      x.effective_role!==P5_STAGE28_GROUPS[item.group]||
      x.actual_login!==item.login||x.tx_readonly!=="on"||
      x.replica!==false)
    deny("DB_READONLY_EFFECTIVE_IDENTITY_MISMATCH");
   // SQL reads catalog metadata ONLY. We deliberately do NOT SELECT
   // source originals, flight_snapshots, budget ledgers, or user data.
   await client.query("ROLLBACK");tx=false;
   reports.push({
    group:item.group,expectedEffectiveRole:P5_STAGE28_GROUPS[item.group],
    roleSessionVerified:true,readOnlyTransactionVerified:true,dbWrites:0
   });
  }catch{
   if(tx&&client)await client.query("ROLLBACK").catch(()=>{});
   deny("ROLE_SCOPE_READONLY_CONNECTION_FAILED_"+item.group.toUpperCase());
  }finally{
   if(client)client.release();
   await pool.end().catch(()=>{});
  }
 }
 if(reports.length!==3)deny("THREE_DISTINCT_ROLES_NOT_VERIFIED");
 return {
  status:mode==="PRODUCTION_MANUAL_MAIN"?
   "P5_STAGE31_THREE_NONPAID_GITHUB_WORKERS_LIVE_READONLY_VERIFIED":
   "P5_STAGE31_THREE_NONPAID_WORKERS_DISPOSABLE_PG16_VERIFIED",
  context:mode,verifiedDistinctWorkerRoles:3,results:reports,
  passwordOrUrlLogged:false,providerFidsGets:0,providerAlertCreates:0,
  flightRowsRead:0,flightRowsWritten:0,groupOrLoginChanges:0,
  paidSourceWorkerActivated:false,sourceRightsCertified:false,
  phase5FreezePassed:false,phase6PaidGo:false
 };
}

if(process.env.P5_STAGE31_EXECUTE_ENTRYPOINT==="1"){
 try{
  const r=await verifyP5Stage31WorkerReadOnlyConnections(process.env);
  console.log(JSON.stringify(r,null,2));
 }catch(e){
  const msg=e instanceof Error&&
    /^REFUSED_P5_STAGE31_[A-Z0-9_]+$/.test(e.message)?
    e.message:"REFUSED_P5_STAGE31_RESTRICTED_SQL_OR_UNEXPECTED_HOLD";
  console.error(msg);process.exitCode=2;
 }
}
