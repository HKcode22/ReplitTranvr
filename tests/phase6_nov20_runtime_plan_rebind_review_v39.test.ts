import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {verifyDayPlanGeometry} from "../review-tools/p6_nov20_prepare_runtime_plan_rebind_v39";
import {replayP6CompactNov22Review} from "../scripts/v39_phase6_actual_release_candidate_export_v39";
const plan=(n:number)=>JSON.parse(readFileSync("data-collection/phase5/planning/phase6-source-day-"+String(n).padStart(2,"0")+".json","utf8"));
const clocks=["budgetDayUtc","physicalChargeDayUtc","serviceWindowStartUtc","serviceWindowEndUtc","earliestPlannedCutoffUtc","scheduledRequestUtc"];
const revise=(old:any)=>{
 const x=JSON.parse(JSON.stringify(old));
 const shift=(s:string)=>{const t=new Date(Date.parse(s)+86400000).toISOString();return s.length===10?t.slice(0,10):t};
 x.expectedServiceStartUtc=shift(x.expectedServiceStartUtc);
 for(const r of x.templates)for(const k of clocks)r[k]=shift(r[k]);
 return x;
};
describe("exact revised runtime day-plan rebind",()=>{
 it("permits only approved first day shift with reviewed evidence digest changes",()=>{
  const old=plan(1),next=revise(old);
  next.reviewedRefreshTiming.reviewed31DayCoverageGridSha256="a".repeat(64);
  next.reviewedSegmentedSource.reviewedProviderRangeEvidenceSha256="b".repeat(64);
  expect(()=>verifyDayPlanGeometry(old,next,1)).not.toThrow();
 });
 it("never moves other days or changes any query identity or price",()=>{
  const old=plan(1),next=revise(old);next.templates[0].apiUnitsPerAttempt++;
  expect(()=>verifyDayPlanGeometry(old,next,1)).toThrow(/UNAPPROVED_PLAN_GEOMETRY_DRIFT/);
  expect(()=>verifyDayPlanGeometry(plan(2),revise(plan(2)),2)).toThrow(/UNAPPROVED_PLAN_GEOMETRY_DRIFT/);
  expect(()=>verifyDayPlanGeometry(old,old,1)).toThrow(/UNAPPROVED_PLAN_GEOMETRY_DRIFT/);
  const bad=revise(old);bad.templates[0].sourceId="not permitted";
  expect(()=>verifyDayPlanGeometry(old,bad,1)).toThrow(/UNAPPROVED_PLAN_GEOMETRY_DRIFT/);
 });
 it("all other day geometry is immutable, including exact revised embedded ordinary envelope",()=>{
 const envelope=replayP6CompactNov22Review().shapeEnvelope;
 for(let n=2;n<=31;n++){
 const old=plan(n),next=JSON.parse(JSON.stringify(old));
 if(old.pairedIcaos===null)next.reviewedOrdinaryDayEnvelope={envelope,independentlyReviewedShapeEnvelopeSha256:envelope.shapeEnvelopeSha256};
 expect(()=>verifyDayPlanGeometry(old,next,n)).not.toThrow();
 }
 });
 it("refuses unchanged or tampered ordinary-day envelopes",()=>{
 const old=plan(6);
 expect(old.pairedIcaos).toBeNull();
 expect(()=>verifyDayPlanGeometry(old,old,6)).toThrow(/NEW_ORDINARY_ENVELOPE_DRIFT/);
 const envelope=replayP6CompactNov22Review().shapeEnvelope;
 const bad=JSON.parse(JSON.stringify(old));bad.reviewedOrdinaryDayEnvelope={envelope,independentlyReviewedShapeEnvelopeSha256:"f".repeat(64)};
 expect(()=>verifyDayPlanGeometry(old,bad,6)).toThrow(/NEW_ORDINARY_ENVELOPE_DRIFT/);
 });
});
