import {createHash, randomUUID} from "node:crypto";
import {
  hashPhase7DerivedReleasePacket,
  type Phase7DerivedReleasePacket,
} from "./phase6DerivedTrainingReleasePacket_v39";
import type {Phase7ReleaseCensoring} from "./phase6DerivedTrainingReleaseContract_v39";

/**
 * Amendment-E continuous T-6 gate-out target.
 *
 * Packet A remains the complete short-lived source-custody lane. This module
 * consumes exact Packet-A observations in memory, computes the signed continuous
 * delay, and emits only a random Packet-B row ID plus the derived numeric target
 * and censoring state. It never extends source retention or grants paid GO.
 *
 * The per-row observation/mapping receipt returned here is explicitly ephemeral:
 * it exists only so the transform can be audited while Packet A is still alive
 * and must expire no later than the reviewed source-to-release mapping window.
 */
const SHA256=/^[a-f0-9]{64}$/i;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SAFE_VERSION=/^[a-z][a-z0-9_.-]{2,80}$/;
const CENSORING=["observed","censored","missing","not_due"] as const;

export interface Phase7ContinuousGateOutTargetProfileV39 {
  schema:"v39.phase7.continuous-gate-out-target-profile.v1";
  version:string;
  termsReviewSha256:string;
  boundedSourceUseReviewSha256:string;
  fieldInventoryReviewSha256:string;
  derivedWorkReviewSha256:string;
  transformReviewSha256:string;
  primaryHorizon:"T-6h";
  unit:"minutes";
  mappingExpiryHours:number;
  minValue:number;
  maxValue:number;
  approvedForUse:true;
  requiresSeparateObservations:true;
  temporaryMappingMustExpire:true;
  sourceIdentityOutput:false;
  sourceTimestampOutput:false;
  sourceRecordOutput:false;
  providerValueOutput:false;
}

export interface Phase7ContinuousGateOutObservationInputV39 {
  releaseRowId:string;
  scheduledGateOutUtc:string;
  actualGateOutUtc:string|null;
  scheduleObservedAtUtc:string;
  actualObservedAtUtc:string|null;
  scheduleObservationEvidenceSha256:string;
  actualObservationEvidenceSha256:string|null;
  sourceObservationCount:number;
  mappingCreatedAtUtc:string;
  mappingExpiresAtUtc:string;
  derivedAtUtc:string;
  censoring:Phase7ReleaseCensoring;
}

export interface Phase7ContinuousGateOutTargetPacketV39 {
  schema:"v39.phase7.continuous-gate-out-target-packet.v1";
  packetId:string;
  derivedPacketSha256:string;
  targetName:"gate_out_delay_minutes";
  unit:"minutes";
  primaryHorizon:"T-6h";
  rows:readonly {
    releaseRowId:string;
    value:number|null;
    censoring:Phase7ReleaseCensoring;
  }[];
}

export interface Phase7ContinuousGateOutEphemeralReceiptV39 {
  schema:"v39.phase7.continuous-gate-out-target-ephemeral-receipt.v1";
  releaseRowId:string;
  inputTupleSha256:string;
  scheduleObservationEvidenceSha256:string;
  actualObservationEvidenceSha256:string|null;
  mappingExpiresAtUtc:string;
  derivedAtUtc:string;
  deleteNoLaterThanUtc:string;
  longLivedRelease:false;
}

export interface Phase7ContinuousGateOutBuildReceiptV39 {
  schema:"v39.phase7.continuous-gate-out-target-build-receipt.v1";
  packetId:string;
  packetSha256:string;
  derivedPacketSha256:string;
  rowCount:number;
  transformReviewSha256:string;
  mappingExpiryHours:number;
  sourceValuesPersisted:false;
  sourceTimestampsPersisted:false;
  sourceIdentityPersisted:false;
  sourceRecordsPersisted:false;
  providerCalls:0;
  databaseWrites:0;
  authorizationEnabled:false;
  phase6PaidGo:false;
}

export interface Phase7ContinuousGateOutBuildResultV39 {
  packet:Phase7ContinuousGateOutTargetPacketV39;
  receipt:Phase7ContinuousGateOutBuildReceiptV39;
  ephemeralReceipts:readonly Phase7ContinuousGateOutEphemeralReceiptV39[];
}

export interface Phase7ContinuousGateOutVerdictV39 {
  pass:boolean;
  failures:string[];
}

const PROFILE_KEYS=[
  "schema","version","termsReviewSha256","boundedSourceUseReviewSha256",
  "fieldInventoryReviewSha256","derivedWorkReviewSha256","transformReviewSha256",
  "primaryHorizon","unit","mappingExpiryHours","minValue","maxValue",
  "approvedForUse","requiresSeparateObservations","temporaryMappingMustExpire",
  "sourceIdentityOutput","sourceTimestampOutput","sourceRecordOutput","providerValueOutput",
] as const;
const INPUT_KEYS=[
  "releaseRowId","scheduledGateOutUtc","actualGateOutUtc","scheduleObservedAtUtc",
  "actualObservedAtUtc","scheduleObservationEvidenceSha256",
  "actualObservationEvidenceSha256","sourceObservationCount","mappingCreatedAtUtc",
  "mappingExpiresAtUtc","derivedAtUtc","censoring",
] as const;

function plain(x:unknown):x is Record<string,unknown>{
  if(x===null||typeof x!=="object"||Array.isArray(x))return false;
  const p=Object.getPrototypeOf(x);
  return p===Object.prototype||p===null;
}
function exact(x:Record<string,unknown>,keys:readonly string[]):boolean{
  const a=Object.keys(x).sort(),b=[...keys].sort();
  return a.length===b.length&&a.every((k,i)=>k===b[i]);
}
function sha(x:unknown):x is string{
  return typeof x==="string"&&SHA256.test(x)&&!/^([a-f0-9])\1{63}$/i.test(x);
}
function utc(x:unknown):x is string{
  return typeof x==="string"&&UTC.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
}
function unique(xs:string[]):string[]{return [...new Set(xs)].sort();}
function canonical(x:unknown):string{
  if(x===null||x===undefined)return "null";
  if(typeof x!=="object")return JSON.stringify(x);
  if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";
  const r=x as Record<string,unknown>;
  return "{"+Object.keys(r).sort().map(k=>JSON.stringify(k)+":"+canonical(r[k])).join(",")+"}";
}
function tupleHash(x:Phase7ContinuousGateOutObservationInputV39):string{
  return createHash("sha256").update(canonical({
    scheduledGateOutUtc:x.scheduledGateOutUtc,
    actualGateOutUtc:x.actualGateOutUtc,
    scheduleObservedAtUtc:x.scheduleObservedAtUtc,
    actualObservedAtUtc:x.actualObservedAtUtc,
    scheduleObservationEvidenceSha256:x.scheduleObservationEvidenceSha256,
    actualObservationEvidenceSha256:x.actualObservationEvidenceSha256,
    sourceObservationCount:x.sourceObservationCount,
    censoring:x.censoring,
  }),"utf8").digest("hex");
}

export function validatePhase7ContinuousGateOutTargetProfileV39(
  profile:unknown,
):Phase7ContinuousGateOutVerdictV39{
  const f:string[]=[];
  if(!plain(profile))return {pass:false,failures:["profile-not-object"]};
  if(!exact(profile,PROFILE_KEYS))f.push("profile-extra-or-missing-keys");
  const p=profile as unknown as Partial<Phase7ContinuousGateOutTargetProfileV39>;
  if(p.schema!=="v39.phase7.continuous-gate-out-target-profile.v1")f.push("schema-invalid");
  if(typeof p.version!=="string"||!SAFE_VERSION.test(p.version))f.push("version-invalid");
  for(const k of ["termsReviewSha256","boundedSourceUseReviewSha256","fieldInventoryReviewSha256",
    "derivedWorkReviewSha256","transformReviewSha256"] as const){
    if(!sha(p[k]))f.push(k+"-invalid");
  }
  if(p.primaryHorizon!=="T-6h"||p.unit!=="minutes")f.push("amendment-e-scope-invalid");
  if(!Number.isInteger(p.mappingExpiryHours)||Number(p.mappingExpiryHours)<1||Number(p.mappingExpiryHours)>24)
    f.push("mapping-expiry-invalid");
  if(typeof p.minValue!=="number"||!Number.isFinite(p.minValue)||typeof p.maxValue!=="number"||
     !Number.isFinite(p.maxValue)||p.minValue>=p.maxValue)f.push("target-range-invalid");
  if(p.approvedForUse!==true)f.push("independent-approval-required");
  if(p.requiresSeparateObservations!==true)f.push("separate-observations-required");
  if(p.temporaryMappingMustExpire!==true)f.push("temporary-mapping-expiry-required");
  if(p.sourceIdentityOutput!==false||p.sourceTimestampOutput!==false||
     p.sourceRecordOutput!==false||p.providerValueOutput!==false)
    f.push("long-lived-source-output-forbidden");
  return {pass:f.length===0,failures:unique(f)};
}

function validateInput(
  input:unknown,
  profile:Phase7ContinuousGateOutTargetProfileV39,
  rowCensoring:Phase7ReleaseCensoring|undefined,
):Phase7ContinuousGateOutVerdictV39{
  const f:string[]=[];
  if(!plain(input))return {pass:false,failures:["input-not-object"]};
  if(!exact(input,INPUT_KEYS))f.push("input-extra-or-missing-keys");
  const x=input as unknown as Phase7ContinuousGateOutObservationInputV39;
  if(typeof x.releaseRowId!=="string"||!UUID.test(x.releaseRowId))f.push("release-row-id-invalid");
  for(const k of ["scheduledGateOutUtc","scheduleObservedAtUtc","mappingCreatedAtUtc",
    "mappingExpiresAtUtc","derivedAtUtc"] as const)if(!utc(x[k]))f.push(k+"-invalid");
  if(x.actualGateOutUtc!==null&&!utc(x.actualGateOutUtc))f.push("actual-gate-out-invalid");
  if(x.actualObservedAtUtc!==null&&!utc(x.actualObservedAtUtc))f.push("actual-observed-at-invalid");
  if(!sha(x.scheduleObservationEvidenceSha256))f.push("schedule-evidence-invalid");
  if(x.actualObservationEvidenceSha256!==null&&!sha(x.actualObservationEvidenceSha256))
    f.push("actual-evidence-invalid");
  if(!Number.isInteger(x.sourceObservationCount)||x.sourceObservationCount<1||x.sourceObservationCount>64)
    f.push("source-observation-count-invalid");
  if(!CENSORING.includes(x.censoring as typeof CENSORING[number]))f.push("censoring-invalid");
  if(rowCensoring===undefined)f.push("release-row-not-found");
  else if(rowCensoring!==x.censoring)f.push("release-row-censoring-mismatch");

  const created=Date.parse(x.mappingCreatedAtUtc),expires=Date.parse(x.mappingExpiresAtUtc),derived=Date.parse(x.derivedAtUtc);
  if(Number.isFinite(created)&&Number.isFinite(expires)){
    if(expires<=created)f.push("mapping-expiry-order-invalid");
    if(expires-created>profile.mappingExpiryHours*60*60*1000)f.push("mapping-expiry-exceeds-profile");
  }
  if(Number.isFinite(created)&&Number.isFinite(derived)&&Number.isFinite(expires)&&
     (derived<created||derived>=expires))f.push("derived-outside-temporary-mapping-window");
  const scheduled=Date.parse(x.scheduledGateOutUtc),scheduleSeen=Date.parse(x.scheduleObservedAtUtc);
  if(Number.isFinite(scheduleSeen)&&Number.isFinite(derived)&&scheduleSeen>derived)
    f.push("schedule-observation-after-derived");
  if(Number.isFinite(scheduleSeen)&&Number.isFinite(scheduled)&&scheduleSeen>=scheduled)
    f.push("schedule-observation-not-pre-event");

  if(x.censoring==="observed"){
    if(x.actualGateOutUtc===null||x.actualObservedAtUtc===null||x.actualObservationEvidenceSha256===null)
      f.push("observed-actual-evidence-required");
    if(x.sourceObservationCount<2)f.push("observed-requires-multiple-observations");
    if(x.actualObservationEvidenceSha256!==null&&x.actualObservationEvidenceSha256===x.scheduleObservationEvidenceSha256)
      f.push("observed-evidence-must-be-distinct");
    const actualSeen=x.actualObservedAtUtc===null?NaN:Date.parse(x.actualObservedAtUtc);
    const actual=x.actualGateOutUtc===null?NaN:Date.parse(x.actualGateOutUtc);
    if(Number.isFinite(actualSeen)&&Number.isFinite(derived)&&actualSeen>derived)
      f.push("actual-observation-after-derived");
    if(Number.isFinite(scheduleSeen)&&Number.isFinite(actualSeen)&&actualSeen<=scheduleSeen)
      f.push("observations-not-separate-over-time");
    if(Number.isFinite(actual)&&Number.isFinite(actualSeen)&&actualSeen<actual)
      f.push("actual-observation-before-event");
  }else{
    if(x.actualGateOutUtc!==null||x.actualObservedAtUtc!==null||x.actualObservationEvidenceSha256!==null)
      f.push("nonobserved-must-not-carry-actual-source-values");
  }
  return {pass:f.length===0,failures:unique(f)};
}

function delayMinutes(
  input:Phase7ContinuousGateOutObservationInputV39,
  profile:Phase7ContinuousGateOutTargetProfileV39,
):number|null{
  if(input.censoring!=="observed")return null;
  const value=(Date.parse(input.actualGateOutUtc as string)-Date.parse(input.scheduledGateOutUtc))/60000;
  const stable=Number(value.toFixed(6));
  if(!Number.isFinite(stable)||stable<profile.minValue||stable>profile.maxValue)
    throw new Error("PHASE7_CONTINUOUS_GATEOUT_REJECTED:target-range");
  return stable;
}

export function buildPhase7ContinuousGateOutTargetV39(
  profile:Phase7ContinuousGateOutTargetProfileV39,
  derivedPacket:Phase7DerivedReleasePacket,
  inputs:readonly Phase7ContinuousGateOutObservationInputV39[],
  packetId=randomUUID(),
):Phase7ContinuousGateOutBuildResultV39{
  const pv=validatePhase7ContinuousGateOutTargetProfileV39(profile);
  if(!pv.pass)throw new Error("PHASE7_CONTINUOUS_GATEOUT_REJECTED_PROFILE:"+pv.failures.join(","));
  if(!plain(derivedPacket)||!Array.isArray(derivedPacket.rows)||inputs.length<1||inputs.length>100000||
     !UUID.test(packetId))throw new Error("PHASE7_CONTINUOUS_GATEOUT_REJECTED:packet-shape");

  const rowById=new Map(derivedPacket.rows.map(row=>[row.releaseRowId,row]));
  const seen=new Set<string>();
  const rows:Phase7ContinuousGateOutTargetPacketV39["rows"][number][]=[];
  const ephemeralReceipts:Phase7ContinuousGateOutEphemeralReceiptV39[]=[];
  for(const raw of inputs){
    const row=plain(raw)&&typeof raw.releaseRowId==="string"?rowById.get(raw.releaseRowId):undefined;
    const v=validateInput(raw,profile,row?.censoring);
    if(!v.pass)throw new Error("PHASE7_CONTINUOUS_GATEOUT_REJECTED_INPUT:"+v.failures.join(","));
    const input=raw as Phase7ContinuousGateOutObservationInputV39;
    if(seen.has(input.releaseRowId))throw new Error("PHASE7_CONTINUOUS_GATEOUT_REJECTED:duplicate-release-row-id");
    seen.add(input.releaseRowId);
    if(row?.horizon!=="T-6h")throw new Error("PHASE7_CONTINUOUS_GATEOUT_REJECTED:release-row-not-t6");
    rows.push(Object.freeze({
      releaseRowId:input.releaseRowId,
      value:delayMinutes(input,profile),
      censoring:input.censoring,
    }));
    ephemeralReceipts.push(Object.freeze({
      schema:"v39.phase7.continuous-gate-out-target-ephemeral-receipt.v1",
      releaseRowId:input.releaseRowId,
      inputTupleSha256:tupleHash(input),
      scheduleObservationEvidenceSha256:input.scheduleObservationEvidenceSha256,
      actualObservationEvidenceSha256:input.actualObservationEvidenceSha256,
      mappingExpiresAtUtc:input.mappingExpiresAtUtc,
      derivedAtUtc:input.derivedAtUtc,
      deleteNoLaterThanUtc:input.mappingExpiresAtUtc,
      longLivedRelease:false,
    }));
  }
  const packet:Phase7ContinuousGateOutTargetPacketV39=Object.freeze({
    schema:"v39.phase7.continuous-gate-out-target-packet.v1",
    packetId,
    derivedPacketSha256:hashPhase7DerivedReleasePacket(derivedPacket),
    targetName:"gate_out_delay_minutes",
    unit:"minutes",
    primaryHorizon:"T-6h",
    rows:Object.freeze(rows),
  });
  const packetSha256=hashPhase7ContinuousGateOutTargetPacketV39(packet);
  return Object.freeze({
    packet,
    receipt:Object.freeze({
      schema:"v39.phase7.continuous-gate-out-target-build-receipt.v1",
      packetId,
      packetSha256,
      derivedPacketSha256:packet.derivedPacketSha256,
      rowCount:rows.length,
      transformReviewSha256:profile.transformReviewSha256,
      mappingExpiryHours:profile.mappingExpiryHours,
      sourceValuesPersisted:false,
      sourceTimestampsPersisted:false,
      sourceIdentityPersisted:false,
      sourceRecordsPersisted:false,
      providerCalls:0,
      databaseWrites:0,
      authorizationEnabled:false,
      phase6PaidGo:false,
    }),
    ephemeralReceipts:Object.freeze(ephemeralReceipts),
  });
}

export function hashPhase7ContinuousGateOutTargetPacketV39(
  packet:Phase7ContinuousGateOutTargetPacketV39,
):string{
  return createHash("sha256").update(canonical(packet),"utf8").digest("hex");
}

export const PHASE7_CONTINUOUS_GATEOUT_BOUNDARY_V39=Object.freeze({
  packetAChanged:false as const,
  packetBOnly:true as const,
  sourceRetentionExtension:false as const,
  temporaryMappingMustExpire:true as const,
  providerCalls:0 as const,
  databaseWrites:0 as const,
  authorizationEnabled:false as const,
  phase6PaidGo:false as const,
});
