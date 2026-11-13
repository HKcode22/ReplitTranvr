/**
 * Type-only public contract for the PREEXISTING adjacent slot-only UTC
 * budget calculator .mjs. No implementation, provider price changes, source
 * authorizations, database calls, flight identities or signature are added.
 */
export type P5SlotBudgetOtherCategory=
 "FIDS_RETRY_UNIT_BUDGET"|"VALIDATION_UNIT_BUDGET"|
 "OUTCOME_REST_UNIT_BUDGET"|"HISTORY_BOOTSTRAP_UNIT_BUDGET"|
 "DIAGNOSTIC_UNIT_BUDGET";
export interface P5PrelaunchSlotChargeDayInput{
 chargeDayUtc:string;
 dailyRestCeilingUnits:number;
 categories:Record<P5SlotBudgetOtherCategory,number>;
}
export interface P5PrelaunchSlotBudgetDayInput{
 runDayIndex:number;
 startUtc:string;
 utcSlot:string;
 windowShape:"4h"|"2x2h"|"up-to-6h";
 partition:"train"|"validation"|"test";
}
export interface P5PrelaunchSlotBudgetInput{
 schema:"v39.phase5.prelaunch-slot-budget-input.v1";
 manifestSha256:string;calendarSha256:string;
 configSha256:string;frameSha256:string;
 providerRangeEvidenceSha256:string;
 timingEvidenceSha256:string;
 asOfUtc:string;providerMaxRangeMinutes:number;
 refreshEveryMinutes:number;
 physicalGetsPerRefreshUpperBound:number;
 getLeadSeconds:number;apiUnitsPerPhysicalGet:2;
 cycleRestCeilingUnits:number;
 protectedRestFloorUnits:number;
 calendarDays:readonly P5PrelaunchSlotBudgetDayInput[];
 restOtherByUtcDate:readonly P5PrelaunchSlotChargeDayInput[];
}
export interface P5PrelaunchSlotUtcChargeRow{
 chargeDayUtc:string;
 fidsBaseUnits:number;
 fidsSplitUnits:number;
 logicalRefreshSlots:number;
 physicalGetUpperBound:number;
 dailyRestCeilingUnits:number;
 dailyOtherReservedUnits:number;
 categories:Record<
  P5SlotBudgetOtherCategory|"FIDS_BASE_UNITS"|"FIDS_SPLIT_UNITS",number>;
}
export interface P5PrelaunchSlotBudgetEnvelope {
 schema:"v39.phase5.prelaunch-unknown-icao-slot-budget-envelope.v1";
 status:"SLOT_BUDGET_ONLY_CANDIDATE_AIRPORT_IDENTITIES_NOT_FROZEN";
 manifestSha256:string;calendarSha256:string;
 configSha256:string;frameSha256:string;
 providerRangeEvidenceSha256:string;timingEvidenceSha256:string;
 asOfUtc:string;providerMaxRangeMinutes:number;
 refreshEveryMinutes:number;physicalGetsPerRefreshUpperBound:number;
 apiUnitsPerPhysicalGet:2;cycleRestCeilingUnits:number;
 protectedRestFloorUnits:number;
 cycleSourceUnits:number;cycleOtherUnits:number;
 physicalGetsUpperBound:number;sourcePlanningPartitionGroups:number;
 utcCategoryRows:P5PrelaunchSlotUtcChargeRow[];
 prelaunchEnvelopeSha256:string;
 ordinaryAdaptiveAirportDaysUnselected:21;
 actualFlightQueryGridCertified:false;
 actualSourceLicenseCertified:false;
 physicalGetReservations:0;databaseWrites:0;providerCalls:0;
 phase5ScientificFreezePassed:false;phase6PaidGo:false;
}
export function buildP5PrelaunchSlotBudgetEnvelope(
 input:P5PrelaunchSlotBudgetInput
):P5PrelaunchSlotBudgetEnvelope;
