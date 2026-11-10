import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
 auditP5RouteAndModelDataSupport,ROUTE_AUDIT_SCHEMA,ROUTE_AUDIT_FRAME_HASH,
 auditP5ProposedEMultiTargetCoverage,P5_PROPOSED_E_SUPPORT_SCHEMA
} from "../server/lib/disruption/phase5RouteAndModelDataSupportAudit_v39.mjs";

const key=(route:string)=>createHash("sha256").update(route).digest("hex");
const group=(route:string,n:number,labels:number)=>({
 routeKeySha256:key(route),qualifiedLegCount:n,observedLabelCount:labels
});
function day1(){
 return {
  runDayIndex:1,qualifiedScheduledLegs:10,durableSourceBoundLegs:8,
  validPreT24:6,validPreT6:7,validPreT90:8,
  labelsObserved:5,labelsCensored:2,labelsPending:3,
  observedDelayOver15:2,observedDelayOver60:1,observedDelayOver120:0,
  preT6AndObservedLabel:4,missingTail:3,
  unknownRouteLegs:1,unknownRouteObservedLabels:0,
  physicalRestUnits:30,physicalAlertCredits:10,
  directedRouteGroups:[
   group("WSSS>WMKK",5,3),group("WSSS>RJTT",4,2)
  ]
 };
}
function day2(){
 return {
  runDayIndex:21,qualifiedScheduledLegs:6,durableSourceBoundLegs:5,
  validPreT24:3,validPreT6:4,validPreT90:4,
  labelsObserved:3,labelsCensored:1,labelsPending:2,
  observedDelayOver15:1,observedDelayOver60:0,observedDelayOver120:0,
  preT6AndObservedLabel:2,missingTail:0,
  unknownRouteLegs:0,unknownRouteObservedLabels:0,
  physicalRestUnits:20,physicalAlertCredits:8,
  directedRouteGroups:[group("WSSS>WMKK",4,2),group("OMAA>WSSS",2,1)]
 };
}
function input(days:any[]=[]){
 return {
  schema:ROUTE_AUDIT_SCHEMA,frameHash:ROUTE_AUDIT_FRAME_HASH,
  sourceClass:"RESTRICTED_AUDITED_TRAIN_VALIDATION_AGGREGATES",
  protectedTestOutcomesIncluded:false,days
 };
}
describe("Phase5/6 metadata-only data sufficiency and Engine R route support",()=>{
 it("honestly reports no future flight data rather than inventing enough labels",()=>{
  const r=auditP5RouteAndModelDataSupport(input([]));
  expect(r.status).toBe("NO_PROSPECTIVE_TRAIN_VALIDATION_DATA_YET");
  expect(r.independentBatchDayBlocks).toBe(0);
  expect(r.denominators.usableJointT6PreAndObservedTarget).toBe(0);
  expect(r.missingness.usableJointT6AndLabelFraction).toBeNull();
  expect(r.routeCoverage.distinctDirectedRoutes).toBe(0);
  expect(r.inferentialConstraints.routeHoldoutEngineRSupportCertified).toBe(false);
  expect(r.inferentialConstraints.phase6PaidGo).toBe(false);
 });
 it("measures routes on DISTINCT day blocks, usable PRE+observed target, class and dropout without claiming accuracy",()=>{
  const r=auditP5RouteAndModelDataSupport(input([day2(),day1()]));
  expect(r.status).toBe("TRAIN_VALIDATION_ROUTE_COVERAGE_DESCRIPTIVE_ONLY");
  expect(r.independentBatchDayBlocks).toBe(2);
  expect(r.trainDayBlocks).toBe(1);
  expect(r.validationDayBlocks).toBe(1);
  expect(r.protectedTestDayOutcomesRead).toBe(0);
  expect(r.denominators.providerObservableScheduledOperatingLegs).toBe(16);
  expect(r.denominators.durableSourceBoundLegs).toBe(13);
  expect(r.denominators.cutoffValidPreT6).toBe(11);
  expect(r.denominators.observedPrimaryTarget).toBe(8);
  expect(r.denominators.censoredPrimaryTarget).toBe(3);
  expect(r.denominators.pendingOrUnknownPrimaryTarget).toBe(5);
  expect(r.denominators.usableJointT6PreAndObservedTarget).toBe(6);
  expect(r.routeCoverage.distinctDirectedRoutes).toBe(3);
  expect(r.routeCoverage.routesSeenOnMultipleIndependentBatchDays).toBe(1);
  expect(r.routeCoverage.directedRoutesWithObservedPrimaryTarget).toBe(3);
  expect(r.routeCoverage.sourceQualifiedLegsWithKnownRoute).toBe(15);
  expect(r.routeCoverage.missingDirectedRouteLegs).toBe(1);
  expect(r.routeCoverage.knownRouteShareOfPopulation).toBe(15/16);
  expect(r.delayObservedEvents.over60Minutes).toBe(1);
  expect(r.missingness.missingTailFraction).toBe(3/16);
  expect(r.physicalSpendObserved.RESTApiUnits).toBe(50);
  expect(r.physicalSpendObserved.alertCredits).toBe(18);
  expect(r.inferentialConstraints.primaryTargetConstructibilityCertified).toBe(false);
  expect(r.inferentialConstraints.targetClassBalanceAdequate).toBe(false);
  expect(r.inferentialConstraints.modelFittedOrEvaluated).toBe(false);
  expect(r.inferentialConstraints.phase5ScientificFreeze).toBe(false);
  expect(r.inferentialConstraints.phase6PaidGo).toBe(false);
 });
 it("does not misread no valid observed labels as a negative-flight outcome",()=>{
  const d=day1();
  d.labelsObserved=0;d.labelsCensored=2;d.labelsPending=8;
  d.preT6AndObservedLabel=0;d.observedDelayOver15=0;
  d.observedDelayOver60=0;d.observedDelayOver120=0;
  d.directedRouteGroups[0].observedLabelCount=0;
  d.directedRouteGroups[1].observedLabelCount=0;
  const r=auditP5RouteAndModelDataSupport(input([d]));
  expect(r.status).toBe("NO_CUTOFF_VALID_T6_AND_OBSERVED_LABEL_JOINT_ROWS");
  expect(r.denominators.pendingOrUnknownPrimaryTarget).toBe(8);
  expect(r.denominators.observedPrimaryTarget).toBe(0);
 });
 it("fails shut if TEST day 26..31 outcome metadata leaks before model lock",()=>{
  for(const n of [26,27,28,29,30,31,0,32]){
   const d=day1();d.runDayIndex=n;
   expect(()=>auditP5RouteAndModelDataSupport(input([d])))
    .toThrow(/PROTECTED_TEST_OR_INVALID_RUN_DAY/);
  }
  const d=day1();
  expect(()=>auditP5RouteAndModelDataSupport({
   ...input([d]),protectedTestOutcomesIncluded:true
  })).toThrow(/PROTECTED_TEST_OUTCOMES_MUST_NOT_BE_READ/);
  expect(()=>auditP5RouteAndModelDataSupport({
   ...input([d]),sourceClass:"UNVERIFIED"
  })).toThrow(/NO_INDEPENDENT_METADATA_PROVENANCE/);
  expect(()=>auditP5RouteAndModelDataSupport({
   ...input([d]),frameHash:"f".repeat(64)
  })).toThrow(/SCHEMA_OR_FRAME_NOT_VERIFIED/);
 });
 it("refuses duplicate day, missing source, inconsistent label funnel, missing route and invalid tail",()=>{
  expect(()=>auditP5RouteAndModelDataSupport(input([day1(),day1()])))
   .toThrow(/DUPLICATE_BATCH_DAY/);
  const modifies=[
   [(d:any)=>d.validPreT6=20,"PRE_EXCEEDS_DURABLE_SOURCE"],
   [(d:any)=>d.labelsObserved=8,"LABEL_FUNNEL_DOES_NOT_RECONCILE"],
   [(d:any)=>d.observedDelayOver120=2,"INVALID_SEVERE_DELAY_DENOMINATOR"],
   [(d:any)=>d.preT6AndObservedLabel=6,"INVALID_USABLE_ROW_OR_MISSINGNESS_COUNT"],
   [(d:any)=>d.missingTail=11,"INVALID_USABLE_ROW_OR_MISSINGNESS_COUNT"],
   [(d:any)=>d.unknownRouteLegs=0,"DIRECTED_ROUTE_DENOMINATOR_MISMATCH"],
   [(d:any)=>d.unknownRouteObservedLabels=1,"ROUTE_OBSERVED_LABELS_MISMATCH"],
   [(d:any)=>d.directedRouteGroups[1].routeKeySha256=d.directedRouteGroups[0].routeKeySha256,
    "MISSING_DUPLICATE_OR_NONHASHED_ROUTE_KEY"],
   [(d:any)=>d.physicalRestUnits=-1,"INVALID_NONNEGATIVE"],
  ] as const;
  for(const [change,msg] of modifies){
   const d=day1();change(d);
   expect(()=>auditP5RouteAndModelDataSupport(input([d]))).toThrow(msg);
  }
 });
});

describe("PROPOSED Amendment E coverage extension — no silent first-cycle target change",()=>{
 const group=(endpoint:string,evidenceTier:string,horizon:string,
  sourceEvidenceClass:string,prospectiveEligible:number,observed:number,
  unknown:number,censored:number,pending:number,
  jointValidPreAndObserved:number,actualOnlyQualifiedObserved:number,
  positiveEvents:number|null)=>({
   endpoint,evidenceTier,horizon,sourceEvidenceClass,
   prospectiveEligible,observed,unknown,censored,pending,
   jointValidPreAndObserved,actualOnlyQualifiedObserved,positiveEvents,
   preFeatureAvailabilityAsOfVerified:true,
   postcutoffValuesUsedAsPreFeatures:false
  });
 const native="PROVIDER_NATIVE_OPERATING_LEG",
  conditional="CONDITIONAL_QUERY_FILTERED_SERVICE";
 function proposal(groups:any[]=[],day=1){
  return{
   schema:P5_PROPOSED_E_SUPPORT_SCHEMA,
   frameHash:ROUTE_AUDIT_FRAME_HASH,
   sourceClass:"RESTRICTED_AUDITED_TRAIN_VALIDATION_AGGREGATES",
   protectedTestOutcomesIncluded:false,
   days:[{runDayIndex:day,eligiblePopulationByTier:{
    [native]:10,[conditional]:4
   },endpointGroups:groups}]
  };
 }
 function physical(){
  return group("PHYSICAL_WHEELS_OFF_DELAY_MINUTES",native,"T-6h",
   "INDEPENDENT_ACTUAL_RUNWAY_EVENT",10,3,5,1,1,2,3,null);
 }
 function schedule(){
  return group("PROVIDER_SCHEDULE_REVISION_GE15",conditional,"T-6h",
   "COMPARABLE_PROVIDER_SCHEDULE_VERSIONS",4,3,1,0,0,2,0,1);
 }
 it("keeps original route scorecard unchanged, and never selects E as primary",()=>{
  const old=auditP5RouteAndModelDataSupport(input([]));
  const proposed=auditP5ProposedEMultiTargetCoverage({...proposal(),
   days:[]});
  expect(old.status).toBe("NO_PROSPECTIVE_TRAIN_VALIDATION_DATA_YET");
  expect(proposed.status).toBe("NO_FUTURE_TRAIN_VALIDATION_COHORT_YET");
  expect(proposed.reportableCells).toHaveLength(0);
  expect(proposed.finalPrimaryOutcomeSelectedByThisFunction).toBe(false);
  expect(proposed.scientificPhase5FreezeGranted).toBe(false);
  expect(proposed.paidPhase6GoGranted).toBe(false);
 });
 it("keeps verified physical and conditional schedule endpoints separate",()=>{
  const r=auditP5ProposedEMultiTargetCoverage(
   proposal([physical(),schedule()]));
  expect(r.reportableCells).toHaveLength(2);
  const phys=r.reportableCells.find(
   (x:any)=>x.endpoint==="PHYSICAL_WHEELS_OFF_DELAY_MINUTES");
  const sched=r.reportableCells.find(
   (x:any)=>x.endpoint==="PROVIDER_SCHEDULE_REVISION_GE15");
  expect(phys.actualOnlyQualifiedObserved).toBe(3);
  expect(phys.positiveEvents).toBeNull();
  expect(phys.labelObservedFraction).toBe(.3);
  expect(sched.positiveEvents).toBe(1);
  expect(sched.positiveFraction).toBe(1/3);
  expect(sched.evidenceTier).toBe(conditional);
  expect(sched.actualOnlyQualifiedObserved).toBe(0);
  expect(r.protectedTestDayOutcomesRead).toBe(0);
  expect(r.inputCandidateStatus).toBe("PROPOSED_AMENDMENT_E_NOT_ADOPTED");
 });
 it("does not infer unlabeled or entirely absent endpoint as a negative",()=>{
  const r=auditP5ProposedEMultiTargetCoverage(
   proposal([group("PROVIDER_REPORTED_CANCELLATION",conditional,"T-24h",
     "QUALIFIED_PROVIDER_TERMINAL_STATUS",4,0,4,0,0,0,0,0)]));
  expect(r.reportableCells).toHaveLength(1);
  expect(r.reportableCells[0].labelObservedFraction).toBe(0);
  expect(r.reportableCells[0].positiveFraction).toBeNull();
  expect(r.reportableCells[0].unknown).toBe(4);
  expect(r.reportableCells.find((x:any)=>x.endpoint==="PROVIDER_REPORTED_DIVERSION"))
   .toBeUndefined();
 });
 it("refuses TEST outcomes, duplicate days and unreviewed metadata provenance",()=>{
  for(const d of [0,26,27,31,32]){
   expect(()=>auditP5ProposedEMultiTargetCoverage(
    proposal([physical()],d))).toThrow(
     "PROPOSED_E_DUPLICATE_OR_PROTECTED_TEST_DAY");
  }
  const p=proposal([physical()]);
  expect(()=>auditP5ProposedEMultiTargetCoverage({
   ...p,protectedTestOutcomesIncluded:true
  })).toThrow("PROPOSED_E_SCHEMA_PROVENANCE_OR_PROTECTED_TEST");
  expect(()=>auditP5ProposedEMultiTargetCoverage({
   ...p,days:[p.days[0],p.days[0]]
  })).toThrow("PROPOSED_E_DUPLICATE_OR_PROTECTED_TEST_DAY");
 });
 it("refuses physical proxy, conditional aircraft promotion and POST-to-PRE leakage",()=>{
  const p=physical();
  for(const change of [
   {actualOnlyQualifiedObserved:2},
   {actualOnlyQualifiedObserved:0},
  ])expect(()=>auditP5ProposedEMultiTargetCoverage(
   proposal([{...p,...change}]))).toThrow(
    "PROPOSED_E_ESTIMATED_OR_UNVERIFIED_PHYSICAL_LABEL");
  const inConditional={...p,
   evidenceTier:conditional,prospectiveEligible:4,
   observed:1,unknown:3,censored:0,pending:0,
   jointValidPreAndObserved:1,actualOnlyQualifiedObserved:1};
  expect(()=>auditP5ProposedEMultiTargetCoverage(
   proposal([inConditional]))).toThrow(
    "PROPOSED_E_CONDITIONAL_SERVICE_PROMOTED_TO_PHYSICAL_LEG");
  expect(()=>auditP5ProposedEMultiTargetCoverage(
   proposal([{...schedule(),postcutoffValuesUsedAsPreFeatures:true}])))
   .toThrow("PROPOSED_E_SOURCE_CLASS_OR_PRE_CUTOFF_LEAKAGE");
 });
 it("refuses invalid endpoint arithmetic, changed evidence class or silent physical threshold",()=>{
  const p=schedule();
  const changes=[
   [{...p,positiveEvents:4},"PROPOSED_E_POSITIVE_EVENTS_EXCEED_OBSERVED"],
   [{...p,unknown:0},"PROPOSED_E_ENDPOINT_LABEL_FUNNEL_OR_JOINT_DENOMINATOR"],
   [{...p,sourceEvidenceClass:"INDEPENDENT_ACTUAL_RUNWAY_EVENT"},
    "PROPOSED_E_SOURCE_CLASS_OR_PRE_CUTOFF_LEAKAGE"],
   [{...p,actualOnlyQualifiedObserved:1},
    "PROPOSED_E_NONPHYSICAL_MASQUERADING_AS_ACTUAL_EVENT"],
   [{...p,jointValidPreAndObserved:4},
    "PROPOSED_E_ENDPOINT_LABEL_FUNNEL_OR_JOINT_DENOMINATOR"]
  ] as const;
  for(const [bad,msg] of changes)
   expect(()=>auditP5ProposedEMultiTargetCoverage(proposal([bad])))
    .toThrow(msg);
  expect(()=>auditP5ProposedEMultiTargetCoverage(
   proposal([schedule(),schedule()]))).toThrow(
    "PROPOSED_E_DUPLICATED_DAY_ENDPOINT_TIER_HORIZON");
 });
 it("requires airborne ETA truly airborne rather than PRE or proxy",()=>{
  const p=group("AIRBORNE_ETA_ERROR_MINUTES",native,"AIRBORNE",
   "MATCHED_AIRBORNE_TRACK_AND_ACTUAL_ARRIVAL",4,2,1,1,0,2,2,null);
  const r=auditP5ProposedEMultiTargetCoverage(proposal([p]));
  expect(r.reportableCells[0].observed).toBe(2);
  expect(()=>auditP5ProposedEMultiTargetCoverage(
   proposal([{...p,horizon:"T-6h"}]))).toThrow(
    "PROPOSED_E_AIRBORNE_ENDPOINT_STATE_MISMATCH");
 });
});
