import {describe,it,expect} from "vitest";
import type {Phase7DerivedReleasePacket} from "../server/lib/disruption/phase6DerivedTrainingReleasePacket_v39";
import {
 buildPhase7ContinuousDerivedTargetPacketV39,
 validatePhase7ContinuousDerivedTargetContractV39,
 hashPhase7ContinuousDerivedTargetPacketV39,
 PHASE7_CONTINUOUS_TARGET_BOUNDARY_V39,
 type Phase7ContinuousDerivedTargetContractV39,
} from "../server/lib/disruption/phase7ContinuousDerivedTarget_v39";

const id1="11111111-1111-4111-8111-111111111111";
const id2="22222222-2222-4222-8222-222222222222";
const packet={
 schema:"v39.phase6.phase7-derived-release-packet.v1",
 packetId:"33333333-3333-4333-8333-333333333333",
 contractVersion:"phase7_model_v1",
 featureDictionarySha256:"a".repeat(64),
 rows:[
  {releaseRowId:id1,horizon:"T-6h",cohortBucket:1,split:"train",featureBuckets:{x:1},labelBuckets:{y:1},missingness:{x:false,y:false},qualityFlags:0,censoring:"observed"},
  {releaseRowId:id2,horizon:"T-6h",cohortBucket:1,split:"train",featureBuckets:{x:0},labelBuckets:{y:null},missingness:{x:false,y:true},qualityFlags:16,censoring:"censored"},
 ]
} as unknown as Phase7DerivedReleasePacket;
const contract=():Phase7ContinuousDerivedTargetContractV39=>({
 schema:"v39.phase7.continuous-derived-target-contract.v1",
 version:"gateout_delay_v1",
 targetName:"gate_out_delay_minutes",
 unit:"minutes",
 primaryHorizon:"T-6h",
 termsReviewSha256:"1a".repeat(32),
 derivedWorkReviewSha256:"2b".repeat(32),
 transformEvidenceSha256:"3c".repeat(32),
 minValue:-360,maxValue:2880,
 nonReconstructable:true,
 sourceTimestampsPersisted:false,
 sourceRecordsPersisted:false,
 requiresMultipleObservationTransform:true,
});

describe("Phase7 continuous derived Amendment E target",()=>{
 it("preserves a continuous observed gate-out delay without source timestamps",()=>{
  expect(validatePhase7ContinuousDerivedTargetContractV39(contract())).toEqual({pass:true,failures:[]});
  const p=buildPhase7ContinuousDerivedTargetPacketV39(contract(),packet,[
   {value:37.25,censoring:"observed"},
   {value:null,censoring:"censored"},
  ],"44444444-4444-4444-8444-444444444444");
  expect(p.rows).toEqual([
   {releaseRowId:id1,value:37.25,censoring:"observed"},
   {releaseRowId:id2,value:null,censoring:"censored"},
  ]);
  expect(p.derivedPacketSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(hashPhase7ContinuousDerivedTargetPacketV39(p)).toMatch(/^[a-f0-9]{64}$/);
  expect(PHASE7_CONTINUOUS_TARGET_BOUNDARY_V39).toEqual(expect.objectContaining({
   packetAChanged:false,sourceTimestampsPersisted:false,sourceRecordsPersisted:false,phase6PaidGo:false,
  }));
 });
 it("refuses a source-shaped target name or reconstruction boundary",()=>{
  expect(validatePhase7ContinuousDerivedTargetContractV39({...contract(),targetName:"actual_timestamp"}).pass).toBe(false);
  expect(validatePhase7ContinuousDerivedTargetContractV39({...contract(),sourceTimestampsPersisted:true as false}).pass).toBe(false);
 });
 it("refuses values outside the reviewed range and invented labels for censored rows",()=>{
  expect(()=>buildPhase7ContinuousDerivedTargetPacketV39(contract(),packet,[
   {value:4000,censoring:"observed"},{value:null,censoring:"censored"},
  ])).toThrow(/value-or-censoring/);
  expect(()=>buildPhase7ContinuousDerivedTargetPacketV39(contract(),packet,[
   {value:5,censoring:"observed"},{value:0,censoring:"censored"},
  ])).toThrow(/value-or-censoring/);
 });
});
