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
  statSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";
import {execFileSync,spawnSync} from "node:child_process";
import {getBalanceEvidenceStrictWithRetry,listSubscriptionsStrictWithRetry} from
  "../server/lib/disruption/aerodataboxLimiter_v3";
import {readGate05PublishedReceiverHealthV39} from
  "../server/lib/disruption/gate05PublishedReceiverHealth_v39";

const REPO="HKcode22/ReplitTranvr";
const ENV="gate05-safety";
const RECEIVER="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
const PUB="https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime";
const MIGRATION="migrations/staged/V0074__gate05_science_prepaid_owner_v39.sql";
const CONFIRM="REVIEWED_GATE05_NO_PAID_EXPIRED_OWNER_FORWARD_RECOMMISSION";
const PRIOR_SCOPE="c631e164-feac-4550-b811-7585e88aaf0d";
const PRIOR_STOP_RUN="40650693149";
const PRIOR_CONTROLLER_RUN="40650576082";
const PRIOR_SOURCE="26d107026fac1ff7a0f9efe735434ff6d88b5b1c";
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
/** Only the exact source-generated structured receipt can consume the old intent. */
export function hasExactGate05PaidIntentV39(comments:unknown,scope:string):boolean{
 if(!Array.isArray(comments)||!/^[a-f0-9-]{36}$/.test(scope))
   throw Error("GATE05_PAID_INTENT_EVIDENCE_INVALID");
 return comments.some((c:any)=>{
   if(typeof c?.body!=="string")return false;
   let event:any;
   try{event=JSON.parse(c.body);}catch{return false;}
   return event?.schema==="v39.gate05.science-paid-create-intent.v1"&&
     event?.status==="ONE_CREATE_ATTEMPT_IMMINENT_DO_NOT_REPEAT"&&
     event?.scope===scope;
 });
}
export function gate05SciencePlanWindowV39(nowMs:number):{
  start:string;stop:string;sessionExpires:string
}{
 if(!Number.isSafeInteger(nowMs))hold("CLOCK");
 // GH controller provisions a separate safety run immediately; allow >=20m
 // of lead time for protected deployment approval before T-10m.
 const start=Math.ceil((nowMs+20*60000)/(5*60000))*(5*60000);
 return {
   start:new Date(start).toISOString(),
   stop:new Date(start+60*60000).toISOString(),
   sessionExpires:new Date(start+80*60000).toISOString()
 };
}
const privateRoot=()=>{
 const root=join(homedir(),".config","replittranvr","gate05-science-retry4");
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
export async function recommissionGate05AfterFourthUnbilledWatchV39(
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

 // A forward-only recovery is allowed ONLY for the precisely identified
 // failed GitHub controller + protected STOP which both terminated before
 // the sole paid operator was invoked. The signed previous scope stays
 // immutable: no old workflow rerun, old timestamp alteration or stale id.
 const githubMode=process.env.GITHUB_ACTIONS==="true"&&
   process.env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
   process.env.GITHUB_RUN_ATTEMPT==="1"&&
   process.env.GITHUB_SHA===head&&
   process.env.GATE05_AUTOMATION_APPROVED_ONCE===
     "YES_ONE_WSSS_500_ALERT_12_REST";
 if(!githubMode)hold("RETRY2_GITHUB_PROTECTED_ONLY");
 const previousController=ghJson(["api",
   `repos/${REPO}/actions/runs/${PRIOR_CONTROLLER_RUN}`]);
 const priorRun=ghJson(["api",
   `repos/${REPO}/actions/runs/${PRIOR_STOP_RUN}`]);
 if(previousController?.status!=="completed"||
    previousController?.conclusion!=="failure"||
    previousController?.run_attempt!==1||
    previousController?.event!=="workflow_dispatch"||
    previousController?.head_sha!==PRIOR_SOURCE||
    priorRun?.status!=="completed"||
    priorRun?.conclusion!=="failure"||
    priorRun?.run_attempt!==1||
    priorRun?.event!=="workflow_dispatch"||
    priorRun?.head_sha!==PRIOR_SOURCE||
    priorRun?.display_title!=="Gate05 Science STOP "+PRIOR_SCOPE)
   hold("RETRY4_PREVIOUS_GITHUB_RUNS_NOT_TERMINAL_OR_EXACT");
 // The last source guards CREATE until exactly 08:15Z, while the failed
 // controller TERMINATED at 08:13:04Z and STOP at 08:11:51Z. Verify both
 // authenticated completed timestamps are strictly before that boundary.
 // This is an independent chronological proof the guarded POST was unreachable.
 const lastStartMs=Date.parse("2026-10-28T08:15:00.000Z");
 if(!Number.isFinite(Date.parse(previousController?.updated_at))||
    !Number.isFinite(Date.parse(priorRun?.updated_at))||
    Date.parse(previousController.updated_at)>=lastStartMs||
    Date.parse(priorRun.updated_at)>=lastStartMs)
   hold("RETRY4_PRIOR_RUN_TERMINAL_NOT_BEFORE_FIRST_ALLOWED_CREATE");
 // Require original signed commission, issue intent absence, and verified
 // zero-provider account/owner status; an invoked operator is NOT a POST.
 const jsonLog=(run:string,marker:string):any=>{
   const logs=gh(["run","view",run,"--repo",REPO,"--log"]);
   const matches=logs.split("\n").filter(l=>l.includes(marker));
   if(matches.length!==1)hold("RETRY4_PREVIOUS_LOG_EVENT_NOT_UNIQUE");
   const at=matches[0].indexOf("{");
   if(at<0)hold("RETRY4_PREVIOUS_LOG_EVENT_NOT_JSON");
   try{return JSON.parse(matches[0].slice(at));}
   catch{hold("RETRY4_PREVIOUS_LOG_EVENT_NOT_JSON");}
 };
 const commissioned=jsonLog(PRIOR_CONTROLLER_RUN,
   '"schema":"v39.gate05.science-commission-new-scope.v1"');
 const controllerFail=jsonLog(PRIOR_CONTROLLER_RUN,
   '"status":"GATE05_GITHUB_CONTROLLER_HELD_DO_NOT_RERUN"');
 const stopFailure=jsonLog(PRIOR_STOP_RUN,
   '"status":"GATE05_SCIENCE_STOP_UNCONFIRMED_REQUIRES_EXACT_OWNER_RESCUE"');
 // STOP died before it could produce an authenticated ARMED receipt.
 // A missing health response is NOT permission to bypass source verification.
 const stopLog=gh(["run","view",PRIOR_STOP_RUN,"--repo",REPO,"--log"]);
 if(!stopLog.includes('"status":"LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE"'))
   hold("RETRY4_PRIOR_STOP_WAS_NOT_ARMED");
 if(commissioned.status!=="NEW_WSSS_OWNER_AFTER_UNBILLED_FAILURE_NO_PROVIDER"||
    commissioned.scopeId!==PRIOR_SCOPE||
    commissioned.source!==PRIOR_SOURCE||
    commissioned.receiverSource!==RECEIVER||
    commissioned.startUtc!=="2026-10-28T08:15:00.000Z"||
    commissioned.stopUtc!=="2026-10-28T09:15:00.000Z"||
    commissioned.observedBeforeAlertCredits!==1981||
    commissioned.providerMutations!==0||
    controllerFail.paidOperatorInvoked!==true||
    controllerFail.providerCreateOutcomeUnconfirmed!==true||
    controllerFail.reason!==
       "GATE05_ACTIONS_OWNER_HOLD_ONE_PAID_OPERATOR_UNCONFIRMED_NO_AUTOMATIC_RETRY"||
    stopFailure.providerCreateAttempted!==false||
    stopFailure.reason!=="BALANCE_UNAVAILABLE: transport failure")
   hold("RETRY4_PREVIOUS_NO_CREATE_EVIDENCE_MISMATCH");
 // By source design remote CREATE cannot happen until a durable issue #173
 // one-use paid intent was posted. Reconcile that record independently of
 // the controller's coarse "paid operator invoked" marker.
 const issueComments=ghJson(["api",
   `repos/${REPO}/issues/173/comments?per_page=100`]);
 if(!Array.isArray(issueComments)||issueComments.length>=100)
   hold("RETRY4_ISSUE_INTENT_HISTORY_INCOMPLETE");
 // Explanatory incident notes may quote the status string and prior scope.
 // Match only the source-generated, machine-parseable JSON receipt, never a
 // prose mention, so documentation cannot falsely look like a paid POST.
 if(hasExactGate05PaidIntentV39(issueComments,PRIOR_SCOPE))
   hold("RETRY4_PRIOR_PAID_INTENT_FOUND_NO_REUSE");
 const old={
   schema:"v39.gate05.science-private-one-use-commission.v1",
   scope:PRIOR_SCOPE,source:PRIOR_SOURCE,receiver:RECEIVER,
   authorizationSha256:commissioned.authorizationSha256,
   stopTicketSha256:commissioned.stopTicketSha256,
   startUtc:commissioned.startUtc,stopUtc:commissioned.stopUtc,
   startingCredits:commissioned.observedBeforeAlertCredits
 };
 if(!/^[0-9a-f]{64}$/.test(old.authorizationSha256)||
    !/^[0-9a-f]{64}$/.test(old.stopTicketSha256))
   hold("RETRY4_PREVIOUS_SIGNED_OWNER_MISMATCH");
 const settled={
   schema:"v39.gate05.retry3-prior-unbilled-evidence.v1",
   previousScope:PRIOR_SCOPE,controllerRun:PRIOR_CONTROLLER_RUN,
   stopRun:PRIOR_STOP_RUN,controllerPaidInvoked:true,
   stopFailedBeforeArmed:false,
   source:PRIOR_SOURCE,previousStart:old.startUtc
 };
 // Both completed runs cannot initiate anything new. Future account/balance
 // and the LOGGED owner are reauthenticated independently below.
 const dirty=execFileSync("git",[
   "status","--porcelain=v1","--untracked-files=normal",
   "--","server","scripts","migrations","tests",".github/workflows"
 ],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 if(dirty)hold("PROTECTED_SOURCE_TREE_DIRTY");
 const source=execFileSync("git",["show",head+":"+MIGRATION],{
   encoding:"utf8",maxBuffer:1024*1024,stdio:["ignore","pipe","ignore"]
 });
 const sourceHash=sha256(source);
 // Prospective commission is FREE: tolerate transient published cold start.
 await readGate05PublishedReceiverHealthV39({
   url:PUB,expectedReceiver:RECEIVER,maxAttempts:3,timeoutMs:20000
 });
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
   signal:AbortSignal.timeout(20000)
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
 if(Date.parse(plan.start)<=Date.parse(old.startUtc)+15*60000)
   hold("RETRY4_NEXT_START_NOT_PROSPECTIVE");
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
   priorEvidenceSource:"GITHUB_FAILED_WATCH_NO_PAID_INTENT_AND_PROVIDER_RECHECK",
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
     hold("RETRY4_PRIOR_LOGGED_OWNER_NOT_UNBILLED_PREPARED");
   const priorClosed=await db.query(
     `UPDATE clean.phase3_gate05_science_owner_v39
        SET state='FAILED',terminal_evidence_sha256=$2,terminal_at_utc=now()
        WHERE session_id=$1::uuid AND state='PREPARED'
          AND provider_subscription_id IS NULL RETURNING session_id`,
      [PRIOR_SCOPE,privateData.priorTerminalSha256]);
   if(priorClosed.rowCount!==1)
     hold("RETRY4_PRIOR_OWNER_TERMINAL_CUSTODY_HOLD");
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
if(process.argv[1]?.endsWith("v39_gate05_science_recommission_after_fourth_failed_watch_v39.ts")){
 const a=process.argv.slice(2);
 if(a.length!==4||a[0]!=="--head"||a[2]!=="--confirm"){
   console.error("GATE05_COMMISSION_HOLD_CLI");process.exitCode=2;
 }else{
   void recommissionGate05AfterFourthUnbilledWatchV39({
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
