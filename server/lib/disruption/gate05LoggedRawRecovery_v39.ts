/**
 * Future Gate05: recover partial observation facts from a verified LOGGED
 * provider blob ref after UNLOGGED delivery/item tables are lost (e.g. PG
 * postmaster restart). Pure; no credentials, API, DB, blob I/O, mutation.
 *
 * Caller obtains the ORIGINAL bytes lawfully via private dedicated App Storage
 * during retention, and a LOGGED provider_content_blob_ref anchored to one
 * PREAUTHORIZED exact session. Never emit raw bytes or flight data to CI logs.
 *
 * Flight identity, 2xx ACK clocks, actual runway semantics and independent
 * target recovery CANNOT be reconstructed from source metadata alone. This
 * reader explicitly refuses to manufacture them. A full scientific Gate05
 * requires real receiver event/ACK evidence DURING the prospective window.
 */
import {createHash} from "node:crypto";
import type {Gate05RawItemV39} from "./gate05ObservedSampleCensus_v39";

export const GATE05_RECOVERY_VERSION_V39 =
  "v39.gate05.original-raw-recovery.v1" as const;
const HASH=/^[a-f0-9]{64}$/;
const SESSION=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const DELIVERY=/^ppd_[a-f0-9]{64}$/;
const EXPLICIT_UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
const sha=(x:string|Uint8Array)=>createHash("sha256").update(x).digest("hex");
const record=(x:unknown):Record<string,unknown>|null=>
  x!==null&&typeof x==="object"&&!Array.isArray(x)?
    x as Record<string,unknown>:null;
function canonical(x:unknown):string{
  if(x===null||typeof x!=="object")return JSON.stringify(x);
  if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";
  const o=x as Record<string,unknown>;
  return "{"+Object.keys(o).sort().map(
    k=>JSON.stringify(k)+":"+canonical(o[k])
  ).join(",")+"}";
}
function parseUtc(s:string,tag:string):number{
  if(typeof s!=="string"||!EXPLICIT_UTC.test(s))
    throw Error("GATE05_RECOVERY_INVALID_UTC_"+tag);
  const ms=Date.parse(s);
  if(!Number.isFinite(ms)||
     new Date(ms).toISOString().slice(0,19)!==s.slice(0,19))
    throw Error("GATE05_RECOVERY_INVALID_UTC_"+tag);
  return ms;
}
export type Gate05DurableSourceRefV39=Readonly<{
  blobRefId:string;
  sourceKind:"webhook";
  sourceRecordId:string;
  contentClass:"raw_provider_content";
  storageKind:"replit_app_storage";
  contractVersion:string;
  contentSha256:string;
  contentBytes:number;
  persistedAtUtc:string;
  expiresAtUtc:string;
  deletedAtUtc:string|null;
}>;
export type Gate05RawRehydrationInputV39=Readonly<{
  expectedSessionId:string;
  expectedProviderSubscriptionId:string;
  source:Gate05DurableSourceRefV39;
  originalCanonicalBytes:Uint8Array;
  readBackAtUtc:string;
}>;
export type Gate05RawRehydrationV39=Readonly<{
  schema:typeof GATE05_RECOVERY_VERSION_V39;
  status:"PARTIAL_SOURCE_RECOVERED_IDENTITY_AND_ACK_UNVERIFIED";
  sourceBytesSha256Verified:true;
  physicalOperatingLegIdentityIndependentlyVerified:false;
  rawBefore2xxAckProven:false;
  terminalStateTransitionTimeProven:false;
  runwayActualitySourceVerified:false;
  scheduledWheelsOffSourceVerified:false;
  callbackItemCount:number;
  airborneLocationCandidateItems:number;
  completedStatusCandidateItems:number;
  observations:readonly Gate05RawItemV39[];
  strictGate05SciencePassed:false;
  providerCalls:0;
  dbWrites:0;
}>;
export function recoverGate05SourceFromLoggedRefV39(
  x:Gate05RawRehydrationInputV39
):Gate05RawRehydrationV39{
  if(!x||!SESSION.test(x.expectedSessionId)||
     typeof x.expectedProviderSubscriptionId!=="string"||
     !/^[A-Za-z0-9:_-]{8,180}$/.test(x.expectedProviderSubscriptionId)||
     !x.source||!Buffer.isBuffer(x.originalCanonicalBytes)&&
       !(x.originalCanonicalBytes instanceof Uint8Array)||
     x.originalCanonicalBytes.byteLength>5_000_000)
    throw Error("GATE05_RECOVERY_BAD_INPUT");
  const b=x.source;
  if(b.sourceKind!=="webhook"||
     b.storageKind!=="replit_app_storage"||
     b.contentClass!=="raw_provider_content"||
     b.contractVersion!=="provider-blob-contract-v39@1.0.0"||
     !SESSION.test(b.blobRefId)||
     !HASH.test(b.contentSha256)||
     !Number.isSafeInteger(b.contentBytes)||b.contentBytes<=0)
    throw Error("GATE05_RECOVERY_NOT_AUTHENTIC_BLOB_REF");
  const sourcePrefix="prepaid:"+x.expectedSessionId+":";
  if(!b.sourceRecordId.startsWith(sourcePrefix)||
     !DELIVERY.test(b.sourceRecordId.slice(sourcePrefix.length)))
    throw Error("GATE05_RECOVERY_FOREIGN_OR_MALFORMED_SCOPE");
  const at=parseUtc(x.readBackAtUtc,"read");
  const persisted=parseUtc(b.persistedAtUtc,"persisted");
  const expires=parseUtc(b.expiresAtUtc,"expires");
  if(b.deletedAtUtc!==null||persisted>at||at>=expires||expires<=persisted)
    throw Error("GATE05_RECOVERY_EXPIRED_OR_DELETED");
  const bytes=Buffer.from(x.originalCanonicalBytes);
  if(bytes.length!==b.contentBytes||sha(bytes)!==b.contentSha256)
    throw Error("GATE05_RECOVERY_RAW_BODY_INTEGRITY_ERROR");
  let original:string, parsed:unknown;
  try{
    original=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    parsed=JSON.parse(original);
  }catch{
    throw Error("GATE05_RECOVERY_INVALID_JSON");
  }
  if(canonical(parsed)!==original)
    throw Error("GATE05_RECOVERY_SOURCE_NOT_CANONICAL");
  const msg=record(parsed);
  if(!msg||record(msg.subscription)?.id!==x.expectedProviderSubscriptionId)
    throw Error("GATE05_RECOVERY_SUBSCRIPTION_UNVERIFIED");
  const flights=msg.flights;
  if(!Array.isArray(flights)||flights.length>5000)
    throw Error("GATE05_RECOVERY_FLIGHTS_MISSING_OR_EXCESSIVE");
  const envelopeId=sha(x.expectedSessionId+"|"+b.sourceRecordId);
  const when=new Date(persisted).toISOString();
  const observations:Gate05RawItemV39[]=[];
  let location=0,completed=0;
  for(let i=0;i<flights.length;i++){
    const f=record(flights[i]);
    if(!f)throw Error("GATE05_RECOVERY_ITEM_MALFORMED");
    // Retain no fake physical-flight instance after UNLOGGED identity loss.
    const cs=f.codeshareStatus;
    const role=cs===2||cs==="IsCodeshared"?"MARKETING":
      cs===1||cs==="IsOperator"?"OPERATOR":"UNKNOWN";
    const status=f.status;
    const landed=status===9||status==="Arrived";
    const airborne=[2,6,8,"EnRoute","Departed","Approaching"]
      .includes(status as string|number);
    const loc=record(f.location);
    const lat=loc?.lat,lon=loc?.lon,reported=loc?.reportedAtUtc;
    const geometry=typeof lat==="number"&&Number.isFinite(lat)&&
      lat>=-90&&lat<=90&&typeof lon==="number"&&Number.isFinite(lon)&&
      lon>=-180&&lon<=180;
    let atLoc:string|null=null;
    if(airborne&&geometry&&typeof reported==="string"){
      // Invalid provider native point is missingness, not an ACK/clock.
      try{atLoc=new Date(parseUtc(reported,"loc")).toISOString();}
      catch{atLoc=null;}
    }
    const stage=landed?"COMPLETED":airborne&&atLoc!==null?"AIRBORNE":"OTHER";
    if(stage==="COMPLETED")completed++;
    if(stage==="AIRBORNE")location++;
    observations.push({
      envelopeId,itemOrdinal:i,rawSha256:sha(canonical(f)),
      receivedAtUtc:when, // BOUND: blob persisted timestamp, NOT request receive
      rawDurableAtUtc:when,
      http2xxAtUtc:null,
      physicalFlightId:null,identityBasis:"UNKNOWN",
      codeshareRole:role,flightStage:stage,
      airbornePointUtc:stage==="AIRBORNE"?atLoc:null,
      terminalStateUpdatedAtUtc:null
    });
  }
  return {
    schema:GATE05_RECOVERY_VERSION_V39,
    status:"PARTIAL_SOURCE_RECOVERED_IDENTITY_AND_ACK_UNVERIFIED",
    sourceBytesSha256Verified:true,
    physicalOperatingLegIdentityIndependentlyVerified:false,
    rawBefore2xxAckProven:false,terminalStateTransitionTimeProven:false,
    runwayActualitySourceVerified:false,
    scheduledWheelsOffSourceVerified:false,
    callbackItemCount:observations.length,
    airborneLocationCandidateItems:location,
    completedStatusCandidateItems:completed,
    observations,strictGate05SciencePassed:false,
    providerCalls:0,dbWrites:0
  };
}
