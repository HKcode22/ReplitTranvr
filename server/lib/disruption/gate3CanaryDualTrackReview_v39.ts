/**
 * Separate TWO questions that must not be collapsed:
 *   1. Did the original exact-0-gap *instrumentation canary* pass?
 *   2. Can genuinely received data be retained for scoped scientific analysis
 *      under a PREDECLAREd bounded-missingness review policy?
 *
 * A failed original exact-match certification is NOT a declaration that
 * durably received/identity-valid flights have no scientific value. Conversely
 * usable observed rows NEVER prove that paid delivery/accounting/retention is
 * safe or authorize another billable subscription.
 *
 * Provider-free and DB-free; does not mutate historical statuses or source.
 */
import {
  assessGate3CanaryTerminalV39,
  type Gate3TerminalAssessmentInputV39,
  type Gate3TerminalAssessmentV39,
} from "./gate3CanaryTerminalAssessment_v39";
import {
  evaluateObservedDatasetResearchV39,
  type ObservedDatasetEvidenceV39,
  type ProposedResearchToleranceV39,
  type ObservedDatasetReviewV39,
} from "./prospectiveResearchQualification_v39";

export interface Gate3DualTrackReviewInputV39 {
  // For historical Stage1 records such as YSSY P25, this can be null:
  // those runs are NOT the separate small Gate3 instrumentation canary.
  exactCanary?:Gate3TerminalAssessmentInputV39|null;
  observedDataset:ObservedDatasetEvidenceV39;
  // This is an explicit proposed policy parameter, NOT a validated default.
  // A numeric fraction by itself does not certify representativeness.
  proposedResearchTolerance:ProposedResearchToleranceV39;
}
export interface Gate3DualTrackReviewV39 {
  schema:"v39.phase3.dual-instrumentation-research.v1";
  instrumentation:Gate3TerminalAssessmentV39|null;
  scientific:ObservedDatasetReviewV39;
  scientificInterpretation:
    "HISTORICAL_INSTRUMENTATION_NOT_EVALUATED"|
    "EXACT_CANARY_CANDIDATE_ONLY"|
    "EXACT_CANARY_HELD_RESEARCH_EVALUATED_SEPARATELY";
  // Neither outcome is an authorization or proof of a production license.
  prospectiveScientificApprovalVerifiedHere:false;
  observedFlightMissingFractionEstablished:false;
  futurePaidProviderAuthorizationGranted:false;
  providerCalls:0;
  databaseMutations:0;
}
export function reviewGate3InstrumentationAndResearchV39(
  input:Gate3DualTrackReviewInputV39,
):Gate3DualTrackReviewV39 {
  if(!input||typeof input!=="object"||Array.isArray(input)||
     !input.observedDataset||!input.proposedResearchTolerance)
    throw Error("GATE3_DUAL_TRACK_INPUT_INVALID");
  const instrumentation=input.exactCanary==null
    ?null:assessGate3CanaryTerminalV39(input.exactCanary);
  const scientific=evaluateObservedDatasetResearchV39(
    input.observedDataset,input.proposedResearchTolerance,
  );
  return {
    schema:"v39.phase3.dual-instrumentation-research.v1",
    instrumentation,scientific,
    scientificInterpretation:instrumentation===null
      ?"HISTORICAL_INSTRUMENTATION_NOT_EVALUATED"
      :instrumentation.status==="OFFLINE_CANDIDATE"
        ?"EXACT_CANARY_CANDIDATE_ONLY"
        :"EXACT_CANARY_HELD_RESEARCH_EVALUATED_SEPARATELY",
    prospectiveScientificApprovalVerifiedHere:false,
    observedFlightMissingFractionEstablished:false,
    futurePaidProviderAuthorizationGranted:false,
    providerCalls:0,databaseMutations:0,
  };
}
