/**
 * Owner-directed narrow Gate 5-R readiness amendment (Nov 2, 2026).
 *
 * Verify the immutable audited November 2 source-only receipt against exact
 * run/cost evidence. THIS is readiness to plan a future PROSPECTIVE collection,
 * not evidence that flight-level population, PRE or POST was observed.
 * Original f.8 runway scientific Gate5 remains HOLD in its own namespace.
 */
export const G5R_SCHEMA_V39=
 "v39.phase4.gate5-revised-operational-collection-readiness.v1" as const;
export const G5R_EXPECTED_WSSS_NOV2_V39={
 manifestSha256:"aa9a9be29cf9778d3fcaef7b7f08a482d6a5307623453515d7022c62da723136",
 horizonRuns:{
  "T-24h":41309044744,
  "T-6h":41402736335,
  "T-90m":41437078179
 },
 auditRunId:41477141869,
 successfulPhysicalFidsGets:9,
 measuredRestApiUnits:18,
 repeatedSourceObservationRows:542
} as const;
export interface G5RHistoricalReceiptV39{
 schema:string;
 evidenceClassification:string;
 sourceOnlyOperationalStatus:string;
 scientificGate5Status:string;
 originalCohortFrozenManifestSha256:string;
 originalGitHubRuns:{
  "T-24h":number;"T-6h":number;"T-90m":number;
 };
 independentAuditRunId:number;
 successfulPhysicalFidsGets:number;
 measuredRestApiUnits:number;
 repeatedSourceObservationRows:number;
 uniquePhysicalOperatingFlightDenominator:number|null;
 verifiedFirstProviderNativeT:string|null;
 persistedFlightSpecificPRE:number|null;
 independentlyMatchedInsideWebhooks:number|null;
 independentlyMatchedOutsideWebhooks:number|null;
 certifiedActualOnlyWheelsOff:boolean|null;
 lawfulSourceRetention:boolean|null;
 retainedOriginalSourceBodies:boolean;
 prospectiveThreeHorizonScientificCohortCompleted:boolean;
 scientificGate5Passed:boolean;
 phase5FreezeAuthorized:boolean;
 phase6Authorized:boolean;
 nextCohortActivationAuthorized:boolean;
 noFurtherNovember2PaidRerunRequired:boolean;
}
export type G5RReportV39={
 schema:typeof G5R_SCHEMA_V39;
 reviewedHistoricalCohort:"WSSS_2026_11_02_SOURCE_ONLY";
 versionedScope:"PROSPECTIVE_PROVIDER_OBSERVABLE_DISRUPTION";
 evidenceClass:"HISTORICAL_GITHUB_LOGS_RECONCILED_NOT_PROVIDER_WIRE";
 status:"GATE5_REVISED_COLLECTION_READINESS_PASS";
 sourceOriginalPaidGets:9;sourceMeasuredRestApiUnits:18;
 historicalDataIsNotFlightLevel:true;
 independentHistoricalGitHubRunReceiptReviewed:true;
 oldStrictActualRunwayScientificGate5Passed:false;
 verifiedUniquePhysicalFlightPopulation:null;
 historicalPersistedPRE:null;
 historicalInsideOutsideWebhookRatio:null;
 observedActualWheelsOff:null;
 verifiedLongTermContentStorageRights:null;
 sourceOnlyObservationsAreNotIndependentFlights:true;
 alternativePrimaryTargets:[
  "PROVIDER_REPORTED_TERMINAL_STATUS",
  "PROVIDER_REPORTED_SCHEDULE_VERSION_CHANGE_15_MIN"
 ];
 optionalReferenceSources:[
  "ADSB_LOL_AIR_GROUND_PROXY_ODBL",
  "BTS_US_DOMESTIC_DELAYED_REFERENCE",
  "NOAA_METAR_TAF_AS_OF_WEATHER"
 ];
 phase5PlanningMayProceed:true;
 phase5FreezeAuthorized:false;
 phase6LiveCollectionAuthorized:false;
 firstDayProspectiveFlightLevelAuditRequired:true;
 noProviderApiCalls:true;noDatabaseWrites:true;
};
function fail(code:string):never{
 throw Error("G5R_EXPEDITED_HISTORICAL_EVIDENCE_"+code+"_HOLD");
}
/**
 * A CI-reviewed record is a transparent but limited subset of the evidence;
 * the independent GH job receipts cited in the versioned amendment are
 * required human-reviewed context. Inserting caller booleans cannot make
 * actual-only wheels-off or a lawful retention licence appear.
 */
export function assessG5RExpeditedSourceReadinessV39(
 record:G5RHistoricalReceiptV39
):G5RReportV39{
 if(!record||typeof record!=="object")fail("MISSING");
 const expected=G5R_EXPECTED_WSSS_NOV2_V39;
 if(record.schema!=="v39.phase4.gate5-20261102-bounded-evidence-closeout.v1"||
    record.evidenceClassification!==
     "REVIEWED_GITHUB_LOG_SUMMARY_NOT_RAW_PROVIDER_CERTIFICATION"||
    record.sourceOnlyOperationalStatus!=="COMPLETE_NINE_OF_NINE"||
    record.scientificGate5Status!==
     "HOLD_UNMEASURABLE_PHYSICAL_T_PRE_POST_AND_RIGHTS"||
    record.originalCohortFrozenManifestSha256!==expected.manifestSha256)
   fail("SOURCE_CLASSIFICATION_OR_SHA");
 const runs=record.originalGitHubRuns;
 if(!runs||Object.keys(runs).sort().join("|")!==
    ["T-24h","T-6h","T-90m"].sort().join("|")||
    Object.entries(expected.horizonRuns).some(
      ([k,v])=>runs[k as keyof typeof runs]!==v)||
    new Set(Object.values(runs)).size!==3||
    record.independentAuditRunId!==expected.auditRunId)
   fail("GITHUB_HORIZON_OR_AUDIT");
 if(record.successfulPhysicalFidsGets!==expected.successfulPhysicalFidsGets||
    record.measuredRestApiUnits!==expected.measuredRestApiUnits||
    record.repeatedSourceObservationRows!==expected.repeatedSourceObservationRows||
    record.noFurtherNovember2PaidRerunRequired!==true)
   fail("QUANTIFIED_SOURCE_RECEIPTS");
 for(const k of [
  "uniquePhysicalOperatingFlightDenominator","verifiedFirstProviderNativeT",
  "persistedFlightSpecificPRE","independentlyMatchedInsideWebhooks",
  "independentlyMatchedOutsideWebhooks","certifiedActualOnlyWheelsOff",
  "lawfulSourceRetention"] as const){
   if(record[k]!==null)fail("UNSUPPORTED_FLIGHT_CLAIM_"+k);
 }
 if(record.retainedOriginalSourceBodies!==false||
    record.prospectiveThreeHorizonScientificCohortCompleted!==false||
    record.scientificGate5Passed!==false||
    record.phase5FreezeAuthorized!==false||
    record.phase6Authorized!==false||
    record.nextCohortActivationAuthorized!==false)
   fail("UNSUPPORTED_LIVE_SCIENCE_OR_RETENTION_PROMOTION");
 return {
  schema:G5R_SCHEMA_V39,
  reviewedHistoricalCohort:"WSSS_2026_11_02_SOURCE_ONLY",
  versionedScope:"PROSPECTIVE_PROVIDER_OBSERVABLE_DISRUPTION",
  evidenceClass:"HISTORICAL_GITHUB_LOGS_RECONCILED_NOT_PROVIDER_WIRE",
  status:"GATE5_REVISED_COLLECTION_READINESS_PASS",
  sourceOriginalPaidGets:9,sourceMeasuredRestApiUnits:18,
  historicalDataIsNotFlightLevel:true,
  independentHistoricalGitHubRunReceiptReviewed:true,
  oldStrictActualRunwayScientificGate5Passed:false,
  verifiedUniquePhysicalFlightPopulation:null,historicalPersistedPRE:null,
  historicalInsideOutsideWebhookRatio:null,
  observedActualWheelsOff:null,verifiedLongTermContentStorageRights:null,
  sourceOnlyObservationsAreNotIndependentFlights:true,
  alternativePrimaryTargets:[
   "PROVIDER_REPORTED_TERMINAL_STATUS",
   "PROVIDER_REPORTED_SCHEDULE_VERSION_CHANGE_15_MIN"
  ],
  optionalReferenceSources:[
   "ADSB_LOL_AIR_GROUND_PROXY_ODBL",
   "BTS_US_DOMESTIC_DELAYED_REFERENCE",
   "NOAA_METAR_TAF_AS_OF_WEATHER"
  ],
  phase5PlanningMayProceed:true,phase5FreezeAuthorized:false,
  phase6LiveCollectionAuthorized:false,
  firstDayProspectiveFlightLevelAuditRequired:true,
  noProviderApiCalls:true,noDatabaseWrites:true
 };
}
