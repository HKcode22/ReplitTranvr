import {describe,it,expect} from "vitest";
import {modelDualStoreEdgeFailureV39} from "../experiments/phase2g_rehearsal/dual_store_receipt_fault_matrix_v39";
const base={
  sequence:"queue_then_ledger" as const,failure:"none" as const,
  queueLatencyMs:30,ledgerLatencyMs:25
};
describe("P2G24 independently durable first-edge Queue+receipt atomicity stress matrix (NO CLOUD)",()=>{
  it("clean two-system ACK only after both stores, within independent sender timeout",()=>{
    const x=modelDualStoreEdgeFailureV39(base);
    expect(x).toMatchObject({
      queueAccepted:true,receiptMetadataCommitted:true,
      senderObservedTimely2xx:true,upstreamAdmissionProven:true,
      scientificContinuityProven:false,
      outcomeCode:"SOURCE_DUAL_ADMISSION_TIMELY_ACK"
    });
  });
  it("Queue succeeded then SQL ledger unavailable → queued bytes but no sender 2xx",()=>{
    const x=modelDualStoreEdgeFailureV39({...base,failure:"ledger_unavailable"});
    expect(x).toMatchObject({
      queueAccepted:true,receiptMetadataCommitted:false,
      senderObservedTimely2xx:false,pendingQueueReplay:true,
      outcomeCode:"SOURCE_QUEUE_ONLY_REPLAY_REQUIRED"
    });
  });
  it("SQL ledger wrote before Queue unavailable → ghost metadata, zero raw evidence",()=>{
    const x=modelDualStoreEdgeFailureV39({
      ...base,sequence:"ledger_then_queue",failure:"queue_unavailable"
    });
    expect(x).toMatchObject({
      queueAccepted:false,receiptMetadataCommitted:true,
      senderObservedTimely2xx:false,orphanMetadataWithoutBytes:true,
      outcomeCode:"SOURCE_METADATA_ONLY_GHOST"
    });
  });
  it("process crash after first of two commits is never called a durable 2xx",()=>{
    const queueFirst=modelDualStoreEdgeFailureV39({
      ...base,failure:"crash_after_first_commit"
    });
    const ledgerFirst=modelDualStoreEdgeFailureV39({
      ...base,sequence:"ledger_then_queue",failure:"crash_after_first_commit"
    });
    expect(queueFirst.outcomeCode).toBe("SOURCE_QUEUE_ONLY_REPLAY_REQUIRED");
    expect(ledgerFirst.outcomeCode).toBe("SOURCE_METADATA_ONLY_GHOST");
    expect(queueFirst.senderObservedTimely2xx).toBe(false);
    expect(ledgerFirst.senderObservedTimely2xx).toBe(false);
  });
  it("both commits succeeded but process crashed before ACK → sender truth remains UNKNOWN",()=>{
    const r=modelDualStoreEdgeFailureV39({
      ...base,failure:"crash_after_both_before_ack"
    });
    expect(r).toMatchObject({
      queueAccepted:true,receiptMetadataCommitted:true,
      senderObservedTimely2xx:false,
      outcomeCode:"SOURCE_ACK_UNKNOWN_AFTER_DURABLE_COMMIT",
      scientificContinuityProven:false
    });
  });
  it("sender disconnect AFTER two durable commits must not claim upstream 2xx",()=>{
    expect(modelDualStoreEdgeFailureV39({
      ...base,failure:"sender_disconnect"
    }).senderObservedTimely2xx).toBe(false);
  });
  it("two slow durable commits after 10s produce late SQL success, NO timely upstream ACK",()=>{
    const r=modelDualStoreEdgeFailureV39({
      ...base,queueLatencyMs:6000,ledgerLatencyMs:5000
    });
    expect(r).toMatchObject({
      elapsedMs:11000,queueAccepted:true,receiptMetadataCommitted:true,
      senderObservedTimely2xx:false,outcomeCode:"SOURCE_SENDER_DEADLINE_EXCEEDED"
    });
  });
  it("queue expiry at 24h leaves only metadata; 168h downstream raw retention unproven",()=>{
    const r=modelDualStoreEdgeFailureV39({
      ...base,elapsedToRecoveryMinutes:1440
    });
    expect(r).toMatchObject({
      queueAccepted:false,receiptMetadataCommitted:true,
      orphanMetadataWithoutBytes:true,outcomeCode:"SOURCE_QUEUE_EXPIRED",
      scientificContinuityProven:false
    });
  });
  it("neither store admitted when Queue fails first; impossible to replay zero provider retries",()=>{
    const r=modelDualStoreEdgeFailureV39({
      ...base,failure:"queue_unavailable"
    });
    expect(r).toMatchObject({
      queueAccepted:false,receiptMetadataCommitted:false,
      senderObservedTimely2xx:false,outcomeCode:"SOURCE_NOT_ADMITTED"
    });
  });
  it("metadata unavailable FIRST on ledger-first order never claims durable source",()=>{
    const r=modelDualStoreEdgeFailureV39({
      ...base,sequence:"ledger_then_queue",failure:"ledger_unavailable"
    });
    expect(r.upstreamAdmissionProven).toBe(false);
    expect(r.scientificContinuityProven).toBe(false);
  });
});
