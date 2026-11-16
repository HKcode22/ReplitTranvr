/** Scoped protected rolling-window runtime adapter, opt-in only.
 * No owner URL, source contents, provider HTTP, release authority or
 * dispatch. Existing B0062 and native worker admission stay mandatory.
 */
import {claimP6RollingWindowOnce,readP6KnownRollingWindowOnce,readP6RollingRootPreflight} from "./phase6RollingWindowClaimBridge_v39.mjs";
const H=/^[a-f0-9]{64}$/,LOGIN=/^phase6_rolling_claim_[a-z0-9_]{5,40}$/;
const hold=x=>{throw Error("HOLD_P6_ROLLING_RUNTIME_WINDOW_"+x);};
const keys=["P6_ROLLING_WINDOW_CUSTODY_DATABASE_URL","P6_ROLLING_WINDOW_CUSTODY_APPROVED","P6_ROLLING_WINDOW_AUTHORIZATION_ID","P6_ROLLING_WINDOW_EXPECTED_LOGIN"];
const instant=x=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)hold("CLOCK");return Date.parse(x);};
export function admitP6RuntimeWindowConfig(env){
 const flag=env.P6_ROLLING_WINDOW_CUSTODY_ENABLED??"0";
 if(flag===""||flag==="0"){
  if(keys.some(k=>env[k]))hold("DISABLED_WITH_CREDENTIAL_OR_APPROVAL");
  return null;
 }
 if(flag!=="1"||env.P6_ROLLING_WINDOW_CUSTODY_APPROVED!=="1"||
  !LOGIN.test(env.P6_ROLLING_WINDOW_EXPECTED_LOGIN??"")||!H.test(env.V39_P5_CONFIG_HASH??"")||
  typeof env.P6_ROLLING_WINDOW_AUTHORIZATION_ID!=="string"||
  env.P6_ROLLING_WINDOW_AUTHORIZATION_ID.length<1||env.P6_ROLLING_WINDOW_AUTHORIZATION_ID.length>128||
  !["RUN_ONE_PROTECTED_ROLLING_SESSION_AFTER_SEPARATE_PHASE6_GO","RUN_UP_TO_FOUR_PROTECTED_ROLLING_SESSIONS_AFTER_SEPARATE_PHASE6_GO"].includes(env.P6_ROLLING_SESSION_CONFIRM))
  hold("EXACT_RESTRICTED_APPROVAL");
 let u,username,password;
 try{
  u=new URL(env.P6_ROLLING_WINDOW_CUSTODY_DATABASE_URL??"");
  username=decodeURIComponent(u.username);password=decodeURIComponent(u.password);
 }catch{hold("TLS_URL");}
 if(!["postgresql:","postgres:"].includes(u.protocol)||username!==env.P6_ROLLING_WINDOW_EXPECTED_LOGIN||
  !password||!u.hostname.endsWith(".neon.tech")||u.pathname!=="/neondb"||u.hash||
  (u.port!==""&&u.port!=="5432")||u.searchParams.getAll("sslmode").length!==1||
  !["require","verify-full"].includes(u.searchParams.get("sslmode"))||
  [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
  (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require"))||
  env.NODE_TLS_REJECT_UNAUTHORIZED==="0")hold("TLS_URL");
 // Parse the exact scoped URL; do not let libpq-style query flags
 // replace explicit Node TLS certificate checking.
 return {authorizationId:env.P6_ROLLING_WINDOW_AUTHORIZATION_ID,configSha256:env.V39_P5_CONFIG_HASH,
  login:username,connection:{host:u.hostname,port:5432,database:"neondb",user:username,password,
   ssl:{rejectUnauthorized:true},enableChannelBinding:true,connectionTimeoutMillis:8000,query_timeout:12000,
   statement_timeout:10000,lock_timeout:3000,application_name:"p6_rolling_window_custody_v39"}};
}
export function exactP6RuntimeWindowReceipt(x,{scope,rootId,policyCommitment,clock,kind}){
 const expectWrite=kind==="CLAIM"?1:0;
 if(!x||!Number.isSafeInteger(rootId)||rootId<1||x.rootRunId!==rootId||
  x.reviewedMainSha!==scope.sha||x.policyCommitment!==policyCommitment||
  !Number.isSafeInteger(x.windowIndex)||x.windowIndex<0||x.windowIndex>719||
  x.actualDbClock!==true||x.restrictedFunctionOnly!==true||
  x.operationalCustodyWrites!==expectWrite||x.providerCalls!==0||x.flightWrites!==0||x.dispatchCount!==0||
  x.permitDispatch!==false||x.phase6PaidGo!==false||
  (kind==="CLAIM"?(x.status!=="DURABLE_WINDOW_CLAIM_COMMITTED_AND_INDEPENDENTLY_READ_BACK_NOT_DISPATCH_AUTHORITY"||x.independentConnection!==true):
   (x.status!=="EXACT_OPEN_ROOT_READBACK_NO_NEW_CLAIM_NOT_DISPATCH_AUTHORITY"||
    x.epochUtc!==new Date(scope.epoch).toISOString()||x.chainDeadlineUtc!==new Date(scope.chainDeadline).toISOString()||
    x.chainMode!==(scope.multi?"FOUR":"SINGLE"))))
  hold("CUSTODY_RECEIPT");
 const start=instant(x.windowStartUtc),end=instant(x.windowEndUtc),claimed=instant(x.claimedAtUtc);
 if(start>=end||end-start>7200000||scope.epoch<start||scope.chainDeadline>end||
  claimed<scope.epoch||claimed>=scope.chainDeadline||claimed>clock+5000||clock>=scope.chainDeadline)
  hold("CUSTODY_CLOCK");
 return {rootRunId:rootId,windowIndex:x.windowIndex,windowStartUtc:x.windowStartUtc,windowEndUtc:x.windowEndUtc,
  claimedAtUtc:x.claimedAtUtc,policyCommitment};
}
export function compareP6WindowCustody(a,b){
 if(!a||!b||Object.keys(a).sort().join(",")!=="claimedAtUtc,policyCommitment,rootRunId,windowEndUtc,windowIndex,windowStartUtc"||
 Object.keys(b).sort().join(",")!==Object.keys(a).sort().join(",")||
 Object.keys(a).some(k=>a[k]!==b[k]))hold("CUSTODY_CHANGED");
 return true;
}
async function defaultConnect({connection}){
 const pg=(await import("pg")).default,client=new pg.Client(connection);
 try{await client.connect();return client;}catch(e){await client.end().catch(()=>{});throw e;}
}
export async function readP6RuntimeRootPlan(config,scope,{connect=defaultConnect,readPlan}={}){
 if(!config)hold("MISSING_CONFIG");
 let client;
 try{
  client=await connect(config);
  return await readP6RollingRootPreflight({separateOwnerWindowCustodyReviewApproved:true,separateRestrictedWindowCustodyReviewApproved:true,
   authorizationId:config.authorizationId,configSha256:config.configSha256,expectedClaimantSessionLogin:config.login,
   trust:scope.trust,policyBytes:scope.policyBytes,expectedPolicySha256:scope.expectedPolicySha256,readPlan},{readbackClient:client});
 }catch(e){const m=e?.message??"";throw Error(/^HOLD_P6_WINDOW_CLAIM_BRIDGE_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_ROLLING_RUNTIME_WINDOW_ROOT_PLAN_DB_READ_REFUSED");}
 finally{if(client)await Promise.allSettled([client.end()]);}
}
export function createP6RuntimeWindowCustody(config,{connect}={}){
 if(!config)hold("MISSING_CONFIG");
 let usedClaim=false;
 const open=connect??defaultConnect;
 return async ({scope,rootId,kind,readPlan})=>{
  if(!["CLAIM","READ"].includes(kind)||!Number.isSafeInteger(rootId)||rootId<1||
    (kind==="CLAIM"&&(usedClaim||scope.hop!==0||rootId!==scope.id)))hold("NO_SECOND_CLAIM");
  if(kind==="CLAIM")usedClaim=true;
  const input={separateOwnerWindowCustodyReviewApproved:true,separateRestrictedWindowCustodyReviewApproved:true,
   authorizationId:config.authorizationId,configSha256:config.configSha256,expectedClaimantSessionLogin:config.login,
   rootRunId:rootId,trust:scope.trust,policyBytes:scope.policyBytes,expectedPolicySha256:scope.expectedPolicySha256,
   sessionEpochUtc:new Date(scope.epoch).toISOString(),chainDeadlineUtc:new Date(scope.chainDeadline).toISOString(),
   chainMode:scope.multi?"FOUR":"SINGLE",readPlan};
  let writer,reader;
  try{
   if(kind==="CLAIM")writer=await open(config);
   reader=await open(config);
   return kind==="CLAIM"?await claimP6RollingWindowOnce(input,{claimClient:writer,readbackClient:reader}):
    await readP6KnownRollingWindowOnce(input,{readbackClient:reader});
  }catch(e){
   // No retry, no credentials or raw driver diagnostics in Actions logs.
   const m=e?.message??"";
   throw Error(/^HOLD_P6_WINDOW_CLAIM_BRIDGE_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_ROLLING_RUNTIME_WINDOW_DB_REFUSED_OR_UNKNOWN_NO_REPLAY");
  }finally{
   await Promise.allSettled([writer,reader].filter(Boolean).map(x=>x.end()));
  }
 };
}
