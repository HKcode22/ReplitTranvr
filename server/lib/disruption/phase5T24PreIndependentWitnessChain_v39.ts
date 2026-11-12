/**
 * Phase5 T-24h PRE → V0081 witness, using the ALREADY implemented and
 * tested Stage14 and Stage17 writers, with two strictly different PG roles.
 *
 * This is one approved flight's handoff, NOT a new data collector/role,
 * scheduled GitHub runner, rights signature, paid API, or Phase6 GO.
 * FIRST COMMIT (PRE) and SECOND COMMIT (witness) can never be atomic across
 * transactions; on missing/ambiguous second proof, HOLD with no replay.
 */
import type {Pool} from "pg";
import {digestP5Stage24ReviewedReceipt,
 type P5Stage24ReviewedT24Receipt}
 from "./phase5T24WitnessedLaterHorizonGuard_v39";
import {
 persistP5V0079SingleBoundFlightPre,
 type P5Stage14SingleFlightPrePermit,
 type P5Stage14SingleFlightPreResult
} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {
 persistP5T24SeparateTransactionWitness,
 type P5Stage17T24WitnessPermit,
 type P5Stage17WitnessResult
} from "./phase5T24IndependentPostCommitWitness_v39";

const HOLD=(m:string):never=>{
 throw Error("REFUSED_P5_T24_PRE_WITNESS_CHAIN_"+m);
};
export type P5IndependentT24WitnessReview=
 Omit<P5Stage17T24WitnessPermit,"expectedSnapshotId">;
/** Exactly the ORIGINAL Stage14 writer options; this chain does not
 * implement a second PRE writer or its own queue admission.
 */
export type P5T24Stage14ForwardOptions=
 NonNullable<Parameters<typeof persistP5V0079SingleBoundFlightPre>[2]>;
/**
 * This checks two independently provided protocols agree BEFORE either
 * restricted transaction. It is NOT a legal/native-T authentication and
 * intentionally does not compute, fake or self-sign the review provenance.
 */
export function verifyP5T24PreWitnessCrossReview(
 pre:P5Stage14SingleFlightPrePermit,
 witness:P5IndependentT24WitnessReview
):void{
 if(!pre||!witness||pre.horizon!=="T-24h"||
    (pre.identityEvidenceTier??"PROVIDER_NATIVE_OPERATING_LEG")!==
     "PROVIDER_NATIVE_OPERATING_LEG"||
    pre.externalNativeTPhysicalLegAndSourceUseReviewed!==true)
   HOLD("ONLY_REVIEWED_NATIVE_T24_PERMITTED");
 const cutoff=Date.parse(pre.selectedTNativeUtc)-86_400_000;
 const preVersion=pre.selectedTConfig?.milestone+":"+
  pre.selectedTConfig?.version+":"+
  pre.selectedTConfig?.artifactHash;
 if(!Number.isFinite(cutoff)||
    pre.expectedRestrictedPreWriterRole===witness.expectedWitnessOnlyRole||
    witness.flightInstanceId!==pre.flightInstanceId||
    witness.sourcePopulationQueryId!==pre.expectedSourcePopulationQueryId||
    witness.expectedSourceResponseSha256!==pre.expectedSourceResponseSha256||
    witness.expectedSourceQueryDigestSha256!==pre.queryDigestSha256||
    witness.expectedFrameSha256!==pre.reviewedFrameSha256||
    witness.expectedConfigSha256!==pre.reviewedConfigSha256||
    witness.selectedTNativeUtc!==pre.selectedTNativeUtc||
    witness.expectedT24CutoffUtc!==new Date(cutoff).toISOString()||
    witness.expectedSelectedTVersion!==preVersion)
   HOLD("INDEPENDENT_T24_PRE_AND_WITNESS_SCOPE_DRIFT");
}


/**
 * Produce an unsigned Stage24 receipt candidate only when the actual
 * Stage14 PRE and distinct Stage17 V0081 witness have each committed and
 * been read back before the original T24 cutoff. No source/original body
 * is copied here. SHA-256 integrity is NOT an independent reviewer.
 */
export function draftP5UnsignedStage24ReceiptFromCommittedChain(
 pre:P5Stage14SingleFlightPrePermit,
 review:P5IndependentT24WitnessReview,
 saved:P5Stage14SingleFlightPreResult,
 witness:P5Stage17WitnessResult
){
 verifyP5T24PreWitnessCrossReview(pre,review);
 const native=Date.parse(pre.selectedTNativeUtc);
 const cutoff=native-86_400_000;
 const instant=(v:unknown)=>{
  if(typeof v!=="string"||
     !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)||
     !Number.isFinite(Date.parse(v))||
     new Date(v).toISOString()!==v)
   HOLD("UNVERIFIED_POSTCOMMIT_WITNESS_CLOCK");
  return Date.parse(v as string);
 };
 const preClock=instant(saved?.postCommitDbClockAtUtc),
   witnessedAt=instant(witness?.postPreCommitDbObservedAtUtc),
   readAt=instant(witness?.postWitnessCommitReadbackAtUtc);
 if(!Number.isFinite(native)||
    saved?.status!=="ONE_SOURCE_BOUND_PROSPECTIVE_PRE_SAVED_NOT_SCIENTIFIC_FREEZE"||
    saved.horizon!=="T-24h"||
    saved.preSnapshotsInserted!==1||
    saved.postCommitDatabaseReadbackVerified!==true||
    saved.flightPreCommittedBeforeOwnCutoff!==true||
    saved.boundPopulationQueryId!==pre.expectedSourcePopulationQueryId||
    witness?.schema!=="v39.phase5.stage17.separate-transaction-t24-pre-commit-witness.v1"||
    witness.status!=="T24_PRE_SEPARATE_TRANSACTION_DB_WITNESS_DURABLE_BEFORE_CUTOFF"||
    witness.flightInstanceId!==pre.flightInstanceId||
    witness.snapshotId!==saved.committedSnapshotId||
    witness.frozenT24CutoffUtc!==new Date(cutoff).toISOString()||
    witness.originalT24SnapshotVisibleInSeparateTransaction!==true||
    witness.witnessCommittedAndReadBackBeforeOwnCutoff!==true||
    preClock>=witnessedAt||witnessedAt>readAt||
    witnessedAt<cutoff-180_000||witnessedAt>=cutoff-2000||
    readAt>=cutoff)
  HOLD("CHAIN_DOES_NOT_PROVE_DURABLE_T24_RECEIPT");
 const version=pre.selectedTConfig.milestone+":"+
  pre.selectedTConfig.version+":"+pre.selectedTConfig.artifactHash;
 const unsigned:Omit<P5Stage24ReviewedT24Receipt,"receiptSha256">={
  schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1",
  snapshotId:saved.committedSnapshotId,
  flightInstanceId:pre.flightInstanceId,
  selectedTNativeUtc:pre.selectedTNativeUtc,
  frozenT24CutoffUtc:witness.frozenT24CutoffUtc,
  expectedSelectedTVersion:version,
  t24OriginalFidsSha256:pre.expectedSourceResponseSha256,
  t24SourceQueryDigestSha256:pre.queryDigestSha256,
  t24FrameSha256:pre.reviewedFrameSha256,
  t24ConfigSha256:pre.reviewedConfigSha256,
  witnessDbObservedAtUtc:witness.postPreCommitDbObservedAtUtc,
  stage17PostCommitReadbackAtUtc:witness.postWitnessCommitReadbackAtUtc
 };
 const receipt:P5Stage24ReviewedT24Receipt={
  ...unsigned,receiptSha256:digestP5Stage24ReviewedReceipt(unsigned)
 };
 return {
  schema:"v39.phase5.unsigned-t24-stage24-handoff.v1" as const,
  status:"DURABLE_T24_RECEIPT_CANDIDATE_AWAITING_INDEPENDENT_REVIEW" as const,
  receipt,reviewedByIndependentAuthority:false as const,
  mayLaunchLaterPreAutomatically:false as const,providerCalls:0 as const
 };
}

export async function persistP5ReviewedT24PreAndIndependentWitness(
 prePool:Pick<Pool,"connect">,
 witnessPool:Pick<Pool,"connect">,
 pre:P5Stage14SingleFlightPrePermit,
 witness:P5IndependentT24WitnessReview,
 stage14Options?:P5T24Stage14ForwardOptions
){
 verifyP5T24PreWitnessCrossReview(pre,witness);
 if(!prePool||typeof prePool.connect!=="function"||
    !witnessPool||typeof witnessPool.connect!=="function"||
    prePool===witnessPool)
  HOLD("MUST_USE_DISTINCT_RESTRICTED_PRE_AND_WITNESS_POOLS");
 // Stage14 itself validates the REAL bound original and physical member,
 // native selected T, due clock, PRE INSERT, durable COMMIT, and postcommit
 // readback under the approved PRE role. No fabricated source or T.
 const saved=await persistP5V0079SingleBoundFlightPre(
  prePool,pre,stage14Options);
 if(saved.horizon!=="T-24h"||
    saved.preSnapshotsInserted!==1||
    saved.postCommitDatabaseReadbackVerified!==true||
    saved.boundPopulationQueryId!==pre.expectedSourcePopulationQueryId||
    !/^[1-9][0-9]{0,17}$/.test(saved.committedSnapshotId))
  HOLD("PRE_POSTCOMMIT_SNAPSHOT_ID_NOT_SAFE_NO_REPLAY");
 // This second operation is intrinsically a DIFFERENT transaction on the
 // separately permissioned witness-only role. The real Stage17 function
 // reads the first committed PRE and verifies its immutable source/clock.
 let observed;
 try{
  observed=await persistP5T24SeparateTransactionWitness(witnessPool,{
   ...witness,expectedSnapshotId:saved.committedSnapshotId
  });
 }catch(error){
  // The PRE may be committed even if witness failed or had ambiguous COMMIT.
  // Never blindly replay the two-step operation; independent read-only
  // witness/PRE reconciliation is required.
  const e=new Error(
   "REFUSED_P5_T24_PRE_WITNESS_CHAIN_PRE_COMMITTED_WITNESS_HOLD_AUDIT_NO_REPLAY",
   {cause:error}
  );
  throw e;
 }
 if(observed.snapshotId!==saved.committedSnapshotId||
    observed.flightInstanceId!==pre.flightInstanceId||
    observed.originalT24SnapshotVisibleInSeparateTransaction!==true||
    observed.witnessCommittedAndReadBackBeforeOwnCutoff!==true)
  HOLD("POSTCOMMIT_INDEPENDENT_WITNESS_DID_NOT_MATCH_NO_REPLAY");
 const unsignedStage24ReceiptCandidate=
  draftP5UnsignedStage24ReceiptFromCommittedChain(pre,witness,saved,observed);
 return {
  schema:"v39.phase5.t24-pre-to-independent-witness.v1" as const,
  unsignedStage24ReceiptCandidate,
  status:"T24_PRE_AND_SEPARATE_WITNESS_DURABLY_SAVED_NOT_SCIENTIFIC_FREEZE" as const,
  runDayIndex:pre.runDayIndex,
  horizon:"T-24h" as const,
  flightInstanceId:pre.flightInstanceId,
  committedSnapshotId:saved.committedSnapshotId,
  sourcePopulationQueryId:pre.expectedSourcePopulationQueryId,
  /** Real C+D admission was enforced inside ORIGINAL Stage14 tx when set. */
  registeredV0087TaskFenceUsed:
   !!(stage14Options?.realV0088QueueFenceGh||
      stage14Options?.realV0088QueueFenceCi),
  stage14PostCommitDbClockAtUtc:saved.postCommitDbClockAtUtc,
  preCommittedAndReadBackBeforeCutoff:true as const,
  witnessCommittedAndReadBackBeforeCutoff:true as const,
  postPreCommitDbObservedAtUtc:observed.postPreCommitDbObservedAtUtc,
  postWitnessCommitReadbackAtUtc:observed.postWitnessCommitReadbackAtUtc,
  sourceProviderCalls:0 as const,
  alertCreates:0 as const,
  scientificFlightClassificationCertified:false as const,
  sourceLegalUseIndependentlyCertifiedByThisFunction:false as const,
  phase5ScientificFreezePassed:false as const,
  phase6PaidGo:false as const
 };
}
