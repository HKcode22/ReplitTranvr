import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {buildPhase7PairedDerivedCandidate} from "../server/lib/disruption/phase7PairedDerivedReleaseCandidate_v39";
import type {Phase7DerivedReleaseContract,Phase6ReleaseHorizon} from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ApprovedDerivedInput} from "../server/lib/disruption/phase7DerivedReleaseWriter_v39";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const contract:Phase7DerivedReleaseContract={schema:"v39.phase6.phase7-derived-release-contract.v2",version:"v01",
 featureDictionarySha256:sha("dict"),termsReviewSha256:sha("terms"),derivedWorkReviewSha256:sha("review"),
 sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:"2027-12-31T00:00:00.000Z",cohortBucketCount:4,
 features:[{name:"congestion_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:sha("feature"),nonReconstructable:true}],
 labels:[{name:"delay_bin",bucketCount:4,fieldClass:"approved_derived",transformEvidenceSha256:sha("label"),nonReconstructable:true}],
 allowedHorizons:["T-24h","T-6h","T-90m"]};
const row=(horizon:Phase6ReleaseHorizon):Phase7ApprovedDerivedInput=>({horizon,cohortBucket:1,split:"train",featureBuckets:{congestion_bin:1},labelBuckets:{delay_bin:2},missingness:{congestion_bin:false,delay_bin:false},qualityFlags:0,censoring:"observed"});
const group=()=>[row("T-24h"),row("T-6h"),row("T-90m")];
describe("review-only paired derived candidate",()=>{
 it("retains same-group horizon association including an explicit censored row",()=>{
  const g=group();g[2]={...g[2],censoring:"censored",labelBuckets:{delay_bin:null},missingness:{congestion_bin:false,delay_bin:true}};
  const r=buildPhase7PairedDerivedCandidate(contract,[g],sha("association review"));
  expect(r.association.groups[0].rows.map(x=>x.releaseRowId)).toEqual(r.packet.rows.map(x=>x.releaseRowId));
  expect(r.packet.rows[2].censoring).toBe("censored");
  expect(r.association.approvedForUse).toBe(false);
  expect(r.association.sourceMappingPersisted).toBe(false);
  expect(new Set(r.packet.rows.map(x=>x.releaseRowId)).size).toBe(3);
 });
 it("rejects omissions, duplicate horizons and split/cohort drift",()=>{
  const g=group();
  for(const bad of [g.slice(1),[g[0],g[0],g[2]]])expect(()=>buildPhase7PairedDerivedCandidate(contract,[bad],sha("review"))).toThrow(/incomplete-or-duplicate/);
  for(const bad of [{...g[1],split:"test" as const},{...g[1],cohortBucket:2}])expect(()=>buildPhase7PairedDerivedCandidate(contract,[[g[0],bad,g[2]]],sha("review"))).toThrow(/paired-split-or-cohort-drift/);
 });
 it("never admits an extra source ID through an input row",()=>{
  const g=group();g[0]={...g[0],flightInstanceId:"provider-leg"} as unknown as Phase7ApprovedDerivedInput;
  expect(()=>buildPhase7PairedDerivedCandidate(contract,[g],sha("review"))).toThrow(/exact-approved-derived-shape/);
 });
});
