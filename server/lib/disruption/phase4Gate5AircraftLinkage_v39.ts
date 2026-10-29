/**
 * Phase4 Gate5: pure offline ADS-B aircraft ↔ operating-leg CANDIDATES.
 * ICAO24/callsign/trajectory NEVER certify an operated flight, runway time,
 * AIRBORNE denominator or licensed production use. No I/O or raw persistence.
 */
import type {Gate05AdsbResultV39,Gate05AdsbCandidateV39}
 from "./gate05ZeroCostAdsbEvidence_v39";
export const P4_LINKAGE_SCHEMA="v39.phase4.gate5-aircraft-link-candidate.v1" as const;
export const P4_DURABILITY_SCHEMA="v39.phase4.gate5-logged-catalog.v1" as const;
const SHA=/^[a-f0-9]{64}$/;
const HEX=/^[a-f0-9]{6}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
function time(x:string):number{
 if(typeof x!=="string"||!UTC.test(x))throw Error("P4_LINK_EXPLICIT_UTC");
 const t=Date.parse(x);
 if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,19)!==x.slice(0,19))
  throw Error("P4_LINK_BAD_UTC");
 return t;
}
const nonempty=(x:unknown):x is string=>
 typeof x==="string"&&x.length>0&&x.length<=180;
function nm(a:Gate05AdsbCandidateV39,b:Gate05AdsbCandidateV39){
 const r=Math.PI/180;
 const z=Math.sin((a.lat-b.lat)*r/2)**2+
 Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((a.lon-b.lon)*r/2)**2;
 return 3440.0695*2*Math.asin(Math.sqrt(Math.min(1,z)));
}
export interface P4Anchor{
 flightInstanceId:string;originIcao:string;
 operatingLegStatus:"VERIFIED_OPERATING_LEG"|"PROVISIONAL"|"UNKNOWN";
 codeshareRole:"OPERATOR"|"MARKETING"|"UNKNOWN";
 firstScheduledDepartureUtc:string|null;
 flightIdentityAvailableAtUtc:string|null;
 originalAircraftHex:string|null;
 aircraftAssociationSource:"INDEPENDENT_PROVIDER_ORIGINAL_HEX"|"CALLSIGN_ONLY"|"UNKNOWN";
 originalSourceSha256:string|null;
 associationAvailableAtUtc:string|null;
 originalExpiresAtUtc:string|null;
 sourceCallsign:string|null;
}
export interface P4LinkScope{
 airportIcao:string;startUtc:string;endUtc:string;
 cutoffUtc:string;auditUtc:string;
}
export interface P4LinkReport{
 schema:typeof P4_LINKAGE_SCHEMA;
 status:"OFFLINE_CANDIDATES_ONLY_NO_SCIENTIFIC_LINK_CERTIFICATION";
 source:"adsb.lol";license:"ODbL-1.0";productionApproved:false;
 samples:number;observations:number;anchors:number;
 sourceEligibleAnchors:number;sourceRejectedAnchors:number;
 ambiguousHexes:number;ambiguousFlights:number;
 candidatePairs:number;candidatePoints:number;invalidSegments:number;
 matchedPhysicalFlightsCertified:0;airborneEligibleCertified:0;
 verifiedRunwayLabels:0;confirmedTrajectories:0;
 asOfTIndependentlyCertified:false;sourceAuthenticityIndependentlyCertified:false;
 phase6Authorized:false;providerCalls:0;databaseWrites:0;persistedRaw:false;
}
export function assessP4AircraftLinkCandidates(
 scope:P4LinkScope,anchors:readonly P4Anchor[],samples:readonly Gate05AdsbResultV39[]
):P4LinkReport{
 if(!scope||!/^[A-Z]{4}$/.test(scope.airportIcao)||
  !Array.isArray(anchors)||anchors.length>20000||
  !Array.isArray(samples)||samples.length>6)
  throw Error("P4_LINK_SCOPE_INVALID");
 const start=time(scope.startUtc),end=time(scope.endUtc);
 const cutoff=time(scope.cutoffUtc),audit=time(scope.auditUtc);
 if(end<=start||end-start>12*3600000||audit<cutoff||cutoff<start-48*3600000)
  throw Error("P4_LINK_WINDOW_INVALID");
 const qualified:{a:P4Anchor;hex:string}[]=[];
 const hexToFlights=new Map<string,Set<string>>();
 const flightToHexes=new Map<string,Set<string>>();
 const seenPair=new Set<string>();
 let rejected=0;
 for(const a of anchors){
  if(!a||!nonempty(a.flightInstanceId)||!/^[A-Z]{4}$/.test(a.originIcao)||
   !["VERIFIED_OPERATING_LEG","PROVISIONAL","UNKNOWN"].includes(a.operatingLegStatus)||
   !["OPERATOR","MARKETING","UNKNOWN"].includes(a.codeshareRole)||
   !["INDEPENDENT_PROVIDER_ORIGINAL_HEX","CALLSIGN_ONLY","UNKNOWN"]
    .includes(a.aircraftAssociationSource))
   throw Error("P4_LINK_ANCHOR_INVALID");
  for(const t of [a.firstScheduledDepartureUtc,a.flightIdentityAvailableAtUtc,
    a.associationAvailableAtUtc,a.originalExpiresAtUtc])if(t!==null)time(t);
  const h=a.originalAircraftHex?.toLowerCase()??"";
  const eligible=a.originIcao===scope.airportIcao&&
   a.operatingLegStatus==="VERIFIED_OPERATING_LEG"&&a.codeshareRole==="OPERATOR"&&
   a.aircraftAssociationSource==="INDEPENDENT_PROVIDER_ORIGINAL_HEX"&&
   HEX.test(h)&&!!a.originalSourceSha256&&SHA.test(a.originalSourceSha256)&&
   a.firstScheduledDepartureUtc!==null&&a.flightIdentityAvailableAtUtc!==null&&
   a.associationAvailableAtUtc!==null&&a.originalExpiresAtUtc!==null&&
   time(a.firstScheduledDepartureUtc)>=start&&time(a.firstScheduledDepartureUtc)<end&&
   time(a.flightIdentityAvailableAtUtc)<=cutoff&&
   time(a.associationAvailableAtUtc)<=cutoff&&
   time(a.originalExpiresAtUtc)>audit;
  if(!eligible){rejected++;continue;}
  const key=a.flightInstanceId+"|"+h;
  if(seenPair.has(key))throw Error("P4_LINK_DUPLICATE_SOURCE_ANCHOR");
  seenPair.add(key);qualified.push({a,hex:h});
  if(!hexToFlights.has(h))hexToFlights.set(h,new Set());
  hexToFlights.get(h)!.add(a.flightInstanceId);
  if(!flightToHexes.has(a.flightInstanceId))flightToHexes.set(a.flightInstanceId,new Set());
  flightToHexes.get(a.flightInstanceId)!.add(h);
 }
 const ambiguousHexes=new Set([...hexToFlights].filter(([,ids])=>ids.size>1).map(([h])=>h));
 const ambiguousFlights=new Set([...flightToHexes].filter(([,hs])=>hs.size>1).map(([id])=>id));
 const observations=new Map<string,Gate05AdsbCandidateV39[]>();
 let total=0;
 for(const s of samples){
  if(s.provider!=="adsb.lol"||s.license!=="ODbL-1.0"||
    s.productionAccessApproved!==false||s.httpGetCalls!==0||
    s.databaseWrites!==0||s.points.length>s.originalRows)
   throw Error("P4_LINK_SOURCE_PROVENANCE_HOLD");
  for(const p of s.points){
   if(p.identity!=="UNLINKED_AIRCRAFT_CANDIDATE"||
    p.originalAeroDataBoxFlightMatched!==false||
    p.runwayEventActualVerified!==false||!HEX.test(p.icao24Hex)||
    !Number.isFinite(p.lat)||Math.abs(p.lat)>90||
    !Number.isFinite(p.lon)||Math.abs(p.lon)>180)
    throw Error("P4_LINK_FALSE_IDENTITY_OR_POINT");
   total++;
   const recv=time(p.receivedAtUtc),obs=time(p.approximatePositionUtc);
   if(obs>recv+5000)throw Error("P4_LINK_POINT_FROM_FUTURE");
   if(recv>cutoff||recv>audit)continue;
   if(!observations.has(p.icao24Hex))observations.set(p.icao24Hex,[]);
   observations.get(p.icao24Hex)!.push(p);
  }
 }
 let pairs=0,points=0,invalid=0;
 for(const {a,hex} of qualified){
  if(ambiguousHexes.has(hex)||ambiguousFlights.has(a.flightInstanceId))continue;
  const scheduled=time(a.firstScheduledDepartureUtc!);
  const first=scheduled-45*60000,last=scheduled+240*60000;
  const selected=(observations.get(hex)??[])
   .filter(p=>time(p.approximatePositionUtc)>=first&&
              time(p.approximatePositionUtc)<=last)
   .sort((x,y)=>time(x.approximatePositionUtc)-time(y.approximatePositionUtc));
  const path:Gate05AdsbCandidateV39[]=[];
  let bad=false;
  for(const p of selected){
   if(a.sourceCallsign&&p.callsign&&
    a.sourceCallsign.trim().toUpperCase()!==p.callsign.trim().toUpperCase()){
    bad=true;break;
   }
   if(!path.length){path.push(p);continue;}
   const prev=path[path.length-1];
   const delta=(time(p.approximatePositionUtc)-time(prev.approximatePositionUtc))/1000;
   if(delta<=0){invalid++;continue;}
   if(delta>600||nm(prev,p)>800*delta/3600+1){
    invalid++;bad=true;break;
   }
   path.push(p);
  }
  if(!bad&&path.length>=2){pairs++;points+=path.length;}
 }
 return {
  schema:P4_LINKAGE_SCHEMA,status:"OFFLINE_CANDIDATES_ONLY_NO_SCIENTIFIC_LINK_CERTIFICATION",
  source:"adsb.lol",license:"ODbL-1.0",productionApproved:false,
  samples:samples.length,observations:total,anchors:anchors.length,
  sourceEligibleAnchors:qualified.length,sourceRejectedAnchors:rejected,
  ambiguousHexes:ambiguousHexes.size,ambiguousFlights:ambiguousFlights.size,
  candidatePairs:pairs,candidatePoints:points,invalidSegments:invalid,
  matchedPhysicalFlightsCertified:0,airborneEligibleCertified:0,
  verifiedRunwayLabels:0,confirmedTrajectories:0,
  asOfTIndependentlyCertified:false,sourceAuthenticityIndependentlyCertified:false,
  phase6Authorized:false,providerCalls:0,databaseWrites:0,persistedRaw:false
 };
}
/** Only schema persistence. A 'p' catalog row is NOT a real restart replay. */
export const P4_DURABLE_TABLES=[
 "flight_population","fids_query_response","flight_snapshots",
 "webhook_flight_identity","webhook_identity_resolution",
 "raw_delivery","raw_delivery_item"
] as const;
export const P4_DURABILITY_SELECT=[
 "SELECT c.relname AS name,c.relpersistence AS persistence",
 "FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace",
 "WHERE n.nspname='clean' AND c.relname=ANY($1::text[])",
 "AND c.relkind IN ('r','p') ORDER BY c.relname"
].join(" ");
export interface P4DurabilityRead{query(sql:string,params:unknown[]):Promise<{rows:unknown[]}>}
export interface P4DurabilityReport{
 schema:typeof P4_DURABILITY_SCHEMA;
 status:"SCHEMA_LOGGED_ONLY_NOT_RESTART_PROOF"|"HOLD_UNLOGGED_OR_MISSING_TABLES";
 required:number;observed:number;logged:number;missing:number;unloggedOrUnknown:number;
 originalSourceSurvivedRestartProven:false;realRestartExecuted:false;
 providerCalls:0;databaseWrites:0;
}
export async function assessP4DurabilityCatalog(db:P4DurabilityRead):Promise<P4DurabilityReport>{
 const r=await db.query(P4_DURABILITY_SELECT,[[...P4_DURABLE_TABLES]]);
 if(!r||!Array.isArray(r.rows)||r.rows.length>P4_DURABLE_TABLES.length)
  throw Error("P4_DURABILITY_BAD_CATALOG");
 const found=new Map<string,string>();
 for(const value of r.rows){
  if(!value||typeof value!=="object"||Array.isArray(value))
   throw Error("P4_DURABILITY_BAD_ROW");
  const row=value as Record<string,unknown>;
  if(typeof row.name!=="string"||
   !P4_DURABLE_TABLES.includes(row.name as typeof P4_DURABLE_TABLES[number])||
   found.has(row.name)||typeof row.persistence!=="string")
   throw Error("P4_DURABILITY_UNEXPECTED_RELATION");
  found.set(row.name,row.persistence);
 }
 const logged=[...found.values()].filter(s=>s==="p").length;
 const missing=P4_DURABLE_TABLES.length-found.size;
 const wrong=found.size-logged;
 return {
  schema:P4_DURABILITY_SCHEMA,
  status:missing===0&&wrong===0?
   "SCHEMA_LOGGED_ONLY_NOT_RESTART_PROOF":"HOLD_UNLOGGED_OR_MISSING_TABLES",
  required:P4_DURABLE_TABLES.length,observed:found.size,
  logged,missing,unloggedOrUnknown:wrong,
  originalSourceSurvivedRestartProven:false,realRestartExecuted:false,
  providerCalls:0,databaseWrites:0
 };
}
