/**
 * Bridge the EXACT saved four-airport Stage7 snapshot and immutable Stage8
 * selected FIDS source query to the existing GitHub one-GET packet format.
 *
 * This produces an UNSIGNED / UNARMED proposal. The reviewed rights, real
 * Stage9 PREPARED DB row, GitHub SHA, exact raw JSON signature, physical
 * budget, actual V0080 prearm and paid GET are still separate authorities.
 * It performs no database write, external provider call or signing.
 */
import type {P5CommittedDayReadonlyResult}
 from "./phase5CommittedDayGridReadonly_v39";
import type {Stage8DayProposalResult}
 from "./phase5V0079DailyPreparedQueryProposals_v39";
import {verifyPreparedDailyDraw}
 from "./phase5EarlyPreselectionReadback_v39";
import {verifyP5F8ExactSourcePartition,
 type P5SourceSingleQueryPlan}
 from "./phase5ScopedFidsSourceBridge_v39";

const SHA=/^[a-f0-9]{64}$/;
const reject=(why:string):never=>{
 throw Error("REFUSED_P5_PREPARED_TO_ONE_GET_DRAFT_"+why);
};
export interface P5PreparedToGetDraftReview{
 /** Exact independent SHA of the complete signed day source proposal.
  * Verifying it here is integrity only, not legal permission. */
 expectedDayProposalSha256:string;
 expectedCandidateGridSha256:string;
 queryDigestSha256:string;
 expectedManifestSha256:string;
}
export type P5UnapprovedOneGetPlan=Omit<
 P5SourceSingleQueryPlan,
 "day"|"independentlyApprovedSourceAndRetention"|"githubOnlyOwnerApproved"
> & {
 day:Omit<P5SourceSingleQueryPlan["day"],"scheduledStartUtc">&{
  scheduledStartUtc:string
 };
 independentlyApprovedSourceAndRetention:false;
 githubOnlyOwnerApproved:false;
};
export interface P5UnapprovedOneGetCandidate{
 schema:"v39.phase5.prepared-source-query-one-get-draft.v1";
 status:"EXACT_SELECTED_DB_SOURCE_QUERY_AWAITING_INDEPENDENT_PAID_RELEASE";
 expectedStage8ProposalSha256:string;
 selectedQueryDigestSha256:string;
 exactSourceCandidateSha256:string;
 restCategory:"FIDS_BASE_UNITS"|"FIDS_SPLIT_UNITS";
 selectedQueryAlreadyPreparedInProduction:false;
 independentlySignedRawJsonBytes:false;
 sourceContentsAndMlRightsApproved:false;
 phase5ScientificFreezePassed:false;
 phase6PaidGo:false;
 providerCalls:0;
 databaseWrites:0;
 /**
  * Deliberately NOT typed as P5GitHubOneQueryReleaseEnvelope:
  * both legal and owner authorization flags remain FALSE.
  */
 unsignedQueryEnvelope:{
  schema:"v39.phase5.github-source-one-query-template.v2";
  manifestSha256:string;
  queryDigestSha256:string;
  plan:P5UnapprovedOneGetPlan;
 };
}
export function draftP5OneGetFromActualPreparedSource(
 stage7:P5CommittedDayReadonlyResult,
 stage8:Stage8DayProposalResult,
 review:P5PreparedToGetDraftReview
):P5UnapprovedOneGetCandidate{
 if(!stage7||!stage8||!review||
   ![review.expectedDayProposalSha256,review.expectedCandidateGridSha256,
     review.queryDigestSha256,review.expectedManifestSha256].every(x=>
      typeof x==="string"&&SHA.test(x)))
  reject("MISSING_REVIEWED_SAME_DAY_PINS");
 const proof=stage7.committedDayAndDrawProof;
 if(!proof||proof.verifiedInsideSameReadOnlyTransaction!==true||
    !proof.day||!Array.isArray(proof.drawRows)||proof.drawRows.length!==4||
    stage7.restrictedReaderRoleVerified!==true||
    stage7.databaseReadOnlySnapshot!==true||
    stage7.databaseWrites!==0||stage7.providerCalls!==0||
    stage7.phase6Go!==false||
    stage8.schema!=="v39.phase5.stage8.v0079-day-prepared-proposals.v1"||
    stage8.status!=="EXACT_DAY_QUERY_PROPOSALS_NOT_DATABASE_PREPARED_OR_SIGNED"||
    stage8.providerCalls!==0||stage8.databaseWrites!==0||
    stage8.phase6Go!==false)
  reject("NOT_AN_AUTHENTIC_UNRELEASED_DAY_SNAPSHOT");
 const actual=verifyPreparedDailyDraw(proof.day,proof.drawRows);
 const grid=stage7.selectedDayCandidateGrid;
 if(actual.stateHash!==proof.drawStateSha256||
    actual.stateHash!==grid?.committedDrawSha256||
    actual.stateHash!==stage8.earlyDrawSha256||
    grid?.sourceCandidateDigestSha256!==review.expectedCandidateGridSha256||
    stage8.dayProposalSha256!==review.expectedDayProposalSha256||
    stage8.manifestSha256!==review.expectedManifestSha256||
    stage8.runDayIndex!==proof.day.runDayIndex||
    !Array.isArray(grid?.acquisitions)||
    !Array.isArray(stage8.queries)||
    stage8.queries.length!==stage8.sourceQueryCount||
    !Array.isArray(stage8.sourcePartitionPins)||
    stage8.sourcePartitionPins.length!==stage8.sourceQueryCount||
    !stage8.reviewedSegmentedSource)
  reject("DAY_EARLY_DRAW_CANDIDATE_OR_SOURCE_PROPOSAL_CHANGED");
 const query=stage8.queries.filter(q=>
  q.query_digest===review.queryDigestSha256);
 const partitions=stage8.sourcePartitionPins.filter(p=>
  p.queryDigest===review.queryDigestSha256);
 if(query.length!==1||partitions.length!==1)
  reject("NO_EXACT_SINGLE_PREPARED_SOURCE_QUERY_OR_PARTITION");
 const q=query[0],partition=partitions[0];
 const source=grid.acquisitions.filter(a=>a.queryKey===q.query_key);
 if(source.length!==1)
  reject("NO_EXACT_SELECTED_QUERY_IN_SAVED_SOURCE_CANDIDATES");
 const a=source[0],shape=stage8.reviewedSegmentedSource;
 if(q.state!=="PREPARED"||q.github_run_id!=="00000"||
    q.manifest_sha256!==review.expectedManifestSha256||
    q.run_day_index!==proof.day.runDayIndex||
    q.early_draw_sha256!==actual.stateHash||
    q.reviewed_release_sha256?.length!==64||
    q.rights_review_sha256?.length!==64||
    q.provider_contract_sha256?.length!==64||
    q.airport_icao!==a.icao||
    q.slot_id!==a.slot||q.horizon!==a.horizon||
    q.service_window_start_utc!==a.serviceWindowStartUtc||
    q.service_window_end_utc!==a.serviceWindowEndUtc||
    q.planned_dispatch_utc!==a.scheduledRequestUtc||
    q.prediction_cutoff_utc!==a.earliestPlannedCutoffUtc||
    q.planned_charge_utc_date!==a.physicalChargeDayUtc||
    q.api_units_per_attempt!==2||q.max_physical_attempts!==1||
    a.apiUnitsPerAttempt!==2||a.maxAttempts!==1||
    partition.queryKey!==a.queryKey||
    partition.serviceWindowStartUtc!==a.serviceWindowStartUtc||
    partition.serviceWindowEndUtc!==a.serviceWindowEndUtc||
    partition.windowShape!==shape.windowShape||
    partition.reviewedProviderRangeEvidenceSha256!==
      shape.reviewedProviderRangeEvidenceSha256||
    partition.restCategory!==
     (partition.partitionIndex===1?"FIDS_BASE_UNITS":"FIDS_SPLIT_UNITS"))
  reject("PREPARED_QUERY_OR_PARTITION_NOT_SAME_SAVED_SOURCE");
 if(![q.reviewed_release_sha256,q.rights_review_sha256,
    q.provider_contract_sha256,
    shape.reviewedProviderRangeEvidenceSha256].every(x=>SHA.test(x))||
    !Number.isSafeInteger(shape.verifiedProviderMaxRangeMinutes)||
    shape.verifiedProviderMaxRangeMinutes<1||
    shape.verifiedProviderMaxRangeMinutes>360)
  reject("REVIEWED_PROVIDER_RANGE_OR_RIGHTS_PIN_MISSING");
 const sourcePartition={
  schema:"v39.phase5.amendment-c.source-segment-partition.v1" as const,
  windowShape:shape.windowShape,
  segmentIndex:partition.segmentIndex,
  partitionIndex:partition.partitionIndex,
  verifiedProviderMaxRangeMinutes:shape.verifiedProviderMaxRangeMinutes,
  reviewedProviderRangeEvidenceSha256:
   shape.reviewedProviderRangeEvidenceSha256
 };
 const draft:P5SourceSingleQueryPlan={
  acquisition:a,
  sourcePartition,
  day:proof.day,
  savedEarlyDrawRows:proof.drawRows,
  expectedEarlyDrawSha256:actual.stateHash,
  reviewedReleaseSha256:q.reviewed_release_sha256,
  reviewedProviderRightsSha256:q.rights_review_sha256,
  localFrom:q.from_local,
  localTo:q.to_local,
  ianaTimezone:q.airport_iana_timezone,
  providerApiVersion:q.provider_api_version,
  fidsProtocolVersion:q.fids_protocol_version,
  openapiSha256:q.provider_contract_sha256,
  // These temporary booleans exist solely to satisfy the internal shape
  // of the PURE partition validator. NEVER serialize or return as TRUE.
  independentlyApprovedSourceAndRetention:true,
  githubOnlyOwnerApproved:true
 };
 const checked=verifyP5F8ExactSourcePartition(draft);
 if(checked.segmentIndex!==partition.segmentIndex||
    checked.partitionIndex!==partition.partitionIndex||
    checked.restCategory!==
     (partition.restCategory==="FIDS_BASE_UNITS"?"fids_base":"fids_split"))
  reject("FIDS_AMENDMENT_C_RANGE_GEOMETRY_NOT_VERIFIED");
 return {
  schema:"v39.phase5.prepared-source-query-one-get-draft.v1",
  status:"EXACT_SELECTED_DB_SOURCE_QUERY_AWAITING_INDEPENDENT_PAID_RELEASE",
  expectedStage8ProposalSha256:review.expectedDayProposalSha256,
  selectedQueryDigestSha256:q.query_digest,
  exactSourceCandidateSha256:review.expectedCandidateGridSha256,
  restCategory:partition.restCategory,
  selectedQueryAlreadyPreparedInProduction:false,
  independentlySignedRawJsonBytes:false,
  sourceContentsAndMlRightsApproved:false,
  phase5ScientificFreezePassed:false,
  phase6PaidGo:false,
  providerCalls:0,databaseWrites:0,
  unsignedQueryEnvelope:{
   schema:"v39.phase5.github-source-one-query-template.v2",
   manifestSha256:q.manifest_sha256,
   queryDigestSha256:q.query_digest,
   plan:{
    ...draft,day:{
     ...proof.day,
     scheduledStartUtc:proof.day.scheduledStartUtc.toISOString()
    },
    independentlyApprovedSourceAndRetention:false,
    githubOnlyOwnerApproved:false
   }
  }
 };
}
