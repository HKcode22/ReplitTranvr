import type {PoolClient} from "pg";

/**
 * P13 TEST-ONLY: a READ-ONLY, narrowly scoped PostgreSQL continuity audit.
 *
 * A retained LOGGED blob is not evidence that a vanished UNLOGGED session,
 * delivery or physical-flight ledger was reconstructed. A changed DB
 * postmaster start after the frozen owner baseline is a mandatory refusal.
 *
 * This helper DOES NOT restore data, resume owners, issue paid requests,
 * authorize a scientific pass, or modify existing V3.9 callback behavior.
 */
export type SyntheticPostgresContinuitySnapshotV39={
  postmasterStartUtc:string;
  sessionRows:number;
  deliveryRows:number;
  itemRows:number;
  loggedRawBlobRefs:number;
  linkedDeliveryBlobRefs:number;
};
export type FrozenSyntheticContinuityBaselineV39={
  frozenPostmasterStartUtc:string;
  expectedDeliveryRows:number;
  expectedItemRows:number;
  independentOwnerSessionBindingVerified:boolean;
  independentAttemptAccountingVerified:boolean;
};
export type SyntheticContinuityDecisionV39={
  continuityPreflightPassed:boolean;
  mandatoryCensor:boolean;
  reasons:string[];
  scientificRunAuthorized:false;
  automaticRestoreAllowed:false;
};

const validIso=(value:string)=>typeof value==="string"&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&
  !Number.isNaN(Date.parse(value));
const whole=(n:number)=>Number.isSafeInteger(n)&&n>=0;

export async function readDisposablePostgresContinuitySnapshotV39(
  client:Pick<PoolClient,"query">,sessionId:string
):Promise<SyntheticPostgresContinuitySnapshotV39>{
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
     process.env.AERODATABOX_API_KEY||process.env.V39_DATABASE_RUNTIME_URL)
    throw new Error("DISPOSABLE_ONLY_CONTINUITY_AUDIT");
  const dbUrl=new URL(process.env.P2G_FIXTURE_POSTGRES_URL??"");
  if(dbUrl.hostname!=="127.0.0.1"||dbUrl.pathname!=="/p2g_stage1_fixture")
    throw new Error("NONDISPOSABLE_POSTGRES_REFUSED");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId))
    throw new Error("INVALID_SYNTHETIC_SESSION_ID");
  // The named source_record_id prefix is from the actual V3.9 write path.
  // Each count is a read-only snapshot, NOT a recovery transaction.
  const q=await client.query(
    `SELECT pg_postmaster_start_time() AS postmaster_start,
      (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime
         WHERE session_id=$1::uuid) AS session_rows,
      (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime
         WHERE session_id=$1::uuid) AS delivery_rows,
      (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime
         WHERE session_id=$1::uuid) AS item_rows,
      (SELECT count(*)::int FROM clean.provider_content_blob_ref
         WHERE source_kind='webhook'
           AND left(source_record_id,length($2::text))=$2::text) AS logged_refs,
      (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime d
         JOIN clean.provider_content_blob_ref b ON b.blob_ref_id=d.blob_ref_id
         WHERE d.session_id=$1::uuid
           AND b.source_record_id=('prepaid:'||$1::text||':'||d.delivery_id)
           AND b.source_kind='webhook') AS linked_refs`,
    [sessionId,"prepaid:"+sessionId+":"]
  );
  if(q.rowCount!==1)throw new Error("CONTINUITY_SNAPSHOT_UNAVAILABLE");
  const r=q.rows[0];
  return {
    postmasterStartUtc:new Date(r.postmaster_start).toISOString(),
    sessionRows:Number(r.session_rows),
    deliveryRows:Number(r.delivery_rows),
    itemRows:Number(r.item_rows),
    loggedRawBlobRefs:Number(r.logged_refs),
    linkedDeliveryBlobRefs:Number(r.linked_refs)
  };
}

export function assessSyntheticPostgresContinuityV39(
  snapshot:SyntheticPostgresContinuitySnapshotV39,
  baseline:FrozenSyntheticContinuityBaselineV39
):SyntheticContinuityDecisionV39{
  const reasons=new Set<string>();
  if(!validIso(baseline.frozenPostmasterStartUtc)||!validIso(snapshot.postmasterStartUtc))
    reasons.add("DATABASE_LIFECYCLE_UNVERIFIABLE");
  else if(snapshot.postmasterStartUtc!==baseline.frozenPostmasterStartUtc)
    reasons.add("DATABASE_LIFECYCLE_CHANGED_NO_AUTO_RESTORE");
  if(snapshot.sessionRows!==1)reasons.add("UNLOGGED_SESSION_UNAVAILABLE");
  if(!whole(baseline.expectedDeliveryRows)||baseline.expectedDeliveryRows===0||
     !whole(snapshot.deliveryRows)||snapshot.deliveryRows!==baseline.expectedDeliveryRows)
    reasons.add("DELIVERY_LEDGER_INCOMPLETE");
  if(!whole(baseline.expectedItemRows)||!whole(snapshot.itemRows)||
     snapshot.itemRows!==baseline.expectedItemRows)
    reasons.add("PHYSICAL_ITEM_LEDGER_INCOMPLETE");
  if(!whole(snapshot.loggedRawBlobRefs)||
     snapshot.loggedRawBlobRefs!==baseline.expectedDeliveryRows)
    reasons.add("RAW_BLOB_METADATA_COUNT_MISMATCH");
  // After an UNLOGGED reset, LOGGED raw refs survive but their matching
  // delivery rows vanish. A naive joined-row check of zero == zero would
  // otherwise miss these orphaned refs.
  if(!whole(snapshot.linkedDeliveryBlobRefs)||
     snapshot.linkedDeliveryBlobRefs!==snapshot.deliveryRows||
     snapshot.linkedDeliveryBlobRefs!==snapshot.loggedRawBlobRefs)
    reasons.add("RAW_BLOB_LINKAGE_INCOMPLETE");
  if(!baseline.independentOwnerSessionBindingVerified)
    reasons.add("OWNER_SESSION_BINDING_UNVERIFIED");
  if(!baseline.independentAttemptAccountingVerified)
    reasons.add("ATTEMPT_ACCOUNTING_UNVERIFIED");
  return {
    continuityPreflightPassed:reasons.size===0,
    mandatoryCensor:reasons.size>0,
    reasons:[...reasons].sort(),
    scientificRunAuthorized:false,
    automaticRestoreAllowed:false
  };
}
