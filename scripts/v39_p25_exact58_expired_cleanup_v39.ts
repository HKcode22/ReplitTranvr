/**
 * Exact approved retention cleanup: YSSY P25 probe19 58 expired raw blobs.
 * NOT a global retention job. No provider API calls, no incident/budget
 * mutation, no original-data download, no deployments.
 *
 * Usage:
 *   node --import tsx scripts/v39_p25_exact58_expired_cleanup_v39.ts --dry-run
 *   node --import tsx scripts/v39_p25_exact58_expired_cleanup_v39.ts
 *      --apply --expected-manifest <dry-run sha256>
 *
 * This command is explicitly manual only; it must never auto-arm from CI.
 */
import "dotenv/config";
import pg from "pg";
import {randomUUID} from "node:crypto";
import {pathToFileURL} from "node:url";
import {
  createRequiredProviderBlobStoreV39,
  normalizeProviderBlobBucketIdV39
} from "../server/lib/disruption/replitProviderBlobStore_v39.ts";
import {deleteProviderBlobAtExpiryV39} from
  "../server/lib/disruption/providerBlobStore_v39.ts";
import {
  P25_EXPIRY_SESSION_V39,
  P25_EXPIRY_BUDGET_V39,
  P25_EXPIRY_SOURCE_PATTERN_V39,
  planExactP25Expired58V39,
  executeExactP25DeletionV39,
  P25ExactDeletionHOLDV39,
  type P25ExpiredBlobRowV39
} from "../server/lib/disruption/p25ExactExpired58Plan_v39.ts";

function mode(argv:string[]):{apply:boolean;expectedManifest:string|null} {
  if(argv.length===1&&argv[0]==="--dry-run")
    return {apply:false,expectedManifest:null};
  if(argv.length===3&&argv[0]==="--apply"&&argv[1]==="--expected-manifest"&&
     /^[a-f0-9]{64}$/.test(argv[2]))
    return {apply:true,expectedManifest:argv[2]};
  throw Error("P25_EXACT_USAGE_DRY_RUN_OR_APPLY_WITH_MANIFEST_ONLY");
}
const SCOPED_LOCK_A=2519,SCOPED_LOCK_B=20261022;

async function exactReadOnlyPreflight(c:pg.Client):Promise<P25ExpiredBlobRowV39[]> {
  await c.query("BEGIN TRANSACTION READ ONLY");
  try {
    const i=(await c.query(
      "SELECT current_database() AS db,current_user AS actor,pg_is_in_recovery() AS replica"
    )).rows[0];
    if(i?.db!=="neondb"||i?.actor!=="neondb_owner"||i?.replica!==false)
      throw Error("P25_EXACT_WRONG_DATABASE_HOLD");
    const probe=(await c.query(
      "SELECT status,reconciliation_status,duration_censored,stop_reason,runtime_session_id "+
      "FROM clean.adb_anchor_probe WHERE probe_id=19 AND probe_budget_day_id=$1 AND icao='YSSY'",
      [P25_EXPIRY_BUDGET_V39])).rows;
    if(probe.length!==1||probe[0].status!=="failed"||
       probe[0].reconciliation_status!=="DELIVERY_GAP"||
       probe[0].duration_censored!==false||
       probe[0].stop_reason!=="external_internal_delivery_gap"||
       String(probe[0].runtime_session_id)!==P25_EXPIRY_SESSION_V39)
      throw Error("P25_EXACT_PROBE_FINGERPRINT_HOLD");
    const budget=(await c.query(
      "SELECT state,cap_credits,closed_at FROM clean.adb_probe_budget_day "+
      "WHERE probe_budget_day_id=$1",[P25_EXPIRY_BUDGET_V39])).rows;
    if(budget.length!==1||budget[0].state!=="OPEN"||
       Number(budget[0].cap_credits)!==500||budget[0].closed_at!==null)
      throw Error("P25_EXACT_BUDGET_CHANGED_HOLD");
    const recon=(await c.query(
      "SELECT external_spend_credits,internal_received_credits,delivery_gap_credits "+
      "FROM clean.adb_probe_reconciliation_evidence WHERE probe_id=19 "+
      "AND runtime_session_id=$1::uuid",[P25_EXPIRY_SESSION_V39])).rows;
    if(recon.length!==1||
       Number(recon[0].external_spend_credits)!==231||
       Number(recon[0].internal_received_credits)!==229||
       Number(recon[0].delivery_gap_credits)!==2)
      throw Error("P25_EXACT_HISTORICAL_SCIENCE_CHANGED_HOLD");
    const open=(await c.query(
      "SELECT id,cause,detail FROM clean.adb_incident_stop "+
      "WHERE resolved=false ORDER BY id")).rows;
    if(open.length!==2||Number(open[0].id)!==31||
       Number(open[1].id)!==32||
       open[0].cause!=="reconciliation"||open[1].cause!=="reconciliation"||
       open[0].detail?.kind!=="stage1_supervisor_recovery"||
       open[0].detail?.reason!=="provider_subscription_isolation_lost"||
       open[1].detail?.kind!=="prepaid_probe_failed")
      throw Error("P25_EXACT_INCIDENT_SCOPE_CHANGED_HOLD");
    const active=(await c.query(
      "SELECT "+
      "(SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')) AS probes,"+
      "(SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') AS days,"+
      "(SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid) AS sessions,"+
      "(SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid) AS deliveries,"+
      "(SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid) AS items",
      [P25_EXPIRY_SESSION_V39])).rows[0];
    if(!active||Number(active.probes)!==0||Number(active.days)!==1||
       Number(active.sessions)!==0||Number(active.deliveries)!==0||
       Number(active.items)!==0)
      throw Error("P25_EXACT_RUNTIME_OR_BUDGET_ACTIVITY_HOLD");
    const refs=(await c.query(
      "SELECT blob_ref_id,object_name,contract_version,storage_kind,content_class,"+
      "content_sha256,content_bytes,persisted_at_utc,expires_at_utc,retention_hours,"+
      "deletion_verified_at_utc "+
      "FROM clean.provider_content_blob_ref "+
      "WHERE source_kind='webhook' AND source_record_id LIKE $1 "+
      "ORDER BY blob_ref_id",
      [P25_EXPIRY_SOURCE_PATTERN_V39])).rows as P25ExpiredBlobRowV39[];
    // No deletable opaque object may also be referenced by another logical
    // source, even if the names accidentally match.
    const names=refs.map(x=>x.object_name);
    const shared=(await c.query(
      "SELECT count(*)::int AS n FROM clean.provider_content_blob_ref "+
      "WHERE object_name=ANY($1::text[])",[names])).rows[0];
    if(refs.length!==58||Number(shared?.n)!==58)
      throw Error("P25_EXACT_SHARED_OBJECT_OR_COUNT_HOLD");
    await c.query("ROLLBACK");
    return refs;
  } catch(e) {
    await c.query("ROLLBACK").catch(()=>{});
    throw e;
  }
}

export async function main(argv=process.argv.slice(2)):Promise<number> {
  let client:pg.Client|null=null,locked=false,physical=0,tombstones=0;
  let stage="PRECHECK";
  try {
    const args=mode(argv);
    if(process.env.V39_PROVIDER_BLOB_MODE!=="required" ||
       !process.env.V39_PROVIDER_BLOB_BUCKET_ID ||
       !process.env.DATABASE_URL)
      throw Error("P25_EXACT_REQUIRED_DATABASE_AND_BUCKET");
    if(process.env.GITHUB_ACTIONS==="true")
      throw Error("P25_EXACT_NO_GITHUB_ACTIONS_LIVE_APPLY");
    const bucket=normalizeProviderBlobBucketIdV39(
      process.env.V39_PROVIDER_BLOB_BUCKET_ID);
    client=new pg.Client({
      connectionString:process.env.DATABASE_URL,
      connectionTimeoutMillis:7000,
      statement_timeout:12000,
      query_timeout:15000
    });
    await client.connect();
    if(args.apply){
      const l=await client.query(
        "SELECT pg_try_advisory_lock($1::int,$2::int) AS acquired",
        [SCOPED_LOCK_A,SCOPED_LOCK_B]);
      if(l.rows[0]?.acquired!==true)
        throw Error("P25_EXACT_CONCURRENT_OPERATOR_HOLD");
      locked=true;
    }
    const rows=await exactReadOnlyPreflight(client);
    const plan=planExactP25Expired58V39(rows,new Date(),bucket);
    if(args.apply && args.expectedManifest!==plan.manifestSha256)
      throw Error("P25_EXACT_MANIFEST_CHANGED_HOLD");
    // This is the explicitly configured required bucket; it may have no
    // separate historical bucket-ownership attestation.
    const storage=createRequiredProviderBlobStoreV39();
    stage="EXISTS_CHECK";
    let count=0;
    for(const ref of plan.refs){
      if(await storage.exists(ref.objectName)!==true)
        throw Error("P25_EXACT_NOT_ALL_58_PRESENT_HOLD");
      count++;
    }
    if(count!==58) throw Error("P25_EXACT_EXISTENCE_INCOMPLETE_HOLD");
    if(!args.apply){
      console.log(JSON.stringify({
        schema:"v39.p25.exact-58-expiry.v1",mode:"DRY_RUN",
        status:"READY_EXACT_58_ONLY",
        scope:"YSSY_P25_PROBE19_ONLY",
        expectedManifestSha256:plan.manifestSha256,
        bucketFingerprintSha256:plan.bucketFingerprintSha256,
        targetObjects:plan.count,targetBytes:plan.totalBytes,
        presentAndVerifiedByExists:count,
        latestExpiryUtc:"2026-10-20T05:02:12.501Z",
        historicalProbe:"failed/DELIVERY_GAP",
        historicalCredits:{external:231,internal:229,gap:2},
        providerApiRequests:0,storageDeletes:0,databaseWrites:0,
        incidentUpdates:0,budgetUpdates:0,
        authorizationScope:"EXACT_YSSY_58_OBJECTS_ONLY"
      },null,2));
      return 0;
    }
    const runId="P25-EXACT58-"+randomUUID();
    stage="DELETING";
    const outcome=await executeExactP25DeletionV39(plan,{
      deleteAndVerifyPhysical:async ref=>{
        // Existing official owner performs delete and post-delete exists===false.
        await deleteProviderBlobAtExpiryV39({
          store:storage,ref,now:new Date()
        });
        physical++;
      },
      tombstoneExact:async ref=>{
        const q=await client!.query(
          "UPDATE clean.provider_content_blob_ref "+
          "SET deleted_at_utc=clock_timestamp(),"+
          "deletion_verified_at_utc=clock_timestamp(),deletion_run_id=$2 "+
          "WHERE blob_ref_id=$1 AND source_kind='webhook' "+
          "AND source_record_id LIKE $3 AND object_name=$4 "+
          "AND content_sha256=$5 AND content_bytes=$6 "+
          "AND content_class='raw_provider_content' "+
          "AND expires_at_utc <= clock_timestamp() "+
          "AND deletion_verified_at_utc IS NULL RETURNING blob_ref_id",
          [ref.blobRefId,runId,P25_EXPIRY_SOURCE_PATTERN_V39,
           ref.objectName,ref.contentSha256,ref.contentBytes]);
        if(q.rowCount!==1)
          throw Error("P25_EXACT_TOMBSTONE_COMMIT_UNKNOWN");
        tombstones++;
      }
    });
    stage="INDEPENDENT_READBACK";
    let physicallyAbsent=0;
    for(const ref of plan.refs){
      if(await storage.exists(ref.objectName)!==false)
        throw Error("P25_EXACT_POST_DELETE_OBJECT_STILL_PRESENT");
      physicallyAbsent++;
    }
    const after=await client.query(
      "SELECT count(*)::int AS total,"+
      "count(*) FILTER(WHERE deletion_verified_at_utc IS NOT NULL)::int AS marked,"+
      "count(*) FILTER(WHERE deletion_run_id=$2)::int AS run_marked "+
      "FROM clean.provider_content_blob_ref "+
      "WHERE source_kind='webhook' AND source_record_id LIKE $1",
      [P25_EXPIRY_SOURCE_PATTERN_V39,runId]);
    const state=after.rows[0];
    if(physicallyAbsent!==58||Number(state?.total)!==58||
       Number(state?.marked)!==58||Number(state?.run_marked)!==58)
      throw Error("P25_EXACT_POST_READBACK_INCOMPLETE_HOLD");
    console.log(JSON.stringify({
      schema:"v39.p25.exact-58-expiry.v1",mode:"APPLY",
      status:"EXACT_58_DELETED_AND_TOMBSTONED",
      scope:"YSSY_P25_PROBE19_ONLY",
      expectedManifestSha256:plan.manifestSha256,
      physicallyAbsent,tombstonesVerified:Number(state.marked),
      deletedBytes:plan.totalBytes,
      historicalProbeStillRequired:"failed/DELIVERY_GAP",
      historicalCreditsStillRequired:{external:231,internal:229,gap:2},
      incidentUpdates:0,budgetUpdates:0,aerodataboxRequests:0,
      independentlyPublishedHostVerified:false,
      adminCloseoutStillRequired:true
    },null,2));
    if(outcome.physicalConfirmed!==58||outcome.tombstonesConfirmed!==58)
      throw Error("P25_EXACT_UNEXPECTED_OUTCOME_HOLD");
    return 0;
  } catch(error){
    const d=error instanceof P25ExactDeletionHOLDV39?error:null;
    console.error(JSON.stringify({
      schema:"v39.p25.exact-58-expiry.v1",
      status:"HOLD_NO_AUTOMATIC_RETRY",
      stage,
      kind:d?"PARTIAL_DELETE_OR_TOMBSTONE_UNCERTAIN":"PRECHECK_OR_POSTCHECK_FAILED",
      ...(d?{
        failedOrdinal:d.index,physicalConfirmed:d.physicalConfirmed,
        tombstonesConfirmed:d.tombstonesConfirmed
      }:{
        physicalConfirmed:physical,tombstonesConfirmed:tombstones
      }),
      // Prevent error strings, SQL values and secret object names in logs.
      action:"STOP_AND_INDEPENDENTLY_RECONCILE_PHYSICAL_VS_SQL"
    },null,2));
    return 2;
  } finally {
    if(client){
      if(locked)
        await client.query(
          "SELECT pg_advisory_unlock($1::int,$2::int)",
          [SCOPED_LOCK_A,SCOPED_LOCK_B]
        ).catch(()=>{});
      await client.end().catch(()=>{});
    }
  }
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href){
  main().then(code=>{process.exitCode=code}).catch(()=>{
    console.error("P25_EXACT_UNHANDLED_HOLD");
    process.exitCode=2;
  });
}
