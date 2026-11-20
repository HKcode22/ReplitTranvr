import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {P5_E_ALLOWED_PRE_FEATURES} from "../server/lib/disruption/phase5AmendmentEAsOfFeatureSelectionOffline_v39";
import {buildPhase7PairedDerivedCandidate} from "../server/lib/disruption/phase7PairedDerivedReleaseCandidate_v39";
import {auditCanonicalPhase7FieldParity,type Phase7CanonicalFieldDisposition,type Phase7CanonicalParityInput} from "../server/lib/disruption/phase7CanonicalFieldParity_v39";
import type {Phase7DerivedReleaseContract,Phase6ReleaseHorizon} from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ApprovedDerivedInput} from "../server/lib/disruption/phase7DerivedReleaseWriter_v39";
import type {Phase7DurableDerivedBundle} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const contract:Phase7DerivedReleaseContract={schema:"v39.phase6.phase7-derived-release-contract.v2",version:"v01",featureDictionarySha256:sha("dict"),termsReviewSha256:sha("terms"),derivedWorkReviewSha256:sha("derived"),sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:"2099-12-31T00:00:00.000Z",cohortBucketCount:4,features:[{name:"congestion_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:sha("feature"),nonReconstructable:true}],labels:[{name:"delay_bin",bucketCount:4,fieldClass:"approved_derived",transformEvidenceSha256:sha("label"),nonReconstructable:true}],allowedHorizons:["T-24h","T-6h","T-90m"]};
const hr=["T-24h","T-6h","T-90m"] as const;
function fixture(){
 const row=(horizon:Phase6ReleaseHorizon):Phase7ApprovedDerivedInput=>({horizon,cohortBucket:1,split:"train",featureBuckets:{congestion_bin:1},labelBuckets:{delay_bin:horizon==="T-6h"?2:null},missingness:{congestion_bin:false,delay_bin:horizon!=="T-6h"},qualityFlags:0,censoring:horizon==="T-6h"?"observed":"missing"});
 const p=buildPhase7PairedDerivedCandidate(contract,[hr.map(row)],sha("association"));
 const bundle:Phase7DurableDerivedBundle={schema:"v39.phase7.durable-derived-bundle.v1",packet:p.packet,paired:{...p.association,schema:"v39.phase7.paired-derived-association-reviewed.v1",approvedForUse:true},continuous:{schema:"v39.phase7.continuous-gate-out-target-packet.v1",packetId:"3f2504e0-4f89-41d3-9a0c-0305e82c3303",derivedPacketSha256:p.association.packetSha256,targetName:"gate_out_delay_minutes",unit:"minutes",primaryHorizon:"T-6h",rows:[{releaseRowId:p.packet.rows[1].releaseRowId,value:-3.75,censoring:"observed"}]}};
 const dispositions:Phase7CanonicalFieldDisposition[]=P5_E_ALLOWED_PRE_FEATURES.map(field=>({field,disposition:field==="airport_congestion_1h"?"REVIEWED_DERIVED_BUCKET":"LONG_TERM_RIGHTS_REQUIRED",outputField:field==="airport_congestion_1h"?"congestion_bin":null,reviewSha256:sha(field)}));
 const inputs:Phase7CanonicalParityInput[]=bundle.packet.rows.map(r=>({releaseRowId:r.releaseRowId,flightInstanceId:"test-leg-1",horizon:r.horizon,issuedAtUtc:r.horizon==="T-24h"?"2026-11-21T06:00:00.000Z":r.horizon==="T-6h"?"2026-11-22T00:00:00.000Z":"2026-11-22T04:30:00.000Z",sourceExpiresAtUtc:"2026-11-22T10:00:00.000Z",sourceFields:P5_E_ALLOWED_PRE_FEATURES.map(field=>({field,present:field==="airport_congestion_1h"||field==="origin_icao",availableAtUtc:field==="airport_congestion_1h"||field==="origin_icao"?"2026-11-21T05:00:00.000Z":null})),separatelyVerifiedFields:[],gateOut:r.horizon==="T-6h"?{schema:"v39.phase5.amendment-e-gateout-first-cycle-candidate.v1",frozenSourceOriginalSha256:sha("original"),flightInstanceId:"test-leg-1",horizon:"T-6h",selectedNativeTUtc:"2026-11-22T06:00:00.000Z",preIssuedAtUtc:"2026-11-22T00:00:00.000Z",originalSourceAvailableAtUtc:"2026-11-21T23:50:00.000Z",operatingLegIdentityExternallyVerified:true,scheduled:{utc:"2026-11-22T06:00:00.000Z",milestone:"SCHEDULED_GATE_OUT",externallyVerifiedGateOutMeaning:true,evidenceSha256:sha("schedule")},outcome:{operation:"OPERATED",event:"ACTUAL_GATE_OUT",actualUtc:"2026-11-22T05:56:15.000Z",firstAvailableAtUtc:"2026-11-22T06:15:00.000Z",externallyVerifiedActualOnly:true,evidenceSha256:sha("outcome"),recoveryGraceElapsed:false}}:null}));
 return {bundle,dispositions,inputs};
}
const now="2026-11-22T06:30:00.000Z";
describe("canonical scientific denominator parity during still-live custody",()=>{
 it("reports every unresolved field rather than silently dropping it, preserves signed continuous target",()=>{
  const {bundle,dispositions,inputs}=fixture(),v=auditCanonicalPhase7FieldParity(contract,bundle,dispositions,inputs,now);
  expect(v.fields).toBe(16);expect(v.groups).toBe(1);expect(v.sourcePresentLost).toBe(3);expect(v.continuousMismatch).toBe(0);expect(v.continuousObserved).toBe(1);expect(v.structuralCoverageParity).toBe(false);
  expect(JSON.stringify(v)).not.toContain("test-leg-1");
 });
 it("rejects omissions, cross-leg groups, expired custody, and post-issue features",()=>{
  const {bundle,dispositions,inputs}=fixture();
  expect(()=>auditCanonicalPhase7FieldParity(contract,bundle,dispositions.slice(1),inputs,now)).toThrow(/complete-field-inventory/);
  expect(()=>auditCanonicalPhase7FieldParity(contract,bundle,dispositions,inputs.slice(1),now)).toThrow(/denominator/);
  expect(()=>auditCanonicalPhase7FieldParity(contract,bundle,dispositions,inputs.map((x,i)=>i===0?{...x,flightInstanceId:"other-leg"}:x),now)).toThrow(/same-leg-unique-group/);
  expect(()=>auditCanonicalPhase7FieldParity(contract,bundle,dispositions,inputs,"2026-11-22T10:00:00.000Z")).toThrow(/source-custody-expired/);
  expect(()=>auditCanonicalPhase7FieldParity(contract,bundle,dispositions,inputs.map((x,i)=>i===0?{...x,sourceFields:x.sourceFields.map(f=>f.present?{...f,availableAtUtc:now}:f)}:x),now)).toThrow(/source-late-or-unclocked/);
 });
 it("detects actual-label substitution (runway instead of gate out) and numerical disagreement",()=>{
  const {bundle,dispositions,inputs}=fixture();
  const wrong=inputs.map(x=>x.gateOut?{...x,gateOut:{...x.gateOut,outcome:{...x.gateOut.outcome,event:"ACTUAL_WHEELS_OFF" as const}}}:x);
  expect(auditCanonicalPhase7FieldParity(contract,bundle,dispositions,wrong,now).continuousMismatch).toBe(1);
  bundle.continuous.rows=[{...bundle.continuous.rows[0],value:3.75}];
  expect(auditCanonicalPhase7FieldParity(contract,bundle,dispositions,inputs,now).continuousMismatch).toBe(1);
 });
});
