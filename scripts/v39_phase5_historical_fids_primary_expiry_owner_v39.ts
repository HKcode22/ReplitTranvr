/** One exact scope from owner readback 2026-11-16T13:47:34.388Z.
 * Defaults to read-only review. Never accepts an arbitrary date, count,
 * table name, provider URL, or a broad retention/collection approval.
 */
import {Pool} from "pg";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {reviewOrExpireP5HistoricalFidsPrimary,P5_HISTORICAL_FIDS_EXPIRY_APPROVAL,P5_HISTORICAL_FIDS_SCOPE_20261116}
 from "../server/lib/disruption/retentionExpiry_v39";
const REPO="HKcode22/ReplitTranvr";
const SCOPE=P5_HISTORICAL_FIDS_SCOPE_20261116;
const hold=(s:string):never=>{throw Error("HOLD_P5_HISTORICAL_FIDS_EXPIRY_"+s);};
const run=(cmd:string,args:string[])=>execFileSync(cmd,args,{encoding:"utf8",timeout:15000,stdio:["ignore","pipe","ignore"],maxBuffer:1024*1024}).trim();
function assertExactCheckout(env:NodeJS.ProcessEnv){
 const pin=env.P5_HISTORICAL_EXPIRY_REVIEWED_MAIN_SHA??"";
 if(!/^[a-f0-9]{40}$/.test(pin)||run("git",["rev-parse","HEAD"])!==pin||
    run("git",["status","--porcelain","--untracked-files=all"])||
    run("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])!==pin)
   hold("EXACT_CLEAN_MAIN_REQUIRED");
 return pin;
}
async function main(){
 const env=process.env,mode=process.argv[2]??"review";
 if(process.argv.length>3||!["review","apply"].includes(mode)||env.GITHUB_ACTIONS==="true"||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||!env.DATABASE_URL)
   hold("OWNER_LOCAL_STOP_SCOPE_REQUIRED");
 const pin=assertExactCheckout(env);
 if(mode==="apply"&&(env.P5_HISTORICAL_EXPIRY_OWNER_APPROVAL!==P5_HISTORICAL_FIDS_EXPIRY_APPROVAL||
    !/^[a-f0-9]{64}$/.test(env.P5_HISTORICAL_EXPIRY_SCOPE_SHA256??"")))
   hold("EXPLICIT_REMEDIATION_REVIEW_REQUIRED");
 const u=new URL(env.DATABASE_URL);
 if(!["postgres:","postgresql:"].includes(u.protocol)||!u.username||!u.password||
    !u.hostname.endsWith(".neon.tech")||u.pathname!=="/neondb"||
    !["require","verify-full"].includes(u.searchParams.get("sslmode")??"")||
    u.searchParams.has("uselibpqcompat"))hold("EXISTING_TLS_DATABASE_REQUIRED");
 // Transaction-local locks work on the existing direct or pooled endpoint.
 // Explicit full TLS verification; keep existing DB identity and password.
 u.searchParams.set("sslmode","verify-full");
 const pool=new Pool({connectionString:u.toString(),connectionTimeoutMillis:8000,
    query_timeout:30000,max:1,application_name:"p5_historical_fids_primary_expiry"});
 try{
  const result=await reviewOrExpireP5HistoricalFidsPrimary(pool,SCOPE,
    mode==="apply"?{mode:"apply",expectedScopeSha256:env.P5_HISTORICAL_EXPIRY_SCOPE_SHA256!,
      approval:env.P5_HISTORICAL_EXPIRY_OWNER_APPROVAL!}:{mode:"review"});
  // Preserve the receipt if main moved after the database action, without
  // treating a code-movement check as permission to retry committed work.
  let remoteMainStillMatches=false;
  try{remoteMainStillMatches=assertExactCheckout(env)===pin;}catch{/* HOLD, receipt persists */}
  console.log(JSON.stringify({...result,reviewedMainSha:pin,remoteMainStillMatches}));
  if(!remoteMainStillMatches)process.exitCode=2;
 }finally{await pool.end().catch(()=>{});}
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href)
 void main().catch(e=>{const m=String(e?.message??"");
  console.error(/^HOLD_P5_HISTORICAL_FIDS_EXPIRY_[0-9A-Z_]+$/.test(m)?m:"HOLD_P5_HISTORICAL_FIDS_EXPIRY_REDACTED");process.exitCode=2;});
