/** Restricted GitHub-only aggregate Phase7 expiry. Separate from primary
 * FIDS removal; same cadence, no provider key, STOP default. */
import {Pool} from "pg";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39";
import {P7_INERT_ROLES} from "../server/lib/disruption/phase7InertStorageCommission_v39";
import {runP7ExpiryOnce} from "../server/lib/disruption/phase7ExpiryRunner_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_EXPIRY_RUNTIME_"+s);};
async function main(){
 const e=process.env,mode=e.P7_EXPIRY_MODE;
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_RUN_ATTEMPT!=="1"||
  !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA??"")||e.GITHUB_SHA!==e.P7_EXPIRY_APPROVED_MAIN_SHA||
  e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
  ["DATABASE_URL","V39_DATABASE_RUNTIME_URL","AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET"].some(k=>e[k])||
  e.NODE_TLS_REJECT_UNAUTHORIZED==="0"||!["VERIFY_ONLY","APPLY_DUE_ONLY"].includes(mode??"")||
  (mode==="APPLY_DUE_ONLY"&&(e.P7_EXPIRY_APPROVAL!=="APPLY_P7_DUE_ONLY_NO_PROVIDER"||e.P7_EXPIRY_ENABLED!=="true"))||
  (mode==="VERIFY_ONLY"&&e.P7_EXPIRY_WRITER_DATABASE_URL))hold("WRONG_NO_PROVIDER_SCOPE");
 const full=e.P6_FULL_RETENTION_BACKSTOP_REQUEST??"0";
 if(!["0","1"].includes(full)||full==="1"&&(e.GITHUB_EVENT_NAME!=="workflow_dispatch"||mode!=="APPLY_DUE_ONLY"||e.P6_FULL_RETENTION_BACKSTOP_ENABLED!=="true")||
  mode==="APPLY_DUE_ONLY"&&e.GITHUB_EVENT_NAME!=="schedule"&&full!=="1"||
  mode==="VERIFY_ONLY"&&(e.GITHUB_EVENT_NAME!=="workflow_dispatch"||full!=="0"))hold("BACKSTOP_OR_NATIVE_SCOPE");
 function url(raw:string|undefined,role:string){
  const u=new URL(raw??"");
  if(!sameP6NeonDatabaseEndpoint(u,u)||decodeURIComponent(u.username)!==role||!u.password||
   u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="verify-full"||
   [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
   (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))hold("RESTRICTED_TLS_URL");
  return u;
 }
 const u=url(e.P7_EXPIRY_READER_DATABASE_URL,P7_INERT_ROLES.expiryReader);
 const w=mode==="APPLY_DUE_ONLY"?url(e.P7_EXPIRY_WRITER_DATABASE_URL,P7_INERT_ROLES.expiryWriter):undefined;
 if(w&&!sameP6NeonDatabaseEndpoint(u,w))hold("DATABASE_ENDPOINT_DRIFT");
 const make=(v:URL)=>new Pool({connectionString:v.toString(),max:1,connectionTimeoutMillis:8000,query_timeout:20000,application_name:"phase7_due_only_expiry"});
 const reader=make(u),writer=w?make(w):undefined;
 try{const r=await runP7ExpiryOnce(reader,writer,mode as "VERIFY_ONLY"|"APPLY_DUE_ONLY");console.log(JSON.stringify(r));if(r.status==="P7_EXPIRY_BACKLOG_HOLD")process.exitCode=2;}
 finally{await Promise.allSettled([reader.end(),...(writer?[writer.end()]:[])]);}
}
main().catch(()=>{console.error("HOLD_P7_EXPIRY_REDACTED_READBACK_NO_REPLAY");process.exitCode=2;});
