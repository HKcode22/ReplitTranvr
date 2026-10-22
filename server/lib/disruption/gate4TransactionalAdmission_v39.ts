/**
 * V3.9 Gate4: transaction-scoped second-start admission for one collaborating
 * Phase6 controller. Caller MUST first BEGIN and hold the same PG client
 * through new-parent INSERT and COMMIT. Never call from a bare pooled query.
 *
 * This protects cooperating instances that use the same advisory key.
 * It does NOT block legacy/unreviewed creators that ignore this lock.
 */
export interface Gate4AdmissionClientV39 {
  query(sql:string,values?:number[]):Promise<{
    rowCount:number|null;
    rows:Array<Record<string,unknown>>;
  }>;
}
export async function assertGate4TransactionalAdmissionV39(
  client:Gate4AdmissionClientV39
):Promise<void> {
  // Never wait unbounded for a competing instance. Transaction-scoped locks
  // auto-release on ROLLBACK, unlike session locks.
  const owner=await client.query(
    "SELECT pg_try_advisory_xact_lock($1::int,$2::int) AS locked",
    [3904, 20261021]
  );
  if(owner.rows[0]?.locked!==true)
    throw Error("REFUSED_GATE4_ADMISSION_LOCK_BUSY");
  const active=await client.query(
    "SELECT 1 AS live FROM clean.adb_collection_batches WHERE status='ACTIVE' LIMIT 1"
  );
  if(active.rows.length!==0)
    throw Error("REFUSED_GATE4_ACTIVE_BATCH_TRANSACTION");
  const latest=await client.query(
    "SELECT status,reconciliation_status,reconcile_acked,credits_consumed_actual "+
    "FROM clean.adb_collection_batches ORDER BY batch_seq DESC LIMIT 1"
  );
  const p=latest.rows[0];
  if(p===undefined)return;
  if(p.status!=="CLOSED" || p.reconciliation_status!=="MATCH" ||
     p.reconcile_acked!==true ||
     typeof p.credits_consumed_actual!=="number" && 
     typeof p.credits_consumed_actual!=="string")
    throw Error("REFUSED_GATE4_UNSETTLED_PREDECESSOR_TRANSACTION");
  const credits=Number(p.credits_consumed_actual);
  if(!Number.isSafeInteger(credits)||credits<0)
    throw Error("REFUSED_GATE4_PREDECESSOR_CREDIT_INTEGRITY");
}
