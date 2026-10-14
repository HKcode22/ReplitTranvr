import "dotenv/config";
import {createHash} from "node:crypto";
import fs from "node:fs";
import {v39Pool as pool} from "../server/lib/disruption/db_v39.ts";
import {listSubscriptionsStrict} from "../server/lib/disruption/aerodataboxLimiter_v3.ts";
import {assessIncident31ExpiryCloseoutV39,
  type Incident31CloseoutWitnessV39}
 from "../server/lib/disruption/phase2gIncident31ExpiryCloseout_v39.ts";

/**
 * YSSY P25 scoped incident31 disposition. Read-only DRY_RUN by default.
 * APPLY never deletes raw bytes and only marks the EXACT historical
 * administrative incident resolved AFTER all 58 originals already expired
 * and were verified deleted by the independent existing retention operator.
 * Human explicit yes + approved/reviewed version required before APPLY.
 */
const SESSION="b0077437-edc1-459a-9d63-8c6e6e50c4f2";
const BUDGET="P2G-S1-20261013-03";
const now=new Date();
const args=process.argv.slice(2);
if(args.some(v=>v!=="--dry-run"&&v!=="--apply") ||
   args.includes("--dry-run")&&args.includes("--apply"))
  throw Error("INCIDENT31_INVALID_ARGS");
const apply=args.includes("--apply");
if(apply&&process.env.PHASE2G_CONFIRM_INCIDENT31_EXPIRY_CLOSE!=="YES")
  throw Error("INCIDENT31_APPLY_NOT_OPERATOR_APPROVED");

let providerInventory:Awaited<ReturnType<typeof listSubscriptionsStrict>>;
try{providerInventory=await listSubscriptionsStrict();}
catch{throw Error("INCIDENT31_PROVIDER_READ_UNAVAILABLE");}
const activeBillable=providerInventory.filter(s=>s.isActive&&s.billingType!=="LifetimeBased").length;
const c=await pool.connect();
let updated=false;
try{
  await c.query(apply?"BEGIN":"BEGIN TRANSACTION READ ONLY");
  await c.query("SET LOCAL statement_timeout='15000ms'");
  const incident=await c.query(
    `SELECT id,cause,resolved,detail FROM clean.adb_incident_stop
      WHERE id=31 ${apply?"FOR UPDATE":""}`);
  const probe=await c.query(
    `SELECT probe_id,icao,status,reconciliation_status,stop_reason,
            duration_censored,runtime_session_id FROM clean.adb_anchor_probe
      WHERE probe_id=19 AND probe_budget_day_id=$1`,[BUDGET]);
  const recon=await c.query(
    `SELECT external_spend_credits,internal_received_credits,delivery_gap_credits
       FROM clean.adb_probe_reconciliation_evidence
      WHERE probe_id=19`);
  const counters=await c.query(
    `SELECT
       (SELECT count(*)::int FROM clean.adb_anchor_probe
         WHERE status IN ('probing','settling')) AS active_probes,
       (SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') AS open_days,
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid) AS sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid) AS deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid) AS items`,
     [SESSION]);
  const refs=await c.query(
    `SELECT
       count(*)::int AS total,
       count(content_sha256)::int AS sha_count,
       COALESCE(sum(content_bytes),0)::bigint AS bytes,
       count(*) FILTER(WHERE deletion_verified_at_utc IS NOT NULL)::int AS deleted,
       count(*) FILTER(WHERE deletion_verified_at_utc IS NULL)::int AS live,
       count(*) FILTER(WHERE storage_kind<>'replit_app_storage'
              OR content_class<>'raw_provider_content'
              OR contract_version<>'provider-blob-contract-v39@1.0.0')::int AS bad_contract,
       max(expires_at_utc) AS max_expiry
     FROM clean.provider_content_blob_ref
     WHERE source_kind='webhook' AND source_record_id LIKE $1`,
    [`prepaid:${SESSION}:%`]);
  if(incident.rowCount!==1||probe.rowCount!==1||recon.rowCount!==1||
     counters.rowCount!==1||refs.rowCount!==1)
    throw Error("INCIDENT31_REQUIRED_DURABLE_ROWS_MISSING");
  const i=incident.rows[0],p=probe.rows[0],r=recon.rows[0],
     v=counters.rows[0],b=refs.rows[0];
  const w:Incident31CloseoutWitnessV39={
    observedAtMs:now.getTime(),
    latestOriginalExpiryMs:new Date(b.max_expiry).getTime(),
    incidentId:Number(i.id),incidentCause:String(i.cause),
    incidentResolved:i.resolved===true,
    incidentKind:String(i.detail?.kind??""),
    incidentReason:String(i.detail?.reason??""),
    incidentProviderDeleteVerified:i.detail?.providerDeleteVerified===true,
    incidentRuntimeCleanupVerified:i.detail?.runtimeCleanupVerified===true,
    probeId:Number(p.probe_id),probeIcao:String(p.icao),
    probeStatus:String(p.status),
    probeReconciliation:String(p.reconciliation_status),
    probeStopReason:String(p.stop_reason),
    probeDurationCensored:p.duration_censored===true,
    probeSessionExact:String(p.runtime_session_id).toLowerCase()===SESSION,
    historicalReconciliationExternal:Number(r.external_spend_credits),
    historicalReconciliationInternal:Number(r.internal_received_credits),
    historicalReconciliationGap:Number(r.delivery_gap_credits),
    activeOrSettlingProbes:Number(v.active_probes),
    openBudgetDays:Number(v.open_days),
    activeBillableSubscriptions:activeBillable,
    runtimeSessions:Number(v.sessions),runtimeDeliveries:Number(v.deliveries),
    runtimeItems:Number(v.items),
    originalReferences:Number(b.total),
    originalShaMetadataRefs:Number(b.sha_count),
    originalBytesRecorded:Number(b.bytes),
    deletedVerifiedReferences:Number(b.deleted),
    stillLiveReferences:Number(b.live),
    latestOriginalExpiryMs:new Date(b.max_expiry).getTime(),
    contractInvalidReferences:Number(b.bad_contract)
  };
  const decision=assessIncident31ExpiryCloseoutV39(w);
  if(!decision.eligible||!apply){
    await c.query("ROLLBACK");
    console.log(JSON.stringify({
      schema:"v39.p25.incident31.expiry-disposition.v1",
      mode:"DRY_RUN",status:decision.eligible?
        "ELIGIBLE_ONLY_WITH_OPERATOR_APPROVAL":"HOLD",
      blockers:decision.blockers,verified_original_tombstones:w.deletedVerifiedReferences,
      remaining_live_originals:w.stillLiveReferences,
      earliest_handled_after_expiry_utc:new Date(w.latestOriginalExpiryMs).toISOString(),
      active_billable_subscriptions:activeBillable,
      original_probe_status:"failed",
      original_reconciliation:"DELIVERY_GAP",
      incident31_resolved:false,
      db_mutations:0,provider_mutations:0,raw_deletions:0
    },null,2));
    if(apply)process.exitCode=2;
    return;
  }
  const receipt={
    kind:"P25_INCIDENT31_ADMINISTRATIVE_TTL_DISPOSITION",
    schema:"v39.p25.incident31.expiry-disposition.v1",
    original_probe19_status:"failed",
    historical_reconciliation:"DELIVERY_GAP",
    references_verified_deleted:58,
    original_provider_bytes_preserved_after_expiry:false,
    replacement_source_reconstruction_claimed:false,
    provider_mutation:false,
    raw_deletion_by_this_script:false
  };
  const receiptSha=createHash("sha256").update(JSON.stringify(receipt)).digest("hex");
  const resolution=await c.query(
    `UPDATE clean.adb_incident_stop SET resolved=true,
      resolved_at_utc=clock_timestamp(),
      detail=detail || jsonb_build_object(
        'postrunAdministrativeResolution',
        jsonb_build_object('classification','EXPIRED_ORIGINALS_VERIFIED_TOMBSTONED',
          'receipt_sha256',$1::text,'no_provider_mutation',true,
          'historic_reconciliation_preserved','DELIVERY_GAP'))
     WHERE id=31 AND resolved=false
       AND cause='reconciliation'
     RETURNING id,resolved,resolved_at_utc`,
    [receiptSha]);
  if(resolution.rowCount!==1)throw Error("INCIDENT31_UPDATE_CONFLICT");
  await c.query("COMMIT");
  updated=true;
  console.log(JSON.stringify({
    schema:"v39.p25.incident31.expiry-disposition.v1",
    mode:"APPLY",status:"PASS_INCIDENT31_ADMIN_RESOLVED_AFTER_TTL",
    incident_id:31,resolved_at_utc:resolution.rows[0].resolved_at_utc,
    receipt_sha256:receiptSha,
    original_probe19_status:"failed",
    historical_reconciliation:"DELIVERY_GAP",
    provider_mutations:0,raw_deletions:0
  },null,2));
}catch(e){
  await c.query("ROLLBACK").catch(()=>{});
  console.error("INCIDENT31_EXPIRY_DISPOSITION_REFUSED_OR_ERROR");
  process.exitCode=2;
}finally{
  c.release();
  await pool.end();
}
