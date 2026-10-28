/**
 * Gate05 strict WSSS science: EXACTLY ONE paid Alert CREATE after separately
 * ARMED protected GitHub Actions exact-ID STOP. No FIDS GET/refill/retry.
 *
 * Owner approved ONE max-500 Alert + max-12 REST experiment (issue #173).
 * A signed/pinned scope and GH environment are prerequisites. The previously
 * prepared LOGGED Gate05 owner + UNLOGGED PREPAID receiver must be intact.
 * A fail-closed immutable local+GitHub CREATE intent is recorded BEFORE POST.
 * If provider CREATE outcome is ambiguous, NEVER issue a second CREATE.
 */
import "dotenv/config";
import pg from "pg";
import {createHmac,randomUUID} from "node:crypto";
import {restoreExactGate05PreparedCallbackAfterRestartV39} from "../server/lib/disruption/gate05PreparedCallbackRestartRecovery_v39";
import {join} from "node:path";
import {homedir} from "node:os";
import {existsSync,readFileSync,openSync,writeSync,fsyncSync,closeSync,statSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {getBalanceEvidenceStrictWithRetry,listSubscriptionsStrictWithRetry,
  createGate4SingleWithRawReceiptV39,deleteSubscriptionVerifiedStrict
} from "../server/lib/disruption/aerodataboxLimiter_v3";

const REPO="HKcode22/ReplitTranvr";
const CONFIRM="EXACT_OWNER_APPROVED_GATE05_ONE_WSSS_500_ALERT_CREATE";
const PUB="https://replit-tranvr--hk84164.replit.app";
// Original 8PM scope was closed unbilled; never read/reuse its private intent.
const DIR=join(homedir(),".config","replittranvr","gate05-science-retry1");
const FILE=join(DIR,"recovery-before-commit.json");
const INTENT=join(DIR,"one-paid-create-intent.json");
const RECEIPT=join(DIR,"one-positive-create-receipt.json");
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const hold=(m:string):never=>{throw Error("GATE05_SCIENCE_PAID_HOLD_"+m);};
const sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
function gh(args:string[]):any{
 const x=execFileSync("gh",args,{encoding:"utf8",
   timeout:18000,maxBuffer:2*1024*1024,stdio:["ignore","pipe","ignore"]});
 try{return JSON.parse(x);}catch{return hold("GITHUB_RESPONSE_JSON");}
}
function pinFile(path:string):Record<string,any>{
 if(!existsSync(path))hold("PRIVATE_COMMISSION_MISSING");
 const st=statSync(path);
 if(!st.isFile()||(st.mode&0o077)!==0||st.size<100||st.size>12000)
   hold("PRIVATE_FILE_PERMISSIONS_OR_SIZE");
 try{return JSON.parse(readFileSync(path,"utf8"));}
 catch{return hold("PRIVATE_JSON");}
}
function privateOnce(path:string,data:unknown):void{
 const f=openSync(path,"wx",0o600);
 try{writeSync(f,JSON.stringify(data)+"\n");fsyncSync(f);}finally{closeSync(f);}
}
function exactOwner(row:any,m:Record<string,any>):boolean{
 return !!row&&row.session_id===m.scope&&row.airport_icao==="WSSS"&&
  row.source_commit===m.receiver&&
  row.authorization_sha256===m.authorizationSha256&&
  row.reviewed_stop_ticket_sha256===m.stopTicketSha256&&
  row.alert_credit_ceiling===500&&row.early_stop_credits===350&&
  row.rest_api_units_ceiling===12&&
  new Date(row.start_at_utc).toISOString()===m.startUtc&&
  new Date(row.stop_at_utc).toISOString()===m.stopUtc;
}
export function gate05MayCreateInTimeV39(
 now:number,start:number,stop:number
):boolean{
 return Number.isFinite(now)&&Number.isFinite(start)&&
 Number.isFinite(stop)&&stop-start===3600000&&
 now>=start-90000&&now<=start+15000;
}
export function gate05OnePaidLaunchReceiptChecksV39(
 run:any,jobs:any,proofs:any[],m:Record<string,any>,head:string,
 nowIso:string
):boolean{
 if(!Array.isArray(proofs)||!SHA.test(head)||!UUID.test(m.scope)||
    !HASH.test(m.authorizationSha256)||!HASH.test(m.stopTicketSha256))
   return false;
 const runValid=run?.status==="in_progress"&&
   run?.head_sha===head&&run?.head_branch==="main"&&
   run?.event==="workflow_dispatch"&&run?.run_attempt===1&&
   typeof run?.path==="string"&&
   run.path.includes("phase3-gate05-science-exact-owned-stop.yml")&&
   run?.display_title==="Gate05 Science STOP "+m.scope;
 const stepValid=Array.isArray(jobs?.jobs)&&jobs.jobs.some(
   (j:any)=>j.name==="exact-owned-stop"&&j.status==="in_progress"&&
     Array.isArray(j.steps)&&j.steps.some((s:any)=>
       s.name==="Run independently authorized exact-owned STOP, never CREATE"&&
       s.status==="in_progress")
 );
 const now=Date.parse(nowIso);
 const recent=proofs.some((comment:any)=>{
   const time=Date.parse(String(comment.created_at??""));
   if(!Number.isFinite(time)||time>now+10000||now-time>12*60000||
      comment.user?.login!=="github-actions[bot]")return false;
   let x:any;
   try{x=JSON.parse(comment.body);}catch{return false;}
   return x?.schema==="v39.gate05.science-actions-stop-armed.v1"&&
      x.status==="LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE"&&
      x.scope===m.scope&&x.runner===head&&
      x.receiver===m.receiver&&x.stopUtc===m.stopUtc&&
      x.softCreditStop===350&&x.providerHardCap===false;
 });
 return runValid&&stepValid&&recent;
}
function liveSafety(runId:string,m:Record<string,any>,head:string):void{
 if(!/^[1-9][0-9]{7,13}$/.test(runId))hold("SAFETY_RUN_ID");
 const run=gh(["api",`repos/${REPO}/actions/runs/${runId}`]);
 const jobs=gh(["api",`repos/${REPO}/actions/runs/${runId}/jobs?per_page=100`]);
 const comments=execFileSync("gh",[
   "api","--paginate",`repos/${REPO}/issues/173/comments?per_page=100`,
   "--jq",".[] | {body,created_at,user:{login:.user.login}}"
 ],{encoding:"utf8",timeout:20000,maxBuffer:2*1024*1024,
   stdio:["ignore","pipe","ignore"]});
 let records:any[]=[];
 try{records=comments.split("\n").filter(Boolean).map(x=>JSON.parse(x));}
 catch{hold("ARMED_PROOF_COMMENTS_INVALID");}
 if(!gate05OnePaidLaunchReceiptChecksV39(
   run,jobs,records,m,head,new Date().toISOString()))
   hold("SAME_SCOPE_LIVE_GITHUB_STOP_NOT_ARMED");
}
const OWNER=`SELECT session_id::text,airport_icao,source_commit,
  authorization_sha256,reviewed_stop_ticket_sha256,
  alert_credit_ceiling,early_stop_credits,rest_api_units_ceiling,
  start_at_utc,stop_at_utc,state,provider_subscription_id
  FROM clean.phase3_gate05_science_owner_v39 WHERE session_id=$1::uuid`;
async function run(input:{head:string;confirm:string;stopRun:string}):Promise<void>{
 if(!SHA.test(input.head)||input.confirm!==CONFIRM||
    !/^[1-9][0-9]{7,13}$/.test(input.stopRun))
   hold("COMMAND_REVIEW");
 const head=execFileSync("git",["rev-parse","HEAD"],{
   encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 const main=gh(["api",`repos/${REPO}/git/ref/heads/main`]);
 if(head!==input.head||main?.object?.sha!==head)hold("MAIN_HEAD_DRIFT");
 const m=pinFile(FILE);
 if(m.schema!=="v39.gate05.science-private-one-use-commission.v1"||
    m.source!==head||
    m.receiver!=="1885703c04ba8f24bf8d1183f873eb86d1f83d7c"||
    !UUID.test(m.scope)||!HASH.test(m.authorizationSha256)||
    !HASH.test(m.stopTicketSha256)||!Number.isSafeInteger(m.startingCredits))
   hold("EXACT_OWNER_SOURCE_OR_PRIVATE_RECORD");
 if(existsSync(INTENT)||existsSync(RECEIPT))
   hold("PRIOR_PAID_CREATE_INTENT_EXISTS_NO_RETRY");
 const start=Date.parse(m.startUtc),stop=Date.parse(m.stopUtc);
 if(!Number.isFinite(start)||!Number.isFinite(stop)||
    stop-start!==3600000)hold("FROZEN_WINDOW_INVALID");
 if(Date.now()<start-5*60000)hold("TOO_EARLY_FOR_PAID_CREATE");
 if(Date.now()>start+15000)hold("SIXTY_MINUTE_PILOT_WINDOW_ALREADY_LATE");
 const localSecret=String(process.env.AERODATABOX_WEBHOOK_SECRET??"");
 if(localSecret.length<32||!process.env.AERODATABOX_API_KEY)
   hold("PROVIDER_OR_CALLBACK_SECRET_MISSING");
 const publicRes=await fetch(PUB+"/__v39/workspace-runtime",{
   method:"GET",redirect:"error",signal:AbortSignal.timeout(8000)
 });
 if(publicRes.status!==200)hold("PUBLISHED_RECEIVER");
 const health=await publicRes.json();
 if(health?.status!=="PASS"||health?.git_head!==m.receiver||
    health?.prepaid_route_registered!==true||
    health?.published_deployment!==true||
    health?.provider_mutation!==false)
   hold("PUBLISHED_RECEIVER_SOURCE");
 const authRes=await fetch(PUB+"/__v39/phase2g/webhook-secret-match",{
   method:"POST",redirect:"error",
   headers:{"x-v39-phase2g-webhook-secret":localSecret},
   signal:AbortSignal.timeout(8000)
 });
 if(authRes.status!==200)hold("PUBLISHED_WEBHOOK_SECRET_BIND");
 const authBody=await authRes.json();
 if(authBody?.schema!=="v39.phase2g-webhook-secret-match.v1"||
    authBody?.status!=="PASS"||authBody?.provider_call!==false||
    authBody?.provider_mutation!==false||
    Number(authBody?.alert_credits_spent)!==0)
   hold("PUBLISHED_SECRET_NOT_MATCHED");
 const dbUrl=process.env.DATABASE_URL;
 if(!dbUrl)hold("DB_ADMIN_SECRET");
 const db=new pg.Client({connectionString:dbUrl,
   connectionTimeoutMillis:7000,query_timeout:9000,
   statement_timeout:9000,lock_timeout:3000,
   application_name:"gate05_science_exact_once_paid_owner"});
 let created:string|null=null,providerAttempted=false,commitAttempted=false;
 await db.connect();
 try{
   const initial=await db.query(OWNER,[m.scope]);
   const o=initial.rows[0];
   if(initial.rowCount!==1||!exactOwner(o,m)||
      o.state!=="PREPARED"||o.provider_subscription_id!==null)
     hold("LOGGED_OWNER_NOT_PREPARED");
   let session=await db.query(
     `SELECT state,owner_kind,icao,provider_subscription_id,expires_at_utc
      FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid`,
     [m.scope]);
   if(session.rowCount===0){
     // After a PostgreSQL crash/restart, PREPAID runtime is UNLOGGED.
     // First authenticate the independently ARMED exact STOP, zero active
     // provider subscriptions, unchanged balance, and published DB HMAC.
     // Never mint a new scope or recreate a PAID/ACTIVE session.
     liveSafety(input.stopRun,m,head);
     const beforeRearm=await getBalanceEvidenceStrictWithRetry({maxAttempts:2});
     const inventory=await listSubscriptionsStrictWithRetry({maxAttempts:2});
     if(beforeRearm.balance.creditsRemaining!==m.startingCredits||
        beforeRearm.quota.apiUnitsRemaining<12||
        inventory.some(x=>x.isActive))
       hold("NO_PAID_CALLBACK_RECOVERY_ACCOUNT_NOT_STABLE");
     const runtime=process.env.V39_DATABASE_RUNTIME_URL;
     if(!runtime)hold("NO_PAID_CALLBACK_RECOVERY_RUNTIME_DB_SECRET_MISSING");
     const challenge="gate05-recovery-"+randomUUID();
     const proof=createHmac("sha256",runtime)
       .update("phase2g-db-binding:"+challenge).digest("hex");
     const binding=await fetch(PUB+"/__v39/phase2g/runtime-db-binding",{
       method:"POST",redirect:"error",
       headers:{"x-v39-phase2g-db-challenge":challenge,
         "x-v39-phase2g-db-proof":proof},
       signal:AbortSignal.timeout(8000)
     });
     if(binding.status!==200)hold("NO_PAID_CALLBACK_RECOVERY_PUBLISHED_DB_NOT_PROVEN");
     const attestation=await binding.json();
     if(attestation?.schema!=="v39.phase2g-runtime-db-binding.v1"||
        attestation.status!=="PASS"||
        attestation.provider_call!==false||
        attestation.provider_mutation!==false||
        attestation.database_mutation!==false||
        Number(attestation.alert_credits_spent)!==0)
       hold("NO_PAID_CALLBACK_RECOVERY_RUNTIME_DB_ATTESTATION");
     const repaired=await restoreExactGate05PreparedCallbackAfterRestartV39(
       db,{
         sessionId:m.scope,receiverSource:m.receiver,
         authorizationSha256:m.authorizationSha256,
         stopTicketSha256:m.stopTicketSha256,
         startAtUtc:m.startUtc,stopAtUtc:m.stopUtc,
         expiresAtUtc:m.sessionExpiresUtc
       },{
         providerAccountHasNoActiveSubscriptions:true,
         providerBalanceUnchanged:true,
         exactSafetyStopRunningAndAuthenticated:true,
         noPreviousPaidCreateIntent:true,
         publishedRuntimeDbAndSecretAuthenticated:true
       }
     );
     console.log(JSON.stringify(repaired));
     session=await db.query(
       `SELECT state,owner_kind,icao,provider_subscription_id,expires_at_utc
        FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid`,
       [m.scope]);
   }
   if(session.rowCount!==1||
      session.rows[0].state!=="armed"||
      session.rows[0].owner_kind!=="phase3_gate05_science"||
      session.rows[0].icao!=="WSSS"||
      session.rows[0].provider_subscription_id!==null||
      new Date(session.rows[0].expires_at_utc).toISOString()!==
        m.sessionExpiresUtc)
     hold("PREPAID_NEW_CALLBACK_SESSION_NOT_ARMED");
   liveSafety(input.stopRun,m,head);
   const before=await getBalanceEvidenceStrictWithRetry({maxAttempts:2});
   const active=await listSubscriptionsStrictWithRetry({maxAttempts:2});
   if(before.balance.creditsRemaining!==m.startingCredits||
      before.quota.apiUnitsRemaining<12||
      active.some(x=>x.isActive))hold("PROVIDER_ACCOUNT_CHANGED");
   // One pre-approved command may be issued slightly before nominal start,
   // but no provider CREATE happens until the recorded start boundary.
   while(Date.now()<start)await sleep(Math.min(start-Date.now(),1000));
   if(!gate05MayCreateInTimeV39(Date.now(),start,stop))
     hold("PAID_START_WINDOW_INVALID");
   liveSafety(input.stopRun,m,head);
   // Prevent billable CREATE if Neon cleared UNLOGGED identity again
   // between preflight and the frozen start. Never rearm after paid intent.
   const lastCallback=await db.query(
      `SELECT state,owner_kind,icao,provider_subscription_id,expires_at_utc
         FROM clean.prepaid_probe_session_runtime
        WHERE session_id=$1::uuid`,[m.scope]);
   const last=lastCallback.rows[0];
   if(lastCallback.rowCount!==1||last.state!=="armed"||
      last.owner_kind!=="phase3_gate05_science"||last.icao!=="WSSS"||
      last.provider_subscription_id!==null||
      new Date(last.expires_at_utc).toISOString()!==m.sessionExpiresUtc)
     hold("LAST_MOMENT_CALLBACK_ROW_LOST_BEFORE_CREATE");
   const fresh=await getBalanceEvidenceStrictWithRetry({maxAttempts:2});
   const subs=await listSubscriptionsStrictWithRetry({maxAttempts:2});
   if(fresh.balance.creditsRemaining!==m.startingCredits||
      subs.some(x=>x.isActive))hold("PREADMISSION_PROVIDER_DRIFT");
   // Recheck AFTER all possibly slow provider GETs and BEFORE writing an
   // irreversible one-shot intent. Do not start a scientifically invalid late
   // observation window simply because the earlier clock guard passed.
   if(!gate05MayCreateInTimeV39(Date.now(),start,stop))
     hold("PAID_FINAL_PROVIDER_PREFLIGHT_FINISHED_AFTER_CUTOFF");
   privateOnce(INTENT,{
     schema:"v39.gate05.one-paid-create-intent.v1",
     source:head,scope:m.scope,auth:m.authorizationSha256,
     stopTicket:m.stopTicketSha256,safetyRunId:input.stopRun,
     observedBefore:m.startingCredits,maximumAlertCredits:500,
     earlyStopAtSpent:350,maxRestUnits:12,
     atUtc:new Date().toISOString(),providerCreateAttemptsAllowed:1
   });
   // Durable no-secret GitHub intent checkpoint before remote non-idempotent
   // provider POST. If ambiguous, never silently rerun from another chat.
   const intent=gh(["api","-X","POST",`repos/${REPO}/issues/173/comments`,
     "-f","body="+JSON.stringify({
       schema:"v39.gate05.science-paid-create-intent.v1",
       status:"ONE_CREATE_ATTEMPT_IMMINENT_DO_NOT_REPEAT",
       scope:m.scope,authorization:m.authorizationSha256,
       stopTicket:m.stopTicketSha256,runner:head,
       safetyRunId:input.stopRun,
       creditCeiling:500,restUnitCeiling:12,
       createdAtUtc:new Date().toISOString()
     })]);
   if(!intent?.id)hold("PAID_INTENT_GITHUB_NOT_RECORDED");
   // Issue POST can also be slow; never CREATE after the frozen tolerance.
   // The durable intent remains consumed, so no blind second attempt.
   if(!gate05MayCreateInTimeV39(Date.now(),start,stop))
     hold("PAID_INTENT_RECORDED_BUT_START_WINDOW_EXPIRED_NO_CREATE");
   providerAttempted=true;
   const response=await createGate4SingleWithRawReceiptV39("WSSS",{
     url:PUB+"/api/v1/webhooks/aerodatabox/"+
       encodeURIComponent(localSecret)+"/prepaid/"+m.scope,
     maxDeliveryRetries:0
   });
   created=response.subscription.id;
   privateOnce(RECEIPT,{
     schema:"v39.gate05.positive-owned-create.v1",scope:m.scope,
     source:head,providerSubscriptionId:created,
     originalCreateResponseSha256:response.rawCreateResponseSha256,
     atUtc:new Date().toISOString()
   });
   await db.query("BEGIN");
   await db.query(
     `UPDATE clean.phase3_gate05_science_owner_v39
      SET state='ACTIVE',provider_subscription_id=$2
      WHERE session_id=$1::uuid AND state='PREPARED'
        AND authorization_sha256=$3 AND reviewed_stop_ticket_sha256=$4
        AND provider_subscription_id IS NULL`,
     [m.scope,created,m.authorizationSha256,m.stopTicketSha256]
   );
   const activeOwner=await db.query(OWNER,[m.scope]);
   if(activeOwner.rowCount!==1||
      !exactOwner(activeOwner.rows[0],m)||
      activeOwner.rows[0].state!=="ACTIVE"||
      activeOwner.rows[0].provider_subscription_id!==created)
     hold("POST_CREATE_OWNER_BIND_CONFLICT");
   const bound=await db.query(
     `UPDATE clean.prepaid_probe_session_runtime
      SET state='active',provider_subscription_id=$2
      WHERE session_id=$1::uuid AND state='armed'
        AND owner_kind='phase3_gate05_science'
        AND provider_subscription_id IS NULL RETURNING session_id`,
     [m.scope,created]
   );
   if(bound.rowCount!==1)hold("POST_CREATE_PREPAID_BIND_CONFLICT");
   commitAttempted=true;
   await db.query("COMMIT");
   const ownerRead=await db.query(OWNER,[m.scope]);
   if(ownerRead.rowCount!==1||
      ownerRead.rows[0].state!=="ACTIVE"||
      ownerRead.rows[0].provider_subscription_id!==created)
     hold("OWNER_BIND_COMMITTED_BUT_READBACK_UNCERTAIN");
   console.log(JSON.stringify({
     schema:"v39.gate05.science-onepaid-create.v1",
     status:"ONE_PAID_WSSS_SCIENCE_ALERT_CREATED_AND_EXACTLY_BOUND",
     scopeId:m.scope,authorizationSha256:m.authorizationSha256,
     safetyRunId:input.stopRun,
     providerCreateAttempts:1,providerDeliveryRetries:0,
     providerSubscriptionIdBound:true,
     independentStopJobPreviouslyVerified:true,
     creditCeiling:500,earlyStopSpent:350,
     restLimit:12,windowStartUtc:m.startUtc,windowStopUtc:m.stopUtc,
     originalCreateResponseSha256:response.rawCreateResponseSha256,
     strictSciencePassed:false,
     noAutomaticSecondCreate:true
   }));
 }catch(error){
   if(!commitAttempted)
     await db.query("ROLLBACK").catch(()=>undefined);
   let emergencyAttempted=false,emergencyVerified=false;
   if(created){
     emergencyAttempted=true;
     emergencyVerified=await deleteSubscriptionVerifiedStrict(created,{
       maxAttempts:3
     }).catch(()=>false);
   }
   console.error(JSON.stringify({
     status:"GATE05_ONE_PAID_CREATE_OR_BIND_UNCONFIRMED",
     providerCreateWasAttempted:providerAttempted,
     positiveExactProviderIdKnown:Boolean(created),
     emergencyExactIdDeleteAttempted:emergencyAttempted,
     emergencyExactIdDeleteVerified:emergencyVerified,
     databaseCommitMayBeAmbiguous:commitAttempted,
     noBlindCreateRetry:true,
     cause:error instanceof Error?error.message:"UNKNOWN"
   }));
   throw error;
 }finally{
   await db.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_gate05_science_one_paid_create_once_v39.ts")){
 const a=process.argv.slice(2);
 if(a.length!==6||a[0]!=="--head"||a[2]!=="--safety-run"||
    a[4]!=="--confirm"){
   console.error("GATE05_PAID_CREATE_CLI_INVALID");process.exitCode=2;
 }else void run({head:a[1],stopRun:a[3],confirm:a[5]}).catch(()=>{
   process.exitCode=2;
 });
}
