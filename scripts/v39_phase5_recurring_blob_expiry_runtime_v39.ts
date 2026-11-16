/** Replit-local fixed due-object expiry command; NOT an automatic scheduler.
 * Keep all database, role, storage and expiry admission in the shared
 * import-safe core. Historical imports from this CLI remain supported.
 */
import {Pool} from "pg";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {createRequiredProviderBlobStoreV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
import {admitP5RecurringExpiryRuntime,executeP5RecurringExpiryRuntime} from "../server/lib/disruption/phase5RecurringExpiryRuntime_v39";
export * from "../server/lib/disruption/phase5RecurringExpiryRuntime_v39";
function HOLD(x:string):never{throw Error("HOLD_P5_RECURRING_EXPIRY_"+x);}
async function main(){
 let writer:Pool|undefined,reader:Pool|undefined;
 try{
  const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",timeout:5000,stdio:["ignore","pipe","ignore"]}).trim();
  const status=execFileSync("git",["status","--porcelain","--untracked-files=normal"],{encoding:"utf8",timeout:5000,stdio:["ignore","pipe","ignore"]}).trim();
  if(status)HOLD("REVIEWED_CHECKOUT_NOT_CLEAN");
  const remote=execFileSync("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"],{encoding:"utf8",timeout:10000,stdio:["ignore","pipe","ignore"]}).trim();
  if(sha!==remote)HOLD("MAIN_CHANGED");
  const config=admitP5RecurringExpiryRuntime(process.env,sha);
  // No broad runtime pool and no fallback to DATABASE_URL. Two scoped logins
  // with strict read-only reader, short SQL/connect budgets and bounded batch.
  writer=new Pool({connectionString:config.writerUrl,max:2,connectionTimeoutMillis:7000,query_timeout:15000,
   options:"-c statement_timeout=10000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=60000"});
  reader=new Pool({connectionString:config.readerUrl,max:1,connectionTimeoutMillis:7000,query_timeout:15000,
   options:"-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=5000"});
  const a=createRequiredProviderBlobStoreV39(),b=createRequiredProviderBlobStoreV39();
  const result=await executeP5RecurringExpiryRuntime({...config,writer,reader,stores:{writer:a,reader:b}});
  console.log(JSON.stringify(result));
  if(result.status==="BACKLOG_REMAINS_AT_CUTOFF")process.exitCode=2;
 }catch(e){
  const msg=e instanceof Error?e.message:"";
  console.error(/^HOLD_P5_RECURRING_EXPIRY_[A-Z0-9_]+$/.test(msg)?msg:"HOLD_P5_RECURRING_EXPIRY_UNKNOWN_NO_RETRY");
  process.exitCode=2;
 }finally{await writer?.end().catch(()=>{});await reader?.end().catch(()=>{});}
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href)void main();
