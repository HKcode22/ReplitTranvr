import {describe,it,expect} from "vitest";
import {
  auditP4G5LabelObservabilityV39,
  type P4G5LabelObservationV39
} from "../server/lib/disruption/phase4Gate5LabelObservabilityBiasAudit_v39";

const mk=(n:number,patch:Partial<P4G5LabelObservationV39>={})
 :P4G5LabelObservationV39=>({
  scopedFlightDigest:n.toString(16).padStart(64,"0"),
  airportIcao:"WSSS",tier:"HUB",horizon:"T-24h",
  providerPopulationMemberAsOfCutoff:true,horizonEligible:true,
  operatingLegIdentityVerified:true,persistedPreSnapshot:true,
  webhookCaptured:false,labelClass:"MISSING",...patch
 });
describe("Gate5/Phase7 label-coverage and selection-bias diagnostic",()=>{
 it("audits population denominator even if zero webhooks or labels",()=>{
  const r=auditP4G5LabelObservabilityV39([
   mk(1),mk(2,{labelClass:"ADSB_INFERRED_PROXY_ONLY"}),
   mk(3,{labelClass:"ESTIMATED_OR_UNVERIFIED"}),
   mk(4,{labelClass:"EXTERNAL_ACTUAL_ONLY_VERIFIED",webhookCaptured:true})
  ]);
  const b=r.buckets[0];
  expect(b.populationMembers).toBe(4);
  expect(b.horizonEligible).toBe(4);
  expect(b.prePersisted).toBe(4);
  expect(b.webhookCaptured).toBe(1);
  expect(b.exactActualLabelReported).toBe(1);
  expect(b.exactLabelCoverageRate).toBe(.25);
  expect(b.inferredProxyOnly).toBe(1);
  expect(b.estimatedOrUnverified).toBe(1);
  expect(b.missing).toBe(1);
  expect(r.labelSelectionBiasAbsentProven).toBe(false);
  expect(r.phase7ModelEvaluationApproved).toBe(false);
 });
 it("does not treat a captured flight outside the source population as a denominator member",()=>{
  const r=auditP4G5LabelObservabilityV39([
   mk(1,{providerPopulationMemberAsOfCutoff:false,
     horizonEligible:false,persistedPreSnapshot:false,
     webhookCaptured:true,labelClass:"MISSING"}),
   mk(2)
  ]);
  expect(r.buckets[0].populationMembers).toBe(1);
  expect(r.buckets[0].webhookCaptured).toBe(0);
 });
 it("returns NULL rather than a fabricated zero rate for zero eligible flights",()=>{
  const r=auditP4G5LabelObservabilityV39([
   mk(1,{horizonEligible:false,persistedPreSnapshot:false,
    labelClass:"PENDING"})
  ]);
  expect(r.buckets[0].populationMembers).toBe(1);
  expect(r.buckets[0].exactLabelCoverageRate).toBeNull();
  expect(r.buckets[0].preCoverageRate).toBeNull();
 });
 it("rejects duplicate flight-horizon and temporal/identity contradictions",()=>{
  expect(()=>auditP4G5LabelObservabilityV39([mk(1),mk(1)]))
   .toThrow("P4_G5_LABEL_AUDIT_REPEAT_HORIZON_FLIGHT");
  for(const v of [
   {providerPopulationMemberAsOfCutoff:false},
   {operatingLegIdentityVerified:false,persistedPreSnapshot:true},
   {horizonEligible:false,persistedPreSnapshot:true},
   {operatingLegIdentityVerified:false,
     persistedPreSnapshot:false,labelClass:"EXTERNAL_ACTUAL_ONLY_VERIFIED" as const},
  ])expect(()=>auditP4G5LabelObservabilityV39([mk(1,v)]))
    .toThrow("P4_G5_LABEL_AUDIT_LINEAGE_OR_TARGET_HOLD");
 });
 it("reports stratum differences descriptively but never proves zero bias",()=>{
  const all: P4G5LabelObservationV39[]=[];
  for(let i=1;i<=20;i++)all.push(mk(i,{
   labelClass:i<=18?"EXTERNAL_ACTUAL_ONLY_VERIFIED":"MISSING"
  }));
  for(let i=21;i<=40;i++)all.push(mk(i,{
   airportIcao:"YSSY",labelClass:i<=25?"EXTERNAL_ACTUAL_ONLY_VERIFIED":"MISSING"
  }));
  const result=auditP4G5LabelObservabilityV39(all);
  expect(result.comparedStratumCount).toBe(2);
  expect(result.maxMinusMinReportedLabelCoverage).toBeCloseTo(.65);
  expect(result.labelSelectionBiasAbsentProven).toBe(false);
  expect(result.inversePropensityWeightsApproved).toBe(false);
  const printed=JSON.stringify(result);
  expect(printed).not.toContain("0000000000000000000000000000000000000000000000000000000000000001");
 });
 it("never invents a numerical contrast from only one eligible stratum",()=>{
  const r=auditP4G5LabelObservabilityV39([mk(1),mk(2)]);
  expect(r.maxMinusMinReportedLabelCoverage).toBeNull();
  expect(r.comparedStratumCount).toBe(0);
 });
});
