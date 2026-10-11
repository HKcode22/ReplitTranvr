/**
 * P08: prepaid callback stage-latency diagnostics_channel. No provider
 * payload, subscription id, URL/secret, session ID, SQL text, blob key or
 * cloud credentials. Disabled for logs unless callback-only host OPTS IN.
 * Node channel subscribers may use these measurements during disposable
 * integration and later an approved hosted zero-provider rehearsal.
 *
 * A completed stage is not a provider-observed timely HTTP 2xx, and a raw
 * upload stage is not evidence of independent source admission.
 */
import {channel} from "node:diagnostics_channel";

export const PHASE2G_PREPAID_STAGE_CHANNEL_V39=
  "v39.phase2g-prepaid-stage.v1";
const telemetryChannel=channel(PHASE2G_PREPAID_STAGE_CHANNEL_V39);
export type PrepaidStageV39=
  "db_pool_acquire"|"db_session_lock"|"original_blob_upload_readback"|
  "duplicate_original_blob_readback"|"physical_item_sql"|"final_sql_commit";
const permittedStages=new Set<PrepaidStageV39>([
  "db_pool_acquire","db_session_lock","original_blob_upload_readback",
  "duplicate_original_blob_readback","physical_item_sql",
  "final_sql_commit"
]);
export type PrepaidStageTimingV39=Readonly<{
  schema:"v39.phase2g-prepaid-stage.v1";
  stage:PrepaidStageV39;
  elapsed_ms:number;
  outcome:"completed"|"failed";
  provider_calls:0;
  database_mutations_by_telemetry:0;
  independent_original_source_proven:false;
}>;
export function recordPrepaidStageTimingV39(
  stage:PrepaidStageV39,elapsedMs:number,outcome:"completed"|"failed"
):void{
  if(!permittedStages.has(stage)||!Number.isFinite(elapsedMs)||
    elapsedMs<0||!["completed","failed"].includes(outcome))
    throw Error("PREPAID_STAGE_METRIC_INVALID");
  if(!telemetryChannel.hasSubscribers)return;
  telemetryChannel.publish({
    schema:"v39.phase2g-prepaid-stage.v1",stage,
    elapsed_ms:Math.round(elapsedMs*100)/100,outcome,
    provider_calls:0,database_mutations_by_telemetry:0,
    independent_original_source_proven:false
  } satisfies PrepaidStageTimingV39);
}

/** Measure exactly one asynchronous boundary, including failed stages. */
export async function timePrepaidStageV39<T>(
  stage:PrepaidStageV39,action:()=>Promise<T>
):Promise<T>{
  const started=performance.now();
  let outcome:"completed"|"failed"="failed";
  try{
    const result=await action();
    outcome="completed";
    return result;
  }finally{
    // Diagnostic subscribers must never be allowed to cause a callback 5xx.
    try{recordPrepaidStageTimingV39(stage,performance.now()-started,outcome);}
    catch {/* metrics must not alter provider processing */}
  }
}
