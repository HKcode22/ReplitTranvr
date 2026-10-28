/**
 * V3.9 Gate05: NO PROVIDER MUTATION. Exact PRE-CREATE recovery of an UNLOGGED
 * callback session after a *verified* PostgreSQL postmaster restart.
 *
 * The LOGGED owner is the authority. This function may recreate the SAME
 * UUID/WSSS prepared UNLOGGED row BEFORE one paid CREATE, never repair an
 * ACTIVE provider subscription or rearm a different/expired study.
 *
 * Callers MUST first verify no paid CREATE intent, exact live GitHub STOP,
 * no active provider subscription, unchanged authoritative credit balance,
 * valid private manifest and the published receiver/database HMAC binding.
 * This function independently freezes and revalidates LOGGED fields under
 * SQL locks; no issue state or credit authorization is changed.
 */
import type {Client} from "pg";

export interface Gate05NoPaidCrashRecoveryScopeV39 {
 sessionId:string;
 receiverSource:string;
 authorizationSha256:string;
 stopTicketSha256:string;
 startAtUtc:string;
 stopAtUtc:string;
 expiresAtUtc:string;
}
export type Gate05NoPaidCrashRecoveryResultV39={
 schema:"v39.gate05.precreate-sameid-unlogged-recovery.v1";
 status:"RESTORED_PREPARED_CALLBACK_AFTER_POSTMASTER_RESTART";
 sessionId:string;
 previousPostmasterRestartUtc:string;
 ownerCreatedAtUtc:string;
 providerCreates:0;
 providerDeletes:0;
 paidFidsGets:0;
 newSubscriptionAllowedByThisRecovery:false;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH=/^[0-9a-f]{64}$/;
const SHA=/^[0-9a-f]{40}$/;
const iso=(x:unknown)=>{
 const d=new Date(x as any);
 return Number.isFinite(d.getTime())?d.toISOString():null;
};
const hold=(reason:string):never=>{throw Error("GATE05_NO_PAID_CALLBACK_REARM_HOLD_"+reason);};

export function reviewGate05UnloggedPrecreateRecoveryTimeV39(
 nowMs:number, ownerCreatedMs:number, restartedMs:number,
 startMs:number, stopMs:number, ownerState:string, unlogged:boolean
):void{
 if(![nowMs,ownerCreatedMs,restartedMs,startMs,stopMs].every(Number.isFinite)||
    !unlogged||ownerState!=="PREPARED"||
    stopMs-startMs!==3600000||
    restartedMs<=ownerCreatedMs||restartedMs>nowMs||
    nowMs<startMs-10*60000||
    nowMs>startMs-30000)
   hold("NOT_CERTIFIED_POSTMASTER_RESET_AND_PRESTART_WINDOW");
}
export async function restoreExactGate05PreparedCallbackAfterRestartV39(
 client:Client,scope:Gate05NoPaidCrashRecoveryScopeV39,
 opts:{
  providerAccountHasNoActiveSubscriptions:true;
  providerBalanceUnchanged:true;
  exactSafetyStopRunningAndAuthenticated:true;
  noPreviousPaidCreateIntent:true;
  publishedRuntimeDbAndSecretAuthenticated:true;
  nowMs?:number;
 }
):Promise<Gate05NoPaidCrashRecoveryResultV39>{
 if(!scope||!UUID.test(scope.sessionId)||!SHA.test(scope.receiverSource)||
    !HASH.test(scope.authorizationSha256)||!HASH.test(scope.stopTicketSha256)||
    !opts||opts.providerAccountHasNoActiveSubscriptions!==true||
    opts.providerBalanceUnchanged!==true||
    opts.exactSafetyStopRunningAndAuthenticated!==true||
    opts.noPreviousPaidCreateIntent!==true||
    opts.publishedRuntimeDbAndSecretAuthenticated!==true)
   hold("EXACT_ACCOUNT_STOP_AUTH_REQUIRED");
 const nowMs=opts.nowMs??Date.now();
 const startMs=Date.parse(scope.startAtUtc);
 const stopMs=Date.parse(scope.stopAtUtc);
 const expiresMs=Date.parse(scope.expiresAtUtc);
 if(!Number.isFinite(nowMs)||!Number.isFinite(startMs)||
    !Number.isFinite(stopMs)||!Number.isFinite(expiresMs)||
    iso(scope.startAtUtc)!==scope.startAtUtc||
    iso(scope.stopAtUtc)!==scope.stopAtUtc||
    iso(scope.expiresAtUtc)!==scope.expiresAtUtc||
    expiresMs<stopMs+60_000)
   hold("FROZEN_TIME_INVALID");
 let commitAttempted=false;
 try{
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const identity=await client.query(`
    SELECT current_database() AS db,current_user AS actor,
           pg_postmaster_start_time() AS restarted_at_utc,
           (SELECT relpersistence FROM pg_class
             WHERE oid='clean.prepaid_probe_session_runtime'::regclass
           ) AS table_persistence
  `);
  const x=identity.rows[0];
  if(identity.rowCount!==1||x.db!=="neondb"||
     x.actor!=="neondb_owner"||x.table_persistence!=="u")
    hold("DATABASE_IDENTITY_OR_PERSISTENCE");
  // The LOGGED owner row is immutable and serializes with any competing
  // transition to ACTIVE/FAILED. No new scope/expiry/credit value is minted.
  const owner=await client.query(`
    SELECT session_id::text,airport_icao,source_commit,
           authorization_sha256,reviewed_stop_ticket_sha256,
           alert_credit_ceiling,early_stop_credits,rest_api_units_ceiling,
           state,provider_subscription_id,created_at_utc,
           start_at_utc,stop_at_utc,session_expires_at_utc
      FROM clean.phase3_gate05_science_owner_v39
     WHERE session_id=$1::uuid FOR UPDATE
  `,[scope.sessionId]);
  const o=owner.rows[0];
  if(owner.rowCount!==1||o.airport_icao!=="WSSS"||
     o.source_commit!==scope.receiverSource||
     o.authorization_sha256!==scope.authorizationSha256||
     o.reviewed_stop_ticket_sha256!==scope.stopTicketSha256||
     o.alert_credit_ceiling!==500||o.early_stop_credits!==350||
     o.rest_api_units_ceiling!==12||
     o.provider_subscription_id!==null||
     iso(o.start_at_utc)!==scope.startAtUtc||
     iso(o.stop_at_utc)!==scope.stopAtUtc||
     iso(o.session_expires_at_utc)!==scope.expiresAtUtc)
    hold("LOGGED_EXACT_PREPARED_OWNER_MISMATCH");
  reviewGate05UnloggedPrecreateRecoveryTimeV39(
    nowMs,Date.parse(o.created_at_utc),Date.parse(x.restarted_at_utc),
    startMs,stopMs,o.state,true
  );
  const existing=await client.query(`
    SELECT state,owner_kind,icao,provider_subscription_id,expires_at_utc
      FROM clean.prepaid_probe_session_runtime
     WHERE session_id=$1::uuid FOR UPDATE
  `,[scope.sessionId]);
  if(existing.rowCount!==0)
    hold("UNLOGGED_RUNTIME_NOT_MISSING_NO_REPLACE");
  const custody=await client.query(`
    SELECT EXISTS(
      SELECT 1 FROM clean.provider_content_blob_ref
       WHERE source_kind='webhook'
         AND source_record_id LIKE $1
    ) AS any_prior_webhook_custody
  `,[`prepaid:${scope.sessionId}:%`]);
  if(custody.rowCount!==1||
     custody.rows[0].any_prior_webhook_custody!==false)
    hold("POSSIBLE_PRIOR_PROVIDER_DELIVERY_NO_REARM");
  await client.query(`
    INSERT INTO clean.prepaid_probe_session_runtime
      (session_id,owner_kind,owner_probe_id,stage,icao,state,
       created_at_utc,expires_at_utc)
    VALUES ($1::uuid,'phase3_gate05_science',NULL,NULL,
            'WSSS','armed',now(),$2::timestamptz)
  `,[scope.sessionId,scope.expiresAtUtc]);
  const recheck=await client.query(`
    SELECT owner_kind,icao,state,provider_subscription_id,expires_at_utc
    FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid
  `,[scope.sessionId]);
  const y=recheck.rows[0];
  if(recheck.rowCount!==1||y.owner_kind!=="phase3_gate05_science"||
     y.icao!=="WSSS"||y.state!=="armed"||
     y.provider_subscription_id!==null||
     iso(y.expires_at_utc)!==scope.expiresAtUtc)
    hold("REARM_READBACK_INVALID");
  commitAttempted=true;
  await client.query("COMMIT");
  const committed=await client.query(`
    SELECT state,owner_kind,icao,provider_subscription_id,expires_at_utc
      FROM clean.prepaid_probe_session_runtime
     WHERE session_id=$1::uuid
  `,[scope.sessionId]);
  if(committed.rowCount!==1||committed.rows[0].state!=="armed"||
     committed.rows[0].owner_kind!=="phase3_gate05_science"||
     committed.rows[0].icao!=="WSSS"||
     committed.rows[0].provider_subscription_id!==null||
     iso(committed.rows[0].expires_at_utc)!==scope.expiresAtUtc)
    hold("POSTCOMMIT_PREPAID_READBACK_UNCERTAIN");
  return {
   schema:"v39.gate05.precreate-sameid-unlogged-recovery.v1",
   status:"RESTORED_PREPARED_CALLBACK_AFTER_POSTMASTER_RESTART",
   sessionId:scope.sessionId,
   previousPostmasterRestartUtc:iso(x.restarted_at_utc)!,
   ownerCreatedAtUtc:iso(o.created_at_utc)!,
   providerCreates:0,providerDeletes:0,paidFidsGets:0,
   newSubscriptionAllowedByThisRecovery:false
  };
 }catch(error){
  if(!commitAttempted)
   await client.query("ROLLBACK").catch(()=>undefined);
  if(commitAttempted)
   hold("POSTCOMMIT_OUTCOME_UNCERTAIN_NO_RETRY");
  throw error;
 }
}
