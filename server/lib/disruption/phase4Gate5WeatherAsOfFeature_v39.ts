/**
 * Phase 4: deterministic, NO PROVIDER, strictly cutoff-safe optional weather
 * feature selection. Consumes only externally persisted/source-verified
 * weather receipt records. This module does not fetch, write, or grant a
 * license to store weather. No receipt => NULL/missing PRE feature.
 */
import type {PreFeatureInput} from "./preSnapshotBuilder_v3";

export const P4_WEATHER_ASOF_SCHEMA="v39.phase4.weather-durable-asof-feature.v1" as const;
export const P4_METAR_MAX_AGE_MS=6*3_600_000;
export const P4_METAR_STATION_RADIUS_KM=30;
export type P4OperationalWeatherSource="live_metar"|"archive_metar"|"gfs"|"nam";
export type P4WeatherSource=P4OperationalWeatherSource|"era5";
const ORDER=["live_metar","archive_metar","gfs","nam"] as const;
const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z0-9]{4}$/;

export interface P4DurableWeatherReceipt {
 source:P4WeatherSource;
 airportIcao:string;
 sourceVersion:string;
 contentSha256:string;
 /** Earliest clock the source was obtained by the system. */
 firstAvailableAtUtc:Date|null;
 /** Commit time of a durable, validated weather source receipt. */
 durablyStoredAtUtc:Date|null;
 issueTimeUtc:Date|null;
 /** Physical METAR weather-observation time, not its arrival/publication time. */
 observationTimeUtc:Date|null;
 /** Required for grid forecast candidates; issue is not forecast valid time. */
 validFromUtc:Date|null;
 validToUtc:Date|null;
 /** METAR station within 30km; forecast uses its grid cell instead. */
 stationIcao:string|null;
 stationDistanceKm:number|null;
 gridCellId:string|null;
 /** Numeric/boolean derived weather features, never the original raw body. */
 featureValue:unknown;
}
export type P4WeatherMissingReason=
 "NO_DURABLE_CUTOFF_SAFE_WEATHER"|"INVALID_PREDICTION_CUTOFF";
export interface P4WeatherAsOfSelection {
 schema:typeof P4_WEATHER_ASOF_SCHEMA;
 selected:P4DurableWeatherReceipt|null;
 source:P4OperationalWeatherSource|null;
 weatherMissing:boolean;
 reason:P4WeatherMissingReason|null;
 effectiveInformationAvailableAtUtc:Date|null;
}

function time(x:Date|null):number|null{
 if(!(x instanceof Date))return null;
 const n=x.getTime();return Number.isFinite(n)?n:null;
}
function eligible(
 r:P4DurableWeatherReceipt,
 cutoff:number,
 airport:string,
 frozenGrid:"gfs"|"nam"
):boolean{
 if(!r||r.airportIcao!==airport||
    !ORDER.includes(r.source as P4OperationalWeatherSource)||
    !r.sourceVersion?.trim()||!SHA.test(r.contentSha256??""))
  return false;
 const issued=time(r.issueTimeUtc),first=time(r.firstAvailableAtUtc),
       durable=time(r.durablyStoredAtUtc);
 if(issued===null||first===null||durable===null||
    issued>cutoff||first<issued||durable<first||
    durable>cutoff||issued<cutoff-P4_METAR_MAX_AGE_MS)
  return false;
 if(r.source==="live_metar"||r.source==="archive_metar"){
  const observed=time(r.observationTimeUtc);
  return observed!==null&&observed<=issued&&observed<=cutoff&&
   observed>=cutoff-P4_METAR_MAX_AGE_MS&&
   typeof r.stationIcao==="string"&&ICAO.test(r.stationIcao)&&
   typeof r.stationDistanceKm==="number"&&
   Number.isFinite(r.stationDistanceKm)&&
   r.stationDistanceKm>=0&&r.stationDistanceKm<=P4_METAR_STATION_RADIUS_KM;
 }
 // GFS/NAM forecast issue and availability can precede the valid interval.
 // Validity at the snapshot instant must be proven, not inferred from issue.
 if(r.source!==frozenGrid||!r.gridCellId?.trim())return false;
 const from=time(r.validFromUtc),to=time(r.validToUtc);
 return from!==null&&to!==null&&from<=to&&from<=cutoff&&cutoff<=to;
}
export function selectP4DurableWeatherAsOf(
 records:readonly P4DurableWeatherReceipt[],
 options:{airportIcao:string;cutoffUtc:Date;frozenGrid:"gfs"|"nam"}
):P4WeatherAsOfSelection{
 const c=time(options?.cutoffUtc??null);
 const invalid={schema:P4_WEATHER_ASOF_SCHEMA,selected:null,source:null,
  weatherMissing:true as const,effectiveInformationAvailableAtUtc:null};
 if(c===null||!ICAO.test(options?.airportIcao??"")||
    !["gfs","nam"].includes(options?.frozenGrid))
  return {...invalid,reason:"INVALID_PREDICTION_CUTOFF"};
 const candidates=records.filter(r=>eligible(r,c,options.airportIcao,options.frozenGrid));
 if(!candidates.length)
  return {...invalid,reason:"NO_DURABLE_CUTOFF_SAFE_WEATHER"};
 // Stable precedence; latest physical METAR observation or grid issue within
 // the source class. Prefer most recently actually durably available on ties.
 candidates.sort((a,b)=>ORDER.indexOf(a.source as P4OperationalWeatherSource)-
  ORDER.indexOf(b.source as P4OperationalWeatherSource)||
  (time(b.observationTimeUtc)??time(b.issueTimeUtc)??0)-
  (time(a.observationTimeUtc)??time(a.issueTimeUtc)??0)||
  (time(b.durablyStoredAtUtc)??0)-(time(a.durablyStoredAtUtc)??0)||
  a.contentSha256.localeCompare(b.contentSha256));
 const selected=candidates[0];
 return {schema:P4_WEATHER_ASOF_SCHEMA,selected,
  source:selected.source as P4OperationalWeatherSource,weatherMissing:false,
  reason:null,effectiveInformationAvailableAtUtc:selected.durablyStoredAtUtc};
}
export function preWeatherFeatureAsOfV39(
 records:readonly P4DurableWeatherReceipt[],
 options:{airportIcao:string;cutoffUtc:Date;frozenGrid:"gfs"|"nam"}
):{
 feature:PreFeatureInput;
 weatherMissing:boolean;
 source:P4OperationalWeatherSource|null;
 validatedDurableWeatherReceipt:boolean;
}{
 const result=selectP4DurableWeatherAsOf(records,options);
 return {
  feature:{
   featureName:"airport_weather",
   value:result.selected?result.selected.featureValue:null,
   informationAvailableAt:result.effectiveInformationAvailableAtUtc,
   source:result.source,sourceVersion:result.selected?.sourceVersion??null
  },
  weatherMissing:result.weatherMissing,source:result.source,
  // Local validation of supplied source receipt metadata is not independent
  // proof of authenticity, legal retention, or archive completeness.
  validatedDurableWeatherReceipt:!result.weatherMissing
 };
}
