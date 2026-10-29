/**
 * New Gate05 science owner/STOP commission. GitHub protected action ONLY.
 * No provider CREATE, DELETE, FIDS GET, refill or paid REST.
 * Never reuses the terminal retry5 UUID or authorization.
 * Does not approve a new spend or override the old NEXT4 1900 floor.
 */
import pg from "pg";
import {createHash,createHmac,randomBytes,randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
import {appendFileSync,accessSync,constants as fsConstants} from "node:fs";
import {gate05NonsecretStopOutputV39} from "./v39_gate05_nonsecret_stop_github_output_20261028.mjs";

const REPO="HKcode22/ReplitTranvr";
const ENV="gate05-safety";
const PUB="https://replit-tranvr--hk84164.replit.app";
const RECEIVER="84b7f1565d0402facc8c3b9aacedc599eb6e2af1";
const PRIOR="e69ffa34-d8a6-456f-a49c-9dd459e6d294";
const CONFIRM="COMMISSION_FRESH_WSSS_OWNER_NO_PROVIDER_NO_PAID_CREATE";
const sha=x=>createHash("sha256").update(x).digest("hex");
let stage="START",scope=null,db,commitAttempted=false,dbCommitted=false;
const hold=c=>{throw Error("GATE05_NEW_SCOPE_"+c);};
function gh(args,input){
  const result=spawnSync("gh",args,{
    input,encoding:"utf8",timeout:25000,maxBuffer:1024*1024,
    stdio:["pipe","pipe","pipe"]});
  if(result.error||result.status!==0)hold("GITHUB_PROTECTED_ENV_OPERATION");
  return result.stdout;
}
function ghJSON(args){
  try{return JSON.parse(gh(args));}catch{return hold("GITHUB_JSON");}
}
function env(k,min=10){
  const v=String(process.env[k]??"");
  if(v.length<min)hold("MISSING_PROTECTED_"+k);
  return v;
}
function windowFrom(now){
  const fifteen=15*60000;
  const start=Math.ceil((now+45*60000)/fifteen)*fifteen;
  return {start:new Date(start).toISOString(),
    stop:new Date(start+3600000).toISOString(),
    expires:new Date(start+4800000).toISOString()};
}
async function publicProof(runtime,callback){
  const opts={redirect:"error",signal:AbortSignal.timeout(12000)};
  const hres=await fetch(PUB+"/__v39/workspace-runtime",opts);
  const h=await hres.json().catch(()=>null);
  if(hres.status!==200||h?.status!=="PASS"||
    h?.git_head!==RECEIVER||h?.published_deployment!==true||
    h?.gate05_durable_custody_ready!==true||
    h?.prepaid_route_registered!==true||h?.provider_mutation!==false)
    hold("PUBLISHED_RECEIVER_NOT_READY");
  const nonce="gate05-new-commission-"+randomUUID();
  const proof=createHmac("sha256",runtime)
    .update("phase2g-db-binding:"+nonce).digest("hex");
  const bres=await fetch(PUB+"/__v39/phase2g/runtime-db-binding",{
    ...opts,method:"POST",
    headers:{"x-v39-phase2g-db-challenge":nonce,
      "x-v39-phase2g-db-proof":proof}});
  const b=await bres.json().catch(()=>null);
  if(bres.status!==200||b?.status!=="PASS"||
    b?.database_mutation!==false||b?.provider_call!==false)
    hold("PUBLISHED_DB_BINDING_NOT_READY");
  const wres=await fetch(PUB+"/__v39/phase2g/webhook-secret-match",{
    ...opts,method:"POST",
    headers:{"x-v39-phase2g-webhook-secret":callback}});
  const w=await wres.json().catch(()=>null);
  if(wres.status!==200||w?.status!=="PASS"||
    w?.provider_call!==false||w?.provider_mutation!==false)
    hold("PUBLISHED_WEBHOOK_SECRET_NOT_READY");
}
try{
  const outputFile=String(process.env.GITHUB_OUTPUT??"");
  if(!outputFile.startsWith("/"))hold("GITHUB_OUTPUT_MISSING_PRECOMMIT");
  try{accessSync(outputFile,fsConstants.W_OK);}catch{
    hold("GITHUB_OUTPUT_NOT_WRITABLE_PRECOMMIT");
  }
  stage="EXACT_REVIEWED_GITHUB_DISPATCH";
  const runner=env("GITHUB_SHA",40);
  if(!/^[0-9a-f]{40}$/.test(runner)||
    process.env.GITHUB_ACTIONS!=="true"||
    process.env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    process.env.GITHUB_REF!=="refs/heads/main"||
    process.env.GITHUB_RUN_ATTEMPT!=="1"||
    process.env.GATE05_NEW_SCOPE_REVIEWED_SHA!==runner||
    process.env.GATE05_NEW_SCOPE_CONFIRMATION!==CONFIRM)
    hold("NOT_FIRST_REVIEWED_MAIN_DISPATCH");
  const admin=env("DATABASE_URL",40);
  const runtime=env("V39_DATABASE_RUNTIME_URL",40);
  const callback=env("AERODATABOX_WEBHOOK_SECRET",32);
  const key=env("AERODATABOX_API_KEY");
  env("GH_TOKEN",20);
  const adminUrl=new URL(admin),runtimeUrl=new URL(runtime);
  if(adminUrl.pathname!=="/neondb"||
    runtimeUrl.pathname!=="/neondb"||
    adminUrl.hostname!==runtimeUrl.hostname||
    !["postgres:","postgresql:"].includes(adminUrl.protocol))
    hold("NEON_IDENTITY");
  stage="GITHUB_ENV_PROTECTED";
  const main=ghJSON(["api","repos/"+REPO+"/git/ref/heads/main"]);
  const user=ghJSON(["api","user"]);
  const project=ghJSON(["api","repos/"+REPO]);
  const safe=ghJSON(["api","repos/"+REPO+"/environments/"+ENV]);
  if(main?.object?.sha!==runner||user?.login!=="HKcode22"||
    project?.permissions?.admin!==true||
    !safe?.protection_rules?.some(p=>p.type==="required_reviewers"&&
      Array.isArray(p.reviewers)&&p.reviewers.length>0))
    hold("REVIEWER_OR_MAIN_POLICY");
  stage="PUBLISHED_AUTHENTICATED_HEALTH";
  await publicProof(runtime,callback);
  stage="FREE_ACCOUNT_PROVIDER";
  const headers={"x-rapidapi-key":key,
    "x-rapidapi-host":"aerodatabox.p.rapidapi.com",
    accept:"application/json"};
  let lastFreeAt=0;
  async function free(path){
    if(!["/subscriptions/balance","/subscriptions/webhook"].includes(path))
      hold("NON_FREE_PROVIDER_ROUTE");
    const pause=Math.max(0,lastFreeAt+2600-Date.now());
    if(lastFreeAt&&pause)await new Promise(resolve=>setTimeout(resolve,pause));
    lastFreeAt=Date.now();
    const response=await fetch("https://aerodatabox.p.rapidapi.com"+path,{
      method:"GET",headers,redirect:"error",
      signal:AbortSignal.timeout(15000)});
    const body=response.status===204?[]:
      await response.json().catch(()=>null);
    if(response.status!==200&&response.status!==204)
      hold("PROVIDER_FREE_GET_FAILURE");
    return {body,headers:response.headers};
  }
  const startAccount=await free("/subscriptions/balance");
  const credits=startAccount.body?.balance?.creditsRemaining??
    startAccount.body?.creditsRemaining;
  const rawUnits=startAccount.headers.get("x-ratelimit-api-units-remaining");
  const units=/^\d+$/.test(rawUnits??"")?Number(rawUnits):NaN;
  if(!Number.isSafeInteger(credits)||credits<500||
    !Number.isSafeInteger(units)||units<12)hold("ACCOUNT_BUDGET_SHAPE");
  const inventory=await free("/subscriptions/webhook");
  const list=Array.isArray(inventory.body)?inventory.body:
    inventory.body?.subscriptions??inventory.body?.items;
  if(!Array.isArray(list)||
     list.length>500||list.some(x=>typeof x?.id!=="string"||
       typeof x?.isActive!=="boolean"||x.isActive))
    hold("ACTIVE_OR_UNVERIFIED_PROVIDER_SUBSCRIPTIONS");
  // A second free balance read proves the account was stable during
  // inventory discovery and catches foreign/posted credit drift.
  const settled=await free("/subscriptions/balance");
  const settledCredits=settled.body?.balance?.creditsRemaining??
    settled.body?.creditsRemaining;
  const settledRawUnits=settled.headers.get("x-ratelimit-api-units-remaining");
  const settledUnits=/^\d+$/.test(settledRawUnits??"")?
    Number(settledRawUnits):NaN;
  if(settledCredits!==credits||settledUnits!==units)
    hold("ACCOUNT_CHANGED_BEFORE_COMMISSION");
  stage="READ_ONLY_OWNER_AND_V0075";
  db=new pg.Client({connectionString:admin,connectionTimeoutMillis:8000,
    query_timeout:12000,statement_timeout:15000,lock_timeout:3000,
    application_name:"gate05_next_scope_no_provider"});
  db.on("error",()=>{});
  await db.connect();
  const id=(await db.query(
    "SELECT current_database() AS db,current_user AS role")).rows[0];
  if(id?.db!=="neondb"||id?.role!=="neondb_owner")
    hold("PRODUCTION_OWNER_IDENTITY");
  const owners=(await db.query(
    "SELECT count(*) FILTER(WHERE state IN ('PREPARED','ACTIVE'))::int AS open,"+
    "count(*) FILTER(WHERE session_id=$1::uuid AND state='STOPPED')::int AS old "+
    "FROM clean.phase3_gate05_science_owner_v39",[PRIOR])).rows[0];
  if(owners?.open!==0||owners?.old!==1)hold("PRIOR_SCOPE_NOT_TERMINAL");
  const journal=(await db.query(
    "SELECT relpersistence='p' AND relkind='r' AS logged FROM pg_class "+
    "WHERE oid=to_regclass('clean.gate05_science_delivery_custody_v39')"
  )).rows[0];
  if(journal?.logged!==true)hold("V0075_LOGGED_ABSENT");
  stage="PRECOMMIT_SAFETY_ENV_CONFIGURATION";
  scope=randomUUID();
  const times=windowFrom(Date.now());
  const auth=sha(JSON.stringify({
    schema:"v39.gate05.new-future-plan-not-financial-approval.v1",
    runner,receiver:RECEIVER,scope,airport:"WSSS",times,
    plannedAlertCredits:500,plannedEarlyStop:350,plannedRestUnits:12,
    minItems:100,minFlights:50,minCompleted:20,minAirborne:30,
    minPoints:100,minMinutes:60,
    historical1900FloorWaived:false,newPaidApproval:false,
    actualRunwaySourceSemanticsProven:false,noRefill:true
  }));
  const ticket=sha(JSON.stringify({
    schema:"v39.gate05.independent-new-scope-stop.v1",
    runner,receiver:RECEIVER,scope,auth,times,startingCredits:credits,
    creditCeiling:500,earlyStop:350,providerHard500Cap:false
  }));
  const role="gate05_science_safety_reader_"+
    new Date().toISOString().slice(2,10).replaceAll("-","")+
    "_"+randomBytes(4).toString("hex");
  const password=randomBytes(32).toString("hex");
  if(!/^gate05_science_safety_reader_[a-z0-9_]{6,50}$/.test(role))
    hold("ROLE_IDENTIFIER");
  const restricted=new URL(admin);
  restricted.username=role;restricted.password=password;
  restricted.searchParams.set("sslmode","verify-full");
  const vars={
    GATE05_SAFETY_APPROVED_RUNNER_SHA:runner,
    GATE05_SAFETY_APPROVED_RECEIVER_SOURCE:RECEIVER,
    GATE05_SAFETY_APPROVED_SCOPE:scope,
    GATE05_SAFETY_APPROVED_AUTH_SHA256:auth,
    GATE05_SAFETY_APPROVED_STOP_TICKET_SHA256:ticket,
    GATE05_SAFETY_APPROVED_START_UTC:times.start,
    GATE05_SAFETY_APPROVED_STOP_UTC:times.stop,
    GATE05_SAFETY_APPROVED_STARTING_CREDITS:String(credits),
    GATE05_SAFETY_APPROVED_LIMIT:"500",
    GATE05_SAFETY_APPROVED_EARLY_STOP:"350",
    GATE05_SAFETY_APPROVED_REST_LIMIT:"12"
  };
  // Populate STOP environment BEFORE the single DB COMMIT. A partial
  // environment on failure is inert: no matched owner means no STOP ARM.
  for(const [name,value] of Object.entries(vars))
    gh(["variable","set",name,"--repo",REPO,"--env",ENV,"--body",value]);
  for(const [name,value] of Object.entries({
    GATE05_SCIENCE_SAFETY_DATABASE_URL:restricted.toString(),
    GATE05_SCIENCE_SAFETY_EXPECTED_DB_HOST:adminUrl.hostname,
    AERODATABOX_API_KEY:key
  }))gh(["secret","set",name,"--repo",REPO,"--env",ENV],value+"\n");
  stage="ONE_NEW_SCOPE_POSTGRESQL_TRANSACTION";
  await db.query("BEGIN");
  try{
    await db.query("SELECT pg_advisory_xact_lock(3905,20261028)");
    const recheck=(await db.query(
      "SELECT count(*) FILTER(WHERE state IN ('PREPARED','ACTIVE'))::int AS open,"+
      "count(*) FILTER(WHERE session_id=$1::uuid AND state='STOPPED')::int AS old "+
      "FROM clean.phase3_gate05_science_owner_v39",[PRIOR])).rows[0];
    if(recheck?.open!==0||recheck?.old!==1)
      hold("SERIALIZED_OWNER_CONFLICT");
    await db.query(
      "INSERT INTO clean.phase3_gate05_science_owner_v39 "+
      "(session_id,airport_icao,source_commit,authorization_sha256,"+
      "reviewed_stop_ticket_sha256,start_at_utc,stop_at_utc,session_expires_at_utc) "+
      "VALUES($1::uuid,'WSSS',$2,$3,$4,$5::timestamptz,$6::timestamptz,$7::timestamptz)",
      [scope,RECEIVER,auth,ticket,times.start,times.stop,times.expires]);
    await db.query(
      "INSERT INTO clean.prepaid_probe_session_runtime "+
      "(session_id,owner_kind,owner_probe_id,stage,icao,state,created_at_utc,expires_at_utc) "+
      "VALUES($1::uuid,'phase3_gate05_science',NULL,NULL,'WSSS','armed',now(),$2::timestamptz)",
      [scope,times.expires]);
    const expiry=new Date(Date.parse(times.expires)+3600000).toISOString();
    await db.query('CREATE ROLE "'+role+'" WITH LOGIN PASSWORD '+
      "'"+password+"' NOSUPERUSER NOCREATEDB NOCREATEROLE "+
      "NOINHERIT NOREPLICATION VALID UNTIL '"+expiry+"'");
    await db.query('GRANT CONNECT ON DATABASE neondb TO "'+role+'"');
    await db.query('GRANT USAGE ON SCHEMA clean TO "'+role+'"');
    await db.query('GRANT SELECT ON TABLE clean.phase3_gate05_science_owner_v39 TO "'+role+'"');
    const perms=(await db.query(
      "SELECT has_table_privilege($1,'clean.phase3_gate05_science_owner_v39','SELECT') AS rd,"+
      "has_table_privilege($1,'clean.phase3_gate05_science_owner_v39','INSERT') AS ins,"+
      "has_table_privilege($1,'clean.phase3_gate05_science_owner_v39','UPDATE') AS upd,"+
      "has_table_privilege($1,'clean.phase3_gate05_science_owner_v39','DELETE') AS del",
      [role])).rows[0];
    if(perms?.rd!==true||perms?.ins!==false||
       perms?.upd!==false||perms?.del!==false)
       hold("SAFETY_READER_NOT_SELECT_ONLY");
    commitAttempted=true;
    await db.query("COMMIT");
    dbCommitted=true;
  }catch{
    if(!commitAttempted)await db.query("ROLLBACK").catch(()=>{});
    hold(commitAttempted?"COMMIT_AMBIGUOUS_NO_BLIND_RETRY":"SQL_ROLLED_BACK");
  }
  stage="READ_AFTER_COMMIT";
  const out=(await db.query(
    "SELECT state,airport_icao,source_commit,authorization_sha256,"+
    "reviewed_stop_ticket_sha256,provider_subscription_id "+
    "FROM clean.phase3_gate05_science_owner_v39 WHERE session_id=$1::uuid",
    [scope])).rows[0];
  if(out?.state!=="PREPARED"||out?.airport_icao!=="WSSS"||
    out?.source_commit!==RECEIVER||out?.authorization_sha256!==auth||
    out?.reviewed_stop_ticket_sha256!==ticket||
    out?.provider_subscription_id!==null)
    hold("POSTCOMMIT_UNPROVEN");
  // Only a VERIFIED post-COMMIT owner may publish this machine-readable
  // handoff. It contains no passwords, DB URLs, API keys or provider ID.
  // A failed/ambiguous commission never produces dispatchable STOP inputs.
  stage="PUBLISH_NON_SECRET_POSTCOMMIT_STOP_HANDOFF";
  const handoff={
    scope_id:scope,runner_sha:runner,receiver_sha:RECEIVER,
    authorization_sha256:auth,stop_ticket_sha256:ticket,
    start_utc:times.start,stop_utc:times.stop,
    starting_credits:String(credits)
  };
  appendFileSync(outputFile,gate05NonsecretStopOutputV39(handoff),{encoding:"utf8"});
  stage="COMPLETE";
  console.log(JSON.stringify({
    schema:"v39.gate05.new-scope-github-no-provider-commission.v1",
    status:"NEW_WSSS_OWNER_AND_PROTECTED_STOP_ENV_PREPARED_NO_PROVIDER",
    runnerSha:runner,receiverSource:RECEIVER,scopeId:scope,
    authorizationSha256:auth,stopTicketSha256:ticket,
    startUtc:times.start,stopUtc:times.stop,expiresUtc:times.expires,
    observedStartingCredits:credits,
    plannedAlertBudget:500,plannedRestBudget:12,
    old1900FloorWaiver:false,newPaidAuthorization:false,
    independentStopLive:false,strictSciencePassed:false,
    providerCreates:0,providerDeletes:0,providerRefills:0,
    fidsGets:0,oldOwnerModified:false,v0075Reapplied:false
  },null,2));
}catch{
  console.log(JSON.stringify({
    status:"GATE05_NO_PROVIDER_NEW_SCOPE_COMMISSION_HOLD",
    stage,scopeId:scope,commitAttempted,dbCommitted,
    ifCommitAmbiguousCheckDbBeforeRetry:true,
    paidLaunchAuthorized:false,independentStopLive:false,
    providerCreates:0,providerDeletes:0,
    providerRefills:0,fidsGets:0,strictSciencePassed:false
  }));
  process.exitCode=2;
}finally{
  if(db)await db.end().catch(()=>{});
}