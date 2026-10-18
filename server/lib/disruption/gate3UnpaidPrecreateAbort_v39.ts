/**
 * Gate3 unpaid Stage A termination for THIS still-running paid owner process.
 * Call ONLY before entering executeGate3ActualWindowV39 (which can CREATE).
 * This module cannot CREATE/DELETE provider subscriptions, does not close
 * callbacks/runtime sources, and never removes historical owner evidence.
 *
 * Verify exact reserved PREPARED source plus two current independent strict
 * provider inventories. Any ambiguity is HOLD requiring separate recovery.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import {reviewGate3CurrentProviderAccountV39} from
  "./gate3OwnedPreExposure_v39";
import {commitGate3CanaryFailureV39} from
  "./gate3CanaryFailureCommit_v39";
import {GATE3_PRIOR_OWNER_ADMISSION_SQL_V39} from
  "./gate3PrepaidCanaryPreparation_v39";

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const AMBIGUOUS_UNSETTLED=GATE3_PRIOR_OWNER_ADMISSION_SQL_V39
 .replace(/\bLIMIT 1\s*$/,"LIMIT 2");
if(AMBIGUOUS_UNSETTLED===GATE3_PRIOR_OWNER_ADMISSION_SQL_V39)
  throw Error("GATE3_PRECREATE_ABORT_ADMISSION_SQL_CHANGED_HOLD");
export type UnpaidPrecreateAbortScopeV39=Readonly<{
  sessionId:string;icao:"WSSS";authSha256:string;
  credits:50;seconds:600;startUtc:string;baselineCredits:number;
}>;
export type UnpaidPrecreateSourceV39=Readonly<{
  session_id:string;icao:string;authorization_evidence_sha256:string;
  canary_credit_ceiling:number;fixed_exposure_seconds:number;
  state:string;failure_reason:string|null;expires_at_utc:Date|string;
  runtime_session_id:string|null;owner_kind:string|null;
  runtime_state:string|null;provider_subscription_id:string|null;
  callback_requests_seen:number|null;callback_success_2xx:number|null;
  callback_failures:number|null;
}>;
export const GATE3_PRECREATE_ABORT_SOURCE_SQL_V39=`
SELECT o.session_id::text AS session_id, o.icao,
       o.authorization_evidence_sha256, o.canary_credit_ceiling,
       o.fixed_exposure_seconds, o.state, o.failure_reason,
       o.expires_at_utc, s.session_id::text AS runtime_session_id,
       s.owner_kind, s.state AS runtime_state,
       s.provider_subscription_id, s.callback_requests_seen,
       s.callback_success_2xx, s.callback_failures
FROM clean.phase3_gate3_canary_owner_v39 o
LEFT JOIN clean.prepaid_probe_session_runtime s ON s.session_id=o.session_id
WHERE o.session_id=$1::uuid` as const;
export function assertUnpaidPrecreateAbortScopeV39(
 s:UnpaidPrecreateAbortScopeV39,now:Date
):void{
 const start=Date.parse(s?.startUtc??"");
 if(!s||!UUID.test(s.sessionId)||s.icao!=="WSSS"||
    !SHA.test(s.authSha256)||s.credits!==50||s.seconds!==600||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s.startUtc)||
    !Number.isFinite(start)||!(now instanceof Date)||
    !Number.isFinite(now.getTime())||
    now.getTime()>=start+15_000||
    !Number.isSafeInteger(s.baselineCredits)||s.baselineCredits<1500)
   throw Error("GATE3_PRECREATE_ABORT_SCOPE_OR_CLOCK_INVALID_HOLD");
}
export function assertUnpaidPrecreateUnusedSourceV39(
  s:UnpaidPrecreateAbortScopeV39,
  row:UnpaidPrecreateSourceV39|undefined,
  unsettled:readonly {session_id:string;state:string}[],
  now:Date
):void{
 assertUnpaidPrecreateAbortScopeV39(s,now);
 if(!row||row.session_id!==s.sessionId||
    row.icao!==s.icao||
    row.authorization_evidence_sha256!==s.authSha256||
    Number(row.canary_credit_ceiling)!==s.credits||
    Number(row.fixed_exposure_seconds)!==s.seconds||
    row.state!=="PREPARED"||row.failure_reason!==null||
    !Number.isFinite(new Date(row.expires_at_utc).getTime())||
    new Date(row.expires_at_utc).getTime()<Date.parse(s.startUtc)+900_000)
   throw Error("GATE3_PRECREATE_ABORT_NOT_EXACT_OWNER_HOLD");
 if(unsettled.length!==1||unsettled[0]?.session_id!==s.sessionId||
    unsettled[0]?.state!=="PREPARED")
   throw Error("GATE3_PRECREATE_ABORT_OTHER_UNSETTLED_OWNER_HOLD");
 if(row.provider_subscription_id!==null)
   throw Error("GATE3_PRECREATE_ABORT_SUBSCRIPTION_BOUND_HOLD");
 if(row.runtime_session_id===null){
   if(row.owner_kind!==null||row.runtime_state!==null||
      row.callback_requests_seen!==null||
      row.callback_success_2xx!==null||
      row.callback_failures!==null)
     throw Error("GATE3_PRECREATE_ABORT_INCONSISTENT_MISSING_RUNTIME_HOLD");
 }else if(row.runtime_session_id!==s.sessionId||
    row.owner_kind!=="phase3_credit_canary"||
    row.runtime_state!=="armed"||
    row.callback_requests_seen!==0||
    row.callback_success_2xx!==0||
    row.callback_failures!==0)
   throw Error("GATE3_PRECREATE_ABORT_RUNTIME_NOT_UNUSED_HOLD");
}
export type Gate3UnpaidAbortDepsV39=Readonly<{
  now:()=>Date;
  readStrictCleanBalance:()=>Promise<number>;
  readSource:()=>Promise<Readonly<{row:UnpaidPrecreateSourceV39|undefined;
    unsettled:readonly {session_id:string;state:string}[]}>>;
  delay:(ms:number)=>Promise<void>;
  commitFailure:(sha256:string)=>Promise<void>;
  readFailure:()=>Promise<{state:string;failure_reason:string;
    evidence_sha256:string}|undefined>;
}>;
/** Injectable for offline tests; real caller never injects false evidence. */
export async function terminateUnpaidGate3PrecreateV39(
 s:UnpaidPrecreateAbortScopeV39,
 deps:Gate3UnpaidAbortDepsV39
):Promise<string>{
 assertUnpaidPrecreateAbortScopeV39(s,deps.now());
 const a=await deps.readSource();
 assertUnpaidPrecreateUnusedSourceV39(s,a.row,a.unsettled,deps.now());
 const first=await deps.readStrictCleanBalance();
 if(first!==s.baselineCredits)
   throw Error("GATE3_PRECREATE_ABORT_ACCOUNT_CHANGED_HOLD");
 await deps.delay(1500);
 const second=await deps.readStrictCleanBalance();
 if(second!==first)
   throw Error("GATE3_PRECREATE_ABORT_ACCOUNT_UNSTABLE_HOLD");
 const b=await deps.readSource();
 assertUnpaidPrecreateUnusedSourceV39(s,b.row,b.unsettled,deps.now());
 const evidence=createHash("sha256").update(JSON.stringify({
   schema:"v39.gate3.unpaid-precreate-abort.v1",
   sessionId:s.sessionId,authSha256:s.authSha256,
   reason:"AUTOMATIC_PREPAID_OWNER_FAILED_BEFORE_CREATE_ENTRY",
   exactSourceUnused:true,strictCleanProviderReads:2,
   providerBalanceUnchanged:true,terminal:"OPERATOR_ABORTED",
 })).digest("hex");
 await deps.commitFailure(evidence);
 const receipt=await deps.readFailure();
 if(receipt?.state!=="FAILED"||receipt.failure_reason!=="OPERATOR_ABORTED"||
    receipt.evidence_sha256!==evidence)
   throw Error("GATE3_PRECREATE_ABORT_DURABLE_READBACK_HOLD");
 return evidence;
}
export async function terminateUnpaidGate3PrecreateRealV39(
 pool:Pool,scope:UnpaidPrecreateAbortScopeV39
):Promise<string>{
 const readSource=async()=>{
   const client=await pool.connect();
   let begun=false,discard=false;
   try{
     await client.query("BEGIN TRANSACTION READ ONLY");begun=true;
     const a=await client.query(GATE3_PRECREATE_ABORT_SOURCE_SQL_V39,[scope.sessionId]);
     const b=await client.query(AMBIGUOUS_UNSETTLED);
     return {row:a.rows[0] as UnpaidPrecreateSourceV39|undefined,
       unsettled:b.rows.map(z=>({session_id:String(z.session_id),
         state:String(z.state)}))};
   }finally{
     if(begun)try{await client.query("ROLLBACK")}catch{discard=true}
     client.release(discard);
   }
 };
 return terminateUnpaidGate3PrecreateV39(scope,{
   now:()=>new Date(),
   readSource,
   readStrictCleanBalance:()=>reviewGate3CurrentProviderAccountV39(50),
   delay:ms=>new Promise(resolve=>setTimeout(resolve,ms)),
   commitFailure:async evidence=>{
     const receipt=await commitGate3CanaryFailureV39(pool,{
       sessionId:scope.sessionId,icao:scope.icao,
       authorizationEvidenceSha256:scope.authSha256,
       failureCode:"OPERATOR_ABORTED",safeEvidenceSha256:evidence
     });
     if(!receipt.committed)
       throw Error("GATE3_PRECREATE_ABORT_COMMIT_UNCONFIRMED_HOLD");
   },
   readFailure:async()=>{
     const q=await pool.query(`SELECT state,failure_reason,evidence_sha256
       FROM clean.phase3_gate3_canary_owner_v39 WHERE session_id=$1::uuid`,
       [scope.sessionId]);
     return q.rows[0] as {state:string;failure_reason:string;
       evidence_sha256:string}|undefined;
   }
 });
}
