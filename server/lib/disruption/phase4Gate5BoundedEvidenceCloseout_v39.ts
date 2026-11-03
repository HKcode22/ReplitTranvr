/**
 * V3.9-f.8 Phase4 Gate5: finite source-only closeout and scientific evidence
 * classification. This DOES NOT reconstruct nonretained flight originals.
 *
 * Nov2 GitHub run/job receipts were independently reviewed by the owner.
 * The literals below pin a human-reviewed *summary*, not external signatures.
 * A green test or checksum must never upgrade a source-availability pilot
 * into verified first T, physical operating legs, durable PRE or runway labels.
 *
 * Entirely offline; no calls, no database, no flight IDs, no timed jobs.
 */
export const P4_G5_FINITE_EVIDENCE_SCHEMA_V39=
 "v39.phase4.gate5-bounded-evidence-closeout.v1" as const;
export const P4_G5_NOV2_FROZEN_SHA256_V39=
 "aa9a9be29cf9778d3fcaef7b7f08a482d6a5307623453515d7022c62da723136" as const;
export const P4_G5_NOV2_AUDIT_RUN_V39=41477141869 as const;
const H=["T-24h","T-6h","T-90m"] as const;
export type P4G5BoundedHorizonV39=typeof H[number];
const RUNS={
 "T-24h":41309044744,
 "T-6h":41402736335,
 "T-90m":41437078179
} as const;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
function at(x:string,label:string){
 if(typeof x!=="string"||!UTC.test(x)||!Number.isFinite(Date.parse(x))||
     new Date(x).toISOString()!==x)
  throw Error("P4_G5_BOUNDED_INVALID_UTC:"+label);
 return Date.parse(x);
}
function count(x:number,max:number,name:string){
 if(!Number.isSafeInteger(x)||x<0||x>max)
  throw Error("P4_G5_BOUNDED_INVALID_COUNT:"+name);
 return x;
}
export interface P4G5FiniteSourceSlotV39{
 horizon:P4G5BoundedHorizonV39;
 queryIndex:0|1|2;
 originalGithubRunId:number;
 observedDepartureRecords:number;
 providerOperatorTaggedObservations:number;
 providerMarketingTaggedObservations:number;
 codeshareUnresolvedObservations:number;
 runwayTimeFieldPresent:number;
 apiUnitsMeasuredFromHeader:number;
 providerRequestAttempts:number;
 rawBodyPersisted:false;
 flightIdsPersisted:false;
}
export interface P4G5FiniteCloseoutV39{
 frozenManifestSha256:string;
 independentGithubAuditRunId:number;
 independentAuditVerdict:string;
 slots:readonly P4G5FiniteSourceSlotV39[];
}
export const P4_G5_NOV2_VERIFIED_SOURCE_SUMMARIES_V39:Readonly<P4G5FiniteCloseoutV39>={
 frozenManifestSha256:P4_G5_NOV2_FROZEN_SHA256_V39,
 independentGithubAuditRunId:P4_G5_NOV2_AUDIT_RUN_V39,
 independentAuditVerdict:"ALL_NINE_LOG_RECEIPTS_CONSISTENT_SOURCE_ONLY",
 slots:[
  ...([0,1,2] as const).map(queryIndex=>({
   horizon:"T-24h" as const,queryIndex,
   originalGithubRunId:RUNS["T-24h"],
   observedDepartureRecords:23,providerOperatorTaggedObservations:7,
   providerMarketingTaggedObservations:0,
   codeshareUnresolvedObservations:16,runwayTimeFieldPresent:0,
   apiUnitsMeasuredFromHeader:2,providerRequestAttempts:1,
   rawBodyPersisted:false as const,flightIdsPersisted:false as const
  })),
  ...([0,1,2] as const).map(queryIndex=>({
   horizon:"T-6h" as const,queryIndex,
   originalGithubRunId:RUNS["T-6h"],
   observedDepartureRecords:79,providerOperatorTaggedObservations:23,
   providerMarketingTaggedObservations:56,
   codeshareUnresolvedObservations:0,runwayTimeFieldPresent:0,
   apiUnitsMeasuredFromHeader:2,providerRequestAttempts:1,
   rawBodyPersisted:false as const,flightIdsPersisted:false as const
  })),
  ...([0,1,2] as const).map(queryIndex=>({
   horizon:"T-90m" as const,queryIndex,
   originalGithubRunId:RUNS["T-90m"],
   observedDepartureRecords:queryIndex===2?78:79,
   providerOperatorTaggedObservations:queryIndex===2?22:23,
   providerMarketingTaggedObservations:56,
   codeshareUnresolvedObservations:0,runwayTimeFieldPresent:0,
   apiUnitsMeasuredFromHeader:2,providerRequestAttempts:1,
   rawBodyPersisted:false as const,flightIdsPersisted:false as const
  }))
 ]
};

export function evaluateP4G5FiniteSourceCloseoutV39(
 data:P4G5FiniteCloseoutV39
){
 if(!data||data.frozenManifestSha256!==P4_G5_NOV2_FROZEN_SHA256_V39||
   data.independentGithubAuditRunId!==P4_G5_NOV2_AUDIT_RUN_V39||
   data.independentAuditVerdict!==
    "ALL_NINE_LOG_RECEIPTS_CONSISTENT_SOURCE_ONLY"||
   !Array.isArray(data.slots)||data.slots.length!==9)
  throw Error("P4_G5_NOV2_UNTRUSTED_AGGREGATE_OR_AUDIT_HOLD");
 const byHorizon=H.map(horizon=>{
  const source=data.slots.filter(s=>s?.horizon===horizon);
  if(source.length!==3)throw Error("P4_G5_NOV2_MISSING_HORIZON_HOLD");
  let summedObservations=0,operatorTagged=0,marketingTagged=0,unknownTagged=0;
  let runwayTimePresent=0;
  const seen=new Set<number>();
  for(const s of source){
   if(![0,1,2].includes(s.queryIndex)||seen.has(s.queryIndex)||
     s.originalGithubRunId!==RUNS[horizon]||
     s.rawBodyPersisted!==false||s.flightIdsPersisted!==false||
     s.providerRequestAttempts!==1||s.apiUnitsMeasuredFromHeader!==2)
    throw Error("P4_G5_NOV2_BAD_OR_DUPLICATED_SLOT_HOLD");
   seen.add(s.queryIndex);
   const n=count(s.observedDepartureRecords,10000,"observations");
   const op=count(s.providerOperatorTaggedObservations,n,"operator");
   const mk=count(s.providerMarketingTaggedObservations,n,"marketing");
   const unk=count(s.codeshareUnresolvedObservations,n,"unknown");
   const rt=count(s.runwayTimeFieldPresent,n,"runway");
   if(op+mk+unk!==n)
    throw Error("P4_G5_NOV2_ROLE_PARTITION_CONTRADICTION_HOLD");
   // Guard against silent alteration of a previously reviewed individual
   // source count, even if totals would otherwise remain mathematically valid.
   const original=P4_G5_NOV2_VERIFIED_SOURCE_SUMMARIES_V39.slots.find(x=>
     x.horizon===horizon&&x.queryIndex===s.queryIndex);
   if(!original||n!==original.observedDepartureRecords||
      op!==original.providerOperatorTaggedObservations||
      mk!==original.providerMarketingTaggedObservations||
      unk!==original.codeshareUnresolvedObservations||
      rt!==original.runwayTimeFieldPresent)
    throw Error("P4_G5_NOV2_SOURCE_LOG_SUMMARY_MUTATED_HOLD");
   summedObservations+=n;operatorTagged+=op;marketingTagged+=mk;
   unknownTagged+=unk;runwayTimePresent+=rt;
  }
  return {
   horizon,successfulPhysicalFidsGets:3,headerMeasuredApiUnits:6,
   repeatedSnapshotObservationRows:summedObservations,
   sourceOperatorTaggedRows:operatorTagged,
   sourceMarketingTaggedRows:marketingTagged,
   unresolvedCodeshareRoleRows:unknownTagged,
   runwayTimeFieldPresentRows:runwayTimePresent,
   uniquePhysicalOperatingFlights:null,
   firstProviderNativeSelectedT:null,
   verifiedFlightSpecificPRE:null,
   actualOnlyWheelsOffLabels:null,
   independentWebhookCapturedFlightCount:null,
   outsideFidsPopulationWebhookCount:null,
   targetApplicablePopulationCount:null,
   exactLabelObservationRate:null
  };
 });
 return {
  schema:P4_G5_FINITE_EVIDENCE_SCHEMA_V39,
  status:"SOURCE_ONLY_OPERATIONAL_DIAGNOSTIC_COMPLETE_SCIENTIFIC_HOLD" as const,
  manifestSha256:P4_G5_NOV2_FROZEN_SHA256_V39,
  originalGithubRunIds:RUNS,
  independentAuditGithubRunId:P4_G5_NOV2_AUDIT_RUN_V39,
  auditProvedGithubLogsConsistent:true as const,
  independentProviderWireTransportSigned:false as const,
  successfulPhysicalFidsGets:9 as const,
  missedOrUnknownPaidSlots:0 as const,
  headerMeasuredApiUnits:18 as const,
  byHorizon,
  repeatedSnapshotsNotIndependentFlights:true as const,
  operatorTagsNotDeduplicatedPhysicalDenominator:true as const,
  noOriginalSourceContentsRetained:true as const,
  nativeSelectedTVerified:false as const,
  perValueActualOnlyWheelsOffVerified:false as const,
  lawfulNormalizedSourceRetentionVerified:false as const,
  fullSourceToSnapshotProspectiveCohortVerified:false as const,
  gate5OperationalDiagnosticClosed:true as const,
  scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,
  paidProviderCallsMadeByThisReport:0 as const,
  databaseWritesMadeByThisReport:0 as const
 };
}

/** Explicit observed time taxonomy; source presence is not actuality. */
export type P4G5TimeEvidenceKindV39=
 "GENERIC_SCHEDULED_TIME"|"GENERIC_REVISED_TIME"|
 "RUNWAY_TIME_ACTUAL_OR_ESTIMATED"|"ADSB_LOL_INFERRED_TAKEOFF_WINDOW"|
 "MISSING_VALUE";
export function classifyP4G5TimeEvidenceV39(kind:P4G5TimeEvidenceKindV39){
 const recognized=[
  "GENERIC_SCHEDULED_TIME","GENERIC_REVISED_TIME",
  "RUNWAY_TIME_ACTUAL_OR_ESTIMATED",
  "ADSB_LOL_INFERRED_TAKEOFF_WINDOW","MISSING_VALUE"
 ];
 if(!recognized.includes(kind))throw Error("P4_G5_UNKNOWN_TIME_EVIDENCE");
 return {
  kind,
  proxyOrUnverified:
   kind==="ADSB_LOL_INFERRED_TAKEOFF_WINDOW"||
   kind==="GENERIC_SCHEDULED_TIME"||
   kind==="GENERIC_REVISED_TIME"||
   kind==="RUNWAY_TIME_ACTUAL_OR_ESTIMATED",
  independentScheduledTEquivalenceVerified:false as const,
  actualOnlyWheelsOffVerified:false as const,
  exactRunwayDelayMinutes:null,
  missingLabelReason:kind==="MISSING_VALUE"?
   "NOT_OBSERVED":"SOURCE_MILESTONE_OR_ACTUALITY_NOT_VERIFIED",
  scientificTargetEligible:false as const
 };
}

/**
 * Non-authorizing retention bound. An existing paid plan / historical quota
 * is not a per-Contents licence. The public 7-day cap is an UPPER bound,
 * not permission to retain data for the full period.
 */
export function planP4G5ConservativeRetentionDeadlineV39(i:{
 sourceAvailableAtUtc:string;requestedAuditAtUtc:string;
 purposeEndsAtUtc:string;projectSelfCapHours:number;
 cacheControlMaxAgeSeconds:number|null;
}){
 if(!i)throw Error("P4_G5_RETENTION_INPUT_HOLD");
 const t=at(i.sourceAvailableAtUtc,"source");
 const audit=at(i.requestedAuditAtUtc,"audit");
 const purpose=at(i.purposeEndsAtUtc,"purpose");
 count(i.projectSelfCapHours,24,"projectSelfCapHours");
 if(i.projectSelfCapHours<1||purpose<=t)throw Error("P4_G5_RETENTION_PURPOSE_HOLD");
 let cacheMax=7*86400;
 if(i.cacheControlMaxAgeSeconds!==null){
  cacheMax=count(i.cacheControlMaxAgeSeconds,7*86400,"cacheSeconds");
  if(cacheMax<=0)throw Error("P4_G5_RETENTION_CACHE_DISABLED");
 }
 const upper=Math.min(
  t+7*86400000,t+i.projectSelfCapHours*3600000,
  t+cacheMax*1000,purpose
 );
 if(upper<=t)throw Error("P4_G5_RETENTION_NO_USABLE_WINDOW");
 return {
  schema:"v39.phase4.gate5-conservative-content-deadline.v1" as const,
  conservativeCandidateDeleteByUtc:new Date(upper).toISOString(),
  requestedAuditWouldStillBeInsideCandidateLimit:audit<upper,
  independentlyVerifiedPurposeAndSubscriptionRights:false as const,
  independentlyVerifiedPerResponseCacheControl:false as const,
  retentionOrNewPaidCollectionAuthorized:false as const,
  automaticProductionPurgeInstalled:false as const,
  normalizedFlightLevelDataDeclaredDerivedWork:false as const,
  phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}
