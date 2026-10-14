/**
 * Actual Phase2G early-pilot evidence refresh. No writes or Alert spend.
 * Five exact durable probe records and YSSY refs/incident31 only.
 * A clean fieldwork result is NOT official Gate2 PASS or paid authority.
 */
import "dotenv/config";
import {v39Pool as pool} from "../server/lib/disruption/db_v39.ts";
import {listSubscriptionsStrict}
  from "../server/lib/disruption/aerodataboxLimiter_v3.ts";
import {evaluatePhase2gEarlyPilotCloseoutV39,
 type PilotProbeV39} from "../server/lib/disruption/phase2gEarlyPilotCloseout_v39.ts";

const expected: Array<[number,PilotProbeV39["icao"]]> =
  [[11,"WSSS"],[12,"OMAA"],[14,"MMUN"],[15,"SKBO"],[19,"YSSY"]];
async function main():Promise<void>{
  if(process.argv.slice(2).join(" ")!=="--read-only")
    throw Error("PHASE2G_CLOSEOUT_REQUIRES_EXACT_READ_ONLY_FLAG");
  const c=await pool.connect();
  let probes:PilotProbeV39[]=[];
  let incident31Resolved=false;
  let refs=0,liveRefs=0,refsWithSha=0,retainedBytes=0;
  try{
    await c.query("BEGIN TRANSACTION READ ONLY");
    await c.query("SET LOCAL statement_timeout='10000ms'");
    const q=await c.query(
      `SELECT probe_id,icao,status,reconciliation_status,
              metric_contract_version,rows_per_hour,duration_censored,
              window_start,window_end
         FROM clean.adb_anchor_probe
        WHERE probe_id=ANY($1::bigint[]) ORDER BY probe_id`,
      [expected.map(x=>x[0])]);
    if(q.rowCount!==5)throw Error("PHASE2G_FIVE_PROBE_ROWS_NOT_EXACT");
    const re=await c.query(
      `SELECT probe_id,external_spend_credits,internal_received_credits,delivery_gap_credits
         FROM clean.adb_probe_reconciliation_evidence
        WHERE probe_id=ANY($1::bigint[])`,
      [expected.map(x=>x[0])]);
    const byProbe=new Map(re.rows.map(x=>[Number(x.probe_id),x]));
    for(let i=0;i<expected.length;i++){
      const qrow=q.rows[i];
      if(Number(qrow.probe_id)!==expected[i][0]||String(qrow.icao)!==expected[i][1])
        throw Error("PHASE2G_FROZEN_PROBE_IDENTITY_CHANGED");
      const r=byProbe.get(Number(qrow.probe_id));
      if(!r)throw Error("PHASE2G_RECONCILIATION_EVIDENCE_NOT_PRESENT");
      const start=new Date(qrow.window_start).getTime();
      const stop=new Date(qrow.window_end).getTime();
      if(!Number.isFinite(start)||!Number.isFinite(stop)||stop<start)
        throw Error("PHASE2G_INVALID_EXPOSURE_CLOCK");
      const gap=Number(r.delivery_gap_credits);
      if(expected[i][1]==="YSSY" &&
         (Number(r.external_spend_credits)!==231 ||
          Number(r.internal_received_credits)!==229 ||gap!==2))
        throw Error("PHASE2G_YSSY_HISTORIC_RECONCILIATION_CHANGED");
      probes.push({
        probeId:Number(qrow.probe_id),icao:expected[i][1],
        metricContract:String(qrow.metric_contract_version),
        status:String(qrow.status),reconciliation:String(qrow.reconciliation_status),
        durationCensored:qrow.duration_censored===true,
        observedSeconds:(stop-start)/1000,
        officialRowsPerHour:qrow.rows_per_hour===null?null:Number(qrow.rows_per_hour),
        deliveryGapCredits:gap,
        verifiedSavedOriginals:expected[i][1]==="YSSY"?true:null,
        researchTier:expected[i][1]==="YSSY"
          ?"B_DEGRADED_OBSERVED_ONLY":"A_VERIFIED_PRIMARY",
      });
    }
    const incident=await c.query(
      `SELECT id,resolved FROM clean.adb_incident_stop WHERE id=31`);
    if(incident.rowCount!==1)
      throw Error("PHASE2G_INCIDENT31_FINGERPRINT_MISSING");
    incident31Resolved=incident.rows[0].resolved===true;
    const refsQ=await c.query(
      `SELECT count(*)::int AS total,
         count(*) FILTER (WHERE deletion_verified_at_utc IS NULL)::int AS live,
         count(content_sha256)::int AS sha,
         COALESCE(sum(content_bytes),0)::bigint AS bytes
       FROM clean.provider_content_blob_ref
       WHERE source_kind='webhook'
         AND source_record_id LIKE $1`,
       ["prepaid:b0077437-edc1-459a-9d63-8c6e6e50c4f2:%"]);
    const row=refsQ.rows[0];
    refs=Number(row.total);liveRefs=Number(row.live);
    refsWithSha=Number(row.sha);retainedBytes=Number(row.bytes);
    if(refs!==58||refsWithSha!==58||retainedBytes!==308832)
      throw Error("PHASE2G_YSSY_58_SOURCE_METADATA_FINGERPRINT_CHANGED");
    await c.query("ROLLBACK");
  }catch(e){
    await c.query("ROLLBACK").catch(()=>{});
    throw e;
  }finally{c.release();}

  // A free control-plane provider LIST only, NEVER GET a paid subscription
  // or create/delete a subscription. Fail closed if unavailable.
  const provider=await listSubscriptionsStrict();
  const activeBillable=provider.filter(s=>
    s.isActive&&s.billingType!=="LifetimeBased").length;
  const disposition=evaluatePhase2gEarlyPilotCloseoutV39(
    probes,{
      activeBillableSubscriptions:activeBillable,
      incident31Resolved,
      rawSourceDispositionCompleted:liveRefs===0,
    }
  );
  console.log(JSON.stringify({
    schema:"v39.phase2g-early-pilot-live-readonly-closeout.v1",
    checked_at_utc:new Date().toISOString(),
    disposition,
    source_refs:{total:refs,live:liveRefs,sha_verified_metadata_refs:refsWithSha,
       bytes_recorded:retainedBytes,
       // Earlier operator separately verified all 58 original objects'
       // actual bytes. This CLI only rechecks retained DB metadata.
       raw_byte_integrity_retested_in_this_call:false},
    current_active_billable_subscriptions:activeBillable,
    incident31Resolved,
    provider_mutations:0,database_mutations:0,object_deletions:0,
    historical_probe_reclassifications:0,paid_stage2_authorized:false,
    paid_gate3_authorized:false,
  },null,2));
  if(disposition.fieldwork!=="COMPLETE")process.exitCode=2;
}
main().catch(async ()=>{
  console.error("PHASE2G_EARLY_PILOT_READONLY_CLOSEOUT_REFUSED_OR_UNAVAILABLE");
  process.exitCode=2;
}).finally(async()=>{await pool.end().catch(()=>{});});
