/**
 * Gate05 OFFLINE RESEARCH source adapter ONLY, no fetch, no IO, no production.
 * adsb.lol ODbL-1.0. Production use requires operator coordination.
 * ADS-B position evidence does not prove actual runway event or same operated
 * physical flight as AeroDataBox. Linkage remains UNVERIFIED_CANDIDATE.
 */
export const GATE05_FREE_ADSB_CONTRACT_V39="v39.gate05.adsb-offline-evidence.v1" as const;
export const GATE05_ADSB_LOL_SOURCE_V39=Object.freeze({
 provider:"adsb.lol",license:"ODbL-1.0",
 terms:"https://api.adsb.lol/docs",
 productionAccessApproved:false,
 // WSSS ARP (CAAS): 01 21 33.16 N, 103 59 21.57 E.
 wsssLat:1.3592111111,wsssLon:103.989325,queryRadiusNm:60,
 maximumPositionAgeSeconds:30,
 noPaidProviderCalls:true,
 asOfAvailabilityRequired:true,
 sourceDoesNotCertifyOperatingLegOrActualRunway:true
} as const);
export type Gate05AdsbCandidateV39=Readonly<{
 icao24Hex:string;callsign:string|null;lat:number;lon:number;
 receivedAtUtc:string;approximatePositionUtc:string;seenPosSeconds:number;
 sourceType:string|null;groundspeedKt:number|null;altitudeBarometricFt:number|null;
 groundState:"GROUND_REPORTED"|"NOT_GROUND_REPORTED"|"UNKNOWN";
 timing:"PROVIDER_NOW_MINUS_SEEN_POS_APPROXIMATE";
 identity:"UNLINKED_AIRCRAFT_CANDIDATE";
 runwayEventActualVerified:false;
 originalAeroDataBoxFlightMatched:false;
}>;
export type Gate05AdsbResultV39=Readonly<{
 schema:typeof GATE05_FREE_ADSB_CONTRACT_V39;
 provider:"adsb.lol";license:"ODbL-1.0";
 productionAccessApproved:false;httpGetCalls:0;databaseWrites:0;
 originalRows:number;recentValidPoints:number;
 missingPositionCount:number;stalePositionCount:number;
 invalidOrPrivateHexCount:number;invalidRows:number;
 points:readonly Gate05AdsbCandidateV39[];
 distinctPhysicalOperatingFlightsCertified:false;
 actualWheelsOffLabelCertified:false;
}>;
const obj=(x:unknown):Record<string,unknown>|null=>
 x!==null&&typeof x==="object"&&!Array.isArray(x)?x as Record<string,unknown>:null;
const finite=(x:unknown):x is number=>typeof x==="number"&&Number.isFinite(x);
const utc=(s:string):number=>{
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s))
  throw Error("GATE05_ADSB_EXPLICIT_UTC_REQUIRED");
 const ms=Date.parse(s);
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==s.slice(0,19))
  throw Error("GATE05_ADSB_INVALID_UTC");
 return ms;
};
function distanceNm(a:number,b:number,c:number,d:number):number{
 const rad=Math.PI/180;
 const x=Math.sin((c-a)*rad/2)**2+
  Math.cos(a*rad)*Math.cos(c*rad)*Math.sin((d-b)*rad/2)**2;
 return 3440.0695*2*Math.asin(Math.sqrt(Math.min(1,x)));
}
/**
 * Parse a previously captured public v2 point-response JSON.
 * No provider calls, storage, schedule or status inflation. Never report
 * absent airplane coverage as an observed zero count of physical flights.
 */
export function normalizeGate05AdsbLolOfflineV39(
 raw:unknown,receivedAtUtc:string,options:Readonly<{
  centerLat?:number;centerLon?:number;radiusNm?:number;maxAgeSeconds?:number
 }>={}
):Gate05AdsbResultV39{
 const root=obj(raw);
 const received=utc(receivedAtUtc);
 if(!root||!Array.isArray(root.ac)||!Number.isSafeInteger(root.now))
  throw Error("GATE05_ADSB_UNEXPECTED_SOURCE_SHAPE");
 const server=Number(root.now);
 if(Math.abs(server-received)>120000)
  throw Error("GATE05_ADSB_SERVER_CLOCK_SKEW");
 const a=options.centerLat??GATE05_ADSB_LOL_SOURCE_V39.wsssLat;
 const b=options.centerLon??GATE05_ADSB_LOL_SOURCE_V39.wsssLon;
 const r=options.radiusNm??GATE05_ADSB_LOL_SOURCE_V39.queryRadiusNm;
 const maxAge=options.maxAgeSeconds??GATE05_ADSB_LOL_SOURCE_V39.maximumPositionAgeSeconds;
 if(!finite(a)||!finite(b)||a< -90||a>90||b< -180||b>180||
    !finite(r)||r<=0||r>250||!finite(maxAge)||maxAge<=0||maxAge>120||
    root.ac.length>50000)throw Error("GATE05_ADSB_SOURCE_BOUND_INVALID");
 const points:Gate05AdsbCandidateV39[]=[];
 let missing=0,stale=0,hexInvalid=0,invalid=0;
 for(const row of root.ac){
  const p=obj(row);
  if(!p){invalid++;continue;}
  const hex=typeof p.hex==="string"?p.hex.trim().toLowerCase():"";
  if(!/^[a-f0-9]{6}$/.test(hex)){hexInvalid++;continue;}
  const lat=p.lat,lon=p.lon;
  if(!finite(lat)||!finite(lon)||lat< -90||lat>90||lon< -180||lon>180||
     distanceNm(a,b,lat,lon)>r+1){missing++;continue;}
  const age=p.seen_pos;
  if(!finite(age)||age<0||age>maxAge||server-age*1000>received+5000){
   stale++;continue;
  }
  const callsign=typeof p.flight==="string"&&/^[A-Za-z0-9 -]{1,20}$/.test(p.flight)?
   p.flight.trim().toUpperCase()||null:null;
  const type=typeof p.type==="string"&&/^[a-z0-9_]{1,32}$/.test(p.type)?
   p.type:null;
  const alt=finite(p.alt_baro)?p.alt_baro:null;
  const gs=finite(p.gs)&&p.gs>=0?p.gs:null;
  const ground=p.alt_baro==="ground"?"GROUND_REPORTED":
   alt===null?"UNKNOWN":"NOT_GROUND_REPORTED";
  points.push({
   icao24Hex:hex,callsign,lat,lon,receivedAtUtc:new Date(received).toISOString(),
   approximatePositionUtc:new Date(server-age*1000).toISOString(),
   seenPosSeconds:age,sourceType:type,groundspeedKt:gs,
   altitudeBarometricFt:alt,groundState:ground,
   timing:"PROVIDER_NOW_MINUS_SEEN_POS_APPROXIMATE",
   identity:"UNLINKED_AIRCRAFT_CANDIDATE",
   runwayEventActualVerified:false,originalAeroDataBoxFlightMatched:false
  });
 }
 return {
  schema:GATE05_FREE_ADSB_CONTRACT_V39,provider:"adsb.lol",
  license:"ODbL-1.0",productionAccessApproved:false,httpGetCalls:0,databaseWrites:0,
  originalRows:root.ac.length,recentValidPoints:points.length,
  missingPositionCount:missing,stalePositionCount:stale,
  invalidOrPrivateHexCount:hexInvalid,invalidRows:invalid,
  points,distinctPhysicalOperatingFlightsCertified:false,
  actualWheelsOffLabelCertified:false
 };
}
export function gate05AdsbAsOfEligibleV39(
 p:Gate05AdsbCandidateV39,cutoffUtc:string):boolean{
 return utc(p.receivedAtUtc)<=utc(cutoffUtc);
}
/** Audit output without callsigns, aircraft IDs, lat/lon or timestamps. */
export function gate05AdsbAggregateOnlyV39(x:Gate05AdsbResultV39){
 return {
  schema:x.schema,provider:x.provider,license:x.license,
  originalRows:x.originalRows,recentValidPoints:x.recentValidPoints,
  missingOrStale:x.missingPositionCount+x.stalePositionCount+
   x.invalidOrPrivateHexCount+x.invalidRows,
  aircraftAndPhysicalFlightsUnlinked:true,
  noRunwayActualityProof:true,productionUseBlockedWithoutOperatorCoordination:true,
  paidProviderCalls:0
 };
}
