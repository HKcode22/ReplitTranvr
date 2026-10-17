/**
 * Gate3 prearmed prepaid session verification (read-only PostgreSQL).
 * A source-level/DB-contract check ONLY: even PASS of this preflight
 * cannot verify an operator-signed AUTH, hosted callback identity,
 * provider account ownership, credits, delivery, or create a subscription.
 * No AeroDataBox imports, writable SQL, or live owner control.
 *
 * In particular, the LOGGED durable owner can survive loss of the
 * UNLOGGED session after PostgreSQL crash; this MUST HOLD, never recreate
 * a paid session automatically.
 */
import type {PoolClient} from "pg";

export interface Gate3PreparedSessionExpectedV39 {
  sessionId:string;
  icao:string;
  authorizationEvidenceSha256:string;
  canaryCreditCeiling:number;
  fixedExposureSeconds:number;
  nowUtc?:Date;
}
export type Gate3SessionReviewV39=Readonly<{
  schema:"v39.phase3.gate3.prearmed-session-review.v1";
  status:"OFFLINE_SOURCE_SHAPE_VALID"|"HOLD";
  reasons:readonly string[];
  sourceSessionId:string;
  // A syntactically matching hash is not signed AUTH verification.
  signedAuthorizationVerifiedHere:false;
  livePublishedReceiverVerified:false;
  realProviderAccountVerified:false;
  providerCalls:0;
  databaseMutations:0;
  authorizedPaidCanary:false;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ICAO=/^[A-Z]{4}$/;
const SHA=/^[0-9a-f]{64}$/;
const positive=(x:unknown,max:number)=>typeof x==="number"&&Number.isSafeInteger(x)&&x>0&&x<=max;
const iso=(d:unknown)=>d instanceof Date && Number.isFinite(d.getTime());

export async function reviewGate3PreparedSessionV39(
  client:Pick<PoolClient,"query">,
  expected:Gate3PreparedSessionExpectedV39,
):Promise<Gate3SessionReviewV39>{
  if(!expected||typeof expected!=="object"||Array.isArray(expected)||
     typeof expected.sessionId!=="string"||!UUID.test(expected.sessionId)||
     typeof expected.icao!=="string"||!ICAO.test(expected.icao)||
     typeof expected.authorizationEvidenceSha256!=="string"||
     !SHA.test(expected.authorizationEvidenceSha256)||
     !positive(expected.canaryCreditCeiling,100)||
     !positive(expected.fixedExposureSeconds,3600)||
     (expected.nowUtc!==undefined&&!iso(expected.nowUtc))){
    throw Error("GATE3_PREARM_REVIEW_INPUT_INVALID");
  }
  const reasons:string[]=[];
  // One read-only joined source snapshot. No raw provider content, balance or
  // webhook secret appears in the returned review (or SELECT list).
  const q=await client.query(
    `SELECT a.session_id, a.icao, a.authorization_evidence_sha256,
            a.canary_credit_ceiling, a.fixed_exposure_seconds,
            a.state AS durable_state, a.expires_at_utc AS durable_expires,
            s.owner_kind, s.owner_probe_id, s.stage,
            s.icao AS session_icao, s.state AS runtime_state,
            s.expires_at_utc AS runtime_expires,
            (s.provider_subscription_id IS NOT NULL) AS subscription_bound,
            s.callback_requests_seen, s.callback_success_2xx, s.callback_failures,
            (SELECT count(*)::int FROM clean.phase3_gate3_canary_owner_v39
              WHERE state='PREPARED') AS prepared_owner_count
       FROM clean.phase3_gate3_canary_owner_v39 a
       LEFT JOIN clean.prepaid_probe_session_runtime s USING(session_id)
      WHERE a.session_id=$1`,
    [expected.sessionId],
  );
  if(q.rowCount!==1){reasons.push("DURABLE_GATE3_OWNER_MISSING");}
  else {
    const row=q.rows[0] as Record<string,unknown>;
    const now=(expected.nowUtc??new Date()).getTime();
    if(row.icao!==expected.icao||
       row.authorization_evidence_sha256!==expected.authorizationEvidenceSha256||
       row.canary_credit_ceiling!==expected.canaryCreditCeiling||
       row.fixed_exposure_seconds!==expected.fixedExposureSeconds)
      reasons.push("DURABLE_SCOPE_OR_AUTH_HASH_DOES_NOT_MATCH");
    if(row.durable_state!=="PREPARED")
      reasons.push("DURABLE_OWNER_NOT_PREPARED");
    const durableExpiry=new Date(row.durable_expires as string|number|Date).getTime();
    const runtimeExpiry=row.runtime_expires===null?NaN:
      new Date(row.runtime_expires as string|number|Date).getTime();
    if(!Number.isFinite(durableExpiry)||durableExpiry<=now)
      reasons.push("DURABLE_OWNER_EXPIRED");
    if(row.owner_kind!=="phase3_credit_canary"||
       row.owner_probe_id!==null||row.stage!==null||
       row.session_icao!==expected.icao||
       row.runtime_state!=="armed")
      reasons.push("PREPAID_SESSION_ABSENT_OR_WRONG_OWNER_STATE");
    if(!Number.isFinite(runtimeExpiry)||runtimeExpiry<=now||
       runtimeExpiry>durableExpiry)
      reasons.push("PREPAID_RUNTIME_SESSION_EXPIRED_OR_DISAGREES");
    if(row.subscription_bound===true)
      reasons.push("PREPAID_SESSION_ALREADY_BOUND");
    if(row.callback_requests_seen!==0||row.callback_success_2xx!==0||
       row.callback_failures!==0)
      reasons.push("PREPAID_SESSION_ALREADY_ACCESSED");
    if(row.prepared_owner_count!==1)
      reasons.push("OTHER_UNSETTLED_GATE3_OWNER_PRESENT");
  }
  return {
    schema:"v39.phase3.gate3.prearmed-session-review.v1",
    status:reasons.length?"HOLD":"OFFLINE_SOURCE_SHAPE_VALID",
    reasons:reasons.sort(),
    sourceSessionId:expected.sessionId,
    signedAuthorizationVerifiedHere:false,
    livePublishedReceiverVerified:false,
    realProviderAccountVerified:false,
    providerCalls:0,databaseMutations:0,authorizedPaidCanary:false,
  };
}
