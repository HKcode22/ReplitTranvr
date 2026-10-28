/**
 * Exact-owned WSSS Gate05 60-minute Alert STOP, GitHub Actions ONLY.
 * NO provider CREATE, no FIDS GET, no REFILL, no DB writes, no foreign DELETE.
 * Protected environment pins are independent of workflow_dispatch inputs.
 * A provider-side hard 500-credit cap DOES NOT EXIST; STOP starts at 350
 * observed credits with 150 reserve, and an asynchronous burst may exceed it.
 *
 * This worker requires a separate released V0074 LOGGED new-science owner
 * and a dedicated SELECT-only database login. Its existence in main does
 * NOT mean the environment, owner, or independent STOP has been armed.
 */
import pg from "pg";
import {getBalanceEvidenceStrict,getBalanceEvidenceStrictWithRetry,listSubscriptionsStrictWithRetry,
  deleteSubscriptionVerifiedStrict} from
  "../server/lib/disruption/aerodataboxLimiter_v3";
import {execFileSync} from "node:child_process";

const REPO="HKcode22/ReplitTranvr";
const HEALTH="https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime";
const HEX40=/^[0-9a-f]{40}$/;
const HEX64=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const hold=(code:string):never=>{throw Error("GATE05_SCIENCE_STOP_"+code);};
const exact=(env:NodeJS.ProcessEnv,key:string):string=>{
  const v=env[key];if(!v)hold("MISSING_"+key);return v!;
};
export type Gate05StopPinsV39={
  runner:string;receiver:string;scope:string;authorization:string;
  ticket:string;start:string;stop:string;startingCredits:number;
};
export function validateGate05ScienceStopPinsV39(
 p:Gate05StopPinsV39,e:NodeJS.ProcessEnv,nowMs:number
):{startMs:number;stopMs:number;threshold:350;hardProviderCap:false}{
 if(!p||!HEX40.test(p.runner)||!HEX40.test(p.receiver)||
    !UUID.test(p.scope)||!HEX64.test(p.authorization)||
    !HEX64.test(p.ticket)||
    !Number.isSafeInteger(p.startingCredits)||
    p.startingCredits<500||
    e.GITHUB_ACTIONS!=="true"||
    e.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    e.GITHUB_REF!=="refs/heads/main"||
    e.GITHUB_SHA!==p.runner||
    e.GATE05_SAFETY_ENV_NAME!=="gate05-safety"||
    e.GATE05_SAFETY_APPROVED_RUNNER_SHA!==p.runner||
    e.GATE05_SAFETY_APPROVED_RECEIVER_SOURCE!==p.receiver||
    e.GATE05_SAFETY_APPROVED_SCOPE!==p.scope||
    e.GATE05_SAFETY_APPROVED_AUTH_SHA256!==p.authorization||
    e.GATE05_SAFETY_APPROVED_STOP_TICKET_SHA256!==p.ticket||
    e.GATE05_SAFETY_APPROVED_START_UTC!==p.start||
    e.GATE05_SAFETY_APPROVED_STOP_UTC!==p.stop||
    e.GATE05_SAFETY_APPROVED_STARTING_CREDITS!==
      String(p.startingCredits)||
    e.GATE05_SAFETY_APPROVED_LIMIT!=="500"||
    e.GATE05_SAFETY_APPROVED_EARLY_STOP!=="350"||
    e.GATE05_SAFETY_APPROVED_REST_LIMIT!=="12"||
    e.DATABASE_URL||e.V39_DATABASE_RUNTIME_URL||
    e.GATE05_PROVIDER_CREATE_ALLOWED)
   hold("UNREVIEWED_SCOPE_OR_ENV");
 const startMs=Date.parse(p.start),stopMs=Date.parse(p.stop);
 if(!Number.isFinite(startMs)||!Number.isFinite(stopMs)||
    !Number.isFinite(nowMs)||stopMs-startMs!==3600000||
    startMs-nowMs>10*60000||
    nowMs-startMs>60000||stopMs-nowMs<30000||
    new Date(startMs).toISOString()!==p.start||
    new Date(stopMs).toISOString()!==p.stop)
   hold("BAD_WINDOW");
 const u=new URL(exact(e,"GATE05_SCIENCE_SAFETY_DATABASE_URL"));
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    !/^gate05_science_safety_reader_[a-z0-9_]{6,50}$/.test(
       decodeURIComponent(u.username))||
    !u.password||u.pathname!=="/neondb"||
    u.searchParams.get("sslmode")!=="verify-full"||
    u.hostname!==e.GATE05_SCIENCE_SAFETY_EXPECTED_DB_HOST)
   hold("NONRESTRICTED_DB_ROLE");
 if(!e.AERODATABOX_API_KEY)hold("PROVIDER_KEY_ABSENT");
 return {startMs,stopMs,threshold:350,hardProviderCap:false};
}
function gh(args:string[]):unknown{
 const x=execFileSync("gh",args,{
   encoding:"utf8",timeout:10000,maxBuffer:256000,
   stdio:["ignore","pipe","ignore"]
 });
 try{return JSON.parse(x);}catch{return hold("GITHUB_METADATA_PARSE");}
}
const ONE= `SELECT session_id::text,airport_icao,source_commit,
 authorization_sha256,reviewed_stop_ticket_sha256,
 alert_credit_ceiling,early_stop_credits,rest_api_units_ceiling,
 start_at_utc,stop_at_utc,state,provider_subscription_id
 FROM clean.phase3_gate05_science_owner_v39 WHERE session_id=$1::uuid`;
export async function runGate05ScienceStopV39(
 p:Gate05StopPinsV39,e:NodeJS.ProcessEnv=process.env
):Promise<void>{
 const policy=validateGate05ScienceStopPinsV39(p,e,Date.now());
 if(execFileSync("git",["rev-parse","HEAD"],{
   encoding:"utf8",stdio:["ignore","pipe","ignore"]
 }).trim()!==p.runner)hold("SOURCE_HEAD");
 const res=await fetch(HEALTH,{method:"GET",redirect:"error",
   cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(res.status!==200)hold("PUBLISHED_RECEIVER_HTTP");
 const health=await res.json();
 if(health?.status!=="PASS"||health?.git_head!==p.receiver||
    health?.published_deployment!==true||
    health?.prepaid_route_registered!==true||
    health?.provider_mutation!==false)
   hold("RECEIVER_SOURCE_NOT_PUBLISHED");
 const client=new pg.Client({
   connectionString:exact(e,"GATE05_SCIENCE_SAFETY_DATABASE_URL"),
   connectionTimeoutMillis:7000,query_timeout:7000,
   statement_timeout:7000,
   application_name:"gate05_science_exact_owned_actions_stop",
   options:"-c default_transaction_read_only=on"
 });
 let knownExactId:string|null=null;
 let providerCharged=0;
 await client.connect();
 try{
   const scope=await client.query(
    "SELECT current_database() AS db,current_user AS actor,"+
    "has_table_privilege(current_user,"+
    "'clean.phase3_gate05_science_owner_v39','SELECT') AS can_read,"+
    "has_table_privilege(current_user,"+
    "'clean.phase3_gate05_science_owner_v39','INSERT') AS can_insert,"+
    "has_table_privilege(current_user,"+
    "'clean.phase3_gate05_science_owner_v39','UPDATE') AS can_update,"+
    "has_table_privilege(current_user,"+
    "'clean.phase3_gate05_science_owner_v39','DELETE') AS can_delete"
   );
   const o=scope.rows[0];
   if(o?.db!=="neondb"||o?.can_read!==true||
      o?.can_insert!==false||o?.can_update!==false||
      o?.can_delete!==false)
     hold("DATABASE_NOT_SELECT_ONLY");
   async function owner(){
     const q=await client.query(ONE,[p.scope]);
     if(q.rowCount!==1)hold("EXACT_OWNER_NOT_FOUND");
     const r=q.rows[0];
     if(r.airport_icao!=="WSSS"||
        r.source_commit!==p.receiver||
        r.authorization_sha256!==p.authorization||
        r.reviewed_stop_ticket_sha256!==p.ticket||
        r.alert_credit_ceiling!==500||r.early_stop_credits!==350||
        r.rest_api_units_ceiling!==12||
        new Date(r.start_at_utc).toISOString()!==p.start||
        new Date(r.stop_at_utc).toISOString()!==p.stop||
        !["PREPARED","ACTIVE","STOPPED","FAILED"].includes(r.state))
       hold("LOGGED_OWNER_FIELDS_MISMATCH");
     if(r.provider_subscription_id!==null&&
        (!/^[A-Za-z0-9_-]{6,128}$/.test(r.provider_subscription_id)||
          (knownExactId!==null&&knownExactId!==r.provider_subscription_id)))
       hold("OWNED_PROVIDER_ID_INVALID_OR_CHANGED");
     if(r.provider_subscription_id!==null)
       knownExactId=r.provider_subscription_id;
     return r;
   }
   const original=await owner();
   if(original.state!=="PREPARED"||original.provider_subscription_id)
     hold("OWNER_ALREADY_STARTED");
   const initialPostmaster=await client.query(
     "SELECT pg_postmaster_start_time() AS server_started");
   if(initialPostmaster.rowCount!==1||
      !Number.isFinite(Date.parse(initialPostmaster.rows[0].server_started)))
     hold("INITIAL_POSTMASTER_EPOCH_UNAVAILABLE");
   const firstPostmasterMs=Date.parse(initialPostmaster.rows[0].server_started);
   const first=await getBalanceEvidenceStrictWithRetry({maxAttempts:2});
   if(first.balance.creditsRemaining!==p.startingCredits||
      first.quota.apiUnitsRemaining<12)hold("STARTING_BUDGET_CHANGED");
   const list=await listSubscriptionsStrictWithRetry({maxAttempts:2});
   if(list.some(x=>x.isActive))hold("FOREIGN_SUBSCRIPTION_BEFORE_START");
   // This is a true, live worker admission, not a promise that it survives.
   const proof={schema:"v39.gate05.science-actions-stop-armed.v1",
     status:"LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE",
     scope:p.scope,runner:p.runner,receiver:p.receiver,
     stopUtc:p.stop,softCreditStop:350,
     providerHardCap:false,originalStrictSciencePassed:false};
   console.log(JSON.stringify(proof));
   // Required live GitHub issue receipt; protected GITHUB_TOKEN is scoped
   // to issues:write only, no credentials or provider ID are posted.
   const result=gh(["api","-X","POST",`repos/${REPO}/issues/173/comments`,
     "-f","body="+JSON.stringify(proof)]);
   if(!(result as any)?.id)hold("ARMED_PROOF_NOT_POSTED");
   let unownedSince:number|null=null;
   let terminal="NO_CREATE";
   while(Date.now()<policy.stopMs+4*60000){
     const now=Date.now();
     // All PREPAID callback session identity/counters live in an UNLOGGED
     // PostgreSQL table. If this database restarts after WATCH ARM, the
     // paid raw-first callback identity may no longer exist. Stop the
     // already authenticated exact provider ID instead of billing blindly.
     const restarted=await client.query(
       "SELECT pg_postmaster_start_time() AS server_started");
     if(restarted.rowCount!==1||
        !Number.isFinite(Date.parse(restarted.rows[0].server_started)))
       hold("POSTMASTER_EPOCH_UNAVAILABLE");
     if(Date.parse(restarted.rows[0].server_started)!==firstPostmasterMs){
       if(knownExactId){
         const deleted=await deleteSubscriptionVerifiedStrict(knownExactId,{
           maxAttempts:3
         });
         if(!deleted)hold("POSTMASTER_RESET_OWNED_DELETE_UNCONFIRMED");
         terminal="POSTMASTER_RESET_EXACT_STOP_SCIENCE_INCOMPLETE";
         break;
       }
       // Never guess a provider ID from airport or LIST. Without a known
       // exact subscribed owner, fail admission and require rearm.
       hold("POSTMASTER_RESET_BEFORE_EXACT_PAID_BIND");
     }
     const current=await owner();
     // PRE-CREATE has no owned paid ID yet. A brief free account-read
     // transport timeout must not kill an otherwise healthy safety worker.
     // Do NOT extend this tolerance into ACTIVE or an ambiguous CREATE:
     // with a known paid ID, fail fast into exact-owned emergency DELETE.
     // The paid operator independently requires a fresh strict balance/LIST
     // before POST and never retries the non-idempotent subscription CREATE.
     const safePreCreate=current.state==="PREPARED"&&
       current.provider_subscription_id===null&&knownExactId===null&&
       // Stop tolerating slow GETs BEFORE the separate paid operator's T-5m
       // preflight; after this point even a PREPARED DB row could reflect
       // an unbound non-idempotent remote CREATE in progress.
       now<policy.startMs-5*60000;
     const balance=safePreCreate?
       await getBalanceEvidenceStrictWithRetry({maxAttempts:3}):
       await getBalanceEvidenceStrict();
     const inv=await listSubscriptionsStrictWithRetry({
       maxAttempts:safePreCreate?3:1
     });
     providerCharged=p.startingCredits-balance.balance.creditsRemaining;
     if(!Number.isSafeInteger(providerCharged)||providerCharged<0)
       hold("BILLING_COUNTER_INVALID_OR_REFILLED");
     const active=inv.filter(x=>x.isActive);
     const exact=knownExactId?
       active.filter(x=>x.id===knownExactId):[];
     const foreign=active.filter(x=>x.id!==knownExactId);
     if(foreign.length>0){
       if(!knownExactId){
         if(unownedSince===null)unownedSince=now;
         if(now-unownedSince>8000)hold("BILLABLE_ACTIVE_NO_EXACT_OWNED_ID");
       }else{
         // Foreign activity is never safe to DELETE or overlook. STOP
         // only the independently verified exact id before incident.
         if(exact.length===1){
           await deleteSubscriptionVerifiedStrict(knownExactId!,{maxAttempts:3});
         }
         hold("FOREIGN_ACTIVE_BILLABLE_INCIDENT");
       }
     }else unownedSince=null;
     if(current.state==="FAILED")hold("OWNER_MARKED_FAILED");
     if(current.state==="STOPPED"){
       if(exact.length!==0)hold("STOPPED_OWNER_STILL_ACTIVE");
       terminal="OWNER_STOPPED";
       break;
     }
     if(now>=policy.stopMs||providerCharged>=350){
       if(knownExactId&&exact.length===1){
         terminal=providerCharged>=350?"CREDIT_EARLY_STOP":"TIME_STOP";
         const deleted=await deleteSubscriptionVerifiedStrict(knownExactId,{
           maxAttempts:3
         });
         if(!deleted)hold("OWNED_PROVIDER_DELETE_NOT_VERIFIED");
         break;
       }
       if(active.length===0){terminal="NO_ACTIVE_SUBSCRIPTION";break;}
       hold("TERMINAL_STOP_ID_UNCONFIRMED");
     }
     if(current.state==="ACTIVE"&&
        (!knownExactId||exact.length!==1)&&
        now>policy.startMs+30000)
       hold("ACTIVE_OWNER_NOT_PRESENT_IN_PROVIDER_LIST");
     await sleep(5000);
   }
   const after=await listSubscriptionsStrictWithRetry({maxAttempts:2});
   const exactActive=knownExactId?after.some(x=>x.id===knownExactId&&x.isActive):false;
   if(exactActive)hold("STOP_UNCONFIRMED_PROVIDER_STILL_ACTIVE");
   const final=await getBalanceEvidenceStrictWithRetry({maxAttempts:2});
   console.log(JSON.stringify({
     schema:"v39.gate05.science-actions-stop-terminal.v1",
     status:"STOP_PROVIDER_EXACT_INACTIVE",
     reason:terminal,scope:p.scope,
     providerChargedCredits:p.startingCredits-final.balance.creditsRemaining,
     restUnitsRemaining:final.quota.apiUnitsRemaining,
     exactOwnedProviderIdSeen:Boolean(knownExactId),
     providerHardCap:false,
     ownerFinalizationNotYetProven:true,
     fullSciencePassNotYetProven:true,
     noProviderCreates:true,providerDeletesKnownExactOnly:true
   }));
 }catch(error){
   // If the provider/list/balance monitor fails *after* an exact positive
   // LOGGED owner has been observed, try an emergency DELETE of THAT ID
   // only. Never search by airport/name or delete an unowned subscription.
   let attempted=false,verified=false;
   let databaseReadbackUnavailable=false;
   if(knownExactId){
     // knownExactId was captured ONLY from an earlier authenticated and
     // immutable LOGGED exact-owner row. If PostgreSQL now crashes, delete
     // this last trusted ID without trying to guess a different provider ID.
     let conflict=false;
     try{
       const x=await client.query(ONE,[p.scope]);
       const o=x.rows[0];
       if(x.rowCount!==1||
          o.provider_subscription_id!==knownExactId||
          o.authorization_sha256!==p.authorization||
          o.reviewed_stop_ticket_sha256!==p.ticket||
          o.source_commit!==p.receiver)
         conflict=true;
     }catch{
       databaseReadbackUnavailable=true;
     }
     if(!conflict){
       attempted=true;
       verified=await deleteSubscriptionVerifiedStrict(knownExactId,{
         maxAttempts:3
       }).catch(()=>false);
     }
   }
   console.error(JSON.stringify({
     status:"GATE05_EMERGENCY_EXACT_STOP_ATTEMPT",
     exactOwnedIdEstablished:Boolean(knownExactId),
     exactOwnedDeleteAttempted:attempted,
     exactOwnedDeleteVerified:verified,
     databaseReadbackUnavailable,
     providerHardCreditCap:false,
     originalError:error instanceof Error?error.message:"UNKNOWN"
   }));
   throw error;
 }finally{
   await client.end().catch(()=>undefined);
 }
}
function cli(argv:string[]):Gate05StopPinsV39{
 const m=new Map<string,string>();
 for(let i=0;i<argv.length;i+=2){
   if(!argv[i]?.startsWith("--")||!argv[i+1]||
      m.has(argv[i]))hold("BAD_CLI");
   m.set(argv[i],argv[i+1]);
 }
 const names=["--runner","--receiver","--scope","--auth",
  "--ticket","--start","--stop","--credits"];
 if(m.size!==names.length||names.some(x=>!m.has(x)))hold("BAD_CLI");
 return {runner:m.get("--runner")!,receiver:m.get("--receiver")!,
   scope:m.get("--scope")!,authorization:m.get("--auth")!,
   ticket:m.get("--ticket")!,start:m.get("--start")!,
   stop:m.get("--stop")!,startingCredits:Number(m.get("--credits"))};
}
if(process.argv[1]?.endsWith("v39_gate05_science_exact_owned_actions_stop_v39.ts")){
 void runGate05ScienceStopV39(cli(process.argv.slice(2))).catch(e=>{
   console.error(JSON.stringify({
     status:"GATE05_SCIENCE_STOP_UNCONFIRMED_REQUIRES_EXACT_OWNER_RESCUE",
     reason:e instanceof Error?e.message:"UNKNOWN",
     providerCreateAttempted:false,
     // This process DOES NOT assert the paid subscription has stopped.
     exactOwnedDeleteOutcomeUnconfirmed:true
   }));
   process.exitCode=2;
 });
}
