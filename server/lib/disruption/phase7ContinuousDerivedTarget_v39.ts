import {createHash, randomUUID} from "node:crypto";
import {
  hashPhase7DerivedReleasePacket,
  type Phase7DerivedReleasePacket,
} from "./phase6DerivedTrainingReleasePacket_v39";
import type {Phase7ReleaseCensoring} from "./phase6DerivedTrainingReleaseContract_v39";

/**
 * Continuous Phase-7 regression target carried beside Packet B.
 *
 * This is intentionally NOT a source-custody record. It binds a reviewed
 * continuous derived value to Packet-B's random releaseRowId after source
 * timestamps/records have been excluded. Packet A remains unchanged.
 */
const SHA=/^[a-f0-9]{64}$/i;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE=/^[a-z][a-z0-9_]{2,80}$/;
const FORBIDDEN=/(provider|adb|raw|payload|response|timestamp|schedule|actual_time|record|source_id|retrieval_id)/i;
const CENSORING=["observed","censored","missing","not_due"] as const;

export interface Phase7ContinuousDerivedTargetContractV39 {
  schema:"v39.phase7.continuous-derived-target-contract.v1";
  version:string;
  targetName:string;
  unit:"minutes";
  primaryHorizon:"T-6h";
  termsReviewSha256:string;
  derivedWorkReviewSha256:string;
  transformEvidenceSha256:string;
  minValue:number;
  maxValue:number;
  nonReconstructable:true;
  sourceTimestampsPersisted:false;
  sourceRecordsPersisted:false;
  requiresMultipleObservationTransform:true;
}

export interface Phase7ContinuousDerivedTargetInputV39 {
  value:number|null;
  censoring:Phase7ReleaseCensoring;
}

export interface Phase7ContinuousDerivedTargetPacketV39 {
  schema:"v39.phase7.continuous-derived-target-packet.v1";
  packetId:string;
  derivedPacketSha256:string;
  targetName:string;
  rows:readonly {
    releaseRowId:string;
    value:number|null;
    censoring:Phase7ReleaseCensoring;
  }[];
}

const plain=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const exact=(x:Record<string,unknown>,keys:readonly string[])=>{
 const a=Object.keys(x).sort(),b=[...keys].sort();return a.length===b.length&&a.every((k,i)=>k===b[i]);
};
const goodSha=(x:unknown):x is string=>typeof x==="string"&&SHA.test(x)&&!/^([a-f0-9])\1{63}$/i.test(x);

export function validatePhase7ContinuousDerivedTargetContractV39(
 c:unknown,
):{pass:boolean;failures:string[]}{
 const f:string[]=[];
 if(!plain(c))return {pass:false,failures:["contract-not-object"]};
 if(!exact(c,["schema","version","targetName","unit","primaryHorizon","termsReviewSha256",
  "derivedWorkReviewSha256","transformEvidenceSha256","minValue","maxValue","nonReconstructable",
  "sourceTimestampsPersisted","sourceRecordsPersisted","requiresMultipleObservationTransform"]))
  f.push("contract-extra-or-missing-keys");
 const x=c as unknown as Phase7ContinuousDerivedTargetContractV39;
 if(x.schema!=="v39.phase7.continuous-derived-target-contract.v1")f.push("schema-invalid");
 if(typeof x.version!=="string"||!SAFE.test(x.version))f.push("version-invalid");
 if(typeof x.targetName!=="string"||!SAFE.test(x.targetName)||FORBIDDEN.test(x.targetName))f.push("target-name-forbidden");
 if(x.unit!=="minutes"||x.primaryHorizon!=="T-6h")f.push("amendment-e-target-scope-invalid");
 for(const k of ["termsReviewSha256","derivedWorkReviewSha256","transformEvidenceSha256"] as const)
  if(!goodSha(x[k]))f.push(k+"-invalid");
 if(typeof x.minValue!=="number"||!Number.isFinite(x.minValue)||typeof x.maxValue!=="number"||
    !Number.isFinite(x.maxValue)||x.minValue>=x.maxValue)f.push("target-range-invalid");
 if(x.nonReconstructable!==true||x.sourceTimestampsPersisted!==false||x.sourceRecordsPersisted!==false||
    x.requiresMultipleObservationTransform!==true)f.push("derived-boundary-not-approved");
 return {pass:f.length===0,failures:[...new Set(f)].sort()};
}

export function buildPhase7ContinuousDerivedTargetPacketV39(
 contract:Phase7ContinuousDerivedTargetContractV39,
 derivedPacket:Phase7DerivedReleasePacket,
 inputs:readonly Phase7ContinuousDerivedTargetInputV39[],
 packetId=randomUUID(),
):Phase7ContinuousDerivedTargetPacketV39{
 const cv=validatePhase7ContinuousDerivedTargetContractV39(contract);
 if(!cv.pass)throw Error("PHASE7_CONTINUOUS_TARGET_REJECTED:"+cv.failures.join(","));
 if(!UUID.test(packetId)||!plain(derivedPacket)||!Array.isArray(derivedPacket.rows)||
    inputs.length!==derivedPacket.rows.length||inputs.length<1)
  throw Error("PHASE7_CONTINUOUS_TARGET_REJECTED:packet-shape");
 const rows=inputs.map((input,i)=>{
  const id=derivedPacket.rows[i]?.releaseRowId;
  if(typeof id!=="string"||!UUID.test(id))throw Error("PHASE7_CONTINUOUS_TARGET_REJECTED:release-row-id");
  if(!plain(input)||!exact(input as unknown as Record<string,unknown>,["value","censoring"])||
     !CENSORING.includes(input.censoring as typeof CENSORING[number]))
    throw Error("PHASE7_CONTINUOUS_TARGET_REJECTED:input");
  const observed=input.censoring==="observed";
  if((observed&&(typeof input.value!=="number"||!Number.isFinite(input.value)||
      input.value<contract.minValue||input.value>contract.maxValue))||
     (!observed&&input.value!==null))
    throw Error("PHASE7_CONTINUOUS_TARGET_REJECTED:value-or-censoring");
  return Object.freeze({releaseRowId:id,value:input.value,censoring:input.censoring});
 });
 return Object.freeze({
  schema:"v39.phase7.continuous-derived-target-packet.v1",
  packetId,
  derivedPacketSha256:hashPhase7DerivedReleasePacket(derivedPacket),
  targetName:contract.targetName,
  rows:Object.freeze(rows),
 });
}

function canonical(x:unknown):string{
 if(x===null||x===undefined)return "null";
 if(typeof x!=="object")return JSON.stringify(x);
 if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";
 const r=x as Record<string,unknown>;
 return "{"+Object.keys(r).sort().map(k=>JSON.stringify(k)+":"+canonical(r[k])).join(",")+"}";
}
export function hashPhase7ContinuousDerivedTargetPacketV39(p:Phase7ContinuousDerivedTargetPacketV39):string{
 return createHash("sha256").update(canonical(p),"utf8").digest("hex");
}

export const PHASE7_CONTINUOUS_TARGET_BOUNDARY_V39=Object.freeze({
 packetAChanged:false as const,
 sourceTimestampsPersisted:false as const,
 sourceRecordsPersisted:false as const,
 providerCalls:0 as const,
 databaseWrites:0 as const,
 authorizationEnabled:false as const,
 phase6PaidGo:false as const,
});
