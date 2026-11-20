/** Public weather archive scope from the exact protected SOURCE day plans.
 * No flight rows, private destinations or provider identifiers influence
 * the external HTTP station list. Capture all scheduled sampled origins
 * within a symmetric 3h window; destination forecast coverage is limited
 * to stations in this public scope and remains explicitly missing otherwise.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const sha=(x:Buffer|string)=>createHash("sha256").update(x).digest("hex");
const hold=(s:string):never=>{throw Error("HOLD_P7_NOAA_PRODUCTION_PLAN_"+s)};
const at=(x:unknown)=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(Date.parse(x)).toISOString()!==x)return hold("CLOCK");return Date.parse(x)};
export const P7_NOAA_PRODUCTION_WORKFLOW=".github/workflows/phase7-public-noaa-weather-archive.yml";
export const P7_NOAA_PRODUCTION_RAW="v39-p7-noaa-public-production-raw";
export const P7_NOAA_PRODUCTION_REVIEW="v39-p7-noaa-public-production-reviewed";
export const P7_NOAA_PUBLIC_MAX_AGE_MS=3*3600000;
export type P7PublicNoaaPlan={runDayIndex:number;pairedIcaos:Record<string,string>;templates:readonly {scheduledRequestUtc:string;slot:string}[]};
export function publicP7WeatherStationGroups(plans:readonly P7PublicNoaaPlan[],scopeAtUtc:string){
 const now=at(scopeAtUtc),wanted=new Set<string>(),days=new Set<number>();
 if(!Array.isArray(plans)||plans.length!==31)hold("PLAN_DENOMINATOR");
 for(let i=0;i<plans.length;i++){
  const p=plans[i],slots=["HUB","MID_A","MID_B","REGIONAL"];
  if(p?.runDayIndex!==i+1||!p.pairedIcaos||Object.keys(p.pairedIcaos).length!==4||slots.some(s=>!/^[A-Z]{4}$/.test(p.pairedIcaos[s]??""))||new Set(Object.values(p.pairedIcaos)).size!==4||
   !Array.isArray(p.templates)||p.templates.length<1||p.templates.length>240)hold("PLAN_SHAPE");
  for(const q of p.templates){
   if(!slots.includes(q.slot))hold("PLAN_SLOT");
   if(Math.abs(at(q.scheduledRequestUtc)-now)<=P7_NOAA_PUBLIC_MAX_AGE_MS){wanted.add(p.pairedIcaos[q.slot]);days.add(p.runDayIndex);}
  }
 }
 if(wanted.size>32)hold("PUBLIC_STATION_BOUND");
 const stations=[...wanted].sort(),groups:string[][]=[];
 for(let i=0;i<stations.length;i+=8)groups.push(stations.slice(i,i+8));
 return {runDayIndexes:[...days].sort((a,b)=>a-b),groups};
}
export function readP7ProtectedNoaaPlans(env:NodeJS.ProcessEnv,read=readFileSync){
 if(env.P6_PHASE7_NOAA_ARCHIVE_ISSUER_APPROVED!=="1"||env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||
  [env.AERODATABOX_API_KEY,env.RAPIDAPI_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL].some(Boolean)||
  !C.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.V39_P5_APPROVED_CODE_SHA||!H.test(env.P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256??""))hold("EXACT_PROTECTED_SCOPE");
 const raw=env.P6_NONPAID_DAILY_POLICY_BASE64??"";
 if(!raw||raw.length>46668||!(/^[A-Za-z0-9+/]+={0,2}$/).test(raw))hold("DAILY_POLICY");
 const bytes=Buffer.from(raw,"base64");
 if(bytes.toString("base64")!==raw||sha(bytes)!==env.P6_NONPAID_DAILY_POLICY_SHA256)hold("DAILY_POLICY");
 const d=JSON.parse(bytes.toString("utf8"));
 if(d.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||d.delegatedDailyPacketProductionApproved!==true||d.approvedCodeSha!==env.GITHUB_SHA||
  ![d.manifestSha256,d.rightsSha256,d.calendarSha256,d.releaseSha256].every(x=>H.test(x??""))||
  d.manifestSha256!==env.V39_P5_MANIFEST_SHA256||d.rightsSha256!==env.V39_P5_RIGHTS_SHA256||d.releaseSha256!==env.V39_P5_RELEASE_SHA256||
  !Array.isArray(d.dayPlanSha256s)||d.dayPlanSha256s.length!==31||new Set(d.dayPlanSha256s.map((x:any)=>x.sha256)).size!==31)hold("PINNED_DAILY_POLICY");
 return Object.freeze(d.dayPlanSha256s.map((x:any,i:number)=>{
  if(x.runDayIndex!==i+1||!H.test(x.sha256??""))hold("DAY_PIN");
  const raw=read("data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json");
  if(!Buffer.isBuffer(raw)||raw.length>500000||sha(raw)!==x.sha256)hold("DAY_BYTES");
  const p=JSON.parse(raw.toString("utf8"));
  if(p.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||p.runDayIndex!==i+1)hold("DAY_SCHEMA");
  return p as P7PublicNoaaPlan;
 })) as readonly P7PublicNoaaPlan[];
}
