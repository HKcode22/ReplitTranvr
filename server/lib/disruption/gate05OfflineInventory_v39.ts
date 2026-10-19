/**
 * Pure Gate 0.5 notification inventory, not a pilot acceptance or
 * authenticated-source certificate. The readback caller must verify originals.
 */
import {createHash} from "node:crypto";

export type AirportRole = "departure"|"arrival"|"both"|"neither";
export interface RoleCounts {items:number; departureRunwayCandidates:number; statuses:Record<string,number>}
export interface Gate05OfflineInventory {
  schema:"v39.gate05.offline-inventory.v1";
  airportIcao:string;
  notificationItems:number;
  roles:Record<AirportRole,RoleCounts>;
  fieldsPresent:Record<string,number>;
  provisionalCompositeKeys:number;
  repeatedCompositeKeys:number;
  unkeyedItems:number;
  independentlyVerifiedUniqueFlights:null;
  independentlyVerifiedActualTargets:null;
  independentlyVerifiedAirborneFlights:null;
  independentlyVerifiedFidsDenominator:null;
  gate05PilotCertified:false;
}

const paths=[
  "departure.scheduledTime.utc","departure.revisedTime.utc","departure.runwayTime.utc",
  "arrival.scheduledTime.utc","arrival.revisedTime.utc","arrival.runwayTime.utc",
  "lastUpdatedUtc","aircraft.reg","aircraft.modeS","callSign",
  "location.lat","location.lon","location.reportedAtUtc"
];
function obj(v:unknown):Record<string,any>{
  return v!==null && typeof v==="object" && !Array.isArray(v)?v as Record<string,any>:{};
}
function path(v:unknown,p:string):unknown{
  return p.split(".").reduce<unknown>((o,k)=>obj(o)[k],v);
}
function timestamp(v:unknown):boolean{
  return typeof v==="string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v) &&
    Number.isFinite(Date.parse(v));
}
function nonempty(p:string,v:unknown):boolean{
  if(p==="lastUpdatedUtc"||p.endsWith(".utc")||p==="location.reportedAtUtc")return timestamp(v);
  if(p==="location.lat")return typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=90;
  if(p==="location.lon")return typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=180;
  return typeof v==="string"&&v.trim().length>0;
}
function airport(v:unknown):string|null{
  if(typeof v!=="string")return null;
  const s=v.trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(s)?s:null;
}
function status(v:unknown):string{
  if(typeof v==="number"&&Number.isInteger(v)&&v>=0&&v<=12)return String(v);
  const known=["Unknown","Expected","EnRoute","CheckIn","Boarding","GateClosed",
    "Departed","Delayed","Approaching","Arrived","Canceled","Diverted","CanceledUncertain"];
  return typeof v==="string"&&known.includes(v)?v:"unknown_or_unrecognized";
}
function blank():RoleCounts{return {items:0,departureRunwayCandidates:0,statuses:{}}}

/** Provisional composite keys are not verified physical-flight identities. */
export function inventoryGate05OfflineItems(input:{
  airportIcao:string;items:readonly unknown[];
}):Gate05OfflineInventory{
  const code=airport(input.airportIcao);
  if(!code)throw Error("GATE05_ICAO_INVALID");
  if(!Array.isArray(input.items))throw Error("GATE05_ITEMS_NOT_ARRAY");
  const roles:Record<AirportRole,RoleCounts>={
    departure:blank(),arrival:blank(),both:blank(),neither:blank()
  };
  const fieldsPresent:Record<string,number>=Object.fromEntries(paths.map(p=>[p,0]));
  const keys=new Set<string>();
  let keyable=0,unkeyedItems=0;
  for(const v of input.items){
    if(!v||typeof v!=="object"||Array.isArray(v))throw Error("GATE05_ITEM_MALFORMED");
    const f=obj(v);
    const dep=airport(path(f,"departure.airport.icao"));
    const arr=airport(path(f,"arrival.airport.icao"));
    const role:AirportRole=dep===code&&arr===code?"both":
      dep===code?"departure":arr===code?"arrival":"neither";
    const b=roles[role];
    b.items++;
    const s=status(f.status);
    b.statuses[s]=(b.statuses[s]??0)+1;
    if(timestamp(path(f,"departure.runwayTime.utc")))b.departureRunwayCandidates++;
    for(const p of paths)if(nonempty(p,path(f,p)))fieldsPresent[p]++;
    const num=typeof f.number==="string"?f.number.trim().toUpperCase():"";
    const carrier=path(f,"airline.iata")??path(f,"airline.icao");
    const schedule=path(f,"departure.scheduledTime.utc");
    if(num&&dep&&arr&&timestamp(schedule)){
      keyable++;
      keys.add(createHash("sha256").update(JSON.stringify([
        typeof carrier==="string"?carrier.trim().toUpperCase():"",num,dep,arr,schedule
      ])).digest("hex"));
    }else unkeyedItems++;
  }
  return {
    schema:"v39.gate05.offline-inventory.v1",airportIcao:code,
    notificationItems:input.items.length,roles,fieldsPresent,
    provisionalCompositeKeys:keys.size,repeatedCompositeKeys:keyable-keys.size,
    unkeyedItems,
    independentlyVerifiedUniqueFlights:null,independentlyVerifiedActualTargets:null,
    independentlyVerifiedAirborneFlights:null,independentlyVerifiedFidsDenominator:null,
    gate05PilotCertified:false
  };
}
