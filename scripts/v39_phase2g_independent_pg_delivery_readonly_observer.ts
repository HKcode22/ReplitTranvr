/**
 * P06/P15: independent GitHub-owner candidate READ-ONLY PostgreSQL snapshot.
 * This is NOT an HTTP webhook server and CANNOT ingest Aerodatabox callbacks.
 * It observes only records that reached the V3.9 database; do not infer
 * missing provider sender attempts, raw wire authenticity or complete science.
 *
 * No paid provider calls, no Replit GET, no DB writes. CLI disabled unless
 * explicitly invoked with a known session/window and runtime database URL.
 */
import {Pool} from "pg";
import {createHash} from "node:crypto";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const iso=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/;
const arg=(name:string)=>{
  const n=process.argv.indexOf(name);
  return n<0?"":String(process.argv[n+1]??"").trim();
};
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
export function assertReadOnlyPgObservationArgsV39(input:{
  sessionId:string;startUtc:string;endUtc:string;
}):void{
  if(!uuid.test(input.sessionId))throw Error("READONLY_OBSERVER_SESSION_UUID_INVALID");
  if(!iso.test(input.startUtc)||!iso.test(input.endUtc)||
    !Number.isFinite(Date.parse(input.startUtc))||
    Date.parse(input.endUtc)-Date.parse(input.startUtc)!==7_200_000)
    throw Error("READONLY_OBSERVER_FROZEN_120MIN_WINDOW_INVALID");
}
export function summarizeReadOnlyPgObservationsV39(input:{
  sessionRows:number;postmasterStartUtc:string;
  callbackRequestsSeen:number;callbackSuccess2xx:number;
  callbackFailures:number;deliveryRows:number;
  deliveryItemCount:number;deliveryAttemptCostClaims:number;
  perBinNotificationItems:readonly number[];
  perBinDeliveryRows:readonly number[];
}){
  if(input.perBinNotificationItems.length!==8||
    input.perBinDeliveryRows.length!==8||
    [...input.perBinNotificationItems,...input.perBinDeliveryRows,
      input.callbackRequestsSeen,input.callbackSuccess2xx,
      input.callbackFailures,input.deliveryRows,input.deliveryItemCount,
      input.deliveryAttemptCostClaims,input.sessionRows]
      .some(v=>!Number.isSafeInteger(v)||v<0))
    throw Error("READONLY_OBSERVER_INVALID_DB_COUNTERS");
  return {
    schema:"v39.phase2g-readonly-db-independent-observation.v1" as const,
    observationSource:"POSTGRESQL_ONLY_NOT_PROVIDER_SENDER" as const,
    noHttpIngressProvisioned:true as const,
    independentProviderAttemptLedgerPresent:false as const,
    missedProviderFlightItems:null as null,
    missingRate:null as null,
    scientificCompletenessVerified:false as const,
    prospectivePaidSixPlusSixEnabled:false as const,
    ...input
  };
}
async function main():Promise<void>{
  const input={
    sessionId:arg("--session-id").toLowerCase(),
    startUtc:arg("--window-start"),
    endUtc:arg("--window-end")
  };
  assertReadOnlyPgObservationArgsV39(input);
  const url=String(process.env.V39_DATABASE_RUNTIME_URL??"").trim();
  if(!url)throw Error("READONLY_OBSERVER_RUNTIME_DB_URL_REQUIRED");
  const pool=new Pool({connectionString:url,connectionTimeoutMillis:3000,max:1});
  let client:Awaited<ReturnType<typeof pool.connect>>|null=null;
  try{
    client=await pool.connect();
    await client.query("BEGIN TRANSACTION READ ONLY");
    await client.query("SET LOCAL statement_timeout = '5000ms'");
    const life=await client.query(
      "SELECT pg_postmaster_start_time() AS postmaster_start_utc");
    const session=await client.query(`
      SELECT callback_requests_seen,callback_success_2xx,callback_failures
      FROM clean.prepaid_probe_session_runtime WHERE session_id=$1
    `,[input.sessionId]);
    const delivery=await client.query(`
      SELECT count(*)::int AS n,
        COALESCE(sum(notification_items),0)::bigint AS items,
        COALESCE(sum(COALESCE(delivery_attempt_cost_credits,notification_items,0)),0)::bigint AS claimed_cost
      FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1
    `,[input.sessionId]);
    const bins=await client.query(`
      SELECT floor(extract(epoch FROM (received_at_utc-$2::timestamptz))/900)::int AS bin,
        count(*)::int AS deliveries,
        COALESCE(sum(notification_items),0)::bigint AS items
      FROM clean.prepaid_probe_delivery_runtime
      WHERE session_id=$1
        AND received_at_utc >= $2::timestamptz
        AND received_at_utc < $3::timestamptz
      GROUP BY bin
    `,[input.sessionId,input.startUtc,input.endUtc]);
    await client.query("COMMIT");
    const deliveryRows=Array(8).fill(0),itemRows=Array(8).fill(0);
    for(const r of bins.rows){
      const i=Number(r.bin);
      if(!Number.isSafeInteger(i)||i<0||i>=8)
        throw Error("READONLY_OBSERVER_INVALID_BIN");
      deliveryRows[i]=Number(r.deliveries);
      itemRows[i]=Number(r.items);
    }
    const s=session.rows[0];
    const observation=summarizeReadOnlyPgObservationsV39({
      sessionRows:session.rowCount??0,
      postmasterStartUtc:new Date(life.rows[0].postmaster_start_utc).toISOString(),
      callbackRequestsSeen:Number(s?.callback_requests_seen??0),
      callbackSuccess2xx:Number(s?.callback_success_2xx??0),
      callbackFailures:Number(s?.callback_failures??0),
      deliveryRows:Number(delivery.rows[0].n),
      deliveryItemCount:Number(delivery.rows[0].items),
      deliveryAttemptCostClaims:Number(delivery.rows[0].claimed_cost),
      perBinNotificationItems:itemRows,
      perBinDeliveryRows:deliveryRows,
    });
    // No URL, host, password, webhook path, raw body or provider secret.
    process.stdout.write(JSON.stringify({
      ...observation,sessionFingerprint:hash(input.sessionId).slice(0,16),
      frozenWindowStartUtc:input.startUtc,
      frozenWindowEndUtc:input.endUtc,
      recordedAtUtc:new Date().toISOString()
    })+"\n");
  }catch{
    // Never expose a pg/SSL error string which may include host credentials.
    throw Error("READONLY_OBSERVER_DB_UNAVAILABLE_OR_SCHEMA_INCOMPATIBLE");
  }finally{
    client?.release();
    await pool.end().catch(()=>undefined);
  }
}
if(process.argv[1]?.endsWith("v39_phase2g_independent_pg_delivery_readonly_observer.ts"))
  main().catch(e=>{process.stderr.write(String(e?.message??"READONLY_OBSERVER_FAILED")+"\n");process.exitCode=1;});
