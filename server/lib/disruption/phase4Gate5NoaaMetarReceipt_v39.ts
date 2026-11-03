/**
 * Free, public NOAA AviationWeather METAR receipt decoder and PRE-safe adapter.
 * World-wide airport weather only: no flight schedule, label, operating-leg
 * identity, or scientific Gate5 release is inferred from a METAR.
 *
 * Important clocks (do not conflate):
 *  obsTime = underlying weather observation;
 *  receiptTime / reportTime = NOAA-issued/reported clocks;
 *  collectedAtUtc = actual completion of this downloader's HTTP response;
 *  durableArtifactReadAtUtc = later first read AFTER a successful GH artifact
 *    upload/download, never the time a local file was written.
 *
 * A weather feature may appear in an as-of PRE only when the source has been
 * durably stored by the cutoff. Merely retrieving it earlier isn't enough.
 */
import {createHash} from "node:crypto";
import {
 preWeatherFeatureAsOfV39,
 type P4DurableWeatherReceipt
} from "./phase4Gate5WeatherAsOfFeature_v39";

export const P4_G5_NOAA_METAR_SCHEMA_V39=
 "v39.phase4.gate5-free-noaa-metar-receipt.v1" as const;
export const P4_G5_NOAA_AIRPORTS_V39=
 ["WSSS","OMAA","SKBO","YSSY"] as const;
const ICAO=/^[A-Z]{4}$/;
const EXACT_UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const METRIC_FIELDS={
 temp:"temperatureC",dewp:"dewpointC",wspd:"windSpeedKt",
 wgst:"windGustKt",altim:"altimeterHPa",wdir:"windDirectionDeg",
 visib:"visibilitySm"
} as const;
type NormalizedMetric=typeof METRIC_FIELDS[keyof typeof METRIC_FIELDS];
type NoaaMetarSourceRow=Record<string,unknown>;
export interface P4G5NoaaMetarReceiptV39{
  schema:typeof P4_G5_NOAA_METAR_SCHEMA_V39;
  source:"NOAA_AVIATIONWEATHER_METAR_JSON";
  sourceUrl:"https://aviationweather.gov/api/data/metar";
  airportIcao:string;
  sourceVersion:"NOAA_AVIATIONWEATHER_API_METAR_JSON_V4";
  collectedAtUtc:string;
  /** A local or CI receipt is NOT yet a durable GitHub artifact. */
  durableArtifactReadAtUtc:string|null;
  weatherObservationAtUtc:string;
  weatherIssuedAtUtc:string;
  noaaReceiptClockAtUtc:string|null;
  sourceBodySha256:string;
  sourceRecordSha256:string;
  metrics:Partial<Record<NormalizedMetric,number>>;
  originalSourceFlightIdentityAbsent:true;
  frozenFlightPreCertified:false;
  scientificGate5Passed:false;
}
export interface P4G5NoaaMetarDecodedV39{
 schema:typeof P4_G5_NOAA_METAR_SCHEMA_V39;
 sourceStatus:"VALID_FREE_OBSERVATIONS"|"NO_DATA_RETURNED";
 sourceAirportCount:number;
 acceptedAirportCount:number;
 missingAirports:string[];
 rejectedUnexpectedAirportCount:number;
 sourceBodySha256:string;
 sourceCollectedAtUtc:string;
 receipts:P4G5NoaaMetarReceiptV39[];
 noPaidProviderCalls:true;
 sourceIsFlightPopulation:false;
 sourceIsActualRunwayTime:false;
}

function time(x:unknown,label:string):Date{
 if(typeof x!=="string"||!EXACT_UTC.test(x)||
  !Number.isFinite(Date.parse(x))||
  new Date(Date.parse(x)).toISOString()!==x)
   throw Error("P4_G5_NOAA_INVALID_UTC_"+label);
 return new Date(x);
}
function reportedTime(x:unknown,label:string):Date{
 // NOAA's JSON sample uses "YYYY-MM-DD HH:mm:ss.sssZ".
 if(typeof x!=="string")
  throw Error("P4_G5_NOAA_MISSING_CLOCK_"+label);
 const normalized=x.replace(" ","T");
 return time(normalized,label);
}
function maybeReportedTime(x:unknown,label:string):Date|null{
 if(x===null||x===undefined)return null;
 return reportedTime(x,label);
}
function integerObsTime(x:unknown):Date{
 // The documented API emits obsTime as Unix seconds.
 if(typeof x!=="number"||!Number.isSafeInteger(x)||
    x<946684800||x>4102444800)
  throw Error("P4_G5_NOAA_INVALID_OBS_UNIX_SECONDS");
 const d=new Date(x*1000);
 if(!Number.isFinite(d.getTime()))throw Error("P4_G5_NOAA_BAD_OBS_CLOCK");
 return d;
}
function metrics(r:NoaaMetarSourceRow):Partial<Record<NormalizedMetric,number>>{
 const out:Partial<Record<NormalizedMetric,number>>={};
 for(const [key,metric] of Object.entries(METRIC_FIELDS) as
      [keyof typeof METRIC_FIELDS,NormalizedMetric][]){
   const raw=r[key];
   if(raw===null||raw===undefined)continue;
   if(key==="visib" && typeof raw==="string"&&raw.endsWith("+"))continue;
   const value=typeof raw==="number"?raw:
     typeof raw==="string"&&/^\d+(?:\.\d+)?$/.test(raw)?Number(raw):NaN;
   if(!Number.isFinite(value))continue;
   const valid=key==="temp"||key==="dewp"?
     value>=-100&&value<=65:
     key==="wdir"?value>=0&&value<=360:
     key==="wspd"||key==="wgst"?value>=0&&value<=300:
     key==="altim"?value>=800&&value<=1100:
     value>=0&&value<=100;
   if(valid)out[metric]=value;
 }
 return out;
}
export function decodeP4G5FreeNoaaMetarV39(input:{
  sourceJsonText:string;
  collectedAtUtc:string;
  requestedAirports:readonly string[];
}):P4G5NoaaMetarDecodedV39{
 const collected=time(input.collectedAtUtc,"COLLECTED");
 if(typeof input.sourceJsonText!=="string"||
   input.sourceJsonText.length>1_000_000||!Array.isArray(input.requestedAirports)||
   input.requestedAirports.length<1||input.requestedAirports.length>8||
   new Set(input.requestedAirports).size!==input.requestedAirports.length||
   input.requestedAirports.some(x=>typeof x!=="string"||!ICAO.test(x)))
    throw Error("P4_G5_NOAA_INVALID_SOURCE_REQUEST");
 let decoded:unknown;
 try{decoded=JSON.parse(input.sourceJsonText);}catch{
  throw Error("P4_G5_NOAA_NOT_JSON");
 }
 if(!Array.isArray(decoded)||decoded.length>400)
  throw Error("P4_G5_NOAA_JSON_NOT_BOUNDED_ARRAY");
 const sourceSha=createHash("sha256").update(input.sourceJsonText,"utf8").digest("hex");
 const requested=new Set(input.requestedAirports);
 const rowByAirport=new Map<string,{
  obs:Date,issue:Date,receipt:Date|null,metrics:Partial<Record<NormalizedMetric,number>>,
  recordSha:string}>();
 let rejectedUnexpected=0;
 for(const source of decoded){
  if(!source||typeof source!=="object"||Array.isArray(source))
   throw Error("P4_G5_NOAA_INVALID_JSON_ROW");
  const r=source as NoaaMetarSourceRow;
  const icao=r.icaoId;
  if(typeof icao!=="string"||!ICAO.test(icao))
   throw Error("P4_G5_NOAA_INVALID_STATION");
  if(!requested.has(icao)){rejectedUnexpected++;continue;}
  const obs=integerObsTime(r.obsTime);
  const reported=maybeReportedTime(r.reportTime,"REPORT");
  const receipt=maybeReportedTime(r.receiptTime,"RECEIPT");
  // Conservative source issuance: reportTime/receiptTime/observation all must
  // have arrived before OUR actual fetch, otherwise this row is not admitted.
  const issued=new Date(Math.max(
    obs.getTime(),reported?.getTime()??obs.getTime(),
    receipt?.getTime()??obs.getTime()
  ));
  if(obs.getTime()>collected.getTime()||
     issued.getTime()>collected.getTime()||
     collected.getTime()-obs.getTime()>48*3600_000)
   continue; // stale or future-dated source is explicit missing, never PRE.
  const feature=metrics(r);
  if(Object.keys(feature).length===0)continue;
  const previous=rowByAirport.get(icao);
  if(previous && (previous.obs.getTime()>obs.getTime() ||
    previous.obs.getTime()===obs.getTime()&&
    previous.issue.getTime()>=issued.getTime()))continue;
  // Hash exact source record in memory; do not store airline/flight data.
  const recordSha=createHash("sha256").update(JSON.stringify(r)).digest("hex");
  rowByAirport.set(icao,{obs,issue:issued,receipt,metrics:feature,recordSha});
 }
 const receipts=[...rowByAirport].sort(([a],[b])=>a.localeCompare(b))
   .map(([airportIcao,x]):P4G5NoaaMetarReceiptV39=>({
    schema:P4_G5_NOAA_METAR_SCHEMA_V39,
    source:"NOAA_AVIATIONWEATHER_METAR_JSON",
    sourceUrl:"https://aviationweather.gov/api/data/metar",
    airportIcao,sourceVersion:"NOAA_AVIATIONWEATHER_API_METAR_JSON_V4",
    collectedAtUtc:collected.toISOString(),
    durableArtifactReadAtUtc:null,
    weatherObservationAtUtc:x.obs.toISOString(),
    weatherIssuedAtUtc:x.issue.toISOString(),
    noaaReceiptClockAtUtc:x.receipt?.toISOString()??null,
    sourceBodySha256:sourceSha,sourceRecordSha256:x.recordSha,
    metrics:x.metrics,originalSourceFlightIdentityAbsent:true,
    frozenFlightPreCertified:false,scientificGate5Passed:false
   }));
 return {
  schema:P4_G5_NOAA_METAR_SCHEMA_V39,
  sourceStatus:receipts.length?"VALID_FREE_OBSERVATIONS":"NO_DATA_RETURNED",
  sourceAirportCount:input.requestedAirports.length,
  acceptedAirportCount:receipts.length,
  missingAirports:input.requestedAirports.filter(x=>!rowByAirport.has(x)),
  rejectedUnexpectedAirportCount:rejectedUnexpected,
  sourceBodySha256:sourceSha,
  sourceCollectedAtUtc:collected.toISOString(),
  receipts,noPaidProviderCalls:true,sourceIsFlightPopulation:false,
  sourceIsActualRunwayTime:false
 };
}
export function validateP4G5NoaaDurableArtifactV39(
 result:P4G5NoaaMetarDecodedV39,durableArtifactReadAtUtc:string,
 cutoffs:readonly {airportIcao:string;cutoffUtc:string}[]
){
 const durable=time(durableArtifactReadAtUtc,"DURABLE");
 const collected=time(result.sourceCollectedAtUtc,"RESULT_COLLECTED");
 if(durable.getTime()<collected.getTime()||!Array.isArray(cutoffs)||
   cutoffs.length>12)
  throw Error("P4_G5_NOAA_ARTIFACT_TIME_OR_CUTOFF_HOLD");
 const summaries=cutoffs.map(({airportIcao,cutoffUtc})=>{
  const cutoff=time(cutoffUtc,"PRE_CUTOFF");
  const rows:P4DurableWeatherReceipt[]=result.receipts
   .filter(r=>r.airportIcao===airportIcao)
   .map(r=>({
    source:"live_metar",
    airportIcao:r.airportIcao,
    sourceVersion:r.sourceVersion,
    contentSha256:r.sourceRecordSha256,
    firstAvailableAtUtc:new Date(r.collectedAtUtc),
    durablyStoredAtUtc:durable,
    issueTimeUtc:new Date(r.weatherIssuedAtUtc),
    observationTimeUtc:new Date(r.weatherObservationAtUtc),
    validFromUtc:null,validToUtc:null,
    stationIcao:r.airportIcao,stationDistanceKm:0,
    gridCellId:null,featureValue:r.metrics
   }));
  const selection=preWeatherFeatureAsOfV39(rows,{
   airportIcao,cutoffUtc:cutoff,frozenGrid:"gfs"
  });
  return {
   airportIcao,cutoffUtc,weatherAvailableForThisActualCutoff:
    !selection.weatherMissing,
   weatherMissing:selection.weatherMissing,
   reason:selection.weatherMissing?
      "NOT_DURABLY_AVAILABLE_AS_OF_CUTOFF_OR_NO_VALID_SOURCE":null,
   selectedOriginalSourceSha256:selection.weatherMissing?null:
    selection.feature.sourceVersion?rows[0]?.contentSha256??null:null,
   // In-flight PRE may use the feature only if the *actual* frozen cutoff
   // matches this independently established receipt availability.
   frozenFlightPredictionCutoffAudited:false as const
  };
 });
 return {
  schema:"v39.phase4.gate5-noaa-durable-cutoff-audit.v1" as const,
  source:"NOAA_AVIATIONWEATHER_METAR_JSON" as const,
  durableArtifactReadAtUtc:durable.toISOString(),
  reports:summaries,
  providerCalls:0 as const,databaseWrites:0 as const,
  scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const
 };
}
