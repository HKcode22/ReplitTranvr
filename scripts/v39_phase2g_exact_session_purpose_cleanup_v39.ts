import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { cleanupPrepaidProbeSessionV39 } from "../server/lib/disruption/prepaidProbeRuntime_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function required(name:string):string {
  const i=process.argv.indexOf(name);
  const v=i>=0?String(process.argv[i+1]??"").trim():"";
  if(!v) throw new Error(`MISSING:${name}`);
  return v;
}
function has(name:string):boolean { return process.argv.includes(name); }
async function main():Promise<void>{
  const sessionId=required("--session").toLowerCase();
  const expectedLive=Number(required("--expected-live-blobs"));
  const label=required("--label");
  const apply=has("--apply");
  if(!UUID.test(sessionId)) throw new Error("REFUSED:SESSION_ID_INVALID");
  if(!Number.isInteger(expectedLive)||expectedLive<1||expectedLive>500) throw new Error("REFUSED:EXPECTED_LIVE_BLOBS_INVALID");

  const subscriptions=await listSubscriptionsStrict();
  const activeBillable=subscriptions.filter((sub)=>sub.isActive&&sub.billingType!=="LifetimeBased");
  if(activeBillable.length!==0) throw new Error(`REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);

  const counts=await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1) AS sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1) AS deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1) AS items`,
    [sessionId],
  );
  const live=await pool.query(
    `SELECT count(*)::int AS n FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $1 AND deletion_verified_at_utc IS NULL`,
    [`prepaid:${sessionId}:%`],
  );
  const liveN=Number(live.rows[0]?.n??-1);
  if(liveN!==expectedLive) throw new Error(`REFUSED:LIVE_BLOB_COUNT_MISMATCH:expected=${expectedLive}:actual=${liveN}`);

  if(!apply){
    console.log(JSON.stringify({
      schema:"v39.phase2g-exact-session-purpose-cleanup.v1",
      mode:"DRY_RUN",
      session_id:sessionId,label,
      expected_live_blobs:expectedLive,
      observed_live_blobs:liveN,
      transient_runtime:counts.rows[0],
      active_billable_subscriptions:0,
      provider_mutation:false,
      subscription_mutation:false,
      alert_credits_spent:0
    },null,2));
    return;
  }

  const deletionRunId=`phase2g-purpose-${label}-${new Date().toISOString().replace(/[-:.]/g,"")}-${randomUUID().slice(0,8)}`;
  const result=await cleanupPrepaidProbeSessionV39(sessionId,deletionRunId);
  const after=await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1) AS sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1) AS deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1) AS items,
       (SELECT count(*)::int FROM clean.provider_content_blob_ref WHERE source_kind='webhook' AND source_record_id LIKE $2 AND deletion_verified_at_utc IS NULL) AS live_blobs`,
    [sessionId,`prepaid:${sessionId}:%`],
  );
  const evidence={
    schema:"v39.phase2g-exact-session-purpose-cleanup.v1",
    mode:"APPLY",
    session_id:sessionId,label,
    deletion_run_id:deletionRunId,
    expected_live_blobs:expectedLive,
    deleted_blobs:result.deletedBlobs,
    deleted_runtime_rows:result.deletedRuntimeRows,
    verified_at_utc:result.verifiedAtUtc,
    final:after.rows[0],
    active_billable_subscriptions:0,
    provider_mutation:false,
    subscription_mutation:false,
    alert_credits_spent:0
  };
  fs.mkdirSync("artifacts",{recursive:true});
  const out=path.join("artifacts",`phase2g-exact-session-purpose-cleanup-${label}-${Date.now()}.json`);
  fs.writeFileSync(out,JSON.stringify(evidence,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({...evidence,evidence_file:out},null,2));
}
main().catch(e=>{console.error(JSON.stringify({schema:"v39.phase2g-exact-session-purpose-cleanup.v1",status:"REFUSED_OR_FAILED",error:e instanceof Error?e.message:String(e),provider_mutation:false,subscription_mutation:false,alert_credits_spent:0},null,2));process.exitCode=1;}).finally(async()=>{await pool.end().catch(()=>undefined);});
