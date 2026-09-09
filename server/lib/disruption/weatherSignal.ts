/** V3.9-f.8 weather availability/selection owner. Unknown weather stays missing. */
export interface WeatherSignal {
  iataCode: string;
  icaoCode: string;
  flightCategory: "VFR" | "MVFR" | "IFR" | "LIFR" | "UNKNOWN";
  windSpeedKt: number | null;
  gustSpeedKt: number | null;
  visibilityMiles: number | null;
  ceilingFt: number | null;
  hasThunderstorm: boolean | null;
  hasFreezing: boolean | null;
  rawMetar: string | null;
  riskContribution: number | null;
  source: string;
  sourceVersion: string;
  issueTime: Date | null;
  /** Optional only for legacy product consumers; research selection requires it. */
  availableAt?: Date | null;
  retrievedAt: Date;
  weatherMissing?: boolean;
}
export interface WeatherRetrievalContext { cutoffUtc: Date; mode: "operational" | "retrospective"; allowEra5: boolean }

const VERIFIED_IATA_ICAO: Record<string, string> = {
  HNL:"PHNL", OGG:"PHOG", KOA:"PHKO", LIH:"PHLI", ANC:"PANC", FAI:"PAFA", JNU:"PAJN", SJU:"TJSJ",
  YYZ:"CYYZ", YVR:"CYVR", YUL:"CYUL", YYC:"CYYC", LHR:"EGLL", CDG:"LFPG", FRA:"EDDF", AMS:"EHAM",
  DXB:"OMDB", NRT:"RJAA", HND:"RJTT", ICN:"RKSI", SYD:"YSSY", MEX:"MMMX", LAX:"KLAX", SFO:"KSFO",
  JFK:"KJFK", ORD:"KORD", ATL:"KATL", DFW:"KDFW", DEN:"KDEN", SEA:"KSEA",
};
export function iataToIcao(iata: string): string { return VERIFIED_IATA_ICAO[(iata || "").trim().toUpperCase()] ?? ""; }

function missingSignal(iataCode: string, retrievedAt = new Date()): WeatherSignal {
  const code = (iataCode || "").trim().toUpperCase();
  return { iataCode:code, icaoCode:iataToIcao(code), flightCategory:"UNKNOWN", windSpeedKt:null, gustSpeedKt:null,
    visibilityMiles:null, ceilingFt:null, hasThunderstorm:null, hasFreezing:null, rawMetar:null, riskContribution:null,
    source:"none", sourceVersion:"v3.9-f.8", issueTime:null, availableAt:null, retrievedAt, weatherMissing:true };
}
function categoryFromMetar(vis: number|null, ceil: number|null): WeatherSignal["flightCategory"] {
  if (vis === null && ceil === null) return "UNKNOWN";
  const v=vis??Infinity, c=ceil??Infinity;
  if (v<1||c<500) return "LIFR"; if (v<3||c<1000) return "IFR"; if (v<5||c<3000) return "MVFR"; return "VFR";
}
function categoryPoints(c: WeatherSignal["flightCategory"]): number { return c==="LIFR"?25:c==="IFR"?18:c==="MVFR"?10:c==="VFR"?2:0; }

export function isWeatherAvailableAtCutoff(issueTime: Date|null, cutoffUtc: Date, source: string, mode: "operational"|"retrospective"): boolean {
  if (source === "era5" && mode === "operational") return false;
  if (!issueTime) return false;
  const i=issueTime.getTime(), c=cutoffUtc.getTime(); return Number.isFinite(i)&&Number.isFinite(c)&&i<=c;
}
export function validateTafIssueTime(issueTime: Date|null, cutoffUtc: Date): boolean { return isWeatherAvailableAtCutoff(issueTime,cutoffUtc,"taf","operational"); }

export const WEATHER_OPERATIONAL_PRECEDENCE=["live_metar","archive_metar","gfs","nam"] as const;
export type WeatherOperationalSource=(typeof WEATHER_OPERATIONAL_PRECEDENCE)[number];
export const WEATHER_OPERATIONAL_LOOKBACK_HOURS=6;
export interface WeatherCandidate { source:string; issueTime:Date|null; availableAt:Date|null; payload:unknown }
export interface WeatherSelection { selected:WeatherCandidate|null; weatherMissing:boolean; sourceUsed:WeatherOperationalSource|"none"|null; reason:string }
export function selectOperationalWeather(candidates: WeatherCandidate[], cutoffUtc: Date): WeatherSelection {
  const cutoff=cutoffUtc.getTime(), precedence=WEATHER_OPERATIONAL_PRECEDENCE as readonly string[];
  if (!Number.isFinite(cutoff)) return {selected:null,weatherMissing:true,sourceUsed:"none",reason:"invalid cutoff"};
  const eligible=candidates.filter(c=>precedence.includes(c.source)&&c.source!=="era5"&&!!c.issueTime&&!!c.availableAt&&
    Number.isFinite(c.issueTime!.getTime())&&Number.isFinite(c.availableAt!.getTime())&&c.issueTime!.getTime()<=cutoff&&c.availableAt!.getTime()<=cutoff);
  if (!eligible.length) return {selected:null,weatherMissing:true,sourceUsed:"none",reason:"no cutoff-safe operational observation"};
  eligible.sort((a,b)=>precedence.indexOf(a.source)-precedence.indexOf(b.source)||b.issueTime!.getTime()-a.issueTime!.getTime());
  const winner=eligible[0], age=(cutoff-winner.issueTime!.getTime())/3_600_000;
  if (age>WEATHER_OPERATIONAL_LOOKBACK_HOURS) return {selected:null,weatherMissing:true,sourceUsed:"none",reason:"latest qualifying observation older than 6h"};
  return {selected:winner,weatherMissing:false,sourceUsed:winner.source as WeatherOperationalSource,reason:"selected by frozen operational precedence and cutoff clocks"};
}

export async function getAirportWeather(iataCode: string, context?: WeatherRetrievalContext): Promise<WeatherSignal> {
  const code=(iataCode||"").trim().toUpperCase(), retrievedAt=new Date(), icao=iataToIcao(code);
  if (!code||!icao) return missingSignal(code,retrievedAt);
  if ((context?.mode??"operational")==="retrospective") return missingSignal(code,retrievedAt);
  return fetchMetarWeather(code,icao,context?.cutoffUtc??retrievedAt);
}
async function fetchMetarWeather(code:string,icao:string,cutoffUtc:Date):Promise<WeatherSignal>{
  const retrievedAt=new Date();
  try{
    const resp=await fetch(`https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(icao)}&format=json`,{headers:{Accept:"application/json","User-Agent":"Travnr-Disruption-Monitor/1.0"}});
    if(!resp.ok)return missingSignal(code,retrievedAt); const data:any=await resp.json(); const row=Array.isArray(data)?data[0]:null; if(!row)return missingSignal(code,retrievedAt);
    const rawIssue=row.reportTime??row.observation_time??null, parsed=rawIssue?new Date(rawIssue):null;
    const issueTime=parsed&&Number.isFinite(parsed.getTime())?parsed:null; if(!isWeatherAvailableAtCutoff(issueTime,cutoffUtc,"metar","operational"))return missingSignal(code,retrievedAt);
    const num=(v:unknown):number|null=>{if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null};
    const windSpeedKt=num(row.wspd??row.wind_speed_kt),gustSpeedKt=num(row.wgst??row.wind_gust_kt);
    let visibilityMiles:number|null=null; const rv=row.visib??row.visibility_statute_mi;
    if(typeof rv==="number"&&Number.isFinite(rv))visibilityMiles=rv; else if(typeof rv==="string"){const s=rv.trim().replace(/\+$/,"");let v=Number.NaN;if(s.includes("/")){const parts=s.split(/\s+/);if(parts.length===2){const [n,d]=parts[1].split("/").map(Number);v=Number(parts[0])+n/d}else{const[n,d]=s.split("/").map(Number);v=n/d}}else v=Number(s);if(Number.isFinite(v))visibilityMiles=v}
    let ceilingFt:number|null=null; for(const l of Array.isArray(row.clouds)?row.clouds:[]){const cover=String(l?.cover??"").toUpperCase(),base=Number(l?.base);if((cover==="BKN"||cover==="OVC")&&Number.isFinite(base))ceilingFt=ceilingFt===null?base:Math.min(ceilingFt,base)}
    const wx=String(row.wxString??row.wx_string??"").toUpperCase(),hasThunderstorm=/\bTS\b|TSRA|TSGR/.test(wx),hasFreezing=/\bFZ\b|FZRA|FZDZ|FZFG|\bSN\b|\bPL\b/.test(wx),flightCategory=categoryFromMetar(visibilityMiles,ceilingFt);
    let riskContribution=categoryPoints(flightCategory)+(hasThunderstorm?10:0)+(hasFreezing?5:0)+(((gustSpeedKt??0)>=25||(windSpeedKt??0)>=30)?3:0);riskContribution=Math.min(25,riskContribution);
    return {iataCode:code,icaoCode:icao,flightCategory,windSpeedKt,gustSpeedKt,visibilityMiles,ceilingFt,hasThunderstorm,hasFreezing,rawMetar:String(row.rawOb??row.raw_text??row.metar??"")||null,riskContribution,source:"live_metar",sourceVersion:"aviationweather-data-api",issueTime,availableAt:retrievedAt,retrievedAt,weatherMissing:false};
  }catch{return missingSignal(code,retrievedAt)}
}
