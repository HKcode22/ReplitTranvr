/**
 * One new WSSS scientific pilot AFTER old no-paid frozen window expires.
 *
 * Explicit existing owner consent: issue #173 bounded ONE pilot 500 Alert
 * credits + 12 REST units, without refill/repeat. This script:
 *  1. validates current main, owner GitHub credentials, protected environment;
 *  2. performs only FREE provider GET balance/list and published health GET;
 *  3. inside one PostgreSQL transaction applies reviewed STAGED V0074 if
 *     absent, creates new LOGGED owner + same-id UNLOGGED PREPAID session,
 *     and grants SELECT only to a unique expiring safety role;
 *  4. publishes only the needed protected Github Actions environment pins
 *     and secrets, never provider CREATE, FIDS GET or subscription DELETE.
 *
 * No blind retry on ambiguous DB COMMIT or GitHub secret update. A durable
 * private recovery manifest is written BEFORE COMMIT, mode 0600, outside
 * the git repository. No raw secret/key/DB URLs printed or committed.
 * The exact STOP must be independently ARMED before separate paid CREATE.
 */
import "dotenv/config";
import pg from "pg";
import {randomUUID,randomBytes,createHash,createHmac} from "node:crypto";
import {existsSync,mkdirSync,openSync,writeSync,fsyncSync,closeSync,
  statSync,readFileSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";
import {execFileSync,spawnSync} from "node:child_process";
import {getBalanceEvidenceStrictWithRetry,listSubscriptionsStrictWithRetry} from
  "../server/lib/disruption/aerodataboxLimiter_v3";

const REPO="HKcode22/ReplitTranvr";
const ENV="gate05-safety";
const RECEIVER="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
const PUB="https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime";
const MIGRATION="migrations/staged/V0074__gate05_science_prepaid_owner_v39.sql";
const CONFIRM="REVIEWED_GATE05_NO_PAID_EXPIRED_OWNER_FORWARD_RECOMMISSION";
const PRIOR_SCOPE="98bbf760-6211-4eaa-908c-240be91e7b0d";
const PRIOR_STOP_RUN="40623244833";
const PRIOR_ROOT=join(homedir(),".config","replittranvr","gate05-science-onepilot");
const SHA=/^[0-9a-f]{40}$/;
const hold=(code:string):never=>{throw Error("GATE05_COMMISSION_HOLD_"+code);};
const sha256=(x:string)=>createHash("sha256").update(x).digest("hex");
const gh=(args:string[],input?:string)=>{
  const x=spawnSync("gh",args,{
    input,encoding:"utf8",timeout:20000,
    maxBuffer:1024*1024,stdio:["pipe","pipe","pipe"]
  });
  if(x.error||x.status!==0)hold("GITHUB_OPERATION");
  return x.stdout;
};
const ghJson=(args:string[])=>{
  try{return JSON.parse(gh(args));}catch{return hold("GITHUB_PARSE");}
};
const sourceHead=()=>execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]
}).trim();
export function gate05SciencePlanWindowV39(nowMs:number):{
  start:string;stop:string;sessionExpires:string
}{
 if(!Number.isSafeInteger(nowMs))hold("CLOCK");
 // GH controller provisions a separate safety run immediately; allow >=35m
 // of lead time for protected deployment approval before T-10m.
 const start=Math.ceil((nowMs+35*60000)/(15*60000))*(15*60000);
 return {
   start:new Date(start).toISOString(),
   stop:new Date(start+60*60000).toISOString(),
   sessionExpires:new Date(start+80*60000).toISOString()
 };
}
const privateRoot=()=>{
 const root=join(homedir(),".config","replittranvr","gate05-science-retry1");
 if(existsSync(root))hold("PRIOR_PRIVATE_SCOPE_EXISTS_NO_RETRY");
 const parent=join(homedir(),".config","replittranvr");
 if(!existsSync(parent))mkdirSync(parent,{recursive:true,mode:0o700});
 if((statSync(parent).mode&0o077)!==0)hold("PARENT_NOT_PRIVATE");
 mkdirSync(root,{mode:0o700});
 return root;
};
const privateWrite=(path:string,body:string)=>{
 const fd=openSync(path,"wx",0o600);
 try{writeSync(fd,body);fsyncSync(fd);}finally{closeSync(fd);}
};
export async function recommissionGate05AfterUnbilledWindowV39(
 arg:{head:string;confirm:string}):Promise<void>{
 if(!SHA.test(arg.head)||arg.confirm!==CONFIRM)hold("REVIEWED_COMMAND");
 const head=sourceHead();
 if(head!==arg.head)hold("LOCAL_HEAD_DRIFT");
 const remote=ghJson(["api",`repos/${REPO}/git/ref/heads/main`]);
 const me=ghJson(["api","user"]);
 const project=ghJson(["api",`repos/${REPO}`]);
 const environment=ghJson(["api",`repos/${REPO}/environments/${ENV}`]);
 if((remote as any)?.object?.sha!==head||
    (me as any)?.login!=="HKcode22"||
    (project as any)?.permissions?.admin!==true||
    !Array.isArray((environment as any)?.protection_rules)||
    !(environment as any).protection_rules.some(
      (p:any)=>p.type==="required_reviewers"&&
       Array.isArray(p.reviewers)&&p.reviewers.length>=1
    ))hold("GITHUB_MAIN_OWNER_OR_REVIEWER_PROTECTION");

 // A new pilot is authorized only when the old independent watcher
 // SUCCESSFULLY exited with exact zero-active, zero-billed provider evidence.
 // Never rerun the old permit or alter its frozen scope/window.
 const priorFile=join(PRIOR_ROOT,"recovery-before-commit.json");
 let old:any;
 // A GitHub-hosted runner MUST NOT assume Replit's private home files are
 // mounted. It substitutes independently filed immutable operator evidence,
 // then REVALIDATES the old LOGGED PostgreSQL owner and exact terminal STOP
 // against the real provider account before any next-scope creation.
 const githubMode=process.env.GITHUB_ACTIONS==="true"&&
   process.env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
   process.env.GITHUB_RUN_ATTEMPT==="1"&&
   process.env.GITHUB_SHA===head&&
   process.env.GATE05_AUTOMATION_APPROVED_ONCE===
     "YES_ONE_WSSS_500_ALERT_12_REST";
 if(githubMode){
   if(existsSync(PRIOR_ROOT))
     hold("GITHUB_RUNNER_PRIOR_REPLIT_FILES_UNEXPECTED");
   const evidence=ghJson(["api",
     `repos/${REPO}/issues/comments/6458844605`]);
   const aborted=ghJson(["api",
     `repos/${REPO}/issues/comments/6459454399`]);
   if(evidence?.user?.login!=="HKcode22"||
      aborted?.user?.login!=="HKcode22"||
      !String(evidence.body??"").includes(
        "98bbf760-6211-4eaa-908c-240be91e7b0d")||
      !String(evidence.body??"").includes(
        "ONE_NEW_OWNER_AND_SAFETY_ENV_PREPARED_NO_PAID_PROVIDER")||
      !String(aborted.body??"").includes(
        "providerCreateWasAttempted=false")||
      !String(aborted.body??"").includes(
        "GATE05_SCIENCE_PAID_HOLD_PREPAID_NEW_CALLBACK_SESSION_NOT_ARMED")||
      !String(aborted.body??"").includes(
        "positiveExactProviderIdKnown=false"))
     hold("OLD_OPERATOR_GITHUB_EVIDENCE_NOT_VERIFIED");
   old={
     schema:"v39.gate05.science-private-one-use-commission.v1",
     scope:PRIOR_SCOPE,
     source:"dda0bf7ddc1ca1e4a3296d845d2277282ba8507a",
     receiver:RECEIVER,
     authorizationSha256:
       "4e1e6a676172e22b260b476de9e09fdcbe30ecbe170f52e0dad1ffd617c287b3",
     stopTicketSha256:
       "05610b432f30a77415a1217606adcb9f9cc5b95d344f0752a2848b3b731a6b25",
     startUtc:"2026-10-28T03:00:00.000Z",
     stopUtc:"2026-10-28T04:00:00.000Z",
     startingCredits:1981
   };
 }else{
   if(!existsSync(priorFile)||(statSync(priorFile).mode&0o077)!==0||
      existsSync(join(PRIOR_ROOT,"one-paid-create-intent.json"))||
      existsSync(join(PRIOR_ROOT,"one-positive-create-receipt.json")))
     hold("PRIOR_PRIVATE_SCOPE_OR_PAID_INTENT_HOLD");
   try{old=JSON.parse(readFileSync(priorFile,"utf8"));}
   catch{hold("PRIOR_PRIVATE_SCOPE_JSON");}
 }
 if(old?.schema!=="v39.gate05.science-private-one-use-commission.v1"||
    old.scope!==PRIOR_SCOPE||
    old.source!=="dda0bf7ddc1ca1e4a3296d845d2277282ba8507a"||
    old.receiver!==RECEIVER||
    old.startUtc!=="2026-10-28T03:00:00.000Z"||
    old.stopUtc!=="2026-10-28T04:00:00.000Z"||
    old.startingCredits!==1981||
    !/^[a-f0-9]{64}$/.test(String(old.authorizationSha256??""))||
    !/^[a-f0-9]{64}$/.test(String(old.stopTicketSha256??"")))
   hold("PRIOR_PRIVATE_SCOPE_IDENTITY");
 const priorRun=ghJson(["api",`repos/${REPO}/actions/runs/${PRIOR_STOP_RUN}`]);
 if(priorRun?.status!=="completed"||priorRun?.conclusion!=="success"||
    priorRun?.head_sha!==old.source||priorRun?.run_attempt!==1||
    priorRun?.event!=="workflow_dispatch"||
    priorRun?.display_title!=="Gate05 Science STOP "+PRIOR_SCOPE)
   hold("PRIOR_STOP_NOT_TERMINAL_AND_SUCCESSFUL");
 const priorLog=gh(["run","view",PRIOR_STOP_RUN,"--repo",REPO,"--log"]);
 const terminalLine=priorLog.split("\n").find(x=>
   x.includes('"schema":"v39.gate05.science-actions-stop-terminal.v1"'));
 let settled:any;
 try{
   const start=terminalLine?.indexOf('{"schema":"v39.gate05.science-actions-stop-terminal.v1"')??-1;
   if(start<0)hold("PRIOR_STOP_TERMINAL_LOG_ABSENT");
   settled=JSON.parse(terminalLine!.slice(start));
 }catch{hold("PRIOR_STOP_TERMINAL_LOG_UNCERTAIN");}
 if(settled?.status!=="STOP_PROVIDER_EXACT_INACTIVE"||
    settled?.scope!==PRIOR_SCOPE||
    settled?.reason!=="NO_ACTIVE_SUBSCRIPTION"||
    settled?.providerChargedCredits!==0||
    settled?.exactOwnedProviderIdSeen!==false)
   hold("PRIOR_OWNER_ZERO_PROVIDER_SETTLEMENT_NOT_PROVEN");
 if(Date.now()<Date.parse(old.stopUtc)+4*60000)
   hold("PRIOR_STOP_GRACE_NOT_FINISHED");
 const dirty=execFileSync("git",[
   "status","--porcelain=v1","--untracked-files=normal",
   "--","server","scripts","migrations","tests",".github/workflows"
 ],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 if(dirty)hold("PROTECTED_SOURCE_TREE_DIRTY");
 const source=execFileSync("git",["show",head+":"+MIGRATION],{
   encoding:"utf8",maxBuffer:1024*1024,stdio:["ignore","pipe","ignore"]
 });
 const sourceHash=sha256(source);
 const healthRes=await fetch(PUB,{method:"GET",redirect:"error",
   signal:AbortSignal.timeout(8000)});
 if(healthRes.status!==200)hold("PUBLIC_RECEIVER_HTTP");
 const health=await healthRes.json();
 if(health?.status!=="PASS"||health?.git_head!==RECEIVER||
    health?.published_deployment!==true||
    health?.prepaid_route_registered!==true||
    health?.provider_mutation!==false)
   hold("PUBLISHED_SOURCE_NOT_EXACT");
 const before=await getBalanceEvidenceStrictWithRetry();
 const credits=before.balance.creditsRemaining;
 if(credits!==old.startingCredits)
   hold("CREDIT_BALANCE_NOT_STABLE_AFTER_NO_PAID_WINDOW");
 if(!Number.isSafeInteger(credits)||credits<500||
    before.quota.apiUnitsRemaining<12)hold("BUDGET");
 const active=await listSubscriptionsStrictWithRetry();
 if(active.some(x=>x.isActive))hold("FOREIGN_ACTIVE_PROVIDER");
 const raw=process.env.DATABASE_URL;
 const runtime=process.env.V39_DATABASE_RUNTIME_URL;
 const apiKey=process.env.AERODATABOX_API_KEY;
 if(!raw||!runtime||!apiKey)hold("REQUIRED_SECRETS_MISSING");
 const adminUrl=new URL(raw),pubUrl=new URL(runtime);
 if(adminUrl.hostname!==pubUrl.hostname||
    adminUrl.pathname!=="/neondb"||pubUrl.pathname!=="/neondb"||
    !["postgres:","postgresql:"].includes(adminUrl.protocol))
   hold("PRODUCTION_DATABASE_HOST_IDENTITY");
 // Free published DB-key challenge: the local Neon host alone is not
 // proof that THIS published callback receiver uses the same runtime DB.
 const challenge="gate05-science-"+randomUUID();
 const proof=createHmac("sha256",runtime)
   .update("phase2g-db-binding:"+challenge).digest("hex");
 const bound=await fetch(
   "https://replit-tranvr--hk84164.replit.app/__v39/phase2g/runtime-db-binding",{
   method:"POST",redirect:"error",
   headers:{"x-v39-phase2g-db-challenge":challenge,
     "x-v39-phase2g-db-proof":proof},
   signal:AbortSignal.timeout(10000)
 });
 if(bound.status!==200)hold("PUBLISHED_DB_BIND_HTTP");
 const boundBody=await bound.json();
 if(boundBody?.schema!=="v39.phase2g-runtime-db-binding.v1"||
    boundBody?.status!=="PASS"||boundBody?.provider_call!==false||
    boundBody?.provider_mutation!==false||
    boundBody?.database_mutation!==false||
    Number(boundBody?.alert_credits_spent)!==0)
   hold("PUBLISHED_DB_BIND_AUTHENTICATION");
 const plan=gate05SciencePlanWindowV39(Date.now());
 if(Date.parse(plan.start)<=Date.parse(old.stopUtc)+15*60000)
   hold("NEW_WINDOW_OVERLAPS_OLD_SAFETY_RUN");
 const scope=randomUUID();
 const auth=sha256(JSON.stringify({
   schema:"v39.gate05.one500-owner-approval.v1",
   approvalIssue173:"6458170487",
   priorConfirmedZeroCreateScope:PRIOR_SCOPE,
   source:head,receiver:RECEIVER,scope,
   maximumAlertCredits:500,earlyStop:350,maxRestUnits:12,
   minNotifications:100,minDistinctOperatingFlights:50,
   minCompletedFlights:20,minAirborneFlights:30,
   minAirbornePoints:100,minPilotMinutes:60,
   missingRunwayMayRemainNull:true,providerEstimatedIsNotObservedActual:true,
   startUtc:plan.start,stopUtc:plan.stop,noRefill:true
 }));
 const ticket=sha256(JSON.stringify({
   schema:"v39.gate05.one-science-stop-ticket.v1",
   source:head,receiver:RECEIVER,scope,authorization:auth,
   startUtc:plan.start,stopUtc:plan.stop,
   startingCredits:credits,maximumAlertCredits:500,earlyStop:350,
   noProviderCreate:true
 }));
 const name="gate05_science_safety_reader_"+
   new Date().toISOString().slice(2,10).replaceAll("-","")+
   "_"+randomBytes(4).toString("hex");
 const pass=randomBytes(32).toString("hex");
 if(!/^gate05_science_safety_reader_[a-z0-9_]{6,50}$/.test(name))
   hold("DB_ROLE_NAME");
 const restricted=new URL(raw);
 restricted.username=name;restricted.password=pass;
 restricted.searchParams.set("sslmode","verify-full");
 const root=privateRoot();
 const privateData={
   schema:"v39.gate05.science-private-one-use-commission.v1",
   state:"PRECOMMIT_NOT_PROOF",scope,source:head,receiver:RECEIVER,
   authorizationSha256:auth,stopTicketSha256:ticket,
   startUtc:plan.start,stopUtc:plan.stop,
   sessionExpiresUtc:plan.sessionExpires,
   startingCredits:credits,sourceSqlSha256:sourceHash,
   priorClosedScope:PRIOR_SCOPE,priorSafetyRun:PRIOR_STOP_RUN,
   priorEvidenceSource:githubMode?"GITHUB_ISSUE_LOGGED_OWNER_STOP_PROVIDER":"REPLIT_PRIVATE_RECEIPT",
   priorTerminalSha256:sha256(JSON.stringify(settled)),
   safetyReaderUrl:restricted.toString()
 };
 privateWrite(join(root,"recovery-before-commit.json"),
   JSON.stringify(privateData)+"\n");
 const db=new pg.Client({connectionString:raw,
   connectionTimeoutMillis:7000,statement_timeout:20000,
   query_timeout:24000,lock_timeout:3000,
   application_name:"gate05_science_new_scope_no_provider"});
 let commitAttempted=false;
 try{
   await db.connect();
   const identity=await db.query(
     "SELECT current_database() AS db,current_user AS actor");
   if(identity.rows[0]?.db!=="neondb"||
      identity.rows[0]?.actor!=="neondb_owner")
     hold("DB_ADMIN_IDENTITY");
   await db.query("BEGIN");
   await db.query("SELECT pg_advisory_xact_lock(3905,20261027)");
   const previous=await db.query(
     "SELECT to_regclass('clean.phase3_gate3_canary_owner_v39') AS gate3,"+
     "to_regclass('clean.phase3_gate05_science_owner_v39') AS gate05");
   if(!previous.rows[0]?.gate3||!previous.rows[0]?.gate05)
     hold("V0065_AND_INSTALLED_V0074_REQUIRED");
   // Old no-paid scope is terminalized in the SAME DB transaction as the
   // newly generated separate LOGGED+UNLOGGED owner. The historical owner
   // never changes times/credits/signed source and cannot be replayed.
   const oldOwner=await db.query(
     `SELECT session_id::text,state,source_commit,authorization_sha256,
       reviewed_stop_ticket_sha256,provider_subscription_id,start_at_utc,
       stop_at_utc,alert_credit_ceiling,early_stop_credits,
       rest_api_units_ceiling
       FROM clean.phase3_gate05_science_owner_v39
       WHERE session_id=$1::uuid FOR UPDATE`,[PRIOR_SCOPE]);
   const q=oldOwner.rows[0];
   if(oldOwner.rowCount!==1||q.session_id!==PRIOR_SCOPE||
      q.state!=="PREPARED"||q.provider_subscription_id!==null||
      q.source_commit!==RECEIVER||
      q.authorization_sha256!==old.authorizationSha256||
      q.reviewed_stop_ticket_sha256!==old.stopTicketSha256||
      q.alert_credit_ceiling!==500||q.early_stop_credits!==350||
      q.rest_api_units_ceiling!==12||
      new Date(q.start_at_utc).toISOString()!==old.startUtc||
      new Date(q.stop_at_utc).toISOString()!==old.stopUtc)
     hold("PRIOR_LOGGED_OWNER_NOT_UNBILLED_PREPARED");
   const priorClosed=await db.query(
     `UPDATE clean.phase3_gate05_science_owner_v39
        SET state='FAILED',terminal_evidence_sha256=$2,terminal_at_utc=now()
        WHERE session_id=$1::uuid AND state='PREPARED'
          AND provider_subscription_id IS NULL RETURNING session_id`,
      [PRIOR_SCOPE,privateData.priorTerminalSha256]);
   if(priorClosed.rowCount!==1)
     hold("PRIOR_OWNER_FAILED_TERMINAL_CUSTODY_HOLD");
   await db.query(
     `INSERT INTO clean.phase3_gate05_science_owner_v39
      (session_id,airport_icao,source_commit,authorization_sha256,
       reviewed_stop_ticket_sha256,start_at_utc,stop_at_utc,
       session_expires_at_utc)
      VALUES($1::uuid,'WSSS',$2,$3,$4,$5::timestamptz,
             $6::timestamptz,$7::timestamptz)`,
     [scope,RECEIVER,auth,ticket,plan.start,plan.stop,plan.sessionExpires]
   );
   await db.query(
     `INSERT INTO clean.prepaid_probe_session_runtime
      (session_id,owner_kind,owner_probe_id,stage,icao,state,
       created_at_utc,expires_at_utc)
      VALUES($1::uuid,'phase3_gate05_science',NULL,NULL,
       'WSSS','armed',now(),$2::timestamptz)`,
     [scope,plan.sessionExpires]
   );
   await db.query(
     `CREATE ROLE "${name}" WITH LOGIN PASSWORD '${pass}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION
      VALID UNTIL '${new Date(Date.parse(plan.sessionExpires)+3600000).toISOString()}'`
   );
   await db.query(`GRANT CONNECT ON DATABASE neondb TO "${name}"`);
   await db.query(`GRANT USAGE ON SCHEMA clean TO "${name}"`);
   await db.query(`GRANT SELECT ON TABLE
      clean.phase3_gate05_science_owner_v39 TO "${name}"`);
   const r=await db.query(
     `SELECT has_table_privilege($1::text,
       'clean.phase3_gate05_science_owner_v39','SELECT') AS can_select,
       has_table_privilege($1::text,
       'clean.phase3_gate05_science_owner_v39','INSERT') AS can_insert,
       has_table_privilege($1::text,
       'clean.phase3_gate05_science_owner_v39','UPDATE') AS can_update,
       has_table_privilege($1::text,
       'clean.phase3_gate05_science_owner_v39','DELETE') AS can_delete`,[name]
   );
   if(r.rows[0]?.can_select!==true||r.rows[0]?.can_insert!==false||
      r.rows[0]?.can_update!==false||r.rows[0]?.can_delete!==false)
      hold("SAFETY_ROLE_NOT_SELECT_ONLY");
   commitAttempted=true;
   await db.query("COMMIT");
 }catch(error){
   if(!commitAttempted)await db.query("ROLLBACK").catch(()=>undefined);
   throw Error("GATE05_DB_COMMISSION_PARTIAL_OR_FAILED_"+
     (commitAttempted?"COMMIT_AMBIGUOUS_NO_BLIND_RETRY":"ROLLED_BACK"));
 }finally{
   await db.end().catch(()=>undefined);
 }
 // Separate privileged GitHub environment mutations. Any error here
 // leaves a valid local 0600 recovery record, not paid authorization.
 const vars={
   GATE05_SAFETY_APPROVED_RUNNER_SHA:head,
   GATE05_SAFETY_APPROVED_RECEIVER_SOURCE:RECEIVER,
   GATE05_SAFETY_APPROVED_SCOPE:scope,
   GATE05_SAFETY_APPROVED_AUTH_SHA256:auth,
   GATE05_SAFETY_APPROVED_STOP_TICKET_SHA256:ticket,
   GATE05_SAFETY_APPROVED_START_UTC:plan.start,
   GATE05_SAFETY_APPROVED_STOP_UTC:plan.stop,
   GATE05_SAFETY_APPROVED_STARTING_CREDITS:String(credits),
   GATE05_SAFETY_APPROVED_LIMIT:"500",
   GATE05_SAFETY_APPROVED_EARLY_STOP:"350",
   GATE05_SAFETY_APPROVED_REST_LIMIT:"12"
 };
 for(const [k,v] of Object.entries(vars)){
   gh(["variable","set",k,"--repo",REPO,"--env",ENV,
     "--body",v]);
 }
 for(const [k,v] of Object.entries({
   GATE05_SCIENCE_SAFETY_DATABASE_URL:restricted.toString(),
   GATE05_SCIENCE_SAFETY_EXPECTED_DB_HOST:adminUrl.hostname,
   AERODATABOX_API_KEY:apiKey
 })){
   gh(["secret","set",k,"--repo",REPO,"--env",ENV],v+"\n");
 }
 console.log(JSON.stringify({
   schema:"v39.gate05.science-commission-new-scope.v1",
   status:"NEW_WSSS_OWNER_AFTER_UNBILLED_FAILURE_NO_PROVIDER",
   source:head,receiverSource:RECEIVER,
   scopeId:scope,authorizationSha256:auth,stopTicketSha256:ticket,
   startUtc:plan.start,stopUtc:plan.stop,sessionExpiresUtc:plan.sessionExpires,
   observedBeforeAlertCredits:credits,
   approvedAlertCreditCeiling:500,softStopAfterSpent:350,
   approvedRestUnitsCeiling:12,
   priorScopeFailedAndImmutable:true,existingV0074Used:true,sameIdPrepaidSessionArmed:true,
   independentStopLive:false,
   providerMutations:0,paidFidsCalls:0,
   scientificPass:false,
   noRetryOnPartial:true
 }));
}
if(process.argv[1]?.endsWith("v39_gate05_science_recommission_after_zero_create_v39.ts")){
 const a=process.argv.slice(2);
 if(a.length!==4||a[0]!=="--head"||a[2]!=="--confirm"){
   console.error("GATE05_COMMISSION_HOLD_CLI");process.exitCode=2;
 }else{
   void recommissionGate05AfterUnbilledWindowV39({
     head:a[1],confirm:a[3]
   }).catch(e=>{
     console.error(JSON.stringify({
       status:"GATE05_NO_PAID_COMMISSION_HOLD",
       reason:e instanceof Error?e.message:"UNKNOWN",
       noProviderSubscriptionCreateAttempted:true,
       doNotRetryAfterCommitUncertainty:true
     }));
     process.exitCode=2;
   });
 }
}
