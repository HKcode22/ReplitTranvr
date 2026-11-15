/** Scope-separated empty schema commissioning. No fake external review
 * SHA; this is an explicit new owner authorization solely for empty DDL.
 * Original per-migration installers and their independent review gates
 * remain unchanged. The same tested install functions, byte pins and
 * fresh independent inventories are reused. Never carry this approval
 * into payload publication, rights/retention or paid execution.
 */
import pg from "pg";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {readV0095OwnerInventory} from "./v39_phase6_v0095_owner_schema_readonly_and_once.mjs";
import {V0097_PATH,reviewV0097Sql,readV0097OwnerInventory,installV0097OnceOwner} from "./v39_phase6_v0097_day_epoch_owner_schema_readonly_and_once.mjs";
import {V0098_PATH,reviewV0098Sql,readV0098OwnerInventory,installV0098OnceOwner} from "./v39_phase6_v0098_owner_schema_readonly_and_once.mjs";
import {V0099_PATH,reviewV0099Sql,readV0099OwnerInventory,installV0099OnceOwner} from "./v39_phase6_v0099_owner_schema_readonly_and_once.mjs";
const hold=c=>{throw Error("HOLD_P6_EMPTY_OWNER_CHAIN_"+c);};
export const SCOPE="INSTALL_ONLY_EMPTY_V0097_V0098_V0099_NO_CONTENTS_NO_LOGIN_NO_PAID";
const FINAL="V0099_INSTALLED_EMPTY_DAILY_REVIEW_INERT_NO_GO";
const steps=[
 {name:"V0097",path:V0097_PATH,review:reviewV0097Sql,inventory:readV0097OwnerInventory,install:installV0097OnceOwner,absent:"V0095_READY_EMPTY_V0097_NOT_INSTALLED_NO_GO",ready:"V0097_INSTALLED_EMPTY_PER_DAY_INDEX_INERT_NO_GO"},
 {name:"V0098",path:V0098_PATH,review:reviewV0098Sql,inventory:readV0098OwnerInventory,install:installV0098OnceOwner,absent:"V0097_READY_EMPTY_V0098_NOT_INSTALLED_NO_GO",ready:"V0098_INSTALLED_EMPTY_PRIVATE_WIRE_EXTENSION_INERT_NO_GO"},
 {name:"V0099",path:V0099_PATH,review:reviewV0099Sql,inventory:readV0099OwnerInventory,install:installV0099OnceOwner,absent:"V0098_READY_EMPTY_V0099_NOT_INSTALLED_NO_GO",ready:FINAL}];
export function admitEmptyOwnerChain(env,local,remote){
 if(env.GITHUB_ACTIONS==="true"||env.P6_EMPTY_PRIVATE_SCHEMA_OWNER_SCOPE!==SCOPE||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    [env.AERODATABOX_API_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.RAPIDAPI_KEY,
      env.P6_PRIVATE_READER_DATABASE_URL,env.P6_PRIVATE_PUBLISHER_DATABASE_URL].some(Boolean)||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    !env.DATABASE_URL||(env.V39_DATABASE_RUNTIME_URL&&env.V39_DATABASE_RUNTIME_URL!==env.DATABASE_URL)||
    !/^[a-f0-9]{40}$/.test(local)||local!==remote||env.P6_EMPTY_PRIVATE_SCHEMA_REVIEWED_MAIN!==local)
  hold("EXACT_EMPTY_SCOPE_AND_MAIN_STOP_REQUIRED");
 let u;try{u=new URL(env.DATABASE_URL);}catch{hold("INVALID_EXISTING_OWNER_URL");}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    decodeURIComponent(u.username)!=="neondb_owner"||u.pathname!=="/neondb"||
    !u.password||!u.hostname.endsWith(".neon.tech")||u.hash||
    (u.port!==""&&u.port!=="5432")||
    u.searchParams.getAll("sslmode").length>1||
    !["require","verify-full"].includes(u.searchParams.get("sslmode")??""))
  hold("EXISTING_NEON_TLS_OWNER_REQUIRED");
 return true;
}
/** All three reviewed byte pins BEFORE any DDL, no retry on ambiguous
 * COMMIT. Each inventory uses a fresh connection. On successful V0099
 * only its new catalog can classify the final empty state: do not run
 * obsolete V0095/V0097/V0098 inspectors after supersession. */
export async function runEmptyOwnerChain({open,readBytes=readFileSync,installAllowed=false,assertStillPinned=()=>{}}){
 const bytes=steps.map(s=>{const b=readBytes(s.path);s.review(b);return b;});
 async function session(fn){const c=await open();try{return await fn(c);}finally{await c.end();}}
 const initial=await session(readV0099OwnerInventory);
 if(initial.state===FINAL)return {status:"ALREADY_COMPLETE_NO_REPLAY",installed:[],final:initial,providerCalls:0,flightWrites:0,paidPhase6Go:false};
 if(!installAllowed)return {status:"EMPTY_OWNER_CHAIN_READ_ONLY",initial,providerCalls:0,databaseWrites:0,paidPhase6Go:false};
 const installed=[],skipped=[];
 // Verify prior V0095 exactly once at this new action boundary.
 const base=await session(readV0095OwnerInventory);
 if(base.state!=="V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO"||base.tableRows!==0)
  hold("V0095_EMPTY_PREREQUISITE_REQUIRED");
 for(let i=0;i<steps.length;i++){
  const s=steps[i],before=await session(s.inventory);
  if(before.state===s.ready){skipped.push(s.name);continue;}
  if(before.state!==s.absent)hold(s.name+"_PARTIAL_OR_UNREVIEWED_STATE");
  assertStillPinned();
  await session(client=>s.install({client,bytes:bytes[i]}));
  const after=await session(s.inventory);
  if(after.state!==s.ready)hold(s.name+"_FRESH_READBACK_FAILED_NO_RETRY");
  installed.push(s.name);
  console.log(JSON.stringify({migration:s.name,status:"FRESH_EMPTY_READBACK_PASS",state:after.state,providerCalls:0}));
 }
 const final=await session(readV0099OwnerInventory);
 if(final.state!==FINAL||final.counts?.claims!==0||final.counts?.revisions!==0||final.counts?.packets!==0)
  hold("FINAL_EMPTY_READBACK_FAILED");
 return {status:"V0097_V0098_V0099_EMPTY_OWNER_CHAIN_COMPLETE_NO_PAID_GO",installed,skipped,final,
  additionalLoginRolesCreated:0,providerCalls:0,flightWrites:0,paidPhase6Go:false,
  payloadPublicationApproved:false,legalRetentionOrPitrCertified:false};
}
async function main(){
 const env=process.env,mode=process.argv[2]??"inventory";
 if(!["inventory","install"].includes(mode))hold("MODE");
 const cmd=(s,a)=>execFileSync(s,a,{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 const verify=()=>admitEmptyOwnerChain(env,cmd("git",["rev-parse","HEAD"]),cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]));
 verify();
 const out=await runEmptyOwnerChain({installAllowed:mode==="install",assertStillPinned:verify,open:async()=>{
  const c=new pg.Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:40000,
   options:mode==="inventory"?"-c default_transaction_read_only=on":undefined,application_name:"p6_empty_schema_owner_chain"});
  await c.connect();return c;}});
 console.log(JSON.stringify(out));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(/^HOLD_P6_EMPTY_OWNER_CHAIN_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P6_EMPTY_OWNER_CHAIN_UNKNOWN_OR_COMMIT_UNKNOWN_NO_RETRY");process.exitCode=2;});
