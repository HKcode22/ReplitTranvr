/**
 * Pure private Gate05 RAW source schema/count diagnostic.
 * Accepts already authenticated original flight objects; never returns a raw
 * flight, flight number, tail, callsign, provider ID or location coordinates.
 * Candidate dedupe counts are expressly NOT validated physical operating legs.
 * No data I/O, provider calls, provider mutations or database writes.
 */
import {createHash} from "node:crypto";
type AnyObject=Record<string,unknown>;
const obj=(x:unknown):AnyObject|null=>
  x!==null&&typeof x==="object"&&!Array.isArray(x)?x as AnyObject:null;
const str=(x:unknown):string|null=>
  typeof x==="string"&&x.trim()?x.trim():null;
const nested=(root:unknown,...path:string[]):unknown=>{
  let o=root;
  for(const p of path){o=obj(o)?.[p];if(o===undefined)return null;}
  return o??null;
};
const statuses=[
 "Unknown","Expected","EnRoute","CheckIn","Boarding","GateClosed",
 "Departed","Delayed","Approaching","Arrived","Canceled","Diverted",
 "CanceledUncertain"
] as const;
const indexStatus=(s:unknown):number=>{
 if(typeof s==="number"&&Number.isInteger(s)&&s>=0&&s<statuses.length)return s;
 if(typeof s==="string")return statuses.indexOf(s as typeof statuses[number]);
 return -1;
};
const normalizedRole=(s:unknown):"operator"|"marketing"|"unknown"=>{
 if(s===1||s==="IsOperator")return "operator";
 if(s===2||s==="IsCodeshared")return "marketing";
 return "unknown";
};
const isIso=(x:unknown):boolean=>typeof x==="string"&&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)&&
 Number.isFinite(Date.parse(x));
const locationQuality=(f:AnyObject)=>{
 const o=obj(f.location);
 const present=o!==null;
 const lat=o?.lat,lon=o?.lon;
 const validXY=typeof lat==="number"&&Number.isFinite(lat)&&
  lat>=-90&&lat<=90&&typeof lon==="number"&&Number.isFinite(lon)&&
  lon>=-180&&lon<=180;
 const time=isIso(o?.reportedAtUtc);
 return {present,validXY,time};
};
const fingerprint=(x:unknown):string=>createHash("sha256")
 .update(JSON.stringify(x)).digest("hex");
export function diagnoseGate05OriginalFlightSourceShapeV39(
 input:readonly unknown[],startUtc:string,stopUtc:string
){
 if(!Array.isArray(input)||input.length>50_000||
    !isIso(startUtc)||!isIso(stopUtc)||
    Date.parse(stopUtc)<=Date.parse(startUtc))
   throw Error("GATE05_SOURCE_SHAPE_INVALID_INPUT");
 const s=Date.parse(startUtc),end=Date.parse(stopUtc);
 const statusCounts=Object.fromEntries(statuses.map(n=>[n,0])) as Record<string,number>;
 let statusUnrecognized=0,rawAirborneStatusItems=0,rawArrivedStatusItems=0;
 let operatorItems=0,marketingItems=0,unknownRoleItems=0;
 let locationObjects=0,geometryCount=0,locationTimeCount=0;
 let completeLocationCount=0,inWindowLocationCount=0;
 let airborneStatusWithLocationObject=0;
 let airborneStatusWithValidGeometry=0;
 let airborneStatusWithValidTimedGeometry=0;
 let airborneStatusWithValidInWindowPoint=0;
 let arrivedStatusWithLocationObject=0;
 let operatorIdentityFieldCompleteItems=0,operatorWithScheduledTime=0;
 let providerIdPresentItems=0,callSignPresentItems=0;
 let scheduledDepartureTimePresent=0;
 let departureRunwayTimePresent=0,arrivalRunwayTimePresent=0;
 let departureRevisedTimePresent=0,arrivalRevisedTimePresent=0;
 let topLevelLocationButNotAirborneStatus=0;
 const operatorCandidateKeys=new Set<string>();
 const providerIdCandidateKeys=new Set<string>();
 const operatorCandidateValidLocations=new Set<string>();
 let malformedItems=0;
 for(const raw of input){
  const f=obj(raw);
  if(!f){malformedItems++;continue;}
  const code=indexStatus(f.status);
  if(code<0)statusUnrecognized++;else statusCounts[statuses[code]]++;
  const airborne=[2,6,8].includes(code);
  const arrived=code===9;
  if(airborne)rawAirborneStatusItems++;
  if(arrived)rawArrivedStatusItems++;
  const role=normalizedRole(f.codeshareStatus);
  if(role==="operator")operatorItems++;
  else if(role==="marketing")marketingItems++;
  else unknownRoleItems++;
  const loc=locationQuality(f);
  if(loc.present)locationObjects++;
  if(loc.validXY)geometryCount++;
  if(loc.time)locationTimeCount++;
  if(loc.validXY&&loc.time)completeLocationCount++;
  const at=loc.time?Date.parse(String(nested(f,"location","reportedAtUtc"))):NaN;
  const inWindow=loc.validXY&&loc.time&&at>=s&&at<end;
  if(inWindow)inWindowLocationCount++;
  if(airborne){
    if(loc.present)airborneStatusWithLocationObject++;
    if(loc.validXY)airborneStatusWithValidGeometry++;
    if(loc.validXY&&loc.time)airborneStatusWithValidTimedGeometry++;
    if(inWindow)airborneStatusWithValidInWindowPoint++;
  } else if(loc.present)topLevelLocationButNotAirborneStatus++;
  if(arrived&&loc.present)arrivedStatusWithLocationObject++;
  const carrier=str(nested(f,"airline","iata"))??str(nested(f,"airline","icao"));
  const number=str(f.number);
  const origin=str(nested(f,"departure","airport","icao"));
  const dest=str(nested(f,"arrival","airport","icao"));
  const scheduled=str(nested(f,"departure","scheduledTime","utc"));
  const pid=str(f.id);
  if(pid){providerIdPresentItems++;providerIdCandidateKeys.add(fingerprint(pid));}
  if(str(f.callSign))callSignPresentItems++;
  if(scheduled)scheduledDepartureTimePresent++;
  if(nested(f,"departure","runwayTime","utc")!==null)departureRunwayTimePresent++;
  if(nested(f,"arrival","runwayTime","utc")!==null)arrivalRunwayTimePresent++;
  if(nested(f,"departure","revisedTime","utc")!==null)departureRevisedTimePresent++;
  if(nested(f,"arrival","revisedTime","utc")!==null)arrivalRevisedTimePresent++;
  if(role==="operator"){
    if(carrier&&number&&origin&&dest)operatorIdentityFieldCompleteItems++;
    if(scheduled)operatorWithScheduledTime++;
    // Candidate correlation only; scheduledTime changes can split a physical
    // operating leg, and one flight may have multiple marketing records.
    if(carrier&&number&&origin&&dest&&scheduled){
      const key=fingerprint([carrier,number,origin,dest,scheduled]);
      operatorCandidateKeys.add(key);
      if(inWindow)operatorCandidateValidLocations.add(fingerprint([key,at]));
    }
  }
 }
 const count=input.length;
 const shape={
  schema:"v39.gate05.raw-source-shape-aggregate.v1",
  rawItemCount:count,malformedItems,
  providerStatuses:{...statusCounts,UNRECOGNIZED:statusUnrecognized},
  codeshareItems:{operator:operatorItems,marketing:marketingItems,unknown:unknownRoleItems},
  rawAirborneStatusItems,rawArrivedStatusItems,
  locationObjectItems:locationObjects,
  validLatitudeLongitudeItems:geometryCount,
  locationReportedTimeItems:locationTimeCount,
  completeLocationItems:completeLocationCount,
  inWindowLocationItems:inWindowLocationCount,
  airborneStatusWithLocationObject,
  airborneStatusWithValidGeometry,
  airborneStatusWithValidTimedGeometry,
  airborneStatusWithValidInWindowPoint,
  arrivedStatusWithLocationObject,
  locationObjectButNotAirborneStatusItems:topLevelLocationButNotAirborneStatus,
  providerFlightIdPresentItems:providerIdPresentItems,
  uniqueProviderIdCandidateCount:providerIdCandidateKeys.size,
  callSignPresentItems,
  scheduledDepartureTimePresent,
  operatorIdentityFieldCompleteItems,
  operatorWithScheduledTime,
  provisionalOperatorRouteScheduleCandidateCount:operatorCandidateKeys.size,
  provisionalOperatorInWindowPositionKeyCount:operatorCandidateValidLocations.size,
  departureRunwayTimePresent,arrivalRunwayTimePresent,
  departureRevisedTimePresent,arrivalRevisedTimePresent,
  uniquePhysicalOperatingLegsVerified:false,
  verifiedAirbornePoints:false,
  actualVsEstimatedRunwayTimeVerified:false,
  scheduledWheelsOffSemanticsVerified:false,
  authoritativeHttp2xxAckVerified:false,
  allIdentityAndRunwayFieldsAreCandidateEvidenceOnly:true,
  providerApiCalls:0,databaseWrites:0
 };
 return shape;
}
