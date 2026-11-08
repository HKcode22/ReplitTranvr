/**
 * Exactly one SOURCE login: real GitHub Actions main-only metadata-only
 * READ ONLY handshake, or PR disposable localhost PG16.
 *
 * Does not open FIDS/Alert HTTP, touch source payload, PRE, budget or flight
 * rows, create roles, or permit Phase6. The source URL is never printed.
 */
import {Pool,type PoolClient} from "pg";
import {
 makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS
} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";

type Env=Record<string,string|undefined>;
const LOGIN="phase5_p5_source_login_20261108";
const SECRET="V39_P5_SOURCE_DATABASE_URL";
const CONFIRM="VERIFY_SOURCE_ROLE_READONLY_NO_PROVIDER";
function hold(code:string):never{throw Error("REFUSED_P5_SOURCE_READONLY_"+code);}

function preflight(env:Env){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.P5_SOURCE_READONLY_CONFIRM!==CONFIRM||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.AERODATABOX_API_KEY||env.AERODATABOX_WEBHOOK_SECRET)
  hold("GITHUB_ONLY_NO_PROVIDER_CONTEXT_REQUIRED");
 const live=env.GITHUB_REF==="refs/heads/main"&&
     env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
     env.P5_SOURCE_READONLY_CI_DISPOSABLE!=="1"&&
     env.GITHUB_RUN_ATTEMPT==="1";
 const ci=env.P5_SOURCE_READONLY_CI_DISPOSABLE==="1"&&
     env.GITHUB_EVENT_NAME==="pull_request"&&
     /^refs\/pull\/[0-9]+\/merge$/.test(env.GITHUB_REF??"");
 if(!live&&!ci)hold("ONLY_MANUAL_MAIN_OR_DISPOSABLE_PR_TEST");
 const str=env[SECRET];
 if(!str)hold("SOURCE_GITHUB_ACTIONS_SECRET_MISSING");
 let url:URL;
 try{url=new URL(str);}catch{hold("INVALID_DATABASE_URL");}
 if(!["postgres:","postgresql:"].includes(url.protocol)||
    decodeURIComponent(url.username)!==LOGIN||!url.password||
    url.pathname!=="/neondb"||url.hash)
  hold("UNREVIEWED_SOURCE_LOGIN_OR_DATABASE");
 if(ci&&(url.hostname!=="localhost"||url.port!=="5432"||
    url.password!=="ci-only"))
  hold("CI_ONLY_DISPOSABLE_LOCALHOST");
 return {url:str,mode:live?"PRODUCTION_MANUAL_MAIN":"DISPOSABLE_PR_TEST"};
}

export async function verifyP5SourceRealGitHubReadOnly(env:Env){
 const {url,mode}=preflight(env);
 const raw=new Pool({connectionString:url,max:1,connectionTimeoutMillis:8000,
   idleTimeoutMillis:2000,statement_timeout:9000});
 let client:PoolClient|undefined,tx=false;
 try{
  const strict=makeP5Stage28DedicatedRolePool(raw,{
   group:"source",
   reviewedDedicatedLogin:LOGIN,
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  client=await strict.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='7000ms'");
  const meta=await client.query(
   "SELECT current_database() AS db,current_user AS effective_role,"+
   "session_user AS actual_login,"+
   "current_setting('transaction_read_only') AS tx_readonly,"+
   "pg_is_in_recovery() AS replica");
  const row=meta.rows[0];
  if(meta.rowCount!==1||row.db!=="neondb"||
     row.effective_role!==P5_STAGE28_GROUPS.source||
     row.actual_login!==LOGIN||row.tx_readonly!=="on"||
     row.replica!==false)
   hold("DB_ROLE_OR_READONLY_SESSION_INVALID");
  // No SELECT from project tables (not even count); SQL metadata ONLY.
  // No EXECUTE of budget reservation or prearm functions.
  await client.query("ROLLBACK");tx=false;
  return {
   status:mode==="PRODUCTION_MANUAL_MAIN"?
     "P5_SOURCE_GITHUB_REAL_READONLY_ROLE_VERIFIED":
     "P5_SOURCE_DISPOSABLE_PG16_READONLY_ROLE_VERIFIED",
   mode,sessionLogin:LOGIN,effectiveRole:P5_STAGE28_GROUPS.source,
   authenticatedRoleSet:true,readOnlyTransactionVerified:true,
   sourceSecretValueLogged:false,sourceRoleInstalledAlready:true,
   sourceRoleChanges:0,providerFidsGets:0,alertCreates:0,
   sourceOrBudgetRowsRead:0,flightRowsRead:0,flightRowsWritten:0,
   livePaidSourceActivated:false,sourceContentsRightsCertified:false,
   phase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(tx&&client)await client.query("ROLLBACK").catch(()=>{});
  const m=e instanceof Error?e.message:"";
  if(/^REFUSED_P5_SOURCE_READONLY_[A-Z0-9_]+$/.test(m))throw e;
  hold("DB_ROLE_OR_READONLY_QUERY_FAILED");
 }finally{
  if(client)client.release();
  await raw.end().catch(()=>{});
 }
}

if(process.env.P5_SOURCE_READONLY_EXECUTE==="1"){
 try{console.log(JSON.stringify(
  await verifyP5SourceRealGitHubReadOnly(process.env),null,2));
 }catch(e){
  const msg=e instanceof Error?e.message:"";
  console.error(/^REFUSED_P5_SOURCE_READONLY_[A-Z0-9_]+$/.test(msg)?
   msg:"REFUSED_P5_SOURCE_READONLY_UNEXPECTED_HOLD");
  process.exitCode=2;
 }
}
