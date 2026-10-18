/**
 * Gate3: zero-provider PostgreSQL witness while a source-only WSSS owner
 * waits for the independently authenticated GitHub watchdog.
 *
 * The prepaid callback source is intentionally UNLOGGED: after a crash /
 * compute reset its source can disappear while the LOGGED owner survives.
 * Never reconstruct the source or rearm another UUID from this proof.
 * An independent real account and published host gate remain mandatory.
 */
import type {Pool} from "pg";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GATE3_PRECREATE_CONTINUITY_SQL_V39=`
SELECT
  pg_postmaster_start_time() AS postgres_started_at_utc,
  o.session_id::text AS owner_session_id,
  o.state AS owner_state,
  s.session_id::text AS runtime_session_id,
  s.state AS runtime_state,
  s.owner_kind,
  s.provider_subscription_id
FROM clean.phase3_gate3_canary_owner_v39 o
LEFT JOIN clean.prepaid_probe_session_runtime s ON s.session_id=o.session_id
WHERE o.session_id=$1::uuid AND o.icao='WSSS'
` as const;

export type Gate3PrecreateSnapshotV39=Readonly<{
  postgres_started_at_utc:Date|string;
  owner_session_id:string;
  owner_state:string;
  runtime_session_id:string|null;
  runtime_state:string|null;
  owner_kind:string|null;
  provider_subscription_id:string|null;
}>;

/**
 * On every tick the postmaster must be the same as it was when prepared,
 * and the PREPARED/UNLOGGED exact source must still be intact.
 * A runtime loss or clock jump is a HOLD, not a paid retry.
 */
export function reviewGate3PrecreateContinuityV39(
  rows:readonly Gate3PrecreateSnapshotV39[],
  sessionId:string,
  expectedPostmasterMs:number|null,
):number{
  if(!UUID.test(sessionId)||!Array.isArray(rows)||rows.length!==1)
    throw Error("GATE3_OPERATOR_PRECREATE_SOURCE_ABSENT_HOLD");
  const r=rows[0];
  if(!r||r.owner_session_id!==sessionId||
     r.owner_state!=="PREPARED"||
     r.runtime_session_id!==sessionId||
     r.owner_kind!=="phase3_credit_canary"||
     r.runtime_state!=="armed"||
     r.provider_subscription_id!==null)
    throw Error("GATE3_OPERATOR_PRECREATE_RUNTIME_IDENTITY_LOST_HOLD");
  const epoch=new Date(r.postgres_started_at_utc).getTime();
  if(!Number.isFinite(epoch)||epoch<=0)
    throw Error("GATE3_OPERATOR_PRECREATE_POSTMASTER_UNVERIFIED_HOLD");
  if(expectedPostmasterMs!==null&&
     (!Number.isSafeInteger(expectedPostmasterMs)||
      epoch!==expectedPostmasterMs))
    throw Error("GATE3_OPERATOR_PRECREATE_POSTMASTER_CHANGED_HOLD");
  return epoch;
}

/** Read-only SQL; bounded connection/query timeouts belong to the caller. */
export async function readGate3PrecreateContinuityV39(
  pool:Pick<Pool,"query">,
  sessionId:string,
  expectedPostmasterMs:number|null
):Promise<number>{
  if(!UUID.test(sessionId))
    throw Error("GATE3_OPERATOR_PRECREATE_SESSION_INVALID_HOLD");
  let rows:Gate3PrecreateSnapshotV39[];
  try{
    const q=await pool.query(GATE3_PRECREATE_CONTINUITY_SQL_V39,[sessionId]);
    rows=q.rows as Gate3PrecreateSnapshotV39[];
  }catch{
    throw Error("GATE3_OPERATOR_PRECREATE_POSTGRES_READ_FAILED_HOLD");
  }
  return reviewGate3PrecreateContinuityV39(
    rows,sessionId,expectedPostmasterMs);
}
