import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
 auditP5RouteAndModelDataSupport,ROUTE_AUDIT_SCHEMA,ROUTE_AUDIT_FRAME_HASH
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
