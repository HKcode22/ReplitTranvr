import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {auditP6PrivateSourceDayGeometry} from "../server/lib/disruption/phase6PrivateSourceRetirementGeometry_v39.mjs";
const H=3600000;
const iso=(t:number)=>new Date(t).toISOString();
const plan=(day:number)=>JSON.parse(readFileSync(
 "data-collection/phase5/planning/phase6-source-day-"+String(day).padStart(2,"0")+".json","utf8"));

describe("Phase 6 Gate 3: signed source purpose vs physical retention hard cap",()=>{
 it("checks ALL 31 immutable release plans: 6144 acquisition opportunities and conservative safety margins, NO early DELETE authority",()=>{
  const reports=Array.from({length:31},(_,i)=>auditP6PrivateSourceDayGeometry(plan(i+1)));
  expect(reports.map(x=>x.day)).toEqual(Array.from({length:31},(_,i)=>i+1));
  expect(reports.reduce((s,x)=>s+x.templates,0)).toBe(6144);
  expect(reports.filter(x=>x.templates===288).map(x=>x.day)).toEqual([5,10]);
  expect(reports.filter(x=>x.templates===192).length).toBe(29);
  expect(Math.max(...reports.map(x=>x.sourceToServiceEndHours))).toBe(30.25);
  expect(Math.min(...reports.map(x=>x.positiveConservativeProviderMarginHours))).toBe(58.75);
  for(const r of reports){
   expect(r.consumerAndDerivedResearchReleaseVerified).toBe(false);
   expect(r.physicalDeletionScheduledOrVerified).toBe(false);
   expect(r.independentSignedPrivateExpiryVerified).toBe(false);
   expect(r.phase6PaidGo).toBe(false);
  }
 });
 it("requires actual per-day signed timing; expected prearm leaves positive margin, but no research-consumer proof",()=>{
  for(const day of [1,5,10,31]){
   const p=plan(day),pre=auditP6PrivateSourceDayGeometry(p);
   const first=Date.parse(pre.firstQueryUtc);
   const signed=auditP6PrivateSourceDayGeometry(p,{
    signedReviewAtUtc:iso(first-90*60000),
    signedRetentionNotAfterUtc:iso(first-90*60000+96*H)});
   expect(signed.positiveSignedRetirementMarginHours).toBeGreaterThan(8);
   expect(signed.independentSignedPrivateExpiryVerified).toBe(false);
   expect(signed.consumerAndDerivedResearchReleaseVerified).toBe(false);
   for(const expiry of [iso(first+12*H),iso(Date.parse(pre.earliestSafePostJobDrainUtc)+H)]){
    expect(()=>auditP6PrivateSourceDayGeometry(p,{
     signedReviewAtUtc:iso(first-90*60000),signedRetentionNotAfterUtc:expiry})).toThrow();
   }
   expect(()=>auditP6PrivateSourceDayGeometry(p,{
    signedReviewAtUtc:iso(first+60000),
    signedRetentionNotAfterUtc:iso(first+96*H)})).toThrow();
  }
 });
 it("refuses forged source templates, additional query attempts, and widened service horizon",()=>{
  const p=plan(1),t=p.templates[0];
  for(const bad of [
   {...t,queryKey:p.templates[1].queryKey},{...t,maxAttempts:2},
   {...t,providerQueryDirection:"Arrival"},{...t,slot:"MISSING"},
   {...t,horizon:"T-2h"},{...t,apiUnitsPerAttempt:4},
   {...t,serviceWindowEndUtc:iso(Date.parse(p.expectedServiceStartUtc)+31*H)},
  ]){
   const q={...p,templates:[bad,...p.templates.slice(1)]};
   expect(()=>auditP6PrivateSourceDayGeometry(q)).toThrow();
  }
  const q={...p,templates:p.templates.slice(1)};
  expect(()=>auditP6PrivateSourceDayGeometry(q)).toThrow();
 });
});
