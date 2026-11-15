/**
 * Phase5 collection-pipeline assembly, NOT a paid acquisition:
 *
 * SAME saved one-day PostgreSQL source/draw snapshot (Stage7)
 *  -> computed complete source query proposal using the saved records (Stage8)
 *  -> independently reviewed exact proposal/cost/pins
 *  -> existing restricted two-ledger serializable INSERT (Stage9 V0079/V0082).
 *
 * No new source collector, query dispatcher, credits, PRE, POST, schema
 * installer or implicit freeze. In particular, do not compute a source
 * approval SHA here and call it independent: the caller MUST supply an
 * externally reviewed expected proposal SHA produced after the real draw.
 */
import type {Pool} from "pg";
import {
 readCommittedP5DayCandidateGrid,
 type P5CommittedDayReadonlyScope
} from "./phase5CommittedDayGridReadonly_v39";
import {
 planP5Stage8FromCommittedDayReadback,
 type P5Stage8SourceReviewWithoutCopiedDraw
} from "./phase5V0079DailyPreparedQueryProposals_v39";
import {
 commitStage9P5V0082AtomicSegmentedDay,readBackP5Stage9PreparedDayOnce,
 type P5V0082AtomicDayReview
} from "./phase5Stage9V0082AtomicSegmentedDayPrepare_v39";
import {planP6StoredSourceDraftShards} from "./phase6StoredSourceDraftShardPlanner_v39";
const SHA=/^[a-f0-9]{64}$/;
const hold=(m:string):never=>{
 throw Error("REFUSED_P5_SOURCE_DAY_REVIEWED_PIPELINE_"+m);
};
export interface P5ReviewedDaySourcePreparationInput{
 readScope:P5CommittedDayReadonlyScope;
 sourceReview:P5Stage8SourceReviewWithoutCopiedDraw;
 /**
  * The actual prior independent review must supply this *complete* exact
  * Stage9 contract. The proposal is a placeholder only in the TypeScript
  * shape: it is replaced by the genuine same-snapshot Stage8 packet.
  * No permission can be inferred from a caller's boolean or SHA alone.
  */
 stage9Review:Omit<P5V0082AtomicDayReview,"proposal">;
 /** Opt-in for a protected SAME-process publisher handoff. Never stdout. */
 preparePrivateUnsignedSourceDraftShards?:true;
}
export async function prepareP5ReviewedSourceDayFromSavedDraw(
 readOnlyPool:Pick<Pool,"connect">,
 insertOnlyPool:Pick<Pool,"connect">,
 input:P5ReviewedDaySourcePreparationInput
){
 if(!input||!input.readScope||!input.sourceReview||!input.stage9Review||
    ![input.stage9Review.expectedProposalSha256,
      input.stage9Review.expectedSourceCandidateDigestSha256,
      input.stage9Review.expectedManifestSha256,
      input.stage9Review.expectedCalendarSha256,
      input.stage9Review.expectedConfigSha256,
      input.stage9Review.expectedFrameSha256,
      input.stage9Review.expectedProviderContractSha256,
      input.stage9Review.expectedReleaseSha256,
      input.stage9Review.expectedRightsReviewSha256,
      input.stage9Review.reviewed31DaySourceRequestGridSha256,
      input.stage9Review.reviewedCategoryBudgetSha256]
     .every(v=>typeof v==="string"&&SHA.test(v)))
   hold("INCOMPLETE_SEPARATELY_REVIEWED_QUERY_AND_BUDGET");
 if(!readOnlyPool||typeof readOnlyPool.connect!=="function"||
    !insertOnlyPool||typeof insertOnlyPool.connect!=="function")
   hold("MISSING_INDEPENDENT_READ_AND_PREPARE_ROLES");
 const p=input.sourceReview,r=input.readScope,z=input.stage9Review;
 if(r.expectedManifestSha256!==z.expectedManifestSha256||
    r.expectedCalendarSha256!==z.expectedCalendarSha256||
    r.expectedConfigSha256!==z.expectedConfigSha256||
    r.expectedFrameSha256!==z.expectedFrameSha256||
    r.expectedProviderContractSha256!==z.expectedProviderContractSha256||
    p.manifestSha256!==r.expectedManifestSha256||
    p.calendarSha256!==r.expectedCalendarSha256||
    p.configSha256!==r.expectedConfigSha256||
    p.frameSha256!==r.expectedFrameSha256||
    p.providerContractSha256!==r.expectedProviderContractSha256||
    p.reviewedReleaseSha256!==z.expectedReleaseSha256||
    p.rightsReviewSha256!==z.expectedRightsReviewSha256)
  hold("STAGES_7_8_9_SOURCE_CALENDAR_OR_RIGHTS_DRIFT");
 const stage7=await readCommittedP5DayCandidateGrid(readOnlyPool,r);
 const proposal=planP5Stage8FromCommittedDayReadback(stage7,p);
 // Only compare expected hashes from an *external* review packet. Never
 // calculate and substitute approvals in this function.
 if(proposal.dayProposalSha256!==z.expectedProposalSha256||
    stage7.selectedDayCandidateGrid.sourceCandidateDigestSha256!==
      z.expectedSourceCandidateDigestSha256)
  hold("DYNAMIC_DAY_PROPOSAL_NOT_EXTERNALLY_REVIEWED");
 // Validate all draft packets before the atomic commit, so a failing draft
 // constructor cannot masquerade as a failed/uncommitted Stage9 write.
 const drafts=input.preparePrivateUnsignedSourceDraftShards===true?
  planP6StoredSourceDraftShards(stage7,proposal,{
   expectedDayProposalSha256:z.expectedProposalSha256,
   expectedCandidateGridSha256:z.expectedSourceCandidateDigestSha256,
   expectedManifestSha256:z.expectedManifestSha256
  }):undefined;
 const stage9=await commitStage9P5V0082AtomicSegmentedDay(
   insertOnlyPool,{...z,proposal});
 // Never expose an unsigned private publisher handoff without a fresh
 // committed ledger readback. A failure here means COMMIT already returned;
 // the caller must inspect the existing ledger, not replay Stage9.
 const readback=drafts?await readBackP5Stage9PreparedDayOnce(insertOnlyPool,{...z,proposal})
  .catch(()=>hold("STAGE9_COMMITTED_READBACK_HOLD_NO_REPLAY")):undefined;
 const result={
  schema:"v39.phase5.same-snapshot-source-day-to-atomic-prepared.v1" as const,
  status:"REAL_SAVED_FOUR_AIRPORT_DAY_PREPARED_UNARMED" as const,
  runDayIndex:proposal.runDayIndex,
  savedDrawSha256:proposal.earlyDrawSha256,
  sourceCandidateDigestSha256:z.expectedSourceCandidateDigestSha256,
  preparedProposalSha256:proposal.dayProposalSha256,
  preparedQueryRows:stage9.preparedQueryRows,
  preparedPartitionRows:stage9.preparedPartitionRows,
  databaseInserts:stage9.databaseInserts,
  paidSourceAttempts:0 as const,
  frozenCategoryBudgetWritten:false as const,
  phase6PaidGo:false as const,
  sourceOriginalsCollected:0 as const,
  actualPerFlightPreRows:0 as const,
  physicalGetReservations:0 as const,
  providerCalls:0 as const,
  phase5ScientificFreezePassed:false as const,
  phase6PaidGoGrantedByThisFunction:false as const,
  ...(readback?{preparedDayReadback:readback}:{}),
  ...(drafts?{unsignedSourceDraftSummary:{
    queryCount:drafts.queryCount,shardCount:drafts.shardCount,
    alreadyTooCloseAtReadCount:drafts.alreadyTooCloseAtReadCount,
    peakConcurrentDraftShards:drafts.peakConcurrentDraftShards,
    independentlySigned:false as const,publicationProven:false as const
  }}:{})
 };
 // Naked unsigned drafts cannot be serialized into GitHub logs or receipts.
 // A prospective protected caller still needs a fresh independent role,
 // rights/budget/clock verification and exact separately signed packet bytes.
 return Object.defineProperty(result,"privateUnsignedSourceDraftPlan",{
  value:drafts,enumerable:false,writable:false,configurable:false
 }) as typeof result & {readonly privateUnsignedSourceDraftPlan:typeof drafts};
}

/**
 * Resume one already independently verified exact durable daily packet.
 * This is deliberately a nonpaid library port, not the authorization
 * boundary. A protected caller must verify the persisted signature first.
 * A fresh authenticated empty snapshot may enter original Stage9 once.
 * Complete existing ledger is independently verified, not inserted again.
 * Unknown commit propagates; the NEXT invocation must re-read, never
 * retry in this call. Original serializable lock/PK still own races.
 */
export async function resumeP5ReviewedSourceDayPreparation(
 readOnlyPool:Pick<Pool,"connect">,
 insertOnlyPool:Pick<Pool,"connect">,
 input:P5ReviewedDaySourcePreparationInput,
 scope:{authenticatedExactDurableReviewReadbackApproved:true;
  existingPaidDispatchApproved:false;separatePreparationScopeApproved:true}
){
 if(scope?.authenticatedExactDurableReviewReadbackApproved!==true||
    scope.existingPaidDispatchApproved!==false||
    scope.separatePreparationScopeApproved!==true)
  hold("NO_DURABLE_REVIEW_AND_NONPAID_PREPARATION_SCOPE");
 const r=input?.readScope,p=input?.sourceReview,z=input?.stage9Review;
 if(!r||!p||!z)hold("INCOMPLETE_DURABLE_REVIEW");
 const saved=await readCommittedP5DayCandidateGrid(readOnlyPool,r);
 const proposal=planP5Stage8FromCommittedDayReadback(saved,p);
 if(proposal.dayProposalSha256!==z.expectedProposalSha256||
    saved.selectedDayCandidateGrid.sourceCandidateDigestSha256!==z.expectedSourceCandidateDigestSha256)
  hold("DURABLE_REVIEW_PROPOSAL_DRIFT");
 let proof;
 try{
  proof=await readBackP5Stage9PreparedDayOnce(insertOnlyPool,{...z,proposal},
   {distinguishConfirmedEmptyDay:true});
 }catch(e){
  if(!(e instanceof Error)||
     e.message!=="REFUSED_P5_V0082_ATOMIC_DAY_PREPARE_READBACK_CONFIRMED_EMPTY_DAY")
   throw e;
  const inserted=await prepareP5ReviewedSourceDayFromSavedDraw(readOnlyPool,insertOnlyPool,
   {...input,preparePrivateUnsignedSourceDraftShards:true});
  if(!inserted.preparedDayReadback)hold("COMMITTED_READBACK_REQUIRED_NO_REPLAY");
  return Object.freeze({
   status:"INITIAL_EXACT_DAY_PREPARED_AND_READ_BACK" as const,
   runDayIndex:inserted.runDayIndex,
   preparedProposalSha256:inserted.preparedProposalSha256,
   verifiedQueryCount:inserted.preparedDayReadback.verifiedQueryCount,
   verifiedPartitionCount:inserted.preparedDayReadback.verifiedPartitionCount,
   databaseInserts:inserted.databaseInserts,providerCalls:0 as const,
   phase6PaidGo:false as const
  });
 }
 return Object.freeze({
  status:"EXISTING_EXACT_PREPARED_DAY_READBACK_NO_REPLAY" as const,
  runDayIndex:proof.runDayIndex,preparedProposalSha256:proof.sourceProposalSha256,
  verifiedQueryCount:proof.verifiedQueryCount,verifiedPartitionCount:proof.verifiedPartitionCount,
  databaseInserts:0,providerCalls:0 as const,phase6PaidGo:false as const
 });
}
