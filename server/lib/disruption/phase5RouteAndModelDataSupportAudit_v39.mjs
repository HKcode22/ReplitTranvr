/**
 * Phase5 future-PRE data sufficiency metadata scorecard.
 * PURE, OFFLINE, NON-AUTHORIZING: no PostgreSQL, provider, ML, or file I/O.
 *
 * Deliberately accepts only aggregated TRAIN/VALIDATION run days 1..25,
 * never protected TEST 26..31; it cannot query test outcomes or tune using
 * them. It does not claim a complete/legally usable dataset.
 *
 * Observational statuses, counts and source identities must come from an
 * independently audited read-only Phase6 metadata producer later.
 */
export const ROUTE_AUDIT_SCHEMA="phase5.route-readiness-train-validation-metadata.v1";
export const ROUTE_AUDIT_FRAME_HASH=
 "02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94";
const SHA=/^[a-f0-9]{64}$/;
const fail=code=>{throw new Error("HOLD_P5_ROUTE_SUFFICIENCY_METADATA_"+code);};
const nonnegative=(v,label)=>{
 if(!Number.isSafeInteger(v)||v<0)fail("INVALID_NONNEGATIVE_"+label);
 return v;
};
const counters=[
 "qualifiedScheduledLegs","durableSourceBoundLegs",
 "validPreT24","validPreT6","validPreT90",
 "labelsObserved","labelsCensored","labelsPending",
 "observedDelayOver15","observedDelayOver60","observedDelayOver120",
 "preT6AndObservedLabel","missingTail",
 "unknownRouteLegs","unknownRouteObservedLabels",
 "physicalRestUnits","physicalAlertCredits"
];
function validateDay(d){
 if(!d||typeof d!=="object"||Array.isArray(d))fail("DAY_NOT_OBJECT");
 if(!Number.isSafeInteger(d.runDayIndex)||d.runDayIndex<1||d.runDayIndex>25)
  fail("PROTECTED_TEST_OR_INVALID_RUN_DAY");
 for(const k of counters)nonnegative(d[k],k);
 const n=d.qualifiedScheduledLegs;
 if(d.durableSourceBoundLegs>n||d.validPreT24>d.durableSourceBoundLegs||
  d.validPreT6>d.durableSourceBoundLegs||
  d.validPreT90>d.durableSourceBoundLegs)
  fail("PRE_EXCEEDS_DURABLE_SOURCE_OR_POPULATION");
 if(d.labelsObserved+d.labelsCensored+d.labelsPending!==n)
  fail("LABEL_FUNNEL_DOES_NOT_RECONCILE");
 if(d.observedDelayOver120>d.observedDelayOver60||
    d.observedDelayOver60>d.observedDelayOver15||
    d.observedDelayOver15>d.labelsObserved)
  fail("INVALID_SEVERE_DELAY_DENOMINATOR");
 if(d.preT6AndObservedLabel>Math.min(d.validPreT6,d.labelsObserved)||
    d.unknownRouteLegs>n||d.unknownRouteObservedLabels>d.unknownRouteLegs||
    d.unknownRouteObservedLabels>d.labelsObserved||d.missingTail>n)
  fail("INVALID_USABLE_ROW_OR_MISSINGNESS_COUNT");
 if(!Array.isArray(d.directedRouteGroups))fail("MISSING_DIRECTED_ROUTE_GROUPS");
 const seen=new Set();let routeRows=0,routeLabels=0;
 for(const g of d.directedRouteGroups){
  if(!g||!SHA.test(g.routeKeySha256??"")||
     seen.has(g.routeKeySha256))
   fail("MISSING_DUPLICATE_OR_NONHASHED_ROUTE_KEY");
  seen.add(g.routeKeySha256);
  nonnegative(g.qualifiedLegCount,"route.qualifiedLegCount");
  nonnegative(g.observedLabelCount,"route.observedLabelCount");
  if(g.qualifiedLegCount<1||g.observedLabelCount>g.qualifiedLegCount)
   fail("INVALID_ROUTE_GROUP_COUNTS");
  routeRows+=g.qualifiedLegCount;
  routeLabels+=g.observedLabelCount;
 }
 if(routeRows+d.unknownRouteLegs!==n)
  fail("DIRECTED_ROUTE_DENOMINATOR_MISMATCH");
 if(routeLabels+d.unknownRouteObservedLabels!==d.labelsObserved)
  fail("ROUTE_OBSERVED_LABELS_MISMATCH");
}
/**
 * Descriptive pre-model coverage only: no accuracy estimate, arbitrary
 * universal minimum label threshold, or scientific release permission.
 * Future producer must prove canonical directed origin->destination hashes.
 */
export function auditP5RouteAndModelDataSupport(input){
 if(!input||input.schema!==ROUTE_AUDIT_SCHEMA||
    input.frameHash!==ROUTE_AUDIT_FRAME_HASH)
  fail("SCHEMA_OR_FRAME_NOT_VERIFIED");
 if(input.sourceClass!=="RESTRICTED_AUDITED_TRAIN_VALIDATION_AGGREGATES")
  fail("NO_INDEPENDENT_METADATA_PROVENANCE");
 if(input.protectedTestOutcomesIncluded!==false)
  fail("PROTECTED_TEST_OUTCOMES_MUST_NOT_BE_READ");
 if(!Array.isArray(input.days)||input.days.length>25)
  fail("INVALID_DAY_LIST");
 const sorted=[...input.days].sort((a,b)=>a.runDayIndex-b.runDayIndex);
 const seenDays=new Set(),routes=new Map(),totals=Object.fromEntries(
  counters.map(k=>[k,0])
 );
 let trainDayBlocks=0,validationDayBlocks=0;
 for(const d of sorted){
  validateDay(d);
  if(seenDays.has(d.runDayIndex))fail("DUPLICATE_BATCH_DAY");
  seenDays.add(d.runDayIndex);
  if(d.runDayIndex<=20)trainDayBlocks++;
  else validationDayBlocks++;
  for(const k of counters)totals[k]+=d[k];
  for(const g of d.directedRouteGroups){
   const v=routes.get(g.routeKeySha256)??{
    observedIndependentDays:0,qualifiedLegs:0,observedTargets:0
   };
   v.observedIndependentDays++;
   v.qualifiedLegs+=g.qualifiedLegCount;
   v.observedTargets+=g.observedLabelCount;
   routes.set(g.routeKeySha256,v);
  }
 }
 const values=[...routes.values()];
 const routeLegs=values.reduce((s,x)=>s+x.qualifiedLegs,0);
 const recurring=values.filter(x=>x.observedIndependentDays>=2);
 const withLabels=values.filter(x=>x.observedTargets>0);
 const share=(a,b)=>b? a/b : null;
 return {
  schema:"phase5.route-and-model-sufficiency-audit.v1",
  status:input.days.length===0?"NO_PROSPECTIVE_TRAIN_VALIDATION_DATA_YET":
   totals.preT6AndObservedLabel===0?"NO_CUTOFF_VALID_T6_AND_OBSERVED_LABEL_JOINT_ROWS":
    "TRAIN_VALIDATION_ROUTE_COVERAGE_DESCRIPTIVE_ONLY",
  frameHash:ROUTE_AUDIT_FRAME_HASH,
  sourceProvenanceClass:"RESTRICTED_AUDITED_TRAIN_VALIDATION_AGGREGATES",
  independentBatchDayBlocks:input.days.length,
  trainDayBlocks,validationDayBlocks,
  protectedTestDayOutcomesRead:0,
  denominators:{
   providerObservableScheduledOperatingLegs:totals.qualifiedScheduledLegs,
   durableSourceBoundLegs:totals.durableSourceBoundLegs,
   cutoffValidPreT24:totals.validPreT24,
   cutoffValidPreT6:totals.validPreT6,
   cutoffValidPreT90:totals.validPreT90,
   observedPrimaryTarget:totals.labelsObserved,
   censoredPrimaryTarget:totals.labelsCensored,
   pendingOrUnknownPrimaryTarget:totals.labelsPending,
   usableJointT6PreAndObservedTarget:totals.preT6AndObservedLabel
  },
  delayObservedEvents:{
   over15Minutes:totals.observedDelayOver15,
   over60Minutes:totals.observedDelayOver60,
   over120Minutes:totals.observedDelayOver120
  },
  routeCoverage:{
   distinctDirectedRoutes:routes.size,
   routesSeenOnMultipleIndependentBatchDays:recurring.length,
   directedRoutesWithObservedPrimaryTarget:withLabels.length,
   sourceQualifiedLegsWithKnownRoute:routeLegs,
   missingDirectedRouteLegs:totals.unknownRouteLegs,
   knownRouteShareOfPopulation:share(routeLegs,totals.qualifiedScheduledLegs),
   maxSingleRouteLegShare:share(
    values.reduce((max,x)=>Math.max(max,x.qualifiedLegs),0),
    totals.qualifiedScheduledLegs
   )
  },
  missingness:{
   missingTailLegs:totals.missingTail,
   missingTailFraction:share(totals.missingTail,totals.qualifiedScheduledLegs),
   primaryLabelObservedFraction:share(
    totals.labelsObserved,totals.qualifiedScheduledLegs
   ),
   t6PreObservedFraction:share(totals.validPreT6,totals.qualifiedScheduledLegs),
   usableJointT6AndLabelFraction:share(
    totals.preT6AndObservedLabel,totals.qualifiedScheduledLegs
   )
  },
  physicalSpendObserved:{
   RESTApiUnits:totals.physicalRestUnits,
   alertCredits:totals.physicalAlertCredits
  },
  inferentialConstraints:{
   fourOwnerHubsArePurposivelySelected:true,
   numericalSampleSizeTargetProved:false,
   primaryTargetConstructibilityCertified:false,
   targetClassBalanceAdequate:false,
   routeHoldoutEngineRSupportCertified:false,
   trainValidationOutcomeBasedCollectionChangesPermitted:false,
   protectedEngineATestDays:[26,27,28,29,30,31],
   modelFittedOrEvaluated:false,
   generalizationOutsideProviderFrameClaimed:false,
   phase5ScientificFreeze:false,
   phase6PaidGo:false
  }
 };
}
