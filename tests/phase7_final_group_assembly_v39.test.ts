import {describe,it,expect} from "vitest";
import {createHash,randomUUID,generateKeyPairSync,sign} from "node:crypto";
import {verifyPhase7SignedPostSettlement,phase7PostFragmentsDigest} from "../server/lib/disruption/phase7SignedPostReview_v39";
import type {P6PostCommittedScope,P6PostPreservationAnchor} from "../server/lib/disruption/phase6ActualPostOutcomeObservability_v39";
import {assemblePhase7FinalGroupCandidate,P7_ABSENT_PRE_PLACEHOLDER,P7_CANCELLED_SEPARATE_OUTCOME,type Phase7StoredPreFragment} from "../server/lib/disruption/phase7FinalGroupAssembly_v39";
import {buildPhase7DerivedReleasePacket} from "../server/lib/disruption/phase7DerivedReleaseWriter_v39";
import {hashPhase7DerivedReleasePacket} from "../server/lib/disruption/phase6DerivedTrainingReleasePacket_v39";
import {hashPhase7DurableCandidate,validateDurableDerivedBundle,type Phase7DurableDerivedBundle,type Phase7DurableBundleApproval} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import type {Phase7DerivedReleaseContract,Phase6ReleaseHorizon} from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ReviewedTransformationProfile} from "../server/lib/disruption/phase7ReviewedSourceTransformation_v39";
import type {P5EGateOutFirstCycleInput} from "../server/lib/disruption/phase5AmendmentEGateOutDelayLabel_v39";
const sha=(x:string)=>createHash("sha256").update(x).digest("hex");
const shared={version:"v01",featureDictionarySha256:sha("dictionary"),termsReviewSha256:sha("terms"),derivedWorkReviewSha256:sha("derived")};
const contract:Phase7DerivedReleaseContract={schema:"v39.phase6.phase7-derived-release-contract.v2",...shared,sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:"2027-12-31T00:00:00.000Z",cohortBucketCount:31,features:[{name:"context_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:sha("feature"),nonReconstructable:true}],labels:[{name:"delay_bin",bucketCount:4,fieldClass:"approved_derived",transformEvidenceSha256:sha("label"),nonReconstructable:true}],allowedHorizons:["T-24h","T-6h","T-90m"]};
const profile:Phase7ReviewedTransformationProfile={schema:"v39.phase7.reviewed-source-transformation.v1",...shared,mappingExpiryHours:24,approvedForUse:true,fields:[{sourceField:"airport_congestion_1h",outputField:"context_bin",role:"feature",kind:"numeric_threshold_bucket",bucketCount:3,boundaries:[1,4],categories:null,transformEvidenceSha256:sha("feature"),nonReconstructable:true},{sourceField:"gate_out_delay_minutes",outputField:"delay_bin",role:"label",kind:"numeric_threshold_bucket",bucketCount:4,boundaries:[0,15,60],categories:null,transformEvidenceSha256:sha("label"),nonReconstructable:true}]};
const groupId=randomUUID(),now="2026-11-22T08:00:00.000Z",scope={groupId,associationReviewSha256:sha("synthetic group review"),outcomeReviewSha256:sha("synthetic outcome review"),groupSettlementDue:true};
const pre=(horizon:Phase6ReleaseHorizon):Phase7StoredPreFragment=>{
 const packet=buildPhase7DerivedReleasePacket(contract,[{horizon,cohortBucket:0,split:"train",featureBuckets:{context_bin:1},labelBuckets:{delay_bin:null},missingness:{context_bin:false,delay_bin:true},qualityFlags:0,censoring:"not_due"}]);
 return {groupId,contractSha256:hashPhase7DurableCandidate(contract),profileSha256:hashPhase7DurableCandidate(profile),packetSha256:hashPhase7DerivedReleasePacket(packet),packet};
};
function outcome(horizon:Phase6ReleaseHorizon):P5EGateOutFirstCycleInput{
 const issued=horizon==="T-24h"?"2026-11-21T06:00:00.000Z":horizon==="T-6h"?"2026-11-22T00:00:00.000Z":"2026-11-22T04:30:00.000Z";
 return {schema:"v39.phase5.amendment-e-gateout-first-cycle-candidate.v1",frozenSourceOriginalSha256:sha("synthetic original"),flightInstanceId:"leg:synthetic:one",horizon,selectedNativeTUtc:"2026-11-22T06:00:00.000Z",preIssuedAtUtc:issued,originalSourceAvailableAtUtc:new Date(Date.parse(issued)-1000).toISOString(),operatingLegIdentityExternallyVerified:true,scheduled:{utc:"2026-11-22T06:00:00.000Z",milestone:"SCHEDULED_GATE_OUT",externallyVerifiedGateOutMeaning:true,evidenceSha256:sha("synthetic exact schedule")},outcome:{operation:"OPERATED",event:"ACTUAL_GATE_OUT",actualUtc:"2026-11-22T05:56:15.000Z",firstAvailableAtUtc:"2026-11-22T06:15:00.000Z",externallyVerifiedActualOnly:true,evidenceSha256:sha("synthetic exact actual"),recoveryGraceElapsed:true}};
}
describe("final group assembly preserves actual PRE IDs and conditional primary denominator",()=>{
 it("retains T6-only numerical primary without inventing T24/T90 observations",()=>{
  const f=pre("T-6h"),a=assemblePhase7FinalGroupCandidate(contract,profile,[f],{...scope,evidence:{"T-6h":outcome("T-6h")}},now);
  expect(a.packet.packetId).toBe(groupId);
  expect(a.packet.rows[1].releaseRowId).toBe(f.packet.rows[0].releaseRowId);
  expect(a.packet.rows[1].featureBuckets).toEqual(f.packet.rows[0].featureBuckets);
  expect(a.continuous.rows[0].value).toBe(-3.75);
  expect(a.packet.rows[1].labelBuckets).toEqual({delay_bin:0});
  expect(a.denominator).toMatchObject({primaryPrePresent:true,primaryNumeric:true,pairedT6T90Numerical:false,t24ComparatorNumerical:false});
  for(const r of [a.packet.rows[0],a.packet.rows[2]]){expect(r.qualityFlags&P7_ABSENT_PRE_PLACEHOLDER).toBe(P7_ABSENT_PRE_PLACEHOLDER);expect(r.censoring).toBe("missing");expect(r.featureBuckets.context_bin).toBeNull();}
  expect(a.association.approvedForUse).toBe(false);
  expect(JSON.stringify(a)).not.toMatch(/leg:synthetic|2026-11-22|synthetic original/);
  // Separate synthetic review tests compatibility with the existing sink.
  const b:Phase7DurableDerivedBundle={schema:"v39.phase7.durable-derived-bundle.v1",packet:a.packet,paired:{...a.association,schema:"v39.phase7.paired-derived-association-reviewed.v1",approvedForUse:true},continuous:a.continuous};
  const review:Phase7DurableBundleApproval={schema:"v39.phase7.durable-derived-bundle-independent-review.v1",contractSha256:hashPhase7DurableCandidate(contract),bundleSha256:hashPhase7DurableCandidate(b),sourceParityReviewSha256:sha("synthetic parity"),reconstructionReviewSha256:sha("synthetic reconstruction"),fieldReviewSha256:sha("synthetic field"),associationReviewSha256:scope.associationReviewSha256,continuousTargetReviewSha256:sha("synthetic target review"),approvedForDurableStorage:true,sourceMappingPersisted:false,minTargetMinutes:-60,maxTargetMinutes:1440};
  expect(validateDurableDerivedBundle(contract,b,review,new Date(now)).rowCount).toBe(3);
 });
 it("does not manufacture a T6 label from T90 when primary PRE was absent",()=>{
  const a=assemblePhase7FinalGroupCandidate(contract,profile,[pre("T-90m")],{...scope,evidence:{"T-90m":outcome("T-90m")}},now);
  expect(a.denominator.primaryPrePresent).toBe(false);expect(a.continuous.rows[0].value).toBeNull();expect(a.continuous.rows[0].censoring).toBe("missing");
 });
 it("censors runway proxy and records cancellation separately",()=>{
  const f=pre("T-6h"),e=outcome("T-6h");
  const runway={...e,outcome:{...e.outcome,event:"ACTUAL_WHEELS_OFF" as const}};
  expect(assemblePhase7FinalGroupCandidate(contract,profile,[f],{...scope,evidence:{"T-6h":runway}},now).continuous.rows[0].value).toBeNull();
  const cancelled={...e,outcome:{...e.outcome,operation:"CONFIRMED_CANCELLED" as const,event:"NO_EVENT" as const,actualUtc:null}};
  const a=assemblePhase7FinalGroupCandidate(contract,profile,[f],{...scope,evidence:{"T-6h":cancelled}},now);
  expect(a.packet.rows[1].qualityFlags&P7_CANCELLED_SEPARATE_OUTCOME).toBe(P7_CANCELLED_SEPARATE_OUTCOME);
  expect(a.continuous.rows[0].value).toBeNull();
 });
 it("rejects malformed database group identifiers before assembly",()=>{
  const f=pre("T-6h");
  for(const groupId of ["not-a-uuid","00000000-0000-1000-8000-000000000000","00000000-0000-4000-0000-000000000000"]){
   expect(()=>assemblePhase7FinalGroupCandidate(contract,profile,[{...f,groupId}],{...scope,groupId,evidence:{}},now)).toThrow("PHASE7_FINAL_GROUP_REJECTED:scope");
  }
 });
 it("rejects duplicate/different groups, future outcomes, mismatched legs, absent-horizon evidence and early finalization",()=>{
  const f=pre("T-6h"),t=pre("T-90m"),e=outcome("T-6h"),q=outcome("T-90m");
  expect(()=>assemblePhase7FinalGroupCandidate(contract,profile,[f,f],{...scope,evidence:{}},now)).toThrow();
  expect(()=>assemblePhase7FinalGroupCandidate(contract,profile,[f,{...t,groupId:randomUUID()}],{...scope,evidence:{}},now)).toThrow();
  expect(()=>assemblePhase7FinalGroupCandidate(contract,profile,[f],{...scope,evidence:{"T-6h":{...e,outcome:{...e.outcome,firstAvailableAtUtc:"2026-11-22T08:00:00.001Z"}}}},now)).toThrow();
  expect(()=>assemblePhase7FinalGroupCandidate(contract,profile,[f,t],{...scope,evidence:{"T-6h":e,"T-90m":{...q,flightInstanceId:"leg:synthetic:other"}}},now)).toThrow();
  expect(()=>assemblePhase7FinalGroupCandidate(contract,profile,[f],{...scope,evidence:{"T-90m":q}},now)).toThrow();
  expect(()=>assemblePhase7FinalGroupCandidate(contract,profile,[f],{...scope,groupSettlementDue:false,evidence:{}},now)).toThrow();
 });
});

describe("independent exact POST settlement wire (synthetic signer only)",()=>{
 it("authenticates binding and reproducible bytes, rejects wrong source/group/signature/time",()=>{
  const fragment=pre("T-6h"),e=outcome("T-6h"),s={...scope,evidence:{"T-6h":e}};
  const ids={continuousPacketId:randomUUID(),missingPreRows:{"T-24h":randomUUID(),"T-90m":randomUUID()}};
  const a=assemblePhase7FinalGroupCandidate(contract,profile,[fragment],s,now,ids);
  expect(assemblePhase7FinalGroupCandidate(contract,profile,[fragment],s,now,ids)).toEqual(a);
  expect(()=>assemblePhase7FinalGroupCandidate(contract,profile,[fragment],s,now,{...ids,continuousPacketId:fragment.packet.rows[0].releaseRowId})).toThrow("reviewer-opaque-ids");
  const b:Phase7DurableDerivedBundle={schema:"v39.phase7.durable-derived-bundle.v1",packet:a.packet,paired:{...a.association,schema:"v39.phase7.paired-derived-association-reviewed.v1",approvedForUse:true},continuous:a.continuous};
  const approval:Phase7DurableBundleApproval={schema:"v39.phase7.durable-derived-bundle-independent-review.v1",contractSha256:hashPhase7DurableCandidate(contract),bundleSha256:hashPhase7DurableCandidate(b),sourceParityReviewSha256:sha("parity"),reconstructionReviewSha256:sha("reconstruction"),fieldReviewSha256:sha("fields"),associationReviewSha256:s.associationReviewSha256,continuousTargetReviewSha256:sha("target"),approvedForDurableStorage:true,sourceMappingPersisted:false,minTargetMinutes:-60,maxTargetMinutes:1440};
  const anchor:P6PostPreservationAnchor={manifestSha256:sha("manifest"),rightsSha256:sha("rights"),queryDigestSha256:sha("query"),snapshotId:"42",runDayIndex:1,airportIcao:"WSSS",frameSha256:sha("frame"),flightInstanceId:e.flightInstanceId,horizon:e.horizon,selectedNativeTUtc:e.selectedNativeTUtc,preIssuedAtUtc:e.preIssuedAtUtc,originalSourceAvailableAtUtc:e.originalSourceAvailableAtUtc,sourceExpiresAtUtc:"2026-11-22T20:00:00.000Z",sourceResponseSha256:e.frozenSourceOriginalSha256,ambiguousIdentity:false};
  const committed={packet:{manifestSha256:anchor.manifestSha256,reviewedSourceRightsSha256:anchor.rightsSha256,runDayIndex:1,airportIcao:"WSSS",reviewedFrameSha256:anchor.frameSha256},populationQueryId:randomUUID(),responseSha256:sha("synthetic post"),normalizedMembers:1,reservationSha256:sha("reservation")} as P6PostCommittedScope;
  const {privateKey,publicKey}=generateKeyPairSync("ed25519"),policySha256=sha("protected policy");
  const env={P6_PHASE7_POST_PRESERVATION_POLICY_SHA256:policySha256,P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256:createHash("sha256").update(publicKey.export({format:"der",type:"spki"})).digest("hex"),P6_PHASE7_POST_OUTCOME_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(publicKey.export({format:"pem",type:"spki"})).toString("base64")};
  const payload={schema:"v39.phase7.exact-post-group-settlement.v1",policySha256,manifestSha256:anchor.manifestSha256,rightsSha256:anchor.rightsSha256,anchorSha256:hashPhase7DurableCandidate(anchor),committedPostSha256:hashPhase7DurableCandidate(committed),fragmentsSha256:phase7PostFragmentsDigest([fragment]),reviewedAtUtc:now,validUntilUtc:"2026-11-22T09:00:00.000Z",releasedAtUtc:now,scope:s,assemblyIds:ids,approval};
  const wireFor=(p:unknown)=>{const raw=Buffer.from(JSON.stringify(p));return {payloadBase64:raw.toString("base64"),signatureBase64:sign(null,raw,privateKey).toString("base64")}};
  const args={env,wire:wireFor(payload),committed,anchor,fragments:[fragment],contract,profile,observedDbClockUtc:"2026-11-22T08:01:00.000Z"};
  expect(verifyPhase7SignedPostSettlement(args).bundle).toEqual(b);
  expect(()=>verifyPhase7SignedPostSettlement({...args,committed:{...committed,responseSha256:sha("wrong")}})).toThrow("EXACT_SCOPE");
  expect(()=>verifyPhase7SignedPostSettlement({...args,anchor:{...anchor,ambiguousIdentity:true}})).toThrow("EXACT_SCOPE");
  expect(()=>verifyPhase7SignedPostSettlement({...args,observedDbClockUtc:payload.validUntilUtc})).toThrow("LIVE_SETTLEMENT_WINDOW");
  expect(()=>verifyPhase7SignedPostSettlement({...args,wire:wireFor({...payload,approval:{...approval,bundleSha256:sha("wrong")}})})).toThrow("exact-reviewed-bundle-bytes");
  expect(()=>verifyPhase7SignedPostSettlement({...args,wire:{...args.wire,signatureBase64:Buffer.alloc(64).toString("base64")}})).toThrow("SIGNATURE");
 });
});
