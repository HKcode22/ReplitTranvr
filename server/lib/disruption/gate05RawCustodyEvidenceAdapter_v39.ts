/**
 * Gate 0.5 §16 authenticated source adapter for the EXISTING prepaid path.
 * Pure function, NO SQL, bucket IO, provider calls, writes or raw output.
 * Inputs must be independently loaded from LOGGED provider_content_blob_ref,
 * UNLOGGED prepaid_probe_delivery_runtime + item_runtime and original
 * canonical App Storage bytes before contractual expiry. No provenance
 * inferred when UNLOGGED sources are lost after a postmaster restart.
 *
 * Actual HTTP 2xx receipt and provider-native terminal transition clocks
 * are NOT contained in these tables. They are NULL, never manufactured.
 */
import {createHash} from "node:crypto";
import type {Gate05RawItemV39} from "./gate05ObservedSampleCensus_v39";
export const GATE05_CUSTODY_ADAPTER_V39="v39.gate05.raw-custody-adapter.v1" as const;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const HEX=/^[a-f0-9]{64}$/;
const IDENT=/^[A-Za-z0-9:_-]{8,160}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
const obj=(x:unknown):Record<string,unknown>|null=>
  x!==null&&typeof x==="object"&&!Array.isArray(x)?
    x as Record<string,unknown>:null;
const digest=(x:string|Uint8Array)=>createHash("sha256").update(x).digest("hex");
function canonical(v:unknown):string{
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  const o=v as Record<string,unknown>;
  return "{"+Object.keys(o).sort().map(
    k=>JSON.stringify(k)+":"+canonical(o[k])
  ).join(",")+"}";
}
function utc(v:string,tag:string):string{
  if(typeof v!=="string"||!ISO.test(v))
    throw Error("GATE05_CUSTODY_INVALID_UTC_"+tag);
  const t=Date.parse(v);
  if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,19)!==v.slice(0,19))
    throw Error("GATE05_CUSTODY_INVALID_UTC_"+tag);
  return new Date(t).toISOString();
}
export interface Gate05CustodySourceV39 {
  sessionId:string; expectedProviderSubscriptionId:string; auditAtUtc:string;
  blob:{
    blobRefId:string;storageKind:string;contentClass:string;
    sourceKind:string;sourceRecordId:string;
    contentSha256:string;contentBytes:number;
    persistedAtUtc:string;expiresAtUtc:string;deletedAtUtc:string|null;
  };
  delivery:{
    sessionId:string;deliveryId:string;blobRefId:string;
    rawBodySha256:string;notificationItems:number;
    receivedAtUtc:string;providerSubscriptionId:string|null;
  };
  rows:readonly {
    deliveryId:string;itemIndex:number;rawItemSha256:string;
    receivedAtUtc:string;flightInstanceId:string|null;
    identityResolutionStatus:string|null;
    codeshareResolutionStatus:string|null;
  }[];
  originalCanonicalBytes:Uint8Array;
}
export function adaptGate05CustodyBytesV39(x:Gate05CustodySourceV39):Readonly<{
  schema:typeof GATE05_CUSTODY_ADAPTER_V39;
  verifiedSourceHashes:true;
  sampleItems:readonly Gate05RawItemV39[];
  actualAckClockEvidencePresent:false;
  authenticTerminalTransitionClockPresent:false;
  runwayActualityCertified:false;
  scheduledWheelsOffCertified:false;
  scientificPass:false;
  providerCalls:0;
  databaseWrites:0;
}>{
  if(!x||!UUID.test(x.sessionId)||
     typeof x.expectedProviderSubscriptionId!=="string"||
     x.expectedProviderSubscriptionId.length<1||
     !Array.isArray(x.rows)||x.rows.length>5000||
     !(x.originalCanonicalBytes instanceof Uint8Array)||
     x.originalCanonicalBytes.byteLength>5_000_000)
    throw Error("GATE05_CUSTODY_INVALID_INPUT");
  const b=x.blob,d=x.delivery;
  if(!b||!d||!UUID.test(b.blobRefId)||!UUID.test(d.sessionId)||
     d.sessionId!==x.sessionId||d.blobRefId!==b.blobRefId||
     !IDENT.test(d.deliveryId)||
     d.providerSubscriptionId!==x.expectedProviderSubscriptionId||
     b.storageKind!=="replit_app_storage"||
     b.sourceKind!=="webhook"||b.contentClass!=="raw_provider_content"||
     b.sourceRecordId!=="prepaid:"+x.sessionId+":"+d.deliveryId||
     !HEX.test(b.contentSha256)||!HEX.test(d.rawBodySha256)||
     !Number.isSafeInteger(b.contentBytes)||b.contentBytes<=0||
     !Number.isSafeInteger(d.notificationItems)||d.notificationItems<0||
     d.notificationItems>5000)
    throw Error("GATE05_CUSTODY_SOURCE_IDENTITY_MISMATCH");
  const audit=Date.parse(utc(x.auditAtUtc,"audit"));
  const persisted=Date.parse(utc(b.persistedAtUtc,"persisted"));
  const received=Date.parse(utc(d.receivedAtUtc,"received"));
  const expired=Date.parse(utc(b.expiresAtUtc,"expires"));
  if(b.deletedAtUtc!==null||audit>=expired||persisted>audit||
     received>audit||persisted<received-60_000)
    throw Error("GATE05_CUSTODY_EXPIRED_OR_IMPOSSIBLE_CLOCK");
  const raw=Buffer.from(x.originalCanonicalBytes);
  if(raw.byteLength!==b.contentBytes||digest(raw)!==b.contentSha256||
     digest(raw)!==d.rawBodySha256)
    throw Error("GATE05_CUSTODY_ORIGINAL_HASH_MISMATCH");
  let root:unknown;let text:string;
  try{
    text=new TextDecoder("utf-8",{fatal:true}).decode(raw);
    root=JSON.parse(text);
  }catch{throw Error("GATE05_CUSTODY_INVALID_JSON");}
  if(canonical(root)!==text)
    throw Error("GATE05_CUSTODY_NOT_ORIGINAL_CANONICAL");
  const flights=Array.isArray(root)?root:obj(root)?.flights;
  if(!Array.isArray(flights)||flights.length!==d.notificationItems||
     x.rows.length!==flights.length)
    throw Error("GATE05_CUSTODY_ITEM_COUNT_MISMATCH");
  const used=new Set<number>();
  const items:Gate05RawItemV39[]=[];
  const envelopeId=digest(x.sessionId+"|"+d.deliveryId);
  for(const item of x.rows){
    if(!item||item.deliveryId!==d.deliveryId||
       !Number.isSafeInteger(item.itemIndex)||item.itemIndex<0||
       item.itemIndex>=flights.length||used.has(item.itemIndex)||
       !HEX.test(item.rawItemSha256)||
       !["resolved","quarantined"].includes(item.identityResolutionStatus??"")||
       !["resolved_operator","resolved_marketing","ambiguous_unknown"]
         .includes(item.codeshareResolutionStatus??""))
      throw Error("GATE05_CUSTODY_ITEM_IDENTITY_MISMATCH");
    used.add(item.itemIndex);
    const f=obj(flights[item.itemIndex]);
    if(!f||digest(canonical(f))!==item.rawItemSha256)
      throw Error("GATE05_CUSTODY_ITEM_HASH_MISMATCH");
    if(utc(item.receivedAtUtc,"item_received")!==
       utc(d.receivedAtUtc,"delivery_received"))
      throw Error("GATE05_CUSTODY_ITEM_RECEIPT_MISMATCH");
    const status=f.status;
    const arrived=status===9||status==="Arrived";
    const airborneStatus=[2,6,8,"EnRoute","Departed","Approaching"]
      .includes(status as number|string);
    const loc=obj(f.location),lat=loc?.lat,lon=loc?.lon;
    const coords=typeof lat==="number"&&Number.isFinite(lat)&&
      lat>=-90&&lat<=90&&typeof lon==="number"&&Number.isFinite(lon)&&
      lon>=-180&&lon<=180;
    const at=coords&&typeof loc?.reportedAtUtc==="string"?
      utc(loc.reportedAtUtc,"location"):null;
    const stage=arrived?"COMPLETED":
      airborneStatus&&at!==null?"AIRBORNE":"OTHER";
    const verified=item.identityResolutionStatus==="resolved"&&
      item.codeshareResolutionStatus==="resolved_operator"&&
      typeof item.flightInstanceId==="string"&&
      IDENT.test(item.flightInstanceId);
    items.push({
      envelopeId,itemOrdinal:item.itemIndex,rawSha256:item.rawItemSha256,
      receivedAtUtc:utc(item.receivedAtUtc,"received"),
      rawDurableAtUtc:new Date(persisted).toISOString(),
      http2xxAtUtc:null, // actual per-delivery HTTP ACK clock unavailable
      physicalFlightId:verified?item.flightInstanceId:null,
      identityBasis:verified?"VERIFIED_OPERATING_LEG":"UNKNOWN",
      codeshareRole:item.codeshareResolutionStatus==="resolved_marketing"?
        "MARKETING":item.codeshareResolutionStatus==="resolved_operator"?
        "OPERATOR":"UNKNOWN",
      flightStage:stage,
      airbornePointUtc:stage==="AIRBORNE"?at:null,
      terminalStateUpdatedAtUtc:null // lastUpdatedUtc is NOT status-transition time
    });
  }
  return {
    schema:GATE05_CUSTODY_ADAPTER_V39,verifiedSourceHashes:true,
    sampleItems:items,actualAckClockEvidencePresent:false,
    authenticTerminalTransitionClockPresent:false,
    runwayActualityCertified:false,scheduledWheelsOffCertified:false,
    scientificPass:false,providerCalls:0,databaseWrites:0
  };
}
