/**
 * Offline-only Phase2G two-durable-system failure matrix.
 *
 * Models the NON-ATOMIC boundary between full-message Queue admission and
 * separately persistent hashed receipt metadata. It does not actually use
 * Cloudflare, Replit, AeroDataBox or any database; no scientific state.
 *
 * A successful test means the risk was DETECTED and classified, not fixed.
 */
export type TwoStoreSequenceV39="queue_then_ledger"|"ledger_then_queue";
export type TwoStoreFailurePointV39=
  "none"|"queue_unavailable"|"ledger_unavailable"|
  "crash_after_first_commit"|"crash_after_both_before_ack"|
  "sender_disconnect"|"queue_expires";
export type TwoStoreResultV39={
  queueAccepted:boolean;
  receiptMetadataCommitted:boolean;
  senderObservedTimely2xx:boolean;
  pendingQueueReplay:boolean;
  orphanMetadataWithoutBytes:boolean;
  upstreamAdmissionProven:boolean;
  scientificContinuityProven:false;
  outcomeCode:string;
  elapsedMs:number;
};
export function modelDualStoreEdgeFailureV39(input:{
  sequence:TwoStoreSequenceV39;
  failure:TwoStoreFailurePointV39;
  queueLatencyMs:number;
  ledgerLatencyMs:number;
  senderDeadlineMs?:number;
  queueRetentionMinutes?:number;
  elapsedToRecoveryMinutes?:number;
}):TwoStoreResultV39{
  const deadline=input.senderDeadlineMs??10_000;
  const retention=input.queueRetentionMinutes??1440;
  const recovery=input.elapsedToRecoveryMinutes??0;
  if(!["queue_then_ledger","ledger_then_queue"].includes(input.sequence)||
     !Number.isFinite(input.queueLatencyMs)||input.queueLatencyMs<0||
     !Number.isFinite(input.ledgerLatencyMs)||input.ledgerLatencyMs<0||
     !Number.isFinite(deadline)||deadline<=0||
     !Number.isFinite(retention)||retention<=0||
     !Number.isFinite(recovery)||recovery<0)
    throw new Error("SOURCE_SIMULATION_CONFIGURATION_INVALID");
  let queue=false,ledger=false,elapsed=0,stopped=false;
  for(const step of input.sequence==="queue_then_ledger"?
    ["queue","ledger"]:["ledger","queue"]){
    if(step==="queue"){
      elapsed+=input.queueLatencyMs;
      if(input.failure==="queue_unavailable"){stopped=true;break;}
      queue=true;
    }else{
      elapsed+=input.ledgerLatencyMs;
      if(input.failure==="ledger_unavailable"){stopped=true;break;}
      ledger=true;
    }
    if(input.failure==="crash_after_first_commit"){stopped=true;break;}
  }
  const expired=queue&&(input.failure==="queue_expires"||recovery>=retention);
  if(expired)queue=false;
  const both=queue&&ledger;
  const interrupted=stopped||
    input.failure==="crash_after_both_before_ack"||
    input.failure==="sender_disconnect";
  const senderAck=both&&!interrupted&&elapsed<=deadline;
  let code:string;
  if(expired)code="SOURCE_QUEUE_EXPIRED";
  else if(queue&&!ledger)code="SOURCE_QUEUE_ONLY_REPLAY_REQUIRED";
  else if(!queue&&ledger)code="SOURCE_METADATA_ONLY_GHOST";
  else if(!queue&&!ledger)code="SOURCE_NOT_ADMITTED";
  else if(input.failure==="crash_after_both_before_ack"||
          input.failure==="sender_disconnect")code="SOURCE_ACK_UNKNOWN_AFTER_DURABLE_COMMIT";
  else if(elapsed>deadline)code="SOURCE_SENDER_DEADLINE_EXCEEDED";
  else code="SOURCE_DUAL_ADMISSION_TIMELY_ACK";
  return {
    queueAccepted:queue,
    receiptMetadataCommitted:ledger,
    senderObservedTimely2xx:senderAck,
    pendingQueueReplay:queue&&!senderAck,
    orphanMetadataWithoutBytes:ledger&&!queue,
    upstreamAdmissionProven:senderAck,
    // Even both infra commits cannot reconstruct lost UNLOGGED science state.
    scientificContinuityProven:false,
    outcomeCode:code,elapsedMs:elapsed
  };
}
