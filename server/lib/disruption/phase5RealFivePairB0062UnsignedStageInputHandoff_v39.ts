/**
 * Phase5/6: join EXISTING corrected real five-pair 31-row calendar DRAFT to
 * EXISTING slot-only physical UTC 7-category REST budget envelope.
 *
 * Produces unsigned REVIEW INPUTS for EXISTING B0062/V0093 stagers, not an
 * externally signed calendar, independently proved source Contents license,
 * guaranteed vendor range, ADB price, approved REST/Alert budget or GO.
 *
 * 21 ordinary airport identities remain NULL. No database/provider/file IO
 * or credentials. Never call the live stager from this module.
 */
import {createHash} from "node:crypto";
import {inspectP5B0062InertCalendarOnlyRows}
 from "./phase5B0062InertCalendarUtcBudgetStage_v39.mjs";
import {buildP5PrelaunchSlotBudgetEnvelope}
 from "./phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";
import type {buildP5ActualFivePairB0062CalendarOnlyDraft}
 from "./phase5RealFivePairB0062CalendarOnlyDraft_v39";

const H=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const ID=/^[A-Za-z0-9_.:-]{6,100}$/;
const fail=(s:string):never=>{
 throw Error("REFUSED_P5_B0062_REAL_CALENDAR_SLOT_REVIEW_HANDOFF_"+s);
};
const digest=(x:unknown)=>createHash("sha256")
 .update(JSON.stringify(x)).digest("hex");
type Draft=ReturnType<typeof buildP5ActualFivePairB0062CalendarOnlyDraft>;
type Rows=Draft["calendarDays"];
type ChargeCategory=
 "FIDS_RETRY_UNIT_BUDGET"|"VALIDATION_UNIT_BUDGET"|
 "OUTCOME_REST_UNIT_BUDGET"|"HISTORY_BOOTSTRAP_UNIT_BUDGET"|
 "DIAGNOSTIC_UNIT_BUDGET";
export interface P5B0062ExternallyClaimedSlotCostInput{
 schema:"v39.phase5.b0062-calendar-slot-review-input.v1";
 /** SHA of exact prior separately reviewed draft bytes, not self-signed here. */
 expectedExternalCalendarDraftJsonSha256:string;
 expectedCalendarRowsSha256:string;
 expectedCorrectedPairSelectionSha256:string;
 manifestSha256:string;calendarSha256:string;
 configSha256:string;frameSha256:string;codeSha40:string;
 phase6AuthorizationId:string;predecessorEvidenceIds:string[];
 alertSafety:Record<string,number>;
 providerRangeEvidenceSha256:string;
 timingEvidenceSha256:string;
 asOfUtc:string;
 providerMaxRangeMinutes:number;
 refreshEveryMinutes:number;
 physicalGetsPerRefreshUpperBound:number;
 getLeadSeconds:number;
 apiUnitsPerPhysicalGet:2;
 cycleRestCeilingUnits:number;
 protectedRestFloorUnits:number;
 restOtherByUtcDate:Array<{
  chargeDayUtc:string;dailyRestCeilingUnits:number;
  categories:Record<ChargeCategory,number>;
 }>;
}
export function assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(
 draft:Draft,external:P5B0062ExternallyClaimedSlotCostInput
){
 if(!draft||draft.schema!==
      "v39.phase5.actual-five-pair-b0062-calendar-only-draft.v1"||
    draft.status!==
     "REAL_FIVE_PAIR_31_DAY_CALENDAR_ROWS_DRAFT_NOT_SIGNED"||
    !external||external.schema!==
      "v39.phase5.b0062-calendar-slot-review-input.v1"||
    ![external.expectedExternalCalendarDraftJsonSha256,
      external.expectedCalendarRowsSha256,
      external.expectedCorrectedPairSelectionSha256,
      external.manifestSha256,external.calendarSha256,
      external.configSha256,external.frameSha256,
      external.providerRangeEvidenceSha256,
      external.timingEvidenceSha256].every(s=>H.test(s??""))||
    !CODE.test(external.codeSha40??"")||
    !ID.test(external.phase6AuthorizationId??"")||
    !Array.isArray(external.predecessorEvidenceIds)||
    external.predecessorEvidenceIds.length<1||
    external.predecessorEvidenceIds.some(s=>!ID.test(s))||
    !Array.isArray(draft.calendarDays)||
    draft.calendarDays.length!==31||
    !Array.isArray(external.restOtherByUtcDate))
  fail("DRAFT_EXTERNAL_SHA_PRICE_OR_INPUT_UNREVIEWED");
 const rows:Rows=draft.calendarDays;
 // A SHA fingerprint is only an exact input binding. No hidden claim that
 // an actor independently approved vendor pricing, calendar or run.
 if(digest(draft)!==
     external.expectedExternalCalendarDraftJsonSha256||
    digest(rows)!==external.expectedCalendarRowsSha256||
    draft.proposedCalendarRowsSha256!==
      external.expectedCalendarRowsSha256||
    draft.actualCorrectedPairSelectionSha256!==
      external.expectedCorrectedPairSelectionSha256||
    draft.actualCorrectedPairSelectionSha256!==
     "f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592"||
    draft.knownPairedParentDays!==10||
    draft.futureOrdinaryParentDaysWithUnknownAirportSelections!==21||
    draft.totalB0062Rows!==31||
    draft.futureOrdinaryAirportsSelected!==0||
    draft.actualIndependentSeedCommitWitnessVerified!==false||
    draft.actual31FrozenCalendarApproved!==false||
    draft.providerApiRangePriceAndRightsVerified!==false||
    draft.actualUtcSevenRestBudgetSigned!==false||
    draft.phase5ScientificFreezePassed!==false||
    draft.phase6PaidGo!==false||
    draft.providerCalls!==0||draft.databaseWrites!==0)
  fail("UNSIGNED_CALENDAR_DRAFT_OR_EXTERNAL_REVIEW_SHA_DRIFT");
 const expectedCore={
  schema:draft.schema,
  actualCorrectedPairSelectionSha256:draft.actualCorrectedPairSelectionSha256,
  proposedShapeEnvelopeSha256:draft.proposedShapeEnvelopeSha256,
  proposedDateMapSha256:draft.proposedDateMapSha256,
  claimedTreatmentAssignmentSha256:draft.claimedTreatmentAssignmentSha256,
  claimedTreatmentCommitmentSha256:draft.claimedTreatmentCommitmentSha256,
  assembledAtUtc:draft.assembledAtUtc,
  calendarDays:rows
 };
 if(digest(expectedCore)!==draft.proposedCalendarDraftSha256)
  fail("DRAFT_ORIGINAL_CORE_HASH_REWRITTEN");
 const validation=inspectP5B0062InertCalendarOnlyRows(rows);
 if(validation.knownPairedAirportDays!==10||
    validation.unknownOrdinaryAirportDays!==21||
    rows.some(d=>d.pairId===null&&d.pairAirportSet!==null))
  fail("EARLY_DRAW_AIRPORT_IDENTITIES_FABRICATED");
 const slotBudgetInput={
  schema:"v39.phase5.prelaunch-slot-budget-input.v1" as const,
  manifestSha256:external.manifestSha256,
  calendarSha256:external.calendarSha256,
  configSha256:external.configSha256,
  frameSha256:external.frameSha256,
  providerRangeEvidenceSha256:external.providerRangeEvidenceSha256,
  timingEvidenceSha256:external.timingEvidenceSha256,
  asOfUtc:external.asOfUtc,
  providerMaxRangeMinutes:external.providerMaxRangeMinutes,
  refreshEveryMinutes:external.refreshEveryMinutes,
  physicalGetsPerRefreshUpperBound:
   external.physicalGetsPerRefreshUpperBound,
  getLeadSeconds:external.getLeadSeconds,
  apiUnitsPerPhysicalGet:external.apiUnitsPerPhysicalGet,
  cycleRestCeilingUnits:external.cycleRestCeilingUnits,
  protectedRestFloorUnits:external.protectedRestFloorUnits,
  calendarDays:rows.map(d=>({
   runDayIndex:d.runDayIndex,startUtc:d.startUtc,
   utcSlot:d.utcSlot,windowShape:d.windowShape,partition:d.partition
  })),
  restOtherByUtcDate:external.restOtherByUtcDate
 };
 // Only the ORIGINAL existing physical UTC category/range cost formula.
 const budget=buildP5PrelaunchSlotBudgetEnvelope(slotBudgetInput);
 if(budget.status!==
      "SLOT_BUDGET_ONLY_CANDIDATE_AIRPORT_IDENTITIES_NOT_FROZEN"||
    budget.ordinaryAdaptiveAirportDaysUnselected!==21||
    budget.providerCalls!==0||budget.databaseWrites!==0||
    budget.physicalGetReservations!==0||budget.phase6PaidGo!==false)
  fail("COST_ENVELOPE_GRANTS_UNREVIEWED_QUERY_OR_PAID_GO");
 const stageInput={
  schema:"v39.phase5.b0062-inert-utc-stage-input.v1" as const,
  manifestSha256:external.manifestSha256,
  calendarSha256:external.calendarSha256,
  configSha256:external.configSha256,
  frameSha256:external.frameSha256,
  codeSha40:external.codeSha40,
  phase6AuthorizationId:external.phase6AuthorizationId,
  phase6StartDateUtc:rows[0].startUtc.slice(0,10),
  predecessorEvidenceIds:external.predecessorEvidenceIds,
  calendarDays:rows,
  // Existing stage input calls these "signed" only when an actual
  // independent reviewer separately approves the canonical input SHA.
  expectedSignedCalendarRowsSha256:digest(rows),
  alertSafety:external.alertSafety,
  slotBudgetInput,
  expectedSignedSlotEnvelopeSha256:budget.prelaunchEnvelopeSha256
 };
 const stageInputSha256=digest(stageInput);
 return{
  schema:"v39.phase5.actual-pair-calendar-slot-budget-unsigned-stage-review.v1" as const,
  status:"REVIEWABLE_B0062_AND_V0093_INPUT_NOT_EXTERNALLY_APPROVED_OR_GO" as const,
  unsignedStageInputSha256:stageInputSha256,
  unsignedStageInput:stageInput,
  slotOnlyBudget:budget,
  sourceDraftSha256:external.expectedExternalCalendarDraftJsonSha256,
  correctedOwnerPairSelectionSha256:draft.actualCorrectedPairSelectionSha256,
  knownPairedAirportDays:10 as const,
  futureOrdinaryAirportDaysUnselected:21 as const,
  realProviderRangeAndPriceIndependentlyAuthenticatedHere:false as const,
  independentCalendarTreatmentSignatureAuthenticatedHere:false as const,
  actualAlertAccountBalanceAndSTOPAuthenticatedHere:false as const,
  existingB0062WriterInvoked:false as const,
  existingV0093BudgetWriterInvoked:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  physicalReservations:0 as const,phase5ScientificFreeze:false as const,
  phase6PaidGo:false as const
 };
}
