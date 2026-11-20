/** Assemble a single already-preserved flight group after bounded same-leg
 * evidence has been authenticated externally. Never re-read expired raw
 * FIDS, synthesize actual gate-out, or silently drop a T6-only primary row.
 * Durable PRE row IDs remain fixed; group UUID is also the final packet
 * ID so a group can be finalized at most once by the existing unique sink.
 */
import {createHash,randomUUID} from "node:crypto";
import {createPhase7DerivedReleasePacket,serializePhase7DerivedReleasePacket,type Phase7DerivedReleasePacket} from "./phase6DerivedTrainingReleasePacket_v39";
import type {Phase7DerivedReleaseContract,Phase7DerivedReleaseRow,Phase6ReleaseHorizon,Phase7ReleaseCensoring} from "./phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ReviewedTransformationProfile} from "./phase7ReviewedSourceTransformation_v39";
import {transformPhase7ReviewedSourceDecisions} from "./phase7ReviewedSourceTransformation_v39";
import {assessP5AmendmentEGateOutDelayCandidate,type P5EGateOutFirstCycleInput} from "./phase5AmendmentEGateOutDelayLabel_v39";
import {hashPhase7DurableCandidate,type Phase7DurableDerivedBundle} from "./phase7DurableDerivedBundleCandidate_v39";
const H=/^[a-f0-9]{64}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const isGroupUuid=(value:string): value is ReturnType<typeof randomUUID>=>UUID.test(value);
const hs=["T-24h","T-6h","T-90m"] as const;
const need=(v:unknown,s:string)=>{if(!v)throw Error("PHASE7_FINAL_GROUP_REJECTED:"+s)};
const sha=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
const validHash=(x:unknown):x is string=>typeof x==="string"&&H.test(x)&&!/^([a-f0-9])\1{63}$/.test(x);
function clock(s:string){const n=Date.parse(s);need(Number.isFinite(n)&&new Date(n).toISOString()===s,"clock");return n}
// Distinct from source/transform missingness flags 1..32. An absent PRE is
// a denominator placeholder only, never a real source-qualified prediction.
export const P7_ABSENT_PRE_PLACEHOLDER=0x40000000;
export const P7_CANCELLED_SEPARATE_OUTCOME=0x20000000;
export const P7_NO_VERIFIED_LABEL=0x10000000;
export interface Phase7StoredPreFragment{
 groupId:string;contractSha256:string;profileSha256:string;packetSha256:string;
 packet:Phase7DerivedReleasePacket;
}
export interface Phase7GroupOutcomeScope{
 // Authenticated by the real private independent reviewer / live scoped
 // reader, not by these strings or this pure assembly function.
 groupId:string;associationReviewSha256:string;outcomeReviewSha256:string;
 groupSettlementDue:boolean;
 /** null = no independently authenticated outcome/clock for this horizon.
  * For a live earlier anchor expiry, only a lawful separately authenticated
  * same-leg source may supply the earlier evaluation facts. */
 evidence:Readonly<Partial<Record<Phase6ReleaseHorizon,P5EGateOutFirstCycleInput|null>>>;
}
/** Explicit reviewer-issued opaque UUIDs permit reproducible exact bytes.
 * They are not derived from a source identifier and must not be reused.
 * Existing offline assembly may still generate fresh random UUIDs. */
export interface Phase7FinalAssemblyIds{
 continuousPacketId:string;
 missingPreRows:Readonly<Partial<Record<Phase6ReleaseHorizon,string>>>;
}
export function assemblePhase7FinalGroupCandidate(contract:Phase7DerivedReleaseContract,profile:Phase7ReviewedTransformationProfile,fragments:readonly Phase7StoredPreFragment[],scope:Phase7GroupOutcomeScope,releasedAtUtc:string,ids?:Phase7FinalAssemblyIds){
 const groupId=scope.groupId;
 if(!isGroupUuid(groupId))throw Error("PHASE7_FINAL_GROUP_REJECTED:scope");
 const now=clock(releasedAtUtc),contractSha=hashPhase7DurableCandidate(contract),profileSha=hashPhase7DurableCandidate(profile);
 need(now<clock(contract.researchExpiryUtc)&&scope.groupSettlementDue===true&&validHash(scope.associationReviewSha256)&&validHash(scope.outcomeReviewSha256)&&fragments.length>=1&&fragments.length<=3&&hs.every(h=>contract.allowedHorizons.includes(h))&&contract.allowedHorizons.length===3,"scope");
 need(Object.keys(scope.evidence).every(k=>hs.includes(k as Phase6ReleaseHorizon)),"unrecognized-horizon");
 const byHorizon=new Map<Phase6ReleaseHorizon,Phase7DerivedReleaseRow>(),rowIds=new Set<string>();
 for(const f of fragments){
  need(f.groupId===scope.groupId&&f.contractSha256===contractSha&&f.profileSha256===profileSha&&sha(serializePhase7DerivedReleasePacket(contract,f.packet))===f.packetSha256&&f.packet.rows.length===1,"stored-fragment-binding");
  const r=f.packet.rows[0];
  need(r.censoring==="not_due"&&r.qualityFlags<P7_NO_VERIFIED_LABEL&&Object.values(r.labelBuckets).every(v=>v===null)&&!byHorizon.has(r.horizon)&&!rowIds.has(r.releaseRowId),"stored-pre-only");
  rowIds.add(r.releaseRowId);byHorizon.set(r.horizon,r);
 }
 if(ids){
  const missing=hs.filter(h=>!byHorizon.has(h));
  const supplied=[ids.continuousPacketId,...Object.values(ids.missingPreRows)];
  need(Object.keys(ids).sort().join("|")==="continuousPacketId|missingPreRows"&&
   Object.keys(ids.missingPreRows).length===missing.length&&missing.every(h=>Object.hasOwn(ids.missingPreRows,h))&&
   supplied.every(x=>typeof x==="string"&&UUID.test(x)&&x!==groupId&&!rowIds.has(x))&&
   new Set(supplied).size===supplied.length,"reviewer-opaque-ids");
 }
 const anchor=fragments[0].packet.rows[0];
 need(fragments.every(f=>f.packet.rows[0].split===anchor.split&&f.packet.rows[0].cohortBucket===anchor.cohortBucket),"group-cohort-drift");
 const present:Record<Phase6ReleaseHorizon,boolean>={"T-24h":false,"T-6h":false,"T-90m":false};
 const labelByHorizon=new Map<Phase6ReleaseHorizon,number|null>();
 const rows:Phase7DerivedReleaseRow[]=[];
 let witnessedLeg:string|null=null,witnessedNativeT:string|null=null,verifiedDelay:number|null=null;
 const emptyLabels=()=>Object.fromEntries(contract.labels.map(l=>[l.name,null]));
 const emptyFeatures=()=>Object.fromEntries(contract.features.map(f=>[f.name,null]));
 for(const h of hs){
  const r=byHorizon.get(h),e=scope.evidence[h];
  if(!r){
   need(e===undefined||e===null,"no-outcome-for-absent-pre");
   const feat=emptyFeatures(),lab=emptyLabels();
   rows.push({releaseRowId:ids?.missingPreRows[h]??randomUUID(),horizon:h,cohortBucket:anchor.cohortBucket,split:anchor.split,featureBuckets:feat,labelBuckets:lab,missingness:Object.fromEntries([...Object.keys(feat),...Object.keys(lab)].map(k=>[k,true])),qualityFlags:P7_ABSENT_PRE_PLACEHOLDER|P7_NO_VERIFIED_LABEL,censoring:"missing"});
   labelByHorizon.set(h,null);continue;
  }
  present[h]=true;
  let value:number|null=null,censoring:Phase7ReleaseCensoring="censored",flags=r.qualityFlags|P7_NO_VERIFIED_LABEL;
  let labels:Record<string,number|null>=emptyLabels();
  if(e){
   need(e.horizon===h&&(e.outcome.firstAvailableAtUtc===null||clock(e.outcome.firstAvailableAtUtc)<=now),"outcome-horizon-or-future-clock");
   if(witnessedLeg!==null)need(e.flightInstanceId===witnessedLeg&&e.selectedNativeTUtc===witnessedNativeT,"cross-leg-or-native-t");
   witnessedLeg=e.flightInstanceId;witnessedNativeT=e.selectedNativeTUtc;
   const v=assessP5AmendmentEGateOutDelayCandidate(e);
   if(v.status==="PENDING_GATE_OUT_EVIDENCE")throw Error("PHASE7_FINAL_GROUP_REJECTED:outcome-not-settled");
   if(v.status==="CANCELLATION_SEPARATE_OUTCOME")flags|=P7_CANCELLED_SEPARATE_OUTCOME;
   if(v.hasNumericalCandidate){
    value=v.candidateDelayMinutes!;
    if(verifiedDelay!==null)need(Math.abs(verifiedDelay-value)<0.0000005,"same-leg-label-disagreement");
    verifiedDelay=value;censoring="observed";flags=r.qualityFlags;
    const labDecisions=profile.fields.filter(x=>x.role==="label"&&x.sourceField==="gate_out_delay_minutes").map(x=>({sourceField:x.sourceField,value,availableAtUtc:e.outcome.firstAvailableAtUtc,missingReason:null,rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW" as const}));
    const result=transformPhase7ReviewedSourceDecisions(profile,contract,labDecisions,{horizon:h,cohortBucket:r.cohortBucket,split:r.split,censoring,issuedAtUtc:e.preIssuedAtUtc,releasedAtUtc});
    labels=result.input.labelBuckets;
   }else need(e.outcome.recoveryGraceElapsed||v.status==="CANCELLATION_SEPARATE_OUTCOME","unsettled-unverified-label");
  }
  labelByHorizon.set(h,value);
  // Feature values, IDs, cohort and split remain exactly as committed PRE.
  rows.push({...r,labelBuckets:labels,missingness:{...Object.fromEntries(Object.entries(r.featureBuckets).map(([k,v])=>[k,v===null])),...Object.fromEntries(Object.entries(labels).map(([k,v])=>[k,v===null]))},qualityFlags:flags,censoring});
 }
 const packet=createPhase7DerivedReleasePacket(contract,rows,groupId);
 const packetSha=sha(serializePhase7DerivedReleasePacket(contract,packet)),t6=rows[1];
 const continuous:Phase7DurableDerivedBundle["continuous"]={schema:"v39.phase7.continuous-gate-out-target-packet.v1",packetId:ids?.continuousPacketId??randomUUID(),derivedPacketSha256:packetSha,targetName:"gate_out_delay_minutes",unit:"minutes",primaryHorizon:"T-6h",rows:[{releaseRowId:t6.releaseRowId,value:labelByHorizon.get("T-6h")??null,censoring:t6.censoring}]};
 return {packet,association:{schema:"v39.phase7.paired-derived-association-candidate.v1" as const,packetSha256:packetSha,reviewEvidenceSha256:scope.associationReviewSha256,groups:[{groupId:scope.groupId,split:anchor.split,rows:rows.map(r=>({horizon:r.horizon,releaseRowId:r.releaseRowId}))}],sourceMappingPersisted:false as const,approvedForUse:false as const},continuous,denominator:{present,primaryPrePresent:present["T-6h"],primaryNumeric:labelByHorizon.get("T-6h")!==null&&present["T-6h"],pairedT6T90Numerical:present["T-6h"]&&present["T-90m"]&&labelByHorizon.get("T-6h")!==null&&labelByHorizon.get("T-90m")!==null,t24ComparatorNumerical:present["T-24h"]&&labelByHorizon.get("T-24h")!==null},sourceMembershipAuthenticatedHere:false,sourceValuesPersisted:false,approvedForDurableStorage:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
