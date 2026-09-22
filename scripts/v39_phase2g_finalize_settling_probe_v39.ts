import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";
import {
  loadProbeRuntimeConfig,
  PROBE_BUDGET_DAY_HARD_CAP,
} from "../server/lib/disruption/probeExecution_v39";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function required(name:string):string{
  const i=process.argv.indexOf(name);
  const v=i>=0?String(process.argv[i+1]??"").trim():"";
  if(!v) throw new Error(`MISSING:${name}`);
  return v;
}
function sha256File(file:string):string{
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

async function main():Promise<void>{
  const probeId=Number(required("--probe-id"));
  const sessionId=required("--session").toLowerCase();
  const budgetDay=required("--probe-budget-day-id");
  const cleanupFile=path.resolve(required("--cleanup-receipt"));
  const cleanupSha=required("--cleanup-receipt-sha").toLowerCase();
  const runtimeFile=path.resolve(required("--runtime-file"));
  const runtimeSha=required("--runtime-sha").toLowerCase();

  if(!Number.isInteger(probeId)||probeId<=0) throw new Error("REFUSED:PROBE_ID_INVALID");
  if(!UUID.test(sessionId)) throw new Error("REFUSED:SESSION_ID_INVALID");
  if(!/^[a-f0-9]{64}$/.test(cleanupSha)) throw new Error("REFUSED:CLEANUP_SHA_INVALID");
  if(sha256File(cleanupFile)!==cleanupSha) throw new Error("REFUSED:CLEANUP_SHA_MISMATCH");

  const runtime=loadProbeRuntimeConfig(runtimeFile,runtimeSha);
  if(runtime.config.probeBudgetDayId!==budgetDay) {
    throw new Error("REFUSED:RUNTIME_BUDGET_BINDING_MISMATCH");
  }

  const cleanup=JSON.parse(fs.readFileSync(cleanupFile,"utf8"));
  const verifiedAt=String(cleanup?.verified_at_utc??"");
  if(
    cleanup?.schema!=="v39.phase2g-exact-session-purpose-cleanup.v1"||
    cleanup?.mode!=="APPLY"||
    String(cleanup?.session_id??"").toLowerCase()!==sessionId||
    cleanup?.provider_mutation!==false||
    cleanup?.subscription_mutation!==false||
    Number(cleanup?.alert_credits_spent)!==0||
    Number(cleanup?.active_billable_subscriptions)!==0||
    Number(cleanup?.final?.sessions)!==0||
    Number(cleanup?.final?.deliveries)!==0||
    Number(cleanup?.final?.items)!==0||
    Number(cleanup?.final?.live_blobs)!==0||
    !Number.isFinite(Date.parse(verifiedAt))
  ){
    throw new Error("REFUSED:CLEANUP_RECEIPT_CONTRACT_INVALID");
  }

  const subscriptions=await listSubscriptionsStrict();
  const activeBillable=subscriptions.filter((sub)=>sub.isActive&&sub.billingType!=="LifetimeBased");
  if(activeBillable.length!==0) throw new Error(`REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);

  const incidents=await pool.query(
    `SELECT id,cause FROM clean.adb_incident_stop WHERE resolved=false ORDER BY id`,
  );
  if((incidents.rowCount??incidents.rows.length)!==0){
    throw new Error(`REFUSED:OPEN_INCIDENTS:${incidents.rows.map((x:any)=>x.id).join(",")}`);
  }

  const probeR=await pool.query(
    `SELECT probe_id,icao,stage,status,runtime_session_id,duration_censored,stop_reason,
            reconciliation_status,runtime_cleanup_verified_at_utc,provider_content_safe_mode,
            confirmed_unique_lower_per_credit,confirmed_plus_ambiguous_upper_per_credit,
            probe_budget_day_id
       FROM clean.adb_anchor_probe
      WHERE probe_id=$1 AND probe_budget_day_id=$2`,
    [probeId,budgetDay],
  );
  if(probeR.rowCount!==1) throw new Error("REFUSED:PROBE_NOT_FOUND");
  const probe=probeR.rows[0];
  if(
    String(probe.status)!=="settling"||
    String(probe.runtime_session_id??"").toLowerCase()!==sessionId||
    probe.duration_censored!==false||
    probe.stop_reason!=null||
    String(probe.reconciliation_status)!=="MATCH"||
    probe.runtime_cleanup_verified_at_utc!=null||
    probe.provider_content_safe_mode!==true||
    probe.confirmed_unique_lower_per_credit==null||
    probe.confirmed_plus_ambiguous_upper_per_credit==null
  ){
    throw new Error("REFUSED:SETTLING_PROBE_SHAPE_INVALID");
  }

  const evidenceR=await pool.query(
    `SELECT evidence_status,runtime_session_id,stage,icao,duration_censored,stop_reason
       FROM clean.adb_probe_reconciliation_evidence
      WHERE probe_id=$1`,
    [probeId],
  );
  if(evidenceR.rowCount!==1) throw new Error("REFUSED:RECONCILIATION_EVIDENCE_MISSING");
  const ev=evidenceR.rows[0];
  if(
    String(ev.evidence_status)!=="MATCH"||
    String(ev.runtime_session_id).toLowerCase()!==sessionId||
    Number(ev.stage)!==Number(probe.stage)||
    String(ev.icao).toUpperCase()!==String(probe.icao).toUpperCase()||
    ev.duration_censored!==false||
    ev.stop_reason!=null
  ){
    throw new Error("REFUSED:RECONCILIATION_EVIDENCE_SHAPE_INVALID");
  }

  const client=await pool.connect();
  let closedAt:string|null=null;
  try{
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[budgetDay]);

    const locked=await client.query(
      `SELECT status,runtime_session_id,reconciliation_status,duration_censored,stop_reason,
              runtime_cleanup_verified_at_utc
         FROM clean.adb_anchor_probe
        WHERE probe_id=$1 AND probe_budget_day_id=$2
        FOR UPDATE`,
      [probeId,budgetDay],
    );
    const p=locked.rows[0];
    if(
      locked.rowCount!==1||
      String(p.status)!=="settling"||
      String(p.runtime_session_id).toLowerCase()!==sessionId||
      String(p.reconciliation_status)!=="MATCH"||
      p.duration_censored!==false||
      p.stop_reason!=null||
      p.runtime_cleanup_verified_at_utc!=null
    ){
      throw new Error("REFUSED:PROBE_STATE_CHANGED");
    }

    const competing=await client.query(
      `SELECT count(*)::int AS n
         FROM clean.adb_anchor_probe
        WHERE status IN ('probing','settling') AND probe_id<>$1`,
      [probeId],
    );
    if(Number(competing.rows[0]?.n??-1)!==0) throw new Error("REFUSED:OTHER_ACTIVE_OR_SETTLING_PROBE");

    const budget=await client.query(
      `SELECT state,cap_credits FROM clean.adb_probe_budget_day
        WHERE probe_budget_day_id=$1 FOR UPDATE`,
      [budgetDay],
    );
    if(
      budget.rowCount!==1||
      String(budget.rows[0].state)!=="OPEN"||
      Number(budget.rows[0].cap_credits)!==PROBE_BUDGET_DAY_HARD_CAP
    ){
      throw new Error("REFUSED:BUDGET_NOT_EXPECTED_OPEN");
    }

    const exposure=await client.query(
      `SELECT COALESCE(sum(CASE
         WHEN provider_content_safe_mode THEN reserved_credits
         WHEN status='probing' THEN GREATEST(reserved_credits,COALESCE(credits_spent,0),COALESCE(internal_send_credits,0))
         ELSE GREATEST(COALESCE(credits_spent,0),COALESCE(internal_send_credits,0)) END),0)::int AS n
         FROM clean.adb_anchor_probe
        WHERE probe_budget_day_id=$1`,
      [budgetDay],
    );
    const conservativeExposure=Number(exposure.rows[0]?.n??-1);
    if(!Number.isFinite(conservativeExposure)||conservativeExposure<0||conservativeExposure>PROBE_BUDGET_DAY_HARD_CAP){
      throw new Error(`REFUSED:BUDGET_EXPOSURE_INVALID:${conservativeExposure}`);
    }

    const finalized=await client.query(
      `UPDATE clean.adb_anchor_probe
          SET status='completed',runtime_cleanup_verified_at_utc=$3::timestamptz
        WHERE probe_id=$1 AND probe_budget_day_id=$2 AND status='settling'
        RETURNING probe_id`,
      [probeId,budgetDay,new Date(verifiedAt).toISOString()],
    );
    if(finalized.rowCount!==1) throw new Error("REFUSED:FINALIZE_RACE");

    const closed=await client.query(
      `UPDATE clean.adb_probe_budget_day
          SET state='CLOSED',closed_at=now()
        WHERE probe_budget_day_id=$1 AND state='OPEN'
        RETURNING closed_at`,
      [budgetDay],
    );
    if(closed.rowCount!==1) throw new Error("REFUSED:BUDGET_CLOSE_RACE");
    closedAt=new Date(closed.rows[0].closed_at).toISOString();

    await client.query("COMMIT");
  }catch(error){
    await client.query("ROLLBACK").catch(()=>undefined);
    throw error;
  }finally{
    client.release();
  }

  const post=await pool.query(
    `SELECT
       (SELECT status FROM clean.adb_anchor_probe WHERE probe_id=$1) AS probe_status,
       (SELECT runtime_cleanup_verified_at_utc FROM clean.adb_anchor_probe WHERE probe_id=$1) AS cleanup_verified,
       (SELECT state FROM clean.adb_probe_budget_day WHERE probe_budget_day_id=$2) AS budget_state,
       (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) AS open_incidents`,
    [probeId,budgetDay],
  );
  const x=post.rows[0];
  if(
    String(x.probe_status)!=="completed"||
    x.cleanup_verified==null||
    String(x.budget_state)!=="CLOSED"||
    Number(x.open_incidents)!==0
  ){
    throw new Error("FINALIZER_POSTCHECK_FAILED");
  }

  const receipt={
    schema:"v39.phase2g-settling-probe-finalizer.v1",
    status:"PASS_COMPLETED_AND_BUDGET_CLOSED",
    probe_id:probeId,
    session_id:sessionId,
    probe_budget_day_id:budgetDay,
    cleanup_receipt:path.relative(process.cwd(),cleanupFile),
    cleanup_receipt_sha256:cleanupSha,
    cleanup_verified_at_utc:new Date(verifiedAt).toISOString(),
    budget_closed_at_utc:closedAt,
    active_billable_subscriptions:0,
    reconciliation_status:"MATCH",
    provider_mutation:false,
    alert_credits_spent_by_finalizer:0,
    finalized_at_utc:new Date().toISOString(),
  };
  fs.mkdirSync("artifacts",{recursive:true});
  const out=path.join("artifacts",`phase2g-settling-finalizer-probe${probeId}-${Date.now()}.json`);
  fs.writeFileSync(out,JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({
    ...receipt,
    receipt_file:out,
    receipt_file_sha256:sha256File(out),
  },null,2));
}

main().catch((error)=>{
  console.error(JSON.stringify({
    schema:"v39.phase2g-settling-probe-finalizer.v1",
    status:"REFUSED_OR_FAILED",
    provider_mutation:false,
    alert_credits_spent_by_finalizer:0,
    error:error instanceof Error?error.message:String(error),
  },null,2));
  process.exitCode=1;
}).finally(async()=>{
  await pool.end().catch(()=>undefined);
});
