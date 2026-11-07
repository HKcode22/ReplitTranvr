/**
 * Stage24 — independent T24 witness gate for a future T6/T90 PRE.
 *
 * Pure mathematical+provenance validation of:
 * (1) a persisted V0081 witness JOINed to its immutable T24 PRE;
 * (2) an externally reviewed Stage17 post-COMMIT readback receipt.
 * We CAN reject a missing/retconned anchor; this module CANNOT independently
 * authenticate a reviewer, a GitHub log, provider rights, a physical flight,
 * or a real DB COMMIT. Caller must bind the receipt to reviewed release data.
 */
import {createHash} from "node:crypto";
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9_.:|-]{5,200}$/;
const POS=/^[1-9][0-9]{0,17}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const deny=(why:string):never=>{throw Error("REFUSED_P5_STAGE24_"+why);};
const at=(v:unknown,name:string)=>{
 const d:Date|null=v instanceof Date?v:
  typeof v==="string"?new Date(v):null;
 if(d===null)deny(name);
 if(!Number.isFinite(d.getTime()))deny(name);
 return d.getTime();
};
const iso=(s:unknown,name:string)=>{
 if(typeof s!=="string")deny(name);
 if(!ISO.test(s)||!Number.isFinite(Date.parse(s))||
   new Date(s).toISOString()!==s)deny(name);
 return Date.parse(s);
};
export interface P5Stage24ReviewedT24Receipt {
 schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1";
 snapshotId:string;
 flightInstanceId:string;
 selectedTNativeUtc:string;
 frozenT24CutoffUtc:string;
 expectedSelectedTVersion:string;
 t24OriginalFidsSha256:string;
 t24SourceQueryDigestSha256:string;
 t24FrameSha256:string;
 t24ConfigSha256:string;
 witnessDbObservedAtUtc:string;
 stage17PostCommitReadbackAtUtc:string;
 /** Digest of these fields in canonical order. MUST be independently reviewed. */
 receiptSha256:string;
}
export interface P5Stage24WitnessExpectation {
 flightInstanceId:string;
 selectedTNativeUtc:string;
 expectedSelectedTVersion:string;
 expectedFrameSha256:string;
 expectedConfigSha256:string;
 cutoffUtc:string;
 horizon:"T-6h"|"T-90m";
}
const versioned=(r:P5Stage24ReviewedT24Receipt)=>[
 r.schema,r.snapshotId,r.flightInstanceId,r.selectedTNativeUtc,
 r.frozenT24CutoffUtc,r.expectedSelectedTVersion,
 r.t24OriginalFidsSha256,r.t24SourceQueryDigestSha256,
 r.t24FrameSha256,r.t24ConfigSha256,r.witnessDbObservedAtUtc,
 r.stage17PostCommitReadbackAtUtc
].join("|");
export function digestP5Stage24ReviewedReceipt(
 receipt:Omit<P5Stage24ReviewedT24Receipt,"receiptSha256">
):string{
 return createHash("sha256").update(versioned(
  receipt as P5Stage24ReviewedT24Receipt)).digest("hex");
}
/** Input row MUST be obtained by actual DB SELECT, not an arbitrary payload. */
export function verifyP5Stage24WitnessedFrozenT(
 witnessRow:Record<string,unknown>,
 r:P5Stage24ReviewedT24Receipt,
 expected:P5Stage24WitnessExpectation
):{snapshotId:string;anchorUtc:string;stage17ReadbackUtc:string}{
 if(!r||r.schema!=="v39.phase5.stage24.externally-reviewed-stage17-receipt.v1"||
   !POS.test(r.snapshotId??"")||!ID.test(r.flightInstanceId??"")||
   ![r.t24OriginalFidsSha256,r.t24SourceQueryDigestSha256,
     r.t24FrameSha256,r.t24ConfigSha256,r.receiptSha256].every(x=>
       typeof x==="string"&&SHA.test(x)))
  deny("MISSING_INDEPENDENT_T24_REVIEW_RECEIPT");
 if(digestP5Stage24ReviewedReceipt(r)!==r.receiptSha256)
  deny("T24_RECEIPT_HASH_DOES_NOT_BIND_EVIDENCE");
 const native=iso(expected?.selectedTNativeUtc,"SELECTED_T_NOT_FROZEN");
 const cutoff=iso(expected?.cutoffUtc,"OWN_HORIZON_CUTOFF_INVALID");
 const t24=native-86400000;
 const requiredOffset=expected.horizon==="T-6h"?
  6*3600_000:expected.horizon==="T-90m"?90*60_000:null;
 if(requiredOffset===null||native-cutoff!==requiredOffset)
  deny("OWN_HORIZON_SHIFT_OR_TYPE_INVALID");
 const witness=iso(r.witnessDbObservedAtUtc,"WITNESS_DB_OBSERVED_TIME_INVALID");
 const readback=iso(r.stage17PostCommitReadbackAtUtc,
   "WITNESS_AFTER_COMMIT_READBACK_TIME_INVALID");
 if(iso(r.selectedTNativeUtc,"REVIEW_NATIVE_T_INVALID")!==native||
    iso(r.frozenT24CutoffUtc,"REVIEW_T24_CUTOFF_INVALID")!==t24||
    r.flightInstanceId!==expected.flightInstanceId||
    r.expectedSelectedTVersion!==expected.expectedSelectedTVersion||
    r.t24FrameSha256!==expected.expectedFrameSha256||
    r.t24ConfigSha256!==expected.expectedConfigSha256)
  deny("REVIEW_T24_NATIVE_ANCHOR_OR_PARTITION_CHANGED");
 if(witness<t24-180000||witness>=t24-2000||
    readback<witness||readback>=t24||
    readback>=cutoff)
  deny("REVIEWED_WITNESS_NOT_DURABLE_BEFORE_T24_CUTOFF");
 if(!witnessRow||String(witnessRow.snapshot_id)!==r.snapshotId||
    witnessRow.flight_instance_id!==r.flightInstanceId||
    witnessRow.selected_t_version!==r.expectedSelectedTVersion||
    witnessRow.fids_response_hash!==r.t24OriginalFidsSha256||
    witnessRow.source_query_digest!==r.t24SourceQueryDigestSha256||
    witnessRow.frame_hash!==r.t24FrameSha256||
    witnessRow.config_hash!==r.t24ConfigSha256||
    witnessRow.source_t24_population_query_id===null||
    witnessRow.source_t24_population_query_id===undefined||
    witnessRow.snapshot_prediction_state!=="PRE_DEPARTURE"||
    witnessRow.snapshot_horizon!=="T-24h"||
    String(witnessRow.snapshot_id)!==String(witnessRow.joined_snapshot_id)||
    at(witnessRow.selected_t_native_utc,"STORED_NATIVE_T")!==native||
    at(witnessRow.t24_cutoff_utc,"STORED_T24_CUTOFF")!==t24||
    at(witnessRow.post_pre_commit_db_observed_at_utc,
      "STORED_WITNESS_DB_TIME")!==witness)
   deny("PERSISTED_T24_WITNESS_ORIGINAL_T_CHANGED");
 return {
  snapshotId:r.snapshotId,anchorUtc:expected.selectedTNativeUtc,
  stage17ReadbackUtc:r.stage17PostCommitReadbackAtUtc
 };
}
