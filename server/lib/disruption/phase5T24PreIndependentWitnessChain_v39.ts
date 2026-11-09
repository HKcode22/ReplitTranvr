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
import {
 persistP5V0079SingleBoundFlightPre,
 type P5Stage14SingleFlightPrePermit
} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {
 persistP5T24SeparateTransactionWitness,
 type P5Stage17T24WitnessPermit
} from "./phase5T24IndependentPostCommitWitness_v39";

const HOLD=(m:string):never=>{
 throw Error("REFUSED_P5_T24_PRE_WITNESS_CHAIN_"+m);
};
export type P5IndependentT24WitnessReview=
 Omit<P5Stage17T24WitnessPermit,"expectedSnapshotId">;
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

export async function persistP5ReviewedT24PreAndIndependentWitness(
 prePool:Pick<Pool,"connect">,
 witnessPool:Pick<Pool,"connect">,
 pre:P5Stage14SingleFlightPrePermit,
 witness:P5IndependentT24WitnessReview
){
 verifyP5T24PreWitnessCrossReview(pre,witness);
 if(!prePool||typeof prePool.connect!=="function"||
    !witnessPool||typeof witnessPool.connect!=="function"||
    prePool===witnessPool)
  HOLD("MUST_USE_DISTINCT_RESTRICTED_PRE_AND_WITNESS_POOLS");
 // Stage14 itself validates the REAL bound original and physical member,
 // native selected T, due clock, PRE INSERT, durable COMMIT, and postcommit
 // readback under the approved PRE role. No fabricated source or T.
 const saved=await persistP5V0079SingleBoundFlightPre(prePool,pre);
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
 return {
  schema:"v39.phase5.t24-pre-to-independent-witness.v1" as const,
  status:"T24_PRE_AND_SEPARATE_WITNESS_DURABLY_SAVED_NOT_SCIENTIFIC_FREEZE" as const,
  runDayIndex:pre.runDayIndex,
  horizon:"T-24h" as const,
  flightInstanceId:pre.flightInstanceId,
  committedSnapshotId:saved.committedSnapshotId,
  sourcePopulationQueryId:pre.expectedSourcePopulationQueryId,
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
